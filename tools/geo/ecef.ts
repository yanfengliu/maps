/**
 * Earth-centred earth-fixed coordinates, and the way out of them into the world frame.
 *
 * MLIT's pre-converted 3D Tiles carry their position as a `CESIUM_RTC` centre,
 * which is an ECEF point on the order of seven million metres from the earth's
 * centre. Nothing that large may reach the browser — see the world frame's rule
 * in `src/world/frame.ts` — so this module is where a tile stops being a global
 * position and becomes metres from the Shibuya Scramble Crossing.
 *
 * Two facts make that conversion less obvious than it looks.
 *
 * **ECEF heights are ellipsoidal and PLATEAU's are orthometric.** The geometry in
 * a tile is metres above the GRS80 ellipsoid; every height PLATEAU states in an
 * attribute, and every height the terrain TIN carries, is metres above Tokyo Bay
 * mean sea level. The two differ by the geoid undulation, about 36.8 m at
 * Shibuya. `geoidUndulationM` is that number and it is *measured from the data*
 * rather than assumed — see `tools/scene/build-buildings.ts`, which recovers it by
 * comparing each tile's ellipsoidal bounding region against the orthometric
 * `_zmin`/`_zmax` its own batch table carries, and refuses to run if the two
 * disagree with the published GSIGEO value.
 *
 * **A tile's vertices are offsets in the ECEF frame, not in a local one.** Placing
 * a tile is therefore a rotation as well as a translation, and the rotation is not
 * simply "east, north, up": EPSG:6677 is a Transverse Mercator grid whose north
 * differs from true north by the meridian convergence, which at Shibuya is 0.077
 * degrees — 67 cm of sideways error at 500 m from the tile centre if it is
 * ignored. `worldPlacement` recovers the whole linear part numerically from the
 * projection itself, so convergence and the 0.9999 grid scale come out of it for
 * free and no hand-derived rotation formula can be subtly wrong.
 *
 * One rotation is *not* in here, and it is the one that bites hardest: glTF is
 * Y-up and the frame `CESIUM_RTC` translates in is Z-up, so a tile's vertices need
 * turning before any of the above applies to them. That belongs to the b3dm
 * format rather than to geodesy and it lives in `GLTF_Y_UP_TO_Z_UP` in
 * `tools/tiles/b3dm.ts`, which records what leaving it out measured.
 */

import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { geographicToPlaneRectangular } from "./plane-rectangular.ts";

/** GRS80, the ellipsoid JGD2011 and WGS84 both effectively use here. */
const SEMI_MAJOR_AXIS_M = 6_378_137.0;
const INVERSE_FLATTENING = 298.257222101;
const flattening = 1 / INVERSE_FLATTENING;
const eccentricitySquared = flattening * (2 - flattening);

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export interface Geodetic {
  latitude: number;
  longitude: number;
  /** Metres above the ellipsoid, not above sea level. */
  ellipsoidalHeight: number;
}

export type Ecef = readonly [number, number, number];

/** Geodetic degrees and an ellipsoidal height to ECEF metres. */
export function geodeticToEcef(
  latitudeDegrees: number,
  longitudeDegrees: number,
  ellipsoidalHeight: number,
): [number, number, number] {
  const latitude = toRadians(latitudeDegrees);
  const longitude = toRadians(longitudeDegrees);
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const primeVertical =
    SEMI_MAJOR_AXIS_M / Math.sqrt(1 - eccentricitySquared * sinLatitude * sinLatitude);

  return [
    (primeVertical + ellipsoidalHeight) * cosLatitude * Math.cos(longitude),
    (primeVertical + ellipsoidalHeight) * cosLatitude * Math.sin(longitude),
    (primeVertical * (1 - eccentricitySquared) + ellipsoidalHeight) * sinLatitude,
  ];
}

