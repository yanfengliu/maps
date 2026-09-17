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
 * **Both renderers run this one spec.** `MAPS_POST_CHAIN_ARM` selects the launch
 * args, the preview port and which renderer the run must report, and names the
 * trace file after the arm. Two specs would have differed by more than the
 * renderer, which is the one thing a comparison must not do. Both arms still
 * matter after 2026-09-17: the 44 appearance frames moved to the hardware
 * renderer, and this lane is where the post chain's behaviour on a software
 * rasteriser stays measured rather than remembered.
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

/**
 * Which renderer this run is about, set by `playwright.config.ts`.
 *
 * The same spec measures both, deliberately: the defect was a question about
 * frame counts, and a comparison between two specs would differ by more than the
 * renderer. The arm decides which renderer string is acceptable and which trace
 * file the numbers land in, so neither arm can overwrite or be mistaken for the
 * other.
 */
const ARM = process.env["MAPS_POST_CHAIN_ARM"] === "software" ? "software" : "hardware";
const EXPECTED_RENDERER = ARM === "software" ? /SwiftShader|llvmpipe|software/i : /NVIDIA|GeForce|RTX/i;

/** The view movement above which a frame is a hand on the canvas and not a glide. */
const INPUT_METRES = 0.05;

/** How long the witness may take to arrive after the shutter, if it is not there yet. */
const WITNESS_FRAMES = 240;
const WITNESS_MS = 8 * 60_000;

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

  // The renderer is named, and named as the one this arm is about, so a
  // softwarised hardware run and a hardware software run both fail by name
  // instead of reporting the other renderer's numbers.
  expect(
    boot.glRenderer,
    `the ${ARM} arm requires ${ARM === "software" ? "a software rasteriser" : "the NVIDIA GPU"}, ` +
      `and Chromium reports "${boot.glRenderer}".`,
  ).toMatch(EXPECTED_RENDERER);

  await startRecorder(page);

  // The gate's own pose sequence, in the gate's own order.
  await driver.zoomTo(CROSSING.distance);
  await driver.orbitTo(HERO_AZIMUTH, CROSSING.polar);
  await driver.waitForTilesIdle();

  // The reading `hero.spec.ts` takes, at the same point in its sequence.
  const atShutter = await observe(page);
  const framesAtShutter = atShutter.status.frameCount;

  // Whether the glide had already ended at the shutter is the whole question, so
  // the wait is for the app's own stillness witness rather than for a timer. On
  // the hardware arm it is already there and this costs one observation; on the
  // software arm it is bounded in frames and in wall clock, because a frame there
  // costs seconds and a wait measured in seconds would be measuring the
  // renderer's speed instead of the camera's.
  let after = { frameCount: framesAtShutter, taaAccumulating: atShutter.post.taaAccumulating, taaSamples: atShutter.post.taaSamples };
  if (!atShutter.post.taaAccumulating) {
    const waitStartedAt = Date.now();
    for (;;) {
      await page.waitForTimeout(500);
      after = await page.evaluate(() => {
        const post = window.__mapsHarness!.post();
        return { frameCount: window.__mapsHarness!.status().frameCount, taaAccumulating: post.taaAccumulating, taaSamples: post.taaSamples };
      });
      if (after.taaAccumulating) break;
      if (after.frameCount - framesAtShutter >= WITNESS_FRAMES) break;
      if (Date.now() - waitStartedAt >= WITNESS_MS) break;
    }
  }

  const rows = await collectRecorder(page);

  // The last frame a hand moved the camera, told apart from the glide by size:
  // a gesture moves centimetres to metres in one frame, and the damped tail
  // decays below the bar within a few frames of the gesture ending.
  let lastInputFrame = rows.length > 0 ? rows[0]!.f : framesAtShutter;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const row = rows[index]!;
    const moved =
      Math.hypot(row.px - previous.px, row.py - previous.py, row.pz - previous.pz) +
      Math.hypot(row.tx - previous.tx, row.ty - previous.ty, row.tz - previous.tz) +
      Math.max(row.d, previous.d) * (Math.abs(row.az - previous.az) + Math.abs(row.polar - previous.polar));
    if (moved > INPUT_METRES) lastInputFrame = row.f;
  }

  const firstRestAfterShutter = rows.find((row) => row.acc && row.f >= framesAtShutter)?.f ?? null;

  writeFileSync(
    path.join(OUT, `still-trace-${ARM}.json`),
    JSON.stringify(
      {
        arm: ARM,
        url: DUSK_URL,
        glRenderer: boot.glRenderer,
        drawingBuffer: [boot.drawingBufferWidth, boot.drawingBufferHeight],
        lastInputFrame,
        shutterFrame: framesAtShutter,
        firstRestAfterShutter,
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
        afterWitnessWait: after,
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
  const framesFromLastInput = rows.length === 0 ? null : rows[rows.length - 1]!.f - lastInputFrame;

  console.log(
    `${ARM} arm on ${boot.glRenderer}\n` +
      `  last input frame      ${lastInputFrame}\n` +
      `  shutter frame         ${framesAtShutter}\n` +
      `  rest after shutter    ${firstRestAfterShutter === null ? `never within ${after.frameCount - framesAtShutter} frames` : `frame ${firstRestAfterShutter}`}\n` +
      `  at the shutter        taaAccumulating ${atShutter.post.taaAccumulating}, taaSamples ${atShutter.post.taaSamples}\n` +
      `  after the wait        frame ${after.frameCount}, taaAccumulating ${after.taaAccumulating}, taaSamples ${after.taaSamples}\n` +
      `  trace                 ${rows.length} rows, ${accumulating.length} accumulating, first ${firstAccumulating === undefined ? "never" : `frame ${firstAccumulating.f}`}, peak samples ${peakSamples}, ` +
      `${framesFromLastInput} frames from the last input to the end of the trace`,
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
