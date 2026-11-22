import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {PLACES,SCULPTURE_PLACES,buildingPlaces,searchPlaces} from '../src/places.ts';

import {CANTOR_ID,hospitalVisitorMap} from '../src/visitor-maps.ts';
import {GALLERY_FLOORS} from '../src/cantor-gallery-plan.ts';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
const handler=name=>stripTypeScriptTypes(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0]??'');
const plain=value=>JSON.parse(JSON.stringify(value));

test('search and selected footprints expose their own official visitor resources',()=>{
  const buildings=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))).features;
  const places=buildingPlaces(buildings);
  assert.equal(searchPlaces('Green Library East Wing',places)[0].buildingId,'way/232805660');
  const adultMaps='https://stanfordhealthcare.org/content/dam/SHC/patientsandvisitors/locations-parking/docs/';
  const packardMap='https://www.stanfordchildrens.org/content/dam/sch/content-public/pdf/wayfinding-maps-stanford-childrens.pdf';
  const cases=[
    ['300 Pasteur','relation/1753562',adultMaps+'stanford-hospital-map.pdf'],
    ['500 Pasteur','way/891732466',adultMaps+'500-Pasteur-11-15-19.pdf'],
    ["Packard Children's Hospital West",'way/130100416',packardMap],
    ["Packard Children's Hospital Main",'way/689417360',packardMap]
  ];
  for(const [term,id,url] of cases){
    assert.equal(searchPlaces(term,places)[0].buildingId,id);
    const actions=[],details={querySelector:()=>null,append:action=>actions.push(action)};
    const context={details,selectedId:null,CHURCH_ID:'church',CANTOR_ID,hospitalVisitorMap,setChurchInterior(){},updateSelection(){},escapeHtml:String,icon:()=>'',document:{createElement:tag=>({tag})}};
    runInNewContext(`${handler('showBuilding')}\nshowBuilding(${JSON.stringify(buildings.find(f=>f.properties.id===id).properties)})`,context);
    assert.equal(actions.length,1);assert.equal(actions[0].tag,'a');assert.equal(actions[0].href,url);assert.match(actions[0].textContent,/Visitor map/);
  }
});

test('Cantor floors contain the distinct public spaces in the published drawing',()=>{
  let action;
  const context={details:{querySelector:()=>null,append:button=>{action=button;}},selectedId:null,CHURCH_ID:'church',CANTOR_ID,hospitalVisitorMap,setChurchInterior(){},updateSelection(){},escapeHtml:String,icon:()=>'',openCantorGalleryPlan(){},document:{createElement:()=>({addEventListener(name,listener){this[name]=listener;}})}};
  runInNewContext(`${handler('showBuilding')}\nshowBuilding({id:CANTOR_ID,name:'Cantor Arts Center'})`,context);
  assert.equal(action.textContent,'Explore gallery floors');assert.equal(action.click,context.openCantorGalleryPlan);
  const first=GALLERY_FLOORS[0],second=GALLERY_FLOORS[1];
  assert.deepEqual(second.filter(room=>[206,207,212].includes(room.number)).map(room=>[room.number,room.name]),[
    [206,'Ancient, Medieval & Early Modern European Art'],
    [207,'Artist Archive Room · Patricia S. Rebele Gallery'],
    [212,'Artist Archive Room · Rowland K. Rebele Gallery']
  ]);
  assert.deepEqual(first.map(s=>s.number),[101,105,106,108,111,117,121,122,125,127,128,132,134,141,142,151]);
  assert.deepEqual(second.map(s=>s.number),[201,205,206,207,208,210,211,212,213,214,218,220,221,242]);
  for(const [lower,upper] of [[101,201],[132,218],[151,242]]){
    assert.equal(first.find(s=>s.number===lower).outline,second.find(s=>s.number===upper).outline);
  }
  const [west,east]=[132,101].map(id=>first.find(s=>s.number===id));
  assert.ok(west.label[0]<first.find(s=>s.number===117).label[0] && east.label[0]>first.find(s=>s.number===122).label[0]);
  assert.match(second.find(s=>s.number===208).name,/Balcony/);
});

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
 const context={details,selectedId:null,CHURCH_ID:'church',CANTOR_ID,hospitalVisitorMap,setChurchInterior(){},updateSelection(){},closeDetails:()=>clicks.push('closed'),escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),icon:()=>'',SCULPTURE_PLACES,el:get,goTo:place=>clicks.push(place.id)};
 runInNewContext(`${handler('showBuilding')}\nshowBuilding({id:'other',name:'A < B',height:12,heightSource:'osm-height'});`,context);
 assert.match(details.innerHTML,/<h2>A &lt; B<\/h2>/);assert.ok(details.innerHTML.indexOf('<h2>')<details.innerHTML.indexOf('Mapped height'));assert.match(details.innerHTML,/12 m · Mapped height/);clicks[0]();assert.equal(clicks.at(-1),'closed');
 runInNewContext(`${handler('showSculpture')}\nshowSculpture('${SCULPTURE_PLACES[0].sculptureId}');`,context);
 assert.match(details.innerHTML,/<h2>The Burghers of Calais<\/h2>/);assert.match(details.innerHTML,/Auguste Rodin · Bronze/);assert.match(details.innerHTML,/About this artwork/);assert.match(details.innerHTML,/id="next-sculpture"/);assert.doesNotMatch(details.innerHTML,/sculpture-campus|View the whole campus/);
});

test('selection shows the former-site notice on historic footprints and omits it for current sites',async()=>{
  const {prepareBuildingDetails}=await import('../src/building-geometry.ts');
  const raw=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
  const parts=prepareBuildingDetails(raw).features;
  const former=parts.filter(f=>f.properties.detailHistoricNotice);
  assert.equal(former.length,5);
  for(const f of [...former,parts.find(f=>f.properties.id==='way/31711531')]){
    const notes=[];
    const context={part:f.properties,selectedId:null,CHURCH_ID:'church',CANTOR_ID,hospitalVisitorMap,
      updateSelection(){},setChurchInterior(){},escapeHtml:String,icon:()=>'',
      document:{createElement:()=>({})},details:{querySelector:()=>null,append:el=>notes.push(el.textContent)}};
    runInNewContext(handler('showBuilding')+'\nshowBuilding(part)',context);
    assert.deepEqual(notes,f.properties.detailHistoricNotice?[f.properties.detailHistoricNotice]:[]);
  }
});
