import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {stripTypeScriptTypes} from 'node:module';
import {validateStyleMin,createExpression,createPropertyExpression,latest} from '@maplibre/maplibre-gl-style-spec';
import {CampusRoadLayer,campusRoadLayers,roadMetreWidth,CAMPUS_ROAD_LATITUDE,CAMPUS_ROAD_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,validateCampusRoadManifest,validateCampusRoadPart} from '../src/campus-road-layer.ts';
import {CAMPUS_TRAFFIC_SOURCE} from '../src/campus-traffic.ts';

const point=([x,y])=>[-122.17+x/90000,37.43+y/111000];
const props=(id,kind='street')=>({id,version:1,kind,modeledSurface:'asphalt',surfaceEvidence:'osm-tag',modeledWidth:4,widthSource:'class-estimate'});
const line=(points,id='way/1',extra={})=>({type:'Feature',properties:{...props(id),sourceNodeIds:points.map((_,i)=>String(Number(id.slice(4))*100+i)),...extra},geometry:{type:'LineString',coordinates:points.map(point)}});
const collection=(...features)=>({type:'FeatureCollection',features});
const plaza=collection({type:'Feature',properties:{...props('derived/main-quad-paving','plaza'),modeledSurface:'pavers'},geometry:{type:'Polygon',coordinates:[[[0,0],[20,0],[20,20],[0,20],[0,0]],[[5,5],[7,5],[7,7],[5,7],[5,5]]].map(r=>r.map(point))}});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const widths=[.8,2.4,4.2,7.4,20];
const widthGroups=values=>['unknown','pavers','concrete','asphalt'].flatMap(material=>values.map(width=>({material,width})));
function bundle(features=[line([[0,0],[10,0],[10,10]])]){
  const controls=Buffer.from(JSON.stringify(collection(...['stop','traffic_signals'].map((controlType,i)=>({type:'Feature',properties:{id:`node/${i+1}`,version:1,kind:'traffic-control',controlType,placement:'road-control-point',physicalPoleVerified:false,directionStatus:i?'unknown':'source-tagged'},geometry:{type:'Point',coordinates:point([i,0])}})))));
  const part=Buffer.from(JSON.stringify(collection(...features))),manifest={schemaVersion:1,files:[{file:'stanford-surfaces-roads-0.geojson',features:features.length,bytes:part.length,sha256:hash(part)}],counts:{streets:features.filter(f=>f.geometry.type==='LineString').length,roadAreas:features.filter(f=>f.geometry.type==='Polygon').length,streetSegments:features.filter(f=>f.geometry.type==='LineString').reduce((n,f)=>n+f.geometry.coordinates.length-1,0)},bounds:[-122.18,37.42,-122.16,37.44],campusBoundary:'stanford-campus.geojson',controls:{file:'stanford-surfaces-controls.geojson',bytes:controls.length,sha256:hash(controls),counts:{stop:1,traffic_signals:1,directionUnknown:1}}};
  return {manifest,files:new Map([['stanford-surfaces-roads-manifest.json',Buffer.from(JSON.stringify(manifest))],['stanford-surfaces-roads-0.geojson',part],['stanford-surfaces.geojson',Buffer.from(JSON.stringify(plaza))],['stanford-surfaces-controls.geojson',controls]])};
}
function fakeMap(loaded=true){
  const sources=new Map(),layers=new Map([['foreign-layer',{id:'foreign-layer'}]]),events=new Map(),ready=new Set(),calls={sources:0,layers:0},images=new Map();
  return {sources,layers,events,ready,calls,loaded,images,
    on(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},off(type,fn){events.get(type)?.delete(fn);},emit(type,event={}){for(const fn of [...events.get(type)??[]])fn(event);},
    isStyleLoaded(){return this.loaded;},getSource(id){return sources.get(id);},addSource(id,source){assert.ok(!sources.has(id));sources.set(id,source);calls.sources++;},removeSource(id){sources.delete(id);ready.delete(id);},isSourceLoaded(id){return ready.has(id);},
    getLayer(id){return layers.get(id);},addLayer(layer,before){if(before)assert.ok(layers.has(before));assert.ok(!layers.has(layer.id));layers.set(layer.id,layer);calls.layers++;},removeLayer(id){layers.delete(id);},
    hasImage(id){return images.has(id);},addImage(id,image){images.set(id,image);},removeImage(id){images.delete(id);},
  };
}
const loader=files=>async url=>new Response(files.get(String(url).split('/').at(-1)),{headers:{'content-type':'application/json'}});
async function settled(layer){for(let i=0;i<200&&!layer.stats.dataReady&&!layer.stats.error;i++)await new Promise(r=>setTimeout(r,1));assert.ok(layer.stats.dataReady||layer.stats.error,'road loader did not settle');}
function ready(map){for(const id of [CAMPUS_ROAD_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,CAMPUS_TRAFFIC_SOURCE]){map.ready.add(id);map.emit('sourcedata',{sourceId:id});}}

