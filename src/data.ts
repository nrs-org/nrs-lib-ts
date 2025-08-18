import { Matrix, Vector } from "./math.ts";

// required extensions: DAH_entry_id, DAH_meta
export interface Meta {
    _placeholder?: never;
}

export type Id = string;

export interface EntryMeta extends Meta {}
export interface ImpactMeta extends Meta {}
export interface RelationMeta extends Meta {}
export interface ResultMeta extends Meta {}

export interface HasMeta<M extends Meta> {
    DAH_meta: M;
}

export interface Entry extends HasMeta<EntryMeta> {
    id: Id;
}

export interface Impact extends HasMeta<ImpactMeta> {
    contributors: Map<Id, Matrix>;
    score: Vector;
}

export interface Relation extends HasMeta<RelationMeta> {
    contributors: Map<Id, Matrix>;
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