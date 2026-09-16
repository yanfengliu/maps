/**
 * Vehicles: 200 stable slots driving the frozen lane graph.
 *
 * What each vehicle does every fixed tick, and nothing else:
 *
 *  - car-following with IDM, using the edge's own `speedMps` as the desired
 *    speed and a standstill gap never below the shared 0.5 m `stopGapM`;
 *  - a lateral offset inside its movement width, with lane changes only inside
 *    the intervals `laneChangeOverlap` returns and only with MOBIL's safety and
 *    incentive tests passed;
 *  - signal and control obedience through one admission decision, never two:
 *    the vehicle asks the shared authority with its `RoutePassage` and moves
 *    into a governed occurrence only on the grant that comes back.
 *
 * The stop-line offset policy is the one piece of new authority arithmetic here.
 * A mapped stop/yield obligation sits at a real arc distance along the route and
 * binds the *front of the body*, not its origin. The footprint the authority
 * compares therefore reaches `footprintRadius` ahead of the origin, so the
 * smallest legal halt is `controlDistance - footprintRadius` before the
 * obligation and `gateDistance - footprintRadius` before an unadmitted gate.
 * The halt is never allowed to be negative: a body may not back up past the
 * route's own start, and that boundary is reported rather than driven wrongly.
 */

import type { ActorFootprint } from "../../network/footprints.ts";
import { footprintRadius, projectVehicleFootprint } from "../../network/footprints.ts";
import { laneChangeOverlap } from "../../network/geometry.ts";
import type { LaneEdge, NetworkData } from "../../world/network-data.ts";
import type { VehicleAssetManifest } from "../../world/agent-assets.ts";
import { VEHICLE_DYNAMICS } from "./config.ts";
import { sampleRoute, type PlannedRoute } from "./routes.ts";
import { placeSlot, type SlotTable } from "./slots.ts";

const UP = Object.freeze({ x: 0, y: 1, z: 0 });

export function occurrenceIndex(route: PlannedRoute, travelledM: number): number {
  let index = 0;
  while (index + 1 < route.edges.length && travelledM >= route.starts[index + 1]!) index += 1;
  return index;
}

/** The gate a route occurrence belongs to, if any. */
export function gateFor(route: PlannedRoute, occurrence: number) {
  return route.gates.find((gate) => gate.entryIndex === occurrence) ?? null;
}

/** Place a vehicle's displayed body at a route distance, offset laterally in its lane. */
export function placeVehicle(table: SlotTable, slot: number, travelledM: number, laneIndex = 0): void {
  const state = table.vehicles[slot]!;
  const route = table.vehicleRoutes[slot]!;
  const occurrence = occurrenceIndex(route, travelledM);
  const local = Math.max(0, Math.min(route.edges[occurrence]!.lengthM, travelledM - route.starts[occurrence]!));
  const at = sampleRoute(route, occurrence, local);
  const edge = route.edges[occurrence]! as LaneEdge;
  const lateral = laneIndex * edge.widthM * 0.45;
  const rightX = Math.cos(at.heading);
  const rightZ = -Math.sin(at.heading);
  placeSlot(table.poses.vehicles, slot, { x: at.x + rightX * lateral, y: at.y, z: at.z + rightZ * lateral }, at.heading);
  table.poses.vehicles.current.travelledMetres[slot] = travelledM;
  state.routeIndex = occurrence;
}

/**
 * The displayed collision footprint: the delivered class's generated envelope,
 * projected from the displayed pose. This is the object the authority compares,
 * and it is not the model origin.
 */
export function vehicleFootprint(manifest: VehicleAssetManifest, table: SlotTable, slot: number): ActorFootprint {
  const state = table.vehicles[slot]!;
  const asset = manifest.vehicles[state.variant];
  if (!asset) throw new Error(`Vehicle slot ${slot} uses class index ${state.variant}; the delivered fleet has ${manifest.vehicles.length} classes in VEHICLE_CLASSES order.`);
  const position = table.poses.vehicles.current.position;
  const index = slot * 3;
  return projectVehicleFootprint(
    asset,
    { x: position[index]!, y: position[index + 1]!, z: position[index + 2]! },
    table.poses.vehicles.current.yaw[slot]!,
    UP,
    state.scale,
    [0, 0, 0, 0],
  );
}

