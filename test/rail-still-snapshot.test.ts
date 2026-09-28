/** Bounds: retained CPU geometry and frozen static pipeline controls. No GPU,
 * native capture, arbitrary writer detection or historical199 acceptance. */
import { afterAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BufferAttribute, BufferGeometry, Group, InterleavedBuffer, InterleavedBufferAttribute, Mesh, MeshBasicMaterial, ShaderMaterial, PerspectiveCamera, Plane, Triangle, Vector3 } from "three";
import { decodeMesh } from "../src/world/mesh.js";
import { emptyPopulationStatus } from "../src/agents/population/status.js";
import { createRailStillObserver, evaluateRailStill, type RailStillSnapshot } from "../src/harness/rail-still-snapshot.js";
import { CITY_CLIP_PLANES } from "../src/scene/aoi-cutout.js";

const output = process.env.MAPS_RAIL_CONTROL_OUTPUT ?? mkdtempSync(join(tmpdir(), "maps-rail-still-")); mkdirSync(output,{recursive:true});
afterAll(() => { if (!process.env.MAPS_RAIL_CONTROL_OUTPUT) rmSync(output,{recursive:true,force:true}); });
function save(name: string, snapshot: RailStillSnapshot, extra: unknown = {}) {
  const result = evaluateRailStill(snapshot);
  // Evidence precedes every semantic assertion, including deliberately red arms.
  writeFileSync(join(output,`${name}.json`),JSON.stringify({snapshot,result,extra}));
  return result;
}
function setup(positions: Float32Array, indices: Uint32Array, eye: number[], sheets = false) {
  const root = new Group(), g = new BufferGeometry();g.setAttribute("position",new BufferAttribute(positions,3));g.setIndex(new BufferAttribute(indices,1));
  const mesh = new Mesh(g,new MeshBasicMaterial()); mesh.name = sheets ? "streets:paint" : "retained-real-sleeper"; mesh.userData.railAsset = sheets ? undefined : {file:"sleepers.mesh",sha256:sleeper.sha256}; root.add(mesh);root.updateMatrixWorld(true);
  const camera = new PerspectiveCamera(55,1280/720,.01,8000);camera.position.fromArray(eye);camera.updateMatrixWorld();
  const state = {frame:1,revision:1,ready:true,population:emptyPopulationStatus()};
  const observation = createRailStillObserver(root,camera,() => state);
  const dispose = (): void => { root.traverse(o => {if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.clear(); };
  return {root,mesh,camera,state,...observation,dispose};
}
// The first stored closed sleeper strictly inside the AOI. The independent
// oracle requires eight distinct corners, all12 faces and strict same-sign
// exact dyadic halfspaces, not an edge count standing in for a solid proof.
const sourcePath = "data/rail/sleepers.mesh";
const bytes = readFileSync(sourcePath), source = decodeMesh(new Uint8Array(bytes));
const expectedHash = JSON.parse(readFileSync("data/rail/manifest.json","utf8")).layers.find((r:{file:string}) => r.file === "sleepers.mesh").sha256 as string;
const sleeper = {sha256:createHash("sha256").update(bytes).digest("hex"),positions:new Float32Array(),indices:new Uint32Array(),centre:[] as number[],sourceFaces:[] as number[],signs:[] as string[]};
if(sleeper.sha256!==expectedHash)throw Error("Restore the pinned trial sleeper before running its source control");
const integer = (x:number): bigint => { const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,x);const n=b.getBigUint64(0),e=Number((n>>52n)&2047n),f=n&((1n<<52n)-1n);return ((n>>63n)?-1n:1n)*(e===0?f:((1n<<52n)|f)<<BigInt(e-1)); };
// Components here select only a real test fixture; production clearance never
// splits source assemblies. Preserve exact stored index order for the fixture.
const coordinateKey=(v:number):string=>[0,1,2].map(k=>source.positions[v*3+k]).join(",");
const byVertex=new Map<string,number[]>();
for(let f=0;f<source.indices.length/3;f++)for(let j=0;j<3;j++){const v=coordinateKey(source.indices[f*3+j]!),a=byVertex.get(v)??[];a.push(f);byVertex.set(v,a);}
const visited=new Set<number>();
for(let first=0;first<source.indices.length/3&&!sleeper.indices.length;first++){
 if(visited.has(first))continue;const faces:number[]=[],pending=[first],vertices=new Set<number>();
 while(pending.length){const f=pending.pop()!;if(visited.has(f))continue;visited.add(f);faces.push(f);for(let j=0;j<3;j++){const v=source.indices[f*3+j]!;vertices.add(v);for(const next of byVertex.get(coordinateKey(v))!)if(!visited.has(next))pending.push(next);}}
 if(new Set([...vertices].map(coordinateKey)).size!==8||faces.length!==12)continue;faces.sort((a,b)=>a-b);const ids=[...vertices].sort((a,b)=>a-b),ps=ids.map(i=>[source.positions[i*3]!,source.positions[i*3+1]!,source.positions[i*3+2]!]);
 if(!ps.every(p=>CITY_CLIP_PLANES.every(pl=>pl.distanceToPoint(new Vector3(...p))>1)))continue;
 const centre=[0,1,2].map(a=>ps.reduce((n,p)=>n+p[a]!,0)/ps.length),ci=centre.map(integer);const signs=faces.map(f=>{const [a,b,c]=[0,1,2].map(j=>{const v=source.indices[f*3+j]!;return [0,1,2].map(k=>integer(source.positions[v*3+k]!));}) as [bigint[],bigint[],bigint[]];const u=b.map((v,i)=>v-a[i]!),v=c.map((n,i)=>n-a[i]!),w=ci.map((n,i)=>n-a[i]!);return (u[1]!*v[2]!-u[2]!*v[1]!)*w[0]!+(u[2]!*v[0]!-u[0]!*v[2]!)*w[1]!+(u[0]!*v[1]!-u[1]!*v[0]!)*w[2]!;});
 if(signs.some(s=>s===0n)||!signs.every(s=>(s>0n)===(signs[0]!>0n)))continue;
 sleeper.positions=new Float32Array(ps.flat());sleeper.indices=new Uint32Array(faces.flatMap(f=>[0,1,2].map(j=>ids.indexOf(source.indices[f*3+j]!))));sleeper.centre=centre;sleeper.sourceFaces=faces;sleeper.signs=signs.map(String);
}
if(!sleeper.indices.length)throw Error("No real12-face sleeper with a strict independent inside oracle was retained");
writeFileSync(join(output,"source-control.json"),JSON.stringify({sourcePath,...sleeper,positions:Array.from(sleeper.positions),indices:Array.from(sleeper.indices)}));

describe("retained settled rail geometry",()=>{
 it("joins bound body/cap parts and detects the real sleeper interior",()=>{
  const f=setup(sleeper.positions,sleeper.indices,sleeper.centre);try{
   const full=save("real-sleeper-inside",f.railStillSnapshot(),sleeper.signs);expect(full.containment.some(w=>w.reason.startsWith("eye"))).toBe(true);
   const original=f.mesh.geometry.index!.array as Uint32Array;f.mesh.geometry.setIndex(new BufferAttribute(original.slice(0,-6),1));const cap=new Mesh(new BufferGeometry(),new MeshBasicMaterial());cap.geometry.setAttribute("position",f.mesh.geometry.getAttribute("position"));cap.geometry.setIndex(new BufferAttribute(original.slice(-6),1));cap.name="real-sleeper-section";cap.userData.railAsset={...f.mesh.userData.railAsset};f.root.add(cap);f.root.updateMatrixWorld(true);
   const snapshot=f.railStillSnapshot(),joined=save("joined-body-cap-inside",snapshot);expect(joined.counts.groups).toBe(1);expect(joined.containment.some(w=>w.reason.startsWith("eye"))).toBe(true);expect(snapshot.buffers.length).toBe(3);
   f.root.remove(cap);const open=save("missing-cap-inside",f.railStillSnapshot());expect(open.eligible).toBe(false);expect(f.railStillSnapshot().state.membership).not.toEqual(snapshot.state.membership);cap.geometry.dispose();(cap.material as MeshBasicMaterial).dispose();
   f.mesh.geometry.setIndex(new BufferAttribute(original.slice(3),1));const changed=save("changed-index-inside",f.railStillSnapshot());expect(changed.eligible).toBe(false);expect(changed.unknown.length).toBeGreaterThan(0);
  }finally{f.dispose();}
 });
 it("keeps an opened shell unknown and a strictly separated exterior clear",()=>{
  const f=setup(sleeper.positions,sleeper.indices.slice(3),sleeper.centre);try{expect(save("opened-shell-inside",f.railStillSnapshot()).unknown.length).toBeGreaterThan(0);f.camera.position.x+=20;f.camera.updateMatrixWorld();expect(save("strict-exterior",f.railStillSnapshot()).eligible).toBe(true);}finally{f.dispose();}
 });
 it.each(["streets:paint","streets:tactile-paving"])("retains an actual contact triangle before asserting eye contact for %s",name=>{
  const f=setup(new Float32Array([-2,25,0,2,25,0,0,25,4]),new Uint32Array([0,1,2]),[0,25,1],true);try{f.mesh.name=name;expect(save(`eye-contact-${name.replace(':','-')}`,f.railStillSnapshot(),{triangle:[[-2,25,0],[2,25,0],[0,25,4]],eye:[0,25,1]}).intersections.some(w=>w.reason.startsWith("eye contacts"))).toBe(true);}finally{f.dispose();}
 });
 it("tests the whole near rectangle when all four corners are clear",()=>{
  const f=setup(new Float32Array([-2,24.8,4,2,24.8,4,0,25.2,4]),new Uint32Array([0,1,2]),[0,25,5],true);try{f.camera.near=1;f.camera.updateProjectionMatrix();const snapshot=f.railStillSnapshot();const triangle=new Triangle(new Vector3(-2,24.8,4),new Vector3(2,24.8,4),new Vector3(0,25.2,4));const result=save("clear-corners-crossing",snapshot,{triangle:[[-2,24.8,4],[2,24.8,4],[0,25.2,4]],near:snapshot.state.nearPlane});expect(snapshot.state.nearPlane.every(p=>!triangle.containsPoint(new Vector3(...p)))).toBe(true);expect(result.intersections.some(w=>w.reason.includes("complete near rectangle"))).toBe(true);}finally{f.dispose();}
 });
 it("does not invent a filled volume between separate source paint patches",()=>{
  const f=setup(new Float32Array([-10,20,0,10,20,0,0,30,0,-10,20,10,10,20,10,0,30,10]),new Uint32Array([0,1,2,3,4,5]),[0,25,4],true);try{expect(save("separate-paint-sheets",f.railStillSnapshot()).eligible).toBe(true);}finally{f.dispose();}
 });
 it.each(["shader","callback","interleaved","zoom","draw"])("retains unsupported %s as unknown through the exporter/evaluator",kind=>{
  const f=setup(sleeper.positions,sleeper.indices,sleeper.centre);try{
   if(kind==="shader"){(f.mesh.material as MeshBasicMaterial).dispose();(f.mesh as Mesh).material=new ShaderMaterial();}
   if(kind==="callback")f.mesh.onAfterRender=()=>{};
   if(kind==="interleaved")f.mesh.geometry.setAttribute("position",new InterleavedBufferAttribute(new InterleavedBuffer(sleeper.positions,3),3,0));
   if(kind==="zoom"){f.camera.zoom=2;f.camera.updateProjectionMatrix();}
   if(kind==="draw")f.mesh.geometry.setDrawRange(1,3);
   const result=save(`unsupported-${kind}`,f.railStillSnapshot());expect(result.eligible).toBe(false);expect(result.unknown.length).toBeGreaterThan(0);
  }finally{f.dispose();}
 });
 it("copies ordered bytes once, including invisible physical members, and leaves no live alias",()=>{
  const f=setup(sleeper.positions.slice(),sleeper.indices.slice(),sleeper.centre);try{f.mesh.visible=false;const before=f.railStillSnapshot();f.mesh.geometry.getAttribute("position").setX(0,999);f.mesh.geometry.index!.setX(0,7);(f.mesh.material as MeshBasicMaterial).clippingPlanes=[new Plane(new Vector3(1,0,0),-100)];f.mesh.position.x=100;f.root.updateMatrixWorld(true);const after=f.railStillSnapshot();writeFileSync(join(output,"changed-storage-transform-plane.json"),JSON.stringify({before,after}));expect(before.buffers).not.toEqual(after.buffers);expect(before.meshes[0]!.matrixWorld).not.toEqual(after.meshes[0]!.matrixWorld);expect(before.meshes[0]!.materials).not.toEqual(after.meshes[0]!.materials);expect(save("hidden-enclosing-member",before).containment.length).toBeGreaterThan(0);}finally{f.dispose();}
 });
});
