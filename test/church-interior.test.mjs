import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChurchInterior, churchInteriorLocation, CHURCH_ID } from '../src/church-interior.ts';
import { projectLocal, distanceToRings, VERTEX_FLOATS, MAX_DETAIL_TRIANGLES } from '../src/building-geometry.ts';
import { photoProjection, NAVE_MOSAIC, APSE_BOTTOM, APSE_TOP } from '../src/church-artwork.ts';

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

test('rendered nave mosaic follows the rectified wall calibration throughout both original triangles',()=>{
  const origin=projectLocal(churchInteriorLocation(data,0,0)), east=projectLocal(churchInteriorLocation(data,1,0)), inward=projectLocal(churchInteriorLocation(data,0,1));
  const toLocal=v=>[(v[0]-origin[0])*(east[0]-origin[0])+(v[1]-origin[1])*(east[1]-origin[1]),(v[0]-origin[0])*(inward[0]-origin[0])+(v[1]-origin[1])*(inward[1]-origin[1]),v[2]];
  const triangles=[];
  for(let i=0;i<mesh.facades.length;i+=39){
    const vertices=[0,13,26].map(j=>Array.from(mesh.facades.subarray(i+j,i+j+13))),p=vertices.map(toLocal);
    if(vertices.every(v=>v[11]===22)&&p.every(v=>Math.abs(v[0]-7.58)<1e-4&&v[2]>=9.299&&v[2]<=12.201))triangles.push({p,vertices});
  }
  const cross=(a,b,c)=>(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);
  const project=photoProjection(NAVE_MOSAIC);
  for(const u of [.03,.13,.33,.5,.73,.97])for(const v of [.03,.2,.5,.78,.97]){
    const probe=[7.58,6.5+u*22.7,9.3+v*2.9],hits=[];
    for(const {p,vertices} of triangles){
      const area=cross(...p),w=[cross(probe,p[1],p[2])/area,cross(p[0],probe,p[2])/area,cross(p[0],p[1],probe)/area];
      if(w.some(n=>n< -1e-5))continue;
      hits.push([9,10].map(k=>vertices.reduce((sum,p,i)=>sum+p[k]*w[i],0)));
    }
    assert.ok(hits.length,'every mosaic sample must have actual rendered geometry');
    for(const hit of hits){const expected=project([u,v]);assert.ok(Math.hypot((hit[0]-expected[0])*1280,(hit[1]-expected[1])*853)<.5,'rendered wall must remove the photo perspective to subpixel accuracy');}
  }
});

test('all rendered apse facets unwrap the same horizontal cornices without baked camera tilt',()=>{
  const counts=Array(6).fill(0);
  for(let i=0;i<mesh.facades.length;i+=13){
    const p=mesh.facades.subarray(i,i+13); if(p[11]!==23||p[2]<5.001)continue;
    let matched=false;
    for(let j=0;j<6;j++){
      const a=rings[0][24+j],b=rings[0][25+j],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      const distance=Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length;
      const u=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length);
      if(Math.abs(distance-.045)>1e-4||u< -1e-5||u>1.00001)continue;
      const expected=photoProjection({size:[960,720],curved:true,corners:[APSE_BOTTOM[j],APSE_BOTTOM[j+1],APSE_TOP[j+1],APSE_TOP[j]]})([u,(p[2]-5)/7.8]);
      assert.ok(Math.hypot((p[9]-expected[0])*960,(p[10]-expected[1])*720)<.01,'cornice calibration must reach the emitted mesh');
      matched=true;counts[j]++;break;
    }
    assert.ok(matched,'every upper apse photo vertex belongs to a calibrated source facet');
  }
  assert.ok(counts.every(n=>n>6));
});
