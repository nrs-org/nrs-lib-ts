// @deno-types="npm:@types/luxon"
import { DateTime, Zone } from "npm:luxon@3.2.0";

import { Id, Impact } from "../data.ts";
import { Vector } from "../math.ts";
import { combine, Context, newZeroVector } from "../process.ts";
import { assert } from "../utils.ts";
import { Emotion, EmotionFactor } from "./DAH_factors.ts";

export type WeightedEmotions = [EmotionFactor, number][];
export type Contributors = Map<Id, number>;

export function today(): DateTime {
    return DateTime.now();
}

export interface FromToPeriod {
    from: DateTime;
    to: DateTime;
}

export interface LengthPeriod {
    length: number;
}

export type DatePeriod = FromToPeriod | LengthPeriod;

export class DAH_standards {
    config: ExtConfig_DAH_standards;
    constructor(config: ExtConfig_DAH_standards) {
        this.config = config;
    }

    dependencies(): string[] {
        return ["DAH_factors"];
    }

    #emotionVector(
        context: Context,
        baseScore: number,
        emotions: WeightedEmotions
    ): Vector {
        assert(emotions.length > 0, "empty emotion list");

        const contribFactors = emotions.map(([_, factor]) => factor);
        const combinedFactor = combine(
            context,
            contribFactors,
            Emotion.subscoreWeight
        );

        const vector = newZeroVector(context);
        for (const [emotion, factor] of emotions) {
            vector[emotion.factorIndex] =
                (baseScore * Math.pow(factor, 0.9)) / combinedFactor;
        }

        return vector;
    }

    #impactMeta(meta: Record<string, unknown>): Record<string, unknown> {
        return {
            DAH_ir_source: {
                extension: "DAH_standards",
                version: "1.1.1",
                ...meta,
            },
        };
    }

    #emotionPairsToObject(emotions: WeightedEmotions) {
        return Object.fromEntries(
            emotions.map(([emotion, weight]) => [emotion.name, weight])
        );
    }

    emotion(
        context: Context,
        contributors: Contributors,
        base: number,
        emotions: WeightedEmotions,
        meta?: Record<string, unknown>
    ): Impact {
        meta =
            meta ??
            this.#impactMeta({
                name: "emotion",
                args: {
                    base,
                    emotions: this.#emotionPairsToObject(emotions),
                },
            });
        return {
            contributors,
            score: this.#emotionVector(context, base, emotions),
            DAH_meta: meta,
        };
    }

    cry(
        context: Context,
        contributors: Contributors,
        emotions: WeightedEmotions
    ): Impact {
        return this.emotion(
            context,
            contributors,
            4.0,
            emotions,
            this.#impactMeta({
                name: "cry",
                args: {
                    emotions: this.#emotionPairsToObject(emotions),
                },
            })
        );
    }

    #periodLength(period: DatePeriod): number {
        if ("length" in period) {
            return period.length;
        } else {
            return period.from.diff(period.to).as("days");
        }
    }

    pads(
        context: Context,
        contributors: Contributors,
        periods: DatePeriod[],
        emotions: WeightedEmotions
    ): Impact {
        // coefficients
        const a = 0.3,
            p = 1.3;
        const length = periods
            .map((p) => this.#periodLength(context, p))
            .reduce((a, b) => a + b);
        const base = a * Math.pow(Math.min(10, length), p);

        return this.emotion(context, contributors, base, emotions, this.#impactMeta({
            name: "pads",
            args: {
                totalLength: length,
                periods: 
            }
        }))
    }
}

export interface ExtConfig_DAH_standards {
}
