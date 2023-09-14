import { Vector } from "../mod.ts";

interface Factor<SN, N> {
    shortName: SN;
    name: N;
    factorWeight: number;
    factorIndex: number;
}

function factor<SN, S>(
    shortName: SN,
    name: S,
    weight: number,
    index: number,
): Factor<SN, S> {
    return {
        shortName,
        name,
        factorWeight: weight,
        factorIndex: index,
    };
}

export type EmotionName = "AU" | "AP" | "MU" | "MP" | "CU" | "CP";

export const AU = factor("AU" as const, "ActivatedUnpleasant" as const, 0.3, 0);
export const AP = factor("AP" as const, "ActivatedPleasant" as const, 0.4, 1);
export const MU = factor("MU" as const, "ModerateUnpleasant" as const, 0.35, 2);
export const MP = factor("MP" as const, "ModeratePleasant" as const, 0.35, 3);
export const CU = factor("CU" as const, "CalmingUnpleasant" as const, 0.4, 4);
export const CP = factor("CP" as const, "CalmingPleasant" as const, 0.5, 5);
export const AL = factor("AL" as const, "Language" as const, 0.4, 6);
export const AV = factor("AV" as const, "Visual" as const, 0.1, 7);
export const AM = factor("AM" as const, "Music" as const, 0.3, 8);

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
    shortName: "B" as const,
    name: "Boredom" as const,
    factors: [] as Array<Factor<"B", "Boredom">>,
};

export const Additional = {
    subscoreWeight: 1.0,
    subscoreIndex: 3,
    factorWeight: 1.0,
    factorIndex: 10,
    shortName: "A" as const,
    name: "Additional" as const,
    factors: [] as Array<Factor<"A", "Additional">>,
};

Boredom.factors.push(Boredom);
Additional.factors.push(Additional);

export type Subscore =
    | typeof Emotion
    | typeof Art
    | typeof Boredom
    | typeof Additional;
export type EmotionFactor =
    | typeof AU
    | typeof AP
    | typeof MU
    | typeof MP
    | typeof CU
    | typeof CP;
export type ArtFactor = typeof AV | typeof AL | typeof AM;
export type FactorScore =
    | typeof Boredom
    | typeof Additional
    | EmotionFactor
    | ArtFactor;

export type FactorScoreShortName = FactorScore["shortName"];

export class DAH_factors {
    constructor(_: ExtConfig_DAH_factors) {}

    dependencies(): string[] {
        return [];
    }

    getFactorCombineWeightVector(): Vector {
        return factorScores.map((f) => f.factorWeight);
    }
}

export const factorScores: FactorScore[] = [
    AU,
    AP,
    MU,
    MP,
    CU,
    CP,
    AL,
    AV,
    AM,
    Boredom,
    Additional,
];

export type ExtConfig_DAH_factors =
    | Record<string | number | symbol, never>
    | undefined;
