/**
 * The world frame every later phase builds in.
 *
 * These are contracts, not preferences. Terrain, buildings, roads and agents are
 * all placed with the rules below, so changing one of them is a change to every
 * system downstream of it.
 *
 * - One scene unit is one metre. No global scale factor exists anywhere.
 * - Y is up. The ground sits near y = 0 and building heights are metres above it.
 * - The world origin (0, 0, 0) is the Shibuya Scramble Crossing.
 * - +X points east, +Z points south, so -Z points north.
 *
 * Keeping the origin at the crossing is what keeps float precision usable: every
 * coordinate in the area of interest stays inside about 700 m of zero instead of
 * carrying the -37,768 m northing that EPSG:6677 puts on it. (An earlier draft of
 * this comment said 8,000,000 m, which is the geocentric figure, not the plane
 * rectangular one — CS IX's origin is at 36 N, only 38 km away.)
 */

import { Vector3 } from "three";

// The real extension, not the `.js` convention the rest of `src/` uses. Bare Node
// strips types but does not rewrite a `.js` specifier to the `.ts` beside it, and
// the offline pipeline in `tools/` runs under bare Node and places every tile
// through `planeRectangularToWorld` below. Vite and Vitest resolve either form.
import { AOI_CENTRE_WGS84 } from "./aoi.ts";

/** One scene unit is one metre. Stated so nothing has to guess. */
export const METRE = 1;

/**
 * Where the world origin sits in the real world, in WGS84 degrees.
 *
 * The origin is the centre of the area of interest, so this is an alias rather
 * than a second copy of the number. `aoi.ts` owns the box.
 */
export const ORIGIN_WGS84 = AOI_CENTRE_WGS84;

/**
 * Half the width of the 1 km area of interest, in metres.
 *
 * The nominal half extent, for anything that just needs a radius. The box is not
 * exactly square — 997.1 m by 997.3 m projected — so anything sizing a grid or a
 * tile budget reads `AOI_EXTENT_M` from `aoi.ts` instead.
 */
export const AOI_HALF_EXTENT_M = 500 * METRE;

/**
 * A point in JGD2011 / Japan Plane Rectangular CS IX (EPSG:6677), in metres.
 *
 * The axis order in that CRS is northing first: `x` is the northing and `y` is
 * the easting. Getting this backwards is the classic way to end up with a city
 * mirrored about its own diagonal, so the field names say which is which rather
 * than leaving it to an `x` and a `y`.
 */
export interface PlaneRectangularPoint {
  /** Northing, metres north of the CS IX false origin. EPSG:6677 calls this X. */
  northing: number;
  /** Easting, metres east of the CS IX central meridian. EPSG:6677 calls this Y. */
  easting: number;
  /** Height above the ellipsoid, metres. */
  height: number;
}

/**
 * Map an EPSG:6677 point into the world frame.
 *
 * This is the whole of the projection seam that lives in the renderer: an axis
 * swap and an origin subtraction. Turning latitude and longitude into EPSG:6677
 * belongs to the offline pipeline in Phase 2 and never runs in the browser, so
 * `origin` is supplied by whatever loaded the data rather than hardcoded here.
 * Phase 2 owns computing the crossing's EPSG:6677 coordinates and passing them.
 */
export function planeRectangularToWorld(
  point: PlaneRectangularPoint,
  origin: PlaneRectangularPoint,
  target = new Vector3(),
): Vector3 {
  return target.set(
    point.easting - origin.easting,
    point.height - origin.height,
    // North is -Z, so a point further north than the origin gets a negative Z.
    -(point.northing - origin.northing),
  );
}

/**
 * The performance budget the scene is built against, for later reference.
 *
 * Nothing enforces this yet — Phase 9 owns measuring it. It is recorded here so
 * the number sits next to the code that will have to hit it.
 */
export const PERFORMANCE_TARGET = Object.freeze({
  framesPerSecond: 60,
  resolution: Object.freeze({ width: 1920, height: 1080 }),
  animatedPedestrians: 3000,
  vehicles: 200,
});
