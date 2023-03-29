import { Data, Entry, HasMeta, Id, Relation } from "./data.ts";
import { Extension } from "./ext.ts";
import {
    DAH_anime_normalize,
    ExtConfig_DAH_anime_normalize,
} from "./exts/DAH_anime_normalize.ts";
import {
    DAH_combine_pow,
    ExtConfig_DAH_combine_pow,
} from "./exts/DAH_combine_pow.ts";
import {
    DAH_combine_pp,
    ExtConfig_DAH_combine_pp,
} from "./exts/DAH_combine_pp.ts";
import {
    DAH_entry_progress,
    ExtConfig_DAH_entry_progress,
} from "./exts/DAH_entry_progress.ts";
import { DAH_factors, ExtConfig_DAH_factors } from "./exts/DAH_factors.ts";
import {
    DAH_overall_score,
    ExtConfig_DAH_overall_score,
} from "./exts/DAH_overall_score.ts";
import {
    DAH_serialize,
    ExtConfig_DAH_serialize,
} from "./exts/DAH_serialize.ts";
import {
    DAH_serialize_json,
    ExtConfig_DAH_serialize_json,
} from "./exts/DAH_serialize_json.ts";
import {
    DAH_standards,
    ExtConfig_DAH_standards,
} from "./exts/DAH_standards.ts";
import { add, Matrix, mul, Vector } from "./math.ts";

export interface Context {
    extensions: ContextExtensions;
    combineFunction: CombineFunction;
    factorScoreCombineWeight: Vector;
}

export type CombineFunction = (arr: number[], factor: number) => number;

export interface ContextConfig {
    extensions: ContextExtensionConfig;
    combineFunction?: CombineFunction;
    factorScoreCombineWeight?: Vector;
}

export interface ContextExtensions {
    DAH_anime_normalize?: DAH_anime_normalize;
    DAH_combine_pow?: DAH_combine_pow;
    DAH_combine_pp?: DAH_combine_pp;
    DAH_entry_progress?: DAH_entry_progress;
    DAH_factors?: DAH_factors;
    DAH_overall_score?: DAH_overall_score;
    DAH_serialize_json?: DAH_serialize_json;
    DAH_serialize?: DAH_serialize;
    DAH_standards?: DAH_standards;
}

export interface ContextExtensionConfig {
    DAH_anime_normalize?: ExtConfig_DAH_anime_normalize;
    DAH_combine_pow?: ExtConfig_DAH_combine_pow;
    DAH_combine_pp?: ExtConfig_DAH_combine_pp;
    DAH_entry_progress?: ExtConfig_DAH_entry_progress;
    DAH_factors?: ExtConfig_DAH_factors;
    DAH_overall_score?: ExtConfig_DAH_overall_score;
    DAH_serialize_json?: ExtConfig_DAH_serialize_json;
    DAH_serialize?: ExtConfig_DAH_serialize;
    DAH_standards?: ExtConfig_DAH_standards;
}

function checkExtensionDependencies(extensions: ContextExtensions) {
    for (const [name, ext] of Object.entries(extensions)) {
        if (ext === undefined) {
            continue;
        }

        const extension = ext as Extension;
        const missing = extension
            .dependencies()
            .filter(
                (name) =>
                    (extensions as Record<string, unknown>)[name] === undefined
            );
        if (missing.length > 0) {
            throw new Error(
                `Extension ${name} has missing dependencies: ${missing.join(
                    ", "
                )}`
            );
        }
    }
}

export function newContext(config: ContextConfig): Context {
    let combineFunction = config.combineFunction;
    let factorScoreCombineWeight = config.factorScoreCombineWeight;

    const extConfigs = config.extensions;

    const extensions = {
        DAH_anime_normalize: ifDefined(
            extConfigs.DAH_anime_normalize,
            (cfg) => new DAH_anime_normalize(cfg)
        ),
        DAH_combine_pow: ifDefined(
            extConfigs.DAH_combine_pow,
            (cfg) => new DAH_combine_pow(cfg)
        ),
        DAH_combine_pp: ifDefined(
            extConfigs.DAH_combine_pp,
            (cfg) => new DAH_combine_pp(cfg)
        ),
        DAH_entry_progress: ifDefined(
            extConfigs.DAH_entry_progress,
            (cfg) => new DAH_entry_progress(cfg)
        ),
        DAH_factors: ifDefined(
            extConfigs.DAH_factors,
            (cfg) => new DAH_factors(cfg)
        ),
        DAH_overall_score: ifDefined(
            extConfigs.DAH_overall_score,
            (cfg) => new DAH_overall_score(cfg)
        ),
        DAH_serialize: ifDefined(
            extConfigs.DAH_serialize,
            (cfg) => new DAH_serialize(cfg)
        ),
        DAH_serialize_json: ifDefined(
            extConfigs.DAH_serialize_json,
            (cfg) => new DAH_serialize_json(cfg)
        ),
        DAH_standards: ifDefined(
            extConfigs.DAH_standards,
            (cfg) => new DAH_standards(cfg)
        ),
    };

    ifDefined(extensions.DAH_combine_pow, (ext) => {
        combineFunction = ext.makeCombineFunction();
    });

    ifDefined(extensions.DAH_combine_pp, (ext) => {
        combineFunction = ext.makeCombineFunction();
    });

    ifDefined(extensions.DAH_factors, (ext) => {
        factorScoreCombineWeight = ext.getFactorCombineWeightVector();
    });

    if (!combineFunction) {
        throw new Error("combine function not specified");
    }

    if (!factorScoreCombineWeight) {
        throw new Error("factor score combine weight not specified");
    }

    checkExtensionDependencies(extensions);

    return {
        extensions,
        combineFunction,
        factorScoreCombineWeight,
    };
}