test('native road styles validate, retain round joins/caps and keep physical widths within the campus latitude bound',()=>{
  const layers=campusRoadLayers(widthGroups(widths)),empty=collection();
  assert.deepEqual(validateStyleMin({version:8,sources:{[CAMPUS_ROAD_SOURCE]:{type:'geojson',data:empty},[CAMPUS_ROAD_PLAZA_SOURCE]:{type:'geojson',data:empty}},layers}).map(e=>e.message),[]);
  for(const latitude of [37.414,37.43,37.444])for(const width of widths)for(const zoom of [13,15.5,18,21]){
    const compiled=createExpression(roadMetreWidth(width),'layers[0].paint.line-width');assert.equal(compiled.result,'success');
    const scale=512/(40075016.68557849*Math.cos(latitude*Math.PI/180)),actual=compiled.value.evaluate({zoom},{properties:{modeledWidth:width,roadPixelsPerMetreZ0:scale}});
    assert.ok(Math.abs(actual/(width*scale*2**zoom)-1)<.0003,'fixed campus latitude must remain within 0.03% of the physical width');
  }
  for(const layer of layers.filter(l=>l.type==='line')){
    assert.equal(layer.layout['line-join'],'round');assert.equal(layer.layout['line-cap'],'round');assert.equal(layer.layout['line-round-limit'],1,'even shallow junctions must not revert to pointed miters');
    assert.equal(layer.paint['line-opacity'],1);assert.equal(layer.paint['line-offset'],undefined);assert.equal(layer.paint['line-dasharray'],undefined,'lane paint requires its separate evidence');
  }
  assert.equal(layers.at(-1).id,'campus-road-planting-mask','the eight mapped islands must remain above all route surfaces');
});

test('road inputs reject malformed source identities, widths, grade and shard metadata without arbitrary coverage truncation',()=>{
  const {manifest}=bundle();assert.deepEqual(validateCampusRoadManifest(manifest),manifest);
  for(const alter of [m=>m.files.push(m.files[0]),m=>m.files[0].file='../elsewhere.json',m=>m.files[0].sha256='bad',m=>m.counts.streets=99]){const m=structuredClone(manifest);alter(m);assert.throws(()=>validateCampusRoadManifest(m),/Campus roads/);}
  const valid=collection(line([[0,0],[10,0]]));assert.strictEqual(validateCampusRoadPart(valid,manifest.bounds),valid);
  for(const alter of [f=>f.properties.modeledWidth=0,f=>f.properties.sourceNodeIds.pop(),f=>f.properties.layer='1',f=>f.properties.bridge='yes',f=>f.properties.tunnel='yes',f=>f.properties.indoor='yes',f=>f.geometry.coordinates[0]=[-123,37],f=>f.properties.surfaceEvidence='unverified']){const f=structuredClone(valid.features[0]);alter(f);assert.throws(()=>validateCampusRoadPart(collection(f),manifest.bounds),/Campus roads/);}
  assert.doesNotThrow(()=>validateCampusRoadPart(collection(line([[0,0],[10,0]],'way/2',{tunnel:'building_passage',layer:'0',covered:'yes'})),manifest.bounds));
});

