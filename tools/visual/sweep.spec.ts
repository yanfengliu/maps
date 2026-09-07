/**
 * The visual gate.
 *
 * It boots the production build, drives OrbitControls with real pointer and
 * wheel input to twelve poses, writes each frame as its own file at capture
 * resolution, and then checks the bytes it wrote.
 *
 * What it can prove: that the app rendered, that the input path moved the
 * camera, and that each frame is a distinct, non-blank image. What it cannot
 * prove: that any of those frames looks right. That is a person opening the
 * files, and the run prints the path and the SHA-256 of every one so a review
 * can be pinned to the bytes it actually looked at.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { OrbitDriver, shortestAngle, type CameraSnapshot, type TileStatus } from "./orbit.js";
import { decodePng, measureFrame, signatureDistance, type FrameStats } from "./png.js";
import { AZIMUTHS, CAPTURE_VIEWPORT, FRAME_FLOORS, SHOTS, frameName } from "./shots.js";

const OUTPUT_DIR = path.resolve("artifacts/visual");

interface CapturedFrame {
  file: string;
  shot: string;
  requestedAzimuth: number;
  camera: CameraSnapshot;
  stats: FrameStats;
  tiles: TileStatus;
  sha256: string;
}

test.describe("visual sweep", () => {
  // Eighteen poses, each waiting for damped controls to come to rest *and* for
  // the building tileset to stop refining, on a software renderer drawing half a
  // million triangles and 4096x4096 texture atlases. The wall-clock cost is the
  // price of not photographing a moving camera or a half-loaded city.
  test.setTimeout(45 * 60_000);

  test("orbits the scene through the real controls and writes every frame", async ({ page }) => {
    // Wipe first. A stale frame from an earlier run is worse than no frame: it
    // makes a run that never captured anything look like a run that passed.
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(OUTPUT_DIR, { recursive: true });

    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(`uncaught: ${error.message}`));

    await page.goto("/");

    const driver = new OrbitDriver(page);
    const status = await driver.waitForFirstFrame();

    // eslint-disable-next-line no-console -- the gate's own provenance line.
    console.log(
      `WebGL renderer: ${status.glRenderer}; drawing buffer ` +
        `${status.drawingBufferWidth}x${status.drawingBufferHeight}`,
    );

    // A drawing buffer smaller than the viewport means the canvas never took its
    // layout size, and every frame would be an upscale of a corner.
    expect(status.drawingBufferWidth).toBeGreaterThanOrEqual(CAPTURE_VIEWPORT.width);
    expect(status.drawingBufferHeight).toBeGreaterThanOrEqual(CAPTURE_VIEWPORT.height);

    const frames: CapturedFrame[] = [];

    for (const shot of SHOTS) {
      await driver.zoomTo(shot.distance);

      for (const azimuth of AZIMUTHS) {
        const camera = await driver.orbitTo(azimuth, shot.polar);

        // The controls went where they were asked. If they did not, the frames
        // would still be captured and would still differ, and the sweep would
        // quietly be a different sweep from the one under review.
        expect(Math.abs(shortestAngle(camera.azimuth - azimuth))).toBeLessThan(0.02);
        expect(Math.abs(camera.polar - shot.polar)).toBeLessThan(0.02);
        expect(Math.abs(camera.distance / shot.distance - 1)).toBeLessThan(0.03);

        // The city refines from wherever the camera ended up, so the tiles for
        // this pose have to arrive before the shutter. Without this the frame
        // holds whatever had loaded by the time the camera stopped moving, which
        // is a different picture on every run and reads as poor data rather than
        // as a race.
        const tiles = await driver.waitForTilesIdle();

        const file = path.join(OUTPUT_DIR, frameName(shot, azimuth));
        await page.screenshot({ path: file, animations: "disabled" });

        const bytes = new Uint8Array(await readFile(file));
        const stats = measureFrame(decodePng(bytes));
        frames.push({
          file,
          shot: shot.name,
          requestedAzimuth: azimuth,
          camera,
          stats,
          tiles,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }

    // Tiles were actually drawn, and the traversal actually chose between levels.
    //
    // Neither claim is free. A tileset that failed to refine still renders — the
    // root tile alone is seventeen of the ward's largest buildings — and every
    // pixel check above would pass on it. And a scene that loaded all 67 tiles
    // and held them would also pass, while telling you nothing about whether the
    // culling works.
    for (const frame of frames) {
      const where = path.basename(frame.file);
      expect(
        frame.tiles.visible,
        `${where} was captured with no building tiles visible at all`,
      ).toBeGreaterThan(0);
      expect(
        frame.tiles.error,
        `${where} was captured after a tile load failure`,
      ).toBeNull();

      // Tiles being visible to the traversal is not the same as buildings being
      // in the scene. Both of the ways this has actually gone wrong here — the
      // cache too small to hold a leaf, and the glTF up-axis rotation applied
      // twice — left the tileset reporting itself loaded, idle and error-free.
      const bounds = frame.tiles.drawnBounds;
      expect(bounds, `${where} has building tiles loaded but no geometry drawn`).not.toBeNull();
      if (bounds === null) continue;

      expect(
        frame.tiles.drawnTriangles,
        `${where} drew ${frame.tiles.drawnTriangles} building triangles`,
      ).toBeGreaterThan(1000);

      // Buildings stand on the ground. The area of interest's terrain runs 8.7 m
      // to 36.4 m above sea level, so the bottom of the drawn geometry belongs in
      // that band with room either side. A PLATEAU sentinel read as a height puts
      // it at −9,984 m; a missing geoid correction puts it 36.9 m out; the up-axis
      // rotation applied twice put it at −157 m.
      expect(
        bounds.min[1],
        `${where} draws building geometry down to ${bounds.min[1].toFixed(1)} m above sea level, ` +
          "where the ground under this area of interest is 8.7 m to 36.4 m",
      ).toBeGreaterThan(-20);
      expect(
        bounds.min[1],
        `${where} has no building geometry below ${bounds.min[1].toFixed(1)} m above sea level, ` +
          "so the city is floating over ground that runs 8.7 m to 36.4 m",
      ).toBeLessThan(60);
      expect(
        bounds.max[1],
        `${where} draws building geometry up to ${bounds.max[1].toFixed(1)} m, and the tallest ` +
          "thing in Shibuya is Scramble Square's roof at 245.6 m",
      ).toBeLessThan(400);

      // And they stand near the crossing. The 67 tiles reach past the box, so
      // this is loose on purpose; it separates the right kilometre of Tokyo from
      // the wrong one, not one block from the next. The landmark check in
      // `npm run data:scene` is what pins the block.
      for (const axis of [0, 2] as const) {
        const name = axis === 0 ? "east" : "south";
        expect(
          Math.max(Math.abs(bounds.min[axis]), Math.abs(bounds.max[axis])),
          `${where} draws building geometry ${Math.max(Math.abs(bounds.min[axis]), Math.abs(bounds.max[axis])).toFixed(0)} m ` +
            `${name} of the Scramble Crossing, and the whole tile set reaches about 1.5 km`,
        ).toBeLessThan(2500);
      }
    }

    // Somewhere in the sweep, the tallest building in Shibuya. Scramble Square's
    // roof is at 245.6 m above sea level and it stands 200 m from the crossing,
    // so a sweep that never sees anything above 200 m is not looking at this city.
    expect(
      Math.max(...frames.map((frame) => frame.tiles.drawnBounds?.max[1] ?? 0)),
      "nothing over 200 m above sea level was drawn from any of the eighteen poses, and Shibuya " +
        "Scramble Square's roof is at 245.6 m",
    ).toBeGreaterThan(200);

    const finalTiles = frames[frames.length - 1]!.tiles;
    expect(
      finalTiles.loaded,
      "no building tile was ever loaded, so the city in these frames is not the tileset",
    ).toBeGreaterThan(0);

    const visibleCounts = frames.map((frame) => frame.tiles.visible);
    expect(
      Math.max(...visibleCounts) - Math.min(...visibleCounts),
      "the same number of tiles was visible from every pose at every distance, so the traversal " +
        "is not choosing a level of detail — it is showing one",
    ).toBeGreaterThan(0);

    // Tiles are freed as well as loaded.
    //
    // Not by counting `dispose-model`: the cache is deliberately large enough to
    // hold this whole area of interest, so nothing is ever evicted from memory
    // and that counter stays at zero by design. What does move is the graphics
    // memory — `UnloadTilesPlugin` frees a tile's geometry, materials and
    // textures the moment it leaves the view — and a run where that number only
    // ever rises is a run where nothing was released.
    const gpuBytes = frames.map((frame) => frame.tiles.gpuBytes);
    let fell = false;
    for (let index = 1; index < gpuBytes.length; index += 1) {
      if (gpuBytes[index]! < gpuBytes[index - 1]!) fell = true;
    }
    expect(
      fell,
      `graphics memory never fell across eighteen poses — it went ` +
        `${gpuBytes.map((bytes) => (bytes / 1e6).toFixed(0)).join(", ")} MB — so tiles are loaded ` +
        "and never released, and the memory budget is untested",
    ).toBe(true);

    expect(consoleErrors, `the page logged errors during the sweep:\n${consoleErrors.join("\n")}`) //
      .toEqual([]);

    // Every pose was captured. A short sweep that passed its own checks is still
    // a sweep that did not run.
    expect(frames).toHaveLength(SHOTS.length * AZIMUTHS.length);

    for (const frame of frames) {
      expect(frame.stats.width, `${frame.file} is not the capture width`).toBe(
        CAPTURE_VIEWPORT.width,
      );
      expect(frame.stats.height, `${frame.file} is not the capture height`).toBe(
        CAPTURE_VIEWPORT.height,
      );
      expect(
        frame.stats.luminanceSpread,
        `${frame.file} is uniformly flat (luminance spread ${frame.stats.luminanceSpread.toFixed(2)}), ` +
          "which is what a frame that did not render looks like",
      ).toBeGreaterThan(FRAME_FLOORS.luminanceSpread);
      expect(
        frame.stats.distinctColours,
        `${frame.file} holds only ${frame.stats.distinctColours} distinct colours, so nothing was drawn ` +
          "into it beyond a fill or a plain gradient",
      ).toBeGreaterThan(FRAME_FLOORS.distinctColours);
    }

    // The camera really moved. Two independent witnesses: the controls report a
    // different angle, and the pixels are a different picture. Either alone can
    // be satisfied while the sweep is broken.
    for (const shot of SHOTS) {
      const inShot = frames.filter((frame) => frame.shot === shot.name);
      for (let left = 0; left < inShot.length; left += 1) {
        for (let right = left + 1; right < inShot.length; right += 1) {
          const a = inShot[left]!;
          const b = inShot[right]!;
          const angle = Math.abs(shortestAngle(a.camera.azimuth - b.camera.azimuth));
          expect(
            angle,
            `${path.basename(a.file)} and ${path.basename(b.file)} were captured from the same azimuth`,
          ).toBeGreaterThan(0.5);

          const distance = signatureDistance(a.stats, b.stats);
          expect(
            distance,
            `${path.basename(a.file)} and ${path.basename(b.file)} are the same picture ` +
              `(signature distance ${distance.toFixed(2)}), so the sweep wrote one view under several names`,
          ).toBeGreaterThan(FRAME_FLOORS.signatureDistance);
        }
      }
    }

    // The two elevations and zoom levels are genuinely different views of the
    // scene, not the same view at two names.
    for (const azimuth of AZIMUTHS) {
      const atAzimuth = frames.filter((frame) => frame.requestedAzimuth === azimuth);
      expect(atAzimuth).toHaveLength(SHOTS.length);
      const distance = signatureDistance(atAzimuth[0]!.stats, atAzimuth[1]!.stats);
      expect(
        distance,
        `the street and overhead frames at azimuth ${Math.round((azimuth * 180) / Math.PI)} degrees ` +
          "are the same picture, so the zoom did nothing",
      ).toBeGreaterThan(FRAME_FLOORS.signatureDistance);
    }

    const manifest = {
      capturedAt: new Date().toISOString(),
      viewport: CAPTURE_VIEWPORT,
      glRenderer: status.glRenderer,
      frames: frames.map((frame) => ({
        file: path.basename(frame.file),
        shot: frame.shot,
        requestedAzimuthDegrees: Math.round((frame.requestedAzimuth * 180) / Math.PI),
        azimuthRadians: Number(frame.camera.azimuth.toFixed(5)),
        polarRadians: Number(frame.camera.polar.toFixed(5)),
        distanceMetres: Number(frame.camera.distance.toFixed(2)),
        meanLuminance: Number(frame.stats.meanLuminance.toFixed(2)),
        luminanceSpread: Number(frame.stats.luminanceSpread.toFixed(2)),
        distinctColours: frame.stats.distinctColours,
        tilesVisible: frame.tiles.visible,
        tilesActive: frame.tiles.active,
        tilesLoadedSoFar: frame.tiles.loaded,
        tilesUnloadedSoFar: frame.tiles.unloaded,
        tileCacheBytes: Math.round(frame.tiles.cachedBytes),
        tileGpuBytes: Math.round(frame.tiles.gpuBytes),
        tileTexturesShrunk: frame.tiles.texturesShrunk,
        buildingTrianglesDrawn: frame.tiles.drawnTriangles,
        buildingBounds: frame.tiles.drawnBounds,
        sha256: frame.sha256,
      })),
    };
    await writeFile(
      path.join(OUTPUT_DIR, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    // eslint-disable-next-line no-console -- the list a reviewer opens.
    console.log(
      [
        "",
        `${frames.length} frames written to ${OUTPUT_DIR}`,
        "Open each one at its own size; a grid or a thumbnail is not a review.",
        ...frames.map(
          (frame) =>
            `  ${path.basename(frame.file).padEnd(18)} az ${((frame.camera.azimuth * 180) / Math.PI)
              .toFixed(1)
              .padStart(6)} deg  ${frame.camera.distance.toFixed(0).padStart(4)} m  ` +
            `spread ${frame.stats.luminanceSpread.toFixed(1).padStart(5)}  ` +
            `colours ${String(frame.stats.distinctColours).padStart(6)}  ` +
            `tiles ${String(frame.tiles.visible).padStart(3)} vis ` +
            `${String(frame.tiles.active).padStart(3)} act  ` +
            `${(frame.tiles.gpuBytes / 1e6).toFixed(0).padStart(4)} MB gpu ` +
            `${(frame.tiles.cachedBytes / 1e6).toFixed(0).padStart(4)} MB ram  ` +
            `${String(frame.tiles.drawnTriangles).padStart(7)} tri  ` +
            `${frame.sha256.slice(0, 12)}`,
        ),
        "",
      ].join("\n"),
    );
  });
});
