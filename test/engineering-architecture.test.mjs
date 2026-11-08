import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingArchitecture,buildingMaterials,describeBuildingArchitecture} from '../src/building-architecture.ts';
import {ENGINEERING_REFERENCES,UNVERIFIED_ACADEMIC_IDS,engineeringRoofOffset} from '../src/engineering-architecture.ts';
import {addEngineeringElevation,addEngineeringMonitors} from '../src/engineering-geometry.ts';
import {prepareBuildingDetails,buildBuildingGeometry,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url),'utf8'));
const references=source.features.filter(f=>ENGINEERING_REFERENCES[f.properties.id]);
const historic=['way/232841907','way/232841919','way/232841878','way/232841924'];
const mesh=()=>{const triangles=[];return {triangles,triangle(a,b,c,tint,kind,building,uv){triangles.push({points:[a,b,c],kind,uv});},quad(a,b,c,d,tint,kind,building,uv){this.triangle(a,b,c,tint,kind,building,uv?.slice(0,3));this.triangle(a,c,d,tint,kind,building,uv&&[uv[0],uv[2],uv[3]]);}};};

test('academic names cannot infer a glass facade or a flat roof for an otherwise identical building',()=>{
  const neutral=buildingArchitecture({id:'unknown',building:'university',name:'Hall',height:12,base:0},10);
  for(const name of ['Engineering Administration','Physics Laboratory','Science Teaching','Research Center','Medical School']){
    assert.deepEqual(buildingArchitecture({id:'unknown',building:'university',name,height:12,base:0},10),neutral,name);
  }
});

test('all researched workshop IDs select tall masonry bays and tile monitor roofs, not the former three-row glass treatment',()=>{
  assert.equal(references.length,7);
  for(const id of historic){
    const f=source.features.find(f=>f.properties.id===id),p=f.properties,a=buildingArchitecture(p,p.height);
    assert.equal(a.facadeFamily,'workshop',id);assert.equal(a.floors,1,id);assert.equal(a.floorSource,'reference-profile');
    assert.equal(a.roofShape,'hipped',id);assert.equal(a.roofSource,'reference-profile');assert.equal(a.profile,'institutional');
    const materials=buildingMaterials(p,a);assert.equal(materials.roof,'#a86b4c');
    assert.match(describeBuildingArchitecture({...p,detailArchitecture:a}),/mapped footprint and source height are retained/i);
  }
  assert.equal(buildingArchitecture(source.features.find(f=>f.properties.id==='way/26292283').properties,12).facadeFamily,'concrete-frame');
  assert.equal(buildingArchitecture(source.features.find(f=>f.properties.id==='way/469393555').properties,12).facadeFamily,'sandstone');
  assert.equal(buildingArchitecture(source.features.find(f=>f.properties.id==='way/232841932').properties,12).facadeFamily,'aggregate');
});

test('the complete remaining academic-glass backlog is explicit and labeled unverified',()=>{
  assert.equal(UNVERIFIED_ACADEMIC_IDS.size,16);
  for(const id of UNVERIFIED_ACADEMIC_IDS){
    const p=source.features.find(f=>f.properties.id===id)?.properties;assert.ok(p,id);
    const a=buildingArchitecture(p,p.height);assert.equal(a.facadeFamily,'unverified');assert.equal(a.profile,'institutional');assert.equal(a.roofShape,'flat');
    assert.match(describeBuildingArchitecture({...p,detailArchitecture:a}),/not yet been checked/);
  }
});

test('profile render preparation preserves every source geometry, height, base, and tag',()=>{
  const before=JSON.stringify(references),prepared=prepareBuildingDetails({type:'FeatureCollection',features:references});
  assert.equal(JSON.stringify(references),before);
  for(let i=0;i<references.length;i++){
    assert.equal(prepared.features[i].geometry,references[i].geometry);
    for(const [key,value] of Object.entries(references[i].properties))assert.deepEqual(prepared.features[i].properties[key],value);
  }
});

test('workshop materials carry a single complete tall bay and southern pilasters retain fixed geographic orientation',()=>{
  const stone=mesh(),stucco=mesh(),merl=mesh();
  assert.ok(addEngineeringElevation(stone,'way/232841919',[0,0],[48,0],[0,1],0,6,0,[1,1,1]));
  assert.ok(addEngineeringElevation(stucco,'way/232841878',[0,0],[48,0],[0,-1],0,6,0,[1,1,1]));
  assert.ok(addEngineeringElevation(merl,'way/26292283',[0,0],[48,0],[0,1],0,12,0,[1,1,1]));
  assert.deepEqual([...new Set(stone.triangles.map(t=>t.kind))],[50]);
  assert.deepEqual([...new Set(stucco.triangles.map(t=>t.kind))],[51,2]);assert.deepEqual([...new Set(merl.triangles.map(t=>t.kind))],[52,2]);
  const floor=merl.triangles.filter(t=>t.kind===2&&t.points.every(v=>v[2]>5.8&&v[2]<6.2));
  assert.equal(floor.length,6,'MERL needs a continuous physical concrete floor band between its two storeys');
  assert.ok(floor.some(t=>t.points.some(v=>v[1]>.2)),'floor edge must have actual relief');
  for(const t of [...stone.triangles,...stucco.triangles].filter(t=>t.kind!==2))for(const uv of t.uv)assert.ok(uv[1]>=0&&uv[1]<=1);
  assert.ok(stucco.triangles.some(t=>t.points.some(v=>v[1]<-.2)),'pilasters have physical depth');
});

test('all six roof monitors fit their mapped wings, avoid courtyards and remain in the original height envelope',()=>{
  let total=0,tris=0;
  const inside=(p,ring)=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
  for(const f of prepareBuildingDetails({type:'FeatureCollection',features:references}).features){
    const p=f.properties,rings=f.geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal)),m=mesh();
    const count=addEngineeringMonitors(m,p.id,rings,0,p.detailWallHeight,p.height,[1,1,1]);total+=count;tris+=m.triangles.length;
    assert.equal(m.triangles.length,count*14);
    if(historic.includes(p.id)){assert.ok(count>0);assert.ok(engineeringRoofOffset(p.id,p.detailWallHeight,p.height)>0);}
    for(const t of m.triangles)for(const v of t.points){assert.ok(v.every(Number.isFinite));assert.ok(v[2]>=p.detailWallHeight&&v[2]<=p.height);assert.ok(inside(v,rings[0]));assert.ok(!rings.slice(1).some(r=>inside(v,r)));}
  }
  assert.equal(total,6);assert.equal(tris,84);
});

test('integrated engineering geometry contains dedicated surfaces and keeps every vertex within its original vertical envelope',()=>{
  const prepared=prepareBuildingDetails({type:'FeatureCollection',features:references}),g=buildBuildingGeometry(prepared),kinds=new Set();
  for(const buffer of [g.roofs,g.facades])for(let i=0;i<buffer.length;i+=VERTEX_FLOATS){
    kinds.add(Math.round(buffer[i+11]));
    const p=prepared.features[Math.round(buffer[i+12])]?.properties;
    assert.ok(p,'vertex retains its building identity');
    assert.ok(Number.isFinite(buffer[i+2]));
    assert.ok(buffer[i+2]>=p.base-1e-4&&buffer[i+2]<=p.height+1e-4,p.id);
  }
  for(const kind of [50,51,52])assert.ok(kinds.has(kind),`missing material ${kind}`);
  assert.ok(g.triangles<2500,'bounded detail for seven buildings');
});
