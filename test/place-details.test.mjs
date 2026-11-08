import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {PLACES,SCULPTURE_PLACES,buildingPlaces,searchPlaces} from '../src/places.ts';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
const handler=name=>stripTypeScriptTypes(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0]??'');
const plain=value=>JSON.parse(JSON.stringify(value));

test('search selection reaches Memorial Church and its interior action without fixed shortcut buttons',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url),'utf8')),church=searchPlaces('Memorial Church',buildingPlaces(data.features))[0];assert.ok(church?.buildingId);
 const flights=[],buttons=[],nodes=new Map(),calls=[];let keydown;
 const el=id=>{assert.ok(!['explore-stanford','explore-church','view-name','world-overview'].includes(id));if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
 const context={details:{hidden:true,querySelector:()=>({addEventListener(){}}),append:button=>buttons.push(button)},selectedId:null,CHURCH_ID:church.buildingId,campusData:data,map:{flyTo:value=>flights.push(plain(value))},window:{innerWidth:390},motionDuration:()=>0,search:{addEventListener:(_,fn)=>keydown=fn,setAttribute(){},blur(){}},results:{hidden:false,querySelectorAll:()=>[]},visibleResults:[church],activeResult:-1,el,setChurchInterior(){},updateSelection(){},closeDetails(){},closeSearch(){},escapeHtml:String,icon:()=>'',document:{createElement:()=>({addEventListener:(name,fn)=>{assert.equal(name,'click');calls.push(fn);}})},enterChurchInterior:()=>calls.push('entered'),submitWorldSearch:()=>assert.fail('explicitly selected local church must navigate'),showSculpture(){},showCity(){}};
 const listener=source.match(/search\.addEventListener\('keydown', event => \{[\s\S]*?\n\}\);/)?.[0];assert.ok(listener);
 runInNewContext(`${handler('goTo')}\n${handler('showBuilding')}\n${listener}`,context);
 keydown({key:'ArrowDown',preventDefault(){}});keydown({key:'Enter',preventDefault(){}});
 assert.equal(flights.length,1);assert.deepEqual(flights[0].center,church.center);assert.equal(context.selectedId,church.buildingId);assert.equal(context.details.hidden,false);
 assert.match(context.details.innerHTML,/<h2>Memorial Church<\/h2>/);assert.equal(buttons.length,1);assert.equal(buttons[0].id,'church-enter');calls[0]();assert.equal(calls[1],'entered');
});

test('free campus and global search navigation does not reopen a fixed landmarks menu',()=>{
 for(const place of [PLACES[0],PLACES[2],{id:'world-result',name:'Elsewhere',center:[18,59],zoom:12,subtitle:'Search result'}]){
  const flights=[],details={hidden:false},context={details,selectedId:'old',map:{flyTo:value=>flights.push(plain(value))},search:{blur(){}},window:{innerWidth:1600},el:()=>({}),motionDuration:()=>0,setChurchInterior(){},updateSelection(){},closeSearch(){}};
  runInNewContext(`${handler('showCity')}\n${handler('goTo')}\ngoTo(${JSON.stringify(place)});`,context);
  assert.equal(flights.length,1);assert.deepEqual(flights[0].center,place.center);assert.equal(details.hidden,true);assert.equal(context.selectedId,null);
 }
 assert.doesNotMatch(source,/function showCampus\(|function goToChurch\(|id="(?:quad-view|campus-church|sculpture-view|explore-stanford|explore-church|world-overview|view-name)"/);
});

test('contextual building and sculpture cards lead with identity, preserve provenance and close normally',()=>{
 const clicks=[],details={hidden:true,querySelector:()=>({addEventListener:(_,fn)=>clicks.push(fn)})},elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{addEventListener:(_,fn)=>clicks.push(fn)});return elements.get(id);};
 const context={details,selectedId:null,CHURCH_ID:'church',setChurchInterior(){},updateSelection(){},closeDetails:()=>clicks.push('closed'),escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),icon:()=>'',SCULPTURE_PLACES,el:get,goTo:place=>clicks.push(place.id)};
 runInNewContext(`${handler('showBuilding')}\nshowBuilding({id:'other',name:'A < B',height:12,heightSource:'osm-height'});`,context);
 assert.match(details.innerHTML,/<h2>A &lt; B<\/h2>/);assert.ok(details.innerHTML.indexOf('<h2>')<details.innerHTML.indexOf('Mapped height'));assert.match(details.innerHTML,/12 m · Mapped height/);clicks[0]();assert.equal(clicks.at(-1),'closed');
 runInNewContext(`${handler('showSculpture')}\nshowSculpture('${SCULPTURE_PLACES[0].sculptureId}');`,context);
 assert.match(details.innerHTML,/<h2>The Burghers of Calais<\/h2>/);assert.match(details.innerHTML,/Auguste Rodin · Bronze/);assert.match(details.innerHTML,/About this artwork/);assert.match(details.innerHTML,/id="next-sculpture"/);assert.doesNotMatch(details.innerHTML,/sculpture-campus|View the whole campus/);
});
