/** Bound: pinned data503, shipped decoder/installed B3DM+GLTF loader and actual
 * production facade hook. Photo boxes were audited from the original atlas.
 * Synthetic decoded image pixels; no native, continuous stability or FPS claim. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { B3DMLoader, TilesRenderer } from "3d-tiles-renderer";
import { UnloadTilesPlugin } from "3d-tiles-renderer/plugins";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BufferAttribute, BufferGeometry, LoadingManager, Material, Mesh, Object3D, Raycaster, ShaderLib, Texture, Triangle, Vector2, Vector3 } from "three";
import { parseB3dm, parseGlb } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { getUpperWindowNormalMaterial, prepareUpperWindows } from "../src/scene/upper-windows.js";
import { applyFacadeStyle, createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";
import type { Tile } from "3d-tiles-renderer/core";

const digest="e543a9fdf48babf505cc196b9c76d610cfcd6a3efb6d24198d7c432d351ea54d",uri="data/data503.b3dm",gml="bldg_b36b808a-74a2-4853-af2d-58b14db52194";
// Independent audited original2048px photo edges, including antialiasing. These
// are the acceptance input, not dimensions imported from the authored recipe.
const photoBoxes=[[36,958,45,968],[78,959,87,969],[36,982,45,992],[78,983,87,993],[36,1006,45,1016],[78,1007,87,1017],[36,1030,45,1040],[78,1031,87,1041],[36,1053,45,1063],[78,1054,87,1064],[36,1077,45,1087],[78,1078,87,1088]] as const;
const sha=(b:Uint8Array):string=>createHash("sha256").update(b).digest("hex");
const hash=(a:BufferAttribute):string=>sha(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));
async function fixture(){
 const bytes=await readFile(new URL("../data/scene/buildings/data/data503.b3dm",import.meta.url)).catch(cause=>{throw Error(`Upper-window tests need reviewed data/scene/buildings/data/data503.b3dm. Restore the reviewed scene cache, or prepare npm run data:fetch and npm run data:scene then review changed source. ${String(cause)}`);});expect(sha(bytes)).toBe(digest);
 const tile=parseB3dm(bytes),glb=parseGlb(tile.glb),decoded=new Map<string,Awaited<ReturnType<typeof decodePrimitive>>>();
 for(const primitive of glb.json.meshes![0]!.primitives){const v=glb.json.bufferViews![primitive.extensions!.KHR_draco_mesh_compression!.bufferView]!;decoded.set(sha(glb.binary!.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength)),await decodePrimitive(glb.json,glb.binary!,primitive,true));}
 const manager=new LoadingManager(),loader=new GLTFLoader(manager);
 loader.setDRACOLoader({preload(){},decodeDracoFile(buffer:ArrayBuffer,done:(g:BufferGeometry)=>void){const d=decoded.get(sha(new Uint8Array(buffer)))!,g=new BufferGeometry();g.setAttribute("position",new BufferAttribute(d.positions.slice(),3));g.setAttribute("normal",new BufferAttribute(d.surface!.normals.slice(),3));g.setAttribute("_batchid",new BufferAttribute(d.batchIds!.slice(),1));if(d.surface!.uv)g.setAttribute("uv",new BufferAttribute(d.surface!.uv.slice(),2));g.setIndex(new BufferAttribute(d.surface!.indices.slice(),1));done(g);}}as never);
 loader.register(()=>({name:"EXT_texture_webp",loadTexture:async()=>{const t=new Texture({width:1,height:1}as never);t.flipY=false;return t;}}));manager.addHandler(/path\.gltf$/,loader);
 const scene=(await new B3DMLoader(manager).parse(Uint8Array.from(bytes).buffer)).scene;scene.updateMatrixWorld(true);let source:Mesh|undefined;scene.traverse(o=>{if(o instanceof Mesh&&o.geometry.hasAttribute("uv"))source=o;});if(!source)throw Error("Pinned tile has no photographic source");
 const p=source.geometry.getAttribute("position"),index=source.geometry.index!,uv=source.geometry.getAttribute("uv"),indices=[0,1,2].map(k=>index.getX(2016*3+k)),points=indices.map(i=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(source!.matrixWorld)),normal=new Triangle(points[0]!,points[1]!,points[2]!).getNormal(new Vector3());
 const toPhoto=(point:Vector3):Vector2=>{const w=Triangle.getBarycoord(point,points[0]!,points[1]!,points[2]!,new Vector3())!;return new Vector2(...[0,1].map(k=>indices.reduce((sum,id,i)=>sum+w.getComponent(i)*uv.getComponent(id,k),0)*2048) as [number,number]);};
 const fromPhoto=(x:number,y:number,d:number):Vector3=>{const t=Triangle.getBarycoord(new Vector3(x/2048,y/2048,0),...indices.map(id=>new Vector3(uv.getX(id),uv.getY(id),0))as[Vector3,Vector3,Vector3],new Vector3())!;return points.reduce((p,v,i)=>p.addScaledVector(v,t.getComponent(i)),new Vector3()).addScaledVector(normal,d);};
 return{bytes,scene,source,normal,toPhoto,fromPhoto};
}
function preserve(scene:Object3D):()=>void {
 const checks:(()=>void)[]=[];scene.traverse(o=>{if(!(o instanceof Mesh))return;const g=o.geometry,index=g.index!,indexArray=index.array,indexHash=hash(index),indexType=index.array.constructor,indexSize=index.itemSize,indexNormalized=index.normalized,attrs=Object.entries(g.attributes).map(([name,raw])=>{const a=raw as BufferAttribute;return{name,a,array:a.array,kind:a.array.constructor,length:a.array.length,itemSize:a.itemSize,normalized:a.normalized,sha:hash(a)};});checks.push(()=>{
  expect(scene.getObjectById(o.id)).toBe(o);expect(o.geometry).toBe(g);expect(g.index).toBe(index);expect(index.array).toBe(indexArray);expect(index.array.constructor).toBe(indexType);expect(index.itemSize).toBe(indexSize);expect(index.normalized).toBe(indexNormalized);expect(hash(index)).toBe(indexHash);
  for(const e of attrs){const a=g.getAttribute(e.name);expect(a).toBe(e.a);expect(a.array).toBe(e.array);expect(a.array.constructor).toBe(e.kind);expect(a.array.length).toBe(e.length);expect(a.itemSize).toBe(e.itemSize);expect(a.normalized).toBe(e.normalized);expect(hash(a as BufferAttribute)).toBe(e.sha);}
  expect(Object.keys(g.attributes).filter(n=>!attrs.some(a=>a.name===n)).sort()).toEqual(["mapsEmitterGroup","mapsFloorParams"]);
  for(const[name,size]of[["mapsEmitterGroup",1],["mapsFloorParams",3]]as const){const a=g.getAttribute(name);expect(a.array).toBeInstanceOf(Float32Array);expect(a.itemSize).toBe(size);expect(a.count).toBe(g.getAttribute("position").count);expect(a.normalized).toBe(false);}
  const groups=g.getAttribute("mapsEmitterGroup");for(let i=0;i<groups.count;i++)expect(groups.getX(i)).toBe(0);
 });});return()=>checks.forEach(c=>c());
}
function compile(material:Material,kind:"standard"|"depth"|"distanceRGBA"|"normal"){const lib=ShaderLib[kind],shader={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};material.onBeforeCompile(shader as never,{}as never);return shader;}

it("matches audited photo size/sashes with closed Float32 shells through production and survives actual GPU unload/return",async()=>{
 const f=await fixture(),unchanged=preserve(f.scene),options={...DEFAULT_FACADE_OPTIONS,delight:null,signMask:null,style:createFacadeStyle(worldStyle("satellite")),signageIntensity:{value:2.15}};
 const tile={content:{uri},engineData:{}}as Tile&{engineData:Record<string,unknown>};let transactions:ReturnType<typeof installTileTransactions>;
 const renderer={async parseTile(_bytes:ArrayBuffer,t:typeof tile){t.engineData.scene=f.scene;await transactions.process(f.scene,t,async(_original,lifetime)=>{const plugin=new FacadeTexturePlugin(options);await plugin.fetchData("/scene/buildings/"+uri,{});await plugin.processTileModel(f.scene,t,lifetime);return()=>{};});},disposeTile(t:typeof tile){t.engineData.scene=null;}};
 transactions=installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(f.bytes))));vi.stubGlobal("OffscreenCanvas",class{getContext(){return{drawImage(){},getImageData(){return{data:new Uint8ClampedArray([125,135,145,255])};}};}});
 const viewer=new TilesRenderer()as TilesRenderer&{setTileVisible(t:Tile,v:boolean):void},unload=new UnloadTilesPlugin()as UnloadTilesPlugin&{unloadTileFromGPU(s:Object3D,t:Tile):void};
 try {
  await(renderer as unknown as{parseTile(b:ArrayBuffer,t:Tile,e:string,u:string,s:AbortSignal):Promise<void>}).parseTile(new ArrayBuffer(0),tile,"b3dm",uri,new AbortController().signal);
  const group=f.scene.getObjectByName("jinnan-upper-windows")!;expect(group).toBeDefined();expect(group.children).toHaveLength(4);unchanged();group.updateWorldMatrix(true,true);
  expect(group.userData.upperWindows).toMatchObject({beautyDraws:4,imageTextures:0,localLights:0,windows:photoBoxes.length,storeys:9,approximateInterior:true,sourceFaces:[2012,2016,2017]});console.log("UPPER_WINDOW_COST "+JSON.stringify(group.userData.upperWindows));
  const stone=group.getObjectByName("jinnan-upper-windows:stone")as Mesh,metal=group.getObjectByName("jinnan-upper-windows:metal")as Mesh,opaque=(group.children as Mesh[]).filter(m=>!m.name.endsWith(":glazing"));
  const bounds=photoBoxes.map(()=>({minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,vertices:0}));
  const triangles=new Set<string>();for(const mesh of group.children as Mesh[]){const p=mesh.geometry.getAttribute("position"),n=mesh.geometry.getAttribute("normal");expect(p.array).toBeInstanceOf(Float32Array);for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i+k)),t=new Triangle(v[0]!,v[1]!,v[2]!);expect(t.getArea()).toBeGreaterThan(1e-7);expect(t.getNormal(new Vector3()).distanceTo(new Vector3().fromBufferAttribute(n,i))).toBeLessThan(6e-6);const key=v.map(p=>p.toArray().join(",")).sort().join("/");expect(triangles.has(key)).toBe(false);triangles.add(key);}
   if(mesh===stone)for(let i=0;i<p.count;i++){const world=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),uv=f.toPhoto(world),which=photoBoxes.map(([a,b,c,d])=>Math.hypot(uv.x-(a+c)/2,uv.y-(b+d)/2)).reduce((best,d,i,arr)=>d<arr[best]!?i:best,0),bound=bounds[which]!;bound.vertices++;bound.minX=Math.min(bound.minX,uv.x);bound.maxX=Math.max(bound.maxX,uv.x);bound.minY=Math.min(bound.minY,uv.y);bound.maxY=Math.max(bound.maxY,uv.y);}
  }
  for(const[i,box]of photoBoxes.entries()){const bound=bounds[i]!;expect(bound.vertices).toBeGreaterThan(0);for(const[actual,expected]of[[bound.minX,box[0]],[bound.minY,box[1]],[bound.maxX,box[2]],[bound.maxY,box[3]]])expect(Math.abs(actual!-expected!),`source-photo boundary ${i}`).toBeLessThan(.003);
   const x=(box[0]+box[2])/2,y=(box[1]+box[3])/2;
   // Sample nine parallel rear sightlines per window. The old
   // full-height divider is forbidden in the clear upper part of each sash.
   for(const dx of[-2,0,2])for(const dy of[-2,0,2]){const ray=new Raycaster(f.fromPhoto(x+dx,y+dy,2),f.normal.clone().negate(),0,4);expect(ray.intersectObjects(opaque,false).some(h=>h.object.name.endsWith(":room"))).toBe(true);}
   const clearRay=new Raycaster(f.fromPhoto(x,y-1,1),f.normal.clone().negate(),0,2);expect(clearRay.intersectObject(metal,false),`no invented vertical divider ${i}`).toHaveLength(0);
   // Sill-to-glass setback is visible geometry, not only a fragment predicate.
   const glass=group.getObjectByName("jinnan-upper-windows:glazing")as Mesh,hits=new Raycaster(f.fromPhoto(x,y-1,1),f.normal.clone().negate(),0,2).intersectObject(glass,false);expect(hits.length).toBeGreaterThan(0);expect(hits[0]!.distance).toBeCloseTo(1.28,4);
  }
  let opening:string|undefined;for(const[mat,kind]of[[f.source.material,"standard"],[f.source.customDepthMaterial,"depth"],[f.source.customDistanceMaterial,"distanceRGBA"],[getUpperWindowNormalMaterial(f.source),"normal"]]as const){const shader=compile(mat as Material,kind),code=shader.fragmentShader.match(/vec3 mapsUpperLocal[\s\S]*?bool mapsUpperOpening[^\n]*/)?.[0];expect(code).toContain("abs(p.z)<0.002");expect(shader.fragmentShader).toContain("abs(mapsUpperBatch-16.0)<0.1");expect(shader.uniforms).toHaveProperty("mapsUpperProcedural",options.style.procedural);if(opening)expect(code).toBe(opening);else opening=code;}
  for(const mesh of group.children as Mesh[])for(const[mat,kind]of[[mesh.material,"standard"],[mesh.customDepthMaterial,"depth"],[mesh.customDistanceMaterial,"distanceRGBA"],[getUpperWindowNormalMaterial(mesh),"normal"]]as const)expect(compile(mat as Material,kind).fragmentShader).toContain("if(mapsUpperProcedural>0.5)discard");
  const children=[...group.children],disposed=new Map<object,number>(),normalDisposed=new Map<object,number>();for(const mesh of group.children as Mesh[]){for(const resource of[mesh.geometry,mesh.material as Material])resource.addEventListener("dispose",()=>disposed.set(resource,(disposed.get(resource)??0)+1));const n=getUpperWindowNormalMaterial(mesh)!;n.addEventListener("dispose",()=>normalDisposed.set(n,(normalDisposed.get(n)??0)+1));}
  for(let i=0;i<2;i++){viewer.setTileVisible(tile,true);viewer.setTileVisible(tile,false);unload.unloadTileFromGPU(f.scene,tile);expect(group.parent).toBe(f.scene);expect(group.children).toEqual(children);unchanged();viewer.setTileVisible(tile,true);applyFacadeStyle(options.style,worldStyle("cartographic"));expect(options.style.procedural.value).toBe(1);applyFacadeStyle(options.style,worldStyle("satellite"));expect(options.style.procedural.value).toBe(0);}
  viewer.setTileVisible(tile,false);renderer.disposeTile(tile);expect(group.parent).toBeNull();expect(getUpperWindowNormalMaterial(f.source)).toBeUndefined();expect([...disposed.values()]).toEqual(Array(8).fill(3));expect([...normalDisposed.values()]).toEqual(Array(4).fill(1));
 }finally{vi.unstubAllGlobals();f.scene.removeFromParent();viewer.dispose();}
},20000);

