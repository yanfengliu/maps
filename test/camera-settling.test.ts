/**
 * harness: OrbitDriver plus actual OrbitControls pointer handlers. CPU observations
 * cover duplicate frames, translation/radius, epoch and wall-clock failures; the
 * source-pinned pre-click fixture holds out the six post-click frames. Initial
 * fixture placement is not browser control evidence. Final SwiftShader dropdown
 * input and all native images remain a separate required gate.
 *
 * Settle-budget cases drive the driver's real poll loop against a modelled
 * renderer and assert which of the three bounds reported: the frame budget, the
 * wall-clock backstop, or the stall bound. Bound of the whole file: no browser.
 * These prove which failure a given frame pattern produces, not how many frames
 * a real pose needs — that number comes from `artifacts/gate-timing/REPORT.md`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Page } from "@playwright/test";
import { createCameraRig } from "../src/render/camera.js";
import { activeLane, assertCertifiable, laneDir } from "../tools/visual/lane.js";
import { OrbitDriver, SETTLE_BUDGET } from "../tools/visual/orbit.js";
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

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

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
    // A renderer that never draws a frame at all, so nothing has been measured to
    // scale the bound with and the floor is what applies.
    await expect(new OrbitDriver(page as unknown as Page).settle()).rejects.toThrow(
      new RegExp(`frame 12 did not advance for ${SETTLE_BUDGET.stalledFrameFloorMs} ms`));
  });

  it("bounds a continuously moving wait and reports it as a budget failure", async () => {
    // The same shape as before the budget changed unit, restated against the new
    // bounds: frames advance at one per 20 s and the camera never stops drifting,
    // so the wall-clock backstop is reached with only 90 of the 320 frames spent.
    let clock = 0, frame = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    vi.stubGlobal("window", { __mapsHarness: { status: () => observation(frame).status,
      camera: () => observation(frame, frame).camera } });
    const page = { evaluate: async (fn: () => unknown) => fn(),
      waitForTimeout: async () => { clock += 20_000; frame++; } };
    await expect(new OrbitDriver(page as unknown as Page).settle("preservation")).rejects.toThrow(
      /^Settle wall-clock backstop of 1800000 ms expired for preservation before the 320-frame budget was reached \(mode preservation, 1800000 ms elapsed, 90 frames advanced, 0 quiet intervals, 90 polls, longest measured frame interval 20000 ms\)\. Frames did advance, so this is a budget failure under a renderer this slow, not a stall\./);
  });
});

/**
 * Drives the driver's real `settle()` loop against a modelled renderer.
 *
 * The renderer is stated as the times at which frames finish — `advanceAtMs`,
 * ascending, absolute modelled milliseconds — so "frames stop advancing" is
 * written as the absence of a time rather than as an arithmetic accident. The
 * frame counter holds still between those times and the camera x holds with it,
 * which is what makes a modelled frame interval an interval; an earlier version
 * of this helper advanced the counter by the *step* of the model, which never
 * crossed the first boundary and quietly tested a dead renderer instead of a
 * slow one.
 *
 * `msPerPoll` stands in for the cost of one poll on the machine being modelled —
 * the browser document round trip plus the wait. The camera drifts three metres
 * per drawn frame until `movingFrames` frames have been drawn: an earlier version
 * tied movement to elapsed modelled time instead, which meant the camera was
 * still sliding between frames, so a quiet interval — two coherent observations
 * from different frames — could never accumulate and every model failed as though
 * the camera had never settled. `Date.now` is frozen-clock controlled and
 * `waitForTimeout` is the only thing that moves the clock, so the loop's own
 * notion of elapsed time is what is under test rather than real time.
 */
function driverAgainst(
  advanceAtMs: readonly number[],
  movingFrames = 1,
  msPerPoll = 60,
) {
  if (advanceAtMs.some((at, index) => index > 0 && at <= advanceAtMs[index - 1]!)) {
    throw new Error(`modelled frame times must ascend: ${advanceAtMs.join(", ")}`);
  }
  let clock = 0;
  let polls = 0;
  const drawnBy = (ms: number) => advanceAtMs.filter((at) => at <= ms).length;
  /** Metres travelled by the camera's target, on whole metres so movement is never marginal. */
  const driftAt = (ms: number) => Math.min(drawnBy(ms), movingFrames) * 3;
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  vi.stubGlobal("window", { __mapsHarness: {
    status: () => observation(drawnBy(clock)).status,
    camera: () => observation(drawnBy(clock), 100 - driftAt(clock)).camera } });
  const page = { evaluate: async (fn: () => unknown) => fn(),
    waitForTimeout: async () => { polls += 1; clock += msPerPoll; } };
  return {
    driver: new OrbitDriver(page as unknown as Page),
    elapsed: () => clock,
    polls: () => polls,
    drawnBy,
  };
}

