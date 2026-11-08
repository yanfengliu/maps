import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChurchInterior, churchInteriorLocation, CHURCH_ID } from '../src/church-interior.ts';
import { projectLocal } from '../src/building-geometry.ts';

const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const mesh=buildChurchInterior(data),church=data.features.find(f=>f.properties.id===CHURCH_ID);
const origin=projectLocal(churchInteriorLocation(data,0,0)),east=projectLocal(churchInteriorLocation(data,1,0)),inward=projectLocal(churchInteriorLocation(data,0,1));
const toLocal=v=>[(v[0]-origin[0])*(east[0]-origin[0])+(v[1]-origin[1])*(east[1]-origin[1]),(v[0]-origin[0])*(inward[0]-origin[0])+(v[1]-origin[1])*(inward[1]-origin[1]),v[2]];
const ring=church.geometry.coordinates[0].slice(0,-1).map(projectLocal).map(toLocal);
const skin=[];
for(let i=0;i<mesh.roofs.length;i+=39)if(mesh.roofs[i+11]===29)skin.push([0,13,26].map(j=>toLocal(mesh.roofs.subarray(i+j,i+j+3))));
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const surfaces=skin.filter(t=>Math.abs(cross(...t))>1e-5);
const inside=p=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const heightsAt=p=>{
  const heights=[];
  for(const t of surfaces){const area=cross(...t),w=[cross(p,t[1],t[2])/area,cross(t[0],p,t[2])/area,cross(t[0],t[1],p)/area];if(w.every(n=>n>=-1e-6))heights.push(t.reduce((sum,v,i)=>sum+v[2]*w[i],0));}
  return heights;
};

test('optional ceiling is a complete surface across every source-footprint room, not just beams',()=>{
  assert.ok(surfaces.length>100,'the full ceiling skin must exist independently of the framing');
  const floorArea=Math.abs(ring.reduce((sum,a,i)=>sum+a[0]*ring[(i+1)%ring.length][1]-a[1]*ring[(i+1)%ring.length][0],0))/2;
  const ceilingArea=surfaces.reduce((sum,t)=>sum+Math.abs(cross(...t))/2,0);
  assert.ok(Math.abs(ceilingArea-floorArea)<0.02,'ceiling projected area must cover the footprint once, without extra caps');
  let seed=717,count=0;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<3000;i++){
    const p=[-28+random()*54,random()*60];if(!inside(p))continue;
    const heights=heightsAt(p);assert.ok(heights.length,`missing ceiling at ${p}`);
    assert.ok(Math.max(...heights)-Math.min(...heights)<0.001,`overlapping ceiling levels at ${p}`);count++;
  }
  assert.ok(count>1500);
  for(const [name,x,y] of [['organ loft',0,3],['nave',0,15],['west aisle',-10,18],['east aisle',10,18],['crossing',0,37.65],['west transept',-21,38],['east transept',21,38],['chancel',0,55],['round room',-23,54]])assert.ok(heightsAt([x,y]).length,`${name} has a continuous ceiling`);
});

test('ceiling preserves recognizable pitched timber, lower aisles and shallow crossing dome',()=>{
  const height=(x,y)=>heightsAt([x,y])[0];
  assert.ok(height(0,15)>20&&height(6.8,15)<18,'nave panels slope upward to a central ridge');
  assert.ok(height(-10,18)<10&&height(10,18)<10,'side aisles retain their lower ceilings');
  assert.ok(height(0,37.65)>21.5&&height(6.5,37.65)<19,'crossing has a shallow dome, not a flat or Gothic cap');
  assert.ok(height(0,50)>18&&height(0,58)<15,'chancel panels descend toward the apse');
  const kinds=new Set();
  for(let i=11;i<mesh.roofs.length;i+=13){kinds.add(mesh.roofs[i]);assert.ok(mesh.roofs[i]<100,'camera wall cutaway must not fragment the ceiling');}
  assert.deepEqual([...kinds].sort((a,b)=>a-b),[29,30]);
  for(let i=11;i<mesh.facades.length;i+=13)assert.ok(mesh.facades[i]%100!==29&&mesh.facades[i]%100!==30,'roof-off leaves no ceiling pieces in the opaque pass');
});

test('lower aisles and nave ceiling meet through closed clerestory panels',()=>{
  const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0),sub=(a,b)=>a.map((n,i)=>n-b[i]);
  const contains=(t,p)=>{
    const [a,b,c]=t,ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),aa=dot(ab,ab),bb=dot(ac,ac),d=dot(ab,ac),det=aa*bb-d*d;
    if(det<1e-8)return false;
    const u=(bb*dot(ap,ab)-d*dot(ap,ac))/det,v=(aa*dot(ap,ac)-d*dot(ap,ab))/det;
    const nearest=a.map((n,i)=>n+u*ab[i]+v*ac[i]);
    return u>=-1e-5&&v>=-1e-5&&u+v<=1.00001&&Math.hypot(...sub(p,nearest))<0.0001;
  };
  for(const x of [-7.65,7.65])for(const y of [8.7,14.7,23.7,28.7])for(const z of [10,13,16])assert.ok(skin.some(t=>contains(t,[x,y,z])),`open ceiling step at ${x}/${y}/${z}`);
});
