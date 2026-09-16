import { ShapeUtils, Vector2 } from "three";
import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { sourceRingKey, type PavementSourcePolygon } from "./pavement-source.ts";

export type Point = [number, number, number];
export interface SourceIdentity { roadId: string; areaId: string; polygonId: string; areaKind: PavementSourcePolygon["areaKind"]; functionCode: number; lod: 2 | 3 }
export interface PavementSourcePiece {
  source: SourceIdentity;
  aliases: SourceIdentity[];
  /** Original orthometric source height. LOD2 stays at zero in this record. */
  ring: Point[];
  role: "published-lod3" | "fallback-lod2";
}
export interface PavementCoverageLedger { roadId: string; lowerAreaM2: number; coveredAreaM2: number; retainedFallbackAreaM2: number; maximumAreaResidualM2: number; lowerTriangles: number; higherTriangles: number }

const cross = (a: Point, b: Point, c: Point): number => (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
export function projectedArea(ring: readonly Point[]): number {
  let twice = 0; const origin = ring[0]; if (!origin) return 0;
  for (let index = 1; index + 1 < ring.length; index++) twice += cross(origin, ring[index]!, ring[index + 1]!);
  return Math.abs(twice / 2);
}
const clean = (ring: Point[]): Point[] => {
  const out: Point[] = [];
  for (const p of ring) if (!out.length || Math.hypot(p[0] - out.at(-1)![0], p[2] - out.at(-1)![2]) > 1e-10) out.push(p);
  if (out.length > 1 && Math.hypot(out[0]![0] - out.at(-1)![0], out[0]![2] - out.at(-1)![2]) < 1e-10) out.pop();
  return out;
};
const valid = (ring: Point[]): boolean => ring.length >= 3 && projectedArea(ring) > 1e-12;

/** Exact half-plane split in double precision. Intersections retain the lower
 * source plane's height; this function never samples or changes support.
 */
function split(ring: Point[], a: Point, b: Point): [Point[], Point[]] {
  const inside: Point[] = []; const outside: Point[] = [];
  for (let index = 0; index < ring.length; index++) {
    const p = ring[index]!; const q = ring[(index + 1) % ring.length]!;
    const v = cross(a, b, p); const w = cross(a, b, q);
    if (v >= 0) inside.push(p);
    if (v <= 0) outside.push(p);
    if (v * w < 0) {
      const t = v / (v - w);
      const intersection: Point = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
      inside.push(intersection); outside.push(intersection);
    }
  }
  return [clean(inside), clean(outside)];
}

export function subtractCoverage(ring: Point[], triangle: readonly Point[]): { outside: Point[][]; coveredAreaM2: number } {
  let remaining = ring; const outside: Point[][] = [];
  for (let index = 0; index < 3 && valid(remaining); index++) {
    const [keep, rest] = split(remaining, triangle[index]!, triangle[(index + 1) % 3]!);
    if (valid(rest)) outside.push(rest);
    remaining = keep;
  }
  return { outside, coveredAreaM2: valid(remaining) ? projectedArea(remaining) : 0 };
}

function triangulate(ring: Point[]): Point[][] {
  return ShapeUtils.triangulateShape(ring.map((p) => new Vector2(p[0], p[2])), []).map((face) => {
    const points = face.map((index) => ring[index]!);
    if (cross(points[0]!, points[1]!, points[2]!) < 0) [points[1], points[2]] = [points[2]!, points[1]!];
    return points;
  });
}
const identity = ({ roadId, areaId, polygonId, areaKind, functionCode, lod }: PavementSourcePolygon): SourceIdentity => ({ roadId, areaId, polygonId, areaKind, functionCode, lod });

export function selectPavementSources(input: readonly PavementSourcePolygon[]): { pieces: PavementSourcePiece[]; ledger: PavementCoverageLedger[]; duplicatePolygons: number; projectedDegenerates: SourceIdentity[] } {
  const roads = new Map<string, { source: PavementSourcePolygon; aliases: SourceIdentity[] }[]>();
  const seen = new Map<string, { source: PavementSourcePolygon; aliases: SourceIdentity[] }>();
  let duplicatePolygons = 0;
  for (const source of input) {
    const key = `${source.roadId}:${source.lod}:${sourceRingKey(source.ring)}`;
    const previous = seen.get(key);
    if (previous) { previous.aliases.push(identity(source)); duplicatePolygons++; continue; }
    const item = { source, aliases: [] as SourceIdentity[] }; seen.set(key, item);
    const list = roads.get(source.roadId) ?? []; list.push(item); roads.set(source.roadId, list);
  }
  const pieces: PavementSourcePiece[] = []; const ledger: PavementCoverageLedger[] = []; const projectedDegenerates: SourceIdentity[] = [];
  for (const [roadId, sources] of roads) {
    const projected = sources.map((item) => ({ source: identity(item.source), aliases: item.aliases, ring: item.source.ring.map(([lat, lon, height]): Point => {
      const world = planeRectangularToWorld(geographicToPlaneRectangular(lat, lon, height), AOI_ORIGIN_EPSG6677);
      return [world.x, world.y, world.z];
    }) }));
    const higher = projected.filter((item) => item.source.lod === 3);
    const higherTriangles = higher.flatMap((item) => triangulate(item.ring)).filter(valid).map((ring) => ({ ring, minX: Math.min(...ring.map((p) => p[0])), maxX: Math.max(...ring.map((p) => p[0])), minZ: Math.min(...ring.map((p) => p[2])), maxZ: Math.max(...ring.map((p) => p[2])) }));
    const row: PavementCoverageLedger = { roadId, lowerAreaM2: 0, coveredAreaM2: 0, retainedFallbackAreaM2: 0, maximumAreaResidualM2: 0, lowerTriangles: 0, higherTriangles: higherTriangles.length };
    for (const item of projected) {
      if (projectedArea(item.ring) < 1e-12) projectedDegenerates.push(item.source);
      if (item.source.lod === 3 || projectedArea(item.ring) < 1e-12) { pieces.push({ ...item, role: item.source.lod === 3 ? "published-lod3" : "fallback-lod2" }); continue; }
      for (const triangle of triangulate(item.ring)) {
        const original = projectedArea(triangle); if (original < 1e-12) continue;
        row.lowerTriangles++; row.lowerAreaM2 += original;
        let remaining = [triangle]; let covered = 0;
        const minX = Math.min(...triangle.map((p) => p[0])); const maxX = Math.max(...triangle.map((p) => p[0]));
        const minZ = Math.min(...triangle.map((p) => p[2])); const maxZ = Math.max(...triangle.map((p) => p[2]));
        for (const high of higherTriangles) {
          if (high.minX > maxX || high.maxX < minX || high.minZ > maxZ || high.maxZ < minZ) continue;
          const next: Point[][] = [];
          for (const polygon of remaining) { const result = subtractCoverage(polygon, high.ring); next.push(...result.outside); covered += result.coveredAreaM2; }
          remaining = next; if (!remaining.length) break;
        }
        const fallback = remaining.reduce((sum, ring) => sum + projectedArea(ring), 0);
        const residual = Math.abs(original - covered - fallback);
        // Far below the source's millimetre height precision and the final
        // Float32 placement precision. No coordinates are quantized here.
        if (residual > Math.max(1e-6, original * 1e-10)) throw new Error(`Pavement source ${item.source.polygonId} in ${roadId} lost ${residual} square metres during LOD coverage selection; inspect the clipping ledger before publishing this source.`);
        row.coveredAreaM2 += covered; row.retainedFallbackAreaM2 += fallback; row.maximumAreaResidualM2 = Math.max(row.maximumAreaResidualM2, residual);
        for (const ring of remaining) pieces.push({ source: item.source, aliases: item.aliases, ring, role: "fallback-lod2" });
      }
    }
    ledger.push(row);
  }
  return { pieces, ledger, duplicatePolygons, projectedDegenerates };
}
