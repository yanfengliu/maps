/**
 * Captures consecutive rendered frames of a camera that never stops moving.
 *
 * This is the one instrument the deliverable's dusk criterion has been missing.
 * The criterion asks the preset to hold still - "no flicker or crawl over a
 * moving sequence" - and its first half is answered elsewhere: `src/app.ts` feeds
 * `cameraStill` into `post.setStill`, so the temporal accumulator cannot be
 * engaged while the camera moves, in any run. The second half is about what
 * changes *between* two frames, and until this spec existed no lane had captured
 * two consecutive rendered frames of a moving camera at all. Every other capture
 * in this repository deliberately does the opposite: `OrbitDriver.settle` waits
 * for the camera to stop before the shutter opens, because a frame taken
 * mid-glide is not reproducible.
 *
 * So this spec is small and its shape is the point:
 *
 * 1. It drives the canonical dusk pose - street level on the crossing, azimuth
 *    45 degrees, `?time=dusk` - with the frozen `HERO_POSES`/`HERO_AZIMUTH` the
 *    certified frames use, so its opening frame is the frame a reviewer already
 *    knows.
 * 2. It then walks a continuous pointer path and takes a still every time round
 *    the loop, *without settling*, so the camera is always moving when the
 *    shutter opens.
 * 3. It records, per frame, the render counter on both sides of the shutter, the
 *    camera pose on both sides of it and the midpoint between them, the
 *    simulation step, and the PNG's SHA-256, and it binds the judgement to those
 *    bytes.
 * 4. It hands the frames to `tools/flicker/judge.ts`, which decides - off the
 *    pixels, not off this spec's opinion of them - whether the sequence held
 *    still.
 *
 * **This lane is not evidence and produces no certificate.** It writes under its
 * own ignored directory (`artifacts/flicker/`, selected by `MAPS_VISUAL_LANE`
 * rather than by a flag this spec could forget), it names the renderer in every
 * record, and `tools/visual/verify-output.ts` refuses it by name. It does not run
 * `npm run build`; the manifest carries the SHA-256 of the build bytes the
 * preview server was serving, so a stale build is visible in the record instead
 * of being silently inherited.
 *
 * Port 4324 is its own. 4319 is the verdict gate's, 4321 the populated lane's,
 * 4322 the render-defects capture's, 4323 the flythrough's.
 *
 * ## What it cannot reach, stated rather than implied
 *
 * - **The cadence is the screenshot's, not the frame's.** A screenshot costs
 *   about 300-400 ms on this renderer, so 27 to 34 rendered frames are drawn while
 *   the shutter is open and the closest two stills this lane can take are roughly
 *   that far apart - measured 19.5 to 23 rendered frames between midpoints, against
 *   the criterion's `cadenceFrames: 2`. The frame counter is read on both sides of
 *   every shot and written into the record, so the cadence actually achieved is
 *   measured rather than claimed; `judgeFlicker` refuses a pair that spans more than
 *   `maxPairGapFrames` frames and reports the span it saw.
 * - **The recorded pose is the pose of the recorded pixels, as far as a
 *   screenshot can say.** One pose read before a 27-to-34-frame shutter describes a
 *   picture that no longer exists by the time the buffer is read, and a pair's
 *   motion divided by the idle gap between two shutters is not a rate. Each still
 *   therefore records the pose before the shutter, the pose after it, and the
 *   midpoint between them; the frame's `pose` is the midpoint and a pair's span is
 *   measured midpoint to midpoint, so the motion and the gap it is divided by
 *   describe the same window. The pre- and post-shutter poses are kept beside it, so
 *   what the shutter covered is visible in the record instead of being modelled.
 * - **It judges the non-accumulating path.** With the camera moving, TAA is off
 *   by construction, so what this lane sees is the post chain without its
 *   temporal accumulator. Whether the accumulator engages at all is
 *   `tools/post-chain/probe.spec.ts`'s question, and whether it smears is
 *   `tools/post-chain/motion.spec.ts`'s.
 * - **No population.** The scene runs with `?agents=` absent, like the appearance
 *   sweep, so a car crossing the frame cannot be counted as a crawl. A run with
 *   the population on would change what the number means.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type {} from "../../src/harness/bridge.js";
import { probeGpuIdentity } from "../visual/gpu-identity.js";
import { activeLane, laneDir, pixelLaneRefusal } from "../visual/lane.js";
import { decodePng } from "../visual/png.js";
import { CAPTURE_VIEWPORT, HERO_AZIMUTH, HERO_POSES } from "../visual/shots.js";
import {
  CRAWL_FRACTION_PER_FRAME,
  CHANGED_CHANNEL_DELTA,
  FLICKER_CADENCE,
  LOCAL_MEAN_DELTA,
  MINIMUM_FLICKER_FRAMES,
  judgeFlicker,
  type FlickerContract,
  type FlickerFrame,
  type FramePose,
} from "./judge.js";
import { MotionPath, isMotionPattern, type MotionPattern } from "./motion.js";
import { midpointPose } from "./shutter.js";
import { deriveStep } from "./step.js";

const HERE = import.meta.dirname;
const REPO_ROOT = path.resolve(HERE, "..", "..");
const LANE = "flicker-iteration" as const;
const URL = "/?time=dusk&seed=9137&style=satellite";
const CROSSING = HERO_POSES.find((pose) => pose.name === "crossing")!;

/** The frames a pattern is asked for, and the seconds of motion they span. */
const CAPTURE = Object.freeze({
  orbit: { seconds: 4, frames: 12 },
  ascent: { seconds: 5, frames: 12 },
});

