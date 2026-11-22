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

test('the historic inventory retains all 23 former shapes and the duplicated 670/672 Lomita parent and the current mesh emits none',()=>{
  const former=source.features.filter(f=>!currentBuilding(f));
  assert.equal(former.length,24);
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
      if(form==='barn')assert.equal(tris.filter(t=>t.every(v=>v[2]===p.height)).length,4,'two rectangular clerestory caps');
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

test('the combined Lomita footprint is fully accounted for and the Lodge selects the correct one of its two buildings',async()=>{
  const {composeBuildingParts}=await import('../src/compose-building-parts.ts');
  const {buildingPlaces,searchPlaces}=await import('../src/places.ts');
  const geo=id=>source.features.find(f=>f.properties.id===id).geometry;
  const remainder=composeBuildingParts(geo('way/1169967277'),['way/232805700','way/232805701'].map(geo),projectLocal);
  const points=g=>g.coordinates[0].slice(0,-1).map(v=>v.join(',')).sort();
  assert.deepEqual(points(remainder),points(geo('way/1169967278')));
  const places=buildingPlaces(prepared.features.filter(currentBuilding));
  for(const q of ['The Lodge','672 Lomita','Breer Library'])assert.equal(searchPlaces(q,places)[0].buildingId,'way/232805701');
  assert.equal(searchPlaces('670 Lomita',places)[0].buildingId,'way/232805700');
});

test('Burnham entrance has a street-facing gable, two valleys and three front arch bays',()=>{
  const id='way/232805658',f=prepared.features.find(f=>f.properties.id===id),ring=f.geometry.coordinates[0].slice(0,-1).map(projectLocal);
  const caps=parts.get(id).filter(t=>t[0][11]===17),verts=caps.flat();
  const zAt=p=>Math.max(...verts.filter(v=>Math.hypot(v[0]-p[0],v[1]-p[1])<.001).map(v=>v[2]));
  assert.ok(zAt(ring[4])>zAt(ring[3])+1&&zAt(ring[4])>zAt(ring[5])+1,'front center rises above both corners');
  assert.equal(zAt(ring[4]),f.properties.height);
  const area=r=>Math.abs(r.reduce((s,v,i)=>{const q=r[(i+1)%r.length];return s+v[0]*q[1]-v[1]*q[0];},0))/2;
  assert.equal(caps.length,11);
  assert.ok(caps.every(t=>area(t)>.01),'each roof triangle covers a measurable patch');
  assert.ok(Math.abs(caps.reduce((s,t)=>s+area(t),0)-area(ring))<.02,'the roof covers the T-shaped footprint once');
  const arches=parts.get(id).filter(t=>t[0][11]===3).flat();
  assert.equal(arches.length,12);
  assert.ok(Math.abs(Math.max(...arches.map(v=>v[9]))-11.4)<.001);
});

test('Mitchell preserves sixteen source-column sections and the overhanging upper block without invented roofs or windows on the posts',async()=>{
  const {MITCHELL_COLUMNS,MITCHELL_UPPER}=await import('../src/mitchell-exterior.ts');
  assert.equal(MITCHELL_COLUMNS.size,16);
  for(const id of MITCHELL_COLUMNS){
    const f=prepared.features.find(f=>f.properties.id===id),p=f.properties;
    assert.deepEqual(f.geometry,source.features.find(f=>f.properties.id===id).geometry);
    assert.equal(p.detailArchitecture.floors,null);
    assert.equal(p.detailArchitecture.roofShape,'flat');
    assert.deepEqual(new Set(parts.get(id).flat().map(v=>v[11])),new Set([2,9]));
  }
  const upper=prepared.features.find(f=>f.properties.id===MITCHELL_UPPER);
  assert.equal(upper.properties.base,3);
  assert.equal(upper.properties.detailPlaceName,'Mitchell Earth Sciences');
  assert.ok(parts.get(MITCHELL_UPPER).some(t=>t[0][11]===46));
});
