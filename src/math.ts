import { FactorScore, factorScores } from "../exts/DAH_factors.ts";
import { toJSONMatrix, toJSONVector } from "../exts/DAH_serialize_json.ts";

export class Vector {
    data: number[];

    constructor(data: number[]) {
        this.data = [...data];
    }

    copy(): Vector {
        return new Vector(this.data);
    }

    add(other: Vector) {
        if (this.data.length !== other.data.length) {
            throw new Error("dimension mismatch");
        }

        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] += other.data[i];
        }
    }

    toJSON() {
        return toJSONVector(this);
    }
}

export class ScalarMatrix {
    data: number;

    constructor(data: number) {
        this.data = data;
    }

    copy(): ScalarMatrix {
        return new ScalarMatrix(this.data);
    }

    add(other: Matrix): Matrix {
        if (other instanceof ScalarMatrix) {
            return new ScalarMatrix(this.data + other.data);
        }

        return other.add(this);
    }

    mul<T extends Matrix | Vector>(rhs: T): T {
        return (
            rhs instanceof Vector ? this.matvecmul(rhs) : this.matmul(rhs)
        ) as T;
    }

    scale(factor: number): ScalarMatrix {
        return new ScalarMatrix(this.data * factor);
    }

    matvecmul(vector: Vector): Vector {
        return new Vector(vector.data.map((x) => x * this.data));
    }

    matmul(other: Matrix): Matrix {
        if (other instanceof ScalarMatrix) {
            return new ScalarMatrix(this.data * other.data);
        }

        if (other instanceof DiagonalMatrix) {
            return new DiagonalMatrix(other.data.map((x) => x * this.data));
        }

        return new RegularMatrix(other.data.map((x) => x * this.data));
    }

    clamp01() {
        this.data = Math.min(1.0, this.data);
    }

    toJSON() {
        return this.data;
    }
}

export class DiagonalMatrix {
    data: number[];

    constructor(data: number[]) {
        this.data = [...data];
    }

    static fromFactors(factors: [FactorScore, number][]): DiagonalMatrix {
        const data = new Array<number>(factorScores.length).fill(0);
        for (const [factor, num] of factors) {
            data[factor.factorIndex] = num;
        }
        return new DiagonalMatrix(data);
    }

    copy(): DiagonalMatrix {
        return new DiagonalMatrix(this.data);
    }

    add(matrix: Matrix): Matrix {
        if (matrix instanceof ScalarMatrix) {
            return new DiagonalMatrix(this.data.map((x) => (x + matrix.data)));
        }

        if (matrix instanceof DiagonalMatrix) {
            return new DiagonalMatrix(
                this.data.map((x, i) => (x += matrix.data[i])),
            );
        }

        return matrix.add(this);
    }

    mul<T extends Matrix | Vector>(rhs: T): T {
        return (
            rhs instanceof Vector ? this.matvecmul(rhs) : this.matmul(rhs)
        ) as T;
    }

    scale(factor: number): DiagonalMatrix {
        return new DiagonalMatrix(this.data.map((x) => x * factor));
    }

    matvecmul(vector: Vector): Vector {
        return new Vector(vector.data.map((x, i) => x * this.data[i]));
    }

    matmul(matrix: Matrix): Matrix {
        if (matrix instanceof ScalarMatrix) {
            return matrix.mul(this);
        }

        if (matrix instanceof DiagonalMatrix) {
            return new DiagonalMatrix(
                this.data.map((x, i) => x * matrix.data[i]),
            );
        }

        const n = this.data.length;
        return new RegularMatrix(
            matrix.data.map((x, i) => x * this.data[i % n]),
        );
    }

    clamp01() {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] = Math.min(1.0, this.data[i]);
        }
    }

    toJSON() {
        return toJSONMatrix(this);
    }
}

export class RegularMatrix {
    data: number[];

    constructor(data: number[]) {
        this.data = [...data];
    }

    copy(): RegularMatrix {
        return new RegularMatrix(this.data);
    }

    dimensions(): number {
        const n = Math.floor(Math.sqrt(this.data.length));
        if (n * n !== this.data.length) {
            throw new Error("invalid matrix size");
        }

        return n;
    }

    add(matrix: Matrix): Matrix {
        if (matrix instanceof ScalarMatrix) {
            const n = this.dimensions();
            return new RegularMatrix(
                this.data.map((x, i) => {
                    return x + (i % (n + 1) === 0 ? matrix.data : 0);
                }),
            );
        }

        if (matrix instanceof DiagonalMatrix) {
            const n = this.dimensions();
            return new RegularMatrix(
                this.data.map((x, i) => {
                    return (
                        x + (i % (n + 1) === 0 ? matrix.data[i / (n + 1)] : 0)
                    );
                }),
            );
        }

        return new RegularMatrix(this.data.map((x, i) => x + matrix.data[i]));
    }

    clamp01() {
        for (let i = 0; i < this.data.length; ++i) {
            this.data[i] = Math.min(1.0, this.data[i]);
        }
    }

    mul<T extends Matrix | Vector>(rhs: T): T {
        return (
            rhs instanceof Vector ? this.matvecmul(rhs) : this.matmul(rhs)
        ) as T;
    }

    scale(factor: number): RegularMatrix {
        return new RegularMatrix(this.data.map((x) => x * factor));
    }

    matvecmul(vector: Vector): Vector {
        const n = this.dimensions();
        return new Vector(
            vector.data.map((x, i) => {
                let sum = 0.0;
                for (let j = 0; j < n; ++j) {
                    sum += this.data[i * n + j] * x;
                }
                return sum;
            }),
        );
    }

    matmul(matrix: Matrix): Matrix {
        if (matrix instanceof ScalarMatrix) {
            return matrix.mul(this);
        }

        const n = this.dimensions();
        if (matrix instanceof DiagonalMatrix) {
            return new RegularMatrix(
                this.data.map((x, i) => x * matrix.data[Math.floor(i / n)]),
            );
        }

        const result = new RegularMatrix(new Array<number>(n * n).fill(0));
        for (let i = 0; i < n; ++i) {
            for (let j = 0; j < n; ++j) {
                for (let k = 0; k < n; ++k) {
                    result.data[i * n + j] +=
                        this.data[k * n + j] * matrix.data[i * n + k];
                }
            }
        }

        return result;
    }

    toJSON() {
        return toJSONMatrix(this);
    }
}

export type Matrix = ScalarMatrix | DiagonalMatrix | RegularMatrix;

export const identityMatrix = new ScalarMatrix(1.0);
