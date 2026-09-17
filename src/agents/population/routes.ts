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
import { CENTRAL_RADIUS_M, MovementGraph } from "./graph.ts";
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

/**
 * What a planned route is trying to reach. A walking route has two legal shapes
 * under the frozen contract's passage rule, and this is which one the caller
 * asked for:
 *
 *  - `exit` is the delivered shape: enter at a boundary portal, cross something,
 *    leave through a true AOI exit portal, retire through the boundary envelope.
 *  - `centre` enters at a boundary portal and ends on the world origin's own
 *    block. The origin is the Shibuya Scramble Crossing, so this is the shape
 *    that puts the population where the deliverable is judged. It is legal under
 *    the contract's own rule because the rule's first disjunct is satisfied: the
 *    route's last conflict occurrence is the scramble, and the section after it
 *    is an ungoverned sidewalk of the central block. It needs no boundary
 *    retirement, because a walker retires where it stands.
 *
 *    **A `centre` route crosses the scramble when the graph lets it.** The shape
 *    is a descent to the authored diagonal, the diagonal itself, and then the
 *    delivered descent to a legal terminus, and it is preferred over the direct
 *    descent whenever crossing costs no more than `MAXIMUM_CROSSING_DETOUR_M`
 *    beyond it. That preference is the whole reason anybody is on the crossing:
 *    measured with `tools/agents/crowd-occupancy.ts` on the revision before it, no
 *    walker in a 3,000-strong population came nearer the origin than 31.228 m,
 *    because a descent to a terminus is shortest *around* the crossing and the
 *    terminus field is seeded on ungoverned sidewalk. Both descents are legal, both
 *    end on the same kind of terminus, and neither is an admission setting.
 *
 * The distinction is a plan, not an admission setting: both shapes are built by
 * the same passage factory and validated by the same release test.
 */
export type RouteDestination = "exit" | "centre";

/** A route longer than this buys nothing and costs minutes of walking. */
export const MAXIMUM_ROUTE_LENGTH_M = 700;

/**
 * How much longer than the direct central walk a crossing route may be.
 *
 * It is metres and not a ratio, measured rather than chosen: over the 16 delivered
 * portals whose component can reach the diagonal at all, crossing costs between
 * 62.4 m and 134.0 m of detour, so a ratio would refuse the portal whose walk is
 * long for a detour that is merely average. 140 m is where that distribution ends,
 * so this admits every crossing the delivered graph offers and refuses a detour
 * worse than it has. The cost is real and is why there is a budget at all: the
 * diagonal is 49.061 m of governed crossing with a gate at each end, and a route
 * that crosses is a route that spends longer inside the scramble compound.
 */
export const MAXIMUM_CROSSING_DETOUR_M = 140;

/**
 * The length cap for a route whose destination IS the centre.
 *
 * The cap above is not about walking time; it is about a route that cannot be
 * walked. A centre route is bounded by the network's own geometry instead, and
 * the number here is measured rather than chosen: over the 18 delivered portals
 * whose component can reach a central terminus at all, the shortest legal walk
 * runs 432.4 m to 756.1 m, and the planner with the step window below produces
 * routes from 513.4 m to 936.5 m. A 700 m cap would refuse every portal past the
 * tenth; the number here leaves the worst measured route 63 m of headroom rather
 * than being stretched to whatever the planner happened to produce.
 */
export const MAXIMUM_CENTRE_ROUTE_LENGTH_M = 1_000;

/**
 * How much longer than the best successor a step may be and still be drawn by the
 * route-variety stream, as a fraction of the best with a floor in metres.
 *
 * The step criterion is exact â€” `walked + step.lengthM + remaining(next)` is the
 * length of the whole route if that step is taken â€” so the best eligible step is
 * the one that keeps the route on its own shortest path. The window is what makes
 * routes vary between actors instead of every actor from a portal walking one
 * identical optimum.
 *
 * It is relative because a fixed window is not a bound on a route: measured, a
 * flat 90 m of slack produced a 936.5 m route against its own 752.7 m optimum,
 * 24% over, while the shortest portal's route measured 1.08Ã—. A fraction of the
 * route's own optimum holds the deviation to the same proportion at every
 * distance, and the floor keeps a short route from having a zero window.
 *
 * The window bounds each decision and not the total, so it is the cap above that
 * bounds the route; this is the route-variety knob, not the safety property.
 */
export const CENTRE_STEP_WINDOW_FRACTION = 0.08;
export const CENTRE_STEP_WINDOW_FLOOR_M = 30;