test('local road readiness waits for road, plaza and control sources but not remote tiles, preserving exact data and a continuous Quad mask',async()=>{
  const source=line([[0,0],[10,0],[10,10]]),before=JSON.stringify(source),{files}=bundle([source]),map=fakeMap(false),changes=[];
  const owner=new CampusRoadLayer({fetcher:loader(files),manifestUrl:'/pages/data/stanford-surfaces-roads-manifest.json',plazaUrl:'/pages/data/stanford-surfaces.geojson',onChange:s=>changes.push(s)});
  owner.attach(map,'foreign-layer');map.emit('style.load');await settled(owner);
  assert.equal(owner.stats.dataReady,true);assert.equal(owner.stats.ready,false);assert.equal(map.loaded,false,'unrelated regional readiness stays false');
  const rendered=map.sources.get(CAMPUS_ROAD_SOURCE);assert.equal(rendered.tolerance,0);assert.deepEqual(rendered.data.features[0].geometry,source.geometry);assert.equal(JSON.stringify(source),before);
  assert.deepEqual(rendered.data.features[0],{...source,properties:{...source.properties,renderSurface:'asphalt',renderSurfaceEvidence:'osm-tag',renderSurfaceSources:[]}},'rendering retains every source field and adds separately named display evidence');
  const masks=map.sources.get(CAMPUS_ROAD_PLAZA_SOURCE).data.features;assert.equal(masks.length,2);assert.deepEqual(masks[0].geometry,plaza.features[0].geometry);assert.deepEqual(masks[1].geometry.coordinates,[plaza.features[0].geometry.coordinates[1]]);
  map.ready.add(CAMPUS_ROAD_SOURCE);map.emit('sourcedata',{sourceId:CAMPUS_ROAD_SOURCE});assert.equal(owner.stats.ready,false);
  ready(map);assert.equal(owner.stats.ready,true);assert.ok(Object.isFrozen(owner.stats));assert.ok(changes.some(s=>s.ready));
  assert.equal(owner.stats.stops,1);assert.equal(owner.stats.signals,1);assert.equal(map.images.size,2);
  owner.destroy();assert.equal(map.sources.size,0);assert.equal(map.images.size,0);assert.deepEqual([...map.layers.keys()],['foreign-layer']);assert.ok([...map.events.values()].every(s=>s.size===0));
});

test('discarded covering tiles complete local readiness before regional idle, with final-frame fallback and owned listener cleanup',async()=>{
 const {files}=bundle(),map=fakeMap(false),owner=new CampusRoadLayer({fetcher:loader(files)});
 owner.attach(map);map.emit('style.load');await settled(owner);assert.equal(owner.stats.ready,false);
 // Native terrain removes obsolete loading tiles after the last data event;
 // their sourcedataabort is the only source event announcing this transition.
 for(const id of [CAMPUS_ROAD_SOURCE,CAMPUS_ROAD_PLAZA_SOURCE,CAMPUS_TRAFFIC_SOURCE])map.ready.add(id);
 map.emit('sourcedataabort',{sourceId:'openmaptiles'});assert.equal(owner.stats.ready,false,'unrelated remote cancellation must not drive the local observer');
 map.emit('sourcedataabort',{sourceId:CAMPUS_ROAD_SOURCE});assert.equal(owner.stats.ready,true);
 assert.equal(map.loaded,false,'local roads become ready while unrelated regional tiles still load, before map idle');
 map.ready.delete(CAMPUS_ROAD_PLAZA_SOURCE);map.emit('sourcedata',{sourceId:CAMPUS_ROAD_PLAZA_SOURCE});assert.equal(owner.stats.ready,false);
 map.emit('idle');assert.equal(owner.stats.ready,false,'idle alone cannot substitute for actual local source completion');
 map.ready.add(CAMPUS_ROAD_PLAZA_SOURCE);map.emit('idle');assert.equal(owner.stats.ready,true,'final-frame source cleanup gets a fallback readiness check');
 owner.attach(map);assert.equal(map.events.get('sourcedataabort').size,1);assert.equal(map.events.get('idle').size,1);
 owner.destroy();assert.equal(map.events.get('sourcedataabort').size,0);assert.equal(map.events.get('idle').size,0);
 map.emit('idle');map.emit('sourcedataabort',{sourceId:CAMPUS_ROAD_SOURCE});assert.equal(owner.stats.ready,false,'detached callbacks cannot resurrect readiness');
});

