/**
 * A small seeded random number generator.
 *
 * Every bit of randomness in the scene draws from one of these, never from
 * `Math.random`. The visual gate compares frames across runs, so a scene that
 * reshuffles itself on reload would make the gate measure the shuffle instead of
 * the change under test.
 */

/** The seed the scene uses unless something asks for another one. */
export const DEFAULT_SEED = 0x5b1b0a;

/**
 * mulberry32: 32 bits of state, uniform output in [0, 1), same sequence on every
 * platform because every step is an integer op forced back through `>>> 0`.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform in [min, max). */
export function randomBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Pick one item. Throws on an empty list rather than handing back `undefined`. */
export function randomPick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("randomPick was given an empty list; it has nothing to return");
  }
  return items[Math.floor(rng() * items.length)]!;
}
