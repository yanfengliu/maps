/** Bound: pinned source bytes, shipped Draco decoder, installed B3DM/GLTF and
 * rail adaptation, actual combined facade plugin and retained-model GPU unload.
 * Image decoding is synthetic. No native pixels, continuous stability or FPS. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { B3DMLoader, TilesRenderer } from "3d-tiles-renderer";
import { UnloadTilesPlugin } from "3d-tiles-renderer/plugins";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BufferAttribute, BufferGeometry, LoadingManager, Material, Mesh, Object3D, Raycaster, ShaderLib, Texture, Triangle, Vector2, Vector3 } from "three";
import type { Tile } from "3d-tiles-renderer/core";
import { parseB3dm, parseGlb } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { getRailFacadeNormalMaterial, prepareRailFacades } from "../src/scene/rail-facades.js";
import * as upper from "../src/scene/upper-windows.js";
import { loadRailTrial, railSourcePlugin, replaceRailBuildings } from "../src/scene/rail-trial.js";
import { RAIL_MANIFEST_SHA256 } from "../src/world/rail-trial.js";
import { applyFacadeStyle, createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";

const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const hash = (a: BufferAttribute): string => sha(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength));
const sources = [
  { uri: "data/data503.b3dm", digest: "e543a9fdf48babf505cc196b9c76d610cfcd6a3efb6d24198d7c432d351ea54d", windows: 80 },
  { uri: "data/data473.b3dm", digest: "3a8eab6914499c9d030c3a01c76b62c230d88f48e15e72b8a67706d15559094f", windows: 16 },
] as const;
// Independent photo audit inputs in ORIGINAL atlas pixels, not recipe imports.
const hotelBoxes = [1850, 1875, 1899, 1923, 1947, 1971, 1995, 2019].flatMap(y => [1200, 1215, 1240, 1253, 1275, 1289, 1312, 1327, 1350, 1363].map(x => [x, y, x + 8, y + 17]));
const oracles = [
  [{ batch: 4, size: 2048, triangle: [12618, 12619, 12620], boxes: hotelBoxes, panes: 1 }],
  [{ batch: 15, size: 4096, triangle: [8010, 8011, 8012], boxes: [2349, 2370, 2391, 2411, 2431, 2452, 2473, 2493].map(y => [711, y, 757, y + 9]), panes: 3 },
    { batch: 24, size: 4096, triangle: [2661, 2662, 2663], boxes: [3078, 3098, 3119, 3139, 3160, 3180, 3201, 3221].map(y => [2161, y, 2180, y + 7]), panes: 2 }],
];
async function fixture(which: number) {
  const source = sources[which]!, bytes = await readFile(new URL(`../data/scene/buildings/${source.uri}`, import.meta.url)).catch(cause => { throw Error(`Rail facade tests need reviewed data/scene/buildings/${source.uri}. Restore the reviewed scene cache; fresh preparation uses npm run data:fetch and npm run data:scene and needs source review. ${String(cause)}`); });
  expect(sha(bytes)).toBe(source.digest);
  const tile = parseB3dm(bytes), glb = parseGlb(tile.glb), decoded = new Map<string, Awaited<ReturnType<typeof decodePrimitive>>>();
  for (const primitive of glb.json.meshes![0]!.primitives) { const v = glb.json.bufferViews![primitive.extensions!.KHR_draco_mesh_compression!.bufferView]!; decoded.set(sha(glb.binary!.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)), await decodePrimitive(glb.json, glb.binary!, primitive, true)); }
  const manager = new LoadingManager(), loader = new GLTFLoader(manager);
  loader.setDRACOLoader({ preload() {}, decodeDracoFile(buffer: ArrayBuffer, done: (g: BufferGeometry) => void) { const d = decoded.get(sha(new Uint8Array(buffer)))!, g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(d.positions.slice(), 3)); g.setAttribute("normal", new BufferAttribute(d.surface!.normals.slice(), 3)); g.setAttribute("_batchid", new BufferAttribute(d.batchIds!.slice(), 1)); if (d.surface!.uv) g.setAttribute("uv", new BufferAttribute(d.surface!.uv.slice(), 2)); g.setIndex(new BufferAttribute(d.surface!.indices.slice(), 1)); done(g); } } as never);
  loader.register(railSourcePlugin); loader.register(() => ({ name: "EXT_texture_webp", loadTexture: async () => { const t = new Texture({ width: 1, height: 1 } as never); t.flipY = false; return t; } })); manager.addHandler(/path\.gltf$/, loader);
  const scene = (await new B3DMLoader(manager).parse(Uint8Array.from(bytes).buffer)).scene; scene.updateMatrixWorld(true);
  let photo: Mesh | undefined; scene.traverse(o => { if (o instanceof Mesh && o.geometry.hasAttribute("uv")) photo = o; }); if (!photo) throw Error("Pinned source has no photographic primitive");
  return { ...source, bytes, scene, photo };
}
function preserve(scene: Object3D): () => void {
  const checks: (() => void)[] = []; scene.traverse(o => {
    if (!(o instanceof Mesh)) return; const g = o.geometry, idx = g.index, a = idx?.array, h = idx ? hash(idx) : null, attributes = Object.entries(g.attributes).map(([name, raw]) => { const attr = raw as BufferAttribute; return { name, attr, array: attr.array, ctor: attr.array.constructor, count: attr.count, size: attr.itemSize, normalized: attr.normalized, digest: hash(attr) }; });
    checks.push(() => { expect(scene.getObjectById(o.id)).toBe(o); expect(o.geometry).toBe(g); expect(g.index).toBe(idx); if (idx) { expect(idx.array).toBe(a); expect(hash(idx)).toBe(h); } for (const r of attributes) { const attr = g.getAttribute(r.name) as BufferAttribute; expect(attr).toBe(r.attr); expect(attr.array).toBe(r.array); expect(attr.array.constructor).toBe(r.ctor); expect(attr.count).toBe(r.count); expect(attr.itemSize).toBe(r.size); expect(attr.normalized).toBe(r.normalized); expect(hash(attr)).toBe(r.digest); } });
  }); return () => checks.forEach(c => c());
}
function compile(material: Material, kind: "standard" | "depth" | "distanceRGBA" | "normal") { const lib = ShaderLib[kind], shader = { vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: {} }; material.onBeforeCompile(shader as never, {} as never); return shader; }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([0, 1])("keeps photographed windows, source arrays and all pass masks through real rail adaptation and GPU return: tile %s", async which => {
  const f = await fixture(which);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => { const path = new URL(url, "http://fixture").pathname; return new Response(Uint8Array.from(await readFile(path.startsWith("/rail-trial/") ? `data/rail/${path.slice(12)}` : `data${path}`))); }));
  const rail = (await loadRailTrial({ url: "/rail-trial/manifest.json", sha256: RAIL_MANIFEST_SHA256 }))!;
  const originalIndex = f.photo.geometry.index!;
  replaceRailBuildings(f.scene, f.uri, true, rail);
  if (which === 0) expect(f.photo.geometry.index).not.toBe(originalIndex); // Actual production removal, not a mocked filter.
  const unchanged = preserve(f.scene), options = { ...DEFAULT_FACADE_OPTIONS, delight: null, signMask: null, style: createFacadeStyle(worldStyle("satellite")), signageIntensity: { value: 2.15 } };
  const material = f.photo.material as Material; let baseline: { compile: Material["onBeforeCompile"]; key: Material["customProgramCacheKey"]; depth: Material | undefined; distance: Material | undefined; normal: Material | undefined } | undefined;
  const addUpper = upper.addUpperWindows; vi.spyOn(upper, "addUpperWindows").mockImplementation((...args) => { baseline = { compile: material.onBeforeCompile, key: material.customProgramCacheKey, depth: f.photo.customDepthMaterial, distance: f.photo.customDistanceMaterial, normal: upper.getUpperWindowNormalMaterial(f.photo) }; return addUpper(...args); });
  const tile = { content: { uri: f.uri }, engineData: {} } as Tile & { engineData: Record<string, unknown> }; let transactions: ReturnType<typeof installTileTransactions>;
  const renderer = { async parseTile(_bytes: ArrayBuffer, t: typeof tile) { t.engineData.scene = f.scene; await transactions.process(f.scene, t, async (_original, lifetime) => { const plugin = new FacadeTexturePlugin(options); await plugin.fetchData(`/scene/buildings/${f.uri}`, {}); await plugin.processTileModel(f.scene, t, lifetime); return () => {}; }); }, disposeTile(t: typeof tile) { t.engineData.scene = null; } };
  transactions = installTileTransactions(renderer as unknown as TilesRenderer, () => false);
  vi.stubGlobal("OffscreenCanvas", class { getContext() { return { drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([125, 135, 145, 255]) }; } }; } });
  const viewer = new TilesRenderer() as TilesRenderer & { setTileVisible(t: Tile, visible: boolean): void }, unload = new UnloadTilesPlugin() as UnloadTilesPlugin & { unloadTileFromGPU(scene: Object3D, tile: Tile): void };
  try {
    await (renderer as unknown as { parseTile(bytes: ArrayBuffer, t: Tile, ext: string, url: string, signal: AbortSignal): Promise<void> }).parseTile(new ArrayBuffer(0), tile, "b3dm", f.uri, new AbortController().signal); const group = f.scene.getObjectByName("rail-side-facade-band")!; expect(group).toBeDefined(); expect(group.children).toHaveLength(4); unchanged(); group.updateWorldMatrix(true, true);
    expect(group.userData.railFacades).toMatchObject({ beautyDraws: 4, windows: f.windows, imageTextures: 0, localLights: 0, approximateInterior: true }); console.log("RAIL_FACADE_COST " + JSON.stringify(group.userData.railFacades));
    const meshes = group.children as Mesh[], stone = meshes[0]!, metal = meshes[1]!, glass = meshes[2]!, room = meshes[3]!;
    for (const mesh of meshes) { const p = mesh.geometry.getAttribute("position"), n = mesh.geometry.getAttribute("normal"); expect(p.array).toBeInstanceOf(Float32Array); for (let i = 0; i < p.count; i += 3) { const vs = [0, 1, 2].map(k => new Vector3().fromBufferAttribute(p, i + k)), triangle = new Triangle(vs[0]!, vs[1]!, vs[2]!); expect(triangle.getArea()).toBeGreaterThan(1e-8); expect(triangle.getNormal(new Vector3()).distanceTo(new Vector3().fromBufferAttribute(n, i))).toBeLessThan(1e-5); } }
    for (const oracle of oracles[which]!) {
      const p = f.photo.geometry.getAttribute("position"), uv = f.photo.geometry.getAttribute("uv"), points = oracle.triangle.map(i => new Vector3().fromBufferAttribute(p, i).applyMatrix4(f.photo.matrixWorld)), normal = new Triangle(points[0]!, points[1]!, points[2]!).getNormal(new Vector3());
      const fromPhoto = (x: number, y: number, d: number): Vector3 => { const weights = Triangle.getBarycoord(new Vector3(x / oracle.size, y / oracle.size, 0), ...oracle.triangle.map(i => new Vector3(uv.getX(i), uv.getY(i), 0)) as [Vector3, Vector3, Vector3], new Vector3())!; return points.reduce((q, v, i) => q.addScaledVector(v, weights.getComponent(i)), new Vector3()).addScaledVector(normal, d); };
      const toPhoto = (point: Vector3): Vector2 => { const w = Triangle.getBarycoord(point, points[0]!, points[1]!, points[2]!, new Vector3())!; return new Vector2(...[0, 1].map(k => oracle.triangle.reduce((sum, id, i) => sum + w.getComponent(i) * uv.getComponent(id, k), 0) * oracle.size) as [number, number]); };
      const bounds = oracle.boxes.map(() => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, vertices: 0 })), pos = stone.geometry.getAttribute("position"), ids = stone.geometry.getAttribute("_batchid");
      for (let i = 0; i < pos.count; i++) if (ids.getX(i) === oracle.batch) { const q = toPhoto(new Vector3().fromBufferAttribute(pos, i)), distances = oracle.boxes.map(([a, b, c, d]) => Math.hypot(q.x - (a! + c!) / 2, q.y - (b! + d!) / 2)), whichBox = distances.reduce((best, d, i) => d < distances[best]! ? i : best, 0), box = bounds[whichBox]!; box.vertices++; box.minX = Math.min(box.minX, q.x); box.maxX = Math.max(box.maxX, q.x); box.minY = Math.min(box.minY, q.y); box.maxY = Math.max(box.maxY, q.y); }
      for (const [i, box] of oracle.boxes.entries()) {
        const bound = bounds[i]!; expect(bound.vertices).toBeGreaterThan(0); for (const [actual, expected] of [[bound.minX, box[0]], [bound.minY, box[1]], [bound.maxX, box[2]], [bound.maxY, box[3]]]) expect(Math.abs(actual! - expected!), `photo boundary ${oracle.batch}/${i}`).toBeLessThan(.004);
        const [a, b, c, d] = box as [number, number, number, number], x = (a + c) / 2, y = (b + d) / 2;
        for (const dx of [-.2, 0, .2]) for (const dy of [-.2, 0, .2]) { const ray = new Raycaster(fromPhoto(x + dx * (c - a), y + dy * (d - b), 2), normal.clone().negate(), 0, 4); expect(ray.intersectObject(room, false).length, `closed rear ${oracle.batch}/${i}`).toBeGreaterThan(0); }
        const hit = new Raycaster(fromPhoto(x + (c - a) * .10, y, 1), normal.clone().negate(), 0, 2).intersectObject(glass, false); expect(hit.length).toBeGreaterThan(0); expect(hit[0]!.distance).toBeCloseTo(1.30, 4);
        if (oracle.panes === 1) expect(new Raycaster(fromPhoto(x, b + (d - b) * .2, 1), normal.clone().negate(), 0, 2).intersectObject(metal, false)).toHaveLength(0);
      }
    }
    let opening: string | undefined;
    for (const [mat, kind] of [[material, "standard"], [f.photo.customDepthMaterial, "depth"], [f.photo.customDistanceMaterial, "distanceRGBA"], [getRailFacadeNormalMaterial(f.photo), "normal"]] as const) {
      const shader = compile(mat as Material, kind); expect(shader.uniforms).toHaveProperty("mapsRailProcedural", options.style.procedural); expect(shader.vertexShader.match(/attribute float _batchid;/g)).toHaveLength(1);
      expect(shader.fragmentShader).toContain("mapsRailOpening0"); if (which === 1) { expect(shader.fragmentShader).toContain("mapsRailOpening1"); expect(shader.fragmentShader).toContain("abs(mapsRailBatch-15.0)"); expect(shader.fragmentShader).toContain("abs(mapsRailBatch-24.0)"); } if (which === 0) { expect(shader.fragmentShader).toContain("mapsUpperOpening"); expect(shader.fragmentShader).toContain("abs(mapsUpperBatch-16.0)"); expect(getRailFacadeNormalMaterial(f.photo)).toBe(upper.getUpperWindowNormalMaterial(f.photo)); }
      // Function text is common; boilerplate varies by three.js pass.
      const functions = shader.fragmentShader.match(/vec3 mapsRailLocal\d[^\n]*\n?bool mapsRailOpening\d[^\n]*/g)!.join("\n"); if (opening) expect(functions).toBe(opening); else opening = functions;
    }
    const disposed = new Map<object, number>(), normalDisposed = new Map<object, number>();
    for (const mesh of meshes) { for (const resource of [mesh.geometry, mesh.material as Material]) resource.addEventListener("dispose", () => disposed.set(resource, (disposed.get(resource) ?? 0) + 1)); const normal = getRailFacadeNormalMaterial(mesh)!; normal.addEventListener("dispose", () => normalDisposed.set(normal, (normalDisposed.get(normal) ?? 0) + 1)); }
    const sourceNormal = getRailFacadeNormalMaterial(f.photo)!; sourceNormal.addEventListener("dispose", () => normalDisposed.set(sourceNormal, (normalDisposed.get(sourceNormal) ?? 0) + 1));
    const children = [...group.children]; for (let i = 0; i < 2; i++) { viewer.setTileVisible(tile, true); viewer.setTileVisible(tile, false); unload.unloadTileFromGPU(f.scene, tile); expect(group.parent).toBe(f.scene); expect(group.children).toEqual(children); unchanged(); viewer.setTileVisible(tile, true); applyFacadeStyle(options.style, worldStyle("cartographic")); applyFacadeStyle(options.style, worldStyle("satellite")); }
    viewer.setTileVisible(tile, false); renderer.disposeTile(tile); expect(group.parent).toBeNull(); expect(getRailFacadeNormalMaterial(f.photo)).toBeUndefined(); expect(upper.getUpperWindowNormalMaterial(f.photo)).toBe(baseline!.normal); expect(material.onBeforeCompile).toBe(baseline!.compile); expect(material.customProgramCacheKey).toBe(baseline!.key); expect(f.photo.customDepthMaterial).toBe(baseline!.depth); expect(f.photo.customDistanceMaterial).toBe(baseline!.distance); expect([...disposed.values()]).toEqual(Array(8).fill(3)); expect([...normalDisposed.values()]).toEqual(Array(5).fill(1));
  } finally { viewer.dispose(); }
}, 20000);

