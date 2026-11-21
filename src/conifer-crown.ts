import { TREE_MATERIAL, type TreeMeshWriter } from './tree-prototypes.ts';

type Vertex = [number, number, number];
export const NEEDLE_FOLIAGE = TREE_MATERIAL.needle;

/** Closed six-sided crown bounds for the procedural bough material. The two
 * rings, tip and lower pole use the former crown's 24 triangles. This material
 * uses the normal slot for per-tree dimensions/variation and UV for local XY. */
export function addConiferCrown(mesh: TreeMeshWriter, x: number, y: number, height: number, radius: number, seed: number, anchor: number): void {
  const frame: Vertex = [radius, height, (Math.imul(Math.round(seed * 4294967295), 2654435761) >>> 0) / 4294967295];
  const color: Vertex = [.34, .46, .32];
  const ring = (z: number, width: number): Vertex[] => Array.from({ length: 6 }, (_, i) => {
    const a = i * Math.PI / 3;
    return [Math.cos(a) * width, Math.sin(a) * width, z];
  });
  const bottom: Vertex = [0,0,.12], tip: Vertex = [0,0,1];
  const low = ring(.28, 1), high = ring(.82, .74);
  const world = (v: Vertex): Vertex => [x + v[0] * radius, y + v[1] * radius, v[2] * height];
  function face(a: Vertex, b: Vertex, c: Vertex): void {
    mesh.triangle(world(a), world(b), world(c), color, NEEDLE_FOLIAGE, anchor,
      [[a[0],a[1]],[b[0],b[1]],[c[0],c[1]]], [frame,frame,frame]);
  }
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    face(bottom, low[j], low[i]);
    face(low[i], low[j], high[j]);
    face(low[i], high[j], high[i]);
    face(high[i], high[j], tip);
  }
}
