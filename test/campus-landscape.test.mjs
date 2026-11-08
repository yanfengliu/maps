import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {addCampusLandscape,validateCampusLandscape,LANDSCAPE_BUILDING,MAX_LANDSCAPE_TRIANGLES} from '../src/campus-landscape.ts';
import {selectLawns} from '../tools/data/build-campus-landscape.mjs';
import {projectLocal} from '../src/building-geometry.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'public/data/stanford-landscape.geojson');
const bytes=readFileSync(file),data=validateCampusLandscape(JSON.parse(bytes)),before=JSON.stringify(data);
const provenance=JSON.parse(readFileSync(path.join(root,'public/data/stanford-landscape-provenance.json')));
const hash=v=>createHash('sha256').update(v).digest('hex');
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const insideRing=(p,r)=>{let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const inside=(p,ps)=>ps.some(r=>insideRing(p,r[0])&&!r.slice(1).some(h=>insideRing(p,h)));
const inTriangle=(p,t)=>{const a=cross(...t);return a&&[cross(t[0],t[1],p),cross(t[1],t[2],p),cross(t[2],t[0],p)].every(v=>v*Math.sign(a)>=-1e-8);};
const triangles=[];
const counts=addCampusLandscape({triangle:(a,b,c,color,kind,building,uv)=>triangles.push({p:[a,b,c],color,kind,building,uv})},data,projectLocal);

test('landscape retains evidenced source geometry and provenance without blanket park or garden conversion',()=>{
 assert.deepEqual(counts,{lawns:126,flowerbeds:6,borders:1,triangles:2399});
 assert.equal(provenance.outputs['stanford-landscape.geojson'].sha256,hash(bytes));assert.equal(provenance.outputs['stanford-landscape.geojson'].bytes,bytes.length);
 const base=JSON.parse(readFileSync(path.join(root,'public/data/stanford-provenance.json')));assert.deepEqual(provenance.sources,base.sources);
 for(const f of data.features){
  if(f.properties.kind==='grass')assert.ok(f.properties.landuse==='grass'||f.properties.surface==='grass');
  if(f.properties.sourceGeometry)assert.equal(hash(JSON.stringify(f.properties.sourceGeometry)),provenance.sourceGeometryHashes[f.properties.id]);
 }
 assert.equal(data.features.filter(f=>f.properties.kind==='grass'&&f.properties.id.startsWith('relation/')).length,5);
 const elements=new Map(),node=(id,coordinate)=>elements.set('node/'+id,{type:'node',id,version:1,coordinate,tags:{}});
 const ring=(id,coordinates,tags)=>{const nodes=coordinates.map((p,i)=>{const nid=id+'-'+i;node(nid,p);return nid;});nodes.push(nodes[0]);elements.set('way/'+id,{type:'way',id,version:1,nodes,tags});};
 ring('29268613',[[0,0],[10,0],[10,10],[0,10]],{amenity:'university'});
 for(const [id,tags,x] of [['1',{landuse:'grass'},1],['2',{leisure:'park'},3],['3',{leisure:'garden'},5],['4',{natural:'wood'},7],['5',{natural:'grassland'},8]])ring(id,[[x,1],[x+1,1],[x+1,2],[x,2]],tags);
 ring('6',[[11,1],[12,1],[12,2],[11,2]],{landuse:'grass'});
 const selected=selectLawns(elements);assert.deepEqual(selected.features.map(f=>f.properties.id),['way/1']);assert.ok(selected.excluded.some(f=>f.id==='way/6'&&f.reason==='outside-mapped-campus'));
});

test('grass render geometry covers each retained area exactly, uses continuous metre UVs and stays within source lawns',()=>{
 assert.equal(triangles.length,MAX_LANDSCAPE_TRIANGLES);assert.ok(triangles.length*3*44<320000);
 let expectedArea=0,actualArea=0;
 for(const f of data.features){
  const rendered=polygons(f.geometry).map(p=>p.map(r=>r.map(projectLocal))),source=f.properties.sourceGeometry&&polygons(f.properties.sourceGeometry).map(p=>p.map(r=>r.map(projectLocal)));
  if(f.properties.kind==='grass'){
   for(const p of rendered)for(let i=0;i<p.length;i++){const r=p[i];expectedArea+=(i?-1:1)*Math.abs(r.slice(1).reduce((sum,b,j)=>sum+cross(r[0],r[j],b),0)/2);}
   for(const polygon of rendered)for(const r of polygon)for(const p of r){
    // Vertices on a source edge may be classified on either side; a tiny
    // displacement toward a source vertex removes that boundary ambiguity.
    const within=inside(p,source)||source.some(rs=>rs.some(r=>r.slice(1).some((b,i)=>{const a=r[i],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<.001;})));
    assert.ok(within,`${f.properties.id} render boundary leaves its original source lawn`);
   }
  }
 }
 for(const t of triangles){
  assert.equal(t.building,LANDSCAPE_BUILDING);assert.ok(t.p.flat().every(Number.isFinite));assert.ok(t.color.every(n=>n>=0&&n<=1));assert.deepEqual(t.uv,t.p.map(p=>p.slice(0,2)));
  assert.ok(t.p.every(p=>p[2]>=.012&&p[2]<=.3));if(t.kind===80)actualArea+=Math.abs(cross(...t.p))/2;
 }
 assert.ok(Math.abs(expectedArea-actualArea)<.001,'triangulation must preserve every corridor and source courtyard hole');assert.equal(JSON.stringify(data),before);
});

test('actual grass triangles leave all mapped crossing roads and paths open, including the Oval garden walks',()=>{
 const directory=process.env.CAMPUS_ROADS_DIRECTORY??path.join(root,'public/data'),manifestBytes=readFileSync(path.join(directory,'stanford-surfaces-roads-manifest.json')),manifest=JSON.parse(manifestBytes);
 assert.equal(hash(manifestBytes),provenance.topology.circulation.sha256,'lawn cutouts must use the same authoritative native-road input');
 const routes=manifest.files.flatMap(entry=>{const bytes=readFileSync(path.join(directory,entry.file));assert.equal(hash(bytes),entry.sha256);return JSON.parse(bytes).features;});
 const sources=data.features.filter(f=>f.properties.kind==='grass').map(f=>{const ps=polygons(f.properties.sourceGeometry).map(p=>p.map(r=>r.map(projectLocal))),all=ps.flat(2);return {ps,bounds:[Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[1])),Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[1]))]};});
 const turf=triangles.filter(t=>t.kind===80).map(t=>({...t,bounds:[Math.min(...t.p.map(p=>p[0])),Math.min(...t.p.map(p=>p[1])),Math.max(...t.p.map(p=>p[0])),Math.max(...t.p.map(p=>p[1]))]}));
 const bounded=(p,b)=>p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];let checked=0;const checkedIds=new Set();
 for(const f of routes)if(f.geometry.type==='LineString'){
  const points=f.geometry.coordinates.map(projectLocal),half=f.properties.modeledWidth/2;
  for(let i=1;i<points.length;i++)for(const t of [.2,.5,.8])for(const side of [-.8,0,.8]){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
   const p=[a[0]+dx*t-dy/length*half*side,a[1]+dy*t+dx/length*half*side];
   if(!sources.some(s=>bounded(p,s.bounds)&&inside(p,s.ps)))continue;
   assert.ok(!turf.some(tr=>bounded(p,tr.bounds)&&inTriangle(p,tr.p)),`grass covers ${f.properties.id} at segment${i}/${t}/${side}`);checked++;checkedIds.add(f.properties.id);
  }
 }
 assert.ok(checked>200,'real routes must exercise lawn clearances');
 for(const id of ['24772498','288808022','30773401','30773403','30775517','30775518','30775519'])assert.ok(checkedIds.has('way/'+id),`Oval path ${id} must remain open`);
});

