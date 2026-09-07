/**
 * The placement gate: how a tile's own frame becomes the world frame.
 *
 * `test/aoi.test.ts` pins the projection — latitude and longitude to EPSG:6677 to
 * scene metres. This pins the two steps between that and a building actually
 * standing somewhere: the ECEF position MLIT's tiles state their location with,
 * and the glTF up-axis convention their vertices are written in.
 *
 * Both have a failure mode that renders. A tile placed at its `CESIUM_RTC` centre
 * with no conversion lands seven million metres from the camera and is simply
 * absent, which is at least obvious. A tile placed with the right translation and
 * the wrong rotation lands in Shibuya, at the right scale, with the buildings
 * lying on their sides at a convincing angle — and that is what happened here
 * before this existed.
 *
 * **Bound.** These are the transforms, checked against measured constants from
 * `docs/work/0_shibuya-1km/design.md` and against a round trip. They say nothing
 * about whether the pipeline applies them to the right tiles, which is what
 * `npm run data:scene` checks building by building over all 2,686 of them, nor
 * about whether the runtime applies them a second time, which is what the visual
 * gate's drawn-geometry bounds catch.
 */

import { describe, expect, it } from "vitest";

import { AOI_CENTRE_WGS84, AOI_ORIGIN_EPSG6677 } from "../src/world/aoi.js";
import { decodeMesh, encodeMesh, type MeshData } from "../src/world/mesh.js";
import {
  applyMatrix,
  ecefToGeodetic,
  ecefToWorld,
  geodeticToEcef,
  multiplyMatrices,
  worldPlacement,
} from "../tools/geo/ecef.js";
import { GLTF_Y_UP_TO_Z_UP } from "../tools/tiles/b3dm.js";

/**
 * The `CESIUM_RTC` centre of the tile covering the Scramble Crossing.
 *
 * Measured in Phase 1 from `data503.b3dm` and recorded in `design.md`, which also
 * records where it resolves to: 35.6595201 N, 139.7016341 E, which is 2.1 m north
 * and 102.7 m east of the world origin. That offset is the whole reason this test
 * exists — it is exactly the size of error that renders convincingly.
 */
const CROSSING_TILE_RTC = [-3956953.773, 3355546.821, 3697608.127] as const;

/** The geoid undulation the pipeline measured from the tiles themselves. */
const GEOID_UNDULATION_M = 36.786;

describe("ECEF and geodetic coordinates", () => {
  it("round-trips a point over the Scramble Crossing to under a millimetre", () => {
    const height = 52.08; // 15.2 m orthometric plus the geoid undulation
    const ecef = geodeticToEcef(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude, height);
    const back = ecefToGeodetic(ecef);

    expect(back.latitude).toBeCloseTo(AOI_CENTRE_WGS84.latitude, 10);
    expect(back.longitude).toBeCloseTo(AOI_CENTRE_WGS84.longitude, 10);
    expect(back.ellipsoidalHeight).toBeCloseTo(height, 6);
  });

  it("puts the crossing tile's RTC centre where design.md measured it", () => {
    const geodetic = ecefToGeodetic(CROSSING_TILE_RTC);
    // Phase 1 read 35.6595201 N, 139.7016341 E from this same centre, by a
    // different implementation. Seven decimal places is about a centimetre.
    expect(geodetic.latitude).toBeCloseTo(35.6595201, 6);
    expect(geodetic.longitude).toBeCloseTo(139.7016341, 6);
    // And the height it comes out at is ellipsoidal, not orthometric — 78.018 m
    // against 41.141 m. Reading one as the other is the 36.9 m error the
    // elevation gate exists for.
    expect(geodetic.ellipsoidalHeight).toBeCloseTo(78.018, 2);
  });

  it("lands that centre 2.1 m north and 102.7 m east of the crossing", () => {
    const world = ecefToWorld(CROSSING_TILE_RTC, GEOID_UNDULATION_M);
    // +X is east and +Z is south, so 2.1 m north is z = -2.1.
    expect(world.x).toBeCloseTo(102.7, 0);
    expect(world.z).toBeCloseTo(-2.1, 0);
    // 78.018 m ellipsoidal minus the undulation.
    expect(world.y).toBeCloseTo(78.018 - GEOID_UNDULATION_M, 1);
  });

  it("moves scene Y by exactly minus the undulation and nothing sideways", () => {
    // The pipeline recovers the geoid undulation from a single median residual,
    // which is only valid if changing it is a pure vertical shift.
    const a = ecefToWorld(CROSSING_TILE_RTC, GEOID_UNDULATION_M);
    const b = ecefToWorld(CROSSING_TILE_RTC, GEOID_UNDULATION_M + 1);
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.z).toBeCloseTo(a.z, 9);
    expect(b.y).toBeCloseTo(a.y - 1, 9);
  });
});

