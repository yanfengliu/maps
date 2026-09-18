/**
 * harness: the delivered app, driven through `tools/visual/orbit.ts` and the real
 * Playwright input path, measured at 1920x1080 with the acceptance population.
 *
 * **What this lane is.** `PERFORMANCE_TARGET` in `src/world/frame.ts` asks for 60
 * fps at 1920x1080 with 3,000 animated pedestrians and 200 vehicles, and no
 * instrument in this repository measured the interval the app actually holds at
 * that state. This lane does: it loads the production build at `?agents=1`, waits
 * for the crowd to be drawn, opens a fixed wall-clock window with the camera being
 * driven by synthesised pointer input, and reports
 *
 *   - the frame interval the browser delivered (from `requestAnimationFrame`, the
 *     frame boundary the user sees);
 *   - the fixed-step cost inside those frames, and how many fixed steps each frame
 *     ran, because the loop caps that at five and a simulation that cannot keep up
 *     drives the interval regardless of how cheap the frame is;
 *   - the population the app itself reports it drew, so a window that measured an
 *     empty scene is visible in the result rather than reported as a fast one.
 *
 * **What it is not.** It is an iteration lane: it writes under
 * `artifacts/frame-budget/`, it names its renderer in every file, and
 * `tools/visual/verify-output.ts` refuses the `frame-budget` lane, so no
 * `complete.json` can ever name these numbers. It is not pixel evidence and it
 * certifies nothing.
 *
 * **The bound, stated where the number is taken.** One population, one seed, one
 * build, one machine, one window length, and a camera path that is a continuous
 * orbit rather than a tour of the city. `performance.now()` in this browser is
 * clamped to 100 microseconds, so no figure here is finer than that. A different
 * build, a different population or a different machine is a different measurement
 * and this lane says so in the result file rather than in prose elsewhere.
 */

import { expect, test, type Page } from "@playwright/test";

import { OrbitDriver } from "../visual/orbit.js";
import {
  buildDigest, interiorIntervals, intervalsFrom, machineFacts, readProbe, resetProbe, round,
  statsOf, withProbe, writeResult,
} from "./run.js";

/** The acceptance state, read from the target rather than restated: `?agents=1` is 3,000 and 200. */
const POPULATED_URL = "/?agents=1&seed=5970698";
const WINDOW_MS = 20_000;
/** The crowd must be this share of the request before a window may open. */
const DRAWN_SHARE = 0.9;
/** Consecutive polls the drawn count must hold, so a spawn surge cannot pass the gate on one reading. */
const DRAWN_STABLE_POLLS = 4;
const POLL_MS = 250;
const DRAWN_TIMEOUT_MS = 15 * 60_000;

interface PopulationSnapshot {
  attached: boolean;
  rendered: { pedestrians: number; vehicles: number; near: number; medium: number; far: number; attached: boolean };
  lifecycle: { spawned: number; retired: number; active: number };
  ticks: number;
  simulatedSeconds: number;
  requestsLastTick: number;
  grantsLastTick: number;
  authorityViolations: number;
}

