/** CPU caller/ownership regressions. Actual installed TilesRenderer; no GPU. */
import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { B3DMLoader } from "3d-tiles-renderer";
import { BufferGeometry, Float32BufferAttribute, Group, Material, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, Texture, type WebGLRenderer } from "three";
import { createBuildings } from "../src/scene/buildings.js";
import { FacadeTexturePlugin, type FacadeTextureLifetime } from "../src/scene/facade-textures.js";
import type { RailTrialData } from "../src/scene/rail-trial.js";
import { createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";

function environment(): void {
  vi.stubGlobal("window", { location: { href: "http://127.0.0.1:4333/" } });
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => setTimeout(() => cb(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
}
function buildings(data: Promise<RailTrialData>) {
  environment();
  return createBuildings(new PerspectiveCamera(55, 1280 / 720, 1, 8000), { getSize: (v: { set(x: number, y: number): unknown }) => v.set(1280, 720) } as unknown as WebGLRenderer,
    { style: createFacadeStyle(worldStyle("satellite")), signageIntensity: { value: 0 }, railTrial: data, facade: { patchMaterials: false } });
}
// The private installed parser API is intentionally exercised through the
// actual public createBuildings instance. No dependency implementation is copied.
function renderer(b: ReturnType<typeof buildings>): any { return (b.root.children[0] as any).tilesRenderer; }
const empty = (): RailTrialData => ({ manifest: { tiles: [] }, replacements: [], layers: [], digest: "fixture" } as unknown as RailTrialData);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("rail caller startup", () => {
  it("preserves root/nested JSON Responses and reaches the actual ready barrier through update", async () => {
    const manifest = JSON.parse(fs.readFileSync("data/rail/manifest.json", "utf8"));
    const data = { ...empty(), manifest };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(Uint8Array.from(fs.readFileSync(`data${new URL(url, "http://fixture").pathname}`)))));
    // Real cached bytes and root traversal; model decoder is the only startup
    // fixture boundary. Real three-leaf source parsing is covered separately.
    vi.spyOn(B3DMLoader.prototype, "parse").mockImplementation(async () => ({ scene: new Group() }) as any);
    const b = buildings(Promise.resolve(data)), tiles = renderer(b);
    try {
      const facade = tiles.plugins.find((p: any) => p.name === "MAPS_FACADE_TEXTURES");
      expect(await facade.fetchData("/scene/buildings/tileset.json", {})).toBeInstanceOf(Response);
      const root = await tiles.loadRootTileset(); expect(root.asset.version).toBe("1.0");
      const rootBytes = fs.readFileSync("data/scene/buildings/tileset.json");
      const fetch = vi.mocked(globalThis.fetch); fetch.mockImplementationOnce(async () => new Response(rootBytes));
      const nested = await tiles.invokeOnePlugin((p: any) => p.fetchData?.("/scene/buildings/nested/tileset.json", {}));
      expect(nested).toBeInstanceOf(Response); expect((await nested.json()).asset.version).toBe("1.0");
      let ready = false, failure: unknown; const done = b.ready.then(() => { ready = true; }, e => { failure = e; });
      for (let i = 0; i < 500 && !ready && !failure; i++) { b.update(); await new Promise(resolve => setTimeout(resolve, 0)); }
      expect(failure).toBeUndefined(); expect(ready).toBe(true); await done;
      expect(b.status().cutout!.preparedLeaves).toBe(44); expect(b.displayReady()).toBe(true);
      // Binary leaves still use the exact pin, including corrupted-byte refusal.
      const pin = manifest.tiles[0]; fetch.mockImplementationOnce(async () => new Response(new Uint8Array(pin.bytes)));
      await expect(facade.fetchData(`/scene/buildings/${pin.uri}`, {})).rejects.toThrow(/different bytes/);
    } finally { b.dispose(); }
  });
});

class Bitmap { constructor(private readonly onClose: () => void) {} close(): void { this.onClose(); } }
function parsedFixture(shared = false, target = false) {
  const counts = { geometry: 0, material: 0, texture: 0, image: 0 };
  vi.stubGlobal("ImageBitmap", Bitmap);
  const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute([0,25,4, 1,25,4, 0,26,4],3));
  g.setAttribute("normal",new Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3)); g.setAttribute("_batchid",new Float32BufferAttribute([0,0,0],1));g.setIndex([0,1,2]);
  const image = new Bitmap(() => counts.image++) as unknown as ImageBitmap, texture = new Texture(image), other = new Texture(image), material = new MeshStandardMaterial({ map: texture, emissiveMap: shared ? other : null });
  const scene = new Group(), mesh = new Mesh(g,material); scene.add(mesh); if(shared)scene.add(new Mesh(g,material));
  g.addEventListener("dispose",()=>counts.geometry++);material.addEventListener("dispose",()=>counts.material++);
  texture.addEventListener("dispose",()=>counts.texture++);other.addEventListener("dispose",()=>counts.texture++);
  mesh.userData.railSource = {node:0,primitive:0,material:0,rawWorld:new Matrix4().toArray(),parserWorld:new Matrix4().toArray()};
  const s={index:0,uri:"data/fixture.b3dm",node:0,primitive:0,face:0,gmlId:"fixture",batchId:0,material:0,p:[[0,25,4],[1,25,4],[0,26,4]],n:[[0,0,1],[0,0,1],[0,0,1]],uv:null};
  const t={source:0,sourceIdentity:{uri:s.uri,node:0,primitive:0,face:0,gmlId:s.gmlId,batchId:0},material:0,positions:s.p.flat(),normals:s.n.flat(),uv:null,weights:[]};
  const data=empty();if(target)data.replacements=[{id:s.gmlId,sourceIdentity:[s],triangles:[t,{...t,source:-1,sourceIdentity:null}]}] as any;
  const tile:any={content:{uri:s.uri},children:[],engineData:{transform:new Matrix4()},internal:{},traversal:{visible:false,active:false}};
  return {counts,g,material,texture,other,scene,data,tile};
}
function parse(b: ReturnType<typeof buildings>, f: ReturnType<typeof parsedFixture>, signal = new AbortController().signal): Promise<void> {
  const tiles=renderer(b); tiles.registerPlugin({name:`CPU_PARSED_${tiles.plugins.length}`,parseToMesh:()=>Promise.resolve(f.scene)});
  return tiles.parseTile(new TextEncoder().encode("r170").buffer,f.tile,"r170","http://fixture/fixture.r170",signal);
}

