/**
 * harness: the frame-budget lane's Node side. Reads the page's own probe, drives
 * the camera through the real input path, and reduces what it finds.
 *
 * Nothing in this file assigns a camera position, sets an orbit angle or calls the
 * render function. The camera moves because `page.mouse` synthesises genuine
 * pointer events through Chromium's input path, exactly as the visual gate's own
 * driver does, and the frame boundary is the browser's `requestAnimationFrame`
 * because `tools/frame-budget/probe-entry.ts` wraps it and calls it.
 *
 * The percentiles here are nearest-rank on the sorted sample, the same convention
 * `tools/agents/population-cost.ts` uses, so two instruments in this repository
 * rank a p95 the same way.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Page } from "@playwright/test";

import { PROBE_QUERY, withProbe } from "./probe-switch.js";

// Re-exported so a spec opens pages through this lane's own URL builder rather than
// spelling the switch itself: the page's gate and the lane's URLs then come from
// one definition and cannot disagree.
export { PROBE_QUERY, withProbe };

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
/** This lane's own ignored directory. Nothing here is ever written anywhere else. */
export const OUT_DIR = resolve(ROOT, "artifacts/frame-budget");

export interface ProbeState {
  frameTimestamps: number[];
  tickCosts: { advanceMs: number; simulationMs: number; steps: number }[];
  installed: boolean;
  failure: string | null;
}

export interface Stats {
  n: number;
  p05: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
}

export function statsOf(values: readonly number[]): Stats | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number): number =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]!;
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    n: sorted.length,
    p05: round(at(0.05)),
    p50: round(at(0.5)),
    p95: round(at(0.95)),
    max: round(sorted.at(-1)!),
    mean: round(sum / sorted.length),
  };
}

export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Intervals between consecutive `requestAnimationFrame` callbacks, in milliseconds. */
export function intervalsFrom(timestamps: readonly number[]): number[] {
  const intervals: number[] = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    intervals.push(timestamps[index]! - timestamps[index - 1]!);
  }
  return intervals;
}

/** The same array, with the leading and trailing gaps dropped. */
export function interiorIntervals(intervals: readonly number[]): number[] {
  return intervals.slice(1, Math.max(1, intervals.length - 1));
}

export async function readProbe(page: Page): Promise<ProbeState> {
  return page.evaluate(() => {
    const probe = (globalThis as unknown as { __frameBudgetProbe?: ProbeState }).__frameBudgetProbe;
    if (!probe) {
      throw new Error(
        `The frame-budget probe is not on the page. tools/frame-budget/probe-entry.ts is loaded by a script ` +
          `line in index.html ahead of /src/main.ts, and it installs nothing unless the URL asks for it with ` +
          `"${PROBE_QUERY}". Open the page with \`withProbe(url)\` from ./run.js, or no frame boundary and no ` +
          "tick cost is observed and no number from this run describes the app.",
      );
    }
    return {
      frameTimestamps: [...probe.frameTimestamps],
      tickCosts: probe.tickCosts.map((cost) => ({ ...cost })),
      installed: probe.installed,
      failure: probe.failure,
    };
  });
}

export async function resetProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const probe = (globalThis as unknown as { __frameBudgetProbe?: ProbeState }).__frameBudgetProbe;
    if (!probe) throw new Error("The frame-budget probe is not on the page, so there is nothing to reset.");
    probe.frameTimestamps.length = 0;
    probe.tickCosts.length = 0;
  });
}

/**
 * The SHA-256 of the built web bytes the preview server is serving.
 *
 * A frame-interval number is a claim about a build, and a lane that reports the
 * number without the bytes lets a later reader assume it measured whatever `dist/`
 * happens to hold now. This is the binding the report quotes.
 */
export function buildDigest(): { sha256: string; files: { name: string; bytes: number }[] } {
  const assets = resolve(ROOT, "dist/assets");
  const names = readdirSync(assets).filter((name) => name.endsWith(".js")).sort();
  const hash = createHash("sha256");
  const files: { name: string; bytes: number }[] = [];
  for (const name of names) {
    const bytes = readFileSync(resolve(assets, name));
    hash.update(bytes);
    files.push({ name, bytes: bytes.length });
  }
  return { sha256: hash.digest("hex"), files };
}
/** Every result file this lane writes, in its own directory, never overwriting another run's. */
export function writeResult(name: string, value: unknown): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

export function machineFacts(): Record<string, unknown> {
  return {
    cpu: [...new Set(os.cpus().map((cpu) => cpu.model))].join(", "),
    logicalCpus: os.cpus().length,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    totalMemoryBytes: os.totalmem(),
    node: process.version,
  };
}
