/**
 * harness: OrbitControls driven through its real pointer handlers, no browser.
 *
 * The defect these cases cover, as it was seen: the dusk post chain reported
 * `taaAccumulating: false, taaSamples: 0` at every hero shutter on both
 * renderers (`artifacts/gate-timing/REPORT.md`). The cause was not the post
 * chain. It was that the app's stillness witness compares the elements of
 * `camera.matrixWorld` against 1e-7, and a camera on `OrbitControls` damping
 * never satisfies a bar that fine: the residual decays by 0.92 a frame and
 * never reaches zero, so the strictest predicate in the app could only be met
 * by the arithmetic running out of significand. Measured on hardware, that was
 * 460 frames after the last pointer input, while the gate reads the accumulator
 * at frame 378 (`artifacts/post-chain/REPORT.md`).
 *
 * The check below is the app's own witness, restated exactly: the same sixteen
 * `matrixWorld` elements, the same 1e-7 bar, the same one-frame-apart
 * comparison. What it adds is a bounded number of frames. `FRAMES_ALLOWED` is
 * the gate: 120 frames is 2 s at 60 fps, which is far past what a glide that
 * ends when it stops being visible needs and far short of the 460 the damping
 * tail needs on its own.
 *
 * Bound of this file: no renderer draws anything, so it proves the camera
 * reaches rest and says nothing about what the frames look like. The frames are
 * `tools/post-chain/post-chain.spec.ts`'s business, on the hardware renderer.
 */

import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { createCameraRig } from "../src/render/camera.js";
import { installControlRest, isAtRest, pixelAtPivot, REST_PIXELS } from "../src/render/controls-rest.js";

const VIEWPORT_HEIGHT = 720;
const FRAMES_ALLOWED = 120;

/**
 * A canvas with only what `OrbitControls` touches.
 *
 * The rig is built by `createCameraRig`, so the rest rule under test is the one
 * the app installs rather than a copy of it.
 */
class Canvas extends EventTarget {
  clientWidth = 1280;
  clientHeight = VIEWPORT_HEIGHT;
  style = {};
  private readonly document = new EventTarget();
  getRootNode(): EventTarget { return this.document; }
  setPointerCapture(): void { /* no browser pointer to capture */ }
  releasePointerCapture(): void { /* no browser pointer to release */ }
  send(type: string, clientX: number, clientY: number): void {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, pointerType: "mouse", button: 0, clientX, clientY, ctrlKey: false, shiftKey: false, metaKey: false });
    this.dispatchEvent(event);
  }
}

/** One pointer drag, delivered the way the browser delivers it. */
function drag(canvas: Canvas, fromY: number, toY: number, moves = 12): void {
  canvas.send("pointerdown", 640, fromY);
  for (let index = 1; index <= moves; index += 1) {
    canvas.send("pointermove", 640, fromY + ((toY - fromY) * index) / moves);
  }
  canvas.send("pointerup", 640, toY);
}

/**
 * The app's stillness witness, character for character from `src/app.ts`.
 *
 * Returned as a function so a caller can ask it frame by frame; it keeps the
 * previous matrix, which is the whole of its state.
 */
function stillnessWitness(camera: PerspectiveCamera): () => boolean {
  // Primed the way the app primes it: `matrixWorld` is only composed by a
  // render, so it is stale identity until something calls this once.
  camera.updateMatrixWorld(true);
  const last = camera.matrixWorld.elements.slice();
  return (): boolean => {
    camera.updateMatrixWorld(true);
    let still = true;
    const elements = camera.matrixWorld.elements;
    for (let index = 0; index < 16; index += 1) {
      if (Math.abs(elements[index]! - last[index]!) > 1e-7) still = false;
      last[index] = elements[index]!;
    }
    return still;
  };
}

