import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildChurchInterior} from '../src/church-interior.ts';
import {appendCampusSurfaces,VERTEX_FLOATS} from '../src/building-geometry.ts';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url)));

test('church cutaway preserves opaque campus paving independently of the optional ceiling',async()=>{
 const source=read('stanford-buildings.geojson'),surfaces=read('stanford-surfaces.geojson');
 const room=buildChurchInterior(source),withGround=appendCampusSurfaces(room,surfaces,'facades');
 assert.equal(withGround.roofs,room.roofs,'opaque campus paving must not enter the transparent ceiling batch');
 assert.equal(withGround.facadeTriangles-room.facadeTriangles,1363);
 assert.deepEqual(withGround.facades.subarray(0,room.facades.length),room.facades);
 for(let i=room.facades.length;i<withGround.facades.length;i+=VERTEX_FLOATS){
   assert.ok(withGround.facades[i+11]>=60&&withGround.facades[i+11]<=65);
   assert.equal(withGround.facades[i+12],-4,'paving must not receive selected-building highlighting');
 }
 const oldSelf=globalThis.self,oldFetch=globalThis.fetch,messages=[];
 try{
  globalThis.self={postMessage:value=>messages.push(value)};
  globalThis.fetch=async()=>new Response(JSON.stringify(surfaces));
  await import('../src/building-worker.ts');
  await self.onmessage({data:{data:source,interior:true}});
  assert.equal(messages.length,1);assert.equal(messages[0].error,undefined);
  assert.deepEqual(messages[0].geometry.surfaces,withGround.surfaces);
  assert.deepEqual(messages[0].geometry.roofs,room.roofs);
  assert.deepEqual(messages[0].geometry.facades,withGround.facades);
 }finally{globalThis.self=oldSelf;globalThis.fetch=oldFetch;}
});
