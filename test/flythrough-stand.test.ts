/**
 * The flythrough's vertical control inside one step: the correction converges, and
 * a stand whose correction stops short is failed by name.
 *
 * `standAt` is a closed loop over an input path whose gesture is damped —
 * `OrbitControls` scales the camera's whole offset from the target, and a drag's
 * spherical delta decays by 0.95 a frame — so one drag per step does not deliver
 * the angle it asks for. The recorded 2026-09-17 run measured the consequence:
 * `frames/approach/approach-010.png` was captured 3.10 m above the ground while
 * the same step's stand read `heightBeforeM` 1.07751 m, under the 1.5 m floor the
 * capture beside it passed (`artifacts/flythrough2/manifest.json`; the run repeated
 * on 2026-09-17 read 0.66 m). The camera was under its floor when the vertical
 * control ran, and the control was still catching up when the frame was taken.
 *
 * Two things are exercised here, and neither needs a browser.
 *
 * - `standConverge` — the arithmetic the driver's loop iterates: the polar that
 *   stands the camera at `max(wanted, floor)` metres above the ground, one drag's
 *   worth of the remaining error, and whether any is left. The fixture below gives
 *   it a camera, a served-ground profile and a damped gesture, and asserts the loop
 *   finishes the correction inside the step: every recorded moment at or above the
 *   floor, the height within the convergence bar, and the drag count bounded.
 * - `judgeSequence` — over the moments that fixture records, once with the
 *   correction stopped after one drag per step and once with it iterated. The first
 *   is the defect and must fail by name; the second is the fix and must pass.
 *
 * **Bound.** The fixture models the controls' damping as a constant fraction of the
 * commanded angle, measured at 0.52 on 2026-09-17 and asserted against the live run
 * only by `npm run visual:flythrough`; the polar-to-height arithmetic and the
 * gesture's sign come from `standConverge` itself, so this file cannot disagree
 * with the shipped loop about them. It proves the loop converges under that model
 * and that the judge names a stand left under the floor. It proves nothing about
 * what the browser's controls deliver, and it opens no frame.
 */

import { describe, expect, it } from "vitest";

import {
  MAX_STAND_DRAGS,
  runVerticalCorrection,
  STAND_CONVERGENCE_M,
  standConverge,
  type StandConvergence,
} from "../tools/flythrough/driver.js";
import { judgeSequence, type SequenceExpectations, type SequenceFrame } from "../tools/flythrough/frames.js";

const FLOORS = { pedestriansDrawn: 100, vehiclesDrawn: 1, structuredPixels: 0.05 };
const EXPECTATIONS: SequenceExpectations = {
  viewport: { width: 1280, height: 720 },
  targetY: 15.2,
  targetToleranceM: 0.05,
  minimumTravelM: 0.001,
  minimumDistinctFraction: 0.95,
  heldPairs: {},
  redControl: false,
  clearanceFloorM: 1.5,
};

/** The controls' own geometry at this lane's 1280x720 canvas. */
const CANVAS_HEIGHT_PX = 720;
const MAX_ROTATE_PX = 40;
const RADIANS_PER_PIXEL_Y = (2 * Math.PI) / CANVAS_HEIGHT_PX;

/**
 * The fraction of a commanded angle one drag delivers, measured on 2026-09-17: the
 * approach's step 10 asked for 0.03128 rad and the camera's polar moved 0.0165 rad
 * after the drag returned (the rest lands as the damping tail over later frames).
 */
const DELIVERED_PER_DRAG = 0.52;

/** The plan's own target: the app's fixed `GROUND_AT_ORIGIN_M`, which no input moves. */
const TARGET_Y = 15.2;

/**
 * The ground along the camera's path at the approach's last rungs, metres.
 *
 * The served terrain's shape over the crowd's knot: 22 m behind the camera rising
 * to 25.4 m under the scored pose, with the closing rungs crossing the rise. This
 * is the stretch the recorded run measured at 21.56 m rising to 26.41 m between
 * two captures (`artifacts/flythrough2/manifest.json`, `groundBelowM`).
 */
const GROUND_NODES = [22.0, 22.4, 23.0, 24.0, 25.4];

/** The approach's closing rungs, from `APPROACH_LADDER` in `tools/flythrough/plan.ts`. */
const RUNGS = [
  { distance: 52, stand: 12 },
  { distance: 43, stand: 8.5 },
  { distance: 37, stand: 6 },
  { distance: 33, stand: 4.5 },
  { distance: 26, stand: 3.5 },
  { distance: 26, stand: 3 },
];

/** The approach leg's own floor, `APPROACH_FLOOR_M`. */
const FLOOR_M = 2;

