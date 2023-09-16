import { Data, Entry, HasMeta, Id, Relation, ResultMeta } from "./data.ts";
import { Extension } from "./ext.ts";
import {
    DAH_validator_suppress,
    ExtConfig_DAH_validator_suppress,
} from "../exts/DAH_validator_suppress.ts";
import {
    DAH_additional_sources,
    ExtConfig_DAH_additional_sources,
} from "../exts/DAH_additional_sources.ts";
import {
    DAH_anime_normalize,
    ExtConfig_DAH_anime_normalize,
} from "../exts/DAH_anime_normalize.ts";
import {
    DAH_combine_pow,
    ExtConfig_DAH_combine_pow,
} from "../exts/DAH_combine_pow.ts";
import {
    DAH_combine_pp,
    ExtConfig_DAH_combine_pp,
} from "../exts/DAH_combine_pp.ts";
import {
    DAH_entry_bestGirl,
    ExtConfig_DAH_entry_bestGirl,
} from "../exts/DAH_entry_bestGirl.ts";
import {
    DAH_entry_progress,
    ExtConfig_DAH_entry_progress,
} from "../exts/DAH_entry_progress.ts";
import {
    DAH_entry_title,
    ExtConfig_DAH_entry_title,
} from "../exts/DAH_entry_title.ts";
import { DAH_factors, ExtConfig_DAH_factors } from "../exts/DAH_factors.ts";
import {
    DAH_ir_source,
    ExtConfig_DAH_ir_source,
} from "../exts/DAH_ir_source.ts";
import {
    DAH_overall_score,
    ExtConfig_DAH_overall_score,
} from "../exts/DAH_overall_score.ts";
import {
    DAH_serialize,
    ExtConfig_DAH_serialize,
} from "../exts/DAH_serialize.ts";
import {
    DAH_serialize_json,
    ExtConfig_DAH_serialize_json,
} from "../exts/DAH_serialize_json.ts";
import {
    DAH_standards,
    ExtConfig_DAH_standards,
} from "../exts/DAH_standards.ts";
import {
    DiagonalMatrix,
    Matrix,
    RegularMatrix,
    ScalarMatrix,
    Vector,
} from "./math.ts";
import { ifDefined } from "./utils.ts";
import { mapAddAssign } from "../mod.ts";

export class ContextAPI {
    newVector(data: number[]): Vector {
        return new Vector(data);
    }
    newScalarMatrix(data: number): ScalarMatrix {
        return new ScalarMatrix(data);
    }
    newDiagonalMatrix(data: number[]): DiagonalMatrix {
        return new DiagonalMatrix(data);
    }
    newRegularMatrix(data: number[]): RegularMatrix {
        return new RegularMatrix(data);
    }
}

export interface Context {
    extensions: ContextExtensions;
    combineFunction: CombineFunction;
    factorScoreCombineWeight: Vector;
    api: ContextAPI;
}

export type CombineFunction = (arr: number[], factor: number) => number;

export interface ContextConfig {
    extensions: ContextExtensionConfig;
    combineFunction?: CombineFunction;
    factorScoreCombineWeight?: Vector;
}

export interface ContextExtensions {
    DAH_additional_sources?: DAH_additional_sources;
    DAH_anime_normalize?: DAH_anime_normalize;
    DAH_combine_pow?: DAH_combine_pow;
    DAH_combine_pp?: DAH_combine_pp;
    DAH_entry_bestGirl?: DAH_entry_bestGirl;
    DAH_entry_progress?: DAH_entry_progress;
    DAH_entry_title?: DAH_entry_title;
    DAH_factors?: DAH_factors;
    DAH_ir_source?: DAH_ir_source;
    DAH_overall_score?: DAH_overall_score;
    DAH_serialize_json?: DAH_serialize_json;
    DAH_serialize?: DAH_serialize;
    DAH_standards?: DAH_standards;
    DAH_validator_suppress?: DAH_validator_suppress;
}

