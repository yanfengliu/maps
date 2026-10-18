/** Bound: pinned corridor source identities, finite displayed support/omissions,
 * authored footprint exclusions and owned resources. No native appearance,
 * continuous area support, moving filtering or whole-AOI road qualification.
 * Startup bound: actual decoded road/pavement reads stay inside the fixed
 * corridor triangle population; no wall-time, loading or FPS claim.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from "three";
import { createCorridorPaint, type CorridorPaint, type CorridorPaintInputs } from "../src/scene/corridor-paint.js";
import { CORRIDOR_CROSSING, CORRIDOR_EDGES, CORRIDOR_SOURCE } from "../src/scene/corridor-paint-recipe.js";
import { createPaintSupport } from "../src/scene/paint-support.js";
import { decodeMesh, type MeshData } from "../src/world/mesh.js";
import { worldStyle } from "../src/world/styles.js";
import type { NetworkData } from "../src/world/network-data.js";

type Triple = [number, number, number];
interface SourcePiece { source: { roadId: string; areaId: string; polygonId: string; functionCode: number; lod: number }; ring: Triple[] }
const fixture = JSON.parse(await readFile(new URL("./fixtures/corridor-paint.json", import.meta.url), "utf8")) as {
  provenance: { pins: { path: string; bytes: number; sha256: string }[] };
  edges: { side: "west" | "east"; ordinal: number; edge: number; source: SourcePiece["source"]; ring: Triple[] }[];
  gap: { afterOrdinal: number; beforeOrdinal: number; distanceM: number };
  crossing: { id: string; widthM: number; points: number[][] };
};
const satellite = worldStyle("satellite"), cartographic = worldStyle("cartographic");
let inputs: CorridorPaintInputs, source: { pieces: SourcePiece[] }, network: NetworkData;
beforeAll(async () => {
  const root = process.env.MAPS_CORRIDOR_PAINT_SOURCE_ROOT ?? fileURLToPath(new URL("../", import.meta.url));
  if (!path.isAbsolute(root)) throw Error(`Corridor paint source root ${root} must be an absolute admitted checkout.`);
  const bytes = await Promise.all(fixture.provenance.pins.map(async pin => {
    const file = path.join(root, pin.path);
    const bytes = await readFile(file).catch(cause => { throw Error(`Corridor paint gate needs reviewed cached ${file}; restore the accepted scene/network/source cache and review changed inputs before testing. This test never fetches or skips data.`, { cause }); });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const reviewedPins = pin.path === "data/network/network.json"
      ? [pin, { bytes: 10301111, sha256: "1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f" }]
      : [pin];
    if (!reviewedPins.some(reviewed => bytes.length === reviewed.bytes && sha256 === reviewed.sha256)) throw Error(`Corridor paint source ${file} changed from ${pin.sha256} to ${sha256}; restore reviewed bytes or review a new recipe.`);
    return bytes;
  }));
  const roads = decodeMesh(bytes[0]!), pavements = decodeMesh(bytes[1]!);
  inputs = { roads, pavements, markings: decodeMesh(bytes[2]!), inputDigests: { roads: fixture.provenance.pins[0]!.sha256, pavements: fixture.provenance.pins[1]!.sha256 }, paintHeightAt: createPaintSupport(roads, pavements) };
  source = JSON.parse(bytes[3]!.toString("utf8")) as typeof source;
  network = JSON.parse(bytes[4]!.toString("utf8")) as NetworkData;
});
const body = (paint: CorridorPaint): Mesh<BufferGeometry, MeshStandardMaterial> => paint.root.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;
const empty = (): MeshData => ({ header: { version: 1, name: "empty", vertexCount: 0, triangleCount: 0, bounds: { min: [0, 0, 0], max: [0, 0, 0] } }, positions: new Float32Array(), normals: new Float32Array(), indices: new Uint32Array() });
function rectangle(x0: number, x1: number, z0: number, z1: number, y: number): MeshData {
  const positions = new Float32Array([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0]);
  return { header: { version: 1, name: "synthetic footprint", vertexCount: 4, triangleCount: 2, bounds: { min: [x0, y, z0], max: [x1, y, z1] } }, positions, normals: new Float32Array(12), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) };
}

/** Independent geographic read guard over the exact decoded physical inputs.
 * It does not import the runtime selection or impose a timing threshold.
 * PaintSupport was already built and retains its original unwrapped inputs.
 */
