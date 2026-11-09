import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveRoadMaterials} from '../src/campus-road-materials.ts';
import {campusRoadLayers} from '../src/campus-road-layer.ts';
import {createExpression} from '@maplibre/maplibre-gl-style-spec';

const point=([x,y])=>[-122.17+x/88400,37.43+y/111320];
const route=(id,points,material='unknown',extra={})=>({type:'Feature',properties:{id,version:1,kind:'street',highway:'cycleway',modeledWidth:3,modeledSurface:material,surfaceEvidence:material==='unknown'?'unverified':'osm-tag',...(material==='unknown'?{}:{surface:material}),sourceNodeIds:points.map(p=>p.join(',')),...extra},geometry:{type:'LineString',coordinates:points.map(point)}});
const fc=features=>({type:'FeatureCollection',features});
const chain=()=>[route('way/1',[[-10,0],[0,0]],'asphalt'),route('way/2',[[0,0],[20,0]]),route('way/3',[[20,0],[40,0]]),route('way/4',[[40,0],[50,0]],'asphalt')];
const material=(result,id)=>result.data.features.find(f=>f.properties.id===id).properties.renderSurface;

test('a bounded smooth chain needs two independent agreeing anchors and keeps the source unchanged',()=>{
 const source=fc(chain()),before=JSON.stringify(source),result=resolveRoadMaterials(source);
 assert.equal(result.audit.inferred.length,2);assert.equal(material(result,'way/2'),'asphalt');
 assert.deepEqual(result.audit.inferred[0].sources,['way/1','way/4']);
 assert.equal(JSON.stringify(source),before);
 result.data.features.forEach((f,i)=>{assert.strictEqual(f.geometry,source.features[i].geometry);assert.deepEqual(f.properties.sourceNodeIds,source.features[i].properties.sourceNodeIds);assert.equal(f.properties.modeledSurface,source.features[i].properties.modeledSurface);assert.equal(f.properties.surfaceEvidence,source.features[i].properties.surfaceEvidence);});
 assert.equal(result.data.features[1].properties.renderSurfaceEvidence,'bounded-source-continuity-inference');
});

test('material conflicts, unsupported tags, dead ends, forks, name/class/width changes and long chains stay unknown',()=>{
 for(const change of [
  f=>{f[3]=route('way/4',[[40,0],[50,0]],'concrete');},
  f=>{f[1].properties.surface='gravel';},
  f=>{f[1].properties.surface='concrete;bricks';},
  f=>{f.pop();},
  f=>{f.push(route('way/5',[[40,0],[50,1]],'asphalt'));},
  f=>{f[3].properties.name='Different route';},
  f=>{f[3].properties.highway='footway';},
  f=>{f[3].properties.modeledWidth=4;},
  f=>{f[3].properties.footway='crossing';},
  f=>{f[3].properties.cycleway='crossing';},
  f=>{f[3].properties.crossing='marked';},
  f=>{f[3].properties.covered='yes';},
  f=>{f[3].properties.junction='roundabout';},
  f=>{f.splice(1,3,route('way/2',[[0,0],[600,0]]),route('way/3',[[600,0],[620,0]]),route('way/4',[[620,0],[630,0]],'asphalt'));},
 ]){const features=chain();change(features);const result=resolveRoadMaterials(fc(features));assert.equal(material(result,'way/2'),'unknown');assert.equal(result.audit.inferred.length,0);}
 const loop=fc([route('way/1',[[0,0],[10,0],[10,10],[0,0]])]);assert.equal(resolveRoadMaterials(loop).audit.inferred.length,0);
});

test('an aligned unknown branch cannot be skipped in favor of a less aligned known anchor',()=>{
 const features=[route('way/1',[[-10,0],[0,0]],'asphalt'),route('way/2',[[0,0],[20,0]]),route('way/3',[[20,0],[40,0]]),route('way/4',[[20,0],[40,10]],'asphalt')];
 assert.equal(resolveRoadMaterials(fc(features)).audit.inferred.length,0);
 features[2]=route('way/3',[[10,-2],[20,0],[40,0]]);
 assert.equal(resolveRoadMaterials(fc(features)).audit.inferred.length,0,'an unverified interior junction also blocks inference');
});

test('explicit stone and concrete variants keep evidence and appropriate palette; mixed and nonspecific tags are not invented',()=>{
 for(const [surface,expected] of [['sett','pavers'],['unhewn_cobblestone','pavers'],['concrete:plates','concrete'],['concrete:lanes','concrete'],['concrete;brick','unknown'],['paved','unknown']]){
  const result=resolveRoadMaterials(fc([route('way/1',[[0,0],[10,0]],'unknown',{surface})]));assert.equal(material(result,'way/1'),expected);
 }
 const layers=campusRoadLayers([{material:'pavers',width:3}]),paint=layers.find(l=>l.type==='line').paint['line-color'];
 const expression=createExpression(paint,'layers[0].paint.line-color');assert.equal(expression.result,'success');
 const stone=expression.value.evaluate({}, {properties:{surface:'sett'}}),brick=expression.value.evaluate({}, {properties:{surface:'bricks'}});assert.notDeepEqual(stone,brick);
});

test('whole campus audit fixes the reported seam and preserves deliberate/conflicting material boundaries',()=>{
 const root=new URL('../public/data/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('stanford-surfaces-roads-manifest.json',root)));
 const source=fc(manifest.files.flatMap(p=>JSON.parse(readFileSync(new URL(p.file,root))).features)),before=JSON.stringify(source),result=resolveRoadMaterials(source);
 assert.equal(result.audit.features,3035);assert.equal(result.audit.inferred.length,3);assert.equal(result.audit.unknown,2157);assert.equal(result.audit.unverified,2084);
 const oval=result.audit.inferred.find(f=>f.id==='way/8927111');assert.deepEqual(oval,{id:'way/8927111',surface:'asphalt',sources:['way/694395376','way/696196336']});
 for(const id of ['way/689427788','way/1509394085','way/1509394093','way/398186226','way/596052112','way/1029436488','way/1509388040','way/31705759','way/1017389200','way/26293942','way/694395372','way/371737429','way/398186222'])assert.equal(material(result,id),'unknown',id);
 assert.equal(JSON.stringify(source),before);assert.equal(result.data.features.length,source.features.length);
 const resolved=new Map(result.data.features.map(f=>[f.properties.id,f]));
 for(const f of source.features){const next=resolved.get(f.properties.id);assert.strictEqual(next.geometry,f.geometry);assert.equal(next.properties.modeledWidth,f.properties.modeledWidth);if(f.properties.modeledSurface!=='unknown')assert.equal(next.properties.renderSurface,f.properties.modeledSurface);}
 const layer=campusRoadLayers([{material:'asphalt',width:3}]).find(l=>l.type==='line'),filter=createExpression(layer.filter,'layers[0].filter');assert.equal(filter.result,'success');
 const f=resolved.get('way/8927111');assert.equal(filter.value.evaluate({}, {...f,type:2}),true,'the native layer must consume the derived display material');
 assert.equal(filter.value.evaluate({}, {...source.features.find(f=>f.properties.id==='way/8927111'),type:2}),false,'negative control: raw unknown was the visible color seam');
});