/** The patterns this run walks, from `MAPS_FLICKER_PATTERNS`. */
function patternsForThisRun(): MotionPattern[] {
  const declared = process.env["MAPS_FLICKER_PATTERNS"] ?? "orbit";
  const names = declared.split(",").map((name) => name.trim()).filter((name) => name !== "");
  for (const name of names) {
    if (!isMotionPattern(name)) {
      throw new Error(
        `MAPS_FLICKER_PATTERNS names "${name}", which is not a motion pattern this lane walks. ` +
          `It takes a comma-separated list of: orbit, ascent. An unknown value is refused rather than ` +
          "defaulted, because a run that asked for one motion and silently got another would file its " +
          "frames under the wrong pattern's name.",
      );
    }
  }
  if (names.length === 0) {
    throw new Error("MAPS_FLICKER_PATTERNS is empty, so this run would capture no motion at all.");
  }
  return names as MotionPattern[];
}

const CONTRACT: FlickerContract = {
  crawlFractionPerFrame: CRAWL_FRACTION_PER_FRAME,
  changedChannelDelta: CHANGED_CHANNEL_DELTA,
  localMeanDelta: LOCAL_MEAN_DELTA,
  cadenceFrames: FLICKER_CADENCE.cadenceFrames,
  maxPairGapFrames: FLICKER_CADENCE.maxPairGapFrames,
  minimumFrames: MINIMUM_FLICKER_FRAMES,
};

interface CapturedFrame extends Omit<FlickerFrame, "image"> {
  /** The file's path relative to the lane root. */
  relative: string;
  /** Metres the camera stood from its target at the midpoint of the shutter. */
  distanceM: number;
}

interface Capture {
  name: string;
  file: string;
  relative: string;
  sha256: string;
  frameCountBefore: number;
  frameCountAfter: number;
  /** The frame count at the midpoint of the shutter, which is what the record's span uses. */
  frameCountMid: number;
  /** The step index derived from the page clock by `deriveStep` at the mid-shutter instant, or null. */
  tick: number | null;
  /** The camera at the midpoint of the shutter: the pose the recorded pixels are nearest. */
  pose: FramePose;
  /** The camera immediately before the shutter opened, kept so the span it covered is visible. */
  poseBefore: FramePose;
  /** The camera immediately after the shutter closed. */
  poseAfter: FramePose;
  distanceM: number;
}

