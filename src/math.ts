import { assert } from "./utils.ts";

export type Vector = number[];
export type Matrix = ScalarMatrix | DiagonalMatrix | RegularMatrix;

export interface ScalarMatrix {
    kind: "scalar";
    data: number;
}

export interface DiagonalMatrix {
    kind: "diagonal";
    data: Vector;
}

export interface RegularMatrix {
    kind: "regular";
    // column-major
    data: number[];
}

export function add(lhs: Vector, rhs: Vector) {
    return lhs.map((x, i) => x + rhs[i]);
}

export function mul(matrix: Matrix, vector: Vector) {
    if (matrix.kind === "scalar") {
        return vector.map((v) => v * matrix.data);
    } else if (matrix.kind === "diagonal") {
        assert(vector.length == matrix.data.length);
        return vector.map((x, i) => x * matrix.data[i]);
    } else if (matrix.kind === "regular") {
        const result = new Array<number>(vector.length);
        result.fill(0);
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

// all matrices are square in nrs,
// so this will return the num of rows == num of columns of the matrix
export function dimensions(m: RegularMatrix | DiagonalMatrix) {
    if (m.kind === "regular") {
        const n = Math.floor(Math.sqrt(m.data.length));
        if (n * n !== m.data.length) {
            throw new Error(
                `invalid regular matrix with data size ${m.data.length}`,
            );
        }

        return n;
    }

    return m.data.length;
}

function newScalar(data: number): ScalarMatrix {
    return {
        kind: "scalar",
        data,
    };
}

function newDiagonal(data: number[]): DiagonalMatrix {
    return {
        kind: "diagonal",
        data,
    };
}

function newRegular(data: number[]): RegularMatrix {
    return {
        kind: "regular",
        data,
    };
}

export function clampMatrix01<M extends Matrix>(m: M): M {
    if (m.kind === "scalar") {
        return {
            kind: "scalar",
            data: Math.min(1.0, m.data),
        } as M;
    }

    return {
        kind: m.kind,
        data: m.data.map((x) => Math.min(1.0, x)),
    } as M;
}

export function matrixMul(lhs: Matrix, rhs: Matrix): Matrix {
    if (lhs.kind === "scalar") {
        if (rhs.kind === "scalar") {
            return newScalar(lhs.data * rhs.data);
        }

        return {
            kind: rhs.kind,
            data: rhs.data.map((x) => x * lhs.data),
        };
    }

    if (lhs.kind === "diagonal") {
        if (rhs.kind === "diagonal") {
            return newDiagonal(lhs.data.map((x, i) => x * rhs.data[i]));
        }

        if (rhs.kind === "regular") {
            return newRegular(
                rhs.data.map((x, i) => x * lhs.data[i % lhs.data.length]),
            );
        }

        return matrixMul(rhs, lhs);
    }

    if (lhs.kind === "regular") {
        if (rhs.kind === "diagonal") {
            return newRegular(
                lhs.data.map(
                    (x, i) => x * rhs.data[Math.floor(i / rhs.data.length)],
                ),
            );
        }

        if (rhs.kind === "regular") {
            const n = Math.floor(Math.sqrt(lhs.data.length));
            const result = new Array<number>(n * n);
            result.fill(0);
            for (let i = 0; i < n; ++i) {
                for (let j = 0; j < n; ++j) {
                    let v = 0;
                    for (let k = 0; k < n; ++k) {
                        v += lhs.data[k * n + j] * rhs.data[i * n + k];
                    }
                    result[i * n + j] = v;
                }
            }
            return newRegular(result);
        }

        return matrixMul(rhs, lhs);
    }

    throw new Error("unreachable");
}

export function matrixAdd(lhs: Matrix, rhs: Matrix): Matrix {
    if (lhs.kind === "scalar") {
        if (rhs.kind === "scalar") {
            return newScalar(lhs.data + rhs.data);
        }

        if (rhs.kind === "diagonal") {
            return newDiagonal(rhs.data.map((x) => x + lhs.data));
        }

        const n = Math.floor(Math.sqrt(rhs.data.length));
        return newRegular(
            rhs.data.map((x, i) => x + (i % (n + 1) === 0 ? lhs.data : 0)),
        );
    }

    if (lhs.kind === "diagonal") {
        if (rhs.kind === "diagonal") {
            return newDiagonal(lhs.data.map((x, i) => x + rhs.data[i]));
        }

        if (rhs.kind === "regular") {
            const n = Math.floor(Math.sqrt(rhs.data.length));
            return newRegular(
                rhs.data.map(
                    (x, i) =>
                        x + (i % (n + 1) === 0 ? lhs.data[i / (n + 1)] : 0),
                ),
            );
        }

        return matrixAdd(rhs, lhs);
    }

    if (lhs.kind === "regular") {
        if (rhs.kind === "regular") {
            return newRegular(lhs.data.map((x, i) => x + rhs.data[i]));
        }

        return matrixAdd(rhs, lhs);
    }

    throw new Error("unreachable");
}
