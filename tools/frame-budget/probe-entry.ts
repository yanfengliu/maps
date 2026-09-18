/**
 * harness: publishes the frame boundary and the population's own tick to the page.
 *
 * The frame-budget lane measures the frame interval the delivered app actually
 * holds at 1920x1080 with the acceptance population. It needs two things the
 * frozen bridge does not publish: the browser's own frame boundary, and the
 * wall-clock cost of one population tick inside the page.
 *
 * Both are **observations of existing calls, never replacements for them**:
 *
 *  - `window.requestAnimationFrame` is wrapped, and the wrapper calls the
 *    original with the caller's own callback. The frame boundary the lane reads
 *    is therefore the browser's own; nothing is synthesised and no state is set.
 *  - `RenderLoop.prototype.advance` is wrapped, and the wrapper calls the
 *    original and times it. The loop still advances itself; the probe only reads
 *    how long that took and how many fixed steps it ran.
 *  - `RenderLoop.prototype.onFixedStep` is wrapped so the fixed steps' own share
 *    of that time can be separated from the frame's. The wrapper calls the
 *    original registration and hands it a timed shim around the caller's own
 *    function, so a step the app registered is a step the app registered.
 *
 * `src/render/loop.ts` is untouched, and so is `src/harness/bridge.ts`: no member
 * is added to either, and the bridge stays the only frozen observation surface the
 * visual harness reads.
 *
 * This module is loaded by a `<script type="module">` line in `index.html` ahead
 * of `/src/main.ts`. It imports the same `RenderLoop` module the app does, so the
 * prototype it wraps is the app's own class rather than a second copy of it.
 * Deleting that one line leaves the app exactly as it ships.
 *
 * **Nothing here happens unless the URL asks for it.** The gate is
 * `probeRequested` from `./probe-switch.ts`, checked before the first wrapper is
 * installed: a page without `?frameBudgetProbe=1` gets no `requestAnimationFrame`
 * wrapper, no `RenderLoop` wrapper and no `globalThis.__frameBudgetProbe`, so the
 * lane's own reader fails by name instead of reporting intervals an instrument that
 * is not installed did not observe. That matters because the seam is in the shipped
 * page: ungated, every appearance frame the certificate photographs would be drawn
 * through a wrapped frame boundary and would carry a tick cost nobody asked for.
 *
 * The bound, stated where the number is taken: `performance.now()` is clamped to
 * 100 microseconds in this browser, so every cost below is quantised at that
 * resolution. Nothing here is finer than that, and a difference under 0.1 ms is
 * not a difference this instrument can see.
 */

import { RenderLoop } from "../../src/render/loop.ts";
import { probeRequested } from "./probe-switch.ts";

export interface TickCost {
  /** Milliseconds the whole `advance` call took: fixed steps, frame steps and render. */
  advanceMs: number;
  /** Milliseconds the registered fixed steps took inside that call. */
  simulationMs: number;
  /** Fixed steps this call ran. The loop caps it at `maxStepsPerFrame`, which is 5. */
  steps: number;
}

export interface FrameBudgetProbe {
  /** `performance.now()` at each rAF callback the app registered. */
  frameTimestamps: number[];
  /** One entry per wrapped `advance`, in call order. */
  tickCosts: TickCost[];
  /** True once both wrappers are installed. A false here makes every number meaningless. */
  installed: boolean;
  /** Set when the probe could not install, naming what was missing. */
  failure: string | null;
}

const probe: FrameBudgetProbe = {
  frameTimestamps: [],
  tickCosts: [],
  installed: false,
  failure: null,
};

/** The page's own query string, or `""` where there is no page. */
export function pageSearch(): string {
  return typeof location === "undefined" ? "" : location.search;
}

/**
 * Whether this module installed its wrappers.
 *
 * False is the delivered app: the seam is present in `index.html` and inert. The
 * lane reads `globalThis.__frameBudgetProbe` instead, which is absent when this is
 * false, so a run that forgot the switch fails rather than reporting zero observed
 * frames as a measurement.
 */
export const enabled = probeRequested(pageSearch());

if (enabled) {
  (globalThis as unknown as { __frameBudgetProbe: FrameBudgetProbe }).__frameBudgetProbe = probe;
  installFrameBoundary();
  installTickCost();
}

/* ------------------------------------------------------------- frame boundary */

function installFrameBoundary(): void {
  const originalRaf = globalThis.requestAnimationFrame.bind(globalThis);
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number =>
    originalRaf((timestamp) => {
      probe.frameTimestamps.push(timestamp);
      callback(timestamp);
    });
}

/* --------------------------------------------------------------- tick cost */

/** Fixed-step milliseconds accumulated since the last `advance` read them. */
let simulationMs = 0;

function installTickCost(): void {
  const originalOnFixedStep = RenderLoop.prototype.onFixedStep;
  RenderLoop.prototype.onFixedStep = function measuredOnFixedStep(
    this: RenderLoop,
    step: (stepSeconds: number, simulatedSeconds: number) => void,
  ): () => void {
    return originalOnFixedStep.call(this, (stepSeconds, simulatedSeconds) => {
      const before = performance.now();
      step(stepSeconds, simulatedSeconds);
      simulationMs += performance.now() - before;
    });
  };

  const originalAdvance = RenderLoop.prototype.advance;
  RenderLoop.prototype.advance = function measuredAdvance(this: RenderLoop, timestamp: number): void {
    simulationMs = 0;
    const before = performance.now();
    const beforeSeconds = this.simulatedSeconds;
    originalAdvance.call(this, timestamp);
    const after = performance.now();
    // `stepSeconds` is a constant and the loop only ever adds it, so the count is
    // exact arithmetic on the loop's own clock rather than a guess from wall time.
    const steps = Math.round((this.simulatedSeconds - beforeSeconds) / this.stepSeconds);
    probe.tickCosts.push({ advanceMs: after - before, simulationMs, steps });
    probe.installed = true;
  };
}
