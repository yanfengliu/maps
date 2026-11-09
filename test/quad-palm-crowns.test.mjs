import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addQuadPlantings,locateQuadPlantings} from '../src/quad-plantings.ts';
import {QUAD_SPECIES} from '../src/quad-planting-reference.ts';
import {projectLocal} from '../src/building-geometry.ts';

const data=JSON.parse(readFileSync(new URL('../public/data/stanford-environment.geojson',import.meta.url)));
const plants=locateQuadPlantings(data,projectLocal).flatMap(c=>c.plants);
function record(){
  const triangles=[],anchors=[];
  const mesh={triangle(a,b,c,tint,kind,id){triangles.push({points:[a,b,c],kind,id});},quad(a,b,c,d,tint,kind,id){this.triangle(a,b,c,tint,kind,id);this.triangle(a,c,d,tint,kind,id);}};
  addQuadPlantings(mesh,data,projectLocal,p=>{anchors.push(p);return -100-anchors.length;});
  return {triangles,anchors};
}
// Vertical ray/triangle intersection measures the visible crown, independent of
// how fronds are constructed. A low hub beneath an annulus is still a hollow top.
function heightAt(triangles,x,y){
  let z=-Infinity;
  for(const {points:[a,b,c]} of triangles){
    const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(det)<1e-10)continue;
    const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
    const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;
    if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)z=Math.max(z,u*a[2]+v*b[2]+(1-u-v)*c[2]);
  }
  return z;
}
function filledCenter(crown,position,height,radius){
  let covered=0,total=0;
  for(const radiusFraction of [0,.05,.10,.17])for(let angle=0;angle<12;angle++){
    const theta=angle*Math.PI/6;
    const z=heightAt(crown,position[0]+Math.cos(theta)*radius*radiusFraction,position[1]+Math.sin(theta)*radius*radiusFraction);
    if(z>=height-radius*.25)covered++;
    total++;
  }
  return covered/total;
}

test('every referenced fan palm has an upright filled growing point, not a low hub inside a hollow crown',()=>{
  const {triangles,anchors}=record(),failures=[];
  for(const [index,plant] of plants.entries()){
    const species=QUAD_SPECIES[plant.code];if(species.shape!=='fan')continue;
    const crown=triangles.filter(t=>t.id===-101-index&&t.kind===10);
    const coverage=filledCenter(crown,plant.position,species.height,species.radius);
    if(coverage<.95)failures.push(`${plant.id} ${plant.code}: ${Math.round(coverage*100)}%`);
  }
  assert.deepEqual(failures,[],'the upper inner crown must contain young upright foliage at all azimuths');
  assert.deepEqual(anchors,plants.map(p=>p.position),'tree anchors and registration order remain unchanged');
});

test('crown-hole oracle rejects a deliberately closed low hub underneath an open annulus',()=>{
  const triangles=[];
  for(let j=0;j<12;j++){
    const a=j*Math.PI/6,b=(j+1)*Math.PI/6;
    const p=(angle,r,z)=>[Math.cos(angle)*r,Math.sin(angle)*r,z];
    triangles.push({points:[p(a,.3,1),p(a,1,1),p(b,1,1)]},{points:[p(a,.3,1),p(b,1,1),p(b,.3,1)]});
    triangles.push({points:[[0,0,.5],p(a,.3,.5),p(b,.3,.5)]});
  }
  assert.equal(filledCenter(triangles,[0,0],1,1),0);
});

test('outer fan foliage is individually splayed rather than repeated six-fold ring shelves',()=>{
  const {triangles}=record();
  for(const [index,plant] of plants.entries()){
    const species=QUAD_SPECIES[plant.code];if(species.shape!=='fan')continue;
    const points=triangles.filter(t=>t.id===-101-index&&t.kind===10).flatMap(t=>t.points)
      .map(p=>[p[0]-plant.position[0],p[1]-plant.position[1],p[2]])
      .filter(p=>Math.hypot(p[0],p[1])>species.radius*.35);
    let repeated=0;
    for(const [x,y,z] of points){
      const rotated=[x*.5-y*Math.sqrt(3)/2,x*Math.sqrt(3)/2+y*.5,z];
      if(points.some(p=>Math.hypot(...p.map((v,i)=>v-rotated[i]))<1e-7))repeated++;
    }
    assert.ok(repeated/points.length<.5,`${plant.code}: crown is invariant under 60-degree rotation`);
  }
});

test('fan-crown repair keeps the existing geometry allocation and source footprints',()=>{
  const {triangles}=record();assert.ok(triangles.length<=8200,'replace the existing crown budget rather than enlarging it');
  for(const [index,plant] of plants.entries()){
    const species=QUAD_SPECIES[plant.code];if(species.shape!=='fan')continue;
    const crown=triangles.filter(t=>t.id===-101-index&&t.kind===10);
    for(const p of crown.flatMap(t=>t.points)){
      assert.ok(p.every(Number.isFinite));
      assert.ok(Math.hypot(p[0]-plant.position[0],p[1]-plant.position[1])<=species.radius*1.05,'crown expands beyond its previous estimated envelope');
      assert.ok(p[2]<=species.height+1e-8&&p[2]>0);
    }
  }
});
