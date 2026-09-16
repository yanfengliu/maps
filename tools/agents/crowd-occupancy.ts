/**
 * harness: the delivered `data/network/network.json`, the real
 * `JunctionAdmissions` authority with its real `SignalController`, the real
 * `createPopulation` module and the real `RenderLoop` fixed step. No browser, no
 * GPU, no Playwright lane.
 *
 * This is the instrument for the one measurement the deliverable is judged on:
 * **is the crowd on and around Shibuya Scramble Crossing**, and does it cross
 * when the pedestrian stage is open?
 *
 * It answers, per simulated tick sample:
 *
 *  - how many active walkers stand within 60 m of the world origin (the block
 *    the crossing occupies) and within 30 m (the scramble's own inner disk);
 *  - how many stand on the scramble compound's own walking sections, and how
 *    many of those on the authored diagonal itself;
 *  - how many walkers are *inside* the diagonal at that instant, and how long a
 *    walker takes to traverse it;
 *  - what the scramble's signal stage is at that instant.
 *
 * Bound: one seed, one pair of counts, one tick window, one process. It measures
 * the shipping simulation path and nothing else. It cannot say whether the crowd
 * is *visible* — that needs a frame — and it says nothing about pixels, about
 * the pose composition path or about the GPU. A walker counted here is a body
 * whose published pose is inside the radius, whatever it is doing there.
 *
 * RUN IT:
 *
 *   node tools/agents/crowd-occupancy.ts --pedestrians 3000 --vehicles 200 --ticks 7200
 *
 * Output: a JSON report on stdout; `--json <path>` also writes it to disk.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { populationSettings } from "../../src/agents/population/config.ts";
import type { NetworkData, WalkEdge } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STEP = 1 / 60;

function argument(name: string, fallback: number): number {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(process.argv[at + 1]);
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number after it; received ${process.argv[at + 1]}`);
  return value;
}

function flag(name: string): string | null {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return null;
  const value = process.argv[at + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`--${name} needs a value after it.`);
  return value;
}

function readRequired<T>(path: string, label: string): T {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`Crowd occupancy needs ${label} at ${full} and it is missing. Build it with the repository's own data commands (npm run data:network, npm run data:setup); this tool measures the delivered inputs and will not substitute a fixture.`);
  }
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const ticks = argument("ticks", 7200);
const seed = argument("seed", 0x5b1b0a);
const sampleEvery = argument("sample-every", 10);
/**
 * Ticks before the first sample. A route from an AOI portal to the crossing is
 * 500 m to 1,000 m of walking at 1.1 m/s, so nobody can be there in the first
 * minutes; sampling that stretch costs the run and answers nothing. `--warmup 0`
 * is the whole run, and every recorded run states the window it used.
 */
const warmup = argument("warmup", 0);
const nearRadiusM = argument("near", 60);
const innerRadiusM = argument("inner", 30);
const scrambleId = flag("junction") ?? "scramble";
const jsonPath = flag("json");

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");

/* ------------------------------------------------------------- the geometry */

const nearestToOrigin = (edge: WalkEdge): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const point of edge.points) best = Math.min(best, Math.hypot(point.x, point.z));
  return best;
};

/** The compound's own walking sections: every walk governed by that junction id. */
const scrambleWalks = network.walks.filter((walk) => walk.junctionId === scrambleId);
/** The authored diagonal, by the name the network gives it. */
const diagonalWalks = network.walks.filter((walk) => walk.id.includes(":scramble-diagonal:"));
if (!diagonalWalks.length) {
  throw new Error(`Crowd occupancy found no authored diagonal in the delivered network: no walking section's id contains ":scramble-diagonal:". The crossing geometry changed; rebuild it before measuring.`);
}
if (!scrambleWalks.length) {
  throw new Error(`Crowd occupancy found no walking section governed by ${scrambleId}; the delivered network has no such compound. Name the right one with --junction.`);
}

