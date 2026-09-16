/**
 * harness: OrbitDriver plus actual OrbitControls pointer handlers. CPU observations
 * cover duplicate frames, translation/radius, epoch and wall-clock failures; the
 * source-pinned pre-click fixture holds out the six post-click frames. Initial
 * fixture placement is not browser control evidence. Final SwiftShader dropdown
 * input and all native images remain a separate required gate.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Page } from "@playwright/test";
import { createCameraRig } from "../src/render/camera.js";
import { OrbitDriver } from "../tools/visual/orbit.js";
import { CameraSettling, cameraMovement, type CameraObservation } from "../tools/visual/settling.js";

const observation = (frame: number, x = 0): CameraObservation => ({
  epoch: 100,
  status: { ready: true, frameCount: frame, contextLost: false, error: null,
    drawingBufferWidth: 1280, drawingBufferHeight: 720, glRenderer: "CPU fixture" },
  camera: { position: { x, y: 0, z: 220 }, target: { x, y: 0, z: 0 },
    polar: Math.PI / 2, azimuth: 0, distance: 220 },
});

class Canvas extends EventTarget {
  clientWidth = 1280; clientHeight = 720; style = {};
  private readonly document = new EventTarget();
  getRootNode() { return this.document; }
  setPointerCapture() { /* CPU event target owns no browser pointer. */ }
  releasePointerCapture() { /* CPU event target owns no browser pointer. */ }
  send(type: string, clientY = 360) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 640,
      clientY, ctrlKey: false, shiftKey: false, metaKey: false });
    this.dispatchEvent(event);
  }
}

