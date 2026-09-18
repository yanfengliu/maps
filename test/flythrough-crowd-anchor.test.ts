/**
 * The flythrough's crowd anchor: which end of the scored ray each constant names.
 *
 * This case exists because the two ends were confused twice, in opposite directions.
 * `tools/flythrough/aim.ts` builds its target as `camera + (sin az, cos az) * d` —
 * its azimuth is the direction the camera **looks** — while the controls and
 * `CameraSnapshot.azimuth` put the camera at `target + (sin az, cos az) * d`, where
 * the same field is the direction from the target **to** the camera. One number, two
 * conventions, 180 degrees apart, and `plan.ts` hands the scorer's number straight to
 * the controls. A reader who takes `CROWD_AZIMUTH` for the flight's own bearing gets
 * a camera 53.1 m from the pose that photographed the crowd; a reader who "fixes" the
 * pair so that its mutual bearing equals `CROWD_AZIMUTH` moves the approach's own pan
 * target onto the far side of the crowd and changes what flies.
 *
 * The convention is settled here from the passing run's manifest —
 * `artifacts/flythrough2/manifest.json`, the run whose frames resolve — and not from
 * a comment. Its crowd leg opened at camera `(462.439, 442.423)` against target
 * `(459.056, 416.724)`, `azimuth` 0.1308997, `distance` 26.000001, and its opening
 * pose (`overview` frame 0) put the camera at `(216.341, 554.452, 216.341)` around a
 * target of `(0, 15.2, 0)` at `azimuth` 0.7853982 and 620 m — the controls' formula,
 * to the millimetre. The crowd leg's own 26.0000 m separation at a bearing of
 * 187.50 degrees is the same formula with the crowd's numbers in it.
 *
 * The bound: this case reads constants and the run's recorded numbers. It does not
 * run a browser, does not read a dump, and cannot prove which pose holds the crowd —
 * `node tools/flythrough/aim.ts --dump artifacts/crowd-aim-fix/dump-t3000.json` is
 * that measurement, and it reports the aim camera's near counts (152, 99, 95, 100,
 * 100, 10 walking bodies inside 45 m at ticks 3,000 to 7,200) for the scored pose.
 * What it proves is that the exported pair, the derived flown camera and the route's
 * own pans and pushes all name the same two ends of one ray, so an edit that swaps
 * them fails here rather than 53 m away in a frame.
 */

import { describe, expect, it } from "vitest";

import {
  CROWD_AIM_CAMERA,
  CROWD_ANCHOR_DISTANCE_M,
  CROWD_AZIMUTH,
  CROWD_DISTANCE_M,
  CROWD_END_DISTANCE_M,
  CROWD_FLOWN_CAMERA,
  CROWD_TARGET,
  LEGS,
} from "../tools/flythrough/plan.js";
import { shortestAngle } from "../tools/flythrough/driver.js";

/** `PI`, spelled once; the run's own records are the source of the pair below. */
const PI = Math.PI;

/**
 * The passing run's own crowd-leg numbers, quoted from its manifest.
 *
 * The camera is the opening frame's `position` and the target its `target`, the
 * azimuth its `azimuth` and the distance its `distance`. Its `overview` frame 0 is
 * quoted too, as the control that shows which formula the app itself uses.
 */
const RUN = Object.freeze({
  crowdCamera: { x: 462.4393453207569, y: 17.23174136272225, z: 442.4229529025266 },
  crowdTarget: { x: 459.05604178070087, y: 15.2, z: 416.7242111235525 },
  crowdAzimuth: 0.13089969389959513,
  crowdDistance: 26.00000086214503,
  openingAzimuth: 0.7853981633974483,
  openingPolar: 0.5160774975073767,
  openingDistance: 620.0000000000008,
  openingCamera: { x: 216.34131850377113, z: 216.34131850377116 },
  openingTarget: { x: 0, z: 0 },
  /** The approach's last step's own pan residual, metres. */
  approachPanErrorAfter: 0.9089879355061946,
});

/** The bearing from a target to the camera, the controls' own convention. */
function bearingToCamera(camera: { x: number; z: number }, target: { x: number; z: number }): number {
  return Math.atan2(camera.x - target.x, camera.z - target.z);
}

