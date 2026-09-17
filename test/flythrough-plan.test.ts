/**
 * The flythrough route's two swings, flown through the driver's own rotate arithmetic.
 *
 * A leg's bearing is written as an absolute azimuth per step, and the step that
 * delivers it is capped twice: by the leg's `turnStepRad` and by `maxRotatePx`,
 * the longest drag the pointer may make in one gesture. At this lane's 1280x720
 * capture that second cap is 40 px for 0.3491 rad, and it is the one that binds,
 * because the plan asks for 0.5 and 0.6 rad steps. A swing whose per-step ask
 * exceeds 0.3491 rad arrives short, and nothing in the run says so: the driver
 * reports `remainingRad` and the leg opens wherever the camera got to. That is
 * the defect this case exists for. The approach leg's swing was written the long
 * way round — 7.7231 rad from `OPENING_AZIMUTH` to `CROWD_AZIMUTH`, 1.2872 rad a
 * step — and the driver delivered 0.3491 rad a step, with its shortest-angle
 * arithmetic flipping sign twice, ending the approach at azimuth 1.2872 against
 * the 2.2253 the crowd leg's first frame needed. The crowd leg then opened on a
 * hill face and its frames failed the clearance check.
 *
 * The bound on this case is stated rather than implied: it flies the plan's own
 * azimuth targets through `rotateStepRadians`, `shortestAngle` and the capture
 * viewport from the shipping code, and asserts where each swing ends. It cannot
 * prove the browser's input path delivers the drag — only a run of the lane can —
 * and it says nothing about the damping tail, which the run's own pose records
 * carry. What it does prove is that the plan's swings are inside the cap the
 * driver delivers, which is a property of the numbers alone.
 */

import { describe, expect, it } from "vitest";

import { rotateStepRadians, shortestAngle } from "../tools/flythrough/driver.js";
import { CROWD_AZIMUTH, LEGS, OPENING_AZIMUTH, type Leg } from "../tools/flythrough/plan.js";
import { CAPTURE_VIEWPORT } from "../tools/visual/shots.js";

/** The longest drag `turnTo` may dispatch in one gesture; `FlythroughDriver`'s default. */
const MAX_ROTATE_PX = 40;
/** `turnTo`'s own default when a step does not name a `turnStepRad`. */
const DEFAULT_TURN_STEP_RAD = 0.25;
/** How close a swing has to land to count as reaching its bearing. */
const TOLERANCE_RAD = 0.05;

function leg(name: string): Leg {
  const found = LEGS.find((candidate) => candidate.name === name);
  if (found === undefined) {
    throw new Error(
      `The plan has no "${name}" leg, so this check has nothing to fly. The route is ${LEGS.map((each) => each.name).join(", ")}.`,
    );
  }
  return found;
}

/**
 * Fly one leg's bearing steps the way `FlythroughDriver.turnTo` does.
 *
 * Each step names an absolute azimuth, `shortestAngle` picks the signed
 * difference to it, and `rotateStepRadians` says what the controls deliver of
 * that difference. The pose is read back between steps in the driver, and the
 * arithmetic here is the same function it reads it with, so a step that arrives
 * short arrives short here too.
 */
function flyBearing(steps: Leg["steps"], from: number): number {
  let azimuth = from;
  for (const step of steps) {
    if (step.turnToAzimuth === undefined) continue;
    const delta = shortestAngle(step.turnToAzimuth - azimuth);
    const turn = rotateStepRadians(delta, {
      maxStepRad: step.turnStepRad ?? DEFAULT_TURN_STEP_RAD,
      canvasHeightPx: CAPTURE_VIEWPORT.height,
      maxRotatePx: MAX_ROTATE_PX,
    });
    azimuth += turn.deliveredRad;
  }
  return azimuth;
}

describe("the flythrough plan's swings", () => {
  it("opens the crowd leg on the crowd's bearing and lands the ascent back on the opening one", () => {
    // The overview leg holds OPENING_AZIMUTH, so this is where the approach starts.
    const approachEnd = flyBearing(leg("approach").steps, OPENING_AZIMUTH);
    expect(
      Math.abs(shortestAngle(approachEnd - CROWD_AZIMUTH)),
      `the approach leg delivers the camera to azimuth ${approachEnd.toFixed(4)} rad and the crowd leg's first ` +
        `frame needs ${CROWD_AZIMUTH.toFixed(4)}. The crowd leg opens wherever the swing stopped, so a swing ` +
        `outside the driver's ${(MAX_ROTATE_PX * ((2 * Math.PI) / CAPTURE_VIEWPORT.height)).toFixed(4)} rad a step ` +
        `cap lands it on the wrong side of the knot`,
    ).toBeLessThan(TOLERANCE_RAD);

    // The crowd leg holds CROWD_AZIMUTH, so that is where the ascent starts.
    const ascentEnd = flyBearing(leg("ascent").steps, CROWD_AZIMUTH);
    expect(
      Math.abs(shortestAngle(ascentEnd - OPENING_AZIMUTH)),
      `the ascent leg delivers the camera to azimuth ${ascentEnd.toFixed(4)} rad and the flight has to close at ` +
        `the app's opening bearing ${OPENING_AZIMUTH.toFixed(4)} rad, so the last frame is comparable with the first`,
    ).toBeLessThan(TOLERANCE_RAD);
  });
});