export interface ContextExtensionConfig {
    DAH_additional_sources?: ExtConfig_DAH_additional_sources;
    DAH_anime_normalize?: ExtConfig_DAH_anime_normalize;
    DAH_combine_pow?: ExtConfig_DAH_combine_pow;
    DAH_combine_pp?: ExtConfig_DAH_combine_pp;
    DAH_entry_bestGirl?: ExtConfig_DAH_entry_bestGirl;
    DAH_entry_progress?: ExtConfig_DAH_entry_progress;
    DAH_entry_title?: ExtConfig_DAH_entry_title;
    DAH_factors?: ExtConfig_DAH_factors;
    DAH_ir_source?: ExtConfig_DAH_ir_source;
    DAH_overall_score?: ExtConfig_DAH_overall_score;
    DAH_serialize_json?: ExtConfig_DAH_serialize_json;
    DAH_serialize?: ExtConfig_DAH_serialize;
    DAH_standards?: ExtConfig_DAH_standards;
    DAH_validator_suppress?: ExtConfig_DAH_validator_suppress;
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
                    (extensions as Record<string, unknown>)[name] === undefined,
            );
        if (missing.length > 0) {
            throw new Error(
                `Extension ${name} has missing dependencies: ${missing.join(
                    ", ",
                )}`,
            );
        }
    }
}

