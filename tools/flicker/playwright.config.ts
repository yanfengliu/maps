/**
 * The flicker lane's own Playwright configuration.
 *
 * It is not the gate and it does not write `complete.json`. It exists because
 * the deliverable's dusk criterion - a preset that "holds still - no flicker or
 * crawl over a moving sequence" - has a half that no lane could judge: flicker
 * is a property *between* two frames, and until this lane existed every capture
 * in this repository settled the camera first. `tools/post-chain/motion.spec.ts`
 * is the nearest existing instrument and it was reused rather than paralleled:
 * its launch shape, its native-resolution screenshot and its digest-bound
 * verdict are all kept, and the one thing this lane changes is that it must not
 * settle.
 *
 * The environment is declared here rather than in an npm script, so a launch
 * cannot leave the lane out. Without `MAPS_VISUAL_LANE` the output would land in
 * the verdict lane's directory, and a sequence of moving frames written beside
 * the reviewed 44-frame still set is indistinguishable from it to a later
 * reader. Without `MAPS_VISUAL_GPU=hardware` `orbit.ts` would let Chromium
 * quietly pick a rasteriser, and a frame on this lane costs seconds there
 * against milliseconds here - which would put a wall-clock bound on the cadence
 * the lane exists to reach.
 *
 * Port 4324 is its own: 4319 is the verdict gate's, 4321 the populated lane's,
 * 4322 the render-defects capture's, 4323 the flythrough's. `reuseExistingServer:
 * false` means whatever is on the port is this run's own server or the run
 * fails, because a stale build of this app on the port would be photographed
 * under this lane's name.
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
  // Generous, because the motion is walked in small synthesised gestures and
  // each still is a native-resolution screenshot: the two-pattern default costs
  // about a minute of gesture time and about thirty screenshots.
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