it("refuses wrong source bytes, metadata, UV orientation, original faces and parser placement",async()=>{
 const f=await fixture(),scene=f.scene as Object3D&{batchTable:{getDataFromId(id:number):Record<string,unknown>}},table=scene.batchTable,read=table.getDataFromId.bind(table),map=(f.source.material as import("three").MeshStandardMaterial).map!,uv=f.source.geometry.getAttribute("uv"),old=uv.getX(6048);
 expect(read(16)["gml_id"]).toBe(gml);expect(read(16)["bldg:storeysAboveGround"]).toBe(9);expect(()=>prepareUpperWindows(scene,uri,"0".repeat(64))).toThrow("SHA-256");
 table.getDataFromId=id=>({...read(id),"bldg:storeysAboveGround":8});expect(()=>prepareUpperWindows(scene,uri,digest)).toThrow("GML/floor metadata");table.getDataFromId=read;
 map.flipY=true;expect(()=>prepareUpperWindows(scene,uri,digest)).toThrow("UV0 orientation");map.flipY=false;
 uv.setX(6048,old+.001);expect(()=>prepareUpperWindows(scene,uri,digest)).toThrow("original UV");uv.setX(6048,old);
 scene.position.x=.01;expect(()=>prepareUpperWindows(scene,uri,digest)).toThrow("parser placement/plane");scene.position.x=0;expect(()=>prepareUpperWindows(scene,uri,digest)).not.toThrow();
});

