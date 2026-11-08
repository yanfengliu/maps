import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChurchInterior, churchInteriorLocation, CHURCH_ID } from '../src/church-interior.ts';
import { projectLocal, distanceToRings, VERTEX_FLOATS, MAX_DETAIL_TRIANGLES } from '../src/building-geometry.ts';

const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))),before=JSON.stringify(data);
const church=data.features.find(f=>f.properties.id===CHURCH_ID),rings=church.geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal)),mesh=buildChurchInterior(data);
function inside(p){let result=false;const r=rings[0];for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}

test('church detail stays within the mapped footprint and height, with finite unit normals and valid photo coordinates',()=>{
  let ceiling=0,photos=0;
  for(const buffer of [mesh.roofs,mesh.facades])for(let i=0;i<buffer.length;i+=VERTEX_FLOATS){
    const v=Array.from(buffer.subarray(i,i+VERTEX_FLOATS));assert.ok(v.every(Number.isFinite));
    assert.ok(inside(v)||distanceToRings(v,rings)<=0.4,'only the authored 40 cm perimeter trim may project outside');
    assert.ok(v[2]>=church.properties.base&&v[2]<=church.properties.height);
    assert.ok(Math.abs(Math.hypot(v[3],v[4],v[5])-1)<1e-6);
    assert.equal(v[12],data.features.indexOf(church));
    if(v[11]===30)ceiling++;
    if(v[11]===22||v[11]===23){photos++;assert.ok(v[9]>=0&&v[9]<=1&&v[10]>=0&&v[10]<=1);}
  }
  assert.ok(ceiling>0);assert.ok(photos>0);assert.equal(JSON.stringify(data),before);
});

test('cutaway has an open center aisle and a physical floor in the nave, crossing and chancel',()=>{
  // Independently intersect horizontal floor triangles at surveyed-frame probe
  // locations. No native church cap may substitute for the interior floor.
  const heightAt=(x,y)=>{const p=projectLocal(churchInteriorLocation(data,x,y)),heights=[];
    for(let i=0;i<mesh.facades.length;i+=39){const a=Array.from(mesh.facades.subarray(i,i+3)),b=Array.from(mesh.facades.subarray(i+13,i+16)),c=Array.from(mesh.facades.subarray(i+26,i+29));if(Math.max(a[2],b[2],c[2])-Math.min(a[2],b[2],c[2])>1e-5)continue;const cross=(u,v,w)=>(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]),s=Math.sign(cross(a,b,c));if(s&&[cross(a,b,p),cross(b,c,p),cross(c,a,p)].every(v=>v*s>=-1e-5))heights.push(a[2]);}
    return heights;
  };
  for(const y of [10,20,32,38]){const h=heightAt(0,y);assert.ok(h.some(z=>z>=0.1&&z<=0.18));assert.ok(!h.some(z=>z>0.2&&z<2),'the central walking aisle must stay free of pews');}
  assert.ok(heightAt(0,48).some(z=>z>1&&z<1.4),'the chancel platform is raised');
});

test('interior plus its photo allocations respects the original GPU budget with two mesh buffers',()=>{
  assert.equal(mesh.triangles,(mesh.roofs.length+mesh.facades.length)/39);assert.ok(mesh.triangles<MAX_DETAIL_TRIANGLES);
  assert.equal(mesh.bytes,mesh.roofs.byteLength+mesh.facades.byteLength);
  const photoBytes=1280*853*4+960*720*4;assert.ok(mesh.bytes+photoBytes<24*1024*1024);
  assert.equal(mesh.buildings,1);assert.equal(mesh.churchTextures,true);
  for(let i=11;i<mesh.roofs.length;i+=13)assert.equal(mesh.roofs[i],30,'roof-off switch must remove all overhead panels');
});

test('church camera targets follow the source frame and missing or malformed church input fails clearly',()=>{
  const entrance=churchInteriorLocation(data,0,0),altar=churchInteriorLocation(data,0,54),east=churchInteriorLocation(data,5,0);
  assert.ok(altar[1]<entrance[1]);assert.ok(east[0]>entrance[0]);
  assert.throws(()=>buildChurchInterior({type:'FeatureCollection',features:[]}),/footprint is unavailable/);
  const invalid=structuredClone(data);invalid.features.find(f=>f.properties.id===CHURCH_ID).properties.height=0;
  assert.throws(()=>buildChurchInterior(invalid),/invalid dimensions/);
});
