import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import { createQuadArcadeVisibility } from '../src/quad-arcade-visibility.ts';

test('open arcades switch only their parent wall after upload, with full fallback on loss, zoom-out and style recreation',()=>{
  let zoom=19,layer=true,paint;
  const dataset={},writes=[];
  const map={getLayer:()=>layer,getZoom:()=>zoom,getCanvas:()=>({dataset}),setPaintProperty:(_id,_key,value)=>{paint=value;writes.push(value);}};
  const controller=createQuadArcadeVisibility();
  const height=id=>{
    const expression=createExpression(paint,'layers[0].paint.fill-extrusion-height');
    assert.equal(expression.result,'success');
    return expression.value.evaluate({zoom},{properties:{id,base:0,detailWallHeight:6.2}});
  };
  for(const ready of [false,false])controller.sync(map,ready);
  assert.equal(writes.length,1);assert.equal(height('relation/35820'),6.2);
  controller.sync(map,true);
  assert.equal(height('relation/35820'),0.1);assert.equal(height('way/836474099'),6.2);
  assert.equal(dataset.campusDetailReady,'true');
  controller.sync(map,false);assert.equal(height('relation/35820'),6.2,'loss/failure restores the native wall');
  controller.sync(map,true);assert.equal(height('relation/35820'),0.1);
  zoom=15.49;controller.sync(map,true);assert.equal(height('relation/35820'),6.2,'roof-only LOD still needs native walls');
  zoom=15.5;controller.sync(map,true);assert.equal(height('relation/35820'),0.1);
  layer=false;controller.sync(map,false);assert.equal(height('relation/35820'),0.1);
  layer=true;paint=['get','detailWallHeight'];controller.reset();controller.sync(map,true);
  assert.equal(height('relation/35820'),0.1,'recreated standard layers cannot fill the open arcades');
});
