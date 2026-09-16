import type { VehicleAsset } from "../../world/agent-assets.ts";
import { VEHICLE_WHEEL_OFFSET_LIMIT_METRES, writeSupportBasis } from "../../world/agent-poses.ts";
import type { WorldPoint } from "../../world/network-data.ts";
import type { PlanPoint, VehicleCorridor, VehicleSurfaces, VehicleSurfaceTriangle } from "../../world/vehicle-surfaces.ts";
import { cross, signedArea, uncovered } from "./planar.ts";

interface Triangle { source: VehicleSurfaceTriangle; plane: readonly [number, number, number]; ring: readonly PlanPoint[] }
export interface VehicleSurfaceHit { readonly triangleId: string; readonly layerId: string; readonly point: WorldPoint; readonly normal: WorldPoint; readonly provenance: VehicleSurfaceTriangle["provenance"] }
export interface VehicleSupport {
  readonly position: WorldPoint; readonly normal: WorldPoint;
  /** True horizontal motion bearing, kept distinct from the projected-frame parameter. */
  readonly headingRadians: number;
  /** Feed this same parameter to displayed poses and projectVehicleFootprint. */
  readonly supportYawRadians: number;
  readonly wheelOffsets: readonly number[]; readonly contacts: readonly VehicleSurfaceHit[];
}
const inside = (ring: readonly PlanPoint[], x: number, z: number): boolean => ring.every((a, i) => cross(a, ring[(i + 1) % ring.length]!, [x, z]) >= -1e-9);
const finite = (values: readonly number[]): boolean => values.every(Number.isFinite);

