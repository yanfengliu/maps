/** Replace only the explicitly reviewed hero/lower footprints in the previous
 * adaptive presentation. This does not confer support acceptance on the rest. */
import type { MeshData } from "../../src/world/mesh.ts";
import { partitionPatch, patchArea, type PlanPoint } from "./pavement-overlay.ts";
import { cellKeys, meshTriangle, PavementMeshWriter, plan, triangulate } from "./pavement-geometry.ts";
import type { PavementSourcePiece, Point, SourceIdentity } from "./select-pavement-source.ts";
import type { LowerPiece } from "./pavement-lower.ts";

export function composePavement(original: MeshData, hero: MeshData, selectedHero: readonly PavementSourcePiece[], lower: readonly LowerPiece[]) {
  const masks: { source: SourceIdentity; kind: string; ring: PlanPoint[] }[] = [];
  for (const source of selectedHero) for (const points of triangulate(source.ring)) {
    const ring = plan(points);
    if (patchArea(ring) > 1e-12) masks.push({ source: source.source, kind: "reviewed-hero-ground", ring });
  }
  for (const piece of lower) masks.push({ source: piece.source, kind: "reviewed-lower-passage", ring: plan(piece.ring) });
  const cells = new Map<string, number[]>();
  for (let i = 0; i < masks.length; i++) for (const key of cellKeys(masks[i]!.ring)) { const list = cells.get(key) ?? []; list.push(i); cells.set(key, list); }
  const writer = new PavementMeshWriter(), ledger: { triangle: number; before: number; retainedArea: number; removedArea: number; residual: number; replacedBy: string[] }[] = [];
  let unchangedTriangles = 0, clippedTriangles = 0, removedTriangles = 0;
  // Keep the original barycentric operation order, so the regenerated C5
  // positions can be compared exactly with its frozen, reviewed buffers.
  function height(triangle: Point[], p: PlanPoint): number {
    const [a, b, c] = triangle as [Point, Point, Point], d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    const u = ((b[2] - c[2]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[2])) / d;
    const v = ((c[2] - a[2]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[2])) / d;
    return u * a[1] + v * b[1] + (1 - u - v) * c[1];
  }
  for (let i = 0; i < original.indices.length; i += 3) {
    const triangle = meshTriangle(original, i), ring = plan(triangle), before = patchArea(ring), candidates = new Set(cellKeys(ring).flatMap((k) => cells.get(k) ?? []));
    if (!candidates.size || before === 0) { writer.triangle(triangle); unchangedTriangles++; continue; }
    let remainder = [ring], removedArea = 0; const owners = new Set<string>();
    for (const id of candidates) {
      const next: PlanPoint[][] = [], mask = masks[id]!;
      for (const part of remainder) { const split = partitionPatch(part, mask.ring); next.push(...split.outside); const area = patchArea(split.inside); if (area > 0) { removedArea += area; owners.add(mask.source.polygonId); } }
      remainder = next; if (!remainder.length) break;
    }
    const retainedArea = remainder.reduce((sum, p) => sum + patchArea(p), 0), residual = Math.abs(before - retainedArea - removedArea);
    if (residual > Math.max(1e-6, before * 1e-10)) throw new Error(`Prior pavement triangle ${i / 3} has ${residual} m² replacement residual; repair the partition before publishing.`);
    if (removedArea === 0) { writer.triangle(triangle); unchangedTriangles++; continue; }
    if (!remainder.length) removedTriangles++; else clippedTriangles++;
    ledger.push({ triangle: i / 3, before, retainedArea, removedArea, residual, replacedBy: [...owners] });
    for (const part of remainder) for (let j = 1; j + 1 < part.length; j++) writer.triangle([part[0]!, part[j + 1]!, part[j]!].map((p): Point => [p[0], height(triangle, p), p[1]]));
  }
  const retainedOutputTriangles = writer.indices.length / 3;
  for (let i = 0; i < hero.indices.length; i += 3) {
    const id = hero.indices[i]!;
    writer.triangle(meshTriangle(hero, i), [hero.normals[id * 3]!, hero.normals[id * 3 + 1]!, hero.normals[id * 3 + 2]!]);
  }
  for (const p of lower) for (let i = 1; i + 1 < p.ring.length; i++) writer.triangle([p.ring[0]!, p.ring[i + 1]!, p.ring[i]!]);
  const mesh = writer.finish({ ...original.header, note: "Candidate5: two reviewed hero parent footprints use exact ground-support patches and layer-owned closure; one proved lower bridge clip preserves source elevation. Other presentation remains unchanged/unclassified; no whole-city support acceptance." });
  return { mesh, masks, inputTriangles: original.header.triangleCount, unchangedTriangles, clippedTriangles, removedTriangles, retainedOutputTriangles, appendedHeroTriangles: hero.header.triangleCount, outputTriangles: mesh.header.triangleCount, maximumReplacementAreaResidualM2: Math.max(0, ...ledger.map((r) => r.residual)), ledger };
}