/**
 * The most walking lanes one corridor is divided into, and the least.
 *
 * A lane is a lateral position inside the corridor the section's own `widthM`
 * describes, and the route carries one per occurrence. The network's walking
 * sections are 2.5 m of sidewalk, 3 m of crossing or 5 m of scramble, and the
 * authored body is 0.5 m wide at scale 1, so the delivered graph offers 2 to 5
 * lanes per side on a sidewalk and up to 10 on the scramble. The cap is what keeps
 * a wide crossing from being divided into more lanes than a crowd can fill, and the
 * floor keeps a narrow corridor from being given none.
 */
export const MAXIMUM_WALKING_LANES = 10;
export const MINIMUM_WALKING_LANES = 1;

/**
 * The lateral position of a body on its route, one entry per occurrence, in metres
 * from that section's own centreline.
 *
 * WHY THE ROUTE CARRIES THIS. A route was a list of sections and nothing else, so
 * every body on a section shared one polyline and therefore one position at one
 * arc distance. The measured consequence, on the revision before this: 3,000 active
 * pedestrians held 1,229 to 1,661 distinct positions between them, in stacks of up
 * to 108 bodies at one centimetre, and the crossing carried a single-file column
 * because a corridor with no lateral dimension has one lane. Two independent lanes
 * named the same missing field for both symptoms.
 *
 * It is a *plan-time* quantity and not a per-tick computation: the lanes are drawn
 * once when the route is built, so a body's tick costs exactly what it cost before
 * this field existed. Nothing here is written by the tick, and no per-tick work
 * reads anything but the resulting number.
 *
 * Absent means the centreline, which is what a vehicle route is: vehicles carry
 * their own lane index through `placeVehicle` and are not placed by this field, so
 * their arithmetic is unchanged.
 */
export type LateralOffsets = Float64Array;

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
  /**
   * Metres to one side of each occurrence's own centreline. Absent on a vehicle
   * route, which places its body with its own lane index; a pedestrian route
   * always carries one entry per occurrence.
   */
  readonly lateralOffsetsM?: LateralOffsets;
}

export interface RouteRequest {
  /**
   * What the route is for. Absent means the delivered `exit` shape, so every
   * caller that has not been taught about the centre keeps the route it had.
   */
  readonly destination?: RouteDestination;
  /** Collision radius used to pull the halt short of a gate. */
  readonly footprintRadiusM: number;
  readonly maxEdges: number;
  /** Distinct walks attempted before a portal is reported as unreachable. */
  readonly walkAttempts?: number;
  /**
   * Which edges this body may *halt* on. A vehicle whose body is longer than a
   * junction's entry section cannot stand still on the approach before that
   * gate, so a walk through that section is not a route for it ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the planner
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
  /**
   * Keyed by destination *and* portal. Two destinations from one portal are two
   * different routes, so the key has to carry both; a portal-only key would hand
   * whichever shape was planned first to every later caller, which is a silently
   * wrong route rather than a refusal.
   */
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

  /**
   * Build (or reuse) the route one slot drives, placed at that slot's own lateral
   * position.
   *
   * The *plan* is cached and shared — every slot drawing the same portal and
   * destination drives the same sections, the same gates and the same `RoutePassage`
   * objects, which is what makes the passage bookkeeping an identity across actors.
   * The *placement* is not: each call returns a view of that plan carrying the
   * calling slot's lateral offsets, so two walkers on one plan stand in two places.
   * Sharing the passages is deliberate and load-bearing: `tick.ts` compares a held
   * lease with `route.passages[i]` by object identity, so a per-slot copy of the
   * passage objects would break admission rather than spread a crowd.
   */
  route(kind: ActorKind, slot: number, generation: number, entryEdgeId: string, request: RouteRequest): PlannedRoute | null {
    const destination = request.destination ?? "exit";
    const key = `${destination}\u0000${entryEdgeId}`;
    const streamSeed = actorSeed(0, kind, slot, generation);
    const cached = this.caches.get(key);
    if (cached) return placeOnCorridor(cached, kind, streamSeed, request.footprintRadiusM);
    const graph = kind === "vehicle" ? this.vehicleGraph : this.pedestrianGraph;
    const built = this.plan(graph, kind, entryEdgeId, streamSeed, request);
    if (!built.route) return null;
    // Only a route with no gate-length constraint is reusable across body sizes;
    // a constrained walk depends on the radius it was planned for.
    if (!request.viable) this.caches.set(key, built.route);
    return placeOnCorridor(built.route, kind, streamSeed, request.footprintRadiusM);
  }

