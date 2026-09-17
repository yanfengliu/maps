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

// Declared here rather than left to the launch flags, exactly as the iteration
// lanes do it: `MAPS_VISUAL_GPU=hardware` is what makes `tools/visual/orbit.ts`
// throw by name when Chromium reports a renderer that is not this machine's GPU,
// so a silent software fallback fails at the first frame with a message about the
// renderer rather than producing 44 CPU frames that look like a capture.
Object.assign(process.env, { MAPS_VISUAL_GPU: "hardware" });

export default defineConfig({
  testDir: "./tools/visual",
  outputDir: "./artifacts/playwright",
  // This is the appearance lane: the 44-frame sweep and hero capture, plus the
  // style-picker fixture, on the hardware renderer since the owner's 2026-09-16
  // instruction ("if you can use GPU, don't use CPU").
  //
  // It ran on SwiftShader until that instruction, on the argument that a pixel
  // set captured on one renderer cannot inherit a review written for another, and
  // the argument cost about a fifty-fold tax: measured 2026-09-17, a 1280x720
  // frame cost 302.4 s on the software lane against 16.7 ms for the same pose on
  // the RTX 4090, and the capture held 7.7 of 32 cores continuously while the GPU
  // sat idle. The frames were never compared across machines — the gate checks
  // that they are distinct, non-blank, freshly timestamped and pose-recorded, and
  // the reviews are by eye at native resolution — so what the software renderer
  // bought was machine-independent bytes that nothing read. What pays for that
  // now is the certificate: it names the renderer, the GPU and the driver version
  // (`tools/visual/gpu-identity.ts`), and every review stays bound to the digest
  // of the frames it inspected.
  //
  // The lanes are no longer split by renderer. `lifecycle.spec.ts` keeps its own
  // config because it is a different question with its own timings, and this line
  // is still load-bearing for `smoke.spec.ts`: it lives in this directory, so
  // without it the appearance lane collects it and a capture run silently gains a
  // fourth, unplanned spec. It asserts preconditions and captures nothing, and it
  // belongs to `playwright.smoke.config.ts` alone. Measured by round 31's review,
  // 2026-09-16.
  testIgnore: ["lifecycle.spec.ts", "smoke.spec.ts"],
  // A per-test budget of two minutes, and the reason is measured rather than
  // defensive habit. On 2026-09-16 the 30-second default killed a three-hour run
  // that had already written all eight hero frames in an hour: the next spec,
  // `style-picker.spec.ts`, failed with `Test timeout of 30000ms exceeded while
  // setting up "context"` and `browser.newContext: Protocol error
  // (Browser.setDownloadBehavior)`. That is a browser that cannot create a context
  // in thirty seconds, which is a starved machine rather than a defect — the same
  // spec runs in 405 ms on an idle one — and the timeout, not the assertion, is
  // what ended the run. The budget covers setup as well as assertions, so it must
  // not be the smallest number that works on the quietest machine.
  //
  // This weakens nothing: no assertion changes, no retry is added, `maxFailures: 1`
  // still stops the lane at the first real failure, and the specs that need more
  // than two minutes already set their own budget — `hero.spec.ts` carries
  // `HERO_TEST_BUDGET_MS`, a software-pace backstop the hardware lane no longer
  // needs and keeps as one. What it buys is that a loaded machine cannot convert a
  // scheduling problem into a red gate whose message blames the pixels.
  timeout: 120_000,
  // The three specification files are independent: `hero.spec.ts` drives one page
  // through two times of day, `sweep.spec.ts` runs one page per style, and
  // `style-picker.spec.ts` runs a DOM fixture that renders no city at all. One
  // worker per file is the whole of the concurrency available here, so this is the
  // measurement's upper arm.
  //
  // Measured 2026-09-17 on the RTX 4090 over the same ten hero captures: see the
  // concurrency table in `docs/policies/local-rules.md`. The comment this replaces
  // claimed a second browser "would fight for one software rasteriser and would
  // not be faster" — true of the software lane, where every worker contends for
  // one CPU, and false here, where a frame is a submission to an idle GPU.
  // `workers: 1` was part of what made 44 frames take three hours. The number is
  // set from that measurement now, and the rule it follows is the owner's: if you
  // can use multi-core, do not use single core.
  workers: 3,
  fullyParallel: false,
  // No retries. A visual gate that passes on the second attempt has told you
  // something is unstable, and hiding that is the whole problem.
  retries: 0,
  // Keep the first failed trace and stop: later screenshots cannot complete a
  // rejected evidence set.
  maxFailures: 1,
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
            // The hardware launch shape the lifecycle lane has driven since
            // 2026-09-15, reused rather than invented
            // (`playwright.lifecycle.config.ts`, project `chromium-hardware`). No
            // software fallback argument is present: a Chromium that cannot use
            // the GPU fails by renderer name at its first frame instead of drawing
            // the appearance set on the CPU.
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
