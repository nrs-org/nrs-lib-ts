import { DAH_meta } from "./exts/DAH_meta.ts";
import { NRSCoreMatrix, NRSCoreVector } from "./math.ts";

export type ID = string;

export interface NRSCoreEntry {
  id: ID;
  children: Map<ID, number>;
}

export interface NRSCoreImpact {
  contributors: Map<ID, number>;
  score: NRSCoreVector;
}

export interface NRSCoreRelation {
  contributors: Map<ID, number>;
  references: Map<ID, NRSCoreMatrix>;
}

export interface NRSCoreResult {
  totalImpact: NRSCoreVector;
  totalRelation: NRSCoreVector;
  overallScore: NRSCoreVector;
}

// support for DAH_meta is built-in, since this extension
// provided the "standards" for the remaining extensions
export type NRSMeta = Record<string, unknown>;
export interface NRSHasMeta {
  meta: NRSMeta;
}

// this implementation of NRS will operate on the following data types
// disabling the DAH_meta extension will simply remove the meta fields
// from the serialized data (if DAH_serialize was enabled).
export type NRSEntry = NRSCoreEntry & NRSHasMeta;
export type NRSImpact = NRSCoreImpact & NRSHasMeta;
export type NRSRelation = NRSCoreRelation & NRSHasMeta;
export type NRSResult = NRSCoreResult & NRSHasMeta;

export interface NRSContext {
  // extensions
  DAH_meta(): DAH_meta;

  // combine function
  // see: https://github.com/ngoduyanh/nrs/blob/26bdbbc9ebf83ba05a2171df12a85a4fa62dd2d8/core/specification.md#23-mathematical-concepts
  combine(a: number[], w: number): number;

  // weight-buff function
  // see: https://github.com/ngoduyanh/nrs/blob/26bdbbc9ebf83ba05a2171df12a85a4fa62dd2d8/core/specification.md#323-contributing-weight-solving
  buffWeight(w: number): NRSCoreMatrix;

  // factor score combine weight vector
  // see: https://github.com/ngoduyanh/nrs/blob/master/core/specification.md#321-combining-score-vectors
  combineWeightVector: NRSCoreVector;
}

export type CombineFunction = (a: number[], w: number) => number;

// transform a `combineUnsigned` function (can only combine arrays with positive numbers)
// into a full-fledged `combine` function
export function makeSignedCombine(
  combineUnsigned: CombineFunction
): CombineFunction {
  return (a, w) => {
    const p = a.filter((x) => x > 0);
    const n = a.filter((x) => x < 0).map((x) => -x);
    return combineUnsigned(p, w) - combineUnsigned(n, w);
  };
}

export function process(
  context: NRSContext,
  entries: NRSEntry[],
  impacts: NRSImpact[],
  relations: NRSRelation[]
): Map<ID, NRSResult> {
  const processor = new Processor(context, entries, impacts, relations);
  return processor.process();
}

function zeroVector(context: NRSContext) {
  const numFactors = context.combineWeightVector.dimensions();
  const values = new Array<number>(numFactors).fill(0);
  return new NRSCoreVector(values);
}

function combineVectors(
  context: NRSContext,
  vectors: NRSCoreVector[]
): NRSCoreVector {
  const numFactors = context.combineWeightVector.dimensions();
  const values = Array<number>(numFactors);
  for (let i = 0; i < numFactors; i++) {
    values[i] = context.combine(
      vectors.map((v) => v.values[i]),
      context.combineWeightVector.values[i]
    );
  }

  return new NRSCoreVector(values);
}

class CalcEntry {
  entry: NRSEntry;
  containMap?: Map<ID, number>;
  impactScores: NRSCoreVector[] = [];
  impactScore?: NRSCoreVector;
  relations = new Array<[NRSRelation, NRSCoreMatrix]>();
  relationScore?: NRSCoreVector;

  constructor(entry: NRSEntry) {
    this.entry = entry;
  }

  addContainWeight(id: ID, deltaWeight: number) {
    if (!this.containMap) {
      throw new Error("`containMap` not initialized");
    }

    let weight = this.containMap.get(id) ?? 0;
    weight += deltaWeight;
    weight = Math.min(1.0, weight);

    this.containMap.set(id, weight);
  }
}

class IDWeightMap {
  map = new Map<ID, number>();

  add(id: ID, deltaWeight: number) {
    let weight = this.map.get(id) ?? 0;
    weight += deltaWeight;
    weight = Math.min(1.0, weight);

    this.map.set(id, weight);
  }
}

class ReoccurrenceStack<T> {
  data: Map<T, number>;
  maxOccurrences: number;

  constructor(maxOccurrences: number) {
    this.data = new Map();
    this.maxOccurrences = maxOccurrences;
  }

  push(obj: T): boolean {
    const occurrences = (this.data.get(obj) ?? 0) + 1;
    this.data.set(obj, occurrences);
    return occurrences <= this.maxOccurrences;
  }

