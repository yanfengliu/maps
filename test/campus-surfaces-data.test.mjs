import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CORE_BOUNDS,QUAD_PLANTING_IDS,SURFACE_TAGS,deriveRoutes,roadWidth,surfaceDescription,buildCampusSurfaces} from '../tools/data/build-campus-surfaces.mjs';

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
