import { HasMeta, Meta } from "../mod.ts";

export class DAH_validator_suppress {
    constructor(_: ExtConfig_DAH_validator_suppress) {}

    dependencies(): string[] {
        return [];
    }

    suppressRule<M extends Meta>(hasMeta: HasMeta<M>, rule: string) {
        const rules = hasMeta.DAH_meta.DAH_validator_suppress;
        if (rules !== undefined && !Array.isArray(rules)) {
            throw new Error(
                `invalid pre-existing value for 'DAH_validator_suppress': ${rules}`,
            );
        }

        if (rules === undefined) {
            hasMeta.DAH_meta.DAH_validator_suppress = [rule];
        } else {
            rules.push(rule);
        }
    }
}

export type ExtConfig_DAH_validator_suppress =
    | Record<string | number | symbol, never>
    | undefined;

declare module "../mod.ts" {
    interface Meta {
        DAH_validator_suppress?: string[];
    }
}
