/**
 * Agent-free GPU iteration lane, never a certificate. The existing app input
 * path and read-only bridge are reused. Canvas copies are made inside RAF;
 * native PNG encoding follows each bounded burst. Port4324 is task-owned and
 * reuseExistingServer:false refuses an unrelated or stale server.
 */

import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { FLICKER_ITERATION_ENV } from "../visual/lane.js";
import { CAPTURE_VIEWPORT } from "../visual/shots.js";

const HERE = import.meta.dirname;
const REPO_ROOT = path.resolve(HERE, "..", "..");

Object.assign(process.env, FLICKER_ITERATION_ENV);

const PREVIEW_URL = "http://127.0.0.1:4324";

export default defineConfig({
  testDir: HERE,
  // One spec, and it is the lane. `judge.ts` and `motion.ts` are its predicates
  // and its input path, not tests, and must never be collected as ones.
  testMatch: ["capture.spec.ts"],
  outputDir: path.join(REPO_ROOT, "artifacts", "flicker", "playwright"),
  // One page and one continuous camera path. A second browser would be a second
  // simulation whose frames do not belong to the same sequence.
  workers: 1,
  fullyParallel: false,
  // No retries: a run that passes on the second attempt has reported something
  // unstable, and instability between two frames is the whole subject.
  retries: 0,
  maxFailures: 1,
  reporter: [["list"]],
  // Setup/refinement dominates the bounded 12-frame bursts.
  timeout: 7 * 60_000,
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
      name: "chromium-flicker-iteration",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape the lifecycle, populated and flythrough
            // lanes use. No software-fallback argument is present: if the GPU is
            // unusable the run fails by renderer name rather than reporting a
            // slow software frame as a hardware one.
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
    cwd: REPO_ROOT,
    url: PREVIEW_URL,
    // Never reuse. Whatever is already on the port might be a stale build of
    // this app or another project entirely.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
