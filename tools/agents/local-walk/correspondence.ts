/** Existing F6 full-weight reference method on the actual selected female LODs. */
import { readFileSync,writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Matrix4,DataUtils } from "three";
import { selectedHumanParts } from "../../../src/agents/render/human-admission.ts";
import { projectPath, ownedDataPath } from "./paths.mjs";
export function prepareCorrespondence(project:string, outputRelative:string) {
const primary=projectPath(project, ".")+"/",dir=ownedDataPath(project,outputRelative)+"/",hash=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex"),inputs:any[]=[];
function read(path:string,pin?:string){const b=readFileSync(path),sha256=hash(b);if(pin&&pin!==sha256)throw Error("Input changed "+path);inputs.push({path,sha256,bytes:b.length});return b;}
const processRecord=JSON.parse(read(dir+"extract-process.json").toString());if(!processRecord.completed||!processRecord.sourceUnchanged)throw Error("Actual extraction did not complete unchanged");for(const p of processRecord.inputs)read(primary+p.path,p.sha256);
const manifest=JSON.parse(read(primary+"data/scene/agents/commuter-female.json").toString()),C=new Matrix4().set(1,0,0,0,0,0,1,0,0,-1,0,0,0,0,0,1),Ci=C.clone().invert();
const halfBound=(x:number)=>Math.max(2**-25,2**(Math.floor(Math.log2(Math.abs(x)||2**-24))-11));
const results:any[]=[];
for(const lod of manifest.lods){
  const root=dir+lod.id+"/",meta=JSON.parse(read(root+"extracted.json").toString()),vertices=JSON.parse(read(root+"source-weights.json").toString()),raw=read(primary+"data/scene/agents/"+lod.model,lod.modelSha256),vat=read(primary+"data/scene/agents/"+lod.positions,lod.positionSha256),n=raw.readUInt32LE(12),g=JSON.parse(raw.subarray(20,20+n).toString());
  if(vertices.length!==lod.vertexCount||meta.vertexCount!==lod.vertexCount)throw Error("Actual female source/VAT denominator differs for "+lod.id);
  const scalar=(id:number,index:number)=>{const a=g.accessors[id],v=g.bufferViews[a.bufferView],size=a.componentType===5121?1:a.componentType===5123?2:4,o=28+n+(v.byteOffset??0)+(a.byteOffset??0)+index*(v.byteStride??size);return a.componentType===5126?raw.readFloatLE(o):size===4?raw.readUInt32LE(o):size===2?raw.readUInt16LE(o):raw.readUInt8(o);};
  const selected=new Set<number>(),parts:any[]=[];
  for(const part of selectedHumanParts(g,lod,manifest.id+"/"+lod.id)){const p=g.meshes[part.meshIndex].primitives[part.primitive],a=p.attributes._VAT_ID,count=p.indices===undefined?g.accessors[a].count:g.accessors[p.indices].count,ids=new Set<number>();for(let k=0;k<count;k++){const id=scalar(a,p.indices===undefined?k:scalar(p.indices,k));selected.add(id);ids.add(id);}parts.push({name:part.node,selectedIds:[...ids]});}
  const J=meta.jointNames.length,matrices=new Float32Array(meta.frames.length*J*16);
  for(let f=0;f<meta.frames.length;f++)for(let j=0;j<J;j++)matrices.set(C.clone().multiply(new Matrix4().fromArray(meta.frames[f].poseWorld[j])).multiply(new Matrix4().fromArray(meta.bindWorld[j]).invert()).multiply(Ci).elements,(f*J+j)*16);
  writeFileSync(root+"reference-palettes.f32",new Uint8Array(matrices.buffer));
  const stored=read(root+"reference-palettes.f32"),palettes=new Float32Array(stored.buffer,stored.byteOffset,stored.byteLength/4);
  const evaluated=meta.frames.map((f:any)=>{const b=read(root+f.positions,f.sha256);return new Float32Array(b.buffer,b.byteOffset,b.byteLength/4);});
  function skin(id:number,A:number,B:number,t:number){const v=vertices[id],total=v.weights.reduce((a:number,b:number)=>a+b,0),out=[0,0,0];if(!(total>0))throw Error("Selected source vertex has no complete influence set: "+id);for(let k=0;k<v.joints.length;k++){const weight=v.weights[k]/total,off=(A*J+v.joints[k])*16,other=(B*J+v.joints[k])*16;const m=(c:number)=>Math.fround(palettes[off+c]!+t*(palettes[other+c]!-palettes[off+c]!));for(let axis=0;axis<3;axis++)out[axis]!+=weight*(m(axis)*v.p[0]+m(axis+4)*v.p[1]+m(axis+8)*v.p[2]+m(axis+12));}return out;}
  function vatPoint(id:number,frame:number){const off=(frame*lod.rowsPerFrame*lod.textureWidth+id)*8;return [0,2,4].map(c=>DataUtils.fromHalfFloat(vat.readUInt16LE(off+c)));}
  let referenceFailures=0,sourceFailures=0,maxSourceErrorM=0,maxVatErrorM=0,wrongPaletteFailures=0,comparisons=0,firstMismatch:any=null;
  for(const [first,count]of [[0,32],[32,16]])for(let frame=0;frame<count!;frame++)for(const t of [0,.5]){const A=first!+frame,B=first!+(frame+1)%count!;for(const id of selected){const sk=skin(id,A,B,t),a=vatPoint(id,A),b=vatPoint(id,B),expected=[0,1,2].map(k=>evaluated[A][id*3+k]+t*(evaluated[B][id*3+k]-evaluated[A][id*3+k])),v=a.map((x,k)=>x+t*(b[k]!-x));maxSourceErrorM=Math.max(maxSourceErrorM,Math.hypot(...sk.map((x,k)=>x-expected[k]!)));maxVatErrorM=Math.max(maxVatErrorM,Math.hypot(...sk.map((x,k)=>x-v[k]!)));for(let k=0;k<3;k++){const limit=(1-t)*halfBound(evaluated[A][id*3+k])+t*halfBound(evaluated[B][id*3+k])+1e-6;if(Math.abs(expected[k]!-v[k]!)>limit){sourceFailures++;firstMismatch??={kind:"evaluated source vs delivered VAT",id,A,B,t,axis:k,expected:expected[k],delivered:v[k],limit};}if(Math.abs(sk[k]!-v[k]!)>limit){referenceFailures++;firstMismatch??={kind:"full-weight skin vs delivered VAT",id,A,B,t,axis:k,skin:sk[k],delivered:v[k],limit};}}comparisons++;}}
  for(const id of selected){const wrong=skin(id,32,32,0),vat8=vatPoint(id,8);for(let k=0;k<3;k++)if(Math.abs(wrong[k]!-vat8[k]!)>halfBound(evaluated[8][id*3+k])+1e-6)wrongPaletteFailures++;}
  let perturbationFailures=0,maxPerturbedSourceErrorM=0,movedVertices=0;
  for(const id of selected){const sk=skin(id,48,48,0),base=skin(id,32,32,0),v=vatPoint(id,32);if(Math.hypot(...sk.map((x,k)=>x-base[k]!))>1e-7)movedVertices++;maxPerturbedSourceErrorM=Math.max(maxPerturbedSourceErrorM,Math.hypot(...sk.map((x,k)=>x-evaluated[48][id*3+k])));for(let k=0;k<3;k++)if(Math.abs(v[k]!+sk[k]!-base[k]!-evaluated[48][id*3+k])>halfBound(evaluated[32][id*3+k])+1e-6)perturbationFailures++;}
  const overSix=[...selected].filter(id=>vertices[id].weights.length>6).map(id=>({id,influences:vertices[id].joints.map((j:number,k:number)=>({joint:meta.jointNames[j],weight:vertices[id].weights[k]})),mesh:parts.find(p=>p.selectedIds.includes(id))?.name}));
  const passed=referenceFailures===0&&sourceFailures===0&&perturbationFailures===0&&wrongPaletteFailures>0&&movedVertices>0;
  results.push({lod:lod.id,selectedVertices:selected.size,sourceVertices:vertices.length,joints:J,referencePoses:96,comparisons,maxSourceErrorM,maxVatErrorM,referenceFailures,sourceFailures,firstMismatch,wrongPaletteFailures,perturbationFailures,maxPerturbedSourceErrorM,movedVertices,maximumActualSelectedInfluences:Math.max(...[...selected].map(id=>vertices[id].weights.length)),overSixCount:overSix.length,overSix,passed});
  writeFileSync(root+"selected-sidecar.json",JSON.stringify({variant:manifest.id,lod:lod.id,modelSha256:lod.modelSha256,vatSha256:lod.positionSha256,jointNames:meta.jointNames,jointParents:meta.jointParents,bindWorld:meta.bindWorld,selectedIds:[...selected],parts,sourceWeightsSha256:hash(readFileSync(root+"source-weights.json")),referencePalettesSha256:hash(stored),retainedPackedInfluenceSlots:6},null,2));
}
const result={bound:"Female source/three selected LODs, all 48 reference frames and 48 adjacent-frame midpoints, plus one independent 10 mm left-foot perturbation each. Serialized float32 reference palettes and every actual complete influence. No gait, native, GPU or general skinning acceptance.",results,passed:results.every(r=>r.passed),inputs};
writeFileSync(dir+"correspondence.json",JSON.stringify(result,null,2));console.log(JSON.stringify({...result,results:results.map(({overSix,...r})=>({...r,overSixExamples:overSix.slice(0,2)})),inputs:inputs.length},null,2));if(!result.passed)throw Error("Female full-weight correspondence refused; retained correspondence.json records the failing state");
return result;
}
