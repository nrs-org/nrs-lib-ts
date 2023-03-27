import { Id, Entry, Data, Impact, Relation, HasMeta } from "../data.ts";
import { Matrix, Vector } from "../math.ts";
import { Result } from "../process.ts";

export interface JSONEntry extends HasMeta {
    id: Id;
    children: Record<Id, number>;
}

export interface JSONImpact extends HasMeta {
    contributors: Record<Id, number>;
    score: Vector;
}

export interface JSONRelation extends HasMeta {
    contributors: Record<Id, number>;
    references: Record<Id, Matrix>;
}

function toJSONEntry(entry: Entry): JSONEntry {
    return {
        id: entry.id,
        children: Object.fromEntries(entry.children),
        DAH_meta: entry.DAH_meta,
    };
}

function toJSONImpact(impact: Impact): JSONImpact {
    return {
        contributors: Object.fromEntries(impact.contributors),
        score: impact.score,
        DAH_meta: impact.DAH_meta,
    };
}

function toJSONRelation(relation: Relation): JSONRelation {
    return {
        contributors: Object.fromEntries(relation.contributors),
        references: Object.fromEntries(relation.references),
        DAH_meta: relation.DAH_meta,
    };
}

function fromJSONEntry(entry: JSONEntry): Entry {
    return {
        id: entry.id,
        children: new Map(Object.entries(entry.children)),
        DAH_meta: entry.DAH_meta,
    };
}

function fromJSONImpact(impact: JSONImpact): Impact {
    return {
        contributors: new Map(Object.entries(impact.contributors)),
        score: impact.score,
        DAH_meta: impact.DAH_meta,
    };
}

function fromJSONRelation(relation: JSONRelation): Relation {
    return {
        contributors: new Map(Object.entries(relation.contributors)),
        references: new Map(Object.entries(relation.references)),
        DAH_meta: relation.DAH_meta,
    };
}

export class DAH_serialize_json {
    config: ExtConfig_DAH_serialize_json;
    constructor(config: ExtConfig_DAH_serialize_json) {
        this.config = config;
    }

    dependencies(): string[] {
        return ["DAH_serialize"];
    }

    async #serialize(
        stream: WritableStream | undefined,
        // deno-lint-ignore no-explicit-any
        objectCallback: () => any
    ) {
        const encoder = new TextEncoder();
        if (stream !== undefined) {
            const json = JSON.stringify(
                objectCallback(),
                null,
                this.config.indent
            );
            await stream.getWriter().write(encoder.encode(json));
        }
    }

    async serialize(data: Data, result: Map<Id, Result>) {
        await this.#serialize(this.config.entries, () => {
            const entries: Record<Id, JSONEntry> = {};
            for(const [id, entry] of data.entries) {
                entries[id] = toJSONEntry(entry);
            }
            return entries;
        });
        await this.#serialize(this.config.impacts, () =>
            data.impacts.map(toJSONImpact)
        );
        await this.#serialize(this.config.relations, () =>
            data.relations.map(toJSONRelation)
        );
        await this.#serialize(this.config.scores, () =>
            Object.fromEntries(result)
        );
        await this.#serialize(this.config.bulk, () => {
            return {
                entries: Object.fromEntries(data.entries),
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
            ([key, value]) => [key, fromJSONEntry(value)]
        )
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
        Object.entries(JSON.parse(json) as Record<Id, Result>)
    );
}

interface Bulk {
    entries: Record<Id, JSONEntry>;
    impacts: JSONImpact[];
    relations: JSONRelation[];
    results: Record<Id, Result>;
}

export function deserializeBulk(json: string): [Data, Map<Id, Result>] {
    const obj = JSON.parse(json) as Bulk;
    return [
        {
            entries: new Map<Id, Entry>(
                Object.entries(obj.entries).map(([key, value]) => [
                    key,
                    fromJSONEntry(value),
                ])
            ),
            impacts: obj.impacts.map(fromJSONImpact),
            relations: obj.relations.map(fromJSONRelation),
        },
        new Map<Id, Result>(Object.entries(obj.results)),
    ];
}
