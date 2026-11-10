import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stopSignPlacements,addStopSigns,STOP_SIGN} from '../src/stop-signs.ts';
import {buildBuildingGeometry,prepareBuildingDetails,appendStopSigns,projectLocal} from '../src/building-geometry.ts';
import {campusTrafficLayer} from '../src/campus-traffic.ts';
import {gpuGeometryBytes,MAX_GPU_GEOMETRY_BYTES,MAX_DETAIL_TRIANGLES} from '../src/gpu-geometry.ts';
import {TerrainGrounding,decodeTerrainObjectId} from '../src/terrain-grounding.ts';
const read=file=>JSON.parse(readFileSync(new URL('../public/data/'+file,import.meta.url),'utf8'));
const manifest=read('stanford-surfaces-roads-manifest.json');
const input={controls:read(manifest.controls.file),roads:{type:'FeatureCollection',features:manifest.files.flatMap(f=>read(f.file).features)}};
const before=JSON.stringify(input),placements=stopSignPlacements(input,projectLocal);

test('every mapped stop has a finite independent object placement; original coordinates and direction evidence survive',()=>{
 assert.equal(placements.length,296);assert.equal(new Set(placements.map(s=>s.id)).size,296);
 assert.equal(placements.filter(s=>s.facingEvidence==='source-direction').length,291);
 assert.equal(placements.filter(s=>s.facingEvidence==='estimated-road-direction').length,5);
 for(const s of placements){
  assert.ok([...s.position,...s.travel].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...s.travel)-1)<1e-12);
  const delta=s.position.map((x,i)=>x-s.source[i]);
  assert.ok(Math.abs(delta[0]*s.travel[1]-delta[1]*s.travel[0]-(s.roadWidth/2+.6))<1e-9,'post on right shoulder');
  assert.ok(Math.abs(delta[0]*s.travel[0]+delta[1]*s.travel[1]+s.setback)<1e-9,'intersection setback is upstream');
  assert.equal(s.poleEvidence,'estimated-roadside-offset');
 }
 const represented=placements.flatMap(s=>[s.id,...s.junctionControlIds]);
 assert.equal(represented.length,306);assert.equal(new Set(represented).size,306);
 assert.equal(placements.flatMap(s=>s.junctionControlIds).length,10);
 assert.ok(placements.flatMap(s=>s.junctionControlIds).includes('node/340334520'),'intersection metadata must not add a second physical post');
 assert.equal(JSON.stringify(input),before,'render offsets must not rewrite mapped regulatory points');
 assert.deepEqual(campusTrafficLayer().filter,['==',['get','controlType'],'traffic_signals'],'no camera-facing STOP icon over physical models');
});

test('forward, backward and compass travel face approaching traffic; ambiguous junctions retain estimated status',()=>{
 const road=(id,points)=>({type:'Feature',properties:{id,modeledWidth:6,sourceNodeIds:points.map((_,i)=>String(i+1))},geometry:{type:'LineString',coordinates:points}});
 const roads={type:'FeatureCollection',features:[road('way/1',[[0,-10],[0,0],[0,10]])]};
 const feature=direction=>({type:'Feature',properties:{id:'node/2',controlType:'stop',direction,retainedWayIds:['way/1']},geometry:{type:'Point',coordinates:[0,0]}});
 const result=direction=>stopSignPlacements({roads,controls:{features:[feature(direction)]}},p=>[...p])[0];
 assert.deepEqual(result('forward').travel,[0,1]);assert.deepEqual(result('forward').position,[3.6,0]);
 assert.ok(result('backward').travel[1]===-1);assert.equal(result('backward').position[0],-3.6);
 assert.ok(Math.abs(result('90').travel[0]-1)<1e-12);assert.equal(result(undefined).facingEvidence,'estimated-road-direction');
 const f=feature();f.properties.retainedWayIds.push('way/2');roads.features.push(road('way/2',[[-10,0],[0,0],[10,0]]));
 const junction=stopSignPlacements({roads,controls:{features:[f]}},p=>[...p])[0];assert.equal(junction.setback,4);assert.deepEqual(junction.position,[3.6,-4]);
 assert.throws(()=>stopSignPlacements({roads:{features:[]},controls:{features:[f]}},p=>[...p]),/no retained road/);
});