test('source-specific failure, HTTP/JSON/hash errors have a working retry and cannot leave partial layers',async()=>{
  for(const mode of ['HTTP','JSON','hash']){
    const {files}=bundle(),map=fakeMap();let broken=true;
    const fetcher=async url=>{
      const file=String(url).split('/').at(-1);if(broken&&file==='stanford-surfaces-roads-0.geojson')return mode==='HTTP'?new Response('missing',{status:503}):mode==='JSON'?new Response('{',{headers:{'content-type':'application/json'}}):new Response('{}',{headers:{'content-type':'application/json'}});
      return loader(files)(url);
    };
    const owner=new CampusRoadLayer({fetcher});owner.attach(map);await settled(owner);assert.ok(owner.stats.error);assert.equal(map.sources.size,0);
    broken=false;owner.retry();await settled(owner);ready(map);assert.equal(owner.stats.ready,true);assert.equal(owner.stats.error,null);
    map.emit('error',{sourceId:'openmaptiles',error:new Error('unrelated remote tile')});assert.equal(owner.stats.error,null);
    map.emit('error',{sourceId:CAMPUS_ROAD_SOURCE,error:new Error('road worker failed')});assert.match(owner.stats.error,/road worker failed/);assert.equal(owner.stats.ready,false);assert.equal(map.sources.size,0);
    owner.retry();await settled(owner);ready(map);assert.equal(owner.stats.ready,true);owner.destroy();
  }
});

test('idempotent style/context recovery restores owned sources and layers without duplicated listeners or fetches',async()=>{
  const {files}=bundle(),map=fakeMap();let fetches=0;
  const owner=new CampusRoadLayer({fetcher:async url=>{fetches++;return loader(files)(url);}});owner.attach(map);await settled(owner);ready(map);
  const initialFetches=fetches,initialCalls={...map.calls};owner.attach(map);owner.attach(map);assert.deepEqual(map.calls,initialCalls);
  map.layers.delete('campus-road-asphalt-line-4');map.emit('style.load');assert.ok(map.layers.has('campus-road-asphalt-line-4'));assert.equal(fetches,initialFetches);
  map.sources.clear();map.ready.clear();map.images.clear();for(const id of [...map.layers.keys()])if(id!=='foreign-layer')map.layers.delete(id);
  map.emit('style.load');assert.equal(owner.stats.ready,false);assert.equal(map.images.size,2);ready(map);assert.equal(owner.stats.ready,true);assert.equal(fetches,initialFetches);
  map.emit('webglcontextlost');assert.equal(owner.stats.ready,false);map.emit('sourcedata',{sourceId:CAMPUS_ROAD_SOURCE});assert.equal(owner.stats.ready,false,'late worker data cannot declare a lost GPU context ready');map.emit('webglcontextrestored');assert.equal(owner.stats.ready,true);
  assert.ok([...map.events.values()].every(s=>s.size===1));owner.destroy();owner.destroy();assert.ok([...map.events.values()].every(s=>s.size===0));
});

test('native map removal cleans requests/listeners after MapLibre has destroyed its style',async()=>{
  const {files}=bundle(),map=fakeMap(),owner=new CampusRoadLayer({fetcher:loader(files)});owner.attach(map);await settled(owner);ready(map);
  map.sources.clear();map.layers.clear();map.images.clear();map.hasImage=()=>{throw new Error('MapLibre style already destroyed');};
  assert.doesNotThrow(()=>map.emit('remove'));assert.equal(owner.stats.ready,false);assert.equal(owner.stats.dataReady,false);assert.ok([...map.events.values()].every(s=>s.size===0));
});

