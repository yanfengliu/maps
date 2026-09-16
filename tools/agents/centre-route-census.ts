/**
 * harness: the delivered `data/network/network.json` and the successor relation
 * the shipped planner walks, `nextIds` as `src/agents/population/graph.ts` reads
 * it. No browser, no simulation and no RNG.
 *
 * This is the instrument `src/agents/population/tick.ts:403` cites, and it
 * answers the one question the centre-route shape depends on: how many metres of
 * *legal directed walking* separate each of the 33 delivered pedestrian entry
 * portals from the central crossings, how many metres to a section a route may
 * legally terminate on, and how many weakly connected components the delivered
 * walking graph has.
 *
 * Bound: one network snapshot (sha256 printed below), one process, no simulation
 * and no RNG. Distances are sums of the delivered edges' own `lengthM` over the
 * real `nextIds` successor relation, which is the planner's own metric. Nothing
 * here is simulated, so a distance here is a lower bound on what the planner can
 * build and never a measurement of a body's behaviour. It says nothing about
 * admission, about what any body does, or about the two length caps other than
 * counting portals under the 700 m threshold.
 *
 * RUN IT:
 *
 *   node tools/agents/centre-route-census.ts [--radius 60] [--json <path>]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { NetworkData, WalkEdge } from "../../src/world/network-data.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function flag(name: string): string | null {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return null;
  const value = process.argv[at + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`--${name} needs a value after it.`);
  return value;
}

const centralRadiusM = Number(flag("radius") ?? 60);
const jsonPath = flag("json");

const networkPath = resolve(ROOT, "data/network/network.json");
if (!existsSync(networkPath)) {
  throw new Error(`Centre-route census needs the delivered movement network at ${networkPath} and it is missing. Build it with npm run data:network; this tool measures the delivered input and will not substitute a fixture.`);
}
const bytes = readFileSync(networkPath);
const network = JSON.parse(bytes.toString("utf8")) as NetworkData;
const inputSha256 = createHash("sha256").update(bytes).digest("hex");

const walks = network.walks;
const byId = new Map<string, WalkEdge>(walks.map((edge) => [edge.id, edge]));
const portals = network.portals.pedestrian;

/** The closest sampled point of an edge to the world origin. */
function nearestToOrigin(edge: WalkEdge): number {
  let best = Number.POSITIVE_INFINITY;
  for (const point of edge.points) best = Math.min(best, Math.hypot(point.x, point.z));
  return best;
}

const centralEdges = walks.filter((edge) => nearestToOrigin(edge) <= centralRadiusM);
const centralCrossings = centralEdges.filter((edge) => edge.kind === "crossing");
const centralSet = new Set(centralEdges.map((edge) => edge.id));
const centralCrossingSet = new Set(centralCrossings.map((edge) => edge.id));

/**
 * Dijkstra from a set of targets over the *reversed* successor relation, so one
 * sweep gives every edge's shortest directed distance TO the target set. Costs are
 * the edges' own `lengthM`, which is the planner's metric.
 */
function shortestToTargets(targets: ReadonlySet<string>): Map<string, number> {
  const predecessors = new Map<string, string[]>();
  for (const edge of walks) {
    for (const next of edge.nextIds) {
      if (!byId.has(next)) throw new Error(`Edge ${edge.id} points at missing successor ${next}; rebuild the movement network.`);
      const list = predecessors.get(next) ?? [];
      list.push(edge.id);
      predecessors.set(next, list);
    }
  }
  const distance = new Map<string, number>();
  // A simple binary heap keyed on distance; the graph is 1,740 edges.
  const heap: { id: string; d: number }[] = [];
  const push = (id: string, d: number): void => {
    heap.push({ id, d });
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heap[parent]!.d <= heap[index]!.d) break;
      [heap[parent], heap[index]] = [heap[index]!, heap[parent]!];
      index = parent;
    }
  };
  const pop = (): { id: string; d: number } | undefined => {
    if (!heap.length) return undefined;
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < heap.length && heap[left]!.d < heap[smallest]!.d) smallest = left;
        if (right < heap.length && heap[right]!.d < heap[smallest]!.d) smallest = right;
        if (smallest === index) break;
        [heap[smallest], heap[index]] = [heap[index]!, heap[smallest]!];
        index = smallest;
      }
    }
    return top;
  };
  for (const id of targets) {
    if (!byId.has(id)) continue;
    distance.set(id, 0);
    push(id, 0);
  }
  while (heap.length) {
    const current = pop()!;
    if (current.d > (distance.get(current.id) ?? Number.POSITIVE_INFINITY)) continue;
    for (const previous of predecessors.get(current.id) ?? []) {
      const candidate = current.d + byId.get(previous)!.lengthM;
      if (candidate < (distance.get(previous) ?? Number.POSITIVE_INFINITY) - 1e-9) {
        distance.set(previous, candidate);
        push(previous, candidate);
      }
    }
  }
  return distance;
}

