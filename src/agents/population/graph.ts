/**
 * The frozen Phase 6 network, indexed for planning. Read-only: nothing here
 * writes a network field, splices a walking edge onto a vehicle edge, or
 * re-generates graph geometry. It only adds successor, predecessor, component
 * and exit-distance indexes over the delivered `nextIds`.
 *
 * `exitDistance` is the number of edges from that edge to the nearest true AOI
 * exit portal, found by breadth-first search on the reversed successor graph.
 * A walk that always steps to `exitDistance - 1` therefore cannot strand itself,
 * which is what makes route planning total on a graph the contract exposes as 21
 * vehicle and 39 walking components rather than one connected network.
 */

import type { LaneEdge, NetworkData, NetworkEdge, WalkEdge } from "../../world/network-data.ts";

/**
 * How close to the world origin a walking section must come to count as central.
 * The origin is the Shibuya Scramble Crossing and the delivered scramble
 * compound's own diagonal passes 0.08 m from it; 60 m holds the 132 ungoverned
 * walking sections of that block and excludes the peripheral sidewalks and
 * crossings the perimeter roads carry.
 */
export const CENTRAL_RADIUS_M = 60;

/**
 * The authored Shibuya Scramble diagonal, matched by the name the network
 * builder writes rather than by proximity.
 *
 * It is matched by name because proximity aims at the wrong crossing, silently:
 * 48 walking sections come within 60 m of the world origin and exactly two of
 * them are this diagonal, which are the two directions of one 49.061 m crossing.
 * `tools/agents/crowd-occupancy.ts` finds the same geometry the same way, so this
 * field and that instrument cannot disagree about which sections they mean.
 */
export const SCRAMBLE_DIAGONAL_MARKER = ":scramble-diagonal:";

export class MovementGraph {
  readonly kind: "vehicle" | "pedestrian";
  readonly edges: ReadonlyMap<string, NetworkEdge>;
  private readonly successors = new Map<string, readonly string[]>();
  private readonly predecessors = new Map<string, readonly string[]>();
  private readonly exitDistance: ReadonlyMap<string, number>;
  private readonly crossingDistance: ReadonlyMap<string, number>;
  private readonly centralDistance: ReadonlyMap<string, number>;
  private readonly diagonalDistance: ReadonlyMap<string, number>;
  private readonly boundaryNodes: ReadonlySet<string>;

