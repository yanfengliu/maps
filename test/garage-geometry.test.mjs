import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareBuildingDetails,buildBuildingGeometry,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {garageProfile,referenceGarageHeight,OPEN_GARAGE_IDS,GARAGE_ACCESS_IDS,SCREENED_GARAGE_ID,describeGarage} from '../src/garage-architecture.ts';
import {GARAGE_FRAGMENT} from '../src/garage-materials.ts';
import {garageCirculation} from '../src/garage-circulation.ts';
const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url),'utf8'));
const prepared=prepareBuildingDetails(source),mesh=buildBuildingGeometry(prepared);
const vertices=(array,index)=>{const out=[];for(let i=0;i<array.length;i+=VERTEX_FLOATS)if(array[i+12]===index)out.push([...array.slice(i,i+VERTEX_FLOATS)]);return out;};
const smallIds=['232715583','232715671','232715675','232715678','232715681','232715695','232715704','232715710','232715713','232715716','232715720','232715732','232715734','232715737','232715741','232715762','232715772','232715777','232715786','232715800','232715804','232715812','232715816','232715820','232715833','232715836','232715844','232805754','383998360','383998363','383998364'].map(id=>'way/'+id);
const polygonArea=ring=>Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);

test('all 38 mapped garage features are explicitly audited without treating small access structures as parking decks',()=>{
 const candidates=source.features.filter(f=>/garage|parking/i.test(JSON.stringify(f.properties)));
 assert.deepEqual(candidates.map(f=>f.properties.id).sort(),[...OPEN_GARAGE_IDS,SCREENED_GARAGE_ID,...GARAGE_ACCESS_IDS,...smallIds].sort());
 assert.equal(candidates.length,38);
 for(const feature of candidates){const p=feature.properties,g=garageProfile(p);assert.ok(g,p.id);assert.equal(g.kind,OPEN_GARAGE_IDS.has(p.id)?'open-deck':p.id===SCREENED_GARAGE_ID?'screened':GARAGE_ACCESS_IDS.has(p.id)?'access':'small');}
 assert.deepEqual([...OPEN_GARAGE_IDS].map(id=>garageProfile(source.features.find(f=>f.properties.id===id).properties).levels),[4,5,4,6]);
 assert.equal(garageProfile({id:'unknown',building:'parking',height:60}).kind,'small','a name/type alone cannot invent multiple open decks');
 assert.equal(garageProfile({id:'unknown',building:'university'}),undefined);
});

test('only reviewed estimated garage heights can change; below-ground floors and measured heights never inflate the render',()=>{
 const before=JSON.stringify(source);prepareBuildingDetails(source);assert.equal(JSON.stringify(source),before);
 for(const feature of source.features){const p=feature.properties,h=referenceGarageHeight(p);if(h!==undefined)assert.equal(h,{'way/26249768':10,'way/232841898':10,'way/324983017':16}[p.id]);}
 const hoover=source.features.find(f=>f.properties.id==='way/324983017').properties;
 assert.equal(hoover.height,10);assert.equal(referenceGarageHeight(hoover),16,'six above-ground deck levels, not nine total levels');
 for(const change of [{heightSource:'osm-height',height:22},{'osm:height':'22'},{heightSource:'osm-levels',height:27},{id:'way/unreviewed'}])assert.equal(referenceGarageHeight({...hoover,...change}),undefined);
 assert.equal(referenceGarageHeight(source.features.find(f=>f.properties.id===SCREENED_GARAGE_ID).properties),undefined);
 assert.match(describeGarage(hoover),/estimated.*original source height remains unchanged/);
});

