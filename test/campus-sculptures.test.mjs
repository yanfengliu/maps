import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateCampusSculptures,addCampusSculptures} from '../src/campus-sculptures.ts';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS,MAX_DETAIL_TRIANGLES} from '../src/building-geometry.ts';
import {pointInRing} from '../tools/data/fetch-stanford.mjs';

const read=name=>readFileSync(new URL('../public/data/'+name,import.meta.url));
const bytes=read('stanford-sculptures.geojson'),data=validateCampusSculptures(JSON.parse(bytes));
const provenance=JSON.parse(read('stanford-sculptures-provenance.json'));
const empty={type:'FeatureCollection',features:[]};
const sha=value=>createHash('sha256').update(value).digest('hex');
const pinned=[['node/5648594207',4,[-122.1699656,37.4280031]],['node/6477042804',1,[-122.1688001,37.4373687]]];

test('two curated works retain independently recorded mapped identities/coordinates and primary source provenance',()=>{
  assert.equal(sha(bytes),'751a0f69362573b0050989199c3713b277feb4c99fef900840838694f1dad700');
  assert.equal(provenance.outputs['stanford-sculptures.geojson'].sha256,sha(bytes));
  assert.equal(provenance.license,'ODbL 1.0');assert.equal(bytes.length,610);
  assert.deepEqual(provenance.sources,JSON.parse(read('stanford-provenance.json')).sources);
  const boundary=JSON.parse(read('stanford-campus.geojson')).features[0].geometry.coordinates[0];
  for(const [id,version,coordinate] of pinned){
    const feature=data.features.find(f=>f.properties.id===id),source=provenance.sourceNodes.find(n=>'node/'+n.id===id);
    assert.ok(source);assert.equal(source.version,version);assert.deepEqual(source.coordinate,coordinate);
    assert.equal(feature.properties.version,version);assert.deepEqual(feature.geometry.coordinates,coordinate);
    assert.ok(pointInRing(coordinate,boundary));
  }
  assert.equal(provenance.references.length,4);assert.ok(provenance.references.every(r=>r.url.includes('stanford.edu/')));
  assert.match(provenance.geometry,/modeled estimates/);assert.match(provenance.referenceUse,/not shipped/);
});

test('actual sculpture mesh distinguishes six separately supported bronze poses and a single winged marble memorial',()=>{
  const meshes=[];
  for(const feature of data.features){
    const triangles=[],counts=addCampusSculptures({triangle:(a,b,c,tint,kind,id,uv,normals)=>triangles.push({a,b,c,tint,kind,id,normals})},{type:'FeatureCollection',features:[feature]},()=>[0,0]);
    assert.equal(counts.works,1);assert.equal(counts.triangles,triangles.length);assert.ok(triangles.length>700&&triangles.length<3500);
    for(const t of triangles){
      assert.equal(t.id,-2,'sculptures may never use selected=-1');assert.equal(t.kind,12,'solid sculpture must not acquire facade windows or roof tiles');
      for(const p of[t.a,t.b,t.c]){assert.ok(p.every(Number.isFinite));assert.ok(p[2]>=0&&p[2]<3.5);assert.ok(Math.hypot(p[0],p[1])<4);}
      if(t.normals)for(const n of t.normals){assert.ok(n.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...n)-1)<0.00001);}
    }
    meshes.push({feature,counts,triangles});
  }
  const [burghers,angel]=meshes;
  assert.equal(burghers.counts.figures,6);assert.equal(angel.counts.figures,1);
  // Independent floor-plane centers expose a single copied group pedestal.
  const bases=burghers.triangles.filter(t=>[t.a,t.b,t.c].every(p=>p[2]===0));
  assert.equal(bases.length,12,'each of six separate closed plinths must have two underside triangles');
  const centers=bases.map(t=>[(t.a[0]+t.b[0]+t.c[0])/3,(t.a[1]+t.b[1]+t.c[1])/3]);
  const components=[];for(const p of centers){const group=components.find(points=>points.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<0.8));if(group)group.push(p);else components.push([p]);}
  assert.equal(components.length,6);
  const bronze=burghers.triangles[20].tint,marble=angel.triangles[20].tint;
  assert.ok(Math.max(...bronze)<0.5);assert.ok(Math.min(...marble)>0.7,'marble must stay pale rather than copying bronze');
  const highWing=angel.triangles.flatMap(t=>[t.a,t.b,t.c]).filter(p=>p[2]>3.2);
  assert.ok(highWing.some(p=>p[0]>0.5)&&highWing.some(p=>p[0]<-0.5),'the two folded wings must rise beyond both shoulders');
});

