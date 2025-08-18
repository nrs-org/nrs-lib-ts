import { Matrix } from "../mod.ts";

export function assert(
    cond: boolean,
    msg: string | undefined = undefined,
): asserts cond {
    if (!cond) {
        throw new Error(msg || "Assertion failed");
    }
}

export function ifDefined<T, R>(
    obj: T | undefined,
    callback: (a: T) => R,
): R | undefined {
    if (obj === undefined) {
        return undefined;
    }

    return callback(obj);
}

export function mapAddAssign<K>(map: Map<K, Matrix>, id: K, matrix: Matrix) {
    const currentWeight = map.get(id);
    if (currentWeight !== undefined) {
        matrix = matrix.add(currentWeight);
    }

    map.set(id, matrix);
}

export function combinePow(numbers: number[], factor: number) {
    function combineUnsigned(arr: number[], factor: number) {
        if (factor < 1e-4) {
            return arr.reduce((a, b) => Math.max(a, b), 0.0);
        }

        return Math.pow(
            arr.map((x) => Math.pow(x, 1.0 / factor)).reduce(
                (a, b) => a + b,
                0.0,
            ),
            factor,
        );
    }

    return combineUnsigned(numbers.map((n) => Math.max(n, 0.0)), factor) -
        combineUnsigned(numbers.map((n) => Math.max(-n, 0.0)), factor);
}