test('every reviewed open garage preserves the pinned deck area except the functional ramp well',()=>{
 for(const id of OPEN_GARAGE_IDS){
  const index=source.features.findIndex(f=>f.properties.id===id),p=prepared.features[index].properties,profile=garageProfile(p),roofs=vertices(mesh.roofs,index),facades=vertices(mesh.facades,index);
  const top=p.detailRoofHeight-.9,rise=(top-p.base)/(profile.levels-1),levels=new Map();
  for(let i=0;i<roofs.length;i+=3){const tri=roofs.slice(i,i+3);if(tri[0][11]!==41&&tri[0][11]!==9)continue;if(!tri.every(v=>Math.abs(v[2]-tri[0][2])<1e-4))continue;const z=tri[0][2],a=tri[0],b=tri[1],c=tri[2],area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;levels.set(z,(levels.get(z)||0)+area);}
  const rings=source.features[index].geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal)),expected=polygonArea(rings[0])-rings.slice(1).reduce((sum,r)=>sum+polygonArea(r),0);
  const plan=garageCirculation(rings,rise),openingArea=polygonArea(plan.opening);
  for(let level=0;level<profile.levels;level++){const z=p.base+level*rise+(level===0?.06:0),surface=[...levels].find(([height])=>Math.abs(height-z)<.001);assert.ok(surface,`${id} missing deck${level}`);assert.ok(Math.abs(surface[1]-(expected-(level?openingArea:0)))<.1,`${id} deck must preserve its perimeter and source holes, with exactly the ramp opening removed`);}
  const rail=facades.filter(v=>v[11]===40),columns=facades.filter(v=>v[11]===2);assert.ok(rail.length>30&&columns.length>100,'real rail faces and physical supports');
  for(let i=0;i<rail.length;i+=3){const tri=rail.slice(i,i+3);assert.ok(Math.max(...tri.map(v=>v[2]))-Math.min(...tri.map(v=>v[2]))<=1.081,'no full-height opaque wall between decks');}
  assert.ok(roofs.some(v=>v[11]===41),'top is a parking deck, not a featureless cap');
  for(const v of roofs.concat(facades))assert.ok(v[2]>=p.base-.001&&v[2]<=p.detailRoofHeight+.001,`${id} exceeds its reviewed rendering envelope`);
 }
});

test('physical ramps connect every deck through unobstructed openings with vehicle clearance and two-way lanes',()=>{
 for(const id of OPEN_GARAGE_IDS){
  const index=source.features.findIndex(f=>f.properties.id===id),p=prepared.features[index].properties,profile=garageProfile(p),roofs=vertices(mesh.roofs,index),facades=vertices(mesh.facades,index);
  const top=p.detailRoofHeight-.9,rise=(top-p.base)/(profile.levels-1),rings=source.features[index].geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal));
  const plan=garageCirculation(rings,rise),[u0,u1,v0,v1]=plan.ramp,ramps=roofs.filter(v=>v[11]===44);
  assert.equal(ramps.length,6*(profile.levels-1),`${id} must have a physical ramp between every floor pair`);
  assert.ok(u1-u0>=7,'two usable vehicle lanes');assert.ok(rise/(v1-v0)<=.101,'not a stair-like vehicle incline');assert.ok(rise-.18>2.13,'at least documented seven-foot ramp clearance');
  const pointInTriangle=(point,tri)=>{const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),s=tri.map((a,j)=>cross(a,tri[(j+1)%3],point));return s.every(x=>x>=-1e-6)||s.every(x=>x<=1e-6);};
  for(let level=0;level<profile.levels-1;level++){
   const ramp=ramps.slice(level*6,level*6+6),z0=p.base+level*rise+(level===0?.06:0),z1=p.base+(level+1)*rise;
   assert.ok(ramp.some(v=>Math.abs(v[2]-z0)<.0001)&&ramp.some(v=>Math.abs(v[2]-z1)<.0001),'both ramp ends meet their deck exactly');
   for(const vertex of ramp){const local=plan.project(vertex);assert.ok(Math.abs(vertex[2]-(z0+(z1-z0)*(local[1]-v0)/(v1-v0)))<.0002,'no floating or disconnected ramp piece');}
   for(const fraction of [.2,.5,.8]){
    const point=plan.unproject([(u0+u1)/2,v0+(v1-v0)*fraction]);
    for(let i=0;i<roofs.length;i+=3){const tri=roofs.slice(i,i+3);if(tri[0][11]!==41&&tri[0][11]!==9)continue;if(tri.every(v=>Math.abs(v[2]-z1)<.0001))assert.ok(!pointInTriangle(point,tri),'no slab covers the ramp opening');}
   }
  }
  assert.deepEqual(new Set(plan.aisles.map(a=>a.direction)),new Set([-1,1]),'opposing aisles connect through end cross aisles');
  const [bu0,bu1,bv0,bv1]=plan.bounds;
  for(const aisle of plan.aisles)for(const v of [bv0+4,bv1-4])assert.ok(plan.contains([aisle.u,v]),'cross aisle stays on the actual deck');
  // Sample the car travel line at each landing: no guard may cap the opening.
  for(let level=0;level<profile.levels-1;level++)for(const [v,z] of [[v0,p.base+level*rise+(level===0?.06:0)],[v1,p.base+(level+1)*rise]]){
   for(let i=0;i<facades.length;i+=3){const tri=facades.slice(i,i+3),local=tri.map(p=>[...plan.project(p),p[2]]);if(local.every(p=>Math.abs(p[1]-v)<.001)&&Math.min(...local.map(p=>p[0]))<(u0+u1)/2&&Math.max(...local.map(p=>p[0]))>(u0+u1)/2)assert.ok(Math.max(...local.map(p=>p[2]))<=z+.001||Math.min(...local.map(p=>p[2]))>=z+2.13,'guard wall must not block ramp landing');}
  }
 }
});