const toCentralCrossing = shortestToTargets(centralCrossingSet);
const toCentralAny = shortestToTargets(centralSet);

/**
 * The edges a route may legally terminate on and still satisfy the contract's
 * passage rule: the last passage's `lastConflictIndex` must be the route's own
 * last section, i.e. no governed section may follow it, OR the terminus is a true
 * AOI portal. An ungoverned edge (`junctionId === null`) satisfies the first
 * reading directly: a passage ends there with nothing governed after it.
 */
const ungovernedCentral = centralEdges.filter((edge) => edge.junctionId === null);
const ungovernedCentralSet = new Set(ungovernedCentral.map((edge) => edge.id));
const toCentralUngoverned = shortestToTargets(ungovernedCentralSet);

/**
 * Weakly connected components over the delivered successor relation, which is the
 * component count `src/agents/population/tick.ts:401` cites. Directed links are
 * unioned as undirected ones, so a component is a set of walking edges joined by
 * some directed path in either direction. Every delivered walking edge is in
 * exactly one, portal or not.
 */
function weakComponents(): { successorLinks: number; dangling: number; components: number; portalComponents: number } {
  const parent = new Map<string, string>(walks.map((edge) => [edge.id, edge.id]));
  const find = (start: string): string => {
    let root = start;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let step = start;
    while (parent.get(step) !== root) {
      const next = parent.get(step)!;
      parent.set(step, root);
      step = next;
    }
    return root;
  };
  let successorLinks = 0;
  let dangling = 0;
  for (const edge of walks) {
    for (const next of edge.nextIds) {
      successorLinks += 1;
      if (!parent.has(next)) {
        dangling += 1;
        continue;
      }
      const from = find(edge.id);
      const to = find(next);
      if (from !== to) parent.set(from, to);
    }
  }
  const roots = new Set<string>();
  for (const edge of walks) roots.add(find(edge.id));
  const portalRoots = new Set<string>();
  for (const portal of portals) {
    if (!parent.has(portal)) throw new Error(`Pedestrian portal ${portal} is not a walking edge of the delivered network.`);
    portalRoots.add(find(portal));
  }
  return { successorLinks, dangling, components: roots.size, portalComponents: portalRoots.size };
}

const graph = weakComponents();

const rows = [...portals].sort().map((id) => {
  const edge = byId.get(id);
  if (!edge) throw new Error(`Pedestrian portal ${id} is not a walking edge of the delivered network.`);
  return {
    portal: id,
    lengthM: Number(edge.lengthM.toFixed(3)),
    nearestToOriginM: Number(nearestToOrigin(edge).toFixed(3)),
    toNearestCentralCrossingM: toCentralCrossing.has(id) ? Number(toCentralCrossing.get(id)!.toFixed(3)) : null,
    toNearestCentralEdgeM: toCentralAny.has(id) ? Number(toCentralAny.get(id)!.toFixed(3)) : null,
    toNearestUngovernedCentralEdgeM: toCentralUngoverned.has(id) ? Number(toCentralUngoverned.get(id)!.toFixed(3)) : null,
  };
});

