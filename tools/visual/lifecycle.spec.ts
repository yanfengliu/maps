/** harness: OrbitDriver; ordinary loaded-page navigation must finish cleanup. */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { LIFECYCLE_TEST_BUDGET_MS } from "./budget.js";
import { HARDWARE_RENDERER_DENYLIST } from "./lane.js";
import { writeLifecycleRecord, type LifecycleRecord } from "./lifecycle-record.js";
import { OrbitDriver } from "./orbit.js";
import { collectPageErrors } from "./page-errors.js";
import { HERO_POSES, HERO_AZIMUTH } from "./shots.js";
import {
  TEARDOWN_COMPLETED,
  TEARDOWN_RECORD_KEY,
  teardownRecordRefusal,
  type TeardownRecord,
} from "../../src/harness/teardown.js";

/**
 * Renderer strings that mean this lane is measuring a rasteriser rather than the
 * application. Measured 2026-09-15 under SwiftShader: the fifteen-second
 * navigation bound is spent inside Chromium destroying the outgoing page's WebGL
 * resources, while the application's own `pagehide` work (`picker.dispose()`
 * plus `app.dispose()`) finishes in 2.1-4.3 ms and the replacement document's
 * first script has not run by the deadline. This lane therefore runs on the
 * hardware renderer (playwright.lifecycle.config.ts) and fails by name if the
 * backend is a software rasteriser.
 *
 * The denylist itself is in `lane.ts`, beside the pixel lane's positive
 * predicate: both halves of the renderer split are stated in one place.
 */
const SOFTWARE_RENDERER = HARDWARE_RENDERER_DENYLIST;

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
  // 10m setup + 30m preparation + 60s loaded check + 5m margin fits inside this
  // 45m total. The total is in `tools/visual/budget.ts` with the other lanes'
  // budgets, because it runs three times inside the wrapper and the three together
  // have to fit the wrapper's declared deadline.
  test.setTimeout(LIFECYCLE_TEST_BUDGET_MS);
  const driver = new OrbitDriver(page);
  // Attached before the first navigation, so the list covers the whole run: the
  // preparation, the navigation away, and the replacement document's boot. What it
  // cannot cover is the one failure this lane exists for — see the teardown record
  // below.
  const pageErrors = collectPageErrors(page);
  const startedAt = new Date();
  let renderer = "";
  let preparationMs = 0;
  let navigationMs = 0;
  let replacementMs = 0;
  let teardown: TeardownRecord | null = null;
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
    // Cleared inside the outgoing document immediately before the navigation, so
    // the value read afterwards is this navigation's own outcome. Session storage
    // is same-origin and survives the navigation, so the replacement document can
    // read what the outgoing one recorded on its way out.
    //
    // This is the check the elapsed-time bounds cannot make. Measured 2026-09-16
    // on Chromium 153.0.8010.12: a throw inside a `pagehide` handler reaches
    // neither `page.on("pageerror")` nor `page.on("console")` nor CDP
    // `Runtime.exceptionThrown`/`Log.entryAdded` — the listeners attached above
    // are silent for it — and the throw makes the cleanup finish *faster*, which
    // is the direction the 15-second bound reads as a pass.
    await page.evaluate((key) => sessionStorage.removeItem(key), TEARDOWN_RECORD_KEY);
    const start = Date.now();
    await page.goto("/?time=noon", { timeout: 15_000 });
    navigationMs = Date.now() - start;
    teardown = (await page.evaluate(
      (key) => sessionStorage.getItem(key),
      TEARDOWN_RECORD_KEY,
    )) as TeardownRecord | null;
  });
  await test.step("the replacement page renders within 60s", async () => {
    const start = Date.now();
    await driver.waitForFirstFrame(60_000);
    replacementMs = Date.now() - start;
  }, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__mapsHarness!.lighting().preset)).toBe("noon");

  // The outgoing page's cleanup ran to completion. Without this, the navigation
  // can be satisfied by a disposer that threw and skipped every disposal after it.
  expect(
    teardownRecordRefusal(teardown, "This navigation"),
    "the outgoing page's cleanup has no witness, so this navigation is not evidence that it ran",
  ).toBeNull();
  expect(teardown).toBe(TEARDOWN_COMPLETED);

  // And the page said nothing out loud while it prepared, navigated and booted the
  // replacement. Bound: an empty list is evidence that nothing was *reported*
  // through these channels, not proof that nothing threw — the `pagehide` throw
  // this lane is about is invisible to both, which is why the record above exists.
  expect(
    pageErrors,
    "the page reported errors during preparation, navigation or the replacement boot, so this run is " +
      "not evidence that the outgoing page's cleanup completed:",
  ).toEqual([]);

  // Record this run's own numbers. The gate claims three consecutive hardware
  // navigations; three separate records are what makes that checkable, and each
  // carries the renderer string, the teardown outcome and the build hashes it was
  // measured against.
  const record: LifecycleRecord = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    url: "/?time=noon",
    glRenderer: renderer,
    preparationMs,
    navigationStepMs: navigationMs,
    replacementStepMs: replacementMs,
    consoleAndPageErrors: pageErrors,
    teardownRecord: teardown ?? "(none recorded)",
    build: await buildFingerprint(),
  };
  const file = await writeLifecycleRecord(record);
  console.log(
    `Lifecycle run on "${renderer}": preparation ${preparationMs} ms, navigation ${navigationMs} ms, ` +
      `replacement ${replacementMs} ms, teardown "${record.teardownRecord}"; recorded at ${file}`,
  );
});
