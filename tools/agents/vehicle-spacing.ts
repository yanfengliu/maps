/**
 * harness: vehicles hold their lanes and follow each other without their bodies
 * overlapping, measured over a run rather than sampled in one frame.
 *
 * The simulation is the real one — the delivered network, the real
 * `JunctionAdmissions` authority, the real `createPopulation` module and the real
 * `RenderLoop` fixed step — and the measurement is `spacing-metrics.ts`, which
 * re-derives every body's oriented collision box from the published pose buffers
 * and the delivered fleet manifest. Nothing here reads the car-following law's
 * own idea of a gap, so a queue whose bodies interpenetrate cannot report as
 * healthy.
 *
 * Bound: one seed, one process, one run, the counts on the command line, and a
 * sampling interval in ticks (`--sample-every`, default 15) that is the shortest
 * overlap this tool can see between samples. The final tick is always sampled.
 * The measurement is geometric: it can say two envelopes overlap, and it cannot
 * say whether the pair was a queue, a lane change or two routes crossing.
 *
 * RUN IT:
 *
 *   node tools/agents/vehicle-spacing.ts --vehicles 200 --pedestrians 0 --ticks 3600
 *   node tools/agents/vehicle-spacing.ts --vehicles 200 --pedestrians 3000 --ticks 21600
 *
 * It exits 1 with a named failure when the run's worst sample breaks either
 * threshold, so it can be a gate rather than a report:
 * `--max-overlap-pairs` (default 0) and `--max-penetration-m` (default 0).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { populationSettings, VEHICLE_DYNAMICS } from "../../src/agents/population/config.ts";
import type { NetworkData } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import { distribution, followingPairs, importMetaResolve, overlappingPairs, sameDirection, vehicleBoxes, type OverlappingPair } from "./spacing-metrics.ts";

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), "../..");

function argument(name: string, fallback: number): number {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(process.argv[at + 1]);
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number after it; received ${process.argv[at + 1]}`);
  return value;
}

function output(name: string): string | null {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? null : process.argv[at + 1] ?? null;
}

const pedestrians = argument("pedestrians", 0);
const vehicles = argument("vehicles", 200);
const ticks = argument("ticks", 3_600);
const seed = argument("seed", 0x5b1b0a);
const sampleEvery = Math.max(1, argument("sample-every", 15));
const maxOverlapPairs = argument("max-overlap-pairs", 0);
const maxPenetrationM = argument("max-penetration-m", 0);
const jsonPath = output("json");
const STEP = 1 / 60;

function readRequired<T>(path: string, label: string): { bytes: Buffer; value: T } {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`Vehicle spacing needs ${label} at ${full} and it is missing. Build it with the repository's own data commands (npm run data:network and npm run data:setup); this tool measures the delivered inputs and will not substitute a fixture.`);
  }
  const bytes = readFileSync(full);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as T };
}

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network.value);
const population = createPopulation({ network: network.value, fleet: fleet.value, admissions, settings });

const costs: number[] = [];
let lastTick = 0;
let worstPairs = -1;
let worstPairsTick = 0;
let worstPairsAtFinal = 0;
let deepest = null as OverlappingPair | null;
let deepestLongitudinal = null as OverlappingPair | null;
let deepestFollowing = null as OverlappingPair | null;
let deepestHeadOn = null as OverlappingPair | null;
let worstFollowingPairs = -1;
let worstFollowingTick = 0;
let worstHeadOnPairs = -1;
let worstHeadOnTick = 0;
let samplesWithFollowingOverlap = 0;
let samplesWithHeadOnOverlap = 0;
let samplesWithOverlap = 0;
let samples = 0;
let runMinimumClearanceM = Number.POSITIVE_INFINITY;
let worstMinimumClearanceM = Number.POSITIVE_INFINITY;
let worstMinimumClearanceTick = 0;
let finalSpacings: number[] = [];
let finalBelowClearance = 0;
let finalNegative = 0;
let totalFollowingPairs = 0;
let finalMinimumFollowing = null as ReturnType<typeof followingPairs>[number] | null;
/**
 * The lane edge each slot is on when a pair was first seen to overlap, so an
 * overlapping pair can be attributed to the geometry it happened on. Filled only
 * for pairs that actually overlap, and cached: the run sees the same handful of
 * pairs for hundreds of consecutive samples.
 */
