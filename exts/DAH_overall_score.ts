import { Id, Vector, combine, Result, Context } from "../mod.ts";
import { Additional, Art, Boredom, Emotion } from "./DAH_factors.ts";

export class DAH_overall_score {
    constructor(_: ExtConfig_DAH_overall_score) {}

    dependencies(): string[] {
        return ["DAH_factors"];
    }

    #calcOverallScore(context: Context, vector: Vector): number {
        return [Emotion, Art, Boredom, Additional]
            .map((subscore) =>
                combine(
                    context,
                    subscore.factors.map(
                        (factor) => vector[factor.factorIndex],
                    ),
                    subscore.subscoreWeight,
                ),
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