describe("the linear placement a tile is given", () => {
  const placement = worldPlacement(CROSSING_TILE_RTC, GEOID_UNDULATION_M);

  it("is accurate to a centimetre over a tile's own radius", () => {
    // AOI tiles reach about 175 m from their centres. The check probe is at
    // 200 m on the diagonal, which is further than any of them.
    expect(placement.linearisationErrorM).toBeLessThan(0.02);
  });

  it("agrees with the exact chain at the tile centre", () => {
    const exact = ecefToWorld(CROSSING_TILE_RTC, GEOID_UNDULATION_M);
    expect(placement.position.x).toBeCloseTo(exact.x, 9);
    expect(placement.position.y).toBeCloseTo(exact.y, 9);
    expect(placement.position.z).toBeCloseTo(exact.z, 9);
  });

  it("carries grid north, not true north", () => {
    // EPSG:6677's central meridian is 139 degrees 50 minutes, so at Shibuya grid
    // north is 0.077 degrees off true north. Stepping 1000 m north in ECEF has to
    // come out tilted by that much, or the tiles would be rotated against the
    // terrain by 67 cm at 500 m.
    const up = geodeticToEcef(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude, 0);
    const north = geodeticToEcef(AOI_CENTRE_WGS84.latitude + 0.009, AOI_CENTRE_WGS84.longitude, 0);
    const step = ecefToWorld(north, GEOID_UNDULATION_M);
    const base = ecefToWorld(up, GEOID_UNDULATION_M);
    const convergenceDegrees =
      (Math.atan2(step.x - base.x, -(step.z - base.z)) * 180) / Math.PI;
    expect(Math.abs(convergenceDegrees)).toBeGreaterThan(0.05);
    expect(Math.abs(convergenceDegrees)).toBeLessThan(0.11);
  });

  const composed = multiplyMatrices(placement.matrix, GLTF_Y_UP_TO_Z_UP);

  it("turns a glTF up into a world up", () => {
    // "Up" in the file is not (0, 1, 0). The vertices are authored Y-up in the
    // glTF convention over data that was Z-up in ECEF, so the file's +Y is ECEF's
    // +Z — the earth's polar axis — and not the local vertical at all. What is
    // straight up at the crossing is therefore whatever ECEF's own up maps to,
    // and this is the check that the composition sends it to world +Y.
    const up = inGltfCoordinates(unitEcef(0, 0, 1));
    const placed = applyMatrix(composed, scale(up, 100));
    expect(placed.y - placement.position.y).toBeCloseTo(100, 1);
    expect(
      Math.hypot(placed.x - placement.position.x, placed.z - placement.position.z),
    ).toBeLessThan(0.5);
  });

  it("does not turn it if the turn is left out, which is the defect", () => {
    // The same vector through the placement alone. Without the Y-up to Z-up turn
    // a building's vertical becomes something 39 degrees off the vertical, and
    // the city lands in the right place lying on its side.
    const up = inGltfCoordinates(unitEcef(0, 0, 1));
    const placed = applyMatrix(placement.matrix, scale(up, 100));
    expect(placed.y - placement.position.y).toBeLessThan(90);
  });

  it("keeps a horizontal step horizontal and the right length", () => {
    const east = inGltfCoordinates(unitEcef(1, 0, 0));
    const north = inGltfCoordinates(unitEcef(0, 1, 0));
    for (const direction of [east, north]) {
      const placed = applyMatrix(composed, scale(direction, 100));
      expect(Math.abs(placed.y - placement.position.y)).toBeLessThan(0.5);
      // 100 m in the file is 100 m in the world, to the grid's 0.9999 scale.
      expect(
        Math.hypot(placed.x - placement.position.x, placed.z - placement.position.z),
      ).toBeCloseTo(100, 1);
    }
  });
});

