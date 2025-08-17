import { Context, Id, identityMatrix, Matrix, Relation } from "../mod.ts";

export class DAH_entry_contains {
    constructor(_: ExtConfig_DAH_entry_contains) {}

    dependencies(): string[] {
        return [];
    }

    entryContains(
        _context: Context,
        contributors: Map<Id, Matrix>,
        childId: Id,
    ): Relation {
        return {
            contributors,
            references: new Map<Id, Matrix>([[childId, identityMatrix]]),
            DAH_meta: {
                DAH_ir_source: {
                    extension: "DAH_entry_contains",
                    version: "1.0.0",
                    name: "entry_contains",
                },
            },
        };
    }
}

export type ExtConfig_DAH_entry_contains =
    | Record<string | number | symbol, never>
    | undefined;

export type IRName = "entry_contains";
