/** Shared double-precision operations for the bounded pavement recipe. Neither
 * this module nor the mesh pool merges vertices solely by projected X/Z. */
import { ShapeUtils, Vector2 } from "three";
import type { MeshData, MeshHeader } from "../../src/world/mesh.ts";
import { patchArea, type HeightPlane, type PlanPoint } from "./pavement-overlay.ts";
import type { Point } from "./select-pavement-source.ts";

export function ccw(ring: PlanPoint[]): PlanPoint[] {
  let twice = 0;
  for (let i = 1; i + 1 < ring.length; i++) twice += (ring[i]![0] - ring[0]![0]) * (ring[i + 1]![1] - ring[0]![1]) - (ring[i]![1] - ring[0]![1]) * (ring[i + 1]![0] - ring[0]![0]);
  return twice < 0 ? [...ring].reverse() : ring;
}
export const plan = (points: readonly Point[]): PlanPoint[] => ccw(points.map((p) => [p[0], p[2]]));
export function triangulate(ring: Point[]): Point[][] {
  return ShapeUtils.triangulateShape(ring.map((p) => new Vector2(p[0], p[2])), []).map((face) => face.map((i) => ring[i]!));
}
export function heightPlane(points: readonly Point[]): HeightPlane {
  const [a, b, c] = points as [Point, Point, Point];
  const d = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
  if (Math.abs(d) < 1e-12) throw new Error("Pavement has a projected-degenerate source triangle; retain it in the explicit area ledger before publishing.");
  const x = ((b[1] - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (b[2] - a[2])) / d;
  const z = ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / d;
  return [x, z, a[1] - x * a[0] - z * a[2]];
}
export const liftPlane = (p: HeightPlane, y: number): HeightPlane => [p[0], p[1], p[2] + y];
export function meshTriangle(mesh: MeshData, offset: number): Point[] {
  return Array.from(mesh.indices.subarray(offset, offset + 3), (i): Point => [mesh.positions[i * 3]!, mesh.positions[i * 3 + 1]!, mesh.positions[i * 3 + 2]!]);
}
export function cellKeys(ring: readonly PlanPoint[]): string[] {
  const out: string[] = [];
  for (let x = Math.floor(Math.min(...ring.map((p) => p[0])) / 10); x <= Math.floor(Math.max(...ring.map((p) => p[0])) / 10); x++) for (let z = Math.floor(Math.min(...ring.map((p) => p[1])) / 10); z <= Math.floor(Math.max(...ring.map((p) => p[1])) / 10); z++) out.push(`${x}:${z}`);
  return out;
}
export function triangleIndex(mesh: MeshData): (ring: PlanPoint[]) => { ring: PlanPoint[]; plane: HeightPlane }[] {
  const grid = new Map<string, number[]>();
  const triangles: { ring: PlanPoint[]; plane: HeightPlane; minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = meshTriangle(mesh, i), ring = plan(points);
    if (patchArea(ring) < 1e-12) continue;
    const id = triangles.length;
    triangles.push({ ring, plane: heightPlane(points), minX: Math.min(...ring.map((p) => p[0])), maxX: Math.max(...ring.map((p) => p[0])), minZ: Math.min(...ring.map((p) => p[1])), maxZ: Math.max(...ring.map((p) => p[1])) });
    for (const key of cellKeys(ring)) { const list = grid.get(key) ?? []; list.push(id); grid.set(key, list); }
  }
  return (ring) => {
    const minX = Math.min(...ring.map((p) => p[0])), maxX = Math.max(...ring.map((p) => p[0])), minZ = Math.min(...ring.map((p) => p[1])), maxZ = Math.max(...ring.map((p) => p[1]));
    return [...new Set(cellKeys(ring).flatMap((key) => grid.get(key) ?? []))].map((id) => triangles[id]!).filter((t) => t.maxX >= minX && t.minX <= maxX && t.maxZ >= minZ && t.minZ <= maxZ);
  };
}

export class PavementMeshWriter {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly indices: number[] = [];
  readonly maximumAxisRoundoffM: Point = [0, 0, 0];
  private readonly pool = new Map<string, number>();
  private vertex(p: Point, n: Point): number {
    const f = p.map(Math.fround);
    for (let axis = 0; axis < 3; axis++) this.maximumAxisRoundoffM[axis] = Math.max(this.maximumAxisRoundoffM[axis]!, Math.abs(p[axis]! - f[axis]!));
    const key = `${f.join(",")}:${n.join(",")}`;
    let id = this.pool.get(key);
    if (id === undefined) { id = this.positions.length / 3; this.pool.set(key, id); this.positions.push(...f); this.normals.push(...n); }
    return id;
  }
  triangle(points: readonly Point[], normal: Point = [0, 1, 0]): void {
    if (points.length !== 3) throw new Error("Pavement writer requires three XYZ vertices per triangle.");
    this.indices.push(...points.map((p) => this.vertex(p, normal)));
  }
  finish(header: MeshHeader): MeshData {
    const min: Point = [Infinity, Infinity, Infinity], max: Point = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.positions.length; i++) { const a = i % 3; min[a] = Math.min(min[a]!, this.positions[i]!); max[a] = Math.max(max[a]!, this.positions[i]!); }
    return { header: { ...header, vertexCount: this.positions.length / 3, triangleCount: this.indices.length / 3, bounds: { min, max } }, positions: Float32Array.from(this.positions), normals: Float32Array.from(this.normals), indices: Uint32Array.from(this.indices) };
  }
}
