/**
 * The World style control's lane.
 *
 * It answers one acceptance criterion — `docs/work/0_shibuya-1km/plan.md:160`,
 * "the actual World style dropdown switches both ways with pointer and keyboard
 * input, preserves camera and simulation progress, and takes its options from a
 * registry that can accept later styles" — and it is not the verdict lane, so it
 * writes nothing into `artifacts/visual/`.
 *
 * **Hardware renderer, on purpose.** This lane compares a camera pose, a
 * population counter and a switch in flight, and its expensive part is the
 * 3,000-pedestrian fixed step rather than the rasteriser. The owner's directive
 * that anything which can run on the GPU must not run on the CPU applies to work
 * as well as to rendering, and this lane's pixels are quoted only as evidence
 * that a switch happened and that no frame went blank, never as the appearance
 * verdict. `MAPS_VISUAL_GPU=hardware` makes `tools/visual/orbit.ts` refuse a
 * silent software fallback by renderer name, so a run that quietly softwarised
 * fails by name instead of reporting a slow CPU frame as a hardware one.
 *
 * **Its own port.** 4319 is the verdict gate's preview server, 4320 the hardware
 * iteration lane's, 4321 the populated lane's and 4322 the render-defect lane's.
 * 4324 cannot attach to any of them, and `reuseExistingServer: false` means it
 * cannot inherit a stale build either.
 *
 * This lane does **not** run `npm run build`. The spec records the SHA-256 of the
 * JavaScript bundle it was served, so the build under test is named in its own
 * manifest rather than assumed.
 */
import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

process.env["MAPS_VISUAL_GPU"] = "hardware";

const PREVIEW_URL = "http://127.0.0.1:4324";

export default defineConfig({
  testDir: "./tools/style-ui",
  outputDir: "./artifacts/playwright-style-ui",
  // One page, one population, one simulated timeline. A second browser would be
  // a second simulation, and the ticks this lane compares would be two clocks
  // rather than one.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { outputFolder: "./artifacts/playwright-report-style-ui", open: "never" }]],

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  // A backstop rather than a budget. The boot loads ~148 MB of scene and the
  // acceptance population's own assets, and every wait below carries a named
  // ceiling of its own; this is the outer one.
  timeout: 60 * 60_000,
  expect: { timeout: 60_000 },

  projects: [
    {
      name: "chromium-style-ui",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape the lifecycle and populated lanes use.
            // No software-fallback argument is present: if the GPU is unusable
            // this fails by renderer name rather than measuring SwiftShader.
            "--use-gl=angle",
            "--use-angle=d3d11",
            "--disable-lcd-text",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "npm run preview -- --port 4324",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
