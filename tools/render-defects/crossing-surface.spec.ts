/**
 * What is covering the northern half of the crossing.
 *
 * The defect: sixteen frames of the crossing sequence carry a stationary black
 * surface over the northern half of the crossing, in the deliverable's signature
 * shot, and nobody has attributed it. It is stationary while walkers move, so it
 * is neither a pedestrian nor a vehicle, and that is as far as the capture lane
 * that found it could go.
 *
 * This spec is the instrument that answers it, and it answers it three ways in
 * one run, because each of the three can be wrong on its own:
 *
 * 1. **The pixels.** A sequence of frames at one pose, with the largest
 *    four-connected near-black region measured on each — where it is, how big,
 *    and whether it moved.
 * 2. **The buildings' own raycast.** `facadeSamples` on the frozen bridge fires
 *    the app's own raycaster through a grid of screen rays and reports the tile,
 *    the world point, the normal and the atlas texel behind each. A panel that
 *    the building tileset does not occupy is not a building.
 * 3. **The scene's own report.** `lighting().authoredBoards` says how many
 *    hand-placed signage boards the scene decided to show, and the frame says
 *    where they are.
 *
 * The camera moves only through `OrbitDriver`'s synthesised pointer and wheel
 * input, and the only reads are the frozen bridge. Nothing here writes to the
 * page: an ablation belongs in the tree, not in the harness.
 *
 * Run: `npm run build && npx playwright test --config playwright.render-state.config.ts -g "crossing surface"`
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import type { CameraSnapshot, RenderStatus } from "../../src/harness/bridge.js";
import type { FacadeSample } from "../../src/scene/buildings.js";
import type { PopulationStatus } from "../../src/agents/population/status.js";
import { OrbitDriver } from "../visual/orbit.js";
import { CAPTURE_VIEWPORT } from "../visual/shots.js";
import { darkFraction, largestDarkRegion, readFrame } from "./frame-regions.js";
import { solvePose } from "../populated/terrain.js";

/**
 * The pose this capture photographs the crossing from.
 *
 * It is the crossing-crowd lane's own recorded pose, read off the manifest of the
 * frames that carry the defect — azimuth 3pi/4, 70 m out, the camera 38.07 m
 * above sea level, target at the crossing — so the frames here are the same view
 * as the frames that recorded it rather than a new one that happens to show
 * something similar.
 */
const POSE = Object.freeze({
  target: { x: 0, z: 0 },
  azimuth: (3 * Math.PI) / 4,
  distance: 70,
  /** Metres above the ground at the target: the recorded camera height, 38.07 - 15.2. */
  standHeightM: 22.87,
});

/**
 * The screen box the defect was recorded in, in the 1280x720 capture.
 *
 * Measured on `crossing-04.png` (sha256 844c5a4c...) from the crossing-crowd
 * lane: the largest near-black region there is x 559-725, y 90-348. The box here
 * is that region with a margin, and it is a fixed screen box rather than a
 * searched one so an ablation that removes the surface reports a fraction that
 * falls, instead of reporting a different region found somewhere else.
 */
const SUSPECT_BOX = Object.freeze({ minX: 540, minY: 70, maxX: 745, maxY: 370 });

/** Rays the app's own raycaster is fired down, as NDC. The suspect box, at 5x5. */
const RAY_GRID = 5;

const ARM = process.env["MAPS_RENDER_STATE_ARM"] ?? "unarmed";
const QUERY = process.env["MAPS_RENDER_STATE_QUERY"] ?? "?agents=1&seed=9137&style=satellite&time=noon";
const FRAMES = Number(process.env["MAPS_RENDER_STATE_FRAMES"] ?? 3);
const INTERVAL_TICKS = Number(process.env["MAPS_RENDER_STATE_INTERVAL"] ?? 120);
const ROOT = path.resolve("artifacts/render-state", ARM);

