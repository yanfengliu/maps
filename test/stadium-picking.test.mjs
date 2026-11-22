import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS as S} from '../src/building-geometry.ts';
import {hospitalSurfacePicker} from '../src/hospital-picking.ts';
import {NORTH_TICKET_BOOTH,STADIUM_CONCOURSE_ID,STADIUM_SEATING_IDS} from '../src/stadium-architecture.ts';

const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const ids=new Set([...STADIUM_SEATING_IDS,STADIUM_CONCOURSE_ID,NORTH_TICKET_BOOTH]);
const data=prepareBuildingDetails({...source,features:source.features.filter(f=>ids.has(f.properties.id))});
const {roofs,facades}=buildBuildingGeometry(data);
const picker=hospitalSurfacePicker(data,roofs,facades);
const projection=new Float32Array([.0004,0,0,0,0,.0004,0,0,0,0,-.01,0,0,0,0,1]);
const proxy=id=>({properties:{id},layer:{id:'stanford-building-picking',type:'fill-extrusion'},geometry:{type:'Polygon',coordinates:[]}});
const pick=(point,candidates)=>picker(point.map((v,i)=>v*projection[i===0?0:5]),projection,()=>0,()=>0,candidates);
const topTriangle=(id,material)=>{
  const index=data.features.findIndex(f=>f.properties.id===id);
  for(let i=0;i<roofs.length;i+=3*S){
    if(roofs[i+12]!==index||roofs[i+11]!==material)continue;
    const vertices=[0,1,2].map(n=>roofs.slice(i+n*S,i+n*S+3));
    if(!vertices.every(v=>v[2]===vertices[0][2]))continue;
    return [0,1].map(axis=>vertices.reduce((sum,v)=>sum+v[axis]/3,0));
  }
  assert.fail('Missing horizontal surface for '+id);
};

test('all football terraces and the stadium field select their actual surface and reject empty space in the queried prism',()=>{
  for(const id of STADIUM_SEATING_IDS){
    assert.equal(pick(topTriangle(id,31),[proxy(id)]),id);
    assert.equal(pick([0,0],[proxy(id)]),null);
  }
  assert.equal(pick(topTriangle(STADIUM_CONCOURSE_ID,32),[proxy(STADIUM_CONCOURSE_ID)]),STADIUM_CONCOURSE_ID);
  assert.equal(pick([0,0],[proxy(STADIUM_CONCOURSE_ID)]),null);
});

test('the foreground north ticket booth wins over the concourse and seating proxies even when its sloped roof has no native candidate',()=>{
  const booth=data.features.find(f=>f.properties.id===NORTH_TICKET_BOOTH);
  const footprint=booth.geometry.coordinates[0].slice(0,-1).map(projectLocal);
  const middle=[0,1].map(axis=>footprint.reduce((sum,p)=>sum+p[axis]/footprint.length,0));
  const candidates=[proxy('way/1363840345'),proxy(STADIUM_CONCOURSE_ID)];
  assert.equal(pick(middle,candidates),NORTH_TICKET_BOOTH);
  assert.equal(pick([middle[0]+15,middle[1]],candidates),null);
});
