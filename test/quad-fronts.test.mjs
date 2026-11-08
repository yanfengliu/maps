import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareBuildingDetails, buildBuildingGeometry, projectLocal, VERTEX_FLOATS as stride } from '../src/building-geometry.ts';
import { QUAD_WING_IDS } from '../src/quad-architecture.ts';
import { isOpenQuadFront, quadArcadeEdges } from '../src/quad-fronts.ts';
import { QUAD_ROOF_MAXIMUM_TIME } from '../src/quad-roof.ts';

const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const prepared=prepareBuildingDetails(source),mesh=buildBuildingGeometry(prepared);
const parent=source.features.find(f=>f.properties.id==='relation/35820');
const rings=parent.geometry.coordinates.map(r=>r.slice(0,-1).map(projectLocal));
const triangles=(buffer,index)=>{
  const result=[];
  for(let i=0;i<buffer.length;i+=stride*3)if(buffer[i+12]===index)result.push([0,1,2].map(j=>Array.from(buffer.slice(i+j*stride,i+j*stride+3))));
  return result;
};
const covers=(tri,p)=>{
  const cross=(a,b)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  const signs=tri.map((a,i)=>cross(a,tri[(i+1)%3]));
  return signs.every(s=>s>=-1e-4)||signs.every(s=>s<=1e-4);
};

test('reviewed Inner Quad, Memorial Court and north front are open; interstitial room walls stay closed',()=>{
  const edges=quadArcadeEdges(rings);
  // Fixed source witnesses from the survey: both sides of Memorial Court,
  // the Inner Quad, and north academic frontage. Do not derive these from
  // the implementation's list: missing any one must fail this regression.
  for(const [ring,indices] of [[4,[0,1,2,3,4,5,6,7,8,9,10,11,12]],[0,[151,152,153,154,155,156,157,137,139,140,142,143,145,163,165,166,167,168,169]]]){
    for(const i of indices)assert.equal(isOpenQuadFront(rings[ring][i],rings[ring][(i+1)%rings[ring].length],edges),true,`${ring}/${i}`);
  }
  for(const ring of [rings[5],rings[6]])for(let i=0;i<ring.length;i++)assert.equal(isOpenQuadFront(ring[i],ring[(i+1)%ring.length],edges),false,'closed courtyard room wall');
  assert.equal(isOpenQuadFront([0,1],[20,1],[[[0,0],[20,0]]]),false,'a nearby parallel wall is not a source frontage');
  assert.throws(()=>quadArcadeEdges([rings[0].slice(1),...rings.slice(1)]),/boundaries changed/);

  let parentFronts=0,closedRoomVertices=0,flatArchVertices=0;
  const openWings=new Set();
  for(const [index,f] of prepared.features.entries()){
    if(f.properties.id!=='relation/35820'&&!QUAD_WING_IDS.has(f.properties.id))continue;
    const faces=triangles(mesh.facades,index),polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    for(const polygon of polygons)for(const ring of polygon){
      const points=ring.slice(0,-1).map(projectLocal);
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        if(!isOpenQuadFront(a,b,f.properties.detailArcadeEdges))continue;
        if(f.properties.id==='relation/35820')parentFronts++;else openWings.add(f.properties.id);
        const length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length];
        // First bay centre, 2m up: look through the opening at the front,
        // then find its solid wall 2.2m behind. A flat decal cannot pass.
        const sample=[length/Math.max(1,Math.round(length/4.6))/2,2];
        const projected=faces.map(tri=>tri.map(p=>[(p[0]-a[0])*u[0]+(p[1]-a[1])*u[1],p[2],Math.abs((p[0]-a[0])*u[1]-(p[1]-a[1])*u[0])]));
        assert.ok(!projected.some(tri=>tri.every(p=>p[2]<0.12)&&covers(tri,sample)),`opening blocked at ${f.properties.name}/${i}`);
        assert.ok(projected.some(tri=>tri.every(p=>Math.abs(p[2]-2.2)<0.001)&&covers(tri,sample)),`missing recessed wall at ${f.properties.name}/${i}`);
      }
    }
    for(let i=0;i<mesh.facades.length;i+=stride)if(mesh.facades[i+12]===index){
      if(mesh.facades[i+11]===20)closedRoomVertices++;
      if(mesh.facades[i+11]===3)flatArchVertices++;
    }
  }
  assert.equal(parentFronts,23);
  assert.deepEqual([...openWings].sort(),[99,100,101,105,106,107].map(n=>`way/${836474000+n}`).sort(),'all six photographed north wings have open fronts; Braun/Pigott keep their closed elevations');
  assert.ok(closedRoomVertices>300);assert.equal(flatArchVertices,0,'no repeated arch decals on closed Quad rooms');
});

test('the rendered parent roof uses the same physical pitch on all components and source-edge planes instead of earcut dents',()=>{
  const index=prepared.features.findIndex(f=>f.properties.id==='relation/35820'),p=prepared.features[index].properties;
  const pitch=(p.detailRoofHeight-p.detailWallHeight-.07)/QUAD_ROOF_MAXIMUM_TIME;
  let count=0;
  for(let i=0;i<mesh.roofs.length;i+=stride*3){
    if(mesh.roofs[i+12]!==index||mesh.roofs[i+11]!==0)continue;
    const nx=mesh.roofs[i+3],ny=mesh.roofs[i+4],nz=mesh.roofs[i+5];
    assert.ok(Math.abs(Math.hypot(nx,ny)/nz-pitch)<1e-6,'every emitted roof facet has the common slope; sampled dents fail');
    count++;
  }
  assert.ok(count>400,'inspect all compound roof components, not a rectangular stand-in');
});