const reachableCrossing = rows.filter((row) => row.toNearestCentralCrossingM !== null);
const reachableUngoverned = rows.filter((row) => row.toNearestUngovernedCentralEdgeM !== null);
const crossingDistances = reachableCrossing.map((row) => row.toNearestCentralCrossingM!).sort((a, b) => a - b);
const ungovernedDistances = reachableUngoverned.map((row) => row.toNearestUngovernedCentralEdgeM!).sort((a, b) => a - b);

// The two caps are `src/agents/population/routes.ts`'s own, named rather than
// restated as one number: `MAXIMUM_ROUTE_LENGTH_M` = 700 m bounds the
// portal-to-exit shape only (`routes.ts:74`, used at `:375`), and the centre shape
// is bounded by `MAXIMUM_CENTRE_ROUTE_LENGTH_M` = 1,000 m (`routes.ts:88`, used at
// `:337`). The `…Within700m…` counts below are measurements against the 700 m
// threshold; they are not a claim that 700 m admits a centre route, and the
// planner's own centre routes run 513.4 m to 936.5 m (`routes.ts:83-86`).
const report = {
  tool: "tools/agents/centre-route-census.ts",
  method: {
    metric: "sum of the delivered walking edges' own lengthM along the real directed nextIds relation, Dijkstra from the target set over the reversed successor graph",
    centralRadiusM,
    targetCentralCrossing: `${centralCrossings.length} walking crossing edges whose closest sampled point is within ${centralRadiusM} m of the world origin`,
    targetCentralUngoverned: `${ungovernedCentral.length} ungoverned (junctionId null) walking edges within ${centralRadiusM} m of the world origin, which is where a route may terminate under the contract's passage rule`,
    routeLengthCapsM: { exitShapeMaximum: 700, centreShapeMaximum: 1_000 },
  },
  input: { path: "data/network/network.json", sha256: inputSha256, walks: walks.length, pedestrianPortals: portals.length },
  graph: {
    ...graph,
    componentDefinition: "weakly connected components over the delivered nextIds relation, every delivered walking edge included",
  },
  summary: {
    portals: rows.length,
    portalsThatReachACentralCrossing: reachableCrossing.length,
    portalsThatReachAnUngovernedCentralEdge: reachableUngoverned.length,
    centralCrossingDistanceM: crossingDistances.length
      ? { min: crossingDistances[0]!, median: crossingDistances[Math.floor(crossingDistances.length / 2)]!, max: crossingDistances.at(-1)! }
      : null,
    ungovernedCentralDistanceM: ungovernedDistances.length
      ? { min: ungovernedDistances[0]!, median: ungovernedDistances[Math.floor(ungovernedDistances.length / 2)]!, max: ungovernedDistances.at(-1)! }
      : null,
    portalsWithin700mOfACentralCrossing: crossingDistances.filter((d) => d <= 700).length,
    portalsWithin700mOfAnUngovernedCentralEdge: ungovernedDistances.filter((d) => d <= 700).length,
  },
  centralEdges: centralEdges
    .map((edge) => ({ id: edge.id, kind: edge.kind, junctionId: edge.junctionId, lengthM: Number(edge.lengthM.toFixed(3)), nearestToOriginM: Number(nearestToOrigin(edge).toFixed(3)) }))
    .sort((a, b) => a.nearestToOriginM - b.nearestToOriginM),
  rows,
};

if (jsonPath) writeFileSync(resolve(ROOT, jsonPath), JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify({ method: report.method, input: report.input, graph: report.graph, summary: report.summary }, null, 2)}\n`);
process.stdout.write("\nper-portal metres of directed walking:\n");
for (const row of rows) {
  process.stdout.write(`  ${row.portal.padEnd(38)} crossing ${String(row.toNearestCentralCrossingM ?? "-").padStart(9)}  ungoverned ${String(row.toNearestUngovernedCentralEdgeM ?? "-").padStart(9)}  portalLinear ${row.nearestToOriginM}\n`);
}