function localReads(mesh: MeshData, name: string): { mesh: MeshData; triangles: Set<number>; visited: Set<number> } {
  const triangles = new Set<number>(), vertices = new Set<number>(), visited = new Set<number>();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const offsets = [mesh.indices[i]!, mesh.indices[i + 1]!, mesh.indices[i + 2]!].map(v => v * 3);
    const xs = offsets.map(v => mesh.positions[v]!), zs = offsets.map(v => mesh.positions[v + 2]!);
    if (Math.max(...xs) < 0 || Math.min(...xs) > 40 || Math.max(...zs) < -95 || Math.min(...zs) > -40) continue;
    if (Math.abs((xs[1]! - xs[0]!) * (zs[2]! - zs[0]!) - (zs[1]! - zs[0]!) * (xs[2]! - xs[0]!)) < 1e-12) continue;
    triangles.add(i / 3); for (const offset of offsets) for (const channel of [0, 1, 2]) vertices.add(offset + channel);
  }
  const indices = new Proxy(mesh.indices, { get(target, property) {
    if (typeof property === "string" && /^\d+$/.test(property)) {
      const ordinal = Math.floor(Number(property) / 3);
      if (!triangles.has(ordinal)) throw Error(`Corridor constructor read unrelated ${name} triangle ${ordinal}; whole-mesh startup extraction is forbidden.`);
      visited.add(ordinal);
    }
    return Reflect.get(target, property, target);
  } });
  const positions = new Proxy(mesh.positions, { get(target, property) {
    if (typeof property === "string" && /^\d+$/.test(property) && !vertices.has(Number(property))) throw Error(`Corridor constructor read unrelated ${name} position ${String(property)}; use the actual bounded source selection.`);
    return Reflect.get(target, property, target);
  } });
  return { mesh: { ...mesh, indices, positions }, triangles, visited };
}

