/** Bounds: actual 3d-tiles-renderer LRU zero-budget disposal with reordered
 * fractional totals. The watchdog contains the intentionally reintroduced hang.
 */
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("frees every LRU item when mipmap estimates are rounded to whole bytes", () => {
  const repaired = spawnSync(process.execPath, ["test/fixtures/lru-disposal.mjs"], { encoding: "utf8", timeout: 2000, windowsHide: true });
  expect(repaired.error).toBeUndefined(); expect(repaired.status).toBe(0);
  expect(JSON.parse(repaired.stdout.trim().split("\n").at(-1)!)).toEqual({ removed: 3, remaining: 0 });
  const control = spawnSync(process.execPath, ["test/fixtures/lru-disposal.mjs", "--fractional"], { encoding: "utf8", timeout: 2000, windowsHide: true });
  expect((control.error as NodeJS.ErrnoException | undefined)?.code).toBe("ETIMEDOUT");
  expect(JSON.parse(control.stdout.trim()).remainder).toBeGreaterThan(0);
}, 7000);