function groundAt(progress: number): number {
  const x = progress * (GROUND_NODES.length - 1);
  const low = Math.min(GROUND_NODES.length - 2, Math.floor(x));
  const fraction = x - low;
  return GROUND_NODES[low]! * (1 - fraction) + GROUND_NODES[low + 1]! * fraction;
}

/**
 * The controls' pose the fixture tracks.
 *
 * `polar` and `distance` are the controls' own two numbers: the camera's offset
 * from the target is `(distance * sin polar, distance * cos polar)`, so a pose is
 * exactly this pair and the height above the ground follows from where the target
 * is. The zoom multiplies the whole offset by the distance factor — which is what
 * `OrbitControls` does, `_spherical.radius *= _scale` — and a left-button drag is
 * the polar axis alone.
 */
interface Pose {
  /** The controls' distance, metres. */
  distance: number;
  /** The polar angle, radians. */
  polar: number;
  /** The controls' target height, metres. */
  targetY: number;
}

function freshState(pose: Pose, heightM: number, wantedAboveGroundM: number): StandConvergence {
  return {
    polar: pose.polar,
    distance: pose.distance,
    targetY: pose.targetY,
    groundM: 0,
    heightM,
    wantedAboveGroundM,
    clearanceFloorM: FLOOR_M,
    maxStepRad: 0.2,
    maxRotatePx: MAX_ROTATE_PX,
    radiansPerPixelY: RADIANS_PER_PIXEL_Y,
    toleranceM: STAND_CONVERGENCE_M,
    iteration: 0,
    wantedPolar: pose.polar,
    commandedRad: 0,
    pixelsY: 0,
    reachedAboveGroundM: wantedAboveGroundM,
    commanded: false,
    idle: "",
  };
}

/**
 * One correction inside a step: the **shipped** loop, `runVerticalCorrection`,
 * driven with a camera and a ground profile in place of a browser.
 *
 * `stopAfter` is the mutation. It caps the drags the page will carry out, which is
 * the one drag per step the recorded run flew: the single capped drag left the
 * camera short of the height it was aiming at and the next step's zoom found it
 * there. `atLeast` is the floor rescue, which climbs and never descends.
 */
async function correct(
  pose: Pose,
  groundM: number,
  wanted: number,
  stopAfter = MAX_STAND_DRAGS,
  atLeast = false,
): Promise<{ drags: number; heightM: number; reachedM: number; settled: boolean; idle: string }> {
  const heightM = pose.targetY + pose.distance * Math.cos(pose.polar) - groundM;
  let carried = 0;
  const outcome = await runVerticalCorrection(
    {
      observe: async () => ({
        polar: pose.polar,
        distance: pose.distance,
        targetY: pose.targetY,
        groundM,
        heightM: pose.targetY + pose.distance * Math.cos(pose.polar) - groundM,
      }),
      drag: async (pixelsY: number) => {
        // The step's budget is the page's: the loop asks for as many drags as it
        // needs, and this camera carries out at most `stopAfter` of them — which is
        // the defect, one capped drag a step, when `stopAfter` is 1.
        if (carried >= stopAfter) return;
        carried += 1;
        // The measured gesture: the camera turns by the part of the commanded angle
        // the drag delivers, and nothing else about the pose moves.
        pose.polar += -pixelsY * RADIANS_PER_PIXEL_Y * DELIVERED_PER_DRAG;
      },
    },
    {
      polar: pose.polar,
      distance: pose.distance,
      targetY: pose.targetY,
      groundM,
      heightM,
      wantedAboveGroundM: atLeast ? Number.NEGATIVE_INFINITY : wanted,
      clearanceFloorM: FLOOR_M,
      maxStepRad: 0.2,
      maxRotatePx: MAX_ROTATE_PX,
      radiansPerPixelY: RADIANS_PER_PIXEL_Y,
      toleranceM: STAND_CONVERGENCE_M,
      iteration: 0,
      wantedPolar: pose.polar,
      commandedRad: 0,
      pixelsY: 0,
      reachedAboveGroundM: wanted,
      ...(atLeast ? { atLeast: true } : {}),
      commanded: false,
      idle: "",
    },
  );
  return {
    drags: carried,
    heightM: pose.targetY + pose.distance * Math.cos(pose.polar) - groundM,
    reachedM: outcome.reachedAboveGroundM,
    // The loop's own verdict, so a case cannot restate the convergence test it is
    // supposed to be checking.
    settled: outcome.settled,
    idle: outcome.idle,
  };
}

/** One moment of the leg, as the frame record keeps it. */
interface Moment {
  step: number;
  groundM: number;
  heightBeforeM: number;
  heightAfterM: number;
  drags: number;
}

