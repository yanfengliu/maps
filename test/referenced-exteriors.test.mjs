import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {currentBuilding} from '../src/former-campus-buildings.ts';
import {FARM_FORMS} from '../src/farm-exteriors.ts';
import {BASEBALL_FRONT,BASEBALL_FIELD} from '../src/baseball-seating.ts';

const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const prepared=prepareBuildingDetails(source),mesh=buildBuildingGeometry(prepared);
const parts=new Map(prepared.features.map(f=>[f.properties.id,[]]));
for(const buffer of [mesh.roofs,mesh.facades])for(let i=0;i<buffer.length;i+=3*VERTEX_FLOATS){
  const feature=prepared.features[buffer[i+12]];
  if(feature)parts.get(feature.properties.id).push([0,1,2].map(j=>buffer.subarray(i+j*VERTEX_FLOATS,i+(j+1)*VERTEX_FLOATS)));
}

test('the historic inventory retains all 21 former shapes and the current mesh emits none',()=>{
  const former=source.features.filter(f=>!currentBuilding(f));
  assert.equal(former.length,21);
  for(const f of former)assert.equal(parts.get(f.properties.id).length,0,f.properties.id);
  assert.equal(prepared.features.length,648);
});

test('photographed greenhouses, timber buildings and open panel canopies have independent roof and support geometry',()=>{
  assert.equal(Object.keys(FARM_FORMS).length,11);
  for(const [id,form] of Object.entries(FARM_FORMS)){
    const tris=parts.get(id),p=prepared.features.find(f=>f.properties.id===id).properties;
    assert.ok(tris.length>9,id);
    assert.ok(tris.flat().every(v=>v[2]>=p.base-.001&&v[2]<=p.height+.001),id);
    if(form==='array'||form==='canopy'){
      const floorContacts=tris.flat().filter(v=>v[2]===p.base);
      const footprint=source.features.find(f=>f.properties.id===id).geometry.coordinates[0].map(projectLocal);
      assert.ok(floorContacts.length>=8&&floorContacts.every(v=>footprint.every(b=>Math.hypot(b[0]-v[0],b[1]-v[1])>.5)),id+' ground contacts are inset posts');
    }else{
      const kinds=new Set(tris.map(tri=>tri[0][11]));
      assert.ok(kinds.has(form==='glasshouse'?59:48),id);
      assert.ok(tris.some(t=>t.some(v=>v[2]===p.height)&&t.some(v=>v[2]<p.height-.01)),id+' pitched roof');
    }
  }
});

test('all 22 Klein Field seating sections rise away from the infield and their treads cover each footprint once',()=>{
  assert.equal(Object.keys(BASEBALL_FRONT).length,22);
  const field=projectLocal(BASEBALL_FIELD);
  for(const id of Object.keys(BASEBALL_FRONT)){
    const f=prepared.features.find(f=>f.properties.id===id),ring=f.geometry.coordinates[0].slice(0,-1).map(projectLocal);
    const seats=parts.get(id).filter(t=>t[0][11]===31&&t.every(v=>v[2]===t[0][2]));
    const elevations=[...new Set(seats.map(t=>t[0][2]))].sort((a,b)=>a-b);
    assert.ok(elevations.length>=4&&Math.abs(elevations.at(-1)-f.properties.height)<.001,id);
    const meanDistance=z=>{const verts=seats.filter(t=>t[0][2]===z).flat();return verts.reduce((s,v)=>s+Math.hypot(v[0]-field[0],v[1]-field[1]),0)/verts.length;};
    assert.ok(meanDistance(elevations.at(-1))>meanDistance(elevations[0]),id+' rear treads must be farther from the diamond');
    const area=r=>Math.abs(r.reduce((sum,v,i)=>{const q=r[(i+1)%r.length];return sum+v[0]*q[1]-v[1]*q[0];},0))/2;
    assert.ok(Math.abs(seats.reduce((s,t)=>s+area(t),0)-area(ring))<.035,id+' tessellation');
  }
});

test('Clark Auditorium retains its source height in the inventory and exposes only the low stage and skylight',()=>{
  const id='way/158630338',p=prepared.features.find(f=>f.properties.id===id).properties;
  assert.equal(p.height,12);assert.equal(p.heightSource,'estimated');assert.equal(p.detailRoofHeight,.3);
  const cap=parts.get(id).filter(t=>t.every(v=>v[2]>0.299));
  assert.equal(new Set(cap.map(t=>Array.from(t[0].slice(6,9)).join(','))).size,2);
  assert.ok(parts.get(id).flat().every(v=>v[2]<.301));
});