const pairEdges = new Map<string, { a: string | null; b: string | null; halfLengthsM: number }>();
/**
 * The standstill clearance the car-following law holds at rest, read tolerantly
 * because this tool runs against both trees: the revision before the spacing fix
 * carries `minimumSpacingM` (an origin-to-origin floor of 0.5 m) and the one
 * after carries `standstillClearanceM` (a real bumper-to-bumper gap). A tool that
 * refused to run on the earlier tree could not report a before number at all.
 */
const standstillClearanceM = (VEHICLE_DYNAMICS.idm as { standstillClearanceM?: number; minimumSpacingM?: number }).standstillClearanceM
  ?? (VEHICLE_DYNAMICS.idm as { minimumSpacingM?: number }).minimumSpacingM
  ?? 0;

const loop = new RenderLoop({ render: () => {} });
const unregister = loop.onFixedStep((step, simulatedSeconds) => {
  if (step !== STEP) throw new Error(`The fixed step must be exactly ${STEP} s; the loop reported ${step}.`);
  const started = performance.now();
  population.update(step, simulatedSeconds);
  costs.push(performance.now() - started);
  lastTick += 1;
  if (lastTick % sampleEvery !== 0 && lastTick !== ticks) return;
  samples += 1;
  const boxes = vehicleBoxes(fleet.value, population.poses);
  const pairs = overlappingPairs(boxes);
  if (pairs.length > worstPairs) {
    worstPairs = pairs.length;
    worstPairsTick = lastTick;
  }
  if (pairs.length > 0) samplesWithOverlap += 1;
  const followingOverlaps = pairs.filter((pair) => sameDirection(pair));
  const headOnOverlaps = pairs.filter((pair) => !sameDirection(pair));
  if (followingOverlaps.length > worstFollowingPairs) {
    worstFollowingPairs = followingOverlaps.length;
    worstFollowingTick = lastTick;
  }
  if (headOnOverlaps.length > worstHeadOnPairs) {
    worstHeadOnPairs = headOnOverlaps.length;
    worstHeadOnTick = lastTick;
  }
  if (followingOverlaps.length > 0) samplesWithFollowingOverlap += 1;
  if (headOnOverlaps.length > 0) samplesWithHeadOnOverlap += 1;
  if (pairs[0] && (!deepest || pairs[0].penetrationM > deepest.penetrationM)) deepest = pairs[0];
  for (const pair of followingOverlaps) {
    if (!deepestFollowing || pair.penetrationM > deepestFollowing.penetrationM) deepestFollowing = pair;
  }
  for (const pair of headOnOverlaps) {
    if (!deepestHeadOn || pair.penetrationM > deepestHeadOn.penetrationM) deepestHeadOn = pair;
  }
  // The lane each body was on, for the pairs this run actually saw overlap, with
  // the two bodies' half lengths so the attribution bound is the pair's own.
  if (pairs.length) {
    const diagnostics = population.diagnostics();
    const routeEdge = (slot: number): string | null => {
      const row = diagnostics.vehicles.find((entry) => entry.slot === slot);
      const route = population.vehicleRoute(slot);
      if (!row || !route) return null;
      return route.edgeIds[row.routeIndex] ?? null;
    };
    for (const pair of pairs) {
      const key = `${pair.a}:${pair.b}`;
      if (pairEdges.has(key)) continue;
      const boxA = boxes.find((entry) => entry.slot === pair.a);
      const boxB = boxes.find((entry) => entry.slot === pair.b);
      pairEdges.set(key, { a: routeEdge(pair.a), b: routeEdge(pair.b), halfLengthsM: (boxA?.halfLengthM ?? 0) + (boxB?.halfLengthM ?? 0) });
    }
  }
  // The deepest *longitudinal* overlap is the number a queue read centre-to-centre
  // produces, and it is reported beside the smallest-axis penetration because the
  // two are different claims about the same defect.
  for (const pair of pairs) {
    if (!deepestLongitudinal || pair.longitudinalOverlapM > deepestLongitudinal.longitudinalOverlapM) deepestLongitudinal = pair;
  }
  const following = followingPairs(boxes);
  totalFollowingPairs += following.length;
  const clearances = following.map((pair) => pair.clearanceM);
  const minimum = clearances.length ? Math.min(...clearances) : Number.POSITIVE_INFINITY;
  if (minimum < runMinimumClearanceM) runMinimumClearanceM = minimum;
  if (minimum < worstMinimumClearanceM) {
    worstMinimumClearanceM = minimum;
    worstMinimumClearanceTick = lastTick;
  }
  if (lastTick === ticks) {
    finalSpacings = clearances;
    finalMinimumFollowing = following.reduce<null | (typeof following)[number]>((worst, pair) => (worst === null || pair.clearanceM < worst.clearanceM ? pair : worst), null);
    finalBelowClearance = clearances.filter((value) => value < standstillClearanceM).length;
    finalNegative = clearances.filter((value) => value < 0).length;
  }
  if (lastTick === ticks) worstPairsAtFinal = pairs.length;
});

