import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal,VERTEX_FLOATS as S} from '../src/building-geometry.ts';
import {hospitalSurfacePicker} from '../src/hospital-picking.ts';
import {AVERY_ID,BAND_SHAK_ID} from '../src/avery-architecture.ts';
import {AVERY_REFERENCES} from '../tools/quality/avery-refs.mjs';

const all=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const parent=all.features.find(f=>f.properties.id===AVERY_ID),child=all.features.find(f=>f.properties.id===BAND_SHAK_ID);
const prepared=prepareBuildingDetails({type:'FeatureCollection',features:[parent,child]});
const [apron,band]=prepared.features;
const geometry=buildBuildingGeometry(prepared);
const ring=f=>f.geometry.coordinates[0].slice(0,-1).map(projectLocal);
const area=points=>Math.abs(points.reduce((sum,[x,y],i)=>{const [a,b]=points[(i+1)%points.length];return sum+x*b-y*a;},0)/2);
const inside=([x,y],points)=>points.reduce((yes,[a,b],i)=>{
  const [c,d]=points[(i+1)%points.length];
  return (b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a?!yes:yes;
},false);
const origin=projectLocal([-122.161408,37.431119]),end=projectLocal([-122.160964,37.430730]);
const dx=end[0]-origin[0],dy=end[1]-origin[1],length=Math.hypot(dx,dy);
const point=(across,along)=>[origin[0]+(-dy*across+dx*along)/length,origin[1]+(dx*across+dy*along)/length];
const across=([x,y])=>(-dy*(x-origin[0])+dx*(y-origin[1]))/length;
const vertices=[];
for(let i=0;i<geometry.roofs.length;i+=S)if(geometry.roofs[i+12]===0)vertices.push([...geometry.roofs.slice(i,i+S)]);

test('Avery’s native dry apron partitions the original footprint exactly from the separate two-level Band Shak',()=>{
  const original=ring(parent),dry=ring(apron),club=ring(child);
  assert.equal(band.geometry,child.geometry);
  assert.ok(Math.abs(area(original)-area(dry)-area(club))<.00001);
  assert.ok(inside(point(32,-6),original)&&inside(point(32,-6),club)&&!inside(point(32,-6),dry));
  assert.ok(inside(point(32,5),dry)&&!inside(point(32,5),club));
  for(const u of [22,32,42])for(const v of [12,27,43])assert.ok(!inside(point(u,v),dry)&&!inside(point(u,v),club),'the original water gap stays open');
  assert.deepEqual([apron.properties.detailWallHeight,apron.properties.height,band.properties.height],[.15,10,6]);
  assert.equal(apron.properties.detailArchitecture.floors,null);
  assert.equal(band.properties.detailArchitecture.floorSource,'osm-levels');
  assert.deepEqual(AVERY_REFERENCES.map(r=>[r.ids[0],r.expected.roofShape]),[[AVERY_ID,'fabric-canopies'],[BAND_SHAK_ID,'flat']]);
});

test('both registered arm strips contain stepped seats, open air beneath scalloped membranes, and upward-facing fabric normals',()=>{
  const dry=ring(apron),club=ring(child);
  const halves=[[],[]];
  for(let i=0;i<vertices.length;i+=3){
    const tri=vertices.slice(i,i+3),u=across(tri[0]);
    const half=u<20?0:1;
    assert.ok(tri.every(v=>(half===0?across(v)<17.3:across(v)>47.4)&&inside(v,dry)&&!inside(v,club)),'a single stand triangle must not bridge the basin or spill onto the clubhouse');
    assert.ok(tri.every(v=>v[2]>=0&&v[2]<=parent.properties.height&&v[11]===2),'no generic window or roof material on either stand');
    halves[half].push(...tri);
  }
  for(const side of halves){
    const color=r=>side.filter(v=>Math.round(v[6]*100)===r);
    const seats=color(68),fabric=color(94),supports=color(63);
    assert.equal(new Set(seats.map(v=>v[2].toFixed(2))).size,9);
    assert.ok(seats.every(v=>v[5]>.99));
    assert.ok(fabric.every(v=>v[2]>8&&v[5]>.8));
    assert.ok(Math.abs(Math.max(...fabric.map(v=>v[2]))-9.65)<.001);
    assert.ok(Math.abs(Math.min(...fabric.map(v=>v[2]))-8.08)<.001);
    assert.ok(Math.min(...fabric.map(v=>v[2]))-Math.max(...seats.map(v=>v[2]))>2.7);
    const leading=fabric.filter(v=>Math.abs(across(v)-(side===halves[0]?15.3:49.4))<.001);
    assert.equal(new Set(leading.filter(v=>Math.abs(v[2]-9.65)<.001).map(v=>v[0])).size,5,'five ribs delimit four spans');
    assert.equal(new Set(leading.filter(v=>Math.abs(v[2]-8.08)<.001).map(v=>v[0])).size,4,'one sag between each pair of ribs');
    assert.ok(supports.some(v=>v[2]<4.3)&&supports.some(v=>v[2]>8.5));
  }
});

test('mesh picking reaches either canopy while the ground, pool and Band Shak retain their own hit results',()=>{
  const picker=hospitalSurfacePicker(prepared,geometry.roofs,geometry.facades);
  const matrix=new Float32Array([.001,0,0,0,0,.001,0,0,0,0,-.001,0,0,0,0,1]);
  const visible=f=>({properties:f.properties,geometry:f.geometry,layer:{id:'stanford-buildings',type:'fill-extrusion',
    paint:{'fill-extrusion-base':0,'fill-extrusion-height':f.properties.detailWallHeight}}});
  const query=(u,v,hits=[])=>picker(point(u,v).map((value,i)=>value*matrix[i?5:0]),matrix,()=>0,()=>0,hits);
  for(const u of [10,55])assert.equal(query(u,20),AVERY_ID,'the exact canopy wins even with no native candidate');
  assert.equal(query(32,5,[visible(apron)]),AVERY_ID);
  assert.equal(query(32,-6,[visible(band)]),BAND_SHAK_ID);
  for(const u of [23,32,41])for(const v of [13,28,42])assert.equal(query(u,v),null);
  assert.equal(query(70,28),null);
});
