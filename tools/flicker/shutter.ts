/**
 * What a still's recorded pose is, given that the shutter spans a third of a
 * second of camera motion.
 *
 * The capture reads the pose on both sides of every screenshot; this module is
 * the one thing it does with the two readings, kept out of the browser lane so a
 * unit case can drive it. It is here rather than inline for the same reason
 * `step.ts` is: the defect it fixes was a choice inside `capture.spec.ts`, and a
 * choice a unit case cannot reach is a choice nothing checks.
 *
 * ## The defect
 *
 * A native-resolution screenshot spans 16 to 34 rendered frames on this renderer,
 * so a single pose read *before* the shutter describes a picture that has moved
 * on by the time the bytes are taken. The first version stored that pre-shutter
 * pose as the frame's pose, and measured a pair's span as the 6 frames of idle
 * time between two shutters - so `cameraTravelM` and `cameraRotationRad`
 * described a pre-shutter-to-pre-shutter window roughly 40 frames wide while the
 * span they were divided by was 6. The two were not in fixed proportion either,
 * because the camera accelerates and decelerates inside each gesture, so the
 * bias had no single sign. It also printed a `distanceM` "at the shutter" that
 * had been read before it.
 *
 * ## What this is, and its bound
 *
 * The componentwise mean of the two readings, which is the pose of the instant
 * in the middle of the shutter - the reading the recorded pixels are nearest to.
 * It is a model, not a measurement: the camera's path between the two readings is
 * not known to be straight, and this cannot remove the shutter's own width, only
 * centre it. What it does remove is a bias of half a shutter, and what it makes
 * possible is measuring a pair's motion over the same window its span counts.
 */

import type { FramePose } from "./judge.js";

/**
 * The pose at the midpoint of a shutter, from the poses either side of it.
 *
 * **Azimuth is averaged as reported, and that is only valid unwrapped.** The
 * controls report azimuth as a running angle, and a gesture that crossed a wrap
 * inside one shutter would need half a turn in a third of a second - not a motion
 * this lane produces. The mean of `+3.1` and `-3.1` is `0`, which is the far side
 * of the circle; stated here rather than guarded, because a guard no capture can
 * reach would be code pretending to be a check.
 */
export function midpointPose(before: FramePose, after: FramePose): FramePose {
  const mean = (left: number, right: number): number => (left + right) / 2;
  return {
    position: {
      x: mean(before.position.x, after.position.x),
      y: mean(before.position.y, after.position.y),
      z: mean(before.position.z, after.position.z),
    },
    target: {
      x: mean(before.target.x, after.target.x),
      y: mean(before.target.y, after.target.y),
      z: mean(before.target.z, after.target.z),
    },
    azimuth: mean(before.azimuth, after.azimuth),
    polar: mean(before.polar, after.polar),
    distance: mean(before.distance, after.distance),
  };
}