export function vehicleRadius(manifest: VehicleAssetManifest, table: SlotTable, slot: number): number {
  const state = table.vehicles[slot]!;
  const asset = manifest.vehicles[state.variant]!;
  return Math.hypot(asset.collision.length, asset.collision.width) * state.scale / 2;
}

/* --------------------------------------------------------------------- IDM */

export interface Leader {
  readonly gapM: number;
  readonly speedMps: number;
}

function idmAcceleration(speedMps: number, desiredMps: number, leader: Leader | null): number {
  const { minimumSpacingM, headwaySeconds, maximumAccelerationMps2, comfortableBrakingMps2 } = VEHICLE_DYNAMICS.idm;
  const free = maximumAccelerationMps2 * (1 - (speedMps / Math.max(0.1, desiredMps)) ** 4);
  if (!leader) return free;
  const gap = Math.max(minimumSpacingM, leader.gapM);
  const closing = speedMps - leader.speedMps;
  const desiredGap = minimumSpacingM + Math.max(0, speedMps * headwaySeconds + (speedMps * closing) / (2 * Math.sqrt(maximumAccelerationMps2 * comfortableBrakingMps2)));
  return free - maximumAccelerationMps2 * (desiredGap / gap) ** 2;
}

/** IDM acceleration clamped to the fleet's braking capability. */
export function vehicleAcceleration(speedMps: number, desiredSpeedMps: number, leader: Leader | null): number {
  const raw = idmAcceleration(speedMps, desiredSpeedMps, leader);
  return Math.max(-VEHICLE_DYNAMICS.idm.emergencyBrakingMps2, Math.min(VEHICLE_DYNAMICS.idm.maximumAccelerationMps2, raw));
}

export interface LaneLeader { ahead: Leader | null; behind: Leader | null }

/**
 * A junction index over the controller's own conflict disks. Occupation is asked
 * once per vehicle per tick, and the delivered graph has 213 authorities against
 * up to 200 vehicles, so asking every authority about every body is 42,600 hull
 * tests per tick — which measured as the single largest cost in the fixed step.
 * The index narrows that to the authorities whose disks are actually near the
 * body, without changing which bodies count as inside one: the caller still
 * applies the authority's own `footprintOccupies` to the candidates this returns.
 */
export class JunctionIndex {
  readonly ids: readonly string[];
  private readonly areas: readonly { position: { x: number; z: number }; radiusM: number }[][];
  private readonly cellSizeM: number;
  private readonly cells = new Map<number, number[]>();

  constructor(network: NetworkData, cellSizeM = 32) {
    this.cellSizeM = cellSizeM;
    this.areas = network.junctions.map((junction) => junction.conflictAreas ?? [{ position: junction.position, radiusM: junction.radiusM }]);
    this.ids = network.junctions.map((junction) => junction.id);
    for (const [index, areas] of this.areas.entries()) {
      for (const area of areas) {
        const span = Math.ceil(area.radiusM / cellSizeM) + 1;
        const column = Math.floor(area.position.x / cellSizeM);
        const row = Math.floor(area.position.z / cellSizeM);
        for (let dx = -span; dx <= span; dx += 1) {
          for (let dz = -span; dz <= span; dz += 1) {
            const key = (column + dx + 0x8000) * 0x10000 + (row + dz + 0x8000);
            const bucket = this.cells.get(key) ?? [];
            if (!bucket.includes(index)) bucket.push(index);
            this.cells.set(key, bucket);
          }
        }
      }
    }
    for (const bucket of this.cells.values()) bucket.sort((a, b) => a - b);
  }

