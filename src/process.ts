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
    DAH_entry_bestGirl,
    ExtConfig_DAH_entry_bestGirl,
} from "../exts/DAH_entry_bestGirl.ts";
import {
    DAH_entry_progress,
    ExtConfig_DAH_entry_progress,
} from "../exts/DAH_entry_progress.ts";
import {
    DAH_entry_queue,
    ExtConfig_DAH_entry_queue,
} from "../exts/DAH_entry_queue.ts";
import {
    DAH_entry_roles,
    ExtConfig_DAH_entry_roles,
} from "../exts/DAH_entry_roles.ts";
import {
    DAH_entry_title,
    ExtConfig_DAH_entry_title,
} from "../exts/DAH_entry_title.ts";
import {
    DAH_entry_type,
    ExtConfig_DAH_entry_type,
} from "../exts/DAH_entry_type.ts";
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
import {
    alg,
    Graph,
    identity as identityMathJs,
    lusolve,
    Matrix as MathJsMatrix,
    matrix as mathjsMatrix,
} from "../deps.ts";
import { assert } from "../mod.ts";
import {
    DAH_entry_contains,
    ExtConfig_DAH_entry_contains,
} from "../exts/DAH_entry_contains.ts";

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
    factorScoreCombineWeight: Vector;
    api: ContextAPI;
}

export interface ContextConfig {
    extensions: ContextExtensionConfig;
    factorScoreCombineWeight?: Vector;
}

export interface ContextExtensions {
    DAH_additional_sources?: DAH_additional_sources;
    DAH_anime_normalize?: DAH_anime_normalize;
    DAH_entry_bestGirl?: DAH_entry_bestGirl;
    DAH_entry_contains?: DAH_entry_contains;
    DAH_entry_progress?: DAH_entry_progress;
    DAH_entry_queue?: DAH_entry_queue;
    DAH_entry_roles?: DAH_entry_roles;
    DAH_entry_title?: DAH_entry_title;
    DAH_entry_type?: DAH_entry_type;
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
    DAH_entry_bestGirl?: ExtConfig_DAH_entry_bestGirl;
    DAH_entry_contains?: ExtConfig_DAH_entry_contains;
    DAH_entry_progress?: ExtConfig_DAH_entry_progress;
    DAH_entry_queue?: ExtConfig_DAH_entry_queue;
    DAH_entry_roles?: ExtConfig_DAH_entry_roles;
    DAH_entry_title?: ExtConfig_DAH_entry_title;
    DAH_entry_type?: ExtConfig_DAH_entry_type;
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
                `Extension ${name} has missing dependencies: ${
                    missing.join(
                        ", ",
                    )
                }`,
            );
        }
    }
}

