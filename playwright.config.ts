import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "./tools/visual/shots.js";

/**
 * The visual gate runs against the production build, served by `vite preview`,
 * not against the dev server. The gate should photograph what ships.
 *
 * The port is deliberately not Vite's 4173 default. Every repo in this fleet
 * previews on that port, and a sibling project's preview was found holding it
 * during Phase 0 — with `reuseExistingServer` on, the gate attached to that app
 * instead. Three things stop it happening again: this port, `strictPort` in
 * `vite.config.ts` so a clash fails loudly instead of drifting to the next free
 * port, and the `app-id` check the harness makes before it captures anything.
 */
const PREVIEW_URL = "http://127.0.0.1:4319";

export default defineConfig({
  testDir: "./tools/visual",
  outputDir: "./artifacts/playwright",
  // The sweep is one continuous camera path through one page. Splitting it
  // across workers would mean several browsers fighting for a software
  // rasteriser and would not make it faster.
  workers: 1,
  fullyParallel: false,
  // No retries. A visual gate that passes on the second attempt has told you
  // something is unstable, and hiding that is the whole problem.
  retries: 0,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"], ["html", { outputFolder: "./artifacts/playwright-report", open: "never" }]],

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
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // No GPU is guaranteed on a CI runner, and headless Chromium will
            // otherwise refuse a WebGL context rather than fall back. SwiftShader
            // makes the gate produce the same pixels on every machine, which is
            // what a gate needs more than it needs speed.
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
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
