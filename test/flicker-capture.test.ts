/**
 * harness: visual:flicker capture specification, with only browser/input and disk
 * I/O replaced. The real judge, copy validators and emitted manifest execute.
 * Bound: twelve 192x108 synthetic copies; this is no browser/scene acceptance.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BurstResult, CopyObservation } from "../tools/flicker/burst.js";
import type { FlickerFrame, FlickerReport } from "../tools/flicker/judge.js";
import type { MotionReceipt } from "../tools/flicker/motion.js";
import { crawlingRecord, frozenRecord, movingRecord } from "./flicker-frames.js";
import { encodeGreyPng } from "./flicker-synthetic.js";

const state = vi.hoisted(() => ({
  run: undefined as undefined | (() => Promise<void>),
  writes: new Map<string, string>(),
  burst: undefined as BurstResult | undefined,
  input: undefined as MotionReceipt | undefined,
}));
vi.mock("@playwright/test", () => ({
  expect,
  test: (_name: string, run: (fixture: { page: unknown }) => Promise<void>) => {
    state.run = () => run({ page: { goto: async () => {} } });
  },
}));
vi.mock("node:fs", () => ({
  mkdirSync: () => {}, readdirSync: () => ["index-frozen.js"],
  readFileSync: () => Buffer.from("unchanged test bundle"),
  writeFileSync: (file: string, data: string | Uint8Array) => {
    if (file.endsWith(".json")) state.writes.set(file.split(/[\\/]/).at(-1)!, String(data));
  },
}));
vi.mock("../tools/visual/gpu-identity.js", () => ({ probeGpuIdentity: async () => ({ fixture: true }) }));
vi.mock("../tools/visual/lane.js", () => ({
  activeLane: () => "flicker-iteration", laneDir: () => "artifacts/test-only", pixelLaneRefusal: () => null,
}));
vi.mock("../tools/visual/shots.js", () => ({
  CAPTURE_VIEWPORT: { width: 192, height: 108 }, HERO_AZIMUTH: 0,
  HERO_POSES: [{ name: "crossing", distance: 45, polar: 1.5 }],
}));
vi.mock("../tools/flicker/burst.js", async (original) => ({
  ...await original<typeof import("../tools/flicker/burst.js")>(),
  captureAdjacentFrames: async () => state.burst!,
}));
vi.mock("../tools/flicker/motion.js", async (original) => ({
  ...await original<typeof import("../tools/flicker/motion.js")>(),
  MotionPath: class {
    orbit = { waitForFirstFrame: async () => ({ glRenderer: "fixture" }),
      waitForTilesIdle: async () => {}, zoomTo: async () => {}, orbitTo: async () => {} };
    async during<T>(capture: () => Promise<T>): Promise<{ value: T; input: MotionReceipt }> {
      return { value: await capture(), input: state.input! };
    }
  },
}));

function observation(frame: FlickerFrame): CopyObservation {
  return { frameCount: frame.frameCountMid, pageMs: frame.frameCountMid * 16,
    camera: structuredClone(frame.pose), post: {
      active: true, error: null, passes: ["taa", "bloom", "ssao"], toneMapping: "ACESFilmic",
      exposure: 1, bloom: { strength: 1, threshold: 1, radius: 1 },
      ambientOcclusion: { blendIntensity: 1, radiusM: 1 }, taaAccumulating: false, taaSamples: 1, bufferBytes: 1,
    } };
}
function install(frames: FlickerFrame[]): void {
  state.burst = { width: 192, height: 108, preserveDrawingBuffer: false, encodeMs: 1,
    frames: frames.map((frame) => {
      const before = observation(frame);
      const luma = Float32Array.from({ length: frame.image.width * frame.image.height }, (_, i) => frame.image.rgba[i * 4]!);
      return { before, after: structuredClone(before), copyMs: 0,
        pngBase64: Buffer.from(encodeGreyPng(frame.image.width, frame.image.height, luma)).toString("base64") };
    }) };
  state.input = { pattern: "orbit", pointerMoves: 2, wheelEvents: 0, wheelDeltaY: 0,
    before: frames[0]!.pose, after: frames.at(-1)!.pose,
    events: [{ kind: "pointer", requestedAtMs: 1, returnedAtMs: 2, acknowledgedAtFrame: frames[1]!.frameCountMid, delta: .25 },
      { kind: "pointer", requestedAtMs: 3, returnedAtMs: 4, acknowledgedAtFrame: frames[2]!.frameCountMid, delta: .25 }] };
}
interface Manifest { captureValid: boolean; captureFailures: string[]; sceneVerdict: string; report: FlickerReport }
async function emitted(pattern = "orbit"): Promise<Manifest> {
  const previous = process.env["MAPS_FLICKER_PATTERNS"];
  process.env["MAPS_FLICKER_PATTERNS"] = pattern;
  try {
    await import("../tools/flicker/capture.spec.js");
    // A residual or capture refusal makes the actual lane assertion fail after
    // writing its manifest. Read that public result, not its exit status alone.
    let laneError: unknown;
    await state.run!().catch((error: unknown) => { laneError = error; });
    const text = state.writes.get(`manifest-${pattern}.json`);
    if (text === undefined && laneError !== undefined) throw laneError;
    expect(text, "the specification must emit the requested manifest").toBeDefined();
    return JSON.parse(text!) as Manifest;
  } finally {
    if (previous === undefined) delete process.env["MAPS_FLICKER_PATTERNS"];
    else process.env["MAPS_FLICKER_PATTERNS"] = previous;
  }
}

beforeEach(() => { state.writes.clear(); install(movingRecord(12)); });
describe("emitted capture validity", () => {
  it("refuses twelve stale nonblank images despite adjacent moving observations", async () => {
    install(frozenRecord(12));
    const result = await emitted();
    expect(result.report.failures).toHaveLength(11);
    expect(result.captureValid).toBe(false);
    expect(result.captureFailures).toHaveLength(11);
    expect(result.sceneVerdict).toBe("not-established");
  });
  it("keeps provisional residual failure separate from valid capture", async () => {
    install(crawlingRecord(12));
    const result = await emitted();
    expect(result.report.failures.length).toBeGreaterThan(0);
    expect(result.captureValid).toBe(true);
    expect(result.captureFailures).toEqual([]);
    expect(result.sceneVerdict).toBe("not-established");
  });
  it("accepts adjacent nonblank translated copies with valid input", async () => {
    const result = await emitted();
    expect(result.captureValid).toBe(true);
    expect(result.captureFailures).toEqual([]);
  });
  for (const [name, change] of [
    ["blank pixels", () => { state.burst!.frames[3]!.pngBase64 = Buffer.from(encodeGreyPng(192, 108, new Float32Array(192 * 108))).toString("base64"); }],
    ["wrong decoded dimensions", () => { state.burst!.frames[3]!.pngBase64 = Buffer.from(encodeGreyPng(191, 108, new Float32Array(191 * 108))).toString("base64"); }],
    ["stopped counter", () => { state.burst!.frames[3]!.before.frameCount = state.burst!.frames[2]!.before.frameCount; state.burst!.frames[3]!.after.frameCount = state.burst!.frames[2]!.after.frameCount; }],
    ["mixed copy binding", () => { state.burst!.frames[3]!.after.camera.position.x += .1; }],
    ["inactive post chain", () => { state.burst!.frames[3]!.before.post.active = false; state.burst!.frames[3]!.after.post.active = false; }],
    ["unexercised movement", () => { for (const frame of state.burst!.frames) { frame.before.camera = structuredClone(state.burst!.frames[0]!.before.camera); frame.after.camera = structuredClone(frame.before.camera); } }],
    ["missing copies", () => { state.burst!.frames.pop(); }],
  ] as const) it(`refuses ${name} in the emitted manifest`, async () => {
    change();
    const result = await emitted();
    expect(result.captureValid).toBe(false);
    expect(result.captureFailures.length).toBeGreaterThan(0);
  });
  it("refuses ascent without wheel input or captured distance increase", async () => {
    state.input!.pattern = "ascent";
    const result = await emitted("ascent");
    expect(result.captureValid).toBe(false);
    expect(result.captureFailures.length).toBeGreaterThan(0);
  });
});
