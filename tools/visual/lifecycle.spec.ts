/** harness: OrbitDriver; ordinary loaded-page navigation must finish cleanup. */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { OrbitDriver } from "./orbit.js";
import { HERO_POSES, HERO_AZIMUTH } from "./shots.js";

/**
 * Renderer strings that mean this lane is measuring a rasteriser rather than the
 * application. Measured 2026-09-15 under SwiftShader: the fifteen-second
 * navigation bound is spent inside Chromium destroying the outgoing page's
 * WebGL resources, while the application's own `pagehide` work (`picker.dispose()`
 * plus `app.dispose()`) finishes in 2.1-4.3 ms and the replacement document's
 * first script has not run by the deadline. This lane therefore runs on the
 * hardware renderer (playwright.lifecycle.config.ts) and fails by name if the
 * backend is a software rasteriser.
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver|\bwarp\b/i;

/** Each run records its own timings, renderer and build hashes here. */
const RECORD_DIR = "artifacts/visual/lifecycle";

/** The build the run was measured against, hashed from the served bytes. */
async function buildFingerprint(): Promise<{ file: string; sha256: string }[]> {
  const files = [
    "dist/index.html",
    ...(await readdir("dist/assets"))
      .filter((name) => /\.(js|css)$/.test(name))
      .map((name) => `dist/assets/${name}`),
  ];
  const out: { file: string; sha256: string }[] = [];
  for (const file of files) {
    out.push({ file, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
  }
  return out;
}

test("navigates away from a refined city without blocking page cleanup", async ({ page }) => {
  // The first software run spent 95s refining before zoom and hit 120s during
  // setup. Give that setup its own finite budget; navigation still has 15s.
  // 30m setup + 15s navigation + 60s loaded check fits inside this 32m total.
  test.setTimeout(32 * 60_000);
  const driver = new OrbitDriver(page);
  const startedAt = new Date();
  let renderer = "";
  let preparationMs = 0;
  let navigationMs = 0;
  let replacementMs = 0;
  await test.step("prepare the refined city through both styles and camera distances", async () => {
    const prepareStart = Date.now();
    await test.step("initial load and refinement", async () => {
      await page.goto("/?time=dusk");
      // Read the renderer the run actually got, before the expensive refinement
      // rather than after it: on a software fallback this check must fail in
      // seconds, not hand a twenty-minute preparation to a bound that would
      // then measure the rasteriser.
      const reported = await page
        .waitForFunction(() => window.__mapsHarness?.status().glRenderer ?? false, undefined, {
          timeout: 120_000,
          polling: 250,
        })
        .catch(() => null);
      if (reported === null) {
        const bootError = await page.evaluate(
          () => document.querySelector("#boot-error")?.textContent ?? null,
        );
        throw new Error(
          "No renderer was reported within 120 s, so this lane cannot confirm it is running on the hardware renderer the " +
            "deliverable targets. " +
            (bootError === null
              ? "The page never published the harness bridge, so the app's boot or the browser's WebGL context failed."
              : `The app reported a boot failure: ${bootError}`) +
            " A machine with no usable GPU reports this check unavailable; that is never a pass and never a silent software fallback.",
        );
      }
      renderer = String(await reported.jsonValue());
      if (SOFTWARE_RENDERER.test(renderer)) {
        throw new Error(
          `The lifecycle check must run on the hardware renderer the deliverable targets, but Chromium reports "${renderer}". ` +
            "A software rasteriser spends about 28-30 s destroying the outgoing scene's WebGL resources at navigation, so the " +
            "15-second bound would measure the rasteriser instead of the application. Run this spec through " +
            "playwright.lifecycle.config.ts (`npm run visual`). A machine with no usable GPU reports this check unavailable; " +
            "that is never a pass and never a silent software fallback.",
        );
      }
      await driver.waitForFirstFrame();
      await driver.waitForTilesIdle();
    }, { timeout: 3 * 60_000 });
    for (const style of ["satellite", "cartographic"]) {
      await page.getByRole("combobox", { name: "World style" }).click();
      await page.keyboard.press(style === "satellite" ? "End" : "Home");
      await page.keyboard.press("Enter");
      for (const pose of HERO_POSES) {
        await test.step(`${style}: ${pose.name} controls and refinement`, async () => {
          await driver.zoomTo(pose.distance);
          await driver.orbitTo(HERO_AZIMUTH, pose.polar);
          await driver.waitForTilesIdle();
        }, { timeout: 8 * 60_000 });
      }
    }
    preparationMs = Date.now() - prepareStart;
  }, { timeout: 30 * 60_000 });
  await test.step("ordinary navigation completes cleanup within 15s", async () => {
    const start = Date.now();
    await page.goto("/?time=noon", { timeout: 15_000 });
    navigationMs = Date.now() - start;
  });
  await test.step("the replacement page renders within 60s", async () => {
    const start = Date.now();
    await driver.waitForFirstFrame(60_000);
    replacementMs = Date.now() - start;
  }, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__mapsHarness!.lighting().preset)).toBe("noon");

  // Record this run's own numbers. The gate claims three consecutive hardware
  // navigations; three separate records are what makes that checkable, and each
  // carries the renderer string and build hashes it was measured against.
  const record = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    url: "/?time=noon",
    glRenderer: renderer,
    preparationMs,
    navigationStepMs: navigationMs,
    replacementStepMs: replacementMs,
    build: await buildFingerprint(),
  };
  await mkdir(RECORD_DIR, { recursive: true });
  const file = join(RECORD_DIR, `lifecycle-${startedAt.toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(record, null, 2));
  console.log(
    `Lifecycle run on "${renderer}": preparation ${preparationMs} ms, navigation ${navigationMs} ms, ` +
      `replacement ${replacementMs} ms; recorded at ${file}`,
  );
});