  constructor(network: NetworkData, kind: "vehicle" | "pedestrian") {
    this.kind = kind;
    const edges: NetworkEdge[] = kind === "vehicle" ? network.lanes : network.walks;
    this.edges = new Map(edges.map((edge) => [edge.id, edge]));
    if (this.edges.size !== edges.length) {
      throw new Error(`Population graph for ${kind}s received duplicated edge IDs; the network contract requires unique stable IDs.`);
    }
    for (const edge of edges) this.successors.set(edge.id, Object.freeze([...edge.nextIds]));
    this.boundaryNodes = new Set(network.nodes.filter((node) => node.boundary).map((node) => node.id));
    const predecessors = new Map<string, string[]>();
    for (const edge of edges) {
      for (const next of edge.nextIds) {
        if (!this.edges.has(next)) {
          throw new Error(`Population graph for ${kind}s has edge ${edge.id} pointing at missing successor ${next}; rebuild the movement network.`);
        }
        const list = predecessors.get(next) ?? [];
        list.push(edge.id);
        predecessors.set(next, list);
      }
    }
    for (const [id, list] of predecessors) this.predecessors.set(id, Object.freeze(list));
    for (const edge of edges) if (!this.predecessors.has(edge.id)) this.predecessors.set(edge.id, Object.freeze([]));

    // A true exit is a real AOI portal in the contract's own sense. Vehicle exits
    // are the delivered `portals.vehicleExit` list. The walking graph has only an
    // entrance portal list, so a walking exit is an edge that ends on a boundary
    // node *and leaves the AOI*: an edge that ends on the border while still
    // running along it is not a way out, and treating it as one is what makes a
    // two-edge "route" that never reaches a crossing.
    const exits = edges
      .filter((edge) => (kind === "vehicle" ? network.portals.vehicleExit.includes(edge.id) : this.leavesAoi(network, edge)))
      .map((edge) => edge.id);
    this.exitDistance = this.distancesToExits(exits);
    // Walking routes should cross something. Every exit of a one-kilometre AOI
    // sits on its perimeter, so a walk that only ever reduces its distance to an
    // exit hugs the edge of the network and reaches the scramble almost never.
    // This second field is the distance to the nearest crossing, and a walk uses
    // it as a waypoint before heading for an exit.
    this.crossingDistance = kind === "pedestrian"
      ? this.distancesToExits(edges.filter((edge) => (edge as WalkEdge).kind === "crossing").map((edge) => edge.id))
      : new Map<string, number>();
    // The centre field: sections from this edge to a section a walking route may
    // legally *end* on inside the world origin's own block. The origin IS the
    // Shibuya Scramble Crossing, so "the middle of the map" is measurable rather
    // than a matter of taste, and this field is what lets a route be planned *to*
    // it instead of through it.
    //
    // The seed set is the whole design. It is not "the crossings near the
    // origin" — that was the first attempt, and it fails for a reason worth
    // stating: the scramble is one compound, so a route that ended on one of its
    // crossings has no outside section after its last conflict occurrence and the
    // real passage factory refuses it, correctly. All 18 portals whose component
    // reaches a central crossing planned a route the factory rejected. The seeds
    // are therefore the sections a route may end on: ungoverned
    // (`junctionId: null`) walking sections whose closest sample is inside
    // `CENTRAL_RADIUS_M`.
    //
    // What the delivered graph then allows is a measured fact and not the
    // intention: of 18 portals whose component contains such a section, 18 plan a
    // route, and their optima all end on four of them, 43.85 m to 57.78 m from the
    // origin. None of the nearest seeds — 13.50 m to 31.23 m from the origin —
    // lies on any portal's shortest walk, and measured, a windowed descent picks
    // one of them on one portal, so the closest a walker reaches is 31.228 m. The
    // scramble compound itself is on 4 of the 17 planned routes.
    //
    // Descent is on the exact remaining walking distance in metres, not on a
    // section count; `shortestLengthsTo` says why that distinction was measured to
    // matter. The two older fields above stay counts, because the walks that use
    // them are bounded by section budgets rather than by a tight length cap.
    this.centralDistance = kind === "pedestrian"
      ? this.shortestLengthsTo(edges.filter((edge) => edge.junctionId === null && this.withinCentralRadius(edge)).map((edge) => edge.id))
      : new Map<string, number>();
    // The crossing field: exact walking metres from a section to the authored
    // scramble diagonal, by the same Dijkstra over the reversed successor graph.
    // Its seed set is the diagonal itself, so `0` means "standing on the crossing"
    // and a monotone descent of this field is a walk that arrives at the crossing
    // and then traverses all 49.061 m of it — sections are atomic here, so landing
    // on the diagonal cannot leave halfway across.
    //
    // Why a field rather than a preference: the descent to a legal terminus already
    // exists and already refuses the crossing, because crossing costs a detour and
    // the terminus field is seeded on ungoverned sidewalk. Measured with
    // `tools/agents/centre-route-census.ts` on the revision before this, no planned
    // centre route came nearer the origin than 31.228 m, so nobody was ever on the
    // crossing at all. Aiming at the crossing first is what puts them there.
    if (kind === "pedestrian") {
      const diagonal = edges.filter((edge) => edge.id.includes(SCRAMBLE_DIAGONAL_MARKER)).map((edge) => edge.id);
      if (!diagonal.length) {
        throw new Error(`The pedestrian graph has no section whose id contains "${SCRAMBLE_DIAGONAL_MARKER}", so no walking route can be planned across the Shibuya Scramble diagonal. The network's authored crossing geometry changed; rebuild the network before planning a population.`);
      }
      this.diagonalDistance = this.shortestLengthsTo(diagonal);
    } else {
      this.diagonalDistance = new Map<string, number>();
    }
  }

  /** Whether an edge's closest sample lies inside the central block. */
  private withinCentralRadius(edge: NetworkEdge): boolean {
    for (const point of edge.points) {
      if (point.x * point.x + point.z * point.z <= CENTRAL_RADIUS_M * CENTRAL_RADIUS_M) return true;
    }
    return false;
  }

  /**
   * Metres of the shortest legal walk from this edge to the nearest section a
   * route may end on inside the central block. `0` means this edge *is* such a
   * section.
   */
  distanceToCentre(id: string): number | undefined {
    return this.centralDistance.get(id);
  }

  /** Sections from this edge to the nearest mapped crossing, walking forward. */
  distanceToCrossing(id: string): number | undefined {
    return this.crossingDistance.get(id);
  }

  /**
   * Metres of the shortest legal walk from this section to the authored scramble
   * diagonal. `0` means this section *is* the diagonal, so a descent of this field
   * that reaches zero has arrived at the crossing and will traverse all of it.
   * Exported because a census has to be able to ask what the crossing costs a
   * portal without planning the whole route.
   */
  distanceToDiagonal(id: string): number | undefined {
    return this.diagonalDistance.get(id);
  }

