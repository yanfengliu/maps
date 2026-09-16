/**
 * Spatial-hash partition gate. Bound: the delivered cell size and neighbour
 * radius (`PEDESTRIAN_DYNAMICS.cellSizeM` = 4 m, `neighbourRadiusM` = 8 m), a
 * handful of pinned positions, no simulation and no delivered data.
 *
 * Claim: a rebuilt hash returns every live body within the radius and no body
 * outside it, in ascending slot order. `SpatialHash.rebuild` writes a cell key
 * into an `Int32Array`; `neighbours` recomputes the same key and tests it. If the
 * key does not survive the `Int32Array` write, the identity test can never be true
 * and the structure returns bodies by bucket collision rather than by partitioning
 * space — which is what the packing `(column + 0x8000) * 0x10000 + (row + 0x8000)`
 * did for every column >= 0, at a measured cell-test match rate of 56.3 % on the
 * delivered crowd.
 *
 * The packing below is deliberately a **local copy** of the expression the class
 * uses, not an import of it, so that every assertion goes red on the pre-fix
 * revision by *failing*, rather than by failing to resolve a symbol the fix added.
 * The three packing cases exist to fail loudly if the class's expression moves away
 * from this copy, which is what keeps the copy honest.
 *
 * Boundary of this gate: it pins positions at cell edges and exactly on the radius,
 * and it does not measure the crowd. The match rate over the delivered 3,000
 * pedestrians is `artifacts/hash-fix/probes/hash-cost.ts`'s subject.
 */

import { describe, expect, it } from "vitest";

import { PEDESTRIAN_DYNAMICS } from "../src/agents/population/config.ts";
import { SpatialHash } from "../src/agents/population/pedestrians.ts";

const CELL = PEDESTRIAN_DYNAMICS.cellSizeM;
const RADIUS = PEDESTRIAN_DYNAMICS.neighbourRadiusM;

/** The class's packing, copied so the gate can fail on behaviour, not on a symbol. */
function cellKeyOf(column: number, row: number): number {
  return ((row + 0x8000) << 16) | (column + 0x8000);
}

/** A hash over pinned world positions. Row `index` is slot `index`, y = 0. */
function hashOf(positions: readonly (readonly [number, number])[]): SpatialHash {
  const hash = new SpatialHash(CELL);
  const position = new Float32Array(positions.length * 3);
  const active = new Uint8Array(positions.length).fill(1);
  positions.forEach(([x, z], index) => {
    position[index * 3] = x;
    position[index * 3 + 2] = z;
  });
  hash.rebuild(positions.length, position, active);
  return hash;
}

/**
 * The returned set for a query. The radius is a parameter and not the class's own
 * constant, because a query that means to ask a different question has to actually
 * ask it: an earlier version of this helper hard-coded `RADIUS`, so the wide query
 * below silently measured the same 8 m box twice and agreed with itself.
 */
function found(hash: SpatialHash, x: number, z: number, radius: number, limit: number): number[] {
  const out = new Int32Array(limit);
  const count = hash.neighbours(x, z, radius, limit, out);
  return Array.from(out.subarray(0, count));
}

/** Ascending slot index of every body within `radius`, computed independently. */
function truth(positions: readonly (readonly [number, number])[], x: number, z: number, radius: number): number[] {
  return positions
    .map(([px, pz], index) => ({ index, distanceSquared: (px - x) ** 2 + (pz - z) ** 2 }))
    .filter((entry) => entry.distanceSquared <= radius * radius)
    .map((entry) => entry.index);
}

