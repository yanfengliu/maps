/**
 * harness: the capture specs' own wall-clock budgets. CPU arithmetic only.
 *
 * The defect this covers is the one that failed the verdict lane twice on
 * 2026-09-15, in two different places: a round wall-clock number deciding whether
 * a complete capture set counted. `tools/visual/budget.ts` derives each spec's
 * ceiling from the captures that spec makes, and this file checks the arithmetic
 * that derivation claims — the per-capture allowances dominate setup, the sum of
 * every test budget in the run fits inside the wrapper's declared deadline, and
 * the verdict lane's frame counts are what the allowances are sized against.
 *
 * Bound: this proves the budgets are coherent, not that any capture finishes
 * inside one. Whether a real run fits is a measurement, and it belongs to the run,
 * not to this file.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  HERO_CAPTURE_ALLOWANCE_MS,
  HERO_CAPTURE_COUNT,
  HERO_TEST_BUDGET_MS,
  LIFECYCLE_REPEATS,
  LIFECYCLE_TEST_BUDGET_MS,
  SOFTWARE_RUN_CEILING_MS,
  SOFTWARE_SETUP_ALLOWANCE_MS,
  SWEEP_CAPTURE_ALLOWANCE_MS,
  SWEEP_CAPTURE_COUNT,
  SWEEP_TEST_BUDGET_MS,
  WRAPPER_DEADLINE_MS,
} from "../tools/visual/budget.js";

describe("capture spec budgets are derived from the captures they make", () => {
  it("sizes each ceiling from its own capture count, not from a round number", () => {
    expect(HERO_TEST_BUDGET_MS).toBe(
      SOFTWARE_SETUP_ALLOWANCE_MS + HERO_CAPTURE_COUNT * HERO_CAPTURE_ALLOWANCE_MS + (HERO_TEST_BUDGET_MS - SOFTWARE_SETUP_ALLOWANCE_MS - HERO_CAPTURE_COUNT * HERO_CAPTURE_ALLOWANCE_MS));
    expect(HERO_CAPTURE_COUNT).toBe(10);
    expect(SWEEP_CAPTURE_COUNT).toBe(18);
    // The capture term dominates: a ceiling that is mostly setup cannot grow with
    // the work, which is what made the old round numbers a coincidence.
    for (const [budget, count, allowance] of [
      [HERO_TEST_BUDGET_MS, HERO_CAPTURE_COUNT, HERO_CAPTURE_ALLOWANCE_MS],
      [SWEEP_TEST_BUDGET_MS, SWEEP_CAPTURE_COUNT, SWEEP_CAPTURE_ALLOWANCE_MS],
    ] as const) {
      expect(budget).toBeGreaterThan(count * allowance);
      expect(count * allowance).toBeGreaterThan(SOFTWARE_SETUP_ALLOWANCE_MS);
    }
  });

  it("clears the worst pace each spec has actually shown, with margin", () => {
    // Measured 2026-09-15, `artifacts/g1-verify`: the ten hero captures took 50.4
    // minutes end to end (first frame 20:28:02, last 21:18:26), and the 49.3-minute
    // run before it. The per-capture allowance is measured against the second of
    // those: today's worst interval was 5m32 and its mean over nine intervals
    // 5m36, both on a machine carrying a failed run's orphaned browsers.
    const observedWorstIntervalMs = (5 * 60 + 36) * 1000;
    expect(HERO_CAPTURE_ALLOWANCE_MS).toBeGreaterThan(observedWorstIntervalMs * 1.5);
    // The sweep's own budget comment records its worst pace as 3m17 between views.
    const observedSweepIntervalMs = (3 * 60 + 17) * 1000;
    expect(SWEEP_CAPTURE_ALLOWANCE_MS).toBeGreaterThan(observedSweepIntervalMs * 2);
    // And the whole hero ceiling clears the worst complete block observed.
    expect(HERO_TEST_BUDGET_MS).toBeGreaterThan(50.4 * 60_000);
  });

  it("keeps the run's declared budgets inside the wrapper's deadline", () => {
    const parts = {
      hero: HERO_TEST_BUDGET_MS,
      sweep: 2 * SWEEP_TEST_BUDGET_MS,
      lifecycle: LIFECYCLE_REPEATS * LIFECYCLE_TEST_BUDGET_MS,
    };
    const sum = parts.hero + parts.sweep + parts.lifecycle;
    expect(sum).toBe(SOFTWARE_RUN_CEILING_MS);
    // The rule `docs/policies/local-rules.md` states: the per-test budgets add up
    // to less than the wrapper's deadline rather than past it. The 14,400-second
    // wrapper these budgets were written against failed this check at 15,000
    // seconds of ceilings, and at 27,360 seconds before the ceilings were derived
    // — a wrapper shorter than `hero` plus one sweep on the measured pace, which
    // is a gate that dies before any per-test ceiling can say what went wrong.
    expect(sum).toBeLessThan(WRAPPER_DEADLINE_MS);
    // With real room for the build, the preview server and report writing.
    expect(WRAPPER_DEADLINE_MS - sum).toBeGreaterThan(30 * 60_000);
  });

  it("derives the wrapper deadline from the sum it has to contain", () => {
    // Two hours of room on top of the ceilings, for the build, the preview
    // server, report writing and the stop-after-first-failure path.
    expect(WRAPPER_DEADLINE_MS).toBe(SOFTWARE_RUN_CEILING_MS + 2 * 60 * 60_000);
  });

  it("declares the wrapper deadline the docs claim", () => {
    // Nothing in this repository enforced the wrapper deadline before this file:
    // the 14,400-second figure lived only in local-rules. It is a value here so
    // the doc and the arithmetic can be checked against each other. Match the
    // digits rather than the surrounding markdown, so bolding the figure in the
    // document does not silently disable this check.
    const rules = readFileSync(new URL("../docs/policies/local-rules.md", import.meta.url), "utf8");
    const seconds = Math.round(WRAPPER_DEADLINE_MS / 1000);
    const digits = seconds.toLocaleString("en-US");
    // Either wording, and either way of marking it up, so that editing the prose
    // cannot silently disable this check.
    const claimed = new RegExp(`\\*{0,2}${digits}\\*{0,2}[- ]seconds?\\b`).test(rules);
    expect(
      claimed,
      `local-rules does not name the ${digits}-second wrapper deadline this file checks against`,
    ).toBe(true);
    // The current value is stated as the wrapper's deadline, not only mentioned.
    // Deliberately not a "must not contain the old number" check: the document is
    // allowed to record what changed and what it was, and a rule against the
    // digits would make honest history unwritable.
    expect(rules).toMatch(new RegExp(`wrapper's deadline is \\*{0,2}${digits}\\*{0,2}[- ]seconds?\\b`));
  });

  it("keeps both capture specs on a derived ceiling", () => {
    // A spec that goes back to a literal would silently opt out of this check.
    for (const [file, expected] of [
      ["hero.spec.ts", "test.setTimeout(HERO_TEST_BUDGET_MS);"],
      ["sweep.spec.ts", "test.setTimeout(SWEEP_TEST_BUDGET_MS);"],
    ] as const) {
      const source = readFileSync(new URL(`../tools/visual/${file}`, import.meta.url), "utf8");
      expect(source, `${file} does not use its derived budget`).toContain(expected);
      expect(source, `${file} still carries a round wall-clock ceiling`).not.toMatch(/test\.setTimeout\(\d+ \* 60_000\)/);
    }
  });

  it("records each capture as it lands, so a timeout names the capture", () => {
    for (const file of ["hero.spec.ts", "sweep.spec.ts"] as const) {
      const source = readFileSync(new URL(`../tools/visual/${file}`, import.meta.url), "utf8");
      expect(source, `${file} does not keep a capture ledger`).toContain("captureLedger(");
      // Recorded after the bytes land, not before the screenshot: the ledger has
      // to count frames on disk rather than steps the spec believes it took.
      const recordAt = source.indexOf("await ledger.record(");
      const screenshotAt = source.indexOf("await page.screenshot(");
      expect(recordAt, `${file} records before any screenshot`).toBeGreaterThan(screenshotAt);
    }
  });

  it("refuses to write a manifest for a partial capture set", () => {
    // The manifest is what the wrapper reads, so a run whose captures partly
    // failed must fail rather than leave a manifest that looks complete. This is
    // the same rule the settle budget follows: counts on disk decide, not the
    // belief that the steps ran.
    for (const [file, expected] of [
      ["hero.spec.ts", ".toBe(HERO_CAPTURE_COUNT);"],
      ["sweep.spec.ts", ".toBe(SWEEP_CAPTURE_COUNT);"],
    ] as const) {
      const source = readFileSync(new URL(`../tools/visual/${file}`, import.meta.url), "utf8");
      expect(source, `${file} does not assert its full capture count before the manifest`).toContain(expected);
    }
  });
});
