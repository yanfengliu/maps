/** CPU material/geometry/lifetime bound. No image or GPU performance claim. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { BoxGeometry, BufferGeometry, Color, DataTexture, Material, Mesh, MeshStandardMaterial, Texture } from "three";
import { describe, expect, it } from "vitest";
import { applyRailFinishStyle, createRailFinishSet, type RailFinishKind } from "../src/scene/rail-finish.js";
import { createRailTrialScene, type RailTrialData } from "../src/scene/rail-trial.js";
import { decodeMesh } from "../src/world/mesh.js";
import { worldStyle } from "../src/world/styles.js";

const hash = (array: ArrayBufferView): string => createHash("sha256").update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).digest("hex");
function geometryBytes(g: BufferGeometry): string[] { return ["position", "normal"].map(name => hash(g.getAttribute(name).array)).concat(g.index ? hash(g.index.array) : []); }
const colorBase = 0x858585;
describe("rail authored finish", () => {
  it("preserves geometry and the standard shader while applying metre-scaled detail", () => {
    const g = new BoxGeometry(4, 2, 1), before = geometryBytes(g), material = new MeshStandardMaterial(), set = createRailFinishSet();
    try {
      set.dress("supports", g, material); material.color.setHex(colorBase); applyRailFinishStyle(material, true);
      expect(geometryBytes(g)).toEqual(before);
      expect(material.onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
      expect(material.displacementMap).toBeNull(); expect(material.transparent).toBe(false);
      const uv = g.getAttribute("uv"), position = g.getAttribute("position"), normal = g.getAttribute("normal");
      for (let i = 0; i < position.count; i++) if (normal.getZ(i) === 1) {
        expect(uv.getX(i)).toBeCloseTo(-position.getX(i) / 4, 7);
        expect(uv.getY(i)).toBeCloseTo(position.getY(i) / 2, 7);
      }
      expect(material.map).toBe(material.bumpMap); expect(material.bumpScale).toBeGreaterThan(0);
    } finally { g.dispose(); material.dispose(); for (const t of set.textures) t.dispose(); }
  });

  it("reuses deterministic maps through repeated real style settings and retains palette mean", () => {
    const sets = [createRailFinishSet(), createRailFinishSet()], geometries: BufferGeometry[] = [], materials: MeshStandardMaterial[] = [];
    try {
      for (const set of sets) for (const kind of ["rails", "sleepers", "supports", "ballast", "shaft", "truss"] as RailFinishKind[]) {
        const g = new BoxGeometry(), m = new MeshStandardMaterial(); geometries.push(g); materials.push(m); set.dress(kind, g, m);
        m.color.setHex(colorBase); applyRailFinishStyle(m, true);
      }
      expect(sets.map(s => s.textures.size)).toEqual([4, 4]);
      const first = [...sets[0]!.textures].map(t => hash(t.image.data)), second = [...sets[1]!.textures].map(t => hash(t.image.data));
      expect(first).toEqual(second); expect(new Set(first).size).toBe(4);
      const heldMaps = materials.map(m => m.map), before = geometries.map(geometryBytes);
      for (let cycle = 0; cycle < 4; cycle++) for (const satellite of [false, true]) for (const m of materials) {
        m.color.setHex(colorBase); expect(applyRailFinishStyle(m, satellite)).toBe(true);
        const bytes = (m.map as DataTexture).image.data as Uint8Array;
        let sum = 0; for (let i = 0; i < bytes.length; i += 4) sum += bytes[i]! / 255;
        expect(m.color.r * sum / (bytes.length / 4)).toBeCloseTo(new Color(colorBase).r, 10);
      }
      expect(materials.map(m => m.map)).toEqual(heldMaps); expect(geometries.map(geometryBytes)).toEqual(before);
      expect([...sets[0]!.textures].map(t => hash(t.image.data))).toEqual(first);
    } finally { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); sets.forEach(s => s.textures.forEach(t => t.dispose())); }
  });

  it("keeps actual overlay buffers exact and releases the complete scene texture set once", () => {
    const overlay = path.resolve("data/rail"), manifest = JSON.parse(fs.readFileSync(path.join(overlay, "manifest.json"), "utf8"));
    const data: RailTrialData = { manifest, digest: "fixture", replacements: [], finishes: JSON.parse(fs.readFileSync(path.join(overlay, manifest.materials.file), "utf8")), layers: manifest.layers.map((pin: any) => ({ pin, mesh: decodeMesh(fs.readFileSync(path.join(overlay, pin.file))) })) };
    const original = data.layers.map(({ mesh }) => [hash(mesh.positions), hash(mesh.normals), hash(mesh.indices)]);
    const scene = createRailTrialScene(data, worldStyle("satellite")), textures = new Set<Texture>(), geometryBefore = new Map<Mesh, string[]>();
    scene.root.traverse(o => { if (o instanceof Mesh) { geometryBefore.set(o, geometryBytes(o.geometry)); const m = o.material as MeshStandardMaterial; if (m.map) textures.add(m.map); } });
    const disposed = new Map([...textures].map(t => [t, 0])); for (const t of textures) t.addEventListener("dispose", () => disposed.set(t, disposed.get(t)! + 1));
    try {
      expect(textures.size).toBe(4);
      const bytes = [...textures].reduce((n, t) => n + Math.ceil(t.image.width * t.image.height * 4 * 4 / 3), 0);
      const threePortalTileMaps = 3 * Math.ceil(128 * 128 * 4 * 4 / 3);
      expect(manifest.tiles).toHaveLength(3);
      expect(bytes + threePortalTileMaps).toBeLessThan(3 * 1024 * 1024);
      for (let i = 0; i < 3; i++) { scene.setStyle(worldStyle("cartographic")); scene.setStyle(worldStyle("satellite")); }
      for (const [mesh, before] of geometryBefore) expect(geometryBytes(mesh.geometry)).toEqual(before);
      expect(data.layers.map(({ mesh }) => [hash(mesh.positions), hash(mesh.normals), hash(mesh.indices)])).toEqual(original);
    } finally { scene.dispose(); scene.dispose(); }
    expect([...disposed.values()]).toEqual([1, 1, 1, 1]);
  });
});
