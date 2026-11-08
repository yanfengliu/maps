import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const rule=selector=>css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]+)\\}'))?.[1]??'';
const rgb=hex=>hex.match(/../g).map(n=>parseInt(n,16));
const luminance=c=>c.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
test('map marker remains legible over dark and light basemap details',()=>{
 const label=rule('.pin-label'),sub=rule('.pin-label>span');
 const backing=label.match(/background:rgba\((\d+),(\d+),(\d+),([.\d]+)\)/);
 assert.ok(backing,'marker requires a translucent backing, not only a text shadow');
 const [,r,g,b,a]=backing.map(Number);assert.ok(a>=.8&&a<1);
 for(const foreground of [label,sub]){
  const text=rgb(foreground.match(/color:#([0-9a-f]{6})/)[1]);
  for(const ground of [0,255]){
   const painted=[r,g,b].map(c=>c*a+ground*(1-a));
   const contrast=(luminance(painted)+.05)/(luminance(text)+.05);
   assert.ok(contrast>=4.5,`marker text contrast ${contrast} over ${ground}`);
  }
 }
});