test("the frame interval at 1920x1080 with 3,000 animated pedestrians", async ({ page }) => {
  await page.goto(withProbe(POPULATED_URL), { timeout: 90_000 });
  const driver = new OrbitDriver(page);
  const status = await driver.waitForFirstFrame(120_000);

  // The drawing buffer's size is asserted before anything is timed, so a run that
  // somehow got another size fails by name instead of quoting its number as 1080p.
  expect(
    { width: status.drawingBufferWidth, height: status.drawingBufferHeight },
    `This lane measures the 1920x1080 the acceptance target is written at. The renderer reported a ` +
      `${status.drawingBufferWidth}x${status.drawingBufferHeight} drawing buffer, so its interval would describe a different resolution.`,
  ).toEqual({ width: 1920, height: 1080 });

  await driver.waitForTilesIdle();

  // The app draws what has spawned and reached the area rather than what was
  // requested, and the tick counter advances whether or not a crowd exists, so a
  // window opened on "the population was asked for" would report an empty scene's
  // interval as the acceptance one. The drawn count is the app's own reading.
  const readPopulation = async (): Promise<PopulationSnapshot> =>
    page.evaluate(() => {
      const harness = window.__mapsHarness;
      if (!harness) throw new Error("No harness bridge appeared on window, so the population's own counters cannot be read.");
      const population = harness.population();
      return {
        attached: population.attached,
        rendered: { ...population.rendered },
        lifecycle: { ...population.lifecycle },
        ticks: population.ticks,
        simulatedSeconds: population.simulatedSeconds,
        requestsLastTick: population.requestsLastTick,
        grantsLastTick: population.grantsLastTick,
        authorityViolations: population.authorityViolations,
      };
    });

  const deadline = Date.now() + DRAWN_TIMEOUT_MS;
  let stable = 0;
  let population = await readPopulation();
  const target = 3_000;
  while (Date.now() < deadline) {
    const drawn = population.rendered.pedestrians;
    stable = drawn >= target * DRAWN_SHARE ? stable + 1 : 0;
    if (stable >= DRAWN_STABLE_POLLS) break;
    await page.waitForTimeout(POLL_MS);
    population = await readPopulation();
  }
  expect(
    stable,
    `The window opens only on a crowd that is actually drawn: this lane waits for the app's own ` +
      `rendered.pedestrians to hold at ${target * DRAWN_SHARE} of ${target} for ${DRAWN_STABLE_POLLS} consecutive polls. ` +
      `It reached ${population.rendered.pedestrians} after ${DRAWN_TIMEOUT_MS} ms, with attached=${population.attached} ` +
      `and ${population.lifecycle.active} active bodies, so a window opened now would time whatever is on screen rather than the acceptance population.`,
  ).toBeGreaterThanOrEqual(DRAWN_STABLE_POLLS);

  const probeBefore = await readProbe(page);
  expect(
    probeBefore.installed,
    "The frame-budget probe never wrapped RenderLoop.advance, so the tick cost and the step count are not observed and this run measured nothing.",
  ).toBe(true);
  await resetProbe(page);

  const windowOpenedAt = new Date().toISOString();
  const openedAtMs = Date.now();
  const ticksAtOpen = population.ticks;
  const simulatedAtOpen = population.simulatedSeconds;

  // Input and the clock start together and neither waits for the other: the camera
  // path runs for the whole window, so every frame in it carries a moving view.
  const camera = await driver.readCamera();
  const cameraTravelled = await driveFor(page, driver, WINDOW_MS);

  const elapsedMs = Date.now() - openedAtMs;
  const after = await readProbe(page);
  population = await readPopulation();

  const intervals = intervalsFrom(after.frameTimestamps);
  const interior = interiorIntervals(intervals);
  const steps = after.tickCosts.map((cost) => cost.steps);
  const advance = after.tickCosts.map((cost) => cost.advanceMs);
  const simulation = after.tickCosts.map((cost) => cost.simulationMs);
  const frameOwn = after.tickCosts.map((cost) => cost.advanceMs - cost.simulationMs);

  const digest = buildDigest();
  const result = {
    lane: "frame-budget",
    certifiable: false,
    evidence: "not evidence: an iteration lane with no certificate, refused by tools/visual/verify-output.ts",
    spec: "tools/frame-budget/frame-budget.spec.ts",
    url: POPULATED_URL,
    viewport: { width: 1920, height: 1080 },
    renderer: status.glRenderer,
    build: digest,
    machine: machineFacts(),
    populationRequested: { pedestrians: target, vehicles: 200, source: "?agents=1, which is populationSettings' own default" },
    populationDrawnAtOpen: population.rendered,
    populationDrawnAtClose: population.rendered,
    lifecycleAtClose: population.lifecycle,
    authorities: { violations: population.authorityViolations },
    window: {
      openedAtUtc: windowOpenedAt, elapsedMs, requestedMs: WINDOW_MS,
      frames: after.frameTimestamps.length,
      ticksAtOpen, ticksAtClose: population.ticks,
      simulatedSecondsAtOpen: simulatedAtOpen, simulatedSecondsAtClose: population.simulatedSeconds,
      cameraAtOpen: camera, cameraTravelledM: cameraTravelled,
    },
    interaction: {
      requestsLastTick: population.requestsLastTick,
      grantsLastTick: population.grantsLastTick,
    },
    frameIntervalMs: statsOf(interior),
    frameIntervalMsAllGaps: statsOf(intervals),
    fpsFromMedianInterval: statsOf(interior) ? round(1000 / statsOf(interior)!.p50) : null,
    targetIntervalMs: 16.667,
    tickCosts: {
      advanceMs: statsOf(advance),
      simulationMs: statsOf(simulation),
      frameOwnMs: statsOf(frameOwn),
      steps: statsOf(steps),
      stepsHistogram: histogram(steps),
      framesAtTheStepCap: steps.filter((count) => count >= 5).length,
      frames: steps.length,
    },
    headroomMs: statsOf(simulation) ? round(16.667 - statsOf(simulation)!.p50) : null,
    probeInstalled: after.installed,
    probeFailure: after.failure,
  };

  const path = writeResult("interval.json", result);
  console.log(JSON.stringify({
    wrote: path,
    renderer: result.renderer,
    build: digest.sha256,
    populationDrawn: result.populationDrawnAtClose,
    frames: result.window.frames,
    interval: result.frameIntervalMs,
    ticksPerFrame: result.tickCosts.stepsHistogram,
    simulationMs: result.tickCosts.simulationMs,
    frameOwnMs: result.tickCosts.frameOwnMs,
    framesAtTheStepCap: result.tickCosts.framesAtTheStepCap,
  }, null, 2));

  expect(result.window.frames, "The window must contain frames; a window with none measured nothing.").toBeGreaterThan(10);
});

function histogram(values: readonly number[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  return counts;
}

/**
 * One continuous orbit for the whole window, through the real input path.
 *
 * Each pass is a press, a dozen intermediate moves and a release over the middle
 * of the canvas, which is what `OrbitControls` turns into a drag. Nothing here
 * waits for the camera to settle: the point of the window is the interval under a
 * moving view, and stopping to settle would spend most of the window still.
 */
async function driveFor(page: Page, driver: OrbitDriver, durationMs: number): Promise<number> {
  const box = await page.locator("#scene").boundingBox();
  if (box === null || box.width === 0 || box.height === 0) {
    throw new Error("The canvas has no layout box, so there is nothing to send pointer events to; the interval would be measured on a page no input can reach.");
  }
  const before = await driver.readCamera();
  const started = Date.now();
  let pass = 0;
  while (Date.now() - started < durationMs) {
    const direction = pass % 2 === 0 ? 1 : -1;
    const deltaX = direction * box.width * 0.3;
    const deltaY = direction * box.height * 0.08;
    const startX = box.x + box.width / 2 - deltaX / 2;
    const startY = box.y + box.height / 2 - deltaY / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
    await page.mouse.up();
    await page.mouse.wheel(0, pass % 3 === 0 ? 240 : -120);
    pass += 1;
  }
  const after = await driver.readCamera();
  return round(
    Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y, after.position.z - before.position.z),
  );
}
