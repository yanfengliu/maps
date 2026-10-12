// Packet assembly recovered from253. Export only: no implicit preparation or public source writes.
import fs from 'node:fs';import path from 'node:path';
import {loadRig} from './rig-data.mjs';
import {createContext} from './context.ts';
import {createStaticObstacles} from './static-obstacles.ts';
import {createUnusedOutput,ownedDataPath,projectPath,readPinned,sha256,sourcePath} from './paths.mjs';
import {FEMALE_SOURCE_INPUT,BAKER_INPUT,FEMALE_INPUTS,REFERENCE_INPUTS,NETWORK_INPUT} from './input-contract.mjs';
import {assertInputProfile,inputProfile} from './profile.mjs';
export function bindOwnerProvenance(project,profile='historical') {
  return inputProfile(profile).ownerInputs.map(owner=>({path:sourcePath(owner.path),sha256:sha256(readPinned(project,owner))}));
}
export function writeObstacleSidecar(project,preparationRelative,bytes) {
  ownedDataPath(project,preparationRelative);
  fs.writeFileSync(projectPath(project,preparationRelative+'/loop-static-obstacles.json'),bytes,{flag:'wx'});
  return {path:sourcePath(preparationRelative+'/loop-static-obstacles.json'),sha256:sha256(bytes)};
}
export async function preparePacket(project,preparationRelative,outputRelative,profile='historical') {
  // Explicit bounded profile is not production or default admission. Asset and historical guards stay strict.
  const profileInputs=assertInputProfile(project,profile);
  const records=[];
  function bind(relative,expected,bytesExpected) {
    const bytes=readPinned(project,{path:relative,sha256:expected,bytes:bytesExpected});
    records.push({path:sourcePath(relative),sha256:sha256(bytes)});return bytes;
  }
  records.push(...bindOwnerProvenance(project,profile));
  readPinned(project,FEMALE_SOURCE_INPUT);readPinned(project,BAKER_INPUT);
  for(const asset of FEMALE_INPUTS)readPinned(project,asset);
  ownedDataPath(project,preparationRelative);ownedDataPath(project,outputRelative);
  const context=createContext(project,profile),obstacles=await createStaticObstacles(project,context.legs,profile);
  for(const name of ['rig-data.mjs','context.ts']) {
    const relative='tools/agents/local-walk/'+name,bytes=fs.readFileSync(projectPath(project,relative));records.push({path:relative,sha256:sha256(bytes)});
  }
  const obstacleBytes=Buffer.from(JSON.stringify(obstacles,null,2));records.push({path:sourcePath(preparationRelative+'/loop-static-obstacles.json'),sha256:sha256(obstacleBytes)});
  const pending=[];
  const save=(name,value)=>{const bytes=Buffer.from(JSON.stringify(value));pending.push({name,bytes,sha256:sha256(bytes)});};
  for(const id of ['near','medium','far']) {
    for(const input of REFERENCE_INPUTS.filter(row=>row.path.startsWith(id+'/')))bind(preparationRelative+'/'+input.path,input.sha256,input.bytes);
    const rig=loadRig(id,project,preparationRelative),meta=JSON.parse(fs.readFileSync(projectPath(project,preparationRelative+'/'+id+'/extracted.json')));
    const {d}=rig,vertices=d.drawn.map(v=>{const row=d.influences.get(v.id);return {id:v.id,idle:d.sample(0,v.id,'idle').toArray(),influences:row.joints.map((joint,k)=>({joint,weight:row.weights[k],point:row.points[k].toArray()}))};});
    const frames=Array.from({length:48},(_,n)=>rig.source.worldsAt(n<32?'walk':'idle',n<32?n/32:(n-32)/16).worlds.map(m=>m.toArray()));
    const source={capacity:d.lod.vertexCount,vertices,triangles:rig.triangles,referencePalette:d.worlds.flatMap(m=>m.toArray())};
    if(!Number.isInteger(source.capacity))throw Error('Missing delivered VAT capacity');
    save('rig-'+id+'.json',{id,lod:d.lod,source,frames,jointNames:meta.jointNames,parents:meta.jointParents,bones:d.bones,soles:d.soles.map(vs=>vs.map(v=>v.id)),shoes:rig.shoes.map(v=>v.id)});
    for(const [name,key]of [[d.lod.model,'modelSha256'],[d.lod.positions,'positionSha256'],[d.lod.normals,'normalSha256']])bind('data/scene/agents/'+name,d.lod[key]);
  }
  for(const row of obstacles.inputs)records.push(row);
  const triangles=context.hero.nearby([[-41,10],[-28,10],[-28,24],[-41,24]]);
  save('context.json',{scale:context.scale,origin:context.origin,legs:context.legs,triangles,obstacles,authority:context.network.junctions.map(j=>({id:j.id,areas:j.conflictAreas??[{position:j.position,radiusM:j.radiusM}]})),networkEdges:context.route.edges,route:context.route.edgeIds});
  bind(NETWORK_INPUT.path,NETWORK_INPUT.sha256,NETWORK_INPUT.bytes);
  const pavement=context.hero.inputs.find(row=>row.path==='data/scene/pavements.mesh');bind(pavement.path,pavement.sha256);
  const female=FEMALE_INPUTS.find(row=>row.path==='data/scene/agents/commuter-female.json');bind(female.path,female.sha256,female.bytes);
  const files=pending.map(({name,sha256})=>({name,sha256}));
  save('manifest.json',{version:'private-native253',seed:5970698,variant:2,slot:0,generation:1,scale:context.scale,files,sourceInputs:records});
  const output=createUnusedOutput(project,outputRelative),packet=outputRelative.replaceAll('\\','/')==='data/scene/local-walk/packet'?output:path.join(output,'packet');if(packet!==output)fs.mkdirSync(packet);
  const writtenObstacle=writeObstacleSidecar(project,preparationRelative,obstacleBytes);if(writtenObstacle.sha256!==sha256(obstacleBytes))throw Error('Materialized obstacle sidecar differs from its recorded bytes');
  for(const file of pending)fs.writeFileSync(path.join(packet,file.name),file.bytes,{flag:'wx'});
  // Existing schema is retained. This receipt marks generated successor bytes as unadmitted; it does not remove the baker's reviewDirectory field.
  const receipt={status:'unadmitted successor proposal',createdAt:new Date().toISOString(),profile:inputProfile(profile).id,profileInputs,productionReady:false,scopeCaveats:inputProfile(profile).caveats,files:pending.map(({name,bytes,sha256})=>({name,bytes:bytes.length,sha256})),sourceInputs:records,femaleManifestUnmodified:true,noOwnerSourceWrites:true};
  fs.writeFileSync(path.join(output,'preparation-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  return receipt;
}
