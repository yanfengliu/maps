import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {HOOVER_PART_IDS,HOOVER_DESCRIPTION} from '../src/hoover-architecture.ts';
import {createQuadArcadeVisibility} from '../src/quad-arcade-visibility.ts';
import {quadPickingLayer} from '../src/building-picking.ts';
const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const parts={type:'FeatureCollection',features:source.features.filter(f=>HOOVER_PART_IDS.has(f.properties.id))};
const original=JSON.stringify(parts),geometry=buildBuildingGeometry(prepareBuildingDetails(parts));
const vertices=(array,index)=>{const out=[];for(let i=0;i<array.length;i+=VERTEX_FLOATS)if(array[i+12]===index)out.push([...array.slice(i,i+VERTEX_FLOATS)]);return out;};
const index=id=>parts.features.findIndex(f=>f.properties.id===`way/${id}`);

test('Hoover keeps all pinned footprints and height envelopes without generic facade grids',()=>{
 assert.equal(JSON.stringify(parts),original);
 for(const [i,f] of parts.features.entries()){
  const all=vertices(geometry.roofs,i).concat(vertices(geometry.facades,i));
  assert.ok(all.length>0);assert.ok(all.flat().every(Number.isFinite));
  assert.ok(Math.abs(Math.max(...all.map(v=>v[2]))-f.properties.height)<.00001,'Float32 height retains source envelope');
  assert.ok(all.every(v=>v[11]!==7&&v[11]!==14&&v[11]!==18),'no generic tower windows or ashlar masonry');
 }
 assert.match(HOOVER_DESCRIPTION,/estimates.*not a measured facade or floor survey/);
 assert.ok(geometry.triangles<5000,`bounded complete tower has ${geometry.triangles} triangles`);
});

test('crown, dome and lantern begin at their exposed architectural levels instead of filling the shaft/loggia',()=>{
 for(const [id,minimum] of [[1346548885,64.9],[1346548890,75],[1346548889,81.2],[1346548884,18.5]]){
  const all=vertices(geometry.roofs,index(id)).concat(vertices(geometry.facades,index(id)));
  assert.ok(all.every(v=>v[2]>=minimum),`${id} has an opaque piece below its exposed level`);
 }
 const top=vertices(geometry.roofs,index(1346548889)).filter(v=>v[11]===0);
 assert.equal(Math.max(...top.map(v=>v[2])),87);assert.ok(new Set(top.map(v=>v[2])).size>8);
});

test('every octagonal observation arch has an empty centre and complete adjoining piers',()=>{
 const id=index(1346548885),ring=parts.features[id].geometry.coordinates[0].slice(0,-1).map(projectLocal),mesh=geometry.facades;
 const triangles=[];for(let i=0;i<mesh.length;i+=VERTEX_FLOATS*3)if(mesh[i+12]===id&&mesh[i+11]===70)triangles.push([0,1,2].map(j=>[...mesh.slice(i+j*VERTEX_FLOATS,i+j*VERTEX_FLOATS+3)]));
 const contains=(p,t)=>{const sides=t.map((a,i)=>{const b=t[(i+1)%3];return(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});return sides.every(x=>x>=-1e-6)||sides.every(x=>x<=1e-6);};
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/len,(b[1]-a[1])/len];
  const local=v=>[(v[0]-a[0])*u[0]+(v[1]-a[1])*u[1],v[2]],plane=v=>Math.abs((v[0]-a[0])*u[1]-(v[1]-a[1])*u[0])<.001;
  const wall=triangles.filter(t=>t.every(plane)).map(t=>t.map(local));
  assert.ok(!wall.some(t=>contains([len/2,70],t)),`arch ${i} blocked by stucco`);
  assert.ok(wall.some(t=>contains([.15,70],t)),`arch ${i} missing adjoining pier`);
  const opaque=[[[0,65],[len,65],[len,75]],[[0,65],[len,75],[0,75]]];
  assert.ok(opaque.some(t=>contains([len/2,70],t)),'negative control catches original opaque shell');
 }
 assert.ok(vertices(mesh,id).filter(v=>v[11]===71).length>1000,'separate protective grille geometry remains');
});

test('native fallback is retained until ready; every custom Hoover part stays selectable afterwards',()=>{
 const calls=[],map={setFilter(){},getLayer:()=>true,getZoom:()=>18,getCanvas:()=>({dataset:{}}),setPaintProperty:(...args)=>calls.push(args)};
 const controller=createQuadArcadeVisibility();controller.sync(map,false);
 assert.deepEqual(calls[0][2],['get','detailWallHeight']);calls.length=0;controller.sync(map,true);
 const wallIds=calls[0][2][1][2][1],capIds=calls[1][2][1][2][1],pickIds=quadPickingLayer().filter[2][2][1];
 for(const id of HOOVER_PART_IDS){assert.ok(wallIds.includes(id));assert.ok(capIds.includes(id));assert.ok(pickIds.includes(id));}
});

test('paired shaft windows remain visible in front of recessed panel surfaces at close range',()=>{
 const id=index(1346548891),ring=parts.features[id].geometry.coordinates[0].map(projectLocal),a=ring[0],b=ring[1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/len,(b[1]-a[1])/len];
 const winding=ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0)>0?1:-1;
 const sample=[len*.22-.57,58.5],hits=[];
 for(let i=0;i<geometry.facades.length;i+=VERTEX_FLOATS*3){const m=geometry.facades;if(m[i+12]!==id)continue;
  const t=[0,1,2].map(j=>{const k=i+j*VERTEX_FLOATS,dx=m[k]-a[0],dy=m[k+1]-a[1];return[dx*u[0]+dy*u[1],m[k+2],winding*(dx*u[1]-dy*u[0])];});
  const [p,q,r]=t,den=(q[1]-r[1])*(p[0]-r[0])+(r[0]-q[0])*(p[1]-r[1]);if(Math.abs(den)<1e-6)continue;
  const v=((q[1]-r[1])*(sample[0]-r[0])+(r[0]-q[0])*(sample[1]-r[1]))/den,w=((r[1]-p[1])*(sample[0]-r[0])+(p[0]-r[0])*(sample[1]-r[1]))/den;
  if(v>=0&&w>=0&&v+w<=1)hits.push({depth:v*p[2]+w*q[2]+(1-v-w)*r[2],kind:m[i+11]});
 }
 assert.equal(hits.sort((a,b)=>b.depth-a.depth)[0]?.kind,71,'stucco must not cover the lower part of the dark arched window');
 const broken=hits.map(h=>({...h,depth:h.depth-(h.kind===71?.18:0)})).sort((a,b)=>b.depth-a.depth);
 assert.equal(broken[0]?.kind,70,'negative control catches glazing moved behind the panel');
});
