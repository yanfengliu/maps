/**
 * harness: the walking population's bodies counted as *positions* rather than as
 * slots, and the crossing's lateral spread read from the same reading.
 *
 * WHY THIS EXISTS. `PopulationStatus.pedestrians.active` and the bridge's
 * `rendered.pedestrians` both count instances: slots with an active byte. The
 * deliverable's own acceptance line is about instances occupying distinct
 * places, and the two numbers came apart here — measured on `f4e96f0` at 3,000
 * pedestrians, 1,229 to 1,661 distinct positions held all 3,000, in stacks of up
 * to 108 bodies at one centimetre. Every claim built on the instance count
 * inherited that, and no tracked tool measured it. `crowd-occupancy.ts` answers
 * *where* the crowd is; this answers *whether it is anywhere*.
 *
 * DEFINITIONS, once, because they decide every number below. They are the
 * definitions `artifacts/crowd-stacking/wt/tools/agents/population-placement.ts`
 * uses, restated so the two tools' columns mean the same thing; that file is
 * uncommitted sibling-lane work and was not on this lane's base, so this is a
 * reimplementation of its measurement rather than a call into it. Reconcile the
 * two at integration.
 *
 *  - **A position** is a body's contact origin on the ground plane, quantised to
 *    `--decimals` decimal places (default 2, so 1 cm). X and Z only: height is
 *    not a position, and two bodies on a pavement and a deck above it are one
 *    position here.
 *  - **`distinctPositions`** is the number of occupied quantised positions.
 *    **`shareFraction`** is `(active - distinctPositions) / active`, the share
 *    of the population that is not the first body at its own position.
 *  - **A stack** is every body at one quantised position. **`largestStack`** is
 *    the biggest such group. A crowd of 3,000 over this network's walking
 *    corridors cannot put 108 bodies on one centimetre; a placement or lifetime
 *    defect can.
 *  - **`lateralSpreadM`** is the widest perpendicular offset from the route
 *    centreline among the bodies standing on one named walk section at one
 *    sample. It is the direct reading of "the route representation has no lateral
 *    position": it is 0 for every body sharing a polyline, however many of them
 *    there are. The section is named with `--section` (substring match) and the
 *    default is the authored scramble diagonal.
 *
 * WHAT IT CANNOT SEE. It has no camera, no GPU and no pixels: it cannot say
 * whether the crowd reads as a crowd in a frame, and it cannot say whether a body
 * is where its route says it should be. `--sample-every` is the shortest stack it
 * can observe between samples. One seed, one pair of counts, one tick window, one
 * process.
 *
 * RUN IT:
 *
 *   node tools/agents/crowd-spread.ts --pedestrians 3000 --vehicles 200 --ticks 72000 --sample-every 600
 *   node tools/agents/crowd-spread.ts --ticks 600 --digest-only          # determinism pair
 *
 * It exits 1, naming what it found, when the run breaks either threshold, so it
 * can be a gate rather than a report: `--max-stack` (default 8) and
 * `--max-share-fraction` (default 0.5).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { PEDESTRIAN_DYNAMICS, POPULATION_LIMITS, populationSettings } from "../../src/agents/population/config.ts";
import { distribution, importMetaResolve, pedestrianPositions } from "./spacing-metrics.ts";
import type { NetworkData, WalkEdge, WorldPoint } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), "../..");
const STEP = 1 / 60;

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

const pedestrians = argument("pedestrians", 3_000);
const vehicles = argument("vehicles", 200);
const ticks = argument("ticks", 72_000);
const seed = argument("seed", 0x5b1b0a);
const sampleEvery = Math.max(1, argument("sample-every", 600));
const decimals = Math.max(0, Math.min(4, argument("decimals", 2)));
const maxStack = argument("max-stack", 8);
const maxShareFraction = argument("max-share-fraction", 0.5);
/** Substring of the walk section the lateral-spread reading is taken on. */
const sectionMatch = output("section") ?? ":scramble-diagonal:";
const junctionId = output("junction") ?? "scramble";
const jsonPath = output("json");
const digestOnly = process.argv.includes("--digest-only");

const QUANTUM = 10 ** decimals;

function readRequired<T>(path: string, label: string): { bytes: Buffer; value: T } {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`Crowd spread needs ${label} at ${full} and it is missing. Build it with the repository's own data commands (npm run data:network, npm run data:setup); this tool measures the delivered inputs and will not substitute a fixture.`);
  }
  const bytes = readFileSync(full);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as T };
}