const runStarted = performance.now();
for (let tick = 1; tick <= ticks; tick += 1) {
  const before = lastTick;
  loop.advance(tick * STEP * 1000 + 0.001);
  if (lastTick !== before + 1) throw new Error(`Fixed step ${tick} did not run exactly once.`);
}
const elapsedMs = performance.now() - runStarted;
unregister();
loop.stop();

const status = population.status();
const measured = [...costs].sort((left, right) => left - right);
const percentile = (fraction: number): number => measured[Math.min(measured.length - 1, Math.ceil(measured.length * fraction) - 1)] ?? 0;
const spacing = distribution(finalSpacings);
const worstFollowingPenetrationM = deepestFollowing?.penetrationM ?? 0;

/**
 * How close the two lane edges an overlapping pair was on come to each other, in
 * metres — the minimum distance between their centrelines — and whether that
 * distance explains the overlap.
 *
 * Two bodies driving into each other cannot be ordered by any car-following rule,
 * so a head-on overlap is not scored against the spacing law. It is allowed only
 * where the network's own geometry makes it unavoidable, and the bound is derived
 * rather than chosen: when two lane centrelines come within the sum of the two
 * bodies' half lengths, bodies travelling those lanes can overlap whatever the
 * car-following law does. A head-on overlap between centrelines further apart than
 * that is a different defect and fails.
 */
const lanePoints = new Map(network.value.lanes.map((lane) => [lane.id, lane.points]));
function edgeSeparationM(a: string | null, b: string | null): number | null {
  if (a === null || b === null) return null;
  if (a === b) return 0;
  const first = lanePoints.get(a);
  const second = lanePoints.get(b);
  if (!first || !second) return null;
  let minimum = Number.POSITIVE_INFINITY;
  for (const point of first) {
    for (const other of second) {
      const distance = Math.hypot(point.x - other.x, point.z - other.z);
      if (distance < minimum) minimum = distance;
    }
  }
  return minimum;
}
const pairsSeen = [...pairEdges.entries()].map(([key, edges]) => {
  const separation = edgeSeparationM(edges.a, edges.b);
  return { key, a: edges.a, b: edges.b, edgeSeparationM: separation, allowanceM: edges.halfLengthsM, attributable: separation !== null && separation <= edges.halfLengthsM };
});
const unattributedHeadOn = pairsSeen.filter((pair) => !pair.attributable);

const failure: string[] = [];
if (worstFollowingPairs > maxOverlapPairs) failure.push(`${worstFollowingPairs} overlapping oriented-box pairs between bodies travelling the same direction at tick ${worstFollowingTick}, above the ${maxOverlapPairs} this run permits`);
if (worstFollowingPenetrationM > maxPenetrationM) failure.push(`deepest same-direction oriented-box penetration ${worstFollowingPenetrationM.toFixed(3)} m (${deepestFollowing?.labelA} into ${deepestFollowing?.labelB}), above the ${maxPenetrationM} m this run permits`);
if (unattributedHeadOn.length) {
  failure.push(`${unattributedHeadOn.length} head-on overlapping pair(s) whose lane centrelines are further apart than the two bodies' half lengths (${unattributedHeadOn.map((pair) => `${pair.a} / ${pair.b} at ${pair.edgeSeparationM === null ? "unknown" : pair.edgeSeparationM.toFixed(3)} m apart, allowance ${pair.allowanceM.toFixed(3)} m`).join("; ")}), which folded-lane geometry does not explain`);
}

