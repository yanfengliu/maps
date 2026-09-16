/** Retain a source polygon footprint while resolving terrain/road bends inside
 * long triangles. Bound: <=4m edges on supported planes, <=1m where midpoint or
 * centroid differs by >5mm. This is a rendering surface, not surveyed curb height.
 */
import type { MeshData } from "../../src/world/mesh.ts";
type Point = [number, number, number];
type Sampler = (x: number, z: number) => number | undefined;

export function drapeSurface(mesh: MeshData, support: Sampler, liftM = 0.08): MeshData {
  const positions: number[] = [];
  let maximumSupportCorrectionM = 0;
  let maximumCorrectionAt: Point = [0, 0, 0];
  const supported = (point: Point): Point => {
    const height = support(point[0], point[2]);
    return [point[0], height === undefined ? point[1] : Math.max(point[1], height + liftM), point[2]];
  };
  const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const length = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[2] - b[2]);
  const add = (a: Point, b: Point, c: Point, depth: number): void => {
    const ab = midpoint(a, b); const bc = midpoint(b, c); const ca = midpoint(c, a);
    const centre: Point = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    const lengths = [length(a, b), length(b, c), length(c, a)]; const longest = Math.max(...lengths);
    const correction = Math.max(0, ...[ab, bc, ca, centre].map((p) => { const height = support(p[0], p[2]); return height === undefined ? 0 : height + liftM - p[1]; }));
    if (longest <= 4 && correction <= 0.005) { positions.push(...a, ...b, ...c); return; }
    if (longest <= 1) {
      // Road support can jump at a source polygon boundary. Once a triangle is
      // <=1m, raise its plane by the measured interior deficit rather than keep
      // splitting forever across that discontinuity. No horizontal footprint
      // changes and no missing-height default is introduced.
      if (correction > maximumSupportCorrectionM) { maximumSupportCorrectionM = correction; maximumCorrectionAt = centre; }
      positions.push(a[0], a[1] + correction, a[2], b[0], b[1] + correction, b[2], c[0], c[1] + correction, c[2]);
      return;
    }
    if (depth > 22) throw new Error(`Pavement support at ${centre[0].toFixed(2)},${centre[2].toFixed(2)} did not converge within 22 splits; inspect a discontinuous or unsupported source surface.`);
    if (longest === lengths[0]) { const m = supported(ab); add(a, m, c, depth + 1); add(m, b, c, depth + 1); }
    else if (longest === lengths[1]) { const m = supported(bc); add(a, b, m, depth + 1); add(a, m, c, depth + 1); }
    else { const m = supported(ca); add(a, b, m, depth + 1); add(m, b, c, depth + 1); }
  };
  const p = mesh.positions;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = [0, 1, 2].map((corner): Point => { const at = mesh.indices[i + corner]! * 3; return [p[at]!, p[at + 1]!, p[at + 2]!]; });
    add(supported(points[0]!), supported(points[1]!), supported(points[2]!), 0);
  }
  const unique: number[] = []; const indices: number[] = []; const vertexIds = new Map<string, number>();
  for (let i = 0; i < positions.length; i += 3) {
    const point = [Math.fround(positions[i]!), Math.fround(positions[i + 1]!), Math.fround(positions[i + 2]!)];
    const key = point.join(","); let index = vertexIds.get(key);
    if (index === undefined) { index = unique.length / 3; vertexIds.set(key, index); unique.push(...point); }
    indices.push(index);
  }
  const normals = new Float32Array(unique.length); for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  const min: Point = [Infinity, Infinity, Infinity]; const max: Point = [-Infinity, -Infinity, -Infinity];
  positions.forEach((value, i) => { const axis = i % 3; min[axis] = Math.min(min[axis]!, value); max[axis] = Math.max(max[axis]!, value); });
  return { header: { ...mesh.header, vertexCount: unique.length / 3, triangleCount: positions.length / 9, bounds: { min, max }, note: mesh.header.note + ` Interior edges <=4m on supported planes, <=1m for support discontinuities, road support +${liftM}m; maximum measured interior support correction ${maximumSupportCorrectionM.toFixed(6)}m at (${maximumCorrectionAt[0].toFixed(3)},${maximumCorrectionAt[2].toFixed(3)}).` }, positions: new Float32Array(unique), normals, indices: new Uint32Array(indices) };
}
