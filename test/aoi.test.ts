/**
 * The coordinate gate.
 *
 * There are two independent chances to mirror this scene and neither of them
 * shows up as a defect anyone would notice. CityGML's `gml:posList` is latitude
 * first; EPSG:6677's own axis definition is northing first, the opposite of the
 * usual convention. Flip either and Shibuya renders perfectly, at the right
 * scale, with the right buildings — reflected. No frame review catches that,
 * because nobody in this fleet knows Shibuya's skyline well enough to notice it
 * backwards, and every later gate would go green on the mirrored city.
 *
 * So this gate pins the numbers instead. `Bound:` it checks the projection and
 * the world-frame mapping against four measured points and the box's measured
 * size. It says nothing about whether the *data* is placed correctly once it is
 * loaded — that is Phase 2's problem and needs its own gate.
 *
 * Where the expected values come from: a research pass measured them with a
 * separate Krüger-series implementation, and `tools/geo/plane-rectangular.ts`
 * reproduces all four to the millimetre from an independent implementation.
 * Provenance is in `docs/work/0_shibuya-1km/design.md`.
 */

import { describe, expect, it } from "vitest";

import {
  AOI_BOUNDS_WGS84,
  AOI_CENTRE_WGS84,
  AOI_EXTENT_M,
  AOI_MESH_CODES,
  AOI_ORIGIN_EPSG6677,
  AOI_OVERPASS_BBOX,
  isInsideAoi,
} from "../src/world/aoi.js";
import { planeRectangularToWorld } from "../src/world/frame.js";
import { CS_IX, geographicToPlaneRectangular } from "../tools/geo/plane-rectangular.js";

/** Millimetre. The published values carry three decimals, so this is their full precision. */
const MM = 1e-3;

describe("the AOI box", () => {
  it("is the box the plan names, centred on the Scramble Crossing", () => {
    expect(AOI_BOUNDS_WGS84).toEqual({
      south: 35.655,
      north: 35.664,
      west: 139.695,
      east: 139.706,
    });
    expect(AOI_CENTRE_WGS84.latitude).toBeCloseTo(35.6595, 6);
    expect(AOI_CENTRE_WGS84.longitude).toBeCloseTo(139.7005, 6);
    // The centre is the centre, not merely near it.
    expect((AOI_BOUNDS_WGS84.south + AOI_BOUNDS_WGS84.north) / 2).toBeCloseTo(
      AOI_CENTRE_WGS84.latitude,
      9,
    );
    expect((AOI_BOUNDS_WGS84.west + AOI_BOUNDS_WGS84.east) / 2).toBeCloseTo(
      AOI_CENTRE_WGS84.longitude,
      9,
    );
  });

  it("writes the Overpass bbox in Overpass's own order, which is south west north east", () => {
    expect(AOI_OVERPASS_BBOX).toBe("35.6550,139.6950,35.6640,139.7060");
  });

  it("names the four JIS X 0410 cells the box straddles", () => {
    expect(AOI_MESH_CODES.level3).toEqual(["53393585", "53393586", "53393595", "53393596"]);
    // Every 1 km cell must sit inside the 10 km cell that names the terrain file.
    for (const mesh of AOI_MESH_CODES.level3) {
      expect(mesh.startsWith(AOI_MESH_CODES.level2)).toBe(true);
    }
    expect(AOI_MESH_CODES.level2.startsWith(AOI_MESH_CODES.level1)).toBe(true);
  });

  it("puts the crossing inside itself and Shinjuku outside", () => {
    expect(isInsideAoi(AOI_CENTRE_WGS84)).toBe(true);
    expect(isInsideAoi({ latitude: 35.6896, longitude: 139.7006 })).toBe(false);
  });
});

