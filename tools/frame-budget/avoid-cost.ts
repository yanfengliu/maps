/**
 * harness: the real crowd's own positions, taken out of a running population at a
 * chosen tick, put through the real `orcaVelocity` and the real `CellGrid` one part
 * at a time. No browser, no GPU.
 *
 * **Why it exists.** `tools/agents/frame-budget-phases.ts` says the crowd's
 * avoidance solve is 44% of a tick at the acceptance population. That phase
 * contains four separable costs — the neighbour query, the half-plane construction,
 * the linear program, and the object churn around all three — and their fixes are
 * different, so the phase has to be split before one of them is attacked. The CPU
 * profile says `CellGrid.neighbours` is hot, but the same grid against a synthetic
 * placement of the same body count costs a fraction of that, so the profile alone
 * cannot say whether the cost is density or the query's own shape.
 *
 * This tool runs the real population for `--settle` ticks and then replays the real
 * positions through each stage, timing them apart and counting what each visited.
 * The positions are the crowd's own; the *order* and the per-stage isolation are
 * this tool's, so a stage's cost here is the cost of that stage on this crowd and
 * not the tick's own total, which `frame-budget-phases.ts` owns.
 *
 * RUN IT:
 *
 *   node tools/frame-budget/avoid-cost.ts --settle 600
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../../src/network/admissions.ts";
import { RenderLoop } from "../../src/render/loop.ts";
import { createPopulation } from "../../src/agents/population/tick.ts";
import { populationSettings, PEDESTRIAN_DYNAMICS } from "../../src/agents/population/config.ts";
import { orcaHalfPlane, orcaVelocity } from "../../src/agents/population/pedestrians.ts";

/**
 * The half-plane shape `orcaHalfPlane` returns. Declared here rather than imported
 * because `pedestrians.ts` keeps its own `Line` local, and this tool is a reader of
 * that module's public surface rather than a second owner of its types. A change to
 * the shape fails to compile here, which is the point of restating it.
 */
interface Line {
  pointX: number;
  pointZ: number;
  w: number;
}
import type { GridCounters } from "../../src/agents/population/cell-grid.ts";
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

function readRequired<T>(path: string, label: string): T {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`The avoid-cost probe needs ${label} at ${full} and it is missing. Build it with npm run data:network and npm run data:setup; this tool measures the delivered inputs and will not substitute a fixture.`);
  }
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const settle = argument("settle", 600);
const rounds = argument("rounds", 5);
const seed = argument("seed", 0x5b1b0a);

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const admissions = new JunctionAdmissions(network);
const population = createPopulation({ network, fleet, admissions, settings });

const loop = new RenderLoop({ render: () => {} });
let tick = 0;
loop.onFixedStep((step, simulatedSeconds) => {
  if (step !== STEP) throw new Error(`The fixed step must be exactly ${STEP} s; the loop reported ${step}.`);
  tick += 1;
  population.update(step, simulatedSeconds);
});
for (let index = 0; index < settle; index += 1) loop.advance((index + 1) * STEP * 1000 + 0.001);
loop.stop();

// The crowd's own positions, headings, index and agent array, read from the
// population itself. Nothing here re-derives them: a rebuilt index with a different
// stride would be a different object and could report a defect the tick does not have.
const crowd = population.pedestrianCrowd();
const grid = crowd.hash;
const poses = population.poses.pedestrians;
const yaw = poses.current.yaw;
const agents = crowd.agents;
const active: number[] = [];
for (let slot = 0; slot < pedestrians; slot += 1) if (poses.active[slot]) active.push(slot);

const counters: GridCounters = { queries: 0, cellsVisited: 0, bodiesVisited: 0, inRadius: 0, atCap: 0, stoppedEarly: 0 };
(globalThis as { __DSH_GRID_COUNTS?: GridCounters }).__DSH_GRID_COUNTS = counters;

const neighbourOut = new Int32Array(PEDESTRIAN_DYNAMICS.neighbours);
const radius = PEDESTRIAN_DYNAMICS.neighbourRadiusM;
const limit = PEDESTRIAN_DYNAMICS.neighbours;
const horizon = PEDESTRIAN_DYNAMICS.timeHorizonSeconds;

interface Stage { name: string; milliseconds: number; perBodyMicros: number }
const stage = (name: string, work: () => void): Stage => {
  const before = performance.now();
  work();
  const milliseconds = performance.now() - before;
  return { name, milliseconds: round(milliseconds), perBodyMicros: round((milliseconds * 1000) / active.length) };
};
const round = (value: number): number => Math.round(value * 1000) / 1000;

/** What the neighbour query walked, filled by the stage that runs it. */
const walk = { queries: 0, cellsVisitedPerQuery: 0, bodiesVisitedPerQuery: 0, returnedPerQuery: 0, stoppedEarlyShare: 0 };
/** Half-plane counts, filled by the stage that builds them. */
const counting = { calls: 0, lines: 0, nulls: 0 };

