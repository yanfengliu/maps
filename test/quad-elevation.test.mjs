import test from 'node:test';
import assert from 'node:assert/strict';
import { addQuadArcade, addQuadWingElevation } from '../src/quad-architecture.ts';

const stone=[.72,.63,.49],close=(a,b)=>Math.abs(a-b)<1e-7;
function mesh(){
  const triangles=[];
  return {triangles,triangle(a,b,c,tint,kind,building,uv){
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])<1e-8)return;
    triangles.push({points:[a,b,c],tint,kind,building,uv});
  },quad(a,b,c,d,tint,kind,building,uv){
    this.triangle(a,b,c,tint,kind,building,uv&&[uv[0],uv[1],uv[2]]);
    this.triangle(a,c,d,tint,kind,building,uv&&[uv[0],uv[2],uv[3]]);
  }};
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function covers(triangle,x,z){
  const points=triangle.points.map(p=>[p[0],p[2]]),area=cross(...points);
  if(Math.abs(area)<1e-8)return false;
  const sign=Math.sign(area),point=[x,z];
  return points.every((p,i)=>cross(p,points[(i+1)%3],point)*sign>=-1e-8);
}

test('arcade openings remain empty in front of a complete recessed wall with physical column shafts',()=>{
  const result=mesh();addQuadArcade(result,[0,0],[27.6,0],[0,-1],0,6.2,0,stone);
  const front=result.triangles.filter(t=>t.points.every(p=>p[1]<.8));
  const rear=result.triangles.filter(t=>t.points.every(p=>close(p[1],2.2)));
  for(let bay=0;bay<6;bay++)for(const z of [.45,1.4,2.8,4.5]){
    const x=(bay+.5)*4.6;
    assert.ok(!front.some(t=>covers(t,x,z)),`bay ${bay} is filled at ${z}`);
    assert.ok(rear.some(t=>covers(t,x,z)),`rear wall has a gap at ${x},${z}`);
  }
  const shafts=result.triangles.filter(t=>t.points.every(p=>p[2]>=.33-1e-8&&p[2]<=6.2*.46-.20+1e-8));
  assert.ok(shafts.length>=6*8,'columns lost their polygonal shafts');
  assert.ok(new Set(shafts.flatMap(t=>t.points.map(p=>p[1].toFixed(4)))).size>=4,'columns were flattened');
  const windows=result.triangles.filter(t=>t.kind===21);
  assert.equal(windows.length,12,'rear window should use two triangles per bay');
  assert.ok(windows.every(t=>t.points.every(p=>close(p[1],2.175))));
  assert.ok(windows.every(t=>t.uv.every(p=>p.every(v=>v===0||v===1))),'shader panel coordinates must be normalized');
  const wedges=result.triangles.filter(t=>t.kind===2&&t.points.every(p=>close(p[1],.055)));
  assert.equal(wedges.length,6*10*2,'ten plain radial wedges must remain per arch');
});

test('an open named wing has no ground front wall and keeps the existing upper-storey UV scale',()=>{
  const result=mesh();addQuadWingElevation(result,[0,0],[27.6,0],[0,-1],2,12,4,stone,'way/836474107',true);
  const upper=result.triangles.filter(t=>t.kind===18);
  assert.equal(upper.length,2);
  assert.ok(upper.every(t=>t.points.every(p=>p[2]>=8.2-1e-8&&p[2]<=11.88+1e-8)));
  for(const t of upper)for(let i=0;i<3;i++)assert.ok(close(t.uv[i][1],(t.points[i][2]-2)*10/10));
  const closed=mesh();addQuadWingElevation(closed,[0,0],[27.6,0],[0,-1],2,12,4,stone,'way/836474107');
  assert.ok(closed.triangles.filter(t=>t.kind===18).some(t=>covers(t,13.8,3)),'closed fronts need a solid room wall');
});

test('Margaret Jacks door stays on the rear wall of an open arcade',()=>{
  const result=mesh();addQuadWingElevation(result,[0,0],[26,0],[0,1],0,10,3,stone,'way/836474099',true);
  const door=result.triangles.filter(t=>t.kind===15);
  assert.ok(door.length>10);
  assert.ok(door.every(t=>t.points.every(p=>p[1]<-2)),'door glazing covers the front arcade opening');
});

test('short arcade returns stay solid, bounded and finite',()=>{
  for(const length of [.25,1.8,3.1]){
    const result=mesh();addQuadArcade(result,[0,0],[length,0],[0,-1],1,7.2,0,stone,11);
    assert.equal(result.triangles.length,2);
    assert.ok(result.triangles.some(t=>covers(t,length/2,2)));
    assert.ok(result.triangles.flatMap(t=>t.points).every(p=>p.every(Number.isFinite)&&p[0]>=0&&p[0]<=length&&p[2]>=1&&p[2]<=11));
  }
});