/**
 * A section's own distance to the world origin, and whether a world point is on
 * it. Membership is the true perpendicular distance to the polyline, not a
 * distance to its endpoints: the diagonal is 49 m long and a body standing on
 * its middle is 24 m from either end.
 */
function segmentDistance(x: number, z: number, edge: WalkEdge): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < edge.points.length; i += 1) {
    const a = edge.points[i - 1]!;
    const b = edge.points[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq)) : 0;
    best = Math.min(best, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)));
  }
  return best;
}

/** The half-width of the corridor a walker counts as being on a section. */
const ON_SECTION_M = 1.0;

interface Member { edge: WalkEdge; diagonal: boolean; minX: number; maxX: number; minZ: number; maxZ: number }

const boundingBox = (edge: WalkEdge): { minX: number; maxX: number; minZ: number; maxZ: number } => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of edge.points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  return { minX, maxX, minZ, maxZ };
};

const scrambleMembers: Member[] = scrambleWalks.map((edge) => ({ edge, diagonal: diagonalWalks.some((d) => d.id === edge.id), ...boundingBox(edge) }));
const diagonalMembers = scrambleMembers.filter((member) => member.diagonal);

/**
 * On-section membership, broad-phased by bounding box. The exact test is a
 * perpendicular distance to every segment of a 24-point polyline, and the
 * population has 3,000 bodies to test against 66 sections per sample; the box
 * rejects almost all of those pairs in four comparisons and changes no answer,
 * because a point outside a segment's own box cannot be within any distance of
 * the segment.
 */
function onAnyOf(x: number, z: number, members: readonly Member[]): boolean {
  for (const member of members) {
    if (x < member.minX - ON_SECTION_M || x > member.maxX + ON_SECTION_M) continue;
    if (z < member.minZ - ON_SECTION_M || z > member.maxZ + ON_SECTION_M) continue;
    if (segmentDistance(x, z, member.edge) <= ON_SECTION_M) return true;
  }
  return false;
}

const junction = network.junctions.find((item) => item.id === scrambleId);
if (!junction) throw new Error(`Crowd occupancy: the delivered network has no junction ${scrambleId}.`);

/* ----------------------------------------------------------------- the run */

const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network);
const population = createPopulation({ network, fleet, admissions, settings });

interface Sample {
  tick: number;
  simulatedSeconds: number;
  stage: string;
  activeGroup: string | null;
  within60: number;
  within30: number;
  onScramble: number;
  onDiagonal: number;
  /** Walkers between 100 m and 60 m out, which is the approach to the crossing. */
  ring60to100: number;
  ring100to200: number;
  /** Pedestrians the authority holds a commitment for at the scramble right now. */
  committedAtScramble: number;
  /** Ticks since any walker was inside the diagonal, or null while none ever was. */
  ticksSinceDiagonal: number | null;
  /** The farthest-along walker's metres of route, which is the liveness check. */
  maxTravelledM: number;
  walkersPast400m: number;
  walkersPast600m: number;
  /** Active walkers whose measured speed is below the stopped threshold. */
  stoppedWalkers: number;
}

const samples: Sample[] = [];
/** How many walkers are inside the diagonal at each sampled tick, for peak reading. */
let peakDiagonal = 0;
let peakScramble = 0;
let peakWithin30 = 0;
let peakWithin60 = 0;
/** The most pedestrians the authority held at the scramble at once. */
let peakCommitted = 0;
/** The farthest any active walker ever got along its own route. */
let peakTravelledM = 0;
/** The last sampled tick any walker was inside the diagonal, for the clearing test. */
let lastDiagonalTick: number | null = null;
/** Per-walker entry bookkeeping, so traversal time is a measurement and not a guess. */
const insideDiagonal = new Map<number, number>();
const traversals: number[] = [];
/**
 * The closest each walker that has ever held a pose came to the world origin.
 *
 * This is the measurement that does not depend on when the run stops: a route to
 * the crossing cannot show up as occupancy until a body has walked 500 m or more,
 * whereas the closest approach of every body that lived says whether the routes go
 * there at all. The per-distance histogram at the end is the same number read as a
 * distribution rather than as one worst case.
 */