/** One round: each stage over every active body, in the tick's own order. */
function runRound(): Stage[] {
  const stages: Stage[] = [];
  let sink = 0;

  // 1. The neighbour query alone, at every active body's own position.
  counters.queries = 0; counters.cellsVisited = 0; counters.bodiesVisited = 0; counters.inRadius = 0; counters.atCap = 0; counters.stoppedEarly = 0;
  stages.push(stage("neighbourQuery", () => {
    for (let index = 0; index < active.length; index += 1) {
      const agent = agents[active[index]!]!;
      sink += grid.neighbours(agent.x, agent.z, radius, limit, neighbourOut);
    }
  }));
  walk.queries = counters.queries;
  walk.cellsVisitedPerQuery = round(counters.cellsVisited / Math.max(1, counters.queries));
  walk.bodiesVisitedPerQuery = round(counters.bodiesVisited / Math.max(1, counters.queries));
  walk.returnedPerQuery = round(counters.inRadius / Math.max(1, counters.queries));
  walk.stoppedEarlyShare = round(counters.stoppedEarly / Math.max(1, counters.queries));

  // 2. Half-plane construction alone, on the neighbours the query above returned.
  const lines: Line[] = [];
  stages.push(stage("halfPlanes", () => {
    for (let index = 0; index < active.length; index += 1) {
      const self = active[index]!;
      const agent = agents[self]!;
      const count = grid.neighbours(agent.x, agent.z, radius, limit, neighbourOut);
      for (let i = 0; i < count; i += 1) {
        const other = neighbourOut[i]!;
        if (other === self) continue;
        const line = orcaHalfPlane(agent, agents[other]!, horizon);
        if (line.pointX !== 0 || line.pointZ !== 0) lines.push(line);
        sink += line.w;
      }
      lines.length = 0;
    }
  }));

  // 3. The whole solver, on the real crowd, exactly as the tick calls it — the
  // crowd's own scratch, so the line array is the one the tick allocates into.
  stages.push(stage("orcaVelocity", () => {
    for (let index = 0; index < active.length; index += 1) {
      const self = active[index]!;
      const heading = yaw[self]!;
      const solved = orcaVelocity(grid, agents, self, Math.sin(heading) * 1.1, Math.cos(heading) * 1.1, crowd.scratch);
      sink += solved.x;
    }
  }));

  // 4. The query and the half-planes together, with the counts the profile cannot
  // give: how many half-planes one body's solve actually builds.
  counting.calls = 0; counting.lines = 0; counting.nulls = 0;
  stages.push(stage("queryPlusHalfPlanes", () => {
    for (let index = 0; index < active.length; index += 1) {
      const self = active[index]!;
      const agent = agents[self]!;
      const count = grid.neighbours(agent.x, agent.z, radius, limit, neighbourOut);
      counting.calls += 1;
      for (let i = 0; i < count; i += 1) {
        const other = neighbourOut[i]!;
        if (other === self) continue;
        counting.lines += 1;
        const line = orcaHalfPlane(agent, agents[other]!, horizon);
        if (line.pointX === 0 && line.pointZ === 0) counting.nulls += 1;
        sink += line.w;
      }
    }
  }));
  void sink;
  return stages;
}

// Warm up on the same shapes, then take `rounds` measured rounds.
runRound();
const roundsOut: Stage[][] = [];
for (let index = 0; index < rounds; index += 1) roundsOut.push(runRound());

const names = roundsOut[0]!.map((entry) => entry.name);
const summary = Object.fromEntries(names.map((name, at) => {
  const values = roundsOut.map((roundStages) => roundStages[at]!.milliseconds);
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  // The minimum is the reading to compare arms on when the machine is shared: it is the
  // round that met the least contention, and load can only ever add time to a round.
  const least = sorted[0]!;
  return [name, {
    medianMs: round(median),
    minMs: round(least),
    minPerBodyMicros: round((least * 1000) / active.length),
    allMs: values.map(round),
    perBodyMicros: round((median * 1000) / active.length),
  }];
}));

process.stdout.write(`${JSON.stringify({
  tool: "tools/frame-budget/avoid-cost.ts",
  bound: {
    pedestrians, vehicles, settleTicks: settle, rounds, seed,
    activeBodies: active.length,
    positions: "the real crowd's own pose buffers after the settle ticks; the stage isolation and the order are this tool's",
  },
  machine: { cpu: [...new Set(os.cpus().map((cpu) => cpu.model))].join(", "), node: process.version },
  neighbourWalk: walk,
  halfPlaneCounts: { calls: counting.calls, halfPlanes: counting.lines, nulls: counting.nulls, perBody: round(counting.lines / Math.max(1, counting.calls)) },
  stages: summary,
}, null, 2)}\n`);
