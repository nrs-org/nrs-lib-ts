import { CombineFunction } from "./process.ts";

export function makeCombineSigned(unsignedFunction: CombineFunction): CombineFunction {
    return (arr, factor) => {
        const positive = arr.filter(x => x > 0);
        const negativeAbs = arr.filter(x => x < 0).map(x => -x);
        return unsignedFunction(positive, factor) - unsignedFunction(negativeAbs, factor);
    };
}

export function assert(cond: boolean, msg: string | undefined = undefined): asserts cond {
    if(!cond) {
        throw new Error(msg || "Assertion failed");
    }
}