  /** Indices of the authorities whose disks could touch a body inside this circle. */
  near(x: number, z: number, radiusM: number, out: number[]): number {
    out.length = 0;
    const span = Math.ceil(radiusM / this.cellSizeM);
    const column = Math.floor(x / this.cellSizeM);
    const row = Math.floor(z / this.cellSizeM);
    for (let dx = -span; dx <= span; dx += 1) {
      for (let dz = -span; dz <= span; dz += 1) {
        const key = (column + dx + 0x8000) * 0x10000 + (row + dz + 0x8000);
        for (const index of this.cells.get(key) ?? []) if (!out.includes(index)) out.push(index);
      }
    }
    out.sort((a, b) => a - b);
    return out.length;
  }
}

export interface VehicleFrame {
  readonly ahead: (Leader | null)[];
  readonly behind: (Leader | null)[];
  /** Keyed `${edgeId}#${laneIndex}`, the neighbours MOBIL reasons about. */
  readonly lane: Map<string, LaneLeader>;
  /** Per junction, the slots whose bodies are physically inside a conflict area. */
  readonly occupancy: Map<string, Set<number>>;
}

/**
 * One pass over the population builds the leader field the car-following law
 * reads and the physical junction occupancy the yield rule reads. Occupancy is
 * measured from real footprints through the authority's own `footprintOccupies`,
 * so a vehicle queued outside a compound is not counted and `receivingSpace`
 * stays a measurement rather than a flag.
 */