/**
 * ECEF metres to geodetic degrees and an ellipsoidal height.
 *
 * Fixed-point iteration on the latitude. It converges to well under a micrometre
 * in a handful of steps anywhere that is not near the earth's axis, and Shibuya
 * is not. The loop is capped and the cap is a failure rather than a silent
 * best-effort: a point that will not converge is a point this reader has been
 * handed something other than an ECEF position, and returning a plausible wrong
 * answer would place a tile somewhere convincing.
 */
export function ecefToGeodetic(ecef: Ecef): Geodetic {
  const [x, y, z] = ecef;
  const longitude = Math.atan2(y, x);
  const horizontal = Math.hypot(x, y);

  if (horizontal === 0) {
    throw new Error(
      `The ECEF point (${x}, ${y}, ${z}) sits exactly on the earth's axis, where longitude is ` +
        "undefined. Nothing in the Shibuya area of interest can be there, so this is not an ECEF " +
        "position — check whether the CESIUM_RTC centre was read as the wrong three numbers.",
    );
  }

  let latitude = Math.atan2(z, horizontal * (1 - eccentricitySquared));
  let primeVertical = SEMI_MAJOR_AXIS_M;
  let converged = false;

  for (let step = 0; step < 24; step += 1) {
    const sinLatitude = Math.sin(latitude);
    primeVertical =
      SEMI_MAJOR_AXIS_M / Math.sqrt(1 - eccentricitySquared * sinLatitude * sinLatitude);
    const height = horizontal / Math.cos(latitude) - primeVertical;
    const next = Math.atan2(
      z,
      horizontal * (1 - (eccentricitySquared * primeVertical) / (primeVertical + height)),
    );
    if (Math.abs(next - latitude) < 1e-14) {
      latitude = next;
      converged = true;
      break;
    }
    latitude = next;
  }

  if (!converged) {
    throw new Error(
      `Converting the ECEF point (${x}, ${y}, ${z}) to latitude and longitude did not converge in ` +
        "24 iterations. That does not happen for a point on or near the earth's surface, so the " +
        "input is not an ECEF position in metres.",
    );
  }

  const sinLatitude = Math.sin(latitude);
  primeVertical =
    SEMI_MAJOR_AXIS_M / Math.sqrt(1 - eccentricitySquared * sinLatitude * sinLatitude);

  return {
    latitude: toDegrees(latitude),
    longitude: toDegrees(longitude),
    ellipsoidalHeight: horizontal / Math.cos(latitude) - primeVertical,
  };
}

/** A point in the world frame: metres east, up and south of the Scramble Crossing. */
export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * ECEF metres to world-frame metres.
 *
 * The whole chain in one place: ECEF to geodetic, ellipsoidal height to
 * orthometric by subtracting the geoid undulation, geodetic to EPSG:6677, then
 * the world frame's own axis swap and origin subtraction. Scene Y comes out as
 * metres above Tokyo Bay mean sea level, which is the same quantity the terrain
 * TIN and PLATEAU's building attributes carry.
 */
export function ecefToWorld(ecef: Ecef, geoidUndulationM: number): WorldPoint {
  const geodetic = ecefToGeodetic(ecef);
  const projected = geographicToPlaneRectangular(
    geodetic.latitude,
    geodetic.longitude,
    geodetic.ellipsoidalHeight - geoidUndulationM,
  );
  const world = planeRectangularToWorld(projected, AOI_ORIGIN_EPSG6677);
  return { x: world.x, y: world.y, z: world.z };
}

/**
 * A column-major 4x4 matrix, the shape glTF and three.js both want.
 *
 * Column-major means the translation is elements 12, 13 and 14, which is the
 * opposite of how the rows read on the page. It is written out explicitly in
 * `worldPlacement` rather than assembled by a helper, because a transposed
 * placement matrix produces a city that is the right size in the right place and
 * rotated, which is exactly the class of defect this project's coordinate gate
 * exists for.
 */
export type Matrix4Array = readonly number[];