export class VehicleSurfaceQuery {
  readonly data: VehicleSurfaces;
  private readonly corridors = new Map<string, VehicleCorridor>();
  private readonly triangles = new Map<string, Triangle>();
  private readonly grids = new Map<string, Map<string, Triangle[]>>();
  constructor(data: VehicleSurfaces) {
    data = structuredClone(data);
    if (data?.version !== 1 || data.scope !== "named-vehicle-trajectory-increment" || !Array.isArray(data.corridors) || !Array.isArray(data.triangles)) throw new Error("Vehicle support data needs version1 named-corridor geometry; run the vehicle surface producer.");
    const triangles: readonly VehicleSurfaceTriangle[] = data.triangles;
    const corridors: readonly VehicleCorridor[] = data.corridors;
    for (const triangle of triangles) {
      if (!triangle.id || this.triangles.has(triangle.id) || !triangle.layerId || !triangle.source?.roadId || !triangle.source.areaId || !triangle.source.polygonId || ![2,3].includes(triangle.source.lod) || ![1000,1010,1020,1030,1040,1070,1130].includes(triangle.source.functionCode) || !["displayed-road","authored-seam-reconciliation"].includes(triangle.provenance) || triangle.vertices.length !== 3 || triangle.vertices.some(p => p.length !== 3 || !finite(p))) throw new Error(`Vehicle support triangle ${triangle.id} has missing carriageway identity, unsupported provenance, duplicated ID or invalid vertices.`);
      const [a, b, c] = triangle.vertices, denominator = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
      if (Math.abs(denominator) < 1e-12) throw new Error(`Vehicle support triangle ${triangle.id} has no horizontal area.`);
      const dx = ((b[1] - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (b[2] - a[2])) / denominator;
      const dz = ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / denominator;
      const ring: PlanPoint[] = triangle.vertices.map(p => [p[0], p[2]]);
      if (signedArea(ring) < 0) ring.reverse();
      this.triangles.set(triangle.id, { source: triangle, plane: [dx, dz, a[1] - dx * a[0] - dz * a[2]], ring });
    }
    for (const corridor of corridors) {
      if (!corridor.id || this.corridors.has(corridor.id) || !corridor.layerId || !corridor.routeEdgeIds.length || !corridor.triangleIds.length || !Number.isFinite(corridor.maximumTiltRadians) || corridor.maximumTiltRadians <= 0 || corridor.maximumTiltRadians >= Math.PI / 4) throw new Error(`Vehicle corridor ${corridor.id} needs unique identity, actual routes, support and a bounded upward orientation.`);
      for (const polygon of corridor.allowed) if (polygon.length < 3 || polygon.some(p => p.length !== 2 || !finite(p)) || signedArea(polygon) <= 1e-12 || polygon.some((a, i) => cross(a, polygon[(i + 1) % polygon.length]!, polygon[(i + 2) % polygon.length]!) < -1e-9)) throw new Error(`Vehicle corridor ${corridor.id} has a non-convex, clockwise or invalid allowed piece; preserve source holes during triangulation.`);
      for (const id of corridor.triangleIds) if (this.triangles.get(id)?.source.layerId !== corridor.layerId) throw new Error(`Vehicle corridor ${corridor.id} references missing or wrong-layer triangle ${id}.`);
      this.corridors.set(corridor.id, corridor);
      const grid=new Map<string,Triangle[]>();
      for(const id of corridor.triangleIds){const triangle=this.triangles.get(id)!,xs=triangle.ring.map(p=>p[0]),zs=triangle.ring.map(p=>p[1]);for(let x=Math.floor(Math.min(...xs)/8);x<=Math.floor(Math.max(...xs)/8);x++)for(let z=Math.floor(Math.min(...zs)/8);z<=Math.floor(Math.max(...zs)/8);z++){const key=`${x},${z}`,cell=grid.get(key)??[];cell.push(triangle);grid.set(key,cell);}}
      this.grids.set(corridor.id,grid);
    }
    const freeze = (value: unknown): void => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } };
    freeze(data); this.data = data;
  }
  corridor(id: string): VehicleCorridor {
    const corridor = this.corridors.get(id);
    if (!corridor) throw new Error(`Vehicle corridor ${id} is not in the assigned support artifact.`);
    return corridor;
  }
  private hit(triangle: Triangle, x: number, y: number, z: number): VehicleSurfaceHit {
    const [dx, dz] = triangle.plane, length = Math.hypot(dx, 1, dz);
    return { triangleId: triangle.source.id, layerId: triangle.source.layerId, point: { x, y, z }, normal: { x: -dx / length, y: 1 / length, z: -dz / length }, provenance: triangle.source.provenance };
  }
  private nearby(corridorId:string,x:number,z:number,radius=0):Triangle[] {
    const grid=this.grids.get(corridorId)!,found=new Set<Triangle>();
    for(let a=Math.floor((x-radius)/8);a<=Math.floor((x+radius)/8);a++)for(let b=Math.floor((z-radius)/8);b<=Math.floor((z+radius)/8);b++)for(const triangle of grid.get(`${a},${b}`)??[])found.add(triangle);
    return [...found];
  }
  /** Only this preassigned physical layer is eligible. Within it, the exposed
   * displayed triangle wins; an upper road from another layer never participates.
   */
  sample(corridorId: string, x: number, z: number, expectedY: number): VehicleSurfaceHit {
    const corridor = this.corridor(corridorId);
    if (!finite([x, z, expectedY]) || !corridor.allowed.some(p => inside(p, x, z))) throw new Error(`Vehicle support query (${x},${z}) leaves source carriageway ${corridorId}.`);
    const hits = this.nearby(corridorId,x,z).filter(t => inside(t.ring, x, z)).map(t => ({ triangle: t, y: t.plane[0] * x + t.plane[1] * z + t.plane[2] }));
    if (!hits.length) throw new Error(`Vehicle support gap at (${x},${z}) in ${corridorId}; publish a source-labelled displayed reconciliation before driving here.`);
    hits.sort((a, b) => b.y - a.y || a.triangle.source.id.localeCompare(b.triangle.source.id));
    if (hits[0]!.y - hits.at(-1)!.y > .25) throw new Error(`Vehicle support ${corridorId} has ambiguous physical levels at (${x},${z}); repair the source assignment.`);
    const first = hits[0]!;
    if (Math.abs(first.y - expectedY) > .75) throw new Error(`Vehicle support ${corridorId} at (${x},${z}) is ${first.y}m, outside the assigned route level near ${expectedY}m.`);
    return this.hit(first.triangle, x, first.y, z);
  }
  /** Solve contact along the actual displayed support normal, including its XZ
   * displacement. Merely clamping a vertical height error would be incorrect.
   */
  normalContact(corridorId: string, point: WorldPoint, normal: WorldPoint): { offsetM: number; hit: VehicleSurfaceHit } {
    const corridor = this.corridor(corridorId), candidates: { offsetM: number; hit: VehicleSurfaceHit }[] = [];
    if(!finite([point.x,point.y,point.z,normal.x,normal.y,normal.z])||Math.abs(Math.hypot(normal.x,normal.y,normal.z)-1)>1e-6||normal.y<=0)throw new Error(`Wheel contact in ${corridorId} requires a finite position and upward unit support normal.`);
    for (const t of this.nearby(corridorId,point.x,point.z,.75)) {
      const [a, b, c] = t.plane, denominator = normal.y - a * normal.x - b * normal.z;
      if (denominator <= .1) continue;
      const offsetM = (a * point.x + b * point.z + c - point.y) / denominator;
      // Select the exposed surface before testing wheel travel. Otherwise a
      // lower hidden triangle could conceal an out-of-bound upper contact.
      if (Math.abs(offsetM) > .75) continue;
      const x = point.x + normal.x * offsetM, y = point.y + normal.y * offsetM, z = point.z + normal.z * offsetM;
      if (inside(t.ring, x, z) && corridor.allowed.some(p => inside(p, x, z))) candidates.push({ offsetM, hit: this.hit(t, x, y, z) });
    }
    candidates.sort((a, b) => b.offsetM - a.offsetM || a.hit.triangleId.localeCompare(b.hit.triangleId));
    if (!candidates.length || Math.abs(candidates[0]!.offsetM) > VEHICLE_WHEEL_OFFSET_LIMIT_METRES + 1e-9) throw new Error(`Wheel contact in ${corridorId} at (${point.x},${point.z}) has no exposed assigned surface within +/-${VEHICLE_WHEEL_OFFSET_LIMIT_METRES} model metres along its normal.`);
    return candidates[0]!;
  }
  uncoveredArea(corridorId: string, hull: readonly PlanPoint[]): number {
    return uncovered(hull, this.corridor(corridorId).allowed).reduce((sum, p) => sum + Math.abs(signedArea(p)), 0);
  }
}

