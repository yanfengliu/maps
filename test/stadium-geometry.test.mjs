import {MAX_DETAIL_TRIANGLES} from '../src/gpu-geometry.ts';
import {gpuGeometryBytes,GPU_VERTEX_BYTES,MAX_GPU_GEOMETRY_BYTES} from '../src/gpu-geometry.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareBuildingDetails,buildBuildingGeometry,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {validateCampusEnvironment} from '../src/campus-environment.ts';
import {validateCampusSculptures} from '../src/campus-sculptures.ts';
import {STADIUM_SEATING_IDS,STADIUM_CONCOURSE_ID} from '../src/stadium-architecture.ts';
const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.geojson',import.meta.url),'utf8'));
const source=load('stanford-buildings'),prepared=prepareBuildingDetails(source),mesh=buildBuildingGeometry(prepared);
const vertices=(values,index)=>{const out=[];for(let i=0;i<values.length;i+=VERTEX_FLOATS)if(values[i+12]===index)out.push([...values.slice(i,i+VERTEX_FLOATS)]);return out;};
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=ring=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-p[1]*q[0];},0)/2);
const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const distance=(p,a,b)=>{const d=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]*d[0]+d[1]*d[1])));return Math.hypot(p[0]-a[0]-t*d[0],p[1]-a[1]-t*d[1]);};

test('all mapped lower and upper stadium stands have physical red terraces toward the field, with fixed aisle coordinates',()=>{
 assert.equal(STADIUM_SEATING_IDS.size,16);
 for(const [index,feature] of source.features.entries())if(STADIUM_SEATING_IDS.has(feature.properties.id)){
  const values=vertices(mesh.roofs,index),seats=values.filter(v=>v[11]===31),ring=feature.geometry.coordinates[0].slice(0,-1).map(projectLocal);
  assert.ok(seats.length>200,feature.properties.id+' needs actual stepped seating');
  const levels=new Set(seats.map(v=>v[2].toFixed(3)));assert.ok(levels.size>=22,'many real terrace levels, not a single tilted roof');
  assert.ok(seats.every(v=>v[6]>v[7]*3&&v[6]>v[8]*2),'cardinal seat material');
  const depths=seats.map(v=>v[10]),lo=Math.min(...depths),hi=Math.max(...depths),near=seats.filter(v=>v[10]<lo+(hi-lo)*.1),far=seats.filter(v=>v[10]>hi-(hi-lo)*.1);
  assert.ok(Math.max(...near.map(v=>v[2]))<Math.min(...far.map(v=>v[2])),'each section rises outward from its field-facing front');
  const all=vertices(mesh.roofs,index).concat(vertices(mesh.facades,index));
  for(const p of all){assert.ok(p[2]>=feature.properties.base-.001&&p[2]<=feature.properties.height+.001);assert.ok(inside(p,ring)||ring.some((a,i)=>distance(p,a,ring[(i+1)%ring.length])<.002),'generated seating leaves its source polygon');}
  let areaSum=0,vertical=0;const coordinates=new Map();
  for(let i=0;i<seats.length;i+=3){const tri=seats.slice(i,i+3);if(tri.every(v=>Math.abs(v[2]-tri[0][2])<.001))areaSum+=Math.abs(cross(...tri))/2;else vertical++;}
  assert.ok(Math.abs(areaSum-area(ring))<.05,'terraces cover each mapped stand once, without polygon gaps');assert.ok(vertical>35,'vertical risers give the row silhouette');
  for(const p of seats){const key=p[0].toFixed(3)+','+p[1].toFixed(3);if(coordinates.has(key))assert.ok(Math.abs(coordinates.get(key)-p[9])<.002,'aisle UV must not restart at a row');else coordinates.set(key,p[9]);}
 }
});

