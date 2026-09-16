/**
 * Stable slots and the dense pose buffers. This module is the only writer of
 * `WorldAgentPoses`, which is the contract the core already owns: the renderer
 * reads those buffers and has no simulation authority.
 *
 * A slot's identity is its index. A retirement increments `generation`, and that
 * is the whole mechanism that makes the renderer snap rather than fly across the
 * city: `poseBlend` returns 1 whenever the previous and current generation
 * differ, so an interpolated frame can never draw a respawned actor between two
 * unrelated places.
 */

import {
  VEHICLE_CLASSES, HUMAN_ASSET_URLS, type VehicleAssetManifest,
} from "../../world/agent-assets.ts";
import type { AgentPoseBuffers, VehiclePoseBuffers, WorldAgentPoses } from "../../world/agent-poses.ts";
import type { ActorKind } from "../../network/passages.ts";
import type { PopulationSettings } from "./config.ts";
import type { PlannedRoute } from "./routes.ts";

export interface VehicleSlotState {
  slot: number;
  generation: number;
  variant: number;
  scale: number;
  /** Position along the route in route-absolute metres. */
  travelledM: number;
  /** Arc distance already observed to the authority; never allowed to move backwards. */
  observedM: number;
  speedMps: number;
  speedFactor: number;
  /** Fractional lane offset from the route edge centreline, in lane widths. */
  laneIndex: number;
  targetLaneIndex: number;
  frontSteeringRadians: number;
  stoppedSeconds: number;
  stopping: boolean;
  committed: boolean;
  routeIndex: number;
  /** Set when the slot is bound to a boundary binding; retired through `retireBoundary`. */
  boundary: boolean;
  /** True while the body is walking its final outward envelope. */
  egressing: boolean;
  /** Outward metres past the route terminus while the body clears the AOI side. */
  egressOffsetM: number;
  /** Earliest tick this free slot may attempt another spawn after a refusal. */
  retryTick: number;
}

export interface PedestrianSlotState {
  slot: number;
  generation: number;
  variant: number;
  scale: number;
  travelledM: number;
  observedM: number;
  speedMps: number;
  cadenceMps: number;
  stoppedSeconds: number;
  queued: boolean;
  committed: boolean;
  routeIndex: number;
  /** Earliest tick this free slot may attempt another spawn after a refusal. */
  retryTick: number;
}

export interface SlotTable {
  readonly settings: PopulationSettings;
  readonly poses: WorldAgentPoses;
  readonly vehicles: VehicleSlotState[];
  readonly pedestrians: PedestrianSlotState[];
  /** The live plan per slot, owned here so both kinds and the renderer agree. */
  readonly vehicleRoutes: (PlannedRoute | null)[];
  readonly pedestrianRoutes: (PlannedRoute | null)[];
  /** Active back-references so the renderer's variants and the kind steps agree. */
  readonly vehicleVariants: number;
  readonly pedestrianVariants: number;
}

function createSnapshot(count: number) {
  return {
    position: new Float32Array(count * 3),
    supportNormal: new Float32Array(count * 3),
    yaw: new Float32Array(count),
    travelledMetres: new Float64Array(count),
    generation: new Uint32Array(count),
  };
}

export function createSlotTable(settings: PopulationSettings): SlotTable {
  const pedestrianCount = settings.pedestrians;
  const vehicleCount = settings.vehicles;
  const pedestrianPoses: AgentPoseBuffers = {
    count: pedestrianCount,
    previous: createSnapshot(pedestrianCount),
    current: createSnapshot(pedestrianCount),
    active: new Uint8Array(pedestrianCount),
    speedMps: new Float32Array(pedestrianCount),
    scale: new Float32Array(pedestrianCount),
    variant: new Uint8Array(pedestrianCount),
  };
  const vehiclePoses: VehiclePoseBuffers = {
    count: vehicleCount,
    previous: { ...createSnapshot(vehicleCount), wheelOffsets: new Float32Array(vehicleCount * 4), frontSteeringRadians: new Float32Array(vehicleCount) },
    current: { ...createSnapshot(vehicleCount), wheelOffsets: new Float32Array(vehicleCount * 4), frontSteeringRadians: new Float32Array(vehicleCount) },
    active: new Uint8Array(vehicleCount),
    speedMps: new Float32Array(vehicleCount),
    scale: new Float32Array(vehicleCount),
    variant: new Uint8Array(vehicleCount),
  };
  // Every slot starts with an upward support normal, because the shared
  // validators reject a zero normal even on an inactive slot.
  for (const poses of [pedestrianPoses, vehiclePoses]) {
    for (let slot = 0; slot < poses.count; slot++) {
      poses.current.supportNormal[slot * 3 + 1] = 1;
      poses.previous.supportNormal[slot * 3 + 1] = 1;
      poses.scale[slot] = 1;
    }
  }
  const vehicles: VehicleSlotState[] = Array.from({ length: vehicleCount }, (_, slot) => ({
    slot, generation: 0, variant: slot % VEHICLE_CLASSES.length, scale: 1, travelledM: 0, observedM: 0,
    speedMps: 0, speedFactor: 1, laneIndex: 0, targetLaneIndex: 0, frontSteeringRadians: 0,
    stoppedSeconds: 0, stopping: true, committed: false, routeIndex: 0, boundary: false, egressing: false, egressOffsetM: 0, retryTick: 0,
  }));
  const pedestrians: PedestrianSlotState[] = Array.from({ length: pedestrianCount }, (_, slot) => ({
    slot, generation: 0, variant: slot % HUMAN_ASSET_URLS.length, scale: 1, travelledM: 0, observedM: 0,
    speedMps: 0, cadenceMps: 1, stoppedSeconds: 0, queued: false, committed: false, routeIndex: 0,
    retryTick: 0,
  }));
  return Object.freeze({
    settings, poses: { pedestrians: pedestrianPoses, vehicles: vehiclePoses }, vehicles, pedestrians,
    vehicleRoutes: new Array<PlannedRoute | null>(vehicleCount).fill(null),
    pedestrianRoutes: new Array<PlannedRoute | null>(pedestrianCount).fill(null),
    vehicleVariants: VEHICLE_CLASSES.length, pedestrianVariants: HUMAN_ASSET_URLS.length,
  });
}

