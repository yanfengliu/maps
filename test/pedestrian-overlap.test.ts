/**
 * Pedestrian overlap gate. Bound: the delivered network and fleet, seed 0x5b1b0a,
 * 60,000 ticks at 1/60 s — 1,000 simulated seconds — with 150 pedestrians and no
 * vehicles, sampled every 60 ticks (one second) with no warmup, so the spawn
 * instant is inside the window. Measured alone on a machine that was also running
 * the three-hour `npm run visual` capture, the case costs about 50 s; it is the
 * longest case in `npm test` and it is bounded by the simulation, not by the
 * measurement. The 150 bodies are a tenth of the 3,000-body acceptance load and
 * this gate says nothing about that load, about route completion, or about what a
 * frame looks like.
 *
 * The tick loop hands the event loop back every `YIELD_EVERY_TICKS` ticks. That is
 * not about this gate's verdict — the population is stepped with a fixed `STEP` and
 * the tick's own simulated time, never the wall clock, so a turn of the loop cannot
 * change a number below. It is about the runner this case runs under: one
 * synchronous case occupies its worker for 47-93 s, and Vitest's worker-to-runner RPC
 * arms a 60,000 ms `setTimeout` on every `onTaskUpdate` call
 * (`DEFAULT_TIMEOUT = 6e4`, `node_modules/vitest/dist/chunks/index.B521nVV-.js:3`). A
 * worker that holds its event loop past that deadline throws `[vitest-worker]:
 * Timeout calling "onTaskUpdate"`, which Vitest reports under `Errors` and turns
 * into exit 1 — so `npm test` reported failure for three full runs in which every
 * test passed (2026-09-16 at 19:53, 20:02 and 20:12), each time in the seconds after
 * this case finished.
 *
 * Claim: over the run the crowd keeps itself in distinct places and surges across
 * the Shibuya Scramble. No three bodies ever occupy one centimetre of ground, no
 * more than a twentieth of the active crowd shares a one-centimetre position with
 * another body at any sampled tick, no more than half the crowd has another body's
 * centre inside its own authored collision circle, and at least one walker enters
 * the authored scramble diagonal.
 *
 * The measurement is `spacing-metrics.ts`, which re-derives every position from the
 * published pose buffers and the delivered collision radius. It reads the
 * population's `poses`, never its counters, and builds its own uniform grid rather
 * than reusing the population's `CellGrid`, so a crowd whose own index or status
 * says it is fine cannot report as healthy here. The diagonal is matched in the
 * delivered network by the name the network builder writes, with this file's own
 * literal rather than `graph.ts`'s `SCRAMBLE_DIAGONAL_MARKER`, so the gate and the
 * planner cannot agree with each other by sharing a symbol; a network whose
 * crossing is renamed fails loudly rather than passing vacuously.
 *
 * Measured on this configuration, 2026-09-17. On the revision before the crossing
 * change (`fb2ec33`, main): **363** interpenetrating pairs at the worst sample,
 * **148 of 150** bodies in one of them, a largest stack of **7** bodies at one
 * centimetre, **19.33%** of the crowd sharing a position, **121 of 150** distinct
 * positions, and **0** bodies ever inside the diagonal — the nearest any walker
 * came to it was 6.138 m. On `7e703cd` (`worker/scramble`): **56** pairs, **53 of
 * 150** bodies, a largest stack of **2**, **0.67%** sharing, **149 of 150**
 * distinct positions, and **2** bodies inside the diagonal, the nearest approach
 * 0.121 m.
 *
 * Made to go red two ways on `7e703cd`, each isolating one half of the change. The
 * mutation and the messages are recorded in `docs/learning/gate-proofs.md`.
 * Removing the lateral offset (`sampleRoute`'s `lateralM` forced to 0) re-reds the
 * stacking and depth assertions. Removing the crossing preference
 * (`walkToCentre`'s detour comparison forced to the direct descent) re-reds the
 * diagonal assertion while the stacking numbers stay green.
 *
 * Two things this gate is bounded by and does not claim. It samples once a second,
 * so an overlap that forms and clears entirely between two samples is invisible: two
 * bodies closing head-on change their separation by 2.2 m between samples and the
 * shortest overlap it can see lasts about a quarter of a second. And the crossing
 * entry happens once, at about tick 40,000 of the 60,000 — the window leaves
 * 20,000 ticks of headroom, so a route change that delays the first walker past
 * the window re-reds the gate rather than passing quietly.
 */
