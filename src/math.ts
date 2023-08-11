import { assert } from "./utils.ts";

export type Vector = number[];
export type Matrix = DiagonalMatrix | RegularMatrix;

export interface DiagonalMatrix {
    kind: "diagonal";
    data: Vector;
}

export interface RegularMatrix {
    kind: "regular";
    data: number[];
}

export function add(lhs: Vector, rhs: Vector) {
    return lhs.map((x, i) => x + rhs[i]);
}

export function mul(matrix: Matrix, vector: Vector) {
    if (matrix.kind === "diagonal") {
        assert(vector.length == matrix.data.length);
        return vector.map((x, i) => x * matrix.data[i]);
    } else if (matrix.kind === "regular") {
        const result = new Array<number>(vector.length);
        assert(vector.length * vector.length == matrix.data.length);
        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < result.length; j++) {
                result[i] += matrix.data[i * result.length + j] * vector[j];
            }
        }
        return result;
    }

    throw new Error("invalid matrix type");
}
