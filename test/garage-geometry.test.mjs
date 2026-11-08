import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareBuildingDetails,buildBuildingGeometry,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {garageProfile,referenceGarageHeight,OPEN_GARAGE_IDS,GARAGE_ACCESS_IDS,SCREENED_GARAGE_ID,describeGarage} from '../src/garage-architecture.ts';
import {GARAGE_FRAGMENT} from '../src/garage-materials.ts';
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

test('every reviewed open garage has complete deck slabs and physically open elevations between guard rails',()=>{
 for(const id of OPEN_GARAGE_IDS){
  const index=source.features.findIndex(f=>f.properties.id===id),p=prepared.features[index].properties,profile=garageProfile(p),roofs=vertices(mesh.roofs,index),facades=vertices(mesh.facades,index);
  const top=p.detailRoofHeight-.9,rise=(top-p.base)/(profile.levels-1),levels=new Map();
  for(let i=0;i<roofs.length;i+=3){const tri=roofs.slice(i,i+3);if(tri[0][11]!==41&&tri[0][11]!==9)continue;if(!tri.every(v=>Math.abs(v[2]-tri[0][2])<1e-4))continue;const z=tri[0][2],a=tri[0],b=tri[1],c=tri[2],area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;levels.set(z,(levels.get(z)||0)+area);}
  const rings=source.features[index].geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal)),expected=polygonArea(rings[0])-rings.slice(1).reduce((sum,r)=>sum+polygonArea(r),0);
  for(let level=0;level<profile.levels;level++){const z=p.base+level*rise+(level===0?.06:0),surface=[...levels].find(([height])=>Math.abs(height-z)<.001);assert.ok(surface,`${id} missing deck${level}`);assert.ok(Math.abs(surface[1]-expected)<.1,`${id} deck must retain complete pinned polygon/holes`);}
  const rail=facades.filter(v=>v[11]===40),columns=facades.filter(v=>v[11]===2);assert.ok(rail.length>30&&columns.length>100,'real rail faces and physical supports');
  for(let i=0;i<rail.length;i+=3){const tri=rail.slice(i,i+3);assert.ok(Math.max(...tri.map(v=>v[2]))-Math.min(...tri.map(v=>v[2]))<=1.081,'no full-height opaque wall between decks');}
  assert.ok(roofs.some(v=>v[11]===41),'top is a parking deck, not a featureless cap');
  for(const v of roofs.concat(facades))assert.ok(v[2]>=p.base-.001&&v[2]<=p.detailRoofHeight+.001,`${id} exceeds its reviewed rendering envelope`);
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
