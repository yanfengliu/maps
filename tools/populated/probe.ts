/**
 * harness: the delivered network, the real `JunctionAdmissions` authority, the
 * real `createPopulation` module and the real fixed step. No browser, no GPU.
 *
 * This is an **aiming aid for `tools/populated/populated.spec.ts`**, not
 * evidence. It answers the questions the capture plan needs and the bridge
 * cannot answer:
 *
 *  - when does the scramble actually run its pedestrian phase, in population
 *    ticks (the bridge publishes no signal snapshot; see the lane's README);
 *  - how many pedestrians are standing on the scramble as the phase runs;
 *  - where do vehicles hold for a signal, and where do they spawn and despawn
 *    at the AOI boundary;
 *  - what world coordinates should the camera be panned to for each sequence.
 *
 * Everything it prints is a property of the deterministic simulation the
 * browser runs from the same seed, so a tick here is the same tick there. What
 * it cannot do is say what any frame looks like; only the PNG does that.
 *
 * RUN IT:
 *
 *   node tools/populated/probe.ts --ticks 5400
 *
 * Output: one JSON object on stdout, and the same bytes written to
 * `artifacts/populated-capture/aiming.json` when `--out` names a path.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { populationSettings } from "../../src/agents/population/config.ts";
import type { NetworkData, Junction, LaneEdge } from "../../src/world/network-data.ts";
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

function readRequired<T>(path: string, label: string): T {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`The probe needs ${label} at ${full} and it is missing; build it with the repository's own data commands.`);
  }
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

const ticks = argument("ticks", 5400);
const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const seed = argument("seed", 0x5b1b0a);

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network);
const population = createPopulation({ network, fleet, admissions, settings });

const distanceTo = (junction: Junction): number => Math.hypot(junction.position.x, junction.position.z);
const nearJunctions = network.junctions
  .map((junction) => ({ id: junction.id, control: junction.controlKind, x: round(junction.position.x), z: round(junction.position.z), distanceM: round(distanceTo(junction)), radiusM: round(junction.radiusM), vehicleGreenSeconds: junction.vehicleGreenSeconds, pedestrianGreenSeconds: junction.pedestrianGreenSeconds, clearanceSeconds: junction.clearanceSeconds, vehicleGroups: junction.vehicleGroups.length, pedestrianGroup: junction.pedestrianGroup }))
  .sort((a, b) => a.distanceM - b.distanceM)
  .slice(0, 12);

const scramble = network.junctions.find((junction) => junction.id === "scramble");
if (!scramble) throw new Error('The delivered network has no "scramble" junction; this probe aims the crossing sequence at it by name.');

function round(value: number): number { return Math.round(value * 100) / 100; }

interface SignalWindow { stage: string; fromTick: number; toTick: number; seconds: number }
const signalWindows: SignalWindow[] = [];
let currentWindow: SignalWindow | null = null;

interface Spot { x: number; z: number; count: number; distanceM: number }
const spawnSpots = new Map<string, Spot>();
const despawnSpots = new Map<string, Spot>();
const spawnEvents: { tick: number; x: number; z: number; yaw: number }[] = [];
const despawnEvents: { tick: number; x: number; z: number }[] = [];
const holdSpots = new Map<string, Spot & { junctionId: string; vehicle: number }>();
const holdSeconds = new Map<number, number>();

const scrambleOccupancy: { tick: number; seconds: number; pedestrians: number; vehicles: number }[] = [];
let peakScramblePedestrians = 0;
let peakScrambleTick = 0;

/** How close any vehicle body has been to the crossing, and when. */
let closestVehicle = { metres: Number.POSITIVE_INFINITY, tick: 0, x: 0, z: 0 };
let closestPedestrian = { metres: Number.POSITIVE_INFINITY, tick: 0, x: 0, z: 0 };
/** Sample of the vehicle population's distance from the crossing, every 5 s. */
const vehicleDistanceSamples: { seconds: number; within150: number; within300: number; within500: number; active: number }[] = [];
const pedestrianDistanceSamples: { seconds: number; within25: number; within60: number; within150: number; active: number }[] = [];

/** Previous active bytes, so a spawn or despawn is an edge and not a snapshot. */
const wasActivePedestrians = new Uint8Array(pedestrians);
const wasActiveVehicles = new Uint8Array(vehicles);
const lastVehiclePosition = new Float64Array(vehicles * 3);
const holdTicks = new Float64Array(vehicles);

