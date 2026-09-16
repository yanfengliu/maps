/**
 * The tick: one admission resolve per fixed step, and the design's six steps in
 * the design's order.
 *
 *   1. Advance no positions. Compute desired motion for both kinds from the
 *      current poses, the routes and the edge speed limits.
 *   2. Build the complete `AdmissionRequest` batch from actual footprints, actual
 *      measured dwell, actual measured gap and actual reserved receiving space.
 *   3. Call `admissions.resolve(step, requests)` exactly once. This advances the
 *      signal controller and returns the grants.
 *   4. Integrate only the motion the grants allow. An actor without a grant may
 *      not enter a conflict section; an actor inside one is never stopped
 *      mid-conflict.
 *   5. Call `admissions.observe(actorId, {...})` for every committed actor with
 *      its real progress, and `observeBoundaryEgress` for an actor in its egress
 *      envelope.
 *   6. Call `retireBoundary` only when the actual body has cleared.
 *
 * The order is enforced at run time, not asserted in a comment: `resolve` may
 * only be called from the resolve phase and integration may only run from the
 * integrate phase, so a mutation that swaps them throws instead of quietly
 * measuring a different city. The lifecycle work that closes a route (retiring a
 * cleared body, planning the next one) runs in its own phase that cannot move
 * anybody, so it cannot be used to smuggle a position write past admission.
 */

import { type AdmissionRequest, type AdmissionSnapshot, type JunctionAdmissions, type BoundaryActorBinding } from "../../network/admissions.ts";
import { createBoundaryEntryPassage, type RoutePassage } from "../../network/passages.ts";
import { boundaryProfile, boundaryProgress } from "../../network/boundaries.ts";
import { MAX_BOUNDARY_EGRESS_M } from "../../network/admission-bounds.ts";
import { footprintOccupies, type ActorFootprint } from "../../network/footprints.ts";
import type { LaneEdge, NetworkData } from "../../world/network-data.ts";
import type { VehicleAssetManifest } from "../../world/agent-assets.ts";
import type { WorldAgentPoses } from "../../world/agent-poses.ts";
import { PEDESTRIAN_DYNAMICS, VEHICLE_DYNAMICS, populationSettings, type PopulationSettings } from "./config.ts";
import {
  buildVehicleFrame, considerLaneChange, hasReceivingSpace as hasSpace, JunctionIndex, placeVehicle,
  stepLateral, vehicleAcceleration, vehicleFootprint, type Leader, type VehicleFrame,
} from "./vehicles.ts";
import {
  createPedestrianCrowd, occurrenceAt, orcaVelocity, pedestrianFootprint, placePedestrian,
  refreshPedestrianHash, type PedestrianCrowd,
} from "./pedestrians.ts";
import { RouteLibrary, populationActorRng, sampleRoute, vehicleScale, vehicleSpeedFactor, type PlannedRoute } from "./routes.ts";
import { createSlotTable, placeSlot, retireSlot, spawnSlot, stageSlot, stageVehicleSlots, type SlotTable } from "./slots.ts";
import { RefusalCounts, emptyPopulationStatus, type PopulationKind, type PopulationStatus } from "./status.ts";

/* ------------------------------------------------------------ phase enforcement */

/**
 * The phases of one tick, in order. Exported so a test can drive an out-of-order
 * tick and watch the ordering invariant fail rather than trusting source order.
 */
export const TICK_PHASES = Object.freeze(["lifecycle", "plan", "request", "resolve", "integrate", "close"] as const);
export type TickPhase = typeof TICK_PHASES[number];

/**
 * The ordering seam. The shipped population always uses `TICK_PHASES`; the only
 * way to change it is for a test to replace `phases` deliberately, which is how
 * the ordering gate is shown to go red. It is a mutable copy, so a replacement is
 * visible to the running population rather than silently shadowed.
 */
export const tickOrder: { phases: TickPhase[] } = { phases: [...TICK_PHASES] };

/**
 * Test seams for the three invariant gates, and the only way to make them fail.
 *
 * Each exists so a gate can be shown to go red rather than trusted. The shipped
 * population never sets any of them, and `createPopulation` resets them on
 * construction so a mutation cannot leak from one test into the next.
 */
export const populationInvariants: {
  /** When set, integration ignores the grant check — the single-authority mutation. */
  driveWithoutGrant: boolean;
  /** When set, the pedestrian curb hold is dropped too, so the mutation reaches pedestrians. */
  ignoreCurb: boolean;
  /** When set, a retired body is left present — the conservation mutation. */
  leakRetiredBody: boolean;
  /** Set by the population when an uncommitted hull reached a conflict area. */
  violations: number;
} = { driveWithoutGrant: false, ignoreCurb: false, leakRetiredBody: false, violations: 0 };

let phaseIndex = 0;

function requirePhase(name: TickPhase): void {
  const running = tickOrder.phases[phaseIndex];
  if (running !== name) {
    throw new Error(`Population tick order violation: the ${name} phase ran while the tick was in its ${running ?? "unknown"} phase. The design's order is ${tickOrder.phases.join(" -> ")}: admission resolve must complete before any position is integrated.`);
  }
}

/* ------------------------------------------------------------------ types */

export interface PopulationOptions {
  readonly network: NetworkData;
  readonly fleet: VehicleAssetManifest;
  readonly admissions: JunctionAdmissions;
  readonly settings: PopulationSettings;
}

/**
 * What one slot is doing, for a diagnostic that has to say *why* a body is not
 * moving. Deliberately a fresh plain object built on demand: nothing in `update`
 * reads it, so it cannot move a body or change a tick's arithmetic.
 */
export interface ActorDiagnostic {
  readonly slot: number;
  readonly generation: number;
  readonly active: boolean;
  /** True while the slot holds a plan but no active body: prepared at its portal. */
  readonly pending: boolean;
  readonly position: readonly [number, number, number];
  readonly speedMps: number;
  readonly travelledM: number;
  readonly stoppedSeconds: number;
  readonly routeEntryEdgeId: string | null;
  readonly routeEdges: number;
  readonly routeLengthM: number;
  readonly routeIndex: number;
  readonly junctionId: string | null;
  /** Delivered class index and its drawn scale, for a reader that needs the hull. */
  readonly variant: number;
  readonly scale: number;
  /** The projected collision hull the authority compares, when one is held. */
  readonly footprint: ActorFootprint | null;
  readonly committed: boolean;
  readonly egressing: boolean;
  readonly egressOffsetM: number;
  readonly retryTick: number;
}

export interface PopulationDiagnostics {
  readonly vehicles: readonly ActorDiagnostic[];
  readonly pedestrians: readonly ActorDiagnostic[];
  /** The authority's own snapshot, so a reader can attribute a wait to a junction. */
  readonly commitments: readonly AdmissionSnapshot[];
}

/** One tick's decision for one vehicle, from `traceVehicle`. */
export interface VehicleTickTrace {
  tick: number;
  seconds: number;
  active: boolean;
  pending: boolean;
  travelledM: number;
  speedMps: number;
  stoppedSeconds: number;
  committed: boolean;
  egressing: boolean;
  routeEdges: number;
  routeLengthM: number;
  routeIndex: number;
  junctionId: string | null;
  /** The halt the plan phase capped this body at, or null when nothing caps it. */
  stopDistanceM: number | null;
  requested: boolean;
  requestedRouteIndex: number | null;
  requestedJunctionId: string | null;
  requestedEntryGroup: string | null;
  holdsPrefix: boolean;
  leaseJunctionId: string | null;
  leaseRouteIndex: number | null;
  leaseEntered: boolean | null;
  entryEdgeId: string | null;
  /** The IDM leader gap the plan phase used this tick, or null when it had none. */
  leaderGapM: number | null;
  /** That leader's speed, as the car-following model saw it. */
  leaderSpeedMps: number | null;
  /** The acceleration the plan phase handed the integrator. */
  acceleration: number;
  /** IDM's free term for this body this tick, before any leader or halt cap. */
  freeAcceleration: number;
  /** Distance to the plan phase's own halt, as it saw it. */
  stoppingShortM: number | null;
}

export interface Population {
  readonly poses: WorldAgentPoses;
  update(step: number, simulatedSeconds: number): void;
  status(): PopulationStatus;
  /** True while any active actor is moving, which is what the still predicate needs. */
  moving(): boolean;
  /**
   * Per-slot state at the current tick. Read-only by construction: it builds a
   * description of the population and keeps no reference into it, so a diagnostic
   * cannot steer a body. It exists because "no vehicle is moving" is a symptom and
   * the cause is always in the slot's own route, gate and lease.
   */
  diagnostics(): PopulationDiagnostics;
  /**
   * Record one vehicle's tick-by-tick decisions from the next tick onward. A
   * diagnostic hook, off unless a caller asks for it: `update` writes to it only
   * when a slot is registered, and reads nothing from it.
   */
  traceVehicle(slot: number): VehicleTickTrace[];
  /**
   * The plan one vehicle slot is driving, or null when it holds none. Read-only:
   * the returned object is the frozen plan the population itself drives, so a
   * diagnostic can read a gate's own hold point rather than re-deriving it.
   */
  vehicleRoute(slot: number): PlannedRoute | null;
  dispose(): void;
}

interface Intent {
  acceleration: number;
  /** Route-absolute metres this vehicle may not pass while it holds no grant. */
  stopDistanceM: number;
  committed: boolean;
}

interface GateStop { distanceM: number; rule: "none" | "stop" | "yield" }

/**
 * How far out a body walks while it retires through the boundary.
 *
 * `MAX_BOUNDARY_EGRESS_M` is the contract's authored envelope for the body's
 * *origin*, and `boundaryProgress` measures the envelope from the portal point it
 * projects onto the AOI polygon — which the profile itself tolerates up to 0.02 m
 * off that polygon. The margin keeps the sum inside the envelope rather than on
 * it, and every supported class still clears: the longest body in the delivered
 * fleet is 5.53 m from its collision origin to its furthest hull vertex.
 */
const EGRESS_LIMIT_M = MAX_BOUNDARY_EGRESS_M - 0.05;

/* --------------------------------------------------------------- the population */

