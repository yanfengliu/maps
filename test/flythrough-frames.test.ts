/**
 * The flythrough's sequence checks, each one made to go red.
 *
 * `judgeSequence` is the whole claim of the flythrough lane: that the frames it
 * wrote came from a camera driven through the controls, moving, over a running
 * simulation, with the city and its population in view. A check like that is
 * worth exactly as much as its failure output, so every case below introduces the
 * defect the check exists for and asserts the message that comes back — including
 * the one the lane's red control produces, where the input path raises events
 * that move nothing, the hold whose scene went still while the camera was
 * deliberately parked, and the structure metric that must read a dark textured
 * facade as structured and a blank sky as nothing.
 *
 * The bound on this file is stated here rather than implied: it exercises the
 * checks over synthetic records, so it proves the checks fire. It cannot prove
 * that the browser's input path reaches the controls — only a run of the lane can
 * — and it does not prove that any frame looks right.
 */

import { describe, expect, it } from "vitest";

import { judgeSequence, type SequenceExpectations, type SequenceFrame } from "../tools/flythrough/frames.js";
import { structuredFraction } from "../tools/flythrough/structure.js";
import type { DecodedPng } from "../tools/visual/png.js";

const FLOORS = { pedestriansDrawn: 100, vehiclesDrawn: 1, structuredPixels: 0.05 };
const EXPECTATIONS: SequenceExpectations = {
  viewport: { width: 1280, height: 720 },
  targetY: 15.2,
  targetToleranceM: 0.05,
  minimumTravelM: 0.001,
  minimumDistinctFraction: 0.95,
  redControl: false,
};

/** One leg of synthetic frames that passes every check, so a case can break one thing. */
function frames(count: number, leg = "overview"): SequenceFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    leg,
    file: `frames/${leg}/${leg}-${String(index).padStart(3, "0")}.png`,
    // Distinct digests, as a moving camera produces.
    sha256: `digest-${leg}-${index}`,
    // The first frame of a leg has no predecessor, so no travel is claimed for it.
    cameraTravelM: index === 0 ? null : 10 + index,
    frameCountBefore: 100 * (index + 1),
    frameCountAfter: 100 * (index + 1) + 40,
    ticksBefore: 1_000 + index * 90,
    width: 1280,
    height: 720,
    pedestriansDrawn: 3_000,
    vehiclesDrawn: 20,
    structuredPixels: 0.6,
    targetY: 15.2,
  }));
}

/**
 * A 1280x720 frame of one synthetic luminance pattern, alpha 255.
 *
 * Grey levels only, so the Rec.709 luminance of a pixel is the level itself
 * and the pattern's statistics are exact rather than approximate.
 */
function syntheticFrame(luminanceAt: (x: number, y: number) => number): DecodedPng {
  const width = 1280;
  const height = 720;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      const luminance = luminanceAt(x, y);
      rgba[at] = luminance;
      rgba[at + 1] = luminance;
      rgba[at + 2] = luminance;
      rgba[at + 3] = 255;
    }
  }
  return { width, height, rgba };
}

