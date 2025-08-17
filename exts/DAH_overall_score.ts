import { combinePow } from "../mod.ts";
import { Context, Id, Result, Vector } from "../mod.ts";
import { Additional, Art, Boredom, Emotion, Subscore } from "./DAH_factors.ts";

export class DAH_overall_score {
    constructor(_: ExtConfig_DAH_overall_score) {}

    dependencies(): string[] {
        return ["DAH_factors"];
    }

    #calcOverallScore(_context: Context, vector: Vector): number {
        return [Emotion, Art, Boredom, Additional]
            .map((subscore) =>
                combinePow(
                    subscore.factors.map((f) => vector.data[f.factorIndex]),
                    subscore.subscoreWeight,
                )
            )
            .reduce((a, b) => a + b);
    }

    postProcess(context: Context, results: Map<Id, Result>) {
        for (const result of results.values()) {
            result.DAH_meta.DAH_overall_score = this.#calcOverallScore(
                context,
                result.overallVector,
            );
        }
    }
}

export type ExtConfig_DAH_overall_score = Record<
    string | number | symbol,
    never
>;

declare module "../mod.ts" {
    interface ResultMeta {
        DAH_overall_score?: number;
    }
}