export function buildVehicleFrame(
  table: SlotTable,
  footprints: readonly (ActorFootprint | undefined)[],
  occupies: (junctionId: string, footprint: ActorFootprint) => boolean,
  index: JunctionIndex,
): VehicleFrame {
  const count = table.vehicles.length;
  const ahead = new Array<Leader | null>(count).fill(null);
  const behind = new Array<Leader | null>(count).fill(null);
  const lane = new Map<string, LaneLeader>();
  const occupancy = new Map<string, Set<number>>();
  const vehicles = table.poses.vehicles;
  const byEdge = new Map<string, number[]>();
  const routeOf = new Map<number, PlannedRoute>();
  for (const state of table.vehicles) {
    const slot = state.slot;
    if (!vehicles.active[slot]) continue;
    const route = table.vehicleRoutes[slot];
    if (!route) continue;
    const edgeId = route.edgeIds[state.routeIndex];
    if (!edgeId) continue;
    routeOf.set(slot, route);
    const bucket = byEdge.get(edgeId) ?? [];
    bucket.push(slot);
    byEdge.set(edgeId, bucket);
  }
  for (const [edgeId, bucket] of byEdge) {
    // Descending distance along this edge, so `bucket[i]` is the body furthest
    // along it and `bucket[i + 1]` is the one behind it. `travelledM` is
    // route-absolute and two bodies on one edge may hold different routes, so the
    // ordering is measured on this edge: `travelledM - starts[routeIndex]` is the
    // offset within that edge on either route, which is what makes the two
    // comparable. Sorting by the raw route distance instead put unrelated routes in
    // order and produced zero-metre gaps between bodies that were nowhere near each
    // other, which braked the whole lane to a standstill.
    const along = (slot: number): number => {
      const state = table.vehicles[slot]!;
      return state.travelledM - (routeOf.get(slot)?.starts[state.routeIndex] ?? 0);
    };
    // Two bodies on different route objects are not comparable by route distance,
    // so their separation is read from the pose buffers the population has already
    // written. One route object means one shared scale, and the distance is exact.
    const separation = (leader: number, follower: number): number => {
      if (routeOf.get(leader) === routeOf.get(follower)) return table.vehicles[leader]!.travelledM - table.vehicles[follower]!.travelledM;
      const pa = table.vehicles[leader]!.slot * 3, pb = table.vehicles[follower]!.slot * 3;
      return Math.hypot(vehicles.current.position[pa]! - vehicles.current.position[pb]!, vehicles.current.position[pa + 2]! - vehicles.current.position[pb + 2]!);
    };
    bucket.sort((a, b) => along(b) - along(a));
    for (let i = 0; i < bucket.length; i += 1) {
      const leader = bucket[i]!;
      const state = table.vehicles[leader]!;
      const behindSlot = bucket[i + 1];
      if (behindSlot !== undefined) {
        const other = table.vehicles[behindSlot]!;
        // The pair is (bucket[i], bucket[i + 1]) = (ahead, behind), so the gap
        // belongs to the body BEHIND, and its leader's speed is the one that
        // matters. Assigning it the other way round gave every body in a platoon a
        // leader 0.5 m in front of it — the body behind it — and each of them
        // braked for its own follower: a queue that met at a portal stayed at
        // standstill for the rest of the run with every hull intact and no rule
        // broken anywhere. Measured: three bodies sharing one approach edge, gaps
        // 0.41-0.50 m, all three at 0.00 m/s for 600 consecutive ticks.
        const gap = separation(leader, behindSlot);
        const existing = ahead[behindSlot];
        if (!existing || gap < existing.gapM) ahead[behindSlot] = { gapM: gap, speedMps: state.speedMps };
        const follower = behind[leader];
        if (!follower || gap < follower.gapM) behind[leader] = { gapM: gap, speedMps: other.speedMps };
      }
      const laneIndex = Math.round(state.laneIndex);
      const key = `${edgeId}#${laneIndex}`;
      const record = lane.get(key) ?? { ahead: null, behind: null };
      const nextAhead = bucket[i - 1];
      if (nextAhead !== undefined && Math.round(table.vehicles[nextAhead]!.laneIndex) === laneIndex) {
        record.ahead = { gapM: along(nextAhead) - along(leader), speedMps: table.vehicles[nextAhead]!.speedMps };
      }
      const nextBehind = bucket[i + 1];
      if (nextBehind !== undefined && Math.round(table.vehicles[nextBehind]!.laneIndex) === laneIndex) {
        record.behind = { gapM: along(leader) - along(nextBehind), speedMps: table.vehicles[nextBehind]!.speedMps };
      }
      lane.set(key, record);
    }
  }
  // A leader on the next occurrence of the same route is still a leader.
  for (const state of table.vehicles) {
    const slot = state.slot;
    if (ahead[slot] || !vehicles.active[slot]) continue;
    const route = table.vehicleRoutes[slot];
    if (!route || state.routeIndex + 1 >= route.edges.length) continue;
    for (const other of byEdge.get(route.edgeIds[state.routeIndex + 1]!) ?? []) {
      // Only a body on the same route can be ahead on the next occurrence; a
      // different route's distance along that edge says nothing about this one.
      if (routeOf.get(other) !== route) continue;
      const gap = route.edges[state.routeIndex]!.lengthM - state.travelledM + table.vehicles[other]!.travelledM;
      const existing = ahead[slot];
      if (!existing || gap < existing.gapM) ahead[slot] = { gapM: gap, speedMps: table.vehicles[other]!.speedMps };
    }
  }
  const candidates: number[] = [];
  for (const state of table.vehicles) {
    const slot = state.slot;
    const footprint = footprints[slot];
    if (!vehicles.active[slot] || !footprint) continue;
    index.near(footprint.position.x, footprint.position.z, footprintRadius(footprint) + 2, candidates);
    for (const candidate of candidates) {
      const id = index.ids[candidate]!;
      if (!occupies(id, footprint)) continue;
      const inside = occupancy.get(id) ?? new Set<number>();
      inside.add(slot);
      occupancy.set(id, inside);
    }
  }
  return { ahead, behind, lane, occupancy };
}

/** Whether a measured gap in conflicting traffic exists at a junction. */
export function gapSatisfied(occupancy: ReadonlyMap<string, Set<number>>, junctionId: string, self: number): boolean {
  const inside = occupancy.get(junctionId);
  if (!inside) return true;
  for (const other of inside) if (other !== self) return false;
  return true;
}

