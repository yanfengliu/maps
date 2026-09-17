/**
 * harness: the real `CellGrid`, the real delivered network's walking graph and the
 * real per-body radii, driven at the acceptance population's density. No browser,
 * no GPU, no tick.
 *
 * **Why it exists.** A CPU profile of the tick attributes 27% of sampled self time
 * to `CellGrid.neighbours`. That tells you where the time is spent and nothing
 * about why, and the two candidate causes have opposite fixes: the grid is walking
 * too many cells (a structure problem, fixed in `cell-grid.ts`), or each query is
 * genuinely looking at hundreds of bodies within its radius (a query-shape problem,
 * fixed by knowing what the radius has to be). This measures the counts that
 * separate them.
 *
 * The bound: bodies are placed along the delivered walking graph's own edge
 * geometry with the population's own radii and speeds, but their *positions over
 * time* are a synthetic sweep rather than the crowd's real trajectory. The counts
 * here are therefore a like-for-like estimate of what the tick's grid walks, not a
 * measurement of a simulated crowd; the tick's own phase cost is the measurement,
 * and this tool is what says which term inside it is worth attacking.
 *
 * RUN IT:
 *
 *   node tools/frame-budget/grid-walk.ts --bodies 3000 --queries 20000
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CellGrid, type GridCounters } from "../../src/agents/population/cell-grid.ts";
import { PEDESTRIAN_DYNAMICS } from "../../src/agents/population/config.ts";
import { createRng, DEFAULT_SEED } from "../../src/world/rng.ts";
import type { NetworkData } from "../../src/world/network-data.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function argument(name: string, fallback: number): number {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(process.argv[at + 1]);
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number after it; received ${process.argv[at + 1]}`);
  return value;
}

const bodies = argument("bodies", 3000);
const queries = argument("queries", 20000);
const seed = argument("seed", DEFAULT_SEED);

const networkPath = resolve(ROOT, "data/network/network.json");
if (!existsSync(networkPath)) {
  throw new Error(
    `The grid walk needs the delivered movement network at ${networkPath} and it is missing. ` +
      `Build it with npm run data:network; this tool measures the delivered inputs and will not substitute a fixture.`,
  );
}
const network = JSON.parse(readFileSync(networkPath, "utf8")) as NetworkData;

/** Every walking edge's sampled vertices, which is where a walker can actually stand. */
const walkPoints: { x: number; z: number }[] = [];
for (const walk of network.walks) {
  for (const point of walk.points) walkPoints.push({ x: point.x, z: point.z });
}
if (walkPoints.length < bodies) {
  throw new Error(`The delivered walking graph has ${walkPoints.length} sampled points, fewer than the ${bodies} bodies asked for, so some would be stacked and the density would be wrong.`);
}

const rng = createRng(seed);
const position = new Float32Array(bodies * 3);
const active = new Uint8Array(bodies).fill(1);
for (let slot = 0; slot < bodies; slot += 1) {
  // A point drawn from the delivered graph, plus a sub-metre jitter so the crowd
  // is not sitting exactly on the graph's own vertices.
  const at = walkPoints[Math.floor(rng() * walkPoints.length)]!;
  position[slot * 3] = at.x + (rng() - 0.5) * 2;
  position[slot * 3 + 1] = 0;
  position[slot * 3 + 2] = at.z + (rng() - 0.5) * 2;
}

const grid = new CellGrid({ cellSizeM: PEDESTRIAN_DYNAMICS.cellSizeM, halfExtentM: 520 });
const counters: GridCounters = { queries: 0, cellsVisited: 0, bodiesVisited: 0, inRadius: 0, atCap: 0, stoppedEarly: 0 };
(globalThis as { __DSH_GRID_COUNTS?: GridCounters }).__DSH_GRID_COUNTS = counters;

const rebuildBefore = performance.now();
grid.rebuild(position.length / 3, position, active);
const rebuildMs = performance.now() - rebuildBefore;

const out = new Int32Array(PEDESTRIAN_DYNAMICS.neighbours);
const radius = PEDESTRIAN_DYNAMICS.neighbourRadiusM;
const limit = PEDESTRIAN_DYNAMICS.neighbours;

// Warm up the JIT on the same shape the measurement uses, so the first queries'
// interpreter time is not reported as the cost.
for (let index = 0; index < 5000; index += 1) {
  const slot = index % bodies;
  grid.neighbours(position[slot * 3]!, position[slot * 3 + 2]!, radius, limit, out);
}
counters.queries = 0; counters.cellsVisited = 0; counters.bodiesVisited = 0; counters.inRadius = 0; counters.atCap = 0; counters.stoppedEarly = 0;

const samples: number[] = [];
const found: number[] = [];
const started = performance.now();
for (let index = 0; index < queries; index += 1) {
  const slot = (index * 7919) % bodies;
  const before = performance.now();
  const count = grid.neighbours(position[slot * 3]!, position[slot * 3 + 2]!, radius, limit, out);
  samples.push(performance.now() - before);
  found.push(count);
}
const elapsedMs = performance.now() - started;

const rounded = (value: number): number => Math.round(value * 1000) / 1000;
samples.sort((a, b) => a - b);
found.sort((a, b) => a - b);
const at = (values: readonly number[], fraction: number): number =>
  values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1))]!;

const result = {
  tool: "tools/frame-budget/grid-walk.ts",
  bound: {
    bodies, queries, seed, radiusM: radius, neighbourLimit: limit, cellSizeM: PEDESTRIAN_DYNAMICS.cellSizeM,
    positions: "drawn from the delivered walking graph's own sampled vertices with sub-metre jitter; a synthetic static placement, not a simulated crowd",
  },
  machine: { cpu: [...new Set(os.cpus().map((cpu) => cpu.model))].join(", "), node: process.version },
  rebuild: { milliseconds: rounded(rebuildMs), occupiedCells: grid.occupiedCells, gridCells: grid.gridCells, live: grid.size },
  walkPerQuery: {
    cellsVisited: rounded(counters.cellsVisited / queries),
    bodiesVisited: rounded(counters.bodiesVisited / queries),
    inRadius: rounded(counters.inRadius / queries),
    atCap: rounded(counters.atCap / queries),
    stoppedEarlyShare: rounded(counters.stoppedEarly / queries),
    returned: rounded(found.reduce((sum, value) => sum + value, 0) / found.length),
    returnedMedian: at(found, 0.5),
  },
  milliseconds: {
    total: rounded(elapsedMs),
    perQueryP50: rounded(at(samples, 0.5)),
    perQueryP95: rounded(at(samples, 0.95)),
    perQueryMean: rounded(elapsedMs / queries),
    /** What one tick costs if every active body runs exactly one query. */
    perTickAtThisPopulation: rounded((elapsedMs / queries) * bodies),
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
