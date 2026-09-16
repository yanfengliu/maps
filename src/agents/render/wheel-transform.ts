import { Matrix4, type Vector3 } from "three";

/** Asset-space pivot: spin around +X, then steer +Z toward +X around +Y.
 * Offset is model metres along support +Y; the outer actor matrix applies scale/support.
 * Prefixing this transform also rotates translated child primitives around the axle.
 */
export function writeWheelTransform(bind: Matrix4, pivot: Vector3, steering: number, spin: number, offset: number, out: Matrix4): void {
  const c = Math.cos(steering), s = Math.sin(steering), cs = Math.cos(spin), sn = Math.sin(spin);
  const { x, y, z } = pivot;
  out.set(c, s * sn, s * cs, x - c * x - s * sn * y - s * cs * z,
    0, cs, -sn, y + offset - cs * y + sn * z,
    -s, c * sn, c * cs, z + s * x - c * sn * y - c * cs * z,
    0, 0, 0, 1).multiply(bind);
}
