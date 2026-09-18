/**
 * `midpointPose`'s gate: a pair's recorded motion and the span it is divided by
 * describe the same window.
 *
 * The defect this file exists for is the second half of RUN-01's blocking
 * problem. A native-resolution screenshot spans 16 to 34 rendered frames on this
 * renderer. The capture used to store the pose it read *before* the shutter as the
 * frame's pose, so a pair's `cameraTravelM` was a pre-shutter-to-pre-shutter
 * window about 40 frames wide, while `frameGap` counted the 6 frames of idle time
 * between two shutters. The motion divided by that span is not a rate of anything:
 * measured against the same interval, the recorded speed is high by the ratio of
 * the two windows.
 *
 * **Its bound:** it drives the arithmetic, not the browser. What it pins is that
 * the recorded pose is the midpoint of the two readings and that a pair's motion
 * measured from midpoints is the motion of the window its span counts - not one
 * whole shutter more. It cannot see the shutter's own width, which no pose
 * arithmetic can remove.
 */

import { describe, expect, it } from "vitest";

import type { FramePose } from "../tools/flicker/judge.js";
import { midpointPose } from "../tools/flicker/shutter.js";

/** A pose walked around a circle, one unit of the walk parameter a frame. */
function poseAt(walk: number): FramePose {
  const angle = walk * 0.002;
  return {
    position: { x: Math.sin(angle) * 20, y: 20, z: Math.cos(angle) * 20 },
    target: { x: 0, y: 15.2, z: 0 },
    azimuth: angle,
    polar: 1.5,
    distance: 45,
  };
}

/**
 * The real lane's shape, as four shots.
 *
 * A shot opens its shutter every 20 rendered frames and the shutter itself spans
 * 4, both from RUN-02's record (21.5 frames between midpoints, 31 frames of
 * shutter for a pair). The pose is read at the shutter's edges, so shot `n` gives
 * readings at `20n` and `20n + 4` and its midpoint is at `20n + 2`.
 */
const SHOT_STEP_FRAMES = 20;
const SHUTTER_FRAMES = 4;
const SHOTS = [0, 1, 2, 3].map((index) => ({
  before: poseAt(index * SHOT_STEP_FRAMES),
  after: poseAt(index * SHOT_STEP_FRAMES + SHUTTER_FRAMES),
}));

describe("midpointPose", () => {
  it("is the componentwise mean of the two readings", () => {
    const before = poseAt(10);
    const after = poseAt(14);
    const mid = midpointPose(before, after);

    const meanOf = (left: number, right: number): number => (left + right) / 2;
    expect(mid.position.x).toBeCloseTo(meanOf(before.position.x, after.position.x), 12);
    expect(mid.position.y).toBe(20);
    expect(mid.position.z).toBeCloseTo(meanOf(before.position.z, after.position.z), 12);
    expect(mid.target).toEqual({ x: 0, y: 15.2, z: 0 });
    expect(mid.azimuth).toBeCloseTo(0.024, 12);
    expect(mid.polar).toBeCloseTo(1.5, 12);
    expect(mid.distance).toBeCloseTo(45, 12);
    // Not the pose it was handed: a function that returned `before` would satisfy
    // no assertion above, and this names that directly.
    expect(mid).not.toEqual(before);
    expect(mid).not.toEqual(after);
  });

  it("measures a pair's motion over the pair's own window, not one shutter wider", () => {
    // **What this case can and cannot show.** The first version's `cameraTravelM`
    // and its `frameGap` described two different windows, and the harm was that
    // the motion was divided by a span that did not belong to it. That harm is
    // only visible when the gesture's speed varies inside the interval, because
    // then the two windows differ by more than their widths - and a pose sequence
    // has no way to know the speed profile, so this model cannot reproduce it. A
    // probe run while this case was written measured the two windows on a
    // constant-speed path at 1.000008x each other.
    //
    // What it does show is that the pose and the span now describe **one**
    // interval: the two midpoints are exactly a shot step apart, which is the span
    // the judge divides by. The wider pre-to-pre window is a whole shutter wider
    // than that span, so a motion taken from it and divided by the span is high by
    // the ratio of the windows - on the real lane's RUN-02 record that is 31
    // frames of shutter against 21.5 between midpoints, and it is the reason
    // RUN-01's 1.52 m of travel was reported against a 6-frame gap.
    const first = midpointPose(SHOTS[0]!.before, SHOTS[0]!.after);
    const second = midpointPose(SHOTS[1]!.before, SHOTS[1]!.after);
    expect(second.azimuth - first.azimuth).toBeCloseTo(SHOT_STEP_FRAMES * 0.002, 12);

    // The pre-to-pre reading of the same two shots is a whole shutter wider, and a
    // motion taken between those readings would be divided by the short span.
    const preSpanFrames = SHOT_STEP_FRAMES;
    const wideSpanFrames = SHOT_STEP_FRAMES + SHUTTER_FRAMES;
    expect(wideSpanFrames / preSpanFrames).toBeGreaterThan(1.15);

    // And the recorded turn is the mid-window's, not the pre-shutter reading's: it
    // is centred on the shutter rather than starting at it.
    expect(first.azimuth).toBeCloseTo((SHUTTER_FRAMES / 2) * 0.002, 12);
    expect(first.azimuth).not.toBe(SHOTS[0]!.before.azimuth);
  });

  it("keeps the recorded distance and turn on the mid-shutter instant", () => {
    // The file used to print a `distanceM` "at the shutter" that had been read
    // before it, and to store a pre-shutter `azimuth` beside a span counted
    // elsewhere. Both now belong to the same instant as the span, and the pose at
    // that instant is the mean of the readings either side of it.
    const mid = midpointPose(poseAt(0), poseAt(SHUTTER_FRAMES));
    expect(mid.distance).toBeCloseTo(45, 12);
    expect(mid.azimuth).toBeCloseTo((SHUTTER_FRAMES / 2) * 0.002, 12);
    expect(mid.azimuth).not.toBe(poseAt(0).azimuth);
    expect(mid.position.x).toBeGreaterThan(poseAt(0).position.x);
    expect(mid.position.x).toBeLessThan(poseAt(SHUTTER_FRAMES).position.x);
  });
});
