import {
    Data,
    DiagonalMatrix,
    Entry,
    EntryMeta,
    HasMeta,
    Id,
    Impact,
    ImpactMeta,
    Matrix,
    RegularMatrix,
    Relation,
    RelationMeta,
    Result,
    ResultMeta,
    ScalarMatrix,
    Vector,
} from "../mod.ts";
import { factorScores, FactorScoreShortName } from "./DAH_factors.ts";

type FactorScoreNamePair = `${FactorScoreShortName},${FactorScoreShortName}`;
type SamePair<T> = T extends infer F extends string ? `${F},${F}` : never;
type SameEmotionPair = SamePair<FactorScoreShortName>;

type JSONVector = Partial<Record<FactorScoreShortName, number>>;
type JSONMatrixObject = Partial<
    Omit<
        Record<FactorScoreNamePair | FactorScoreShortName, number>,
        SameEmotionPair
    >
>;
type JSONMatrix = number | JSONMatrixObject;

export function toJSONMatrix(m: Matrix): JSONMatrix {
    const n = factorScores.length;
    if (m instanceof ScalarMatrix) {
        return m.data;
    }

    const matrix: JSONMatrixObject = {};
    if (m instanceof DiagonalMatrix) {
        for (let i = 0; i < n; ++i) {
            const value = m.data[i];
            if (Math.abs(value) >= 1e-4) {
                matrix[factorScores[i].shortName] = m.data[i];
            }
        }
    } else {
        for (let i = 0; i < n; ++i) {
            for (let j = 0; j < n; ++j) {
                const key = i == j
                    ? factorScores[i].shortName
                    : `${factorScores[i].shortName},${
                        factorScores[j].shortName
                    }`;
                const value = m.data[i * n + j];
                if (Math.abs(value) >= 1e-4) {
                    matrix[key as keyof JSONMatrixObject] = value;
                }
            }
        }
    }

    return matrix;
}

export function toJSONVector(vector: Vector): JSONVector {
    return toJSONMatrix(new DiagonalMatrix(vector.data)) as JSONVector;
}

export function fromJSONMatrix(matrix: JSONMatrix): Matrix {
    if (typeof matrix === "number") {
        return new ScalarMatrix(matrix);
    }

    const vector = fromJSONVector(matrix as JSONVector).data;

    let data: number[] | undefined = undefined;
    const n = factorScores.length;
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < n; ++j) {
            if (i === j) {
                continue;
            }

            const key = `${factorScores[i].shortName},${
                factorScores[j].shortName
            }` as keyof JSONMatrixObject;
            const value = matrix[key] ?? 0.0;

            if (Math.abs(value) < 1e-4) {
                continue;
            }

            if (data === undefined) {
                data = new Array<number>(n * n).fill(0.0);
                for (let k = 0; k < n; ++k) {
                    data[k * (n + 1)] = vector[k];
                }
            }

            data[i * n + j] = value;
        }
    }

    if (data === undefined) {
        return new DiagonalMatrix(vector);
    }

    return new RegularMatrix(data);
}

export function fromJSONVector(jsonVector: JSONVector): Vector {
    const vector = new Array<number>(factorScores.length);
    for (let i = 0; i < factorScores.length; ++i) {
        vector[i] = jsonVector[factorScores[i].shortName] ?? 0.0;
    }
    return new Vector(vector);
}

export interface JSONEntry extends HasMeta<EntryMeta> {
    id: Id;
}

export interface JSONImpact extends HasMeta<ImpactMeta> {
    contributors: Record<Id, JSONMatrix>;
    score: JSONVector;
}

export interface JSONRelation extends HasMeta<RelationMeta> {
    contributors: Record<Id, JSONMatrix>;
    references: Record<Id, JSONMatrix>;
}

export interface JSONResult extends HasMeta<ResultMeta> {
    positiveScore: JSONVector;
    negativeScore: JSONVector;
    overallVector: JSONVector;
}

function mapValues<K, V1, V2>(
    map: Map<K, V1>,
    transform: (v: V1) => V2,
): Map<K, V2> {
    const ret = new Map<K, V2>();
    for (const [key, value] of map.entries()) {
        ret.set(key, transform(value));
    }
    return ret;
}

function toJSONEntry(entry: Entry): JSONEntry {
    return {
        id: entry.id,
        DAH_meta: entry.DAH_meta,
    };
}

function toJSONImpact(impact: Impact): JSONImpact {
    return {
        contributors: Object.fromEntries(
            mapValues(impact.contributors, toJSONMatrix),
        ),
        score: toJSONVector(impact.score),
        DAH_meta: impact.DAH_meta,
    };
}

