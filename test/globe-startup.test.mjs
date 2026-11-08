import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createStyle} from '../src/style.ts';
import {PLACES,MAX_MAP_ZOOM} from '../src/places.ts';

const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8').replaceAll('\r\n','\n');
const handler=name=>stripTypeScriptTypes(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0]??'');
const plain=value=>JSON.parse(JSON.stringify(value));

test('initial camera opens on Stanford before the globe style requests tiles, without an overview flight',()=>{
  const calls=[];let options;
  class MapHost{
    constructor(value){options=plain(value);calls.push('construct');}
    getCanvas(){return {setAttribute(){},addEventListener(){}};}
    addControl(){} on(){} setPadding(){calls.push('padding');}
    setStyle(style){assert.equal(style.projection.type,'globe');calls.push('style');}
  }
  const context={map:undefined,maplibregl:{Map:MapHost,AttributionControl:class{},ScaleControl:class{}},PLACES,MAX_MAP_ZOOM,reducedMotion:{matches:false},enableMiddleMouseTilt(){},enableHeldKeyboardPan(){},panelPadding:()=>({}),updateCameraUi:()=>calls.push('ui'),overview:()=>calls.push('overview'),scheduleLoadDeadline(){},loadCampus:()=>calls.push('campus'),createStyle,addCampusLayers(){},showError:message=>assert.fail(message)};
  runInNewContext(`${handler('startMap')}\nstartMap();`,context);
  assert.deepEqual(options.center,PLACES[0].center);assert.equal(options.zoom,PLACES[0].zoom);
  assert.equal(options.pitch,58);assert.equal(options.bearing,-28);assert.equal(options.maxBounds,undefined);
  assert.deepEqual(calls,['construct','padding','ui','style','campus']);
  assert.match(source,/id="view-name">STANFORD UNIVERSITY · 3D CAMPUS</);
  assert.equal(createStyle().projection.type,'globe','every recreated style retains the globe');
});

test('building cards omit the campus return action while keeping church interior entry',()=>{
  for(const church of [false,true]){
    const buttons=[],listeners=[];const details={hidden:true,querySelector:()=>({addEventListener(){}}),append:button=>buttons.push(button)};
    const context={details,selectedId:null,CHURCH_ID:'church',setChurchInterior(){},updateSelection(){},closeDetails(){},enterChurchInterior(){},escapeHtml:String,icon:()=>'',document:{createElement:()=>({addEventListener:name=>listeners.push(name)})},el:()=>assert.fail('removed campus button must never be accessed')};
    runInNewContext(`${handler('showBuilding')}\nshowBuilding({id:'${church?'church':'other'}',name:'Building',height:12});`,context);
    assert.doesNotMatch(details.innerHTML,/building-campus|View the whole campus/);
    assert.equal(details.hidden,false);assert.equal(buttons.length,church?1:0);
    if(church){assert.equal(buttons[0].id,'church-enter');assert.match(buttons[0].innerHTML,/Explore the interior/);assert.deepEqual(listeners,['click']);}
  }
});


test('World overview frames the globe within desktop and phone viewports without regional bounds',()=>{
  const zooms=[];
  for(const [width,height] of [[1600,1100],[1056,1013],[390,844],[320,568]]){
    const flights=[],context={window:{innerWidth:width,innerHeight:height},map:{flyTo:value=>flights.push(plain(value))},search:{value:'Stanford',blur(){}},el:()=>({}),closeSearch(){},panelPadding:()=>({}),motionDuration:value=>value,closeDetails(){}};
    runInNewContext(`${handler('overview')}\noverview(false);`,context);
    assert.equal(flights.length,1);const camera=flights[0];assert.deepEqual(camera.center,[0,20]);assert.equal(camera.pitch,0);assert.equal(camera.bearing,0);assert.equal(camera.duration,0);assert.ok(Number.isFinite(camera.zoom)&&camera.zoom>=0&&camera.zoom<3);
    zooms.push(camera.zoom);
  }
  assert.ok(zooms[0]>zooms[2]&&zooms[2]>zooms[3],'smaller screens need a wider globe view');
});
