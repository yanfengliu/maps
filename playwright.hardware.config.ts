import { defineConfig, devices } from "@playwright/test";

import { HARDWARE_ITERATION_ENV } from "./tools/visual/lane.js";
import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

// The lane is declared here rather than in the npm script so it cannot be left
// out: a hardware launch with no lane declared would write into the verdict
// directory, and `MAPS_VISUAL_GPU=hardware` is also what makes `orbit.ts` refuse
// a silent software fallback. Deliberately overriding any inherited value —
// running this lane while `MAPS_VISUAL_GPU=hardware` is already exported for the
// lifecycle lane must not change which directory these frames land in.
Object.assign(process.env, HARDWARE_ITERATION_ENV);

/**
 * The hardware iteration lane: the same sweep and hero captures, at the same
 * 1280x720 viewport, the same seeds, the same poses and the same URL, on the
 * renderer the deliverable targets.
 *
 * It exists to make iteration cheap. Measured 2026-09-15/16 against the
 * production build (`artifacts/gate-timing/REPORT.md`): the same 44-frame pass
 * costs roughly three hours on the SwiftShader verdict lane and a few minutes
 * here, because the frame interval is 16.7 ms instead of a p50 of 2,416 ms.
 *
 * **This lane is not evidence and produces no certificate.** A pixel set
 * captured on one renderer cannot inherit a review written for another, so:
 *
 * - it writes under its own ignored directory, `artifacts/visual-hardware/`,
 *   selected by `MAPS_VISUAL_LANE` rather than by a flag a spec could ignore;
 * - the renderer is named in the console and in every manifest it writes, and
 *   `MAPS_VISUAL_GPU=hardware` makes `orbit.ts` throw by name if Chromium
 *   silently falls back to a software rasteriser;
 * - `tools/visual/verify-output.ts` refuses it, so no `complete.json` can name
 *   these frames. The software lane's 44 frames stay the only verdict evidence.
 *
 * The verdict lane stays exactly as it was: `playwright.config.ts` still pins
 * SwiftShader and still has no switch that could move it here.
 */
const PREVIEW_URL = "http://127.0.0.1:4320";

export default defineConfig({
  testDir: "./tools/visual",
  // The same two specs the verdict lane captures from, and only those. The
  // lifecycle spec has its own lane and its own renderer question.
  testMatch: ["hero.spec.ts", "sweep.spec.ts"],
  outputDir: "./artifacts/playwright-hardware",
  // One continuous camera path through one page. A second browser would change
  // what is being measured and cannot make the path faster.
  workers: 1,
  fullyParallel: false,
  // No retries: a capture that passes on the second attempt has told you
  // something is unstable, and hiding that is the whole problem.
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { outputFolder: "./artifacts/playwright-report-hardware", open: "never" }]],

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    // 1 so a captured pixel is a framebuffer pixel and the frames are at the
    // resolution their filenames claim, exactly as in the verdict lane.
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  // An iteration lane has to fail out loud when it is not fast. The specs carry
  // the verdict lane's 60- and 70-minute budgets, which exist because a
  // SwiftShader frame costs seconds; here they would let a softwarised run sit
  // for most of an hour before anyone learned the renderer was wrong. This
  // budget is wider than one settle's own bounds (a 30-minute wall-clock
  // backstop, or 320 frames) so a slow-but-alive run still reports the failure
  // that actually happened, and tight enough that a silent fallback does not
  // cost an hour of the team's time.
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },

  projects: [
    {
      name: "chromium-hardware-iteration",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape is the lifecycle lane's, reused rather
            // than invented (`playwright.lifecycle.config.ts`, project
            // `chromium-hardware`). No software fallback arg is present: if the
            // GPU is unusable the run fails by renderer name instead of
            // reporting a fast software frame as a hardware one.
            "--use-gl=angle",
            "--use-angle=d3d11",
            "--disable-lcd-text",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "npm run preview -- --port 4320",
    url: PREVIEW_URL,
    // Its own port, so this lane can never attach to the server the verdict gate
    // owns on 4319 — and never reuse a stale server: whatever is already on a
    // port might be a stale build of this app or another project entirely.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
