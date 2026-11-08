import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {PLACES} from '../src/places.ts';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
const handler=name=>stripTypeScriptTypes(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0]??'');
const plain=value=>JSON.parse(JSON.stringify(value));

test('church cutaway excludes only the church exterior, retaining campus, picking and all map labels on entry, retry and exit',()=>{
  const layers=new Map(['stanford-buildings','stanford-roofs','stanford-building-picking','stanford-names','road-label','place-label'].map(id=>[id,{id,layout:{visibility:'visible'}}]));
  const filters=new Map(),visibility=[],arcade=[];
  const context={churchInterior:true,CHURCH_ID:'way/836474103',buildingDetails:{stats:{ready:true}},BUILDING_PICK_LAYERS:['stanford-buildings','stanford-building-picking'],interiorLabelVisibility:new Map(),quadArcadeVisibility:{sync:(_,ready)=>arcade.push(ready)},map:{getLayer:id=>layers.get(id),getStyle:()=>({layers:[...layers.values()].map(l=>({...l,type:l.id.endsWith('label')||l.id==='stanford-names'?'symbol':'fill-extrusion'}))}),setFilter:(id,filter)=>filters.set(id,plain(filter)),setLayoutProperty:(id,key,value)=>visibility.push([id,key,value])}};
  const sync=()=>runInNewContext(`${handler('syncChurchVisibility')}\nsyncChurchVisibility();`,context);
  sync();
  for(const id of ['stanford-buildings','stanford-roofs'])assert.deepEqual(filters.get(id),['!=',['get','id'],'way/836474103']);
  assert.equal(filters.size,2,'no surrounding-source filter or picking filter changes');assert.deepEqual(visibility,[],'no building or symbol layer disappears');assert.equal(arcade.at(-1),false,'native context walls remain complete while custom layer contains the room');
  filters.clear();sync();assert.equal(filters.size,2,'recreated style layers receive the same church-only exclusion');
  context.churchInterior=false;sync();for(const id of ['stanford-buildings','stanford-roofs'])assert.equal(filters.get(id),null);assert.equal(arcade.at(-1),true);assert.deepEqual(visibility,[]);
});

test('map construction and world overview admit destinations outside the Bay Area at world scale',()=>{
  const construction=source.match(/map = new maplibregl\.Map\(\{[\s\S]*?\}\);/)?.[0];assert.ok(construction);
  let options;
  runInNewContext(stripTypeScriptTypes(construction),{map:undefined,maplibregl:{Map:class {constructor(value){options=plain(value);}}},MAX_MAP_ZOOM:21.5,PLACES,reducedMotion:{matches:false}});
  assert.equal(options.maxBounds,undefined);assert.equal(options.minZoom,0);assert.equal(options.maxZoom,21.5);
  assert.equal(options.renderWorldCopies,true,'horizontal movement must still work when the viewport spans a whole world');
  const flights=[],caption={};
  runInNewContext(`${handler('overview')}\noverview(false);`,{window:{innerWidth:1600,innerHeight:1100},map:{flyTo:value=>flights.push(plain(value))},panelPadding:()=>({top:90,bottom:90,left:30,right:60}),motionDuration:n=>n,el:()=>caption,search:{value:'Paris',blur(){}},closeSearch(){},closeDetails(){}});
  assert.deepEqual(flights[0].center,[0,20]);assert.ok(flights[0].zoom<3);assert.equal(caption.textContent,'WORLD MAP');
});

test('initial interface has compact search and shortcuts without a persistent information sidebar',()=>{
  const template=source.match(/root\.innerHTML = `[\s\S]*?\n`;/)?.[0];assert.ok(template);
  const root={};runInNewContext(template,{root,icon:()=>'<svg></svg>',campusIllustration:'<svg></svg>',PLACES:Array.from({length:4},(_,i)=>({id:String(i),name:'Place',subtitle:'City · Region'}))});
  assert.doesNotMatch(root.innerHTML,/<aside\b|class="sidebar"|id="explore-content"/);
  assert.match(root.innerHTML,/aria-label="Search places"/);assert.match(root.innerHTML,/aria-label="World overview"/);
  assert.match(root.innerHTML,/id="explore-stanford"/);assert.match(root.innerHTML,/id="explore-church"/);
  assert.match(root.innerHTML,/id="place-details"[^>]*hidden/);assert.match(root.innerHTML,/id="church-information"[^>]*hidden/);
});

test('closing search aborts the pending worldwide query and stale completion cannot reopen it',async()=>{
  const asyncHandler=stripTypeScriptTypes(source.match(/async function submitWorldSearch\([\s\S]*?\n\}/)?.[0]??'');
  let resolve,signal,drawn=0;const attributes=new Map();const results={hidden:true,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k)};
  const context={search:{value:'Paris',setAttribute(){},removeAttribute(){}},results,worldSearch:undefined,searchRevision:0,activeResult:-1,visibleResults:[],AbortController,searchWorldPlaces:(_,options)=>{signal=options.signal;return new Promise(r=>{resolve=r;});},drawResults:()=>drawn++,escapeHtml:String};
  runInNewContext(`${handler('closeSearch')}\n${asyncHandler}\npending=submitWorldSearch();`,context);
  assert.equal(results.hidden,false);assert.equal(attributes.get('aria-busy'),'true');
  runInNewContext('closeSearch();',context);assert.equal(signal.aborted,true);assert.equal(results.hidden,true);
  resolve([{name:'Paris'}]);await context.pending;assert.equal(drawn,0);assert.equal(results.hidden,true);assert.equal(attributes.has('aria-busy'),false);
});

test('IME composition owns search Enter, arrows and Escape until normal submission resumes',()=>{
  const listener=source.match(/search\.addEventListener\('keydown', event => \{[\s\S]*?\n\}\);/)?.[0];assert.ok(listener);
  for(const suggestions of [[],[{id:'local',name:'Tokyo'}]])for(const composition of [{isComposing:true,keyCode:13},{isComposing:false,keyCode:229}]){
    let keydown;const calls=[];
    const context={search:{addEventListener:(_,callback)=>keydown=callback,blur:()=>calls.push('blur'),setAttribute:()=>calls.push('active')},results:{hidden:false,querySelectorAll:()=>[]},visibleResults:suggestions,activeResult:-1,closeSearch:()=>calls.push('close'),renderResults:()=>calls.push('render'),goTo:()=>calls.push('navigate'),submitWorldSearch:()=>calls.push('submit')};
    runInNewContext(listener,context);
    for(const key of ['Enter','ArrowDown','ArrowUp','Escape'])keydown({key,...composition,preventDefault:()=>calls.push('prevented')});
    assert.deepEqual(calls,[],'composition must not submit, select, dismiss or cancel native input');assert.equal(context.activeResult,-1);
    keydown({key:'Enter',isComposing:false,keyCode:13,preventDefault:()=>calls.push('prevented')});
    assert.deepEqual(calls,['prevented',suggestions.length?'navigate':'submit']);
  }
});
