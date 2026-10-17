/** Bound: actual pinned tile, shipped decoder/installed loader, production facade
 * hook and downstream cutout. Synthetic image pixels; no native/FPS claim. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { B3DMLoader, TilesRenderer } from "3d-tiles-renderer";
import { UnloadTilesPlugin } from "3d-tiles-renderer/plugins";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BufferAttribute, BufferGeometry, LoadingManager, Material, Mesh, Object3D, Raycaster, ShaderLib, SpotLight, Texture, Triangle, Vector3 } from "three";
import { parseB3dm, parseGlb } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { EAST_FRONTAGE as R, eastFrontageFloor, getPeripheralFrontageNormalMaterial } from "../src/scene/peripheral-frontage.js";
import { PERIPHERAL_MOUNTED_LIGHT as S } from "../src/scene/peripheral-mounted-light-recipe.js";
import { applyFacadeStyle, createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { decodeMesh } from "../src/world/mesh.js";
import { buildingSections } from "../src/scene/cutout-sections.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";
import type { Tile } from "3d-tiles-renderer/core";

const sha=(b:Uint8Array):string=>createHash("sha256").update(b).digest("hex");
async function fixture(){
 const bytes=await readFile(new URL("../data/scene/buildings/data/data498.b3dm",import.meta.url));expect(sha(bytes)).toBe(S.tileSha256);
 const tile=parseB3dm(bytes),glb=parseGlb(tile.glb),decoded=new Map<string,Awaited<ReturnType<typeof decodePrimitive>>>();
 for(const primitive of glb.json.meshes![0]!.primitives){const view=glb.json.bufferViews![primitive.extensions!.KHR_draco_mesh_compression!.bufferView]!;decoded.set(sha(glb.binary!.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength)),await decodePrimitive(glb.json,glb.binary!,primitive,true));}
 const manager=new LoadingManager(),loader=new GLTFLoader(manager);
 loader.setDRACOLoader({preload(){},decodeDracoFile(buffer:ArrayBuffer,done:(g:BufferGeometry)=>void){const d=decoded.get(sha(new Uint8Array(buffer)))!;const g=new BufferGeometry();g.setAttribute("position",new BufferAttribute(d.positions.slice(),3));g.setAttribute("normal",new BufferAttribute(d.surface!.normals.slice(),3));g.setAttribute("_batchid",new BufferAttribute(d.batchIds!.slice(),1));if(d.surface!.uv)g.setAttribute("uv",new BufferAttribute(d.surface!.uv.slice(),2));g.setIndex(new BufferAttribute(d.surface!.indices.slice(),1));done(g);}}as never);
 loader.register(()=>({name:"EXT_texture_webp",loadTexture:async()=>{const t=new Texture({width:1,height:1}as never);t.flipY=false;return t;}}));manager.addHandler(/path\.gltf$/,loader);
 const scene=(await new B3DMLoader(manager).parse(Uint8Array.from(bytes).buffer)).scene;scene.updateMatrixWorld(true);return{bytes,scene};
}
const origin=new Vector3(...S.mount.origin),right=new Vector3(...S.mount.right),up=new Vector3(...S.mount.up),normal=new Vector3(...S.mount.normal);
const at=(x:number,y:number,d:number):Vector3=>origin.clone().addScaledVector(right,x).addScaledVector(up,y-origin.y).addScaledVector(normal,d);
const point=(x:number,d:number):[number,number]=>{const p=at(x,25.7,d);return[p.x,p.z];};
function originalAttributes(scene:Object3D):()=>void {
 const hash=(a:BufferAttribute):string=>sha(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));
 const added:Record<string,readonly[string,string]>={
  c28386dfa203ddacd68b8dda635c7c3095064a36dda94429931044eb8f2bfa4f:["331164806abbd8c42e13fae91b7fd8e4264d67ea3b81d9f84ac1ba6939800bed","fb0cf69e5747ecadd4f196eea2ed293bb7a219bc3e4df90bbb78feb1c6f87f6e"],
  bffa7fd30a33eb549a3f8fc507d39d721e8a56b88517ca85a6d442dce7fc1388:["81bdbbcc715b42b2a85d81d394f2e4e8d944782b2e5dc6c2e65c8c4178409a2f","2f0e91337dcb3244bb38a3ace7776e289829fa94f444c69fa40eb54c7550e38b"],
 };
 const checks:(()=>void)[]=[];
 scene.traverse(o=>{if(!(o instanceof Mesh))return;const geometry=o.geometry,index=geometry.index!,entries=Object.entries(geometry.attributes).map(([name,raw])=>{const attribute=raw as BufferAttribute;return{name,attribute,array:attribute.array,constructor:attribute.array.constructor,length:attribute.array.length,itemSize:attribute.itemSize,normalized:attribute.normalized,hash:hash(attribute)};}),indexHash=hash(index),indexArray=index.array;
  checks.push(()=>{expect(scene.getObjectById(o.id)).toBe(o);expect(o.geometry).toBe(geometry);expect(geometry.index).toBe(index);expect(index.array).toBe(indexArray);expect(hash(index)).toBe(indexHash);expect(Object.keys(geometry.attributes).sort()).toEqual([...entries.map(e=>e.name),"mapsEmitterGroup","mapsFloorParams"].sort());
   for(const e of entries){const a=geometry.getAttribute(e.name);expect(a).toBe(e.attribute);expect(a.array).toBe(e.array);expect(a.array.constructor).toBe(e.constructor);expect(a.array.length).toBe(e.length);expect(a.itemSize).toBe(e.itemSize);expect(a.normalized).toBe(e.normalized);expect(hash(a as BufferAttribute)).toBe(e.hash);}
   for(const[name,itemSize,pin]of[["mapsEmitterGroup",1,added[indexHash]![0]],["mapsFloorParams",3,added[indexHash]![1]]]as const){const a=geometry.getAttribute(name);expect(a.array).toBeInstanceOf(Float32Array);expect(a.itemSize).toBe(itemSize);expect(a.count).toBe(geometry.getAttribute("position").count);expect(hash(a as BufferAttribute)).toBe(pin);}
  });
 });return()=>{for(const check of checks)check();};
}
function compile(material:Material,kind:"standard"|"depth"|"distanceRGBA"|"normal"){const lib=ShaderLib[kind],shader={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};material.onBeforeCompile(shader as never,{}as never);return shader;}
function area(p:number[][]):number{return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length]!;return s+a[0]!*b[1]!-a[1]!*b[0]!;},0))/2;}
function clip(p:number[][],axis:number,edge:number,sign:number):number[][]{const out:number[][]=[];for(let i=0;i<p.length;i++){const a=p[i]!,b=p[(i+1)%p.length]!,u=sign*(a[axis]!-edge),v=sign*(b[axis]!-edge);if(u>=0)out.push(a);if(u*v<0)out.push(a.map((x,k)=>x+(b[k]!-x)*u/(u-v)));}return out;}

it("constructs the finite bay through the installed source/plugin and retains it through GPU eviction",async()=>{
 const f=await fixture(),checkOriginal=originalAttributes(f.scene),options={...DEFAULT_FACADE_OPTIONS,delight:null,signMask:null,style:createFacadeStyle(worldStyle("satellite")),signageIntensity:{value:2.15}};
 const tile={content:{uri:S.tileUri},engineData:{}}as Tile&{engineData:Record<string,unknown>};let transactions:ReturnType<typeof installTileTransactions>;
 const renderer={async parseTile(_bytes:ArrayBuffer,t:typeof tile){t.engineData.scene=f.scene;await transactions.process(f.scene,t,async(_original,lifetime)=>{const plugin=new FacadeTexturePlugin(options);await plugin.fetchData("/scene/buildings/data/data498.b3dm",{});await plugin.processTileModel(f.scene,t,lifetime);return()=>{};});},disposeTile(t:typeof tile){t.engineData.scene=null;}};
 transactions=installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(f.bytes))));vi.stubGlobal("OffscreenCanvas",class{getContext(){return{drawImage(){},getImageData(){return{data:new Uint8ClampedArray([125,135,145,255])};}};}});
 const viewer=new TilesRenderer()as TilesRenderer&{setTileVisible(t:Tile,v:boolean):void},unload=new UnloadTilesPlugin()as UnloadTilesPlugin&{unloadTileFromGPU(s:Object3D,t:Tile):void};
 try{
  await(renderer as unknown as{parseTile(b:ArrayBuffer,t:Tile,e:string,u:string,s:AbortSignal):Promise<void>}).parseTile(new ArrayBuffer(0),tile,"b3dm",S.tileUri,new AbortController().signal);
  const group=f.scene.getObjectByName(R.name)!;expect(group).toBeDefined();expect(group.children).toHaveLength(4);checkOriginal();
  const cost=group.userData.peripheralFrontage;expect(cost).toMatchObject({beautyDraws:4,bays:3,imageTextures:0,localLights:0,approximateInterior:true});expect(cost.triangles).toBeLessThan(5736);expect(cost.geometryBytes).toBeLessThan(1012152);console.log("FRONTAGE_COST "+JSON.stringify(cost));
  group.updateWorldMatrix(true,true);
  const all=new Set<string>();for(const mesh of group.children as Mesh[]){const g=mesh.geometry,p=g.getAttribute("position"),n=g.getAttribute("normal"),ids=g.getAttribute("_batchid");for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i+k)),t=new Triangle(v[0]!,v[1]!,v[2]!);expect(t.getArea()).toBeGreaterThan(1e-7);const key=v.map(v=>v.toArray().join(",")).sort().join("/");expect(all.has(key)).toBe(false);all.add(key);expect(t.getNormal(new Vector3()).distanceTo(new Vector3().fromBufferAttribute(n,i))).toBeLessThan(4e-6);for(let k=0;k<3;k++)expect(ids.getX(i+k)).toBe(0);}}
  // Reject the old coincident foundation/source face below the finite opening.
  const stone=group.getObjectByName(`${R.name}:stone`)as Mesh,sp=stone.geometry.getAttribute("position");
  for(let i=0;i<sp.count;i+=3){const v=[0,1,2].map(k=>new Vector3().fromBufferAttribute(sp,i+k).sub(origin)),coincident=v.every(p=>Math.abs(p.dot(normal))<2e-4),below=v.some(p=>p.dot(up)+origin.y<eastFrontageFloor(p.dot(right))-.001);expect(coincident&&below).toBe(false);}
  const source:Mesh[]=[];f.scene.traverse(o=>{if(o instanceof Mesh&&o.geometry.hasAttribute("uv"))source.push(o);});expect(source).toHaveLength(1);
  for(const [mat,kind]of[[source[0]!.material,"standard"],[source[0]!.customDepthMaterial,"depth"],[source[0]!.customDistanceMaterial,"distanceRGBA"],[getPeripheralFrontageNormalMaterial(source[0]!),"normal"]]as const){const shader=compile(mat as Material,kind);expect(shader.fragmentShader).toContain("mapsEastOpening");expect(shader.fragmentShader).toContain("p.y<28.98");expect(shader.uniforms).toHaveProperty("mapsEastProcedural",options.style.procedural);}
  for(const mesh of group.children as Mesh[])for(const [mat,kind]of[[mesh.material,"standard"],[mesh.customDepthMaterial,"depth"],[mesh.customDistanceMaterial,"distanceRGBA"],[getPeripheralFrontageNormalMaterial(mesh),"normal"]]as const)expect(compile(mat as Material,kind).fragmentShader).toContain("if(mapsEastProcedural>0.5)discard");
  // The complete physical shell backs each sightline; no source wall is used
  // as the rear. Rays through the glass find authored opaque back/side returns.
  const opaque=(group.children as Mesh[]).filter(m=>!m.name.endsWith(":glazing"));
  for(const x of[-1.8,0,1.8]){const ray=new Raycaster(at(x,27,1),normal.clone().negate(),0,5);expect(ray.intersectObjects(opaque,false).some(h=>h.object.name.endsWith(":room"))).toBe(true);}
  const lamp=f.scene.getObjectByName("peripheral-east-mounted-light:downlight")as SpotLight;const ray=new Raycaster(lamp.position.clone(),lamp.target.position.clone().sub(lamp.position).normalize(),.001,lamp.position.distanceTo(lamp.target.position)-.02);expect(ray.intersectObjects(opaque,false)).toHaveLength(0);
  const sections=buildingSections(f.scene,S.tileUri);expect(sections.every(s=>s.geometry.getAttribute("position").count>0)).toBe(true);for(const section of sections)section.geometry.dispose();
  const children=[...group.children],disposed=new Map<object,number>();for(const mesh of group.children as Mesh[])for(const resource of[mesh.geometry,mesh.material as Material])resource.addEventListener("dispose",()=>disposed.set(resource,(disposed.get(resource)??0)+1));
  for(let i=0;i<2;i++){viewer.setTileVisible(tile,true);viewer.setTileVisible(tile,false);expect(()=>unload.unloadTileFromGPU(f.scene,tile)).not.toThrow();expect(group.parent).toBe(f.scene);expect(group.children).toEqual(children);checkOriginal();viewer.setTileVisible(tile,true);applyFacadeStyle(options.style,worldStyle("cartographic"));expect(lamp.intensity).toBe(0);applyFacadeStyle(options.style,worldStyle("satellite"));expect(lamp.intensity).toBe(60);}
  viewer.setTileVisible(tile,false);renderer.disposeTile(tile);expect(group.parent).toBeNull();expect(getPeripheralFrontageNormalMaterial(source[0]!)).toBeUndefined();expect([...disposed.values()]).toEqual(Array(8).fill(3));
 }finally{vi.unstubAllGlobals();f.scene.removeFromParent();viewer.dispose();}
},20000);

it("grounds the whole foundation and narrow connection in actual terrain and matches the complete sidewalk edge",async()=>{
 const terrainBytes=await readFile(new URL("../data/scene/terrain.mesh",import.meta.url));expect(sha(terrainBytes)).toBe("c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773");const terrain=decodeMesh(terrainBytes);
 // Sum disjoint actual TIN intersections with this complete rectangle. Each
 // contributing facet must lie between foundation bottom and finished floor.
 for(const bounds of[{minX:-12,maxX:2.4,minD:-1.95,maxD:.14},{minX:-.7,maxX:.7,minD:.14,maxD:2.7}]){
  let covered=0;for(let f=0;f<terrain.indices.length/3;f++){let polygon=[0,1,2].map(k=>{const world=new Vector3().fromArray(terrain.positions,terrain.indices[f*3+k]!*3),d=world.sub(origin);return[d.dot(right),d.dot(normal),d.dot(up)+origin.y];});if(polygon.every(p=>p[0]!<bounds.minX)||polygon.every(p=>p[0]!>bounds.maxX)||polygon.every(p=>p[1]!<bounds.minD)||polygon.every(p=>p[1]!>bounds.maxD))continue;for(const[axis,edge,sign]of[[0,bounds.minX,1],[0,bounds.maxX,-1],[1,bounds.minD,1],[1,bounds.maxD,-1]])polygon=clip(polygon,axis!,edge!,sign!);if(polygon.length<3)continue;const a=area(polygon);if(a<1e-10)continue;for(const p of polygon){expect(p[2]).toBeGreaterThan(21.95);expect(p[2]).toBeLessThan(eastFrontageFloor(p[0]!));}covered+=a;}
  expect(covered).toBeCloseTo((bounds.maxX-bounds.minX)*(bounds.maxD-bounds.minD),7);
 }
 const bytes=await readFile(new URL("../data/scene/pavements.mesh",import.meta.url));expect(sha(bytes)).toBe(S.receiver.sha256);const pavement=decodeMesh(bytes);
 for(const x of[-.7,-.6389166585750743,0,.7]){const world=at(x,eastFrontageFloor(x),2.7);const matches=[263079,263078].map(face=>{const v=[0,1,2].map(k=>new Vector3().fromArray(pavement.positions,pavement.indices[face*3+k]!*3));return new Triangle(v[0]!,v[1]!,v[2]!);}).filter(t=>{const p=t.closestPointToPoint(world,new Vector3());return Math.hypot(p.x-world.x,p.z-world.z)<2e-5;});expect(matches.length).toBeGreaterThan(0);expect(Math.min(...matches.map(t=>t.closestPointToPoint(world,new Vector3()).distanceTo(world)))).toBeLessThan(2e-5);}
 expect(point(-.7,2.7)[0]).toBeLessThan(point(.7,2.7)[0]);
},20000);