export function createPopulation(options: PopulationOptions): Population {
  const settings = populationSettings(options.settings);
  const { network, fleet, admissions } = options;
  if (settings.pedestrians === 0 && settings.vehicles === 0) {
    throw new Error("createPopulation was given an empty population; the population-free path is the absence of a population (?agents=0), not an empty one.");
  }
  // A mutation from an earlier test never leaks into this population.
  populationInvariants.driveWithoutGrant = false;
  populationInvariants.leakRetiredBody = false;
  populationInvariants.ignoreCurb = false;
  populationInvariants.violations = 0;
  const table: SlotTable = createSlotTable(settings);
  const refusals = new RefusalCounts();
  const routes = new RouteLibrary(network, refusals);
  const junctionsById = new Map(network.junctions.map((junction) => [junction.id, junction]));
  const junctionIndex = new JunctionIndex(network);
  const laneById = new Map(network.lanes.map((lane) => [lane.id, lane]));
  const crowd: PedestrianCrowd = createPedestrianCrowd(table);
  const vehicleFootprints = new Array<ActorFootprint | undefined>(settings.vehicles);
  const pedestrianFootprints = new Array<ActorFootprint | undefined>(settings.pedestrians);
  const vehicleRadii = new Float64Array(settings.vehicles);
  const requests = new Array<AdmissionRequest | undefined>(settings.pedestrians + settings.vehicles);
  const gateFootprints = new Array<ActorFootprint | undefined>(settings.pedestrians + settings.vehicles);
  const bindings = new Array<BoundaryActorBinding | undefined>(settings.vehicles);
  /** The authority's own entry passage for a bound vehicle, until its prefix clears. */
  const entryPassages = new Array<RoutePassage | null>(settings.vehicles).fill(null);
  /** The exact passage object each committed actor holds, so it observes with that one. */
  const heldPassages = new Array<RoutePassage | undefined>(settings.pedestrians + settings.vehicles);
  /**
   * The occurrence the authority holds for each committed actor, read from its
   * own `snapshot()` at the head of every request phase. This is the only floor a
   * request occurrence may be built from: the authority is the only party that
   * knows what it holds, and a population-side copy drifts the moment a request
   * is refused, a grant expires or a slot is replanned.
   *
   * `lastConflictIndex` is stored beside it because it identifies *which* passage
   * the authority holds. Only a physical-only boundary prefix carries `-1`
   * (`createBoundaryEntryPassage`'s own signature), so that one value separates
   * the prefix lease from a route gate's lease without guessing.
   */
  const authorityLeaseByActor = new Map<string, { routeIndex: number; lastConflictIndex: number; entered: boolean }>();
  /**
   * How close to a gate's own stop line a body must have come before it asks for
   * that gate.
   *
   * The stop line is where `gateStop` and the walking halt put the body, and it is
   * the only place the body can offer the *measured* eligibility the contract asks
   * for. Asking from further back is not admission-weakening — the authority still
   * decides — but it lets a body 200 m from a junction accumulate the eligible age
   * that the two-second priority bucket exists to give the bodies actually waiting
   * at the kerb, and it holds that junction for the whole approach. The tolerance
   * only absorbs the discrete approach: a vehicle lands on its halt exactly, and a
   * walker's acceleration ramp closes the last centimetres over a few ticks, so a
   * body at its stop line always satisfies this and never waits for a window.
   */
  const GATE_SEEK_TOLERANCE_M = 0.35;
  /**
   * How close to its halt, and how slow, a body must already be before the
   * integrator moves it exactly onto that halt. `HALT_CAPTURE_M` is smaller than
   * the request tolerance on purpose: the body is snapped to the stop line it was
   * given, so the request window is satisfied with room to spare and by the true
   * position rather than by a tolerance.
   */
  const HALT_CAPTURE_M = 1.5;
  const HALT_CAPTURE_SPEED_MPS = 1.5;
  const pending = new Set<number>();
  const planQueue: { kind: PopulationKind; slot: number }[] = [];
  const intents: Intent[] = Array.from({ length: settings.vehicles }, () => ({ acceleration: 0, stopDistanceM: Number.POSITIVE_INFINITY, committed: false }));
  let frame: VehicleFrame | null = null;
  /** Slots a caller asked to trace, and the records for them. Empty unless asked. */
  const trace = new Map<number, VehicleTickTrace[]>();
  /** Last plan-phase decision per slot, read only by `traceTick`. */
  const planDecision = new Array<{ freeAcceleration: number; stoppingShortM: number | null } | undefined>(settings.vehicles);

  /** Entry portals that start on a sidewalk: a crossing entry would stage a body on the roadway. */
  const vehiclePortals = [...network.portals.vehicleEntry].sort();
  /** Per class: the portals whose routes this body size can halt on. */
  const vehiclePortalsByClass: string[][] = [];
  let routablePortals = 0;

  /** Whether a body of this size may halt on an edge: its own section must be longer than its radius. */
  function canHalt(edgeId: string, radiusM: number): boolean {
    const edge = laneById.get(edgeId);
    return edge === undefined || edge.junctionId === null || edge.lengthM >= radiusM;
  }

  /**
   * Whether the entrance portal is clear for a new body.
   *
   * The route planner draws a fresh plan per slot, so two vehicles at one portal
   * hold *different* `PlannedRoute` objects that begin at the same point. Two
   * bodies at one point read as a zero-metre car-following gap, and the IDM
   * braking term is unbounded there, so the pair can never separate again: the
   * follower is held at exactly its leader's speed while the leader is itself
   * waiting for a grant outside the conflict area. The separation is therefore
   * measured in the world, from the pose buffers the population has already
   * written, and a spawn waits for the portal to clear.
   */
  function spawnClearance(slot: number, radiusM: number): boolean {
    const gapM = 2 * radiusM + network.admissionBounds.stopGapM;
    const here = slot * 3;
    for (const other of table.vehicles) {
      if (other.slot === slot || !table.poses.vehicles.active[other.slot]) continue;
      if (other.travelledM >= gapM) continue;
      const there = other.slot * 3;
      if (Math.hypot(table.poses.vehicles.current.position[there]! - table.poses.vehicles.current.position[here]!, table.poses.vehicles.current.position[there + 2]! - table.poses.vehicles.current.position[here + 2]!) < gapM) return false;
    }
    return true;
  }

  const pedestrianPortals = [...network.portals.pedestrian]
    .filter((id) => network.walks.some((walk) => walk.id === id && walk.junctionId === null && occurrenceStartsOutside(id)))
    .sort();
  function occurrenceStartsOutside(id: string): boolean {
    const edge = network.walks.find((walk) => walk.id === id);
    return Boolean(edge) && edge!.points.length >= 2;
  }
  if (settings.pedestrians > 0 && pedestrianPortals.length === 0) {
    throw new Error("No walking portal starts a route outside every conflict authority, so no pedestrian can be staged on a sidewalk. The delivered walking graph changed; rebuild it before running a population.");
  }
  if (settings.vehicles > 0) {
    for (const asset of fleet.vehicles) {
      const radius = Math.hypot(asset.collision.length, asset.collision.width) / 2 * 1.04;
      vehiclePortalsByClass.push(routes.drivablePortals(routes.vehicleGraph, vehiclePortals, { footprintRadiusM: radius, maxEdges: 120, viable: (id) => canHalt(id, radius) }));
    }
    routablePortals = Math.max(...vehiclePortalsByClass.map((list) => list.length), 0);
    if (routablePortals === 0) {
      throw new Error(`No vehicle class has an AOI entry portal it can drive from: the delivered lane graph's junction entry sections are all shorter than the shortest class's footprint radius. This is a network geometry limitation, not a spawn setting; report it rather than driving a body it cannot hold.`);
    }
  }

  const counters = {
    spawned: { vehicle: 0, pedestrian: 0 },
    retired: { vehicle: 0, pedestrian: 0 },
    completed: { vehicle: 0, pedestrian: 0 },
    crossed: { vehicle: 0, pedestrian: 0 },
    longestWait: { vehicle: 0, pedestrian: 0 },
    waitTotal: { vehicle: 0, pedestrian: 0 },
    waitSamples: { vehicle: 0, pedestrian: 0 },
    boundarySpawns: 0,
    retiredInPlace: 0,
    violations: 0,
    missingPassage: 0,
    authorityRefusals: 0,
    authorityViolations: 0,
    stalledLease: 0,
    passageRouteMismatch: 0,
    requestsLastTick: 0,
    grantsLastTick: 0,
    grants: 0,
    ticks: 0,
    simulatedSeconds: 0,
    moving: false,
  };

  const actorId = (kind: PopulationKind, slot: number): string => `${kind}:${slot}`;
  /** One second between spawn attempts for a slot whose portal set refused it. */
  const RETRY_TICKS = 60;

  /* --------------------------------------------------------------- planning */

  function planSlot(kind: PopulationKind, slot: number): boolean {
    // A slot may only be planned when the authority holds nothing for it. Any
    // other state means a previous generation's commitment outlived its route,
    // and the authority would then refuse the new route's every request. The slot
    // waits instead of planning: the alternative is a body whose every request is
    // refused, which reads as a stall a thousand ticks later in a message about
    // passages nothing in this module can see.
    const leaked = admissions.snapshot().find((commitment) => commitment.actorId === actorId(kind, slot));
    if (leaked) {
      refusals.add(`${kind} slot ${slot} is waiting for ${leaked.junctionId} to release its previous generation's lease at route occurrence ${leaked.routeIndex} before it can be planned again`);
      const state = kind === "vehicle" ? table.vehicles[slot]! : table.pedestrians[slot]!;
      state.retryTick = counters.ticks + RETRY_TICKS;
      return false;
    }
    const retry = () => {
      // A refused spawn is retried on a bounded schedule rather than every tick:
      // the refusal is structural (this slot's portal set is too small for this
      // body), so retrying immediately only burns the tick.
      const state = kind === "vehicle" ? table.vehicles[slot]! : table.pedestrians[slot]!;
      state.retryTick = counters.ticks + RETRY_TICKS;
    };
    if (kind === "vehicle") {
      const state = table.vehicles[slot]!;
      const generation = table.poses.vehicles.current.generation[slot]! + 1;
      const rng = populationActorRng(settings.seed, kind, slot, generation);
      const variant = Math.floor(rng() * table.vehicleVariants);
      const asset = fleet.vehicles[variant];
      if (!asset) throw new Error(`Vehicle slot ${slot} drew class index ${variant}; the delivered fleet has ${fleet.vehicles.length} classes in VEHICLE_CLASSES order.`);
      const scale = vehicleScale(rng, asset);
      state.variant = variant;
      state.scale = scale;
      table.poses.vehicles.variant[slot] = variant;
      table.poses.vehicles.scale[slot] = scale;
      const radius = Math.hypot(asset.collision.length, asset.collision.width) * scale / 2;
      vehicleRadii[slot] = radius;
      // A portal is drawn only from the set this body size can actually leave:
      // the class's own radius decides which junction entry sections it can halt
      // on, and a portal with no such route is not demand, it is a refusal.
      const portals = vehiclePortalsByClass[variant] ?? [];
      if (!portals.length) {
        refusals.add(`vehicle class ${asset.id} at scale ${scale.toFixed(3)} has no AOI entry portal whose junction sections are long enough for its ${radius.toFixed(3)} m footprint radius`);
        retry();
        return false;
      }
      const entry = portals[Math.min(portals.length - 1, Math.floor(rng() * portals.length))]!;
      const route = routes.route(kind, slot, generation, entry, { footprintRadiusM: radius, maxEdges: 120, walkAttempts: 3, viable: (id) => canHalt(id, radius) });
      if (!route) {
        refusals.add(`vehicle spawn at ${entry} planned no drivable route to a true AOI exit that a ${radius.toFixed(3)} m body can halt on`);
        retry();
        return false;
      }
      table.vehicleRoutes[slot] = route;
      state.generation = generation;
      state.travelledM = 0;
      state.observedM = -1e9;
      state.speedMps = 0;
      state.stoppedSeconds = 0;
      state.committed = false;
      state.boundary = false;
      state.egressing = false;
      state.egressOffsetM = 0;
      state.laneIndex = 0;
      state.targetLaneIndex = 0;
      state.frontSteeringRadians = 0;
      state.speedFactor = vehicleSpeedFactor(rng);
      placeVehicle(table, slot, 0, 0);
      // The body now stands at its portal, so the clearance is a measurement of
      // the world rather than a guess about the plan. A refused spawn leaves
      // nothing registered, so the slot is retried rather than left half-present.
      if (!spawnClearance(slot, radius)) {
        refusals.add(`vehicle spawn at ${entry} is waiting for the entrance portal to clear: another body is still within ${(2 * radius + network.admissionBounds.stopGapM).toFixed(2)} m of it`);
        table.vehicleRoutes[slot] = null;
        retry();
        return false;
      }
      const footprint = vehicleFootprint(fleet, table, slot);
      let entryPassage: RoutePassage | null = null;
      try {
        entryPassage = createBoundaryEntryPassage(network, "vehicle", route.edgeIds, footprint);
      } catch (error) {
        refusals.add(`vehicle spawn at ${entry} could not evaluate its entry authority: ${(error as Error).message.split(";")[0]}`);
      }
      // The slot's next generation becomes current *before* the bind, and never
      // after it: the binding records this generation, and the renderer blends the
      // two pose halves, so both halves must carry it or a respawned slot is drawn
      // flying across the city from wherever it last was.
      const prepared = (table.poses.vehicles.current.generation[slot]! + 1) >>> 0;
      table.poses.vehicles.current.generation[slot] = prepared;
      // The contract prepares a materializing body as an *inactive* current pose at
      // its actual entrance portal, and `activateBoundary` is what sets the active
      // byte. So the slot is staged, not spawned, and materialization is activation.
      stageVehicleSlots(table.poses.vehicles, slot);
      try {
        // Every vehicle is bound, not only the ones whose portal body overlaps an
        // authority. The boundary lifecycle is the contract's path for *outgoing*
        // actors: a body that reaches its AOI terminus retires through the authored
        // envelope, with its whole hull outside the AOI side. A body that is not
        // bound can only vanish on the network, which is what `retiredInPlace`
        // counts — 54 of 120 spawns in the 200-vehicle run before this.
        bindings[slot] = admissions.bindBoundaryActor(actorId("vehicle", slot), "vehicle", slot, table.poses.vehicles, route.edgeIds);
        state.boundary = true;
        state.generation = prepared;
        if (entryPassage !== null) {
          // The portal's own authority contains the prepared body, so it stays an
          // inactive pose at the portal until the authority grants its entry prefix.
          // Materializing it first put an unadmitted hull inside a conflict area on
          // the spawn tick, which the single-authority invariant counts.
          //
          // The entry passage is the authority's own object for this route's
          // overlap with the portal's junction. `activateBoundary` commits the actor
          // to exactly that object, so the actor must ask with exactly that object
          // until the prefix clears: a body may not hold one passage and request
          // another.
          entryPassages[slot] = entryPassage;
          pending.add(slot);
          counters.boundarySpawns += 1;
        } else {
          // Nothing at this portal owns the materializing body, so there is no
          // admission to resolve before materializing: `activateBoundary` finds no
          // touched authority and records no commitment, and the vehicle's own route
          // gates govern it from its first governed occurrence onward.
          admissions.activateBoundary(bindings[slot]!, footprint);
        }
        counters.spawned.vehicle += 1;
        return true;
      } catch (error) {
        refusals.add(`vehicle spawn at ${entry} could not bind its boundary lifecycle: ${(error as Error).message.split(";")[0]}`);
        table.vehicleRoutes[slot] = null;
        entryPassages[slot] = null;
        bindings[slot] = undefined;
        pending.delete(slot);
        retry();
        return false;
      }
    }
    const state = table.pedestrians[slot]!;
    const generation = table.poses.pedestrians.current.generation[slot]! + 1;
    const rng = populationActorRng(settings.seed, kind, slot, generation);
    const entry = pedestrianPortals[Math.min(pedestrianPortals.length - 1, Math.floor(rng() * pedestrianPortals.length))]!;
    const scale = PEDESTRIAN_DYNAMICS.minimumScale + rng() * (PEDESTRIAN_DYNAMICS.maximumScale - PEDESTRIAN_DYNAMICS.minimumScale);
    const variant = Math.floor(rng() * table.pedestrianVariants);
    state.variant = variant;
    state.scale = scale;
    state.cadenceMps = PEDESTRIAN_DYNAMICS.cadenceMps * scale;
    table.poses.pedestrians.variant[slot] = variant;
    table.poses.pedestrians.scale[slot] = scale;
    const route = routes.route(kind, slot, generation, entry, { footprintRadiusM: PEDESTRIAN_DYNAMICS.radiusM * scale, maxEdges: 120, walkAttempts: 3 });
    if (!route) {
      refusals.add(`pedestrian spawn at ${entry} planned no route to a true AOI exit inside its walking component`);
      retry();
      return false;
    }
    table.pedestrianRoutes[slot] = route;
    state.generation = generation;
    state.travelledM = 0;
    state.observedM = -1e9;
    state.speedMps = 0;
    state.stoppedSeconds = 0;
    state.queued = false;
    state.committed = false;
    crowd.committed[slot] = 0;
    pedestrianFootprints[slot] = undefined;
    placePedestrian(table, slot);
    spawnSlot(table.poses.pedestrians, slot);
    state.generation = table.poses.pedestrians.current.generation[slot]!;
    counters.spawned.pedestrian += 1;
    return true;
  }

  /* ------------------------------------------------------------- lifecycle */

  function lifecycle(): void {
    requirePhase("lifecycle");
    // One: complete an egress whose body has cleared the AOI side, or record why
    // it could not. `retireBoundary` is the only path that clears a bound body.
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (!table.poses.vehicles.active[slot] || !state.egressing) continue;
      const route = table.vehicleRoutes[slot]!;
      const last = route.edges.length - 1;
      const lastEdge = route.edges[last]!;
      const profile = boundaryProfile(network, "vehicle", lastEdge);
      const binding = bindings[slot];
      const footprint = vehicleFootprint(fleet, table, slot);
      if (!binding) {
        finishVehicle(slot, false, `vehicle route from ${route.entryEdgeId} reached its AOI terminus without a boundary binding`);
        continue;
      }
      if (!profile) {
        finishVehicle(slot, false, `vehicle route from ${route.entryEdgeId} ends at ${lastEdge.id}, which is not a true AOI exit portal`);
        continue;
      }
      const progress = boundaryProgress(profile, footprint);
      // The contract's egress observation is `routeIndex: last` with the last
      // edge's *own* length: the outward displacement lives in the pose, and
      // `validateBoundaryEgress` refuses any arc distance past the terminus
      // (`must complete its actual terminal route occurrence before egress`).
      // Reporting `egressOffsetM` as arc distance is what threw on the second
      // egress tick and left no vehicle able to retire through the boundary.
      const observation = { routeIndex: last, distanceM: lastEdge.lengthM, footprint };
      admissions.observeBoundaryEgress(binding, observation);
      if (!progress.fullyOutside) {
        // The body is still crossing the authored envelope. It is bounded, so a
        // body that reaches the envelope's limit without clearing every hull vertex
        // can never clear it, and the slot is retired by name rather than left
        // walking outward forever.
        if (state.egressOffsetM < EGRESS_LIMIT_M - 1e-9) continue;
        finishVehicle(slot, false, `vehicle route from ${route.entryEdgeId} reached the ${EGRESS_LIMIT_M.toFixed(2)} m outward envelope at ${profile.edgeId} with part of its hull still inside the AOI`);
        continue;
      }
      admissions.retireBoundary(binding, observation);
      bindings[slot] = undefined;
      entryPassages[slot] = null;
      heldPassages[slot + settings.pedestrians] = undefined;
      // The leak mutation covers *every* retirement path, not only `finishVehicle`:
      // a mutation that only guards one of them is a gate that cannot see the other.
      // Measured on the delivered network, every vehicle retirement inside this
      // gate's fixture goes through the boundary envelope, so the earlier guard in
      // `finishVehicle` alone left the mutation with nothing to leak and the gate
      // green while proving nothing.
      // `retireSlot` alone cannot carry it here: `JunctionAdmissions.retireBoundary`
      // clears the slot's active byte itself, so guarding only that call is inert.
      // The mutation has to restore the presence the authority cleared for the leak
      // to exist at all, and the plan queue below must not re-plan the slot in the
      // same phase or the leak heals before any reading sees it.
      if (populationInvariants.leakRetiredBody) table.poses.vehicles.active[slot] = 1;
      else retireSlot(table.poses.vehicles, slot);
      state.committed = false;
      state.boundary = false;
      state.egressing = false;
      table.vehicleRoutes[slot] = null;
      vehicleFootprints[slot] = undefined;
      requests[slot + settings.pedestrians] = undefined;
      gateFootprints[slot + settings.pedestrians] = undefined;
      counters.retired.vehicle += 1;
      counters.completed.vehicle += 1;
      planQueue.push({ kind: "vehicle", slot });
    }
    for (const state of table.pedestrians) {
      const slot = state.slot;
      if (table.poses.pedestrians.active[slot]) continue;
      if (table.pedestrianRoutes[slot] === null) planQueue.push({ kind: "pedestrian", slot });
      void state;
    }
    // Two: reuse the freed slots. Nothing here writes a position.
    // A slot is planned once per tick whichever way it reached this queue, so a
    // retirement and the population-start sweep below cannot spawn one body twice.
    const claimed = new Set<number>();
    let budget = planQueue.length;
    while (planQueue.length && budget-- > 0) {
      const next = planQueue.shift()!;
      const key = (next.kind === "vehicle" ? 1 << 20 : 0) + next.slot;
      if (claimed.has(key)) continue;
      claimed.add(key);
      planSlot(next.kind, next.slot);
    }
    // Three: start the population, staggered across the spawn interval so the
    // queue forms over time rather than all asking the authority at once.
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (claimed.has((1 << 20) + slot)) continue;
      if (table.vehicleRoutes[slot] !== null) continue;
      if (table.poses.vehicles.active[slot]) continue;
      if (state.retryTick > counters.ticks) continue;
      const offset = slot % settings.spawnIntervalTicks;
      if ((counters.ticks - 1) % settings.spawnIntervalTicks !== offset) continue;
      claimed.add((1 << 20) + slot);
      planSlot("vehicle", slot);
    }
    for (const state of table.pedestrians) {
      const slot = state.slot;
      if (claimed.has(slot)) continue;
      if (table.pedestrianRoutes[slot] !== null) continue;
      if (table.poses.pedestrians.active[slot]) continue;
      if (state.retryTick > counters.ticks) continue;
      const offset = slot % settings.spawnIntervalTicks;
      if ((counters.ticks - 1) % settings.spawnIntervalTicks !== offset) continue;
      claimed.add(slot);
      planSlot("pedestrian", slot);
    }
  }

  /**
   * Drop whatever the authority still holds for one actor, before its slot is
   * reused. `cancelPending` handles an unentered grant. An entered commitment
   * cannot be cancelled — correctly, since a held body may not vanish — but once
   * the body has reached its own route's terminus, reporting the terminal
   * occurrence with the body's real footprint is exactly the observation the
   * authority's release test accepts, and the commitment goes with it.
   */
  function releaseCommitment(kind: PopulationKind, slot: number): void {
    const id = actorId(kind, slot);
    if (!admissions.snapshot().some((commitment) => commitment.actorId === id)) return;
    if (admissions.cancelPending(id)) return;
    const route = kind === "vehicle" ? table.vehicleRoutes[slot] : table.pedestrianRoutes[slot];
    if (!route) return;
    const footprint = kind === "vehicle" ? vehicleFootprint(fleet, table, slot) : undefined;
    if (!footprint) return;
    const last = route.edges.length - 1;
    // Report where the body actually is, not the route's terminus: the authority
    // rejects an observation whose footprint does not describe a body that has
    // traversed the occurrence it names, so naming the terminus for a body still
    // mid-route throws instead of releasing anything. A body that did reach the
    // terminus is reported there, which is the observation the release test wants.
    const state = kind === "vehicle" ? table.vehicles[slot]! : table.pedestrians[slot]!;
    const reached = occurrenceAtDistance(route, state.travelledM);
    const index = state.travelledM >= route.totalLengthM - 1e-6 ? last : reached;
    const local = Math.max(0, Math.min(route.edges[index]!.lengthM, state.travelledM - route.starts[index]!));
    try {
      admissions.observe(id, { routeIndex: index, distanceM: local, footprint });
    } catch (error) {
      refusals.add(`${kind} slot ${slot} could not hand back its lease while retiring: ${(error as Error).message.split(";")[0]}`);
    }
  }

  function finishVehicle(slot: number, throughBoundary: boolean, reason: string): void {
    if (!throughBoundary) {
      counters.retiredInPlace += 1;
      refusals.add(`${reason}, so it retired on the network rather than through the boundary envelope`);
      // A body that never activated cannot retire through `retireBoundary`, and
      // an unentered grant is the only thing the authority cancels without a
      // cleared body. Whatever remains of this slot's lifecycle goes with it, so
      // the slot is genuinely free for its next generation.
      releaseCommitment("vehicle", slot);
      admissions.cancelPending(actorId("vehicle", slot));
      bindings[slot] = undefined;
    }
    entryPassages[slot] = null;
    heldPassages[slot + settings.pedestrians] = undefined;
    if (!populationInvariants.leakRetiredBody) retireSlot(table.poses.vehicles, slot);
    const state = table.vehicles[slot]!;
    state.committed = false;
    state.boundary = false;
    state.egressing = false;
    table.vehicleRoutes[slot] = null;
    vehicleFootprints[slot] = undefined;
    requests[slot + settings.pedestrians] = undefined;
    gateFootprints[slot + settings.pedestrians] = undefined;
    counters.retired.vehicle += 1;
    if (throughBoundary) counters.completed.vehicle += 1;
    if (!populationInvariants.leakRetiredBody) planQueue.push({ kind: "vehicle", slot });
  }

  /* ------------------------------------------------------------------ plan */

  function plan(step: number): void {
    requirePhase("plan");
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (!table.poses.vehicles.active[slot]) {
        intents[slot] = { acceleration: 0, stopDistanceM: Number.POSITIVE_INFINITY, committed: false };
        vehicleFootprints[slot] = undefined;
        continue;
      }
      const route = table.vehicleRoutes[slot];
      if (route === null) {
        // A present body with no route is a leak, and saying so is the whole
        // point of the conservation gate: it must fail here, by name, rather than
        // as a property read on null three frames later.
        throw new Error(`Population lifecycle conservation failed: vehicle slot ${slot} is present in the pose buffers with no planned route. A body was retired without clearing its slot.`);
      }
      vehicleFootprints[slot] = vehicleFootprint(fleet, table, slot);
      const radius = vehicleRadii[slot]!;
      // Two different obligations, and only one of them ends at the grant. A gate
      // is a *permission*: it stops a body that holds no grant, and a committed
      // body is never stopped mid-conflict. A mapped stop or yield obligation is
      // a *condition of the passage*: the body must dwell at it and the authority
      // refuses any observation whose hull reaches a control it has not cleared,
      // so that hold applies whether or not the compound has been entered.
      const gate = state.committed ? gateStop(route!, state.travelledM, heldPassages[slot + settings.pedestrians]) : gateStop(route!, state.travelledM);
      const control = controlStop(route!, state.travelledM, radius);
      intents[slot] = {
        acceleration: 0,
        // The single-authority mutation: an uncommitted body ignores the halt it
        // was given and drives on. That is the defect class this gate exists to
        // catch — a hull arriving in a conflict area on no grant — and it is
        // counted by the invariant below rather than driven silently.
        stopDistanceM: populationInvariants.driveWithoutGrant ? Number.POSITIVE_INFINITY : Math.min(gate.distanceM, control.distanceM),
        committed: state.committed,
      };
    }
    // Step 5 of the design's order, nested at the head of step 1: report the
    // progress the previous integration actually made, so a released actor is
    // free to ask for its next passage in this same tick rather than a tick late.
    observeCommitted();
    frame = buildVehicleFrame(table, vehicleFootprints, (junctionId, footprint) => {
      const junction = junctionsById.get(junctionId);
      return junction ? footprintOccupies(junction, footprint) : false;
    }, junctionIndex);
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (!table.poses.vehicles.active[slot]) continue;
      const route = table.vehicleRoutes[slot]!;
      const edge = route.edges[state.routeIndex]! as LaneEdge;
      const intent = intents[slot]!;
      // Route metres left before the halt the plan phase chose, this tick.
      const stopping = intent.stopDistanceM - state.travelledM;
      const desired = Math.max(0.5, edge.speedMps * state.speedFactor);
      considerLaneChange(network, table, frame, slot, edge, desired);
      const haltLeader: Leader | null = Number.isFinite(intent.stopDistanceM) ? { gapM: Math.max(0, stopping), speedMps: 0 } : null;
      const aheadLeader = frame.ahead[slot] ?? null;
      // The nearest obstacle wins, and the halt is one of them.
      const obstacle = aheadLeader === null ? haltLeader : haltLeader === null ? aheadLeader : aheadLeader.gapM <= haltLeader.gapM ? aheadLeader : haltLeader;
      let acceleration = vehicleAcceleration(state.speedMps, desired, obstacle);
      const freeAcceleration = vehicleAcceleration(state.speedMps, desired, null);
      intent.acceleration = acceleration;
      planDecision[slot] = { freeAcceleration: Number(freeAcceleration.toFixed(4)), stoppingShortM: Number.isFinite(intent.stopDistanceM) ? Number(stopping.toFixed(3)) : null };
    }
    void step;
  }

  /**
   * The gate governing the occurrence a walk is on, or the next one. This is the
   * halting gate for an uncommitted walk: a walking route can *start* inside a
   * crossing — the delivered walking portals include crossings — so a gate whose
   * own stop line is behind the walk is still the gate it must be admitted into,
   * and asking for the one after it instead left the walk frozen at a curb it was
   * already standing past.
   */
  function gateAtOrAhead(route: PlannedRoute, travelledM: number) {
    const occurrence = occurrenceAtDistance(route, travelledM);
    return route.gates.find((gate) => gate.entryIndex === occurrence) ?? route.gates.find((gate) => gate.entryIndex > occurrence);
  }

  /**
   * The first gate at or ahead of the body that a held lease does not already
   * admit it through.
   *
   * A compound can own several consecutive governed occurrences, and the route
   * planner builds one gate per governed occurrence, so a body inside a
   * two-occurrence crossing meets a *second* gate of the same junction a metre
   * ahead of it. That gate's stop line is behind the body, so halting at it froze
   * the body on the spot while it held the compound's lease: nothing released, and
   * every other actor queued behind a lease that could never be given back. A body
   * clearing a compound is capped instead at the first gate of a *different*
   * authority, which is the one it may not enter until its old hull has cleared and
   * the old lease has gone — the contract's own rule for entering another
   * authority.
   */
  function gateBeyond(route: PlannedRoute, travelledM: number, lease: RoutePassage | undefined) {
    return route.gates.find(
      (gate) => gate.gateDistanceM >= travelledM - 1e-6 && (lease === undefined || gate.junctionId !== lease.junctionId),
    );
  }

  /**
   * Route-absolute metres a body may not pass while its compound's permission is
   * missing: the body's collision front halts at the gate, so its origin halts a
   * footprint radius short of it.
   */
  function gateStop(route: PlannedRoute, travelledM: number, lease?: RoutePassage): GateStop {
    // The first gate the body has not yet reached, whether or not it is close to
    // it. Seeking the gate from any distance is what makes the halt and the
    // request one place: a body that was only capped once it happened to arrive
    // drove to its next junction unadmitted and then stopped half a metre
    // *before* the window in which the authority accepts a request, so it could
    // never ask at all.
    const gate = gateBeyond(route, travelledM, lease);
    if (!gate) return { distanceM: Number.POSITIVE_INFINITY, rule: "none" };
    // The body halts with its whole hull exactly at the gate and never on it:
    // that is precisely the arc distance the planner's own `holdDistanceM`
    // records, and the point at which the authority's request window opens. One
    // formula, so the place the body stands and the place it may ask cannot drift
    // apart. The planner already applies the whole-hull offset for this body's
    // own footprint radius; the shared stop gap separates two bodies, not a body
    // from the area it is waiting to enter.
    return { distanceM: Math.max(0, gate.holdDistanceM), rule: "none" };
  }

  /**
   * The mapped stop/yield obligation the body has yet to clear, if any.
   *
   * This is the minimal correct stop-line offset policy: a mapped obligation
   * binds the *front of the body*, so the origin is held exactly one footprint
   * radius short of the mapped position. Without it a stop line nearer the gate
   * than half the largest vehicle makes the authority refuse the actor's own
   * progress — the geometry `artifacts/population-cost/report.md` excluded two
   * planned routes for. The hold applies whether or not the compound has been
   * entered, because a mapped control is a condition of the passage rather than
   * the permission to enter it.
   */
  function controlStop(route: PlannedRoute, travelledM: number, radiusM: number): GateStop {
    let stop: GateStop = { distanceM: Number.POSITIVE_INFINITY, rule: "none" };
    for (const gate of route.gates) {
      // A control inside a compound the body has already entered is not a halt
      // any more: the body is clearing on its grant, and the authority's release
      // test needs its hull to leave the compound's disks. Holding it at an
      // internal line would deadlock both the body and the lease it holds.
      if (travelledM > gate.gateDistanceM - radiusM + 1e-6) continue;
      for (const control of gate.controls) {
        const distanceM = gate.gateDistanceM + control.distanceM - radiusM;
        if (distanceM < travelledM - 1e-6) continue;
        if (distanceM < stop.distanceM) stop = { distanceM: Math.max(0, distanceM), rule: control.rule };
      }
    }
    return stop;
  }

  /* --------------------------------------------------------------- request */

  function assembleRequests(): number {
    requirePhase("request");
    let count = 0;
    // Every slot's request is rebuilt from live state each tick. A request left
    // over from an earlier tick describes a passage the slot may no longer hold,
    // and handing that to the authority is exactly the stale-request defect the
    // population-cost probe's own precondition existed to catch.
    requests.fill(undefined);
    // One reading of the authority's own state per tick, reused by every slot: it
    // is the floor a request occurrence is built from, and the only way to tell
    // which passage the authority actually holds. Taken here, after the plan
    // phase's observations, so it is this tick's truth rather than last tick's.
    authorityLeaseByActor.clear();
    for (const commitment of admissions.snapshot()) {
      authorityLeaseByActor.set(commitment.actorId, { routeIndex: commitment.routeIndex, lastConflictIndex: commitment.lastConflictIndex, entered: commitment.entered });
    }
    for (const state of table.vehicles) {
      const slot = state.slot;
      const index = slot + settings.pedestrians;
      const route = table.vehicleRoutes[slot];
      if (!route) continue;
      const footprint = vehicleFootprints[slot] ?? vehicleFootprint(fleet, table, slot);
      const actor = actorId("vehicle", slot);
      const held = authorityLeaseByActor.get(actor);
      const entryPrefix = entryPassages[slot];
      // A vehicle under its portal's initial authority asks with the authority's
      // own entry-prefix passage, at that passage's own occurrence, before it asks
      // for anything on the route.
      //
      // This is the one lease a route's own gates cannot express. The delivered
      // graph's entry portals are approach sections split from the conflict
      // section, and a junction's conservative disk reaches further along the
      // approach than the sections it governs, so a materializing vehicle's hull
      // sits inside a conflict area whose owner no route occurrence carries. The
      // prefix passage is exactly that owner (`lastConflictIndex: -1`, no invented
      // edge, no stop), and the authority releases it once the whole projected
      // body has left the initial disk. Without this branch the body materialized
      // with no lease at all, could not ask at any route occurrence, and stayed
      // uncommitted inside the disk until the enforcement retired it.
      //
      // Whether the body still holds that prefix is read from the authority, not
      // inferred from where the body has driven: `lastConflictIndex: -1` is the
      // prefix's own signature, and only the authority knows whether its release
      // has fired yet. While it holds the prefix, the prefix object is the only
      // passage this actor may name — asking with a route gate's passage instead is
      // the passage swap the authority refuses.
      const underPrefix = held !== undefined && held.lastConflictIndex === -1 && entryPrefix !== null && entryPrefix !== undefined;
      const prepared = pending.has(slot) && !table.poses.vehicles.active[slot];
      if (underPrefix || prepared) {
        if (entryPrefix === null || entryPrefix === undefined) {
          counters.missingPassage += 1;
          continue;
        }
        requests[index] = {
          actorId: actor,
          kind: "vehicle",
          entryEdgeId: route.edgeIds[0]!,
          passage: entryPrefix,
          routeIndex: entryPrefix.entryIndex,
          footprint,
          stoppedSeconds: state.stoppedSeconds,
          yieldSatisfied: !trafficInside(entryPrefix.junctionId, slot),
          receivingSpace: true,
        };
        // A nomination while nothing is held, the held lease itself once the grant
        // lands: either way the prefix object is the only passage this actor may
        // name, because it is the object the authority committed it to.
        heldPassages[index] = entryPrefix;
        gateFootprints[index] = footprint;
        count += 1;
        continue;
      }
      if (!table.poses.vehicles.active[slot]) continue;
      // A body the authority has committed names the occurrence its own snapshot
      // holds for it, floored there and snapped to a governed occurrence of the
      // lease it holds. Two request-occurrence defects lived in the alternatives: a
      // clamp into `[entryIndex, lastConflictIndex]` names an occurrence *behind*
      // the one the authority has already observed (refused as a passed
      // occurrence), and the body's own current occurrence can be an internal gap
      // whose edge belongs to no junction (refused as an occurrence the passage
      // does not govern). See `requestOccurrenceFor`, where both readings meet.
      //
      // The authority's snapshot decides this branch, not the population's own
      // `committed` flag: an observation the authority refused sets that flag false
      // while the lease is still held, and a request naming anything but the held
      // passage is refused outright as holding another one.
      if (held !== undefined) {
        const lease = heldPassages[index];
        if (lease === undefined) {
          // The authority holds a lease this module can no longer name. Asking with
          // a re-derived passage risks the passage swap the authority refuses, so
          // the slot asks nothing and is counted; the observation phase keeps
          // reporting its real progress, which is what can still release it.
          counters.missingPassage += 1;
          continue;
        }
        const occurrence = requestOccurrenceFor(lease, held, occurrenceAtDistance(route, state.travelledM), state.travelledM + vehicleRadii[slot]!);
        if (occurrence === null) continue;
        requests[index] = {
          actorId: actor,
          kind: "vehicle",
          entryEdgeId: route.edgeIds[occurrence]!,
          passage: lease,
          routeIndex: occurrence,
          footprint,
          stoppedSeconds: state.stoppedSeconds,
          yieldSatisfied: !trafficInside(lease.junctionId, slot),
          receivingSpace: true,
        };
        gateFootprints[index] = footprint;
        count += 1;
        continue;
      }
      // An uncommitted body asks for the gate it is halted at, which is the gate
      // `gateStop` caps it at, and only once it has reached that gate's stop line.
      // Naming that gate's *entry* occurrence is what the authority accepts from an
      // actor that has not entered: the occurrence it is asking for, not the one it
      // is standing on.
      const gate = gateBeyond(route, state.travelledM, undefined);
      if (!gate || state.travelledM < gate.holdDistanceM - GATE_SEEK_TOLERANCE_M) continue;
      // A bound vehicle still inside its boundary entry prefix asks with the
      // authority's own entry passage; afterwards it asks with the route's gate
      // passage. Swapping these two is what "already holds another passage" means,
      // so the prefix is only used when it is the entry passage of *this* route.
      const usesPrefix = entryPrefix !== null && entryPrefix !== undefined && gate.passageIndex === 0 && entryPrefix.routeEdgeIds[0] === route.edgeIds[0];
      if (entryPrefix !== null && entryPrefix !== undefined && !usesPrefix) entryPassages[slot] = null;
      // The passage named is the one this actor is committed to, held by object
      // identity: an actor may not hold one passage and ask with another, and
      // re-deriving it from a gate index is exactly how those two drift apart.
      const passage = usesPrefix ? entryPrefix : route.passages[gate.passageIndex];
      if (!passage) {
        // A committed actor with no recorded passage object cannot ask without
        // risking a passage swap. It is counted rather than guessed at, and the
        // observation phase still reports its real progress.
        counters.missingPassage += 1;
        continue;
      }
      // The same rule from the other side: a request may only name a passage
      // built from this actor's own route. A mismatch here means the slot's
      // bookkeeping and its route have drifted apart, which is a defect in this
      // module rather than a network condition, so it is named and counted.
      if (passage.routeEdgeIds[0] !== route.edgeIds[0]) {
        counters.passageRouteMismatch += 1;
        continue;
      }
      requests[index] = {
        actorId: actor,
        kind: "vehicle",
        entryEdgeId: route.edgeIds[gate.entryIndex]!,
        passage,
        routeIndex: gate.entryIndex,
        footprint,
        stoppedSeconds: state.stoppedSeconds,
        yieldSatisfied: !trafficInside(gate.junctionId, slot),
        receivingSpace: hasReceivingSpace(route, gate.passageIndex, state.travelledM, vehicleRadii[slot]!, slot),
      };
      // A nomination, not a hold: the authority's grant is what latches the
      // passage, and `resolve` drops the nomination for any request it did not
      // answer.
      heldPassages[index] = passage;
      gateFootprints[index] = footprint;
      count += 1;
    }
    for (const state of table.pedestrians) {
      const slot = state.slot;
      if (!table.poses.pedestrians.active[slot]) continue;
      const route = table.pedestrianRoutes[slot];
      if (!route) continue;
      const actor = actorId("pedestrian", slot);
      const held = authorityLeaseByActor.get(actor);
      const reachedOccurrence = occurrenceAtDistance(route, state.travelledM);
      const liveAt = sampleRoute(route, reachedOccurrence, Math.max(0, Math.min(route.edges[reachedOccurrence]!.lengthM, state.travelledM - route.starts[reachedOccurrence]!)));
      const footprint = pedestrianFootprints[slot] ?? pedestrianFootprint(liveAt, liveAt.heading, state.scale);
      // A walked body the authority has committed names the occurrence its own
      // snapshot holds for it, floored there and snapped to a governed occurrence of
      // the lease it holds, exactly as a committed vehicle does. A walk's passages
      // carry no mapped controls at all, so this request clears nothing; it keeps
      // the authority's reading of the walk inside the lease it granted, and it is
      // the reading that never goes backwards.
      if (held !== undefined) {
        const lease = heldPassages[slot];
        if (lease === undefined) {
          counters.missingPassage += 1;
          continue;
        }
        const occurrence = requestOccurrenceFor(lease, held, reachedOccurrence, state.travelledM + PEDESTRIAN_DYNAMICS.radiusM * state.scale);
        if (occurrence === null) continue;
        requests[slot] = {
          actorId: actor,
          kind: "pedestrian",
          entryEdgeId: route.edgeIds[occurrence]!,
          passage: lease,
          routeIndex: occurrence,
          footprint,
          stoppedSeconds: state.stoppedSeconds,
          yieldSatisfied: true,
          receivingSpace: true,
        };
        gateFootprints[slot] = footprint;
        count += 1;
        continue;
      }
      // An uncommitted walk asks at the kerb of the gate that governs the
      // occurrence it is on — or the next one, when that occurrence is outside every
      // conflict area. Naming that gate's *entry* occurrence is what the authority
      // accepts from an actor that has not entered (`index === passage.entryIndex`),
      // and it is the occurrence the walk is asking for rather than the one it is
      // on, so a walker halted one footprint radius short of its crossing is exactly
      // the actor this branch exists for. Requiring the walk to be *inside* the gate
      // occurrence instead meant no walker ever asked: the halt that keeps it out of
      // the conflict area is the same halt that disqualified its request, so it
      // waited at the kerb for the whole run and `crossed.pedestrian` stayed at
      // zero.
      //
      // The stop-line condition is what keeps a walk from reserving a crossing it is
      // still walking towards. It is automatically true whenever the gate governs
      // the occurrence the walk is already on, because that gate's stop line is at
      // or behind the walk's own feet.
      const gate = gateAtOrAhead(route, state.travelledM);
      if (!gate || state.travelledM < gate.holdDistanceM - GATE_SEEK_TOLERANCE_M) continue;
      const passage = route.passages[gate.passageIndex]!;
      if (!passage) {
        counters.missingPassage += 1;
        continue;
      }
      requests[slot] = {
        actorId: actor,
        kind: "pedestrian",
        entryEdgeId: route.edgeIds[gate.entryIndex]!,
        passage,
        routeIndex: gate.entryIndex,
        footprint,
        stoppedSeconds: state.stoppedSeconds,
        yieldSatisfied: true,
        receivingSpace: true,
      };
      // A nomination, not a hold: the authority's grant is what latches the
      // passage, and `resolve` drops the nomination for any request it did not
      // answer.
      heldPassages[slot] = passage;
      gateFootprints[slot] = footprint;
      count += 1;
    }
    return count;
  }

  /**
   * Capacity reservation, the design's own requirement. A body may publish
   * `receivingSpace: true` only when the route past the compound's last
   * occurrence has room for its whole projected hull plus the shared stop gap.
   */
  function hasReceivingSpace(route: PlannedRoute, passageIndex: number, travelledM: number, radiusM: number, self: number): boolean {
    return hasSpace(table, route, passageIndex, travelledM, self, radiusM, network.admissionBounds.stopGapM);
  }

  /* --------------------------------------------------------------- resolve */

  function resolve(step: number): void {
    requirePhase("resolve");
    // A prepared slot stays prepared until the authority grants it: the grant is
    // what `activateBoundary` consumes, and clearing the flag here on the strength
    // of the active byte alone is what left four portal bodies materialized with
    // no lease and no way to ask for one.
    const batch: AdmissionRequest[] = [];
    for (const request of requests) if (request) batch.push(request);
    const granted = admissions.resolve(step, batch);
    counters.grantsLastTick = granted.length;
    counters.grants += granted.length;
    const grantedSet = new Set(granted);
    for (let index = 0; index < requests.length; index += 1) {
      const request = requests[index];
      if (!request) continue;
      if (!grantedSet.has(request.actorId)) {
        // A request the authority did not answer leaves no *nomination* behind. The
        // passage an unmaterialized actor named is a nomination, not a hold, and
        // keeping it would make the actor ask next tick with the passage it
        // nominated for a gate it has since moved past — which the authority
        // refuses as an occurrence that does not match the entry edge. Dropping it
        // lets the slot nominate the gate that actually governs it now.
        //
        // A lease the authority *does* hold is not a nomination, and the authority's
        // own snapshot is what separates the two. It defers a request whenever the
        // measured eligibility is not there yet — a stop the actor has not dwelled
        // at, a yield with no gap, a signal that is not green — and an actor whose
        // name for that lease was dropped here holds a passage it can never name
        // again: it asks nothing, the lease never releases, and every other actor
        // queues behind a commitment that cannot be given back. Measured: one
        // vehicle held `priority:node:1251060622` for 57 s with three bodies queued
        // at its stop line while the population reported no passage for it at all.
        const slot = request.kind === "vehicle" ? index - settings.pedestrians : index;
        const committed = request.kind === "vehicle" ? table.vehicles[slot]!.committed : table.pedestrians[slot]!.committed;
        if (!committed && !authorityLeaseByActor.has(request.actorId)) heldPassages[index] = undefined;
        continue;
      }
      if (request.kind === "vehicle") {
        const slot = index - settings.pedestrians;
        const state = table.vehicles[slot]!;
        state.committed = true;
        // Latch the passage the grant actually named, from the request the
        // authority answered rather than from live state it may have moved on.
        if (pending.has(slot)) {
          // The grant is what materializes a bound vehicle: `activateBoundary`
          // validates it and sets the active byte with no await in between.
          const footprint = gateFootprints[index] ?? vehicleFootprint(fleet, table, slot);
          const binding = bindings[slot];
          if (!binding) throw new Error(`Vehicle slot ${slot} was granted a boundary entry with no binding; the population lost its lifecycle state.`);
          admissions.activateBoundary(binding, footprint);
          pending.delete(slot);
        }
      } else {
        const state = table.pedestrians[index]!;
        state.committed = true;
        crowd.committed[index] = 1;
      }
    }
  }

  /* ------------------------------------------------------------- integrate */

  function integrate(step: number): void {
    requirePhase("integrate");
    let moving = false;
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (!table.poses.vehicles.active[slot]) continue;
      const route = table.vehicleRoutes[slot]!;
      const intent = intents[slot]!;
      const desired = Math.max(0.5, route.speedLimits[state.routeIndex]! * state.speedFactor);
      const speed = Math.max(0, Math.min(state.speedMps + intent.acceleration * step, desired));
      // Only an uncommitted body is capped by its halt. A committed body is never
      // stopped mid-conflict: it clears the compound at its own speed, and its own
      // hull clearing every conflict disk is what releases the lease.
      // The shipped body may not pass its halt. The mutation drops that cap and
      // every commitment with it, which is how the single-authority gate is made to
      // go red: an actor then drives into a conflict section with no commitment of
      // its own at all. Dropping only the cap changed nothing, because a body that
      // has reached a gate is committed and no longer consults its halt.
      if (populationInvariants.driveWithoutGrant) state.committed = false;
      const allowed = populationInvariants.driveWithoutGrant ? Number.POSITIVE_INFINITY : intent.stopDistanceM;
      /**
       * Arrive at the halt, rather than approach it.
       *
       * IDM's braking term is `-a*(desiredGap/gap)^2` against the halt treated as a
       * stationary obstacle, so its equilibrium is a *relative* speed of zero: the
       * body sheds speed in proportion to the gap and never closes the last
       * centimetres. The request window opens `GATE_SEEK_TOLERANCE_M` short of the
       * halt, and the shortfall left by the creep is a property of the braking
       * curve, not a bounded quantity — measured on the delivered network, a body
       * that halted 0.44 m short of `holdDistanceM` never built a single request in
       * 5400 ticks, and 55 of 56 active vehicles queued behind leaders in exactly
       * that state. Snapping the origin onto the halt it was already given takes
       * nothing back: the body still never passes `holdDistanceM`, which is itself a
       * whole footprint radius short of the gate, and a body that has already
       * crossed its halt is never pulled backwards.
       */
      const stoppingShortM = allowed - state.travelledM;
      // The capture closes IDM's asymptotic creep, and it may not do anything
      // else. It moves the origin onto the halt it was already given, so it must
      // not move the body into the space its own car-following model reserves for
      // the body in front of it: the halt is only captured while at least the
      // model's own standstill spacing would remain after the move. Without this
      // the capture teleported a body up to `HALT_CAPTURE_M` forward through
      // whatever stood between it and its halt. Measured on the delivered network
      // at 200 vehicles: slot 78 moved 1.493 m in one tick at 0.86 m/s and landed
      // 0.044 m *past* slot 46, which was already halted at its own hold point for
      // the same gate; the pair then sat at an origin gap of 0.044 m with IDM's
      // acceleration exactly zero at standstill, and the junction slot 46 held was
      // never served again for the remaining 170 s of the run. The halt does not
      // disappear when it is not captured — the body approaches it under IDM and
      // reaches the request window on its own once the body ahead has gone.
      const leader = frame?.ahead[slot] ?? null;
      const leaderRoomM = leader === null ? Number.POSITIVE_INFINITY : leader.gapM - VEHICLE_DYNAMICS.idm.minimumSpacingM;
      const reached = !populationInvariants.driveWithoutGrant
        && Number.isFinite(allowed)
        && stoppingShortM > 0
        && stoppingShortM <= HALT_CAPTURE_M
        && state.speedMps <= HALT_CAPTURE_SPEED_MPS
        && stoppingShortM < leaderRoomM;
      const moved = reached ? allowed : Math.min(state.travelledM + speed * step, route.totalLengthM - 1e-9, allowed);
      const actual = Math.max(0, moved - state.travelledM);
      // A captured arrival is a standstill at the stop line, not a 3 m/s blip: the
      // dwell the authority measures and the body's own reported speed must agree.
      state.speedMps = reached ? 0 : actual / step;
      state.travelledM += actual;
      stepLateral(state, step);
      placeVehicle(table, slot, state.travelledM, state.laneIndex);
      state.stoppedSeconds = state.speedMps <= VEHICLE_DYNAMICS.idm.stoppedSpeedMps ? state.stoppedSeconds + step : 0;
      if (state.egressing) {
        // The outbound leg of the boundary lifecycle: the pose walks out through
        // the authored envelope along the portal's own outward normal, while the
        // body's reported route occurrence and arc distance stay at the true
        // terminus. Nothing here turns or re-steers the body.
        //
        // The pose is placed on that outward line from the portal point itself
        // rather than offset from the lane centre: `boundaryProgress` measures the
        // envelope from the portal point, so a lane offset left over from the last
        // edge spends the envelope sideways and trips it at 7.5 m.
        const profile = boundaryProfile(network, "vehicle", route.edges.at(-1)!);
        if (profile) {
          const outwardSpeed = Math.max(0.5, route.speedLimits.at(-1)! * state.speedFactor);
          state.speedMps = outwardSpeed;
          state.egressOffsetM = Math.min(EGRESS_LIMIT_M, state.egressOffsetM + outwardSpeed * step);
          const last = route.edges.at(-1)!;
          const placed = sampleRoute(route, route.edges.length - 1, last.lengthM);
          placeSlot(table.poses.vehicles, slot, {
            x: profile.position.x + profile.outward.x * state.egressOffsetM,
            y: placed.y,
            z: profile.position.z + profile.outward.z * state.egressOffsetM,
          }, placed.heading);
        }
      }
      if (state.speedMps > 0.05) moving = true;
      // The single-authority invariant, enforced rather than only observed: a body
      // whose *collision hull* is inside a conflict area must hold a commitment.
      // The test is the authority's own `footprintOccupies`, not "the body is on a
      // governed edge" — a released body's tail is lawfully still crossing the
      // section it was admitted into, and an actor keeps clearing a compound after
      // its lease ends. What may never happen is an uncommitted hull arriving at a
      // conflict area: if one does, the body is stopped where it stands and the
      // event is counted, so the run reports it instead of driving it.
      const hull = vehicleFootprints[slot];
      // A body lawfully waiting at a gate is not a violation. The authority's disk
      // is conservative and reaches past the section it governs, so a hull stopped
      // exactly at its stop line grazes the disk it is waiting to enter. The body
      // has not passed the line it may not pass, which is the thing being checked.
      const waiting = route.gates.find((gate) => state.travelledM <= gate.holdDistanceM + 1e-6);
      if (hull !== undefined && !state.committed && !state.egressing && waiting === undefined) {
        let inside: string | null = null;
        for (const [junctionId, junction] of junctionsById) {
          if (!footprintOccupies(junction, hull)) continue;
          inside = junctionId;
          break;
        }
        if (inside !== null) {
          counters.authorityViolations += 1;
          populationInvariants.violations += 1;
          // An uncommitted hull in a conflict area cannot be admitted from here —
          // the gate it would ask at is behind it — so the body is held where it
          // stands and, after a bounded wait, the route is abandoned rather than
          // left queued forever. The reason is named so the geometry is visible.
          state.stoppedSeconds += step;
          state.speedMps = 0;
          refusals.add(`vehicle ${slot} held at conflict area ${inside}: an uncommitted hull arrived there, which admission forbids`);
          if (state.stoppedSeconds > 3) {
            finishVehicle(slot, false, `vehicle route from ${route.entryEdgeId} left an uncommitted hull inside conflict area ${inside}, which admission cannot admit from there`);
            continue;
          }
        }
      }
      if (state.travelledM >= route.totalLengthM - 1e-6 && !state.egressing) beginEgress(slot, route);
      counters.longestWait.vehicle = Math.max(counters.longestWait.vehicle, state.stoppedSeconds);
    }
    for (const state of table.pedestrians) {
      const slot = state.slot;
      if (!table.poses.pedestrians.active[slot]) continue;
      const route = table.pedestrianRoutes[slot]!;
      const forward = Math.hypot(crowd.velocityX[slot]!, crowd.velocityZ[slot]!);
      state.speedMps = forward;
      if (forward > 0.05) moving = true;
      if (state.queued || forward <= 0.05) {
        state.stoppedSeconds += step;
      } else {
        state.stoppedSeconds = 0;
      }
      const next = Math.min(state.travelledM + forward * step, route.totalLengthM);
      state.travelledM = Math.max(state.travelledM, next);
      if (state.travelledM >= route.totalLengthM - 1e-6) {
        retirePedestrian(slot);
        continue;
      }
      placePedestrian(table, slot);
      counters.longestWait.pedestrian = Math.max(counters.longestWait.pedestrian, state.stoppedSeconds);
    }
    counters.moving = moving;
  }

  function beginEgress(slot: number, route: PlannedRoute): void {
    const state = table.vehicles[slot]!;
    if (!state.boundary) {
      finishVehicle(slot, false, `vehicle route from ${route.entryEdgeId} reached its AOI terminus without a boundary binding`);
      return;
    }
    state.egressing = true;
    state.egressOffsetM = 0;
    // Put the pattern on the portal's own outward line before the first egress
    // lifecycle runs. The lane centre the body arrived on is up to a couple of
    // centimetres to the side of the portal point, and the envelope is measured
    // from that point: a body that starts 2 cm behind it is refused as leaving the
    // envelope before it has moved at all. Measured on `lane:97333609:...:r:0`:
    // origin (497.849, 87.021), portal (497.862, 87.004), outward displacement
    // -0.022 m, thrown from `boundaryProgress` on the first egress tick.
    const profile = boundaryProfile(network, "vehicle", route.edges.at(-1)!);
    if (profile) {
      const last = route.edges.at(-1)!;
      const placed = sampleRoute(route, route.edges.length - 1, last.lengthM);
      placeSlot(table.poses.vehicles, slot, { x: profile.position.x, y: placed.y, z: profile.position.z }, placed.heading);
    }
  }

  function retirePedestrian(slot: number): void {
    const state = table.pedestrians[slot]!;
    // Anything this slot still holds at the authority goes before the slot is
    // cleared, so its next generation never inherits a commitment.
    admissions.cancelPending(actorId("pedestrian", slot));
    heldPassages[slot] = undefined;
    if (!populationInvariants.leakRetiredBody) retireSlot(table.poses.pedestrians, slot);
    state.committed = false;
    state.queued = false;
    crowd.committed[slot] = 0;
    table.pedestrianRoutes[slot] = null;
    pedestrianFootprints[slot] = undefined;
    requests[slot] = undefined;
    gateFootprints[slot] = undefined;
    counters.retired.pedestrian += 1;
    counters.completed.pedestrian += 1;
    // The leak mutation leaves the retired body present *and* gives it no live
    // plan, which is what a leaked slot is. Replanning it in the same tick would
    // heal the leak before any conservation reading could see it, and the gate
    // would pass while proving nothing.
    if (!populationInvariants.leakRetiredBody) planQueue.push({ kind: "pedestrian", slot });
  }

  /* --------------------------------------------------------------- observe */

  function observeCommitted(): void {
    // First re-check that every actor the population believes is committed is
    // still held by the authority. The authority expires a signal grant that was
    // never entered, so a slot can be released without the population observing
    // it; re-reading its own snapshot is what keeps the two in step.
    const live = new Set<string>();
    for (const commitment of admissions.snapshot()) live.add(commitment.actorId);
    for (const state of table.vehicles) {
      if (state.committed && !live.has(actorId("vehicle", state.slot))) {
        state.committed = false;
        heldPassages[state.slot + settings.pedestrians] = undefined;
      }
    }
    for (const state of table.pedestrians) {
      if (state.committed && !live.has(actorId("pedestrian", state.slot))) {
        state.committed = false;
        crowd.committed[state.slot] = 0;
        heldPassages[state.slot] = undefined;
      }
    }
    for (const state of table.vehicles) {
      const slot = state.slot;
      const index = slot + settings.pedestrians;
      if (!table.poses.vehicles.active[slot] || !state.committed) continue;
      const route = table.vehicleRoutes[slot];
      if (!route) continue;
      const held = heldPassages[index];
      const footprint = vehicleFootprints[slot] ?? vehicleFootprint(fleet, table, slot);
      // The occurrence the body is actually on, uncapped. This is the one value
      // the release test reads: the authority's lease ends when the body has
      // entered, its occurrence is past the compound's last conflict occurrence and
      // its hull has cleared every conflict disk. Clamping it into the passage
      // window pins it at the boundary, the release never fires, and the body sits
      // holding a lease it cannot name. The request path is the narrower one and
      // stays inside the window; see `requestOccurrenceFor`.
      //
      // An egressing body is observed here too. Its lease is released by the same
      // test, and a body that reached its boundary envelope still holding one could
      // not retire: `retireBoundary` refuses a commitment with an uncleared control.
      const occurrence = occurrenceAtDistance(route, state.travelledM);
      const local = Math.max(0, Math.min(route.edges[occurrence]!.lengthM - 1e-7, state.travelledM - route.starts[occurrence]!));
      let released = false;
      try {
        released = admissions.observe(actorId("vehicle", slot), { routeIndex: occurrence, distanceM: local, footprint });
      } catch (error) {
        // The authority refuses an observation that its own admission policy
        // cannot satisfy for this route occurrence — a mapped control whose
        // position leaves no legal halt for a body this size, which is the same
        // class of geometry `artifacts/population-cost/report.md` recorded when a
        // stop line sat nearer the gate than half the longest vehicle. The
        // population does not weaken admission to get past it: the body is held
        // at the control's legal halt, its lease is dropped, and the refusal is
        // counted and named so the route is visible rather than driven wrongly.
        counters.authorityRefusals += 1;
        refusals.add(`vehicle stop/yield obligation on route from ${route.entryEdgeId} could not be satisfied: ${(error as Error).message.split(":")[0]}`);
        state.committed = false;
        // The lease object is kept: the authority still holds it, so the next
        // request must name the same passage or the authority refuses the swap.
        // The lifecycle phase retires the slot, which is what finally drops it.
        state.travelledM = Math.min(state.travelledM, controlStop(route, state.travelledM, vehicleRadii[slot]!).distanceM);
        placeVehicle(table, slot, state.travelledM, state.laneIndex);
        continue;
      }
      if (released) {
        state.committed = false;
        heldPassages[index] = undefined;
        // The boundary entry prefix is one authority object; once the body clears
        // it, the vehicle continues under its own route's gate passages.
        if (held !== undefined && entryPassages[slot] === held) entryPassages[slot] = null;
        counters.crossed.vehicle += 1;
      }
    }
    for (const state of table.pedestrians) {
      const slot = state.slot;
      if (!table.poses.pedestrians.active[slot] || !state.committed) continue;
      const route = table.pedestrianRoutes[slot];
      if (!route) continue;
      // The walk reports the occurrence its body has actually reached, exactly as a
      // vehicle does. A pedestrian that always reported its passage's entry
      // occurrence could never satisfy the authority's release test, because that
      // test needs an occurrence past the crossing's last conflict occurrence: the
      // walker would hold the crossing's lease forever and `crossed` would stay at
      // zero however many people walked over the scramble.
      const occurrence = occurrenceAtDistance(route, state.travelledM);
      const local = Math.max(0, Math.min(route.edges[occurrence]!.lengthM - 1e-7, state.travelledM - route.starts[occurrence]!));
      const at = sampleRoute(route, occurrence, local);
      const footprint = pedestrianFootprints[slot] ?? pedestrianFootprint(at, at.heading, state.scale);
      if (admissions.observe(actorId("pedestrian", slot), { routeIndex: occurrence, distanceM: local, footprint })) {
        state.committed = false;
        crowd.committed[slot] = 0;
        heldPassages[slot] = undefined;
        counters.crossed.pedestrian += 1;
      }
    }
  }

  /**
   * A route-relative distance to the occurrence it falls on. One definition,
   * shared by the planner's gate arithmetic and the population's progress report.
   */
  function occurrenceAtDistance(route: PlannedRoute, travelledM: number): number {
    let index = 0;
    while (index + 1 < route.edges.length && travelledM >= route.starts[index + 1]!) index += 1;
    return index;
  }

  /**
   * Whether another *vehicle* is inside `junctionId` as traffic rather than as a
   * queue.
   *
   * The authority's disks are conservative and reach past the sections they
   * govern, so a body stopped at its own stop line grazes the disk it is waiting to
   * enter — the same grazing that already had to be excluded from the
   * single-authority invariant. A hull-only reading therefore counts the queue
   * behind an actor as a crossing conflict, the actor can never satisfy the stop or
   * yield obligation of the control it is standing at, the control is never marked
   * cleared, and every body behind it waits forever. Measured before this rule: one
   * vehicle held `priority:node:1251060622` for 57 s with four requests queued at
   * its stop line and not one grant.
   *
   * A body that has not passed its own stop line for this authority cannot be
   * inside it, so the measurement is the two facts together: the hull is in the
   * disk, and the body has passed the line it may not pass. Traffic on foot is not
   * counted here, because `frame.occupancy` is built from vehicle footprints; the
   * authority's own `occupied(junctionId)` is what keeps a pedestrian crossing
   * exclusive.
   */
  function trafficInside(junctionId: string, self: number): boolean {
    const inside = frame?.occupancy.get(junctionId);
    if (!inside) return false;
    for (const other of inside) {
      if (other === self) continue;
      const route = table.vehicleRoutes[other];
      if (!route) return true;
      const state = table.vehicles[other]!;
      for (const gate of route.gates) {
        if (gate.junctionId !== junctionId) continue;
        if (state.travelledM > gate.holdDistanceM + 1e-6) return true;
      }
    }
    return false;
  }

  /**
   * The occurrence a committed actor may name in a request.
   *
   * The authority checks a request's named occurrence against three independent
   * readings at once (`admissions.ts:50` and `:54`), so the name is built from all
   * three rather than derived from any one of them:
   *
   *  - `authorityIndex` is the occurrence the authority already holds for this
   *    actor. A request below it is refused as `requested a passed route
   *    occurrence`, so it is the floor. It comes from the authority's own
   *    `snapshot()`; a population-side counter is not the same number and drifts.
   *  - the body's own progress is the ceiling. A mapped stop/yield obligation is
   *    cleared for exactly the occurrence a request names, so naming one the body
   *    has not reached would clear an obligation it has not arrived at. A control
   *    binds the *front* of the body, though, so the ceiling also carries the
   *    occurrence of any control the body's hull has already reached: at the halt
   *    the body's origin is one footprint radius short of the control, and for a
   *    control nearer the section start than that radius the origin is still on the
   *    previous occurrence when the request that clears it is due.
   *  - `passage` supplies the `[entryIndex, lastConflictIndex]` window and the
   *    junction the named occurrence's own edge must belong to. A compound's
   *    internal gaps are edges with `junctionId: null`: they sit inside the
   *    committed passage and inside its window, and the authority still refuses
   *    them (`does not match the actor's compound route occurrence`), so only a
   *    governed occurrence — or the prefix's own single entry occurrence — may be
   *    named.
   *
   * The name is therefore the latest governed occurrence at or before the body
   * that is not below what the authority holds. When no such occurrence exists the
   * actor asks nothing: it is standing in an internal gap with every governed
   * occurrence already behind the authority's own reading, or it is past
   * `lastConflictIndex` and waiting only on physical clearance. Neither case has
   * an obligation left to clear, and the observation phase still carries the
   * body's real progress to the release test.
   */
  function requestOccurrenceFor(
    passage: RoutePassage,
    authority: { routeIndex: number; entered: boolean },
    reached: number,
    hullFrontM: number,
  ): number | null {
    // An actor the authority has not yet recorded as entered may name its passage's
    // own entry occurrence and nothing else: the authority refuses any other one
    // with `must enter its compound at the planned first occurrence`
    // (`admissions.ts:55`). That is the occurrence the grant itself named, so it is
    // also never below the occurrence the authority holds while a commitment is
    // unentered — an observation past the entry is what sets `entered`.
    if (!authority.entered) return passage.entryIndex >= authority.routeIndex ? passage.entryIndex : null;
    const windowEnd = Math.max(passage.entryIndex, passage.lastConflictIndex);
    const floor = Math.max(passage.entryIndex, authority.routeIndex);
    let ceiling = Math.min(reached, windowEnd);
    for (const control of passage.controls) {
      const position = passage.starts[control.routeIndex]! + control.distanceM;
      if (hullFrontM + 1e-9 < position) continue;
      ceiling = Math.max(ceiling, Math.min(control.routeIndex, windowEnd));
    }
    for (let index = ceiling; index >= floor; index -= 1) {
      const edge = passage.edges[index];
      if (!edge) continue;
      if (passage.boundaryEntry ? index === passage.entryIndex : edge.junctionId === passage.junctionId) return index;
    }
    return null;
  }
  /* --------------------------------------------------- the walking step */

  /**
   * Decide the walking population's motion for this tick, and write the *previous*
   * half of the pose buffers while doing it. Nothing here closes the route: the
   * `integrate` phase moves the body with the velocity decided here, and it
   * cannot exceed the halt this step computed.
   *
   * An actor without a grant is capped at the curb, so a pedestrian can never be
   * in a conflict section on a movement the authority did not grant.
   */
  function stepPedestrians(step: number): void {
    requirePhase("plan");
    const pedestrianPoses = table.poses.pedestrians;
    const position = pedestrianPoses.current.position;
    // Respawned slots must not blend from wherever the slot used to be, and the
    // tick's own previous half has to be written before anything moves.
    for (const state of table.pedestrians) {
      stageSlot(pedestrianPoses, state.slot);
      const slot = state.slot;
      const agent = crowd.agents[slot]!;
      agent.x = position[slot * 3]!;
      agent.z = position[slot * 3 + 2]!;
      agent.velocityX = crowd.velocityX[slot]!;
      agent.velocityZ = crowd.velocityZ[slot]!;
    }
    refreshPedestrianHash(crowd, table);
    for (const state of table.pedestrians) {
      const slot = state.slot;
      crowd.velocityX[slot] = 0;
      crowd.velocityZ[slot] = 0;
      state.queued = false;
      pedestrianFootprints[slot] = undefined;
      if (!pedestrianPoses.active[slot]) continue;
      const route = table.pedestrianRoutes[slot];
      if (route === undefined || route === null) {
        // The same conservation reading the vehicle loop makes: a body the
        // renderer will draw must have a route, because that route is what places
        // it. A body without one is a leak, and it fails here by name.
        throw new Error(`Population lifecycle conservation failed: pedestrian slot ${slot} is present in the pose buffers with no planned route. A body was retired without clearing its slot.`);
      }
      const occurrence = occurrenceAt(route, state.travelledM);
      // A committed walk is capped only at the next *different* authority's gate: a
      // body clearing a compound has to be free to cross it at its own pace, and its
      // hull leaving that compound's disks is what releases the lease.
      const next = state.committed ? gateBeyond(route, state.travelledM, heldPassages[slot]) : gateAtOrAhead(route, state.travelledM);
      let allowed = state.travelledM + state.cadenceMps * step;
      let blocked = false;
      if (next) {
        allowed = Math.min(allowed, next.holdDistanceM);
        blocked = allowed <= state.travelledM + 1e-9;
      }
      if (populationInvariants.driveWithoutGrant || populationInvariants.ignoreCurb) {
        // The mutation treats every actor as committed, which is the
        // single-authority defect.
        blocked = false;
      }
      const heading = pedestrianPoses.current.yaw[slot]!;
      const directionX = Math.sin(heading);
      const directionZ = Math.cos(heading);
      const reach = blocked ? 0 : Math.max(0, Math.min(state.cadenceMps, (allowed - state.travelledM) / step));
      const ramp = blocked ? 0 : state.speedMps + (reach - state.speedMps) * Math.min(1, step / PEDESTRIAN_DYNAMICS.accelerationSeconds);
      const agent = crowd.agents[slot]!;
      const avoided = ramp <= 0
        ? { x: 0, z: 0 }
        : orcaVelocity(crowd.hash, crowd.agents, slot, directionX * ramp, directionZ * ramp, crowd.scratch);
      // Project the collision-free velocity back onto the route, so avoidance
      // never pushes a body out of its corridor; shape only the speed.
      const forward = blocked ? 0 : Math.max(0, Math.min(state.cadenceMps, avoided.x * directionX + avoided.z * directionZ));
      crowd.velocityX[slot] = directionX * forward;
      crowd.velocityZ[slot] = directionZ * forward;
      state.queued = blocked;
      void agent;
      const local = Math.max(0, Math.min(route.edges[occurrence]!.lengthM, state.travelledM - route.starts[occurrence]!));
      const at = sampleRoute(route, occurrence, local);
      pedestrianFootprints[slot] = pedestrianFootprint(at, at.heading, state.scale);
    }
  }

  /* ---------------------------------------------------------------- update */

  function update(step: number, simulatedSeconds: number): void {
    if (!Number.isFinite(step) || step <= 0 || step > 0.25) {
      throw new Error(`Population step ${step} is invalid; the population advances on RenderLoop.onFixedStep with a positive step up to 0.25 s.`);
    }
    counters.ticks += 1;
    counters.simulatedSeconds = simulatedSeconds;
    // The order is checked before it is run, not only from inside each step. A
    // reordered list is refused outright, so the gate cannot depend on which
    // step's own guard happens to notice first — and a list that is not the
    // design's list is not this population's tick at all.
    if (tickOrder.phases.length !== TICK_PHASES.length || tickOrder.phases.some((name, index) => name !== TICK_PHASES[index])) {
      throw new Error(`Population tick order violation: the tick is running ${tickOrder.phases.join(" -> ")}, not the design's order ${TICK_PHASES.join(" -> ")}. Admission resolve must complete before any position is integrated.`);
    }
    for (let index = 0; index < tickOrder.phases.length; index += 1) {
      phaseIndex = index;
      const name = tickOrder.phases[index]!;
      if (name === "lifecycle") { stageAll(); lifecycle(); }
      else if (name === "plan") { plan(step); stepPedestrians(step); }
      else if (name === "request") { counters.requestsLastTick = assembleRequests(); }
      else if (name === "resolve") resolve(step);
      else if (name === "integrate") integrate(step);
      else if (name === "close") { close(); traceTick(counters.ticks); }
      else throw new Error(`Population tick order names an unknown phase ${String(name)}.`);
    }
    phaseIndex = 0;
  }

  /** The tick's close: publish what the renderer and the status surface read. */
  function close(): void {
    requirePhase("close");
    for (const state of table.pedestrians) {
      const slot = state.slot;
      if (!table.poses.pedestrians.active[slot]) continue;
      table.poses.pedestrians.current.travelledMetres[slot] = state.travelledM;
      table.poses.pedestrians.speedMps[slot] = state.speedMps;
      counters.longestWait.pedestrian = Math.max(counters.longestWait.pedestrian, state.stoppedSeconds);
    }
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (!table.poses.vehicles.active[slot]) continue;
      table.poses.vehicles.current.travelledMetres[slot] = state.travelledM;
      table.poses.vehicles.speedMps[slot] = state.speedMps;
      table.poses.vehicles.current.frontSteeringRadians[slot] = state.frontSteeringRadians;
    }
  }

  function stageAll(): void {
    for (const state of table.vehicles) stageVehicleSlots(table.poses.vehicles, state.slot);
    for (const state of table.pedestrians) stageSlot(table.poses.pedestrians, state.slot);
  }

  /* ----------------------------------------------------------------- trace */

  /**
   * A per-slot, per-tick record of what the tick decided for one vehicle.
   *
   * Off by default and read by nothing in `update`, so a traced run and an
   * untraced run make the same decisions. It exists because a body that never
   * moves is a symptom whose cause is spread over four phases — whether the tick
   * built a request for it, whether the authority granted it, what the plan phase
   * capped it at, and what the integrate phase actually moved — and no post-hoc
   * reading of the pose buffers can separate those.
   */
  function traceTick(tick: number): void {
    const leases = new Map<string, AdmissionSnapshot>();
    for (const commitment of admissions.snapshot()) leases.set(commitment.actorId, commitment);
    for (const state of table.vehicles) {
      const slot = state.slot;
      if (!trace.has(slot)) continue;
      const index = slot + settings.pedestrians;
      const route = table.vehicleRoutes[slot];
      const gate = route && table.poses.vehicles.active[slot] ? gateStop(route, state.travelledM, heldPassages[index]) : undefined;
      const lease = leases.get(actorId("vehicle", slot));
      const request = requests[index];
      const passage = request?.passage;
      trace.get(slot)!.push({
        tick,
        seconds: Number((tick / 60).toFixed(3)),
        active: table.poses.vehicles.active[slot] === 1,
        pending: pending.has(slot),
        travelledM: Number(state.travelledM.toFixed(3)),
        speedMps: Number(state.speedMps.toFixed(4)),
        stoppedSeconds: Number(state.stoppedSeconds.toFixed(2)),
        committed: state.committed,
        egressing: state.egressing,
        routeEdges: route ? route.edges.length : 0,
        routeLengthM: route ? Number(route.totalLengthM.toFixed(2)) : 0,
        routeIndex: route ? occurrenceAtDistance(route, state.travelledM) : 0,
        junctionId: route ? (route.edges[occurrenceAtDistance(route, state.travelledM)]!.junctionId ?? null) : null,
        stopDistanceM: gate && Number.isFinite(gate.distanceM) ? Number(gate.distanceM.toFixed(3)) : null,
        requested: request !== undefined,
        requestedRouteIndex: request?.routeIndex ?? null,
        requestedJunctionId: passage ? passage.junctionId : null,
        requestedEntryGroup: passage ? passage.entrySignalGroupId : null,
        holdsPrefix: heldPassages[index] !== undefined && heldPassages[index] === entryPassages[slot],
        leaseJunctionId: lease ? lease.junctionId : null,
        leaseRouteIndex: lease ? lease.routeIndex : null,
        leaseEntered: lease ? lease.entered : null,
        entryEdgeId: route ? route.entryEdgeId : null,
        // The car-following decision, so a body stopped with no halt and no
        // neighbour can be attributed to the leader the model actually used
        // rather than to a geometric scan that does not share its arithmetic.
        leaderGapM: frame?.ahead[slot] ? Number(frame.ahead[slot]!.gapM.toFixed(4)) : null,
        leaderSpeedMps: frame?.ahead[slot] ? Number(frame.ahead[slot]!.speedMps.toFixed(4)) : null,
        acceleration: Number((intents[slot]?.acceleration ?? 0).toFixed(4)),
        freeAcceleration: planDecision[slot]?.freeAcceleration ?? 0,
        stoppingShortM: planDecision[slot]?.stoppingShortM ?? null,
      });
    }
  }

  /* ---------------------------------------------------------------- status */

  function countActive(poses: { count: number; active: Uint8Array }): number {
    let active = 0;
    for (let slot = 0; slot < poses.count; slot += 1) if (poses.active[slot]) active += 1;
    return active;
  }

  /**
   * Independently derived lifecycle conservation, computed from the pose buffers
   * rather than from the counters: a slot is either active or not, and the sum of
   * present and absent slots is always the table size. `status()` reports it so a
   * leaked body is visible as an inequality instead of as a quieter street.
   */
  function conservation(): { present: number; expected: number } {
    let present = 0;
    for (let slot = 0; slot < table.poses.vehicles.count; slot += 1) {
      // A prepared vehicle is not a leak: it holds a plan and an inactive pose at
      // its portal, waiting for the grant that will materialize it.
      const registered = table.vehicleRoutes[slot] !== null;
      const presentBody = table.poses.vehicles.active[slot] === 1 || pending.has(slot);
      if (registered === presentBody) present += 1;
    }
    let pedestrianPresent = 0;
    for (let slot = 0; slot < table.poses.pedestrians.count; slot += 1) {
      const registered = table.pedestrianRoutes[slot] !== null;
      const active = table.poses.pedestrians.active[slot] === 1;
      if (registered === active) pedestrianPresent += 1;
    }
    return { present: present + pedestrianPresent, expected: table.poses.vehicles.count + table.poses.pedestrians.count };
  }

  function kindStatus(kind: PopulationKind): PopulationStatus["pedestrians"] {
    const states = kind === "vehicle" ? table.vehicles : table.pedestrians;
    const poses = kind === "vehicle" ? table.poses.vehicles : table.poses.pedestrians;
    let active = 0;
    let committed = 0;
    let queued = 0;
    let pendingCount = 0;
    for (const state of states) {
      if (!poses.active[state.slot]) {
        if (kind === "vehicle" && pending.has(state.slot)) pendingCount += 1;
        continue;
      }
      active += 1;
      const live = state as { committed: boolean; queued?: boolean; speedMps: number };
      if (live.committed) committed += 1;
      else if (live.queued || live.speedMps <= VEHICLE_DYNAMICS.idm.stoppedSpeedMps) queued += 1;
    }
    return {
      active,
      queued,
      committed,
      completed: counters.completed[kind],
      crossed: counters.crossed[kind],
      longestWaitSeconds: counters.longestWait[kind],
      meanWaitSeconds: counters.waitSamples[kind] ? counters.waitTotal[kind] / counters.waitSamples[kind] : 0,
      pending: pendingCount,
    };
  }

  return {
    poses: table.poses,
    update,
    moving: () => counters.moving,
    status(): PopulationStatus {
      const status = emptyPopulationStatus();
      status.attached = true;
      status.simulatedSeconds = counters.simulatedSeconds;
      status.pedestrians = kindStatus("pedestrian");
      status.vehicles = kindStatus("vehicle");
      // One snapshot of the live sets, taken before anything is compared: the
      // conservation identity below is only meaningful against a single reading.
      const prepared = pending.size;
      const active = countActive(table.poses.vehicles) + countActive(table.poses.pedestrians);
      const spawned = counters.spawned.vehicle + counters.spawned.pedestrian;
      const retired = counters.retired.vehicle + counters.retired.pedestrian;
      const check = conservation();
      status.lifecycle = {
        spawned,
        retired,
        active,
        reused: Math.max(0, spawned - enrolled()),
        generations: generationsUsed(),
      };
      status.requestsLastTick = counters.requestsLastTick;
      status.grantsLastTick = counters.grantsLastTick;
      status.grants = counters.grants;
      status.ticks = counters.ticks;
      status.refusedRoutes = refusals.snapshot();
      status.retiredInPlace = counters.retiredInPlace;
      status.boundarySpawns = counters.boundarySpawns;
      status.authorityViolations = counters.authorityViolations;
      if (check.present !== check.expected) {
        throw new Error(`Population lifecycle conservation failed: ${check.present} of ${check.expected} slots agree between a present body and a planned route. Spawns ${spawned}, retirements ${retired}, active ${active}, prepared ${prepared}. A slot with a route and no body, or a body with no route, is a leak.`);
      }
      if (spawned !== retired + active + prepared) {
        let vehicleActive = 0;
        let vehiclePlanned = 0;
        const activeList: number[] = [];
        for (let slot = 0; slot < table.poses.vehicles.count; slot += 1) {
          if (table.poses.vehicles.active[slot]) { vehicleActive += 1; activeList.push(slot); }
          if (table.vehicleRoutes[slot]) vehiclePlanned += 1;
        }
        let pedestrianActive = 0;
        let pedestrianPlanned = 0;
        for (let slot = 0; slot < table.poses.pedestrians.count; slot += 1) {
          if (table.poses.pedestrians.active[slot]) pedestrianActive += 1;
          if (table.pedestrianRoutes[slot]) pedestrianPlanned += 1;
        }
        const pendingList: number[] = [];
        for (const slot of pending) pendingList.push(slot);
        throw new Error(`Population lifecycle conservation failed: ${spawned} spawns minus ${retired} retirements leaves ${spawned - retired} bodies, but ${active} are active and ${prepared} are prepared and waiting for a grant. Vehicles ${counters.spawned.vehicle} spawned / ${counters.retired.vehicle} retired / ${vehicleActive} active [${activeList.join(",")}] / ${vehiclePlanned} planned; pending [${pendingList.join(",")}]; pedestrians ${counters.spawned.pedestrian} spawned / ${counters.retired.pedestrian} retired / ${pedestrianActive} active / ${pedestrianPlanned} planned. One was retired without clearing its slot, or made present without being counted.`);
      }
      return status;
    },
    dispose(): void {
      planQueue.length = 0;
      pending.clear();
    },
    traceVehicle(slot: number): VehicleTickTrace[] {
      if (!Number.isInteger(slot) || slot < 0 || slot >= settings.vehicles) {
        throw new Error(`traceVehicle needs a vehicle slot in [0, ${settings.vehicles}); received ${slot}.`);
      }
      let records = trace.get(slot);
      if (!records) { records = []; trace.set(slot, records); }
      return records;
    },
    vehicleRoute(slot: number): PlannedRoute | null {
      if (!Number.isInteger(slot) || slot < 0 || slot >= settings.vehicles) {
        throw new Error(`vehicleRoute needs a vehicle slot in [0, ${settings.vehicles}); received ${slot}.`);
      }
      return table.vehicleRoutes[slot] ?? null;
    },
    diagnostics(): PopulationDiagnostics {
      const describe = (kind: PopulationKind, slot: number): ActorDiagnostic => {
        const state = kind === "vehicle" ? table.vehicles[slot]! : table.pedestrians[slot]!;
        const poses = kind === "vehicle" ? table.poses.vehicles : table.poses.pedestrians;
        const route = kind === "vehicle" ? table.vehicleRoutes[slot] : table.pedestrianRoutes[slot];
        const index = route ? occurrenceAtDistance(route, state.travelledM) : 0;
        const at = slot * 3;
        return Object.freeze({
          slot,
          generation: poses.current.generation[slot]!,
          active: poses.active[slot] === 1,
          pending: kind === "vehicle" && pending.has(slot),
          position: Object.freeze([poses.current.position[at]!, poses.current.position[at + 1]!, poses.current.position[at + 2]!] as const),
          speedMps: poses.speedMps[slot]!,
          travelledM: state.travelledM,
          stoppedSeconds: state.stoppedSeconds,
          routeEntryEdgeId: route ? route.entryEdgeId : null,
          routeEdges: route ? route.edges.length : 0,
          routeLengthM: route ? route.totalLengthM : 0,
          routeIndex: index,
          junctionId: route ? (route.edges[index]!.junctionId ?? null) : null,
          variant: poses.variant[slot]!,
          scale: poses.scale[slot]!,
          footprint: kind === "vehicle" && poses.active[slot] ? vehicleFootprint(fleet, table, slot) : null,
          committed: state.committed,
          egressing: kind === "vehicle" ? table.vehicles[slot]!.egressing : false,
          egressOffsetM: kind === "vehicle" ? table.vehicles[slot]!.egressOffsetM : 0,
          retryTick: state.retryTick,
        });
      };
      return Object.freeze({
        vehicles: Object.freeze(table.vehicles.map((state) => describe("vehicle", state.slot))),
        pedestrians: Object.freeze(table.pedestrians.map((state) => describe("pedestrian", state.slot))),
        commitments: Object.freeze(admissions.snapshot()),
      });
    },
  };

  /** Slots that currently hold a plan, either active or waiting for a grant. */
  function enrolled(): number {
    let planned = 0;
    for (const route of table.vehicleRoutes) if (route) planned += 1;
    for (const route of table.pedestrianRoutes) if (route) planned += 1;
    return planned;
  }

  function generationsUsed(): number {
    let total = 0;
    for (const state of table.vehicles) total += state.generation;
    for (const state of table.pedestrians) total += state.generation;
    return total;
  }
}