describe("rail parsed transaction ownership", () => {
  it.each(["transfer", "cancel", "reject"])("owns authored portal maps through style cycling and %s", async mode => {
    const f = parsedFixture(false, true), abort = new AbortController();
    (f.scene as any).batchTable = { getDataFromId: () => ({ gml_id: "fixture" }) };
    vi.spyOn(FacadeTexturePlugin.prototype, "processTileModel").mockImplementation(async () => {
      if (mode === "cancel") abort.abort();
      if (mode === "reject") throw Error("controlled portal facade refusal");
    });
    const released: Texture[] = [], originalDispose = Texture.prototype.dispose;
    vi.spyOn(Texture.prototype, "dispose").mockImplementation(function (this: Texture) { released.push(this); originalDispose.call(this); });
    const b = buildings(Promise.resolve(f.data));
    try {
      if (mode === "reject") await expect(parse(b, f, abort.signal)).rejects.toThrow(/controlled portal/);
      else await parse(b, f, abort.signal);
      if (mode === "transfer") {
        const portal = f.scene.children.find(o => o.userData.railReplacement?.source === false) as Mesh;
        const material = portal.material as MeshStandardMaterial, texture = material.map!;
        const before = Array.from(texture.image.data), geometry = Array.from(portal.geometry.getAttribute("position").array);
        b.setStyle(worldStyle("cartographic")); expect(Array.from(texture.image.data)).not.toEqual(before);
        b.setStyle(worldStyle("satellite")); expect(Array.from(texture.image.data)).toEqual(before);
        expect(material.map).toBe(texture); expect(material.bumpMap).toBe(texture);
        expect(Array.from(portal.geometry.getAttribute("position").array)).toEqual(geometry);
        expect(released.filter(t => t.name === "rail-finish:concrete")).toHaveLength(0);
        renderer(b).disposeTile(f.tile);
      }
      b.dispose(); b.dispose();
      expect(released.filter(t => t.name === "rail-finish:concrete")).toHaveLength(1);
    } finally { b.dispose(); f.other.dispose(); }
  });

  it.each([false,true])("settles actual facade bitmap retirement exactly once; retained same-texture slot=%s",async retained=>{
    const f=parsedFixture(true);f.material.emissiveMap=retained?f.texture:null;Object.assign(f.texture.image,{width:1,height:1});
    vi.stubGlobal("OffscreenCanvas",class {getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray([50,60,70,255])};}};}});
    const b=buildings(Promise.resolve(f.data));try {
      await parse(b,f);expect(f.material.map).not.toBe(f.texture);expect(f.material.emissiveMap).toBe(retained?f.texture:null);
      expect(f.counts).toEqual({geometry:0,material:0,texture:retained?0:1,image:retained?0:1});renderer(b).disposeTile(f.tile);
      expect(f.counts).toEqual({geometry:1,material:1,texture:1,image:1});
    }finally{b.dispose();f.other.dispose();}
  });
  it.each([false,true])("runs actual facade retirement with a retained texture sharing its image; cancelled=%s",async cancel=>{
    const f=parsedFixture(true),abort=new AbortController();Object.assign(f.texture.image,{width:1,height:1});
    vi.stubGlobal("OffscreenCanvas",class {getContext(){return {drawImage(){if(cancel)abort.abort();},getImageData(){return {data:new Uint8ClampedArray([50,60,70,255])};}};}});
    const b=buildings(Promise.resolve(f.data));const textureDispose=vi.spyOn(Texture.prototype,"dispose");
    try {
      await parse(b,f,abort.signal);
      expect(f.material.map).not.toBe(f.texture);
      if(!cancel) {
        expect(f.tile.engineData.scene).toBe(f.scene);
        // The old map is retired, but emissiveMap still needs the shared image.
        expect(f.counts).toEqual({geometry:0,material:0,texture:1,image:0});
        renderer(b).disposeTile(f.tile);
      } else expect(f.tile.engineData.scene).toBeUndefined();
      expect(f.counts).toEqual({geometry:1,material:1,texture:2,image:1});
      expect(textureDispose).toHaveBeenCalledTimes(3); // two originals + one rebuilt DataTexture
      b.dispose();expect(textureDispose).toHaveBeenCalledTimes(3);
    }finally{b.dispose();}
  });
  it("does not let a cancelled older parse erase the same tile's newer transferred scene",async()=>{
    const first=parsedFixture(),second=parsedFixture();second.tile=first.tile;
    let entered!:()=>void,resume!:()=>void;const enter=new Promise<void>(r=>{entered=r;}),wait=new Promise<void>(r=>{resume=r;});
    vi.spyOn(FacadeTexturePlugin.prototype,"processTileModel").mockImplementation(async scene=>{if(scene===first.scene){entered();await wait;}});
    const b=buildings(Promise.resolve(first.data)),tiles=renderer(b),abort=new AbortController();let next=first.scene;
    tiles.registerPlugin({name:"CPU_OVERLAPPING_PARSES",parseToMesh:()=>Promise.resolve(next)});
    const invoke=(signal:AbortSignal)=>tiles.parseTile(new TextEncoder().encode("r170").buffer,first.tile,"r170","http://fixture/fixture.r170",signal);
    const old=invoke(abort.signal);await enter;abort.abort();next=second.scene;
    try {
      await invoke(new AbortController().signal);expect(first.tile.engineData.scene).toBe(second.scene);
      resume();await old;expect(first.tile.engineData.scene).toBe(second.scene);
      expect(first.counts).toEqual({geometry:1,material:1,texture:1,image:1});expect(second.counts.geometry).toBe(0);
      tiles.disposeTile(first.tile);expect(second.counts).toEqual({geometry:1,material:1,texture:1,image:1});
    }finally{resume();await old;b.dispose();first.other.dispose();second.other.dispose();}
  });
  it.each(["source", "facade", "trial-promise"])("releases the full parsed scene uniquely after %s rejection", async mode => {
    const f=parsedFixture(false,true);
    if(mode==="facade") { (f.scene as any).batchTable={getDataFromId:()=>({gml_id:"fixture"})}; vi.spyOn(FacadeTexturePlugin.prototype,"processTileModel").mockRejectedValue(new Error("controlled facade refusal")); }
    const b=buildings(mode==="trial-promise" ? Promise.reject(new Error("controlled trial refusal")) : Promise.resolve(f.data));
    const gd=vi.spyOn(BufferGeometry.prototype,"dispose"),md=vi.spyOn(Material.prototype,"dispose");
    try {
      await expect(parse(b,f)).rejects.toThrow(mode==="source" ? /batch table/ : /controlled/);
      expect(f.tile.engineData.scene).toBeUndefined();expect(f.counts).toEqual({geometry:1,material:1,texture:1,image:1});
      if(mode==="facade"){expect(gd).toHaveBeenCalledTimes(3);expect(md).toHaveBeenCalledTimes(2);}
      b.dispose();expect(f.counts).toEqual({geometry:1,material:1,texture:1,image:1});
    } finally { b.dispose(); f.other.dispose(); }
  });
  it.each(["cancel", "dispose", "transfer", "retired-then-reject"])("settles %s with shared geometry/materials and two textures sharing one bitmap", async mode => {
    const f=parsedFixture(true),abort=new AbortController();let entered!:()=>void, resume!:()=>void;
    const enteredP=new Promise<void>(resolve=>{entered=resolve;}),wait=new Promise<void>(resolve=>{resume=resolve;});
    let added: Texture | null=null, addedDisposed=0;
    vi.spyOn(FacadeTexturePlugin.prototype,"processTileModel").mockImplementation(async (_scene,_tile,lifetime?:FacadeTextureLifetime)=>{
      if(mode==="retired-then-reject") {
        added=new Texture();added.addEventListener("dispose",()=>addedDisposed++);lifetime!.trackTexture(added);
        lifetime!.releaseTexture(f.texture);lifetime!.releaseTexture(f.other);f.material.map=added;f.material.emissiveMap=null;
      }
      entered();await wait;if(mode==="retired-then-reject")throw Error("partial facade refusal");
    });
    const b=buildings(Promise.resolve(f.data)); const pending=parse(b,f,abort.signal);await enteredP;
    try {
      expect(f.tile.engineData.scene).toBeUndefined();expect(b.status().cutout!.sectionMeshes).toBe(0);
      if(mode==="cancel")abort.abort();if(mode==="dispose")b.dispose();resume();
      if(mode==="retired-then-reject")await expect(pending).rejects.toThrow(/partial facade/);else await pending;
      if(mode==="transfer") {
        expect(f.tile.engineData.scene).toBe(f.scene);expect(f.scene.children[0]!.userData.tile).toBe(f.tile);
        expect(f.counts).toEqual({geometry:0,material:0,texture:0,image:0});renderer(b).disposeTile(f.tile);renderer(b).disposeTile(f.tile);
      } else expect(f.tile.engineData.scene).toBeUndefined();
      expect(f.counts).toEqual({geometry:1,material:1,texture:2,image:1});if(added)expect(addedDisposed).toBe(1);
      b.dispose();expect(f.counts).toEqual({geometry:1,material:1,texture:2,image:1});
    } finally { resume();await pending.catch(()=>{});b.dispose(); }
  });
});
