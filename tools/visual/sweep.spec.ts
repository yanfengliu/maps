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

import { OrbitDriver, shortestAngle, type CameraSnapshot } from "./orbit.js";
import { decodePng, measureFrame, signatureDistance, type FrameStats } from "./png.js";
import { AZIMUTHS, CAPTURE_VIEWPORT, FRAME_FLOORS, SHOTS, frameName } from "./shots.js";

const OUTPUT_DIR = path.resolve("artifacts/visual");

interface CapturedFrame {
  file: string;
  shot: string;
  requestedAzimuth: number;
  camera: CameraSnapshot;
  stats: FrameStats;
  sha256: string;
}

test.describe("visual sweep", () => {
  // Twelve poses, each waiting for damped controls to come to rest, on a
  // software renderer. The wall-clock cost is the price of not photographing a
  // moving camera.
  test.setTimeout(10 * 60_000);

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
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }

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
            `colours ${String(frame.stats.distinctColours).padStart(6)}  ${frame.sha256.slice(0, 12)}`,
        ),
        "",
      ].join("\n"),
    );
  });
});
