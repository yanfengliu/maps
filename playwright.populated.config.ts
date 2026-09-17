import { defineConfig, devices } from "@playwright/test";

import { POPULATED_ITERATION_ENV } from "./tools/visual/lane.js";
import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

// Declared here rather than in an npm script, so a launch cannot leave the lane
// out. Without it `laneDir()` falls back to the verdict directory, and populated
// frames would land beside the reviewed 44-frame set that no review covers.
// `MAPS_VISUAL_GPU=hardware` is what makes `orbit.ts` refuse a silent software
// fallback, and is also the switch that keeps this lane out of the verdict lane's
// directory.
Object.assign(process.env, POPULATED_ITERATION_ENV);

/**
 * The populated capture lane: what the population actually draws.
 *
 * `npm run visual` captures the appearance verdict with `?agents=` absent, so
 * none of its 44 frames contains a pedestrian or a vehicle. This lane is the
 * first one that loads `?agents=1`, and it exists because three of the plan's
 * acceptance criteria are about agents: vehicles holding their lanes, obeying
 * the signals, turning and spawning at the boundary; pedestrians surging
 * diagonally across the crossing on the signal phase; and no frame showing
 * traffic moving through the scramble while pedestrians are on it.
 *
 * **This lane is not evidence and produces no certificate.**
 *
 * - it writes under its own ignored directory, `artifacts/populated-capture/`,
 *   selected by `MAPS_VISUAL_LANE` rather than by a flag a spec could ignore;
 * - the renderer is named in every frame's record and in `manifest.json`, and
 *   `MAPS_VISUAL_GPU=hardware` makes `orbit.ts` throw by name if Chromium
 *   silently falls back to a software rasteriser;
 * - `tools/visual/verify-output.ts` refuses it, so no `complete.json` can ever
 *   name these frames, and the lane's own `manifest.json` says `certifiable:
 *   false` in its first three keys;
 * - the spec refuses to run at all under any other lane, by name.
 *
 * The renderer matters twice over here. A pixel set captured on one renderer
 * cannot inherit a review written for another, and this lane's simulated window
 * is paid for in frame time: with 3,000 pedestrians a population tick measured
 * about 44 ms on 2026-09-15, and the browser advances at most five fixed steps
 * per frame, so the software rasteriser would turn a two-minute simulated window
 * into an hour of wall clock.
 *
 * It does **not** run `npm run build`. The harness photographs whatever `dist`
 * the preview server is serving, and every frame record carries the SHA-256 of
 * the build bytes it was captured from, so a stale build is visible in the
 * manifest instead of being silently inherited by a review.
 */
const PREVIEW_URL = "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "./tools/populated",
  // One spec, and it is the lane. `probe.ts` is the offline aiming tool, not a
  // test, and it must never be collected as one.
  testMatch: ["populated.spec.ts"],
  outputDir: "./artifacts/playwright-populated",
  // One continuous camera path through one page, because the whole point is a
  // sequence over one simulated timeline. A second browser would be a second
  // simulation and the ticks would not line up with the plan.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { outputFolder: "./artifacts/playwright-report-populated", open: "never" }]],

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  timeout: 45 * 60_000,
  expect: { timeout: 30_000 },

  projects: [
    {
      name: "chromium-populated-iteration",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape the lifecycle lane uses. No software
            // fallback argument is present: if the GPU is unusable the run fails
            // by renderer name instead of reporting a slow software frame as a
            // hardware one.
            "--use-gl=angle",
            "--use-angle=d3d11",
            "--disable-lcd-text",
          ],
        },
      },
    },
  ],

  webServer: {
    // Its own port, so this lane can never attach to the verdict gate's server on
    // 4319 — and never reuse a stale server:
    // whatever is already on a port might be an older build of this app or
    // another project entirely.
    command: "npm run preview -- --port 4321",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
