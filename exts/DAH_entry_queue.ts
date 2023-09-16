import { Entry } from "../mod.ts";

export class DAH_entry_queue {
    constructor(_: ExtConfig_DAH_entry_queue) {}

    dependencies(): string[] {
        return [];
    }

    suppressRule(entry: Entry, rule: string) {
        const queues = entry.DAH_meta.DAH_validator_suppress;
        if (queues !== undefined && !Array.isArray(queues)) {
            throw new Error(
                `invalid pre-existing value for 'DAH_entry_queue': ${queues}`,
            );
        }

        if (queues === undefined) {
            entry.DAH_meta.DAH_entry_queue = [rule];
        } else {
            queues.push(rule);
        }
    }
}

export type ExtConfig_DAH_entry_queue =
    | Record<string | number | symbol, never>
    | undefined;

declare module "../mod.ts" {
    interface EntryMeta {
        DAH_entry_queue?: string[];
    }
}
