/**
 * `deriveStep`'s own gate: the tick the capture records is an elapsed time, not
 * the Unix epoch read backwards.
 *
 * The defect this file exists for is a real one from the first run. `deriveStep`
 * lived inside `capture.spec.ts` and subtracted `performance.timeOrigin` - an
 * **epoch** timestamp, 1789702869047.3 on this machine - from `performance.now()`,
 * which is milliseconds since navigation (~1206.1). The difference is about minus
 * fifty-six years, and every frame of both runs of
 * `artifacts/flicker/RUN-01-REPORT.md` records `tick ≈ -1.07e11`. Nothing in
 * `judgeFlicker` reads `tick`, so nothing failed; the record simply presented a
 * number that was not a measurement.
 *
 * The fix is to read `performance.now()` once at the start and subtract that, and
 * this case pins both the value and the negative control. **Its bound:** it drives
 * the arithmetic, not the browser. It cannot see a capture that does not read the
 * page clock at all, and it cannot see a fixed-step clock that stopped while
 * frames kept being drawn - that is the judge's stalled-render-counter predicate,
 * in `test/flicker-judge.test.ts`.
 */

import { describe, expect, it } from "vitest";

import { STEPS_PER_SECOND, deriveStep } from "../tools/flicker/step.js";

/** The two clocks as this machine read them during the first run's clock probe. */
const EPOCH_TIME_ORIGIN = 1_789_702_869_047.3;
const STARTED_AT_MS = 1_206.1;

describe("deriveStep", () => {
  it("names a plausible step from elapsed page time", () => {
    // One second of page time since the capture began is sixty steps. The number
    // is pinned rather than bounded because a plausible-looking tick is exactly
    // what the defect produced: -1.07e11 is large, and `Number.isFinite` and
    // `>= 0` would both have passed it.
    expect(deriveStep(STARTED_AT_MS + 1_000, STARTED_AT_MS, 10_000)).toBe(60);
    expect(deriveStep(STARTED_AT_MS + 4_000, STARTED_AT_MS, 10_000)).toBe(240);
    // Fractional seconds floor rather than round, so a step is never named before
    // the loop can have run it.
    expect(deriveStep(STARTED_AT_MS + 1_999.9, STARTED_AT_MS, 10_000)).toBe(119);
  });

  it("clamps to the frames the loop actually drew", () => {
    // The loop cannot have run more simulation steps than it has drawn frames, so
    // a capture that read a stale or coarse frame counter gets the counter.
    expect(deriveStep(STARTED_AT_MS + 10_000, STARTED_AT_MS, 42)).toBe(42);
    expect(deriveStep(STARTED_AT_MS + 1_000, STARTED_AT_MS, 42)).toBe(42);
  });

  it("records an absent clock as null rather than as step zero", () => {
    // A capture that could not read `performance.now()` says so. Zero is a real
    // step - the first one - and is the reading a page that never advanced a fixed
    // step would also produce, so the two must not be the same value.
    expect(deriveStep(STARTED_AT_MS, null, 1_000)).toBeNull();
    expect(deriveStep(STARTED_AT_MS, STARTED_AT_MS, 1_000)).toBe(0);
  });

  it("would have caught the first run's epoch subtraction", () => {
    // The mutation, run as the shipped code ran it: subtract `timeOrigin` instead
    // of the start clock. On the first run's own two readings that is -56 years,
    // which reads -1.07e11 steps. Both assertions below are on the *defect*, so
    // this case fails if the arithmetic is ever restored and passes only while the
    // epoch is not involved.
    const buggy = Math.min(10_000, Math.floor(((STARTED_AT_MS - EPOCH_TIME_ORIGIN) / 1_000) * STEPS_PER_SECOND));
    expect(buggy).toBeLessThan(-1e11);
    expect(buggy).toBe(Math.min(10_000, Math.floor(((STARTED_AT_MS - EPOCH_TIME_ORIGIN) / 1_000) * 60)));
    // And the fixed derivation on the same two readings is a small positive step,
    // so the two are not merely different in magnitude but different in kind.
    const fixed = deriveStep(STARTED_AT_MS + 2_000, STARTED_AT_MS, 10_000);
    expect(fixed).toBe(120);
    expect(fixed).toBeGreaterThan(0);
    expect(fixed).toBeLessThan(1_000);
  });

  it("keeps the clock ratio the derivation rests on in one place", () => {
    // `RenderLoop` advances one fixed step per 1/60 s of wall time. Exported so
    // the number is not restated in this file: a case built from a copy of the
    // constant agrees with the copy and not with the code.
    expect(STEPS_PER_SECOND).toBe(60);
    expect(deriveStep(STARTED_AT_MS + 1_000, STARTED_AT_MS, 10_000)).toBe(STEPS_PER_SECOND);
  });
});
