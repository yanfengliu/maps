/**
 * The flythrough lane: a moving camera driven through the real controls, with the
 * population running and the city populated, judged between adjacent frames.
 *
 * ## What this lane is for
 *
 * One criterion, from `docs/work/0_shibuya-1km/plan.md` (Phase 10): "A
 * multi-angle, multi-zoom sweep **and a flythrough driven through the real
 * controls** both come back clean", and the two the plan cannot otherwise reach:
 * the dusk preset "holds still — **no flicker or crawl over a moving sequence**",
 * and the population criteria that are written to be "watched over a run rather
 * than sampled in one frame". The sweep exists and is stills; this is the run.
 *
 * ## What it is not
 *
 * Verdict evidence. It writes into `artifacts/flythrough2/`, it never writes
 * `complete.json`, `assertCertifiable()` refuses its lane by name, and the lane
 * registry gives it a directory of its own that no review of the 44-frame set
 * covers. This lane answers a question the verdict set cannot; it does not become
 * the verdict set by answering it.
 *
 * ## The camera rule, which this lane exists to test rather than to route around
 *
 * Nothing here writes to the page. The bearing and the camera's height go through
 * real left-button drags, zoom through real wheel ticks, and the target's travel
 * through real right-button drags, all dispatched by `page.mouse`, which raises
 * genuine input events at the browser level; the only reads are the frozen bridge
 * — `status`, `camera`, `population`, `tiles`, `post`, `style`, `lighting`, none
 * of which has a setter. In particular **nothing calls `settle()`**: a leg is one
 * movement sampled as it happens, and a settled sequence would be a sequence of
 * stills, which is the thing under test.
 *
 * The check that this is true is not a comment. Every frame's record carries the
 * controls' target height, which no input can move, and the set is judged by
 * `judgeSequence` in `./frames.ts`: the camera must have travelled between
 * adjacent frames, the digests must differ, the render loop must have advanced,
 * the simulation must have advanced, and the frames must be at the capture size
 * and the preset the criterion is written against. `MAPS_FLYTHROUGH_INPUT=none`
 * raises the same events with zero deltas, which is what an input path that never
 * reaches the controls produces, and the lane then fails by name instead of
 * writing a set of identical frames — that run is this lane's red control and it
 * is recorded with the mutation in the handover.
 *
 * ## The judged claims, and which checks cover them
 *
 * - the camera moved continuously for the whole sequence (`judgeSequence`, from
 *   the bridge's own poses, every adjacent pair);
 * - the sequence is not one frame written N times (distinct digests, and the
 *   fraction of pixels that changed between neighbours, both recorded);
 * - the frames are at the capture size, the camera stayed above the ground, and
 *   the app reported no error;
 * - the population was attached and drawing in every frame, and the ticks it
 *   advanced are recorded per frame;
 * - the preset is the dusk one the post criterion is written against, and the
 *   post chain is the real one (ACES + bloom + GTAO + TAA), not the fallback;
 * - no frame set the camera: the controls' target height is the app's own
 *   `GROUND_AT_ORIGIN_M` in every frame.
 *
 * Everything else — whether the frames flicker, crawl, shimmer or pop, and
 * whether a figure holds its shape — is a file to open, and the report says which
 * ones were opened, at their own size, with their digests.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { activeLane, laneDir, requestedGpu } from "../visual/lane.js";
import { OrbitDriver } from "../visual/orbit.js";
import { captureLedger } from "../visual/progress.js";
import { CAPTURE_VIEWPORT } from "../visual/shots.js";
import { decodePng, measureFrame, signatureDistance, type DecodedPng, type FrameStats } from "../visual/png.js";
import { FlythroughDriver, groundBelow, type FlythroughObservation } from "./driver.js";
import { judgeSequence, type SequenceFrame } from "./frames.js";
import { structuredFraction } from "./structure.js";
import {
  CAPTURE_QUERY,
  EXPECTED_LIGHTING_PRESET,
  EXPECTED_POPULATION,
  FRAME_FLOORS,
  LEGS,
  TARGET_Y_M,
} from "./plan.js";

const LANE = activeLane();
if (LANE !== "flythrough-iteration") {
  throw new Error(
    `This spec drives the flythrough lane and MAPS_VISUAL_LANE is "${LANE}". Run it through ` +
      "`playwright.flythrough.config.ts`, which pins the lane and the hardware renderer. A moving sequence written " +
      "under another lane's name is a sequence the review of that lane cannot tell from a sweep of stills.",
  );
}

/**
 * Which tree this spec's code came from, asserted rather than assumed.
 *
 * A worktree under `artifacts/` is where this lane was written, and a relative
 * import of the form `../../../src/...` from inside one resolves to
 * `<repo>/artifacts/src/...`, which does not exist — so a lane that appears to run
 * and measures nothing is one failure mode this guards. The quieter one is an
 * edit that lands in the primary checkout while the run loads another copy.
 * `import.meta.url` is this module's own location, so printing it says which tree
 * is running, and `npm run typecheck` resolves the same paths the compiler does.
 */