function toJSONRelation(relation: Relation): JSONRelation {
    return {
        contributors: Object.fromEntries(
            mapValues(relation.contributors, toJSONMatrix),
        ),
        references: Object.fromEntries(
            mapValues(relation.references, toJSONMatrix),
        ),
        DAH_meta: relation.DAH_meta,
    };
}

function fromJSONEntry(entry: JSONEntry): Entry {
    return {
        id: entry.id,
        DAH_meta: entry.DAH_meta,
    };
}

function fromJSONImpact(impact: JSONImpact): Impact {
    return {
        contributors: mapValues(
            new Map(Object.entries(impact.contributors)),
            fromJSONMatrix,
        ),
        score: fromJSONVector(impact.score),
        DAH_meta: impact.DAH_meta,
    };
}

function fromJSONRelation(relation: JSONRelation): Relation {
    return {
        contributors: mapValues(
            new Map(Object.entries(relation.contributors)),
            fromJSONMatrix,
        ),
        references: mapValues(
            new Map(Object.entries(relation.references)),
            fromJSONMatrix,
        ),
        DAH_meta: relation.DAH_meta,
    };
}

function fromJSONResult(result: JSONResult): Result {
    return {
        positiveScore: fromJSONVector(result.positiveScore),
        negativeScore: fromJSONVector(result.negativeScore),
        overallVector: fromJSONVector(result.overallVector),
        DAH_meta: result.DAH_meta,
    };
}

export class DAH_serialize_json {
    config: ExtConfig_DAH_serialize_json;
    constructor(config: ExtConfig_DAH_serialize_json) {
        this.config = config;
    }

    dependencies(): string[] {
        return ["DAH_serialize", "DAH_factors"];
    }

    async #serialize(
        stream: WritableStream | undefined,
        // deno-lint-ignore no-explicit-any
        objectCallback: () => any,
    ) {
        if (stream !== undefined) {
            const encoder = new TextEncoder();
            const json = JSON.stringify(
                objectCallback(),
                null,
                this.config.indent,
            );
            await stream.getWriter().write(encoder.encode(json));
        }
    }

    async serialize(data: Data, result: Map<Id, Result>) {
        await this.#serialize(this.config.entries, () => {
            const entries: Record<Id, JSONEntry> = {};
            for (const [id, entry] of data.entries) {
                entries[id] = toJSONEntry(entry);
            }
            return entries;
        });
        await this.#serialize(
            this.config.impacts,
            () => data.impacts.map(toJSONImpact),
        );
        await this.#serialize(
            this.config.relations,
            () => data.relations.map(toJSONRelation),
        );
        await this.#serialize(
            this.config.scores,
            () => Object.fromEntries(result),
        );
        await this.#serialize(this.config.bulk, () => {
            const entries: Record<Id, JSONEntry> = {};
            for (const [id, entry] of data.entries) {
                entries[id] = toJSONEntry(entry);
            }
            return {
                entries,
                impacts: data.impacts.map(toJSONImpact),
                relations: data.relations.map(toJSONRelation),
                scores: Object.fromEntries(result),
            };
        });
    }
}

export interface ExtConfig_DAH_serialize_json {
    entries?: WritableStream;
    impacts?: WritableStream;
    relations?: WritableStream;
    scores?: WritableStream;
    bulk?: WritableStream;
    indent?: string | number;
}

export function deserializeEntries(json: string): Map<Id, Entry> {
    return new Map<Id, Entry>(
        Object.entries(JSON.parse(json) as Record<string, JSONEntry>).map(
            ([key, value]) => [key, fromJSONEntry(value)],
        ),
    );
}

export function deserializeImpacts(json: string): Impact[] {
    return (JSON.parse(json) as JSONImpact[]).map(fromJSONImpact);
}

export function deserializeRelations(json: string): Relation[] {
    return (JSON.parse(json) as JSONRelation[]).map(fromJSONRelation);
}

export function deserializeResults(json: string): Map<Id, Result> {
    return new Map<Id, Result>(
        Object.entries(JSON.parse(json) as Record<Id, Result>),
    );
}

interface Bulk {
    entries: Record<Id, JSONEntry>;
    impacts: JSONImpact[];
    relations: JSONRelation[];
    scores: Record<Id, JSONResult>;
}

export function deserializeBulk(json: string): [Data, Map<Id, Result>] {
    const obj = JSON.parse(json) as Bulk;
    return [
        {
            entries: new Map<Id, Entry>(
                Object.entries(obj.entries).map(([key, value]) => [
                    key,
                    fromJSONEntry(value),
                ]),
            ),
            impacts: obj.impacts.map(fromJSONImpact),
            relations: obj.relations.map(fromJSONRelation),
        },
        mapValues(
            new Map<Id, JSONResult>(Object.entries(obj.scores)),
            fromJSONResult,
        ),
    ];
}