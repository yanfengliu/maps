/** Bound: this original fleet's selected rigid triangle meshes, parallel front
 * steering through ±35°, all wheel spin phases and ±0.05 model-metre offsets.
 * Whole-triangle separation proves clearance; finite pose samples do not.
 * This does not prove world contact, traffic safety or visual quality.
 */
import { Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import type { VehicleAsset } from "../../src/world/agent-assets.ts";
import { VEHICLE_FRONT_STEERING_LIMIT_RADIANS, VEHICLE_WHEEL_OFFSET_LIMIT_METRES } from "../../src/world/agent-poses.ts";

const EPSILON = 1e-6;
export const VEHICLE_REQUIRED_CLEARANCE_METRES = 0.01;
type Triangle = readonly [Vector3, Vector3, Vector3];
function requireValue(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(`Vehicle geometry check failed: ${message}. Rebuild with npm run data:vehicles.`);
}

const cross = (a: readonly number[], b: readonly number[]) => a[0]! * b[1]! - a[1]! * b[0]!;
/** Distance to the entire projected triangle, including its interior and edges. */
export function projectedTriangleDistance(triangle: Triangle, pivot: Vector3): number {
  const p = triangle.map(v => [v.y - pivot.y, v.z - pivot.z]);
  const area = cross([p[1]![0]! - p[0]![0]!, p[1]![1]! - p[0]![1]!], [p[2]![0]! - p[0]![0]!, p[2]![1]! - p[0]![1]!]);
  const signs = p.map((v, i) => cross(v, p[(i + 1) % 3]!));
  if (Math.abs(area) > 1e-16 && (signs.every(x => x >= 0) || signs.every(x => x <= 0))) return 0;
  let minimum = Infinity;
  for (let i = 0; i < 3; i++) {
    const a = p[i]!, b = p[(i + 1) % 3]!, dy = b[0]! - a[0]!, dz = b[1]! - a[1]!;
    const length = dy * dy + dz * dz;
    const t = length ? Math.max(0, Math.min(1, -(a[0]! * dy + a[1]! * dz) / length)) : 0;
    minimum = Math.min(minimum, Math.hypot(a[0]! + t * dy, a[1]! + t * dz));
  }
  return minimum;
}

export function triangleClearsWheel(triangle: Triangle, pivot: Vector3, halfX: number, halfZ: number, radius: number): boolean {
  const xs = triangle.map(v => v.x), zs = triangle.map(v => v.z);
  if (Math.max(...xs) < pivot.x - halfX || Math.min(...xs) > pivot.x + halfX) return true;
  if (Math.max(...zs) < pivot.z - halfZ || Math.min(...zs) > pivot.z + halfZ) return true;
  return projectedTriangleDistance(triangle, pivot) >= radius - EPSILON;
}

/** Maxima of |x| cos(d)+r sin(d) and |x| sin(d)+r cos(d), including stationary angles. */
export function continuousWheelBounds(x: number, radial: number, angle: number): readonly [number, number] {
  const a = Math.abs(x), tX = Math.min(angle, Math.atan2(radial, a)), tZ = Math.min(angle, Math.atan2(a, radial));
  return [a * Math.cos(tX) + radial * Math.sin(tX), a * Math.sin(tZ) + radial * Math.cos(tZ)];
}

function drawnTriangles(mesh: Mesh): Triangle[] {
  requireValue(mesh.material instanceof MeshStandardMaterial, `${mesh.name} requires one standard material per selected primitive`);
  const p = mesh.geometry.getAttribute("position"), n = mesh.geometry.getAttribute("normal"), index = mesh.geometry.index;
  const count = index?.count ?? p?.count ?? 0;
  requireValue(!!p && p.itemSize === 3 && !!n && n.count === p.count && count > 0 && count % 3 === 0, `${mesh.name} has no complete position/normal triangles`);
  requireValue(mesh.matrixWorld.elements.every(Number.isFinite) && Math.abs(mesh.matrixWorld.determinant()) > 1e-12, `${mesh.name} has an invalid selected-scene transform`);
  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const id = index ? index.getX(i) : i;
    requireValue(Number.isInteger(id) && id >= 0 && id < p.count, `${mesh.name} index ${id} is outside its position accessor`);
    const point = new Vector3().fromBufferAttribute(p, id).applyMatrix4(mesh.matrixWorld);
    const normal = new Vector3().fromBufferAttribute(n, id);
    requireValue(point.toArray().every(Number.isFinite) && normal.toArray().every(Number.isFinite) && normal.lengthSq() > 1e-12, `${mesh.name} contains a non-finite position or invalid normal at ${id}`);
    points.push(point);
  }
  const triangles: Triangle[] = [];
  for (let i = 0; i < count; i += 3) triangles.push([points[i]!, points[i + 1]!, points[i + 2]!]);
  return triangles;
}

