/** Presentation-only support probes. They do not change route heights or the
 * existing terrain oracle. Missing/ambiguous support leaves hardware unplaced.
 */
import type { MeshData } from "../../src/world/mesh.ts";
import type { WorldPoint } from "../../src/world/network-data.ts";
import type { VehicleAsset } from "../../src/world/agent-assets.ts";
import { VEHICLE_WHEEL_OFFSET_LIMIT_METRES, writeSupportBasis } from "../../src/world/agent-poses.ts";

export interface SurfaceContact { point: WorldPoint; normal: WorldPoint; triangle: number }
export type ContactQuery = (x: number, z: number, expectedY: number) => SurfaceContact | undefined;

/** Exact barycentric inclusion and closest supported level within 0.75 m.
 * Opposite surfaces at the same XY are never welded or selected by max height.
 * Distinct candidate heights equally near the requested level are ambiguous.
 */
export function contactQuery(mesh: MeshData): ContactQuery {
  const cells = new Map<string, number[]>(), p = mesh.positions, ids = mesh.indices;
  for (let i = 0; i < ids.length; i += 3) {
    const a = ids[i]! * 3, b = ids[i + 1]! * 3, c = ids[i + 2]! * 3;
    const minX = Math.floor(Math.min(p[a]!, p[b]!, p[c]!) / 10), maxX = Math.floor(Math.max(p[a]!, p[b]!, p[c]!) / 10);
    const minZ = Math.floor(Math.min(p[a + 2]!, p[b + 2]!, p[c + 2]!) / 10), maxZ = Math.floor(Math.max(p[a + 2]!, p[b + 2]!, p[c + 2]!) / 10);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`, bucket = cells.get(key);
      if (bucket) bucket.push(i); else cells.set(key, [i]);
    }
  }
  return (x, z, expectedY) => {
    let nearest: SurfaceContact | undefined, distance = .75, ambiguous = false;
    for (const i of cells.get(`${Math.floor(x / 10)},${Math.floor(z / 10)}`) ?? []) {
      const a = ids[i]! * 3, b = ids[i + 1]! * 3, c = ids[i + 2]! * 3;
      const ax = p[a]!, az = p[a + 2]!, bx = p[b]!, bz = p[b + 2]!, cx = p[c]!, cz = p[c + 2]!;
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-12) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator, w = 1 - u - v;
      if (u < 0 || v < 0 || w < 0) continue;
      const y = u * p[a + 1]! + v * p[b + 1]! + w * p[c + 1]!, delta = Math.abs(y - expectedY);
      if (delta > distance + 1e-9) continue;
      if (nearest && Math.abs(delta - distance) < 1e-9 && Math.abs(y - nearest.point.y) > 1e-5) { ambiguous = true; continue; }
      const ab = [bx - ax, p[b + 1]! - p[a + 1]!, bz - az], ac = [cx - ax, p[c + 1]! - p[a + 1]!, cz - az];
      let nx = ab[1]! * ac[2]! - ab[2]! * ac[1]!, ny = ab[2]! * ac[0]! - ab[0]! * ac[2]!, nz = ab[0]! * ac[1]! - ab[1]! * ac[0]!;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const length = Math.hypot(nx, ny, nz);
      if (!(ny > 0) || !Number.isFinite(length)) continue;
      if (delta < distance - 1e-9) ambiguous = false;
      nearest = { point: { x, y, z }, normal: { x: nx / length, y: ny / length, z: nz / length }, triangle: i / 3 }; distance = delta;
    }
    return ambiguous ? undefined : nearest;
  };
}

export interface SupportedVehicle {
  origin: WorldPoint;
  normal: WorldPoint;
  corners: WorldPoint[];
  maxY: number;
  wheelResidualM: number;
  supportTriangles: number[];
}

/** Bounded local planar pose: query all four manifest axle contacts using the
 * shared projected support basis. A discontinuity beyond actual wheel travel
 * rejects the pose. No claim about future steering or full route contact.
 */
export function supportedVehicle(asset: VehicleAsset, point: WorldPoint, yaw: number, road: ContactQuery, scale = 1): SupportedVehicle | undefined {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error(`Hardware clearance for ${asset.id} needs a positive finite displayed scale; received ${scale}.`);
  const contact = road(point.x, point.z, point.y);
  if (!contact) return undefined;
  const basis = new Float64Array(9), n = contact.normal;
  writeSupportBasis(yaw, n.x, n.y, n.z, basis);
  const transform = (x: number, y: number, z: number): WorldPoint => ({ x: contact.point.x + scale * (basis[0]! * x + basis[3]! * y + basis[6]! * z), y: contact.point.y + scale * (basis[1]! * x + basis[4]! * y + basis[7]! * z), z: contact.point.z + scale * (basis[2]! * x + basis[5]! * y + basis[8]! * z) });
  let wheelResidualM = 0;
  const supportTriangles = [contact.triangle];
  for (const x of [-asset.axles.trackMetres / 2, asset.axles.trackMetres / 2]) for (const z of [asset.axles.frontZ, asset.axles.rearZ]) {
    const expected = transform(x, 0, z), actual = road(expected.x, expected.z, expected.y);
    if (!actual) return undefined;
    // Intersect the wheel's travel ray with that exact local support plane.
    const denominator = actual.normal.x * n.x + actual.normal.y * n.y + actual.normal.z * n.z;
    if (!(denominator > 0)) return undefined;
    const travel = (actual.point.y - expected.y) * actual.normal.y / denominator;
    const landed = { x: expected.x + n.x * travel, y: expected.y + n.y * travel, z: expected.z + n.z * travel };
    const confirmed = road(landed.x, landed.z, landed.y);
    if (!confirmed || Math.abs(confirmed.point.y - landed.y) > 1e-5) return undefined;
    const residual = Math.abs(travel) / scale;
    if (residual > VEHICLE_WHEEL_OFFSET_LIMIT_METRES + 1e-6) return undefined;
    wheelResidualM = Math.max(wheelResidualM, residual); supportTriangles.push(actual.triangle, confirmed.triangle);
  }
  const min = asset.bounds.min, max = asset.bounds.max;
  const width = Math.max(max[0]! - min[0]!, asset.collision.width), length = Math.max(max[2]! - min[2]!, asset.collision.length);
  const centreX = (min[0]! + max[0]!) / 2, centreZ = (min[2]! + max[2]!) / 2;
  const corners: WorldPoint[] = [];
  for (const x of [centreX - width / 2, centreX + width / 2]) for (const y of [min[1]! - VEHICLE_WHEEL_OFFSET_LIMIT_METRES, max[1]! + VEHICLE_WHEEL_OFFSET_LIMIT_METRES]) for (const z of [centreZ - length / 2, centreZ + length / 2]) corners.push(transform(x, y, z));
  return { origin: contact.point, normal: n, corners, maxY: Math.max(...corners.map(p => p.y)), wheelResidualM, supportTriangles: [...new Set(supportTriangles)] };
}

export function segmentDistance(point: WorldPoint, a: WorldPoint, b: WorldPoint): { distance: number; t: number; point: WorldPoint } {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length2)) : 0;
  const closest = { x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t };
  return { distance: Math.hypot(point.x - closest.x, point.z - closest.z), t, point: closest };
}
