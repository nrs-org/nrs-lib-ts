import {} from "../data.ts";

export class DAH_entry_title {
    constructor(_: ExtConfig_DAH_entry_title) {}

    dependencies(): string[] {
        return [];
    }
}
export type ExtConfig_DAH_entry_title = Record<string | number | symbol, never>;

declare module "../data.ts" {
    interface EntryMeta {
        // only present in entry meta
        DAH_entry_title: string | undefined;
    }
}
