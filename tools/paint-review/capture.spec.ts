/**
 * Three 1:1 frames of the scramble, on the hardware renderer, through the real
 * controls.
 *
 * The question this lane answers is whether the rendered road paint agrees with
 * the aerial reference imagery, and the previous native inspection could not ask
 * it: every frame it opened arrived as a 1066x600 preview of a 1280x720 source,
 * and a paint edge is a single pixel wide. So the frames this spec writes are
 * meant to be **cropped at 1:1** by `analyse.ts` and opened one at a time.
 *
 * Three poses, and each answers a different question:
 *
 * - `wide` covers about 265 x 149 m at 0.21 m/px: the whole crossing and the
 *   beginnings of all six approaches, for context and for whether any arm is
 *   missing rather than merely thin.
 * - `plan` covers about 140 x 79 m at 0.11 m/px: the crossing plus the near
 *   approaches, where a 5 m crossing arm is about 46 px wide.
 * - `detail` covers about 58 x 33 m at 0.046 m/px: the crossing core, where a
 *   45 cm zebra stripe is about 10 px and a 15 cm lane line is about 3 px.
 *
 * **The pose is fixed and driven through the controls.** This is a static paint
 * comparison, so a fixed pose is legitimate and the three poses are requested,
 * not assigned: `OrbitDriver` drags and wheels the canvas and reads back where
 * the camera actually ended up, and the manifest records that pose rather than
 * the one that was asked for. What it cannot show is anything about the input
 * path a person's own hand would take, and nothing here is evidence about that —
 * `tools/visual/` owns it.
 *
 * The renderer is asserted, not recorded, for the reason `tools/visual/lane.ts`
 * gives: a Chromium that accepted `--use-angle=d3d11` and drew on SwiftShader
 * would otherwise move this frame set silently, and this lane's crops are bound
 * to its bytes by digest.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { OrbitDriver } from "../visual/orbit.js";
import { HARDWARE_RENDERER_DENYLIST } from "../visual/lane.js";
import { decodePng } from "../visual/png.js";
import { PAINT_REVIEW_ROOT } from "./playwright.config.js";

const FRAME_DIR = path.join(PAINT_REVIEW_ROOT, "frames");

/** The capture size, restated so a resize of the viewport fails here by name. */
const CAPTURE_WIDTH = 1280;
const CAPTURE_HEIGHT = 720;

/**
 * The three poses, at azimuth 45 degrees: the camera sits south-east of the
 * crossing looking north-west, which is the framing the hero frames already use
 * and the one that puts all six arms of the scramble in view at once.
 *
 * `polar` is radians down from straight up, so 0.30 rad is 17 degrees off
 * vertical — deliberately near-nadir, because a paint plan read at a grazing
 * angle is foreshortened into aliasing and the previous review's whole problem
 * was thin paint at a distance.
 */
const POSES = [
  { name: "wide", azimuth: Math.PI / 4, polar: 0.3, distance: 150 },
  { name: "plan", azimuth: Math.PI / 4, polar: 0.34, distance: 80 },
  { name: "detail", azimuth: Math.PI / 4, polar: 0.46, distance: 35 },
] as const;

const STYLES = ["satellite", "cartographic"] as const;

/**
 * The scene bytes the frames are drawn from.
 *
 * The build digest alone does not determine the pixels — the same `dist/` draws
 * a different city against a different `data/scene/` — so each is hashed here
 * and recorded. A paint finding that cannot name the paint mesh it came from is
 * a finding about nothing.
 */
const SCENE_INPUTS = [
  "data/scene/markings.mesh",
  "data/scene/markings-provenance.json",
  "data/scene/roads.mesh",
  "data/scene/pavements.mesh",
  "data/scene/control-hardware.json",
  "data/network/network.json",
  "data/decorations/paint-reference/provenance.json",
];

