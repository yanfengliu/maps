import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCampusSurfaces,addCampusSurfaces,emptySurfaceCounts,SURFACE_BUILDING,MAX_SURFACE_TRIANGLES} from '../src/campus-surfaces.ts';
import {SURFACE_FRAGMENT} from '../src/campus-surface-materials.ts';

const coordinate=([x,y])=>[-122.17+x/90_000,37.43+y/111_000];
const project=([x,y])=>[(x+122.17)*90_000,(y-37.43)*111_000];
const props=(id,kind,surface='concrete')=>({id,version:1,kind,modeledSurface:surface,surfaceEvidence:'fixture-reference',modeledWidth:4,widthSource:'class-estimate'});
const collection=(...features)=>({type:'FeatureCollection',features});
const street=(points,id='way/1',extra={})=>({type:'Feature',properties:{...props(id,'street'),...extra},geometry:{type:'LineString',coordinates:points.map(coordinate)}});
const polygon=(rings,extra={})=>({type:'Feature',properties:{...props('derived/main-quad-paving','plaza','pavers'),...extra},geometry:{type:'Polygon',coordinates:rings.map(r=>r.map(coordinate))}});
const crossing=(markings,extra={})=>({type:'Feature',properties:{...props('node/1','crossing','asphalt'),modeledWidth:3,roadWidth:8,modeledBearing:0,orientationSource:'way/1',...(markings?{'crossing:markings':markings}:{}),...extra},geometry:{type:'Point',coordinates:coordinate([0,0])}});
const render=data=>{const triangles=[];const mesh={triangle(a,b,c,color,kind,building,uv){triangles.push({vertices:[a,b,c],color,kind,building,uv});},quad(){throw new Error('All emitted faces must pass the counted triangle writer');}};return {triangles,counts:addCampusSurfaces(mesh,data,project)};};
const area=ring=>Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2;
const triangleContains=(point,tri)=>{const s=tri.map((a,i)=>{const b=tri[(i+1)%3];return (b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]);});return s.every(v=>v>=-1e-6)||s.every(v=>v<=1e-6);};

test('surface inputs reject malformed identities, unbounded widths and fabricated evidence through the retry path',()=>{
 assert.deepEqual(validateCampusSurfaces(collection()),collection());
 const valid=collection(street([[0,0],[10,0]]));assert.strictEqual(validateCampusSurfaces(valid),valid);
 for(const alter of [d=>{d.type='Polygon';},d=>{d.features[0].properties.version=0;},d=>{d.features.push(d.features[0]);},d=>{d.features[0].geometry.coordinates[0]=[-122.3,37.4];},d=>{d.features[0].properties.modeledWidth=1000;},d=>{d.features[0].properties.surfaceEvidence='unverified';},d=>{d.features[0].properties.modeledCurbHeight=.1;},d=>{d.features[0].geometry.type='MultiLineString';}]){
  const bad=structuredClone(valid);alter(bad);assert.throws(()=>validateCampusSurfaces(bad),/Restore the pinned surface input and retry campus detail/);
 }
 assert.throws(()=>validateCampusSurfaces(collection(polygon([[[0,0],[10,0],[10,10],[0,10]]]))),/unclosed/);
 assert.throws(()=>validateCampusSurfaces(collection(crossing('zebra',{modeledBearing:Infinity}))),/road orientation/);
 assert.equal(validateCampusSurfaces(collection(street([[0,0],[10,0]],'way/1',{modeledSurface:'unknown',surfaceEvidence:'unverified'}))).features.length,1);
});

test('Main Quad-style pavement retains all eight planting holes and exact mapped area without mutating source',()=>{
 const outer=[[0,0],[100,0],[100,60],[0,60],[0,0]],holes=[];
 for(const x of [20,40,60,80])for(const y of [20,40]){const ring=Array.from({length:16},(_,i)=>[x+4*Math.cos(i*Math.PI/8),y+4*Math.sin(i*Math.PI/8)]);ring.push(ring[0]);holes.push(ring);}
 const data=collection(polygon([outer,...holes])),before=JSON.stringify(data),{triangles,counts}=render(validateCampusSurfaces(data));
 assert.equal(JSON.stringify(data),before);assert.equal(counts.plazas,1);assert.equal(counts.triangles,triangles.length);
 const expected=area(outer)-holes.reduce((sum,r)=>sum+area(r),0),actual=triangles.reduce((sum,t)=>sum+area(t.vertices),0);
 assert.ok(Math.abs(actual-expected)<.0001,'only mapped planting holes subtract area');
 for(const x of [20,40,60,80])for(const y of [20,40])for(const point of [[x,y],[x+2,y],[x,y-2]])assert.ok(!triangles.some(t=>triangleContains(point,t.vertices)),'no paving triangle fills a planting hole');
 assert.ok(triangles.every(t=>t.kind===60&&t.building===SURFACE_BUILDING&&t.vertices.every(p=>p[2]===.025)));
});

