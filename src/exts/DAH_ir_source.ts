import {} from "../data.ts";

export interface IRSourceMeta {
    extension: string;
    version: string;
}

export interface HasIRSourceMeta {
    DAH_ir_source?: IRSourceMeta;
}

declare module "../data.ts" {
    // deno-lint-ignore no-empty-interface
    interface ImpactMeta extends HasIRSourceMeta {}
    // deno-lint-ignore no-empty-interface
    interface RelationMeta extends HasIRSourceMeta {}
}