const closestApproachM = new Float64Array(pedestrians).fill(Number.POSITIVE_INFINITY);
/**
 * Metres of route each walker has covered, read from its own plan.
 *
 * `status().pedestrians.completed` counts retirements and cannot tell a crowd that
 * is walking from a crowd that never started, so progress along the route is
 * measured here from the same plans the population drives, through the interface
 * that exists to expose them.
 */
const travelledProgressM: number[] = [];
let greenSamples = 0;
let greenOccupancySum = 0;
let nonGreenSamples = 0;
let nonGreenOccupancySum = 0;
let greenDiagonalSum = 0;
let nonGreenDiagonalSum = 0;

const loop = new RenderLoop({ render: () => {} });
const unregister = loop.onFixedStep((step, simulatedSeconds) => {
  if (step !== STEP) throw new Error(`The fixed step must be exactly ${STEP} s; the loop reported ${step}.`);
  population.update(step, simulatedSeconds);
  const tick = Math.round(simulatedSeconds / STEP);
  if (tick % sampleEvery !== 0) return;
  if (tick < warmup) return;
  const poses = population.poses.pedestrians;
  const stage = admissions.signalSnapshot().find((snapshot) => snapshot.junctionId === scrambleId);
  if (!stage) throw new Error(`The signal authority published no snapshot for ${scrambleId}.`);
  const position = poses.current.position;
  let within60 = 0;
  let within30 = 0;
  let ring60to100 = 0;
  let ring100to200 = 0;
  let onScramble = 0;
  let onDiagonal = 0;
  const nowInside = new Set<number>();
  for (let slot = 0; slot < poses.count; slot += 1) {
    if (!poses.active[slot]) continue;
    const x = position[slot * 3]!;
    const z = position[slot * 3 + 2]!;
    const r = Math.hypot(x, z);
    if (r < closestApproachM[slot]!) closestApproachM[slot] = r;
    if (r <= nearRadiusM) within60 += 1;
    else if (r <= 100) ring60to100 += 1;
    else if (r <= 200) ring100to200 += 1;
    if (r <= innerRadiusM) within30 += 1;
    if (onAnyOf(x, z, scrambleMembers)) onScramble += 1;
    if (onAnyOf(x, z, diagonalMembers)) {
      onDiagonal += 1;
      nowInside.add(slot);
      if (!insideDiagonal.has(slot)) insideDiagonal.set(slot, tick);
    }
  }
  for (const [slot, enteredTick] of insideDiagonal) {
    if (nowInside.has(slot)) continue;
    traversals.push((tick - enteredTick) / 60);
    insideDiagonal.delete(slot);
  }
  if (onDiagonal > 0) lastDiagonalTick = tick;
  // The slot diagnostics are built on demand and read nothing `update` uses, so
  // this cannot steer a body; it is the only interface that says how far along its
  // route a walker is.
  const diagnostics = population.diagnostics().pedestrians;
  let maxTravelledM = 0;
  let walkersPast400m = 0;
  let walkersPast600m = 0;
  let stoppedWalkers = 0;
  let committedAtScramble = 0;
  for (const actor of diagnostics) {
    if (actor.active) {
      if (actor.travelledM > maxTravelledM) maxTravelledM = actor.travelledM;
      if (actor.travelledM >= 400) walkersPast400m += 1;
      if (actor.travelledM >= 600) walkersPast600m += 1;
      if (actor.speedMps < 0.05) stoppedWalkers += 1;
      travelledProgressM.push(actor.travelledM);
    }
    if (actor.committed && actor.junctionId === scrambleId) committedAtScramble += 1;
  }
  peakCommitted = Math.max(peakCommitted, committedAtScramble);
  peakTravelledM = Math.max(peakTravelledM, maxTravelledM);
  const green = stage.stage === "pedestrian";
  if (green) {
    greenSamples += 1;
    greenOccupancySum += onScramble;
    greenDiagonalSum += onDiagonal;
  } else {
    nonGreenSamples += 1;
    nonGreenOccupancySum += onScramble;
    nonGreenDiagonalSum += onDiagonal;
  }
  peakDiagonal = Math.max(peakDiagonal, onDiagonal);
  peakScramble = Math.max(peakScramble, onScramble);
  peakWithin60 = Math.max(peakWithin60, within60);
  peakWithin30 = Math.max(peakWithin30, within30);
  samples.push({
    tick,
    simulatedSeconds: Number(simulatedSeconds.toFixed(3)),
    stage: stage.stage,
    activeGroup: stage.activeGroup,
    within60,
    within30,
    onScramble,
    onDiagonal,
    ring60to100,
    ring100to200,
    committedAtScramble,
    ticksSinceDiagonal: lastDiagonalTick === null ? null : tick - lastDiagonalTick,
    maxTravelledM,
    walkersPast400m,
    walkersPast600m,
    stoppedWalkers,
  });
});

