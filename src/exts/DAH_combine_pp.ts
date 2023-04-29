import { CombineFunction } from "../process.ts";
import { makeCombineSigned } from "../utils.ts";

function combineUnsigned(arr: number[], weight: number): number {
    let result = 0.0;
    let multiplier = 1.0;
    for (const value of arr) {
        result += value * multiplier;
        multiplier *= weight;
    }
    return result;
}

export class DAH_combine_pp {
    constructor(_: ExtConfig_DAH_combine_pp) {}

    dependencies(): string[] {
        return [];
    }

    makeCombineFunction(): CombineFunction {
        return makeCombineSigned(combineUnsigned);
    }
}

export type ExtConfig_DAH_combine_pp = Record<string | number | symbol, never>;
