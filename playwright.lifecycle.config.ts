import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

/**
 * The lifecycle lane: ordinary navigation away from the refined city, on the
 * renderer the deliverable targets.
 *
 * `lifecycle.spec.ts` is the one check that measures what the renderer does with
 * the outgoing page's WebGL resources. Under SwiftShader that work swamps the
 * spec's own fifteen-second navigation bound: measured 2026-09-15, Chromium
 * needed about 28-30 s to destroy the outgoing scene's context while the
 * application's own `pagehide` work (`picker.dispose()` plus `app.dispose()`)
 * finished in 2.1-4.3 ms, and the replacement document's first script had not
 * run by the deadline. That is the rasteriser's teardown, not the application.
 *
 * The split the two lanes were built around is gone: since the owner's 2026-09-16
 * instruction the appearance lane draws on the hardware renderer too, so this is
 * no longer the one lane on the GPU. It keeps its own config because it is a
 * different question with its own bounds — the same URL, preparation, viewport,
 * assertions and 15 s / 60 s limits — and the spec still asserts the renderer it
 * actually got, so a machine without a usable GPU fails here by name instead of
 * passing on a silent software fallback.
 */
const PREVIEW_URL = "http://127.0.0.1:4319";

export default defineConfig({
  testDir: "./tools/visual",
  testMatch: ["lifecycle.spec.ts"],
  outputDir: "./artifacts/playwright-lifecycle",
  // One browser at a time. The subject is what the renderer does with one
  // page's resources, so a second browser would change the measurement.
  workers: 1,
  fullyParallel: false,
  // No retries, for the same reason the pixel lane has none: a lifecycle check
  // that passes on the second attempt has told you something is unstable.
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { outputFolder: "./artifacts/playwright-report-lifecycle", open: "never" }]],

  use: {
    baseURL: PREVIEW_URL,
    viewport: { ...CAPTURE_VIEWPORT },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-hardware",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware path Chromium takes on this machine, matched to the
            // arm that passed the check on 2026-09-15. No software fallback arg
            // is present: if the GPU is unusable the spec's own renderer
            // assertion fails the run rather than measuring SwiftShader.
            "--use-gl=angle",
            "--use-angle=d3d11",
            "--disable-lcd-text",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "npm run preview",
    url: PREVIEW_URL,
    // Never reuse. Whatever is already on the port might be a stale build of
    // this app or another project entirely, and both look like a working server.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
