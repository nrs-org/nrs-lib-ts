import {} from "../mod.ts";

export class DAH_ir_source {
    constructor(_: ExtConfig_DAH_ir_source) {}

    dependencies(): string[] {
        return [];
    }
}

export type ExtConfig_DAH_ir_source =
    | Record<string | number | symbol, never>
    | undefined;

export interface IRSourceMeta {
    extension: string;
    version: string;
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
