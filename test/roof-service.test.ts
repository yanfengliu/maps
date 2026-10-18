/** Bound: pinned tile/atlas bytes and shipped Draco decode, installed B3DM/GLTF,
 * complete production facade plugin, finite geometry/contact/source preservation,
 * cache bytes, GPU-only unload and logical tile failure/release. Image decoding
 * is synthetic; full native appearance and motion are separate checks. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { B3DMLoader, TilesRenderer } from "3d-tiles-renderer";
import { UnloadTilesPlugin } from "3d-tiles-renderer/plugins";
import type { Tile } from "3d-tiles-renderer/core";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BufferAttribute, BufferGeometry, LoadingManager, Mesh, MeshStandardMaterial, Object3D, Raycaster, Texture, Triangle, Vector3 } from "three";
import { parseB3dm, parseGlb } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { addRoofService, prepareRoofService, roofServiceSourceForUrl } from "../src/scene/roof-service.js";
import { ROOF_SERVICE as R } from "../src/scene/roof-service-recipe.js";
import { createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { wholeByteAccounting } from "../src/scene/tile-memory.js";
import { installTileTransactions } from "../src/scene/tile-transaction.js";
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
async function source() {
  const bytes = await readFile(new URL("../data/scene/buildings/data/data521.b3dm", import.meta.url));
  expect(sha(bytes)).toBe("5a00849fec049c2e3349015cfef321f135109f6c180ef6de7825277f671b1f3a");
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
  const result: string[] = []; scene.traverse(o => { if (o instanceof Mesh && !o.name.startsWith("west-roof-service")) for (const a of [o.geometry.index, ...["position","normal","uv","_batchid"].map(n => o.geometry.getAttribute(n))]) if (a) result.push(sha(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength))); }); return result;
}
function release(scene: Object3D): void {
  const resources = new Set<{ dispose(): void }>(); scene.traverse(o => { if (o instanceof Mesh) { resources.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { resources.add(m); for (const v of Object.values(m)) if (v instanceof Texture) resources.add(v); } } }); for (const r of resources) r.dispose();
}
const options = () => ({ ...DEFAULT_FACADE_OPTIONS, delight:null, signMask:null, style:createFacadeStyle(worldStyle("satellite")), signageIntensity:{value:2.15} });
function pixels(bytes: Uint8Array): void {
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.from(bytes))));
  vi.stubGlobal("OffscreenCanvas",class {getContext(){return{drawImage(){},getImageData(){return{data:new Uint8ClampedArray([125,135,145,255])};}};}});
}
afterEach(()=>vi.unstubAllGlobals());
async function process(scene: Object3D, bytes: Uint8Array, cleanups: (()=>void)[]) {
  pixels(bytes); const plugin=new FacadeTexturePlugin(options());
  await plugin.fetchData("/scene/buildings/data/data521.b3dm",{});
  await plugin.processTileModel(scene,{content:{uri:R.tileUri}},{trackTexture(){},releaseTexture(t:Texture){t.dispose();},onRelease(c){cleanups.push(c);}});
  return scene.getObjectByName("west-roof-service-housings")!;
}
it("installs the complete finite bank before actual cache accounting, preserving source arrays and fan centers",async()=>{
  const f=await source(),original=arrays(f.scene),cleanups:(()=>void)[]=[],viewer=new TilesRenderer();
  try {
    expect(roofServiceSourceForUrl("/scene/buildings/data/data521.b3dm?q=1")).toBe(R);
    expect(roofServiceSourceForUrl("/scene/buildings/data/data521-other.b3dm")).toBeUndefined();
    const group=await process(f.scene,f.bytes,cleanups),data=group.userData.roofService;
    expect(arrays(f.scene)).toEqual(original);expect(group.children).toHaveLength(1);expect(data.housings).toHaveLength(13);expect(data.imageTextures).toBe(0);expect(data.beautyDraws).toBe(1);
    const mesh=group.children[0] as Mesh,geometry=mesh.geometry,material=mesh.material as MeshStandardMaterial;
    expect(material.map).toBeNull();expect(material.vertexColors).toBe(true);expect(mesh.castShadow&&mesh.receiveShadow).toBe(true);
    const measured=Object.values(geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0);expect(data.geometryBytes).toBe(measured);
    const actual=viewer as TilesRenderer&{calculateBytesUsed(t:Tile,s:Object3D):number};
    const account=wholeByteAccounting(actual.calculateBytesUsed.bind(actual));const withAssembly=account({} as Tile,f.scene);group.removeFromParent();const without=account({} as Tile,f.scene);f.scene.add(group);expect(withAssembly-without).toBe(measured);
    expect(data.housings.flatMap((h:{panels:{frontalCoverage:number;maximumProtrusion:number}[]})=>h.panels)).toHaveLength(26);
    for(const h of data.housings)for(const panel of h.panels){expect(panel.frontalCoverage).toBeLessThanOrEqual(.25);expect(panel.frontalCoverage).toBeGreaterThan(.12);expect(panel.maximumProtrusion).toBeLessThan(.09);}
    f.scene.updateMatrixWorld(true);
    // Every authored vertex must remain in one of the original thirteen
    // footprints plus 90 mm horizontally and 35 mm above its actual top.
    let photo!:Mesh;f.scene.traverse(o=>{if(o instanceof Mesh&&o!==mesh&&o.geometry.hasAttribute("uv"))photo=o;});
    const sourceTriangles=(faces:readonly number[])=>faces.map(face=>{const ids=photo.geometry.index!,p=photo.geometry.getAttribute("position");return new Triangle(...[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,ids.getX(face*3+k)).applyMatrix4(photo.matrixWorld)) as [Vector3,Vector3,Vector3]);});
    const domains=R.housings.map(h=>{const top=sourceTriangles(h.topFaces),all=sourceTriangles(h.faces);return{top,low:Math.min(...all.flatMap(t=>[t.a.y,t.b.y,t.c.y])),high:Math.max(...top.flatMap(t=>[t.a.y,t.b.y,t.c.y]))};});
    const p=geometry.getAttribute("position");
    for(let i=0;i<p.count;i++) {
      const v=new Vector3().fromBufferAttribute(p,i);
      const admitted=domains.some(d=>v.y>=d.low-.001&&v.y<=d.high+.035&&d.top.some(t=>{const flat=new Triangle(...[t.a,t.b,t.c].map(q=>q.clone().setY(0)) as [Vector3,Vector3,Vector3]);return flat.closestPointToPoint(v.clone().setY(0),new Vector3()).distanceTo(v.clone().setY(0))<=.0901;}));
      expect(admitted,`authored vertex ${i} outside thirteen source envelopes`).toBe(true);
    }
    // Open guards must leave the source fan centers as the first downward hit.
    for(const h of R.housings)for(const center of h.fanCenters){const ray=new Raycaster(new Vector3(center[0],center[1]+.1,center[2]),new Vector3(0,-1,0));const hits=ray.intersectObjects([photo,group],true);expect(hits[0]!.object).toBe(photo);expect(h.topFaces).toContain(hits[0]!.faceIndex);}
    const counts=new Map<object,number>();for(const r of [geometry,material])r.addEventListener("dispose",()=>counts.set(r,(counts.get(r)??0)+1));
    const unload=new UnloadTilesPlugin() as UnloadTilesPlugin&{unloadTileFromGPU(s:Object3D,t:Tile):void};
    for(let i=0;i<2;i++){expect(()=>unload.unloadTileFromGPU(f.scene,{} as Tile)).not.toThrow();expect(group.parent).toBe(f.scene);expect(group.children[0]).toBe(mesh);expect(arrays(f.scene)).toEqual(original);}
    release(f.scene);for(const c of cleanups.splice(0))c();expect(group.parent).toBeNull();expect([...counts.values()]).toEqual([3,3]);
  }finally{release(f.scene);for(const c of cleanups)c();viewer.dispose();}
},20000);
it("connects every actual fan-guard standoff to the source top and the triangulated guard",async()=>{
 const f=await source(),cleanups:(()=>void)[]=[];
 try{
  const group=await process(f.scene,f.bytes,cleanups),mesh=group.children[0] as Mesh,p=mesh.geometry.getAttribute("position");
  let photo!:Mesh;f.scene.traverse(o=>{if(o instanceof Mesh&&o!==mesh&&o.geometry.hasAttribute("uv"))photo=o;});f.scene.updateMatrixWorld(true);
  // Classify the actual short box triangles by their geometry. No constructor
  // part labels, reported height or nominal torus radius proves this contact.
  const triangles=Array.from({length:p.count/3},(_,i)=>{
   const points=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i*3+k));
   return{triangle:new Triangle(...points as[Vector3,Vector3,Vector3]),points,normal:new Triangle(...points as[Vector3,Vector3,Vector3]).getNormal(new Vector3()),edge:Math.max(points[0]!.distanceTo(points[1]!),points[1]!.distanceTo(points[2]!),points[2]!.distanceTo(points[0]!))};
  });
  const tops=triangles.filter(t=>t.normal.y>.999999&&t.edge<.02),posts:Vector3[][]=[];
  for(const t of tops){let post=posts.find(v=>v.some(a=>t.points.some(b=>a.distanceTo(b)<1e-6)));if(!post){post=[];posts.push(post);}for(const v of t.points)if(!post.some(q=>q.distanceTo(v)<1e-6))post.push(v);}
  expect(posts).toHaveLength(104);
  let contacts=0;
  for(const vertices of posts){
   expect(vertices).toHaveLength(4);const center=vertices.reduce((s,v)=>s.add(v),new Vector3()).divideScalar(4),ray=new Raycaster(new Vector3(center.x,center.y+.05,center.z),new Vector3(0,-1,0));
   const sourceY=ray.intersectObject(photo,true)[0]!.point.y;
   const smallHits=triangles.filter(t=>t.edge<.02).flatMap(t=>{const q=ray.ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,new Vector3());return q?[q.y]:[];});
   const guardHits=triangles.filter(t=>t.edge>=.02).flatMap(t=>{const q=ray.ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,new Vector3());return q&&q.y>sourceY+.01&&q.y<sourceY+.035?[q.y]:[];});
   expect(smallHits.length).toBeGreaterThanOrEqual(2);expect(guardHits.length).toBeGreaterThanOrEqual(2);
   expect(Math.abs(Math.min(...smallHits)-sourceY)).toBeLessThan(.00001);
   expect(Math.max(...smallHits)-Math.min(...guardHits),"actual guard/standoff overlap in metres").toBeGreaterThanOrEqual(.0005);contacts++;
  }
  expect(contacts).toBe(104);
 }finally{release(f.scene);for(const c of cleanups)c();}
},20000);
it("refuses finite source/UV/placement changes and leaves unrelated tiles alone",async()=>{
 const f=await source();pixels(f.bytes);let photo!:Mesh;f.scene.traverse(o=>{if(o instanceof Mesh&&o.geometry.hasAttribute("uv"))photo=o;});
 try {
  await expect(prepareRoofService(f.scene,R.tileUri,"wrong")).rejects.toThrow(/SHA-256/);
  const idx=photo.geometry.index!,vertex=idx.getX(1713*3),changes:[string,()=>void,()=>void][]=[];
  for(const name of ["position","normal","uv"]){const a=photo.geometry.getAttribute(name),x=a.getX(vertex);changes.push([name,()=>a.setX(vertex,x+.01),()=>a.setX(vertex,x)]);}
  const first=idx.getX(1713*3);changes.push(["index",()=>idx.setX(1713*3,first+1),()=>idx.setX(1713*3,first)]);
  const x=f.scene.position.x;changes.push(["placement",()=>{f.scene.position.x=x+.01;},()=>{f.scene.position.x=x;}]);
  const map=(photo.material as MeshStandardMaterial).map!;changes.push(["UV channel",()=>{map.channel=1;},()=>{map.channel=0;}]);
  for(const[name,change,restore]of changes){try{change();await expect(prepareRoofService(f.scene,R.tileUri,R.tileSha256),name).rejects.toThrow(/West roof service housings/);}finally{restore();}await expect(prepareRoofService(f.scene,R.tileUri,R.tileSha256)).resolves.toBeUndefined();}
  expect(()=>addRoofService(f.scene,R.tileUri,R.tileSha256)).toThrow(/logical tile owner/);
  expect(f.scene.getObjectByName("west-roof-service-housings")).toBeUndefined();
  const unrelated=new Object3D(),before=unrelated.children.slice();await prepareRoofService(unrelated,"data/unrelated.b3dm",undefined);expect(addRoofService(unrelated,"data/unrelated.b3dm",undefined)).toBe(false);expect(unrelated.children).toEqual(before);
  const plugin=new FacadeTexturePlugin(options());vi.stubGlobal("fetch",vi.fn(async()=>new Response(Uint8Array.of(1,2,3))));await expect(plugin.fetchData("/scene/buildings/data/data521.b3dm",{})).rejects.toThrow(/SHA-256/);
 }finally{release(f.scene);}
},20000);
it.each(["cancel","reject","transfer","replace"])("keeps the installed tile transaction's owned-resource lifetime on %s",async mode=>{
 const abort=new AbortController(),roots:Object3D[]=[],groups:Object3D[]=[],counts=new Map<object,number>(),tile={content:{uri:R.tileUri},engineData:{}} as Tile&{engineData:Record<string,unknown>};let transactions:ReturnType<typeof installTileTransactions>;
 const renderer={async parseTile(_bytes:ArrayBuffer,staged:typeof tile){const f=await source();roots.push(f.scene);staged.engineData.scene=f.scene;pixels(f.bytes);await transactions.process(f.scene,staged,async(_original,lifetime)=>{
  const plugin=new FacadeTexturePlugin(options());await plugin.fetchData("/scene/buildings/data/data521.b3dm",{});await plugin.processTileModel(f.scene,{content:{uri:R.tileUri}},lifetime);
  const group=f.scene.getObjectByName("west-roof-service-housings")!;groups.push(group);group.traverse(o=>{if(o instanceof Mesh)for(const r of [o.geometry,o.material as MeshStandardMaterial])r.addEventListener("dispose",()=>counts.set(r,(counts.get(r)??0)+1));});
  if(mode==="cancel")abort.abort();if(mode==="reject")throw Error("controlled post-assembly rejection");return()=>{};
 });},disposeTile(disposed:typeof tile){disposed.engineData.scene=null;}};
 transactions=installTileTransactions(renderer as unknown as TilesRenderer,()=>false);
 const run=()=> (renderer as unknown as{parseTile(b:ArrayBuffer,t:Tile,e:string,u:string,s:AbortSignal):Promise<void>}).parseTile(new ArrayBuffer(0),tile,"b3dm",R.tileUri,abort.signal);
 if(mode==="reject")await expect(run()).rejects.toThrow(/controlled/);else await run();if(mode==="transfer"||mode==="replace")renderer.disposeTile(tile);if(mode==="replace"){await run();renderer.disposeTile(tile);}
 expect(groups).toHaveLength(mode==="replace"?2:1);expect([...counts.values()]).toHaveLength(groups.length*2);expect([...counts.values()].every(n=>n===1)).toBe(true);for(const group of groups)expect(group.parent).toBeNull();for(const root of roots)expect(root.getObjectByName("west-roof-service-housings")).toBeUndefined();
},20000);