/**
 * The camera the controls put on `target` at `azimuth` and `polar`.
 *
 * It is `camera.ts`'s own opening-pose arithmetic: the horizontal offset from the
 * target is `distance * sin(polar)` along the azimuth, and the height above it is
 * `distance * cos(polar)`. The `sin(polar)` term is not decoration — dropping it is
 * what this case caught in its own first draft, 314 m out.
 */
function controlsCamera(
  target: { x: number; z: number },
  azimuth: number,
  polar: number,
  distance: number,
): { x: number; z: number } {
  const horizontal = Math.sin(polar) * distance;
  return { x: target.x + Math.sin(azimuth) * horizontal, z: target.z + Math.cos(azimuth) * horizontal };
}

function leg(name: string): readonly { panToX?: number; panToZ?: number; standAtM?: number }[] {
  const found = LEGS.find((candidate) => candidate.name === name);
  if (found === undefined) {
    throw new Error(`The plan has no "${name}" leg, so this check has nothing to read. The route is ${LEGS.map((each) => each.name).join(", ")}.`);
  }
  return found.steps;
}

describe("the flythrough's crowd anchor", () => {
  it("names the scored pose's two ends, and the flown camera is the other end of that ray", () => {
    // The runtime convention, from the app's own opening pose: the controls put the
    // camera at `target + (sin, cos) * distance` of the azimuth they report.
    const controlCamera = controlsCamera(RUN.openingTarget, RUN.openingAzimuth, RUN.openingPolar, RUN.openingDistance);
    expect(
      Math.hypot(controlCamera.x - RUN.openingCamera.x, controlCamera.z - RUN.openingCamera.z),
      `the app's opening pose records camera (${RUN.openingCamera.x}, ${RUN.openingCamera.z}) at azimuth ` +
        `${RUN.openingAzimuth} and ${RUN.openingDistance} m, and the controls' own formula puts it at ` +
        `(${controlCamera.x.toFixed(3)}, ${controlCamera.z.toFixed(3)}). The bearing convention this case rests on ` +
        "is read off that formula, so a mismatch means the run's records or the formula have moved, not that the anchor has.",
    ).toBeLessThan(0.01);

    // The same convention on the crowd leg's opening frame: the controls' reported
    // azimuth is exactly the bearing from the target to the camera — 7.50 degrees,
    // the number the plan hands them — and the ray's other end is 187.50 degrees, so
    // the flight's own bearing is `CROWD_AZIMUTH` + PI.
    const controlsBearing = bearingToCamera(RUN.crowdCamera, RUN.crowdTarget);
    // The controls' `distance` is the full 3D separation: the camera stands 3.04 m
    // above the pinned target, so the ground-plane separation is 25.92 m of it.
    const runSeparation = Math.hypot(
      RUN.crowdCamera.x - RUN.crowdTarget.x,
      RUN.crowdCamera.y - RUN.crowdTarget.y,
      RUN.crowdCamera.z - RUN.crowdTarget.z,
    );
    expect(
      Math.abs(shortestAngle(controlsBearing - RUN.crowdAzimuth)),
      `the run's crowd leg recorded azimuth ${((RUN.crowdAzimuth * 180) / PI).toFixed(3)} degrees and its target and ` +
        `camera are at a target-to-camera bearing of ${((controlsBearing * 180) / PI).toFixed(3)}. The controls report ` +
        "the azimuthal angle of the camera around its target, so those are the same number; a difference here would mean " +
        "the run's records no longer show which convention it flew",
    ).toBeLessThan(1e-9);
    expect(Math.abs(runSeparation - RUN.crowdDistance)).toBeLessThan(0.01);

    // The exported pair is the scored pose: the aim camera 26 m from the target, at
    // the azimuth the scorer means — the direction the camera looks. Read from the
    // target to the camera that is the same angle plus 180 degrees.
    const aimBearing = bearingToCamera(CROWD_AIM_CAMERA, CROWD_TARGET);
    expect(
      Math.abs(shortestAngle(aimBearing - (CROWD_AZIMUTH + PI))),
      `CROWD_AIM_CAMERA is at a target-to-camera bearing of ${((aimBearing * 180) / PI).toFixed(3)} degrees from ` +
        `CROWD_TARGET where CROWD_AZIMUTH plus 180 is ${(((CROWD_AZIMUTH + PI) * 180) / PI).toFixed(3)}. The scorer ` +
        "builds its target as `camera + (sin az, cos az) * distance`, so the exported camera sits 26 m *behind* the " +
        "target: the target is ahead of it at exactly `CROWD_AZIMUTH`, and the pair's own bearing is that plus a half turn",
    ).toBeLessThan(1e-9);
    expect(Math.abs(CROWD_ANCHOR_DISTANCE_M - CROWD_DISTANCE_M)).toBeLessThan(0.5);

    // The flown camera is the other end: the same ray, the same distance, and its
    // target-to-camera bearing is the same `CROWD_AZIMUTH` — because the controls
    // measure the azimuth from the target to the camera, which is the direction the
    // scorer calls the look direction. That equality is the inversion: one number,
    // two meanings, and the two cameras sit 180 degrees apart on that one line.
    const flownBearing = bearingToCamera(CROWD_FLOWN_CAMERA, CROWD_TARGET);
    const flownSeparation = Math.hypot(CROWD_FLOWN_CAMERA.x - CROWD_TARGET.x, CROWD_FLOWN_CAMERA.z - CROWD_TARGET.z);
    expect(
      Math.abs(shortestAngle(flownBearing - CROWD_AZIMUTH)),
      `CROWD_FLOWN_CAMERA is at a target-to-camera bearing of ${((flownBearing * 180) / PI).toFixed(3)} degrees from ` +
        `CROWD_TARGET and CROWD_AZIMUTH is ${((CROWD_AZIMUTH * 180) / PI).toFixed(3)}: the controls read the azimuth as ` +
        "the direction from the target to the camera, so the camera they fly stands on the far side of the target at " +
        "exactly the number the plan hands them — which is the same number the scorer uses for the look direction",
    ).toBeLessThan(1e-9);
    expect(Math.abs(flownSeparation - CROWD_DISTANCE_M)).toBeLessThan(1e-6);

    // The two cameras are one line apart, and the distance between them is the whole
    // point of this case: 52 m, not a metre of pan residual.
    const between = Math.hypot(CROWD_FLOWN_CAMERA.x - CROWD_AIM_CAMERA.x, CROWD_FLOWN_CAMERA.z - CROWD_AIM_CAMERA.z);
    expect(
      between,
      `the aim camera and the flown camera are ${between.toFixed(2)} m apart. They are the two ends of one scored ray, ` +
        `so the separation is twice ${CROWD_DISTANCE_M} m; a smaller number means one of them has been moved onto the ` +
        "other's side, which is the 180 degree error this case exists to catch",
    ).toBeGreaterThan(2 * CROWD_DISTANCE_M - 0.5);

    // And the flown camera is where the run found it, within the approach's own
    // recorded pan residual — not 53 m away.
    expect(
      Math.hypot(CROWD_FLOWN_CAMERA.x - RUN.crowdCamera.x, CROWD_FLOWN_CAMERA.z - RUN.crowdCamera.z),
      `CROWD_FLOWN_CAMERA is (${CROWD_FLOWN_CAMERA.x.toFixed(3)}, ${CROWD_FLOWN_CAMERA.z.toFixed(3)}) and the passing ` +
        `run opened its crowd leg at (${RUN.crowdCamera.x.toFixed(3)}, ${RUN.crowdCamera.z.toFixed(3)}). The derived ` +
        "camera is the pan's answer and the run's is the pan's answer plus its own residual, so this is the check that " +
        "the two are the same pose rather than two poses 53 m apart",
    ).toBeLessThan(1.5);
    expect(Math.hypot(CROWD_AIM_CAMERA.x - RUN.crowdCamera.x, CROWD_AIM_CAMERA.z - RUN.crowdCamera.z)).toBeGreaterThan(50);

    // What the route itself reads: the approach pans to `CROWD_TARGET`, the crowd
    // leg's push runs the aim camera's way along the ray, and both come off this pair.
    const target = { x: CROWD_TARGET.x, z: CROWD_TARGET.z };
    for (const step of leg("approach")) {
      expect(Math.hypot((step.panToX ?? Number.NaN) - target.x, (step.panToZ ?? Number.NaN) - target.z)).toBeLessThan(1e-9);
    }
    // `CROWD_DISTANCE_M` is where the crowd leg opens and the ascent closes from.
    const pushSteps = leg("crowd").filter((step) => step.standAtM !== undefined && step.panToX === undefined);
    expect(pushSteps.length).toBe(6);
    expect(CROWD_END_DISTANCE_M).toBe(CROWD_DISTANCE_M - 7.2);
  });
});
