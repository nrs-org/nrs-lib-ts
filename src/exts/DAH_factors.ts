import { Vector } from "../math.ts";

interface Factor<S> {
    name: S,
    factorWeight: number;
    factorIndex: number;
}

function factor<S>(name: S, weight: number, index: number): Factor<S> {
    return {
        name,
        factorWeight: weight,
        factorIndex: index,
    };
}

export const AU = factor("ActivatedUnpleasant" as const, 0.3, 0);
export const AP = factor("ActivatedPleasant" as const, 0.4, 1);
export const MU = factor("ModerateUnpleasant" as const, 0.35, 2);
export const MP = factor("ModeratePleasant" as const, 0.35, 3);
export const CU = factor("CalmingUnpleasant" as const, 0.4, 4);
export const CP = factor("CalmingPleasant" as const, 0.5, 5);
export const AL = factor("Language" as const, 0.4, 6);
export const AV = factor("Visual" as const, 0.1, 7);
export const AM = factor("Music" as const, 0.3, 8);

export const Emotion = {
    subscoreWeight: 0.6,
    subscoreIndex: 0,
    factors: [AU, AP, MU, MP, CU, CP],
};

export const Art = {
    subscoreWeight: 0.7,
    subscoreIndex: 1,
    factors: [AL, AV, AM],
};

export const Boredom = {
    subscoreWeight: 0.05,
    subscoreIndex: 2,
    factorWeight: 0.05,
    factorIndex: 9,
    name: "B" as const,
    factors: [] as Array<Factor<"B">>,
};

export const Additional = {
    subscoreWeight: 1.0,
    subscoreIndex: 3,
    factorWeight: 1.0,
    factorIndex: 10,
    name: "A" as const,
    factors: [] as Array<Factor<"A">>,
};

Boredom.factors.push(Boredom);
Additional.factors.push(Additional);

export type Subscore =
    | typeof Emotion
    | typeof Art
    | typeof Boredom
    | typeof Additional;
export type EmotionFactor = typeof AU | typeof AP | typeof MU | typeof MP | typeof CU | typeof CP;
export type ArtFactor = typeof AV | typeof AL | typeof AM;
export type FactorScore = typeof Boredom | typeof Additional | EmotionFactor | ArtFactor;

export class DAH_factors {
    constructor(_: ExtConfig_DAH_factors) {}

    dependencies(): string[] {
        return [];
    }

    getFactorCombineWeightVector(): Vector {
        return [AU, AP, MU, MP, CU, CP, AL, AV, AM, Boredom, Additional].map(
            (f) => f.factorWeight
        );
    }
}

export type ExtConfig_DAH_factors =
    | Record<string | number | symbol, never>
    | undefined;
