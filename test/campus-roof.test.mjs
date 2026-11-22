import {currentBuilding} from '../src/former-campus-buildings.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import earcut from 'earcut';
import {prepareBuildingDetails,buildBuildingGeometry,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {CAMPUS_ROOF_PROFILES,CAMPUS_ROOF_SOURCE_SHA256} from '../src/campus-roof-profile.ts';
import {TILED_EDGE_WIDTH} from '../src/tiled-perimeter.ts';
import {campusRoof,BRAUN_MUSIC_ID} from '../src/campus-roof.ts';
import {evaluateRoofSkeleton,orientRoofRings,roofSignatureMargin,ROOF_SIGNATURE_ROUNDOFF} from '../src/roof-skeleton.ts';
const bytes=readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)),source=JSON.parse(bytes),prepared=prepareBuildingDetails(source),mesh=buildBuildingGeometry(prepared);
const area=r=>Math.abs(r.reduce((sum,p,i)=>{const q=r[(i+1)%r.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function overlap(subject,clip){let polygon=subject;const sign=Math.sign(cross(...clip));for(let i=0;i<3&&polygon.length;i++){const a=clip[i],b=clip[(i+1)%3],next=[];for(let j=0;j<polygon.length;j++){const p=polygon[j],q=polygon[(j+1)%polygon.length],dp=cross(a,b,p)*sign,dq=cross(a,b,q)*sign;if(dp>=0)next.push(p);if((dp>0)!==(dq>0)){const t=dp/(dp-dq);next.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}polygon=next;}return polygon.length<3?0:area(polygon);}
function footprint(rings){const points=rings.flat(),holes=[];let offset=rings[0].length;for(const ring of rings.slice(1)){holes.push(offset);offset+=ring.length;}const indices=earcut(points.flat(),holes,2),tri=[];for(let i=0;i<indices.length;i+=3)tri.push(indices.slice(i,i+3).map(j=>points[j]));return tri;}
function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function cases(){const out=[];for(const f of prepared.features.filter(currentBuilding)){const p=f.properties;if(!(p.id===BRAUN_MUSIC_ID||p.detailArchitecture.roofShape==='hipped'&&!['quad','quad-wing'].includes(p.detailArchitecture.profile)))continue;const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const [component,poly] of polys.entries())out.push({feature:f,key:p.id+'/'+component,rings:orientRoofRings(poly.map(r=>r.slice(0,-1).map(projectLocal))),component});}return out;}

test('every generic hipped campus component has pinned continuous planar roof topology, including concave outlines and courtyards',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),CAMPUS_ROOF_SOURCE_SHA256);assert.equal(cases().length,Object.keys(CAMPUS_ROOF_PROFILES).length);assert.equal(cases().length,283);
 for(const {key,rings} of cases()){
  const profile=CAMPUS_ROOF_PROFILES[key];assert.ok(profile,key);assert.ok(roofSignatureMargin(rings.map(r=>r.map(([x,y])=>[x+profile.offset,y+profile.offset])))>ROOF_SIGNATURE_ROUNDOFF,key+' guard phase');
  const model=evaluateRoofSkeleton(rings,profile),triangles=model.triangles.map(t=>t.map(i=>model.vertices[i])),native=footprint(rings),expected=area(rings[0])-rings.slice(1).reduce((s,r)=>s+area(r),0);
  assert.deepEqual(model.vertices.slice(0,rings.flat().length),rings.flat().map(p=>[...p,0]),key+' boundary must stay exact');
  assert.ok(Math.abs(triangles.reduce((s,t)=>s+area(t),0)-expected)<1e-6,key+' complete area');
  for(const tri of triangles){assert.ok(Math.abs(native.reduce((s,t)=>s+overlap(tri,t),0)-area(tri))<2e-6,key+' roof must not cross a courtyard or cut a corner');}
  for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++)assert.ok(overlap(triangles[i],triangles[j])<2e-6,key+' roof faces overlap');
  const used=new Map();for(const face of profile.faces)for(let i=0;i<face.length;i++){const e=[face[i],face[(i+1)%face.length]].sort((a,b)=>a-b).join(',');used.set(e,(used.get(e)||0)+1);}const boundary=new Set();let start=0;for(const ring of rings){for(let i=0;i<ring.length;i++)boundary.add([start+i,start+(i+1)%ring.length].sort((a,b)=>a-b).join(','));start+=ring.length;}
  for(const [edge,count] of used)assert.equal(count,boundary.has(edge)?1:2,key+' shared ridge/valley crack');assert.deepEqual(new Set([...used].filter(([,n])=>n===1).map(([k])=>k)),boundary,key+' source perimeter');
 }
});

