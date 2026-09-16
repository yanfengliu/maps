import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

/**
 * The render-defects capture config.
 *
 * This is not a visual lane: it produces no certificate, it is not listed in
 * `tools/visual/lane.ts`, and its output is read by nobody but the report that
 * names it. It exists to photograph two things the unit gates cannot — a signal
 * lens changing between two phases, and the tick the agent renderer attached at.
 *
 * Port 4322 is its own: 4319 is the verdict gate's server, 4320 the hardware
 * lane's and 4321 the populated lane's, and `reuseExistingServer: false` means
 * whatever is on this port is this run's own build or the run fails.
 *
 * `npm run capture:render-defects` is the entry point. It does **not** build:
 * like the populated lane it photographs the `dist` the preview server is
 * serving, and every record carries the SHA-256 of the frames it captured.
 */
const PREVIEW_URL = "http://127.0.0.1:4322";

// The hardware renderer, named rather than assumed: `orbit.ts` refuses a silent
// software fallback by renderer name, and a capture whose lens is one pixel
// across is exactly where a software rasteriser would differ.
Object.assign(process.env, { MAPS_VISUAL_GPU: "hardware" });

export default defineConfig({
  testDir: "./tools/render-defects",
  testMatch: ["signal-frames.spec.ts"],
  outputDir: "./artifacts/playwright-render-defects",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  maxFailures: 1,
  reporter: [["list"]],
  timeout: 30 * 60_000,

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-render-defects",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: ["--use-gl=angle", "--use-angle=d3d11", "--disable-lcd-text"],
        },
      },
    },
  ],

  webServer: {
    command: "npm run preview -- --port 4322",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
