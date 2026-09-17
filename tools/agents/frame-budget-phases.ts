/**
 * harness: the real delivered network, the real admission authority, the real
 * `createPopulation` module and the real `RenderLoop` fixed step, with the
 * population's own per-phase observer installed. No browser, no GPU.
 *
 * Bound: the counts and seed named on the command line, one process, one run, one
 * machine. This measures the shipping simulation path and nothing else — the pose
 * composition path and the GPU are `tools/agents/population-cost.ts`'s subject and
 * are not measured here.
 *
 * **Why it exists.** `tools/agents/population-run.ts` reports one number for a
 * tick, and a tick that costs 12 ms has at least five candidate causes inside
 * `createPopulation`'s closure: the crowd's neighbour index, its avoidance solve,
 * the admission request assembly, the authority's resolve, and the pose writes.
 * A fix aimed at the wrong one of those changes nothing measurable, so the phases
 * are timed apart before anything is changed.
 *
 * The observer is `PopulationOptions.observeTick`, which the shipped app does not
 * pass. The phases it reports are the design's own phase order with the `plan`
 * phase split, and every phase the tick ran appears, so a reader can see that the
 * parts sum to the tick rather than to a subset of it.
 *
 * RUN IT:
 *
 *   node tools/agents/frame-budget-phases.ts --pedestrians 3000 --vehicles 200 --ticks 1800
 *
 * Output: a JSON summary on stdout, and the same object written to `--out <path>`
 * when given. The tick's total is measured separately from the phase sum, so a
 * discrepancy between the two is visible rather than assumed away.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation, type TickPhaseCost } from "../../src/agents/population/tick.ts";
import { populationSettings } from "../../src/agents/population/config.ts";
import type { NetworkData } from "../../src/world/network-data.ts";
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

function readRequired<T>(path: string, label: string): { bytes: Buffer; value: T } {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(
      `The phase probe needs ${label} at ${full} and it is missing. Build it with the repository's own data commands ` +
        `(npm run data:network for the movement graph, npm run data:setup for the agent assets); this tool measures the ` +
        `delivered inputs and will not substitute a fixture.`,
    );
  }
  const bytes = readFileSync(full);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as T };
}

const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const ticks = argument("ticks", 1800);
const seed = argument("seed", 0x5b1b0a);
const warmup = argument("warmup", 300);
const outAt = process.argv.indexOf("--out");
const outPath = outAt >= 0 ? process.argv[outAt + 1] : undefined;
if (outAt >= 0 && !outPath) throw new Error("--out needs a path after it.");

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });

/**
 * Phase costs, one array per tick. The observer is called after the tick has run
 * and reads nothing from the population, so it cannot steer a body; the arrays are
 * the only state it keeps.
 */
const perTick: { totalMs: number; phases: TickPhaseCost[] }[] = [];
let current: TickPhaseCost[] = [];
const admissions = new JunctionAdmissions(network.value);
const population = createPopulation({
  network: network.value,
  fleet: fleet.value,
  admissions,
  settings,
  observeTick: (costs) => { current = costs.map((cost) => ({ ...cost })); },
});

let lastTick = 0;
const loop = new RenderLoop({ render: () => {} });
const unregister = loop.onFixedStep((step, simulatedSeconds) => {
  if (step !== STEP) throw new Error(`The fixed step must be exactly ${STEP} s; the loop reported ${step}.`);
  current = [];
  const before = performance.now();
  population.update(step, simulatedSeconds);
  const totalMs = performance.now() - before;
  perTick.push({ totalMs, phases: current });
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

const measured = perTick.slice(warmup);
if (!measured.length) throw new Error(`No tick ran past the ${warmup}-tick warmup, so there is nothing to report.`);

/** Every phase name the observed ticks reported, in first-seen order. */
const names: string[] = [];
for (const tick of measured) for (const cost of tick.phases) if (!names.includes(cost.phase)) names.push(cost.phase);

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]!;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;
const phaseStats = Object.fromEntries(names.map((name) => {
  const values = measured.map((tick) => tick.phases.find((cost) => cost.phase === name)?.milliseconds ?? 0);
  return [name, {
    median: round(percentile(values, 0.5)),
    p95: round(percentile(values, 0.95)),
    max: round(Math.max(...values)),
    shareOfTickMedian: 0,
  }];
}));
const totals = measured.map((tick) => tick.totalMs);
const medianTotal = percentile(totals, 0.5);
for (const name of names) {
  phaseStats[name]!.shareOfTickMedian = round(phaseStats[name]!.median / medianTotal);
}
const phaseSum = measured.map((tick) => tick.phases.reduce((sum, cost) => sum + cost.milliseconds, 0));

const status = population.status();
const summary = {
  tool: "tools/agents/frame-budget-phases.ts",
  bound: { pedestrians, vehicles, ticks, warmup, seed, stepSeconds: STEP, measuredTicks: measured.length },
  machine: {
    cpu: [...new Set(os.cpus().map((cpu) => cpu.model))].join(", "),
    logicalCpus: os.cpus().length,
    platform: `${process.platform} ${process.release}`,
    node: process.version,
  },
  inputs: {
    network: createHash("sha256").update(network.bytes).digest("hex"),
    vehicles: createHash("sha256").update(fleet.bytes).digest("hex"),
  },
  elapsedMs: Math.round(elapsedMs),
  tickMs: {
    median: round(medianTotal),
    p05: round(percentile(totals, 0.05)),
    p95: round(percentile(totals, 0.95)),
    max: round(Math.max(...totals)),
    /**
     * The least-contended tick in the window, and the reading two arms are compared on
     * when the machine is shared: contention can only ever add time to a tick, never
     * remove it, so the minimum is the closest estimate of the tick on a quiet machine.
     * The median beside it is the number to quote for a frame budget; this one is the
     * number to compare two revisions on.
     */
    min: round(Math.min(...totals)),
  },
  /** The sum of the observed phases. It should track `tickMs` closely; a gap is the observer's own cost. */
  phaseSumMs: { median: round(percentile(phaseSum, 0.5)), p95: round(percentile(phaseSum, 0.95)) },
  phases: phaseStats,
  headroomMs: round(16.667 - round(medianTotal)),
  population: {
    active: status.lifecycle.active,
    pedestrians: status.pedestrians,
    vehicles: status.vehicles,
    requestsLastTick: status.requestsLastTick,
    grantsLastTick: status.grantsLastTick,
    authorityViolations: status.authorityViolations,
  },
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (outPath) {
  const full = resolve(ROOT, outPath);
  mkdirSync(dirname(full), { recursive: true });
  if (existsSync(full)) throw new Error(`${full} already exists; this tool never overwrites a previous run's evidence. Name another path.`);
  writeFileSync(full, `${JSON.stringify(summary, null, 2)}\n`);
}
