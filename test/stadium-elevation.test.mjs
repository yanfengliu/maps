import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,VERTEX_FLOATS} from '../src/building-geometry.ts';
const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))),mesh=buildBuildingGeometry(prepareBuildingDetails(data));
function triangles(id){const index=data.features.findIndex(f=>f.properties.id===id),out=[];for(const values of [mesh.roofs,mesh.facades])for(let i=0;i<values.length;i+=VERTEX_FLOATS*3)if(values[i+12]===index)out.push([0,1,2].map(j=>Array.from(values.slice(i+j*VERTEX_FLOATS,i+(j+1)*VERTEX_FLOATS))));return out;}
test('stadium west elevation has an outlined emblem, distinct glazed volumes and physical floor frames within mapped envelopes',()=>{
 for(const id of ['way/1354418130','way/1354417642','way/1354417643','way/1354417644','way/232715861']){
  const faces=triangles(id),p=data.features.find(f=>f.properties.id===id).properties;
  assert.ok(faces.some(t=>t[0][11]===35),id+' needs glazing');
  assert.ok(faces.filter(t=>t[0][11]===34).length>20,id+' needs physical frames, not a painted box');
  for(const v of faces.flat())assert.ok(v.every(Number.isFinite)&&v[2]>=p.base-.001&&v[2]<=p.height+.001);
 }
 const emblem=triangles('way/1354418130').filter(t=>t[0][11]===36);assert.ok(emblem.length>100);
 assert.ok(emblem.flat().every(v=>v[2]>16&&v[2]<34),'emblem belongs above the lower entrance bays');
 const concourse=triangles('relation/18614805');assert.ok(concourse.some(t=>t[0][11]===38),'service-gate wall material differs from generic offices');
});
test('elevated connecting walkway has real openings between deck, rails and posts',()=>{
 const faces=triangles('way/1357063452');assert.ok(faces.length>50);
 const zExtent=t=>Math.max(...t.map(v=>v[2]))-Math.min(...t.map(v=>v[2]));
 const horizontal=t=>Math.max(...t.map(v=>v[0]))-Math.min(...t.map(v=>v[0]))>1||Math.max(...t.map(v=>v[1]))-Math.min(...t.map(v=>v[1]))>1;
 assert.ok(faces.every(t=>!horizontal(t)||zExtent(t)<.2),'no wide opaque sheet may fill a railing opening');
 assert.ok(faces.flat().every(v=>v[2]>=24&&v[2]<=25),'deck stays at its mapped elevated level');
});