import { afterEach, describe, expect, it } from "vitest";

import { JunctionAdmissions } from "../src/network/admissions.ts";
import { PEDESTRIAN_DYNAMICS, populationSettings } from "../src/agents/population/config.ts";
import { createPopulation } from "../src/agents/population/tick.ts";
import { pedestrianOverlapReport, pedestrianPositions } from "../tools/agents/spacing-metrics.ts";
import type { NetworkData, WalkEdge, WorldPoint } from "../src/world/network-data.ts";
import { deliveredFleet, deliveredNetwork, resetInvariants } from "./population-fixture.ts";

const STEP = 1 / 60;
const TICKS = 60_000;
const SAMPLE_EVERY = 60;
const PEDESTRIANS = 150;
const VEHICLES = 0;
const SEED = 0x5b1b0a;

/**
 * How often the tick loop turns the event loop, in ticks.
 *
 * 60,000 ticks cost 47.6-92.9 s in the three full runs on 2026-09-16, so a turn
 * every 2,000 ticks is a turn every 1.6-3.1 s: a nineteen-fold margin against
 * Vitest's 60,000 ms worker-RPC deadline even if this machine ran ten times slower.
 * What matters is reaching Node's poll phase before the deadline, because the
 * runner's reply to an outstanding `onTaskUpdate` sits in this worker's queue until
 * the loop gets there, and the watchdog fires whether or not the reply ever came.
 */
const YIELD_EVERY_TICKS = 2_000;

/** Hand the event loop back, so the runner's outstanding RPC to this worker lands. */
function turnTheEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

/** The authored collision circle's radius, shared by ORCA and the admission footprint. */
const CONTACT_RADIUS_M = PEDESTRIAN_DYNAMICS.radiusM;
/**
 * A pair is interpenetrating by more than half a body when its centres are closer
 * than one full radius: the two discs then share more than half of one of them,
 * which no avoidance rule and no queue can produce honestly.
 */
const DEEP_PENETRATION_M = PEDESTRIAN_DYNAMICS.radiusM;
/** The quantum the deliverable's own occupancy counts use, 1 cm. */
const POSITION_DECIMALS = 2;
const POSITION_QUANTUM = 10 ** POSITION_DECIMALS;
/** Bodies within this radius are neighbours for the proximity anti-vacuity check. */
const PROXIMITY_RADIUS_M = 2;

/** Measured worst samples: 3 on `main`, 2 on `7e703cd`. */
const MAXIMUM_STACK_AT_ONE_CENTIMETRE = 3;
/** Measured worst samples: 19.33% on `main`, 0.67% on `7e703cd`. */
const MAXIMUM_SHARING_SHARE = 0.05;
/** Measured worst samples: 148 of 150 on `main`, 53 of 150 on `7e703cd`. */
const MAXIMUM_DEEP_BODY_SHARE = 0.5;
/** The gate is vacuous unless a crowd was drawn and walked. */
const MINIMUM_CROWD = 20;

/**
 * The authored Shibuya Scramble diagonal, matched by the name the network builder
 * writes. Deliberately this file's own literal: `graph.ts` exports the same string
 * for the planner to aim at, and a gate that shares the planner's symbol proves
 * only that the two agree.
 */
const SCRAMBLE_DIAGONAL_MARKER = ":scramble-diagonal:";

