/**
 * Reading heights out of PLATEAU's terrain TIN.
 *
 * Just enough of `dem:TINRelief` to answer "how high is the ground here" — the
 * triangles and a point sample. Phase 2 owns turning the TIN into a scene mesh;
 * this is the instrument the Phase 1 elevation gate measures with, kept small so
 * it is obviously right rather than merely untested.
 *
 * The TIN is `gml:Triangle` inside `gml:trianglePatches`, each a four-vertex
 * closed `gml:LinearRing`. Coordinates are EPSG:6697, so **latitude, longitude,
 * height**, in that order, and the height is orthometric metres above Tokyo Bay
 * mean sea level — the same quantity the buildings carry, and the same quantity
 * GSI's tiles carry. That is why the cross-check is a straight comparison with
 * no geoid term in it.
 */

export interface TinTriangle {
  /** Three vertices as [latitude, longitude, height], closing vertex dropped. */
  vertices: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
  ];
}

const TRIANGLE = /<gml:Triangle>[\s\S]*?<\/gml:Triangle>/g;
const POS_LIST = /<gml:posList[^>]*>([^<]+)<\/gml:posList>/;

/**
 * Parse the triangles out of a `dem:TINRelief` document.
 *
 * A regex rather than an XML parser because the shape is fixed and the real file
 * is 378 MB of one document, where a DOM parse costs several gigabytes. The
 * trade is that this would not survive a differently-formatted TIN — so it
 * throws by name on anything it does not recognise instead of returning fewer
 * triangles quietly.
 */
export function parseTin(xml: string): TinTriangle[] {
  const triangles: TinTriangle[] = [];

  for (const match of xml.matchAll(TRIANGLE)) {
    const positions = POS_LIST.exec(match[0]);
    if (!positions) {
      throw new Error(
        "A <gml:Triangle> in this TIN has no <gml:posList>. Every triangle in PLATEAU's dem " +
          "module carries one, so this document is not the shape this reader handles.",
      );
    }
    const numbers = positions[1]!.trim().split(/\s+/).map(Number);
    if (numbers.length !== 12) {
      throw new Error(
        `A triangle's posList holds ${numbers.length} numbers; a closed three-vertex ring in ` +
          "three dimensions holds 12. Either srsDimension is not 3 or the ring is not a triangle.",
      );
    }
    if (numbers.some(Number.isNaN)) {
      throw new Error("A triangle's posList holds a value that is not a number.");
    }
    triangles.push({
      vertices: [
        [numbers[0]!, numbers[1]!, numbers[2]!],
        [numbers[3]!, numbers[4]!, numbers[5]!],
        [numbers[6]!, numbers[7]!, numbers[8]!],
      ],
    });
  }

  if (triangles.length === 0) {
    throw new Error(
      "This document holds no <gml:Triangle> at all. A dem:TINRelief always does, so either the " +
        "file is not a TIN or it was truncated.",
    );
  }
  return triangles;
}

/**
 * Interpolate the ground height at a point, or `undefined` if no triangle covers it.
 *
 * Barycentric, in latitude and longitude rather than in projected metres. Over a
 * 2.5 m triangle the difference between interpolating in degrees and in metres is
 * far below the 0.01 m the data is quantised to, and doing it in degrees keeps
 * this readable and free of a projection dependency.
 *
 * `undefined` and not 0 when nothing covers the point, for the same reason the
 * GSI decoder returns `undefined` for no-data: a miss reported as sea level is a
 * hole that renders as a hole.
 */
export function sampleTin(
  triangles: readonly TinTriangle[],
  latitude: number,
  longitude: number,
): number | undefined {
  for (const { vertices } of triangles) {
    const [a, b, c] = vertices;
    // Barycentric coordinates, with longitude as x and latitude as y. Named
    // rather than indexed because [lat, lon, h] order is exactly the thing that
    // gets silently transposed.
    const [aLat, aLon] = a;
    const [bLat, bLon] = b;
    const [cLat, cLon] = c;

    const denominator = (bLat - cLat) * (aLon - cLon) + (cLon - bLon) * (aLat - cLat);
    if (denominator === 0) continue; // degenerate sliver; skip rather than divide by zero

    const w0 =
      ((bLat - cLat) * (longitude - cLon) + (cLon - bLon) * (latitude - cLat)) / denominator;
    const w1 =
      ((cLat - aLat) * (longitude - cLon) + (aLon - cLon) * (latitude - cLat)) / denominator;
    const w2 = 1 - w0 - w1;

    // A hair of tolerance so a point exactly on a shared edge lands in one of the
    // two triangles rather than falling between them.
    const epsilon = -1e-12;
    if (w0 >= epsilon && w1 >= epsilon && w2 >= epsilon) {
      return w0 * a[2] + w1 * b[2] + w2 * c[2];
    }
  }
  return undefined;
}