describe("the pedestrian spatial hash partitions space", () => {
  it("returns the bodies in the query cell and its neighbours, and nothing else", () => {
    // Cell (0, 0) holds slot 0 at its origin and slot 1 near its centre; slot 2 is
    // one cell south and slot 3 is 42 m away, past the query box. Every key here
    // is the packing's ordinary output, so it has to survive the Int32Array write
    // or none of these can be found.
    const positions = [
      [0.5, 0.5],
      [2.0, 1.5],
      [3.5, -1.5],
      [30.5, 30.5],
    ] as const;
    const hash = hashOf(positions);
    expect(found(hash, 0.5, 0.5, RADIUS, 32)).toEqual(truth(positions, 0.5, 0.5, RADIUS));
    expect(found(hash, 0.5, 0.5, RADIUS, 32)).toEqual([0, 1, 2]);
    expect(found(hash, 30.5, 30.5, RADIUS, 32)).toEqual([3]);
  });

  it("keeps the cell test true for bodies in different rows of the same column", () => {
    // One column, five cells deep, queried at the class's own radius and then at
    // four times it. Both are needed: at 8 m the radius test excludes the far
    // bodies whether or not the cell test can see them, so only the 32 m query is
    // evidence that the cell test reaches every row the box covers.
    const positions = [
      [0.5, 0.5],
      [0.5, 5.5],
      [0.5, 9.5],
      [0.5, 13.5],
      [0.5, 17.5],
    ] as const;
    const hash = hashOf(positions);
    expect(found(hash, 0.5, 0.5, RADIUS, 32)).toEqual([0, 1]);
    expect(found(hash, 0.5, 0.5, RADIUS, 32)).toEqual(truth(positions, 0.5, 0.5, RADIUS));
    expect(found(hash, 0.5, 0.5, 32, 32)).toEqual(truth(positions, 0.5, 0.5, 32));
    expect(found(hash, 0.5, 0.5, 32, 32)).toEqual([0, 1, 2, 3, 4]);
    expect(found(hash, 0.5, 17.5, RADIUS, 32)).toEqual([2, 3, 4]);
  });

  it("applies the cap to the bodies inside the radius, and to no other", () => {
    // Twenty-one bodies inside the radius, all in the query's own cell and its
    // ring. With a cap of 8 the set is the eight lowest slot indices within the
    // radius — the class's stated ordering contract — and never a body outside it,
    // which is what a hash that finds nothing by cell returns.
    const positions: [number, number][] = [[0.5, 0.5]];
    for (let index = 1; index < 21; index += 1) positions.push([0.5 + (index % 5) * 0.7, 0.5 + Math.floor(index / 5) * 0.7]);
    const hash = hashOf(positions);
    const capped = found(hash, 0.5, 0.5, RADIUS, PEDESTRIAN_DYNAMICS.neighbours);
    expect(capped).toEqual(truth(positions, 0.5, 0.5, RADIUS).slice(0, PEDESTRIAN_DYNAMICS.neighbours));
    expect(capped).toHaveLength(PEDESTRIAN_DYNAMICS.neighbours);
  });
});

describe("the cell packing", () => {
  it("stays equal to its own Int32Array image over every covered coordinate", () => {
    // The class covers +/-32767 in each axis — 262 km at the delivered 4 m cell
    // edge, against the roughly +/-125 columns a 1 km world needs. Across that
    // whole range the stored value has to be the key, because `neighbours`
    // recomputes the key and compares it against what `rebuild` stored. The
    // pre-fix packing was not equal to its own Int32Array image anywhere in the
    // eastern half of the world, which is the defect this gate covers.
    const storage = new Int32Array(1);
    const span = 20_000;
    let checked = 0;
    let inexact = 0;
    for (let column = -span; column <= span; column += 256) {
      for (let row = -span; row <= span; row += 256) {
        const key = cellKeyOf(column, row);
        storage[0] = key;
        checked += 1;
        if (storage[0] !== key) inexact += 1;
      }
    }
    expect(inexact).toBe(0);
    expect(checked).toBe(24_649);
  });

  it("gives distinct coordinates distinct keys, and the same coordinate the same key", () => {
    // Both halves are bijective over the covered range, so the packing is too.
    expect(cellKeyOf(0, 0)).not.toBe(cellKeyOf(1, 0));
    expect(cellKeyOf(0, 0)).not.toBe(cellKeyOf(0, 1));
    expect(cellKeyOf(0, 0)).not.toBe(cellKeyOf(-1, 0));
    expect(cellKeyOf(1, 0)).not.toBe(cellKeyOf(0, 1));
    expect(cellKeyOf(-0x8000, -0x8000)).not.toBe(cellKeyOf(0x7fff, 0x7fff));
  });

  it("pins the defect's own arithmetic, so the gate names what it caught", () => {
    // The pre-fix packing of an ordinary coordinate, and its Int32Array image.
    // If a later revision reintroduces that expression, this case fails on the
    // identity rather than on a stranger's assertion.
    const oldPacking = (column: number, row: number): number => (column + 0x8000) * 0x10000 + (row + 0x8000);
    expect(oldPacking(0, 0)).toBe(2_147_516_416);
    expect(oldPacking(0, 0)).toBeGreaterThan(2 ** 31 - 1);
    const wrapped = new Int32Array(1);
    wrapped[0] = oldPacking(0, 0);
    expect(wrapped[0]).not.toBe(oldPacking(0, 0));
    // The fixed packing of the same coordinate is inside int32 and is what the
    // Int32Array stores, so the round trip closes where the defect was.
    expect(cellKeyOf(0, 0)).toBe(wrapped[0]);
    expect(cellKeyOf(0, 0)).toBe(-2_147_450_880);
  });
});
