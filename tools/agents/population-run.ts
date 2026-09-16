/**
 * harness: the real delivered network, the real `JunctionAdmissions` authority,
 * the real `createPopulation` module, and the real `RenderLoop` fixed step. No
 * browser, no GPU, no Playwright lane.
 *
 * Bound: the seed and counts named on the command line, one process, one run.
 * This measures the shipping simulation path and nothing else; the pose
 * composition path and the GPU are `tools/agents/population-cost.ts`'s subject
 * and are not measured here.
 *
 * RUN IT:
 *
 *   node tools/agents/population-run.ts --pedestrians 3000 --vehicles 200 --ticks 7200
 *
 * Output: a JSON summary on stdout with the lifecycle counts, the admission
 * counters per tick, the longest waits, the same-tick cost in milliseconds and a
 * SHA-256 digest over the final pose buffers. Pass `--digest-only` to print just
 * the digest, which is how two runs are compared for determinism.
 */

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { populationSettings } from "../../src/agents/population/config.ts";
import type { NetworkData } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function argument(name: string, fallback: number): number {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(process.argv[at + 1]);
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number after it; received ${process.argv[at + 1]}`);
  return value;
}

const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const ticks = argument("ticks", 7200);
const seed = argument("seed", 0x5b1b0a);
const warmup = argument("warmup", 0);
const digestOnly = process.argv.includes("--digest-only");
const STEP = 1 / 60;

function readRequired<T>(path: string, label: string): { bytes: Buffer; value: T } {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`Population run needs ${label} at ${full} and it is missing. Build it with the repository's own data commands (npm run data:network for the movement graph, npm run data:setup for the agent assets); this tool measures the delivered inputs and will not substitute a fixture.`);
  }
  const bytes = readFileSync(full);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as T };
}

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network.value);
const population = createPopulation({ network: network.value, fleet: fleet.value, admissions, settings });

const digest = createHash("sha256");
const costs: number[] = [];
let lastTick = 0;
const loop = new RenderLoop({ render: () => {} });
const unregister = loop.onFixedStep((step, simulatedSeconds) => {
  if (step !== STEP) throw new Error(`The fixed step must be exactly ${STEP} s; the loop reported ${step}.`);
  const started = performance.now();
  population.update(step, simulatedSeconds);
  costs.push(performance.now() - started);
  lastTick += 1;
});

const runStarted = performance.now();
for (let tick = 1; tick <= ticks + warmup; tick += 1) {
  const before = lastTick;
  loop.advance(tick * STEP * 1000 + 0.001);
  if (lastTick !== before + 1) throw new Error(`Fixed step ${tick} did not run exactly once.`);
}
const elapsedMs = performance.now() - runStarted;
unregister();
loop.stop();

const status = population.status();
const poses = population.poses;
const buffers: [Float32Array | Float64Array | Uint32Array | Uint8Array, string][] = [
  [poses.pedestrians.current.position, "pedestrian.position"],
  [poses.pedestrians.current.yaw, "pedestrian.yaw"],
  [poses.pedestrians.current.generation, "pedestrian.generation"],
  [poses.pedestrians.active, "pedestrian.active"],
  [poses.vehicles.current.position, "vehicle.position"],
  [poses.vehicles.current.yaw, "vehicle.yaw"],
  [poses.vehicles.current.generation, "vehicle.generation"],
  [poses.vehicles.active, "vehicle.active"],
];
for (const [array] of buffers) digest.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
const finalDigest = digest.digest("hex");

if (digestOnly) {
  process.stdout.write(`${finalDigest}\n`);
} else {
  const measured = costs.slice(warmup).sort((a, b) => a - b);
  const percentile = (fraction: number): number => measured[Math.min(measured.length - 1, Math.ceil(measured.length * fraction) - 1)] ?? 0;
  const summary = {
    tool: "tools/agents/population-run.ts",
    command: process.argv.slice(2).join(" "),
    bound: { pedestrians, vehicles, ticks, warmup, seed, stepSeconds: STEP },
    inputs: {
      network: createHash("sha256").update(network.bytes).digest("hex"),
      vehicles: createHash("sha256").update(fleet.bytes).digest("hex"),
    },
    elapsedMs: Math.round(elapsedMs),
    ticks: status.ticks,
    simulatedSeconds: status.simulatedSeconds,
    pedestrians: status.pedestrians,
    vehicles: status.vehicles,
    lifecycle: status.lifecycle,
    admission: {
      requestsLastTick: status.requestsLastTick,
      grantsLastTick: status.grantsLastTick,
      grants: status.grants,
      grantsPerTick: status.ticks ? status.grants / status.ticks : 0,
    },
    boundarySpawns: status.boundarySpawns,
    retiredInPlace: status.retiredInPlace,
    authorityViolations: status.authorityViolations,
    refusedRoutes: status.refusedRoutes.slice(0, 8),
    refusedRouteKinds: status.refusedRoutes.length,
    tickCostMs: {
      median: measured[Math.floor(measured.length / 2)] ?? 0,
      p95: percentile(0.95),
      max: measured.at(-1) ?? 0,
    },
    digest: finalDigest,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}