const summary = {
  tool: "tools/agents/vehicle-spacing.ts",
  command: process.argv.slice(2).join(" "),
  bound: {
    pedestrians, vehicles, ticks, seed, stepSeconds: STEP, sampleEveryTicks: sampleEvery, samples,
    /** The measurement's own resolution: an overlap that opens and closes between two samples is invisible. */
    shortestObservableOverlapTicks: sampleEvery,
  },
  /**
   * Which tree this ran in, and the constants it measured under. A worktree's
   * tools can be loaded from the checkout beside them or from the primary
   * checkout through a junctioned module graph, and a measurement of the wrong
   * tree is indistinguishable from a measurement of the right one.
   */
  loaded: {
    tool: HERE,
    root: ROOT,
    populationConfig: { ...VEHICLE_DYNAMICS.idm },
    // The loader's own answer for the module this measurement drives, so a run
    // states which tree it measured instead of assuming the one beside it.
    populationModule: importMetaResolve("../../src/agents/population/tick.ts"),
  },
  inputs: {
    network: createHash("sha256").update(network.bytes).digest("hex"),
    vehicles: createHash("sha256").update(fleet.bytes).digest("hex"),
    fleetClasses: fleet.value.vehicles.map((asset) => ({ id: asset.id, lengthM: asset.collision.length, widthM: asset.collision.width })),
  },
  elapsedMs: Math.round(elapsedMs),
  run: {
    simulatedSeconds: status.simulatedSeconds,
    vehiclesActive: status.vehicles.active,
    pedestriansActive: status.pedestrians.active,
    crossed: status.vehicles.crossed,
    completed: status.vehicles.completed,
    queued: status.vehicles.queued,
    lifecycle: status.lifecycle,
    authorityViolations: status.authorityViolations,
    retiredInPlace: status.retiredInPlace,
  },
  overlap: {
    worstPairs: Math.max(0, worstPairs),
    worstPairsTick,
    pairsAtFinalTick: worstPairsAtFinal,
    samplesWithAnyOverlap: samplesWithOverlap,
    deepestPenetrationM: deepest?.penetrationM ?? 0,
    deepestPair: deepest,
    /** The deepest overlap measured along the pair's own longitudinal axis. */
    deepestLongitudinalOverlapM: deepestLongitudinal?.longitudinalOverlapM ?? 0,
    deepestLongitudinalPair: deepestLongitudinal,
    /** Car-following overlaps: two bodies in one lane, one behind the other. */
    sameDirection: {
      worstPairs: Math.max(0, worstFollowingPairs),
      worstPairsTick: worstFollowingTick,
      samplesWithAnyOverlap: samplesWithFollowingOverlap,
      deepestPenetrationM: worstFollowingPenetrationM,
      deepestPair: deepestFollowing,
    },
    /** Head-on overlaps, which no leader rule can order. */
    headOn: {
      worstPairs: Math.max(0, worstHeadOnPairs),
      worstPairsTick: worstHeadOnTick,
      samplesWithAnyOverlap: samplesWithHeadOnOverlap,
      deepestPenetrationM: deepestHeadOn?.penetrationM ?? 0,
      deepestPair: deepestHeadOn,
    },
    /** Every distinct overlapping pair the run saw, with the lanes it happened on. */
    pairsSeen,
  },
  spacing: {
    /** One entry per body with something ahead of it in its own lane, at the final tick. */
    followingPairsAtFinal: totalFollowingPairs === 0 ? 0 : finalSpacings.length,
    finalDistribution: spacing,
    belowStandstillClearanceAtFinal: finalBelowClearance,
    belowZeroAtFinal: finalNegative,
    standstillClearanceM,
    runMinimumClearanceM: Number.isFinite(runMinimumClearanceM) ? runMinimumClearanceM : null,
    worstMinimumClearanceTick,
    /** The tightest following pair at the final tick, with the heading it was measured across. */
    finalMinimumFollowing,
  },
  tickCostMs: { p05: percentile(0.05), median: measured[Math.floor(measured.length / 2)] ?? 0, p95: percentile(0.95), max: measured.at(-1) ?? 0 },
  thresholds: { maxOverlapPairs, maxPenetrationM, headOnAttribution: "edge centreline separation <= the two bodies' half lengths" },
  verdict: failure.length ? `fail: ${failure.join("; ")}` : "pass",
};

const text = `${JSON.stringify(summary, null, 2)}\n`;
process.stdout.write(text);
if (jsonPath) {
  const full = resolve(ROOT, jsonPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
}
if (failure.length) {
  process.stderr.write(`vehicle spacing gate FAILED: ${failure.join("; ")}. Bound: ${vehicles} vehicles, ${pedestrians} pedestrians, ${ticks} ticks, sampled every ${sampleEvery} ticks.\n`);
  process.exitCode = 1;
}