async function digestOf(file: string): Promise<{ file: string; bytes: number; sha256: string }> {
  const bytes = new Uint8Array(await readFile(file));
  return { file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

test.describe("paint review frames", () => {
  test("captures three 1:1 poses of the crossing in both styles on the hardware renderer", async ({
    page,
  }) => {
    await rm(FRAME_DIR, { recursive: true, force: true });
    await mkdir(FRAME_DIR, { recursive: true });

    const inputs = [];
    for (const file of SCENE_INPUTS) inputs.push(await digestOf(file));

    const frames: Record<string, unknown>[] = [];
    let renderer = "";
    let placements: unknown = null;
    let hardware: unknown = null;

    for (const style of STYLES) {
      // The query parameter is the input path a person has. Nothing here sets a
      // style or a time on the app.
      await page.goto(`/?time=noon&seed=9137&style=${style}`, { timeout: 60_000 });

      const driver = new OrbitDriver(page);
      await driver.waitForFirstFrame();

      const status = await driver.readStatus();
      if (typeof status.glRenderer !== "string" || status.glRenderer.trim() === "" || HARDWARE_RENDERER_DENYLIST.test(status.glRenderer)) {
        throw new Error(
          `The paint-review lane requires the hardware renderer, and Chromium reports ` +
            `"${status.glRenderer}". These crops are bound to this frame set by digest, so a ` +
            "software fallback would move the evidence silently; there is deliberately no " +
            "fallback path here.",
        );
      }
      renderer = status.glRenderer;

      for (const pose of POSES) {
        await driver.zoomTo(pose.distance);
        await driver.orbitTo(pose.azimuth, pose.polar);
        const tiles = await driver.waitForTilesIdle();
        const observed = await page.evaluate(() => ({
          camera: window.__mapsHarness!.camera(),
          status: window.__mapsHarness!.status(),
          lighting: window.__mapsHarness!.lighting(),
          post: window.__mapsHarness!.post(),
          style: window.__mapsHarness!.style(),
          paint: window.__mapsHarness!.paint(),
          paintSeams: window.__mapsHarness!.paintSeams(),
          hardware: window.__mapsHarness!.hardware(),
        }));

        expect(observed.status.drawingBufferWidth, "the drawing buffer is not the capture width").toBe(CAPTURE_WIDTH);
        expect(observed.status.drawingBufferHeight, "the drawing buffer is not the capture height").toBe(CAPTURE_HEIGHT);
        expect(observed.style.id).toBe(style);
        // The hour is not decoration: the reference imagery is a daytime
        // orthophoto, and paint judged at dusk is judged against the wrong light.
        expect(observed.lighting.preset).toBe("noon");

        const file = path.join(FRAME_DIR, `${style}-${pose.name}.png`);
        await page.screenshot({ path: file, animations: "disabled" });
        const bytes = new Uint8Array(await readFile(file));
        const decoded = decodePng(bytes);
        expect(decoded.width, `${path.basename(file)} is not the capture width`).toBe(CAPTURE_WIDTH);
        expect(decoded.height, `${path.basename(file)} is not the capture height`).toBe(CAPTURE_HEIGHT);

        const placed = observed.paint.filter((entry) => entry.status === "placed");
        const unplaced = observed.paint.filter((entry) => entry.status === "unplaced");

        frames.push({
          file: path.basename(file),
          style,
          pose: pose.name,
          requested: { azimuth: pose.azimuth, polar: pose.polar, distance: pose.distance },
          camera: observed.camera,
          tokyoClock: observed.lighting.tokyoClock,
          sunAzimuthDegrees: observed.lighting.sunAzimuthDegrees,
          sunElevationDegrees: observed.lighting.sunElevationDegrees,
          post: { active: observed.post.active, toneMapping: observed.post.toneMapping, taaAccumulating: observed.post.taaAccumulating, taaSamples: observed.post.taaSamples },
          drawingBuffer: { width: observed.status.drawingBufferWidth, height: observed.status.drawingBufferHeight },
          glRenderer: observed.status.glRenderer,
          tiles: { drawnTriangles: tiles.drawnTriangles, drawnMeshes: tiles.drawnMeshes, drawnBounds: tiles.drawnBounds, error: tiles.error, failed: tiles.failed },
          paintPlacements: {
            total: observed.paint.length,
            placed: placed.length,
            unplaced: unplaced.length,
            placedCrossing: placed.filter((entry) => entry.kind === "crossing").length,
            placedTactile: placed.filter((entry) => entry.kind === "tactile").length,
            unplacedReasons: [...new Set(unplaced.map((entry) => entry.reason))].sort(),
          },
          hardwarePlacements: {
            total: observed.hardware.length,
            placed: observed.hardware.filter((entry) => entry.status === "placed").length,
            unplaced: observed.hardware.filter((entry) => entry.status === "unplaced").length,
          },
          width: decoded.width,
          height: decoded.height,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });

        // The placement and hardware records are the same in both styles and at
        // every pose, so one copy is kept rather than six.
        placements ??= observed.paint;
        hardware ??= observed.hardware;
      }
    }

    expect(frames).toHaveLength(POSES.length * STYLES.length);

    await writeFile(path.join(PAINT_REVIEW_ROOT, "frames.json"), `${JSON.stringify({ capturedAt: new Date().toISOString(), glRenderer: renderer, viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT }, inputs, frames }, null, 2)}\n`, "utf8");
    await writeFile(path.join(PAINT_REVIEW_ROOT, "paint-placements.json"), `${JSON.stringify({ paint: placements, hardware }, null, 2)}\n`, "utf8");

    // eslint-disable-next-line no-console -- the list a reviewer reads.
    console.log(
      [
        "",
        `${frames.length} frames at 1:1 in ${FRAME_DIR}, renderer ${renderer}`,
        ...frames.map((frame) => `  ${String(frame.file).padEnd(26)} ${JSON.stringify(frame.camera)}`),
        "",
      ].join("\n"),
    );
  });
});
