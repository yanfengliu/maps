/**
 * The sentinel gate.
 *
 * PLATEAU records "no value" as a number: `bldg:measuredHeight` is **−9999** on 62
 * of the area of interest's 1,740 buildings and `bldg:storeysAboveGround` is
 * **9999** on 297 of them. A reader that treats those as measurements puts a
 * building 9,984 m under the Scramble Crossing, which renders correctly from
 * every angle anyone points a camera at.
 *
 * The part that makes this a gate rather than a unit test is the second
 * encoding. MLIT's pre-converted 3D Tiles carry the same attributes in a batch
 * table where a column holding a missing value **cannot be binary**, so those
 * buildings read `null` there — and `Number(null)` is 0, not NaN and not −9999.
 * The same defect therefore arrives as a building of no height at all, which
 * looks like a modelling failure rather than like a units bug. Both are checked
 * here, and the tile half is checked against real PLATEAU bytes rather than
 * against a fixture written by someone who already knew the answer.
 *
 * **Bound.** This gate covers the attribute reader and the placement validator —
 * what turns an attribute into a number, and what refuses a number that cannot be
 * a place. It does not read the whole area of interest: `npm run data:scene` does
 * that, over all 1,740 buildings and against PLATEAU's own CityGML, and refuses to
 * write an index that fails `assertNoSentinels`. This gate is what says that
 * function can fail.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assertNoSentinels,
  HEIGHT_RANGE_M,
  PLATEAU_SENTINELS,
  readMeasuredHeightM,
  readStoreysAboveGround,
  SCENE_VERTICAL_BAND_M,
  type BuildingRecord,
} from "../src/world/building-attributes.js";
import { parseB3dm, readBatchColumn } from "../tools/tiles/b3dm.js";

const FIXTURE = fileURLToPath(new URL("./fixtures/plateau-batch-table.b3dm", import.meta.url));

/** A record that passes, so each test below changes exactly one thing. */
function building(overrides: Partial<BuildingRecord> = {}): BuildingRecord {
  return {
    gmlId: "bldg_test",
    x: 100,
    z: -50,
    groundY: 15.2,
    roofY: 45.2,
    eavesY: 43.2,
    measuredHeightM: 28,
    storeysAboveGround: 8,
    lod: 2,
    insideAoi: true,
    tile: "data/data479.b3dm",
    ...overrides,
  };
}

describe("reading PLATEAU's building attributes", () => {
  it("refuses the CityGML sentinels, which are numbers and not measurements", () => {
    expect(readMeasuredHeightM(PLATEAU_SENTINELS.measuredHeight)).toBeUndefined();
    expect(readMeasuredHeightM(-9999)).toBeUndefined();
    expect(readMeasuredHeightM("-9999")).toBeUndefined();
    expect(readStoreysAboveGround(PLATEAU_SENTINELS.storeysAboveGround)).toBeUndefined();
    expect(readStoreysAboveGround(9999)).toBeUndefined();
    expect(readStoreysAboveGround("9999")).toBeUndefined();
  });

  it("refuses the 3D Tiles form of the same fact, which is null and not −9999", () => {
    expect(readMeasuredHeightM(null)).toBeUndefined();
    expect(readMeasuredHeightM(undefined)).toBeUndefined();
    expect(readStoreysAboveGround(null)).toBeUndefined();
    expect(readStoreysAboveGround(undefined)).toBeUndefined();
    // The trap this exists for: `Number(null)` is 0, so a naive read of the tile
    // form gives a building of no height rather than a building underground.
    expect(Number(null)).toBe(0);
    expect(readMeasuredHeightM(0)).toBeUndefined();
  });

  it("keeps real measurements, including the extremes this area of interest holds", () => {
    // 2.5 m is the shortest usable building in the box and 220.0 m is Shibuya
    // Scramble Square, the tallest. 243.3 m is the tallest in the whole ward.
    expect(readMeasuredHeightM(2.5)).toBe(2.5);
    expect(readMeasuredHeightM(220)).toBe(220);
    expect(readMeasuredHeightM(243.3)).toBe(243.3);
    expect(readMeasuredHeightM("173.6")).toBe(173.6);
    expect(readStoreysAboveGround(1)).toBe(1);
    expect(readStoreysAboveGround(45)).toBe(45);
    expect(readStoreysAboveGround(54)).toBe(54);
  });

  it("refuses anything that is not a whole number of storeys", () => {
    expect(readStoreysAboveGround(3.5)).toBeUndefined();
    expect(readStoreysAboveGround(0)).toBeUndefined();
    expect(readStoreysAboveGround(-2)).toBeUndefined();
    expect(readStoreysAboveGround("")).toBeUndefined();
    expect(readStoreysAboveGround("eight")).toBeUndefined();
  });

  it("puts the sentinels far outside the band it accepts", () => {
    // Not a restatement of the checks above: this is why a threshold alone would
    // be enough, and why the explicit sentinel comparison is belt as well as
    // braces rather than the only defence.
    expect(PLATEAU_SENTINELS.measuredHeight).toBeLessThan(HEIGHT_RANGE_M.minimum);
    expect(PLATEAU_SENTINELS.storeysAboveGround).toBeGreaterThan(HEIGHT_RANGE_M.maximum);
  });
});

