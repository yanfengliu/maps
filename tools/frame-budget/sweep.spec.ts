/**
 * harness: the frame interval at 1920x1080 as a function of the drawn population,
 * on the hardware renderer, through the real input path. Not evidence: an
 * iteration lane with no certificate, and `tools/visual/verify-output.ts` refuses
 * the `frame-budget` lane by name.
 *
 * **Why this exists.** `frame-budget.spec.ts` measures the acceptance state and
 * finds it does not hold 60 fps. "It does not hold" is only half an answer: the
 * other half is how large a crowd does hold, which is the number a reader can act
 * on. Each arm loads the app once at its own drawn population, waits for that crowd
 * to be drawn, and takes the same fixed window with the same camera path, so the
 * arms differ by the population and nothing else.
 *
 * **Where the population comes from.** `?pedestrians=` and `?vehicles=`, the seam
 * `src/agents/population/config.ts` already exposes and `playwright.frame-budget
 * .config.ts` refuses to invent: a run whose query the app did not honour draws the
 * default population instead, and the arm's own `populationDrawn` reading is what
 * shows that rather than the request.
 *
 * **Cost control.** Each arm is a full load and a spawn wait. The default arm list
 * is the acceptance state and the two smallest that bracket a plausible ceiling, so
 * the sweep is minutes rather than an hour; `FRAME_BUDGET_SWEEP` overrides it with a
 * comma-separated list and the run records which list it used.
 *
 * RUN IT:
 *
 *   $env:FRAME_BUDGET_SWEEP="250,500,1000"; npx playwright test --config playwright.frame-budget.config.ts --grep "population sweep"
 */

import { expect, test, type Page } from "@playwright/test";

import { OrbitDriver } from "../visual/orbit.js";
import { buildDigest, interiorIntervals, intervalsFrom, machineFacts, readProbe, resetProbe, round, statsOf, writeResult } from "./run.js";

const WINDOW_MS = 12_000;
const DRAWN_SHARE = 0.9;
const DRAWN_STABLE_POLLS = 4;
const POLL_MS = 250;
const DRAWN_TIMEOUT_MS = 12 * 60_000;
const VEHICLES = 200;

function arms(): number[] {
  const raw = process.env["FRAME_BUDGET_SWEEP"];
  if (!raw) return [3000, 1000, 500];
  const values = raw.split(",").map((part) => Number(part.trim()));
  for (const value of values) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`FRAME_BUDGET_SWEEP takes comma-separated pedestrian counts and was given "${raw}", which contains ${value}.`);
    }
  }
  return values;
}

interface PopulationSnapshot {
  attached: boolean;
  rendered: { pedestrians: number; vehicles: number; near: number; medium: number; far: number; attached: boolean };
  lifecycle: { spawned: number; retired: number; active: number };
  ticks: number;
  simulatedSeconds: number;
  authorityViolations: number;
}

test("the population sweep: the frame interval against the drawn population", async ({ page }) => {
  const observed: Record<string, unknown>[] = [];
  const digest = buildDigest();

  for (const pedestrians of arms()) {
    await page.goto(`/?agents=1&seed=5970698&pedestrians=${pedestrians}&vehicles=${VEHICLES}`, { timeout: 90_000 });
    const driver = new OrbitDriver(page);
    const status = await driver.waitForFirstFrame(120_000);
    expect(
      { width: status.drawingBufferWidth, height: status.drawingBufferHeight },
      `This sweep measures the 1920x1080 the acceptance target is written at; the renderer reported ` +
        `${status.drawingBufferWidth}x${status.drawingBufferHeight} for the ${pedestrians}-pedestrian arm.`,
    ).toEqual({ width: 1920, height: 1080 });

    const read = async (): Promise<PopulationSnapshot> =>
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
          authorityViolations: population.authorityViolations,
        };
      });

    const deadline = Date.now() + DRAWN_TIMEOUT_MS;
    let stable = 0;
    let population = await read();
    while (Date.now() < deadline) {
      stable = population.rendered.pedestrians >= pedestrians * DRAWN_SHARE ? stable + 1 : 0;
      if (stable >= DRAWN_STABLE_POLLS) break;
      await page.waitForTimeout(POLL_MS);
      population = await read();
    }
    expect(
      stable,
      `The ${pedestrians}-pedestrian arm never drew its crowd: rendered.pedestrians reached ` +
        `${population.rendered.pedestrians} of ${pedestrians} in ${DRAWN_TIMEOUT_MS} ms with ${population.lifecycle.active} active ` +
        `bodies and attached=${population.attached}, so a window opened now would time a different population than the arm names.`,
    ).toBeGreaterThanOrEqual(DRAWN_STABLE_POLLS);

    await resetProbe(page);
    const openedAt = Date.now();
    await driveFor(page, driver, WINDOW_MS);
    const elapsedMs = Date.now() - openedAt;
    const after = await readProbe(page);
    population = await read();

    const intervals = interiorIntervals(intervalsFrom(after.frameTimestamps));
    const steps = after.tickCosts.map((cost) => cost.steps);
    const simulation = after.tickCosts.map((cost) => cost.simulationMs);
    const frameOwn = after.tickCosts.map((cost) => cost.advanceMs - cost.simulationMs);
    const interval = statsOf(intervals);
    const simulationStats = statsOf(simulation);

    observed.push({
      pedestriansRequested: pedestrians,
      vehiclesRequested: VEHICLES,
      populationDrawn: population.rendered,
      frames: after.frameTimestamps.length,
      windowMs: elapsedMs,
      intervalMs: interval,
      framesPerSecondFromMedianInterval: interval ? round(1000 / interval.p50) : null,
      simulationMs: simulationStats,
      frameOwnMs: statsOf(frameOwn),
      ticksPerFrame: histogram(steps),
      framesAtTheStepCap: steps.filter((count) => count >= 5).length,
      /** True when the delivered interval is at or inside the target. */
      holdsSixtyFps: interval !== null && interval.p50 <= 16.667,
      headroomMs: simulationStats ? round(16.667 - simulationStats.p50) : null,
      authorityViolations: population.authorityViolations,
    });

    console.log(JSON.stringify(observed.at(-1), null, 2));
  }

  const path = writeResult("sweep.json", {
    lane: "frame-budget",
    certifiable: false,
    evidence: "not evidence: an iteration lane with no certificate, refused by tools/visual/verify-output.ts",
    spec: "tools/frame-budget/sweep.spec.ts",
    viewport: { width: 1920, height: 1080 },
    renderer: (await page.evaluate(() => window.__mapsHarness?.status().glRenderer ?? null)),
    build: digest,
    machine: machineFacts(),
    windowMs: WINDOW_MS,
    arms: observed,
    /** The largest arm whose median interval held the target, or null when none did. */
    largestHoldingArm: observed.filter((arm) => arm["holdsSixtyFps"] === true).map((arm) => arm["pedestriansRequested"] as number).sort((a, b) => b - a)[0] ?? null,
  });
  console.log(`wrote ${path}`);
});

function histogram(values: readonly number[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  return counts;
}

/** The same continuous orbit `frame-budget.spec.ts` uses, through the real input path. */
async function driveFor(page: Page, driver: OrbitDriver, durationMs: number): Promise<number> {
  const box = await page.locator("#scene").boundingBox();
  if (box === null || box.width === 0 || box.height === 0) {
    throw new Error("The canvas has no layout box, so there is nothing to send pointer events to.");
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
    pass += 1;
  }
  const after = await driver.readCamera();
  return round(Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y, after.position.z - before.position.z));
}