/** Frame times one second apart, for the cases whose subject is not the interval. */
const EVERY_SECOND = (count: number) => Array.from({ length: count }, (_, index) => (index + 1) * 1000);

/** Every frame the model drew between the first and the last pole. */
const POLL_MS = 60;
const pollsFor = (elapsedMs: number) => elapsedMs / POLL_MS;

describe("settle budget is denominated in the frames the predicate consumes", () => {
  it("fails a long wait under load as a budget failure, not a stall", async () => {
    // A loaded machine that never comes to rest: a frame a second, the camera
    // still drifting on every one of them, so the predicate's quiet-interval bar
    // is never met. This is the shape of the real failure — frames advanced and
    // the old wall clock called it a stall. The modelled renderer draws well past
    // the frames it is allowed, so the budget stops it and not the supply.
    const model = driverAgainst(EVERY_SECOND(400), 1_000_000);
    await expect(model.driver.settle()).rejects.toThrow(
      new RegExp(
        `^Settle budget exhausted for capture at ${SETTLE_BUDGET.frames} frames advanced over 320040 ms ` +
          `\\(mode capture, 320040 ms elapsed, ${SETTLE_BUDGET.frames} frames advanced, 0 quiet intervals, ` +
          "5334 polls, longest measured frame interval 1020 ms\\)\\. The renderer kept drawing, so this is a " +
          "budget failure under load, not a stall",
      ));
    expect(model.drawnBy(320_040)).toBeGreaterThanOrEqual(SETTLE_BUDGET.frames);
    // 320 frames, counted in frames rather than in seconds. The deadline this
    // replaces was 300,000 ms and would have fired having counted 300 of the 320
    // frames it was allowed, reporting them as a renderer that had stopped.
    expect(model.elapsed()).toBe(320_040);
    expect(model.polls()).toBe(5334);
  });

  it("fails a renderer that stops advancing frames as a stall", async () => {
    // Five frames at 1, 2, 3, 4 and 12 seconds, then nothing ever again. The
    // camera is still drifting when they stop, so the predicate has never been
    // satisfied and the stall bound is what ends the wait — which is what makes
    // this case able to see the verdict routing at all. The largest measured gap
    // is 8,020 ms, so the bound is 8 x 8,020 = 64,160 ms: four times the floor,
    // which is why a bound that is *only* the floor is visible here.
    const model = driverAgainst([1000, 3000, 6000, 10_000, 18_000], 1_000_000);
    let reported = "";
    try { await model.driver.settle(); } catch (error) { reported = (error as Error).message; }
    // Declared inside the test so a settle that throws something else is an
    // assertion failure quoting that message, rather than an escaping error the
    // reporter lists without a reason.
    expect(reported, "settle() did not fail at all").not.toBe("");
    // The message says which failure it was, by name.
    expect(reported).toMatch(/^The renderer stopped advancing frames during capture settling: frame 5 did not advance for /);
    expect(reported).toContain("Nothing was drawn, so the camera may be perfectly still and the buffer is stale either way — a still buffer is not a completed capture.");
    expect(reported).toContain("This is a stall, not a budget failure: the frame counter, not the clock, is what stopped.");
    expect(reported).not.toContain("Settle budget exhausted");
    expect(reported).not.toContain("wall-clock backstop");
    // The bound it used is the measured one, not the floor, and the silence that
    // tripped it is that bound to the millisecond. This is the assertion a
    // constant bound fails. Note the silence and the elapsed time are different
    // quantities: silence is measured from the last frame drawn, elapsed from the
    // start of the wait, so the wait ran 18 s longer than the silence.
    const silence = Number(/did not advance for (\d+) ms/.exec(reported)?.[1]);
    const bound = Number(/stall bound of (\d+) ms/.exec(reported)?.[1]);
    expect(bound).toBe(63_840);
    expect(silence).toBe(bound);
    expect(bound).toBeGreaterThan(SETTLE_BUDGET.stalledFrameFloorMs * 4);
    expect(reported).toContain("longest measured frame interval 7980 ms");
    expect(model.elapsed()).toBeGreaterThan(bound);
    expect(model.elapsed()).toBe(silence + 18_000);
  });

  it("returns the pose once the predicate is met", async () => {
    // Twelve frames with the camera still by the fifth of them: the predicate is
    // met at frame 12, long before any bound.
    const model = driverAgainst(EVERY_SECOND(20), 5);
    const camera = await model.driver.settle();
    expect(camera.position.x).toBe(85);
    expect(model.elapsed()).toBe(12_000);
  });

  it("still fails by a wall-clock backstop when frames advance absurdly slowly", async () => {
    // Frames that keep arriving but fall further and further behind: each gap is
    // ten per cent longer than the last, so the renderer is always within its own
    // proven pace and never a stall, while the total runs past the backstop. A
    // single fixed interval cannot model this case at all — a gap longer than the
    // floor never completes, so a renderer whose pace is constant and slower than
    // the floor is reported as stalled rather than as slow.
    const growing = [];
    for (let at = 800, step = 800; at < 1_900_000; at += step, step *= 1.1) growing.push(Math.round(at));
    const model = driverAgainst(growing, 1_000_000);
    let reported = "";
    try { await model.driver.settle(); } catch (error) { reported = (error as Error).message; }
    expect(reported).toContain(`Settle wall-clock backstop of ${SETTLE_BUDGET.wallBackstopMs} ms expired for capture before the ${SETTLE_BUDGET.frames}-frame budget was reached`);
    expect(reported).toContain("Frames did advance, so this is a budget failure under a renderer this slow, not a stall.");
    expect(reported).not.toContain("stopped advancing frames");
    expect(reported).toMatch(/, 0 quiet intervals, 30000 polls,/);
    // Far short of the frame budget, so the clock is what stopped it.
    const advanced = Number(/ (\d+) frames advanced,/.exec(reported)?.[1]);
    expect(advanced).toBeGreaterThan(0);
    expect(advanced).toBeLessThan(SETTLE_BUDGET.frames / 2);
    expect(model.elapsed()).toBe(SETTLE_BUDGET.wallBackstopMs);
    expect(model.polls()).toBe(pollsFor(SETTLE_BUDGET.wallBackstopMs));
  });

  it("does not call a slow but still drawing renderer stalled", async () => {
    // One frame at 12 s, then one a minute. The steady gaps are longer than the
    // 15 s floor, so a bound that is only the floor reports this renderer as
    // stopped during the first of them — the original mistake in the other
    // direction, and what this case exists to catch. The measured bound is
    // 8 x 60 s = 480 s, so it runs to the predicate at frame 12, eleven minutes in.
    //
    // Two things about this model are the point rather than decoration. The first
    // gap has to be *below* the floor or it can never complete, because the
    // detector fires first — which is why the floor cannot simply be raised to
    // cover whatever a renderer does. And the steady gap has to stay within 8x the
    // first gap, because the bound scales from measured gaps alone; a renderer
    // that falls behind its own precedent by more than that is not distinguishable
    // from one that has stopped, and the increasing-interval case above is what
    // covers it.
    const slow = [12_000, ...Array.from({ length: 200 }, (_, index) => 12_000 + 60_000 * (index + 1))];
    // The camera stops drifting after the fifth frame, so the predicate can be
    // satisfied; the renderer's slowness is the variable under test here.
    const model = driverAgainst(slow, 5);
    let reported = "";
    try { await model.driver.settle(); } catch (error) { reported = (error as Error).message; }
    expect(reported).toBe("");
    // Twelve frames drawn and no stall reported, eleven minutes in.
    expect(model.drawnBy(model.elapsed())).toBe(12);
    expect(model.elapsed()).toBe(672_000);
    // The claim in one line: the wait outlived the floor by forty-four times, and
    // a renderer that had genuinely stopped would have said so long before.
    expect(model.elapsed()).toBeGreaterThan(SETTLE_BUDGET.stalledFrameFloorMs * 40);
  });
});

