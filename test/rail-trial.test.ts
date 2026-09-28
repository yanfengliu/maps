/** Bound: CPU loading of the pinned trial and three real final leaves, with the
 * real glTF parser/Draco data. Image pixels/GPU drawing are not exercised here. */
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { BufferAttribute, BufferGeometry, Group, LoadingManager, Mesh, Texture, Vector3, Matrix3, Matrix4, type Material } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { B3DMLoader } from "3d-tiles-renderer";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parseB3dm, parseGlb } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { loadRailTrial, railSourcePlugin, replaceRailBuildings, createRailTrialScene, railSectionGroups, verifyRailBytes, type RailTrialData } from "../src/scene/rail-trial.js";
import { CITY_CLIP_PLANES, SECTION_CLIP_PLANES, clipCityRoot } from "../src/scene/aoi-cutout.js";
import { worldStyle } from "../src/world/styles.js";
import { validateRailTrial } from "../src/world/rail-trial.js";
import { railTrialServer } from "../tools/vite/serve-rail-trial.js";

const overlay = path.resolve("data/rail");
const diagnostic = fs.mkdtempSync(path.join(tmpdir(), "maps-rail-parser-"));
afterAll(() => fs.rmSync(diagnostic, { recursive: true, force: true }));
const manifestFile = path.join(overlay, "manifest.json");
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
let data: RailTrialData;
const roots: Group[] = [];
function cleanup(root: Group): void {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
  root.traverse(o => { if (o instanceof Mesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const v of Object.values(m)) if (v instanceof Texture) textures.add(v); } } });
  for (const g of geometries) g.dispose(); for (const t of textures) t.dispose(); for (const m of materials) m.dispose(); root.clear();
}
async function leaf(uri: string): Promise<Group> {
  const bytes = fs.readFileSync(`data/scene/buildings/${uri}`);
  const pin = data.manifest.tiles.find(t => t.uri === uri)!;
  await verifyRailBytes(pin, Uint8Array.from(bytes).buffer);
  const tile = parseB3dm(bytes), glb = parseGlb(tile.glb);
  const geometries = new Map<string, BufferGeometry>();
  for (const mesh of glb.json.meshes!) for (const primitive of mesh.primitives) {
    const d = await decodePrimitive(glb.json, glb.binary!, primitive, true), g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(d.positions, 3)); g.setAttribute("normal", new BufferAttribute(d.surface!.normals, 3)); g.setAttribute("_batchid", new BufferAttribute(d.batchIds!, 1));
    if (d.surface!.uv) g.setAttribute("uv", new BufferAttribute(d.surface!.uv, 2));
    g.setIndex(new BufferAttribute(d.surface!.indices, 1));
    const view = glb.json.bufferViews![primitive.extensions!.KHR_draco_mesh_compression!.bufferView]!;
    geometries.set(sha(glb.binary!.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)), g);
  }
  const manager = new LoadingManager(), loader = new GLTFLoader(manager);
  loader.setDRACOLoader({ preload() {}, decodeDracoFile(buffer: ArrayBuffer, resolve: (g: BufferGeometry) => void) { const g = geometries.get(sha(new Uint8Array(buffer))); if (!g) throw Error("CPU loader received an unbound Draco payload."); resolve(g); } } as unknown as DRACOLoader);
  // Only image decoding is replaced. The real parser still creates materials,
  // preserves their assignments/UV transforms and composes every source node.
  loader.register(parser => { parser.loadTextureImage = async (index: number) => { const t = new Texture(); t.flipY = false; t.userData.sourceImage = index; return t; }; return { name: "CPU_IMAGE_ONLY" }; });
  loader.register(railSourcePlugin); manager.addHandler(/\.gltf$/, loader);
  const result = await new B3DMLoader(manager).parse(Uint8Array.from(bytes).buffer);
  roots.push(result.scene); return result.scene;
}
beforeAll(async () => {
  const bytes = fs.readFileSync(manifestFile);
  vi.stubGlobal("fetch", async (url: string) => new Response(Uint8Array.from(fs.readFileSync(path.join(overlay, url.split("/").at(-1)!)))));
  try { data = (await loadRailTrial({ url: "/rail-trial/manifest.json", sha256: sha(bytes) }))!; }
  finally { vi.unstubAllGlobals(); }
});
afterEach(() => { roots.splice(0).forEach(cleanup); vi.unstubAllGlobals(); });
describe("admitted rail trial", () => {
  it("records the actual parser affine loss independently before source admission", async () => {
    const records: unknown[] = [], matrices: unknown[] = [], adjacent: unknown[] = [];
    for (const pin of data.manifest.tiles) {
      const root = await leaf(pin.uri); root.updateMatrixWorld(true);
      const meshes = new Map<string, Mesh>(); root.traverse(o => { if (o instanceof Mesh) meshes.set(`${o.userData.railSource.node}/${o.userData.railSource.primitive}`, o); });
      const targetIds = new Set(data.replacements.map(r => r.id));
      const table = (root as unknown as { batchTable: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
      const points = new Map<string, { id: string; raw: number[]; actual: number[] }[]>();
      for (const [key, mesh] of meshes) {
        const binding = mesh.userData.railSource;
        expect(mesh.matrixWorld.toArray()).toEqual(binding.parserWorld);
        matrices.push({ uri: pin.uri, key, raw: binding.rawWorld, expectedParser: binding.parserWorld, actualParser: mesh.matrixWorld.toArray() });
        const raw = new Matrix4().fromArray(binding.rawWorld), p = mesh.geometry.getAttribute("position"), b = mesh.geometry.getAttribute("_batchid");
        for (let i = 0; i < p.count; i++) {
          const world = new Vector3().fromBufferAttribute(p, i).applyMatrix4(raw).toArray(), key = world.map(Math.fround).join(","), id = String(table.getDataFromId(b.getX(i)).gml_id);
          const list = points.get(key) ?? []; if (!list.some(r => r.id === id)) list.push({ id, raw: world, actual: new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).toArray() }); points.set(key, list);
        }
      }
      for (const [key, rows] of points) if (rows.some(r => targetIds.has(r.id)) && rows.some(r => !targetIds.has(r.id))) adjacent.push({ uri: pin.uri, key, rows });
      for (const r of data.replacements.filter(r => r.sourceIdentity[0]!.uri === pin.uri)) {
        let maximumM = 0, maximumNormal = 0; let witness: unknown = null; const distances: number[] = [];
        for (const s of r.sourceIdentity) {
          const mesh = meshes.get(`${s.node}/${s.primitive}`)!, nm = new Matrix3().getNormalMatrix(mesh.matrixWorld);
          for (let j = 0; j < 3; j++) {
            const i = mesh.geometry.index!.getX(s.face * 3 + j), p = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), i).applyMatrix4(mesh.matrixWorld), n = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("normal"), i).applyNormalMatrix(nm);
            const distance = p.distanceTo(new Vector3().fromArray(s.p[j]!)); distances.push(distance); maximumNormal = Math.max(maximumNormal, n.distanceTo(new Vector3().fromArray(s.n[j]!)));
            if (distance > maximumM) { maximumM = distance; witness = { source: s.index, face: s.face, vertex: j, actual: p.toArray(), sourceWorld: s.p[j] }; }
          }
        }
        distances.sort((a, b) => a - b);
        records.push({ id: r.id, uri: pin.uri, sourceFaces: r.sourceIdentity.length, maximumM, medianM: distances[Math.floor(distances.length / 2)], p95M: distances[Math.floor(distances.length * .95)], maximumNormal, witness });
      }
    }
    fs.writeFileSync(path.join(diagnostic, "parser-transform-diagnostic-full.json"), JSON.stringify({ bound: "CPU real GLTFLoader decomposition versus frozen raw affine source. Adjacency is exact stored-point identity within each affected tile only, not a general inter-building seam proof.", records, matrices, adjacent }, null, 2));
    expect(records).toHaveLength(10);
  });
  it("loads all twenty exact meshes and all ten source replacements, rejecting missing or altered bytes", async () => {
    expect(data.layers).toHaveLength(20); expect(data.replacements).toHaveLength(10);
    const pin = data.manifest.layers[0]!, bytes = Uint8Array.from(fs.readFileSync(path.join(overlay, pin.file)));
    bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
    await expect(verifyRailBytes(pin, bytes.buffer)).rejects.toThrow(/different bytes/);
    const bad = structuredClone(data.manifest); bad.replacements.pop(); expect(() => validateRailTrial(bad)).toThrow(/ten replacements/);
    const escaped = structuredClone(data.manifest); escaped.layers[0]!.file = "../run-12/rails.mesh"; expect(() => validateRailTrial(escaped)).toThrow(/invalid pin/);
    vi.stubGlobal("fetch", async () => new Response("missing", { status: 404 }));
    await expect(loadRailTrial({ url: "/rail-trial/manifest.json", sha256: "0".repeat(64) })).rejects.toThrow(/HTTP 404/);
  });
  it("replaces only exact final-leaf batches, preserving outside indices, attributes, matrices, material and atlas identity", async () => {
    const all: string[] = []; let triangles = 0;
    for (const pin of data.manifest.tiles) {
      const root = await leaf(pin.uri), source = new Map<Mesh, { attributes: BufferGeometry["attributes"]; indices: number[]; material: Mesh["material"]; matrix: number[] }>();
      root.updateMatrixWorld(true);
      root.traverse(o => { if (o instanceof Mesh) source.set(o, { attributes: { ...o.geometry.attributes }, indices: Array.from(o.geometry.index!.array), material: o.material, matrix: o.matrixWorld.toArray() }); });
      const replacement = replaceRailBuildings(root, pin.uri, true, data); all.push(...replacement.ids); triangles += replacement.sourceTriangles + replacement.returnTriangles;
      expect(root.children.every(o => !replacement.returns.includes(o as Mesh))).toBe(true);
      for (const [mesh, before] of source) {
        expect(mesh.geometry.attributes).toEqual(before.attributes); expect(mesh.material).toBe(before.material); expect(mesh.matrixWorld.toArray()).toEqual(before.matrix);
        const binding = mesh.userData.railSource as { node: number; primitive: number };
        const removed = new Set(data.replacements.flatMap(r => r.sourceIdentity.filter(s => s.uri === pin.uri && s.node === binding.node && s.primitive === binding.primitive).map(s => s.face)));
        expect(Array.from(mesh.geometry.index!.array)).toEqual(before.indices.filter((_, i) => !removed.has(Math.floor(i / 3))));
      }
      root.traverse(o => {
        if (!(o instanceof Mesh) || !o.userData.railReplacement) return;
        const binding = o.userData.railReplacement;
        const original = [...source.keys()].find(m => { const s = m.userData.railSource; return `${s.node}/${s.primitive}` === `${binding.sourceFaces[0].node}/${binding.sourceFaces[0].primitive}`; })!;
        expect(o.material).toBe(original.material);
        const replacementData = data.replacements.find(r => r.id === binding.id)!;
        const sourceIndices = o.geometry.userData.railSourceIndices as number[];
        const selected = replacementData.triangles.filter(t => t.source >= 0 && sourceIndices.includes(t.source) && t.sourceIdentity!.node === binding.sourceFaces[0].node && t.sourceIdentity!.primitive === binding.sourceFaces[0].primitive);
        expect(Array.from(o.geometry.getAttribute("position").array)).toEqual(selected.flatMap(t => t.positions));
        expect(Array.from(o.geometry.getAttribute("normal").array)).toEqual(selected.flatMap(t => t.normals));
        if (o.geometry.hasAttribute("uv")) expect(Array.from(o.geometry.getAttribute("uv").array)).toEqual(selected.flatMap(t => t.uv!));
      });
      root.add(...replacement.returns); clipCityRoot(root);
      for (const mesh of replacement.returns) { expect((mesh.material as Material).clippingPlanes).toBe(CITY_CLIP_PLANES); expect((mesh.material as Material).clipShadows).toBe(true); expect(mesh.geometry.hasAttribute("mapsEmitterGroup")).toBe(false); }
      expect(() => replaceRailBuildings(root, pin.uri, true, data)).toThrow(/twice/);
    }
    expect(all.sort()).toEqual(data.manifest.replacements.map(r => r.id).sort()); expect(triangles).toBe(18534);
  });
  it.each(["lod", "transform", "raw-matrix", "parser-matrix", "material", "batch", "uv", "missing-face"])("refuses %s before changing source buffers", async mode => {
    const pin = data.manifest.tiles[0]!, root = await leaf(pin.uri), target = data.replacements.find(r => r.sourceIdentity[0]!.uri === pin.uri)!;
    let mesh: Mesh | undefined; const s = target.sourceIdentity.find(s => mode !== "uv" || s.uv)!;
    root.traverse(o => { if (o instanceof Mesh && o.userData.railSource.node === s.node && o.userData.railSource.primitive === s.primitive) mesh = o; });
    if (mode === "transform") root.position.x += .01;
    if (mode === "raw-matrix") mesh!.userData.railSource.rawWorld[12] += .01;
    if (mode === "parser-matrix") mesh!.position.x += .01;
    if (mode === "material") mesh!.userData.railSource.material += 1;
    if (mode === "batch") mesh!.geometry.getAttribute("_batchid").setX(mesh!.geometry.index!.getX(s.face * 3), 999);
    if (mode === "uv") { const uv = mesh!.geometry.getAttribute("uv"), i = mesh!.geometry.index!.getX(s.face * 3); uv.setX(i, uv.getX(i) + .1); }
    const trial = mode === "missing-face" ? { ...data, replacements: data.replacements.map(r => r === target ? { ...r, sourceIdentity: r.sourceIdentity.slice(1) } : r) } : data;
    const original = mesh!.geometry.index;
    expect(() => replaceRailBuildings(root, pin.uri, mode !== "lod", trial)).toThrow(/Rail source/);
    expect(mesh!.geometry.index).toBe(original); expect(root.userData.railTrialApplied).toBeUndefined();
  });
  it("partitions actual stored AOI caps without moving vertices and disposes every owned resource once across style changes", () => {
    const scene = createRailTrialScene(data, worldStyle("satellite"));
    const geometryCalls: number[] = [], materialCalls: number[] = [];
    let count = 0, sections = 0;
    scene.root.traverse(o => { if (!(o instanceof Mesh)) return; const i = count++; geometryCalls[i] = 0; materialCalls[i] = 0; o.geometry.addEventListener("dispose", () => geometryCalls[i]!++); (o.material as Material).addEventListener("dispose", () => materialCalls[i]!++); const side = o.userData.cutoutSectionSide; if (side !== undefined) sections++; expect((o.material as Material).clippingPlanes).toBe(side === undefined ? CITY_CLIP_PLANES : SECTION_CLIP_PLANES[side]); expect((o.material as Material).clipShadows).toBe(true); });
    for (const { mesh } of data.layers) expect([...railSectionGroups(mesh).values()].reduce((n, a) => n + a.length, 0)).toBe(mesh.indices.length);
    expect(sections).toBeGreaterThan(0); scene.setStyle(worldStyle("cartographic")); scene.setStyle(worldStyle("satellite")); scene.dispose(); scene.dispose();
    expect(geometryCalls.every(n => n === 1)).toBe(true); expect(materialCalls.every(n => n === 1)).toBe(true); expect(scene.root.children).toHaveLength(0);
  });
  it("whitelists only manifest assets and serves the same verified buffers", () => {
    const server = railTrialServer(manifestFile); let middleware: Function | undefined;
    (server.plugin.configurePreviewServer as Function)({ middlewares: { use(fn: Function) { middleware = fn; } } });
    const request = (url: string): { statusCode: number; body?: unknown; next: boolean } => {
      const result = { statusCode: 200, body: undefined as unknown, next: false };
      middleware!({ url }, { set statusCode(n: number) { result.statusCode = n; }, setHeader() {}, end(b: unknown) { result.body = b; } }, () => { result.next = true; }); return result;
    };
    expect(request("/rail-trial/manifest.json").body).toEqual(fs.readFileSync(manifestFile));
    for (const url of ["/rail-trial/../run-12/source-faces.json", "/rail-trial/%2e%2e/source-faces.json", "/rail-trial/source-faces.json"]) expect(request(url).statusCode).toBe(404);
    expect(request("/scene/terrain.mesh").next).toBe(true);
  });
});
