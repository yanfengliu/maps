import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CORE_BOUNDS,QUAD_PLANTING_IDS,SURFACE_TAGS,CONTROL_TAGS,ROAD_SHARD_BYTES,deriveRoutes,deriveCampusRoads,shardRoadFeatures,roadWidth,surfaceDescription,buildCampusSurfaces} from '../tools/data/build-campus-surfaces.mjs';

const read=name=>readFileSync(new URL('../public/data/'+name,import.meta.url));
const digest=x=>createHash('sha256').update(x).digest('hex');
const bytes=read('stanford-surfaces.geojson'),data=JSON.parse(bytes),provenance=JSON.parse(read('stanford-surfaces-provenance.json'));
const environment=JSON.parse(read('stanford-environment.geojson')),buildings=JSON.parse(read('stanford-buildings.geojson'));

test('ground dataset binds every feature geometry to the pinned source edition and bounded selection',()=>{
  assert.equal(provenance.outputs['stanford-surfaces.geojson'].sha256,digest(bytes));
  assert.deepEqual(provenance.sources,JSON.parse(read('stanford-provenance.json')).sources);
  assert.deepEqual(provenance.coreBounds,CORE_BOUNDS);assert.deepEqual(provenance.retainedTags,SURFACE_TAGS);
  assert.ok(bytes.length<100000,'ground detail must remain a small static input');
  const ids=new Set(),counts={plazas:0,streets:0,crossings:0,streetSegments:0};
  for(const feature of data.features){
    const p=feature.properties;assert.ok(!ids.has(p.id));ids.add(p.id);
    assert.equal(digest(JSON.stringify(feature.geometry)),provenance.featureGeometryHashes[p.id]);
    assert.ok(Number.isInteger(p.version)&&p.version>0);
    if(p.kind==='plaza')counts.plazas++;
    else if(p.kind==='street'){counts.streets++;counts.streetSegments+=feature.geometry.coordinates.length-1;assert.ok(p.modeledWidth>0&&p.modeledWidth<=30);assert.notEqual(p.highway,'construction');}
    else {assert.equal(p.kind,'crossing');counts.crossings++;assert.ok(p.modeledBearing>=0&&p.modeledBearing<360);}
    if(p.modeledSurface!=='unknown')assert.notEqual(p.surfaceEvidence,'unverified');
  }
  assert.deepEqual(counts,provenance.counts);assert.ok(counts.streetSegments<=320);
  assert.equal(ids.size,Object.keys(provenance.featureGeometryHashes).length);
});

test('Main Quad paving uses the exact mapped courtyard void and all eight exact planted holes',()=>{
  const quad=data.features.find(f=>f.properties.id==='derived/main-quad-paving'),rings=quad.geometry.coordinates;
  assert.equal(rings.length,9);assert.equal(quad.properties.geometrySource,'mapped-courtyard-minus-mapped-planting');
  const quadBuilding=buildings.features.find(f=>f.properties.id==='relation/35820');
  const polygons=quadBuilding.geometry.type==='Polygon'?[quadBuilding.geometry.coordinates]:quadBuilding.geometry.coordinates;
  assert.ok(polygons.some(p=>p.slice(1).some(r=>JSON.stringify(r)===JSON.stringify(rings[0])||JSON.stringify([...r].reverse())===JSON.stringify(rings[0]))),'ground outer must be an actual building-relation courtyard void, not a bounding box');
  for(const [i,id] of QUAD_PLANTING_IDS.entries()){
    const planting=environment.features.find(f=>f.properties.id==='way/'+id);
    assert.deepEqual(rings[i+1],planting.geometry.coordinates,'source hole '+id+' must not be resized, simplified or replaced with a circle');
  }
  for(const ring of rings)assert.deepEqual(ring[0],ring.at(-1));
  assert.equal(quad.properties.surface,undefined,'authored paving evidence must not invent an OSM surface tag');
});

test('crossing paint is grounded in mapped tags and every crossing belongs to its recorded street',()=>{
  const byId=new Map(data.features.map(f=>[f.properties.id,f]));
  for(const crossing of data.features.filter(f=>f.properties.kind==='crossing')){
    const p=crossing.properties,road=byId.get(p.orientationSource);
    assert.ok(road?.geometry.coordinates.some(v=>JSON.stringify(v)===JSON.stringify(crossing.geometry.coordinates)),'crossing may not be placed by spacing or nearest-road guess');
    assert.equal(p.roadWidth,road.properties.modeledWidth);
    assert.equal(p.modeledMarkings,undefined,'unverified marking style must not be invented');
  }
  const zebra=byId.get('node/4913257330');assert.equal(zebra.properties['crossing:markings'],'zebra');assert.equal(zebra.properties.orientationSource,'way/1543344570');
  for(const id of ['node/8416756850','node/8416756855'])assert.equal(byId.get(id).properties['crossing:markings'],'no');
  const curbs=data.features.filter(f=>f.properties.curbEvidence);assert.equal(curbs.length,4);
  assert.ok(curbs.every(f=>f.properties.name==='Palm Drive'&&f.properties.curbEvidence==='stanford-oval-aerial-2019'&&f.properties.modeledCurbHeight===0.10));
});

