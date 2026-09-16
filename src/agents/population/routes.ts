/**
 * Deterministic route planning over the frozen graph, and the per-passage gate
 * arithmetic every consumer needs.
 *
 * A route is the complete directed edge list from a real entry portal to a true
 * exit *inside one component*, together with the ordered `RoutePassage` objects
 * through which an actor acquires admission. Two structural facts drive the
 * shape of this module:
 *
 *  - The network exposes 21 vehicle and 39 walking components, so a route that
 *    cannot reach an exit inside its component is not a route. The planner walks
 *    the reversed-exit-distance field, so every step strictly decreases the
 *    remaining distance to a true exit; it can never strand an actor in a
 *    component with no way out, and it never plans through the 47.196 m of
 *    walking path the source lost in the southeast.
 *  - A route crosses several conflict authorities. `RoutePassage` is a single
 *    compound's commitment, so a route is planned as consecutive passages. Each
 *    passage's entry occurrence is the run of consecutive same-authority edges
 *    the contract's own last-conflict rule names, and any passage the real
 *    `createRoutePassage` factory refuses rejects the whole route rather than
 *    being dropped silently.
 *
 * Route choice draws from a per-actor stream derived from the scene seed, the
 * slot index and the generation, so a respawn in one slot cannot shift any other
 * slot's sequence. No code path here calls `Math.random`.
 */

import { sampleEdge, headingAt } from "../../network/geometry.ts";
import { createRoutePassage, type RouteControl, type RoutePassage } from "../../network/passages.ts";
import type { ActorKind } from "../../network/passages.ts";
import type { NetworkData, NetworkEdge } from "../../world/network-data.ts";
import { PEDESTRIAN_CADENCE_MPS, VEHICLE_DYNAMICS } from "./config.ts";
import { MovementGraph } from "./graph.ts";
import type { RefusalCounts } from "./status.ts";

/**
 * The shortest route a slot will accept, in sections. Below this the population
 * walks portal-to-reverse-edge trips of a few metres and never reaches a
 * crossing, which is the one thing the walking population exists to show.
 */
export const MINIMUM_ROUTE_EDGES = 18;

/**
 * How often a walk takes a step that reduces its remaining distance to an exit,
 * when such a step exists. At 1 the walk is the shortest path and a route is
 * never longer than the portal's own distance-to-exit; at 0 it is an unbiased
 * random walk that wanders the component until its edge budget runs out. The
 * value is a route-variety knob, not an admission setting, and it does not
 * change which routes are legal.
 */
export const REDUCING_PREFERENCE = 0.45;

/** A route longer than this buys nothing and costs minutes of walking. */
export const MAXIMUM_ROUTE_LENGTH_M = 700;

/** One governed occurrence of a route: the gate, and where a body must stop for it. */
export interface RouteGate {
  readonly passageIndex: number;
  readonly entryIndex: number;
  readonly entryEdgeId: string;
  readonly junctionId: string;
  /** Route-absolute metres of the gate itself. */
  readonly gateDistanceM: number;
  /** Route-absolute metres an uncommitted body halts at: gate minus its footprint radius. */
  readonly holdDistanceM: number;
  /**
   * The passage's own occurrence starts, in route-absolute metres. A mapped
   * control's true position is `passageStarts[control.routeIndex] +
   * control.distanceM`, which is the authority's arithmetic rather than the
   * gate's start plus an offset.
   */
  readonly passageStarts: readonly number[];
  /** Mapped stop/yield obligations of this passage, which also pull the halt earlier. */
  readonly controls: readonly RouteControl[];
}

export interface PlannedRoute {
  readonly entryEdgeId: string;
  readonly edgeIds: readonly string[];
  readonly edges: readonly NetworkEdge[];
  readonly passages: readonly RoutePassage[];
  readonly gates: readonly RouteGate[];
  readonly totalLengthM: number;
  /** Route-absolute metres where each occurrence starts; `starts[i]` for occurrence `i`. */
  readonly starts: readonly number[];
  /** Per-edge speed limit; walking edges carry the cadence instead. */
  readonly speedLimits: readonly number[];
}

export interface RouteRequest {
  /** Collision radius used to pull the halt short of a gate. */
  readonly footprintRadiusM: number;
  readonly maxEdges: number;
  /** Distinct walks attempted before a portal is reported as unreachable. */
  readonly walkAttempts?: number;
  /**
   * Which edges this body may *halt* on. A vehicle whose body is longer than a
   * junction's entry section cannot stand still on the approach before that
   * gate, so a walk through that section is not a route for it Ã¢â‚¬â€ the planner
   * routes around it instead of driving it wrongly.
   */
  readonly viable?: (edgeId: string) => boolean;
}

