/**
 * Decode the GSI aerial reference tiles to raw pixels, with their world mapping.
 *
 * The reference is 18_232797_103245.jpg and its eight neighbours under
 * `data/decorations/paint-reference/`, written by `npm run data:paint-reference`.
 * It is the comparison the criterion asks for and it is never a basemap texture.
 *
 * Why this decodes through a browser rather than in Node: nothing in this
 * repository reads JPEG, and adding a decoder dependency to answer one question
 * would be a new supply-chain surface for a review lane. Chromium already ships
 * one and this lane already requires Chromium, so the decode is the browser's.
 * What that buys and costs is stated plainly: the pixels are Chromium's sRGB
 * interpretation of a baseline JPEG, so they carry JPEG ringing and 4:2:0
 * chroma subsampling like any other reader's, and this review does not treat a
 * one-pixel reference feature as meaningful.
 *
 * The tiles are pinned by SHA-256 against the digests `data:paint-reference`
 * recorded when it fetched them, so a reference that changed under this review
 * fails here by name instead of quietly moving the comparison.
 *
 * Web Mercator pixel to world, per tile, using the world frame's own projection
 * rather than a second copy of it: pixel to longitude and latitude, then
 * `geographicToPlaneRectangular` and `planeRectangularToWorld`, which is the
 * seam the rest of the repository already uses. The corners are recorded at
 * pixel *edges* (0 and 256), so the analysis interpolates between them instead
 * of guessing where the half-pixel sits.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { PAINT_REVIEW_ROOT } from "./playwright.config.js";

const SOURCE_ROOT = "data/decorations/paint-reference";
const OUT_ROOT = path.join(PAINT_REVIEW_ROOT, "reference");

interface Provenance {
  zoom: number;
  records: { file: string; url: string; sha256: string; bytes: number }[];
}

/** The world position of a tile pixel *edge*, in the world frame, metres. */
function worldOfPixelEdge(zoom: number, tileX: number, tileY: number, pixelX: number, pixelY: number): { x: number; z: number } {
  const scale = 2 ** zoom;
  const longitude = ((tileX + pixelX / 256) / scale) * 360 - 180;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + pixelY / 256)) / scale))) * 180) / Math.PI;
  const world = planeRectangularToWorld(geographicToPlaneRectangular(latitude, longitude, 0), AOI_ORIGIN_EPSG6677);
  return { x: world.x, z: world.z };
}

interface ReferenceTileRecord {
  source: string;
  url: string;
  jpgSha256: string;
  rgbaFile: string;
  rgbaSha256: string;
  zoom: number;
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  corners: { topLeft: { x: number; z: number }; topRight: { x: number; z: number }; bottomLeft: { x: number; z: number }; bottomRight: { x: number; z: number } };
  groundSampleDistanceM: { eastWest: number; northSouth: number };
}

