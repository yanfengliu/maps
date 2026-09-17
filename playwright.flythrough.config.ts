import { defineConfig, devices } from "@playwright/test";

import { FLYTHROUGH_ITERATION_ENV } from "./tools/visual/lane.js";
import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

// Declared here rather than in an npm script, so a launch cannot leave the lane
// out. Without it `laneDir()` falls back to the verdict directory, and a moving
// sequence would land beside the reviewed 44-frame set that no review covers.
// `MAPS_VISUAL_GPU=hardware` is what makes `orbit.ts` refuse a silent software
// fallback, and it is also the switch that keeps this lane out of the verdict
// lane's directory.
Object.assign(process.env, FLYTHROUGH_ITERATION_ENV);

/**
 * The flythrough lane: a moving camera through the real controls, with the
 * population running, judged between adjacent frames.
 *
 * `npm run visual` captures the appearance verdict with `?agents=` absent, so
 * none of its 44 frames contains an agent, and all 44 are stills. This lane
 * exists for the one criterion neither can reach — "a flythrough driven through
 * the real controls" — and for the two that are about motion rather than about a
 * pose. Flicker and crawl are properties *between* frames, so a still cannot
 * contain them and a contact sheet made of stills answers the wrong question just
 * as confidently as the right one.
 *
 * **This lane is not evidence and produces no certificate.**
 *
 * - it writes under its own ignored directory, `artifacts/flythrough2/`, selected
 *   by `MAPS_VISUAL_LANE` rather than by a flag a spec could ignore;
 * - the renderer is named in every frame's record and in `manifest.json`, and
 *   `MAPS_VISUAL_GPU=hardware` makes `orbit.ts` throw by name if Chromium
 *   silently falls back to a software rasteriser, because a moving sequence is
 *   judged on the pixels a hardware rasteriser produces;
 * - `tools/visual/verify-output.ts` refuses it, so no `complete.json` can ever
 *   name these frames, and the lane's own `manifest.json` says
 *   `certifiable: false` in its first three keys;
 * - the spec refuses to run at all under any other lane, by name.
 *
 * It does **not** run `npm run build`. The harness photographs whatever `dist`
 * the preview server is serving, and the manifest carries the SHA-256 of the
 * build bytes it was captured from, so a stale build is visible in the record
 * instead of being silently inherited by a reviewer. That matters more here than
 * elsewhere: this lane is meant to be re-run after a fix to the post chain, and a
 * run that measured the previous build would say the fix worked.
 *
 * Port 4323 is its own: 4319 is the verdict gate's server and its lifecycle lane,
 * 4320 the hardware lane's, 4321 the populated lane's and 4322 the render-defects
 * capture's. `reuseExistingServer: false` means whatever is on this port is this
 * run's own server or the run fails.
 */
const PREVIEW_URL = "http://127.0.0.1:4323";

export default defineConfig({
  testDir: "./tools/flythrough",
  // One spec, and it is the lane. `driver.ts`, `plan.ts` and `frames.ts` are its
  // input path, its plan and its sequence checks, not tests, and must never be
  // collected as ones.
  testMatch: ["flythrough.spec.ts"],
  outputDir: "./artifacts/playwright-flythrough2",
  // One continuous camera path through one page: the whole point is a sequence
  // over one simulated timeline, and a second browser would be a second
  // simulation whose ticks do not line up with the plan's.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { outputFolder: "./artifacts/playwright-report-flythrough2", open: "never" }]],

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
      name: "chromium-flythrough-iteration",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape the lifecycle and populated lanes use. No
            // software fallback argument is present: if the GPU is unusable the
            // run fails by renderer name instead of reporting a slow software
            // frame as a hardware one.
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
    // 4319, the hardware lane's on 4320, the populated lane's on 4321 or the
    // render-defects capture's on 4322 — and never reuse a stale server, because
    // whatever is already on a port might be an older build of this app or
    // another project entirely.
    command: "npm run preview -- --port 4323",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