test('flowers follow the mapped red S and stay inside the documented garden rather than spreading across lawns',()=>{
 const s=data.features.find(f=>f.properties.id==='way/1425123465');assert.ok(s,'the mapped red S flowerbed must exist');assert.deepEqual(s.geometry,s.properties.sourceGeometry);assert.equal(s.properties.colour,'red');
 const oval=data.features.find(f=>f.properties.id==='way/71183079').properties.sourceGeometry;
 for(const f of data.features.filter(f=>f.properties.kind!=='grass'))for(const p of polygons(f.geometry))for(const ring of p)for(const point of ring)assert.ok(inside(point,polygons(oval)),'all modeled flowers and borders stay inside the Oval');
 const red=triangles.filter(t=>t.kind===81),white=triangles.filter(t=>t.kind===82);
 assert.equal(red.length,29);for(const t of red){const p=t.p[0].map((_,i)=>t.p.reduce((sum,p)=>sum+p[i]/3,0));assert.ok(!white.some(w=>inTriangle(p,w.p)),'white plants must not fill the mapped red S');}
 assert.equal(data.features.filter(f=>f.properties.kind==='rose-bed').length,4);
});

test('invalid cached landscape and unsupported turf evidence fail before mesh generation',()=>{
 for(const change of [d=>{d.features[0].properties.groundEvidence='park';},d=>{d.features[0].geometry.coordinates=[];},d=>{d.features[0].properties.version=0;},d=>{d.features.push(structuredClone(d.features[0]));}]){const invalid=structuredClone(data);change(invalid);assert.throws(()=>validateCampusLandscape(invalid),/Campus landscape/);}
});
