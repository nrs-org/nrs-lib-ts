import { CombineFunction, makeCombineSigned } from "../mod.ts";

function combineUnsigned(arr: number[], factor: number) {
    if (factor < 1e-4) {
        return arr.reduce((a, b) => Math.max(a, b), 0.0);
    }

    return Math.pow(
        arr.map((x) => Math.pow(x, 1.0 / factor)).reduce((a, b) => a + b, 0.0),
        factor,
    );
}

export class DAH_combine_pow {
    constructor(_: ExtConfig_DAH_combine_pow) {}

    dependencies(): string[] {
        return [];
    }

    makeCombineFunction(): CombineFunction {
        return makeCombineSigned(combineUnsigned);
    }
}

export type ExtConfig_DAH_combine_pow = Record<string | number | symbol, never>;
