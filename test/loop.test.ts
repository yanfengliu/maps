import { describe, expect, it } from "vitest";

import { RenderLoop } from "../src/render/loop.js";
import { shortestAngle } from "../tools/visual/orbit.js";

/** Drive the loop by hand, without a browser or a renderer. */
function makeLoop(stepSeconds = 1 / 60) {
  let renders = 0;
  const loop = new RenderLoop({ stepSeconds, render: () => void (renders += 1) });
  return { loop, renders: () => renders };
}

describe("RenderLoop", () => {
  it("advances simulation in whole fixed steps regardless of frame time", () => {
    const { loop } = makeLoop(1 / 60);
    const steps: number[] = [];
    loop.onFixedStep((step) => steps.push(step));

    // Frame times a real machine produces: a fast one, a slow one, a stutter.
    for (const ms of [8, 17, 33, 4, 21]) {
      loop.advance(loop.elapsedSeconds * 1000 + ms);
    }

    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) expect(step).toBeCloseTo(1 / 60, 12);
    expect(loop.simulatedSeconds).toBeCloseTo(steps.length / 60, 12);
  });

  it("renders exactly once a frame and counts what it drew", () => {
    const { loop, renders } = makeLoop();
    for (let frame = 1; frame <= 20; frame += 1) loop.advance(frame * 16);
    expect(renders()).toBe(20);
    expect(loop.frameCount).toBe(20);
  });

  it("drops time rather than freezing after a long stall", () => {
    const { loop } = makeLoop(1 / 60);
    let steps = 0;
    loop.onFixedStep(() => void (steps += 1));

    // A tab backgrounded for a minute. Catching up would be 3,600 steps.
    loop.advance(60_000);
    expect(steps).toBeLessThanOrEqual(5);
  });

  it("gives frame callbacks the real elapsed time", () => {
    const { loop } = makeLoop();
    const deltas: number[] = [];
    loop.onFrame((delta) => deltas.push(delta));
    loop.advance(20);
    loop.advance(45);
    expect(deltas[0]).toBeCloseTo(0.02, 6);
    expect(deltas[1]).toBeCloseTo(0.025, 6);
  });

  it("stops calling a system once it is unregistered", () => {
    const { loop } = makeLoop();
    let calls = 0;
    const unregister = loop.onFixedStep(() => void (calls += 1));
    loop.advance(100);
    const afterFirst = calls;
    expect(afterFirst).toBeGreaterThan(0);
    unregister();
    loop.advance(200);
    expect(calls).toBe(afterFirst);
  });
});

describe("shortestAngle", () => {
  it("treats 359 degrees as a step of one degree backwards", () => {
    const oneDegree = Math.PI / 180;
    expect(shortestAngle(359 * oneDegree)).toBeCloseTo(-oneDegree, 9);
  });

  it("leaves a small difference alone", () => {
    expect(shortestAngle(0.4)).toBeCloseTo(0.4, 12);
    expect(shortestAngle(-0.4)).toBeCloseTo(-0.4, 12);
  });

  it("stays inside [-PI, PI]", () => {
    for (let turns = -8; turns <= 8; turns += 1) {
      for (const offset of [0, 0.7, 2.9, 4.5, 6.1]) {
        const wrapped = shortestAngle(turns * 2 * Math.PI + offset);
        expect(wrapped).toBeGreaterThanOrEqual(-Math.PI - 1e-9);
        expect(wrapped).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});