const runStarted = performance.now();
for (let tick = 1; tick <= ticks; tick += 1) loop.advance(tick * STEP * 1000 + 0.001);
const elapsedMs = performance.now() - runStarted;
unregister();
loop.stop();

const status = population.status();
const simulatedMinutes = (ticks / 60) / 60;
/** The first sampled tick at which any walker was inside the diagonal. */
const firstDiagonalTick = samples.find((sample) => sample.onDiagonal > 0)?.tick ?? null;
/** Peak-occupancy tick, so the peak can be looked at rather than trusted. */
const peakTick = samples.find((sample) => sample.onDiagonal === peakDiagonal)?.tick ?? null;
/** Distinct walkers that ever entered the diagonal, by their first entry tick. */
const entered = traversals.length + insideDiagonal.size;
const sortedTraversals = [...traversals].sort((a, b) => a - b);

/** Contiguous runs of samples inside the pedestrian stage, with their own peak. */
const greens: { fromTick: number; toTick: number; samples: number; peakOnDiagonal: number; peakOnScramble: number }[] = [];
for (const sample of samples) {
  const open = sample.stage === "pedestrian";
  const last = greens.at(-1);
  if (!open) continue;
  if (last && last.toTick === sample.tick - sampleEvery) {
    last.toTick = sample.tick;
    last.samples += 1;
    last.peakOnDiagonal = Math.max(last.peakOnDiagonal, sample.onDiagonal);
    last.peakOnScramble = Math.max(last.peakOnScramble, sample.onScramble);
  } else {
    greens.push({ fromTick: sample.tick, toTick: sample.tick, samples: 1, peakOnDiagonal: sample.onDiagonal, peakOnScramble: sample.onScramble });
  }
}

/**
 * The surge question, answered numerically rather than by eye: over the green
 * windows that fall inside the sampled window, how many had a walker on the
 * diagonal at all, and how concentrated is the diagonal's occupancy into them.
 */
const windowsWithDiagonal = greens.filter((window) => window.peakOnDiagonal > 0);
const diagonalsPerMinuteInsideGreens = entered / Math.max(1e-9, simulatedMinutes * (greenSamples / Math.max(1, samples.length)));

/** Every walker that ever held a pose, by the closest it came to the crossing. */
const approached = [...closestApproachM].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
const withinOf = (radiusM: number): number => approached.filter((value) => value <= radiusM).length;
const closestApproachReport = {
  walkersThatEverHeldAPose: approached.length,
  closestAnyWalkerCameM: approached.length ? Number(approached[0]!.toFixed(3)) : null,
  medianClosestApproachM: approached.length ? Number(approached[approached.length >> 1]!.toFixed(3)) : null,
  within60: withinOf(nearRadiusM),
  within30: withinOf(innerRadiusM),
  within100: withinOf(100),
  within200: withinOf(200),
  within500: withinOf(500),
};

