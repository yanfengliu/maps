import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS as S} from '../src/building-geometry.ts';
import {hospitalSurfacePicker} from '../src/hospital-picking.ts';
import {currentBuilding} from '../src/former-campus-buildings.ts';
import {buildingPlaces} from '../src/places.ts';
import {CLOCK_PERGOLA,KNOLL_BAY,KNOLL_PARENT,KNOLL_WINGS,KNOLL_GARAGE,QUAD_RESTROOM,DIAMOND_PRESS,DIAMOND_DUGOUTS,FORMER_SPORTS_SITES} from '../src/supplemental-architecture.ts';
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
  assert.equal(refs.length,10);
  const places=buildingPlaces(original.filter(currentBuilding));
  for (const [i,f] of data.features.entries()){
    const id=f.properties.id;
    assert.equal(f.geometry,original[i].geometry);
    for(const key of ['height','base','heightSource','name'])assert.equal(f.properties[key],original[i].properties[key]);
    if(FORMER_SPORTS_SITES.has(id)||id===KNOLL_BAY){
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

test('the six-vertex Knoll projection is drawn on its five shared parent edges with three arches and one selectable parent',()=>{
  const parent=all.features.find(f=>f.properties.id===KNOLL_PARENT),child=all.features.find(f=>f.properties.id===KNOLL_BAY);
  assert.deepEqual(child.geometry.coordinates[0].slice(0,-1),parent.geometry.coordinates[0].slice(5,11));
  const combined=prepareBuildingDetails({type:'FeatureCollection',features:[parent,child]});
  const {roofs,facades}=buildBuildingGeometry(combined);
  for(const mesh of [roofs,facades])for(let i=0;i<mesh.length;i+=S)assert.equal(mesh[i+12],0);
  const visible=buildingPlaces(combined.features.filter(currentBuilding));
  assert.deepEqual(visible.map(f=>f.buildingId),[KNOLL_PARENT]);
  const source=ring(parent),arches=new Map();
  const distance=(p,a,b)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  };
  for(let i=0;i<roofs.length;i+=3*S){
    if(Math.abs(roofs[i+6]-.25)>.001||Math.abs(roofs[i+7]-.22)>.001)continue;
    const vertices=[0,1,2].map(j=>roofs.subarray(i+j*S,i+j*S+2));
    const edge=[6,7,8].find(j=>vertices.every(v=>distance(v,source[j],source[j+1])<.09));
    assert.notEqual(edge,undefined);
    arches.set(edge,(arches.get(edge)??0)+1);
  }
  assert.deepEqual([...arches.entries()],[[6,10],[7,10],[8,10]]);
});

test('the current Knoll partitions one source footprint among the three original wings and two parent projections',()=>{
  const source=all.features.filter(f=>KNOLL_WINGS.has(f.properties.id)||f.properties.id===KNOLL_PARENT||f.properties.id===KNOLL_BAY);
  const composed=prepareBuildingDetails({type:'FeatureCollection',features:source}),geometry=buildBuildingGeometry(composed);
  const parent=source.find(f=>f.properties.id===KNOLL_PARENT),bay=source.find(f=>f.properties.id===KNOLL_BAY);
  const active=composed.features.filter(currentBuilding),built=active.find(f=>f.properties.id===KNOLL_PARENT);
  assert.equal(active.length,4);
  assert.deepEqual(active.filter(f=>(f.properties.detailMapLabel??f.properties.name)==='The Knoll').map(f=>f.properties.id),['way/1168128441']);
  assert.equal(built.geometry.type,'MultiPolygon');
  assert.equal(built.geometry.coordinates.length,2);
  assert.deepEqual(built.geometry.coordinates[0],bay.geometry.coordinates);
  const area=coords=>{
    const origin=coords[0],local=coords.map(p=>[p[0]-origin[0],p[1]-origin[1]]);
    return Math.abs(local.slice(1).reduce((sum,p,i)=>sum+local[i][0]*p[1]-p[0]*local[i][1],0))/2;
  };
  const areas=built.geometry.coordinates.map(poly=>area(poly[0]));
  for(const wing of active.filter(f=>KNOLL_WINGS.has(f.properties.id))){
    assert.deepEqual(wing.geometry,source.find(f=>f.properties.id===wing.properties.id).geometry);
    areas.push(area(wing.geometry.coordinates[0]));
    const index=composed.features.indexOf(wing);
    let rises=false;
    for(let i=0;i<geometry.roofs.length;i+=3*S){
      const v=geometry.roofs;
      if(v[i+12]===index&&v[i+11]===17&&Math.max(v[i+2],v[i+S+2],v[i+2*S+2])-Math.min(v[i+2],v[i+S+2],v[i+2*S+2])>.2)rises=true;
    }
    for(let i=0;i<geometry.roofs.length;i+=S){
      const v=geometry.roofs;
      if(v[i+12]===index&&v[i+11]===2)assert.ok(v[i+2]<=wing.properties.detailWallHeight+.08,'solid returns and cornices finish at the eaves');
    }
    assert.ok(rises,wing.properties.id+' retains its own hipped roof');
  }
  assert.ok(Math.abs(areas.reduce((sum,n)=>sum+n,0)/area(parent.geometry.coordinates[0])-1)<1e-8);
  const select=hospitalSurfacePicker(composed,geometry.roofs,geometry.facades);
  for(const part of active){
    const index=composed.features.indexOf(part),v=geometry.roofs;
    let triangle=-1;
    for(let i=0;i<v.length;i+=3*S)if(v[i+12]===index&&v[i+11]===17){triangle=i;break;}
    assert.ok(triangle>=0);
    const point=[0,1].map(axis=>[0,1,2].reduce((n,j)=>n+v[triangle+j*S+axis]/3,0)*matrix[axis===0?0:5]);
    assert.equal(select(point,matrix,()=>0,()=>0,[]),part.properties.id,'a roof stays selectable with the native shells hidden');
  }
});
