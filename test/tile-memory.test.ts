/** Bounds: actual 3d-tiles-renderer LRU zero-budget disposal with reordered
 * fractional totals. The watchdog contains the intentionally reintroduced hang.
 *
 * Timing bound: both arms spawn `test/fixtures/lru-disposal.mjs`, and the budgets
 * below come from what that child does — boot Node, strip types from itself and
 * `src/scene/tile-memory.ts`, then run the LRU work — rather than from comfort.
 * Measured on 2026-09-16 with the full 60-file suite running on this box: 66-152 ms
 * from spawn to exit over 25 runs, and 66-112 ms to the control's first line over 25,
 * against 66-87 ms over six runs recorded for the same child earlier that evening.
 * The 2,000 ms this file used was 13x the top of that and still missed.
 *
 * It missed at 20:18 on 2026-09-16, when the whole suite failed here as
 * `SyntaxError: Unexpected end of JSON input` at `13:15` (`artifacts/flake/gate-R6.log`):
 * `spawnSync` had killed the control child at its budget before that child reached
 * its first line, and the empty string was parsed. A timeout reported as a parse
 * error sends the next reader after the JSON, so nothing here parses an empty
 * string, and the control's two windows are two numbers instead of one.
 *
 * - `CHILD_BUDGET_MS` is what either child may spend before this run is reported as
 *   unmeasured: 15 s, 100x the worst cost measured above and 7.5x the 2,000 ms that
 *   stall broke. Only a box that has stopped measuring anything pays it, and the
 *   failure it produces says which command missed which budget.
 * - `HANG_WINDOW_MS` is how long the control must still be running after its first
 *   line: 2,000 ms, the old budget, 13x the child's whole measured run. A hang stays
 *   a hang under load, so this window needs none of the slack the budget does; it is
 *   also the case's only standing cost.
 * - `CASE_BUDGET_MS` is the case's own ceiling: both budgets, the hang window, and
 *   5 s of process and expect overhead.
 */
import { spawn, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { expect, it } from "vitest";

const CHILD = "test/fixtures/lru-disposal.mjs";
const childArgs = (...extra: string[]): string[] => [CHILD, ...extra];
/** The command line a failure has to name, spelled the way it ran. */
const commandOf = (args: string[]): string => [process.execPath, ...args].join(" ");

const CHILD_BUDGET_MS = 15_000;
const HANG_WINDOW_MS = 2_000;
const CASE_BUDGET_MS = 2 * CHILD_BUDGET_MS + HANG_WINDOW_MS + 5_000;

/** What a child that printed nothing means on this box, where the child itself is fast. */
const stalled = (command: string, budgetMs: number, cost: string): string =>
  `${command} produced no output within its ${budgetMs} ms budget, so this run measured nothing and there was no JSON to read. That child boots Node, strips types from two modules and does this work in ${cost} on this box, so a missed budget is a stall and not slow work: re-run it, and if it repeats on an idle box the child is the defect rather than the budget.`;

/**
 * The stdout of a child that finished inside its budget.
 *
 * `spawnSync` kills the child at `timeout` and returns with no stdout at all, so a
 * timeout and a child that printed nothing arrive here as the same empty string, and
 * the parse over it claims `SyntaxError: Unexpected end of JSON input`. That is a
 * claim about JSON, and this run failed for a reason that has nothing to do with JSON.
 */
function outputWithinBudget(child: SpawnSyncReturns<string>, args: string[], budgetMs: number): string {
  const command = commandOf(args);
  if (child.error) throw new Error(stalled(command, budgetMs, "66-152 ms"));
  expect(child.status, `${command} exited ${child.status} and printed ${JSON.stringify(child.stdout)}`).toBe(0);
  if (!child.stdout) throw new Error(`${command} exited 0 with nothing on stdout, so its result cannot be read. The fixture prints one line per arm; check ${CHILD} against this file.`);
  return child.stdout;
}

/**
 * The control child's remainder, read under one budget, with the child then watched
 * for its hang under a second, shorter window.
 *
 * That child prints its first line and never returns, because with fractional
 * estimates the running total never reaches the zero budget. `spawnSync` cannot say
 * both things with one budget: it has to be long enough for the child to start under
 * load and short enough not to be this case's whole cost, and it reports "never
 * started" and "never stopped" identically.
 */
async function controlRemainder(): Promise<number> {
  const args = childArgs("--fractional");
  const command = commandOf(args);
  const child = spawn(process.execPath, args, { windowsHide: true });
  const settled = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  try {
    const line = await new Promise<string>((resolve, reject) => {
      const expiry = setTimeout(() => reject(new Error(stalled(command, CHILD_BUDGET_MS, "66-112 ms to its first line"))), CHILD_BUDGET_MS);
      let buffered = "";
      child.stdout?.on("data", (chunk: Buffer) => {
        buffered += chunk;
        if (!buffered.includes("\n")) return;
        clearTimeout(expiry);
        resolve(buffered.split("\n")[0]!);
      });
      child.once("exit", (code, signal) => {
        clearTimeout(expiry);
        reject(new Error(`${command} ${signal ? `was killed by ${signal}` : `exited ${code}`} before printing a complete line, so this run measured nothing. Run it by hand from the repository root to see what it printed.`));
      });
      child.once("error", (failure) => {
        clearTimeout(expiry);
        reject(new Error(`${command} could not be started: ${failure.message}`));
      });
    });
    await new Promise((resolve) => setTimeout(resolve, HANG_WINDOW_MS));
    const outcome = child.signalCode ? `was killed by ${child.signalCode}` : `exited ${child.exitCode}`;
    expect(child.exitCode !== null || child.signalCode !== null, `${command} ${outcome} within ${HANG_WINDOW_MS} ms of printing its remainder, so fractional estimates no longer hang the zero-budget unload, which is the defect this arm exists to reintroduce.`).toBe(false);
    return JSON.parse(line).remainder;
  } finally {
    child.kill();
    await settled;
  }
}

it("frees every LRU item when mipmap estimates are rounded to whole bytes", async () => {
  const repaired = spawnSync(process.execPath, childArgs(), { encoding: "utf8", timeout: CHILD_BUDGET_MS, windowsHide: true });
  expect(JSON.parse(outputWithinBudget(repaired, childArgs(), CHILD_BUDGET_MS).trim().split("\n").at(-1)!)).toEqual({ removed: 3, remaining: 0 });
  expect(await controlRemainder()).toBeGreaterThan(0);
}, CASE_BUDGET_MS);
