import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACILITY_ELEVATIONS,facilityModelHeight} from '../src/facility-elevations.ts';
import {buildBuildingGeometry,prepareBuildingDetails,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {describeBuildingArchitecture} from '../src/building-architecture.ts';

const all=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const photos=JSON.parse(readFileSync(new URL('../tools/quality/facility-refs-photos.json',import.meta.url)));
const source={...all,features:all.features.filter(f=>FACILITY_ELEVATIONS[f.properties.id])};
const prepared=prepareBuildingDetails(source), mesh=buildBuildingGeometry(prepared);
const faces=new Map();
for(const [owner,feature] of prepared.features.entries()){
  const triangles=[];
  for(let offset=0;offset<mesh.roofs.length;offset+=VERTEX_FLOATS*3){
    if(mesh.roofs[offset+12]!==owner)continue;
    triangles.push([0,1,2].map(j=>mesh.roofs.subarray(offset+j*VERTEX_FLOATS,offset+(j+1)*VERTEX_FLOATS)));
  }
  faces.set(feature.properties.detailFacilityCode,triangles);
}
const near=(a,b)=>Math.abs(a-b)<.001;
const flatAt=(tri,z)=>tri.every(v=>near(v[2],z));
const rgb=v=>[...v.slice(6,9)].map(c=>Math.round(c*255)).join(',');

test('six photographed exterior models retain their source heights, geometry, individual card identifiers and roof bounds',()=>{
  assert.deepEqual([...faces.keys()].sort(),['09-358','13-010','14-600','14-610','14-620','14-630']);
  assert.equal(mesh.facades.length,0,'the six complete models cannot receive a generic window overlay');
  for(const [i,{properties:p,geometry}] of prepared.features.entries()){
    const triangles=faces.get(p.detailFacilityCode),profile=FACILITY_ELEVATIONS[p.id];
    const record=photos.facilities.find(f=>f.code===profile.code);
    assert.equal(record.status,'exterior-photo'); assert.ok(record.images[0].image.endsWith('.jpg'));
    assert.equal(geometry,source.features[i].geometry);assert.equal(p.height,source.features[i].properties.height);
    assert.equal(p.heightSource,'estimated'); assert.equal(p.detailRoofHeight,profile.modelHeight);
    assert.equal(p.detailArchitecture.floors,1);assert.equal(p.detailArchitecture.roofSource,'reference-profile');
    assert.equal(p.detailWallColor,profile.wall);assert.equal(p.detailRoofColor,profile.roof);
    assert.match(describeBuildingArchitecture(p),/estimates/);
    const vertices=triangles.flat();
    assert.ok(vertices.every(v=>v[11]===2 && v[2]>=p.base-.001),profile.form);
    assert.ok(near(Math.max(...vertices.map(v=>v[2])),p.detailRoofHeight),profile.form);
    assert.equal(facilityModelHeight(p.id,0,11,'osm-height'),11,'a subsequently mapped height takes precedence');
  }
  assert.equal(facilityModelHeight('way/unknown',0,12,'estimated'),undefined);
});

test('the Mausoleum has four spatially separate round columns in front of the chamber and two triangular pediment borders',()=>{
  const triangles=faces.get('13-010'),top=FACILITY_ELEVATIONS['way/232715721'].modelHeight;
  const shafts=triangles.filter(t=>t.some(v=>near(v[2],.205*top))&&t.some(v=>near(v[2],.674*top)));
  assert.equal(shafts.length,4*8*2);
  const bottom=new Map();
  for(const v of shafts.flat().filter(v=>near(v[2],.205*top)))bottom.set(v[0]+','+v[1],v);
  const remaining=new Set(bottom.values()),groups=[];
  while(remaining.size){
    const group=[remaining.values().next().value];remaining.delete(group[0]);
    for(const p of group)for(const v of remaining)if(Math.hypot(p[0]-v[0],p[1]-v[1])<.38){group.push(v);remaining.delete(v);}
    groups.push(group);
  }
  assert.deepEqual(groups.map(g=>g.length),[8,8,8,8]);
  const center=group=>group.reduce((sum,v)=>sum+v[0]-v[1],0)/group.length;
  const chamber=triangles.filter(t=>t.some(v=>near(v[2],.155*top))&&t.some(v=>near(v[2],.74*top))).flat();
  assert.ok(chamber.length>0 && groups.every(g=>center(g)>Math.max(...chamber.map(v=>v[0]-v[1]))+1),'open southeast approach precedes the chamber');
  for(const peak of [.975,.961])assert.equal(triangles.filter(t=>t.some(v=>near(v[2],peak*top))).length,1);
});

test('the four yellow halls retain the distinct porch, roof lights, independent lower wing and sparse door or windows in their photographs',()=>{
  const barnes=faces.get('14-630'),bleeker=faces.get('14-620'),wadsworth=faces.get('14-610'),price=faces.get('14-600');
  assert.ok(barnes.some(t=>rgb(t[0])==='112,107,97'),'Barnes central door');
  assert.ok(!barnes.some(t=>rgb(t[0])==='93,113,123'),'Barnes has no invented glazed rows');
  assert.equal(bleeker.filter(t=>rgb(t[0])==='212,209,198' && t.some(v=>near(v[2],0))).length,16,'two independent porch posts');
  const upperLights=wadsworth.filter(t=>rgb(t[0])==='212,209,198' && t.every(v=>v[2]>3.8));
  assert.equal(upperLights.length,4,'two raised roof lights');
  assert.equal(wadsworth.filter(t=>rgb(t[0])==='93,113,123').length,8,'one short four-pane group');
  assert.ok(price.some(t=>flatAt(t,.61*5.2)&&rgb(t[0])==='178,181,174'));
  assert.ok(price.some(t=>t.some(v=>near(v[2],5.2))&&t.some(v=>near(v[2],.68*5.2))),'separate upper gable');
});

test('the softball field house has a single high eight-pane ribbon and a taller inset door',()=>{
  const panels=faces.get('09-358').filter(t=>rgb(t[0])==='93,113,123');
  assert.equal(panels.filter(t=>t.every(v=>v[2]>=.584*4.3 && v[2]<=.691*4.3)).length,16);
  assert.equal(panels.filter(t=>t.some(v=>near(v[2],0))).length,2);
  assert.equal(prepared.features.find(f=>f.properties.detailFacilityCode==='09-358').properties.detailFacilityName,'Softball Field House');
});