/** Perpendicular distance from a world point to a section's own polyline, metres. */
function sectionOffsetM(x: number, z: number, edge: WalkEdge): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < edge.points.length; i += 1) {
    const a = edge.points[i - 1]!;
    const b = edge.points[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq)) : 0;
    const distance = Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
    if (distance < best) best = distance;
  }
  return best;
}

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");

const targetWalks = network.value.walks.filter((walk) => walk.id.includes(sectionMatch));
if (!targetWalks.length) {
  throw new Error(`Crowd spread found no walking section whose id contains "${sectionMatch}" in the delivered network. The corridor geometry changed, or --section names the wrong one; this tool will not report a spread over an empty set.`);
}
const junction = network.value.junctions.find((item) => item.id === junctionId);
if (!junction) throw new Error(`Crowd spread: the delivered network has no junction ${junctionId}. Name the right one with --junction.`);

/** The bounding boxes that broad-phase the section test, and the sections' own widths. */
const targetBoxes = targetWalks.map((edge) => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of edge.points as readonly WorldPoint[]) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  return { edge, minX, maxX, minZ, maxZ };
});

const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network.value);
const population = createPopulation({ network: network.value, fleet: fleet.value, admissions, settings });

interface Sample {
  tick: number;
  seconds: number;
  active: number;
  distinctPositions: number;
  shareFraction: number;
  largestStack: number;
  stacksAtLeast10: number;
  movingBodies: number;
  overlappingPairs: number;
  deepestPenetrationM: number;
  /** Bodies within a metre of a named section's centreline, and their lateral spread. */
  onSection: number;
  lateralSpreadM: number | null;
  lateralOffsetsM: number[];
  stage: string;
}

const samples: Sample[] = [];
const costs: number[] = [];
let worstStack = 0;
let worstStackTick = 0;
let worstShare = 0;
let worstShareTick = 0;
let worstPairs = 0;
let worstPairsTick = 0;
let leastDistinct = Number.POSITIVE_INFINITY;
let leastDistinctTick = 0;
let leastDistinctActive = 0;
let peakOnSection = 0;
let peakOnSectionTick = 0;
let widestSpread = 0;
let widestSpreadTick = 0;
let lastTick = 0;

/** A grid of this tool's own: never the population's, so a defect in that index cannot be agreed with here. */
const grid = new Map<number, number[]>();
const gridKey = (column: number, row: number): number => (row + 0x4000) * 0x10000 + (column + 0x4000);
const gridCellM = 2;

