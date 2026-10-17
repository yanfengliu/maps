/** Bound: installed B3DMLoader/GLTFLoader and complete facade plugin on the pinned
 * source, source mutations, unchanged source arrays, pavement target, power and
 * mesh/light teardown. Image pixels and Draco worker transport are synthetic;
 * Draco bytes are decoded by the shipped decoder. Native appearance is separate. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { B3DMLoader, TilesRenderer } from "3d-tiles-renderer";
import { UnloadTilesPlugin } from "3d-tiles-renderer/plugins";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BufferAttribute, BufferGeometry, LoadingManager, Mesh, MeshStandardMaterial, Object3D, SpotLight, Texture, Triangle, Vector3 } from "three";
import { parseB3dm, parseGlb } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { preparePeripheralMountedLight, addPeripheralMountedLight, peripheralLightSourceForUrl } from "../src/scene/peripheral-mounted-light.js";
import { PERIPHERAL_MOUNTED_LIGHT as R } from "../src/scene/peripheral-mounted-light-recipe.js";
import { applyFacadeStyle, createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { decodeMesh } from "../src/world/mesh.js";
import { buildingSections } from "../src/scene/cutout-sections.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";
import type { Tile } from "3d-tiles-renderer/core";

const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
async function source() {
  const bytes = await readFile(new URL("../data/scene/buildings/data/data498.b3dm", import.meta.url));
  expect(sha(bytes)).toBe("979ab194aa165391e058e1b3b0b3b37ea5c3d64dfc5f5353e61922f9c97ead55");
  const tile = parseB3dm(bytes), glb = parseGlb(tile.glb), decoded = new Map<string, Awaited<ReturnType<typeof decodePrimitive>>>();
  for (const primitive of glb.json.meshes![0]!.primitives) {
    const view = glb.json.bufferViews![primitive.extensions!.KHR_draco_mesh_compression!.bufferView]!;
    decoded.set(sha(glb.binary!.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)), await decodePrimitive(glb.json, glb.binary!, primitive, true));
  }
  const manager = new LoadingManager(), gltf = new GLTFLoader(manager);
  gltf.setDRACOLoader({ preload() {}, decodeDracoFile(buffer: ArrayBuffer, done: (geometry: BufferGeometry) => void) {
    const d = decoded.get(sha(new Uint8Array(buffer))); if (!d) throw Error("Unrecognized actual compressed source bytes");
    const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(d.positions.slice(), 3)); g.setAttribute("normal", new BufferAttribute(d.surface!.normals.slice(), 3));
    g.setAttribute("_batchid", new BufferAttribute(d.batchIds!.slice(), 1)); if (d.surface!.uv) g.setAttribute("uv", new BufferAttribute(d.surface!.uv.slice(), 2)); g.setIndex(new BufferAttribute(d.surface!.indices.slice(), 1)); done(g);
  } } as never);
  gltf.register(() => ({ name: "EXT_texture_webp", loadTexture: async () => { const t = new Texture({ width: 1, height: 1 } as never); t.flipY = false; return t; } }));
  manager.addHandler(/path\.gltf$/, gltf);
  const scene = (await new B3DMLoader(manager).parse(Uint8Array.from(bytes).buffer)).scene;
  scene.updateMatrixWorld(true); return { bytes, scene };
}
function arrays(scene: Object3D): string[] {
  const result: string[] = []; scene.traverse(o => { if (o instanceof Mesh && !o.name.startsWith("peripheral-east")) for (const a of [o.geometry.index, ...["position","normal","uv","_batchid"].map(n => o.geometry.getAttribute(n))]) if (a) result.push(sha(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength))); }); return result;
}
function release(scene: Object3D): void {
  const resources = new Set<{ dispose(): void }>(); scene.traverse(o => { if (o instanceof Mesh) { resources.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { resources.add(m); for (const v of Object.values(m)) if (v instanceof Texture) resources.add(v); } } }); for (const r of resources) r.dispose();
}
it("binds one complete fitting through installed loaders and the production plugin", async () => {
  const { bytes, scene } = await source(), original = arrays(scene), options = { ...DEFAULT_FACADE_OPTIONS, delight: null, signMask: null, style: createFacadeStyle(worldStyle("satellite")), signageIntensity: { value: 2.15 } };
  const plugin = new FacadeTexturePlugin(options);
  const cleanups: (() => void)[] = [], lifetime = { trackTexture() {}, releaseTexture(texture: Texture) { texture.dispose(); }, onRelease(cleanup: () => void) { cleanups.push(cleanup); } };
  vi.stubGlobal("fetch", vi.fn(async () => new Response(Uint8Array.from(bytes))));
  vi.stubGlobal("OffscreenCanvas", class { getContext() { return { drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([125,135,145,255]) }; } }; } });
  try {
    expect(peripheralLightSourceForUrl("/scene/buildings/data/data498.b3dm?v=1")).toBe(R);
    expect(peripheralLightSourceForUrl("/scene/buildings/data/data498-other.b3dm")).toBeUndefined();
    const table = (scene as Object3D & { batchTable: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
    const read = table.getDataFromId.bind(table);
    table.getDataFromId = id => ({ ...read(id), gml_id: "bldg_wrong" }); expect(() => preparePeripheralMountedLight(scene,R.tileUri,R.tileSha256)).toThrow(/GML identity/); table.getDataFromId = read;
    let photo!: Mesh; scene.traverse(o => { if (o instanceof Mesh && o.geometry.hasAttribute("uv")) photo = o; });
    const changes: [string,()=>void,()=>void][] = [];
    for (const name of ["position","normal","uv"] as const) { const a = photo.geometry.getAttribute(name), id = 31893, x = a.getX(id); changes.push([name,()=>a.setX(id,x+.01),()=>a.setX(id,x)]); }
    const idx = photo.geometry.index!, before = idx.getX(10631*3); changes.push(["index",()=>idx.setX(10631*3,before+1),()=>idx.setX(10631*3,before)]);
    const px = scene.position.x; changes.push(["parser transform",()=>{scene.position.x=px+.01;},()=>{scene.position.x=px;}]);
    const map = (photo.material as MeshStandardMaterial).map!; changes.push(["UV channel",()=>{map.channel=1;},()=>{map.channel=0;}]);
    for (const [name,change,restore] of changes) { try { change(); expect(()=>preparePeripheralMountedLight(scene,R.tileUri,R.tileSha256),name).toThrow(/Peripheral east fitting/); } finally { restore(); } expect(()=>preparePeripheralMountedLight(scene,R.tileUri,R.tileSha256),`${name} restored`).not.toThrow(); }
    expect(()=>preparePeripheralMountedLight(scene,R.tileUri,"wrong")).toThrow(/SHA-256/);
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.of(1,2,3)))); await expect(plugin.fetchData("/scene/buildings/data/data498.b3dm",{})).rejects.toThrow(/SHA-256/);
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(bytes)))); await plugin.fetchData("/scene/buildings/data/data498.b3dm",{});
    await plugin.processTileModel(scene,{content:{uri:R.tileUri}},lifetime);
    const group = scene.getObjectByName("peripheral-east-mounted-light")!; expect(group).toBeDefined(); expect(arrays(scene)).toEqual(original);
    expect(group.userData.peripheralMountedLight).toMatchObject({ beautyDraws:2, triangles:62, geometryBytes:5208, localLights:1, imageTextures:0, sourceFace:10631 });
    const sections = buildingSections(scene,R.tileUri); for (const section of sections) section.geometry.dispose();
    expect(addPeripheralMountedLight(scene,R.tileUri,R.tileSha256,options)).toBe(false);
    const light = group.getObjectByName("peripheral-east-mounted-light:downlight") as SpotLight, target = light.target, lens = group.getObjectByName("peripheral-east-mounted-light:recessed-lens") as Mesh;
    expect(light.intensity).toBe(60); expect(light.distance).toBe(6); expect(light.castShadow).toBe(false);
    options.signageIntensity.value=.05; expect(light.intensity).toBe(0); expect((lens.material as MeshStandardMaterial).emissiveIntensity).toBe(0);
    options.signageIntensity.value=2.15; applyFacadeStyle(options.style,worldStyle("cartographic")); expect(light.intensity).toBe(0); applyFacadeStyle(options.style,worldStyle("satellite")); expect(light.intensity).toBe(60);
    const pavementBytes=await readFile(new URL("../data/scene/pavements.mesh",import.meta.url)); expect(sha(pavementBytes)).toBe("841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6");
    const pavement=decodeMesh(pavementBytes), vertices=[0,1,2].map(k=>new Vector3().fromArray(pavement.positions,pavement.indices[263078*3+k]!*3)); expect(vertices.map(p=>p.toArray())).toEqual(R.receiver.vertices);
    const p = new Vector3(...R.receiver.point); expect(new Triangle(vertices[0]!,vertices[1]!,vertices[2]!).closestPointToPoint(p,new Vector3()).distanceTo(p)).toBeLessThan(1e-10); expect(Math.min(...new Triangle(vertices[0]!,vertices[1]!,vertices[2]!).getBarycoord(p,new Vector3())!.toArray())).toBeCloseTo(1/3,8);
    expect(R.mount.origin[1]-p.y).toBeGreaterThan(3.4); expect(R.mount.origin[1]-p.y).toBeLessThan(3.6);
    const disposed=vi.spyOn(light,"dispose"); release(scene); for(const cleanup of cleanups.splice(0))cleanup(); expect(group.parent).toBeNull(); expect(light.parent).toBeNull(); expect(target.parent).toBeNull(); expect(disposed).toHaveBeenCalledTimes(1); expect(()=>addPeripheralMountedLight(scene,R.tileUri,R.tileSha256,options)).toThrow(/unprepared source/);
  } finally { vi.unstubAllGlobals(); release(scene); for(const cleanup of cleanups.splice(0))cleanup(); }
}, 20000);

it.each(["cancel", "reject", "transfer", "replace"])("releases tile-owned fitting resources on %s", async mode => {
  const abort = new AbortController(), counts = new Map<object, number>(), lights: SpotLight[] = [], roots: Object3D[] = [];
  const tile = { content: { uri: R.tileUri }, engineData: {} } as Tile & { engineData: Record<string, unknown> };
  let transactions: ReturnType<typeof installTileTransactions>;
  vi.stubGlobal("OffscreenCanvas", class { getContext() { return { drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([125,135,145,255]) }; } }; } });
  const renderer = {
    async parseTile(_bytes: ArrayBuffer, staged: typeof tile) {
      const f = await source(); roots.push(f.scene); staged.engineData.scene = f.scene;
      await transactions.process(f.scene, staged, async (_original,lifetime) => {
        vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(f.bytes))));
        const plugin = new FacadeTexturePlugin({ ...DEFAULT_FACADE_OPTIONS, delight:null, signMask:null, style:createFacadeStyle(worldStyle("satellite")), signageIntensity:{value:2.15} });
        await plugin.fetchData("/scene/buildings/data/data498.b3dm",{}); await plugin.processTileModel(f.scene,{content:{uri:R.tileUri}},lifetime);
        const group = f.scene.getObjectByName("peripheral-east-mounted-light")!, light = group.getObjectByName("peripheral-east-mounted-light:downlight") as SpotLight; lights.push(light);
        const dispose = light.dispose.bind(light); light.dispose = () => { counts.set(light,(counts.get(light)??0)+1); dispose(); };
        group.traverse(o => { if (o instanceof Mesh) for (const resource of [o.geometry,o.material as MeshStandardMaterial]) resource.addEventListener("dispose",()=>counts.set(resource,(counts.get(resource)??0)+1)); });
        if (mode === "cancel") abort.abort();
        if (mode === "reject") throw Error("controlled post-fixture rejection");
        return () => {};
      });
    },
    disposeTile(disposed: typeof tile) { disposed.engineData.scene = null; },
  };
  transactions = installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
  try {
    const run = () => (renderer as unknown as {parseTile(b:ArrayBuffer,t:Tile,e:string,u:string,s:AbortSignal):Promise<void>}).parseTile(new ArrayBuffer(0),tile,"b3dm",R.tileUri,abort.signal);
    if (mode === "reject") await expect(run()).rejects.toThrow(/controlled/); else await run();
    if (mode === "transfer" || mode === "replace") renderer.disposeTile(tile);
    if (mode === "replace") { await run(); renderer.disposeTile(tile); }
    expect(lights).toHaveLength(mode === "replace" ? 2 : 1);
    expect([...counts.values()]).toHaveLength(lights.length*5); expect([...counts.values()].every(n=>n===1)).toBe(true);
    for (const [i,light] of lights.entries()) { expect(light.parent).toBeNull(); expect(light.target.parent).toBeNull(); expect(roots[i]!.getObjectByName("peripheral-east-mounted-light")).toBeUndefined(); }
  } finally { vi.unstubAllGlobals(); }
}, 20000);

it("retains fitting across installed GPU unload and cached visibility return until logical release", async () => {
  const f = await source(), viewer = new TilesRenderer() as TilesRenderer & { setTileVisible(tile: Tile, visible: boolean): void }, unload = new UnloadTilesPlugin() as UnloadTilesPlugin & { unloadTileFromGPU(scene: Object3D, tile: Tile): void }, abort = new AbortController();
  const options = { ...DEFAULT_FACADE_OPTIONS, delight:null, signMask:null, style:createFacadeStyle(worldStyle("satellite")), signageIntensity:{value:2.15} };
  const tile = { content:{uri:R.tileUri}, engineData:{} } as Tile & {engineData:Record<string,unknown>};
  let transactions: ReturnType<typeof installTileTransactions>;
  const renderer = {
    async parseTile(_bytes:ArrayBuffer, staged:typeof tile) {
      staged.engineData.scene=f.scene;
      await transactions.process(f.scene,staged,async (_original,lifetime) => {
        const plugin=new FacadeTexturePlugin(options); await plugin.fetchData("/scene/buildings/data/data498.b3dm",{});
        await plugin.processTileModel(f.scene,{content:{uri:R.tileUri}},lifetime); return () => {};
      });
    },
    disposeTile(disposed:typeof tile) { disposed.engineData.scene=null; },
  };
  transactions=installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(f.bytes))));
  vi.stubGlobal("OffscreenCanvas",class {getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray([125,135,145,255])};}};}});
  try {
    await (renderer as unknown as {parseTile(b:ArrayBuffer,t:Tile,e:string,u:string,s:AbortSignal):Promise<void>}).parseTile(new ArrayBuffer(0),tile,"b3dm",R.tileUri,abort.signal);
    const group=f.scene.getObjectByName("peripheral-east-mounted-light")!, light=group.getObjectByName("peripheral-east-mounted-light:downlight") as SpotLight;
    const objects=[...group.children], original=arrays(f.scene), disposed=vi.spyOn(light,"dispose");
    const counts=new Map<object,number>(); group.traverse(o=>{if(o instanceof Mesh)for(const resource of [o.geometry,o.material as MeshStandardMaterial])resource.addEventListener("dispose",()=>counts.set(resource,(counts.get(resource)??0)+1));});
    for(let cycle=0;cycle<2;cycle++) {
      viewer.setTileVisible(tile,true); expect(f.scene.parent).toBe(viewer.group);
      viewer.setTileVisible(tile,false); expect(tile.engineData.scene).toBe(f.scene);
      // This is the actual installed method in the failed canonical stack. It
      // disposes GPU resources during Object3D.traverse and retains CPU objects.
      expect(()=>unload.unloadTileFromGPU(f.scene,tile)).not.toThrow();
      expect(group.parent).toBe(f.scene); expect(group.children).toEqual(objects); expect(arrays(f.scene)).toEqual(original);
      expect(light.parent).toBe(group); expect(light.target.parent).toBe(group); expect(disposed).not.toHaveBeenCalled();
      viewer.setTileVisible(tile,true); expect(f.scene.getObjectByName(group.name)).toBe(group); expect(light.intensity).toBe(60);
      options.signageIntensity.value=.05; expect(light.intensity).toBe(0); options.signageIntensity.value=2.15; expect(light.intensity).toBe(60);
    }
    viewer.setTileVisible(tile,false); renderer.disposeTile(tile);
    expect(group.parent).toBeNull(); expect(light.parent).toBeNull(); expect(light.target.parent).toBeNull(); expect(disposed).toHaveBeenCalledTimes(1);
    expect([...counts.values()]).toHaveLength(4); expect([...counts.values()].every(n=>n===3)).toBe(true);
  } finally { vi.unstubAllGlobals(); f.scene.removeFromParent(); viewer.dispose(); }
},20000);