test("holds still over a moving sequence: consecutive frames of a moving dusk camera", async ({ page }) => {
  expect(
    activeLane(),
    "this spec is the flicker lane's and must not run under another lane's name",
  ).toBe(LANE);

  const outDir = path.join(REPO_ROOT, laneDir(LANE), "capture");
  mkdirSync(outDir, { recursive: true });

  const motion = new MotionPath(page, { pattern: "orbit", seconds: 1, wheelTicksPerSecond: 0 });
  const driver = motion.orbit;

  await page.goto(URL, { timeout: 60_000 });
  const boot = await driver.waitForFirstFrame(120_000);
  const refusal = pixelLaneRefusal(boot.glRenderer, "the flicker lane's first frame");
  expect(refusal, refusal ?? "").toBeNull();
  await driver.waitForTilesIdle();

  console.log(`renderer: ${boot.glRenderer}`);
  const gpu = await probeGpuIdentity();

  // The opening frame is the certified one, driven to through the real controls.
  await driver.zoomTo(CROSSING.distance);
  await driver.orbitTo(HERO_AZIMUTH, CROSSING.polar);
  await driver.waitForTilesIdle();

  const build = readBuildIdentity();
  // The page's own clock, read once, before any still, so a step index can be
  // derived per frame without asking the app for a clock it does not publish.
  // It has to be `performance.now()` and not `performance.timeOrigin`: the
  // origin is an epoch timestamp, so subtracting it gives minus fifty-six years
  // rather than an elapsed time. That mistake is what `tick ≈ -1.07e11` was in
  // every frame of the first run; `deriveStep` in `./step.js` carries the
  // derivation, the fix and its two bounds, and `test/flicker-step.test.ts`
  // drives it.
  const startedAtMs = await page.evaluate<number | null>(() =>
    typeof performance.now === "function" && Number.isFinite(performance.now()) ? performance.now() : null,
  );
  const patterns = patternsForThisRun();
  const failures: string[] = [];
  const reports: unknown[] = [];

  for (const pattern of patterns) {
    const budget = CAPTURE[pattern];
    const run = new MotionPath(page, { pattern, seconds: budget.seconds, wheelTicksPerSecond: 2 });
    await run.startSampling();

    const frames: CapturedFrame[] = [];
    const stills: Capture[] = [];
    const openedAt = Date.now();

    // A still every time round the loop, while the pointer keeps moving. The
    // loop is what a person does with a mouse: a press, a short move, a release,
    // then the next one before the camera has stopped gliding.
    while (Date.now() - openedAt < budget.seconds * 1_000 && stills.length < budget.frames) {
      await run.step();
      stills.push(await shoot(page, outDir, `${pattern}-${String(stills.length).padStart(2, "0")}`, startedAtMs));
    }

    const samples = await run.collectSamples();

    for (const still of stills) {
      const bytes = new Uint8Array(readFileSync(path.join(outDir, `${still.name}.png`)));
      expect(sha256(bytes), `${still.name}.png changed on disk between the shutter and the record`).toBe(still.sha256);
      frames.push({
        file: `${still.name}.png`,
        relative: still.relative,
        sha256: still.sha256,
        // The judge's span is midpoint to midpoint, because that is the window
        // the recorded poses describe. The real shutter edges go with it, so the
        // record keeps what the midpoint stands in for.
        frameCountMid: still.frameCountMid,
        shutterOpenedAtFrame: still.frameCountBefore,
        shutterClosedAtFrame: still.frameCountAfter,
        tick: still.tick,
        pose: still.pose,
        distanceM: still.distanceM,
      });
    }

    const report = judgeFlicker(
      frames.map((frame) => ({
        ...frame,
        image: decodePng(new Uint8Array(readFileSync(path.join(outDir, `${frame.file}`)))),
      })),
      CONTRACT,
    );

    const manifest = {
      lane: LANE,
      certifiable: false,
      pattern,
      url: URL,
      glRenderer: boot.glRenderer,
      gpu,
      build,
      viewport: { ...CAPTURE_VIEWPORT },
      cadence: { asked: FLICKER_CADENCE, achieved: report.cadence },
      contract: CONTRACT,
      motion: { seconds: budget.seconds, gestures: stills.length, samples: samples.length },
      frames: stills,
      report,
    };
    writeFileSync(path.join(outDir, `manifest-${pattern}.json`), `${JSON.stringify(manifest, null, 2)}\n`);

    const worst = report.pairs_.reduce(
      (highest, pair) => Math.max(highest, pair.frameGap),
      0,
    );
    console.log(
      `${pattern}: ${report.frames} frames, ${report.pairs} pairs, cadence ${report.cadence.withinBound}/${report.pairs} ` +
        `within ${FLICKER_CADENCE.maxPairGapFrames} frames (worst ${worst}), camera moved ${report.cameraMoved}\n` +
        report.pairs_
          .map(
            (pair) =>
              `  ${pair.from} -> ${pair.to}: span ${pair.frameGap}, changed ${pair.changedFraction.toFixed(4)}, ` +
              `crawl ${pair.crawl.toExponential(3)}, travel ${pair.cameraTravelM.toFixed(4)} m, ` +
              `turn ${pair.cameraRotationRad.toFixed(4)} rad, shift ${pair.estimatedShift.dx},${pair.estimatedShift.dy}` +
              `${pair.shiftAtSearchBoundary ? " AT SEARCH BOUNDARY" : ""}, shutter ${pair.shutterFrames} frames, ` +
              `idle ${pair.idleGapFrames} frames, ticks ${pair.tickGap ?? "unrecorded"}`,
          )
          .join("\n") +
        (report.failures.length === 0 ? "\n  no failures" : `\n  FAILURES:\n${report.failures.map((line) => `  - ${line}`).join("\n")}`),
    );

    reports.push({ pattern, report, stills: stills.length });
    for (const failure of report.failures) failures.push(`${pattern}: ${failure}`);
  }

  writeFileSync(
    path.join(outDir, "flicker-report.json"),
    `${JSON.stringify(
      {
        lane: LANE,
        url: URL,
        glRenderer: boot.glRenderer,
        gpu,
        build,
        patterns,
        contract: CONTRACT,
        failures,
        runs: reports,
      },
      null,
      2,
    )}\n`,
  );

  expect(
    failures,
    `the moving dusk sequence did not hold still, in ${failures.length} way(s):\n${failures.map((line) => `  - ${line}`).join("\n")}`,
  ).toEqual([]);
});