export interface TilePlacement {
  /** Where the tile's own origin lands in the world frame. */
  position: WorldPoint;
  /**
   * The full placement: the linear map applied to the tile's ECEF-parallel
   * vertices, with `position` as its translation. Column-major, 16 elements.
   */
  matrix: Matrix4Array;
  /**
   * How far the linearisation is from the exact chain at `probeMetres` out,
   * in metres. A sanity number, not a tolerance: it should be sub-millimetre.
   */
  linearisationErrorM: number;
}

/**
 * Work out how to place a tile whose vertices are ECEF offsets from `centre`.
 *
 * The exact map from ECEF to the world frame is not linear — it is a projection
 * on an ellipsoid — so a tile cannot be placed with a translation alone, and the
 * rotation it needs is not the textbook east-north-up one either, because
 * EPSG:6677 grid north is not true north. Rather than deriving that rotation and
 * the 0.9999 grid scale by hand, this differentiates the exact chain numerically
 * at the tile centre: three probes, one along each ECEF axis, give the three
 * columns of the linear part.
 *
 * The residual is second order in the probe distance and in the tile radius. The
 * AOI's tiles reach about 175 m from their centres, where the curvature term is
 * a couple of millimetres, and `linearisationErrorM` reports what it actually
 * measured rather than leaving that as a claim.
 */
export function worldPlacement(
  centre: Ecef,
  geoidUndulationM: number,
  probeMetres = 100,
): TilePlacement {
  const origin = ecefToWorld(centre, geoidUndulationM);

  const columns: WorldPoint[] = [];
  for (let axis = 0; axis < 3; axis += 1) {
    const forward: [number, number, number] = [centre[0], centre[1], centre[2]];
    const backward: [number, number, number] = [centre[0], centre[1], centre[2]];
    forward[axis] = forward[axis]! + probeMetres;
    backward[axis] = backward[axis]! - probeMetres;
    const a = ecefToWorld(forward, geoidUndulationM);
    const b = ecefToWorld(backward, geoidUndulationM);
    // A central difference, so the first-order error term cancels and what is
    // left is the curvature the comment above budgets for.
    columns.push({
      x: (a.x - b.x) / (2 * probeMetres),
      y: (a.y - b.y) / (2 * probeMetres),
      z: (a.z - b.z) / (2 * probeMetres),
    });
  }

  const [ex, ey, ez] = columns as [WorldPoint, WorldPoint, WorldPoint];
  const matrix: number[] = [
    ex.x, ex.y, ex.z, 0,
    ey.x, ey.y, ey.z, 0,
    ez.x, ez.y, ez.z, 0,
    origin.x, origin.y, origin.z, 1,
  ];

  // How wrong the linear map is at the edge of a tile. Probed on the diagonal,
  // which is the worst case, and at 200 m, which is further than any AOI tile's
  // vertices reach from its centre.
  const check = 200;
  const exact = ecefToWorld([centre[0] + check, centre[1] + check, centre[2] + check], geoidUndulationM);
  const linear = applyMatrix(matrix, { x: check, y: check, z: check });
  const linearisationErrorM = Math.hypot(
    exact.x - linear.x,
    exact.y - linear.y,
    exact.z - linear.z,
  );

  return { position: origin, matrix, linearisationErrorM };
}

/**
 * Compose two column-major 4x4 matrices: the result applies `right` first.
 *
 * Written out rather than pulled from three.js so the offline pipeline's
 * placement maths has no dependency on the renderer, and so the order is
 * explicit at the one call site that needs it.
 */
export function multiplyMatrices(left: Matrix4Array, right: Matrix4Array): Matrix4Array {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += left[k * 4 + row]! * right[column * 4 + k]!;
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

/** Apply a column-major 4x4 to a point, as three.js and glTF would. */
export function applyMatrix(matrix: Matrix4Array, point: WorldPoint): WorldPoint {
  return {
    x: matrix[0]! * point.x + matrix[4]! * point.y + matrix[8]! * point.z + matrix[12]!,
    y: matrix[1]! * point.x + matrix[5]! * point.y + matrix[9]! * point.z + matrix[13]!,
    z: matrix[2]! * point.x + matrix[6]! * point.y + matrix[10]! * point.z + matrix[14]!,
  };
}
