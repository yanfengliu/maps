/**
 * harness: the delivered network, the real `createPopulation` module and the real
 * fixed step. No browser, no GPU, no RNG beyond the population's own.
 *
 * What routes the population actually assigned, as opposed to what the planner can
 * plan: `RouteLibrary.planFrom` says a crossing route exists for a portal, and
 * this says how many of the 3,000 walking slots are driving one. It is the check
 * between "the shape is reachable" and "the crowd is on it", and it needs only as
 * many ticks as the spawn schedule takes to plan every slot.
 *
 * Bound: one seed, one pair of counts, one tick window. It reports plans, never
 * bodies: nothing here says a walker walked its route, and nothing here is a pixel.
 *
 * RUN IT:
 *
 *   node tools/agents/population-route-mix.ts --pedestrians 3000 --ticks 6000 --json <path>
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

const pedestrians = argument("pedestrians", 3000);
const vehicles = argument("vehicles", 200);
const ticks = argument("ticks", 6000);
const seed = argument("seed", 0x5b1b0a);
const jsonPath = flag("json");

function readRequired<T>(path: string, label: string): T {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) throw new Error(`Population route mix needs ${label} at ${full} and it is missing; build it with the repository's own data commands.`);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

const network = readRequired<NetworkData>("data/network/network.json", "the delivered movement network");
const fleet = readRequired<VehicleAssetManifest>("data/scene/agents/vehicles.json", "the delivered vehicle manifest");
const byId = new Map(network.walks.map((walk) => [walk.id, walk]));
/**
 * The authored diagonal, by the id the network gives it.
 *
 * The predicate is local on purpose. This tool has to run against both arms of an
 * A/B, and the before arm is a tree in which the graph module exports no diagonal
 * helper at all, so importing one makes the before arm fail to load rather than
 * measure. A local predicate also cannot silently change meaning between the two
 * arms, which is the one thing an A/B instrument must not do.
 */
const DIAGONAL_PREFIX = "walk:authored:scramble-diagonal:";
const isDiagonal = (edge: WalkEdge | undefined): boolean => edge !== undefined && edge.id.startsWith(DIAGONAL_PREFIX);
/** Half the diagonal's own length: the bar for crossing it rather than touching it. */
const DIAGONAL_HALF_M = 24.53;
const settings = populationSettings({ pedestrians, vehicles, seed, spawnIntervalTicks: 1 });
const population = createPopulation({ network, fleet: fleet, admissions: new JunctionAdmissions(network), settings });

const loop = new RenderLoop({ render: () => {} });
const unregister = loop.onFixedStep((step, simulatedSeconds) => population.update(step, simulatedSeconds));
void 0;
for (let tick = 1; tick <= ticks; tick += 1) loop.advance(tick * STEP * 1000 + 0.001);
unregister();
loop.stop();

const portalCounts = new Map<string, { planned: number; crossing: number }>();
let planned = 0;
let crossing = 0;
const crossingLengths: number[] = [];
const allLengths: number[] = [];
for (let slot = 0; slot < pedestrians; slot += 1) {
  const route = population.pedestrianRoute(slot);
  if (!route) continue;
  planned += 1;
  allLengths.push(route.totalLengthM);
  const diagonalM = route.edgeIds.reduce((sum, id) => sum + (isDiagonal(byId.get(id)) ? byId.get(id)!.lengthM : 0), 0);
  const isCrossing = diagonalM >= DIAGONAL_HALF_M;
  if (isCrossing) {
    crossing += 1;
    crossingLengths.push(route.totalLengthM);
  }
  const entry = portalCounts.get(route.entryEdgeId) ?? { planned: 0, crossing: 0 };
  entry.planned += 1;
  if (isCrossing) entry.crossing += 1;
  portalCounts.set(route.entryEdgeId, entry);
}

const sortedCrossing = [...crossingLengths].sort((a, b) => a - b);
const report = {
  tool: "tools/agents/population-route-mix.ts",
  // Which tree the loader resolved, asserted and not assumed. Both entries are
  // needed: the tool's own path says which copy of this file ran, and the module
  // path says which population it measured. Invoking another worktree's copy of
  // this tool loads THAT tree's `src/`, so a tool path of A with a module of B is
  // a measurement of B reported as A, which is how a before/after pair can come
  // back identical while the trees differ.
  loaded: {
    toolFile: fileURLToPath(import.meta.url),
    populationModule: import.meta.resolve("../../src/agents/population/tick.ts"),
    routesModule: import.meta.resolve("../../src/agents/population/routes.ts"),
  },
  bound: { pedestrians, vehicles, ticks, seed, diagonalIdPrefix: "walk:authored:scramble-diagonal:" },
  status: { active: population.status().pedestrians.active, lifecycle: population.status().lifecycle, refusedRoutes: population.status().refusedRoutes },
  mix: {
    slotsHoldingARoute: planned,
    slotsDrivingACrossingRoute: crossing,
    shareDrivingACrossingRoute: Number((crossing / Math.max(1, planned)).toFixed(4)),
    crossingRouteLengthM: sortedCrossing.length ? { min: Number(sortedCrossing[0]!.toFixed(1)), median: Number(sortedCrossing[sortedCrossing.length >> 1]!.toFixed(1)), max: Number(sortedCrossing.at(-1)!.toFixed(1)) } : null,
    allRouteLengthM: allLengths.length ? { min: Number(Math.min(...allLengths).toFixed(1)), median: Number([...allLengths].sort((a, b) => a - b)[allLengths.length >> 1]!.toFixed(1)), max: Number(Math.max(...allLengths).toFixed(1)) } : null,
  },
  portals: [...portalCounts].map(([portal, counts]) => ({ portal, ...counts })).sort((a, b) => b.planned - a.planned),
};

if (jsonPath) writeFileSync(resolve(ROOT, jsonPath), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