/**
 * Capacity reservation. Before a body enters a compound it reserves room for the
 * whole projected hull on the far side, so a queue that blocks the exit reads as
 * `receivingSpace: false` rather than as a collision. The measurement is the free
 * route distance after the compound's own last occurrence, less this body's
 * length and the shared 0.5 m stop gap.
 */
export function hasReceivingSpace(
  table: SlotTable,
  route: PlannedRoute,
  gateIndex: number,
  travelledM: number,
  self: number,
  radiusM: number,
  stopGapM: number,
): boolean {
  const gate = route.gates[gateIndex];
  if (!gate) return true;
  const last = route.gates.at(-1)!;
  const afterExit = route.starts[last.entryIndex]! + route.edges[last.entryIndex]!.lengthM;
  const needed = afterExit + 2 * radiusM + stopGapM;
  for (const state of table.vehicles) {
    const other = state.slot;
    if (other === self || !table.poses.vehicles.active[other]) continue;
    if (table.vehicleRoutes[other] !== route) continue;
    if (state.travelledM <= travelledM) continue;
    if (state.travelledM < needed) return false;
  }
  return true;
}

/* ------------------------------------------------------------ MOBIL lane change */

export function considerLaneChange(
  network: NetworkData,
  table: SlotTable,
  frame: VehicleFrame,
  slot: number,
  edge: LaneEdge,
  desiredSpeedMps: number,
): void {
  const state = table.vehicles[slot]!;
  if (state.committed || edge.junctionId !== null || table.poses.vehicles.speedMps[slot]! < 1) {
    // A missing lateral neighbour is not permission to cross a junction or an
    // opposing carriageway, and a committed body keeps its lane.
    state.targetLaneIndex = state.laneIndex;
    return;
  }
  const { safeBrakingMps2, minimumAdvantageMps2 } = VEHICLE_DYNAMICS.mobil;
  const own = vehicleAcceleration(state.speedMps, desiredSpeedMps, frame.ahead[slot] ?? null);
  for (const side of ["left", "right"] as const) {
    const neighbourId = side === "left" ? edge.leftLaneId : edge.rightLaneId;
    if (neighbourId === null) continue;
    const neighbour = network.lanes.find((lane) => lane.id === neighbourId);
    if (!neighbour || !laneChangeOverlap(edge, neighbour)) continue;
    const targetIndex = state.laneIndex + (side === "left" ? 1 : -1);
    if (Math.abs(targetIndex) > 1) continue;
    const target = frame.lane.get(`${neighbour.id}#${Math.round(targetIndex)}`) ?? { ahead: null, behind: null };
    const advantage = vehicleAcceleration(state.speedMps, desiredSpeedMps, target.ahead) - own;
    if (advantage <= minimumAdvantageMps2) continue;
    // MOBIL's safety criterion: the new follower must not have to brake harder
    // than `safeBrakingMps2` because of this change.
    if (target.behind && vehicleAcceleration(target.behind.speedMps, desiredSpeedMps, { gapM: target.behind.gapM, speedMps: state.speedMps }) < -safeBrakingMps2) continue;
    state.targetLaneIndex = targetIndex;
    return;
  }
  state.targetLaneIndex = state.laneIndex;
}

/** Step the lateral offset toward its target; the body never jumps sideways. */
export function stepLateral(state: { laneIndex: number; targetLaneIndex: number }, step: number): void {
  const limit = VEHICLE_DYNAMICS.mobil.lateralRateMps * step * 0.8;
  const delta = state.targetLaneIndex - state.laneIndex;
  state.laneIndex += Math.max(-limit, Math.min(limit, delta));
  if (Math.abs(state.targetLaneIndex - state.laneIndex) < 1e-3) state.laneIndex = state.targetLaneIndex;
}

export { sampleRoute };