  pop(obj: T) {
    const occurrences = this.data.get(obj);
    if (!occurrences) {
      throw new Error("push/pop not match");
    }

    if (occurrences == 1) {
      this.data.delete(obj);
    } else {
      this.data.set(obj, occurrences - 1);
    }
  }
}

class Processor {
  context: NRSContext;
  entries: Map<ID, CalcEntry>;
  impacts: NRSImpact[];
  relations: NRSRelation[];

  constructor(
    context: NRSContext,
    entries: Iterable<NRSEntry>,
    impacts: NRSImpact[],
    relations: NRSRelation[]
  ) {
    this.context = context;
    this.entries = new Map();
    this.impacts = impacts;
    this.relations = relations;

    for (const entry of entries) {
      this.entries.set(entry.id, new CalcEntry(entry));
    }
  }

  #getEntry(id: ID): CalcEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`entry not found for id ${id}`);
    }

    return entry;
  }

  #solveContainWeightSingle(entry: CalcEntry, stack: ReoccurrenceStack<ID>) {
    if (entry.containMap) {
      return;
    }

    entry.containMap = new Map();
    if (!stack.push(entry.entry.id)) {
      throw new Error(`circular entry containment: ${entry.entry.id}`);
    }

    for (const [childId, childWeight] of entry.entry.children) {
      const child = this.#getEntry(childId);
      if (!child) {
        continue;
      }

      this.#solveContainWeightSingle(child, stack);

      entry.addContainWeight(childId, childWeight);

      for (const [grandchildId, grandchildWeight] of child.containMap!) {
        entry.addContainWeight(grandchildId, childWeight * grandchildWeight);
      }
    }

    stack.pop(entry.entry.id);
  }

  #solveContainWeight() {
    for (const entry of this.entries.values()) {
      this.#solveContainWeightSingle(entry, new ReoccurrenceStack(1));
    }
  }

  #fillContributorMap(
    impactRelation: NRSCoreImpact | NRSCoreRelation
  ): IDWeightMap {
    const contributorMap = new IDWeightMap();
    for (const [id, weight] of impactRelation.contributors) {
      contributorMap.add(id, weight);

      const entry = this.#getEntry(id);
      if (!entry) {
        continue;
      }
      for (const [childId, childWeight] of entry.containMap!) {
        contributorMap.add(childId, weight * childWeight);
      }
    }

    return contributorMap;
  }

  #calcImpactScore() {
    for (const impact of this.impacts) {
      const contributorMap = this.#fillContributorMap(impact);

      for (const [id, weight] of contributorMap.map) {
        const entry = this.#getEntry(id);
        if (!entry) {
          continue;
        }
        const buffedWeight = this.context.buffWeight(weight);
        const impactScore = buffedWeight.mul(impact.score);
        entry.impactScores.push(impactScore);
      }
    }

    for (const [_, entry] of this.entries) {
      entry.impactScore = combineVectors(this.context, entry.impactScores);
    }
  }

  #fillRelationReferences() {
    for (const relation of this.relations) {
      const contributorMap = this.#fillContributorMap(relation);
      for (const [id, weight] of contributorMap.map) {
        const entry = this.#getEntry(id);
        if (!entry) {
          continue;
        }

        const buffedWeight = this.context.buffWeight(weight);

        entry.relations.push([relation, buffedWeight]);
      }
    }
  }

  #calcRelationScoreSingle(
    entry: CalcEntry,
    stack: ReoccurrenceStack<ID> = new ReoccurrenceStack(8)
  ) {
    const relationScores = new Array<NRSCoreVector>();
    if (stack.push(entry.entry.id)) {
      for (const [relation, weight] of entry.relations) {
        const relationScore = [...relation.references.entries()]
          .map(([refId, refWeight]) => {
            const ref = this.#getEntry(refId)!;
            const refRelationScore = this.#calcRelationScoreSingle(ref, stack);
            const refOverallScore = refRelationScore.add_assign(
              ref.impactScore!
            );
            return refWeight.mul(refOverallScore);
          })
          .reduce((a, b) => a.add_assign(b), zeroVector(this.context));
        entry.relationScore = entry.relationScore ?? zeroVector(this.context);
        entry.relationScore.add_assign(weight.mul(relationScore));
      }
    }

    stack.pop(entry.entry.id);
    return combineVectors(this.context, relationScores);
  }

  #calcRelationScore() {
    for (const entry of this.entries.values()) {
      entry.relationScore = this.#calcRelationScoreSingle(entry);
    }
  }

  process(): Map<ID, NRSResult> {
    this.#solveContainWeight();
    this.#calcImpactScore();
    this.#fillRelationReferences();
    this.#calcRelationScore();

    const map = new Map<ID, NRSResult>();
    for (const [id, entry] of this.entries) {
      const totalImpact = entry.impactScore!;
      const totalRelation = entry.relationScore!;
      const overallScore = totalImpact.clone().add_assign(totalRelation);
      map.set(id, {
        meta: {},
        totalImpact,
        totalRelation,
        overallScore,
      });
    }

    return map;
  }
}
