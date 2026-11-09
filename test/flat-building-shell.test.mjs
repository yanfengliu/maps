import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {featureFilter} from '@maplibre/maplibre-gl-style-spec';
import {prepareBuildingDetails,buildBuildingGeometry,projectLocal,VERTEX_FLOATS as S} from '../src/building-geometry.ts';
import {createQuadArcadeVisibility} from '../src/quad-arcade-visibility.ts';
import {quadPickingLayer} from '../src/building-picking.ts';
import {CHURCH_ID} from '../src/church-interior.ts';

const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const prepared=prepareBuildingDetails(source),geometry=buildBuildingGeometry(prepared);
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const accepts=(filter,properties)=>!filter||featureFilter(filter,'layers[0].filter').filter({zoom:18},{type:3,properties});

test('every replacement flat shell closes all source and courtyard edges, including tiny returns, without moving the footprint',()=>{
 let buildings=0,edges=0,short=0;
 for(const [index,feature] of prepared.features.entries()){
  if(!feature.properties.detailFlatShell)continue;
  buildings++;const p=feature.properties,mesh=geometry.roofs,triangles=[];
  assert.equal(feature.geometry,source.features[index].geometry);
  assert.equal(p.base,source.features[index].properties.base);
  assert.equal(p.height,source.features[index].properties.height);
  for(let i=0;i<mesh.length;i+=S*3)if(mesh[i+12]===index)triangles.push([0,1,2].map(j=>[...mesh.slice(i+j*S,i+j*S+3)]));
  for(const ring of polygons(feature.geometry).flat())for(let i=1;i<ring.length;i++){
   const a=projectLocal(ring[i-1]),b=projectLocal(ring[i]);edges++;
   const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<=1.8)short++;
   const at=(v,q,z)=>Math.hypot(v[0]-q[0],v[1]-q[1])<.001&&Math.abs(v[2]-z)<.0001;
   const covers=(z0,z1)=>{
    const corners=[[a,z0],[b,z0],[b,z1],[a,z1]];
    const faces=triangles.filter(t=>t.every(v=>corners.some(([q,z])=>at(v,q,z))));
    assert.equal(faces.length,2,`${p.id} edge ${i}: exactly one opaque face from ${z0} to ${z1}`);
    for(const [q,z] of corners)assert.ok(faces.flat().some(v=>at(v,q,z)),`${p.id} unjoined corner`);
   };
   covers(p.base,p.detailRoofHeight);
   if(p.base===0)covers(-10,0);
  }
 }
 assert.equal(buildings,85);assert.equal(edges,924);assert.equal(short,73);
});

test('native flat caps have a single owner across both LOD thresholds, readiness loss, style recreation and church mode',()=>{
 let zoom=18,exists=true;const filters=new Map(),dataset={};
 const map={getLayer:()=>exists,getZoom:()=>zoom,getCanvas:()=>({dataset}),setFilter:(id,f)=>filters.set(id,f),setPaintProperty(){}};
 const controller=createQuadArcadeVisibility();
 const hospital=prepared.features.find(f=>f.properties.id==='relation/1753562').properties;
 const church=prepared.features.find(f=>f.properties.id===CHURCH_ID).properties;
 const other={id:'unrelated',detailFlatShell:false};
 for(const [z,ready,interior] of [[13.99,true,false],[14,true,false],[15.49,true,false],[15.5,true,false],[18,false,false],[18,true,false],[18,true,true],[18,true,false],[13.99,true,false]]){
  zoom=z;controller.sync(map,ready,interior);
  for(const id of ['stanford-buildings','stanford-roofs']){
   assert.equal(accepts(filters.get(id),hospital),!(z>=14&&ready&&!interior),'the cap must be absent, not just recolored or lowered');
   assert.equal(accepts(filters.get(id),church),!interior);
   assert.ok(accepts(filters.get(id),other));
  }
 }
 exists=false;controller.sync(map,false);exists=true;filters.clear();controller.reset();zoom=18;controller.sync(map,true);
 assert.equal(accepts(filters.get('stanford-roofs'),hospital),false);
 assert.equal(dataset.flatShellReady,'true');
});

test('all replacement flat roofs remain queryable through full-height transparent volumes, including their courtyards',()=>{
 const layer=quadPickingLayer();assert.equal(layer.paint['fill-extrusion-opacity'],0);
 for(const feature of prepared.features.filter(f=>f.properties.detailFlatShell))assert.ok(accepts(layer.filter,feature.properties),feature.properties.id);
 assert.equal(layer.source,'stanford','proxy queries original source rings, not a rectangle over courtyard holes');
 assert.deepEqual(layer.paint['fill-extrusion-height'],['get','detailRoofHeight']);
});

test('short low walls and elevated flat parts retain a closed shell without adding ground supports to elevated parts',()=>{
 const fixture=structuredClone(source.features.find(f=>f.properties.id==='relation/1753562'));
 fixture.properties={id:'fixture/low-flat',base:3,height:3.5,building:'hospital'};
 fixture.geometry={type:'Polygon',coordinates:[[[-122.17,37.427],[-122.169999,37.427],[-122.169999,37.427001],[-122.17,37.427001],[-122.17,37.427]]]};
 const data=prepareBuildingDetails({type:'FeatureCollection',features:[fixture]}),mesh=buildBuildingGeometry(data).roofs;
 const heights=new Set();let wallTriangles=0;
 for(let i=0;i<mesh.length;i+=S*3){const h=[mesh[i+2],mesh[i+S+2],mesh[i+2*S+2]];h.forEach(z=>heights.add(z));if(h.includes(3)&&h.includes(3.5))wallTriangles++;}
 assert.equal(wallTriangles,8);assert.ok(Math.min(...heights)>=3);assert.ok(Math.max(...heights)<=3.5);
});