interface CalcEntry {
    entry: Entry;
    flattenedChildrenMap: Map<Id, number> | undefined;
    flattenedParentMap: Map<Id, number>;
    relations: [Relation, number][];
    impactScore: Vector | undefined;
    relationScore: Vector | undefined;
}

export interface Result extends HasMeta {
    totalImpact: Vector;
    totalRelation: Vector;
    overallVector: Vector;
}

export function processContext(context: Context, data: Data): Map<Id, Result> {
    const calcEntries = new Map<Id, CalcEntry>();
    for (const [id, entry] of data.entries) {
        calcEntries.set(id, {
            entry: entry,
            flattenedChildrenMap: undefined,
            flattenedParentMap: new Map<Id, number>(),
            relations: [],
            impactScore: undefined,
            relationScore: undefined,
        });
    }

    solveContainWeights(context, data, calcEntries);
    calcImpactScore(context, data, calcEntries);
    fillRelationReferences(context, data, calcEntries);
    calcRelationScore(context, data, calcEntries);
    return processResults(context, data, calcEntries);
}

function isNullEntryId(_: Context, id: Id): boolean {
    // TODO: make this extension-specific
    return id.includes("[null entry]");
}

function solveContainWeights(
    context: Context,
    _: Data,
    entries: Map<Id, CalcEntry>
) {
    function flattenSingle(
        entry: CalcEntry,
        stack: Id[] = []
    ): Map<Id, number> {
        if (entry.flattenedChildrenMap !== undefined) {
            return entry.flattenedChildrenMap;
        }

        const idx = stack.indexOf(entry.entry.id);
        if (idx >= 0) {
            // found
            throw new Error(
                "circular entry containment: " + stack.slice(idx).join(" -> ")
            );
        }

        stack.push(entry.entry.id);
        entry.flattenedChildrenMap = flattenContainContribGraph(
            context,
            entry.entry.children,
            (id) => {
                const entry = entries.get(id);
                if (entry !== undefined) {
                    flattenSingle(entry, stack);
                }
                return entry?.flattenedChildrenMap;
            }
        );

        stack.pop();

        for (const [id, weight] of entry.flattenedChildrenMap) {
            entries.get(id)!.flattenedParentMap.set(entry.entry.id, weight);
        }

        return entry.flattenedChildrenMap;
    }

    for (const [_, entry] of entries) {
        flattenSingle(entry);
    }
}

// common algorithm used in flattening contain/contributing graphs
function flattenContainContribGraph(
    context: Context,
    base: Map<Id, number>,
    idMapCallback: (id: Id) => Map<Id, number> | undefined,
    throwOnInvalidId = true
): Map<Id, number> {
    const solvedMap = new Map<Id, number>();
    function add(id: Id, weight: number) {
        solvedMap.set(id, (solvedMap.get(id) ?? 0.0) + weight);
    }

    for (const [id, weight] of base) {
        const flattenedIdMap = idMapCallback(id);
        if (flattenedIdMap === undefined) {
            if (isNullEntryId(context, id)) {
                continue;
            } else if (throwOnInvalidId) {
                throw new Error(`entry not found: ${id}`);
            }
        } else {
            add(id, weight);
            for (const [childId, childWeight] of flattenedIdMap) {
                add(childId, childWeight * weight);
            }
        }
    }

    return solvedMap;
}

export function combine(
    context: Context,
    arr: number[],
    factor: number
): number {
    return context.combineFunction(arr, factor);
}

export function newZeroVector(context: Context): Vector {
    return new Array<number>(context.factorScoreCombineWeight.length);
}

export function combineVectors(context: Context, vectors: Vector[]): Vector {
    const score = newZeroVector(context);
    for (let i = 0; i < score.length; i++) {
        score[i] = combine(
            context,
            vectors.map((v) => v[i]),
            context.factorScoreCombineWeight[i]
        );
    }
    return score;
}