function solvePlane(rows: readonly (readonly number[])[], heights: readonly number[]): readonly number[] {
  const matrix = [0, 1, 2].map(i => [0, 1, 2].map(j => rows.reduce((sum, r) => sum + r[i]! * r[j]!, 0)).concat(rows.reduce((sum, r, k) => sum + r[i]! * heights[k]!, 0)));
  for (let i = 0; i < 3; i++) {
    let pivot = i;
    for (let j = i + 1; j < 3; j++) if (Math.abs(matrix[j]![i]!) > Math.abs(matrix[pivot]![i]!)) pivot = j;
    [matrix[i], matrix[pivot]] = [matrix[pivot]!, matrix[i]!];
    const scale = matrix[i]![i]!;
    if (Math.abs(scale) < 1e-12) throw new Error("Vehicle axle contacts cannot determine a finite support plane.");
    for (let k = i; k < 4; k++) matrix[i]![k] = matrix[i]![k]! / scale;
    for (let j = 0; j < 3; j++) if (j !== i) { const factor = matrix[j]![i]!; for (let k = i; k < 4; k++) matrix[j]![k] = matrix[j]![k]! - factor * matrix[i]![k]!; }
  }
  return matrix.map(row => row[3]!);
}
/** Invert the horizontal part of the agreed orthogonal forward projection.
 * The shared writeSupportBasis remains the only transform implementation.
 */
