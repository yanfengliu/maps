/**
 * Acceptance criterion, `docs/work/0_shibuya-1km/plan.md:160`, second half.
 *
 * Claim: Cartographic and Satellite each hold up at street, block and aerial
 * distances, through the actual dropdown.
 *
 * The bound, and it is the important part of this header: this lane runs on the
 * hardware renderer, so its frames are **not** the appearance verdict and cannot
 * inherit or stand in for a review of the 44-frame software set. What it does
 * establish is that each style was reached *by operating the control*, that each
 * pose drew a distinct, populated, non-blank frame, and that the frames a native
 * inspection reads are recorded with their digests. One seed, one time of day,
 * one azimuth, three distances: the sweep lane's six azimuths are its own
 * business, not this criterion's.
 *
 * Every frame is written at the viewport's own 1280x720 and its header is checked
 * against that, because a contact sheet answers "is there one of each" and never
 * "is each one right" — the inspection these files exist for is a person opening
 * them one at a time at their own size.
 */
import { expect, test } from "@playwright/test";

import { OrbitDriver } from "../visual/orbit.js";
import { HERO_AZIMUTH, SHOTS } from "../visual/shots.js";
import {
  CRITERION_STYLES,
  capture,
  controlValue,
  observe,
  switchByPointer,
  writeLaneFile,
} from "./support.js";

const RUN_URL = "/?agents=1&seed=9137";

test("both styles at street, block and aerial distances, reached through the control", async ({ page }) => {
  test.setTimeout(40 * 60_000);
  await page.goto(RUN_URL, { waitUntil: "domcontentloaded" });
  const orbit = new OrbitDriver(page);
  await orbit.waitForFirstFrame(180_000);
  await orbit.waitForTilesIdle();

  const booted = await observe(page);
  expect(booted.population.attached, "?agents=1 did not attach a population").toBe(true);
  expect(booted.status.glRenderer).not.toMatch(/swiftshader/i);

  const frames: Record<string, { file: string; sha256: string; meanLuminance: number; luminanceSpread: number; distinctColours: number; drawnTriangles: number; renderedPedestrians: number; styleFromControl: string }> = {};

  for (const style of CRITERION_STYLES) {
    // Reached by pressing the control, both directions across the six captures:
    // satellite is the boot style, so cartographic is a real switch and
    // satellite is a switch back.
    if ((await controlValue(page)) !== style) {
      await switchByPointer(page, style);
    }
    await orbit.settle("capture");

    for (const shot of SHOTS) {
      await orbit.zoomTo(shot.distance);
      await orbit.orbitTo(HERO_AZIMUTH, shot.polar);
      const tiles = await orbit.waitForTilesIdle();
      const observation = await observe(page);
      expect(observation.style.id, `${style} ${shot.name}: the app is not in the style the control holds`).toBe(style);
      expect(observation.controlValue, `${style} ${shot.name}: the control does not hold ${style}`).toBe(style);

      const file = `artifacts/style-ui/frames/${style}/${shot.name}.png`;
      const frame = await capture(page, file, `${style} ${shot.name}`);

      // Not a blank frame, and not a frame of one flat colour: the specific
      // failure a "did it render" check reports as a pass.
      expect(frame.stats.luminanceSpread, `${style} ${shot.name} is flat (spread ${frame.stats.luminanceSpread.toFixed(2)})`).toBeGreaterThan(5);
      expect(frame.stats.distinctColours, `${style} ${shot.name} has only ${frame.stats.distinctColours} distinct colours`).toBeGreaterThan(200);
      // The city is in frame, not just the sky or the ground: the drawn geometry
      // count comes from the tileset, which is what "the buildings are there" means.
      expect(tiles.drawnTriangles, `${style} ${shot.name} drew no building geometry`).toBeGreaterThan(1_000);
      // And the population is in it, which is the difference between this lane
      // and the population-free appearance sweep.
      expect(observation.population.rendered.pedestrians, `${style} ${shot.name} drew no pedestrians`).toBeGreaterThan(0);

      frames[`${style}/${shot.name}`] = {
        file,
        sha256: frame.sha256,
        meanLuminance: frame.stats.meanLuminance,
        luminanceSpread: frame.stats.luminanceSpread,
        distinctColours: frame.stats.distinctColours,
        drawnTriangles: tiles.drawnTriangles,
        renderedPedestrians: observation.population.rendered.pedestrians,
        styleFromControl: observation.controlValue ?? "none",
      };
    }
  }

  // The two styles must not have produced the same picture. Six frames of the
  // same style, or of the style the boot already had, would satisfy every check
  // above and answer nothing.
  const digests = new Set(Object.values(frames).map((frame) => frame.sha256));
  expect(digests.size, "the six captures are not six distinct frames").toBe(Object.keys(frames).length);
  for (const shot of SHOTS) {
    const left = frames[`cartographic/${shot.name}`]!;
    const right = frames[`satellite/${shot.name}`]!;
    expect(left.sha256, `${shot.name}: both styles produced identical bytes, so the switch changed nothing on screen`).not.toBe(right.sha256);
    // A style that only re-tinted the sky would move the mean a little; the two
    // palettes differ per material, so the drawn geometry must be identical and
    // the pixels must not be.
    expect(left.drawnTriangles, `${shot.name}: the two styles drew different geometry`).toBe(right.drawnTriangles);
  }

  await writeLaneFile("frames/manifest.json", `${JSON.stringify({ url: RUN_URL, renderer: booted.status.glRenderer, azimuth: HERO_AZIMUTH, frames }, null, 2)}\n`);
});
