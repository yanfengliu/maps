import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareBuildingDetails, buildBuildingGeometry, projectLocal, VERTEX_FLOATS } from '../src/building-geometry.ts';
import { PASTEUR_300_ID, PASTEUR_POD_TOP, PASTEUR_POD_LAYER, PASTEUR_TIERS, pasteurFallbackData } from '../src/pasteur-pods.ts';
import { hospitalSurfacePicker } from '../src/hospital-picking.ts';
import { attachPasteurPods } from '../src/pasteur-pods-layer.ts';
import { createQuadArcadeVisibility } from '../src/quad-arcade-visibility.ts';
import { BUILDING_PICK_LAYERS } from '../src/building-picking.ts';
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
test('300 Pasteur raises only the three referenced west wings, retaining its mapped roof, both courtyards and all source heights',()=>{
  const source=pinned.features.find(f=>f.properties.id==='relation/1753562');
  const data=prepareBuildingDetails({type:'FeatureCollection',features:[source]});
  assert.equal(data.features[0].properties.detailRoofHeight,10);
  const roofs=triangles(buildBuildingGeometry(data).roofs);
  assert.ok(roofs.filter(t=>t.kind===9).every(t=>t.corners.every(p=>near(p[2],10))));
  assert.equal(data.features[0].properties.height,10);
  assert.equal(data.features[0].properties.detailPodMaximum,77.5*.3048);
  assert.match(describeBuildingArchitecture(data.features[0].properties),/mapped.*10 m.*23.6 m/);
  const exterior=data.features[0].geometry.coordinates.map(ring=>ring.map(projectLocal));
  const raised=roofs.filter(t=>t.corners.some(v=>v[2]>10.001));
  const tops=raised.filter(t=>t.corners.every(v=>near(v[2],PASTEUR_POD_TOP))).map(t=>t.corners);
  assert.equal(connectedRoofCount(tops),3,'three independently bounded crowns');
  const fallbacks=pasteurFallbackData(source.properties).features;
  assert.equal(fallbacks.length,6);
  assert.ok(BUILDING_PICK_LAYERS.includes(PASTEUR_POD_LAYER));
  for(const [i,feature] of fallbacks.entries()){
    assert.equal(feature.properties.id,source.properties.id);
    const tier=PASTEUR_TIERS[i],outline=feature.geometry.coordinates[0].slice(0,-1).map(projectLocal);
    const isPoint=(v,p,z)=>near(v[0],p[0])&&near(v[1],p[1])&&near(v[2],z);
    // Every raised wall, including its lower corners, must meet the very same
    // native picking/fallback outline. No full-height box over the complex.
    for(const [j,p] of outline.entries()){
      const q=outline[(j+1)%outline.length];
      for(const v of [p,q]){
        for(const z of [tier.bottom,tier.top])
          assert.ok(raised.some(t=>t.corners.some(corner=>isPoint(corner,v,z))));
      }
      for(let sample=0;sample<=32;sample++){
        const u=sample/32,x=[p[0]+u*(q[0]-p[0]),p[1]+u*(q[1]-p[1])];
        assert.ok(pointInRing(x,exterior[0])&&exterior.slice(1).every(hole=>!pointInRing(x,hole)));
      }
    }
  }
  const allowed=PASTEUR_TIERS.flatMap(tier=>tier.outline.map(p=>[projectLocal(p),tier.bottom,tier.top]));
  for(const {corners} of raised)for(const [x,y,z] of corners){
    assert.ok(allowed.some(([[ax,ay],lo,hi])=>near(ax,x)&&near(ay,y)&&(near(lo,z)||near(hi,z))),'a raised vertex has no corresponding native tier');
  }
  const unnamed=pinned.features.find(f=>f.properties.id==='way/784079435');
  const connector=prepareBuildingDetails({type:'FeatureCollection',features:[unnamed]});
  assert.ok(triangles(buildBuildingGeometry(connector).roofs).every(t=>t.kind<97));
});