interface Observation {
  frameCount: number;
  camera: CameraSnapshot;
  population: PopulationStatus;
  authoredBoards: number;
  signageIntensity: number;
}

test.describe("crossing surface", () => {
  test.setTimeout(30 * 60_000);

  test("attributes the black surface over the crossing", async ({ page }) => {
    await mkdir(path.join(ROOT, "frames"), { recursive: true });
    const errors: string[] = [];
    const logs: { type: string; text: string }[] = [];
    page.on("console", (message) => {
      logs.push({ type: message.type(), text: message.text() });
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));

    const observe = async (): Promise<Observation> => {
      const value = await page.evaluate(() => {
        const harness = window.__mapsHarness;
        if (!harness) return null;
        const lighting = harness.lighting();
        return {
          frameCount: harness.status().frameCount,
          camera: harness.camera(),
          population: harness.population(),
          authoredBoards: lighting.authoredBoards,
          signageIntensity: lighting.signageIntensity,
        };
      });
      if (value === null) throw new Error("The bridge vanished from window mid-run; the page was replaced.");
      return value as Observation;
    };

    await page.goto(`/${QUERY}`, { timeout: 90_000 });
    const orbit = new OrbitDriver(page);
    const status: RenderStatus = await orbit.waitForFirstFrame(180_000);
    console.log(`renderer: ${status.glRenderer}`);

    const before = await orbit.readCamera();
    const solution = solvePose({ ...POSE, targetY: before.target.y });
    await orbit.zoomTo(POSE.distance);
    await orbit.orbitTo(POSE.azimuth, solution.polar);
    await orbit.waitForTilesIdle();
    await orbit.settle();
    const aimed = await observe();
    console.log(
      `aimed: camera (${aimed.camera.position.x.toFixed(2)}, ${aimed.camera.position.y.toFixed(2)}, ` +
        `${aimed.camera.position.z.toFixed(2)}) at ${aimed.camera.distance.toFixed(2)} m, ` +
        `polar ${((aimed.camera.polar * 180) / Math.PI).toFixed(2)} deg, tick ${aimed.population.ticks}`,
    );

    // The buildings' own raycaster, through a grid over the suspect box and a
    // ring of control rays outside it. A ray that hits nothing is not recorded by
    // `facadeSamples`, so the grid is reported as hits with their own NDC and the
    // count of rays that came back empty is part of the record.
    const grid: { x: number; y: number }[] = [];
    for (let row = 0; row < RAY_GRID; row += 1) {
      for (let column = 0; column < RAY_GRID; column += 1) {
        const px = SUSPECT_BOX.minX + ((SUSPECT_BOX.maxX - SUSPECT_BOX.minX) * column) / (RAY_GRID - 1);
        const py = SUSPECT_BOX.minY + ((SUSPECT_BOX.maxY - SUSPECT_BOX.minY) * row) / (RAY_GRID - 1);
        grid.push({ x: (px / CAPTURE_VIEWPORT.width) * 2 - 1, y: 1 - (py / CAPTURE_VIEWPORT.height) * 2 });
      }
    }
    // Four control rays well outside the box, where the frame shows road, a
    // pavement and a building: if those come back empty too the raycaster is not
    // reaching the tiles and the empty suspect grid says nothing.
    for (const [px, py] of [[120, 640], [1180, 640], [60, 120], [1220, 120]] as const) {
      grid.push({ x: (px / CAPTURE_VIEWPORT.width) * 2 - 1, y: 1 - (py / CAPTURE_VIEWPORT.height) * 2 });
    }
    const samples: FacadeSample[] = await page.evaluate(
      (rays) => (window.__mapsHarness?.facadeSamples(rays) ?? []) as FacadeSample[],
      grid,
    );
    const gridBox = { minX: SUSPECT_BOX.minX / CAPTURE_VIEWPORT.width, minY: SUSPECT_BOX.minY / CAPTURE_VIEWPORT.height, maxX: SUSPECT_BOX.maxX / CAPTURE_VIEWPORT.width, maxY: SUSPECT_BOX.maxY / CAPTURE_VIEWPORT.height };
    const inBox = samples.filter((sample) => {
      const px = ((sample.ndc.x + 1) / 2);
      const py = ((1 - sample.ndc.y) / 2);
      return px >= gridBox.minX && px <= gridBox.maxX && py >= gridBox.minY && py <= gridBox.maxY;
    });
    console.log(`buildings raycast: ${samples.length} of ${grid.length} rays hit a tile; ${inBox.length} of those are inside the suspect box`);
    for (const sample of inBox.slice(0, 4)) {
      console.log(
        `  ndc (${sample.ndc.x.toFixed(3)}, ${sample.ndc.y.toFixed(3)}) -> ${sample.tileUri} at ` +
          `(${sample.position.x.toFixed(1)}, ${sample.position.y.toFixed(1)}, ${sample.position.z.toFixed(1)}), ` +
          `rgba ${sample.rgba?.join(",") ?? "n/a"}`,
      );
    }

    const frames = [];
    const startedAtTick = (await observe()).population.ticks;
    for (let index = 0; index < FRAMES; index += 1) {
      const wanted = startedAtTick + index * INTERVAL_TICKS;
      let observation = await observe();
      while (observation.population.ticks < wanted) {
        await page.waitForTimeout(30);
        observation = await observe();
      }
      const file = path.join(ROOT, "frames", `surface-${String(index).padStart(2, "0")}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      const bytes = new Uint8Array(await readFile(file));
      const png = readFrame(bytes);
      expect(png.width, `${file} is not at the capture width`).toBe(CAPTURE_VIEWPORT.width);
      expect(png.height, `${file} is not at the capture height`).toBe(CAPTURE_VIEWPORT.height);
      const region = largestDarkRegion(png);
      const after = await observe();
      frames.push({
        index,
        file: path.relative(ROOT, file).replaceAll("\\", "/"),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        ticks: observation.population.ticks,
        simulatedSeconds: observation.population.simulatedSeconds,
        camera: observation.camera,
        authoredBoards: observation.authoredBoards,
        drawnPedestrians: after.population.rendered.pedestrians,
        drawnNear: after.population.rendered.near,
        drawnMedium: after.population.rendered.medium,
        drawnFar: after.population.rendered.far,
        darkRegion: region,
        darkFractionInSuspectBox: darkFraction(png, SUSPECT_BOX),
      });
      console.log(
        `  surface-${String(index).padStart(2, "0")} at tick ${observation.population.ticks}: largest near-black region ` +
          `${region === null ? "none" : `${region.count} px x ${region.minX}-${region.maxX} y ${region.minY}-${region.maxY}`}, ` +
          `suspect box dark fraction ${frames.at(-1)!.darkFractionInSuspectBox.toFixed(4)}`,
      );
    }

    const distinct = new Set(frames.map((frame) => frame.sha256));
    await writeFile(path.join(ROOT, "surface.json"), `${JSON.stringify({
      arm: ARM,
      capturedAt: new Date().toISOString(),
      query: QUERY,
      pose: { ...POSE, polar: solution.polar, reached: frames[0]!.camera },
      viewport: CAPTURE_VIEWPORT,
      suspectBox: SUSPECT_BOX,
      renderer: status.glRenderer,
      authoredBoards: frames[0]!.authoredBoards,
      raycast: { rays: grid.length, hits: samples.length, hitsInSuspectBox: inBox.length, samples: samples.slice(0, 40) },
      frames,
      framesDistinct: distinct.size,
      consoleErrors: errors,
      consoleLogs: logs,
    }, null, 2)}\n`, "utf8");

    expect(errors, `the page logged errors:\n${errors.join("\n")}`).toEqual([]);
    console.log(`${frames.length} frames, ${distinct.size} distinct digests, written to ${path.join(ROOT, "frames")}`);
  });
});