export function newContext(config: ContextConfig): Context {
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
        DAH_entry_bestGirl: ifDefined(
            extConfigs.DAH_entry_bestGirl,
            (cfg) => new DAH_entry_bestGirl(cfg),
        ),
        DAH_entry_contains: ifDefined(
            extConfigs.DAH_entry_contains,
            (cfg) => new DAH_entry_contains(cfg),
        ),
        DAH_entry_progress: ifDefined(
            extConfigs.DAH_entry_progress,
            (cfg) => new DAH_entry_progress(cfg),
        ),
        DAH_entry_queue: ifDefined(
            extConfigs.DAH_entry_queue,
            (cfg) => new DAH_entry_queue(cfg),
        ),
        DAH_entry_roles: ifDefined(
            extConfigs.DAH_entry_roles,
            (cfg) => new DAH_entry_roles(cfg),
        ),
        DAH_entry_title: ifDefined(
            extConfigs.DAH_entry_title,
            (cfg) => new DAH_entry_title(cfg),
        ),
        DAH_entry_type: ifDefined(
            extConfigs.DAH_entry_type,
            (cfg) => new DAH_entry_type(cfg),
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

    ifDefined(extensions.DAH_factors, (ext) => {
        factorScoreCombineWeight = ext.getFactorCombineWeightVector();
    });

    if (!factorScoreCombineWeight) {
        throw new Error("factor score combine weight not specified");
    }

    checkExtensionDependencies(extensions);

    return {
        extensions,
        factorScoreCombineWeight,
        api: new ContextAPI(),
    };
}

export interface Result extends HasMeta<ResultMeta> {
    positiveScore: Vector;
    negativeScore: Vector;
    overallVector: Vector;
}

function embed(
    context: Context,
    vector: Vector,
): Vector {
    return new Vector(
        vector.data.map((v, i) =>
            Math.pow(v, 1 / context.factorScoreCombineWeight.data[i])
        ),
    );
}

function unembed(
    context: Context,
    vector: Vector,
): Vector {
    return new Vector(
        vector.data.map((v, i) =>
            Math.pow(v, context.factorScoreCombineWeight.data[i])
        ),
    );
}

function constScoreCalc(
    context: Context,
    data: Data,
    sign: number,
): Map<Id, Vector> {
    const signedRelu = (vector: Vector) => {
        return new Vector(vector.data.map((v) => Math.max(0, sign * v)));
    };
    const impactEmbeddedScores = [];
    for (let i = 0; i < data.impacts.length; i++) {
        impactEmbeddedScores[i] = embed(
            context,
            signedRelu(data.impacts[i].score),
        );
    }

    const impactScores = new Map<Id, Vector>();
    for (const id of data.entries.keys()) {
        impactScores.set(id, newZeroVector(context));
    }

    for (let i = 0; i < data.impacts.length; i++) {
        const impact = data.impacts[i];
        for (const [entry, weight] of impact.contributors) {
            impactScores.get(entry)!.add(
                weight.mul(impactEmbeddedScores[i]),
            );
        }
    }

    return impactScores;
}

function topoSortEntries(
    _context: Context,
    data: Data,
): Id[][] {
    const entryGraph = new Graph({ directed: true });
    for (const id of data.entries.keys()) {
        entryGraph.setNode(id);
    }
    for (const relation of data.relations) {
        for (const contrib of relation.contributors.keys()) {
            if (!data.entries.has(contrib)) {
                continue;
            }
            for (const ref of relation.references.keys()) {
                if (!data.entries.has(ref)) {
                    continue;
                }

                entryGraph.setEdge(ref, contrib);
            }
        }
    }

    const sccs = alg.tarjan(entryGraph);
    const idToScc = new Map<Id, number>();
    for (let i = 0; i < sccs.length; i++) {
        for (const id of sccs[i]) {
            idToScc.set(id, i);
        }
    }

    const sccGraph = new Graph({ directed: true });
    for (let i = 0; i < sccs.length; i++) {
        entryGraph.setNode(i.toString());
    }

    for (const entry of data.entries.keys()) {
        const sccId = idToScc.get(entry);
        if (sccId === undefined) {
            continue;
        }

        const succs = entryGraph.successors(entry);
        if (succs === undefined) {
            continue;
        }

        for (const succ of succs) {
            const succSccId = idToScc.get(succ);
            if (succSccId === undefined || succSccId === sccId) {
                continue;
            }

            sccGraph.setEdge(sccId.toString(), succSccId.toString());
        }
    }

    const order = alg.topsort(sccGraph);
    return order.map((id) => sccs[parseInt(id)]);
}

function createRelationMaps(relations: Relation[]): Map<Id, Map<Id, Matrix>> {
    const relationMaps = new Map<Id, Map<Id, Matrix>>();
    const addRelation = (contrib: Id, ref: Id, matrix: Matrix) => {
        if (!relationMaps.has(contrib)) {
            relationMaps.set(contrib, new Map<Id, Matrix>());
        }

        const existingMatrix = relationMaps.get(contrib)!.get(ref);
        if (existingMatrix === undefined) {
            relationMaps.get(contrib)!.set(ref, matrix);
        } else {
            existingMatrix.add(matrix);
        }
    };

    for (const relation of relations) {
        for (const [contrib, contribWeight] of relation.contributors) {
            for (const [ref, refWeight] of relation.references) {
                const matrix = contribWeight.mul(refWeight);
                addRelation(contrib, ref, matrix);
            }
        }
    }

    return relationMaps;
}

export function processContext(context: Context, data: Data): Map<Id, Result> {
    ifDefined(
        context.extensions.DAH_entry_roles,
        (e) => e.preprocessData(context, data),
    );

    const positiveConstScores = constScoreCalc(context, data, 1.0);
    const negativeConstScores = constScoreCalc(context, data, -1.0);
    const entrySccs = topoSortEntries(context, data);

    const embeddedTotalScores = new Map<Id, [Vector, Vector]>();
    const results = new Map<Id, Result>();

    const relations = createRelationMaps(data.relations);

    for (const entryScc of entrySccs) {
        const idToIndexMap = new Map<Id, number>();
        for (let i = 0; i < entryScc.length; i++) {
            idToIndexMap.set(entryScc[i], i);
        }

        const N = context.factorScoreCombineWeight.data.length;
        const equationMatrix = identityMathJs(
            N * entryScc.length,
        ) as MathJsMatrix;
        const subAssign = (i: number, j: number, amt: number) => {
            equationMatrix.set([i, j], equationMatrix.get([i, j]) - amt);
        };

        for (let i = 0; i < entryScc.length; i++) {
            const entryId = entryScc[i];
            const refs = relations.get(entryId);
            if (refs === undefined) {
                continue;
            }

            for (const [ref, refWeight] of refs) {
                const embeddedRefScore = embeddedTotalScores.get(ref);
                if (embeddedRefScore !== undefined) {
                    const [posRef, negRef] = embeddedRefScore;
                    positiveConstScores.get(entryId)!.add(
                        refWeight.mul(posRef),
                    );
                    negativeConstScores.get(entryId)!.add(
                        refWeight.mul(negRef),
                    );
                } else {
                    assert(entryScc.includes(ref));
                    const j = entryScc.indexOf(ref);
                    assert(j >= 0);

                    // subAssign refWeight from equationMatrix[i*N:(i+1)*N, j*N:(j+1)*N]
                    for (let ip = 0; ip < N; ++ip) {
                        for (let jp = 0; jp < N; ++jp) {
                            const w = refWeight.get(ip, jp);
                            subAssign(i * N + ip, j * N + jp, w);
                        }
                    }
                }
            }
        }

        const equationRhs = new Array<[number, number]>(N * entryScc.length);
        for (let i = 0; i < entryScc.length; ++i) {
            const entryId = entryScc[i];
            const positiveConst = positiveConstScores.get(entryId)!;
            const negativeConst = negativeConstScores.get(entryId)!;
            for (let j = 0; j < N; ++j) {
                equationRhs[i * N + j] = [
                    positiveConst.data[j],
                    negativeConst.data[j],
                ];
            }
        }
        const equationRhsMatrix = mathjsMatrix(equationRhs);
        const overallScores = lusolve(equationMatrix, equationRhsMatrix);

        for (let i = 0; i < entryScc.length; ++i) {
            const result = {
                positiveScore: newZeroVector(context),
                negativeScore: newZeroVector(context),
                overallVector: newZeroVector(context),
                DAH_meta: {},
            };
            for (let j = 0; j < N; ++j) {
                result.positiveScore.data[j] = overallScores.get([
                    i * N + j,
                    0,
                ])!;
                result.negativeScore.data[j] = overallScores.get([
                    i * N + j,
                    1,
                ])!;
            }

            result.positiveScore = unembed(context, result.positiveScore);
            result.negativeScore = unembed(context, result.negativeScore);
            result.overallVector.add(result.positiveScore);
            result.overallVector.add(result.negativeScore.mul(-1));

            results.set(entryScc[i], result);
        }
    }

    return processResults(context, data, results);
}

export function newZeroVector(context: Context): Vector {
    return context.factorScoreCombineWeight.mul(0.0);
}

function processResults(
    context: Context,
    data: Data,
    results: Map<Id, Result>,
): Map<Id, Result> {
    ifDefined(
        context.extensions.DAH_overall_score,
        (ext) => ext.postProcess(context, results),
    );

    ifDefined(
        context.extensions.DAH_anime_normalize,
        (ext) => ext.postProcess(context, results),
    );

    ifDefined(
        context.extensions.DAH_serialize_json,
        (ext) => ext.serialize(data, results),
    );

    return results;
}