const loop = new RenderLoop({ render: () => {} });
let tick = 0;

/** Optional: dump every active agent's position at one tick, for aiming. */
const dumpTick = argument("dump-tick", 0);
const dumpFile = process.argv.indexOf("--dump-file") >= 0 ? process.argv[process.argv.indexOf("--dump-file") + 1] : undefined;
const positionDump: { tick: number; pedestrians: number[][]; vehicles: number[][] } = { tick: 0, pedestrians: [], vehicles: [] };
const groundSample = (): { edgeY: number; id: string } => {
  // The delivered network's own edge vertices carry the surface height the
  // pipeline resolved, which is what an agent standing on that way should have.
  let best = { edgeY: Number.NaN, id: "none" };
  return best;
};
void groundSample;

loop.onFixedStep(() => {
  tick += 1;
  population.update(STEP, tick * STEP);
  const poses = population.poses;

  // Signal windows for the scramble, in ticks.
  const snapshot = admissions.signalSnapshot().find((state) => state.junctionId === scramble.id);
  if (!snapshot) throw new Error("The admissions authority published no snapshot for the scramble junction.");
  if (currentWindow === null || currentWindow.stage !== snapshot.stage) {
    if (currentWindow) { currentWindow.toTick = tick - 1; currentWindow.seconds = round((currentWindow.toTick - currentWindow.fromTick + 1) * STEP); signalWindows.push(currentWindow); }
    currentWindow = { stage: snapshot.stage, fromTick: tick, toTick: tick + 1, seconds: 0 };
  }

  // Occupancy of the scramble conflict area, both kinds.
  let pedestriansOnScramble = 0;
  for (let slot = 0; slot < pedestrians; slot += 1) {
    if (!poses.pedestrians.active[slot]) continue;
    const x = poses.pedestrians.current.position[slot * 3]!;
    const z = poses.pedestrians.current.position[slot * 3 + 2]!;
    const metres = Math.hypot(x, z);
    if (metres < closestPedestrian.metres) closestPedestrian = { metres, tick, x: round(x), z: round(z) };
    if (Math.hypot(x - scramble.position.x, z - scramble.position.z) <= scramble.radiusM + 4) pedestriansOnScramble += 1;
  }
  let vehiclesInScramble = 0;
  for (let slot = 0; slot < vehicles; slot += 1) {
    if (!poses.vehicles.active[slot]) continue;
    const x = poses.vehicles.current.position[slot * 3]!;
    const z = poses.vehicles.current.position[slot * 3 + 2]!;
    const metres = Math.hypot(x, z);
    if (metres < closestVehicle.metres) closestVehicle = { metres, tick, x: round(x), z: round(z) };
    if (Math.hypot(x - scramble.position.x, z - scramble.position.z) <= scramble.radiusM + 4) vehiclesInScramble += 1;
  }
  // Every five simulated seconds, how the population is distributed around the
  // crossing. This is the number that decides whether a pose at the crossing can
  // show anybody at all.
  if (tick % 300 === 0) {
    const seconds = round(tick * STEP);
    let vehicleWithin150 = 0; let vehicleWithin300 = 0; let vehicleWithin500 = 0; let vehicleActive = 0;
    for (let slot = 0; slot < vehicles; slot += 1) {
      if (!poses.vehicles.active[slot]) continue;
      vehicleActive += 1;
      const metres = Math.hypot(poses.vehicles.current.position[slot * 3]!, poses.vehicles.current.position[slot * 3 + 2]!);
      if (metres <= 150) vehicleWithin150 += 1;
      if (metres <= 300) vehicleWithin300 += 1;
      if (metres <= 500) vehicleWithin500 += 1;
    }
    vehicleDistanceSamples.push({ seconds, within150: vehicleWithin150, within300: vehicleWithin300, within500: vehicleWithin500, active: vehicleActive });
    let within25 = 0; let within60 = 0; let within150 = 0; let pedestrianActive = 0;
    for (let slot = 0; slot < pedestrians; slot += 1) {
      if (!poses.pedestrians.active[slot]) continue;
      pedestrianActive += 1;
      const metres = Math.hypot(poses.pedestrians.current.position[slot * 3]!, poses.pedestrians.current.position[slot * 3 + 2]!);
      if (metres <= 25) within25 += 1;
      if (metres <= 60) within60 += 1;
      if (metres <= 150) within150 += 1;
    }
    pedestrianDistanceSamples.push({ seconds, within25, within60, within150, active: pedestrianActive });
  }
  if (pedestriansOnScramble > peakScramblePedestrians) { peakScramblePedestrians = pedestriansOnScramble; peakScrambleTick = tick; }
  if (tick % 30 === 0) scrambleOccupancy.push({ tick, seconds: round(tick * STEP), pedestrians: pedestriansOnScramble, vehicles: vehiclesInScramble });

  // Vehicle lifecycle edges, holds, and where they happen.
  for (let slot = 0; slot < vehicles; slot += 1) {
    const x = poses.vehicles.current.position[slot * 3]!;
    const z = poses.vehicles.current.position[slot * 3 + 2]!;
    const active = poses.vehicles.active[slot] === 1;
    if (active && wasActiveVehicles[slot] === 0) {
      spawnEvents.push({ tick, x: round(x), z: round(z), yaw: round(poses.vehicles.current.yaw[slot]!) });
      const key = `${Math.round(x / 10) * 10}:${Math.round(z / 10) * 10}`;
      const spot = spawnSpots.get(key) ?? { x: Math.round(x / 10) * 10, z: Math.round(z / 10) * 10, count: 0, distanceM: round(Math.hypot(x, z)) };
      spot.count += 1; spawnSpots.set(key, spot);
    }
    if (!active && wasActiveVehicles[slot] === 1) {
      despawnEvents.push({ tick, x: round(lastVehiclePosition[slot * 3]!), z: round(lastVehiclePosition[slot * 3 + 2]!) });
      const key = `${Math.round(lastVehiclePosition[slot * 3]! / 10) * 10}:${Math.round(lastVehiclePosition[slot * 3 + 2]! / 10) * 10}`;
      const spot = despawnSpots.get(key) ?? { x: Math.round(lastVehiclePosition[slot * 3]! / 10) * 10, z: Math.round(lastVehiclePosition[slot * 3 + 2]! / 10) * 10, count: 0, distanceM: round(Math.hypot(lastVehiclePosition[slot * 3]!, lastVehiclePosition[slot * 3 + 2]!)) };
      spot.count += 1; despawnSpots.set(key, spot);
    }
    if (active) {
      lastVehiclePosition[slot * 3] = x; lastVehiclePosition[slot * 3 + 1] = poses.vehicles.current.position[slot * 3 + 1]!; lastVehiclePosition[slot * 3 + 2] = z;
      const speed = poses.vehicles.speedMps[slot]!;
      const held = speed < 0.05;
      holdTicks[slot] = held ? holdTicks[slot]! + 1 : 0;
      // A vehicle that has been stationary for half a second, standing inside a
      // junction's own conflict envelope: that is a signal hold, by position.
      if (held && holdTicks[slot]! === 30) {
        let nearest: Junction | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const junction of network.junctions) {
          const distance = Math.hypot(x - junction.position.x, z - junction.position.z) - junction.radiusM;
          if (distance < nearestDistance) { nearestDistance = distance; nearest = junction; }
        }
        if (nearest && nearestDistance < 12) {
          const key = `${nearest.id}:${Math.round(x / 5) * 5}:${Math.round(z / 5) * 5}`;
          const spot = holdSpots.get(key) ?? { x: Math.round(x / 5) * 5, z: Math.round(z / 5) * 5, count: 0, distanceM: round(Math.hypot(x, z)), junctionId: nearest.id, vehicle: slot };
          spot.count += 1; holdSpots.set(key, spot);
          holdSeconds.set(slot, (holdSeconds.get(slot) ?? 0) + 0.5);
        }
      }
    } else {
      holdTicks[slot] = 0;
    }
    wasActiveVehicles[slot] = active ? 1 : 0;
  }
  for (let slot = 0; slot < pedestrians; slot += 1) wasActivePedestrians[slot] = poses.pedestrians.active[slot] === 1 ? 1 : 0;
  void wasActivePedestrians;

  if (dumpTick > 0 && tick === dumpTick) {
    positionDump.tick = tick;
    for (let slot = 0; slot < pedestrians; slot += 1) {
      if (!poses.pedestrians.active[slot]) continue;
      positionDump.pedestrians.push([round(poses.pedestrians.current.position[slot * 3]!), round(poses.pedestrians.current.position[slot * 3 + 1]!), round(poses.pedestrians.current.position[slot * 3 + 2]!), round(poses.pedestrians.speedMps[slot]!)]);
    }
    for (let slot = 0; slot < vehicles; slot += 1) {
      if (!poses.vehicles.active[slot]) continue;
      positionDump.vehicles.push([round(poses.vehicles.current.position[slot * 3]!), round(poses.vehicles.current.position[slot * 3 + 1]!), round(poses.vehicles.current.position[slot * 3 + 2]!), round(poses.vehicles.speedMps[slot]!)]);
    }
  }
});