test('physical metre UVs keep paving modules the same size across polygons and differently oriented streets',()=>{
 const inputs=[collection(polygon([[[0,0],[10,10],[0,20],[-10,10],[0,0]]])),collection(street([[0,0],[30,40]])),collection(street([[0,0],[100,0]]))];
 for(const input of inputs)for(const {vertices,uv} of render(input).triangles)for(let i=0;i<3;i++){
  const j=(i+1)%3,physical=Math.hypot(vertices[j][0]-vertices[i][0],vertices[j][1]-vertices[i][1]),texture=Math.hypot(uv[j][0]-uv[i][0],uv[j][1]-uv[i][1]);
  assert.ok(Math.abs(physical-texture)<1e-8,'texture coordinates must be metres, not normalized footprint units');
 }
});

test('joined street strips remain connected and finite at right-angle, acute, duplicate and short-segment bends',()=>{
 const right=render(collection(street([[0,0],[10,0],[10,10]]))).triangles;
 assert.ok(Math.abs(right.reduce((sum,t)=>sum+area(t.vertices),0)-80)<.0001);
 assert.ok(right.some(t=>triangleContains([11,-1],t.vertices)),'outer miter is filled');
 assert.ok(right.some(t=>triangleContains([9,1],t.vertices)),'inside bend has no crack');
 const paths=[[[0,0],[10,0],[.1,.1]],[[0,0],[10,0],[10,0],[10,10]],[[0,0],[.1,0],[.1,10]],[[0,0],[10,0],[10.1,1],[20,0]]];
 for(const path of paths){const {triangles}=render(collection(street(path))),xs=path.map(p=>p[0]),ys=path.map(p=>p[1]);
  for(const t of triangles)for(const p of t.vertices){assert.ok(p.every(Number.isFinite));assert.ok(p[0]>=Math.min(...xs)-4-.001&&p[0]<=Math.max(...xs)+4+.001&&p[1]>=Math.min(...ys)-4-.001&&p[1]<=Math.max(...ys)+4+.001,'bounded join must not emit spikes');}
  assert.ok(triangles.every(t=>t.vertices.every(p=>Math.abs(p[2]-t.vertices[0][2])<1e-9&&p[2]>0&&p[2]<.05)),'no vertical barrier caps a normal street');
 }
});

test('separate mapped ways meet without wedge gaps and different surface materials cannot fight at equal depth',()=>{
 const first=street([[0,0],[10,0]],'way/1',{modeledSurface:'asphalt'}),second=street([[10,0],[10,10]],'way/2',{modeledSurface:'asphalt'});
 const joined=render(collection(first,second)).triangles;
 assert.ok(joined.some(t=>triangleContains([10.8,-.5],t.vertices)),'outer corner between source ways must be joined');
 for(const t of joined)for(const p of t.vertices)assert.ok(p[0]>=-2.001&&p[0]<=12.001&&p[1]>=-2.001&&p[1]<=12.001,'join may not create an oversized intersection');
 const overlap=render(collection(first,street([[5,-5],[5,5]],'way/3',{modeledSurface:'unknown'}))).triangles;
 const asphalt=overlap.filter(t=>t.kind===61).map(t=>t.vertices[0][2]),unknown=overlap.filter(t=>t.kind===63).map(t=>t.vertices[0][2]);
 assert.ok(asphalt.length&&unknown.length);assert.ok(asphalt.every(a=>unknown.every(b=>Math.abs(a-b)>=.004)),'unlike overlapping materials need a stable depth order');
});

