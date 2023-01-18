export class NRSCoreVector {
  values: number[];

  constructor(values: number[]) {
    this.values = [...values];
  }

  dimensions(): number {
    return this.values.length;
  }

  clone(): NRSCoreVector {
    return new NRSCoreVector([...this.values]);
  }

  add_assign(other: NRSCoreVector): this {
    if (this.dimensions() !== other.dimensions()) {
      throw new Error(
        `invalid dimensions (${this.dimensions()} != ${other.dimensions()})`
      );
    }

    for (let i = 0; i < this.dimensions(); i++) {
      this.values[i] += other.values[i];
    }

    return this;
  }

  scale_assign(factor: number): this {
    for (let i = 0; i < this.dimensions(); i++) {
      this.values[i] *= factor;
    }

    return this;
  }

  dot(other: NRSCoreVector): number {
    let sum = 0.0;
    for (let i = 0; i < this.dimensions(); i++) {
      sum += this.values[i] * other.values[i];
    }
    return sum;
  }
}

// only supporting square matrices
export type NRSCoreMatrix = NRSRegularMatrix | NRSDiagonalMatrix;

export class NRSRegularMatrix {
  kind: "regular";
  num_dimensions: number;
  values: number[];

  constructor(entries: number[]) {
    const dimensions = Math.floor(Math.sqrt(entries.length));
    if (dimensions * dimensions != entries.length) {
      throw new Error("Non-square matrices are not supported");
    }

    this.kind = "regular";
    this.num_dimensions = dimensions;
    this.values = [...entries];
  }

  dimensions(): number {
    return this.num_dimensions;
  }

  mul(vector: NRSCoreVector): NRSCoreVector {
    if (this.dimensions() != vector.dimensions()) {
      throw new Error(
        `invalid dimensions (${this.dimensions()} != ${vector.dimensions()})`
      );
    }

    const n = vector.dimensions();
    const outValues = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += this.values[i * n + j] * vector.values[j];
      }
      outValues[i] = sum;
    }

    return new NRSCoreVector(outValues);
  }
}

export class NRSDiagonalMatrix {
  kind: "diagonal";
  diagonal: NRSCoreVector;

  constructor(diagonal: NRSCoreVector) {
    this.kind = "diagonal";
    this.diagonal = diagonal.clone();
  }

  dimensions(): number {
    return this.diagonal.dimensions();
  }

  mul(vector: NRSCoreVector): NRSCoreVector {
    if (this.dimensions() != vector.dimensions()) {
      throw new Error(
        `invalid dimensions (${this.dimensions()} != ${vector.dimensions()})`
      );
    }

    const n = vector.dimensions();
    const outValues = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      outValues[i] = this.diagonal.values[i] * vector.values[i];
    }

    return new NRSCoreVector(outValues);
  }
}

export function newNRSCoreVector(values: number[]): NRSCoreVector {
  return new NRSCoreVector(values);
}

export function newNRSRegularMatrix(
  values:
    | number[]
    | NRSCoreVector[] /* array of matrix columns */
    | number[][] /* expanded form of the former */
): NRSRegularMatrix {
  if (values.length == 0) {
    throw new Error("empty matrix not supported");
  }

  const isVectorArray = (
    values: number[] | NRSCoreVector[] | number[][]
  ): values is NRSCoreVector[] => {
    return values[0] instanceof NRSCoreVector;
  };

  const is2DArray = (
    values: number[] | number[][]
  ): values is number[][] => {
    return values[0] instanceof Array;
  };

  if (isVectorArray(values)) {
    values = values.map((v) => v.values);
  }

  if (is2DArray(values)) {
    const dimension  = values.length;
    values = values.flatMap((row) => {
      if(row.length != dimension) {
        throw new Error("invalid dimension");
      }

      return row;
    });
  }

  return new NRSRegularMatrix(values);
}

export function newNRSDiagonalMatrix(diagonal: number[] | NRSCoreVector) {
  if (diagonal instanceof Array<number>) {
    if (diagonal.length == 0) {
      throw new Error("empty matrix not supported");
    }

    diagonal = new NRSCoreVector(diagonal);
  }

  return new NRSDiagonalMatrix(diagonal);
}
