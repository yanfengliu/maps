/**
 * What each capture spec is allowed to spend, derived from the captures it makes.
 *
 * These are the software lane's numbers, kept as backstops. They were written
 * when both capture specs ran on SwiftShader, and the owner's 2026-09-16
 * instruction moved the lane to the hardware renderer without changing them: a
 * ceiling that a correct run cannot approach costs nothing, and lowering one on
 * the strength of a single quiet-machine measurement is how a shared box turns a
 * scheduling problem into a red gate. What changed is the pace they sit beside.
 * Measured 2026-09-17 on the RTX 4090, the same ten hero captures and the two
 * eighteen-view sweeps: 91.1 s / 83.2 s / 78.7 s of ledger time, against 4,438.2 s
 * for the ten software hero captures this repository stopped on the same night —
 * roughly 49x. The measurement that made the software pace visible is the probe
 * in `artifacts/gpu-lane/software-probe.json`: one software capture drew its
 * frames at 1,035 ms each, waited 64.9 s for the tileset to refine, spent 342.7 s
 * in controls corrections and 55.7 s inside one screenshot.
 *
 * Both software capture specs carried a single round wall-clock number — 60
 * minutes for the ten hero images, 70 for each eighteen-view sweep — described in
 * their own comments as a measured budget. A round number cannot be a budget: it
 * decides whether a *correct* capture set counts, on a machine whose pace is not
 * stable. Measured 2026-09-15/16 on this machine, same build, same ten hero
 * captures:
 *
 * | Hero block | Observed |
 * | --- | --- |
 * | 2026-09-12, to the first hero capture | 6m20 |
 * | 2026-09-15 run that passed | 49.3 minutes |
 * | 2026-09-15 20:18 run | first capture 20:28:02, last 21:18:26 — **50.4 minutes for ten captures**, and `test.setTimeout(60 * 60_000)` fired at 21:18:18, eight seconds before the last one landed |
 * | 2026-09-17 stopped software run | 8 captures in 74.0 minutes, intervals 107.4 s to 795.0 s |
 * | 2026-09-17 hardware run | **91.1 s for all ten**, intervals 1.4 s to 3.6 s with one 33.7 s page reload |
 *
 * The same block took 49.3 and 50.4 minutes against a 60-minute ceiling that also
 * had to cover the preparation before the first capture. The ceiling was not a
 * budget; it was the measurement, and the run died with every frame written.
 *
 * Each budget is therefore built as `setup + captures x per-capture allowance +
 * margin`, with the per-capture allowance set from the worst pace that spec has
 * shown and the two lump sums kept small enough that the capture term dominates.
 *
 * The budgets are also made to fit their own wrapper. `npm run visual` declares a
 * wrapper deadline, and per-test ceilings that add up past it describe a run that
 * cannot finish inside the time it is given — the wrapper kills the gate before
 * any per-test ceiling can report what went wrong. The numbers as this file was
 * written did exactly that: 7,200 + 2 x 4,200 + 3 x 1,920 = 27,360 seconds of
 * per-test ceilings against a 14,400-second wrapper, a deadline already shorter
 * than `hero` plus one sweep on the measured pace. The wrapper is therefore
 * 36,000 seconds, derived here as the sum it has to contain plus two hours, and
 * `test/visual-budget.test.ts` checks both directions so the arithmetic cannot
 * drift again.
 *
 * This is the same defect class as the settle budget in `orbit.ts` — a wall-clock
 * number standing in for work that is not wall-clock — and it is answered the same
 * way: the ceiling is a backstop, while `captureLedger()` in `progress.ts` puts the
 * spec's actual progress on disk as it goes, so a timeout names the capture it
 * happened in instead of the whole spec.
 */

/** The lump sums, kept deliberately small so the capture term governs each budget. */
export const SOFTWARE_SETUP_ALLOWANCE_MS = 10 * 60_000;
export const SOFTWARE_MARGIN_MS = 5 * 60_000;

/** Images `hero.spec.ts` writes: both styles, both times, both poses, plus the two returns. */
export const HERO_CAPTURE_COUNT = 10;

/**
 * Per-capture allowance for the hero block, ms.
 *
 * The 20:18 run's worst interval was 5m32 and its mean over nine intervals 5m36,
 * on a machine that already carried a failed run's orphaned browser processes. 9
 * minutes is 1.6x that worst pace, and 10 x 9 minutes is the budget's dominant
 * term. A capture that takes 60% longer than the worst pace this lane has shown is
 * a defect to report, not a budget to raise.
 */
export const HERO_CAPTURE_ALLOWANCE_MS = 9 * 60_000;

/** Views per style in `sweep.spec.ts`: three shots at six azimuths. */
export const SWEEP_CAPTURE_COUNT = 18;

/**
 * Per-view allowance for the sweep, ms.
 *
 * The sweep's own budget comment records its worst pace as 3m17 between plaza
 * captures, and this run's sweep never reached its old ceiling, so the margin here
 * is smaller than the hero block's on purpose: the hero lane is the one that
 * failed, twice. 7 minutes is 2.1x the recorded worst interval.
 */
export const SWEEP_CAPTURE_ALLOWANCE_MS = 7 * 60_000;

/** What `hero.spec.ts` may spend in total. */
export const HERO_TEST_BUDGET_MS =
  SOFTWARE_SETUP_ALLOWANCE_MS + HERO_CAPTURE_COUNT * HERO_CAPTURE_ALLOWANCE_MS + SOFTWARE_MARGIN_MS;

/** What each `sweep.spec.ts` style spec may spend in total. */
export const SWEEP_TEST_BUDGET_MS =
  SOFTWARE_SETUP_ALLOWANCE_MS + SWEEP_CAPTURE_COUNT * SWEEP_CAPTURE_ALLOWANCE_MS + SOFTWARE_MARGIN_MS;

/**
 * What `lifecycle.spec.ts` may spend: its own 30-minute preparation step, a
 * 15-second navigation bound and a 60-second loaded-page check, plus room for the
 * setup and margin this file's other budgets carry.
 */
export const LIFECYCLE_TEST_BUDGET_MS =
  SOFTWARE_SETUP_ALLOWANCE_MS + 30 * 60_000 + 60_000 + SOFTWARE_MARGIN_MS;

/** How many times the gate repeats the lifecycle spec. */
export const LIFECYCLE_REPEATS = 3;

/**
 * The sum of every per-test budget in the software verdict run.
 *
 * Checked against the wrapper deadline by `test/visual-budget.test.ts`, because
 * budgets that add up past their own wrapper are a run that cannot finish inside
 * the time it is given — a fact about the numbers rather than anything a capture
 * measures.
 */
export const SOFTWARE_RUN_CEILING_MS =
  HERO_TEST_BUDGET_MS
  + 2 * SWEEP_TEST_BUDGET_MS
  + LIFECYCLE_REPEATS * LIFECYCLE_TEST_BUDGET_MS;

/**
 * The owned full-run wrapper's deadline.
 *
 * Derived, not chosen: the wrapper has to contain the sum of the per-test
 * ceilings or it is the thing that fails a run whose own budgets were never
 * reached. `SOFTWARE_RUN_CEILING_MS` is 15,000 seconds, and the two hours on top
 * cover the build, the preview server, report writing and the stop-after-first
 * failure path. The 14,400-second value it replaces was already shorter than
 * `hero` plus a single sweep on the measured pace.
 */
export const WRAPPER_DEADLINE_MS = SOFTWARE_RUN_CEILING_MS + 2 * 60 * 60_000;