test.describe("paint reference tiles", () => {
  test("decodes the pinned GSI aerial tiles to pixels and records where each one is in the world", async ({ page }) => {
    await rm(OUT_ROOT, { recursive: true, force: true });
    await mkdir(OUT_ROOT, { recursive: true });

    const provenance = JSON.parse(await readFile(path.join(SOURCE_ROOT, "provenance.json"), "utf8")) as Provenance;
    expect(provenance.zoom, "the reference zoom is not the reviewed 18").toBe(18);

    // A blank page is enough: this only needs a canvas, not the app.
    await page.goto("about:blank");

    const tiles: ReferenceTileRecord[] = [];
    for (const record of provenance.records) {
      const bytes = new Uint8Array(await readFile(path.join(SOURCE_ROOT, record.file)));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      expect(sha256, `${record.file} is not the file data:paint-reference recorded; re-fetch the reference before comparing against it`).toBe(record.sha256);

      const match = /^(\d+)_(\d+)_(\d+)\.jpg$/.exec(record.file);
      expect(match, `${record.file} is not named <zoom>_<x>_<y>.jpg`).not.toBeNull();
      const zoom = Number(match![1]);
      const tileX = Number(match![2]);
      const tileY = Number(match![3]);

      const base64 = Buffer.from(bytes).toString("base64");
      const decoded = await page.evaluate(async (dataUrl: string) => {
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context === null) throw new Error("The comparison canvas could not be created.");
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let binary = "";
        const chunk = 0x8000;
        for (let index = 0; index < data.length; index += chunk) {
          binary += String.fromCharCode(...data.subarray(index, index + chunk));
        }
        return { width: canvas.width, height: canvas.height, base64: btoa(binary) };
      }, `data:image/jpeg;base64,${base64}`);

      expect(decoded.width, `${record.file} did not decode to a 256 px tile`).toBe(256);
      expect(decoded.height, `${record.file} did not decode to a 256 px tile`).toBe(256);

      const rgba = Buffer.from(decoded.base64, "base64");
      expect(rgba.length, `${record.file} decoded to ${rgba.length} bytes, not ${256 * 256 * 4}`).toBe(256 * 256 * 4);

      const pixelFile = `${record.file.replace(/\.jpg$/, "")}.rgba`;
      await writeFile(path.join(OUT_ROOT, pixelFile), rgba);

      const corners = {
        topLeft: worldOfPixelEdge(zoom, tileX, tileY, 0, 0),
        topRight: worldOfPixelEdge(zoom, tileX, tileY, 256, 0),
        bottomLeft: worldOfPixelEdge(zoom, tileX, tileY, 0, 256),
        bottomRight: worldOfPixelEdge(zoom, tileX, tileY, 256, 256),
      };
      const widthM = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.z - corners.topLeft.z);
      const heightM = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.z - corners.topLeft.z);

      tiles.push({
        source: record.file,
        url: record.url,
        jpgSha256: record.sha256,
        rgbaFile: pixelFile,
        rgbaSha256: createHash("sha256").update(rgba).digest("hex"),
        zoom,
        tileX,
        tileY,
        width: decoded.width,
        height: decoded.height,
        corners,
        groundSampleDistanceM: { eastWest: widthM / 256, northSouth: heightM / 256 },
      });
    }

    expect(tiles, "the reference block is not the reviewed 3x3 tiles").toHaveLength(9);

    const centre = tiles.reduce((best, tile) => {
      const distance = Math.hypot(tile.corners.topLeft.x, tile.corners.topLeft.z);
      return distance < best.distance ? { tile, distance } : best;
    }, { tile: tiles[0]!, distance: Number.POSITIVE_INFINITY });

    await writeFile(
      path.join(OUT_ROOT, "index.json"),
      `${JSON.stringify({
        decodedAt: new Date().toISOString(),
        source: "Geospatial Information Authority of Japan (GSI), seamless aerial photography",
        attribution: "GSI seamless aerial photography, zoom 18, reprojected into the world frame for comparison only; never a basemap texture.",
        zoom: provenance.zoom,
        decodedBy: "Chromium's JPEG decoder through a canvas, sRGB, no resampling",
        originEpsg6677: AOI_ORIGIN_EPSG6677,
        // The world-space cell the whole 3x3 block covers, so a later reader can
        // see at a glance whether a crop was inside the reference at all.
        blockWorldBounds: {
          minX: Math.min(...tiles.map((tile) => Math.min(tile.corners.topLeft.x, tile.corners.topRight.x))),
          maxX: Math.max(...tiles.map((tile) => Math.max(tile.corners.topLeft.x, tile.corners.topRight.x))),
          minZ: Math.min(...tiles.map((tile) => Math.min(tile.corners.topLeft.z, tile.corners.bottomLeft.z))),
          maxZ: Math.max(...tiles.map((tile) => Math.max(tile.corners.topLeft.z, tile.corners.bottomLeft.z))),
        },
        centreTile: { tileX: centre.tile.tileX, tileY: centre.tile.tileY },
        tiles,
      }, null, 2)}\n`,
      "utf8",
    );

    // eslint-disable-next-line no-console -- the numbers a reviewer reads.
    console.log(
      [
        "",
        `${tiles.length} reference tiles decoded into ${OUT_ROOT}`,
        ...tiles.map((tile) => `  ${tile.source.padEnd(20)} ${tile.groundSampleDistanceM.eastWest.toFixed(4)} m/px east-west, ${tile.groundSampleDistanceM.northSouth.toFixed(4)} m/px north-south`),
        "",
      ].join("\n"),
    );
  });
});