it.each([
 ["data/data488.b3dm","6960fa916ea7c4702f423ac8f52ab0cfe53963f3846624dbb1625887796ec8e1"],
 ["data/data498.b3dm","979ab194aa165391e058e1b3b0b3b37ea5c3d64dfc5f5353e61922f9c97ead55"],
 ["data/data503.b3dm","e543a9fdf48babf505cc196b9c76d610cfcd6a3efb6d24198d7c432d351ea54d"],
 ["data/data518.b3dm","5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b"],
])("reports the actual HTTP/byte failure, exact pin and audit recovery for %s",async(source,pin)=>{
 const plugin=new FacadeTexturePlugin({...DEFAULT_FACADE_OPTIONS,style:createFacadeStyle(worldStyle("satellite")),signageIntensity:{value:0}}),url=`http://fixture/scene/buildings/${source}`,bytes=Uint8Array.of(1,2,3);
 const fetch=vi.fn(async()=>new Response("unavailable",{status:503}));vi.stubGlobal("fetch",fetch);
 try {
  await expect(plugin.fetchData(url,{})).rejects.toThrow(`Facade source ${source} could not load (HTTP 503). Run npm run data:scene and recheck the served tile.`);
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockImplementation(async()=>new Response(bytes));
  const result=await plugin.fetchData(url,{})!.catch(error=>error as Error);expect(result).toBeInstanceOf(Error);
  const message=(result as Error).message;expect(message).toContain(`Facade source ${source} returned different bytes: SHA-256 ${sha(bytes)}; expected ${pin}.`);
  expect(message).toContain("Re-audit this tile's source GML/UV regions and mounted facade details");expect(message).toContain("signage, lights or openings");expect(plugin.stats().error).toContain(message);expect(fetch).toHaveBeenCalledTimes(2);
 }finally{vi.unstubAllGlobals();}
});