  /**
   * Plan a route without a slot: the shape an offline census or a test wants.
   * `streamSeed` is the whole RNG seed, not the per-actor mix.
   *
   * It also places the plan at the lateral position that seed draws, so a census
   * describes the route a body actually drives rather than the centreline it was
   * planned on. A census that reported the centreline would report a crowd that
   * does not exist, which is the defect this field was added for.
   */
  planFrom(graph: MovementGraph, kind: ActorKind, entryEdgeId: string, streamSeed: number, request: RouteRequest): RouteAttempt {
    const built = this.plan(graph, kind, entryEdgeId, streamSeed, request);
    if (!built.route) return built;
    return { route: placeOnCorridor(built.route, kind, streamSeed, request.footprintRadiusM) };
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
        const walk = request.destination === "centre"
          ? this.walkToCentre(graph, portal, createStream(seed(index) + attempt), request.maxEdges, request.viable)
          : this.walk(graph, portal, createStream(seed(index) + attempt), request.maxEdges, request.viable);
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
      const walk = request.destination === "centre"
        ? this.walkToCentre(graph, entryEdgeId, rng, request.maxEdges, request.viable)
        : this.walk(graph, entryEdgeId, rng, request.maxEdges, request.viable);
      if (!walk) {
        reason = request.destination === "centre"
          ? `${kind} route from ${entryEdgeId} reaches no walking crossing inside ${CENTRAL_RADIUS_M} m of the world origin inside its component within ${MAXIMUM_CENTRE_ROUTE_LENGTH_M} m of walking`
          : `${kind} route from ${entryEdgeId} reaches no true AOI exit inside its component within ${request.maxEdges} sections${request.viable ? " that this body can halt on" : ""}`;
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

  /**
   * A walk that ends on the world origin's own block.
   *
   * The field it descends is seeded at the sections a route may legally end on —
   * the ungoverned walking edges inside `CENTRAL_RADIUS_M` — so descending it is
   * both what reaches the middle and what makes the route legal once it is there.
   * A governed section is never the terminus, which is the property the real
   * passage factory checks: the scramble is one compound, and a route ending on
   * one of its crossings has no outside section after its last conflict
   * occurrence.
   *
   * Four properties, each a measured correction rather than a preference:
   *
   *  - **Monotone descent, not a preference.** The walk only ever steps to a
   *    section whose remaining distance is strictly lower, which makes it total:
   *    whenever the portal's component contains a central terminus at all, this
   *    reaches one. The wobbly walk below reaches one for 0 of the 33 portals,
   *    because it aims at the nearest crossing of any kind and every one of those
   *    is peripheral. Descent also cannot spin, because a strictly descending
   *    field bounds the step count by the graph.
   *  - **An exact distance, not a section count.** The first version descended a
   *    count of sections and chose uniformly among the decreasing ones; measured,
   *    it walked 906 m to reach a section 500 m away, because a step can descend a
   *    count while adding 165 m of walking.
   *  - **The best step, within a window.** With the exact field,
   *    `walked + step.lengthM + remaining(next)` is the length of the whole route
   *    if that step is taken, so the window is a bound on how far a decision may
   *    stray from the route's own optimum rather than a knob on a heuristic. See
   *    `CENTRE_STEP_WINDOW_FRACTION` for why it is a fraction.
   *  - **A cap on the finished route.** The window bounds one decision, so the
   *    cap is what bounds the route: a walk that cannot finish inside
   *    `MAXIMUM_CENTRE_ROUTE_LENGTH_M` is refused by name rather than planned.
   *
   * What the delivered graph then allows is a measurement and not the intention.
   * Of the 33 portals, 18 have a component containing a legal central terminus and
   * 17 plan a route; their optima all end on four of those termini, between
   * 43.85 m and 57.78 m from the origin, and none of the nearest termini — 13.50 m
   * to 31.23 m out — lies on any portal's shortest walk. The scramble compound is
   * on 4 of the 17 planned routes.
   *
   * A `centre` route crosses the scramble when the graph lets it: `descend`
   * honestly carries out the crossing on `firstField` and the last leg on
   * `secondField`, and the crossing is taken whenever its detour is inside
   * `MAXIMUM_CROSSING_DETOUR_M`. When there is no crossing to take — a component
   * that cannot reach the diagonal — the delivered direct descent is what is
   * planned, so this preference costs no portal its route.
   */
  private walkToCentre(graph: MovementGraph, entryEdgeId: string, rng: () => number, maxEdges: number, viable?: (edgeId: string) => boolean): string[] | null {
    const direct = this.descend(graph, entryEdgeId, rng, maxEdges, viable, (id) => graph.distanceToCentre(id), null);
    const crossing = this.descend(graph, entryEdgeId, rng, maxEdges, viable, (id) => graph.distanceToDiagonal(id), (id) => graph.distanceToCentre(id));
    if (!crossing) return direct;
    if (!direct) return crossing;
    return this.pathLength(graph, crossing) <= this.pathLength(graph, direct) + MAXIMUM_CROSSING_DETOUR_M ? crossing : direct;
  }

  /** The walking metres a planned path covers, which is what the detour budget is spent in. */
  private pathLength(graph: MovementGraph, path: readonly string[]): number {
    let total = 0;
    for (const id of path) total += graph.edge(id).lengthM;
    return total;
  }

  /**
   * A monotone descent on an exact walking-distance field, optionally switching
   * field once at the moment the first field reaches zero.
   *
   * The switch is what makes a crossing route: the first field is the distance to
   * the authored scramble diagonal and the second is the distance to a legal
   * terminus, so the walk arrives at the crossing, traverses it — sections are
   * atomic, so landing on the diagonal cannot leave halfway across — and then
   * continues to the same kind of terminus the delivered descent ends on.
   *
   * One `visited` set spans both fields, so the second leg cannot step back onto a
   * section the first leg used to get here. Each leg gets its own window, because
   * the window is a fraction of *its own* optimum: the crossing leg's optimum is a
   * short approach and the terminus leg's is what remains, and one number for both
   * would either pin the first leg to its shortest path or let the second wander.
   *
   * Everything else is the delivered descent, unchanged: strictly decreasing
   * remaining distance so it cannot spin, an exact distance rather than a section
   * count, the best step within a window, and the route cap.
   */
  private descend(
    graph: MovementGraph,
    entryEdgeId: string,
    rng: () => number,
    maxEdges: number,
    viable: ((edgeId: string) => boolean) | undefined,
    firstField: (id: string) => number | undefined,
    secondField: ((id: string) => number | undefined) | null,
  ): string[] | null {
    let field = firstField;
    let remaining = field(entryEdgeId);
    if (remaining === undefined) return null;
    let windowM = Math.max(CENTRE_STEP_WINDOW_FLOOR_M, CENTRE_STEP_WINDOW_FRACTION * remaining);
    const path = [entryEdgeId];
    const visited = new Set<string>([entryEdgeId]);
    let walkedM = graph.edge(entryEdgeId).lengthM;
    const budget = Math.min(maxEdges, graph.edges.size);
    for (let guard = 0; guard <= budget; guard += 1) {
      const head = path.at(-1)!;
      if (field(head)! <= 1e-9) {
        if (secondField !== null && field === firstField) {
          field = secondField;
          const switched = field(head);
          if (switched === undefined) return null;
          remaining = switched;
          // The floor keeps the second leg's window at least as wide as the first
          // leg's, so a short approach cannot shrink the descent to a terminus into
          // a shortest-path-only walk.
          windowM = Math.max(CENTRE_STEP_WINDOW_FLOOR_M, windowM, CENTRE_STEP_WINDOW_FRACTION * switched);
        } else {
          return path;
        }
      }
      if (walkedM > MAXIMUM_CENTRE_ROUTE_LENGTH_M) return null;
      let best = Number.POSITIVE_INFINITY;
      const costs = new Map<string, number>();
      for (const id of graph.next(head)) {
        if (visited.has(id) || (viable !== undefined && !viable(id))) continue;
        const next = field(id);
        if (next === undefined || next >= remaining - 1e-9) continue;
        const cost = walkedM + graph.edge(id).lengthM + next;
        costs.set(id, cost);
        if (cost < best) best = cost;
      }
      const pool = [...costs].filter(([, cost]) => cost <= best + windowM).map(([id]) => id);
      if (!pool.length) return null;
      const chosen = [...pool].sort()[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
      path.push(chosen);
      visited.add(chosen);
      walkedM += graph.edge(chosen).lengthM;
      remaining = field(chosen)!;
    }
    return null;
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
        // footprint is not an option ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the dimensions come from the delivered
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
  // class whose generated envelope already sits at the bound ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the bus does ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
  // cannot be scaled up at all. Clamping here keeps every later footprint legal
  // rather than discovering it when the body is projected.
  const width = Math.max(asset.bounds.max[0]! - asset.bounds.min[0]!, asset.collision.width);
  const length = Math.max(asset.bounds.max[2]! - asset.bounds.min[2]!, asset.collision.length);
  const height = asset.bounds.max[1]! - asset.bounds.min[1]! + 2 * 0.05;
  const maximum = 11.6 / Math.hypot(width, length, height);
  return Math.min(scale, maximum);
}

/**
 * Position of a slot's support origin along a route occurrence, at that
 * occurrence's own lateral position.
 *
 * The offset is applied on the section's own right axis at the sampled heading,
 * which is the axis `spacing-metrics.ts` documents and the one `placeVehicle`
 * offsets lanes along. Because a section is directed, both directions of one
 * physical corridor take the same sign and therefore land on opposite sides of the
 * centreline: two streams walking at each other down one sidewalk pass each other
 * instead of meeting head-on. That is a property of the sign convention and not a
 * second rule, and it is the reason the deadlock the spacing lane measured — two
 * walkers facing each other on the two directions of one way — cannot recur once
 * every walker has a lateral position.
 *
 * Height and heading come from the centreline, so a body still faces the way its
 * route runs and still stands on the route's own ground.
 */
export function sampleRoute(route: PlannedRoute, occurrence: number, localM: number): { x: number; y: number; z: number; heading: number } {
  const edge = route.edges[occurrence]!;
  const local = Math.max(0, Math.min(edge.lengthM, localM));
  const at = sampleEdge(edge, local);
  const height = edge.points.length > 1 ? at.y : edge.points[0]!.y;
  const heading = headingAt(edge, local);
  const lateralM = route.lateralOffsetsM === undefined ? 0 : route.lateralOffsetsM[occurrence] ?? 0;
  if (lateralM === 0) return { x: at.x, y: height, z: at.z, heading };
  return { x: at.x + Math.cos(heading) * lateralM, y: height, z: at.z - Math.sin(heading) * lateralM, heading };
}

/**
 * Give a planned route this actor's own lateral position on every section it uses.
 *
 * The lane is drawn from the actor's own stream, so two walkers that share one
 * cached plan — every slot drawing the same portal and destination shares one, which
 * is what keeps planning cheap — still stand in different places. The lane is then
 * converted to metres against each section's own `widthM`, and the *same* fraction
 * carries across the whole route, so a walker keeps to its own side of the corridor
 * as it moves between a 5 m scramble crossing and a 2.5 m sidewalk instead of being
 * pinned to the edge of the narrower one.
 *
 * The fraction is in `[0, 1)` and never negative, which is what puts the two
 * directions of a section on opposite sides: see `sampleRoute`. The jitter inside
 * the lane is what makes the positions distinct rather than merely spread — two
 * walkers sharing a lane and an arc distance, which is exactly the state of a queue
 * at a kerb, differ by the jitter and not by anything else.
 *
 * Measured on the delivered graph, this is 5 lanes a side on a 2.5 m sidewalk and
 * 10 on the 5 m scramble diagonal, against 1 before it.
 */
export function placeOnCorridor(route: PlannedRoute, kind: ActorKind, streamSeed: number, footprintRadiusM: number): PlannedRoute {
  if (kind !== "pedestrian" || route.edges.length === 0 || !(footprintRadiusM > 0)) return route;
  const bodyWidthM = 2 * footprintRadiusM;
  // The room a body has to one side of the centreline, over the widest section of
  // this route: half the section less the body's own half-width.
  let halfRoomM = 0;
  for (const edge of route.edges) {
    const room = (edge.widthM - bodyWidthM) / 2;
    if (room > halfRoomM) halfRoomM = room;
  }
  if (!(halfRoomM > 0)) return route;
  const lanes = Math.max(MINIMUM_WALKING_LANES, Math.min(MAXIMUM_WALKING_LANES, Math.floor(halfRoomM / bodyWidthM)));
  const rng = createStream(streamSeed ^ 0x4c41_4e45);
  const lane = Math.min(lanes - 1, Math.floor(rng() * lanes));
  const jitter = rng();
  const fraction = (lane + jitter) / lanes;
  const offsets = new Float64Array(route.edges.length);
  for (let index = 0; index < route.edges.length; index += 1) {
    const room = (route.edges[index]!.widthM - bodyWidthM) / 2;
    offsets[index] = room > 0 ? fraction * room : 0;
  }
  return Object.freeze({ ...route, lateralOffsetsM: offsets });
}
