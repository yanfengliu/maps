/** Bound: metadata validation and first-gesture input dispatch; real buffer/RAF
 * ordering is separately exercised on the hardware renderer by visual:flicker. */
import { describe, expect, it } from "vitest";
import type { Page } from "@playwright/test";
import { copyObservationRefusals, copyPixelRefusals, type CopyObservation } from "../tools/flicker/burst.js";
import { measureFrame } from "../tools/visual/png.js";
import { MotionPath } from "../tools/flicker/motion.js";
import { frameAt } from "./flicker-frames.js";

function observation(): CopyObservation {
  return { frameCount: 12, pageMs: 100, camera: frameAt(0).pose, post: {
    active: true, error: null, passes: ["taa", "bloom", "ssao"], toneMapping: "ACESFilmic",
    exposure: 1, bloom: { strength: 1, threshold: 1, radius: 1 },
    ambientOcclusion: { blendIntensity: 1, radiusM: 1 }, taaAccumulating: false, taaSamples: 1, bufferBytes: 1,
  } };
}
describe("RAF copy metadata", () => {
  it("rejects blank copies and wrong dimensions, with a textured negative control", () => {
    const image = frameAt(0).image;
    const viewport = { width: image.width, height: image.height };
    expect(copyPixelRefusals(measureFrame(image), viewport)).toEqual([]);
    const blank = { ...image, rgba: new Uint8Array(image.rgba.length) };
    expect(copyPixelRefusals(measureFrame(blank), viewport).join(" ")).toContain("blank");
    expect(copyPixelRefusals(measureFrame(image), { width: 1280, height: 720 }).join(" ")).toContain("require native");
  });
  it("accepts one exact rendered observation and rejects mixed frame/pose/post observations", () => {
    const before = observation();
    expect(copyObservationRefusals({ before, after: structuredClone(before) })).toEqual([]);
    for (const change of [
      (after: CopyObservation) => { after.frameCount += 1; },
      (after: CopyObservation) => { after.camera.position.x += 0.1; },
      (after: CopyObservation) => { after.post.taaAccumulating = true; },
      (after: CopyObservation) => { after.post.taaSamples += 1; },
    ]) {
      const after = structuredClone(before); change(after);
      expect(copyObservationRefusals({ before, after }).length).toBeGreaterThan(0);
    }
  });
  it("refuses accumulation on both sides even if the observations agree", () => {
    const before = observation(); before.post.taaAccumulating = true;
    expect(copyObservationRefusals({ before, after: structuredClone(before) }).join(" ")).toContain("TAA accumulated");
  });
});

describe("motion failure cleanup", () => {
  for (const failure of ["input", "capture", "release", "synchronous capture"] as const) {
    it(`preserves a sole ${failure} error by identity after cleanup`, async () => {
      const original = new Error(`${failure} failed`);
      let moves = 0, releases = 0;
      const page = {
        locator: () => ({ boundingBox: async () => ({ x: 0, y: 0, width: 1280, height: 720 }) }),
        evaluate: async () => ({ ...frameAt(0).pose, frameCount: 12 }),
        mouse: {
          move: async () => { if (++moves === 2 && failure === "input") throw original; },
          down: async () => {}, wheel: async () => {},
          up: async () => { releases += 1; if (failure === "release") throw original; },
        },
      } as unknown as Page;
      await expect(new MotionPath(page, "orbit").during(() => {
        if (failure === "synchronous capture") throw original;
        return failure === "capture" ? Promise.reject(original) : Promise.resolve();
      })).rejects.toBe(original);
      expect(releases).toBe(1);
    });
  }
  for (const rejectCapture of [false, true]) it(`settles an observer before rejecting input plus release failures (capture rejects: ${rejectCapture})`, async () => {
    const inputError = new Error("input transport failure");
    const releaseError = new Error("mouse release transport failure");
    const captureError = new Error("observer deadline reached");
    let finish!: () => void, released!: () => void;
    let moves = 0, returned = false, captureSettled = false;
    const releaseAttempted = new Promise<void>((resolve) => { released = resolve; });
    const capture = new Promise<void>((resolve, reject) => {
      finish = () => { captureSettled = true; if (rejectCapture) reject(captureError); else resolve(); };
    });
    const page = {
      locator: () => ({ boundingBox: async () => ({ x: 0, y: 0, width: 1280, height: 720 }) }),
      evaluate: async () => ({ ...frameAt(0).pose, frameCount: 12 }),
      mouse: { move: async () => { if (++moves === 3) throw inputError; }, down: async () => {},
        up: async () => { released(); throw releaseError; }, wheel: async () => {} },
    } as unknown as Page;
    const outcome = new MotionPath(page, "orbit").during(() => capture).then(
      () => { returned = true; return undefined; }, (error: unknown) => { returned = true; return error; });
    try {
      await releaseAttempted;
      // Drain the finite promise chain, without a wall-clock sleep or resolving
      // the observer. The old finally returns the release error at this point.
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
      expect(returned, "the active observer must settle before during returns").toBe(false);
      finish();
      const error = await outcome;
      expect(captureSettled).toBe(true);
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toEqual(rejectCapture
        ? [inputError, releaseError, captureError] : [inputError, releaseError]);
    } finally { finish(); await outcome; }
  });
});
describe("actual input dispatch", () => {
  for (const pattern of ["orbit", "ascent"] as const) {
    it(`${pattern} dispatches its required input on the first gesture`, async () => {
      const calls: unknown[][] = [];
      let finish!: () => void;
      let pressed = false;
      const captured = new Promise<void>((resolve) => { finish = resolve; });
      const page = {
        locator: () => ({ boundingBox: async () => ({ x: 0, y: 0, width: 1280, height: 720 }) }),
        evaluate: async () => ({ ...frameAt(0).pose, frameCount: 12 }),
        mouse: {
          move: async (...args: unknown[]) => { calls.push(["move", ...args]); if (calls.filter((call) => call[0] === "move").length === 4) finish(); },
          down: async () => { pressed = true; calls.push(["down"]); },
          up: async () => { pressed = false; calls.push(["up"]); },
          wheel: async (...args: unknown[]) => { if (pressed) finish(); expect(pressed, "OrbitControls ignores wheels while dragging").toBe(false); calls.push(["wheel", ...args]); },
        },
      } as unknown as Page;
      const { input: receipt } = await new MotionPath(page, pattern).during(() => captured);
      expect(calls.filter((call) => call[0] === "move").length).toBeGreaterThanOrEqual(2);
      expect(calls.find((call) => call[0] === "down")).toBeDefined();
      expect(calls.find((call) => call[0] === "up")).toBeDefined();
      expect(calls.filter((call) => call[0] === "wheel").every((call) => call[1] === 0 && call[2] === 6)).toBe(true);
      if (pattern === "ascent") expect(receipt.wheelEvents).toBeGreaterThan(0);
      else expect(receipt.wheelEvents).toBe(0);
    });
  }
});
