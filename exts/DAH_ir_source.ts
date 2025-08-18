import {} from "../mod.ts";

import { IRName as DAH_standards_IRName } from "./DAH_standards.ts";
import { IRName as DAH_entry_contains_IRName } from "./DAH_entry_contains.ts";

export class DAH_ir_source {
    constructor(_: ExtConfig_DAH_ir_source) {}

    dependencies(): string[] {
        return [];
    }
}

export type ExtConfig_DAH_ir_source =
    | Record<string | number | symbol, never>
    | undefined;

export type IRName = DAH_standards_IRName | DAH_entry_contains_IRName;

export interface IRSourceMeta {
    extension: string;
    version: string;
    name: IRName;
}

export interface HasIRSourceMeta {
    DAH_ir_source?: IRSourceMeta;
}

declare module "../mod.ts" {
    // deno-lint-ignore no-empty-interface
    interface ImpactMeta extends HasIRSourceMeta {}
    // deno-lint-ignore no-empty-interface
    interface RelationMeta extends HasIRSourceMeta {}
}