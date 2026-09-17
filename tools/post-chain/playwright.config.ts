/**
 * The post-chain lane's own Playwright configuration.
 *
 * It is not the gate and it does not write `complete.json`. It exists so the
 * dusk post chain can be driven and photographed on the renderer the question is
 * about, where a frame costs 16.7 ms over D3D11 instead of SwiftShader's p50 of
 * 2,416 ms, while the verdict lane's 44 frames stay on SwiftShader and untouched.
 *
 * Two arms, because the defect this lane was built for turned out to be a
 * question about frame counts and the answer had to be the same on both
 * renderers that capture the deliverable:
 *
 * - `hardware` (the default) — `--use-angle=d3d11`, port 4330.
 * - `software` — SwiftShader, port 4331, the verdict lane's own launch shape
 *   copied rather than invented. It is a separate port on purpose: the two arms
 *   must never attach to each other's preview server, because a run that did
 *   would report one renderer's numbers under the other's name.
 *
 * An unrecognised arm throws instead of defaulting, the same refusal
 * `tools/visual/lane.ts` makes for an unknown lane.
 *
 * Ports: 4319 is the verdict and lifecycle lane's, 4320 the hardware iteration
 * lane's, 4321 the populated lane's, 4322 the render-defects lane's, 5319 the
 * dev server's.
 */

import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { CAPTURE_VIEWPORT } from "../visual/shots.js";

const HERE = import.meta.dirname;
const REPO_ROOT = path.resolve(HERE, "..", "..");

/** The arms this lane knows, and which renderer each one must report. */
const ARMS = ["hardware", "software"] as const;
export type PostChainArm = (typeof ARMS)[number];

const ARM = (process.env["MAPS_POST_CHAIN_ARM"] ?? "hardware") as PostChainArm;
if (!ARMS.includes(ARM)) {
  throw new Error(
    `MAPS_POST_CHAIN_ARM is "${ARM}", which is not an arm this lane knows. It takes one of: ` +
      `${ARMS.join(", ")}. An unknown value is refused rather than defaulted, because a run that ` +
      "asked for the software arm and silently got the hardware one would report a fast frame as " +
      "a measurement of SwiftShader.",
  );
}
// Restated so a worker process sees the arm even when the caller left it unset.
process.env["MAPS_POST_CHAIN_ARM"] = ARM;

const SOFTWARE = ARM === "software";
const PREVIEW_URL = SOFTWARE ? "http://127.0.0.1:4331" : "http://127.0.0.1:4330";
const PREVIEW_PORT = SOFTWARE ? "4331" : "4330";

/**
 * The verdict lane's SwiftShader launch shape, character for character from
 * `playwright.config.ts`, so this arm measures the renderer the 44 frames are
 * actually captured on rather than a similar-looking one.
 */
const SOFTWARE_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-lcd-text"];
const HARDWARE_ARGS = ["--use-gl=angle", "--use-angle=d3d11", "--disable-lcd-text"];

export default defineConfig({
  testDir: HERE,
  testMatch: ["*.spec.ts"],
  outputDir: path.join(REPO_ROOT, "artifacts", "post-chain", `playwright-${ARM}`),
  // One page and one continuous camera path. A second browser would change what
  // is being measured.
  workers: 1,
  fullyParallel: false,
  // No retries: a run that passes on the second attempt has reported something
  // unstable, and hiding that is the whole problem.
  retries: 0,
  maxFailures: 1,
  reporter: [["list"]],
  // The software arm pays seconds a frame, so its budget is the verdict lane's
  // 60-minute spec budget rather than the hardware arm's 20.
  timeout: SOFTWARE ? 60 * 60_000 : 20 * 60_000,
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
      name: `chromium-post-chain-${ARM}`,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { ...CAPTURE_VIEWPORT },
        deviceScaleFactor: 1,
        launchOptions: { args: SOFTWARE ? SOFTWARE_ARGS : HARDWARE_ARGS },
      },
    },
  ],

  webServer: {
    command: `npm run preview -- --port ${PREVIEW_PORT}`,
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
