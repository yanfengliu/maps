/**
 * The visual gate's pre-flight: the assertions that decide whether a capture is
 * worth starting, in seconds instead of after a long capture.
 *
 * Why it exists. On 2026-09-16 the coordinator started `npm run visual` three
 * times against a revision whose World style control had changed shape, and each
 * run died on the same assertion about twenty-eight seconds in — after the
 * `--reset`, after the build, and inside a lane that had already been announced
 * as the deliverable's evidence. The lesson is not "check the control"; it is
 * that the cheap check and the expensive one were the same check, and there was
 * no way to ask it without paying for the expensive one. This is that way.
 *
 * It asserts only what a capture's *first minute* would tell you, and it captures
 * nothing:
 *
 * - the production build boots, the preview server is serving this app, and the
 *   harness is present and readable;
 * - the renderer is the gate's hardware renderer, through the pixel lane's own
 *   predicate rather than a copy of it, so a browser that fell back to a software
 *   rasteriser fails here by name instead of in the certificate;
 * - the post chain is active and carrying the four passes, which is what
 *   `hero.spec.ts` asserts per frame and what the dusk criterion depends on;
 * - the World style control offers both registry entries, switches under real
 *   keyboard input and under a real pointer click, and reports each selection
 *   through the `data-style-id` it writes onto itself;
 * - the simulation keeps advancing across a switch.
 *
 * What it cannot see, and this is the whole reason it is not a substitute for the
 * gate: nothing here is a frame. It says the app will answer the questions the
 * capture asks; it says nothing about what the capture will photograph. The
 * verdict lane remains the only evidence, and this lane writes nowhere near it.
 */
import { expect, test, type Page } from "@playwright/test";

import type {} from "../../src/harness/bridge.js";
import { OrbitDriver } from "./orbit.js";
import { pixelLaneRefusal, HARDWARE_RENDERER_DENYLIST } from "./lane.js";

/** The dusk hero URL, character for character the one `hero.spec.ts` opens. */
const DUSK_URL = "/?time=dusk&seed=9137&style=satellite";

async function observe(page: Page) {
  return page.evaluate(() => {
    const harness = window.__mapsHarness!;
    return { post: harness.post(), status: harness.status(), style: harness.style(), tiles: harness.tiles() };
  });
}

test("the app answers everything a capture's first minute asks", async ({ page }) => {
  const driver = new OrbitDriver(page);
  await page.goto(DUSK_URL, { timeout: 60_000 });
  const boot = await driver.waitForFirstFrame(120_000);

  // The pixel lane's own refusal, not a copy of it: a capture drawn on a software
  // rasteriser is a different picture at a cost of seconds a frame, and the same
  // sentence that refuses a certificate refuses this run.
  const refusal = pixelLaneRefusal(boot.glRenderer, "the visual pre-flight");
  expect(refusal, `this pre-flight must run on the appearance lane's renderer`).toBeNull();
  expect(String(boot.glRenderer)).not.toMatch(HARDWARE_RENDERER_DENYLIST);

  const opened = await observe(page);
  expect(opened.post.active, `the post chain fell back to a direct render: ${String(opened.post.error)}`).toBe(true);
  expect(opened.post.passes).toEqual(["TAARenderPass", "GTAOPass", "UnrealBloomPass", "OutputPass"]);
  expect(opened.status.ready).toBe(true);
  // The tileset is reachable and refining; a capture that starts against a
  // tileset which never loaded is the failure the wrapper's own scene check
  // cannot see, because the scene data on disk is fine.
  expect(opened.tiles.visible).toBeGreaterThan(0);
  expect(opened.tiles.failed).toBe(0);

  // The control the app ships is a button plus an in-page listbox. A native
  // select's popup is drawn by the browser process, outside the renderer's hit
  // testing, which is why the criterion's pointer half could not be exercised
  // through one at all.
  const styleControl = page.getByRole("combobox", { name: "World style" });
  const optionLabels = (await page.locator('[role="option"] .world-style-picker__option-label').allTextContents());
  expect(optionLabels).toContain("Cartographic");
  expect(optionLabels).toContain("Satellite");

  // Keyboard: open, walk to the first entry, commit.
  await styleControl.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(styleControl).toHaveAttribute("data-style-id", "cartographic");
  await page.waitForFunction(() => window.__mapsHarness?.style().id === "cartographic");

  // Pointer: open, click the other entry, commit.
  await styleControl.click();
  await page.locator('[role="option"][data-style-id="satellite"]').click();
  await expect(styleControl).toHaveAttribute("data-style-id", "satellite");
  await page.waitForFunction(() => window.__mapsHarness?.style().id === "satellite");

  // The simulation is still running after both directions.
  const after = await observe(page);
  expect(after.status.frameCount).toBeGreaterThan(opened.status.frameCount);
  expect(after.style.id).toBe("satellite");
});
