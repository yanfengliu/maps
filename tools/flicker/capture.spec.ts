/**
 * harness: npm run visual:flicker.
 * Twelve adjacent native canvas frames after real pointer input, and again
 * after pointer plus wheel ascent. RAF copies share an exact frame counter,
 * camera and post observation. PNG encoding follows the burst, so its cost
 * cannot open a gap between captured frames. The app is never mutated.
 *
 * This iteration lane emits no certificate. It captures only #scene, without
 * DOM controls or attribution. It is agent-free, satellite dusk at the hero
 * crossing pose; twelve frames per path do not establish all-camera stability.
 * A rigid translation leaves rotation/parallax residuals in the fixed 0.005
 * provisional indicator. A failing residual is not silently tuned away.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { probeGpuIdentity } from "../visual/gpu-identity.js";
import { activeLane, laneDir, pixelLaneRefusal } from "../visual/lane.js";
import { decodePng, measureFrame } from "../visual/png.js";
import { CAPTURE_VIEWPORT, HERO_AZIMUTH, HERO_POSES } from "../visual/shots.js";
import { CRAWL_FRACTION_PER_FRAME, CHANGED_CHANNEL_DELTA, FLICKER_CADENCE, LOCAL_MEAN_DELTA,
  MINIMUM_FLICKER_FRAMES, MOTION_BAR_M, judgeFlicker, type FlickerContract, type FlickerFrame } from "./judge.js";
import { MotionPath, isMotionPattern, type MotionPattern } from "./motion.js";
import { captureAdjacentFrames, copyObservationRefusals, copyPixelRefusals } from "./burst.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const LANE = "flicker-iteration" as const;
const URL = "/?time=dusk&seed=9137&style=satellite";
const CROSSING = HERO_POSES.find((pose) => pose.name === "crossing")!;
const FRAMES = 12;
const CONTRACT: FlickerContract = {
  crawlFractionPerFrame: CRAWL_FRACTION_PER_FRAME, changedChannelDelta: CHANGED_CHANNEL_DELTA,
  localMeanDelta: LOCAL_MEAN_DELTA, ...FLICKER_CADENCE, minimumFrames: MINIMUM_FLICKER_FRAMES,
};
function patternsForThisRun(): MotionPattern[] {
  const names = (process.env["MAPS_FLICKER_PATTERNS"] ?? "orbit,ascent").split(",").map((name) => name.trim());
  if (names.length === 0 || names.some((name) => !isMotionPattern(name)) || new Set(names).size !== names.length) {
    throw new Error(`MAPS_FLICKER_PATTERNS=${JSON.stringify(names)} must name each requested pattern once: orbit,ascent.`);
  }
  return names as MotionPattern[];
}
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
function readBuildIdentity(): { path: string; sha256: string } {
  const assets = path.join(REPO_ROOT, "dist", "assets");
  const entries = readdirSync(assets).filter((name) => /^index-.*\.js$/.test(name));
  if (entries.length !== 1) throw new Error(`Flicker lane found ${entries.length} entry bundles in ${assets}; run npm run build first.`);
  return { path: `dist/assets/${entries[0]!}`, sha256: sha256(readFileSync(path.join(assets, entries[0]!))) };
}

test("adjacent moving dusk canvas frames through pointer orbit and wheel ascent", async ({ page }) => {
  expect(activeLane()).toBe(LANE);
  const outDir = path.join(REPO_ROOT, laneDir(LANE), "capture");
  mkdirSync(outDir, { recursive: true });
  const driver = new MotionPath(page, "orbit").orbit;
  await page.goto(URL, { timeout: 60_000 });
  const boot = await driver.waitForFirstFrame(120_000);
  expect(pixelLaneRefusal(boot.glRenderer, "flicker first frame")).toBeNull();
  await driver.waitForTilesIdle();
  const gpu = await probeGpuIdentity();
  const build = readBuildIdentity();
  const reports: unknown[] = [];
  const failures: string[] = [];
  for (const pattern of patternsForThisRun()) {
    const captureFailures: string[] = [];
    await driver.zoomTo(CROSSING.distance);
    await driver.orbitTo(HERO_AZIMUTH, CROSSING.polar);
    await driver.waitForTilesIdle();
    const { value: burst, input } = await new MotionPath(page, pattern).during(() => captureAdjacentFrames(page, FRAMES));
    const records = burst.frames.map((copy, index) => {
      const file = `${pattern}-${String(index).padStart(2, "0")}.png`;
      const bytes = Buffer.from(copy.pngBase64, "base64");
      writeFileSync(path.join(outDir, file), bytes);
      const image = decodePng(bytes);
      const stats = measureFrame(image);
      const refusal = [...copyObservationRefusals(copy), ...copyPixelRefusals(stats, CAPTURE_VIEWPORT)];
      for (const problem of refusal) captureFailures.push(`${pattern}/${file}: ${problem}`);
      const frame: FlickerFrame = { file, sha256: sha256(bytes), frameCountMid: copy.before.frameCount,
        shutterOpenedAtFrame: copy.before.frameCount, shutterClosedAtFrame: copy.after.frameCount,
        tick: null, pose: copy.before.camera, image };
      return { frame, metadata: { file, sha256: frame.sha256, before: copy.before, after: copy.after,
        copyMs: copy.copyMs, width: image.width, height: image.height,
        meanLuminance: stats.meanLuminance, luminanceSpread: stats.luminanceSpread, distinctColours: stats.distinctColours, refusal } };
    });
    const report = judgeFlicker(records.map((record) => record.frame), CONTRACT);
    for (const problem of report.failures) failures.push(`${pattern}: ${problem}`);
    if (records.length !== FRAMES) {
      captureFailures.push(`${pattern}: captured ${records.length}/${FRAMES} requested frames; repeat the complete burst before judging it`);
    }
    if (report.pairs_.some((pair) => pair.cameraTravelM <= MOTION_BAR_M && pair.cameraRotationRad <= MOTION_BAR_M)) {
      captureFailures.push(`${pattern}: at least one captured pair did not move above the motion floor; shorten the burst or sustain input through real controls`);
    }
    const first = burst.frames[0]!.before.camera;
    const last = burst.frames.at(-1)!.after.camera;
    if (pattern === "ascent" && (input.wheelEvents < 1 || last.distance <= first.distance + MOTION_BAR_M)) {
      captureFailures.push(`ascent did not increase distance inside its captured sequence (${first.distance} -> ${last.distance}, wheel events ${input.wheelEvents}); exercise the wheel input while capturing`);
    }
    failures.push(...captureFailures);
    // These refusals already occur in report.failures above. Add their separate
    // channel to capture validity without duplicating the command's failures.
    // Classification happens at the predicate, never by matching error wording.
    captureFailures.push(...report.captureFailures.map((problem) => `${pattern}: ${problem}`));
    const manifest = { sceneVerdict: report.sceneVerdict, captureValid: captureFailures.length === 0 && report.cadence.withinBound === FRAMES - 1, captureFailures, lane: LANE, certifiable: false, capture: "adjacent-canvas-raf", pattern, url: URL,
      glRenderer: boot.glRenderer, gpu, build, viewport: CAPTURE_VIEWPORT, contract: CONTRACT,
      requestedFrames: FRAMES, width: burst.width, height: burst.height,
      preserveDrawingBuffer: burst.preserveDrawingBuffer, encodeMs: burst.encodeMs,
      input, frames: records.map((record) => record.metadata), report };
    writeFileSync(path.join(outDir, `manifest-${pattern}.json`), JSON.stringify(manifest, null, 2) + "\n");
    reports.push(manifest);
    console.log(`${pattern}: ${report.frames} frames, counts ${burst.frames.map((frame) => frame.before.frameCount).join(",")}; worst residual ${Math.max(...report.pairs_.map((pair) => pair.unexplainedFraction))}; ${report.failures.length} judge failures`);
  }
  if (JSON.stringify(readBuildIdentity()) !== JSON.stringify(build)) failures.push("The entry bundle changed during capture; freeze the build and repeat.");
  writeFileSync(path.join(outDir, "flicker-report.json"), JSON.stringify({ lane: LANE, gpu, build, failures, runs: reports }, null, 2) + "\n");
  expect(failures, failures.join("\n")).toEqual([]);
});
