import { CombineFunction } from "./process.ts";

export function makeCombineSigned(
    unsignedFunction: CombineFunction
): CombineFunction {
    return (arr, factor) => {
        const positive = arr.filter((x) => x > 0);
        const negativeAbs = arr.filter((x) => x < 0).map((x) => -x);
        return (
            unsignedFunction(positive, factor) -
            unsignedFunction(negativeAbs, factor)
        );
    };
}

export function assert(
    cond: boolean,
    msg: string | undefined = undefined
): asserts cond {
    if (!cond) {
        throw new Error(msg || "Assertion failed");
    }
}

export function ifDefined<T, R>(
    obj: T | undefined,
    callback: (a: T) => R
): R | undefined {
    if (obj === undefined) {
        return undefined;
    }

    return callback(obj);
}
