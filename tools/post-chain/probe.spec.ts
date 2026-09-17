/**
 * Why the dusk post chain never accumulated, measured rather than assumed.
 *
 * The gate's `hero.spec.ts` reads `post.taaAccumulating` / `post.taaSamples`
 * immediately after `waitForTilesIdle`, and `artifacts/gate-timing/REPORT.md`
 * found `false` / `0` at that moment on all eight hero frames and on both
 * renderers. This spec reproduces that reading on the hardware renderer and then
 * keeps watching, frame by frame, so the candidate explanations can be told
 * apart by measurement rather than by argument:
 *
 *   1. the stillness bar leaves the damped controls micro-moving, so the
 *      predicate is never satisfied inside the harness's window;
 *   2. something invalidates the accumulator every frame by construction;
 *   3. the harness reads a stale or reset counter.
 *
 * (2) and (3) both predict a nonzero `taaSamples` somewhere in a long trace, and
 * (2) predicts one that never climbs. (1) predicts zero until the camera stops
 * and then a climb to the 32-sample cap. The trace is written under
 * `artifacts/post-chain/probe/` so the reading can be checked against numbers
 * rather than against a memory of them.
 *
 * Everything here reads `window.__mapsHarness`, which is frozen and has no
 * setter. The camera moves only through synthesised pointer and wheel input on
 * the canvas — the same path a person's hand takes.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type {} from "../../src/harness/bridge.js";
import { OrbitDriver } from "../visual/orbit.js";
import { HERO_AZIMUTH, HERO_POSES } from "../visual/shots.js";
import { collectRecorder, startRecorder } from "./recorder.js";

const HERE = import.meta.dirname;
const OUT = path.resolve(HERE, "..", "..", "artifacts", "post-chain", "probe");

/** The dusk hero URL, character for character the one `hero.spec.ts` opens. */
const DUSK_URL = "/?time=dusk&seed=9137&style=satellite";

const CROSSING = HERO_POSES.find((pose) => pose.name === "crossing")!;

/** One reading of everything the harness can see, from one browser task. */
async function observe(page: Page) {
  return page.evaluate(() => {
    const harness = window.__mapsHarness!;
    return {
      post: harness.post(),
      status: harness.status(),
      camera: harness.camera(),
      tiles: harness.tiles(),
    };
  });
}

test("the accumulator at the hero shutter, and what the camera was doing there", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const driver = new OrbitDriver(page);

  await page.goto(DUSK_URL, { timeout: 60_000 });
  const boot = await driver.waitForFirstFrame(120_000);
  await driver.waitForTilesIdle();

  // The renderer is named here so a softwarised run cannot be read as a
  // hardware measurement, the same refusal the hardware lane makes.
  expect(boot.glRenderer, `this lane needs the NVIDIA GPU, not ${boot.glRenderer}`).toMatch(
    /NVIDIA|GeForce|RTX/i,
  );

  await startRecorder(page);

  // The gate's own pose sequence, in the gate's own order.
  await driver.zoomTo(CROSSING.distance);
  await driver.orbitTo(HERO_AZIMUTH, CROSSING.polar);
  await driver.waitForTilesIdle();

  // The reading `hero.spec.ts` takes, at the same point in its sequence.
  const atShutter = await observe(page);
  const framesAtShutter = atShutter.status.frameCount;

  // Now stop touching it and watch. Thirty seconds is about 1,800 frames on
  // this renderer: 56x the 32 frames the accumulator needs once it starts.
  await page.waitForTimeout(30_000);

  const rows = await collectRecorder(page);
  const quiet = await observe(page);

  writeFileSync(
    path.join(OUT, "still-trace.json"),
    JSON.stringify(
      {
        url: DUSK_URL,
        glRenderer: boot.glRenderer,
        drawingBuffer: [boot.drawingBufferWidth, boot.drawingBufferHeight],
        atShutter: {
          frameCount: framesAtShutter,
          taaAccumulating: atShutter.post.taaAccumulating,
          taaSamples: atShutter.post.taaSamples,
          tiles: {
            idle: atShutter.tiles.idle,
            pending: atShutter.tiles.pending,
            revision: atShutter.tiles.revision,
          },
        },
        afterThirtySeconds: {
          frameCount: quiet.status.frameCount,
          taaAccumulating: quiet.post.taaAccumulating,
          taaSamples: quiet.post.taaSamples,
        },
        rows,
      },
      null,
      2,
    ),
  );

  // A one-line summary in the report, so the run says what it found.
  const accumulating = rows.filter((row) => row.acc);
  const firstAccumulating = accumulating[0];
  const peakSamples = rows.reduce((best, row) => Math.max(best, row.n), 0);

  console.log(
    `at the shutter: frame ${framesAtShutter}, taaAccumulating ${atShutter.post.taaAccumulating}, ` +
      `taaSamples ${atShutter.post.taaSamples}\n` +
      `trace: ${rows.length} rows, ${accumulating.length} accumulating, first accumulating ` +
      `${firstAccumulating === undefined ? "never" : `at frame ${firstAccumulating.f}, ${firstAccumulating.f - framesAtShutter} frames after the shutter`}, ` +
      `peak samples ${peakSamples}, frames drawn in the 30 s ${quiet.status.frameCount - framesAtShutter}`,
  );

  // The claim the criterion rests on, asserted at the shutter rather than
  // reported: the frames the gate captures carry an engaged accumulator.
  expect(
    atShutter.post.active,
    `the post chain fell back to a direct render, so these frames have no bloom, no ambient occlusion and no TAA: ${String(atShutter.post.error)}`,
  ).toBe(true);
  expect(atShutter.post.passes).toEqual(["TAARenderPass", "GTAOPass", "UnrealBloomPass", "OutputPass"]);
  expect(
    atShutter.post.taaAccumulating,
    `the accumulator was not running at the shutter, at frame ${framesAtShutter}, with the tileset ` +
      `idle at revision ${atShutter.tiles.revision} — so this frame was drawn as a single unjittered ` +
      "sample and the temporal anti-aliasing item 20 asks for is absent from the pixels.",
  ).toBe(true);
  expect(
    atShutter.post.taaSamples,
    `the accumulator had ${atShutter.post.taaSamples} samples at the shutter; a frame drawn before the ` +
      "accumulation has converged is not the frame the criterion describes.",
  ).toBeGreaterThanOrEqual(32);
});