test('integrated building/environment/sculpture mesh preserves source data and 160k triangles / 24MiB / two buffers',()=>{
  const source=JSON.parse(read('stanford-buildings.geojson')),before=JSON.stringify(source);
  const g=buildBuildingGeometry(prepareBuildingDetails(source),JSON.parse(read('stanford-environment.geojson')),data);
  assert.equal(JSON.stringify(source),before);assert.equal(g.buildings,648);
  assert.equal(MAX_DETAIL_TRIANGLES,160000);assert.ok(g.triangles<MAX_DETAIL_TRIANGLES);assert.ok(g.bytes<24*1024*1024);
  assert.deepEqual(g.sculptures,{works:2,figures:7,triangles:3820});
  assert.equal(g.roofs.length+g.facades.length,g.triangles*VERTEX_FLOATS*3);
  assert.equal(sha(read('stanford-buildings.geojson')),'a27c564f8c7472bfddafd28e3328cffdf12acadb2f9854da1f1e429fd1d41d2f');
  const only=buildBuildingGeometry(empty,undefined,data);
  assert.deepEqual(only.sculptures,g.sculptures);assert.equal(only.triangles,3820);assert.equal(only.facades.length,0);
  for(const feature of data.features){const [x,y]=projectLocal(feature.geometry.coordinates);assert.ok(Math.hypot(x,y)<2000);}
});

test('invalid curated sculpture identities, duplicate models and out-of-campus inputs fail with recovery guidance',()=>{
  assert.throws(()=>validateCampusSculptures(empty),/two reviewed Stanford artworks.*Restore.*retry/);
  for(const mutate of [d=>d.features[0].geometry.coordinates=[0,0],d=>d.features[0].properties.model='generic-statue',d=>d.features[0].properties.version=NaN,d=>d.features[0].properties.artist='',d=>d.features[1].properties.model=d.features[0].properties.model,d=>d.features[1].properties.id=d.features[0].properties.id]){
    const bad=structuredClone(data);mutate(bad);assert.throws(()=>validateCampusSculptures(bad),/Campus sculpture.*invalid.*Restore.*retry/);
  }
});

test('worker validates sculpture HTTP/JSON/network failures and a valid retry produces both meshes',async()=>{
  const priorFetch=globalThis.fetch,priorSelf=globalThis.self,messages=[];
  globalThis.self={postMessage:message=>messages.push(message)};
  try{
    await import('../src/building-worker.ts');
    for(const mode of ['HTTP','JSON','network','valid']){
      const calls=[];messages.length=0;
      globalThis.fetch=async input=>{calls.push(input);if(input.endsWith('stanford-environment.geojson'))return new Response(JSON.stringify(empty));if(mode==='HTTP')return new Response('Missing',{status:503});if(mode==='JSON')return new Response('{');if(mode==='network')throw new Error('fixture network unavailable');return new Response(bytes);};
      await self.onmessage({data:empty});assert.equal(messages.length,1);assert.deepEqual(calls.sort(),['/data/stanford-environment.geojson','/data/stanford-sculptures.geojson']);
      if(mode==='valid'){assert.deepEqual(messages[0].geometry.sculptures,{works:2,figures:7,triangles:3820});assert.equal(messages[0].geometry.facades.length,0);}
      else assert.match(messages[0].error,mode==='HTTP'?/Campus sculpture.*HTTP 503.*stanford-sculptures.*retry/:mode==='JSON'?/Campus sculpture.*not valid JSON.*retry/:/Campus sculpture.*could not load.*network unavailable.*retry/);
    }
  }finally{globalThis.fetch=priorFetch;globalThis.self=priorSelf;}
});
