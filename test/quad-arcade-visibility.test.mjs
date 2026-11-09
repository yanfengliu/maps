import {OPEN_GARAGE_IDS} from '../src/garage-architecture.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import { createQuadArcadeVisibility } from '../src/quad-arcade-visibility.ts';
import { QUAD_WING_IDS } from '../src/quad-architecture.ts';
import { STADIUM_SEATING_IDS, STADIUM_OPEN_PART_IDS } from '../src/stadium-architecture.ts';

test('open arcades switch only the Quad family after upload, with full fallback on loss, zoom-out and style recreation',()=>{
  let zoom=19,layer=true,paint;
  const dataset={},writes=[];
  const map={setFilter(){},getLayer:()=>layer,getZoom:()=>zoom,getCanvas:()=>({dataset}),setPaintProperty:(id,_key,value)=>{if(id==='stanford-buildings'){paint=value;writes.push(value);}}};
  const controller=createQuadArcadeVisibility();
  const height=id=>{
    const expression=createExpression(paint,'layers[0].paint.fill-extrusion-height');
    assert.equal(expression.result,'success');
    return expression.value.evaluate({zoom},{properties:{id,base:0,detailWallHeight:6.2}});
  };
  for(const ready of [false,false])controller.sync(map,ready);
  assert.equal(writes.length,1);assert.equal(height('relation/35820'),6.2);
  controller.sync(map,true);
  assert.equal(height('relation/35820'),0.02);
  for(const id of QUAD_WING_IDS)assert.equal(height(id),0.02);
  assert.ok(height('relation/35820')<0.09,'native cap stays below the physical arcade floor, including selected colors');
  assert.equal(height('way/836474103'),6.2,'Memorial Church and unrelated buildings keep their native shells');
  assert.equal(dataset.campusDetailReady,'true');
  controller.sync(map,false);assert.equal(height('relation/35820'),6.2,'loss/failure restores the native wall');
  for(const id of QUAD_WING_IDS)assert.equal(height(id),6.2,'every wing also has a complete native fallback');
  controller.sync(map,true);assert.equal(height('relation/35820'),0.02);
  zoom=15.49;controller.sync(map,true);assert.equal(height('relation/35820'),6.2,'roof-only LOD still needs native walls');
  zoom=15.5;controller.sync(map,true);assert.equal(height('relation/35820'),0.02);
  layer=false;controller.sync(map,false);assert.equal(height('relation/35820'),0.02);
  layer=true;paint=['get','detailWallHeight'];controller.reset();controller.sync(map,true);
  assert.equal(height('relation/35820'),0.02,'recreated standard layers cannot fill the open arcades');
});


test('open garages, stadium walkway and seating replace native walls and caps only while detailed terraces are ready',()=>{
  let zoom=17.6;const paint=new Map(),map={setFilter(){},getLayer:()=>true,getZoom:()=>zoom,getCanvas:()=>({dataset:{}}),setPaintProperty:(id,key,value)=>paint.set(id+':'+key,value)};
  const controller=createQuadArcadeVisibility();
  const evaluate=(id,key,building,base)=>{const expression=createExpression(paint.get(id+':'+key),'layers[0].paint.'+key);assert.equal(expression.result,'success');return expression.value.evaluate({zoom},{properties:{id:building,base,detailWallHeight:28}});};
  for(const [nextZoom,ready]of [[17.6,false],[17.6,true],[14,true],[17.6,true],[17.6,false]]){
    zoom=nextZoom;controller.sync(map,ready);const detailed=ready&&zoom>=15.5;
    for(const id of [...STADIUM_SEATING_IDS,...OPEN_GARAGE_IDS,...STADIUM_OPEN_PART_IDS])for(const base of [0,14]){
      assert.equal(evaluate('stanford-buildings','fill-extrusion-height',id,base),detailed?base+.02:28);
      assert.equal(evaluate('stanford-roofs','fill-extrusion-base',id,base),detailed?base:28);
      assert.equal(evaluate('stanford-roofs','fill-extrusion-height',id,base),detailed?base+.05:28.05);
    }
    assert.equal(evaluate('stanford-roofs','fill-extrusion-base','church',0),28,'unrelated caps remain unchanged');
  }
  controller.reset();controller.sync(map,true);assert.equal(evaluate('stanford-roofs','fill-extrusion-base',[...STADIUM_SEATING_IDS][0],0),0);
});