export interface RouteAttempt {
  readonly route: PlannedRoute | null;
  /** Named, stable reason text when no route exists. */
  readonly reason?: string;
}

function actorSeed(sceneSeed: number, kind: ActorKind, slot: number, generation: number): number {
  let state = (sceneSeed ^ 0x9e3779b9) >>> 0;
  const mix = (value: number): void => {
    state = (state ^ (value + 0x9e3779b9 + (state << 6) + (state >>> 2))) >>> 0;
    state = Math.imul(state ^ (state >>> 15), 0x85ebca6b) >>> 0;
    state = (state ^ (state >>> 13)) >>> 0;
  };
  mix(kind === "vehicle" ? 0x56_48 : 0x50_45);
  mix(slot >>> 0);
  mix(generation >>> 0);
  return state >>> 0;
}

export class RouteLibrary {
  readonly vehicleGraph: MovementGraph;
  readonly pedestrianGraph: MovementGraph;
  private readonly network: NetworkData;
  private readonly refusals: RefusalCounts;
  private readonly caches = new Map<string, PlannedRoute>();
  refused = 0;

  constructor(network: NetworkData, refusals: RefusalCounts) {
    this.network = network;
    this.refusals = refusals;
    this.vehicleGraph = new MovementGraph(network, "vehicle");
    this.pedestrianGraph = new MovementGraph(network, "pedestrian");
  }

  invalidate(): void {
    this.caches.clear();
  }

  /** Build (or reuse) the route one slot drives. */
  route(kind: ActorKind, slot: number, generation: number, entryEdgeId: string, request: RouteRequest): PlannedRoute | null {
    const cached = this.caches.get(entryEdgeId);
    if (cached) return cached;
    const graph = kind === "vehicle" ? this.vehicleGraph : this.pedestrianGraph;
    const built = this.plan(graph, kind, entryEdgeId, actorSeed(0, kind, slot, generation), request);
    // Only a route with no gate-length constraint is reusable across body sizes;
    // a constrained walk depends on the radius it was planned for.
    if (built.route && !request.viable) this.caches.set(entryEdgeId, built.route);
    return built.route;
  }

  /**
   * Plan a route without a slot: the shape an offline census or a test wants.
   * `streamSeed` is the whole RNG seed, not the per-actor mix.
   */
  planFrom(graph: MovementGraph, kind: ActorKind, entryEdgeId: string, streamSeed: number, request: RouteRequest): RouteAttempt {
    return this.plan(graph, kind, entryEdgeId, streamSeed, request);
  }

  /**
   * The portals from which a body of this size can actually reach a true exit.
   * Exported because the population has to know which portals it may draw from
   * rather than discovering it one refused spawn at a time.
   */
  drivablePortals(graph: MovementGraph, portals: readonly string[], request: RouteRequest, attempts = 3): string[] {
    const seed = (index: number): number => (0x51ed270b ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    const drivable: string[] = [];
    for (const [index, portal] of [...portals].sort().entries()) {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const walk = this.walk(graph, portal, createStream(seed(index) + attempt), request.maxEdges, request.viable);
        if (walk) {
          drivable.push(portal);
          break;
        }
      }
    }
    return drivable;
  }

