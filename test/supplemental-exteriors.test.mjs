import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS as S} from '../src/building-geometry.ts';
import {hospitalSurfacePicker} from '../src/hospital-picking.ts';
import {currentBuilding} from '../src/former-campus-buildings.ts';
import {buildingPlaces} from '../src/places.ts';
import {CLOCK_PERGOLA,KNOLL_GARAGE,QUAD_RESTROOM,DIAMOND_PRESS,DIAMOND_DUGOUTS,FORMER_SPORTS_SITES} from '../src/supplemental-architecture.ts';
import {SUPPLEMENTAL_PART_REFERENCES as refs} from '../tools/quality/supplemental-part-refs.mjs';

const all=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const ids=new Set(refs.map(r=>r.ids[0]));
const original=all.features.filter(f=>ids.has(f.properties.id)),data=prepareBuildingDetails({type:'FeatureCollection',features:original});
const rendered=buildBuildingGeometry(data),byId=new Map(data.features.map((f,i)=>[f.properties.id,i]));
const get=id=>data.features[byId.get(id)];
const ring=f=>f.geometry.coordinates[0].slice(0,-1).map(projectLocal);
const meshFor=id=>{
  const index=byId.get(id),result=[];
  for(const mesh of [rendered.roofs,rendered.facades])for(let i=0;i<mesh.length;i+=3*S){
    if(mesh[i+12]===index)result.push([0,1,2].map(j=>[...mesh.slice(i+j*S,i+(j+1)*S)]));
  }
  return result;
};
const matrix=new Float32Array([.0005,0,0,0,0,.0005,0,0,0,0,-.005,0,0,0,0,1]);
const picker=hospitalSurfacePicker(data,rendered.roofs,rendered.facades);
const pick=(x,y)=>picker([x*matrix[0],y*matrix[5]],matrix,()=>0,()=>0,[]);

test('the newly identified parts retain source geometry, height provenance, and individual search and evidence records',()=>{
  assert.equal(refs.length,9);
  const places=buildingPlaces(original.filter(currentBuilding));
  for (const [i,f] of data.features.entries()){
    const id=f.properties.id;
    assert.equal(f.geometry,original[i].geometry);
    for(const key of ['height','base','heightSource','name'])assert.equal(f.properties[key],original[i].properties[key]);
    if(FORMER_SPORTS_SITES.has(id)){
      assert.ok(!currentBuilding(f)&&!f.properties.detailFlatShell);
      assert.equal(meshFor(id).length,0);
      assert.ok(!places.some(p=>p.buildingId===id));
    }else{
      const place=places.find(p=>p.buildingId===id);
      assert.equal(place.name,f.properties.detailPlaceName);
      assert.ok(refs.find(r=>r.ids[0]===id).sources.some(s=>s.kind==='document'));
    }
  }
  for(const [id,z,code] of [[KNOLL_GARAGE,4.8,'05-310'],[QUAD_RESTROOM,4.2,'01-570']]){
    const f=get(id);
    assert.deepEqual([f.properties.detailRoofHeight,f.properties.detailFacilityCode,f.properties.detailArchitecture.floors],[z,code,1]);
    assert.equal(f.properties.detailArchitecture.roofShape,'hipped');
    const verts=meshFor(id).flat();
    assert.ok(verts.some(v=>Math.abs(v[2]-z)<.001));
    assert.ok(verts.every(v=>v[2]<=z+.001));
    assert.ok(verts.some(v=>v[11]===17),'original source-clipped hipped roof topology still supplies the faces');
  }
});

test('Clock Bell Tower source way covers a low open T pergola and leaves the separate belfry footprint unmodeled',()=>{
  const f=get(CLOCK_PERGOLA),tris=meshFor(CLOCK_PERGOLA),verts=tris.flat();
  assert.equal(ring(f).length,8);
  assert.equal(f.properties.detailRoofHeight,3.7);
  assert.ok(verts.every(v=>v[2]>=0&&v[2]<=3.701));
  assert.ok(verts.some(v=>v[2]<.01));
  const roofArea=tris.filter(t=>t.every(v=>Math.abs(v[2]-3.7)<.001)).reduce((n,[a,b,c])=>n+Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2,0);
  assert.ok(roofArea>14&&roofArea<22,'narrow slats leave most of the T open');
  assert.equal(pick(73.89,-205.74),null,'center of the separate 3.8 m tower square from the Stanford plan');
  const top=tris.find(t=>t.every(v=>Math.abs(v[2]-3.7)<.001));
  assert.equal(pick(top.reduce((s,v)=>s+v[0]/3,0),top.reduce((s,v)=>s+v[1]/3,0)),CLOCK_PERGOLA);
});

test('both baseball dugouts have open fronts, solid backs and accurately selectable rooftops along their own baselines',()=>{
  for (const id of DIAMOND_DUGOUTS){
    const outline=ring(get(id)),tris=meshFor(id),verts=tris.flat();
    assert.equal(get(id).properties.detailWallHeight,.12);
    assert.ok(verts.every(v=>v[2]>=0&&v[2]<=2));
    const roof=tris.filter(t=>t.every(v=>Math.abs(v[2]-2)<.001&&v[5]>.99));
    assert.ok(roof.length>=2);
    const center=outline.reduce(([sx,sy],[x,y])=>[sx+x/outline.length,sy+y/outline.length],[0,0]);
    assert.equal(pick(...center),id);
    const faces=tris.filter(t=>Math.min(...t.map(v=>v[2]))===0&&Math.max(...t.map(v=>v[2]))>1.8);
    const large=faces.filter(t=>Math.max(...t.map(v=>v[0]))-Math.min(...t.map(v=>v[0]))>3);
    assert.equal(large.length,4,'two split back edges get full walls, while the straight field-facing edge stays open');
    assert.ok(faces.length>large.length+4,'narrow canopy posts reach the ground');
  }
  const press=get(DIAMOND_PRESS),faces=meshFor(DIAMOND_PRESS);
  assert.equal(press.properties.detailArchitecture.roofShape,'flat');
  assert.equal(press.properties.detailRoofHeight,9);
  const windows=faces.filter(t=>t.every(v=>Math.abs(v[6]-.34)<.001&&v[2]>4));
  assert.equal(windows.length,8);
  assert.ok(windows.flat().every(v=>v[1]<519),'the glazed field-facing band belongs on the south face');
});
