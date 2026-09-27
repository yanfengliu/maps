/** CPU bound: mapped roots/sizes and style changes keep the same transforms;
 * authored crowns are deterministic, finite, disposed and no more expensive in
 * instantiated triangles than the ab0bde6 crown. Native captures judge appearance.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BufferGeometry, Color, InstancedMesh, Material, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { vegetationFromData } from "../src/scene/vegetation.js";
import type { DecorationData } from "../src/world/decorations.js";
import { worldStyle } from "../src/world/styles.js";

const source: DecorationData = {
  version: 1,
  provenance: { osmTimestamp: "fixture", osmSha256: "fixture", terrainSha256: "fixture", method: "fixture" },
  trees: Array.from({ length: 72 }, (_, index) => ({ sourceId: index + 1, position: { x: index * 3, y: index % 5, z: index * -2 }, heightM: 4 + index % 7, crownRadiusM: 1.3 + index % 4 * 0.3, inferredSize: index % 2 === 0, rowPlacement: index % 3 === 0 })),
  greens: [{ sourceId: 100, kind: "grass", points: [], triangles: [{ x: 0, y: 2, z: 0 }, { x: 1, y: 2, z: 0 }, { x: 0, y: 2, z: 1 }] }],
  barriers: [], skipped: [],
};
const satellite = worldStyle("satellite");
const cartographic = worldStyle("cartographic");
function meshes(root: Mesh["parent"], prefix: string): InstancedMesh[] {
  const result: InstancedMesh[] = [];
  root!.traverse((object) => { if (object instanceof InstancedMesh && object.name.startsWith(prefix)) result.push(object); });
  return result;
}
function matrices(mesh: InstancedMesh): number[][] {
  return Array.from({ length: mesh.count }, (_, slot) => { const matrix = new Matrix4(); mesh.getMatrixAt(slot, matrix); return matrix.toArray(); });
}
function geometryHash(geometry: BufferGeometry): string {
  const hash = createHash("sha256");
  for (const name of Object.keys(geometry.attributes).sort()) {
    const attribute = geometry.getAttribute(name);
    hash.update(name); hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
  }
  if (geometry.index) hash.update(Buffer.from(geometry.index.array.buffer));
  return hash.digest("hex");
}
function treeState(root: Mesh["parent"]): Record<string, unknown> {
  return Object.fromEntries(meshes(root, "vegetation:").flatMap((mesh) => matrices(mesh).map((matrix) => [`${mesh.name}:${matrix[12]}`, { matrix, geometry: geometryHash(mesh.geometry) }])));
}

describe("authored mapped tree crowns", () => {
  it("keeps every mapped tree rooted and scaled once, with matching branch and leaf transforms", () => {
    const data = structuredClone(source); const original = structuredClone(data);
    const vegetation = vegetationFromData(data, satellite);
    try {
      expect(data).toEqual(original);
      expect(vegetation.counts).toEqual({ trees: 72, greenAreas: 1 });
      expect(vegetation.root.name).toBe("vegetation:osm");
      const crowns = meshes(vegetation.root, "vegetation:canopies:");
      const branches = meshes(vegetation.root, "vegetation:branches:");
      expect(crowns).toHaveLength(3); expect(branches).toHaveLength(3);
      expect(crowns.reduce((sum, mesh) => sum + mesh.count, 0)).toBe(72);
      const seen = new Set<number>();
      for (const crown of crowns) {
        expect(crown.parent).toBe(vegetation.root);
        const bough = branches.find((mesh) => mesh.name.split(":").at(-1) === crown.name.split(":").at(-1))!;
        expect(matrices(bough)).toEqual(matrices(crown));
        for (const values of matrices(crown)) {
          const position = new Vector3(); const scale = new Vector3();
          new Matrix4().fromArray(values).decompose(position, new Quaternion(), scale);
          const tree = data.trees.find((record) => record.position.x === position.x)!;
          expect(tree).toBeDefined(); expect(seen.has(tree.sourceId)).toBe(false); seen.add(tree.sourceId);
          expect(position.y).toBeCloseTo(tree.position.y + tree.heightM * 0.70, 5);
          expect(position.z).toBe(tree.position.z);
          expect(scale.x).toBeCloseTo(tree.crownRadiusM, 5); expect(scale.z).toBeCloseTo(tree.crownRadiusM, 5);
          expect(scale.y).toBeCloseTo(tree.heightM * 0.30, 5);
        }
      }
      const trunk = meshes(vegetation.root, "vegetation:trunks")[0]!;
      matrices(trunk).forEach((values, index) => {
        const tree = data.trees[index]!; const matrix = new Matrix4().fromArray(values);
        const foot = new Vector3(0, -0.5, 0).applyMatrix4(matrix);
        const top = new Vector3(0, 0.5, 0).applyMatrix4(matrix);
        expect(foot.x).toBe(tree.position.x); expect(foot.y).toBeCloseTo(tree.position.y, 5); expect(foot.z).toBe(tree.position.z);
        expect(top.y).toBeCloseTo(tree.position.y + tree.heightM * 0.63, 5);
      });
      const grass = vegetation.root.getObjectByName("vegetation:ground-cover") as Mesh;
      expect(Array.from(grass.geometry.getAttribute("position").array)).toEqual([0, Math.fround(2.018), 0, 1, Math.fround(2.018), 0, 0, Math.fround(2.018), 1]);
    } finally { vegetation.dispose(); }
  });

  it("keeps seeded shape assignment through record reordering and style switches", () => {
    const first = vegetationFromData(source, satellite);
    const second = vegetationFromData({ ...source, trees: [...source.trees].reverse() }, satellite);
    try {
      const before = treeState(first.root);
      expect(treeState(second.root)).toEqual(before);
      const crowns = meshes(first.root, "vegetation:canopies:");
      const colours = crowns.map((mesh) => Array.from(mesh.instanceColor!.array));
      first.setStyle(cartographic);
      expect(treeState(first.root)).toEqual(before);
      expect(crowns.map((mesh) => Array.from(mesh.instanceColor!.array))).not.toEqual(colours);
      first.setStyle(satellite);
      expect(crowns.map((mesh) => Array.from(mesh.instanceColor!.array))).toEqual(colours);
      const colour = new Color(); crowns[0]!.getColorAt(0, colour);
      expect([colour.r, colour.g, colour.b].every(Number.isFinite)).toBe(true);
    } finally { first.dispose(); second.dispose(); }
  });

  it("varies crowns within every actual mapped row without depending on record order", () => {
    const expectedSha256 = "f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918";
    let bytes: Buffer;
    try { bytes = readFileSync(new URL("../data/scene/decorations.json", import.meta.url)); }
    catch (cause) { throw new Error(`Tree row regression requires the reviewed cached data/scene/decorations.json (SHA-256 ${expectedSha256}); restore that scene cache before this test. It never downloads source data.`, { cause }); }
    expect(createHash("sha256").update(bytes).digest("hex"), "Tree row regression requires the reviewed decorations bytes; changed source needs review before changing this pin.").toBe(expectedSha256);
    const mapped = JSON.parse(bytes.toString("utf8")) as DecorationData;
    const rows = new Map<number, DecorationData["trees"]>();
    for (const tree of mapped.trees.filter((record) => record.rowPlacement)) {
      const members = rows.get(tree.sourceId) ?? []; members.push(tree); rows.set(tree.sourceId, members);
    }
    expect([...rows].map(([id, members]) => [id, members.length])).toEqual([[1154063726, 17], [1154063727, 17], [1450416330, 5], [1513091301, 5]]);
    const locationKey = (x: number, z: number): string => `${Math.fround(x)}:${Math.fround(z)}`;
    const crownState = (root: Mesh["parent"]): Map<string, { geometry: string; matrix: number[]; colour: number[] }> => {
      const result = new Map<string, { geometry: string; matrix: number[]; colour: number[] }>();
      for (const crown of meshes(root, "vegetation:canopies:")) {
        const geometry = geometryHash(crown.geometry);
        matrices(crown).forEach((matrix, slot) => {
          const key = locationKey(matrix[12]!, matrix[14]!);
          expect(result.has(key), `Duplicate crown at mapped root ${key}`).toBe(false);
          result.set(key, { geometry, matrix, colour: Array.from(crown.instanceColor!.array.slice(slot * 3, slot * 3 + 3)) });
        });
      }
      return result;
    };
    const first = vegetationFromData(mapped, satellite);
    const reordered = vegetationFromData({ ...mapped, trees: [...mapped.trees].reverse() }, satellite);
    try {
      const before = crownState(first.root); const after = crownState(reordered.root);
      expect(before.size).toBe(72); expect(after).toEqual(before);
      for (const [sourceId, members] of rows) {
        // Compare the geometry actually instanced at every pinned root. No
        // selector helper or expected seed is used to manufacture the result.
        const shapes = new Set(members.map((tree) => before.get(locationKey(tree.position.x, tree.position.z))!.geometry));
        expect(shapes.size, `Mapped row ${sourceId} must contain more than one crown form`).toBeGreaterThan(1);
      }
    } finally { first.dispose(); reordered.dispose(); }
  });
  it("keeps three distinct finite crowns within the old envelope and triangle budget", () => {
    const vegetation = vegetationFromData(source, satellite);
    try {
      const treeMeshes = meshes(vegetation.root, "vegetation:");
      const triangles = treeMeshes.reduce((sum, mesh) => sum + mesh.count * (mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count) / 3, 0);
      // Measured from the previous 46 x 48 six-triangle leaves, 93 capped
      // five-sided cylinders and seven-sided trunk: 15,136 triangles per tree.
      expect(triangles).toBeLessThanOrEqual(1_089_792);
      const crowns = meshes(vegetation.root, "vegetation:canopies:");
      expect(new Set(crowns.map((mesh) => geometryHash(mesh.geometry))).size).toBe(3);
      for (const mesh of treeMeshes) {
        const positions = mesh.geometry.getAttribute("position");
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(mesh.geometry.getAttribute("normal").array).every(Number.isFinite)).toBe(true);
        expect(mesh.boundingSphere!.radius).toBeGreaterThan(0);
        if (!mesh.name.startsWith("vegetation:canopies:")) continue;
        for (let index = 0; index < positions.count; index++) {
          expect(positions.getY(index)).toBeGreaterThanOrEqual(-0.97399);
          expect(positions.getY(index)).toBeLessThanOrEqual(1.100135);
          expect(Math.hypot(positions.getX(index), positions.getZ(index))).toBeLessThanOrEqual(1.244998);
        }
        // Each four-triangle leaf has two narrow side tips. This bounds the
        // plate width responsible for the coarse near-camera appearance.
        for (let index = 0; index < positions.count; index += 12) {
          const sideA = new Vector3().fromBufferAttribute(positions, index + 2);
          const sideB = new Vector3().fromBufferAttribute(positions, index + 8);
          expect(sideA.distanceTo(sideB)).toBeLessThanOrEqual(0.072);
        }
      }
    } finally { vegetation.dispose(); }
  });

  it("does not add empty tree pools and releases every owned geometry and material", () => {
    for (const trees of [[], source.trees.slice(0, 1), source.trees]) {
      const vegetation = vegetationFromData({ ...source, trees }, satellite);
      const geometries = new Map<BufferGeometry, number>(); const materials = new Map<Material, number>();
      const instances = new Map<InstancedMesh, number>();
      for (const mesh of meshes(vegetation.root, "vegetation:")) {
        instances.set(mesh, 0); mesh.addEventListener("dispose", () => instances.set(mesh, instances.get(mesh)! + 1));
      }
      vegetation.root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        if (!geometries.has(object.geometry)) {
          geometries.set(object.geometry, 0); object.geometry.addEventListener("dispose", () => geometries.set(object.geometry, geometries.get(object.geometry)! + 1));
        }
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (!materials.has(material)) {
          materials.set(material, 0); material.addEventListener("dispose", () => materials.set(material, materials.get(material)! + 1));
        }
      });
      for (const mesh of meshes(vegetation.root, "vegetation:")) expect(mesh.count).toBeGreaterThan(0);
      expect(meshes(vegetation.root, "vegetation:canopies:").reduce((sum, mesh) => sum + mesh.count, 0)).toBe(trees.length);
      vegetation.dispose();
      expect(vegetation.root.children).toHaveLength(0);
      expect([...geometries.values()].every((count) => count === 1)).toBe(true);
      expect([...materials.values()].every((count) => count === 1)).toBe(true);
      expect([...instances.values()].every((count) => count === 1)).toBe(true);
    }
  });
});