const loop = new RenderLoop({ render: () => {} });
loop.onFixedStep((step, simulatedSeconds) => {
  if (step !== STEP) throw new Error(`The fixed step must be exactly ${STEP} s; the loop reported ${step}.`);
  const started = performance.now();
  population.update(step, simulatedSeconds);
  costs.push(performance.now() - started);
  lastTick += 1;
  if (lastTick % sampleEvery !== 0 && lastTick !== ticks) return;

  const positions = pedestrianPositions(population.poses, PEDESTRIAN_DYNAMICS.radiusM);
  const stacks = new Map<string, number>();
  const occupied = new Uint8Array(positions.count);
  let movingBodies = 0;
  const speeds = population.poses.pedestrians.speedMps;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.x[index]!;
    const z = positions.z[index]!;
    const key = `${Math.round(x * QUANTUM)}:${Math.round(z * QUANTUM)}`;
    stacks.set(key, (stacks.get(key) ?? 0) + 1);
    if (speeds[positions.slot[index]!]! > 0.05) movingBodies += 1;
    const cell = gridKey(Math.floor(x / gridCellM), Math.floor(z / gridCellM));
    const bucket = grid.get(cell);
    if (bucket) bucket.push(index);
    else grid.set(cell, [index]);
  }

  // Overlapping pairs on the authored collision circles: one grid pass, the same
  // quantity `pedestrianOverlapReport` counts, so the two tools' pair counts are
  // comparable.
  let overlappingPairs = 0;
  let deepestPenetrationM = 0;
  const candidates: number[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.x[index]!;
    const z = positions.z[index]!;
    candidates.length = 0;
    for (let column = Math.floor((x - 6) / gridCellM); column <= Math.floor((x + 6) / gridCellM); column += 1) {
      for (let row = Math.floor((z - 6) / gridCellM); row <= Math.floor((z + 6) / gridCellM); row += 1) {
        for (const other of grid.get(gridKey(column, row)) ?? []) candidates.push(other);
      }
    }
    for (const other of candidates) {
      if (other <= index) continue;
      const distance = Math.hypot(positions.x[other]! - x, positions.z[other]! - z);
      const contact = positions.radiusM[index]! + positions.radiusM[other]!;
      if (distance >= contact) continue;
      overlappingPairs += 1;
      occupied[index] = 1;
      occupied[other] = 1;
      const penetration = contact - distance;
      if (penetration > deepestPenetrationM) deepestPenetrationM = penetration;
    }
  }
  grid.clear();

  // The lateral reading: bodies within a metre of a named section's centreline,
  // and how far off that centreline they are.
  let onSection = 0;
  let spread = 0;
  const offsets: number[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.x[index]!;
    const z = positions.z[index]!;
    for (const box of targetBoxes) {
      if (x < box.minX - 1 || x > box.maxX + 1) continue;
      if (z < box.minZ - 1 || z > box.maxZ + 1) continue;
      const offset = sectionOffsetM(x, z, box.edge);
      if (offset > 1) continue;
      onSection += 1;
      offsets.push(Number(offset.toFixed(4)));
      if (offset > spread) spread = offset;
      break;
    }
  }

  let largestStack = 0;
  let stacksAtLeast10 = 0;
  for (const bodies of stacks.values()) {
    if (bodies > largestStack) largestStack = bodies;
    if (bodies >= 10) stacksAtLeast10 += 1;
  }
  const distinctPositions = stacks.size;
  const shareFraction = positions.count ? (positions.count - distinctPositions) / positions.count : 0;
  const stage = admissions.signalSnapshot().find((snapshot) => snapshot.junctionId === junctionId);
  if (!stage) throw new Error(`The signal authority published no snapshot for ${junctionId}.`);

  if (largestStack > worstStack) { worstStack = largestStack; worstStackTick = lastTick; }
  if (shareFraction > worstShare) { worstShare = shareFraction; worstShareTick = lastTick; }
  if (overlappingPairs > worstPairs) { worstPairs = overlappingPairs; worstPairsTick = lastTick; }
  if (positions.count > 0 && distinctPositions < leastDistinct) {
    leastDistinct = distinctPositions;
    leastDistinctTick = lastTick;
    leastDistinctActive = positions.count;
  }
  if (onSection > peakOnSection) { peakOnSection = onSection; peakOnSectionTick = lastTick; }
  if (spread > widestSpread) { widestSpread = spread; widestSpreadTick = lastTick; }
  samples.push({
    tick: lastTick,
    seconds: Number((lastTick * STEP).toFixed(2)),
    active: positions.count,
    distinctPositions,
    shareFraction: Number(shareFraction.toFixed(6)),
    largestStack,
    stacksAtLeast10,
    movingBodies,
    overlappingPairs,
    deepestPenetrationM: Number(deepestPenetrationM.toFixed(4)),
    onSection,
    lateralSpreadM: onSection ? Number(spread.toFixed(4)) : null,
    lateralOffsetsM: offsets.slice(0, 64),
    stage: stage.stage,
  });
});

const runStarted = performance.now();
for (let tick = 1; tick <= ticks; tick += 1) {
  const before = lastTick;
  loop.advance(tick * STEP * 1000 + 0.001);
  if (lastTick !== before + 1) throw new Error(`Fixed step ${tick} did not run exactly once.`);
}
const elapsedMs = performance.now() - runStarted;
loop.stop();

/* The digest is over the same buffers `population-run.ts` digests, so a run of
 * this tool and a run of that one can be compared for determinism directly. */