const THIS_FILE = fileURLToPath(import.meta.url);

const OUTPUT_DIR = path.resolve(laneDir(), "frames");
const MANIFEST = path.resolve(laneDir(), "manifest.json");

/** True when this run is the lane's own red control rather than a capture. */
const RED_CONTROL = (process.env["MAPS_FLYTHROUGH_INPUT"] ?? "pointer") === "none";

/**
 * Which legs to capture, by name.
 *
 * A re-shoot of one leg should not cost the others, and a run that captured a
 * subset has to say so rather than leave a manifest that looks complete. Only the
 * selected legs' directories are cleared: a filtered re-shoot that wiped the rest
 * would destroy provenance, which the populated lane learned the hard way.
 */
const LEG_FILTER = (process.env["MAPS_FLYTHROUGH_LEGS"] ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name !== "");
const SELECTED = LEG_FILTER.length === 0 ? LEGS : LEGS.filter((leg) => LEG_FILTER.includes(leg.name));
if (SELECTED.length === 0) {
  throw new Error(
    `MAPS_FLYTHROUGH_LEGS is "${process.env["MAPS_FLYTHROUGH_LEGS"]}" and names none of ` +
      `${LEGS.map((leg) => leg.name).join(", ")}, so this run would capture nothing and still report success.`,
  );
}
const EXPECTED_FRAMES = SELECTED.reduce(
  (total, leg) => total + Math.floor((leg.steps.length - 1) / leg.captureEvery) + 1,
  0,
);

/** A frame with everything that was true of the app when it was taken. */
interface FrameRecord extends SequenceFrame {
  step: number;
  index: number;
  stepNote: string;
  /** Population ticks and simulated seconds, read immediately before the shot. */
  ticksAfter: number;
  simulatedSecondsBefore: number;
  /** Wall clock of this capture, and the gap to the previous one in the leg. */
  capturedAtMs: number;
  intervalMs: number | null;
  /** Ticks between this frame and the previous one in the leg. */
  ticksSincePrevious: number | null;
  camera: FlythroughObservation["camera"];
  /** What this step dispatched, and what the pan loop still owed afterwards. */
  input: {
    zoom: number;
    rotate: { x: number; y: number };
    pan: { x: number; y: number };
    panErrorAfter: number | null;
  };
  /** What the bearing and vertical controls did, when the step asked them to. */
  turn: { wantedAzimuth: number; azimuthAfter: number; adjustRad: number; remainingRad: number; idle: string } | null;
  stand: { wantedAboveGroundM: number; heightAfterM: number; adjustRad: number; settled: boolean; idle: string } | null;
  /** Highest terrain near the camera, how far above it the camera is, and the radius that answered. */
  groundBelowM: number;
  groundRadiusM: number;
  clearanceM: number;
  /** What the clearance floor did before this frame, radians of polar correction. */
  clearanceAdjustRad: number;
  counts: {
    pedestriansActive: number;
    vehiclesActive: number;
    pedestriansRendered: number;
    vehiclesRendered: number;
    renderedNear: number;
    renderedMedium: number;
    renderedFar: number;
    pedestriansCrossed: number;
    vehiclesCrossed: number;
    lifecycleSpawned: number;
    lifecycleRetired: number;
    boundarySpawns: number;
    authorityViolations: number;
    longestVehicleWaitSeconds: number;
  };
  renderState: {
    renderer: string;
    style: { id: string; label: string };
    lightingPreset: string;
    exposure: number;
    tokyoClock: string;
    post: FlythroughObservation["post"];
    tiles: FlythroughObservation["tiles"];
  };
  stats: FrameStats;
  /** Mean absolute luminance difference of the 32x32 signature from the previous frame. */
  signatureDistanceFromPrevious: number | null;
  /** Fraction of pixels whose any-channel change from the previous frame is >= 8. */
  changedFractionFromPrevious: number | null;
}