describe("projecting into EPSG:6677", () => {
  it("uses the CS IX parameters, central meridian included", () => {
    expect(CS_IX.latitudeOfOrigin).toBe(36);
    // 139 degrees 50 minutes. Not 139.83, and not a round number of degrees.
    expect(CS_IX.centralMeridian).toBeCloseTo(139.8333333333, 9);
    expect(CS_IX.scaleFactor).toBe(0.9999);
  });

  it("lands the Scramble Crossing on its measured coordinates", () => {
    const crossing = geographicToPlaneRectangular(
      AOI_CENTRE_WGS84.latitude,
      AOI_CENTRE_WGS84.longitude,
    );
    expect(crossing.northing).toBeCloseTo(-37768.561, 3);
    expect(crossing.easting).toBeCloseTo(-12026.817, 3);
  });

  it("agrees with the local origin the pipeline subtracts", () => {
    const crossing = geographicToPlaneRectangular(
      AOI_CENTRE_WGS84.latitude,
      AOI_CENTRE_WGS84.longitude,
    );
    expect(Math.abs(crossing.northing - AOI_ORIGIN_EPSG6677.northing)).toBeLessThan(MM);
    expect(Math.abs(crossing.easting - AOI_ORIGIN_EPSG6677.easting)).toBeLessThan(MM);
  });

  it("lands the AOI corners on their measured coordinates", () => {
    const southWest = geographicToPlaneRectangular(
      AOI_BOUNDS_WGS84.south,
      AOI_BOUNDS_WGS84.west,
    );
    expect(southWest.northing).toBeCloseTo(-38267.112, 3);
    expect(southWest.easting).toBeCloseTo(-12525.493, 3);

    const northEast = geographicToPlaneRectangular(
      AOI_BOUNDS_WGS84.north,
      AOI_BOUNDS_WGS84.east,
    );
    expect(northEast.northing).toBeCloseTo(-37269.982, 3);
    expect(northEast.easting).toBeCloseTo(-11528.196, 3);
  });

  it("measures 997.1 by 997.3 metres, which is what the constants say", () => {
    const southWest = geographicToPlaneRectangular(
      AOI_BOUNDS_WGS84.south,
      AOI_BOUNDS_WGS84.west,
    );
    const northEast = geographicToPlaneRectangular(
      AOI_BOUNDS_WGS84.north,
      AOI_BOUNDS_WGS84.east,
    );
    expect(northEast.northing - southWest.northing).toBeCloseTo(AOI_EXTENT_M.northSouth, 1);
    expect(northEast.easting - southWest.easting).toBeCloseTo(AOI_EXTENT_M.eastWest, 1);
  });

  it("is northing-first: going north moves the northing and leaves the easting alone", () => {
    const here = geographicToPlaneRectangular(35.6595, 139.7005);
    const north = geographicToPlaneRectangular(35.6695, 139.7005);
    const east = geographicToPlaneRectangular(35.6595, 139.7105);

    expect(north.northing - here.northing).toBeGreaterThan(1000);
    expect(Math.abs(north.easting - here.easting)).toBeLessThan(2);
    expect(east.easting - here.easting).toBeGreaterThan(800);
    expect(Math.abs(east.northing - here.northing)).toBeLessThan(2);
  });

  it("passes orthometric height through without touching it", () => {
    // PLATEAU buildings and PLATEAU terrain are both metres above Tokyo Bay mean
    // sea level. A projection that quietly added the 36.877 m geoid undulation
    // would put every building a storey underground.
    expect(geographicToPlaneRectangular(35.6595, 139.7005, 15.18).height).toBe(15.18);
  });
});

describe("the whole chain, latitude and longitude to scene metres", () => {
  /** Project, then subtract the origin and swap axes the way a loader would. */
  const toWorld = (latitude: number, longitude: number, height = 0) =>
    planeRectangularToWorld(
      geographicToPlaneRectangular(latitude, longitude, height),
      AOI_ORIGIN_EPSG6677,
    );

  it("puts the crossing at the world origin", () => {
    const origin = toWorld(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude);
    expect(origin.length()).toBeLessThan(MM);
  });

  it("is not mirrored: Shibuya Scramble Square lands south-east of the crossing", () => {
    // The 220 m tower at 35.65831 N, 139.70221 E. It is south of the crossing
    // (lower latitude) and east of it (higher longitude), so in a frame where
    // +X is east and +Z is south it must land at positive X and positive Z.
    //
    // This is the assertion the whole file exists for. Swap latitude and
    // longitude in the posList reader, or northing and easting in the
    // projection, and one of these two signs flips.
    const tower = toWorld(35.65831, 139.70221);
    expect(tower.x).toBeGreaterThan(0);
    expect(tower.z).toBeGreaterThan(0);
    expect(tower.x).toBeCloseTo(154.649, 2);
    expect(tower.z).toBeCloseTo(132.229, 2);
    expect(Math.hypot(tower.x, tower.z)).toBeCloseTo(203.5, 0);
  });

  it("sends north to -Z and east to +X across the whole box", () => {
    const north = toWorld(AOI_BOUNDS_WGS84.north, AOI_CENTRE_WGS84.longitude);
    const south = toWorld(AOI_BOUNDS_WGS84.south, AOI_CENTRE_WGS84.longitude);
    const east = toWorld(AOI_CENTRE_WGS84.latitude, AOI_BOUNDS_WGS84.east);
    const west = toWorld(AOI_CENTRE_WGS84.latitude, AOI_BOUNDS_WGS84.west);

    expect(north.z).toBeLessThan(-490);
    expect(south.z).toBeGreaterThan(490);
    expect(east.x).toBeGreaterThan(490);
    expect(west.x).toBeLessThan(-490);
  });

  it("keeps every corner of the box inside 750 m of the origin", () => {
    // The reason for a local origin at all: a float32 vertex buffer has to hold
    // these, and it cannot hold a 38 km northing at centimetre resolution.
    for (const latitude of [AOI_BOUNDS_WGS84.south, AOI_BOUNDS_WGS84.north]) {
      for (const longitude of [AOI_BOUNDS_WGS84.west, AOI_BOUNDS_WGS84.east]) {
        expect(toWorld(latitude, longitude, 220).length()).toBeLessThan(750);
      }
    }
  });
});
