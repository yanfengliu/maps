/**
 * The paint-reference review lane.
 *
 * It exists to answer one acceptance criterion — `plan.md`'s "road markings
 * match reference imagery" — which needs three things no existing lane produces
 * together: a 1:1 frame the reviewer can crop, the GSI aerial reference decoded
 * to pixels, and the world coordinates of both.
 *
 * Four things it is not:
 *
 * - **Not the verdict lane.** It never writes into `artifacts/visual/` and
 *   produces no `complete.json`; it has its own evidence root. The 44-frame
 *   certified set stays the only reviewable appearance set, for the reason
 *   `tools/visual/lane.ts` gives.
 * - **Not the appearance lane.** That lane runs the sweep and hero poses through
 *   `tools/visual` at 1280x720; this one runs three poses aimed at the crossing
 *   at 1:1 and adds a reference decode and an analysis on top.
 * - **Not comparable across renderers, and it does not need to be.** A crop of
 *   this lane's frames is evidence about *this lane's bytes*, named by digest in
 *   the review it feeds. The renderer is recorded and refused by name through
 *   `HARDWARE_RENDERER_DENYLIST`, the same predicate `playwright.config.ts` and
 *   the lifecycle lane use, so a silent software fallback cannot be reported as a
 *   hardware frame.
 * - **Not a certificate.** There is no artifact here a later reader could
 *   mistake for a gate result.
 *
 * Port 4331: 4319 is the verdict gate's server, 4321 the populated lane and
 * 4322/4323 two further lanes. 4324 and 4329
 * were both already held by other lanes' node processes when this one was first
 * run, which is exactly the condition this paragraph exists for — a lane must
 * take a port no other lane uses rather than the next number after the last one
 * somebody wrote down. `reuseExistingServer: false` plus the app-id check in
 * `tools/visual/orbit.ts` means an unrelated server on this port fails the run
 * rather than being photographed.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");

/** Where this lane's evidence lands. Ignored, and never `artifacts/visual/`. */
export const PAINT_REVIEW_ROOT = path.resolve(REPO_ROOT, "artifacts/paint-review");

export const PAINT_REVIEW_PORT = 4331;
const PREVIEW_URL = `http://127.0.0.1:${PAINT_REVIEW_PORT}`;

// `tools/visual/orbit.ts` refuses a software rasteriser only when this is set,
// and it is also what the launch args below are for. Set here rather than in an
// npm script so the renderer request and the check that enforces it cannot come
// apart.
process.env["MAPS_VISUAL_GPU"] = "hardware";

export default defineConfig({
  testDir: here,
  testMatch: ["capture.spec.ts", "reference.spec.ts"],
  outputDir: path.resolve(PAINT_REVIEW_ROOT, "playwright-output"),
  // One camera on one page, and one reference decode. Parallel workers would
  // contend for the single GPU the captures need.
  workers: 1,
  fullyParallel: false,
  // A capture that only passes on the second attempt is unstable, and a retry
  // would hide exactly that.
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"]],
  // Six captures with a settle each, on the hardware renderer: minutes, not
  // hours. The bound is loose enough to report a real failure rather than a
  // clock, and tight enough that a softwarised run says so quickly.
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: PREVIEW_URL,
    // 1280x720 at deviceScaleFactor 1, so a captured pixel is a framebuffer
    // pixel and a crop is a crop of what the app drew.
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "paint-review-hardware",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape `playwright.hardware.config.ts` and the
            // lifecycle lane already use, reused rather than invented. No
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
    command: `npm run preview -- --port ${PAINT_REVIEW_PORT}`,
    cwd: REPO_ROOT,
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