  /**
   * Whether an edge ends on the canonical AOI polygon and points away from it. */
  private leavesAoi(network: NetworkData, edge: NetworkEdge): boolean {
    if (!this.boundaryNodes.has(edge.to)) return false;
    const polygon = network.boundary?.polygon;
    const end = edge.points.at(-1);
    if (!polygon || polygon.length < 3 || !end) return false;
    let area = 0;
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i]!;
      const b = polygon[(i + 1) % polygon.length]!;
      area += a.x * b.z - b.x * a.z;
    }
    const sign = area < 0 ? 1 : -1;
    let nearest: { normal: { x: number; z: number }; distance: number } | undefined;
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i]!;
      const b = polygon[(i + 1) % polygon.length]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const normal = { x: (-dz / length) * sign, z: (dx / length) * sign };
      const distance = Math.abs((end.x - a.x) * normal.x + (end.z - a.z) * normal.z);
      if (!nearest || distance < nearest.distance) nearest = { normal, distance };
    }
    if (!nearest || nearest.distance > 0.02) return false;
    // The last sample before the endpoint gives a travel bearing that is not
    // degenerate when the edge ends exactly on the polygon.
    const before = edge.points.length > 1 ? edge.points[edge.points.length - 2]! : edge.points[0]!;
    const bearingX = end.x - before.x;
    const bearingZ = end.z - before.z;
    const length = Math.hypot(bearingX, bearingZ);
    if (!(length > 1e-6)) return false;
    return (bearingX / length) * nearest.normal.x + (bearingZ / length) * nearest.normal.z > 0;
  }

  private distancesToExits(exits: readonly string[]): ReadonlyMap<string, number> {
    const distance = new Map<string, number>();
    const queue: string[] = [];
    for (const id of exits) {
      if (this.edges.has(id) && !distance.has(id)) {
        distance.set(id, 0);
        queue.push(id);
      }
    }
    for (let head = 0; head < queue.length; head += 1) {
      const id = queue[head]!;
      const next = distance.get(id)! + 1;
      for (const previous of this.predecessors.get(id) ?? []) {
        if (distance.has(previous)) continue;
        distance.set(previous, next);
        queue.push(previous);
      }
    }
    return distance;
  }

  /**
   * The exact length in metres of the shortest legal walk from every section to
   * the nearest of `targets`, by Dijkstra over the reversed successor graph with
   * the edges' own `lengthM` as the cost. `0` at a target itself.
   *
   * This is the centre field's own metric, and it is a distance rather than a
   * section count for a measured reason. A count is cheap and is enough to make a
   * descent *terminate*, but it is not enough to make it *short*: a step can
   * descend the count while adding 165 m of walking, and the uniform choice among
   * descending steps then reaches a section 500 m away in 906 m. Weighing a step
   * by the exact remaining distance is what keeps the route near its own optimum,
   * which matters because the centre route's length cap is only 1.2 times the
   * longest optimum the delivered graph offers.
   */
  private shortestLengthsTo(targets: readonly string[]): ReadonlyMap<string, number> {
    const length = new Map<string, number>();
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
      if (!this.edges.has(id)) continue;
      length.set(id, 0);
      push(id, 0);
    }
    while (heap.length) {
      const current = pop()!;
      if (current.d > (length.get(current.id) ?? Number.POSITIVE_INFINITY)) continue;
      for (const previous of this.predecessors.get(current.id) ?? []) {
        const candidate = current.d + this.edges.get(previous)!.lengthM;
        if (candidate < (length.get(previous) ?? Number.POSITIVE_INFINITY) - 1e-9) {
          length.set(previous, candidate);
          push(previous, candidate);
        }
      }
    }
    return length;
  }

  edge(id: string): NetworkEdge {
    const edge = this.edges.get(id);
    if (!edge) throw new Error(`Population graph for ${this.kind}s has no edge ${id}; the planned route does not belong to the delivered network.`);
    return edge;
  }

  next(id: string): readonly string[] {
    return this.successors.get(id) ?? Object.freeze([]);
  }

  /** Undefined when no legal continuation reaches an AOI exit inside this component. */
  distanceToExit(id: string): number | undefined {
    return this.exitDistance.get(id);
  }

  endsOnBoundary(id: string): boolean {
    return this.boundaryNodes.has(this.edge(id).to);
  }

  /** True when this edge is a real way out of the AOI for this population. */
  isExit(id: string): boolean {
    return this.exitDistance.get(id) === 0;
  }

  /** The edge speed limit. Walking edges carry no limit; the cadence is the walk speed. */
  speedLimit(id: string): number {
    return this.kind === "vehicle" ? (this.edge(id) as LaneEdge).speedMps : 0;
  }
}

/** Same-direction lateral neighbours, present only outside every conflict area. */
export function lateralNeighbour(network: NetworkData, edgeId: string, side: "left" | "right"): LaneEdge | null {
  const edge = network.lanes.find((lane) => lane.id === edgeId);
  if (!edge) return null;
  const id = side === "left" ? edge.leftLaneId : edge.rightLaneId;
  if (id === null) return null;
  return network.lanes.find((lane) => lane.id === id) ?? null;
}

export type AnyMovementEdge = LaneEdge | WalkEdge;