test('the surfaced crossing road continues into adjoining mapped street segments instead of an isolated asphalt rectangle',()=>{
 const roads=data.features.filter(f=>f.properties.kind==='street');
 const crossingRoad=roads.find(f=>f.properties.id==='way/1543344570');
 assert.ok(crossingRoad);
 for(const endpoint of [crossingRoad.geometry.coordinates[0],crossingRoad.geometry.coordinates.at(-1)]){
  assert.ok(roads.some(f=>f!==crossingRoad&&f.geometry.coordinates.some(p=>JSON.stringify(p)===JSON.stringify(endpoint))),'both ends of the reported crossing road need sourced continuation');
 }
});

test('route derivation preserves raw tags and coordinates, excludes incomplete/construction ways and never treats unknown crossing control as paint',()=>{
  const node=(id,coordinate,tags={})=>({type:'node',id,version:3,coordinate,tags});
  const way=(id,nodes,tags={})=>({type:'way',id,version:4,nodes,tags:{name:'Jane Stanford Way',highway:'unclassified',...tags}});
  const elements=[node('1',[-122.17,37.429]),node('2',[-122.1701,37.4291],{highway:'crossing',crossing:'uncontrolled'}),node('3',[-122.1702,37.4292]),way('11',['1','2','3'],{surface:'asphalt',width:'7.2 m',lanes:'2',oneway:'no',access:'private'}),way('12',['1','2'],{highway:'construction'}),way('13',['1','missing'])];
  const input=new Map(elements.map(e=>[e.type+'/'+e.id,e])),before=JSON.stringify(elements),result=deriveRoutes(input);
  assert.equal(result.streets.length,1);assert.equal(result.crossings.length,1);
  assert.deepEqual(result.streets[0].geometry.coordinates,elements.slice(0,3).map(n=>n.coordinate));
  for(const [key,value] of Object.entries(elements[3].tags))assert.equal(result.streets[0].properties[key],value);
  assert.equal(result.streets[0].properties.modeledWidth,7.2);assert.equal(result.streets[0].properties.widthSource,'osm-tag');
  assert.equal(result.crossings[0].properties['crossing:markings'],undefined);
  assert.ok(result.crossings[0].properties.modeledBearing>270&&result.crossings[0].properties.modeledBearing<360,'northwest road tangent is normalized clockwise from north');
  assert.deepEqual(result.excluded.map(x=>x.reason),['construction-or-covered-route','incomplete-source-way']);assert.equal(JSON.stringify(elements),before);
});

test('surface and width estimates cannot silently become sourced material or dimensions',()=>{
  assert.deepEqual(surfaceDescription({surface:'asphalt'}),{modeledSurface:'asphalt',surfaceEvidence:'osm-tag'});
  assert.equal(surfaceDescription({surface:'paved'}).modeledSurface,'unknown');
  assert.equal(surfaceDescription({surface:'concrete;brick'}).modeledSurface,'unknown');
  assert.equal(surfaceDescription({name:'Lasuen Mall'}).surfaceEvidence,'stanford-lasuen-2023');
  assert.equal(roadWidth({highway:'footway'}).modeledWidth,2.4);
  assert.equal(roadWidth({highway:'pedestrian',width:'bogus'}).widthSource,'class-estimate');
  assert.equal(roadWidth({highway:'pedestrian',width:'200'}).widthSource,'class-estimate');
});

test('source digest mismatch stops generation before publishing any output',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'maps-surfaces-pins-'));
  try{
    await writeFile(path.join(directory,provenance.sources[0].file),'<osm>changed</osm>');
    await assert.rejects(buildCampusSurfaces({sourceDir:directory,outputDir:path.join(directory,'output')}),/pinned SHA-256/);
    await assert.rejects(access(path.join(directory,'output')));
  }finally{await rm(directory,{recursive:true,force:true});}
});

const roadManifest=JSON.parse(read('stanford-surfaces-roads-manifest.json'));
const roadFeatures=roadManifest.files.flatMap(part=>JSON.parse(read(part.file)).features);
const roadInventory=JSON.parse(read(roadManifest.inventory.file));

