/**
 * Projecting JGD2011 latitude and longitude into Japan Plane Rectangular CS IX.
 *
 * This is offline code. It runs in the fetch tooling and in the tests, never in
 * the browser — the world frame's rule is that no global coordinate reaches the
 * scene, so the pipeline projects and subtracts the local origin before anything
 * is handed to three.js.
 *
 * EPSG:6668 (JGD2011 geographic, GRS80) to EPSG:6677 (JGD2011 / Japan Plane
 * Rectangular CS IX). Same datum on both sides, so this is a projection and
 * nothing else: no NTv2 grid, no Helmert, no accuracy loss. Heights pass through
 * untouched, because both sides are orthometric metres above Tokyo Bay mean sea
 * level.
 *
 * Two axis traps meet here, which is why `PlaneRectangularPoint` names its fields
 * instead of ordering them:
 *
 * 1. CityGML `gml:posList` from PLATEAU is latitude, longitude, height.
 * 2. EPSG:6677's own axis definition is northing first — `AXIS["northing (X)"]`
 *    then `AXIS["easting (Y)"]` — the opposite of the usual convention.
 *
 * Either one flipped gives a Shibuya that renders perfectly and is mirrored.
 * `test/aoi.test.ts` pins the crossing's projected coordinates against measured
 * values so a flip cannot pass.
 *
 * Method: the Krüger series for Transverse Mercator, to fourth order in the third
 * flattening, as in EPSG Guidance Note 7-2. Fourth order is millimetre-accurate
 * within a few hundred kilometres of the central meridian; the AOI is 12 km from
 * it.
 */

import type { PlaneRectangularPoint } from "../../src/world/frame.js";

/** GRS80, the ellipsoid JGD2011 uses. */
const SEMI_MAJOR_AXIS_M = 6_378_137.0;
const INVERSE_FLATTENING = 298.257222101;

/**
 * EPSG:6677 — JGD2011 / Japan Plane Rectangular CS IX.
 *
 * Central meridian 139 degrees 50 minutes east, which is 139.8333... and not a
 * round number in degrees. Written as a division so the repeating decimal is not
 * silently truncated.
 */
export const CS_IX = Object.freeze({
  latitudeOfOrigin: 36.0,
  centralMeridian: 139 + 50 / 60,
  scaleFactor: 0.9999,
  falseEasting: 0,
  falseNorthing: 0,
});

const flattening = 1 / INVERSE_FLATTENING;
const eccentricity = Math.sqrt(flattening * (2 - flattening));
/** Third flattening. */
const n = flattening / (2 - flattening);

/** Rectifying radius. */
const B =
  (SEMI_MAJOR_AXIS_M / (1 + n)) *
  (1 + n ** 2 / 4 + n ** 4 / 64 + n ** 6 / 256 + (25 * n ** 8) / 16384);

const h1 = n / 2 - (2 / 3) * n ** 2 + (5 / 16) * n ** 3 + (41 / 180) * n ** 4;
const h2 = (13 / 48) * n ** 2 - (3 / 5) * n ** 3 + (557 / 1440) * n ** 4;
const h3 = (61 / 240) * n ** 3 - (103 / 140) * n ** 4;
const h4 = (49561 / 161280) * n ** 4;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Isometric-to-rectifying latitude, shared by the origin arc and every point. */
function rectifyingLatitude(latitudeRadians: number): number {
  const conformal = Math.atan(
    Math.sinh(
      Math.asinh(Math.tan(latitudeRadians)) -
        eccentricity * Math.atanh(eccentricity * Math.sin(latitudeRadians)),
    ),
  );
  return conformal;
}

/** Meridian arc from the equator to the latitude of origin, times B. */
const M0 = (() => {
  const beta = rectifyingLatitude(toRadians(CS_IX.latitudeOfOrigin));
  const xi0 =
    beta +
    h1 * Math.sin(2 * beta) +
    h2 * Math.sin(4 * beta) +
    h3 * Math.sin(6 * beta) +
    h4 * Math.sin(8 * beta);
  return B * xi0;
})();

/**
 * Project a JGD2011 geographic point into EPSG:6677 metres.
 *
 * Takes degrees and an orthometric height; returns northing, easting and the
 * same height. Nothing here subtracts a local origin — that is the caller's job,
 * and `AOI_ORIGIN_EPSG6677` is the number to subtract.
 */
export function geographicToPlaneRectangular(
  latitudeDegrees: number,
  longitudeDegrees: number,
  height = 0,
): PlaneRectangularPoint {
  const latitude = toRadians(latitudeDegrees);
  const deltaLongitude = toRadians(longitudeDegrees - CS_IX.centralMeridian);

  const beta = rectifyingLatitude(latitude);

  const eta0 = Math.atanh(Math.cos(beta) * Math.sin(deltaLongitude));
  const xi0 = Math.asin(Math.sin(beta) * Math.cosh(eta0));

  const xi =
    xi0 +
    h1 * Math.sin(2 * xi0) * Math.cosh(2 * eta0) +
    h2 * Math.sin(4 * xi0) * Math.cosh(4 * eta0) +
    h3 * Math.sin(6 * xi0) * Math.cosh(6 * eta0) +
    h4 * Math.sin(8 * xi0) * Math.cosh(8 * eta0);

  const eta =
    eta0 +
    h1 * Math.cos(2 * xi0) * Math.sinh(2 * eta0) +
    h2 * Math.cos(4 * xi0) * Math.sinh(4 * eta0) +
    h3 * Math.cos(6 * xi0) * Math.sinh(6 * eta0) +
    h4 * Math.cos(8 * xi0) * Math.sinh(8 * eta0);

  return {
    northing: CS_IX.falseNorthing + CS_IX.scaleFactor * (B * xi - M0),
    easting: CS_IX.falseEasting + CS_IX.scaleFactor * B * eta,
    height,
  };
}
