/** The two reviewed ground-level parent footprints only. This is the C5 recipe,
 * not a whole-city terrain authority or a classifier for lower passages. */
import type { MeshData } from "../../src/world/mesh.ts";
import { exposedRisers, overlayPatches, partitionPatch, patchArea, planeHeight, splitPatch, type PavementPatch } from "./pavement-overlay.ts";
import { heightPlane, liftPlane, PavementMeshWriter, plan, triangleIndex, triangulate } from "./pavement-geometry.ts";
import type { PavementSourcePiece, Point, SourceIdentity } from "./select-pavement-source.ts";

export const HERO_PAVEMENT_PARENTS = ["tran_f2a5948b-23c4-4932-83a2-a5c3591bf06c", "tran_4b2989fd-ca82-459e-b88a-b1edc013862e"] as const;
export function buildHeroPavement(sources: readonly PavementSourcePiece[], terrain: MeshData, roads: MeshData) {
  const terrainAt = triangleIndex(terrain), roadsAt = triangleIndex(roads);
  const selected = sources.filter((p) => HERO_PAVEMENT_PARENTS.some((id) => id === p.source.roadId));
  for (const id of HERO_PAVEMENT_PARENTS) if (!selected.some((p) => p.source.roadId === id)) throw new Error(`Reviewed pavement parent ${id} is missing; restore the pinned PLATEAU source or re-review the pavement recipe.`);
  const patches: PavementPatch[] = [], ledger: { source: SourceIdentity; before: number; after: number; residual: number }[] = [];
  const degenerates: { source: SourceIdentity; points: Point[]; projectedArea: number }[] = [];
  for (const source of selected) for (const points of triangulate(source.ring)) {
    const ring = plan(points), before = patchArea(ring);
    if (before < 1e-12) { degenerates.push({ source: source.source, points, projectedArea: before }); continue; }
    const sourcePlane = heightPlane(points), start = patches.length;
    for (const ground of terrainAt(ring)) {
      const inside = partitionPatch(ring, ground.ring).inside;
      if (patchArea(inside) < 1e-12) continue;
      let top = overlayPatches([{ layer: `${source.source.roadId}:ground`, source: source.source.polygonId, ring: inside, plane: liftPlane(sourcePlane, .235), base: ground.plane }], inside, liftPlane(ground.plane, .235));
      let highestRoad: PavementPatch[] = [{ layer: "road-query", source: source.source.polygonId, ring: inside, plane: [0, 0, -1e9], base: ground.plane }];
      for (const road of roadsAt(inside)) highestRoad = overlayPatches(highestRoad, road.ring, road.plane);
      for (const road of highestRoad) {
        if (road.plane[2] === -1e9) continue;
        const eligible = splitPatch(road.ring, (p) => planeHeight(ground.plane, p) + .75 - planeHeight(road.plane, p))[0];
        if (patchArea(eligible) > 1e-12) top = overlayPatches(top, eligible, liftPlane(road.plane, .08));
      }
      patches.push(...top);
    }
    const after = patches.slice(start).reduce((sum, p) => sum + patchArea(p.ring), 0), residual = Math.abs(before - after);
    ledger.push({ source: source.source, before, after, residual });
    if (residual > Math.max(1e-6, before * 1e-10)) throw new Error(`Pavement source ${source.source.polygonId} has ${residual} m² terrain-coverage residual; repair coverage before publishing.`);
  }
  if (degenerates.reduce((sum, row) => sum + row.projectedArea, 0) > 1e-6) throw new Error("Pavement projected-degenerate source area exceeds the explicit 1e-6 m² budget.");
  const writer = new PavementMeshWriter();
  const areas = new Map<string, { source: string; doubleArea: number; float32Area: number; triangles: number; collapsed: number }>();
  for (const patch of patches) for (let i = 1; i + 1 < patch.ring.length; i++) {
    const points = [patch.ring[0]!, patch.ring[i + 1]!, patch.ring[i]!].map((p): Point => [p[0], planeHeight(patch.plane, p), p[1]]);
    const row = areas.get(patch.source) ?? { source: patch.source, doubleArea: 0, float32Area: 0, triangles: 0, collapsed: 0 };
    const roundedArea = patchArea(points.map((p) => [Math.fround(p[0]), Math.fround(p[2])]));
    row.doubleArea += patchArea(plan(points)); row.float32Area += roundedArea; row.triangles++; if (roundedArea === 0) row.collapsed++; areas.set(patch.source, row);
    writer.triangle(points);
  }
  const topTriangles = writer.indices.length / 3, risers = exposedRisers(patches);
  for (const r of risers) {
    const a: Point = [...r.a], b: Point = [...r.b], c: Point = [b[0], r.lowerB, b[2]], d: Point = [a[0], r.lowerA, a[2]];
    const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz), normal: Point = [dz / length, 0, -dx / length];
    writer.triangle([a, b, c], normal); writer.triangle([a, c, d], normal);
  }
  const mesh = writer.finish({ version: 1, name: "pavement-owned-hero-prototype", vertexCount: 0, triangleCount: 0, bounds: { min: [0, 0, 0], max: [0, 0, 0] }, note: "Isolated two-parent hero source experiment. Other source regions absent by declared experiment scope, not deleted. Existing ground oracle, exact per-layer closure. No app publication." });
  return { mesh, selected, ledger, degenerates, topTriangles, riserTriangles: risers.length * 2, patches: patches.length,
    precision: { maximumObservedAxisDisplacementM: writer.maximumAxisRoundoffM, maximumPlanDisplacementBoundM: Math.hypot(writer.maximumAxisRoundoffM[0], writer.maximumAxisRoundoffM[2]), sourceAreas: [...areas.values()].map((row) => ({ ...row, inputArea: ledger.filter((r) => r.source.polygonId === row.source).reduce((sum, r) => sum + r.before, 0), absoluteEncodingAreaChangeM2: Math.abs(row.doubleArea - row.float32Area) })) } };
}
