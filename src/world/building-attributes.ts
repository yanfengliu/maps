/**
 * PLATEAU's building attributes, and the one place a sentinel is allowed to die.
 *
 * PLATEAU records "no value" as a number. `bldg:measuredHeight` is **−9999** on 62
 * of the area of interest's 1,740 buildings and `bldg:storeysAboveGround` is
 * **9999** on 297 of them. Those are not heights and not storey counts, and a
 * reader that treats them as numbers puts a building 9,999 m under the Scramble
 * Crossing — where it renders beautifully from every angle except the one nobody
 * points a camera at.
 *
 * It gets worse, because the sentinel does not always look like a sentinel.
 * MLIT's pre-converted 3D Tiles carry the same attributes in a batch table where
 * a column holding a missing value **cannot be binary**, so those buildings read
 * `null` there and the raw −9999 never appears. Three encodings of the same fact:
 *
 * | where | missing height reads as |
 * |---|---|
 * | CityGML `bldg:measuredHeight` | `-9999` |
 * | batch table, JSON array column | `null` |
 * | batch table, binary column | cannot happen — the column is an array instead |
 *
 * So `null ?? 0` and `Number(raw)` are each wrong in a different direction, and
 * both are the sort of thing a careful person writes without thinking. Everything
 * that reads a PLATEAU building attribute goes through this module, which returns
 * `undefined` for every one of those cases and a number only when the value is a
 * height or a storey count.
 *
 * **What happens to the affected buildings.** Nothing, and that is the point.
 * They keep the geometry MLIT published — every one of the 1,740 buildings in the
 * box has real geometry in the tiles, including the 64 that are LOD1 — and only
 * their *attributes* are unusable. Phase 4 falls back to height ÷ 3.5 m for a
 * storey count, and to the building's own geometry where there is no height at
 * all. Nothing is dropped from the scene and nothing is invented for it.
 *
 * `test/sentinel.test.ts` is the gate, and it has been made to go red — see
 * `docs/learning/gate-proofs.md`.
 */

/**
 * The sentinels PLATEAU writes, exactly as they appear in the CityGML.
 *
 * Listed as values rather than folded into the range check below so the numbers
 * this is defending against are readable, and so a test can assert on them
 * directly rather than on a threshold that happens to exclude them.
 */
export const PLATEAU_SENTINELS = Object.freeze({
  measuredHeight: -9999,
  storeysAboveGround: 9999,
  storeysBelowGround: 9999,
});

/**
 * What counts as a building height at all, in metres.
 *
 * Deliberately much wider than Shibuya needs: the AOI runs 2.5 m to 220.0 m and
 * the whole ward 0.6 m to 243.3 m. The job here is to separate a height from a
 * sentinel, not to second-guess the survey, so the band sits far from both real
 * data and −9999 rather than hugging either.
 */
export const HEIGHT_RANGE_M = Object.freeze({ minimum: 0.1, maximum: 1000 });

/**
 * What counts as a storey count.
 *
 * The AOI's tallest usable value is 45 and the ward's is 54. 9999 is excluded by
 * a wide margin, and so is 0, which PLATEAU does not use and which would make a
 * floor-height division blow up in Phase 4.
 */
export const STOREY_RANGE = Object.freeze({ minimum: 1, maximum: 200 });

/** Anything a batch table or a CityGML attribute can hand back for these fields. */
export type RawAttribute = number | string | null | undefined;

/**
 * `bldg:measuredHeight` in metres, or `undefined` when PLATEAU does not state one.
 *
 * Strings are accepted because the CityGML path reads attributes out of XML text;
 * an unparseable one is a missing value, not a zero.
 */
export function readMeasuredHeightM(raw: RawAttribute): number | undefined {
  const value = asFiniteNumber(raw);
  if (value === undefined) return undefined;
  if (value === PLATEAU_SENTINELS.measuredHeight) return undefined;
  if (value < HEIGHT_RANGE_M.minimum || value > HEIGHT_RANGE_M.maximum) return undefined;
  return value;
}

/** `bldg:storeysAboveGround`, or `undefined` when PLATEAU does not state one. */
export function readStoreysAboveGround(raw: RawAttribute): number | undefined {
  const value = asFiniteNumber(raw);
  if (value === undefined) return undefined;
  if (value === PLATEAU_SENTINELS.storeysAboveGround) return undefined;
  if (value < STOREY_RANGE.minimum || value > STOREY_RANGE.maximum) return undefined;
  if (!Number.isInteger(value)) return undefined;
  return value;
}

function asFiniteNumber(raw: RawAttribute): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * How high above the ground anything in this scene may legitimately be, in world metres.
 *
 * Scene Y is metres above Tokyo Bay mean sea level. Ground across the AOI runs
 * 8.7 m to 36.4 m and the tallest roof is Shibuya Scramble Square's at 245.6 m, so
 * this band holds every real thing with room to spare and holds nothing that a
 * sentinel could produce: −9999 lands at about −9,984 m and +9999 at about
 * +10,014 m, each thousands of metres outside it.
 *
 * This is the bound the sentinel gate measures against. It is a band on *placed
 * geometry*, not on an attribute, because the attribute reader above can only be
 * trusted if something downstream checks that nothing got past it.
 */