/** Perpendicular distance from a world point to a section's own polyline, metres. */
function sectionOffsetM(x: number, z: number, points: readonly WorldPoint[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq)) : 0;
    const distance = Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function diagonalSections(network: NetworkData): WalkEdge[] {
  const sections = network.walks.filter((walk) => walk.id.includes(SCRAMBLE_DIAGONAL_MARKER));
  if (!sections.length) {
    throw new Error(
      `The delivered network has no walking section whose id contains "${SCRAMBLE_DIAGONAL_MARKER}", so this gate cannot tell whether the crowd crosses the Shibuya Scramble. ` +
        `The crossing's authored geometry changed or the network was rebuilt without it; rebuild with \`npm run data:network\` and update the marker here if the crossing was renamed.`,
    );
  }
  return sections;
}

afterEach(resetInvariants);

describe("pedestrian overlap", () => {
  it("keeps the crowd in distinct places and puts it on the scramble diagonal", { timeout: 300_000 }, async () => {
    const network = deliveredNetwork();
    const diagonal = diagonalSections(network);
    const population = createPopulation({
      network,
      fleet: deliveredFleet(),
      admissions: new JunctionAdmissions(network),
      settings: populationSettings({ pedestrians: PEDESTRIANS, vehicles: VEHICLES, seed: SEED, spawnIntervalTicks: 1 }),
    });

    const stackingFailures: string[] = [];
    const everOnDiagonal = new Set<number>();
    let activeSeen = 0;
    let movingInOneFrame = 0;
    let proximityFrames = 0;
    let worstStack = 0;
    let worstStackTick = 0;
    let worstShare = 0;
    let worstShareTick = 0;
    let worstDistinct = 0;
    let worstDeepBodies = 0;
    let worstDeepTick = 0;
    let worstDeepestM = 0;
    let nearestDiagonalM = Number.POSITIVE_INFINITY;
    let nearestDiagonalTick = 0;

    for (let tick = 1; tick <= TICKS; tick += 1) {
      if (tick % YIELD_EVERY_TICKS === 0) await turnTheEventLoop();
      population.update(STEP, tick * STEP);
      if (tick % SAMPLE_EVERY !== 0 && tick !== TICKS) continue;

      const positions = pedestrianPositions(population.poses, CONTACT_RADIUS_M);
      const report = pedestrianOverlapReport(positions, {
        densityRadiusM: PROXIMITY_RADIUS_M,
        orcaRadiusM: PEDESTRIAN_DYNAMICS.neighbourRadiusM,
        orcaCap: PEDESTRIAN_DYNAMICS.neighbours,
      });
      const speeds = population.poses.pedestrians.speedMps;

      const stacks = new Map<string, number>();
      let movingInThisFrame = 0;
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.x[index]!;
        const z = positions.z[index]!;
        const key = `${Math.round(x * POSITION_QUANTUM)}:${Math.round(z * POSITION_QUANTUM)}`;
        stacks.set(key, (stacks.get(key) ?? 0) + 1);

        let nearest = Number.POSITIVE_INFINITY;
        let onDiagonal = false;
        for (const section of diagonal) {
          const offset = sectionOffsetM(x, z, section.points);
          if (offset < nearest) nearest = offset;
          if (offset <= section.widthM / 2) onDiagonal = true;
        }
        if (nearest < nearestDiagonalM) {
          nearestDiagonalM = nearest;
          nearestDiagonalTick = tick;
        }
        if (onDiagonal) everOnDiagonal.add(positions.slot[index]!);

        if (speeds[positions.slot[index]!]! > 0.2) movingInThisFrame += 1;
      }
      if (report.density.mean > 0) proximityFrames += 1;
      activeSeen = Math.max(activeSeen, positions.count);
      movingInOneFrame = Math.max(movingInOneFrame, movingInThisFrame);

      let largestStack = 0;
      let largestStackKey = "";
      for (const [key, bodies] of stacks) {
        if (bodies > largestStack) {
          largestStack = bodies;
          largestStackKey = key;
        }
      }
      const sharing = positions.count - stacks.size;
      const share = positions.count ? sharing / positions.count : 0;
      const deep = report.overlappingPairs.filter((pair) => pair.penetrationM > DEEP_PENETRATION_M);
      const deepBodies = new Set<number>();
      for (const pair of deep) {
        deepBodies.add(pair.a);
        deepBodies.add(pair.b);
      }

      if (largestStack > worstStack) {
        worstStack = largestStack;
        worstStackTick = tick;
        worstDistinct = stacks.size;
      }
      if (share > worstShare) {
        worstShare = share;
        worstShareTick = tick;
      }
      if (deepBodies.size > worstDeepBodies) {
        worstDeepBodies = deepBodies.size;
        worstDeepTick = tick;
        worstDeepestM = report.deepest?.penetrationM ?? 0;
      }
      if (largestStack > MAXIMUM_STACK_AT_ONE_CENTIMETRE && stackingFailures.length < 5) {
        const [cellX = 0, cellZ = 0] = largestStackKey.split(":").map((value) => Number(value) / POSITION_QUANTUM);
        stackingFailures.push(
          `tick ${tick}: ${largestStack} bodies occupy the one centimetre at (${cellX.toFixed(2)}, ${cellZ.toFixed(2)}) out of ${positions.count} active bodies holding ${stacks.size} distinct positions`,
        );
      }
    }

    expect(activeSeen, "the gate is vacuous unless a crowd was actually drawn").toBeGreaterThan(MINIMUM_CROWD);
    expect(
      movingInOneFrame,
      "the gate is vacuous unless walkers were actually walking: no sampled frame held a body moving faster than 0.2 m/s",
    ).toBeGreaterThan(0);
    expect(
      proximityFrames,
      `the gate is vacuous unless the run contained frames in which two bodies were within ${PROXIMITY_RADIUS_M} m of each other: none of the samples did`,
    ).toBeGreaterThan(0);
    expect(
      everOnDiagonal.size,
      `the crowd never surged across the authored scramble diagonal over ${TICKS} ticks: ${everOnDiagonal.size} of the ${PEDESTRIANS} active bodies entered ${diagonal.map((section) => section.id).join(", ")}, and the nearest any walker came to it was ${nearestDiagonalM.toFixed(3)} m at tick ${nearestDiagonalTick}. ` +
        `A crowd that never reaches the crossing cannot interpenetrate on it, so this gate would be vacuous without the walkers it is about.`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      stackingFailures,
      `no more than ${MAXIMUM_STACK_AT_ONE_CENTIMETRE} bodies may occupy one centimetre; the worst sample held ${worstStack} at tick ${worstStackTick} with ${worstDistinct} distinct positions`,
    ).toEqual([]);
    expect(
      worstShare,
      `at most ${(MAXIMUM_SHARING_SHARE * 100).toFixed(0)}% of the crowd may share a one-centimetre position with another body; the worst sample had ${(worstShare * 100).toFixed(2)}% at tick ${worstShareTick}`,
    ).toBeLessThanOrEqual(MAXIMUM_SHARING_SHARE);
    expect(
      worstDeepBodies,
      `at most ${(MAXIMUM_DEEP_BODY_SHARE * 100).toFixed(0)}% of the crowd may have another body's centre inside its own ${CONTACT_RADIUS_M} m collision circle; the worst sample had ${worstDeepBodies} of ${activeSeen} bodies at tick ${worstDeepTick}, deepest penetration ${worstDeepestM.toFixed(3)} m`,
    ).toBeLessThanOrEqual(Math.ceil(activeSeen * MAXIMUM_DEEP_BODY_SHARE));
    expect(population.status().authorityViolations, "the run must not have driven without a grant").toBe(0);
  });
});
