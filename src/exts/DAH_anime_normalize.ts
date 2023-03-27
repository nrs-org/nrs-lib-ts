import { Data, Id } from "../data.ts";
import {
Context,
    ContextConfig,
    newContext,
    processContext,
    Result,
} from "../process.ts";

export class DAH_anime_normalize {
    baseAnimeScores: number[];

    constructor(config: ExtConfig_DAH_anime_normalize) {
        const baseAnimeContext = newContext(config.baseAnimeContextConfig);
        const results = processContext(
            baseAnimeContext,
            config.sampleAnimeData
        );
        this.baseAnimeScores = config.entryIds.map(
            (id) => results.get(id)!.DAH_meta.DAH_overall_score as number
        );
    }

    dependencies(): string[] {
        return ["DAH_factors", "DAH_overall_score", "DAH_standards"];
    }

    #normalizeScore(overallScore: number): number {
        if (overallScore <= this.baseAnimeScores[0]) {
            return 1.0;
        } else if (
            overallScore >=
            this.baseAnimeScores[this.baseAnimeScores.length - 1]
        ) {
            return 10.0;
        }

        for (let i = 1; i < this.baseAnimeScores.length; i++) {
            if (this.baseAnimeScores[i] > overallScore) {
                return (
                    i +
                    (overallScore - this.baseAnimeScores[i - 1]) /
                        (this.baseAnimeScores[i] - this.baseAnimeScores[i - 1])
                );
            }
        }

        return 0.0;
    }

    postProcess(_: Context, results: Map<Id, Result>) {
        for (const result of results.values()) {
            const score = result.DAH_meta.DAH_overall_score as number;
            result.DAH_meta.DAH_anime_normalize = {
                score: this.#normalizeScore(score),
            };
        }
    }
}

export interface ExtConfig_DAH_anime_normalize {
    baseAnimeContextConfig: ContextConfig;
    sampleAnimeData: Data;
    entryIds: string[];
}