interface Observation {
  frameCount: number;
  /** `performance.now()` in the page, read in the same browser task as the rest. */
  pageMs: number;
  camera: FramePose;
}

/**
 * One still, with the render counter and the pose read on **both** sides of the
 * shutter.
 *
 * The shutter spans 16-18 rendered frames on this renderer, so a single reading
 * taken before it describes a picture that has moved on by the time the bytes
 * exist. That is the defect this function used to have: it stored the
 * pre-shutter pose as the frame's pose, so a pair's `cameraTravelM` was a
 * pre-shutter-to-pre-shutter window while its span was the idle gap between two
 * shutters - neither the same interval nor a fixed fraction of it, because the
 * camera accelerates and decelerates inside each gesture. The file even printed a
 * `distanceM` "at the shutter" that had been read before it.
 *
 * What the frame carries now is the midpoint: the pose and the frame counter are
 * each averaged over the two readings, so the pose, the span and the step index
 * all describe the same window, and the two real poses are kept beside them so a
 * reader can see the span the midpoint stands in for. Averaging a pose is a model
 * - the camera's path between the two readings is not known to be straight - and
 * it is stated as one: what it removes is a bias of half a shutter, and what it
 * cannot remove is the shutter's own width.
 */
async function shoot(
  page: Page,
  outDir: string,
  name: string,
  startedAtMs: number | null,
): Promise<Capture> {
  const before = await readObservation(page);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, animations: "disabled" });
  const after = await readObservation(page);
  const bytes = new Uint8Array(readFileSync(file));

  const frameCountMid = (before.frameCount + after.frameCount) / 2;
  const pageMsMid = (before.pageMs + after.pageMs) / 2;
  const pose = midpointPose(before.camera, after.camera);

  return {
    name,
    file: `${name}.png`,
    relative: path.relative(REPO_ROOT, file).split(path.sep).join("/"),
    sha256: sha256(bytes),
    frameCountBefore: before.frameCount,
    frameCountAfter: after.frameCount,
    frameCountMid,
    // The step is derived from the mid-shutter reading of the page clock, so it
    // is the step of the instant the frame's pose belongs to. `deriveStep` takes
    // the position the clock started at, which is `performance.now()` read once
    // before the first still - never `performance.timeOrigin`, which is an epoch
    // timestamp and produced the `-1.07e11` every frame of the first run
    // recorded.
    tick: deriveStep(pageMsMid, startedAtMs, frameCountMid),
    pose,
    poseBefore: before.camera,
    poseAfter: after.camera,
    distanceM: pose.distance,
  };
}

/** The frame counter, the page clock and the pose, read in one browser task. */
async function readObservation(page: Page): Promise<Observation> {
  const observation = await page.evaluate(() => {
    const harness = window.__mapsHarness;
    if (harness === undefined) return null;
    const status = harness.status();
    return {
      frameCount: status.frameCount,
      pageMs: performance.now(),
      camera: harness.camera(),
    };
  });
  if (observation === null) {
    throw new Error(
      "The harness bridge vanished from window mid-run, so the page was replaced and the frames before " +
        "and after it are not a sequence. Nothing from this run can be judged.",
    );
  }
  return observation;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

/**
 * The entry bundle the preview server is serving, by name and digest.
 *
 * Vite hashes the entry's filename, so the name is discovered rather than
 * assumed, and a lane whose `dist/` predates the current `src/` says so in its
 * record instead of quietly reviewing the previous build's pixels. A missing
 * `dist/` is reported as null and not as a pass: this lane does not build, so a
 * run with no build is a run that photographed nothing.
 */
function readBuildIdentity(): { path: string; sha256: string } | null {
  const assets = path.join(REPO_ROOT, "dist", "assets");
  let names: string[];
  try {
    names = readdirSync(assets);
  } catch {
    return null;
  }
  const entry = names.find((name) => /^index-.*\.js$/.test(name));
  if (entry === undefined) return null;
  return { path: `dist/assets/${entry}`, sha256: sha256(new Uint8Array(readFileSync(path.join(assets, entry)))) };
}