export function newContext(config: ContextConfig): Context {
    let combineFunction = config.combineFunction;
    let factorScoreCombineWeight = config.factorScoreCombineWeight;

    const extConfigs = config.extensions;

    const extensions = {
        DAH_additional_sources: ifDefined(
            extConfigs.DAH_additional_sources,
            (cfg) => new DAH_additional_sources(cfg),
        ),
        DAH_anime_normalize: ifDefined(
            extConfigs.DAH_anime_normalize,
            (cfg) => new DAH_anime_normalize(cfg),
        ),
        DAH_combine_pow: ifDefined(
            extConfigs.DAH_combine_pow,
            (cfg) => new DAH_combine_pow(cfg),
        ),
        DAH_combine_pp: ifDefined(
            extConfigs.DAH_combine_pp,
            (cfg) => new DAH_combine_pp(cfg),
        ),
        DAH_entry_bestGirl: ifDefined(
            extConfigs.DAH_entry_bestGirl,
            (cfg) => new DAH_entry_bestGirl(cfg),
        ),
        DAH_entry_progress: ifDefined(
            extConfigs.DAH_entry_progress,
            (cfg) => new DAH_entry_progress(cfg),
        ),
        DAH_entry_title: ifDefined(
            extConfigs.DAH_entry_title,
            (cfg) => new DAH_entry_title(cfg),
        ),
        DAH_factors: ifDefined(
            extConfigs.DAH_factors,
            (cfg) => new DAH_factors(cfg),
        ),
        DAH_ir_source: ifDefined(
            extConfigs.DAH_ir_source,
            (cfg) => new DAH_ir_source(cfg),
        ),
        DAH_overall_score: ifDefined(
            extConfigs.DAH_overall_score,
            (cfg) => new DAH_overall_score(cfg),
        ),
        DAH_serialize: ifDefined(
            extConfigs.DAH_serialize,
            (cfg) => new DAH_serialize(cfg),
        ),
        DAH_serialize_json: ifDefined(
            extConfigs.DAH_serialize_json,
            (cfg) => new DAH_serialize_json(cfg),
        ),
        DAH_standards: ifDefined(
            extConfigs.DAH_standards,
            (cfg) => new DAH_standards(cfg),
        ),
        DAH_validator_suppress: ifDefined(
            extConfigs.DAH_validator_suppress,
            (cfg) => new DAH_validator_suppress(cfg),
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
        api: new ContextAPI(),
    };
}

interface CalcEntry {
    entry: Entry;
    flattenedChildrenMap: Map<Id, Matrix> | undefined;
    flattenedParentMap: Map<Id, Matrix>;
    relations: [Relation, Matrix][];
    impactScore: Vector | undefined;
    relationScore: Vector | undefined;
}

export interface Result extends HasMeta<ResultMeta> {
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
            flattenedParentMap: new Map<Id, Matrix>(),
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
    entries: Map<Id, CalcEntry>,
) {
    function flattenSingle(
        entry: CalcEntry,
        stack: Id[] = [],
    ): Map<Id, Matrix> {
        if (entry.flattenedChildrenMap !== undefined) {
            return entry.flattenedChildrenMap;
        }

        const idx = stack.indexOf(entry.entry.id);
        if (idx >= 0) {
            // found
            throw new Error(
                "circular entry containment: " + stack.slice(idx).join(" -> "),
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
            },
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
    base: Map<Id, Matrix>,
    idMapCallback: (id: Id) => Map<Id, Matrix> | undefined,
    throwOnInvalidId = true,
): Map<Id, Matrix> {
    const solvedMap = new Map<Id, Matrix>();

    for (const [id, weight] of base) {
        const flattenedIdMap = idMapCallback(id);
        if (flattenedIdMap === undefined) {
            if (isNullEntryId(context, id)) {
                continue;
            } else if (throwOnInvalidId) {
                throw new Error(`entry not found: ${id}`);
            }
        } else {
            mapAddAssign(solvedMap, id, weight);
            for (const [childId, childWeight] of flattenedIdMap) {
                mapAddAssign(solvedMap, childId, childWeight.mul(weight));
            }
        }
    }

    return solvedMap;
}

export function combine(
    context: Context,
    arr: number[],
    factor: number,
): number {
    return context.combineFunction(arr, factor);
}

export function newZeroVector(context: Context): Vector {
    return new Vector(
        new Array<number>(context.factorScoreCombineWeight.data.length).fill(
            0.0,
        ),
    );
}

export function combineVectors(context: Context, vectors: Vector[]): Vector {
    const score = newZeroVector(context);
    for (let i = 0; i < score.data.length; i++) {
        score.data[i] = combine(
            context,
            vectors.map((v) => v.data[i]),
            context.factorScoreCombineWeight.data[i],
        );
    }
    return score;
}

function buffWeight(context: Context, weight: Matrix): Matrix {
    if (weight instanceof ScalarMatrix) {
        return new DiagonalMatrix(
            context.factorScoreCombineWeight.data.map((value) =>
                Math.pow(weight.data, value),
            ),
        );
    } else if (weight instanceof DiagonalMatrix) {
        return new DiagonalMatrix(
            context.factorScoreCombineWeight.data.map((value, i) =>
                Math.pow(weight.data[i], value),
            ),
        );
    } else {
        const n = Math.floor(Math.sqrt(weight.data.length));
        return new RegularMatrix(
            weight.data.map((value, i) =>
                Math.pow(value, context.factorScoreCombineWeight.data[i % n]),
            ),
        );
    }
}

function calcImpactScore(
    context: Context,
    data: Data,
    entries: Map<Id, CalcEntry>,
) {
    const entryImpactScores = new Map<Id, Vector[]>();
    for (const impact of data.impacts) {
        const flattenedContributors = flattenContainContribGraph(
            context,
            impact.contributors,
            (id) => entries.get(id)?.flattenedParentMap,
        );
        for (const [id, weight] of flattenedContributors) {
            let scores = entryImpactScores.get(id);
            if (scores === undefined) {
                scores = [];
                entryImpactScores.set(id, scores);
            }
            scores.push(buffWeight(context, weight).mul(impact.score));
        }
    }

    for (const [id, entry] of entries) {
        entry.impactScore = combineVectors(
            context,
            entryImpactScores.get(id) ?? [],
        );
    }
}

function fillRelationReferences(
    context: Context,
    data: Data,
    entries: Map<Id, CalcEntry>,
) {
    for (const relation of data.relations) {
        const flattenedContributors = flattenContainContribGraph(
            context,
            relation.contributors,
            (id) => entries.get(id)?.flattenedParentMap,
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
    entries: Map<Id, CalcEntry>,
) {
    function calcSingle(
        entry: CalcEntry,
        stack = new ReoccurrenceStack<Id>(),
    ): Vector {
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
                    const refOverallScore = ref.impactScore!.copy();
                    refOverallScore!.add(refRelationScore);
                    if (relationScore === undefined) {
                        relationScore = refWeight.mul(refOverallScore);
                    } else {
                        relationScore.add(refWeight.mul(refOverallScore));
                    }
                }

                if (relationScore !== undefined) {
                    relationScores.push(
                        buffWeight(context, weight).mul(relationScore),
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

function processResults(
    context: Context,
    data: Data,
    entries: Map<Id, CalcEntry>,
): Map<Id, Result> {
    const results = new Map<Id, Result>();
    for (const [id, entry] of entries) {
        entry.impactScore = entry.impactScore ?? newZeroVector(context);
        const overallVector = entry.impactScore.copy();
        overallVector.add(entry.relationScore!);
        const result: Result = {
            totalImpact: entry.impactScore!,
            totalRelation: entry.relationScore!,
            overallVector,
            DAH_meta: {},
        };

        results.set(id, result);
    }

    ifDefined(context.extensions.DAH_overall_score, (ext) =>
        ext.postProcess(context, results),
    );

    ifDefined(context.extensions.DAH_anime_normalize, (ext) =>
        ext.postProcess(context, results),
    );

    ifDefined(context.extensions.DAH_serialize_json, (ext) => {
        ext.serialize(data, results);
    });

    return results;
}