test('rendered generic hipped surfaces follow source-edge planes rather than sampled earcut dents',()=>{
 // Independently pin the authored main-roof peaks below the documented workshop
 // monitors. Do not import engineeringRoofOffset: this checks its integration.
 const monitorPeaks=new Map([['way/232841907',5.439],['way/232841919',5.439],['way/232841878',11.1],['way/232841924',11.1]]),monitored=new Set();
 let checked=0;
 for(const {feature,rings,key} of cases()){
  // These two surveyed buildings have their own emitted-layout checks.
  if(feature.properties.id===BRAUN_MUSIC_ID||feature.properties.id==='way/232805660'||TILED_EDGE_WIDTH[feature.properties.id])continue;
  const index=prepared.features.indexOf(feature),p=feature.properties,model=evaluateRoofSkeleton(rings,CAMPUS_ROOF_PROFILES[key]),peak=monitorPeaks.get(p.id)??p.detailRoofHeight,slope=Math.max(0,peak-p.detailWallHeight-.07)/model.maximumTime,main=[];
  const normals=rings.flatMap(r=>r.map((a,i)=>{const b=r[(i+1)%r.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/l*slope,(b[0]-a[0])/l*slope];}));
  for(let i=0;i<mesh.roofs.length;i+=VERTEX_FLOATS*3){
   // The photographed composition hip uses the smooth roof material over the same source planes.
   const material=mesh.roofs[i+11];
   if(mesh.roofs[i+12]!==index||!(material===0||material===17||p.id==='way/232715597'&&material===9))continue;
   const tri=[0,1,2].map(j=>Array.from(mesh.roofs.slice(i+j*VERTEX_FLOATS,i+j*VERTEX_FLOATS+3))),[a,b,c]=tri,d=cross(a,b,c),center=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
   if(!inside(center,rings[0])||rings.slice(1).some(r=>inside(center,r)))continue;
   if(tri.some(v=>v[2]>peak+1e-5)){
    assert.ok(monitorPeaks.has(p.id)&&tri.every(v=>v[2]>peak&&v[2]<=p.detailRoofHeight+1e-5),key+' monitor cap must be wholly above its main roof and inside the source height');monitored.add(p.id);continue;
   }
   main.push(tri);if(Math.abs(d)<.2)continue;
   const dx=((b[2]-a[2])*(c[1]-a[1])-(b[1]-a[1])*(c[2]-a[2]))/d,dy=((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))/d;
   assert.ok(normals.some(n=>Math.hypot(dx-n[0],dy-n[1])<.004),key+' has a triangulation-induced pitch');checked++;
  }
  assert.ok(main.length>0,key+' main hip remains covered');
  // Collinear source vertices may lie within an emitted edge, rather than at
  // a triangle corner. Check their actual coverage and eave height either way.
  const eave=Math.min(peak,p.detailWallHeight+.07);
  for(const point of rings.flat())assert.ok(main.some(tri=>tri.some((a,i)=>{
   const b=tri[(i+1)%3],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy)));
   return Math.hypot(a[0]+t*dx-point[0],a[1]+t*dy-point[1])<.0004&&Math.abs(a[2]+t*(b[2]-a[2])-eave)<1e-5;
  })),key+' emitted source corner or courtyard edge is missing');
 }
 assert.deepEqual(monitored,new Set(monitorPeaks.keys()),'all four monitored workshops retain separately checked main hips and monitor caps');
 assert.ok(checked>7000,'check the emitted campus surfaces, not just their profile tables');
});

