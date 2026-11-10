import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildChurchInterior} from '../src/church-interior.ts';
import {appendCampusSurfaces,appendCampusLandscape,appendStopSigns,VERTEX_FLOATS} from '../src/building-geometry.ts';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url)));

test('church cutaway preserves opaque campus paving independently of the optional ceiling',async()=>{
 const source=read('stanford-buildings.geojson'),surfaces=read('stanford-surfaces.geojson');
 const landscape=read('stanford-landscape.geojson');
 const room=buildChurchInterior(source),withGround=appendCampusLandscape(appendCampusSurfaces(room,surfaces,'facades'),landscape,'facades');
 assert.equal(withGround.roofs,room.roofs,'opaque campus paving must not enter the transparent ceiling batch');
 assert.equal(withGround.facadeTriangles-room.facadeTriangles,621+2399);
 assert.deepEqual(withGround.facades.subarray(0,room.facades.length),room.facades);
 for(let i=room.facades.length;i<withGround.facades.length;i+=VERTEX_FLOATS){
   assert.ok((withGround.facades[i+11]>=60&&withGround.facades[i+11]<=65)||(withGround.facades[i+11]>=80&&withGround.facades[i+11]<=84));
   assert.equal(withGround.facades[i+12],withGround.facades[i+11]>=80?-5:-4,'paving must not receive selected-building highlighting');
 }
 const oldSelf=globalThis.self,oldFetch=globalThis.fetch,messages=[];
 try{
  globalThis.self={postMessage:value=>messages.push(value)};
  globalThis.fetch=async url=>new Response(JSON.stringify(read(String(url).split('/').at(-1))));
  await import('../src/building-worker.ts');
  await self.onmessage({data:{data:source,interior:true}});
  assert.equal(messages.length,1);assert.equal(messages[0].error,undefined);
  assert.deepEqual(messages[0].geometry.surfaces,withGround.surfaces);
  assert.deepEqual(messages[0].geometry.roofs,room.roofs);
  const manifest=read('stanford-surfaces-roads-manifest.json');
  const traffic={controls:read(manifest.controls.file),roads:{type:'FeatureCollection',features:manifest.files.flatMap(part=>read(part.file).features)}};
  const withSigns=appendStopSigns(withGround,traffic,'facades');
  assert.deepEqual(messages[0].geometry.facades,withSigns.facades);
  assert.deepEqual(messages[0].geometry.terrainAnchors,withSigns.terrainAnchors);
  assert.equal(messages[0].geometry.traffic.stops,296);
 }finally{globalThis.self=oldSelf;globalThis.fetch=oldFetch;}
});
