import test from 'node:test';
import assert from 'node:assert/strict';
import {createExpression, featureFilter} from '@maplibre/maplibre-gl-style-spec';
import {quadPickingLayer, BUILDING_PICK_LAYERS} from '../src/building-picking.ts';
import {createQuadArcadeVisibility} from '../src/quad-arcade-visibility.ts';
import {prepareBuildingDetails} from '../src/building-geometry.ts';
import {readFileSync} from 'node:fs';
import {STADIUM_SEATING_IDS} from '../src/stadium-architecture.ts';

test('open arcades and stadium stands retain full-height picking across native collapse, recovery and zoom changes',()=>{
 const layer=quadPickingLayer(),filter=featureFilter(layer.filter,'layers[0].filter'),paint=layer.paint;
 const height=createExpression(paint['fill-extrusion-height'],'layers[0].paint.fill-extrusion-height');
 assert.equal(height.result,'success');assert.equal(paint['fill-extrusion-opacity'],0,'picking must add no color or depth draw');
 assert.notEqual(layer.layout?.visibility,'none','invisible layout would disable MapLibre queries');
 assert.ok(BUILDING_PICK_LAYERS.includes(layer.id)&&BUILDING_PICK_LAYERS.includes('stanford-buildings'),'one delegated query includes the proxy and other campus buildings');
 const data=prepareBuildingDetails(JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))));
 let zoom=19,wall;
 const controller=createQuadArcadeVisibility(),map={getLayer:()=>true,getZoom:()=>zoom,getCanvas:()=>({dataset:{}}),setPaintProperty:(id,_key,value)=>{if(id==='stanford-buildings')wall=value;}};
 for(const [nextZoom,ready]of [[19,false],[19,true],[15,false],[19,true],[19,false]]){
  zoom=nextZoom;controller.sync(map,ready);
  const nativeHeight=createExpression(wall,'layers[1].paint.fill-extrusion-height');assert.equal(nativeHeight.result,'success');let count=0;
  for(const feature of data.features){
   const f={type:3,properties:feature.properties};
   if(!filter.filter({zoom},f))continue;
   count++;
   const pick=height.value.evaluate({zoom},f),native=nativeHeight.value.evaluate({zoom},f);
   assert.equal(pick,feature.properties.detailRoofHeight);
   if(STADIUM_SEATING_IDS.has(feature.properties.id))assert.ok(pick>=feature.properties.height,'the full seating envelope remains queryable');
   else assert.ok(pick>feature.properties.detailWallHeight,'the whole modeled roof silhouette remains queryable');
   if(ready&&zoom>=15.5)assert.ok(Math.abs(native-feature.properties.base-.02)<1e-6&&pick>6,'upper silhouettes stay selectable while the visible wall is lowered');
  }
  assert.equal(count,25,'scope is the Quad family and sixteen mapped stadium stands, with source holes preserved');
 }
});