/**
 * The approach's closing rungs, step by step, recording every moment the run keeps.
 *
 * A step is the zoom that closes the distance — the contraction that takes the
 * camera down over rising ground — then the floor rescue, which is what answers
 * the floor inside the step, then the stand on the rung's own height. The moment
 * recorded for the next step is the height the camera is left at.
 */
async function flyApproach(options: { stopAfter: number; withRescue: boolean }): Promise<{ frames: SequenceFrame[]; moments: Moment[] }> {
  const pose: Pose = { distance: RUNGS[0]!.distance, polar: 1.2, targetY: TARGET_Y };
  const frames: SequenceFrame[] = [];
  const moments: Moment[] = [];

  for (const [index, rung] of RUNGS.entries()) {
    const ratio = rung.distance / pose.distance;
    const offset = pose.distance * Math.cos(pose.polar) * ratio;
    pose.distance = rung.distance;
    pose.polar = Math.acos(Math.max(0.02, Math.min(0.999, offset / pose.distance)));

    const groundM = groundAt(index / (RUNGS.length - 1));
    const rescue = options.withRescue
      ? await correct(pose, groundM, FLOOR_M, MAX_STAND_DRAGS, true)
      : { heightM: pose.targetY + offset - groundM, drags: 0, settled: true, idle: "", reachedM: FLOOR_M };
    const heightBeforeM = rescue.heightM;
    // The rescue's own stopping rule is the floor with no bar below it: a camera
    // left under the floor by it is a defect in this fixture, not a tolerance.
    if (options.withRescue) expect(heightBeforeM).toBeGreaterThanOrEqual(FLOOR_M);

    const stand = await correct(pose, groundM, rung.stand, options.stopAfter);
    moments.push({ step: index, groundM, heightBeforeM, heightAfterM: stand.heightM, drags: rescue.drags + stand.drags });

    frames.push({
      leg: "approach",
      file: `frames/approach/approach-${String(index).padStart(3, "0")}.png`,
      sha256: `digest-approach-${index}`,
      cameraTravelM: index === 0 ? null : 20 + index,
      frameCountBefore: 100 * (index + 1),
      frameCountAfter: 100 * (index + 1) + 40,
      ticksBefore: 1_000 + index * 90,
      width: 1280,
      height: 720,
      pedestriansDrawn: 3_000,
      vehiclesDrawn: 20,
      structuredPixels: 0.6,
      targetY: TARGET_Y,
      // The capture happens after the stand has run, so the frame is over the floor
      // in both arms of this fixture: the floor check is about the moments between
      // captures, which is the whole reason it reads the stand's own two heights.
      clearanceM: stand.heightM,
      stand: { heightBeforeM, heightAfterM: stand.heightM },
    });
  }

  return { frames, moments };
}

function lowestMoment(moments: readonly Moment[]): number {
  return Math.min(...moments.flatMap((moment) => [moment.heightBeforeM, moment.heightAfterM]));
}