test('the bounded pod layer supplies fallback on reload and remains queryable across LOD and church mode',()=>{
  const source=pinned.features.find(f=>f.properties.id===PASTEUR_300_ID);
  const sources=new Map(),layers=new Map([['stanford-buildings',{}],['stanford-roofs',{}]]);
  let zoom=17;
  const map={getZoom:()=>zoom,getCanvas:()=>({dataset:{}}),getSource:id=>sources.get(id),getLayer:id=>layers.get(id),
    addSource:(id,s)=>sources.set(id,{data:s.data,setData(data){this.data=data;}}),addLayer:l=>layers.set(l.id,l),
    setFilter(){},setPaintProperty:(id,key,value)=>{const layer=layers.get(id);layer.paint??={};layer.paint[key]=value;}};
  const data={features:[source]};
  const controller=createQuadArcadeVisibility();
  for(const restore of [false,true]){
    if(restore){sources.clear();layers.delete(PASTEUR_POD_LAYER);controller.reset();}
    attachPasteurPods(map,data);attachPasteurPods(map,data);
    assert.equal(sources.size,1);
    const layer=layers.get(PASTEUR_POD_LAYER);
    assert.equal(layer.layout?.visibility,undefined);
    assert.deepEqual(layer.paint['fill-extrusion-base'],['get','tierBase']);
    assert.deepEqual(layer.paint['fill-extrusion-height'],['get','tierTop']);
    assert.equal(sources.get(PASTEUR_POD_LAYER).data.features.length,6);
    for(const [level,ready,interior,opacity] of [[13.8,true,false,1],[14,true,false,0],[17,false,false,1],[17,true,false,0],[17,true,true,1],[17,true,false,0]]){
      zoom=level;controller.sync(map,ready,interior);
      assert.equal(layer.paint['fill-extrusion-opacity'],opacity);
    }
  }
  attachPasteurPods(map,{features:[]});
  assert.equal(sources.get(PASTEUR_POD_LAYER).data.features.length,0);
});


for(const [id,deckFraction] of [...entries,[PASTEUR_300_ID,1]]){
  test(id+' uses its real raised surfaces for selection and leaves air above its podium clear',()=>{
    const source=pinned.features.find(f=>f.properties.id===id);
    const data=prepareBuildingDetails({type:'FeatureCollection',features:[source]});
    const mesh=buildBuildingGeometry(data).roofs,faces=triangles(mesh),pick=hospitalSurfacePicker(data,mesh);
    // Side elevation with real campus coordinates, viewing along the y axis.
    const matrix=new Float32Array(16);matrix[0]=.0008;matrix[9]=.02;matrix[6]=.0002;matrix[15]=1;
    const deck=source.properties.height*deckFraction,datum=16;
    const vertices=faces.flatMap(f=>f.corners),span=points=>[Math.min(...points.map(v=>v[0])),Math.max(...points.map(v=>v[0]))];
    const [min,max]=span(vertices),[minUpper,maxUpper]=span(vertices.filter(v=>v[2]>deck+.1));
    const airX=minUpper-min>max-maxUpper?(min+minUpper)/2:(max+maxUpper)/2;
    assert.ok(airX<minUpper||airX>maxUpper);
    const sample=(x,z,terrain=datum)=>pick([x*.0008,(terrain+z)*.02],matrix,()=>datum,()=>datum);
    const z=deck+1;
    assert.equal(sample(airX,z),null,'visible background between the low roof and the old full-height proxy');
    assert.equal(sample(airX,deck/2),id,'podium underneath remains selectable');
    const upperWall=faces.find(({corners})=>corners.every(v=>v[2]>=deck-.001)&&Math.max(...corners.map(v=>v[2]))-Math.min(...corners.map(v=>v[2]))>1&&Math.abs((corners[1][0]-corners[0][0])*(corners[2][2]-corners[0][2])-(corners[2][0]-corners[0][0])*(corners[1][2]-corners[0][2]))>1);
    assert.ok(upperWall);
    const center=upperWall.corners.reduce(([x,z],p)=>[x+p[0]/3,z+p[2]/3],[0,0]);
    assert.equal(sample(...center),id,'raised wing remains selectable');
    assert.equal(sample(...center,datum+30),null,'a different terrain datum must not match');
    const paint=new Map(),visibility=createQuadArcadeVisibility();
    const map={getLayer:()=>true,getZoom:()=>18,getCanvas:()=>({dataset:{}}),setFilter(){},setPaintProperty:(layer,key,value)=>paint.set(layer+key,value)};
    for(const ready of [false,true,false]){
      visibility.sync(map,ready);
      const height=paint.get('stanford-building-pickingfill-extrusion-height');
      assert.deepEqual(height,ready?['coalesce',['get','detailPodiumHeight'],['get','detailRoofHeight']]:['get','detailRoofHeight']);
    }
    const p=data.features[0].properties;
    assert.ok(near(p.detailPodiumHeight??p.detailRoofHeight,deck));
  });
}