test('Braun has a flat solar deck with a narrow tiled edge and open courtyards, within its original height',()=>{
 const index=source.features.findIndex(f=>f.properties.id===BRAUN_MUSIC_ID),f=prepared.features[index],p=f.properties,rings=f.geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal));assert.equal(p.detailArchitecture.roofShape,'flat');assert.equal(p.detailArchitecture.roofSource,'official-description');const surface=[];for(let i=0;i<mesh.roofs.length;i+=VERTEX_FLOATS*3)if(mesh.roofs[i+12]===index)surface.push([0,1,2].map(j=>Array.from(mesh.roofs.slice(i+j*VERTEX_FLOATS,i+(j+1)*VERTEX_FLOATS))));const deck=surface.filter(t=>t[0][11]===9),tile=surface.filter(t=>t[0][11]===17),panels=surface.filter(t=>t[0][6]<.2&&t[0][7]<.3&&t[0][8]<.3),native=footprint(rings);
 assert.ok(deck.length>10&&tile.length>10&&panels.length>80);assert.ok(deck.every(t=>t.every(v=>Math.abs(v[2]-deck[0][0][2])<1e-5)));assert.ok(deck.reduce((s,t)=>s+area(t),0)>tile.reduce((s,t)=>s+area(t),0)*3,'flat roof, not a giant tiled hip');
 assert.equal(p.detailArchitecture.floors,2);assert.equal(p.detailArchitecture.floorSource,'official-description');assert.equal(p.height,source.features[index].properties.height);assert.deepEqual(f.geometry,source.features[index].geometry);
 for(const t of [...deck,...tile,...panels]){assert.ok(t.every(v=>v[2]>=p.detailWallHeight&&v[2]<=p.height));assert.ok(Math.abs(native.reduce((s,n)=>s+overlap(t,n),0)-area(t))<.015,'surfaces retain both courtyards');}
 const changed=rings.map(r=>r.map(p=>[...p]));changed[0][0][0]+=.001;assert.throws(()=>campusRoof(BRAUN_MUSIC_ID,0,changed),/footprint changed/);
});

test('Green East retains its stepped source boundary, three staggered upper roof fields, hip ends and three window bands', () => {
  const id = 'way/232805660', index = source.features.findIndex(f => f.properties.id === id);
  const feature = prepared.features[index], p = feature.properties;
  const ring = feature.geometry.coordinates[0].slice(0, -1).map(projectLocal);
  assert.deepEqual(feature.geometry, source.features[index].geometry);
  assert.equal(p.height, 12);
  assert.equal(p.heightSource, 'estimated');
  assert.equal(p.detailArchitecture.floors, 3);
  assert.equal(p.detailArchitecture.floorSource, 'official-description');
  assert.equal(p.detailArchitecture.roofSource, 'reference-profile');

  function surfaces(array, kinds) {
    const result = [];
    for (let i = 0; i < array.length; i += VERTEX_FLOATS * 3) {
      if (array[i + 12] === index && kinds.includes(array[i + 11])) {
        result.push([0, 1, 2].map(j => Array.from(array.slice(i + j * VERTEX_FLOATS, i + (j + 1) * VERTEX_FLOATS))));
      }
    }
    return result;
  }

  const upper = surfaces(mesh.roofs, [54]), hips = surfaces(mesh.roofs, [17]), all = [...upper, ...hips];
  const native = footprint([ring]), upperArea = upper.reduce((s,t) => s + area(t), 0);
  assert.ok(upperArea > 1550 && upperArea < 1680, 'three broad upper fields seen in the registered aerial');
  assert.ok(Math.abs(all.reduce((s,t) => s + area(t), 0) - area(ring)) < .005, 'cover the complete stepped plan');
  for (const [i, t] of all.entries()) {
    assert.ok(t.every(v => v[2] >= p.detailWallHeight && v[2] <= 12));
    assert.ok(Math.abs(native.reduce((s,n) => s + overlap(t,n), 0) - area(t)) < .005, 'roof stays inside the mapped outline');
    for (const other of all.slice(i+1)) assert.ok(overlap(t,other) < .002, 'no overlapping roof surfaces');
  }
  for (const point of ring) {
    assert.ok(hips.some(t => t.some(v => Math.hypot(v[0]-point[0],v[1]-point[1])<.0001 && Math.abs(v[2]-p.detailWallHeight-.07)<.0001)), 'each mapped outline vertex remains at the eave');
  }
  const uvTriangles=upper.map(t => t.map(v => [v[9],v[10]]));
  const onUpper=(x,y)=>uvTriangles.some(t=>[0,1,2].every(i=>cross(t[i],t[(i+1)%3],[x,y])>=-1e-5));
  for (const [x, y, expected] of [[18,20,true],[18,0,false],[33,0,true],[33,-12,false],[49,-12,true],[49,29,false],[33,29,true]]) {
    assert.equal(onUpper(x,y),expected,'aerial step at '+[x,y]);
  }
  const bands=surfaces(mesh.facades,[53]);
  assert.equal(bands.length,ring.length*2,'wrap all mapped edges, including short returns');
  assert.ok(bands.flat().every(v=>v[10]===0||v[10]===3));
  const changed = ring.map(([x,y]) => [x,y]);
  changed[0][0]+=.001;
  assert.throws(()=>campusRoof(id,0,[changed]),/footprint changed/);
});