test('late responses after destroy or a newer retry cannot resurrect a previous source',async()=>{
  const {files}=bundle(),map=fakeMap();let release;const pending=new Promise(r=>release=r);let requests=0;
  const owner=new CampusRoadLayer({fetcher:async(url,options)=>{requests++;if(requests===1){await pending;}return loader(files)(url,options);}});
  owner.attach(map);owner.retry();await settled(owner);ready(map);const count=map.calls.sources;release();await new Promise(r=>setTimeout(r,10));assert.equal(map.calls.sources,count);
  owner.destroy();assert.equal(map.sources.size,0);
  let complete;const gate=new Promise(r=>complete=r),dead=new CampusRoadLayer({fetcher:async url=>{await gate;return loader(files)(url);}});dead.attach(map);dead.destroy();complete();await new Promise(r=>setTimeout(r,10));assert.equal(map.sources.size,0);assert.equal(dead.stats.ready,false);
});

test('real campus shards retain all source nodes, T/X junctions, short curves, road areas and width transitions in one native graph',()=>{
  const directory=process.env.MAP_ROAD_TEST_DATA??fileURLToPath(new URL('../public/data/',import.meta.url));
  const manifest=validateCampusRoadManifest(JSON.parse(readFileSync(join(directory,'stanford-surfaces-roads-manifest.json'))));
  const features=manifest.files.flatMap(part=>{const bytes=readFileSync(join(directory,part.file));assert.equal(bytes.length,part.bytes);assert.equal(hash(bytes),part.sha256);const data=validateCampusRoadPart(JSON.parse(bytes),manifest.bounds);assert.equal(data.features.length,part.features);return data.features;});
  assert.equal(features.length,3035);assert.equal(features.filter(f=>f.geometry.type==='LineString').length,3024);assert.equal(features.filter(f=>f.geometry.type==='Polygon').length,11);
  const nodes=new Map();let segments=0,short=0,quad=0;
  for(const f of features){if(f.geometry.type!=='LineString')continue;if(f.properties.pavedAreaId==='derived/main-quad-paving')quad++;
    const coords=f.geometry.coordinates,ids=f.properties.sourceNodeIds;segments+=coords.length-1;
    for(let i=0;i<ids.length;i++){
      const node=nodes.get(ids[i])??{coordinate:coords[i],neighbors:new Set(),widths:new Set()};assert.deepEqual(node.coordinate,coords[i],'shared source node must never drift between ways');node.widths.add(f.properties.modeledWidth);
      for(const j of [i-1,i+1])if(j>=0&&j<ids.length)node.neighbors.add(ids[j]);nodes.set(ids[i],node);
      if(i&&Math.hypot((coords[i][0]-coords[i-1][0])*90000,(coords[i][1]-coords[i-1][1])*111000)<1)short++;
    }
  }
  assert.equal(segments,13416);assert.equal(segments,manifest.counts.streetSegments);assert.ok(quad>=4,'Quad routes retain topology while the native mask merges their paving');
  assert.ok([...nodes.values()].filter(n=>n.neighbors.size>=3).length>1000,'audit the full campus intersection class, not just Santa Teresa');
  assert.ok([...nodes.values()].some(n=>n.widths.size>1),'width transitions are present and preserved');assert.ok(short>50,'close source curves must remain unsimplified');
  for(const id of ['way/30776052','way/1543344570','way/24772498','way/288808022','way/30773401','way/30773403','way/30775517','way/30775518','way/30775519'])assert.ok(features.some(f=>f.properties.id===id),id+' missing from native road coverage');
});


test('default browser fetch is invoked without the controller as its receiver',async()=>{
 const original=globalThis.fetch,{files}=bundle(),map=fakeMap();let calls=0;
 globalThis.fetch=async function(url,options){assert.ok(this===undefined||this===globalThis,'browser fetch rejects a foreign receiver');calls++;return loader(files)(url,options);};
 const owner=new CampusRoadLayer();
 try{owner.attach(map);await settled(owner);assert.equal(owner.stats.error,null);assert.equal(calls,files.size);ready(map);assert.equal(owner.stats.ready,true);}
 finally{owner.destroy();globalThis.fetch=original;}
});