describe("the flythrough's vertical control inside one step", () => {
  it("converges to the height the step is aiming at, above the floor, within the drag budget", async () => {
    const { moments, frames } = await flyApproach({ stopAfter: MAX_STAND_DRAGS, withRescue: true });

    // Nothing the record keeps is under the floor, and the judge agrees.
    expect(lowestMoment(moments)).toBeGreaterThanOrEqual(EXPECTATIONS.clearanceFloorM);
    expect(judgeSequence(frames, [{ name: "approach", frames: RUNGS.length }], FLOORS, EXPECTATIONS)).toEqual([]);

    // No moment is under the leg's own 2 m floor either: the rescue aims at the
    // floor with no bar below it, and the stand aims at the rung.
    expect(lowestMoment(moments)).toBeGreaterThanOrEqual(FLOOR_M);

    // The plan's closing rung is honoured where the ground allows it: the ladder
    // asks for 3 m and the camera reaches it rather than stopping short.
    const last = moments[moments.length - 1]!;
    expect(last.heightAfterM).toBeGreaterThan(RUNGS[RUNGS.length - 1]!.stand - 2 * STAND_CONVERGENCE_M);

    // The rescue is what keeps a step's own zoom from carrying the camera under
    // the floor, and it fires on the steps where that contraction is deepest.
    expect(moments.filter((moment) => moment.heightBeforeM < FLOOR_M + 1).length).toBeGreaterThan(0);
    for (const moment of moments) {
      expect(moment.drags).toBeGreaterThanOrEqual(0);
      expect(moment.drags).toBeLessThanOrEqual(2 * MAX_STAND_DRAGS);
    }
    // The loop genuinely iterates on this route rather than arriving in one drag.
    expect(Math.max(...moments.map((moment) => moment.drags))).toBeGreaterThan(1);
  });

  it("fails a stand whose correction stopped after one drag, by name, even though its capture is clear of the floor", async () => {
    // The defect: one capped drag per step and no floor rescue, which is the shape
    // the recorded run flew. The zoom in each step contracts the camera's remaining
    // offset, the drag's damped gesture leaves the height short, and the following
    // step's stand reads it under the floor.
    const defect = await flyApproach({ stopAfter: 1, withRescue: false });

    // The captured clearance is not the problem: every capture is taken after the
    // stand has run, above the floor.
    const capturedLow = Math.min(...defect.frames.map((frame) => frame.clearanceM ?? Number.POSITIVE_INFINITY));
    expect(capturedLow).toBeGreaterThan(EXPECTATIONS.clearanceFloorM);

    // The stand's own readings are, and the judge reports them by name.
    expect(lowestMoment(defect.moments)).toBeLessThan(EXPECTATIONS.clearanceFloorM);
    const failures = judgeSequence(defect.frames, [{ name: "approach", frames: RUNGS.length }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/no recorded moment of this leg put the camera below the leg's clearance floor/);
    expect(failures.join("\n")).toMatch(/at the stand's height before the vertical control ran/);
    expect(failures.join("\n")).toMatch(/the lowest is [\d.]+ m at frames\/approach\/approach-\d+\.png/);

    // And the same geometry with the loop left to run is green, so what the red arm
    // measures is the stopping rule and not the fixture's geometry.
    const fixed = await flyApproach({ stopAfter: MAX_STAND_DRAGS, withRescue: true });
    expect(lowestMoment(fixed.moments)).toBeGreaterThan(lowestMoment(defect.moments));
    expect(judgeSequence(fixed.frames, [{ name: "approach", frames: RUNGS.length }], FLOORS, EXPECTATIONS)).toEqual([]);
  });

  it("holds a rung that would descend below the leg's floor at the floor instead", async () => {
    // A rung asking for 1 m with a 2 m floor: the floor is the binding aim, and the
    // camera is left above the floor rather than under it.
    const pose: Pose = { distance: 33, polar: 1.1, targetY: TARGET_Y };
    const groundM = 24.2;
    const result = await correct(pose, groundM, 1);
    expect(result.reachedM).toBeGreaterThanOrEqual(FLOOR_M);
    expect(result.heightM).toBeGreaterThanOrEqual(FLOOR_M);
    expect(result.settled).toBe(true);
  });

  it("leaves a camera the plan already placed above the floor alone", async () => {
    // The rescue is `atLeast`: a camera well above the ground is not corrected down
    // to the floor, and no drag is spent doing it.
    const pose: Pose = { distance: 33, polar: 1.1, targetY: TARGET_Y };
    const groundM = 22.0;
    const result = await correct(pose, groundM, FLOOR_M, MAX_STAND_DRAGS, true);
    expect(result.drags).toBe(0);
    expect(result.heightM).toBeGreaterThan(FLOOR_M);
  });

  it("stops when a step of the correction is below the pointer's resolution instead of spinning", () => {
    const pose: Pose = { distance: 33, polar: 1.15, targetY: TARGET_Y };
    const groundM = 24.2;
    // 5.5 m under the aim, and the angle left to correct is 0.0039 rad: worth
    // correcting, and worth a 0.44 px drag at this canvas — under the pointer's half
    // pixel, so there is nothing to dispatch.
    const state = freshState(pose, 6.5, 12);
    state.groundM = groundM;
    state.maxStepRad = 0.003;
    standConverge(state);
    expect(state.commanded).toBe(false);
    expect(state.pixelsY).toBe(0);
    expect(state.idle).toMatch(/below the pointer's resolution/);
  });

  it("stops when the camera is already within the convergence bar, and when the angle the cap allows is under half a pixel", () => {
    // Both exits the driver's loop actually takes at a real stand tolerance. The
    // helper has a third — under 0.002 rad left to correct — and at a 0.05 m bar the
    // pointer's resolution always fires first, because 0.002 rad at the rung
    // distances where that bar binds is worth more than half a pixel: it has never
    // been reached and is not asserted here as though it had.
    const pose: Pose = { distance: 33, polar: 1.15, targetY: TARGET_Y };
    const groundM = 24.2;

    const settled = freshState(pose, 12.01, 12);
    settled.groundM = groundM;
    standConverge(settled);
    expect(settled.commanded).toBe(false);
    expect(settled.idle).toMatch(/already within 0\.05 m of the height this step is aiming at/);

    const unresolved = freshState(pose, 6.5, 12);
    unresolved.groundM = groundM;
    unresolved.maxStepRad = 0.003;
    standConverge(unresolved);
    expect(unresolved.commanded).toBe(false);
    expect(unresolved.pixelsY).toBe(0);
    expect(unresolved.idle).toMatch(/below the pointer's resolution/);
  });
});
