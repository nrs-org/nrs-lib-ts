import {} from "../data.ts";

declare module "../data.ts" {
    interface EntryMeta {
        // only present in entry meta
        DAH_entry_title: string | undefined;
    }
}
