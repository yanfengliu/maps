/**
 * The counter surface the bridge publishes. Read-only by construction: this
 * module builds a fresh plain object and holds no reference to population state.
 *
 * The contract requires refused spawns and refused routes to be observable
 * rather than silent, so both are counted and sampled by name, and the reasons
 * for a route never being driven (a stop line nearer the gate than the body, a
 * walking way that lost its ground) are reported rather than swallowed.
 */

export type PopulationKind = "vehicle" | "pedestrian";

export interface KindStatus {
  /** Slots with an active byte, which is what the renderer draws. */
  active: number;
  /** Active actors held at a gate without an admission commitment. */
  queued: number;
  /** Active actors holding an admission commitment, inside or clearing a compound. */
  committed: number;
  /** Actors that finished a route since boot, by any retirement path. */
  completed: number;
  /** Actors that crossed at least one conflict authority since boot. */
  crossed: number;
  /** The longest single measured wait at a gate, seconds. */
  longestWaitSeconds: number;
  /** Mean measured wait over every finished wait, seconds. */
  meanWaitSeconds: number;
  /** Slots bound but not yet active: prepared at a portal, waiting for a grant. */
  pending: number;
}

export interface RefusalStatus {
  /** Stable reason text. Named, never a bare count. */
  reason: string;
  count: number;
}

export interface RenderedStatus {
  pedestrians: number;
  vehicles: number;
  /** Instances the renderer actually drew at each human level this frame. */
  near: number;
  medium: number;
  far: number;
  /** True once the asset-backed renderer is attached. */
  attached: boolean;
}

export interface PopulationStatus {
  /** False before the network is attached; every count is then zero. */
  attached: boolean;
  simulatedSeconds: number;
  pedestrians: KindStatus;
  vehicles: KindStatus;
  /** Spawns equal retirements plus active, or the population leaked. */
  lifecycle: { spawned: number; retired: number; active: number; reused: number; generations: number };
  /** Requests handed to the single admission authority in the last tick. */
  requestsLastTick: number;
  /** Grants the authority returned in the last tick. */
  grantsLastTick: number;
  /** Cumulative grants since boot. */
  grants: number;
  /** Cumulative ticks the population has advanced. */
  ticks: number;
  refusedSpawns: readonly RefusalStatus[];
  refusedRoutes: readonly RefusalStatus[];
  /** Vehicles that retired on the network because the boundary envelope could not clear them. */
  retiredInPlace: number;
  /** Vehicles admitted through the full boundary lifecycle rather than route admission. */
  boundarySpawns: number;
  /** Actors that moved into a conflict section without a grant. Must be zero. */
  authorityViolations: number;
  rendered: RenderedStatus;
}

export function emptyPopulationStatus(): PopulationStatus {
  const kind = (): KindStatus => ({ active: 0, queued: 0, committed: 0, completed: 0, crossed: 0, longestWaitSeconds: 0, meanWaitSeconds: 0, pending: 0 });
  return {
    attached: false,
    simulatedSeconds: 0,
    pedestrians: kind(),
    vehicles: kind(),
    lifecycle: { spawned: 0, retired: 0, active: 0, reused: 0, generations: 0 },
    requestsLastTick: 0,
    grantsLastTick: 0,
    grants: 0,
    ticks: 0,
    refusedSpawns: [],
    refusedRoutes: [],
    retiredInPlace: 0,
    boundarySpawns: 0,
    authorityViolations: 0,
    rendered: { pedestrians: 0, vehicles: 0, near: 0, medium: 0, far: 0, attached: false },
  };
}

/**
 * Counts refusals by reason. Bounded on purpose: a run that refuses ten thousand
 * spawns must not report ten thousand distinct reasons, and the reason text is
 * stable (it carries counts and names, never a slot index).
 */
export class RefusalCounts {
  private readonly counts = new Map<string, number>();

  add(reason: string): void {
    this.counts.set(reason, (this.counts.get(reason) ?? 0) + 1);
  }

  snapshot(): RefusalStatus[] {
    return [...this.counts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
  }
}