describe("a real PLATEAU batch table", () => {
  const bytes = new Uint8Array(readFileSync(FIXTURE));
  const tile = parseB3dm(bytes);
  const batchLength = Number(tile.featureTableJson["BATCH_LENGTH"]);
  const column = (key: string): (number | string | null)[] =>
    readBatchColumn(tile.batchTableJson, tile.batchTableBinary, key, batchLength);

  it("is the tile the fixture says it is", () => {
    expect(batchLength).toBe(17);
    expect(Object.keys(tile.batchTableJson)).toHaveLength(63);
  });

  it("states its missing values as null, not as −9999", () => {
    const heights = column("bldg:measuredHeight");
    const storeys = column("bldg:storeysAboveGround");

    expect(heights.filter((value) => value === null)).toHaveLength(4);
    expect(storeys.filter((value) => value === null)).toHaveLength(12);
    // The raw sentinel does not appear anywhere in these bytes. That is the whole
    // reason a reader written against the CityGML alone passes its own tests and
    // then reads zero here.
    expect(heights.filter((value) => value === PLATEAU_SENTINELS.measuredHeight)).toHaveLength(0);
    expect(storeys.filter((value) => value === PLATEAU_SENTINELS.storeysAboveGround)).toHaveLength(0);
  });

  it("reads both shapes a batch-table column takes", () => {
    // `bldg:measuredHeight` is a JSON array here because it holds a null;
    // `_zmin` is a binary DOUBLE column in the same table. A reader that handles
    // only one shape works on most of Shibuya and returns nothing for the rest.
    expect(Array.isArray(tile.batchTableJson["bldg:measuredHeight"])).toBe(true);
    expect(Array.isArray(tile.batchTableJson["_zmin"])).toBe(false);

    const zmin = column("_zmin");
    expect(zmin).toHaveLength(batchLength);
    for (const value of zmin) {
      expect(typeof value).toBe("number");
      // Ground under this tile, orthometric metres above Tokyo Bay mean sea
      // level. The area of interest runs 8.7 m to 36.4 m.
      expect(value as number).toBeGreaterThan(5);
      expect(value as number).toBeLessThan(45);
    }
  });

  it("yields a building index with no sentinel in it", () => {
    const gmlIds = column("gml_id");
    const heights = column("bldg:measuredHeight");
    const storeys = column("bldg:storeysAboveGround");
    const zmin = column("_zmin");
    const zmax = column("_zmax");

    const buildings: BuildingRecord[] = [];
    for (let batch = 0; batch < batchLength; batch += 1) {
      const groundY = Number(zmin[batch]);
      const heightM = readMeasuredHeightM(heights[batch]);
      buildings.push({
        gmlId: String(gmlIds[batch]),
        x: 0,
        z: 0,
        groundY,
        roofY: Number(zmax[batch]),
        eavesY: heightM === undefined ? null : groundY + heightM,
        measuredHeightM: heightM ?? null,
        storeysAboveGround: readStoreysAboveGround(storeys[batch]) ?? null,
        lod: 2,
        insideAoi: true,
        tile: "fixture",
      });
    }

    expect(buildings).toHaveLength(17);
    expect(buildings.filter((b) => b.measuredHeightM === null)).toHaveLength(4);
    expect(buildings.filter((b) => b.storeysAboveGround === null)).toHaveLength(12);
    expect(() => assertNoSentinels(buildings)).not.toThrow();
  });

  it("would fail if the naive read of the tile form were used", () => {
    // The mutation, made concrete rather than described: `Number(raw)` instead of
    // `readMeasuredHeightM`. On these bytes it turns four missing heights into
    // zero, and a building with its eaves on its own ground is not a building.
    const heights = column("bldg:measuredHeight");
    const zmin = column("_zmin");
    const naive: BuildingRecord[] = [];
    for (let batch = 0; batch < batchLength; batch += 1) {
      const groundY = Number(zmin[batch]);
      naive.push(
        building({
          gmlId: `naive_${batch}`,
          groundY,
          roofY: Number(zmin[batch]) + 10,
          eavesY: groundY + Number(heights[batch]),
          measuredHeightM: Number(heights[batch]),
        }),
      );
    }
    expect(() => assertNoSentinels(naive)).toThrow(/not a building/);
  });
});

