/**
 * Acceptance criterion, `docs/work/0_shibuya-1km/plan.md:160`, first half.
 *
 * Claim: the World style dropdown in the production build switches both ways
 * under a real pointer press and under real keyboard input, leaves the camera
 * pose and the running simulation's progress intact, and never shows a frozen,
 * blank or lost frame while a switch is in flight.
 *
 * The bound, stated here rather than implied: this is the hardware renderer, so
 * these frames are not the appearance verdict and are not comparable with the
 * 44-frame software set. It is one seed (`?seed=9137`), one time of day, one
 * population of 3,000 pedestrians and 200 vehicles, and the poses in
 * `tools/visual/shots.ts` — three distances, one azimuth. What it does not
 * bound: anything about pixels looking right, which is a native inspection's
 * business and lives in `world-style-visual.spec.ts`.
 */
import { expect, test } from "@playwright/test";

import { OrbitDriver } from "../visual/orbit.js";
import { collectPageErrors } from "../visual/page-errors.js";
import { HERO_AZIMUTH, SHOTS } from "../visual/shots.js";
import {
  CRITERION_STYLES,
  awaitStyle,
  cameraDelta,
  changedFraction,
  control,
  controlValue,
  describeCamera,
  offeredOptions,
  observe,
  populationFailures,
  sampleFrame,
  servedBuildDigest,
  switchByKeyboard,
  switchByPointer,
  writeLaneFile,
} from "./support.js";

/** The populated, seeded run every number below belongs to. */
const RUN_URL = "/?agents=1&seed=9137";

interface SwitchRecord {
  style: string;
  gesture: string;
  direction: string;
  beforeTicks: number;
  afterTicks: number;
  tickDelta: number;
  beforeCamera: string;
  afterCamera: string;
  cameraWorldM: number;
  cameraMaxAxisM: number;
  cameraRadiusM: number;
  styleIdFromApp: string;
  styleIdFromControl: string;
  url: string;
}