/** Footprint radius of a delivered vehicle class at a scale, from its own collision envelope. */
export function vehicleRadiusM(manifest: VehicleAssetManifest, variant: number, scale: number): number {
  const asset = manifest.vehicles[variant];
  if (!asset) throw new Error(`Vehicle slot uses class index ${variant}; the delivered fleet has ${manifest.vehicles.length} classes in VEHICLE_CLASSES order.`);
  if (!(scale > 0)) throw new Error(`Vehicle class ${asset.id} received scale ${scale}; a supported body needs a positive scale.`);
  return Math.hypot(asset.collision.length, asset.collision.width) * scale / 2;
}

/**
 * Copy current into previous for one slot. Called once at the top of every fixed
 * tick, before any integration, so the renderer always interpolates between this
 * tick's start and end.
 */
export function stageSlot(poses: AgentPoseBuffers, slot: number): void {
  const index = slot * 3;
  poses.previous.position[index] = poses.current.position[index]!;
  poses.previous.position[index + 1] = poses.current.position[index + 1]!;
  poses.previous.position[index + 2] = poses.current.position[index + 2]!;
  poses.previous.supportNormal[index] = poses.current.supportNormal[index]!;
  poses.previous.supportNormal[index + 1] = poses.current.supportNormal[index + 1]!;
  poses.previous.supportNormal[index + 2] = poses.current.supportNormal[index + 2]!;
  poses.previous.yaw[slot] = poses.current.yaw[slot]!;
  poses.previous.travelledMetres[slot] = poses.current.travelledMetres[slot]!;
  poses.previous.generation[slot] = poses.current.generation[slot]!;
}

export function stageVehicleSlots(poses: VehiclePoseBuffers, slot: number): void {
  stageSlot(poses, slot);
  poses.previous.frontSteeringRadians[slot] = poses.current.frontSteeringRadians[slot]!;
  for (let wheel = 0; wheel < 4; wheel += 1) {
    poses.previous.wheelOffsets[slot * 4 + wheel] = poses.current.wheelOffsets[slot * 4 + wheel]!;
  }
}

/** Place a slot's displayed body at a world pose. Vehicles also carry wheels and steering. */
export function placeSlot(
  poses: AgentPoseBuffers,
  slot: number,
  at: { x: number; y: number; z: number },
  yaw: number,
  options: { wheelOffsets?: readonly number[]; steeringRadians?: number } = {},
): void {
  const index = slot * 3;
  poses.current.position[index] = at.x;
  poses.current.position[index + 1] = at.y;
  poses.current.position[index + 2] = at.z;
  poses.current.supportNormal[index] = 0;
  poses.current.supportNormal[index + 1] = 1;
  poses.current.supportNormal[index + 2] = 0;
  poses.current.yaw[slot] = yaw;
  const vehicle = poses as VehiclePoseBuffers;
  if (vehicle.current.wheelOffsets) {
    for (let wheel = 0; wheel < 4; wheel += 1) vehicle.current.wheelOffsets[slot * 4 + wheel] = options.wheelOffsets?.[wheel] ?? 0;
    vehicle.current.frontSteeringRadians[slot] = options.steeringRadians ?? 0;
  }
}

export function setSpeed(poses: AgentPoseBuffers, slot: number, speedMps: number): void {
  poses.speedMps[slot] = speedMps;
}

export function setTravelled(poses: AgentPoseBuffers, slot: number, travelledM: number): void {
  poses.current.travelledMetres[slot] = travelledM;
}

/**
 * Make a slot present under a fresh generation. The generation changes on the
 * spawn rather than the retirement so the first drawn frame of a slot never
 * interpolates from whatever the slot last held.
 */
export function spawnSlot(poses: AgentPoseBuffers, slot: number): number {
  const generation = (poses.current.generation[slot]! + 1) >>> 0;
  poses.current.generation[slot] = generation;
  poses.previous.generation[slot] = generation;
  poses.active[slot] = 1;
  return generation;
}

export function retireSlot(poses: AgentPoseBuffers, slot: number): void {
  poses.active[slot] = 0;
}

export type { ActorKind };