describe("refusing a sentinel that reached a placed height", () => {
  it("accepts a building that stands on Shibuya's ground", () => {
    expect(() => assertNoSentinels([building()])).not.toThrow();
  });

  it("refuses a CityGML sentinel read as a height, which lands 9,984 m down", () => {
    const buried = building({
      gmlId: "bldg_buried",
      measuredHeightM: PLATEAU_SENTINELS.measuredHeight,
      eavesY: 15.2 + PLATEAU_SENTINELS.measuredHeight,
    });
    expect(() => assertNoSentinels([buried])).toThrow(/bldg_buried/);
    expect(() => assertNoSentinels([buried])).toThrow(/sentinel/);
  });

  it("refuses a storey sentinel that reached the index", () => {
    const record = building({
      gmlId: "bldg_storeys",
      storeysAboveGround: PLATEAU_SENTINELS.storeysAboveGround,
    });
    expect(() => assertNoSentinels([record])).toThrow(/bldg_storeys/);
  });

  it("refuses a tile sentinel read as zero, which is the same defect the other way", () => {
    const flat = building({ gmlId: "bldg_flat", measuredHeightM: 0, eavesY: 15.2 });
    expect(() => assertNoSentinels([flat])).toThrow(/not a building/);
  });

  it("refuses geometry outside the scene's vertical band, whatever put it there", () => {
    for (const roofY of [SCENE_VERTICAL_BAND_M.minimum - 1, SCENE_VERTICAL_BAND_M.maximum + 1]) {
      expect(() => assertNoSentinels([building({ gmlId: "bldg_band", roofY })])).toThrow(
        /bldg_band/,
      );
    }
  });

  it("refuses NaN, which is what a string sentinel becomes under Number()", () => {
    expect(() =>
      assertNoSentinels([building({ gmlId: "bldg_nan", measuredHeightM: Number.NaN })]),
    ).toThrow(/not a number/);
  });

  it("names the tile, because the next question is always which one", () => {
    const record = building({
      gmlId: "bldg_where",
      tile: "data/data503.b3dm",
      roofY: SCENE_VERTICAL_BAND_M.maximum + 100,
    });
    expect(() => assertNoSentinels([record])).toThrow(/data\/data503\.b3dm/);
  });
});
