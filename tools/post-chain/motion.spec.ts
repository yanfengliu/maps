/**
 * Does the dusk post chain hold still?
 *
 * The plan's criterion is that the dusk preset renders with ACES tone mapping,
 * bloom carrying the neon, SSAO and TAA "and holds still — no flicker or crawl
 * over a moving sequence". `tools/post-chain/probe.spec.ts` answers the first
 * half: whether the accumulator is engaged in the frames the gate captures. This
 * spec answers the second, and it exists because a temporal accumulator that is
 * switched on is a new way for a picture to be wrong rather than proof that it
 * is right.
 *
 * Three sequences, each captured at the artifact's own 1280x720 and analysed
 * from the PNG bytes rather than from the app's opinion of them:
 *
 * 1. **At rest, converged.** Two frames at the settled pose with the accumulator
 *    at its 32-sample cap, half a second apart. A held camera with a converged
 *    accumulator must produce the same picture twice; anything else is flicker.
 * 2. **Slow motion.** Fifteen small pointer drags, one native frame each, with
 *    the accumulator's state recorded beside every frame. TAA must be off while
 *    the picture moves — accumulating a moving camera is what smears — and the
 *    frame-to-frame difference must track the motion rather than spike.
 * 3. **The stop.** The glide ends when it can no longer move the picture
 *    (`src/render/controls-rest.ts`), so the frames around that moment are where
 *    a discontinuity would show. Captured every ~100 ms across the transition
 *    and across the 32 frames of accumulation that follow it.
 *
 * Ghosting is the regression this is looking for by name: the crowd and the
 * signage are the two things the criterion calls out. This lane runs with no
 * population, so the crowd is out of its reach and the spec says so rather than
 * implying coverage it does not have; the signage is in every frame.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type {} from "../../src/harness/bridge.js";
import { OrbitDriver } from "../visual/orbit.js";
import { decodePng } from "../visual/png.js";
import { HERO_AZIMUTH, HERO_POSES } from "../visual/shots.js";
import { accumulatingWhileMoving, collectRecorder, onePerFrame, startRecorder } from "./recorder.js";

const HERE = import.meta.dirname;
const OUT = path.resolve(HERE, "..", "..", "artifacts", "post-chain", "motion");

const DUSK_URL = "/?time=dusk&seed=9137&style=satellite";
const CROSSING = HERO_POSES.find((pose) => pose.name === "crossing")!;

/** The circle the pointer walks on, in CSS pixels, and how far each step goes. */
const DRAG_CENTRE = { x: 640, y: 360 };
const DRAG_RADIUS = 26;

interface Captured {
  file: string;
  sha256: string;
  taaAccumulating: boolean;
  taaSamples: number;
  frameCount: number;
  camera: { position: { x: number; y: number; z: number }; azimuth: number; polar: number; distance: number };
}

async function shoot(page: Page, name: string): Promise<Captured> {
  const file = path.join(OUT, `${name}.png`);
  // Native size, no scaling and no animation suppression of the scene: the
  // screenshot is the artifact a person opens.
  await page.screenshot({ path: file, animations: "disabled" });
  const bytes = readFileSync(file);
  const observed = await page.evaluate(() => {
    const harness = window.__mapsHarness!;
    const post = harness.post();
    return {
      taaAccumulating: post.taaAccumulating,
      taaSamples: post.taaSamples,
      frameCount: harness.status().frameCount,
      camera: harness.camera(),
    };
  });
  return { file: path.basename(file), sha256: createHash("sha256").update(bytes).digest("hex"), ...observed };
}

/** The mean, p99 and worst absolute per-channel difference between two frames. */
function frameDifference(a: Captured, b: Captured) {
  const left = decodePng(new Uint8Array(readFileSync(path.join(OUT, a.file))));
  const right = decodePng(new Uint8Array(readFileSync(path.join(OUT, b.file))));
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(`${a.file} is ${left.width}x${left.height} and ${b.file} is ${right.width}x${right.height}; frames at different sizes cannot be compared pixel for pixel.`);
  }
  const differences = new Uint8Array(left.width * left.height);
  let total = 0;
  let worst = 0;
  for (let pixel = 0; pixel < differences.length; pixel += 1) {
    const at = pixel * 4;
    const delta = Math.max(
      Math.abs(left.rgba[at]! - right.rgba[at]!),
      Math.abs(left.rgba[at + 1]! - right.rgba[at + 1]!),
      Math.abs(left.rgba[at + 2]! - right.rgba[at + 2]!),
    );
    differences[pixel] = Math.min(delta, 255);
    total += delta;
    if (delta > worst) worst = delta;
  }
  const sorted = Array.from(differences).sort((x, y) => x - y);
  return {
    from: a.file,
    to: b.file,
    width: left.width,
    height: left.height,
    identical: a.sha256 === b.sha256,
    meanAbs: Number((total / differences.length).toFixed(4)),
    p99Abs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))],
    maxAbs: worst,
    changedOver8: Number((differences.reduce((count, value) => count + (value > 8 ? 1 : 0), 0) / differences.length).toFixed(6)),
  };
}

