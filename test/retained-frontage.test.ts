/** Bound: pinned518 installed loader, actual production plugin/transaction and
 * installed GPU-only eviction twice before logical release. Synthetic pixels;
 * no native appearance, driver allocation, continuous stability or FPS claim. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { TilesRenderer } from "3d-tiles-renderer";
import { UnloadTilesPlugin } from "3d-tiles-renderer/plugins";
import { BufferGeometry, Material, Mesh, Object3D, Texture } from "three";
import type { Tile } from "3d-tiles-renderer/core";
import { loadData518 } from "./helpers/data518.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { getCommercialCornerNormalMaterial } from "../src/scene/commercial-corner.js";
import { getCrossingFrontageNormalMaterial } from "../src/scene/crossing-frontage.js";
import { createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";

it("retains commercial and original-relief hooks across installed GPU eviction; releases every logical resource once",async()=>{
  const f=await loadData518(),native=await readFile(new URL("fixtures/commercial-lettering-source.json",import.meta.url));
  expect(createHash("sha256").update(native).digest("hex")).toBe("d73cb9aa2614af342e3d958eade237e89916b032563795e977faa31224afcd60");
  const tile={...JSON.parse(native.toString()).nativeLeaf,engineData:{}}as Tile&{engineData:Record<string,unknown>};
  const options={...DEFAULT_FACADE_OPTIONS,delight:null,signMask:null,style:createFacadeStyle(worldStyle("satellite")),signageIntensity:{value:2.15}};
  const sourceMaterial=f.source.material as Material,compiles:Material["onBeforeCompile"][]=[],keys:Material["customProgramCacheKey"][]=[];
  let currentCompile=sourceMaterial.onBeforeCompile,currentKey=sourceMaterial.customProgramCacheKey;
  Object.defineProperty(sourceMaterial,"onBeforeCompile",{configurable:true,get:()=>currentCompile,set:(f:Material["onBeforeCompile"])=>{currentCompile=f;compiles.push(f);}});
  Object.defineProperty(sourceMaterial,"customProgramCacheKey",{configurable:true,get:()=>currentKey,set:(f:Material["customProgramCacheKey"])=>{currentKey=f;keys.push(f);}});
  let transactions:ReturnType<typeof installTileTransactions>;
  const renderer={async parseTile(_bytes:ArrayBuffer,t:typeof tile){t.engineData.scene=f.scene;await transactions.process(f.scene,t,async(_original,lifetime)=>{const plugin=new FacadeTexturePlugin(options);await plugin.fetchData("/scene/buildings/data/data518.b3dm",{});await plugin.processTileModel(f.scene,t,lifetime);return()=>{};});},disposeTile(t:typeof tile){t.engineData.scene=null;}};
  transactions=installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(f.bytes))));
  vi.stubGlobal("OffscreenCanvas",class{constructor(readonly width:number,readonly height:number){}getContext(){return{drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(this.width*this.height*4).fill(150)})};}});
  const viewer=new TilesRenderer()as TilesRenderer&{setTileVisible(t:Tile,v:boolean):void},unload=new UnloadTilesPlugin()as UnloadTilesPlugin&{unloadTileFromGPU(s:Object3D,t:Tile):void};
  try{
    await(renderer.parseTile as unknown as(b:ArrayBuffer,t:Tile,e:string,u:string,s:AbortSignal)=>Promise<void>)(new ArrayBuffer(0),tile,"b3dm","data/data518.b3dm",new AbortController().signal);
    const group=f.scene.getObjectByName("crossing-commercial-corner")!,relief=f.scene.getObjectByName("crossing-frontage-surround")!;
    expect(group).toBeDefined();expect(relief).toBeDefined();
    const members=[...group.children],normalRefs=new Map<Mesh,Material>();
    for(const mesh of[f.source,...group.children,...relief.children])if(mesh instanceof Mesh){const normal=getCommercialCornerNormalMaterial(mesh)??getCrossingFrontageNormalMaterial(mesh);expect(normal,`Private normal for ${mesh.name}`).toBeDefined();normalRefs.set(mesh,normal!);}
    const owned=new Set<BufferGeometry|Material|Texture>(),privateNormals=new Set(normalRefs.values()),counts=new Map<object,number>();
    f.scene.traverse(o=>{if(!(o instanceof Mesh))return;owned.add(o.geometry);for(const m of[...(Array.isArray(o.material)?o.material:[o.material]),o.customDepthMaterial,o.customDistanceMaterial])if(m){owned.add(m);for(const value of Object.values(m))if(value instanceof Texture)owned.add(value);}});
    for(const resource of[...owned,...privateNormals]){counts.set(resource,0);resource.addEventListener("dispose"as never,(()=>counts.set(resource,counts.get(resource)!+1))as never);}
    const compile=sourceMaterial.onBeforeCompile,depth=f.source.customDepthMaterial,distance=f.source.customDistanceMaterial;
    for(let i=0;i<2;i++){
      viewer.setTileVisible(tile,true);viewer.setTileVisible(tile,false);unload.unloadTileFromGPU(f.scene,tile);
      expect(group.parent,"GPU eviction retains the commercial group").toBe(f.scene);expect(group.children).toEqual(members);expect(sourceMaterial.onBeforeCompile).toBe(compile);expect(f.source.customDepthMaterial).toBe(depth);expect(f.source.customDistanceMaterial).toBe(distance);
      for(const[mesh,normal]of normalRefs)expect(getCommercialCornerNormalMaterial(mesh)??getCrossingFrontageNormalMaterial(mesh),`GPU eviction retains ${mesh.name} normal`).toBe(normal);
      for(const normal of privateNormals)expect(counts.get(normal)).toBe(0);f.unchanged();viewer.setTileVisible(tile,true);
    }
    const beforeRelease=new Map(counts);viewer.setTileVisible(tile,false);renderer.disposeTile(tile);renderer.disposeTile(tile);
    expect(group.parent).toBeNull();expect(sourceMaterial.onBeforeCompile,"FIFO release restores the original tile shader, never a released commercial wrapper").toBe(compiles[0]);expect(sourceMaterial.customProgramCacheKey).toBe(keys[0]);expect(f.source.customDepthMaterial).toBeUndefined();expect(f.source.customDistanceMaterial).toBeUndefined();
    for(const[mesh]of normalRefs)expect(getCommercialCornerNormalMaterial(mesh)??getCrossingFrontageNormalMaterial(mesh)).toBeUndefined();
    for(const resource of owned)expect(counts.get(resource)!-beforeRelease.get(resource)!,"Unique parsed resource receives one logical disposal").toBe(1);for(const normal of privateNormals)expect(counts.get(normal)).toBe(1);
  }finally{renderer.disposeTile(tile);vi.unstubAllGlobals();f.scene.removeFromParent();viewer.dispose();}
},20000);