export function supportYawForBearing(bearing: number, normal: WorldPoint): number {
  if (!finite([bearing, normal.x, normal.y, normal.z]) || normal.y <= 0) throw new Error("Vehicle support yaw needs a finite motion bearing and upward normal.");
  const x = Math.sin(bearing), z = Math.cos(bearing), correction = (normal.x * x + normal.z * z) / normal.y ** 2;
  return Math.atan2(x + normal.x * correction, z + normal.z * correction);
}
export function fitVehicleSupport(query: VehicleSurfaceQuery, corridorId: string, asset: VehicleAsset, position: WorldPoint, headingRadians: number): VehicleSupport {
  if (asset.wheelObjects.length !== 4 || new Set(asset.wheelObjects).size !== 4 || !(asset.axles.frontZ > asset.axles.rearZ) || !(asset.axles.trackMetres > 0)) throw new Error(`Vehicle ${asset.id} needs its four measured wheel names and axle dimensions.`);
  const locals = asset.wheelObjects.map(name => {
    const match = /^wheel_([01])_(right|left)$/.exec(name);
    if (!match) throw new Error(`Vehicle wheel ${name} has no measured axle/side mapping.`);
    // The generated GLBs name negative-X roots "right" and positive-X roots
    // "left". Return residuals in wheelObjects order for those actual roots.
    return { x: (match[2] === "right" ? -1 : 1) * asset.axles.trackMetres / 2, z: match[1] === "0" ? asset.axles.frontZ : asset.axles.rearZ };
  });
  let normal = { x: 0, y: 1, z: 0 }, y = position.y, converged = false;
  const basis = new Float64Array(9), corridor = query.corridor(corridorId);
  for (let iteration = 0; iteration < 12; iteration++) {
    writeSupportBasis(supportYawForBearing(headingRadians, normal), normal.x, normal.y, normal.z, basis);
    const contacts = locals.map(p => query.sample(corridorId, position.x + basis[0]! * p.x + basis[6]! * p.z, position.z + basis[2]! * p.x + basis[8]! * p.z, y + basis[1]! * p.x + basis[7]! * p.z));
    const coefficients = solvePlane(contacts.map(c => [c.point.x - position.x, c.point.z - position.z, 1]), contacts.map(c => c.point.y));
    const length = Math.hypot(coefficients[0]!, 1, coefficients[1]!), next = { x: -coefficients[0]! / length, y: 1 / length, z: -coefficients[1]! / length };
    converged = Math.abs(y - coefficients[2]!) < 1e-8 && Math.hypot(normal.x - next.x, normal.y - next.y, normal.z - next.z) < 1e-8;
    y = coefficients[2]!; normal = next;
    if (Math.acos(Math.min(1, normal.y)) > corridor.maximumTiltRadians) throw new Error(`Vehicle ${asset.id} support tilt in ${corridorId} exceeds the corridor's authored ${corridor.maximumTiltRadians} rad bound.`);
    if (converged) break;
  }
  if (!converged) throw new Error(`Vehicle ${asset.id} four-contact fit in ${corridorId} did not converge; repair the assigned support seam before admission.`);
  const supportYawRadians = supportYawForBearing(headingRadians, normal);
  writeSupportBasis(supportYawRadians, normal.x, normal.y, normal.z, basis);
  const contacts = locals.map(p => query.normalContact(corridorId, { x: position.x + basis[0]! * p.x + basis[6]! * p.z, y: y + basis[1]! * p.x + basis[7]! * p.z, z: position.z + basis[2]! * p.x + basis[8]! * p.z }, normal));
  return Object.freeze({ position: Object.freeze({ x: position.x, y, z: position.z }), normal: Object.freeze(normal), headingRadians, supportYawRadians, wheelOffsets: Object.freeze(contacts.map(c => c.offsetM)), contacts: Object.freeze(contacts.map(c => c.hit)) });
}
