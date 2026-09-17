/**
 * When the damped controls have finished gliding.
 *
 * `OrbitControls` damping is a first-order lag and never terminates. Each
 * `update()` applies `dampingFactor` of whatever residual it holds and then
 * multiplies that residual by `1 - dampingFactor`, so the camera keeps moving
 * forever, by a factor of 0.92 a frame, and stops only when the arithmetic runs
 * out of significand.
 *
 * That is not obviously a defect until something asks whether the camera has
 * stopped. `src/app.ts` asks exactly that, with a 1e-7 bar on the elements of
 * `camera.matrixWorld`, and hands the answer to the post chain's temporal
 * accumulation — which holds still only for a camera that holds still. Measured
 * on the hardware renderer on 2026-09-16 (`artifacts/post-chain/REPORT.md`): at
 * the pose the hero frames are captured from, the glide crosses 1e-7 m per
 * frame 460 frames after the last pointer input, and `hero.spec.ts` reads the
 * accumulator at frame 378. Every hero frame in the last capture was therefore
 * taken with `taaAccumulating: false, taaSamples: 0`, exactly as
 * `artifacts/gate-timing/REPORT.md` found.
 *
 * The bar below is not that bar, and it is not a loosening of it. It is the
 * point at which the glide stops being able to change the picture, expressed in
 * the picture's own unit: **one pixel**. Everything the damping still holds at
 * that moment would move the view by less than a pixel, so ending it discards
 * nothing visible — and once ended, the camera is at an exact fixed point, which
 * is what the stricter bar upstream was always asking for. The 1e-7 comparison
 * is left exactly as it was.
 *
 * The alternative — raising the 1e-7 bar until the glide crosses it sooner —
 * was rejected: it makes the predicate agree with the damping instead of making
 * the damping stop, and it would still be a race against the harness's shutter.
 */

import { Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * How much glide, in pixels at the pivot distance, may still be dropped.
 *
 * One pixel is the smallest motion that can change a pixel, so a bar of one is
 * the largest value that cannot be called visible. It is also what decides the
 * frame the camera comes to rest on: measured, this fires about 70 frames after
 * the last pointer input where the 1e-7 bar needed 460, which is the difference
 * between the accumulator being at zero at the harness's shutter and being at
 * its full count.
 */
export const REST_PIXELS = 1;

/** What one frame of the damped glide is doing, in the units the picture sees. */
export interface RestObservation {
  /** Metres the camera moved relative to its pivot this frame. */
  orbitM: number;
  /** Metres the pivot itself moved this frame. */
  panM: number;
  /** Metres from the camera to its pivot. */
  radiusM: number;
  /** Vertical field of view, radians. */
  fovRadians: number;
  /** Drawing-buffer height in pixels. */
  viewportHeightPx: number;
}

/** Radians one pixel of the frame covers at the centre of the view. */
export function pixelAngle(fovRadians: number, viewportHeightPx: number): number {
  const height = Math.max(viewportHeightPx, 1);
  return (2 * Math.tan(fovRadians / 2)) / height;
}

/**
 * Metres one pixel covers at the pivot distance.
 *
 * A rotation moves a surface by the same number of pixels whatever its distance,
 * because the pixel's own size grows with distance at the same rate. A pan does
 * not: it moves the near facade more pixels than the far one. The pivot is
 * therefore the honest scale for a rotation and the generous one for a pan, and
 * the residual a pan leaves behind is bounded by this number at the pivot and by
 * proportionally more on anything in front of it. On the hero poses there is no
 * pan at all — the poses are reached with drags and wheel ticks — so this is the
 * bound for the case that is not measured rather than the case that is.
 */
export function pixelAtPivot(radiusM: number, fovRadians: number, viewportHeightPx: number): number {
  return radiusM * pixelAngle(fovRadians, viewportHeightPx);
}

/**
 * Everything the damping still holds, in metres of view motion.
 *
 * `update()` applies `dampingFactor` of the residual and keeps `1 -
 * dampingFactor` of it, so one frame's motion divided by the damping factor is
 * the total the glide has left in it. A factor outside (0, 1) means damping is
 * off and there is no residual to speak of.
 */
export function glideM(orbitM: number, panM: number, dampingFactor: number): number {
  if (!(dampingFactor > 0 && dampingFactor < 1)) return 0;
  return (orbitM + panM) / dampingFactor;
}

/** True when the glide the damping still holds could not move the picture a pixel. */
export function isAtRest(observation: RestObservation, dampingFactor: number): boolean {
  const glide = glideM(observation.orbitM, observation.panM, dampingFactor);
  return glide <= REST_PIXELS * pixelAtPivot(observation.radiusM, observation.fovRadians, observation.viewportHeightPx);
}

/**
 * `state` is public on `OrbitControls` and is not in `@types/three`.
 *
 * Same shape as the `accumulateIndex` widening in `src/render/post.ts`, and for
 * the same reason: three ships a real field its own declarations leave out, and
 * the alternative is to infer from the pose whether a hand is on the canvas,
 * which cannot be done — a slow drag and a dying glide look identical from the
 * pose alone. `OrbitControls`' own `_STATE.NONE` is -1.
 */
type Stateful = OrbitControls & { state: number };

const IDLE_STATE = -1;

export interface ControlRest {
  /** Put the original `update` back. */
  remove(): void;
  /** Frames so far on which the glide was ended. */
  rests: number;
}

/**
 * End the glide as soon as it can no longer change the picture.
 *
 * Applied to `controls.update`, which the app calls once a frame and nowhere
 * else. On a frame where the residual is worth less than a pixel the control is
 * stepped once with damping off: that applies the whole residual, which is at
 * most a pixel, and zeroes both residuals outright, so the frames after it
 * produce an identical pose and `camera.matrixWorld` stops changing. Damping is
 * switched straight back on, so nothing outside this function can observe it.
 *
 * The `state` guard keeps a hand on the canvas out of it. Without it a drag slow
 * enough to move under a pixel a frame would be applied undamped, so the same
 * gesture would ease at speed and run one-to-one when drawn out.
 */
export function installControlRest(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  canvas: { clientHeight: number },
): ControlRest {
  const original = controls.update.bind(controls);
  const positionBefore = new Vector3();
  const targetBefore = new Vector3();
  const offsetBefore = new Vector3();
  const offsetAfter = new Vector3();

  const rest: ControlRest = {
    remove(): void {
      controls.update = original;
    },
    rests: 0,
  };

  controls.update = (deltaTime?: number | null): boolean => {
    positionBefore.copy(camera.position);
    targetBefore.copy(controls.target);

    const changed = original(deltaTime);

    offsetBefore.copy(positionBefore).sub(targetBefore);
    offsetAfter.copy(camera.position).sub(controls.target);

    const observation: RestObservation = {
      orbitM: offsetAfter.distanceTo(offsetBefore),
      panM: controls.target.distanceTo(targetBefore),
      radiusM: offsetAfter.length(),
      fovRadians: camera.fov * (Math.PI / 180),
      viewportHeightPx: canvas.clientHeight,
    };

    if ((controls as Stateful).state !== IDLE_STATE) return changed;
    if (!isAtRest(observation, controls.dampingFactor)) return changed;

    const damping = controls.enableDamping;
    controls.enableDamping = false;
    original(deltaTime);
    controls.enableDamping = damping;
    rest.rests += 1;
    return true;
  };

  return rest;
}