const started = performance.now();
for (let step = 1; step <= ticks; step += 1) loop.advance(step * STEP * 1000 + 0.001);
loop.stop();

const openWindow = currentWindow as SignalWindow | null;
if (openWindow) { openWindow.toTick = tick; openWindow.seconds = round((openWindow.toTick - openWindow.fromTick + 1) * STEP); signalWindows.push(openWindow); }

const status = population.status();
const approachLanes = (junctionIds: readonly string[]) => network.lanes
  .filter((lane: LaneEdge) => junctionIds.includes(lane.junctionId ?? ""))
  .map((lane) => ({ id: lane.id, junctionId: lane.junctionId, lengthM: round(lane.lengthM), speedMps: lane.speedMps, from: lane.from, to: lane.to, start: lane.points[0] ? { x: round(lane.points[0].x), z: round(lane.points[0].z) } : null, end: lane.points.at(-1) ? { x: round(lane.points.at(-1)!.x), z: round(lane.points.at(-1)!.z) } : null }))
  .slice(0, 24);

const holdRanking = [...holdSpots.values()].sort((a, b) => b.count - a.count).slice(0, 12);
const summary = {
  tool: "tools/populated/probe.ts",
  purpose: "aiming aid for the populated capture lane; not evidence",
  bound: { pedestrians, vehicles, ticks, seed, stepSeconds: STEP },
  elapsedMs: Math.round(performance.now() - started),
  finalStatus: { ticks: status.ticks, simulatedSeconds: round(status.simulatedSeconds), pedestrians: status.pedestrians, vehicles: status.vehicles, lifecycle: status.lifecycle, boundarySpawns: status.boundarySpawns, retiredInPlace: status.retiredInPlace, authorityViolations: status.authorityViolations },
  scramble: { id: scramble.id, x: round(scramble.position.x), z: round(scramble.position.z), radiusM: round(scramble.radiusM), vehicleGroups: scramble.vehicleGroups, pedestrianGroup: scramble.pedestrianGroup, vehicleGreenSeconds: scramble.vehicleGreenSeconds, pedestrianGreenSeconds: scramble.pedestrianGreenSeconds, clearanceSeconds: scramble.clearanceSeconds },
  nearJunctions,
  scrambleSignalWindows: signalWindows,
  scrambleOccupancy,
  peakScramblePedestrians: { count: peakScramblePedestrians, tick: peakScrambleTick, seconds: round(peakScrambleTick * STEP) },
  closestVehicle: { metres: round(closestVehicle.metres), tick: closestVehicle.tick, seconds: round(closestVehicle.tick * STEP), x: closestVehicle.x, z: closestVehicle.z },
  closestPedestrian: { metres: round(closestPedestrian.metres), tick: closestPedestrian.tick, seconds: round(closestPedestrian.tick * STEP), x: closestPedestrian.x, z: closestPedestrian.z },
  vehicleDistanceSamples,
  pedestrianDistanceSamples,
  vehicleSpawns: { total: spawnEvents.length, first: spawnEvents.slice(0, 40), spots: [...spawnSpots.values()].sort((a, b) => b.count - a.count).slice(0, 12) },
  vehicleDespawns: { total: despawnEvents.length, first: despawnEvents.slice(0, 40), spots: [...despawnSpots.values()].sort((a, b) => b.count - a.count).slice(0, 12) },
  vehicleHolds: { spots: holdRanking, approachLanes: approachLanes([...new Set(holdRanking.map((spot) => spot.junctionId))]) },
};

const text = `${JSON.stringify(summary, null, 2)}\n`;
if (dumpFile !== undefined) {
  const target = resolve(ROOT, dumpFile);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(positionDump)}\n`, "utf8");
  process.stderr.write(`position dump written to ${target}\n`);
}
const outIndex = process.argv.indexOf("--out");
const out = outIndex >= 0 ? process.argv[outIndex + 1] : "artifacts/populated-capture/aiming.json";
if (out !== undefined) {
  const target = resolve(ROOT, out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text, "utf8");
  process.stderr.write(`aiming summary written to ${target}\n`);
}
process.stdout.write(text);