/**
 * A unit vector in the local east-north-up frame at the crossing, as ECEF.
 *
 * Built by differencing the geodetic-to-ECEF conversion rather than by writing
 * out the rotation, for the same reason `worldPlacement` differentiates the
 * projection instead of deriving it: the formula is easy to get subtly wrong and
 * the difference is not.
 */
function unitEcef(east: number, north: number, up: number): [number, number, number] {
  const { latitude, longitude } = AOI_CENTRE_WGS84;
  const step = 0.001;
  const origin = geodeticToEcef(latitude, longitude, 0);
  const axes: [number, number, number][] = [
    geodeticToEcef(latitude, longitude + step, 0),
    geodeticToEcef(latitude + step, longitude, 0),
    geodeticToEcef(latitude, longitude, 1),
  ];
  const weights = [east, north, up];
  const out: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    const delta: [number, number, number] = [
      axes[axis]![0] - origin[0],
      axes[axis]![1] - origin[1],
      axes[axis]![2] - origin[2],
    ];
    const length = Math.hypot(...delta);
    for (let component = 0; component < 3; component += 1) {
      out[component] = out[component]! + (weights[axis]! * delta[component]!) / length;
    }
  }
  return out;
}

/** An ECEF direction written the way a glTF file would write it: Y-up. */
function inGltfCoordinates(ecef: [number, number, number]): { x: number; y: number; z: number } {
  // The inverse of GLTF_Y_UP_TO_Z_UP, which maps (x, y, z) to (x, −z, y).
  return { x: ecef[0], y: ecef[2], z: -ecef[1] };
}

function scale(point: { x: number; y: number; z: number }, by: number): {
  x: number;
  y: number;
  z: number;
} {
  return { x: point.x * by, y: point.y * by, z: point.z * by };
}

describe("the world origin the whole scene hangs from", () => {
  it("is where the projection puts the crossing", () => {
    // A guard on the constant rather than on the projection: `aoi.test.ts` owns
    // the projection, and this owns the fact that the placement chain reads the
    // same origin out of the same file.
    expect(AOI_ORIGIN_EPSG6677.northing).toBeCloseTo(-37768.561, 3);
    expect(AOI_ORIGIN_EPSG6677.easting).toBeCloseTo(-12026.817, 3);
    expect(AOI_ORIGIN_EPSG6677.height).toBe(0);
  });
});

describe("the scene mesh format", () => {
  const mesh: MeshData = {
    header: {
      version: 1,
      name: "test",
      vertexCount: 4,
      triangleCount: 2,
      bounds: { min: [-1, 0, -1], max: [1, 2, 1] },
    },
    positions: new Float32Array([-1, 0, -1, 1, 0, -1, 1, 2, 1, -1, 2, 1]),
    normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };

  it("round-trips", () => {
    const decoded = decodeMesh(encodeMesh(mesh));
    expect(decoded.header).toEqual(mesh.header);
    expect([...decoded.positions]).toEqual([...mesh.positions]);
    expect([...decoded.normals]).toEqual([...mesh.normals]);
    expect([...decoded.indices]).toEqual([...mesh.indices]);
  });

  it("refuses a truncated file by name rather than rendering less of Shibuya", () => {
    const bytes = encodeMesh(mesh);
    expect(() => decodeMesh(bytes.subarray(0, bytes.length - 8))).toThrow(/truncated/);
  });

  it("refuses something that is not a scene mesh", () => {
    expect(() => decodeMesh(new Uint8Array(64))).toThrow(/not a scene mesh/);
  });

  it("refuses a header that does not match what it carries", () => {
    expect(() =>
      encodeMesh({ ...mesh, header: { ...mesh.header, triangleCount: 3 } }),
    ).toThrow(/says it has 3 triangles/);
  });
});
