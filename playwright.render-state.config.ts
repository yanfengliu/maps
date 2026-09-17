import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

/**
 * The render-state capture config: the lane that attributes what the crossing
 * frames actually show.
 *
 * This is not a visual lane and not the render-defects lane. It produces no
 * certificate, `tools/visual/lane.ts` does not know it, and `verify-output.ts`
 * never reads its output. It exists because two recorded defects are questions
 * about *what is in the frame* — a stationary black surface over the northern
 * half of the crossing, and an empty far LOD — and neither can be answered by a
 * unit test or by reading the scene graph.
 *
 * Port 4323 is its own: 4319 is the verdict gate's server, 4320 the hardware
 * lane's, 4321 the populated lane's and 4322 the render-defects lane's, and
 * `reuseExistingServer: false` means whatever is on this port is this run's own
 * build or the run fails.
 *
 * Run it from a worktree, after that worktree's own build:
 *
 *   npm run build
 *   npx playwright test --config playwright.render-state.config.ts
 *
 * The hardware renderer is named rather than assumed, on the same terms as the
 * render-defects lane: `orbit.ts` refuses a silent software fallback by renderer
 * name.
 */
const PREVIEW_URL = "http://127.0.0.1:4323";

Object.assign(process.env, { MAPS_VISUAL_GPU: "hardware" });

export default defineConfig({
  testDir: "./tools/render-defects",
  testMatch: ["crossing-surface.spec.ts", "far-crowd.spec.ts"],
  outputDir: "./artifacts/playwright-render-state",
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
      name: "chromium-render-state",
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
    command: "npm run preview -- --port 4323",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
