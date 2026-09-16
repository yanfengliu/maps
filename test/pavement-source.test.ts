/** Bounds: source identity, same-parent LOD coverage, exact source aliases and
 * stacked levels. This tests source selection, never support or visible closure.
 */
import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { readPavementSources, sourceRingKey, type PavementSourcePolygon } from "../tools/scene/pavement-source.js";
import { selectPavementSources } from "../tools/scene/select-pavement-source.js";

const square: PavementSourcePolygon["ring"] = [[35.6595, 139.7005, 0], [35.6595, 139.7006, 0], [35.6596, 139.7006, 0], [35.6596, 139.7005, 0]];
const source = (roadId: string, polygonId: string, lod: 2 | 3, ring: PavementSourcePolygon["ring"]): PavementSourcePolygon => ({ roadId, areaId: `${roadId}-area-${lod}`, polygonId, areaKind: "TrafficArea", functionCode: 2000, lod, ring });

it("preserves area/polygon identities and both LOD descriptions before selection", () => {
  const coords = [...square, square[0]!].flat().join(" ");
  const area = (lod: number) => `<tran:TrafficArea gml:id="area-${lod}"><tran:function>2000</tran:function><tran:lod${lod}MultiSurface><gml:Polygon gml:id="polygon-${lod}"><gml:exterior><gml:posList>${coords}</gml:posList></gml:exterior></gml:Polygon></tran:lod${lod}MultiSurface></tran:TrafficArea>`;
  const xml = `<tran:Road gml:id="parent-road">${area(2)}${area(3)}</tran:Road>`;
  const parsed = readPavementSources(xml);
  expect(parsed.map((item) => [item.roadId, item.areaId, item.polygonId, item.lod])).toEqual([["parent-road", "area-2", "polygon-2", 2], ["parent-road", "area-3", "polygon-3", 3]]);
  expect(() => readPavementSources(xml.replace('gml:id="polygon-3"', ""))).toThrow(/no gml:id/);
});

it("keeps uncovered lower regions, never clips another parent and retains stacked LOD3 levels", () => {
  const half = square.map(([lat, lon]): [number, number, number] => [35.6595 + (lat - 35.6595) / 2, lon, 15]);
  const high = source("same", "higher", 3, half);
  const duplicate = { ...high, polygonId: "duplicate", ring: [...half].reverse() };
  const stacked = source("same", "upper-deck", 3, half.map(([lat, lon]) => [lat, lon, 31]));
  const result = selectPavementSources([source("same", "lower", 2, square), high, duplicate, stacked, source("other", "other-lower", 2, square)]);
  expect(result.duplicatePolygons).toBe(1);
  const row = result.ledger.find((item) => item.roadId === "same")!;
  expect(row.retainedFallbackAreaM2 / row.lowerAreaM2).toBeCloseTo(0.5, 4);
  expect(row.coveredAreaM2 + row.retainedFallbackAreaM2).toBeCloseTo(row.lowerAreaM2, 6);
  expect(result.ledger.find((item) => item.roadId === "other")!.coveredAreaM2).toBe(0);
  const published = result.pieces.filter((piece) => piece.role === "published-lod3");
  expect(published).toHaveLength(2);
  expect(published.map((piece) => piece.ring[0]![1])).toEqual([15, 31]);
  expect(published[0]!.aliases.map((alias) => alias.polygonId)).toEqual(["duplicate"]);
  expect(result.pieces.filter((piece) => piece.role === "fallback-lod2").every((piece) => piece.ring.every((p) => p[1] === 0))).toBe(true);
});

it("source aliases preserve edge order as well as elevation", () => {
  expect(sourceRingKey(square)).toBe(sourceRingKey([...square.slice(2), ...square.slice(0, 2)]));
  expect(sourceRingKey(square)).not.toBe(sourceRingKey([square[0]!, square[2]!, square[1]!, square[3]!]));
  expect(sourceRingKey(square)).not.toBe(sourceRingKey(square.map(([lat, lon]) => [lat, lon, 16])));
});

it("retains the raw hero and two extreme source records without inventing a support height", async () => {
  // Thirteen source rings from the three observed conflicts, promoted from the
  // pinned PLATEAU files listed in this fixture. This excerpt tests ownership
  // and published heights; its partial per-road coverage is not a whole-road census.
  const fixture = JSON.parse(await readFile(new URL("./fixtures/pavement-source-conflicts.json", import.meta.url), "utf8")) as { polygons: PavementSourcePolygon[] };
  expect(fixture.polygons).toHaveLength(13);
  const result = selectPavementSources(fixture.polygons);
  expect(result.duplicatePolygons).toBe(7);
  const published = result.pieces.filter((piece) => piece.role === "published-lod3");
  expect(published.map((piece) => [piece.source.polygonId, piece.aliases.length, piece.ring.map((point) => point[1])])).toEqual([
    ["poly_411c5fe9-a830-45bd-abd2-2f9cdbebbd39", 5, [14.827, 14.891, 14.608]],
    ["poly_b6334821-d28d-446a-b791-33ee343ef14a", 1, [14.783, 14.889, 14.805]],
    ["poly_c46a032f-6b14-4cbb-882d-b06c31b3c798", 1, [30.218, 30.26, 29.92]],
  ]);
  const otherParent = result.ledger.find((row) => row.roadId === "tran_4b2989fd-ca82-459e-b88a-b1edc013862e")!;
  expect(otherParent.coveredAreaM2).toBe(0);
  expect(otherParent.retainedFallbackAreaM2).toBeCloseTo(111.719541036912, 6);
  expect(result.pieces.filter((piece) => piece.role === "fallback-lod2").every((piece) => piece.ring.every((point) => point[1] === 0))).toBe(true);
});
