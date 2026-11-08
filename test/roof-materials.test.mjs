import test from 'node:test';
import assert from 'node:assert/strict';
import {roofTriangleUV,ROOF_TILE_WIDTH_METERS,ROOF_TILE_COURSE_METERS} from '../src/roof-materials.ts';

const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} vs ${b}`);
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const rotate=(p,angle,offset=[0,0,0])=>[p[0]*Math.cos(angle)-p[1]*Math.sin(angle)+offset[0],p[0]*Math.sin(angle)+p[1]*Math.cos(angle)+offset[1],p[2]+offset[2]];
const origin=[83.234,-129.375,17];

test('tile courses follow every rotated hip face eave and fall line, not one building-wide axis',()=>{
 for(const angle of [0,.27,Math.PI/2,2.1,4.8])for(const face of [
  {eave:[[-20,-12,0],[20,-12,0]],upper:[0,0,3]},
  {eave:[[20,12,0],[-20,12,0]],upper:[0,0,3]},
  {eave:[[-20,12,0],[-20,-12,0]],upper:[-10,0,3]},
  {eave:[[20,-12,0],[20,12,0]],upper:[10,0,3]},
 ]){
  const [a,b]=face.eave.map(p=>rotate(p,angle,origin)),c=rotate(face.upper,angle,origin),uv=roofTriangleUV(a,b,c,origin);
  close(uv[0][1],uv[1][1],'one eave must have one tile-course coordinate');
  close(Math.abs(uv[1][0]-uv[0][0]),Math.hypot(...sub(b,a)),'barrel width must use physical eave distance');
  const middle=a.map((n,i)=>(n+b[i])/2),run=Math.hypot(...sub(c,middle));
  close(uv[2][0],(uv[0][0]+uv[1][0])/2,'uphill movement must not drift across barrels');
  close(uv[2][1]-(uv[0][1]+uv[1][1])/2,run,'tile courses must use roof-slope distance');
 }
});

test('adjacent triangles on one plane share material phase for either diagonal and arbitrary winding',()=>{
 const plane=(x,y)=>[x,y,15+.31*x-.47*y],points=[[1,2],[14,2],[14,11],[1,11]].map(([x,y])=>plane(x,y));
 const cases=[[0,1,2],[0,2,3],[0,1,3],[1,2,3],[2,1,0],[3,2,0]],expected=new Map();
 for(const order of cases){const vertices=order.map(i=>points[i]),uv=roofTriangleUV(...vertices,origin);
  for(let i=0;i<3;i++){const id=order[i];if(expected.has(id))uv[i].forEach((n,j)=>close(n,expected.get(id)[j],'coplanar shared-vertex UV'));else expected.set(id,uv[i]);}
 }
 const probe=plane(6.25,4.75),reference=roofTriangleUV(points[0],points[1],probe,origin)[2];
 for(const order of [[0,1,2],[0,2,3]]){
  const p=order.map(i=>points[i]),uv=roofTriangleUV(...p,origin),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),area=cross(...p);
  const weights=[cross(probe,p[1],p[2])/area,cross(p[0],probe,p[2])/area,cross(p[0],p[1],probe)/area];
  for(let axis=0;axis<2;axis++)close(uv.reduce((sum,v,i)=>sum+v[axis]*weights[i],0),reference[axis],'interpolated phase must not depend on triangulation');
 }
});

test('pitch changes preserve a physical tile module and common-origin translation does not change its phase',()=>{
 for(const slope of [.05,.3,.75,1.6]){
  const run=ROOF_TILE_COURSE_METERS/Math.hypot(1,slope),p=[[0,0,0],[ROOF_TILE_WIDTH_METERS,0,0],[0,run,run*slope]],uv=roofTriangleUV(...p);
  close(Math.abs(uv[1][0]-uv[0][0]),ROOF_TILE_WIDTH_METERS,'one barrel width');close(uv[2][1]-uv[0][1],ROOF_TILE_COURSE_METERS,'one sloped course');
  const moved=p.map(v=>v.map((n,i)=>n+origin[i])),other=roofTriangleUV(...moved,origin);for(let i=0;i<3;i++)for(let j=0;j<2;j++)close(other[i][j],uv[i][j],'translated phase');
 }
});

test('flat or degenerate input has a finite deterministic fallback while invalid coordinates fail clearly',()=>{
 const p=[[2,3,5],[8,3,5],[8,9,5]],a=roofTriangleUV(...p,[0,0,0],[0,1]);
 assert.deepEqual(a,[[3,-2],[3,-8],[9,-8]]);assert.deepEqual(roofTriangleUV(p[2],p[1],p[0],[0,0,0],[0,1]),[...a].reverse());
 assert.ok(roofTriangleUV(p[0],p[0],p[0]).flat().every(Number.isFinite));
 assert.throws(()=>roofTriangleUV([NaN,0,0],p[1],p[2]),/finite/);
});

test('negative control: a global XY mapping fails the hip orientation and sloped-course contracts',()=>{
 const p=[[20,-12,0],[20,12,0],[10,0,3]],globalUV=p.map(v=>v.slice(0,2));
 assert.notEqual(globalUV[0][1],globalUV[1][1],'global Y wrongly changes course along this eave');
 const horizontalRun=Math.abs(globalUV[2][0]-globalUV[0][0]);assert.notEqual(horizontalRun,Math.hypot(10,3),'horizontal UV stretches the physical course on a pitched roof');
 const uv=roofTriangleUV(...p);close(uv[0][1],uv[1][1],'corrected hip eave');
});