export function verifyVehicleGeometry(scene: Object3D, asset: VehicleAsset) {
  scene.updateMatrixWorld(true);
  requireValue(asset.wheelObjects.length === 4 && new Set(asset.wheelObjects).size === 4, `${asset.id} requires four unique wheel roots`);
  const nodes: Object3D[] = [], meshes: Mesh[] = [];
  scene.traverse(node => { nodes.push(node); if (node instanceof Mesh) meshes.push(node); });
  requireValue(meshes.length > 4, `${asset.id} selected scene has no complete body and wheels`);
  const wheels = asset.wheelObjects.map(name => {
    const found = nodes.filter(node => node.name === name);
    requireValue(found.length === 1, `${asset.id}/${name} occurs ${found.length} times in the selected scene; require exactly one`);
    return found[0]!;
  });
  const membership = new Map<Object3D, number>();
  wheels.forEach((root, i) => root.traverse(node => {
    requireValue(!membership.has(node), `${asset.id} wheel roots overlap`);
    membership.set(node, i);
  }));
  const minimum = new Vector3(Infinity, Infinity, Infinity), maximum = new Vector3(-Infinity, -Infinity, -Infinity);
  const body: { name: string; triangles: Triangle[] }[] = [];
  const wheelTriangles: Triangle[][] = wheels.map(() => []);
  for (const mesh of meshes) {
    const triangles = drawnTriangles(mesh), wheel = membership.get(mesh);
    for (const tri of triangles) for (const point of tri) { minimum.min(point); maximum.max(point); }
    if (wheel === undefined) body.push({ name: mesh.name, triangles });
    else wheelTriangles[wheel]!.push(...triangles);
  }
  requireValue(body.length > 0 && body.reduce((n, p) => n + p.triangles.length, 0) > 0, `${asset.id} has no selected body triangles`);
  requireValue(Math.abs(minimum.y) <= 1e-5, `${asset.id} ground minimum is ${minimum.y}m, expected zero`);
  for (let axis = 0; axis < 3; axis++) {
    requireValue(Math.abs(minimum.getComponent(axis) - asset.bounds.min[axis]!) <= 1e-5 && Math.abs(maximum.getComponent(axis) - asset.bounds.max[axis]!) <= 1e-5, `${asset.id} drawn bounds disagree with manifest on axis ${axis}`);
  }
  requireValue(Math.max(Math.abs(minimum.x), Math.abs(maximum.x)) * 2 <= asset.collision.width + EPSILON && Math.max(Math.abs(minimum.z), Math.abs(maximum.z)) * 2 <= asset.collision.length + EPSILON, `${asset.id} collision bounds omit drawn body parts`);
  const positions = new Set<string>();
  const proofs = wheels.map((wheel, i) => {
    const pivot = wheel.getWorldPosition(new Vector3()), front = Math.abs(pivot.z - asset.axles.frontZ) < 1e-5;
    requireValue((front || Math.abs(pivot.z - asset.axles.rearZ) < 1e-5) && Math.abs(Math.abs(pivot.x) - asset.axles.trackMetres / 2) < 1e-5 && Math.abs(pivot.y - asset.wheelRadius) < 1e-5, `${asset.id}/${wheel.name} pivot does not match the declared axle/track/radius`);
    const key = `${front}/${pivot.x > 0}`;
    requireValue(!positions.has(key), `${asset.id} has duplicate wheels on the same axle side`); positions.add(key);
    const triangles = wheelTriangles[i]!;
    requireValue(triangles.length > 0, `${asset.id}/${wheel.name} contains no selected drawn triangles`);
    let halfX = 0, halfZ = 0, rollingRadius = 0, maximum3D = 0;
    for (const tri of triangles) for (const world of tri) {
      const p = world.clone().sub(pivot), r = Math.hypot(p.y, p.z);
      const bounds = continuousWheelBounds(p.x, r, front ? Math.fround(VEHICLE_FRONT_STEERING_LIMIT_RADIANS) : 0);
      halfX = Math.max(halfX, bounds[0]); halfZ = Math.max(halfZ, bounds[1]);
      rollingRadius = Math.max(rollingRadius, r); maximum3D = Math.max(maximum3D, p.length());
    }
    requireValue(Math.abs(rollingRadius - asset.wheelRadius) <= 1e-5 && Math.abs(pivot.y - rollingRadius) <= 1e-5, `${asset.id}/${wheel.name} actual rolling radius ${rollingRadius} does not meet ground at ${asset.wheelRadius}`);
    requireValue(pivot.x - halfX >= asset.bounds.min[0]! - EPSILON && pivot.x + halfX <= asset.bounds.max[0]! + EPSILON && pivot.z - halfZ >= asset.bounds.min[2]! - EPSILON && pivot.z + halfZ <= asset.bounds.max[2]! + EPSILON, `${asset.id}/${wheel.name} continuous steering/spin leaves the approved XZ bounds`);
    const radius = maximum3D + Math.fround(VEHICLE_WHEEL_OFFSET_LIMIT_METRES) + VEHICLE_REQUIRED_CLEARANCE_METRES;
    let tested = 0;
    for (const part of body) for (const triangle of part.triangles) {
      requireValue(triangleClearsWheel(triangle, pivot, halfX + VEHICLE_REQUIRED_CLEARANCE_METRES, halfZ + VEHICLE_REQUIRED_CLEARANCE_METRES, radius), `${asset.id}/${wheel.name} static primitive ${part.name} triangle ${tested} enters its continuous wheel clearance volume`);
      tested++;
    }
    return { name: wheel.name, pivot: pivot.toArray(), drawnWheelTriangles: triangles.length, testedBodyTriangles: tested, halfX, halfZ, rollingRadius, maximum3D, clearanceRadius: radius };
  });
  return { id: asset.id, selectedMeshes: meshes.length, bounds: { min: minimum.toArray(), max: maximum.toArray() }, wheels: proofs };
}
