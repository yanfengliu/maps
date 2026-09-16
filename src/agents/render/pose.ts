import { Matrix4 } from "three";
import { writeSupportBasis, type AgentPoseBuffers } from "../../world/agent-poses.js";

const basis = new Float64Array(9);

export function poseBlend(poses: AgentPoseBuffers, slot: number, alpha: number): number {
  return poses.previous.generation[slot] === poses.current.generation[slot] ? Math.max(0, Math.min(1, alpha)) : 1;
}

/** No allocations or renderer movement authority: interpolate the core's slots. */
export function writePoseMatrix(poses: AgentPoseBuffers, slot: number, alpha: number, matrix: Matrix4): number {
  const previous = poses.previous;
  const current = poses.current;
  const blend = poseBlend(poses, slot, alpha);
  const index = slot * 3;
  const x = previous.position[index]! + (current.position[index]! - previous.position[index]!) * blend;
  const y = previous.position[index + 1]! + (current.position[index + 1]! - previous.position[index + 1]!) * blend;
  const z = previous.position[index + 2]! + (current.position[index + 2]! - previous.position[index + 2]!) * blend;
  const difference = Math.atan2(Math.sin(current.yaw[slot]! - previous.yaw[slot]!), Math.cos(current.yaw[slot]! - previous.yaw[slot]!));
  const yaw = previous.yaw[slot]! + difference * blend;
  const scale = poses.scale[slot]!;
  writeSupportBasis(yaw,
    previous.supportNormal[index]! + (current.supportNormal[index]! - previous.supportNormal[index]!) * blend,
    previous.supportNormal[index + 1]! + (current.supportNormal[index + 1]! - previous.supportNormal[index + 1]!) * blend,
    previous.supportNormal[index + 2]! + (current.supportNormal[index + 2]! - previous.supportNormal[index + 2]!) * blend, basis);
  matrix.set(basis[0]! * scale, basis[3]! * scale, basis[6]! * scale, x,
    basis[1]! * scale, basis[4]! * scale, basis[7]! * scale, y,
    basis[2]! * scale, basis[5]! * scale, basis[8]! * scale, z, 0, 0, 0, 1);
  return previous.travelledMetres[slot]! + (current.travelledMetres[slot]! - previous.travelledMetres[slot]!) * blend;
}