test('campus native coverage inventories every pinned highway candidate without an arbitrary core allowlist',()=>{
  assert.deepEqual(roadManifest.sources,provenance.sources);
  assert.deepEqual(roadManifest.retainedTags,SURFACE_TAGS);
  assert.equal(roadManifest.campusBoundarySha256,digest(read('stanford-campus.geojson')));
  assert.deepEqual(roadInventory.fields,['id','version','decision','sourceNodes']);
  assert.equal(roadInventory.records.length,6822,'the four pinned extracts contain 6,822 highway ways; none may silently disappear');
  assert.deepEqual(roadManifest.counts,{streets:3024,roadAreas:11,streetSegments:13416});
  const ids=new Set(),nodeCoordinates=new Map(),included=new Set(roadInventory.records.filter(r=>r[2].startsWith('included-')).map(r=>r[0]));
  for(const part of roadManifest.files){
    const bytes=read(part.file),features=JSON.parse(bytes).features;
    assert.equal(bytes.length,part.bytes);assert.equal(digest(bytes),part.sha256);assert.ok(bytes.length<=ROAD_SHARD_BYTES);assert.equal(features.length,part.features);
    const counts={streets:0,roadAreas:0,streetSegments:0};
    for(const feature of features){
      const p=feature.properties,points=feature.geometry.type==='Polygon'?feature.geometry.coordinates[0]:feature.geometry.coordinates;
      assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(included.has(p.id));
      assert.equal(p.sourceNodeIds.length,points.length,'every retained source node has exactly one unchanged coordinate');
      assert.ok(!['construction','corridor'].includes(p.highway));assert.notEqual(p.indoor,'yes');
      assert.ok(!p.bridge||p.bridge==='no');assert.ok(!p.tunnel||['no','building_passage'].includes(p.tunnel));assert.ok(!p.layer||p.layer==='0');assert.ok(!p.level||p.level==='0');
      if(feature.geometry.type==='Polygon'){counts.roadAreas++;assert.equal(p.kind,'road-area');assert.equal(p.area,'yes');assert.deepEqual(points[0],points.at(-1));}
      else{counts.streets++;counts.streetSegments+=points.length-1;assert.equal(p.kind,'street');assert.ok(p.modeledWidth>0&&p.modeledWidth<=30);assert.ok(['osm-tag','class-estimate'].includes(p.widthSource));}
      points.forEach((point,i)=>{
        assert.ok(point[0]>=roadManifest.bounds[0]&&point[0]<=roadManifest.bounds[2]&&point[1]>=roadManifest.bounds[1]&&point[1]<=roadManifest.bounds[3]);
        const old=nodeCoordinates.get(p.sourceNodeIds[i]);if(old)assert.deepEqual(point,old,'shared source node must remain exactly joined across shards');else nodeCoordinates.set(p.sourceNodeIds[i],point);
      });
    }
    assert.deepEqual(counts,part.counts);
  }
  assert.deepEqual(ids,included);
  for(const id of ['24772498','288808022','30773401','30773403','30775517','30775518','30775519'])assert.ok(ids.has('way/'+id),'Oval axial and garden walks cannot be dropped');
  const gerona=roadFeatures.find(f=>f.id==='way/8952702');assert.equal(gerona.properties.coverage,'campus-intersecting-complete-way');assert.equal(gerona.geometry.coordinates.length,48,'source way crossing campus boundary must not be clipped');
  assert.ok(gerona.geometry.coordinates.some(p=>p[1]<37.415),'full preserved source bounds extend past old core validator');
  const decisions={};for(const row of roadInventory.records)decisions[row[2]]=(decisions[row[2]]||0)+1;
  assert.deepEqual(decisions,roadManifest.inventory.decisions);assert.equal(digest(read(roadManifest.inventory.file)),roadManifest.inventory.sha256);
});

