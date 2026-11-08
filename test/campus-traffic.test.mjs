import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
import {campusTrafficIcons,campusTrafficLayer,validateCampusTraffic,CAMPUS_TRAFFIC_SOURCE,CAMPUS_STOP_ICON,CAMPUS_SIGNAL_ICON} from '../src/campus-traffic.ts';

test('mapped traffic icons use a STOP symbol and three identical unlit lenses, not physical poles or live states',()=>{
  const icons=campusTrafficIcons(),stop=icons[CAMPUS_STOP_ICON],signal=icons[CAMPUS_SIGNAL_ICON];
  for(const icon of Object.values(icons)){assert.equal(icon.width,64);assert.equal(icon.height,64);assert.equal(icon.data.length,64*64*4);assert.ok(icon.data.some((v,i)=>i%4===3&&v===0),'icons need a transparent exterior');}
  const color=(image,x,y)=>[...image.data.slice((y*64+x)*4,(y*64+x)*4+4)];
  const lenses=[15,32,49].map(y=>color(signal,32,y));assert.deepEqual(lenses[0],lenses[1]);assert.deepEqual(lenses[1],lenses[2]);assert.ok(Math.max(...lenses[0].slice(0,3))-Math.min(...lenses[0].slice(0,3))<10,'no red/yellow/green state is asserted');
  assert.ok(color(stop,32,12)[0]>color(stop,32,12)[1]*2,'STOP face remains recognizable');
  const layer=campusTrafficLayer();assert.equal(layer.minzoom,17);assert.equal(layer.layout['icon-pitch-alignment'],'viewport');assert.equal(layer.layout['icon-rotate'],undefined);assert.equal(layer.layout['icon-offset'],undefined);
  assert.match(layer.metadata.description,/do not assert physical pole/);
  assert.deepEqual(validateStyleMin({version:8,sources:{[CAMPUS_TRAFFIC_SOURCE]:{type:'geojson',data:{type:'FeatureCollection',features:[]}}},layers:[layer]}).map(e=>e.message),[]);
});

test('all 345 real control points retain their source identity and explicit placement/direction uncertainty',()=>{
  const directory=process.env.MAP_ROAD_TEST_DATA??fileURLToPath(new URL('../public/data/',import.meta.url)),manifest=JSON.parse(readFileSync(join(directory,'stanford-surfaces-roads-manifest.json'))),raw=JSON.parse(readFileSync(join(directory,'stanford-surfaces-controls.geojson'))),before=JSON.stringify(raw);
  const data=validateCampusTraffic(raw,manifest.bounds);assert.equal(data.features.length,345);assert.equal(data.features.filter(f=>f.properties.controlType==='stop').length,306);assert.equal(data.features.filter(f=>f.properties.controlType==='traffic_signals').length,39);assert.equal(data.features.filter(f=>f.properties.directionStatus==='unknown').length,21);assert.equal(JSON.stringify(data),before);
  for(const patch of [{physicalPoleVerified:true},{placement:'pole'},{directionStatus:'assumed'},{controlType:'green'}]){const bad=structuredClone(raw);Object.assign(bad.features[0].properties,patch);assert.throws(()=>validateCampusTraffic(bad,manifest.bounds),/invalid mapped regulatory points/);}
});