test('carriageways cover footway end caps instead of painting rounded pavement stubs across traffic lanes',()=>{
 const ids=campusRoadLayers(widthGroups(widths)).map(layer=>layer.id);
 assert.ok(ids.indexOf('campus-road-asphalt-line-0.8')>ids.indexOf('campus-road-concrete-line-20'));
 assert.ok(ids.indexOf('campus-road-asphalt-line-0.8')>ids.indexOf('campus-road-pavers-line-20'));
});

// Exercise the pinned engine's actual composite paint binder. Merely evaluating
// the style expression at camera zoom misses its clamp to each bucket's zoom.
// Only its WebGL uniform/array sinks and zoom-parameter carrier are substituted.
const binderSource=readFileSync(new URL('../node_modules/maplibre-gl/src/data/program_configuration.ts',import.meta.url),'utf8');
const binderClass=binderSource.slice(binderSource.indexOf('class CompositeExpressionBinder '),binderSource.indexOf('abstract class CrossFadedBinder'));
assert.ok(binderClass.startsWith('class CompositeExpressionBinder '),'pinned binder moved; review its replacement before updating this regression');
const CompositeBinder=new Function('EvaluationParameters','clamp',`return ${stripTypeScriptTypes(binderClass)}`)(class{constructor(zoom){this.zoom=zoom;}},(value,low,high)=>Math.max(low,Math.min(high,value)));
class WidthArray{length=0;values=[];resize(length){this.length=length;}emplace(index,min,max){this.values[index]=[min,max];}}
function nativeBoundWidth(spec,width,tileZoom,cameraZoom){
 const parsed=createPropertyExpression(spec,'line-width',latest.paint_line['line-width']);assert.equal(parsed.result,'success');
 const expression=parsed.value,feature={properties:{modeledWidth:width,roadPixelsPerMetreZ0:512/(40075016.68557849*Math.cos(CAMPUS_ROAD_LATITUDE*Math.PI/180))}};
 if(expression.kind!=='composite')return expression.evaluate({zoom:cameraZoom},feature,{});
 const binder=new CompositeBinder(expression,['width'],'number',false,tileZoom,WidthArray);binder.populatePaintArray(1,feature,{});
 let factor;binder.setUniform({set(value){factor=value;}},{zoom:cameraZoom});
 const [min,max]=binder.paintVertexArray.values[0];return min+(max-min)*factor;
}
function assertPhysicalWidth(spec,width){
 const scale=512/(40075016.68557849*Math.cos(CAMPUS_ROAD_LATITUDE*Math.PI/180));
 for(const cameraZoom of [13,15.5,18,20,21])for(const offset of [-3,-2,-1,0,1]){
  const tileZoom=Math.floor(cameraZoom)+offset,actual=nativeBoundWidth(spec,width,tileZoom,cameraZoom),expected=width*scale*2**cameraZoom;
  assert.ok(Math.abs(actual/expected-1)<1e-7,`tile width at source z${tileZoom} / camera z${cameraZoom} is ${actual}, expected ${expected}`);
 }
}
test('adjacent mixed-LOD terrain tiles retain identical physical road widths with the actual native paint binder',()=>{
 for(const width of widths)for(const layer of campusRoadLayers(widthGroups([width])).filter(l=>l.type==='line'))assertPhysicalWidth(layer.paint['line-width'],width);
});
test('negative control detects the old composite width shrinking across native terrain source-tile boundaries',()=>{
 const old=['interpolate',['exponential',2],['zoom'],0,['*',['get','modeledWidth'],['get','roadPixelsPerMetreZ0']],24,['*',['get','modeledWidth'],['get','roadPixelsPerMetreZ0'],2**24]];
 assert.throws(()=>assertPhysicalWidth(old,4.2),/tile width/);
 assert.equal(nativeBoundWidth(old,4.2,18,20)/nativeBoundWidth(old,4.2,20,20),.5,'the old Palm road was half-width in the lower-LOD tile');
});
test('the full pinned network keeps all seventeen exact sourced widths in exclusive native groups',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/data/stanford-surfaces-roads-manifest.json',import.meta.url)));
 const features=manifest.files.flatMap(part=>JSON.parse(readFileSync(new URL('../public/data/'+part.file,import.meta.url))).features).filter(f=>f.geometry.type==='LineString');
 const sourceWidths=[...new Set(features.map(f=>f.properties.modeledWidth))],groups=features.map(f=>({material:f.properties.modeledSurface,width:f.properties.modeledWidth})),layers=campusRoadLayers(groups).filter(l=>l.type==='line');
 assert.equal(sourceWidths.length,17);assert.equal(layers.length,40,'draw only material/width pairs actually present in the pinned source');
 const latitudeError=Math.max(...[manifest.bounds[1],manifest.bounds[3]].map(lat=>Math.abs(Math.cos(lat*Math.PI/180)/Math.cos(CAMPUS_ROAD_LATITUDE*Math.PI/180)-1)));
 assert.ok(latitudeError<.0003,'the runtime latitude approximation must remain bounded by the actual dataset');
 for(const material of ['unknown','pavers','concrete','asphalt']){
  const matching=layers.filter(l=>l.id.startsWith(`campus-road-${material}-line-`));
  assert.deepEqual(new Set(matching.map(l=>l.filter.at(-1)[2])),new Set(groups.filter(g=>g.material===material).map(g=>g.width)),'no width may be rounded, omitted or counted twice');
 }
});