test('parking paint stays out of end turning lanes and ramp paint follows the slope',()=>{
 for(const id of OPEN_GARAGE_IDS){
  const index=source.features.findIndex(f=>f.properties.id===id),p=prepared.features[index].properties,profile=garageProfile(p),top=p.detailRoofHeight-.9,rise=(top-p.base)/(profile.levels-1);
  const rings=source.features[index].geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal)),plan=garageCirculation(rings,rise),[u0,u1,v0,v1]=plan.ramp,paint=vertices(mesh.roofs,index).filter(v=>v[11]===45);
  assert.ok(paint.length>100,'finite parking strokes must be present');
  for(const point of paint){const [u,v]=plan.project(point);assert.ok(plan.contains([u,v]),'paint stays inside source perimeter');
   if(u>u0&&u<u1&&v>v0&&v<v1){const level=Math.round((point[2]-.015-p.base-rise*(v-v0)/(v1-v0))/rise),z0=p.base+level*rise+(level===0?.06:0),z1=p.base+(level+1)*rise;assert.ok(Math.abs(point[2]-(z0+(z1-z0)*(v-v0)/(v1-v0)+.015))<.001,'ramp markings follow inclined surface');}
   else assert.ok(v>=plan.bounds[2]+7.9&&v<=plan.bounds[3]-7.9,'end cross aisles must not be filled by repeating parking stalls');
  }
 }
});

test('rendered adjacent-aisle arrows visibly point in opposing directions',()=>{
 const id='way/232841898',index=source.features.findIndex(f=>f.properties.id===id),p=prepared.features[index].properties,top=p.detailRoofHeight-.9,rise=(top-p.base)/(garageProfile(p).levels-1);
 const rings=source.features[index].geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal)),plan=garageCirculation(rings,rise),paint=vertices(mesh.roofs,index).filter(v=>v[11]===45&&Math.abs(v[2]-top-.012)<.001);
 const painted=(point)=>{for(let i=0;i<paint.length;i+=3){const triangle=paint.slice(i,i+3).map(v=>plan.project(v)),cross=triangle.map((a,j)=>{const b=triangle[(j+1)%3];return (b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]);});if(cross.every(c=>c>=-1e-4)||cross.every(c=>c<=1e-4))return true;}return false;};
 assert.ok(plan.aisles.length>=2);
 for(const {u,direction} of plan.aisles.slice(0,2)){
  const v=plan.bounds[2]+12;
  assert.ok(painted([u+.4,v+.467*direction]),'arrowhead must face the aisle travel direction');
  assert.ok(!painted([u+.4,v-.467*direction]),'the opposite arrowhead must not be painted');
 }
});

test('Pasteur garden roof and Wilbur access structures receive no fabricated rooftop parking stalls',()=>{
 const index=source.features.findIndex(f=>f.properties.id===SCREENED_GARAGE_ID),all=vertices(mesh.roofs,index).concat(vertices(mesh.facades,index));
 assert.ok(all.some(v=>v[11]===42));assert.ok(!all.some(v=>v[11]===41));assert.ok(all.every(v=>v[2]<=4));
 for(const id of [...GARAGE_ACCESS_IDS,...smallIds]){const i=source.features.findIndex(f=>f.properties.id===id),v=vertices(mesh.roofs,i);assert.ok(!v.some(p=>p[11]===41),id+' must not receive an invented parking roof');}
});

test('garage material snippets consume only varyings supplied by the production fragment shader',()=>{
 const shader=readFileSync(new URL('../src/building-details.ts',import.meta.url),'utf8');
 const inputs=new Set([...shader.matchAll(/\bin\s+(?:vec[234]|float)\s+(v_\w+)\s*;/g)].map(match=>match[1]));
 for(const symbol of new Set(GARAGE_FRAGMENT.match(/\bv_\w+\b/g)))assert.ok(inputs.has(symbol),'undefined fragment input '+symbol);
});
