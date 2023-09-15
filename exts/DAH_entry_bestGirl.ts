import {} from "../mod.ts";

export class DAH_entry_bestGirl {
    constructor(_: ExtConfig_DAH_entry_bestGirl) {}

    dependencies(): string[] {
        return [];
    }
}
export type ExtConfig_DAH_entry_bestGirl = Record<string | number | symbol, never>;

declare module "../mod.ts" {
    interface EntryMeta {
        // only present in entry meta
        DAH_entry_bestGirl?: string | undefined;
    }
}