test('stop objects have vertical volume, front-facing fixed plates, real-world scale and rigid terrain anchors',()=>{
 const quads=[],anchors=[];
 addStopSigns({quad:(a,b,c,d,color,kind,id,uv)=>quads.push({points:[a,b,c,d],color,kind,id,uv})},placements,p=>{anchors.push([...p]);return -1000-anchors.length+1;});
 assert.equal(quads.length,296*4);
 for(let i=0;i<placements.length;i++){
  const sign=placements[i],faces=quads.slice(i*4,i*4+4),plate=faces[3];
  assert.ok(faces.every(f=>f.id===-1000-i));assert.deepEqual(anchors[i],sign.position);
  assert.equal(plate.kind,STOP_SIGN.faceKind);assert.deepEqual(plate.uv,[[0,0],[1,0],[1,1],[0,1]]);
  assert.ok(Math.abs(Math.hypot(plate.points[1][0]-plate.points[0][0],plate.points[1][1]-plate.points[0][1])-.762)<1e-9);
  assert.equal(plate.points[0][2],2.134);assert.equal(plate.points[2][2],2.896);
  const u=plate.points[1].map((x,j)=>x-plate.points[0][j]),v=plate.points[2].map((x,j)=>x-plate.points[0][j]);
  assert.ok((u[1]*v[2]-u[2]*v[1])*sign.travel[0]+(u[2]*v[0]-u[0]*v[2])*sign.travel[1]<0,'plate normal faces against travel');
  const postPoints=faces.slice(0,3).flatMap(f=>f.points);assert.equal(Math.min(...postPoints.map(p=>p[2])),-.08);
  assert.ok(new Set(postPoints.map(p=>p.slice(0,2).join(','))).size===3,'closed triangular post cross-section, not a screen-space stem');
 }
});

test('complete campus signs fit unchanged GPU/triangle limits and preserve earlier objects and terrain IDs',()=>{
 const buildings=prepareBuildingDetails(read('stanford-buildings.geojson'));
 const base=buildBuildingGeometry(buildings,read('stanford-environment.geojson'),read('stanford-sculptures.geojson'),read('stanford-surfaces.geojson'),read('stanford-landscape.geojson'));
 const geometry=appendStopSigns(base,input);
 assert.equal(base.triangles,187537);assert.equal(geometry.triangles,189905);
 assert.equal(MAX_DETAIL_TRIANGLES,190000);assert.equal(MAX_GPU_GEOMETRY_BYTES,24*1024*1024);
 assert.ok(geometry.triangles<=MAX_DETAIL_TRIANGLES);assert.ok(gpuGeometryBytes(geometry.roofs)+gpuGeometryBytes(geometry.facades)<=MAX_GPU_GEOMETRY_BYTES);
 assert.equal(geometry.facades,base.facades);assert.deepEqual(geometry.roofs.subarray(0,base.roofs.length),base.roofs);
 assert.deepEqual(geometry.terrainAnchors.subarray(0,base.terrainAnchors.length),base.terrainAnchors);
 assert.deepEqual(geometry.traffic,{stops:296,sourceDirected:291,estimatedFacing:5,junctionControls:10});
 const grounding=new TerrainGrounding(buildings);assert.doesNotThrow(()=>grounding.setObjects(geometry.terrainAnchors));
 for(let i=base.roofs.length;i<geometry.roofs.length;i+=13){const id=decodeTerrainObjectId(geometry.roofs[i+12]);assert.ok(id>=base.terrainAnchors.length/2&&id<geometry.terrainAnchors.length/2);}
 assert.equal(JSON.stringify(input),before);
});

test('physical stop inputs fail visibly and a fresh worker retry restores all objects in either mode',async()=>{
 const previousSelf=globalThis.self,previousFetch=globalThis.fetch,messages=[];
 try{
  globalThis.self={postMessage:message=>messages.push(message)};
  await import('../src/building-worker.ts');
  const buildings=prepareBuildingDetails(read('stanford-buildings.geojson'));
  for(const interior of [false,true]){
   for(const failed of [manifest.controls.file,manifest.files[0].file,null]){
    messages.length=0;
    globalThis.fetch=async url=>{const file=String(url).split('/').at(-1);return file===failed?new Response('Missing',{status:503}):new Response(JSON.stringify(read(file)));};
    await self.onmessage({data:{data:buildings,interior}});await new Promise(resolve=>setImmediate(resolve));
    assert.equal(messages.length,1);
    if(failed){assert.match(messages[0].error,/Stop sign.*HTTP 503.*retry/);assert.equal(messages[0].geometry,undefined);}
    else{assert.equal(messages[0].error,undefined);assert.equal(messages[0].geometry.traffic.stops,296);assert.ok(messages[0].geometry.terrainAnchors.length>=592);}
   }
  }
 }finally{globalThis.self=previousSelf;globalThis.fetch=previousFetch;}
});