  private plan(graph: MovementGraph, kind: ActorKind, entryEdgeId: string, streamSeed: number, request: RouteRequest): RouteAttempt {
    const entry = graph.edges.get(entryEdgeId);
    if (!entry) return { route: null, reason: `entry portal ${entryEdgeId} is not an edge of the ${kind} graph` };
    if (!(request.footprintRadiusM > 0) || !Number.isInteger(request.maxEdges) || request.maxEdges < 1) {
      throw new Error(`Route planning for ${kind}s needs a positive footprint radius and a positive integer edge budget; received ${request.footprintRadiusM}/${request.maxEdges}.`);
    }
    // A walk that reaches an exit can still be undrivable for this body size, so
    // a refused walk is retried with the next draw from the same stream. The
    // attempt count is part of the plan's own determinism, not a search loop.
    const attempts = Math.max(1, request.walkAttempts ?? 3);
    const rng = createStream(streamSeed);
    let reason: string | undefined;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const walk = this.walk(graph, entryEdgeId, rng, request.maxEdges, request.viable);
      if (!walk) {
        reason = `${kind} route from ${entryEdgeId} reaches no true AOI exit inside its component within ${request.maxEdges} sections${request.viable ? " that this body can halt on" : ""}`;
        break;
      }
      const built = this.assemble(graph, kind, walk, request.footprintRadiusM);
      if (built.route) return built;
      reason = built.reason;
    }
    this.refusals.add(reason ?? `${kind} route from ${entryEdgeId} was refused by the real passage builder`);
    this.refused += 1;
    return { route: null, ...(reason === undefined ? {} : { reason }) };
  }

  /** A random walk that ends at a real way out of the AOI. */
  /** A random walk that ends at a real way out of the AOI. */
  private walk(graph: MovementGraph, entryEdgeId: string, rng: () => number, maxEdges: number, viable?: (edgeId: string) => boolean): string[] | null {
    const path = [entryEdgeId];
    const seen = new Set<string>([entryEdgeId]);
    const routeFloor = Math.min(maxEdges, MINIMUM_ROUTE_EDGES);
    // Phase one walks to the nearest crossing, phase two to a true exit. Every
    // exit of a one-kilometre AOI sits on its perimeter, so a walk that only ever
    // reduces its distance to an exit hugs the boundary and reaches the scramble
    // almost never; routing through a crossing first is what makes a walking
    // route cross a junction at all.
    let phase: "crossing" | "exit" = graph.distanceToCrossing(entryEdgeId) === undefined ? "exit" : "crossing";
    const distanceOf = (id: string): number | undefined => (phase === "crossing" ? graph.distanceToCrossing(id) : graph.distanceToExit(id));
    let remaining = distanceOf(entryEdgeId);
    let walkedM = graph.edge(entryEdgeId).lengthM;
    while (path.length <= maxEdges) {
      const head = path.at(-1)!;
      if (walkedM > MAXIMUM_ROUTE_LENGTH_M) return null;
      if (phase === "crossing" && graph.distanceToCrossing(head) === 0) {
        phase = "exit";
        remaining = graph.distanceToExit(head);
      }
      if (phase === "exit" && path.length > 1 && graph.isExit(head) && path.length >= routeFloor) return path;
      if (remaining === undefined) return null;
      const candidates = graph.next(head).filter((id) => !seen.has(id) && (viable === undefined || viable(id)));
      if (!candidates.length) return path.length > 1 && graph.isExit(head) ? path : null;
      // A random walk whose steps TEND towards the phase's target without being
      // forced to take the shortest path. A monotone walk cannot produce a route
      // longer than the target's own distance field, because that field IS the
      // shortest distance, so most portals would give three-edge trips.
      const reducing = candidates.filter((id) => {
        const next = distanceOf(id);
        return next !== undefined && (remaining === undefined || next < remaining);
      });
      const pool = reducing.length && rng() < REDUCING_PREFERENCE ? reducing : candidates;
      const chosen = [...pool].sort()[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
      path.push(chosen);
      seen.add(chosen);
      walkedM += graph.edge(chosen).lengthM;
      remaining = distanceOf(chosen);
    }
    return null;
  }

  private assemble(graph: MovementGraph, kind: ActorKind, edgeIds: readonly string[], footprintRadiusM: number): RouteAttempt {
    const edges = edgeIds.map((id) => graph.edge(id));
    const starts: number[] = [];
    let total = 0;
    for (const edge of edges) {
      starts.push(total);
      total += edge.lengthM;
    }
    const passages: RoutePassage[] = [];
    const gates: RouteGate[] = [];
    // One passage per governed section, not one per run of same-authority
    // sections. A run's passage spans several occurrences, and the occurrence a
    // body reports is then a compromise: the release test wants the true one
    // while the request window wants the last one the run owns, and one number
    // cannot be both. A single-occurrence passage makes the request window and
    // the body's position the same thing, so a body asks, is observed and is
    // released one occurrence at a time.
    //
    // The factory is called once per distinct occurrence and cached: it validates
    // the whole route on every call, and every actor driving this plan must hold
    // the same object, which is what makes the passage bookkeeping an identity.
    const cachedPassages = new Map<number, RoutePassage | string>();
    const passageAt = (index: number): RoutePassage | string => {
      const hit = cachedPassages.get(index);
      if (hit !== undefined) return hit;
      let value: RoutePassage | string;
      try {
        value = createRoutePassage(this.network, kind, edgeIds, index);
      } catch (error) {
        value = `route from ${edgeIds[0]} is not drivable: the real passage builder refuses the ${edges[index]!.junctionId} occurrence at section ${index} (${(error as Error).message.split(";")[0]})`;
      }
      cachedPassages.set(index, value);
      return value;
    };
    for (let index = 0; index < edges.length; index += 1) {
      const junctionId = edges[index]!.junctionId;
      if (!junctionId) continue;
      const passage = passageAt(index);
      if (typeof passage === "string") return { route: null, reason: passage };
      const entryEdge = edges[index]!;
      const gateDistanceM = starts[index]!;
      const controls = passage.controls.filter((control) => control.routeIndex === index);
      let holdDistanceM = gateDistanceM - footprintRadiusM;
      for (const control of controls) {
        holdDistanceM = Math.min(holdDistanceM, gateDistanceM + control.distanceM - footprintRadiusM);
      }
      if (!(holdDistanceM >= -1e-9)) {
        return {
          route: null,
          reason: `route from ${edgeIds[0]} is not drivable for a ${footprintRadiusM.toFixed(3)} m body: the ${junctionId} gate sits ${gateDistanceM.toFixed(3)} m into the route and its earliest obligation at ${holdDistanceM.toFixed(3)} m leaves no legal halt`,
        };
      }
      const clampedHold = Math.max(0, holdDistanceM);
      if (entryEdge.lengthM < footprintRadiusM - 1e-9) {
        // A body whose own radius is longer than the junction's entry section has
        // nowhere to stand on the approach: at its earliest legal halt its
        // collision centre would already be inside the junction, and a smaller
        // footprint is not an option Ã¢â‚¬â€ the dimensions come from the delivered
        // collision envelope and must not be trimmed to buy a route. The walk's
        // `viable` filter is the same rule applied while planning, so this is a
        // backstop rather than the mechanism that finds a drivable route.
        return {
          route: null,
          reason: `route from ${edgeIds[0]} is not drivable for a ${footprintRadiusM.toFixed(3)} m body: the ${junctionId} entry section ${entryEdge.id} is ${entryEdge.lengthM.toFixed(3)} m long, shorter than the body's own footprint radius, so it cannot halt outside that gate`,
        };
      }
      passages.push(passage);
      gates.push(Object.freeze({
        passageIndex: passages.length - 1,
        entryIndex: index,
        entryEdgeId: entryEdge.id,
        junctionId,
        gateDistanceM,
        holdDistanceM: clampedHold,
        passageStarts: passage.starts,
        controls: Object.freeze([...controls]),
      }));
    }
    const speedLimits = edges.map((edge) => (kind === "vehicle" ? graph.speedLimit(edge.id) : PEDESTRIAN_CADENCE_MPS));
    return {
      route: Object.freeze({
        entryEdgeId: edgeIds[0]!,
        edgeIds: Object.freeze([...edgeIds]),
        edges: Object.freeze(edges),
        passages: Object.freeze(passages),
        gates: Object.freeze(gates),
        totalLengthM: total,
        starts: Object.freeze(starts),
        speedLimits: Object.freeze(speedLimits),
      }),
    };
  }
}

