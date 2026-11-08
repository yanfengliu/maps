import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

// Execute the production navigation handlers, with external map/DOM effects
// supplied by a small host. This catches cross-handler ordering regressions.
const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
const names=['overview','goTo','closeDetails','setChurchInterior'];
const handlers=stripTypeScriptTypes(names.map(name=>{
  const match=source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));assert.ok(match,`${name} handler missing`);return match[0];
}).join('\n'));

for(const [name,action,caption] of [
  ['world overview','overview(false)','WORLD MAP'],
  ['city search',"goTo({name:'San Francisco',center:[-122.4,37.7],zoom:12,campus:false})",'SAN FRANCISCO'],
  ['church exterior',"goTo({name:'Memorial Church',buildingId:'church',center:[-122.17,37.42],zoom:18,campus:true})",'STANFORD UNIVERSITY · 3D CAMPUS']
])test(`leaving the church through ${name} restores the destination caption and exterior mode`,()=>{
  const nodes=new Map(),modes=[],get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};get('view-name').textContent='MEMORIAL CHURCH · INTERIOR';
  const context={churchInterior:true,churchCeiling:true,selectedId:'church',window:{innerWidth:390,innerHeight:844},map:{fitBounds(){},flyTo(){}},BAY_BOUNDS:[],panelPadding:()=>({}),motionDuration:()=>0,details:{hidden:false},search:{blur(){}},campusData:{features:[{properties:{id:'church'}}]},el:get,root:{classList:{toggle(){}}},buildingDetails:{setInterior:value=>modes.push(value),setCeiling(){}},syncChurchVisibility(){},updateSelection(){},setSidebarCompact(){},closeSearch(){},showBuilding(){},showSculpture(){},showCampus(){},showCity(){}};
  runInNewContext(`${handlers}\n${action};`,context);
  assert.equal(get('view-name').textContent,caption);assert.equal(context.churchInterior,false);assert.equal(context.churchCeiling,false);assert.deepEqual(modes,[false]);assert.equal(get('church-controls').hidden,true);
});