describe("judgeSequence", () => {
  it("passes a sequence that was driven: travel between frames, distinct bytes, a running simulation", () => {
    expect(judgeSequence(frames(6), [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS)).toEqual([]);
  });

  it("fails a sequence whose frames are the same bytes", () => {
    const still = frames(6).map((frame) => ({ ...frame, sha256: "digest-of-one-frame", cameraTravelM: 0 }));
    const failures = judgeSequence(still, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/1 distinct digests across 6 frames/);
    expect(failures.join("\n")).toMatch(/the same bytes written more than once/);
  });

  it("fails a pair of adjacent frames the camera did not move between", () => {
    const halted = frames(6).map((frame, index) => (index === 3 ? { ...frame, cameraTravelM: 0.0004 } : frame));
    const failures = judgeSequence(halted, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/1 of 5 frame pairs moved the camera less than 1 mm/);
    expect(failures.join("\n")).toMatch(/the route was not flown/);

    // A null travel is no pair at all, wherever it sits — the first frame of a
    // leg has no predecessor — so it leaves the pairs count alone rather than
    // joining it as a zero. The 2026-09-16 run counted four such pseudo-pairs
    // because the spec wrote 0 for them.
    const alsoNull = halted.map((frame, index) => (index === 2 ? { ...frame, cameraTravelM: null } : frame));
    const nullFailures = judgeSequence(alsoNull, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(nullFailures.join("\n")).toMatch(/1 of 4 frame pairs moved the camera less than 1 mm/);
  });

  it("exempts a held frame from the travel floor, and fails a held frame whose scene went still, by name", () => {
    // A planned hold: the last two pairs are measuredly still by design, and
    // the scene under them keeps living.
    const held = frames(6).map((frame, index) =>
      index >= 4 ? { ...frame, cameraTravelM: 0, cameraHeld: true } : frame,
    );
    expect(judgeSequence(held, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS)).toEqual([]);

    // The same hold with the scene dead: the second held frame is the previous
    // frame's bytes again.
    const dead = held.map((frame, index) => (index === 5 ? { ...frame, sha256: held[4]!.sha256 } : frame));
    const failures = judgeSequence(dead, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/1 of 2 held frame pairs show a scene that went still/);
    expect(failures.join("\n")).toMatch(/overview-005\.png: the same bytes as the previous frame/);
    expect(failures.join("\n")).toMatch(/a stopped scene photographed again, not a hold/);

    // And with the clocks dead rather than the bytes: the render counter and
    // the population ticks carry the same claim.
    const frozen = held.map((frame, index) =>
      index === 5
        ? {
            ...frame,
            frameCountBefore: held[4]!.frameCountBefore,
            frameCountAfter: held[4]!.frameCountAfter,
            ticksBefore: held[4]!.ticksBefore,
          }
        : frame,
    );
    const frozenFailures = judgeSequence(frozen, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(frozenFailures.join("\n")).toMatch(/overview-005\.png: the render counter did not advance/);
    expect(frozenFailures.join("\n")).toMatch(/the population ticks did not advance/);
  });

  it("passes a red-control sequence only when nothing moved at all, and fails when input that moves nothing moved the camera", () => {
    const red = frames(6).map((frame) => ({ ...frame, sha256: `still-${frame.file}`, cameraTravelM: 0 }));
    expect(
      judgeSequence(red, [{ name: "overview", frames: 6 }], FLOORS, { ...EXPECTATIONS, redControl: true }),
    ).toEqual([]);

    const halfDriven = frames(6).map((frame, index) => ({ ...frame, cameraTravelM: index === 2 ? 4 : 0 }));
    const failures = judgeSequence(halfDriven, [{ name: "overview", frames: 6 }], FLOORS, {
      ...EXPECTATIONS,
      redControl: true,
    });
    expect(failures.join("\n")).toMatch(/the red control proves nothing about the lane/);
  });

  it("keeps the red control's semantics unchanged for held frames: every pair still, held included", () => {
    // Held frames are still frames under the red control too: input that
    // cannot move anything must move nothing, whether or not the plan parked
    // the camera on purpose.
    const red = frames(6).map((frame, index) => ({
      ...frame,
      sha256: `still-${frame.file}`,
      cameraTravelM: index === 0 ? null : 0,
      cameraHeld: index >= 4,
    }));
    expect(
      judgeSequence(red, [{ name: "overview", frames: 6 }], FLOORS, { ...EXPECTATIONS, redControl: true }),
    ).toEqual([]);

    const moved = red.map((frame, index) => (index === 5 ? { ...frame, cameraTravelM: 3 } : frame));
    const failures = judgeSequence(moved, [{ name: "overview", frames: 6 }], FLOORS, {
      ...EXPECTATIONS,
      redControl: true,
    });
    expect(failures.join("\n")).toMatch(/1 of 5 frame pairs still moved the camera/);
    expect(failures.join("\n")).toMatch(/the red control proves nothing about the lane/);
  });

  it("fails a sequence with no frames at all", () => {
    expect(judgeSequence([], [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS).join("\n")).toMatch(
      /No frames were captured at all/,
    );
  });

  it("fails a leg that captured fewer frames than the plan asked for", () => {
    const failures = judgeSequence(frames(4), [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/The plan asked for 6 frames across 1 legs and the capture produced 4/);
  });

  it("fails a render loop that stopped mid-leg", () => {
    const stopped = frames(6).map((frame) => ({ ...frame, frameCountAfter: 100, frameCountBefore: 100 }));
    const failures = judgeSequence(stopped, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/The render loop stopped during overview/);
  });

  it("fails a leg in which the simulation never advanced", () => {
    const frozen = frames(6).map((frame) => ({ ...frame, ticksBefore: 5_000 }));
    const failures = judgeSequence(frozen, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/did not advance the simulation between its first and last frame/);
  });

  it("fails a flight over a city with no crowd drawn", () => {
    const empty = frames(6).map((frame) => ({ ...frame, pedestriansDrawn: 0, vehiclesDrawn: 0 }));
    const failures = judgeSequence(empty, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/No frame of overview has 100 pedestrians drawn/);
    expect(failures.join("\n")).toMatch(/the route was aimed at a measured knot/);
    expect(failures.join("\n")).toMatch(/No frame has 1 vehicle drawn/);
  });

  it("fails frames that are one flat surface, which is a camera aimed into a wall", () => {
    const wall = frames(6).map((frame, index) => (index < 3 ? { ...frame, structuredPixels: 0.0 } : frame));
    const failures = judgeSequence(wall, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(
      /3 of 6 frames in overview have under 5% of their 144 cells showing structure — per-cell luminance deviation above 12, or above 30% of the cell's own mean/,
    );
  });

  it("reads a dark but textured frame as structured, and a blank sky as nothing", () => {
    // A dusk facade: every cell alternates 12 and 28 luminance in 2-pixel
    // blocks, so each cell's mean is 20 with a deviation of 8 — under the
    // absolute threshold of 12, but 40% of the cell's own mean. The absolute
    // leg alone reads this frame as blank; it is the approach-005 shape.
    const darkTextured = syntheticFrame((x, y) => (((x >> 1) + (y >> 1)) % 2 === 0 ? 12 : 28));
    expect(structuredFraction(darkTextured)).toBe(1);

    // A clear sky: one luminance across the whole frame, so no cell shows
    // structure under either leg of the rule and the frame stays under the
    // 5% floor the judge applies.
    const blankSky = syntheticFrame(() => 200);
    expect(structuredFraction(blankSky)).toBe(0);
  });

  it("fails a frame whose controls target moved in height, which no input can do", () => {
    const set = frames(6).map((frame, index) => (index === 4 ? { ...frame, targetY: 22.5 } : frame));
    const failures = judgeSequence(set, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/the controls' target at a height other than 15.2 m/);
    expect(failures.join("\n")).toMatch(/a frame where the camera was set rather than driven/);
  });

  it("fails frames captured at the wrong size", () => {
    const small = frames(6).map((frame, index) => (index === 1 ? { ...frame, width: 640, height: 360 } : frame));
    const failures = judgeSequence(small, [{ name: "overview", frames: 6 }], FLOORS, EXPECTATIONS);
    expect(failures.join("\n")).toMatch(/1 frames are not at 1280x720/);
  });
});