test("the World style dropdown switches both ways by pointer and by keyboard, preserving camera and progress", async ({ page }) => {
  test.setTimeout(40 * 60_000);
  const errors = collectPageErrors(page);
  const build = await (async () => {
    await page.goto(RUN_URL, { waitUntil: "domcontentloaded" });
    return await servedBuildDigest(page);
  })();

  const orbit = new OrbitDriver(page);
  await orbit.waitForFirstFrame(180_000);
  await orbit.waitForTilesIdle();

  // The population first: without 3,000 walkers there is no progress to preserve,
  // and a preservation claim measured on an empty city is a claim about nothing.
  const booted = await observe(page);
  expect(booted.population.attached, "?agents=1 did not attach a population, so there is no progress to preserve").toBe(true);
  expect(booted.population.pedestrians.active, "the populated run has no active pedestrians").toBeGreaterThan(0);
  expect(booted.status.glRenderer, "this lane must run on the hardware renderer; the run reported a software rasteriser").not.toMatch(/swiftshader/i);

  // The options come from the control the browser built. The registry claim is
  // `world-style-registry.spec.ts`; this is what the two switches below are
  // choosing between.
  const offered = await offeredOptions(page);
  expect(offered.map((option) => option.id)).toEqual([...CRITERION_STYLES]);
  expect(await controlValue(page)).toBe("satellite");

  const records: SwitchRecord[] = [];
  /** Both input paths, both directions: four switches, and there is no fifth. */
  const gestures = [
    { direction: "satellite -> cartographic", style: "cartographic", how: "pointer" as const },
    { direction: "cartographic -> satellite", style: "satellite", how: "pointer" as const },
    { direction: "satellite -> cartographic", style: "cartographic", how: "keyboard" as const },
    { direction: "cartographic -> satellite", style: "satellite", how: "keyboard" as const },
  ];

  for (const gesture of gestures) {
    const label = `${gesture.how} ${gesture.direction}`;
    // Settle before the measurement rather than after it: a switch measured
    // while the damped controls are still travelling would credit the switch
    // with movement that was already in flight. Tiles are waited for too, so the
    // drawn-geometry comparison below reads a refined scene at both ends.
    await orbit.settle("preservation");
    await orbit.waitForTilesIdle();
    const before = await observe(page);
    const gestureDescription = gesture.how === "pointer" ? await switchByPointer(page, gesture.style) : await switchByKeyboard(page, gesture.style);
    await awaitStyle(page, gesture.style, before.status.frameCount);
    const after = await observe(page);

    // The control, the URL and the app all name the same style. A check that
    // read only the app's own store would pass on a switch the user never made.
    expect(after.controlValue, `${label}: the control does not hold the chosen style`).toBe(gesture.style);
    expect(after.style.id, `${label}: the app did not follow the control`).toBe(gesture.style);
    expect(new URL(after.href).searchParams.get("style"), `${label}: the URL does not carry the chosen style`).toBe(gesture.style);

    const delta = cameraDelta(before.camera, after.camera);
    records.push({
      style: gesture.style,
      gesture: gestureDescription,
      direction: gesture.direction,
      beforeTicks: before.population.ticks,
      afterTicks: after.population.ticks,
      tickDelta: after.population.ticks - before.population.ticks,
      beforeCamera: describeCamera(before.camera),
      afterCamera: describeCamera(after.camera),
      cameraWorldM: delta.worldM,
      cameraMaxAxisM: delta.maxAxisM,
      cameraRadiusM: delta.radiusM,
      styleIdFromApp: after.style.id,
      styleIdFromControl: after.controlValue ?? "none",
      url: after.href,
    });

    // The camera bound is the independent five-millimetre one the local rules
    // name for post-switch assertions, measured in world metres, not in the
    // per-component radians `hero.spec.ts` compares.
    expect(delta.worldM, `${label}: the camera moved ${delta.worldM.toFixed(6)} m across the switch`).toBeLessThan(0.005);
    expect(delta.maxAxisM, `${label}: one camera axis moved ${delta.maxAxisM.toFixed(6)} m across the switch`).toBeLessThan(0.005);

    const failures = populationFailures(before.population, after.population);
    expect(failures, `${label}: the simulation did not survive the switch`).toEqual([]);
    // The population is still *drawn*, which is the defect the population-free
    // pixel lane structurally cannot see: a switch that kept the counters and
    // lost the renderers shows pedestrians at zero here.
    //
    // Bound, and it is deliberate rather than a loosened equality: the drawn
    // counts are live. Vehicles spawn and despawn and the LOD radius moves as
    // the population flows, so 36 drawn vehicles either side of a two-second
    // switch is the traffic, not the switch. Measured, not assumed: the first
    // run of this lane failed an equality here with 36 before and 44 after, and
    // the pedestrians happened to match. What is asserted is that neither
    // renderer collapsed and that both populations are still represented in
    // proportion to their active counts.
    expect(after.population.rendered.attached, `${label}: the agent renderers detached from the scene`).toBe(true);
    expect(after.population.rendered.pedestrians, `${label}: the pedestrians stopped being drawn`).toBeGreaterThan(0.5 * before.population.rendered.pedestrians);
    expect(after.population.rendered.vehicles, `${label}: the vehicles stopped being drawn`).toBeGreaterThanOrEqual(Math.max(1, Math.floor(0.5 * before.population.rendered.vehicles)));
    expect(after.population.rendered.pedestrians, `${label}: fewer pedestrians are drawn than the population has active`).toBeLessThanOrEqual(after.population.pedestrians.active);

    // And the city itself is the same city: same drawn triangle count, same
    // bounds. A switch that reloaded the tileset would keep the style id and
    // change these.
    expect(after.tiles.drawnTriangles, `${label}: the drawn geometry changed across the switch`).toBe(before.tiles.drawnTriangles);
    expect(after.tiles.drawnBounds, `${label}: the drawn bounds changed across the switch`).toEqual(before.tiles.drawnBounds);
  }

  // Each of the four switches moved the camera by less than a millimetre; the
  // worst is recorded rather than averaged, because an average hides the one
  // switch that did not preserve.
  const worst = records.reduce((left, right) => (right.cameraWorldM > left.cameraWorldM ? right : left));
  await writeLaneFile(
    "switch/records.json",
    `${JSON.stringify({ url: RUN_URL, build, renderer: booted.status.glRenderer, offered, worstCameraWorldM: worst.cameraWorldM, switches: records }, null, 2)}\n`,
  );

  await test.step("no frame in flight reads as frozen, blank or lost", async () => {
    // The switch itself is synchronous in the app, so "in flight" here means the
    // window between the press and the frames drawn around it: what the screen
    // showed while it happened, which a before/after pair cannot answer.
    await orbit.settle("capture");
    const before = await sampleFrame(page);
    const beforeObservation = await observe(page);
    expect(await controlValue(page), "the in-flight check starts from the wrong style").toBe("satellite");

    // Sampled across the press, not after it. The samples are measured and
    // discarded rather than kept: they exist to answer "was there a blank frame",
    // and 1280x720 PNGs at this rate are about a megabyte each for a question
    // that a spread and a colour count already answer.
    //
    // Bound: this cannot catch a single frame that went blank between two
    // samples, because a screenshot costs tens of milliseconds on this renderer
    // and the frames are not much faster. It catches a blank *period*, which is
    // what a lost context or a failed re-tint looks like, and it is stated here
    // so a later reader does not read it as frame-by-frame coverage.
    const sampled: { sha256: string; luminanceSpread: number; distinctColours: number; meanLuminance: number; frameCount: number; ticks: number; style: string }[] = [];
    const started = Date.now();
    let switched = false;
    while (Date.now() - started < 6_000 && (sampled.length < 4 || !switched || sampled[sampled.length - 1]!.style !== "cartographic")) {
      if (!switched) switched = (await controlValue(page)) !== "satellite";
      const frame = await sampleFrame(page);
      const state = await page.evaluate(() => ({
        frameCount: window.__mapsHarness!.status().frameCount,
        ticks: window.__mapsHarness!.population().ticks,
        style: window.__mapsHarness!.style().id,
      }));
      sampled.push({
        sha256: frame.sha256,
        luminanceSpread: frame.stats.luminanceSpread,
        distinctColours: frame.stats.distinctColours,
        meanLuminance: frame.stats.meanLuminance,
        frameCount: state.frameCount,
        ticks: state.ticks,
        style: state.style,
      });
      // Sampling before the press did not happen, so make it happen rather than
      // waiting out the budget.
      if (!switched && sampled.length >= 2) {
        await switchByPointer(page, "cartographic");
        switched = (await controlValue(page)) !== "satellite";
      }
    }

    const afterObservation = await observe(page);
    await writeLaneFile(
      "switch/in-flight.json",
      `${JSON.stringify({ before: { sha256: before.sha256, frameCount: beforeObservation.status.frameCount, ticks: beforeObservation.population.ticks }, samples: sampled, after: { frameCount: afterObservation.status.frameCount, ticks: afterObservation.population.ticks, style: afterObservation.style.id } }, null, 2)}\n`,
    );

    expect(sampled.length, "no frame was sampled while the switch was in flight").toBeGreaterThanOrEqual(3);
    expect(switched, "the sampled window closed before the switch happened, so none of these frames is in flight").toBe(true);
    // Some sample must have landed after the press, or these frames describe the
    // old style and the window missed the event it is named for.
    expect(sampled.some((frame) => frame.style === "cartographic"), "every sample was taken before the switch, so none of them is in flight").toBe(true);
    for (const [index, frame] of sampled.entries()) {
      // A blank or lost frame: one flat colour, or almost none. The screen going
      // away is the "blank frame" this criterion names.
      expect(frame.luminanceSpread, `in-flight sample ${index} is a flat frame (spread ${frame.luminanceSpread.toFixed(2)})`).toBeGreaterThan(5);
      expect(frame.distinctColours, `in-flight sample ${index} has only ${frame.distinctColours} distinct colours`).toBeGreaterThan(200);
    }
    // Not a frozen frame: the loop kept drawing and the clock kept running
    // through the sampling window, not merely at its ends.
    const frameCounts = sampled.map((frame) => frame.frameCount);
    const ticks = sampled.map((frame) => frame.ticks);
    expect(Math.max(...frameCounts), "the render loop stopped drawing while the switch was in flight").toBeGreaterThan(Math.min(...frameCounts));
    expect(Math.max(...ticks), "the simulation stopped ticking while the switch was in flight").toBeGreaterThan(Math.min(...ticks));
    expect(afterObservation.status.frameCount, "the render loop stopped drawing across the switch").toBeGreaterThan(beforeObservation.status.frameCount);
    expect(afterObservation.population.ticks, "the simulation stopped ticking during the switch").toBeGreaterThan(beforeObservation.population.ticks);
    // And the screen ended up showing the new style rather than the old one held:
    // the frame after the press is not the frame from before it.
    const after = await sampleFrame(page);
    const settled = await observe(page);
    expect(settled.style.id).toBe("cartographic");
    expect(
      changedFraction(after.png, before.png),
      "the frame after the switch is the frame from before it, so the switch held the old picture",
    ).toBeGreaterThan(0.1);
    await expect(control(page)).toHaveAttribute("aria-expanded", "false");
    expect(errors, "the page reported an error during the run").toEqual([]);
  });

  await test.step("the control is reachable and operable at every capture distance", async () => {
    // A dropdown that only works at the default pose is a dropdown that breaks
    // when the camera moves. The three distances are the criterion's street,
    // block and aerial, driven by pointer and wheel input through `OrbitDriver`.
    for (const shot of SHOTS) {
      await orbit.zoomTo(shot.distance);
      await orbit.orbitTo(HERO_AZIMUTH, shot.polar);
      // Measured from rest, not from wherever the damped controls happened to be
      // when the pose was reached. The first run of this lane read 21.5 mm across
      // the switch at 220 m and the cause was the measurement, not the switch:
      // `orbitTo` and `zoomTo` return on the pose predicate, and the damping tail
      // was still running inside the window the switch was blamed for.
      await orbit.settle("preservation");
      await orbit.waitForTilesIdle();
      const before = await observe(page);
      await switchByPointer(page, "cartographic");
      await awaitStyle(page, "cartographic", before.status.frameCount);
      const after = await observe(page);
      expect(after.controlValue, `${shot.name}: the pointer switch failed at ${shot.distance} m`).toBe("cartographic");
      const delta = cameraDelta(before.camera, after.camera);
      expect(delta.worldM, `${shot.name}: the camera moved ${delta.worldM.toFixed(6)} m across the switch at ${shot.distance} m`).toBeLessThan(0.005);
      await switchByKeyboard(page, "satellite");
      await awaitStyle(page, "satellite", after.status.frameCount);
      expect(await controlValue(page), `${shot.name}: the keyboard switch failed at ${shot.distance} m`).toBe("satellite");
    }
    expect(errors, "the page reported an error during the run").toEqual([]);
  });

  // A leave-behind rather than a verdict: the reader of this lane's directory
  // can see which control was on screen without re-running the lane.
  await control(page).screenshot({ path: "artifacts/style-ui/switch/control.png" });
});