describe("an iteration lane cannot be certified", () => {
  it("refuses to certify any lane but the verdict lane, by name", () => {
    expect(() => assertCertifiable("frame-budget")).toThrow(
      /Refusing to certify the "frame-budget" lane: its subject is the frame interval at 1920x1080.*Only the "verdict" lane produces complete\.json/s);
    expect(() => assertCertifiable("verdict")).not.toThrow();
  });

  it("gives the frame-budget lane its own directory and requires the GPU switch", () => {
    vi.stubEnv("MAPS_VISUAL_LANE", "frame-budget");
    vi.stubEnv("MAPS_VISUAL_GPU", "hardware");
    expect(activeLane()).toBe("frame-budget");
    expect(laneDir()).toBe("artifacts/frame-budget");
    vi.stubEnv("MAPS_VISUAL_GPU", "");
    expect(() => activeLane()).toThrow(/requires MAPS_VISUAL_GPU=hardware/);
  });

  it("defaults to the verdict directory and rejects an unknown lane", () => {
    expect(activeLane()).toBe("verdict");
    expect(laneDir()).toBe("artifacts/visual");
    vi.stubEnv("MAPS_VISUAL_LANE", "fast-pixels");
    expect(() => activeLane()).toThrow(/MAPS_VISUAL_LANE is "fast-pixels", which is not a lane/);
  });
});