it("refuses altered/missing/duplicate source triangles, photo UV, metadata and parser placement", async () => {
  const f = await fixture(0), g = f.photo.geometry, index = g.index!, uv = g.getAttribute("uv"), scene = f.scene as Object3D & { batchTable: { getDataFromId(id: number): Record<string, unknown> } }, table = scene.batchTable, read = table.getDataFromId.bind(table);
  expect(() => prepareRailFacades(scene, f.uri, "0".repeat(64))).toThrow("SHA-256");
  table.getDataFromId = id => ({ ...read(id), "bldg:usage": "業務施設" }); expect(() => prepareRailFacades(scene, f.uri, f.digest)).toThrow("metadata"); table.getDataFromId = read;
  const old = uv.getX(12618); uv.setX(12618, old + .001); expect(() => prepareRailFacades(scene, f.uri, f.digest)).toThrow("original UV"); uv.setX(12618, old);
  const values = Array.from(index.array); g.setIndex(values.filter((_, i) => i < 4206 * 3 || i >= 4207 * 3)); expect(() => prepareRailFacades(scene, f.uri, f.digest)).toThrow("photographic wall");
  g.setIndex([...values, ...values.slice(4206 * 3, 4207 * 3)]); expect(() => prepareRailFacades(scene, f.uri, f.digest)).toThrow("unique retained original triangle"); g.setIndex(index);
  scene.position.x = .01; expect(() => prepareRailFacades(scene, f.uri, f.digest)).toThrow("parser placement"); scene.position.x = 0; expect(() => prepareRailFacades(scene, f.uri, f.digest)).not.toThrow();
});

it("binds the new office tile fetch to actual bytes and the exact reviewed pin", async () => {
  const plugin = new FacadeTexturePlugin({ ...DEFAULT_FACADE_OPTIONS, style: createFacadeStyle(worldStyle("satellite")), signageIntensity: { value: 0 } }), url = "/scene/buildings/data/data473.b3dm", bytes = Uint8Array.of(1, 2, 3);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes)));
  await expect(plugin.fetchData(url, {})).rejects.toThrow(`different bytes: SHA-256 ${sha(bytes)}; expected 3a8eab6914499c9d030c3a01c76b62c230d88f48e15e72b8a67706d15559094f`);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", { status: 503 })));
  await expect(plugin.fetchData(url, {})).rejects.toThrow("data/data473.b3dm could not load (HTTP 503). Run npm run data:scene");
});
