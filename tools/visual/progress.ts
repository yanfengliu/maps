/**
 * A capture spec's progress, on disk while it runs.
 *
 * The test-level timeout is the one wall-clock bound in this lane that cannot be
 * removed: Playwright owns it, and it exists so a hung browser cannot run
 * forever. What it must not be is the *only* record, because when it fires the
 * report says "Test timeout of 3600000ms exceeded" and nothing about which
 * capture the spec was in — measured 2026-09-15, on a hero run that had already
 * written every one of its ten frames when the ceiling fired eight seconds later.
 *
 * So each capture appends its own line, and the file is written after every
 * capture rather than at the end: a run killed by the ceiling still leaves the
 * record behind, naming the capture, the time since the spec started, and the gap
 * since the previous capture. That is the same split the settle budget uses — the
 * predicate's own progress decides, and the clock is a backstop that says what it
 * interrupted.
 *
 * The ledger is written into the lane's own output directory, so it is ignored
 * evidence and carries no verdict weight.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface CaptureEntry {
  /** 1-based position in this spec's own sequence. */
  index: number;
  /** How many the spec intends to make, so a partial ledger is readable. */
  expected: number;
  label: string;
  /** Milliseconds since this spec began. */
  elapsedMs: number;
  /** Milliseconds since the previous capture, or null for the first. */
  intervalMs: number | null;
}

export interface CaptureLedger {
  /** Call once, immediately after the first capture lands, before the next step. */
  record(label: string): Promise<void>;
  entries(): readonly CaptureEntry[];
  file(): string;
}

export function captureLedger(directory: string, expected: number, name = "captures.json"): CaptureLedger {
  const file = path.join(directory, name);
  const started = Date.now();
  const entries: CaptureEntry[] = [];
  let previousAt: number | null = null;

  return {
    async record(label: string): Promise<void> {
      const now = Date.now();
      entries.push({
        index: entries.length + 1,
        expected,
        label,
        elapsedMs: now - started,
        intervalMs: previousAt === null ? null : now - previousAt,
      });
      previousAt = now;
      // Written every time, not accumulated in memory: the case this exists for
      // is the one where the process is killed before it can write anything else.
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, `${JSON.stringify({
        lane: process.env["MAPS_VISUAL_LANE"] ?? "verdict",
        requestedGpu: process.env["MAPS_VISUAL_GPU"] ?? "software",
        startedAt: new Date(started).toISOString(),
        expected,
        completed: entries.length,
        entries,
      }, null, 2)}\n`, "utf8");
    },
    entries: () => entries,
    file: () => file,
  };
}
