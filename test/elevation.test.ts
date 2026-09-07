/**
 * The elevation gate.
 *
 * Two surveys, two encodings, two parsers, one number. PLATEAU's terrain TIN and
 * GSI's elevation tiles are independent products from independent pipelines, and
 * at the Shibuya Scramble Crossing they must both read about 15.2 m.
 *
 * What a disagreement would mean, in order of likelihood: the TIN parse is
 * transposing latitude and longitude; the tile maths is off by a pixel or a
 * tile; the PNG is being decoded as Mapbox Terrain-RGB or Terrarium rather than
 * with GSI's own formula; or a geoid has crept in somewhere and shifted one
 * source by the 36.877 m undulation. Each of those is invisible in a rendered
 * frame — terrain that is uniformly 36.877 m too high looks like terrain — and
 * each is caught here for the cost of two small fixtures.
 *
 * `Bound:` this checks one point, at the crossing, against two fixtures cut from
 * one vintage of each source. It proves the parse and the tile maths agree with
 * an independent survey at that point. It does not prove the TIN is right across
 * the AOI, and it does not prove the terrain mesh Phase 2 builds from the TIN is
 * right anywhere — a mesh built with the vertices in the wrong order would pass
 * this and render inside out.
 *
 * The fixtures are real bytes from both sources, cut down; `test/fixtures/` says
 * where each came from. Regenerate the full files with `npm run data:fetch`.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { AOI_CENTRE_WGS84 } from "../src/world/aoi.js";
import {
  decodeElevation,
  elevationAtPixel,
  tileAddress,
} from "../tools/geo/gsi-elevation-tile.js";
import { parseTin, sampleTin } from "../tools/geo/plateau-tin.js";
import { decodePng } from "../tools/visual/png.js";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

/** The tile the fixture is, so a wrong tile address is a failure and not a silent miss. */
const FIXTURE_TILE = { zoom: 15, x: 29099, y: 12905 };

/** Measured ground level at the crossing. Four independent sources agree to 0.02 m. */
const CROSSING_GROUND_M = 15.2;

describe("GSI elevation tiles", () => {
  it("uses GSI's own encoding, not Terrain-RGB and not Terrarium", () => {
    // 0.01 m per unit, big-endian across R, G, B.
    expect(decodeElevation(0, 5, 238)).toBeCloseTo(15.18, 6);
    expect(decodeElevation(0, 0, 0)).toBe(0);
    expect(decodeElevation(0, 0, 1)).toBeCloseTo(0.01, 9);
    // Two's complement below sea level. Terrarium would read this as 8,388,607 m.
    expect(decodeElevation(255, 255, 156)).toBeCloseTo(-1, 6);
    // The no-data sentinel. Read linearly it is 83,886 m of mountain.
    expect(decodeElevation(128, 0, 0)).toBeUndefined();
  });

  it("locates the crossing in the tile the fixture is", () => {
    const address = tileAddress(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude, 15);
    expect(address.x).toBe(FIXTURE_TILE.x);
    expect(address.y).toBe(FIXTURE_TILE.y);
    expect(address.pixelX).toBe(217);
    expect(address.pixelY).toBe(192);
  });

  it("reads about 15.2 m of ground at the crossing", async () => {
    const png = decodePng(new Uint8Array(await readFile(fixture("gsi-dem5a-15-29099-12905.png"))));
    expect(png.width).toBe(256);
    expect(png.height).toBe(256);

    const address = tileAddress(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude, 15);
    const height = elevationAtPixel(png, address.pixelX, address.pixelY);
    expect(height).toBeDefined();
    expect(height!).toBeCloseTo(CROSSING_GROUND_M, 0);
  });
});

describe("the PLATEAU terrain TIN", () => {
  it("reads about 15.2 m of ground at the crossing", async () => {
    const triangles = parseTin(await readFile(fixture("plateau-dem-crossing.gml"), "utf8"));
    expect(triangles.length).toBeGreaterThan(100);

    const height = sampleTin(
      triangles,
      AOI_CENTRE_WGS84.latitude,
      AOI_CENTRE_WGS84.longitude,
    );
    expect(height).toBeDefined();
    expect(height!).toBeCloseTo(CROSSING_GROUND_M, 0);
  });

  it("is latitude-first, so a transposed sample falls off the excerpt entirely", () => {
    // Not a formality. The excerpt is a 50 m box; feeding it (longitude,
    // latitude) asks for a point in the Pacific and must miss rather than
    // return some nearby triangle's height.
    expect(
      sampleTin(
        [
          {
            vertices: [
              [35.6595, 139.7005, 15],
              [35.6596, 139.7005, 16],
              [35.6595, 139.7006, 17],
            ],
          },
        ],
        139.7005,
        35.6595,
      ),
    ).toBeUndefined();
  });

  it("interpolates rather than snapping to a vertex", () => {
    const flat = sampleTin(
      [
        {
          vertices: [
            [0, 0, 10],
            [1, 0, 20],
            [0, 1, 10],
          ],
        },
      ],
      0.5,
      0,
    );
    expect(flat).toBeCloseTo(15, 9);
  });
});

describe("the two surveys against each other", () => {
  it("agree at the crossing, which is what says the vertical datum is shared", async () => {
    const png = decodePng(new Uint8Array(await readFile(fixture("gsi-dem5a-15-29099-12905.png"))));
    const address = tileAddress(AOI_CENTRE_WGS84.latitude, AOI_CENTRE_WGS84.longitude, 15);
    const gsi = elevationAtPixel(png, address.pixelX, address.pixelY);

    const triangles = parseTin(await readFile(fixture("plateau-dem-crossing.gml"), "utf8"));
    const plateau = sampleTin(
      triangles,
      AOI_CENTRE_WGS84.latitude,
      AOI_CENTRE_WGS84.longitude,
    );

    expect(gsi).toBeDefined();
    expect(plateau).toBeDefined();

    // Half a metre. The two agree far more closely than that in practice, but
    // the number that matters is the one this separates them from: if PLATEAU
    // heights were ellipsoidal rather than orthometric the gap would be 36.88 m,
    // and a 5 m tile pixel against a 2.5 m triangle can honestly differ by a
    // few tens of centimetres.
    expect(Math.abs(gsi! - plateau!)).toBeLessThan(0.5);

    // And both must be the real ground, not zero and not a geoid away from it.
    expect(gsi!).toBeGreaterThan(10);
    expect(gsi!).toBeLessThan(25);
    expect(plateau!).toBeGreaterThan(10);
    expect(plateau!).toBeLessThan(25);
  });
});
