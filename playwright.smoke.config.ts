import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

/**
 * The pre-flight for the verdict lane: the same renderer, the same viewport, the
 * same preview server contract, the same assertions a capture's first minute
 * would make, and no captures at all.
 *
 * It is a separate configuration rather than a flag on `playwright.config.ts` for
 * the reason the gate's own comments give about renderer switches: a check that
 * can be turned into the evidence lane by an environment variable is a check that
 * will eventually be run as evidence. This lane writes under
 * `artifacts/playwright-smoke/`, it never produces a certificate, and
 * `verify-output.ts` knows nothing about it.
 *
 * It runs on SwiftShader deliberately. The failures it exists to catch — a
 * renderer fallback, a post-chain pass missing, a control that no longer offers
 * its options — are the ones that kill a three-hour capture, and they are only
 * visible on the renderer that capture uses.
 *
 * Port 4336, which no other lane holds: 4319 is the verdict and lifecycle lane's,
 * 4320 the hardware iteration lane's, 4321 the populated lane's, 4322 the
 * render-defects lane's, 4323 the flythrough lane's, 4330 the post-chain lane's,
 * 4335 the frame-budget lane's.
 */
const PREVIEW_URL = "http://127.0.0.1:4336";

export default defineConfig({
  testDir: "./tools/visual",
  testMatch: ["smoke.spec.ts"],
  outputDir: "./artifacts/playwright-smoke",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  maxFailures: 1,
  reporter: [["list"]],
  timeout: 5 * 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-smoke",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-lcd-text"],
        },
      },
    },
  ],

  webServer: {
    command: "npm run preview -- --port 4336",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
