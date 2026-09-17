import { defineConfig, devices } from "@playwright/test";

/**
 * The frame-budget lane: what interval the delivered app actually holds at the
 * acceptance state, on the GPU.
 *
 * This is a hardware iteration lane, and the repository's rules for one apply to
 * it in full:
 *
 * - it names its renderer. `MAPS_VISUAL_GPU=hardware` is what makes
 *   `tools/visual/orbit.ts` throw by name instead of accepting a silent software
 *   fallback, and the unmasked `glRenderer` string is recorded in every result
 *   file this lane writes;
 * - it writes under its own ignored directory, `artifacts/frame-budget/`, named
 *   explicitly by the spec rather than resolved through `laneDir()`;
 * - `tools/visual/verify-output.ts` refuses it, because the lane runs under
 *   `hardware-iteration`, so no `complete.json` can ever name these numbers and
 *   nothing here is pixel evidence.
 *
 * The 1920x1080 viewport is the lane's own and not `CAPTURE_VIEWPORT`: the target
 * in `src/world/frame.ts` is written at 1920x1080, and the spec asserts the
 * drawing buffer's size before it times anything, so a run that somehow got
 * another size fails by name instead of quoting its number as 1080p.
 *
 * Port 4335 is this lane's own. 4319 is the verdict gate's server, 4320 the
 * hardware lane's, 4321 the populated lane's, 4322 the render-defects lane's,
 * 4330 and 4331 the frame-time lane's, and 4329 was observed held by another
 * process on this machine. `reuseExistingServer: false` means a stale server is a
 * failure rather than something to attach to.
 *
 * It does **not** own a build step. The lane measures whatever `dist/` the preview
 * server is serving, and every result carries the SHA-256 of those bytes, so a
 * stale build is visible in the record rather than silently inherited. Run
 * `npm run build` in this worktree before the lane; run it nowhere else.
 */
const PREVIEW_URL = "http://127.0.0.1:4335";

// Set before anything reads it, exactly as the other hardware lanes do, so a
// launch cannot leave the lane out. Without it the renderer check in
// `tools/visual/orbit.ts` is skipped, and a software frame could be reported as a
// hardware one.
Object.assign(process.env, { MAPS_VISUAL_LANE: "hardware-iteration", MAPS_VISUAL_GPU: "hardware" });

export default defineConfig({
  testDir: "./tools/frame-budget",
  testMatch: ["frame-budget.spec.ts", "sweep.spec.ts"],
  outputDir: "./artifacts/playwright-frame-budget",
  // One scenario at a time. Each is a load of the whole city, the agent asset set
  // and a population of thousands; two at once contend for the GPU and the CPU and
  // neither number would describe a frame.
  workers: 1,
  fullyParallel: false,
  // No retries: a window that only reproduces on the second attempt is an unstable
  // measurement, and reporting the second attempt hides exactly that.
  retries: 0,
  maxFailures: 1,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: [["list"]],

  use: {
    baseURL: PREVIEW_URL,
    viewport: { width: 1920, height: 1080 },
    // 1 so the drawing buffer is the size the claim names rather than a multiple of
    // it: `renderer.setPixelRatio` is capped at 2, so a device scale factor above 1
    // would time a quarter-million more pixels and report it as 1080p.
    deviceScaleFactor: 1,
    trace: "off",
    video: "off",
    screenshot: "off",
  },

  // The lane's own backstop. A scenario waits for the tileset to settle and for
  // the crowd to be drawn before its window opens, and the CPU is shared with
  // whatever else the machine runs, so the wait is not bounded by this machine's
  // speed. Every individual wait inside the spec has its own bound and names what
  // it was waiting for; this only stops a hung browser running forever.
  timeout: 40 * 60_000,
  expect: { timeout: 120_000 },

  projects: [
    {
      name: "chromium-frame-budget",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The hardware launch shape the lifecycle, populated and frame-time
            // lanes use, reused rather than invented. No software fallback argument
            // is present: if the GPU is unusable the run fails by renderer name
            // instead of reporting a slow software frame as a hardware one.
            "--use-gl=angle",
            "--use-angle=d3d11",
            "--disable-lcd-text",
            // The scene is served from disk by the preview server. Without a cache
            // budget the browser may evict it between scenarios, which would turn a
            // frame-interval measurement into a measurement of disk reads.
            "--disk-cache-size=1073741824",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "npm run preview -- --port 4335",
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