const digest = createHash("sha256");
const poses = population.poses;
for (const array of [
  poses.pedestrians.current.position, poses.pedestrians.current.yaw, poses.pedestrians.current.generation, poses.pedestrians.active,
  poses.vehicles.current.position, poses.vehicles.current.yaw, poses.vehicles.current.generation, poses.vehicles.active,
] as const) {
  digest.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
}
const finalDigest = digest.digest("hex");
if (digestOnly) {
  process.stdout.write(`${finalDigest}\n`);
} else {
  const status = population.status();
  const sorted = [...costs].sort((left, right) => left - right);
  const percentile = (fraction: number): number => Number((sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0).toFixed(3));
  const failure: string[] = [];
  if (worstStack > maxStack) failure.push(`the largest stack held ${worstStack} bodies at one ${1 / QUANTUM} m position at tick ${worstStackTick}, above the ${maxStack} this run permits`);
  if (worstShare > maxShareFraction) failure.push(`${(worstShare * 100).toFixed(1)}% of the active population shared a position with another body at tick ${worstShareTick}, above the ${(maxShareFraction * 100).toFixed(0)}% this run permits`);
  const summary = {
    tool: "tools/agents/crowd-spread.ts",
    command: process.argv.slice(2).join(" "),
    loaded: {
      tool: HERE,
      root: ROOT,
      populationModule: importMetaResolve("../../src/agents/population/tick.ts"),
      routesModule: importMetaResolve("../../src/agents/population/routes.ts"),
      pedestriansModule: importMetaResolve("../../src/agents/population/pedestrians.ts"),
    },
    bound: {
      pedestrians, vehicles, ticks, seed, stepSeconds: STEP,
      sampleEveryTicks: sampleEvery, samples: samples.length,
      positionDecimals: decimals, positionQuantumM: 1 / QUANTUM,
      shortestObservableStackTicks: sampleEvery,
      sectionMatch, junctionId,
    },
    inputs: {
      network: createHash("sha256").update(network.bytes).digest("hex"),
      vehicles: createHash("sha256").update(fleet.bytes).digest("hex"),
      pedestrianRadiusM: POPULATION_LIMITS.pedestrianRadiusM,
    },
    corridor: {
      sectionsMatched: targetWalks.length,
      sectionIds: targetWalks.map((walk) => walk.id),
      sectionWidthsM: targetWalks.map((walk) => walk.widthM),
      sectionLengthsM: targetWalks.map((walk) => Number(walk.lengthM.toFixed(3))),
      /** Half a corridor less the authored body radius: the room a lateral lane has. */
      sectionHalfWidthM: targetWalks.map((walk) => Number((walk.widthM / 2 - PEDESTRIAN_DYNAMICS.radiusM).toFixed(4))),
    },
    elapsedMs: Math.round(elapsedMs),
    run: {
      simulatedSeconds: status.simulatedSeconds,
      activeInstances: status.pedestrians.active,
      vehiclesActive: status.vehicles.active,
      pedestrianCrossed: status.pedestrians.crossed,
      pedestrianCompleted: status.pedestrians.completed,
      vehiclesCrossed: status.vehicles.crossed,
      vehiclesCompleted: status.vehicles.completed,
      lifecycle: status.lifecycle,
      authorityViolations: status.authorityViolations,
      retiredInPlace: status.retiredInPlace,
    },
    spread: {
      leastDistinctPositions: Number.isFinite(leastDistinct) ? leastDistinct : 0,
      leastDistinctPositionsTick: leastDistinctTick,
      leastDistinctPositionsActive: leastDistinctActive,
      worstLargestStack: worstStack,
      worstLargestStackTick: worstStackTick,
      worstShareFraction: worstShare,
      worstShareTick: worstShareTick,
      worstOverlappingPairs: worstPairs,
      worstOverlappingPairsTick: worstPairsTick,
      final: samples.at(-1) ?? null,
      series: samples,
    },
    lateral: {
      peakBodiesOnSection: peakOnSection,
      peakBodiesOnSectionTick: peakOnSectionTick,
      widestSpreadM: Number(widestSpread.toFixed(4)),
      widestSpreadTick: widestSpreadTick,
      samplesWithBodiesOnSection: samples.filter((sample) => sample.onSection > 0).length,
      /** The distinct lateral offsets seen on the section, at the widest sample. */
      widestSampleOffsetsM: (samples.find((sample) => sample.tick === widestSpreadTick)?.lateralOffsetsM ?? []).slice(0, 40),
      spreadAcrossSamples: distribution(samples.filter((sample) => sample.lateralSpreadM !== null).map((sample) => sample.lateralSpreadM!)),
    },
    tickCostMs: { p05: percentile(0.05), median: percentile(0.5), p95: percentile(0.95), max: percentile(1) },
    thresholds: { maxStack, maxShareFraction },
    digest: finalDigest,
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
    process.stderr.write(`crowd spread gate FAILED: ${failure.join("; ")}. Bound: ${pedestrians} pedestrians, ${vehicles} vehicles, ${ticks} ticks, sampled every ${sampleEvery} ticks.\n`);
    process.exitCode = 1;
  }
}
