/** Presentation support only. Source path elevation selects a nearby existing
 * road/pavement layer; this does not classify source levels or change route feet.
 * The 0.10m top allowance covers measured overlapping presentation surfaces.
 */
import type { MeshData } from "../world/mesh.js";

export interface PaintSeamUse {
  x: number; z: number; expectedY: number; y: number; widthM: number;
  edges: readonly { mesh: "roads" | "pavements"; triangle: number; edge: number; x: number; y: number; z: number }[];
}
export interface PaintSupport {
  (x: number, z: number, expectedY: number): number | undefined;
  /** Query evidence, including queries on stripes later omitted for other reasons. */
  readonly seamUses?: readonly PaintSeamUse[];
}
export const PAINT_SUPPORT_BOUNDS = Object.freeze({ sourceDeviationM: .5, topAllowanceM: .10, spacingM: .25, edgeRiseRun: .5, sampledResidualM: .04 });
const SEAM_WIDTH_M = .010, SEAM_HEIGHT_AGREEMENT_M = .001;
type Edge = PaintSeamUse["edges"][number] & { distance: number; dx: number; dz: number };

function indexedHeights(mesh: MeshData, name: "roads" | "pavements") {
  const p = mesh.positions, ids = mesh.indices, cells = new Map<string, number[]>();
  for (let i = 0; i < ids.length; i += 3) {
    const a = ids[i]! * 3, b = ids[i + 1]! * 3, c = ids[i + 2]! * 3;
    // Index adjacent cells for the bounded seam search; strict barycentric
    // inclusion below is unchanged and never expands a triangle's footprint.
    const minX = Math.floor((Math.min(p[a]!, p[b]!, p[c]!) - SEAM_WIDTH_M) / 10), maxX = Math.floor((Math.max(p[a]!, p[b]!, p[c]!) + SEAM_WIDTH_M) / 10);
    const minZ = Math.floor((Math.min(p[a + 2]!, p[b + 2]!, p[c + 2]!) - SEAM_WIDTH_M) / 10), maxZ = Math.floor((Math.max(p[a + 2]!, p[b + 2]!, p[c + 2]!) + SEAM_WIDTH_M) / 10);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`, bucket = cells.get(key);
      if (bucket) bucket.push(i); else cells.set(key, [i]);
    }
  }
  return (x: number, z: number, edgesOnly = false): { heights: number[]; edges: Edge[] } => {
    const heights: number[] = [];
    const edges: Edge[] = [];
    for (const i of cells.get(`${Math.floor(x / 10)},${Math.floor(z / 10)}`) ?? []) {
      const a = ids[i]! * 3, b = ids[i + 1]! * 3, c = ids[i + 2]! * 3;
      const ax = p[a]!, az = p[a + 2]!, bx = p[b]!, bz = p[b + 2]!, cx = p[c]!, cz = p[c + 2]!;
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-12) continue;
      if (edgesOnly) {
        const vertices = [a, b, c];
        for (let edge = 0; edge < 3; edge++) {
          const start = vertices[edge]!, end = vertices[(edge + 1) % 3]!;
          const dx = p[end]! - p[start]!, dz = p[end + 2]! - p[start + 2]!, length2 = dx * dx + dz * dz;
          if (length2 < 1e-12) continue;
          const t = ((x - p[start]!) * dx + (z - p[start + 2]!) * dz) / length2;
          if (t <= 0 || t >= 1) continue; // Do not extend either edge beyond its actual endpoints.
          const qx = p[start]! + dx * t, qz = p[start + 2]! + dz * t, distance = Math.hypot(x - qx, z - qz);
          if (distance > SEAM_WIDTH_M || distance < 1e-12) continue;
          edges.push({ mesh: name, triangle: i / 3, edge, x: qx, y: p[start + 1]! + (p[end + 1]! - p[start + 1]!) * t, z: qz, distance, dx: dx / Math.sqrt(length2), dz: dz / Math.sqrt(length2) });
        }
        continue;
      }
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator, w = 1 - u - v;
      if (u < 0 || v < 0 || w < 0) continue;
      const y = u * p[a + 1]! + v * p[b + 1]! + w * p[c + 1]!;
      if (Number.isFinite(y)) heights.push(y);
    }
    return { heights, edges };
  };
}

export function createPaintSupport(roads: MeshData, pavements: MeshData): PaintSupport {
  const queries = [indexedHeights(roads, "roads"), indexedHeights(pavements, "pavements")];
  const seamUses: PaintSeamUse[] = [], seen = new Set<string>();
  const query: PaintSupport = (x, z, expectedY) => {
    if (![x, z, expectedY].every(Number.isFinite)) return undefined;
    const strict = queries.flatMap(read => read(x, z).heights);
    const heights = strict.filter(y => Math.abs(y - expectedY) <= PAINT_SUPPORT_BOUNDS.sourceDeviationM);
    heights.sort((a, b) => Math.abs(a - expectedY) - Math.abs(b - expectedY) || a - b);
    const nearest = heights[0];
    if (nearest === undefined) {
      // Only a genuine strict footprint miss admits this authored paint-only
      // seam. A hit at an unrelated level is not permission to bridge below it.
      if (strict.length) return undefined;
      const edges = queries.flatMap(read => read(x, z, true).edges).filter(edge => Number.isFinite(edge.y) && Math.abs(edge.y - expectedY) <= PAINT_SUPPORT_BOUNDS.sourceDeviationM);
      const pairs: PaintSeamUse[] = [];
      for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
        const a = edges[i]!, b = edges[j]!;
        if (Math.abs(a.dx * b.dx + a.dz * b.dz) < .9999 || Math.abs(a.y - b.y) > SEAM_HEIGHT_AGREEMENT_M) continue;
        if ((a.x - x) * (b.x - x) + (a.z - z) * (b.z - z) > -.9999 * a.distance * b.distance) continue;
        const widthM = Math.hypot(a.x - b.x, a.z - b.z);
        if (widthM > SEAM_WIDTH_M) continue;
        const y = (a.y * b.distance + b.y * a.distance) / (a.distance + b.distance);
        pairs.push({ x, z, expectedY, y, widthM, edges: [a, b].map(({ mesh, triangle, edge, x, y, z }) => ({ mesh, triangle, edge, x, y, z })) });
      }
      pairs.sort((a, b) => Math.abs(a.y - expectedY) - Math.abs(b.y - expectedY));
      const seam = pairs[0];
      if (!seam || pairs.some(p => Math.abs(p.y - seam.y) > SEAM_HEIGHT_AGREEMENT_M)) return undefined;
      const key = `${x},${z},${expectedY}`;
      if (!seen.has(key)) { seen.add(key); seamUses.push(seam); }
      return seam.y;
    }
    // Opposing equally near levels have no source-supported choice.
    if (heights.some(y => Math.abs(Math.abs(y - expectedY) - Math.abs(nearest - expectedY)) < 1e-8 && Math.abs(y - nearest) > 1e-5)) return undefined;
    return Math.max(...heights.filter(y => y >= nearest && y - nearest <= PAINT_SUPPORT_BOUNDS.topAllowanceM));
  };
  Object.defineProperty(query, "seamUses", { value: seamUses });
  return query;
}
