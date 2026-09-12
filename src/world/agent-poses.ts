/**
 * Shared read-only view of fixed-step simulation state. Core is the sole writer.
 * Packed XYZ position and supportNormal have count * 3 entries.
 * Slot indices are stable IDs. Positions are metres at feet/wheel contact origin,
 * +Y up, +Z forward, with yaw around +Y: atan2(deltaX, deltaZ).
 */
export interface AgentPoseSnapshot {
  readonly position: Float32Array;
  /** Upward unit support-plane normals from the core's level-aware surface sampler. */
  readonly supportNormal: Float32Array;
  readonly yaw: Float32Array;
  readonly travelledMetres: Float64Array;
  /** Changes when a slot respawns. Never interpolate across a generation change. */
  readonly generation: Uint32Array;
}

export interface VehiclePoseSnapshot extends AgentPoseSnapshot {
  /** Model metres along the support normal, four per slot in manifest wheelObjects order. */
  readonly wheelOffsets: Float32Array;
}

/** Current fleet openings have 75 mm radial clearance and liners 55 mm. */
export const VEHICLE_WHEEL_OFFSET_LIMIT_METRES = 0.05;

export interface AgentPoseBuffers<T extends AgentPoseSnapshot = AgentPoseSnapshot> {
  readonly count: number;
  readonly previous: T;
  readonly current: T;
  /** Simulation presence. Rendering LOD must never reduce active population. */
  readonly active: Uint8Array;
  readonly speedMps: Float32Array;
  readonly scale: Float32Array;
  /** Index into HUMAN_ASSET_URLS or VEHICLE_CLASSES, depending on population. */
  readonly variant: Uint8Array;
}

export type VehiclePoseBuffers = AgentPoseBuffers<VehiclePoseSnapshot>;

export interface WorldAgentPoses {
  readonly pedestrians: AgentPoseBuffers;
  readonly vehicles: VehiclePoseBuffers;
}

/** Validate once at renderer attachment, keeping the frame path allocation free. */
export function assertAgentPoseBuffers(poses: AgentPoseBuffers, label: string): void {
  if (!Number.isInteger(poses.count) || poses.count < 0) {
    throw new Error(`${label} pose count ${poses.count} must be a non-negative integer.`);
  }
  for (const [name, snapshot] of [["previous", poses.previous], ["current", poses.current]] as const) {
    for (const field of ["position", "supportNormal", "yaw", "travelledMetres", "generation"] as const) {
      const array = snapshot[field];
      const expected = field === "position" || field === "supportNormal" ? poses.count * 3 : poses.count;
      if (!array || array.length !== expected) {
        throw new Error(`${label} ${name}.${field} has ${array?.length ?? "no"} entries; ${poses.count} stable slots require ${expected}.`);
      }
    }
    for (let slot = 0; slot < poses.count; slot++) {
      const n = slot * 3;
      const length = Math.hypot(snapshot.supportNormal[n]!, snapshot.supportNormal[n + 1]!, snapshot.supportNormal[n + 2]!);
      if (!Number.isFinite(length) || Math.abs(length - 1) > .001 || !(snapshot.supportNormal[n + 1]! > 0)) {
        throw new Error(`${label} ${name}.supportNormal slot ${slot} must be a finite upward unit vector from its support surface.`);
      }
    }
  }
  for (const [field, array] of [["active", poses.active], ["speedMps", poses.speedMps], ["scale", poses.scale], ["variant", poses.variant]] as const) {
    if (array.length !== poses.count) {
      throw new Error(`${label} ${field} has ${array.length} entries; ${poses.count} stable slots require matching arrays.`);
    }
  }
}

export function assertVehiclePoseBuffers(poses: VehiclePoseBuffers, label = "Vehicle"): void {
  assertAgentPoseBuffers(poses, label);
  for (const [name, snapshot] of [["previous", poses.previous], ["current", poses.current]] as const) {
    if (!snapshot.wheelOffsets || snapshot.wheelOffsets.length !== poses.count * 4) {
      throw new Error(`${label} ${name}.wheelOffsets has ${snapshot.wheelOffsets?.length ?? "no"} entries; ${poses.count} stable slots require ${poses.count * 4} in manifest wheel order.`);
    }
    for (const offset of snapshot.wheelOffsets) {
      if (!Number.isFinite(offset) || Math.abs(offset) > Math.fround(VEHICLE_WHEEL_OFFSET_LIMIT_METRES)) {
        throw new Error(`${label} ${name}.wheelOffsets value ${offset} exceeds the current fleet's ±${VEHICLE_WHEEL_OFFSET_LIMIT_METRES}m support travel. Select a supported route surface before admission.`);
      }
    }
  }
}

/** Column-major right/up/forward basis, shared with collision projection. No allocation. */
export function writeSupportBasis(yaw: number, nx: number, ny: number, nz: number, out: { [index: number]: number }): void {
  const length = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(yaw + length) || !(length > 0) || !(ny > 0)) {
    throw new Error(`Agent support basis needs finite yaw and an upward normal; received yaw ${yaw}, normal [${nx}, ${ny}, ${nz}].`);
  }
  nx /= length; ny /= length; nz /= length;
  const sx = Math.sin(yaw), cz = Math.cos(yaw);
  const projection = sx * nx + cz * nz;
  let fx = sx - nx * projection, fy = -ny * projection, fz = cz - nz * projection;
  const forwardLength = Math.hypot(fx, fy, fz);
  fx /= forwardLength; fy /= forwardLength; fz /= forwardLength;
  out[0] = ny * fz - nz * fy; out[1] = nz * fx - nx * fz; out[2] = nx * fy - ny * fx;
  out[3] = nx; out[4] = ny; out[5] = nz;
  out[6] = fx; out[7] = fy; out[8] = fz;
}