describe("one pinned authored corridor paint overlay", () => {
  it("avoids unrelated source reads while retaining immutable955 Float32 output and order", () => {
    const road = localReads(inputs.roads, "roads"), paving = localReads(inputs.pavements, "pavements");
    expect(road.triangles.size).toBe(154); expect(paving.triangles.size).toBe(1951);
    const paint = createCorridorPaint({ ...inputs, roads: road.mesh, pavements: paving.mesh }, satellite);
    try {
      expect(road.visited).toEqual(road.triangles); expect(paving.visited).toEqual(paving.triangles);
      const geometry = body(paint).geometry;
      // Measured from immutable955 source, freeze.json c2b796bd..., against
      // these five exact physical pins. The candidate never generated them.
      expect(geometry.getAttribute("position").count).toBe(2322);
      const digest = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
      const bytes = (name: string): Uint8Array => { const array = geometry.getAttribute(name).array; return new Uint8Array(array.buffer, array.byteOffset, array.byteLength); };
      expect(digest(bytes("position"))).toBe("fbb2b53a007d661e656e802d6117e74362aa76387a9826658c6cb27870726682");
      expect(digest(bytes("normal"))).toBe("6b288522e8061771be865b68f8a7d44370b16b52afea2364263642fcbd6de88e");
      expect(digest(JSON.stringify(paint.placements))).toBe("8bb74ec0f72967435f082684f42b81c3684e0f791bf324d982e81f97447b831b");
    } finally { paint.dispose(); }
  });

  it("binds every source edge independently and retains only the admitted paired margins", () => {
    expect(fixture.edges).toHaveLength(27); expect(CORRIDOR_EDGES).toHaveLength(27);
    expect(new Set(fixture.edges.map(e => e.ordinal)).size).toBe(27);
    for (const e of CORRIDOR_EDGES) {
      const independent = fixture.edges.find(p => p.ordinal === e.sourceOrdinal)!;
      expect(independent).toBeDefined();
      const actual = source.pieces[independent.ordinal]!;
      expect(actual.source).toEqual(independent.source); expect(actual.ring).toEqual(independent.ring);
      expect(actual.source).toMatchObject({ roadId: CORRIDOR_SOURCE.parent, areaId: CORRIDOR_SOURCE.area, functionCode: 2000, lod: 3, polygonId: e.polygonId });
      const a = actual.ring[independent.edge]!, b = actual.ring[(independent.edge + 1) % actual.ring.length]!;
      for (const point of [e.start, e.end]) {
        const t = (point[2] - a[2]) / (b[2] - a[2]);
        expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThanOrEqual(1);
        point.forEach((v, i) => expect(v).toBeCloseTo(a[i]! + (b[i]! - a[i]!) * t, 8));
      }
    }
    const crossing = network.physical.crossings.find(c => c.id === fixture.crossing.id)!;
    expect(crossing).toBeDefined(); expect(crossing.markings).toBe("zebra");
    expect(CORRIDOR_CROSSING.points).toEqual(crossing.paths[0]!.map(p => [p.x, p.z]));
    expect(CORRIDOR_CROSSING.widthM).toBe(crossing.widthM);
    const paint = createCorridorPaint(inputs, satellite);
    try {
      expect(paint.placements.filter(p => p.status === "placed")).toHaveLength(26);
      expect(paint.placements.filter(p => p.status === "omitted").map(p => p.sourceOrdinal)).toEqual([53839]);
      const positions = body(paint).geometry.getAttribute("position");
      expect(positions.count).toBeGreaterThan(2000);
      for (const placement of paint.placements.filter(p => p.status === "placed")) {
        const e = fixture.edges.find(e => e.ordinal === placement.sourceOrdinal)!, a = e.ring[e.edge]!, b = e.ring[(e.edge + 1) % e.ring.length]!;
        const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz);
        const sign = e.side === "west" ? 1 : -1;
        const nx = sign * Math.abs(dz) / length, nz = sign * Math.abs(dx) / length;
        for (let i = placement.vertexStart; i < placement.vertexStart + placement.vertexCount; i++) {
          const x = positions.getX(i), z = positions.getZ(i), distance = (x - a[0]) * nx + (z - a[2]) * nz;
          expect(Math.min(Math.abs(distance - .175), Math.abs(distance - .325)), `source ordinal${e.ordinal} marker must retain authored inset and width`).toBeLessThan(1e-5);
          expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(40);
          expect(z).toBeGreaterThan(-87); expect(z).toBeLessThanOrEqual(-40);
          const expected = a[1] + (b[1] - a[1]) * ((z - a[2]) / dz) + .2;
          expect(Math.abs(positions.getY(i) - .06 - expected)).toBeLessThan(.02);
        }
      }
    } finally { paint.dispose(); }
  });

  it("retains the omitted whole edge and the literal source gap without filling either", () => {
    const before = CORRIDOR_EDGES.find(e => e.sourceOrdinal === fixture.gap.afterOrdinal)!, after = CORRIDOR_EDGES.find(e => e.sourceOrdinal === fixture.gap.beforeOrdinal)!;
    expect(Math.hypot(before.end[0] - after.start[0], before.end[2] - after.start[2])).toBeCloseTo(fixture.gap.distanceM, 12);
    const paint = createCorridorPaint(inputs, satellite);
    try { const omitted = paint.placements.find(p => p.sourceOrdinal === 53839)!; expect(omitted.status).toBe("omitted"); expect(omitted.vertexCount).toBe(0); expect(omitted.reason).toMatch(/Retained preparation omission/); expect(paint.placements).toHaveLength(27); }
    finally { paint.dispose(); }
  });

  it("refuses changed surface pins with the specific recovery requirement", () => {
    expect(() => createCorridorPaint({ ...inputs, inputDigests: { ...inputs.inputDigests, roads: "different" } }, satellite)).toThrow(/roads input.*restore the reviewed scene cache/);
    expect(() => createCorridorPaint({ ...inputs, inputDigests: { ...inputs.inputDigests, pavements: "different" } }, satellite)).toThrow(/pavements input.*restore the reviewed scene cache/);
  });

  it("requires actual carriageway footprint and rejects wrong layers even if a callback supplies a height", () => {
    for (const altered of [{ ...inputs, roads: empty() }, { ...inputs, paintHeightAt: (x: number, z: number, expected: number) => inputs.paintHeightAt(x, z, expected + 5) }, { ...inputs, paintHeightAt: (_x: number, _z: number, expected: number) => expected + 5 }]) {
      const paint = createCorridorPaint(altered, satellite);
      try { expect(paint.placements.every(p => p.status === "omitted" && p.vertexCount === 0)).toBe(true); expect(body(paint).geometry.getAttribute("position").count).toBe(0); }
      finally { paint.dispose(); }
    }
  });

  it("excludes paving that bare PaintSupport would admit", () => {
    const e = CORRIDOR_EDGES.find(e => e.sourceOrdinal === 53822)!, t = .5, x = (e.start[0] + e.end[0]) / 2 + e.roadward[0] * .25, z = (e.start[2] + e.end[2]) / 2 + e.roadward[1] * .25;
    const y = e.start[1] + (e.end[1] - e.start[1]) * t + .28;
    const paving = rectangle(x - .1, x + .1, z - .1, z + .1, y), support = createPaintSupport(inputs.roads, paving);
    expect(support(x, z, y - .08)).toBeDefined();
    const paint = createCorridorPaint({ ...inputs, pavements: paving, paintHeightAt: support }, satellite);
    try { expect(paint.placements.find(p => p.sourceOrdinal === 53822)!.status).toBe("omitted"); expect(paint.placements.find(p => p.sourceOrdinal === 53822)!.reason).toMatch(/paving footprint/); }
    finally { paint.dispose(); }
  });

  it("omits the complete source edge for an interior support hole its endpoints miss", () => {
    const baseline = createCorridorPaint(inputs, satellite);
    let centre: Triple, ordinal: number;
    try {
      const placement = baseline.placements.find(p => p.sourceOrdinal === 53822)!; ordinal = placement.sourceOrdinal;
      const position = body(baseline).geometry.getAttribute("position"), i = placement.vertexStart;
      centre = [0, 1, 2].map(channel => [0, 1, 2].reduce((sum, corner) => sum + (channel === 0 ? position.getX(i + corner) : channel === 1 ? position.getY(i + corner) - .06 : position.getZ(i + corner)) / 3, 0)) as Triple;
    } finally { baseline.dispose(); }
    const e = CORRIDOR_EDGES.find(e => e.sourceOrdinal === ordinal)!;
    const query = (x: number, z: number, expected: number): number | undefined => Math.hypot(x - centre[0], z - centre[2]) < .01 ? undefined : inputs.paintHeightAt(x, z, expected);
    for (const p of [e.start, e.end]) expect(query(p[0] + e.roadward[0] * .25, p[2] + e.roadward[1] * .25, p[1] + .2)).toBeDefined();
    const paint = createCorridorPaint({ ...inputs, paintHeightAt: query }, satellite);
    try { const placement = paint.placements.find(p => p.sourceOrdinal === ordinal)!; expect(placement.status).toBe("omitted"); expect(placement.vertexCount).toBe(0); expect(placement.reason).toMatch(/edge\/interior/); }
    finally { paint.dispose(); }
  });

  it("rejects positive-area existing paint between sample points", () => {
    const e = CORRIDOR_EDGES.find(e => e.sourceOrdinal === 53822)!, x = (e.start[0] + e.end[0]) / 2 + e.roadward[0] * .25, z = (e.start[2] + e.end[2]) / 2 + e.roadward[1] * .25;
    const marker = rectangle(x - .004, x + .004, z - .004, z + .004, (e.start[1] + e.end[1]) / 2 + .235);
    const paint = createCorridorPaint({ ...inputs, markings: marker }, satellite);
    try { const placement = paint.placements.find(p => p.sourceOrdinal === 53822)!; expect(placement.status).toBe("omitted"); expect(placement.vertexCount).toBe(0); expect(placement.reason).toMatch(/published paint footprint/); }
    finally { paint.dispose(); }
  });

  it("reuses style resources and disposes only its one owned geometry/material once", () => {
    const paint = createCorridorPaint(inputs, satellite), mesh = body(paint), parent = new Group(); parent.add(paint.root);
    const geometry = mesh.geometry, material = mesh.material, releaseGeometry = vi.fn(), releaseMaterial = vi.fn();
    geometry.addEventListener("dispose", releaseGeometry); material.addEventListener("dispose", releaseMaterial);
    const original = material.color.toArray();
    paint.setStyle(cartographic); paint.setStyle(satellite);
    expect(body(paint).geometry).toBe(geometry); expect(body(paint).material).toBe(material); expect(material.color.toArray()).toEqual(original);
    expect(mesh.castShadow).toBe(false); expect(mesh.receiveShadow).toBe(true); expect(material.transparent).toBe(false); expect(material.map).toBeNull();
    paint.dispose(); paint.dispose(); paint.setStyle(cartographic);
    expect(parent.children).toHaveLength(0); expect(paint.root.children).toHaveLength(0); expect(releaseGeometry).toHaveBeenCalledTimes(1); expect(releaseMaterial).toHaveBeenCalledTimes(1);
  });
});
