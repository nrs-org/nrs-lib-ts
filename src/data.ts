import { Matrix, Vector } from "./math.ts";

// required extensions: DAH_entry_id, DAH_meta
export type Meta = Record<string, unknown>;
export type Id = string;

export interface HasMeta {
    DAH_meta: Meta;
}

export interface Entry extends HasMeta {
    id: Id;
    children: Map<Id, number>;
}

export interface Impact extends HasMeta {
    contributors: Map<Id, number>;
    score: Vector;
}

export interface Relation extends HasMeta {
    contributors: Map<Id, number>;
    references: Map<Id, Matrix>;
}

export interface Data {
    entries: Map<Id, Entry>;
    impacts: Impact[];
    relations: Relation[];
}

export function indexEntry(entries: Iterable<Entry>): Map<Id, Entry> {
    const map = new Map<Id, Entry>();
    for (const entry of entries) {
        map.set(entry.id, entry);
    }
    return map;
}
