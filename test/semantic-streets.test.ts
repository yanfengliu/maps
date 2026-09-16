/** Bounds: PLATEAU semantic selection, highest LOD, preserved holes and texture
 * priority at geographic boundaries. Rendered appearance requires native frames.
 */
import { expect, it } from "vitest";
import { markingPolygons } from "../tools/scene/build-markings.js";
import { pavementSurfacesOf } from "../tools/scene/build-roads.js";
import { textureLimitForTile } from "../src/scene/texture-budget.js";
import { drapeSurface } from "../tools/scene/drape-surface.js";
import { surfaceSampler } from "../src/world/surface-sampler.js";
import type { MeshData } from "../src/world/mesh.js";
const ring = "35.6594 139.7004 15 35.6594 139.7006 15 35.6596 139.7006 15 35.6596 139.7004 15 35.6594 139.7004 15";
const polygon = `<gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>${ring}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon>`;

it("uses sidewalk and island semantics once at their highest LOD, never carriageway", () => {
  const area = (tag: string, code: number) => `<tran:${tag}><tran:function>${code}</tran:function><tran:lod2MultiSurface>${polygon}</tran:lod2MultiSurface><tran:lod3MultiSurface>${polygon}</tran:lod3MultiSurface></tran:${tag}>`;
  const result = pavementSurfacesOf(area("TrafficArea", 1000) + area("TrafficArea", 2020) + area("AuxiliaryTrafficArea", 3010));
  expect(result).toHaveLength(2); expect(result.map((surface) => surface.level)).toEqual([3, 3]);
  expect(result.every((surface) => surface.rings.length === 1 && surface.rings[0]!.length === 4)).toBe(true);
  expect(() => pavementSurfacesOf(area("TrafficArea", 2020).replace("</gml:Polygon>", "<gml:interior></gml:interior></gml:Polygon>"))).toThrow(/interior ring.*preserve that hole/);
});

it("keeps source lane and stop paint with holes and excludes crossing/furniture functions", () => {
  const object = (code: number) => `<frn:CityFurniture gml:id="source-${code}"><frn:function>${code}</frn:function><frn:lod3Geometry>${polygon.replace("</gml:Polygon>", `<gml:interior><gml:LinearRing><gml:posList>${ring}</gml:posList></gml:LinearRing></gml:interior></gml:Polygon>`)}</frn:lod3Geometry></frn:CityFurniture>`;
  const result = markingPolygons([1010, 1020, 1030, 1040, 1120, 1110, 2000, 1000].map(object).join(""));
  expect(result.map((item) => item.functionCode)).toEqual([1010, 1020, 1030, 1040, 1120]);
  expect(result.every((item) => item.rings.length === 2)).toBe(true);
  expect(Math.abs(result[0]!.rings[0]![0]!.x)).toBeLessThan(20);
});

it("keeps 2048 priority bounded to boxes within 160m, including rotated boxes", () => {
  expect(textureLimitForTile({ boundingVolume: { box: [200, 30, 0, 40, 0, 0, 0, 20, 0, 0, 0, 40] } })).toBe(2048);
  expect(textureLimitForTile({ boundingVolume: { box: [201, 30, 0, 40, 0, 0, 0, 20, 0, 0, 0, 40] } })).toBe(1024);
  expect(textureLimitForTile({ boundingVolume: { box: [210, 30, 0, 30, 0, 30, 0, 20, 0, -30, 0, 30] } })).toBe(2048);
  for (const value of [null, {}, { boundingVolume: { box: [NaN] } }]) expect(textureLimitForTile(value)).toBe(1024);
});

it("reserves native4096 for the final leaf covering the recorded crossing frontage", () => {
  const leaf = { geometricError: 0, boundingVolume: { box: [-89.24, 49.10, -5.63, 103.54, 0, 0, 0, 34.0, 0, 0, 0, 102.15] } };
  expect(textureLimitForTile(leaf)).toBe(4096);
  expect(textureLimitForTile({ ...leaf, geometricError: 230 })).toBe(2048);
  expect(textureLimitForTile({ ...leaf, children: [{}] })).toBe(2048);
  expect(textureLimitForTile({ geometricError: 0, boundingVolume: { box: [105.74, 44, -3.9, 116.56, 0, 0, 0, 29.4, 0, 0, 0, 96.2] } })).toBe(2048);
});

it("raises long pavement triangle interiors above a crossing ridge, not only original vertices", () => {
  const source: MeshData = { header: { version: 1, name: "pavement-ridge-control", vertexCount: 3, triangleCount: 1, bounds: { min: [0, 0.08, 0], max: [8, 0.08, 8] } }, positions: new Float32Array([0, 0.08, 0, 0, 0.08, 8, 8, 0.08, 0]), normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), indices: new Uint32Array([0, 1, 2]) };
  const ridge = (x: number, z: number): number => 0.2 * Math.max(0, 1 - (Math.abs(x - 2) + Math.abs(z - 2)) / 2);
  // The original vertex-only path is the red control: every original vertex
  // clears the support, while the ridge inside the triangle cuts through it.
  expect(surfaceSampler(source)(2, 2)).toBeLessThan(ridge(2, 2));
  const draped = surfaceSampler(drapeSurface(source, ridge));
  for (let x = 0.25; x < 8; x += 0.25) for (let z = 0.25; x + z < 8; z += 0.25) expect(draped(x, z)!, `${x},${z}`).toBeGreaterThanOrEqual(ridge(x, z) + 0.074);
});
