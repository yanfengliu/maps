import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
const body=(name,text=source)=>stripTypeScriptTypes(text.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}`))[0]);
const fixture=()=>({sourceReady:false,styleAvailable:true,fetchJson:async path=>path.includes('buildings')?{type:'FeatureCollection',features:[{properties:{id:'way/1',height:8,base:0},geometry:{type:'Polygon'}}]}:{type:'FeatureCollection',features:[]},prepareBuildingDetails:x=>x,buildingPlaces:()=>[],PLACES:[],SCULPTURE_PLACES:[],map:{isStyleLoaded:()=>false},addCampusLayers(){this.attached=(this.attached??0)+1;},checkReady(){},showError:message=>assert.fail(message),attached:0});

test('campus starts after style parsing without waiting for delayed regional tiles',async()=>{
 const context=fixture();context.addCampusLayers=()=>context.attached++;
 await runInNewContext(`${body('loadCampus')}\nloadCampus()`,context);
 assert.equal(context.attached,1);assert.equal(context.sourceReady,true);
 // Negative control: the old all-tiles predicate recreates the needless wait.
 const old=fixture();old.addCampusLayers=()=>old.attached++;
 await runInNewContext(`${body('loadCampus',source.replace('if (styleAvailable) addCampusLayers();','if (map?.isStyleLoaded()) addCampusLayers();'))}\nloadCampus()`,old);
 assert.equal(old.attached,0);
});

test('early campus data waits for style parsing, and lost/retried styles cannot attach prematurely',async()=>{
 const context=fixture(),handlers={};context.styleAvailable=false;context.addCampusLayers=()=>context.attached++;
 await runInNewContext(`${body('loadCampus')}\nloadCampus()`,context);assert.equal(context.attached,0);
 context.map.on=(name,fn)=>handlers[name]=fn;
 for(const name of ['style.load','webglcontextlost']){
  const line=source.split('\n').find(line=>line.includes(`map.on('${name}'`));assert.ok(line);runInNewContext(line,context);
 }
 handlers['style.load']();assert.equal(context.attached,1);assert.equal(context.styleAvailable,true);
 handlers.webglcontextlost();assert.equal(context.styleAvailable,false);
 await runInNewContext(`${body('loadCampus')}\nloadCampus()`,context);assert.equal(context.attached,1);
 handlers['style.load']();assert.equal(context.attached,2);
 Object.assign(context,{el:()=>({}),scheduleLoadDeadline(){},createStyle:()=>({})});
 context.map.setStyle=()=>assert.equal(context.styleAvailable,false,'reset before native style replacement');
 runInNewContext(`${body('reloadRegionalMap')}\nreloadRegionalMap()`,context);
 assert.equal(context.styleAvailable,false);
});