test('the five medical courtyard decks preserve every mapped opening and the provenance of their roof decision',()=>{
  const ids=['relation/4720978','relation/4721017','relation/4721018','relation/4721019','relation/4721020'];
  for(const id of ids){
    const index=source.features.findIndex(f=>f.properties.id===id), feature=prepared.features[index];
    assert.equal(feature.geometry,source.features[index].geometry);
    assert.ok(feature.geometry.coordinates.length>=2,'each mapped court has a hole');
    assert.equal(feature.properties.detailArchitecture.roofSource,'reference-profile');
    assert.equal(feature.properties.detailArchitecture.roofShape,'flat');
    assert.equal(feature.properties.detailFlatShell,true);
    assert.equal(feature.properties.height,source.features[index].properties.height);
  }
});

test('photo-matched tiled perimeters enclose a coplanar central deck while preserving the complete footprint',()=>{
  assert.equal(Object.keys(TILED_EDGE_WIDTH).length,12);
  for (const id of Object.keys(TILED_EDGE_WIDTH)) {
    const feature=prepared.features.find(f=>f.properties.id===id),p=feature.properties;
    assert.equal(p.detailArchitecture.roofSource,'reference-profile');
    const ring=feature.geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal));
    const roof=campusRoof(id,0,ring), deck=roof.triangles.filter(roof.flat), tile=roof.triangles.filter(t=>!roof.flat(t));
    assert.ok(deck.length>0&&tile.length>0,id);
    assert.ok(deck.flat().every(v=>Math.abs(roof.fraction(v)-1)<1e-7),id+' central deck');
    assert.ok(tile.some(tri=>tri.some(v=>roof.fraction(v)<.01)),id+' tile reaches eave');
    const total=deck.concat(tile).reduce((sum,t)=>sum+area(t),0);
    assert.ok(Math.abs(total-area(ring[0])+ring.slice(1).reduce((sum,h)=>sum+area(h),0))<1e-5,id+' footprint');
    const index=prepared.features.indexOf(feature),kinds=new Set();
    for(let off=0;off<mesh.roofs.length;off+=3*VERTEX_FLOATS)if(mesh.roofs[off+12]===index) kinds.add(mesh.roofs[off+11]);
    assert.ok(kinds.has(9)&&kinds.has(17),id+' both surfaces emitted');
  }
});
