/** Bound: authored time-of-day chroma settings and finite input handling only.
 * Rendered colour, photographic source fidelity and shader use are native gates. */
import { expect, it } from "vitest";
import { environmentChromaRetention } from "../src/scene/sky.js";

it("keeps the reviewed daylight and dusk endpoints with a continuous transition", () => {
  expect(environmentChromaRetention(45)).toBeCloseTo(.1, 12);
  expect(environmentChromaRetention(-4)).toBeCloseTo(.45, 12);
  expect(environmentChromaRetention(3.5)).toBeCloseTo(.275, 12);
  for (let degrees = -90; degrees < 90; degrees++) {
    const before = environmentChromaRetention(degrees), after = environmentChromaRetention(degrees + 1);
    expect(after).toBeLessThanOrEqual(before);
    expect(before - after).toBeLessThan(.041);
    expect(after).toBeGreaterThanOrEqual(.1 - 1e-12);
    expect(after).toBeLessThanOrEqual(.45);
  }
});

it("names an invalid solar elevation instead of sending NaN into the environment shader", () => {
  for (const value of [NaN, Infinity, -Infinity]) expect(() => environmentChromaRetention(value)).toThrow(/finite solar elevation/);
});