/** A 32-bit stream for planning; the population's per-actor streams come from `actorSeed`. */
export function createStream(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The per-actor stream: scene seed plus slot plus generation, so respawns never share one. */
export function populationActorRng(sceneSeed: number, kind: ActorKind, slot: number, generation: number): () => number {
  return createStream(actorSeed(sceneSeed, kind, slot, generation));
}

export function vehicleSpeedFactor(rng: () => number): number {
  const { minimumSpeedFactor, maximumSpeedFactor } = VEHICLE_DYNAMICS.idm;
  return minimumSpeedFactor + rng() * (maximumSpeedFactor - minimumSpeedFactor);
}

export function vehicleScale(rng: () => number, asset?: { collision: { readonly length: number; readonly width: number }; bounds: { readonly min: readonly number[]; readonly max: readonly number[] } }): number {
  const scale = VEHICLE_DYNAMICS.minimumScale + rng() * (VEHICLE_DYNAMICS.maximumScale - VEHICLE_DYNAMICS.minimumScale);
  if (!asset) return scale;
  // The shared admission bound is on the actual supported 3D envelope, so a
  // class whose generated envelope already sits at the bound Ã¢â‚¬â€ the bus does Ã¢â‚¬â€
  // cannot be scaled up at all. Clamping here keeps every later footprint legal
  // rather than discovering it when the body is projected.
  const width = Math.max(asset.bounds.max[0]! - asset.bounds.min[0]!, asset.collision.width);
  const length = Math.max(asset.bounds.max[2]! - asset.bounds.min[2]!, asset.collision.length);
  const height = asset.bounds.max[1]! - asset.bounds.min[1]! + 2 * 0.05;
  const maximum = 11.6 / Math.hypot(width, length, height);
  return Math.min(scale, maximum);
}

/** Position of a slot's support origin along a route occurrence. */
export function sampleRoute(route: PlannedRoute, occurrence: number, localM: number): { x: number; y: number; z: number; heading: number } {
  const edge = route.edges[occurrence]!;
  const local = Math.max(0, Math.min(edge.lengthM, localM));
  const at = sampleEdge(edge, local);
  const height = edge.points.length > 1 ? at.y : edge.points[0]!.y;
  return { x: at.x, y: height, z: at.z, heading: headingAt(edge, local) };
}
