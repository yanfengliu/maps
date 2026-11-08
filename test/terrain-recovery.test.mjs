import test from 'node:test';
import assert from 'node:assert/strict';
import {enableTerrainRecovery} from '../src/terrain-recovery.ts';

function harness(){
 const listeners=[],events=new Map(),trace=[],settings={source:'bay-area-terrain',exaggeration:1};let terrain=settings,style=true,generation=0;
 const canvas={addEventListener(type,fn,options){listeners.push({type,fn,capture:!!options?.capture});},removeEventListener(type,fn){const i=listeners.findIndex(l=>l.type===type&&l.fn===fn);if(i>=0)listeners.splice(i,1);}};
 const map={getCanvas:()=>canvas,getTerrain:()=>terrain,setTerrain(value){assert.ok(style,'style already destroyed');trace.push([generation,value]);terrain=value;},on(type,fn){events.set(type,fn);},off(type,fn){if(events.get(type)===fn)events.delete(type);}};
 // Native loss handling is registered first, but must run after our capture.
 canvas.addEventListener('webglcontextlost',()=>{assert.equal(terrain,null,'old textures would enter replacement painter');style=false;generation++;},{});
 return {map,listeners,events,trace,settings,lose(){for(const l of [...listeners].sort((a,b)=>Number(b.capture)-Number(a.capture)))l.fn();},load(){style=true;events.get('style.load')?.();}};
}
test('terrain is released before native style/painter destruction and restored exactly once into the new generation',()=>{
 const h=harness(),dispose=enableTerrainRecovery(h.map);h.lose();assert.deepEqual(h.trace,[[0,null]]);h.load();
 assert.deepEqual(h.trace,[[0,null],[1,h.settings]]);assert.notEqual(h.map.getTerrain(),h.settings,'configuration cloned before native teardown');h.load();assert.equal(h.trace.length,2);
 h.lose();h.load();assert.deepEqual(h.trace.slice(-2),[[1,null],[2,h.settings]]);dispose();assert.equal(h.listeners.length,1);assert.equal(h.events.size,0);
});
test('disposing while recovery is pending cannot restore terrain after map removal',()=>{const h=harness(),dispose=enableTerrainRecovery(h.map);h.lose();dispose();h.load();assert.deepEqual(h.trace,[[0,null]]);});
test('negative control: bubbling teardown runs too late to retire old painter textures',()=>{const h=harness();h.map.getCanvas().addEventListener('webglcontextlost',()=>h.map.setTerrain(null),{});assert.throws(()=>h.lose(),/old textures/);});
