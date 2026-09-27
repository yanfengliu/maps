/** Authored planar sections from unchanged source triangle intersections.
 * Bound: closed planar regions, including holes and touching contours, plus one
 * explicitly bounded connector. This never fills an open roof down to terrain.
 */
import { BufferGeometry, Float32BufferAttribute, Matrix3, Mesh, Vector3, type Matrix4, type Object3D } from "three";
import type { MeshData } from "../world/mesh.js";
import { CUTOUT_SIDES, type CutoutSide } from "./aoi-cutout.js";

export type SectionPoint = readonly [number, number];
export type SectionSegment = readonly [SectionPoint, SectionPoint];
type Point3 = readonly [number, number, number];
const EPS = 1e-7;
export const SECTION_CONNECTOR_LIMIT_M = 0.001;

export function sliceTriangle(points: readonly Point3[], side: CutoutSide): SectionSegment | null {
  const distances = points.map(p => -(p[0] - side.x) * side.dz + (p[2] - side.z) * side.dx);
  if (Math.min(...distances) > EPS || Math.max(...distances) < -EPS) return null;
  const hits: SectionPoint[] = [];
  const add = (p: Point3): void => {
    const hit: SectionPoint = [(p[0] - side.x) * side.dx + (p[2] - side.z) * side.dz, p[1]];
    if (!hits.some(q => Math.hypot(q[0] - hit[0], q[1] - hit[1]) < EPS)) hits.push(hit);
  };
  for (let index = 0; index < 3; index++) {
    const next = (index + 1) % 3, d = distances[index]!, e = distances[next]!;
    const a = points[index]!, b = points[next]!;
    if (Math.abs(d) <= EPS) add(a);
    if ((d < -EPS && e > EPS) || (d > EPS && e < -EPS)) {
      const t = d / (d - e);
      add([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  // A face already on the cut is source geometry, not a section to duplicate.
  if (hits.length !== 2) return null;
  return hits.toSorted((a, b) => a[0] - b[0] || a[1] - b[1]) as unknown as SectionSegment;
}

function failure(identity: string, reason: string): never {
  throw new Error(`Cutout section ${identity}: ${reason}. Restore the reviewed scene data or review this source section before displaying the city.`);
}

/** Keep all source endpoints. A connector is allowed only between two tips in
 * the same otherwise degree-2 open component. Closed degree-4 contacts survive.
 */
export function closeSection(original: readonly SectionSegment[], identity: string): { segments: readonly SectionSegment[]; connector: SectionSegment | null } {
  const vertices: { point: SectionPoint; neighbours: number[] }[] = [];
  const edges = new Set<string>();
  for (const segment of original) {
    const ids = segment.map(point => {
      let id = vertices.findIndex(v => Math.hypot(v.point[0] - point[0], v.point[1] - point[1]) < EPS);
      if (id < 0) { id = vertices.length; vertices.push({ point, neighbours: [] }); }
      return id;
    });
    const a = ids[0]!, b = ids[1]!;
    if (a === b) continue;
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (edges.has(key)) failure(identity, "duplicate coincident slice edges do not establish a solid region");
    edges.add(key); vertices[a]!.neighbours.push(b); vertices[b]!.neighbours.push(a);
  }
  const seen = new Set<number>(), open: number[][] = [];
  for (let start = 0; start < vertices.length; start++) {
    if (seen.has(start)) continue;
    const todo = [start], component: number[] = [];
    while (todo.length) {
      const id = todo.pop()!; if (seen.has(id)) continue;
      seen.add(id); component.push(id); todo.push(...vertices[id]!.neighbours);
    }
    if (component.some(id => vertices[id]!.neighbours.length % 2 !== 0)) open.push(component);
  }
  if (!open.length) return { segments: original, connector: null };
  if (open.length !== 1) failure(identity, `${open.length} open components require an unsupported closure`);
  const component = open[0]!, tips = component.filter(id => vertices[id]!.neighbours.length === 1);
  if (tips.length !== 2 || component.some(id => ![1, 2].includes(vertices[id]!.neighbours.length))) failure(identity, "the open component does not have exactly two unambiguous tips");
  const connector: SectionSegment = [vertices[tips[0]!]!.point, vertices[tips[1]!]!.point];
  const distance = Math.hypot(connector[0][0] - connector[1][0], connector[0][1] - connector[1][1]);
  if (distance > SECTION_CONNECTOR_LIMIT_M) failure(identity, `tip distance ${distance.toFixed(6)} m exceeds the 0.001 m presentation connector bound`);
  return { segments: [...original, connector], connector };
}

function at(segment: SectionSegment, u: number): number { return segment[0][1] + (segment[1][1] - segment[0][1]) * (u - segment[0][0]) / (segment[1][0] - segment[0][0]); }
export interface SectionRegion { triangles: SectionPoint[][]; area: number; connector: SectionSegment | null }

export function sectionRegion(original: readonly SectionSegment[], identity: string): SectionRegion {
  const closed = closeSection(original, identity);
  const segments = closed.segments.map(s => s.toSorted((a, b) => a[0] - b[0]) as unknown as SectionSegment).filter(s => s[1][0] - s[0][0] > EPS);
  const knots = closed.segments.flatMap(s => s.map(p => p[0]));
  // Explicit crossing knots keep interval ordering fixed inside every slab.
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i]!, b = segments[j]!, lo = Math.max(a[0][0], b[0][0]), hi = Math.min(a[1][0], b[1][0]);
    if (hi - lo <= EPS) continue;
    const d0 = at(a, lo) - at(b, lo), d1 = at(a, hi) - at(b, hi);
    if (d0 * d1 < 0) knots.push(lo + (hi - lo) * d0 / (d0 - d1));
  }
  const sorted = knots.toSorted((a, b) => a - b).filter((u, i, values) => i === 0 || u - values[i - 1]! > EPS);
  const triangles: SectionPoint[][] = []; let area = 0;
  const add = (a: SectionPoint, b: SectionPoint, c: SectionPoint): void => {
    const measure = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    if (measure > 1e-12) { triangles.push([a, b, c]); area += measure; }
  };
  for (let i = 0; i + 1 < sorted.length; i++) {
    const lo = sorted[i]!, hi = sorted[i + 1]!, mid = (lo + hi) / 2;
    const crossing = segments.filter(s => s[0][0] < mid && s[1][0] > mid).sort((a, b) => at(a, mid) - at(b, mid));
    if (crossing.length % 2) failure(identity, `an odd ${crossing.length} intersections remain between ${lo.toFixed(6)} and ${hi.toFixed(6)} m`);
    for (let j = 0; j < crossing.length; j += 2) {
      const bottom = crossing[j]!, top = crossing[j + 1]!;
      const a: SectionPoint = [lo, at(bottom, lo)], b: SectionPoint = [hi, at(bottom, hi)], c: SectionPoint = [hi, at(top, hi)], d: SectionPoint = [lo, at(top, lo)];
      add(a, c, b); add(a, d, c);
    }
  }
  if (!(area > 1e-8)) failure(identity, "the slice encloses no nondegenerate material area");
  return { triangles, area, connector: closed.connector };
}

export function sectionGeometry(triangles: readonly (readonly SectionPoint[])[], side: CutoutSide, worldToLocal?: Matrix4, identity = side.name): BufferGeometry {
  const positions: number[] = [], normals: number[] = [];
  const normal = new Vector3(side.dz, 0, -side.dx);
  if (worldToLocal) normal.applyNormalMatrix(new Matrix3().getNormalMatrix(worldToLocal));
  normal.normalize();
  for (const triangle of triangles) {
    // Quantize once, in the coordinates that will actually be stored. A narrow
    // Float64 slab can collapse in Float32; it has no representable area then.
    const points = triangle.map(([u, y]) => {
      const point = new Vector3(side.x + side.dx * u, y, side.z + side.dz * u);
      if (worldToLocal) point.applyMatrix4(worldToLocal);
      return new Vector3(Math.fround(point.x), Math.fround(point.y), Math.fround(point.z));
    });
    const cross = points[1]!.clone().sub(points[0]!).cross(points[2]!.clone().sub(points[0]!));
    if (cross.lengthSq() === 0) continue;
    for (const point of points) { positions.push(...point.toArray()); normals.push(...normal.toArray()); }
  }
  if (positions.length === 0) failure(identity, "the section has no nonzero-area triangles in its stored coordinates");
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function terrainSectionGeometry(mesh: MeshData, floor: number): BufferGeometry[] {
  const profiles = CUTOUT_SIDES.map(() => [] as SectionSegment[]);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = [0, 1, 2].map(j => { const at = mesh.indices[i + j]! * 3; return [mesh.positions[at]!, mesh.positions[at + 1]!, mesh.positions[at + 2]!] as Point3; });
    CUTOUT_SIDES.forEach((side, j) => { const slice = sliceTriangle(points, side); if (slice && slice[1][0] > 0 && slice[0][0] < side.length) profiles[j]!.push(slice); });
  }
  return CUTOUT_SIDES.map((side, j) => {
    const segments = profiles[j]!.sort((a, b) => a[0][0] - b[0][0]), triangles: SectionPoint[][] = []; let end = 0;
    for (const segment of segments) {
      const lo = Math.max(0, segment[0][0]), hi = Math.min(side.length, segment[1][0]);
      if (hi - lo <= EPS) continue;
      if (Math.abs(lo - end) > 1e-4) failure(`terrain.mesh/${side.name}`, `the terrain profile has a gap or overlap at ${end.toFixed(4)}–${lo.toFixed(4)} m`);
      const a: SectionPoint = [lo, floor], b: SectionPoint = [hi, floor], c: SectionPoint = [hi, at(segment, hi)], d: SectionPoint = [lo, at(segment, lo)];
      if (Math.min(c[1], d[1]) <= floor) failure(`terrain.mesh/${side.name}`, "the presentation floor reaches above the terrain");
      triangles.push([a, c, b], [a, d, c]); end = hi;
    }
    if (Math.abs(end - side.length) > 1e-4) failure(`terrain.mesh/${side.name}`, `the terrain ends at ${end.toFixed(4)} of ${side.length.toFixed(4)} m`);
    return sectionGeometry(triangles, side);
  });
}

export function buildingSections(root: Object3D, identity: string): { geometry: BufferGeometry; side: number; connectors: number }[] {
  root.updateMatrixWorld(true);
  const worldToLocal = root.matrixWorld.clone().invert();
  const batches = new Map<number, SectionSegment[][]>(); const world = new Vector3();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry, position = geometry.getAttribute("position"), ids = geometry.getAttribute("_batchid") ?? geometry.getAttribute("_BATCHID");
    if (!position || !ids) failure(identity, "a building primitive has no position or source batch IDs");
    const points: Point3[] = Array.from({ length: position.count }, (_, i) => world.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).toArray() as [number, number, number]);
    const count = geometry.index?.count ?? position.count;
    for (let i = 0; i < count; i += 3) {
      const indices = [0, 1, 2].map(j => geometry.index?.getX(i + j) ?? i + j), id = ids.getX(indices[0]!);
      if (indices.some(index => ids.getX(index) !== id)) failure(identity, "a triangle crosses source batch identities");
      const rows = batches.get(id) ?? CUTOUT_SIDES.map(() => [] as SectionSegment[]); batches.set(id, rows);
      CUTOUT_SIDES.forEach((side, j) => { const slice = sliceTriangle(indices.map(index => points[index]!), side); if (slice) rows[j]!.push(slice); });
    }
  });
  const triangles = CUTOUT_SIDES.map(() => [] as SectionPoint[][]), connectors = [0, 0, 0, 0];
  for (const [batch, rows] of batches) rows.forEach((segments, side) => {
    if (!segments.some(s => s[1][0] > 0 && s[0][0] < CUTOUT_SIDES[side]!.length && s[1][0] - s[0][0] > EPS)) return;
    const region = sectionRegion(segments, `${identity}/batch ${batch}/${CUTOUT_SIDES[side]!.name}`);
    triangles[side]!.push(...region.triangles); if (region.connector) connectors[side]!++;
  });
  const result: { geometry: BufferGeometry; side: number; connectors: number }[] = [];
  triangles.forEach((values, side) => { if (values.length) result.push({ geometry: sectionGeometry(values, CUTOUT_SIDES[side]!, worldToLocal, `${identity}/${CUTOUT_SIDES[side]!.name}`), side, connectors: connectors[side]! }); });
  return result;
}
