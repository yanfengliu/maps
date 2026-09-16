/** Bound: the production C5 recipe's planar support, partial lower-source clip,
 * replacement footprint and input binding. These small fixtures do not prove
 * citywide support; frozen native views and full-source replay remain separate. */
import { expect, it } from "vitest";
import { surfaceSampler } from "../src/world/surface-sampler.js";
import { PavementMeshWriter } from "../tools/scene/pavement-geometry.js";
import { buildHeroPavement, HERO_PAVEMENT_PARENTS } from "../tools/scene/pavement-hero.js";
import { clipLowerPavement, LOWER_BRIDGE_POLYGONS, LOWER_PAVEMENT_SOURCE, readLowerBridge } from "../tools/scene/pavement-lower.js";
import { composePavement } from "../tools/scene/compose-pavement.js";
import { buildPavementPresentation } from "../tools/scene/pavement-recipe.js";
import type { PavementSourcePiece, Point } from "../tools/scene/select-pavement-source.js";

const header = { version: 1 as const, name: "fixture", vertexCount: 0, triangleCount: 0, bounds: { min: [0, 0, 0] as Point, max: [0, 0, 0] as Point } };
function rectangle(x0: number, z0: number, x1: number, z1: number, y: number) {
  const out = new PavementMeshWriter();
  out.triangle([[x0, y, z0], [x1, y, z1], [x1, y, z0]]); out.triangle([[x0, y, z0], [x0, y, z1], [x1, y, z1]]);
  return out.finish(header);
}
function source(roadId: string, ring: Point[], polygonId = roadId): PavementSourcePiece {
  return { source: { roadId, areaId: `area:${roadId}`, polygonId, areaKind: "TrafficArea", functionCode: 2000, lod: 3 }, aliases: [], role: "published-lod3", ring };
}

it("repairs an interior transverse road strip even when every original source corner misses it", () => {
  const first = source(HERO_PAVEMENT_PARENTS[0], [[0, 10, 0], [4, 10, 0], [4, 10, 4], [0, 10, 4]]);
  const second = source(HERO_PAVEMENT_PARENTS[1], [[10, 10, 0], [12, 10, 0], [12, 10, 2], [10, 10, 2]]);
  const terrain = rectangle(-1, -1, 14, 5, 10), road = rectangle(1.5, -1, 2.5, 5, 10.4);
  const built = buildHeroPavement([first, second], terrain, road), at = surfaceSampler(built.mesh);
  expect(at(2.01, 1.21)).toBeCloseTo(10.48, 5);
  expect(at(.31, 1.21)).toBeCloseTo(10.235, 5);
  expect(at(11.1, 1.21)).toBeCloseTo(10.235, 5);
  expect(built.ledger.reduce((sum, row) => sum + row.after, 0)).toBeCloseTo(20, 9);
  expect(built.riserTriangles).toBeGreaterThan(0);
  expect(() => buildHeroPavement([first, second], rectangle(-1, -1, 11, 5, 10), road)).toThrow(/terrain-coverage residual.*before publishing/);
  expect(() => buildHeroPavement([first], terrain, road)).toThrow(/reviewed pavement parent|Reviewed pavement parent/);
});

it("retains the named lower source height only in the proven bridge footprint, with an explicit remainder", () => {
  const lower = source("lower-road", [[0, 14.8, 0], [4, 14.8, 0], [0, 14.8, 4]], LOWER_PAVEMENT_SOURCE);
  const built = clipLowerPavement(lower, [{ id: LOWER_BRIDGE_POLYGONS[0], points: [[0, 18, 0], [2, 18, 0], [0, 18, 2]] }]);
  expect(built.ledger.classifiedLowerAreaM2).toBeCloseTo(2, 10);
  expect(built.ledger.unclassifiedAreaM2).toBeCloseTo(6, 10);
  expect(built.ledger.residual).toBeLessThan(1e-10);
  expect(built.lower.every((p) => p.ring.every((v) => v[1] === 14.8))).toBe(true);
  const insufficient = clipLowerPavement(lower, [{ id: LOWER_BRIDGE_POLYGONS[0], points: [[0, 15, 0], [2, 15, 0], [0, 15, 2]] }]);
  expect(insufficient.lower).toHaveLength(0); expect(insufficient.ledger.unclassifiedAreaM2).toBe(8);
  expect(() => clipLowerPavement({ ...lower, source: { ...lower.source, polygonId: "another-low-surface" } }, [])).toThrow(/another low surface is not evidence/);
});

it("replaces only the named footprint while preserving exterior heights and stacked XYZ vertices", () => {
  const original = rectangle(-2, -2, 4, 4, 15), hero = rectangle(0, 0, 2, 2, 15.3);
  const selected = source("hero", [[0, 15, 0], [2, 15, 0], [2, 15, 2], [0, 15, 2]]);
  const result = composePavement(original, hero, [selected], []), at = surfaceSampler(result.mesh);
  expect(at(1.13, .47)).toBeCloseTo(15.3, 5); expect(at(-1.13, .47)).toBe(15);
  expect(result.ledger.reduce((sum, row) => sum + row.removedArea, 0)).toBeCloseTo(4, 10);
  expect(result.maximumReplacementAreaResidualM2).toBeLessThan(1e-10);
  const writer = new PavementMeshWriter();
  writer.triangle([[0, 14.8, 0], [1, 14.8, 0], [0, 14.8, 1]]);
  writer.triangle([[0, 31.165, 0], [1, 31.165, 0], [0, 31.165, 1]]);
  expect(writer.finish(header).header.vertexCount).toBe(6);
});

it("rejects changed geometry before reading source files or publishing any surface", async () => {
  await expect(buildPavementPresentation(new Uint8Array([1]), new Uint8Array([2]))).rejects.toThrow(/terrain.mesh.*outside the reviewed C5 source binding.*data:pavements/);
  expect(() => readLowerBridge("<CityModel/>")).toThrow(/Expected one reviewed bridge.*restore the pinned source/);
});
