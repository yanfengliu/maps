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

/**
 * Copy one pose matrix into an interleaved instance buffer.
 *
 * `writePoseMatrix` is the one place a pose becomes a matrix; this is the one place a matrix
 * becomes the 16 floats a drawable reads. It is `Matrix4.toArray` written out, into the same
 * `Float32Array` three's own `InstancedMesh.setMatrixAt` writes into and in the same
 * column-major order, so a caller that swaps one for the other changes nothing the GPU sees.
 *
 * It is written out rather than delegated to `toArray` because `toArray` takes a
 * `number[] | Float32Array` and is therefore megamorphic at every call site in the bundle:
 * measured in this lane's `micro()` on the app's own objects at 3,000 pedestrians, it costs
 * 0.29 to 0.64 ms per 1,000 calls against 0.09 to 0.17 ms per 1,000 for the same sixteen
 * stores written here. At 3,000 pedestrians a frame that is 0.5 ms against 1.8.
 */
export function writeInstanceMatrix(matrix: Matrix4, out: Float32Array, offset: number): void {
  const e = matrix.elements;
  out[offset] = e[0]!;
  out[offset + 1] = e[1]!;
  out[offset + 2] = e[2]!;
  out[offset + 3] = e[3]!;
  out[offset + 4] = e[4]!;
  out[offset + 5] = e[5]!;
  out[offset + 6] = e[6]!;
  out[offset + 7] = e[7]!;
  out[offset + 8] = e[8]!;
  out[offset + 9] = e[9]!;
  out[offset + 10] = e[10]!;
  out[offset + 11] = e[11]!;
  out[offset + 12] = e[12]!;
  out[offset + 13] = e[13]!;
  out[offset + 14] = e[14]!;
  out[offset + 15] = e[15]!;
}