export const SCENE_VERTICAL_BAND_M = Object.freeze({ minimum: -100, maximum: 600 });

/** One building, as the offline pipeline records it for the scene to use. */
export interface BuildingRecord {
  gmlId: string;
  /** Metres east of the crossing. */
  x: number;
  /** Metres south of the crossing. */
  z: number;
  /** Ground level under the building, metres above sea level, from the tile's own bounds. */
  groundY: number;
  /** Roof level, metres above sea level, from the tile's own bounds. */
  roofY: number;
  /**
   * Eaves level: ground plus `bldg:measuredHeight`, or null where there is no height.
   *
   * This is the field a sentinel actually reaches, which is why it is here rather
   * than left for Phase 4 to compute. `roofY` above comes from the tile's own
   * geometry bounds and can never be a sentinel; this one is derived from an
   * attribute, so it is where a naive read shows up as a number instead of as a
   * missing value.
   */
  eavesY: number | null;
  /** `bldg:measuredHeight`, or null where PLATEAU states a sentinel. */
  measuredHeightM: number | null;
  /** `bldg:storeysAboveGround`, or null where PLATEAU states a sentinel. */
  storeysAboveGround: number | null;
  /** PLATEAU's own level of detail for this building: 1 or 2. */
  lod: number;
  /** Whether the building's centre falls inside the area of interest box. */
  insideAoi: boolean;
  /** The tile whose batch table this came from. */
  tile: string;
  name?: string;
}

/**
 * Refuse a building index that has a sentinel in it, naming the building.
 *
 * Two independent things are checked, because either alone can pass while the
 * other is broken. The attribute fields must be a real number or an explicit
 * null — never a sentinel dressed up as data. And every placed height must be
 * inside the scene's vertical band, which is what catches a sentinel that reached
 * geometry through some path this reader does not know about.
 */
export function assertNoSentinels(buildings: readonly BuildingRecord[]): void {
  for (const building of buildings) {
    for (const [field, value] of [
      ["measuredHeightM", building.measuredHeightM],
      ["storeysAboveGround", building.storeysAboveGround],
    ] as const) {
      if (value === null) continue;
      if (!Number.isFinite(value)) {
        throw new Error(
          `Building ${building.gmlId} has ${field} = ${String(value)}, which is not a number. ` +
            "PLATEAU states a missing value as −9999 or 9999 and the pre-converted tiles state it " +
            "as null; both must become null here, never NaN and never zero.",
        );
      }
      if (value === PLATEAU_SENTINELS.measuredHeight || value === PLATEAU_SENTINELS.storeysAboveGround) {
        throw new Error(
          `Building ${building.gmlId} carries the PLATEAU sentinel ${value} in ${field}. ` +
            "That is 'no value', not a measurement — read it through readMeasuredHeightM or " +
            "readStoreysAboveGround in src/world/building-attributes.ts, which return undefined " +
            "for it.",
        );
      }
    }

    for (const [field, value] of [
      ["groundY", building.groundY],
      ["roofY", building.roofY],
      ["eavesY", building.eavesY],
    ] as const) {
      if (value === null) continue;
      if (
        !Number.isFinite(value) ||
        value < SCENE_VERTICAL_BAND_M.minimum ||
        value > SCENE_VERTICAL_BAND_M.maximum
      ) {
        throw new Error(
          `Building ${building.gmlId} would be placed with ${field} = ${value} m above sea level, ` +
            `outside the scene's band of ${SCENE_VERTICAL_BAND_M.minimum} to ` +
            `${SCENE_VERTICAL_BAND_M.maximum} m. A PLATEAU sentinel read as a height lands at ` +
            "about −9,984 m or +10,014 m, so this is what that looks like. The building is in " +
            `tile ${building.tile}.`,
        );
      }
    }

    // A sentinel does not always arrive as a huge number. The pre-converted tiles
    // state a missing height as `null`, and `Number(null)` is 0, so the naive read
    // there produces a building of no height at all rather than one underground.
    // Both are the same defect and both have to fail here.
    if (building.eavesY !== null && building.eavesY - building.groundY < HEIGHT_RANGE_M.minimum) {
      throw new Error(
        `Building ${building.gmlId} has an eaves height of ` +
          `${(building.eavesY - building.groundY).toFixed(3)} m, which is not a building. ` +
          "PLATEAU's pre-converted tiles write a missing bldg:measuredHeight as null, and " +
          "`Number(null)` is 0 — so a zero-height building is what a sentinel read naively looks " +
          `like on that path. Read it through readMeasuredHeightM, which returns undefined. The ` +
          `building is in tile ${building.tile}.`,
      );
    }
  }
}