test('every sourced width group participates in readiness, recovery and cleanup when a retry changes widths',async()=>{
 let files=bundle([line([[0,0],[10,0]],'way/1',{modeledWidth:4.2}),line([[10,0],[20,0]],'way/2',{modeledWidth:17.3}),line([[10,0],[10,10]],'way/3',{modeledWidth:2.4,modeledSurface:'concrete'})]).files;
 const map=fakeMap(),owner=new CampusRoadLayer({fetcher:url=>loader(files)(url)});
 owner.attach(map);await settled(owner);ready(map);
 const original=[...map.layers.keys()].filter(id=>id.includes('-line-'));assert.equal(original.length,3);assert.equal(owner.stats.ready,true);
 map.layers.delete('campus-road-asphalt-line-17.3');map.emit('sourcedata',{sourceId:CAMPUS_ROAD_SOURCE});assert.equal(owner.stats.ready,false);
 map.emit('style.load');assert.equal(owner.stats.ready,true);assert.ok(map.layers.has('campus-road-asphalt-line-17.3'));
 files=bundle([line([[0,0],[20,0]],'way/4',{modeledWidth:3.75})]).files;
 owner.retry();await settled(owner);ready(map);assert.equal(owner.stats.ready,true);
 assert.ok(original.every(id=>!map.layers.has(id)),'superseded width groups must not survive a reload');assert.ok(map.layers.has('campus-road-asphalt-line-3.75'),'new exact OSM widths require no hard-coded list');
 owner.destroy();assert.deepEqual([...map.layers.keys()],['foreign-layer']);assert.equal(map.sources.size,0);
});

test('context restoration waits for the replacement style, then installs while regional tiles still load',async()=>{
 const {files}=bundle(),map=fakeMap(),owner=new CampusRoadLayer({fetcher:loader(files)});
 owner.attach(map);await settled(owner);ready(map);
 map.emit('webglcontextlost');map.loaded=false;map.sources.clear();map.layers.clear();map.ready.clear();map.images.clear();
 let styleUsable=false;const add=map.addSource.bind(map);map.addSource=(...args)=>{assert.ok(styleUsable,'source mutation before replacement style.load');add(...args);};
 map.emit('webglcontextrestored');assert.equal(owner.stats.ready,false);assert.equal(map.sources.size,0);assert.equal(owner.stats.error,null);
 styleUsable=true;map.emit('style.load');assert.equal(map.loaded,false,'regional tile readiness is independent');ready(map);
 assert.equal(owner.stats.ready,true);assert.equal(owner.stats.error,null);owner.destroy();
});
