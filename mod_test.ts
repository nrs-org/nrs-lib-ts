import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.173.0/testing/asserts.ts";

import {
  mode,
  newNRSCoreVector,
  newNRSDiagonalMatrix,
  newNRSRegularMatrix,
  NRSCoreVector,
} from "./mod.ts";

Deno.test("test starter function", () => {
  assertEquals(mode(), 0);
});

Deno.test("test math operations", () => {
  function unwrap(v: NRSCoreVector | number[]): number[] {
    if (v instanceof NRSCoreVector) {
      v = v.values;
    }

    return v;
  }
  function assertVecEquals(
    v1: NRSCoreVector | number[],
    v2: NRSCoreVector | number[]
  ) {
    v1 = unwrap(v1);
    v2 = unwrap(v2);
    assertEquals(v1, v2);
  }

  const v1 = newNRSCoreVector([1, 2, 3]);
  const v2 = newNRSCoreVector([4, 5, 6]);
  const v3 = newNRSCoreVector([7, 8]);

  assertEquals(v1.dimensions(), 3);
  assertEquals(v3.dimensions(), 2);

  assertThrows(() => newNRSRegularMatrix([1, 2, 3, 4, 5]));
  assertVecEquals(v1.clone().add_assign(v2), [5, 7, 9]);
  assertVecEquals(v1.clone().scale_assign(2), [2, 4, 6]);
  assertEquals(v1.dot(v2), 1 * 4 + 2 * 5 + 3 * 6);
  assertThrows(() => v1.clone().add_assign(v3));

  const m1 = newNRSRegularMatrix([
    [1, 0, 1],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  // other ways to construct the same matrix
  const m1p = newNRSRegularMatrix([
    new NRSCoreVector([1, 0, 1]),
    new NRSCoreVector([0, 1, 0]),
    new NRSCoreVector([0, 0, 1]),
  ]);
  const m1q = newNRSRegularMatrix([1, 0, 1, 0, 1, 0, 0, 0, 1]);

  const m2 = newNRSDiagonalMatrix([4, 5, 6]);
  // note that v2 is [4, 5, 6], so `m2` and `m2p` should correspond to the same diagonal matrix
  const m2p = newNRSDiagonalMatrix(v2);

  assertThrows(() => newNRSRegularMatrix([]));
  assertThrows(() => newNRSRegularMatrix([[]]));
  assertThrows(() => newNRSDiagonalMatrix([]));

  assertThrows(() => newNRSRegularMatrix([[1, 2, 3], [4]]));

  assertEquals(m1.dimensions(), 3);
  assertEquals(m2.dimensions(), 3);

  assertEquals(m1.values, m1p.values);
  assertEquals(m1.values, m1q.values);
  assertEquals(m2.diagonal, m2p.diagonal);
  
  assertVecEquals(m1.mul(v1), [4, 2, 3]);
  assertVecEquals(m2.mul(v2), [16, 25, 36]);

  assertThrows(() => m1.mul(v3));
  assertThrows(() => m2.mul(v3));
});
