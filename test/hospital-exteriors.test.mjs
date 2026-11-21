import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareBuildingDetails, buildBuildingGeometry, projectLocal, VERTEX_FLOATS } from '../src/building-geometry.ts';
import { describeBuildingArchitecture } from '../src/building-architecture.ts';

const pinned = JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const entries = [
  ['way/891732466', .39, 4, /four glazed upper blocks/i],
  ['way/689417360', .34, 2, /staggered pavilion wings/i],
  ['way/130100416', .55, 2, /terraced wings/i],
];
const near = (a,b) => Math.abs(a-b)<.001;
function pointInRing([x,y],ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [ax,ay]=ring[i],[bx,by]=ring[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function connectedRoofCount(triangles) {
  const remaining=new Set(triangles);
  let islands=0;
  while(remaining.size){
    const first=remaining.values().next().value;
    remaining.delete(first);
    const queue=[first];
    while(queue.length){
      const tri=queue.pop();
      for(const candidate of remaining){
        if(tri.some(p=>candidate.some(q=>near(p[0],q[0])&&near(p[1],q[1])))){
          remaining.delete(candidate);queue.push(candidate);
        }
      }
    }
    islands++;
  }
  return islands;
}
function triangles(mesh) {
  const result=[];
  for(let i=0;i<mesh.length;i+=3*VERTEX_FLOATS){
    const corners=[0,1,2].map(j=>[...mesh.slice(i+j*VERTEX_FLOATS,i+j*VERTEX_FLOATS+3)]);
    result.push({corners,kind:mesh[i+11],tint:[...mesh.slice(i+6,i+9)]});
  }
  return result;
}

for(const [id,deckFraction,upperBlocks,description] of entries){
  test(id+' has a stepped exterior inside its own mapped footprint and estimated height',()=>{
    const original=pinned.features.find(f=>f.properties.id===id);
    const data=prepareBuildingDetails({type:'FeatureCollection',features:[original]});
    const feature=data.features[0],p=feature.properties;
    assert.equal(feature.geometry,original.geometry);
    assert.equal(p.heightSource,'estimated');
    assert.equal(p.detailRoofHeight,original.properties.height);
    assert.equal(p.detailFlatShell,true,'the native flat cap must yield to the stepped shell');
    assert.match(describeBuildingArchitecture(p),description);
    const mesh=buildBuildingGeometry(data);
    assert.equal(mesh.facades.length,0,'all opaque tiers must survive the facade LOD threshold');
    const faces=triangles(mesh.roofs),deck=p.base+(p.height-p.base)*deckFraction;
    const ring=feature.geometry.coordinates[0].slice(0,-1).map(projectLocal);
    const horizontal=z=>faces.filter(({kind,corners})=>kind===9&&corners.every(v=>near(v[2],z))).map(t=>t.corners);
    assert.ok(horizontal(deck).length>=ring.length-2,'terraces need a complete podium roof');
    assert.equal(connectedRoofCount(horizontal(p.height)),upperBlocks);
    for(const tri of horizontal(deck)){
      const c=tri.reduce(([x,y],p)=>[x+p[0]/3,y+p[1]/3],[0,0]);
      assert.ok(pointInRing(c,ring),'the podium must leave the open notches between pavilion bars clear');
    }
    for(const {corners} of faces){
      for(const point of corners){
        assert.ok(point[2]<=p.height+.001&&point[2]>=-10);
        if(point[2]>deck+.001)assert.ok(pointInRing(point,ring),id+' raised exterior crossed its source footprint');
      }
      if(corners.every(p=>p[2]>deck+.001)){
        for(let i=0;i<3;i++){
          const a=corners[i],b=corners[(i+1)%3];
          for(const u of [.25,.5,.75])assert.ok(pointInRing([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],ring));
        }
      }
    }
    if(id==='way/891732466'){
      assert.ok(faces.some(t=>t.kind===97),'steel-framed upper glazing');
      const sill=deck+p.height*.09;
      assert.equal(faces.filter(t=>t.kind===2&&t.corners.every(v=>near(v[2],sill))).length,32,'all four projected blocks have a real underside around their supports');
    }
    if(id==='way/689417360'){
      assert.ok(faces.some(t=>t.kind===98),'pavilion-specific sunshade pattern');
      const blades=faces.filter(t=>t.kind===2&&t.tint[0]>.85&&t.corners.some(p=>p[2]>deck));
      assert.ok(blades.some(t=>t.corners.every(p=>near(p[2],t.corners[0][2]))),'projecting horizontal blades');
      assert.ok(blades.some(t=>t.corners.some(p=>p[2]-Math.min(...t.corners.map(v=>v[2]))>3)),'vertical fins have relief between deck and roof');
    }
  });
}
test('300 Pasteur and the separate connectors retain their own architecture and source height',()=>{
  const source=pinned.features.find(f=>f.properties.id==='relation/1753562');
  const data=prepareBuildingDetails({type:'FeatureCollection',features:[source]});
  assert.equal(data.features[0].properties.detailRoofHeight,10);
  const roofs=triangles(buildBuildingGeometry(data).roofs);
  assert.ok(roofs.filter(t=>t.kind===9).every(t=>t.corners.every(p=>near(p[2],10))));
  assert.ok(roofs.every(t=>t.kind<97));
  const unnamed=pinned.features.find(f=>f.properties.id==='way/784079435');
  const connector=prepareBuildingDetails({type:'FeatureCollection',features:[unnamed]});
  assert.ok(triangles(buildBuildingGeometry(connector).roofs).every(t=>t.kind<97));
});