test("holds still: converged at rest, and no step across the stop", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const driver = new OrbitDriver(page);

  await page.goto(DUSK_URL, { timeout: 60_000 });
  const boot = await driver.waitForFirstFrame(120_000);
  await driver.waitForTilesIdle();
  expect(boot.glRenderer, `this lane needs the NVIDIA GPU, not ${boot.glRenderer}`).toMatch(/NVIDIA|GeForce|RTX/i);

  await driver.zoomTo(CROSSING.distance);
  await driver.orbitTo(HERO_AZIMUTH, CROSSING.polar);
  await driver.waitForTilesIdle();

  // 1. At rest, converged. Waiting for the cap rather than for a frame count:
  // the claim is about the accumulator being at 32, not about a timer.
  await page.waitForFunction(
    () => {
      const post = window.__mapsHarness?.post();
      return post !== undefined && post.taaAccumulating && post.taaSamples >= 32;
    },
    undefined,
    { timeout: 30_000 },
  );
  const restA = await shoot(page, "rest-a");
  await page.waitForTimeout(500);
  const restB = await shoot(page, "rest-b");

  // 2. Slow motion. One small drag, one native frame, fifteen times. Small
  // enough that the picture crawls rather than sweeps, which is the regime the
  // criterion names. The recorder runs across this and the stop below, so the
  // accumulator's state is paired with the camera motion that preceded it
  // rather than with whatever the pose happened to be when the shutter opened.
  await startRecorder(page);

  const motion: Captured[] = [];
  for (let step = 0; step < 15; step += 1) {
    const angle = (step / 15) * Math.PI * 0.5;
    const to = {
      x: DRAG_CENTRE.x + Math.cos(angle) * DRAG_RADIUS,
      y: DRAG_CENTRE.y + Math.sin(angle) * DRAG_RADIUS,
    };
    await page.mouse.move(DRAG_CENTRE.x, DRAG_CENTRE.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    motion.push(await shoot(page, `motion-${String(step).padStart(2, "0")}`));
  }

  // 3. The stop, watched. The last drag's glide is left to finish on its own
  // while a frame is taken every ~100 ms, so the transition from "accumulate
  // off" to "accumulate on" is inside the sequence rather than between two of
  // its frames.
  const stop: Captured[] = [];
  for (let index = 0; index < 24; index += 1) {
    stop.push(await shoot(page, `stop-${String(index).padStart(2, "0")}`));
    await page.waitForTimeout(100);
  }

  const rows = onePerFrame(await collectRecorder(page));

  const difference = (frames: Captured[]) =>
    frames.slice(1).map((frame, index) => frameDifference(frames[index]!, frame));

  // A thousandth of a pixel at the pivot, which is the bar the anti-smear check
  // uses. Derived from the capture, not from a constant that lives in the code
  // under test.
  const pixelAtPivotM = CROSSING.distance * ((2 * Math.tan((55 * Math.PI) / 360)) / 720);
  const smeared = accumulatingWhileMoving(rows, pixelAtPivotM);

  const report = {
    url: DUSK_URL,
    glRenderer: boot.glRenderer,
    atRest: { a: restA, b: restB, difference: frameDifference(restA, restB) },
    motion: { frames: motion, differences: difference(motion) },
    stop: { frames: stop, differences: difference(stop) },
    recorder: { pixelAtPivotM, frames: rows.length, accumulatingWhileMoving: smeared },
    rows,
  };
  writeFileSync(path.join(OUT, "motion.json"), JSON.stringify(report, null, 2));

  const worstDuringMotion = Math.max(0, ...report.motion.differences.map((entry) => entry.meanAbs));
  const worstDuringStop = Math.max(0, ...report.stop.differences.map((entry) => entry.meanAbs));
  console.log(
    `at rest: a == b ${report.atRest.difference.identical}, meanAbs ${report.atRest.difference.meanAbs}, ` +
      `maxAbs ${report.atRest.difference.maxAbs}\n` +
      `motion: ${motion.length} frames, steps meanAbs ${report.motion.differences.map((entry) => entry.meanAbs).join("/")}\n` +
      `stop: samples ${stop.map((frame) => frame.taaSamples).join("/")}, worst meanAbs between frames ${worstDuringStop}, ` +
      `worst during motion ${worstDuringMotion}\n` +
      `recorder: ${rows.length} frames, accumulating while the camera was moving: ${smeared.length}` +
      `${smeared.length === 0 ? "" : ` (first at frame ${smeared[0]!.frame}, ${smeared[0]!.samples} samples, ${smeared[0]!.positionM.toExponential(2)} m)`}`,
  );

  // The three claims the criterion makes, asserted rather than only reported.
  expect(
    report.atRest.difference.identical,
    "a held camera at the accumulator's cap drew two different pictures, which is flicker by definition",
  ).toBe(true);
  expect(
    smeared,
    `${smeared.length} frames accumulated samples from more than one camera pose, which is a temporal ` +
      "smear: the accumulator must be off whenever the picture moves.",
  ).toEqual([]);
  expect(
    worstDuringStop,
    `consecutive frames across the stop differ by a mean of ${worstDuringStop} per channel, which is a ` +
      "visible step at the moment the glide ends rather than a hold.",
  ).toBeLessThan(2);
});