function recordedDrag() {
  const canvas = new Canvas();
  const actual = createCameraRig(canvas as unknown as HTMLCanvasElement);
  expect(actual.controls.enableDamping).toBe(true);
  expect(actual.controls.dampingFactor).toBe(0.08);
  actual.controls.dispose();
  // Actual call506 observation, before the final pointer drag and before style
  // input. The fixture is constructed before its controls exist.
  const camera = new PerspectiveCamera(55, 1280 / 720, 1, 8000);
  camera.position.set(155.17380352246698, 30.762224311945822, 155.173803522467);
  const controls = new OrbitControls(camera, canvas as unknown as HTMLElement);
  controls.target.set(0, 15.199999999999998, 0);
  controls.enableDamping = actual.controls.enableDamping;
  controls.dampingFactor = actual.controls.dampingFactor;
  controls.update();
  const start = 347.3949388765462, end = 372.6050611234539;
  canvas.send("pointerdown", Math.fround(start));
  for (let i = 1; i <= 12; i++) {
    canvas.send("pointermove", Math.fround(start + (end - start) * i / 12));
    controls.update();
  }
  canvas.send("pointerup");
  // The recorded trace does not include per-pointermove render scheduling.
  // This fixed schedule was matched to PRE-CLICK call708 only, never call720.
  for (let i = 0; i < 76; i++) controls.update();
  const read = (frame: number): CameraObservation => ({ ...observation(frame), camera: {
    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
    distance: controls.getDistance(), polar: controls.getPolarAngle(), azimuth: controls.getAzimuthalAngle(),
  } });
  return { controls, read };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("rendered camera stability", () => {
  it("does not count repeated frames, even after the minimum advanced frames", () => {
    const tracker = new CameraSettling(observation(0), "preservation");
    expect(tracker.observe(observation(12)).done).toBe(false);
    for (let i = 0; i < 1000; i++) expect(tracker.observe(observation(12)).done).toBe(false);
    expect(tracker.observe(observation(13)).done).toBe(false);
    expect(tracker.observe(observation(14)).done).toBe(true);
  });

  it("resets quiet intervals if the pose changes without a rendered frame", () => {
    const tracker = new CameraSettling(observation(0), "preservation");
    tracker.observe(observation(12)); tracker.observe(observation(13));
    expect(tracker.observe(observation(13, 0.02)).quietIntervals).toBe(0);
    expect(tracker.observe(observation(14, 0.02)).done).toBe(false);
  });

  it("rejects translation with unchanged angle/radius and scales angles by radius", () => {
    const tracker = new CameraSettling(observation(0), "preservation");
    for (let i = 1; i <= 20; i++) expect(tracker.observe(observation(i, i * 0.0001)).done).toBe(false);
    const near = observation(0), far = observation(0);
    near.camera.distance = 45; far.camera.distance = 950;
    const nearMoved = structuredClone(near), farMoved = structuredClone(far);
    nearMoved.camera.polar += 0.000001; farMoved.camera.polar += 0.000001;
    expect(cameraMovement(near.camera, nearMoved.camera).worldM).toBeLessThan(0.00008);
    expect(cameraMovement(far.camera, farMoved.camera).worldM).toBeGreaterThan(0.0009);
    const radius = observation(1); radius.camera.distance += 0.001;
    expect(cameraMovement(observation(0).camera, radius.camera).worldM).toBeGreaterThan(0.0009);
  });

  it("checks the 80 micrometre boundary independently and catches inconsistent XYZ", () => {
    for (const [step, expected] of [[0.000079, true], [0.000081, false]] as const) {
      const tracker = new CameraSettling(observation(0), "preservation");
      let result;
      for (let frame = 1; frame <= 12; frame++) result = tracker.observe(observation(frame, frame * step));
      expect(result!.done).toBe(expected);
    }
    const tracker = new CameraSettling(observation(0), "preservation");
    for (let frame = 1; frame <= 20; frame++) {
      const current = observation(frame); current.camera.position.x = frame * 0.01;
      expect(tracker.observe(current).done).toBe(false);
    }
  });

  it("rejects changed document, backwards frames, invalid pose and renderer failures", () => {
    for (const change of [
      (value: CameraObservation) => { value.epoch++; },
      (value: CameraObservation) => { value.status.frameCount = 0; },
      (value: CameraObservation) => { value.camera.position.x = NaN; },
      (value: CameraObservation) => { value.status.contextLost = true; },
      (value: CameraObservation) => { value.status.error = "observed draw failure"; },
    ]) {
      const tracker = new CameraSettling(observation(1), "preservation");
      const next = observation(2); change(next);
      expect(() => tracker.observe(next)).toThrow();
    }
  });

  it("reproduces held-out six-frame drift through unchanged upstream controls", () => {
    const rig = recordedDrag();
    try {
      const before = rig.read(373);
      expect(Math.abs(before.camera.position.y - 78.24471288336957)).toBeLessThan(0.0001);
      for (let i = 0; i < 6; i++) rig.controls.update();
      const after = rig.read(379);
      expect(Math.abs((after.camera.position.y - before.camera.position.y) - 0.012827539614974626)).toBeLessThan(0.0000001);
      expect(new CameraSettling(before, "preservation").observe(after).done).toBe(false);
      const tracker = new CameraSettling(after, "preservation");
      let at = after, finished = false;
      for (let frame = 380; frame < 600; frame++) {
        rig.controls.update(); at = rig.read(frame);
        if (tracker.observe(at).done) { finished = true; break; }
      }
      expect(finished).toBe(true);
      for (let i = 0; i < 300; i++) rig.controls.update();
      const end = rig.read(900);
      expect(cameraMovement(at.camera, end.camera).positionM).toBeLessThan(0.001);
      // The independent post-switch comparator still rejects a real 6 mm reset.
      expect(() => expect(end.camera.position.x + 0.006).toBeCloseTo(end.camera.position.x, 2)).toThrow();
    } finally { rig.controls.dispose(); }
  });

  it("rejects the actual atomic frame373 to379 pair as a preservation baseline", () => {
    const before = observation(373), after = observation(379);
    before.camera = { position: { x: 149.03919887440202, y: 78.24471288336957, z: 149.03919887440205 },
      target: { x: 0, y: 15.199999999999998, z: 0 }, distance: 220.0000032381673,
      azimuth: 0.7853981633974482, polar: 1.280154834254071 };
    after.camera = { position: { x: 149.03648550035876, y: 78.25754042298455, z: 149.0364855003588 },
      target: { x: 0, y: 15.199999999999998, z: 0 }, distance: 220.00000323816732,
      azimuth: 0.7853981633974482, polar: 1.2800939742730637 };
    const result = new CameraSettling(before, "preservation").observe(after);
    expect(result.worldM).toBeGreaterThan(0.013);
    expect(result.quietIntervals).toBe(0);
  });

  it("reads camera and frame atomically through one actual evaluate callback", async () => {
    let frame = 0, calls = 0;
    vi.stubGlobal("window", { __mapsHarness: { status: () => observation(frame).status,
      camera: () => observation(frame, frame).camera } });
    const page = { evaluate: async (fn: () => unknown) => { frame++; calls++; return fn(); } };
    const driver = new OrbitDriver(page as unknown as Page);
    const atomic = await driver.readCameraObservation();
    expect(calls).toBe(1);
    expect(atomic.status.frameCount).toBe(atomic.camera.target.x);
    const oldStatus = await driver.readStatus(), oldCamera = await driver.readCamera();
    expect(oldStatus.frameCount).not.toBe(oldCamera.target.x);
  });

  it("fails a stopped loop by measured wall time and reports the real frame", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    vi.stubGlobal("window", { __mapsHarness: { status: () => observation(12).status,
      camera: () => observation(12).camera } });
    const page = { evaluate: async (fn: () => unknown) => fn(),
      waitForTimeout: async () => { clock += 1000; } };
    await expect(new OrbitDriver(page as unknown as Page).settle()).rejects.toThrow(/frame 12.*15000 ms/);
  });

  it("bounds a continuously moving wait by actual elapsed time", async () => {
    let clock = 0, frame = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    vi.stubGlobal("window", { __mapsHarness: { status: () => observation(frame).status,
      camera: () => observation(frame, frame).camera } });
    const page = { evaluate: async (fn: () => unknown) => fn(),
      waitForTimeout: async () => { clock += 20_000; frame++; } };
    await expect(new OrbitDriver(page as unknown as Page).settle("preservation")).rejects.toThrow(/after 300000 ms: 15 frames advanced/);
  });
});
