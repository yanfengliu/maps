/** Reuse offline Draco decode for conservative local static geometry boxes. */
import { readFileSync } from "node:fs";
import { Matrix4,Vector3,Quaternion } from "three";
import { parseB3dm,parseGlb } from "../../tiles/b3dm.ts";
import { decodePrimitive } from "../../tiles/draco.ts";
import { createHash } from "node:crypto";
import { projectPath } from "./paths.mjs";
import { inputProfile } from "./profile.mjs";
export async function createStaticObstacles(project:string, legs:any[],profile="historical") {
const primary=projectPath(project,".")+"/",inputs:any[]=[];
const read=(path:string)=>{const relative=path.slice(primary.length),expected=inputProfile(profile).obstacleInputs.find(r=>r.path===relative);if(!expected)throw Error("Unbound local obstacle input "+relative);const bytes=readFileSync(path),sha256=createHash("sha256").update(bytes).digest("hex");if(sha256!==expected.sha256)throw Error("Walker "+profile+" obstacle input "+relative+" differs; restore this profile’s exact reviewed bytes before bounded preparation");inputs.push({path:"/"+relative,sha256});return bytes;};
const ps=legs.flatMap(l=>[l.from,l.to]),actor={min:[Math.min(...ps.map(p=>p.x))-2,Math.min(...ps.map(p=>p.y))-.1,Math.min(...ps.map(p=>p.z))-2],max:[Math.max(...ps.map(p=>p.x))+2,Math.max(...ps.map(p=>p.y))+3,Math.max(...ps.map(p=>p.z))+2]};
const distance=(a:any,b:any)=>Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
const tileBox=(box:number[])=>({min:[0,1,2].map(k=>box[k]!-Math.abs(box[k+3]!)-Math.abs(box[k+6]!)-Math.abs(box[k+9]!)),max:[0,1,2].map(k=>box[k]!+Math.abs(box[k+3]!)+Math.abs(box[k+6]!)+Math.abs(box[k+9]!))});
const tileset=JSON.parse(read(primary+"data/scene/buildings/tileset.json").toString()),leaves:any[]=[];
function walk(tile:any){if(!tile.children?.length&&tile.content){const box=tileBox(tile.content.boundingVolume?.box??tile.boundingVolume.box);if(distance(actor,box)<2)leaves.push({uri:tile.content.uri,box});}for(const child of tile.children??[])walk(child);}walk(tileset.root);
const buildings:any[]=[];
for(const leaf of leaves){const tile=parseB3dm(Uint8Array.from(read(primary+"data/scene/buildings/"+leaf.uri))),{json:g,binary}=parseGlb(tile.glb),groups=new Map<number,any>();
  async function node(index:number,parent:Matrix4){const n:any=g.nodes![index]!,local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1]))),matrix=parent.clone().multiply(local);if(n.mesh!==undefined)for(const primitive of g.meshes![n.mesh]!.primitives){const mesh=await decodePrimitive(g,binary!,primitive);if(!mesh.batchIds)throw Error("Actual tile has no building batches");for(let i=0;i<mesh.vertexCount;i++){const id=mesh.batchIds[i]!,p=new Vector3(mesh.positions[i*3]!,mesh.positions[i*3+1]!,mesh.positions[i*3+2]!).applyMatrix4(matrix),box=groups.get(id)??{id,vertices:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};box.vertices++;p.toArray().forEach((v,k)=>{box.min[k]=Math.min(box.min[k],v);box.max[k]=Math.max(box.max[k],v);});groups.set(id,box);}}for(const child of n.children??[])await node(child,matrix);}
  for(const root of g.scenes![g.scene??0]!.nodes!)await node(root,new Matrix4());
  for(const box of groups.values())buildings.push({...box,tile:leaf.uri,sourceId:(tile.batchTableJson.gml_id as any[])?.[box.id]??null,distanceM:distance(actor,box)});
}
const decorations=JSON.parse(read(primary+"data/scene/decorations.json").toString()),hardware=JSON.parse(read(primary+"data/scene/control-hardware.json").toString());
const furniture:any[]=[];
for(const t of decorations.trees){const r=Math.max(t.crownRadiusM*1.5,.22);const box={min:[t.position.x-r,t.position.y,t.position.z-r],max:[t.position.x+r,t.position.y+t.heightM*1.5,t.position.z+r]};furniture.push({kind:"tree conservative full crown",id:t.sourceId,...box,distanceM:distance(actor,box)});}
for(const b of decorations.barriers){const box={min:[Math.min(...b.points.map((p:any)=>p.x))-.10,Math.min(...b.points.map((p:any)=>p.y))-.03,Math.min(...b.points.map((p:any)=>p.z))-.10],max:[Math.max(...b.points.map((p:any)=>p.x))+.10,Math.max(...b.points.map((p:any)=>p.y))+b.heightM+.03,Math.max(...b.points.map((p:any)=>p.z))+.10]};furniture.push({kind:"barrier conservative posts and rails",id:b.sourceId,...box,distanceM:distance(actor,box)});}
for(const h of hardware.records)if(h.status==="placed"){const box={min:[Math.min(h.base.x,h.head.x)-1.1,h.base.y-.1,Math.min(h.base.z,h.head.z)-1.1],max:[Math.max(h.base.x,h.head.x)+1.1,Math.max(h.base.y,h.head.y)+1.1,Math.max(h.base.z,h.head.z)+1.1]};furniture.push({kind:"hardware conservative post arm head",id:h.sourceId,...box,distanceM:distance(actor,box)});}
const report={bound:"Conservative full local loop envelope, against conservative boxes containing actual decoded final-leaf building vertices and conservative displayed furniture bounds. No live agents, continuous-body or turn/transfer collision acceptance. Only the one intersecting final tile is decoded; box overlap would remain an obstruction, not be declared collision-free.",actorEnvelope:actor,poses:"Conservative full local loop root envelope plus 2m horizontal and 3m vertical; actual sampled vertices must remain inside",decodedLeaves:leaves,buildingCount:buildings.length,buildingMinimumM:Math.min(...buildings.map(b=>b.distanceM)),furnitureMinimumM:Math.min(...furniture.map(f=>f.distanceM)),buildingOverlaps:buildings.filter(b=>b.distanceM===0),furnitureOverlaps:furniture.filter(f=>f.distanceM===0),nearestBuildings:buildings.filter(b=>b.distanceM===0),nearestFurniture:furniture.filter(b=>b.distanceM===0),inputs};
return report;
}