test('stadium field remains at ground level inside the bowl opening and has regulation football dimensions',()=>{
 const index=source.features.findIndex(f=>f.properties.id===STADIUM_CONCOURSE_ID),field=vertices(mesh.roofs,index).filter(v=>v[11]===32);
 assert.equal(field.length,6,'one simple field surface with procedural paint');assert.ok(field.every(v=>Math.abs(v[2]-.06)<.001));
 for(const [axis,size] of [[9,48.768],[10,109.728]])assert.ok(Math.abs(Math.max(...field.map(v=>v[axis]))-Math.min(...field.map(v=>v[axis]))-size)<.001);
 const hole=source.features[index].geometry.coordinates[1].slice(0,-1).map(projectLocal);assert.ok(field.every(v=>inside(v,hole)),'field cannot cover seating or concourse');
 const metal=vertices(mesh.roofs,index).filter(v=>Math.abs(v[6]-.88)<.001&&Math.abs(v[7]-.72)<.001);assert.equal(metal.length,360,'two connected five-beam goalposts with end caps');
 assert.ok(metal.some(v=>Math.abs(v[2]-3.048)<.1));assert.ok(metal.some(v=>v[2]>7.9));
 const boxes=[];
 for(let start=0;start<metal.length;start+=36){
  const beam=metal.slice(start,start+36),edges=new Map(),point=v=>v.slice(0,3).map(n=>n.toFixed(4)).join(',');
  for(let i=0;i<beam.length;i+=3){const [a,b,c]=beam.slice(i,i+3),u=b.slice(0,3).map((n,j)=>n-a[j]),v=c.slice(0,3).map((n,j)=>n-a[j]);
   assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-5,'goalpost faces must not collapse along the beam axis');
   for(const [p,q] of [[a,b],[b,c],[c,a]]){const key=[point(p),point(q)].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
  }
  assert.ok([...edges.values()].every(n=>n===2),'each square steel beam is closed');
  boxes.push([0,1,2].map(axis=>[Math.min(...beam.map(v=>v[axis])),Math.max(...beam.map(v=>v[axis]))]));
 }
 for(let end=0;end<2;end++){
  const connected=new Set([end*5]);let changed=true;
  while(changed){changed=false;for(let i=end*5;i<(end+1)*5;i++)if(!connected.has(i)&&[...connected].some(j=>boxes[i].every(([lo,hi],axis)=>lo<=boxes[j][axis][1]+.001&&hi>=boxes[j][axis][0]-.001))){connected.add(i);changed=true;}}
  assert.equal(connected.size,5,'support, gooseneck arm, crossbar and uprights meet');
 }
});

test('stadium replaces generic surfaces within the unchanged full-campus resource budget',()=>{
 const g=buildBuildingGeometry(prepared,validateCampusEnvironment(load('stanford-environment')),validateCampusSculptures(load('stanford-sculptures')));
 assert.ok(g.triangles<=MAX_DETAIL_TRIANGLES);assert.ok(gpuGeometryBytes(g.roofs)+gpuGeometryBytes(g.facades)<=MAX_GPU_GEOMETRY_BYTES);assert.equal(g.buildings,648);
 assert.ok(g.roofs.every(Number.isFinite)&&g.facades.every(Number.isFinite));
 const original=JSON.stringify(source);prepareBuildingDetails(source);assert.equal(JSON.stringify(source),original);
 for(const id of ['way/1351984170','way/1354417642','way/1354428606','way/1354429136']){
  const i=source.features.findIndex(f=>f.properties.id===id),all=vertices(g.roofs,i).concat(vertices(g.facades,i));
  assert.ok(all.filter(v=>v[11]!==33).every(v=>v[2]>=source.features[i].properties.base-.001&&v[2]<=source.features[i].properties.height+.001));
  assert.ok(!vertices(g.roofs,i).some(v=>v[11]===0),'pressbox and screens must not have terracotta pitched roofing');
 }
});

test('raised north scoreboard has two grounded columns meeting the unchanged mapped panel',()=>{
 const i=source.features.findIndex(f=>f.properties.id==='way/1354429136'),feature=source.features[i],ring=feature.geometry.coordinates[0].slice(0,-1).map(projectLocal),columns=vertices(mesh.facades,i).filter(v=>v[11]===33);
 assert.equal(columns.length,72,'two closed steel columns');
 for(let j=0;j<columns.length;j+=36){const column=columns.slice(j,j+36);assert.equal(Math.min(...column.map(v=>v[2])),0);assert.equal(Math.max(...column.map(v=>v[2])),feature.properties.base);assert.ok(column.every(v=>inside(v,ring)),'supports stay underneath the mapped board');}
});
