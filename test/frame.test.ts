import { describe, expect, it } from "vitest";

import {
  AOI_HALF_EXTENT_M,
  METRE,
  ORIGIN_WGS84,
  PERFORMANCE_TARGET,
  planeRectangularToWorld,
  type PlaneRectangularPoint,
} from "../src/world/frame.js";

/** A stand-in for the crossing's EPSG:6677 coordinates; Phase 2 computes the real ones. */
const ORIGIN: PlaneRectangularPoint = { northing: -35_000, easting: -8_000, height: 25 };

describe("the world frame", () => {
  it("puts the origin at the Shibuya Scramble Crossing", () => {
    expect(ORIGIN_WGS84.latitude).toBeCloseTo(35.6595, 4);
    expect(ORIGIN_WGS84.longitude).toBeCloseTo(139.7005, 4);
  });

  it("is in metres, with a 1 km area of interest", () => {
    expect(METRE).toBe(1);
    expect(AOI_HALF_EXTENT_M * 2).toBe(1000);
  });

  it("records the budget later phases are built against", () => {
    expect(PERFORMANCE_TARGET.framesPerSecond).toBe(60);
    expect(PERFORMANCE_TARGET.resolution).toEqual({ width: 1920, height: 1080 });
    expect(PERFORMANCE_TARGET.animatedPedestrians).toBe(3000);
    expect(PERFORMANCE_TARGET.vehicles).toBe(200);
  });
});

describe("planeRectangularToWorld", () => {
  it("puts the origin at zero", () => {
    const world = planeRectangularToWorld(ORIGIN, ORIGIN);
    // Component by component: negating a zero northing gives -0, which is the
    // same point and a different value to a deep equality check.
    expect(world.x).toBe(0);
    expect(world.y).toBe(0);
    expect(Math.abs(world.z)).toBe(0);
  });

  it("sends east to +X", () => {
    const world = planeRectangularToWorld({ ...ORIGIN, easting: ORIGIN.easting + 250 }, ORIGIN);
    expect(world.x).toBeCloseTo(250, 9);
    expect(world.y).toBeCloseTo(0, 9);
    expect(world.z).toBeCloseTo(0, 9);
  });

  it("sends north to -Z, which is the whole point of writing it down", () => {
    const world = planeRectangularToWorld({ ...ORIGIN, northing: ORIGIN.northing + 250 }, ORIGIN);
    expect(world.z).toBeCloseTo(-250, 9);
    expect(world.x).toBeCloseTo(0, 9);
  });

  it("sends height to +Y", () => {
    const world = planeRectangularToWorld({ ...ORIGIN, height: ORIGIN.height + 40 }, ORIGIN);
    expect(world.y).toBeCloseTo(40, 9);
  });

  it("keeps area-of-interest coordinates small enough for a float", () => {
    // The reason the origin is local: EPSG:6677 northings around Shibuya are in
    // the tens of thousands and its geocentric equivalents in the millions, and
    // a float32 vertex buffer runs out of resolution long before centimetres.
    const corner = planeRectangularToWorld(
      {
        northing: ORIGIN.northing + AOI_HALF_EXTENT_M,
        easting: ORIGIN.easting + AOI_HALF_EXTENT_M,
        height: ORIGIN.height + 250,
      },
      ORIGIN,
    );
    expect(corner.length()).toBeLessThan(1000);
  });
});