describe("the damped controls come to rest", () => {
  it("stops the glide, and the app's own 1e-7 witness sees it, inside the frame budget", () => {
    const canvas = new Canvas();
    const rig = createCameraRig(canvas as unknown as HTMLCanvasElement);
    try {
      const witness = stillnessWitness(rig.camera);
      drag(canvas, 300, 380);

      let restedAt = -1;
      for (let frame = 1; frame <= FRAMES_ALLOWED; frame += 1) {
        rig.controls.update();
        if (witness()) { restedAt = frame; break; }
      }

      expect(
        restedAt,
        `the camera was still moving after ${FRAMES_ALLOWED} frames, so the app's own stillness ` +
          "witness — the one the post chain's temporal accumulation reads — never turns true and " +
          "no captured frame can carry a single accumulated sample.",
      ).toBeGreaterThan(0);

      // And it stays put: an exact fixed point, not a frame that happened to be
      // quiet. 200 further frames is more than the 32 the accumulator needs.
      for (let frame = 0; frame < 200; frame += 1) {
        rig.controls.update();
        expect(witness(), "the camera started moving again with no input to move it").toBe(true);
      }
    } finally {
      rig.controls.dispose();
    }
  });

  it("leaves a camera that was never touched exactly where it was", () => {
    const canvas = new Canvas();
    const rig = createCameraRig(canvas as unknown as HTMLCanvasElement);
    try {
      const before = rig.camera.position.clone();
      const witness = stillnessWitness(rig.camera);
      for (let frame = 0; frame < 200; frame += 1) {
        rig.controls.update();
        expect(witness()).toBe(true);
      }
      expect(rig.camera.position.distanceTo(before)).toBeLessThan(1e-7);
    } finally {
      rig.controls.dispose();
    }
  });

  it("does not end the glide while a hand is on the canvas", () => {
    // The guard that keeps a slow drag damped. Without it a drag whose finger
    // moves under a pixel a frame would be applied at full rate, so the same
    // gesture would ease when flicked and run one-to-one when drawn out.
    const canvas = new Canvas();
    const camera = new PerspectiveCamera(55, 1280 / VIEWPORT_HEIGHT, 1, 8000);
    const controls = new OrbitControls(camera, canvas as unknown as HTMLElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 15.2, 0);
    controls.update();
    const rest = installControlRest(camera, controls, canvas);
    try {
      canvas.send("pointerdown", 640, 300);
      for (let frame = 0; frame < 30; frame += 1) {
        canvas.send("pointermove", 640, 300 + frame * 0.5);
        controls.update();
      }
      expect(rest.rests, "the glide was ended while the pointer was still down").toBe(0);
      canvas.send("pointerup", 640, 315);
    } finally {
      rest.remove();
      controls.dispose();
    }
  });

  it("keeps the residuals' worth under a pixel at the pivot distance", () => {
    // What the bar means, stated as arithmetic: a glide of one pixel at the
    // pivot is at rest, a glide of two is not, and the pixel it is measured in
    // is the frame's own.
    const fov = (55 * Math.PI) / 180;
    const pixel = pixelAtPivot(45, fov, VIEWPORT_HEIGHT);
    // Derived by hand: a 55 degree vertical field of view over 720 pixels is
    // 2 * tan(27.5 degrees) / 720 = 1.44602e-3 radians a pixel, and 45 m of
    // radius makes that 0.065071 m at the pivot.
    expect(pixel).toBeCloseTo(0.065071, 6);

    const at = (metres: number) => isAtRest(
      { orbitM: metres * 0.08, panM: 0, radiusM: 45, fovRadians: fov, viewportHeightPx: VIEWPORT_HEIGHT },
      0.08,
    );
    expect(at(REST_PIXELS * pixel)).toBe(true);
    expect(at(REST_PIXELS * pixel * 1.01)).toBe(false);
    // The same angular glide is worth fewer pixels from further out, which is
    // what makes the bar a property of the picture rather than of the pose.
    expect(isAtRest(
      { orbitM: pixel * 0.08, panM: 0, radiusM: 950, fovRadians: fov, viewportHeightPx: VIEWPORT_HEIGHT },
      0.08,
    )).toBe(true);
  });

  it("says there is no glide to wait for when damping is off", () => {
    // Damping off is not a slow decay, it is no decay: `update()` applies the
    // whole residual and zeroes it, so the camera is already at rest and the
    // question does not arise. A factor of 1 zeroes the residual the same way.
    // The case that must not be called at rest is the damped one.
    const observation = { orbitM: 4, panM: 4, radiusM: 45, fovRadians: (55 * Math.PI) / 180, viewportHeightPx: VIEWPORT_HEIGHT };
    expect(isAtRest(observation, 0)).toBe(true);
    expect(isAtRest(observation, 1)).toBe(true);
    expect(isAtRest(observation, 0.08)).toBe(false);
  });

  it("reports the pivot distance the glide is measured against", () => {
    const canvas = new Canvas();
    const rig = createCameraRig(canvas as unknown as HTMLCanvasElement);
    try {
      const offset = new Vector3().copy(rig.camera.position).sub(rig.controls.target);
      expect(rig.controls.getDistance()).toBeCloseTo(offset.length(), 6);
      expect(rig.controls.getDistance()).toBeCloseTo(620, 3);
    } finally {
      rig.controls.dispose();
    }
  });
});