test('materials follow evidence classes and pedestrian malls receive no invented traffic paint or curbs',()=>{
 for(const [surface,kind] of [['pavers',60],['asphalt',61],['concrete',62],['unknown',63]]){
  const input=collection(street([[0,0],[20,0]],'way/1',{modeledSurface:surface,highway:'pedestrian',lanes:'2',oneway:'yes'})),before=JSON.stringify(input),{triangles,counts}=render(input);
  assert.ok(triangles.every(t=>t.kind===kind));assert.equal(counts.markings,0);assert.equal(JSON.stringify(input),before);
 }
 const {triangles}=render(collection(street([[0,0],[20,0]],'way/1',{modeledCurbHeight:.1,curbEvidence:'fixture-curb-photo'})));
 const curbs=triangles.filter(t=>t.kind===65);assert.ok(curbs.length>0);assert.ok(curbs.every(t=>Math.max(...t.vertices.map(p=>p[2]))===.1));
 assert.ok(curbs.every(t=>Math.max(...t.vertices.map(p=>p[0]))-Math.min(...t.vertices.map(p=>p[0]))>19.9),'curbs run along sides, never across entry/exit');
});

test('crossing paint requires an explicit mapped marking pattern and respects road orientation and width',()=>{
 for(const marking of [undefined,'no','unknown']){
  const {triangles,counts}=render(collection(crossing(marking,{crossing:'marked'})));assert.equal(triangles.length,0);assert.equal(counts.crossings,1);assert.equal(counts.markings,0);
 }
 for(const marking of ['lines','zebra']){const {triangles,counts}=render(collection(crossing(marking,{modeledBearing:90})));assert.equal(counts.markings,1);assert.ok(triangles.length>=4);assert.ok(triangles.every(t=>t.kind===64));
  for(const t of triangles)for(const [x,y,z] of t.vertices){assert.ok(Math.abs(x)<=1.571&&Math.abs(y)<=4.001);assert.equal(z,.05);}
 }
 const photo=collection(crossing(undefined,{modeledMarkings:'lines',markingsEvidence:'reviewed-crossing-photo'}));assert.equal(render(validateCampusSurfaces(photo)).counts.markings,1);
 assert.equal(render(collection(crossing('no',{modeledMarkings:'zebra',markingsEvidence:'reviewed-crossing-photo'}))).counts.markings,0,'explicit mapped no-marking tag cannot be overridden by an estimate');
 assert.throws(()=>validateCampusSurfaces(collection(crossing(undefined,{modeledMarkings:'zebra'}))),/reviewed pattern reference/);
});

test('evidenced side curbs leave mapped junctions and pedestrian crossing landings open',()=>{
 const main=street([[0,0],[10,0],[20,0]],'way/1',{modeledCurbHeight:.1,curbEvidence:'fixture-curb-photo'}),branch=street([[10,0],[10,10]],'way/2'),walk=crossing('lines');walk.geometry.coordinates=coordinate([5,0]);
 const {triangles}=render(collection(main,branch,walk)),curbs=triangles.filter(t=>t.kind===65);assert.ok(curbs.length>0);
 for(const t of curbs){const min=Math.min(...t.vertices.map(p=>p[0])),max=Math.max(...t.vertices.map(p=>p[0]));assert.ok(max<=3.16||min>=6.84,'no raised curb crosses the pedestrian landing');assert.ok(max<=7.66||min>=12.34,'no raised curb blocks the side street');}
});

test('bounded pavement geometry remains below the additional surface/GPU budget',()=>{
 const features=Array.from({length:300},(_,i)=>street([[i%30*10,Math.floor(i/30)*10],[i%30*10+8,Math.floor(i/30)*10]],`way/${i+1}`));
 const {counts}=render(validateCampusSurfaces(collection(...features)));
 assert.equal(counts.streets,300);assert.equal(counts.triangles,600);assert.ok(counts.triangles<MAX_SURFACE_TRIANGLES);assert.ok(counts.triangles*3*44<1_300_000);
 assert.deepEqual(render(collection()).counts,emptySurfaceCounts());
});

test('surface shader uses existing metre varyings and anti-aliased material detail without touching facade IDs',()=>{
 const shader=readFileSync(new URL('../src/building-details.ts',import.meta.url),'utf8'),inputs=new Set([...shader.matchAll(/\bin\s+(?:vec[234]|float)\s+(v_\w+)\s*;/g)].map(m=>m[1]));
 for(const symbol of new Set(SURFACE_FRAGMENT.match(/\bv_\w+\b/g)))assert.ok(inputs.has(symbol),symbol);
 assert.match(SURFACE_FRAGMENT,/v_kind>59\.9&&v_kind<65\.1/);assert.match(SURFACE_FRAGMENT,/fwidth/);assert.match(SURFACE_FRAGMENT,/smoothstep/);
 assert.ok(SURFACE_BUILDING<-1,'ground cannot match the no-building-selected sentinel');
});