function buffWeight(context: Context, weight: number): Matrix {
    return {
        kind: "diagonal",
        data: context.factorScoreCombineWeight.map((value) =>
            Math.pow(weight, value)
        ),
    };
}

function calcImpactScore(
    context: Context,
    data: Data,
    entries: Map<Id, CalcEntry>
) {
    const entryImpactScores = new Map<Id, Vector[]>();
    for (const impact of data.impacts) {
        const flattenedContributors = flattenContainContribGraph(
            context,
            impact.contributors,
            (id) => entries.get(id)?.flattenedParentMap
        );
        for (const [id, weight] of flattenedContributors) {
            let scores = entryImpactScores.get(id);
            if (scores === undefined) {
                scores = [];
                entryImpactScores.set(id, scores);
            }
            scores.push(mul(buffWeight(context, weight), impact.score));
        }
    }

    for (const [id, scores] of entryImpactScores) {
        entries.get(id)!.impactScore = combineVectors(context, scores);
    }
}

function fillRelationReferences(
    context: Context,
    data: Data,
    entries: Map<Id, CalcEntry>
) {
    for (const relation of data.relations) {
        const flattenedContributors = flattenContainContribGraph(
            context,
            relation.contributors,
            (id) => entries.get(id)?.flattenedParentMap
        );

        for (const [id, weight] of flattenedContributors) {
            entries.get(id)!.relations.push([relation, weight]);
        }
    }
}
class ReoccurrenceStack<T> {
    maxOccurrences: number;
    data: Map<T, number>;

    constructor(maxOccurrences = 8) {
        this.maxOccurrences = maxOccurrences;
        this.data = new Map<T, number>();
    }

    push(obj: T): boolean {
        const occurrences = (this.data.get(obj) ?? 0) + 1;
        this.data.set(obj, occurrences);
        return occurrences <= this.maxOccurrences;
    }

    pop(obj: T) {
        const occurrences = this.data.get(obj);
        if (occurrences === undefined) {
            throw new Error("push/pop not match");
        }

        if (occurrences === 1) {
            this.data.delete(obj);
        } else {
            this.data.set(obj, occurrences - 1);
        }
    }
}

function calcRelationScore(
    context: Context,
    _: Data,
    entries: Map<Id, CalcEntry>
) {
    function calcSingle(
        entry: CalcEntry,
        stack = new ReoccurrenceStack<Id>()
    ): Vector {
        if (entry.entry.id === "A-MAL-38009") {
            console.debug(entry.relations);
        }
        const relationScores: Vector[] = [];
        if (stack.push(entry.entry.id)) {
            for (const [relation, weight] of entry.relations) {
                let relationScore: Vector | undefined = undefined;
                for (const [refId, refWeight] of relation.references) {
                    const ref = entries.get(refId);
                    if (ref === undefined) {
                        if (isNullEntryId(context, refId)) {
                            continue;
                        } else {
                            throw new Error(`entry not found ${refId}`);
                        }
                    }

                    const refRelationScore = calcSingle(ref, stack);
                    const refOverallScore = add(
                        ref.impactScore!,
                        refRelationScore
                    );
                    if (relationScore === undefined) {
                        relationScore = mul(refWeight, refOverallScore);
                    } else {
                        relationScore = add(
                            relationScore,
                            mul(refWeight, refOverallScore)
                        );
                    }
                }

                if (relationScore !== undefined) {
                    relationScores.push(
                        mul(buffWeight(context, weight), relationScore)
                    );
                }
            }
        }

        stack.pop(entry.entry.id);

        return combineVectors(context, relationScores);
    }

    for (const [_, entry] of entries) {
        entry.relationScore = calcSingle(entry);
    }
}

function ifDefined<T, R>(
    obj: T | undefined,
    callback: (a: T) => R
): R | undefined {
    if (obj === undefined) {
        return undefined;
    }

    return callback(obj);
}

function processResults(
    context: Context,
    data: Data,
    entries: Map<Id, CalcEntry>
): Map<Id, Result> {
    const results = new Map<Id, Result>();
    for (const [id, entry] of entries) {
        entry.impactScore = entry.impactScore ?? newZeroVector(context);
        const result: Result = {
            totalImpact: entry.impactScore!,
            totalRelation: entry.relationScore!,
            overallVector: add(entry.impactScore!, entry.relationScore!),
            DAH_meta: {},
        };

        results.set(id, result);
    }

    ifDefined(context.extensions.DAH_overall_score, (ext) =>
        ext.postProcess(context, results)
    );

    ifDefined(context.extensions.DAH_anime_normalize, (ext) =>
        ext.postProcess(context, results)
    );

    ifDefined(context.extensions.DAH_serialize_json, (ext) => {
        ext.serialize(data, results);
    });

    return results;
}
