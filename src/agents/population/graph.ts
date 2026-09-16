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

export class MovementGraph {
  readonly kind: "vehicle" | "pedestrian";
  readonly edges: ReadonlyMap<string, NetworkEdge>;
  private readonly successors = new Map<string, readonly string[]>();
  private readonly predecessors = new Map<string, readonly string[]>();
  private readonly exitDistance: ReadonlyMap<string, number>;
  private readonly crossingDistance: ReadonlyMap<string, number>;
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
  }

  /** Sections from this edge to the nearest mapped crossing, walking forward. */
  distanceToCrossing(id: string): number | undefined {
    return this.crossingDistance.get(id);
  }

  /** Whether an edge ends on the canonical AOI polygon and points away from it. */
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