const report = {
  tool: "tools/agents/crowd-occupancy.ts",
  // Which tree the loader actually resolved. A worktree under `artifacts/` whose
  // `data` and `node_modules` are junctions still resolves `../../src/...` to its
  // own `src/`, and this line is how that is asserted rather than assumed.
  loaded: { populationModule: import.meta.resolve("../../src/agents/population/tick.ts"), toolPath: fileURLToPath(import.meta.url) },
  bound: { pedestrians, vehicles, ticks, seed, sampleEvery, warmup, nearRadiusM, innerRadiusM, scrambleId, stepSeconds: STEP },
  network: {
    walkingSections: network.walks.length,
    scrambleWalkingSections: scrambleWalks.length,
    diagonalSections: diagonalWalks.length,
    diagonalLengthM: Number(diagonalWalks.reduce((sum, walk) => sum + walk.lengthM, 0).toFixed(3)),
    scrambleRadiusM: junction.radiusM,
    scrambleNearestToOriginM: Number(Math.min(...scrambleWalks.map(nearestToOrigin)).toFixed(3)),
  },
  run: { elapsedMs: Math.round(elapsedMs), sampledTicks: samples.length, simulatedMinutes: Number(simulatedMinutes.toFixed(3)) },
  active: { pedestrians: status.pedestrians.active, vehicles: status.vehicles.active },
  lifecycle: status.lifecycle,
  authorityViolations: status.authorityViolations,
  retiredInPlace: status.retiredInPlace,
  occupancy: {
    peakWithin60,
    peakWithin30,
    peakOnScramble: peakScramble,
    peakOnDiagonal: peakDiagonal,
    peakDiagonalTick: peakTick,
    firstDiagonalTick,
    lastDiagonalTick,
    meanWithin60: Number((samples.reduce((sum, sample) => sum + sample.within60, 0) / Math.max(1, samples.length)).toFixed(3)),
    meanWithin30: Number((samples.reduce((sum, sample) => sum + sample.within30, 0) / Math.max(1, samples.length)).toFixed(3)),
    meanOnScramble: Number((samples.reduce((sum, sample) => sum + sample.onScramble, 0) / Math.max(1, samples.length)).toFixed(3)),
    meanOnDiagonal: Number((samples.reduce((sum, sample) => sum + sample.onDiagonal, 0) / Math.max(1, samples.length)).toFixed(3)),
    meanRing60to100: Number((samples.reduce((sum, sample) => sum + sample.ring60to100, 0) / Math.max(1, samples.length)).toFixed(3)),
    meanRing100to200: Number((samples.reduce((sum, sample) => sum + sample.ring100to200, 0) / Math.max(1, samples.length)).toFixed(3)),
    samplesWithDiagonal: samples.filter((sample) => sample.onDiagonal > 0).length,
    walkersEnteringDiagonal: entered,
    walkersEnteringDiagonalPerMinute: Number((entered / simulatedMinutes).toFixed(3)),
    /**
     * Whether the crossing clears: the longest a walker was ever on the diagonal.
     * A traverse is 49.061 m at a 1.1 m/s cadence, so 45 s of walking plus the
     * admission wait at either gate is the scale; a body held past this bound is
     * standing on the crossing rather than walking over it.
     */
    longestDiagonalTraversalSeconds: sortedTraversals.length ? Number(sortedTraversals.at(-1)!.toFixed(2)) : null,
  },
  /**
   * The authority's own view of the crossing: how many bodies it held there at
   * once, and how many distinct walkers it admitted over the run. `committed` is
   * the queue plus the bodies on the crossing, so a jam shows as a count that
   * climbs and never clears rather than as a wait nobody measured.
   */
  flow: {
    peakPedestriansCommittedAtScramble: peakCommitted,
    meanPedestriansCommittedAtScramble: Number((samples.reduce((sum, sample) => sum + sample.committedAtScramble, 0) / Math.max(1, samples.length)).toFixed(3)),
    samplesWithCommitment: samples.filter((sample) => sample.committedAtScramble > 0).length,
    /** The population's own counters, unchanged by this tool. */
    pedestriansCrossed: status.pedestrians.crossed,
    pedestriansCompleted: status.pedestrians.completed,
    pedestriansQueued: status.pedestrians.queued,
    pedestriansCommitted: status.pedestrians.committed,
    longestPedestrianWaitSeconds: status.pedestrians.longestWaitSeconds,
    meanPedestrianWaitSeconds: status.pedestrians.meanWaitSeconds,
    grantsTotal: status.grants,
    vehiclesCrossed: status.vehicles.crossed,
    vehiclesCompleted: status.vehicles.completed,
    longestVehicleWaitSeconds: status.vehicles.longestWaitSeconds,
    refusedSpawns: status.refusedSpawns,
    refusedRoutes: status.refusedRoutes,
  },
  diagonalTraversalSeconds: sortedTraversals.length
    ? {
        count: sortedTraversals.length,
        min: Number(sortedTraversals[0]!.toFixed(2)),
        median: Number(sortedTraversals[sortedTraversals.length >> 1]!.toFixed(2)),
        p95: Number(sortedTraversals[Math.min(sortedTraversals.length - 1, Math.ceil(sortedTraversals.length * 0.95) - 1)]!.toFixed(2)),
        max: Number(sortedTraversals.at(-1)!.toFixed(2)),
      }
    : null,
  bySignalStage: {
    pedestrian: { samples: greenSamples, meanOnScramble: Number((greenOccupancySum / Math.max(1, greenSamples)).toFixed(3)), meanOnDiagonal: Number((greenDiagonalSum / Math.max(1, greenSamples)).toFixed(3)) },
    other: { samples: nonGreenSamples, meanOnScramble: Number((nonGreenOccupancySum / Math.max(1, nonGreenSamples)).toFixed(3)), meanOnDiagonal: Number((nonGreenDiagonalSum / Math.max(1, nonGreenSamples)).toFixed(3)) },
  },
  surge: {
    pedestrianGreenWindowsSampled: greens.length,
    pedestrianGreenWindowsWithAWalkerOnTheDiagonal: windowsWithDiagonal.length,
    peakOnDiagonalByGreenWindow: greens.map((window) => window.peakOnDiagonal),
    /** Walkers entering the diagonal per minute of pedestrian green, not of run. */
    walkersEnteringDiagonalPerGreenMinute: Number(diagonalsPerMinuteInsideGreens.toFixed(3)),
  },
  closestApproach: closestApproachReport,
  /**
   * Whether the crowd is walking at all. An occupancy count of zero has two
   * causes — nobody has arrived yet, and nobody is moving — and they need
   * separating, because the first is the run's length and the second is a defect.
   */
  progress: {
    peakTravelledM: Number(peakTravelledM.toFixed(1)),
    peakWalkersPast400m: Math.max(0, ...samples.map((sample) => sample.walkersPast400m)),
    peakWalkersPast600m: Math.max(0, ...samples.map((sample) => sample.walkersPast600m)),
    maxStoppedWalkers: Math.max(0, ...samples.map((sample) => sample.stoppedWalkers)),
    meanStoppedWalkers: Number((samples.reduce((sum, sample) => sum + sample.stoppedWalkers, 0) / Math.max(1, samples.length)).toFixed(1)),
    /** The farthest-along walker at each sampled tick, which is the clock, read. */
    maxTravelledBySample: samples.map((sample) => Number(sample.maxTravelledM.toFixed(0))),
  },
  pedestrianGreenWindows: greens,
  // The per-sample series is the evidence behind every number above; it is kept
  // separate so the summary stays readable and the series stays checkable.
  series: samples,
};

if (jsonPath) writeFileSync(resolve(ROOT, jsonPath), JSON.stringify(report, null, 2));
const { series, pedestrianGreenWindows, ...summary } = report;
process.stdout.write(`${JSON.stringify({ ...summary, pedestrianGreenWindowCount: pedestrianGreenWindows.length, seriesLength: series.length }, null, 2)}\n`);