/**
 * The fraction of pixels that changed by at least `threshold` between two frames.
 *
 * Signature distance is a whole-frame mean and is diluted by everything that did
 * not move; this counts the pixels that did. Both are recorded because they
 * answer different questions: the mean says how different the frames look, the
 * fraction says how much of the picture is taking part.
 */
function changedFraction(before: DecodedPng, after: DecodedPng, threshold = 8): number {
  if (before.rgba.length !== after.rgba.length) {
    throw new Error(
      `Two frames have different pixel counts (${before.rgba.length / 4} and ${after.rgba.length / 4}), so they were ` +
        "captured at different sizes and their difference is not a difference of the same picture.",
    );
  }
  let changed = 0;
  for (let index = 0; index < before.rgba.length; index += 4) {
    if (
      Math.abs(before.rgba[index]! - after.rgba[index]!) >= threshold ||
      Math.abs(before.rgba[index + 1]! - after.rgba[index + 1]!) >= threshold ||
      Math.abs(before.rgba[index + 2]! - after.rgba[index + 2]!) >= threshold
    ) {
      changed += 1;
    }
  }
  return changed / (before.rgba.length / 4);
}

/** The build bytes the frames belong to, so a stale `dist` is visible later. */
async function buildDigests(): Promise<{ file: string; sha256: string }[]> {
  const files = ["dist/index.html"];
  try {
    const index = await readFile("dist/index.html", "utf8");
    for (const match of index.matchAll(/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)) files.push(`dist/${match[0]}`);
  } catch {
    // The preview server owns `dist`; a run with no index cannot have booted the
    // app, and the boot check in this spec is what reports that.
  }
  const digests: { file: string; sha256: string }[] = [];
  for (const file of files) {
    try {
      digests.push({ file, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
    } catch {
      // A file the index does not reference is simply not part of the record.
    }
  }
  return digests;
}

test.describe("flythrough", () => {
  // A backstop, not a budget: the legs are counted in steps and the wall clock is
  // whatever this machine's frame rate makes them. Four legs of eleven or twelve
  // steps with 3,000 pedestrians and the full post chain is minutes, not hours.
  test.setTimeout(45 * 60_000);

  test("drives a moving camera through the real controls with the population running", async ({ page }) => {
    console.log(`this spec is ${THIS_FILE}`);
    console.log(`lane ${LANE} writes to ${path.resolve(laneDir())}`);
    if (RED_CONTROL) {
      console.log(
        "RED CONTROL: MAPS_FLYTHROUGH_INPUT=none, so every pointer and wheel event carries a zero delta. This run " +
          "must fail; it exists to show that the lane notices an input path that is not driven.",
      );
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    for (const leg of SELECTED) {
      await rm(path.join(OUTPUT_DIR, leg.name), { recursive: true, force: true });
      await mkdir(path.join(OUTPUT_DIR, leg.name), { recursive: true });
    }

    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(`uncaught: ${error.message}`));

    const frames: FrameRecord[] = [];
    const legs: Record<string, unknown>[] = [];
    const ledger = captureLedger(OUTPUT_DIR, EXPECTED_FRAMES);

    await page.goto(`/${CAPTURE_QUERY}`, { timeout: 90_000 });

    const orbit = new OrbitDriver(page);
    const driver = new FlythroughDriver(page, { redControl: RED_CONTROL });
    const status = await orbit.waitForFirstFrame(180_000);
    console.log(`renderer: ${status.glRenderer}`);
    await driver.readBox();

    // The population the URL asked for is the population that attached, and its
    // renderer is drawing. A run that silently rendered an empty city would
    // otherwise produce a complete sequence of nothing in particular, and the
    // crowd question this lane exists to answer would be answered wrongly.
    let ready = await driver.observe();
    const rendererDeadline = Date.now() + 10 * 60_000;
    while (!ready.population.rendered.attached && Date.now() < rendererDeadline) {
      await page.waitForTimeout(250);
      ready = await driver.observe();
    }
    expect(
      ready.population.attached && ready.population.rendered.attached,
      `?agents=1 attached no drawn population: attached=${ready.population.attached}, ` +
        `rendererAttached=${ready.population.rendered.attached} at tick ${ready.population.ticks}. Every frame ` +
        "below would be the population-free city the appearance sweep photographs.",
    ).toBe(true);

    // The post chain and the preset the criterion is written against. A frame set
    // captured on the fallback path, or at another hour, cannot be judged against
    // "the dusk preset renders with ACES tone mapping, bloom carrying the neon,
    // SSAO and TAA", and nothing in the pixels would say which chain drew them.
    const opening = ready;
    console.log(
      `post: active=${opening.post.active} passes=${opening.post.passes.join(",")} ` +
        `taa=${opening.post.taaAccumulating}/${opening.post.taaSamples} error=${opening.post.error ?? "none"}`,
    );
    console.log(
      `lighting: ${opening.lighting.preset} (${opening.lighting.label}) at ${opening.lighting.tokyoClock}, ` +
        `exposure ${opening.lighting.exposure}`,
    );
    expect(opening.post.active, `the post chain is not active: ${opening.post.error ?? "no error given"}`).toBe(true);
    expect(opening.lighting.preset).toBe(EXPECTED_LIGHTING_PRESET);
    expect(opening.population.pedestrians.active).toBe(EXPECTED_POPULATION.pedestrians);
    expect(opening.camera.target.y, "the controls' target is not at the crossing's own ground height").toBeCloseTo(
      TARGET_Y_M,
      3,
    );

    const populationAtAttach = {
      ticks: opening.population.ticks,
      simulatedSeconds: opening.population.simulatedSeconds,
      pedestriansDrawn: opening.population.rendered.pedestrians,
      vehiclesDrawn: opening.population.rendered.vehicles,
      frameCount: opening.frameCount,
    };
    console.log(
      `population drawing at tick ${populationAtAttach.ticks} (${populationAtAttach.simulatedSeconds.toFixed(1)} s ` +
        `simulated): ${populationAtAttach.pedestriansDrawn} pedestrians, ${populationAtAttach.vehiclesDrawn} vehicles`,
    );

    for (const leg of SELECTED) {
      const directory = path.join(OUTPUT_DIR, leg.name);
      await mkdir(directory, { recursive: true });
      driver.setPanLimit(leg.panLimitPx);

      console.log(`\n${leg.name}: ${leg.steps.length} steps, pan limit ${leg.panLimitPx} px — ${leg.panNote}`);

      // The one clock wait in this lane, at a leg boundary and never inside a leg.
      if (leg.holdToTick !== undefined) {
        const reached = await driver.waitForTick(leg.holdToTick);
        console.log(`${leg.name}: population tick ${reached.ticks} reached (${reached.simulatedSeconds.toFixed(1)} s simulated)`);
      }

      const legFrames: FrameRecord[] = [];
      let previous: FrameRecord | null = null;
      let previousImage: DecodedPng | null = null;

      const openingObservation = await driver.observe();
      console.log(
        `${leg.name}: opening at camera ` +
          `(${openingObservation.camera.position.x.toFixed(0)}, ${openingObservation.camera.position.y.toFixed(0)}, ` +
          `${openingObservation.camera.position.z.toFixed(0)}) target ` +
          `(${openingObservation.camera.target.x.toFixed(0)}, ${openingObservation.camera.target.z.toFixed(0)}) ` +
          `distance ${openingObservation.camera.distance.toFixed(0)} m at tick ${openingObservation.population.ticks}`,
      );

      for (const [stepIndex, step] of leg.steps.entries()) {
        const capture = stepIndex % leg.captureEvery === 0 || stepIndex === leg.steps.length - 1;

        // One movement, then one frame. The input is dispatched first, so the pose
        // read beside the frame is the pose that input produced; the frame counter
        // is bracketed on both sides so a stalled loop is visible rather than
        // inferred from a still pair.
        const input = await driver.step(step, null);
        if (!capture) continue;

        // Keep the camera over the street, not over the hill and not under it.
        // The correction is an input like any other, and it runs before the frame
        // so the pose the frame is judged at is the pose that was corrected.
        const clearance = await driver.holdClearance(leg.minClearanceM);
        const before = await driver.observe();
        const capturedAtMs = Date.now();
        const file = path.join(directory, `${leg.name}-${String(stepIndex).padStart(3, "0")}.png`);
        await page.screenshot({ path: file });
        const after = await driver.observe();

        const bytes = new Uint8Array(await readFile(file));
        const decoded = decodePng(bytes);
        const stats: FrameStats = measureFrame(decoded);

        // The first captured frame of a leg has no predecessor, so it is no pair
        // at all: null, not 0. A 0 here lands in the sequence judge's sub-1mm
        // set as a pair whose travel is zero by construction — the phantom
        // complaints of the 2026-09-16 run, adjudicated in
        // `artifacts/flythrough2/adjudication-report.md`.
        const travel =
          previous === null
            ? null
            : Math.hypot(
                before.camera.position.x - previous.camera.position.x,
                before.camera.position.y - previous.camera.position.y,
                before.camera.position.z - previous.camera.position.z,
              );

        const ground = groundBelow(before.camera.position.x, before.camera.position.z);
        const record: FrameRecord = {
          leg: leg.name,
          step: stepIndex,
          index: legFrames.length,
          file: path.relative(path.resolve(laneDir()), file).replaceAll("\\", "/"),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          stepNote: step.note ?? "",
          ticksBefore: before.population.ticks,
          ticksAfter: after.population.ticks,
          simulatedSecondsBefore: before.population.simulatedSeconds,
          frameCountBefore: before.frameCount,
          frameCountAfter: after.frameCount,
          capturedAtMs,
          intervalMs: previous === null ? null : capturedAtMs - previous.capturedAtMs,
          ticksSincePrevious: previous === null ? null : before.population.ticks - previous.ticksBefore,
          camera: before.camera,
          cameraTravelM: travel,
          // The plan's mark for a step that deliberately asks the camera for
          // nothing; the sequence judge exempts the pair from the travel floor
          // and requires the scene to be alive instead.
          cameraHeld: step.holdsCamera === true,
          input,
          turn: input.turn,
          stand: input.stand,
          groundBelowM: ground.heightM,
          groundRadiusM: ground.radiusM,
          clearanceM: before.camera.position.y - ground.heightM,
          clearanceAdjustRad: clearance.adjustRad,
          counts: {
            pedestriansActive: before.population.pedestrians.active,
            vehiclesActive: before.population.vehicles.active,
            pedestriansRendered: before.population.rendered.pedestrians,
            vehiclesRendered: before.population.rendered.vehicles,
            renderedNear: before.population.rendered.near,
            renderedMedium: before.population.rendered.medium,
            renderedFar: before.population.rendered.far,
            pedestriansCrossed: before.population.pedestrians.crossed,
            vehiclesCrossed: before.population.vehicles.crossed,
            lifecycleSpawned: before.population.lifecycle.spawned,
            lifecycleRetired: before.population.lifecycle.retired,
            boundarySpawns: before.population.boundarySpawns,
            authorityViolations: before.population.authorityViolations,
            longestVehicleWaitSeconds: before.population.vehicles.longestWaitSeconds,
          },
          renderState: {
            renderer: before.glRenderer,
            style: before.style,
            lightingPreset: before.lighting.preset,
            exposure: before.lighting.exposure,
            tokyoClock: before.lighting.tokyoClock,
            post: before.post,
            tiles: before.tiles,
          },
          stats,
          width: stats.width,
          height: stats.height,
          pedestriansDrawn: before.population.rendered.pedestrians,
          vehiclesDrawn: before.population.rendered.vehicles,
          structuredPixels: structuredFraction(decoded),
          targetY: before.camera.target.y,
          signatureDistanceFromPrevious:
            previousImage === null ? null : signatureDistance(measureFrame(previousImage), stats),
          changedFractionFromPrevious:
            previousImage === null ? null : changedFraction(previousImage, decoded),
        };

        // The camera has to stay on the scene. A frame taken from inside the hill
        // shows the city from underneath with sky behind it, which reads as a
        // rendering fault and is really a framing one; it must not be counted as a
        // frame that judged anything.
        expect(
          record.clearanceM,
          `${record.file} was captured with the camera ${record.clearanceM.toFixed(1)} m above the highest terrain ` +
            `under it (${before.camera.position.x.toFixed(0)}, ${before.camera.position.z.toFixed(0)}), so the frame ` +
            "is of the inside of the ground rather than of the city.",
        ).toBeGreaterThan(1.5);
        expect(record.renderState.renderer, `${record.file} does not name the renderer it was drawn on`).not.toBe("");
        expect(
          record.stats.width === CAPTURE_VIEWPORT.width && record.stats.height === CAPTURE_VIEWPORT.height,
          `${record.file} is ${record.stats.width}x${record.stats.height} and this lane captures at ` +
            `${CAPTURE_VIEWPORT.width}x${CAPTURE_VIEWPORT.height}`,
        ).toBe(true);

        legFrames.push(record);
        frames.push(record);
        previous = record;
        previousImage = decoded;
        await ledger.record(`${leg.name}-${String(stepIndex).padStart(3, "0")}`);

        console.log(
          `  ${leg.name}-${String(stepIndex).padStart(3, "0")} tick ${record.ticksBefore} ` +
            `(${record.simulatedSecondsBefore.toFixed(1)} s, +${record.ticksSincePrevious ?? 0}) ` +
            `d ${before.camera.distance.toFixed(1)} m az ${((before.camera.azimuth * 180) / Math.PI).toFixed(1)} ` +
            `travel ${travel === null ? "-" : `${travel.toFixed(2)} m`} ` +
            `clear ${record.clearanceM.toFixed(1)} m ` +
            `structured ${(record.structuredPixels * 100).toFixed(0)}% ` +
            `changed ${record.changedFractionFromPrevious === null ? "-" : (record.changedFractionFromPrevious * 100).toFixed(1)}% ` +
            `drawn ${record.counts.pedestriansRendered}p/${record.counts.vehiclesRendered}v ` +
            `gap ${record.intervalMs === null ? "-" : (record.intervalMs / 1000).toFixed(1)} s`,
        );
      }

      legs.push({
        name: leg.name,
        purpose: leg.purpose,
        expectation: leg.expectation,
        captureEvery: leg.captureEvery,
        steps: leg.steps.length,
        framesCaptured: legFrames.length,
        holdToTick: leg.holdToTick ?? null,
        panLimitPx: leg.panLimitPx,
        openingPose: legFrames[0]?.camera ?? null,
        closingPose: legFrames[legFrames.length - 1]?.camera ?? null,
        firstFrameTick: legFrames[0]?.ticksBefore ?? 0,
        lastFrameTick: legFrames[legFrames.length - 1]?.ticksBefore ?? 0,
        frames: legFrames,
      });
    }

    // Every frame has to be at the preset and on the real post chain, not only the
    // first: a chain that failed mid-run would fall back for the rest of the
    // sequence, and a reviewer opening frame 30 would be reviewing the fallback.
    const offPreset = frames.filter((record) => record.renderState.lightingPreset !== EXPECTED_LIGHTING_PRESET);
    const offChain = frames.filter((record) => !record.renderState.post.active);

    // The sequence claims, in the one place they can be made to fail cheaply and
    // watched to do it: `./frames.ts`, exercised by
    // `test/flythrough-frames.test.ts`.
    const failures = judgeSequence(
      frames,
      SELECTED.map((leg) => ({
        name: leg.name,
        frames: Math.floor((leg.steps.length - 1) / leg.captureEvery) + 1,
      })),
      FRAME_FLOORS,
      {
        viewport: CAPTURE_VIEWPORT,
        targetY: TARGET_Y_M,
        targetToleranceM: 0.05,
        minimumTravelM: 0.001,
        minimumDistinctFraction: 0.95,
        redControl: RED_CONTROL,
      },
    );

    const accumulating = frames.filter((record) => record.renderState.post.taaAccumulating).length;
    const sampleCounts = [...new Set(frames.map((record) => record.renderState.post.taaSamples))].sort((a, b) => a - b);

    // The pose ledger goes to disk BEFORE anything asserts over the sequence.
    // The write used to sit after the judgeSequence expectation, and the first
    // run that failed it — 2026-09-16, adjudicated in
    // `artifacts/flythrough2/adjudication-report.md` — left only `captures.json`
    // (labels and intervals) where the poses, travels and per-frame counts were
    // the evidence the adjudication needed. A failed run is exactly the run
    // shape that needs adjudicating, so the ledger is written first and a
    // failing run's manifest carries the failures it failed with; the
    // assertions below then judge a ledger already on disk.
    const last = frames[frames.length - 1]!;
    await writeFile(
      MANIFEST,
      `${JSON.stringify(
        {
          lane: LANE,
          certifiable: false,
          evidence: "iteration only: these frames are not the verdict set and no review covers them",
          capturedAt: new Date().toISOString(),
          spec: THIS_FILE,
          query: CAPTURE_QUERY,
          requestedGpu: requestedGpu(),
          renderer: last.renderState.renderer,
          viewport: CAPTURE_VIEWPORT,
          legFilter: LEG_FILTER.length === 0 ? null : LEG_FILTER,
          legsNotCaptured: LEGS.filter((leg) => !SELECTED.includes(leg)).map((leg) => leg.name),
          expectedPopulation: EXPECTED_POPULATION,
          expectedLightingPreset: EXPECTED_LIGHTING_PRESET,
          frameFloors: FRAME_FLOORS,
          populationAtAttach,
          build: await buildDigests(),
          legs,
          frames,
          taa: { accumulatingFrames: accumulating, totalFrames: frames.length, sampleCounts },
          ...(failures.length > 0 ? { failures } : {}),
          caveat:
            "A frame is evidence of what was on screen at its tick. The pose, the counts and the post state beside it " +
            "are the app's own numbers, read in one browser task immediately before the shot; the ticks after it " +
            "bracket the frame. None of that says what the frame looks like.",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    expect(offPreset.map((record) => record.file), `${offPreset.length} frames were not captured at ${EXPECTED_LIGHTING_PRESET}`).toEqual([]);
    expect(offChain.map((record) => record.file), `${offChain.length} frames were drawn without the post chain`).toEqual([]);
    expect(consoleErrors, `the page logged errors:\n${consoleErrors.join("\n")}`).toEqual([]);
    expect(
      failures,
      `the frame sequence does not show a camera driven through the controls:\n- ${failures.join("\n- ")}`,
    ).toEqual([]);

    expect(
      ledger.entries().length,
      `only ${ledger.entries().length} of ${EXPECTED_FRAMES} frames reached disk; see ${ledger.file()}`,
    ).toBe(EXPECTED_FRAMES);

    console.log(
      `\nTAA over the moving sequence: ${accumulating} of ${frames.length} frames report accumulation, ` +
        `sample counts seen: ${sampleCounts.join("/")}`,
    );

    console.log(
      [
        "",
        `${frames.length} frames written to ${OUTPUT_DIR}`,
        ...legs.map((leg) => {
          const record = leg as {
            name: string;
            framesCaptured: number;
            firstFrameTick: number;
            lastFrameTick: number;
          };
          return (
            `  ${record.name.padEnd(9)} ${String(record.framesCaptured).padStart(3)} frames  ` +
            `ticks ${String(record.firstFrameTick).padStart(5)}-${String(record.lastFrameTick).padStart(5)} ` +
            `(${((record.lastFrameTick - record.firstFrameTick) / 60).toFixed(1)} s simulated)`
          );
        }),
        "",
      ].join("\n"),
    );
  });
});
