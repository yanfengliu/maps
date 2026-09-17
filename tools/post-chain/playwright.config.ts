/**
 * The post-chain lane's own Playwright configuration.
 *
 * It is not the gate and it does not write `complete.json`. It exists so the
 * dusk post chain can be driven and photographed on the hardware renderer,
 * where a frame costs 16.7 ms instead of SwiftShader's p50 of 2,416 ms, while
 * the verdict lane's 44 frames stay on SwiftShader and untouched.
 *
 * Port 4330, which no other lane holds: 4319 is the verdict and lifecycle
 * lane's, 4320 is the hardware iteration lane's, 4321 is the populated lane's,
 * 4322 is the render-defects lane's, and 5319 is the dev server's.
 */

import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "../visual/shots.js";

const HERE = import.meta.dirname;
const REPO_ROOT = path.resolve(HERE, "..", "..");

const PREVIEW_URL = "http://127.0.0.1:4330";

export default defineConfig({
  testDir: HERE,
  testMatch: ["*.spec.ts"],
  outputDir: path.join(REPO_ROOT, "artifacts", "post-chain", "playwright"),
  // One page and one continuous camera path. A second browser would change what
  // is being measured.
  workers: 1,
  fullyParallel: false,
  // No retries: a run that passes on the second attempt has reported something
  // unstable, and hiding that is the whole problem.
  retries: 0,
  maxFailures: 1,
  reporter: [["list"]],
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    // 1 so a captured pixel is a framebuffer pixel and the frames are at the
    // resolution their filenames claim.
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-post-chain-hardware",
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
    command: "npm run preview -- --port 4330",
    cwd: REPO_ROOT,
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