test('overlapping hospital and neighbor surfaces are selected in actual front-to-back order',()=>{
  const names=['way/891732466','way/689417360','way/727171866','way/109151789','way/232841905','way/757988111','way/784079435'];
  const data=prepareBuildingDetails({type:'FeatureCollection',features:pinned.features.filter(f=>names.includes(f.properties.id))});
  const geometry=buildBuildingGeometry(data),pick=hospitalSurfacePicker(data,geometry.roofs,geometry.facades);
  // Fixed 1440 × 920 perspective matrices, 58° pitch at zoom 18. The
  // numerical camera is independent of the production render matrix builder.
  const cameras={
    stanfordReverse:new Float32Array([-1.6923161745071411, 0.7463460564613342, 0.39821410179138184, 0.3981344699859619, -0.8998205065727234, -1.4036728143692017, -0.7489318251609802, -0.7487820386886597, 0, 2.5441441535949707, -0.5300252437591553, -0.5299192667007446, -408.3802490234375, 1550.671142578125, 1152.63037109375, 1154.399658203125]),
    mainEast:new Float32Array([0.8998205065727234, 1.4036728143692017, 0.7489318251609802, 0.7487820386886597, -1.6923161745071411, 0.7463460564613342, 0.39821410179138184, 0.3981344699859619, 0, 2.5441441535949707, -0.5300252437591553, -0.5299192667007446, 1915.4498291015625, -190.53604125976562, 223.6066436767578, 225.5617218017578]),
    mainWest:new Float32Array([-0.8998205065727234, -1.4036728143692017, -0.7489318251609802, -0.7487820386886597, 1.6923161745071411, -0.7463460564613342, -0.39821410179138184, -0.3981344699859619, 0, 2.5441441535949707, -0.5300252437591553, -0.5299192667007446, -1915.4498291015625, 190.53604125976562, 426.92822265625, 428.8426513671875]),
    stanfordFront:new Float32Array([1.6923161745071411, -0.7463460564613342, -0.39821410179138184, -0.3981344699859619, 0.8998205065727234, 1.4036728143692017, 0.7489318251609802, 0.7487820386886597, 0, 2.5441441535949707, -0.5300252437591553, -0.5299192667007446, 408.3802490234375, -1550.671142578125, -502.0955505371094, -499.9953308105469]),
  };
  const candidate=id=>({...data.features.find(f=>f.properties.id===id),layer:{id:'stanford-building-picking',type:'fill-extrusion',paint:{'fill-extrusion-opacity':0}}});
  const samples=[
    [names[0],names[2],cameras.stanfordReverse,804.411875,410.275081,names[0]],
    [names[1],names[3],cameras.mainEast,906.106207,360.08356,names[1]],
    [names[1],names[4],cameras.mainWest,968.289912,395.048867,names[1]],
    [names[0],names[5],cameras.stanfordFront,904,604,names[5]],
    [names[1],names[6],cameras.mainEast,920,556,names[6]],
  ];
  for(const [hospital,neighbor,camera,x,y,visible] of samples){
    const screen=[x/720-1,1-y/460];
    assert.equal(pick(screen,camera,()=>0,()=>0),hospital,'the point is on a hospital triangle');
    for(const ids of [[neighbor,hospital],[hospital,neighbor]]){
      assert.equal(pick(screen,camera,()=>0,()=>0,ids.map(candidate)),visible);
    }
  }
  // At roof-only LOD an opaque native wall/cap can cover a custom surface.
  // Only the click's evaluated native extrusion should enter the comparison.
  const hospital=data.features.find(f=>f.properties.id===names[0]),native={...hospital,properties:{id:'native-only'}};
  const matrix=new Float32Array(16);matrix[0]=matrix[5]=.0004;matrix[10]=-.015;matrix[15]=1;
  const center=projectLocal([-122.177,37.4345833]).map(v=>v*.0004);
  for(const [height,visible] of [[30,'native-only'],[1,names[0]]]){
    const hit={...native,layer:{id:'stanford-buildings',type:'fill-extrusion',paint:{'fill-extrusion-base':0,'fill-extrusion-height':height}}};
    assert.equal(pick(center,matrix,()=>0,()=>0,[hit],false),visible);
    assert.equal(pick(center,matrix,()=>0,()=>0,[{...hit,layer:{...hit.layer,id:'stanford-building-picking'}}],false),names[0]);
  }
});