test('geometric selection preserves boundary crossings, interior junction nodes, areas, access tags and uncertainty',()=>{
  const node=(id,coordinate,tags={})=>({type:'node',id,version:1,coordinate,tags});
  const way=(id,nodes,tags={})=>({type:'way',id,version:2,nodes,tags:{highway:'footway',...tags}});
  const ring=[[0,0],[10,0],[10,10],[0,10],[0,0]];
  const elements=[node('1',[-1,5]),node('2',[5,5]),node('3',[11,5]),node('4',[5,8]),node('5',[1,1]),node('6',[2,1]),node('7',[2,2]),node('8',[1,2]),node('9',[5,11]),node('10',[4,4],{highway:'stop'}),node('11',[6,6],{highway:'traffic_signals','traffic_signals:direction':'forward'}),node('12',[-1,7]),node('13',[11,7]),
    way('21',['1','2','3'],{surface:'dirt',access:'private'}),way('22',['2','4'],{width:'6 ft'}),way('23',['5','6','7','8','5'],{highway:'pedestrian',area:'yes'}),way('24',['4','9'],{bridge:'yes',layer:'1'}),way('25',['2','10'],{covered:'yes'}),way('26',['2','11'],{tunnel:'building_passage'}),way('27',['3','9'],{indoor:'yes'}),way('28',['5','missing']),way('29',['6','7'],{highway:'construction'}),way('30',['12','13']),way('31',['7','8'],{highway:'steps'}),way('32',['5','6'],{area:'yes'})];
  const input=new Map(elements.map(e=>[e.type+'/'+e.id,e])),before=JSON.stringify(elements),result=deriveCampusRoads(input,ring);
  const byId=new Map(result.features.map(f=>[f.id,f]));
  assert.deepEqual(byId.get('way/21').geometry.coordinates,[[-1,5],[5,5],[11,5]]);
  assert.deepEqual(byId.get('way/21').properties.sourceNodeIds,['1','2','3']);
  assert.equal(byId.get('way/21').properties.unpavedSurface,'dirt');assert.equal(byId.get('way/21').properties.access,'private');
  assert.equal(byId.get('way/21').properties.endpointConnection.start,'continues-outside-campus');
  assert.equal(byId.get('way/22').properties.endpointConnection.start,'shared-source-node');
  assert.ok(Math.abs(byId.get('way/22').properties.modeledWidth-1.8288)<1e-10);
  assert.equal(byId.get('way/23').geometry.type,'Polygon');assert.equal(byId.get('way/23').properties.modeledWidth,undefined);
  assert.ok(byId.has('way/25')&&byId.has('way/26'),'at-grade covered paths retain source connectivity');
  assert.ok(byId.has('way/30'),'a source segment crossing the campus is included even when both endpoints are outside');
  assert.ok(byId.has('way/31'),'steps are retained as mapped surface-route coverage');
  for(const id of ['24','27','28','29','32'])assert.ok(!byId.has('way/'+id));
  assert.equal(result.inventory.length,12);assert.equal(result.controls.length,2);
  assert.equal(result.controls.find(f=>f.id==='node/10').properties.directionStatus,'unknown');
  assert.equal(result.controls.find(f=>f.id==='node/11').properties['traffic_signals:direction'],'forward');
  assert.ok(result.controls.every(f=>f.properties.physicalPoleVerified===false));
  assert.equal(JSON.stringify(elements),before,'derivation must not mutate pinned source objects');
});

test('traffic control inventory retains source locations and direction unknowns without claiming roadside poles',()=>{
  const bytes=read(roadManifest.controls.file),controls=JSON.parse(bytes).features;
  assert.equal(bytes.length,roadManifest.controls.bytes);assert.equal(digest(bytes),roadManifest.controls.sha256);assert.deepEqual(roadManifest.retainedControlTags,CONTROL_TAGS);
  assert.equal(controls.filter(f=>f.properties.controlType==='stop').length,306);assert.equal(controls.filter(f=>f.properties.controlType==='traffic_signals').length,39);
  assert.equal(controls.filter(f=>f.properties.directionStatus==='unknown').length,21);
  const roads=new Map(roadFeatures.map(f=>[f.id,f]));
  for(const f of controls){
    const p=f.properties;assert.equal(f.geometry.type,'Point');assert.equal(p.physicalPoleVerified,false);assert.equal(p.kind,'traffic-control');
    assert.equal(p.controlType,p.highway);assert.equal(p.modeledBearing,undefined,'a source forward/backward tag is not a global compass orientation');
    for(const id of p.retainedWayIds){const road=roads.get(id);assert.ok(road);const i=road.properties.sourceNodeIds.indexOf(p.id.slice(5));assert.ok(i>=0);const points=road.geometry.type==='Polygon'?road.geometry.coordinates[0]:road.geometry.coordinates;assert.deepEqual(f.geometry.coordinates,points[i]);}
  }
});

test('deterministic road shards enforce the byte cap without losing source features',()=>{
  const small=roadFeatures.slice(0,4),shards=shardRoadFeatures(small,1800);
  assert.deepEqual(shards.flatMap(s=>JSON.parse(s).features),small);assert.deepEqual(shardRoadFeatures(small,1800),shards);assert.ok(shards.every(s=>Buffer.byteLength(s)<=1800));
  assert.throws(()=>shardRoadFeatures([small[0]],10),/byte limit/);
  assert.equal(surfaceDescription({name:'Lasuen Mall',surface:'dirt'}).unpavedSurface,'dirt','photographic corridor inference must not overwrite an explicit different surface tag');
  assert.equal(surfaceDescription({name:'Lasuen Mall'},{photographic:false}).modeledSurface,'unknown','one reference photo cannot verify all new campus segments');
  assert.equal(roadWidth({highway:'primary',lanes:'4'}).modeledWidth,14);
});
