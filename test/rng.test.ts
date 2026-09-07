import { describe, expect, it } from "vitest";

import { DEFAULT_SEED, createRng, randomBetween, randomPick } from "../src/world/rng.js";

describe("createRng", () => {
  it("gives the same sequence for the same seed", () => {
    const first = createRng(DEFAULT_SEED);
    const second = createRng(DEFAULT_SEED);
    const a = Array.from({ length: 64 }, () => first());
    const b = Array.from({ length: 64 }, () => second());
    expect(a).toEqual(b);
  });

  it("gives a different sequence for a different seed", () => {
    const a = Array.from({ length: 16 }, createRng(1));
    const b = Array.from({ length: 16 }, createRng(2));
    expect(a).not.toEqual(b);
  });

  it("stays inside [0, 1)", () => {
    const rng = createRng(DEFAULT_SEED);
    for (let index = 0; index < 20_000; index += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("does not collapse to a constant", () => {
    const rng = createRng(7);
    const seen = new Set(Array.from({ length: 500 }, () => rng()));
    expect(seen.size).toBeGreaterThan(490);
  });
});

describe("randomBetween", () => {
  it("stays inside the range", () => {
    const rng = createRng(11);
    for (let index = 0; index < 5_000; index += 1) {
      const value = randomBetween(rng, -3, 9);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThan(9);
    }
  });
});

describe("randomPick", () => {
  it("only returns members of the list", () => {
    const rng = createRng(13);
    const items = ["a", "b", "c"] as const;
    for (let index = 0; index < 500; index += 1) {
      expect(items).toContain(randomPick(rng, items));
    }
  });

  it("says what went wrong instead of returning undefined", () => {
    expect(() => randomPick(createRng(1), [])).toThrow(/empty list/);
  });
});
