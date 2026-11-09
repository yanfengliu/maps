import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTerrariumPixel,decodeTerrariumPixels,elevationTileCoverage,sampleTerrariumTiles,resampleElevationGrid,decodeElevationPng,loadCampusElevation,ELEVATION_ZOOM,ELEVATION_TILE_SIZE,ELEVATION_CONCURRENCY} from '../src/campus-elevation.ts';
const count=2**ELEVATION_ZOOM,scale=count*256,cell=1/scale;
const seam=[5264/count,12705/count],bounds=[seam[0]-cell/4,seam[1]-cell/4,seam[0]+cell/4,seam[1]+cell/4];
const key=(x,y)=>y*count+x;
const tilesFor=(area,fn)=>elevationTileCoverage(area).map(({x,y})=>({x,y,heights:Float32Array.from({length:256**2},(_,i)=>fn(x*256+i%256,y*256+Math.floor(i/256)))}));
const response=()=>({ok:true,status:200,headers:new Headers({'content-type':'image/png'}),blob:async()=>new Blob(['fixture'])});

test('Terrarium preserves fractional, zero and negative elevations and explicit missing alpha',()=>{
 assert.equal(decodeTerrariumPixel(128,0,0),0);assert.equal(decodeTerrariumPixel(127,255,128),-.5);assert.equal(decodeTerrariumPixel(137,219,68),2523.265625);
 for(const values of [[128,0,0,0],[128,0,0,254],[NaN,0,0,255],[256,0,0,255]])assert.equal(decodeTerrariumPixel(...values),null);
 const pixels=new Uint8ClampedArray(256**2*4);pixels.set([128,0,0,255,127,255,128,255,128,0,0,0]);
 const decoded=decodeTerrariumPixels(pixels);assert.equal(decoded[0],0);assert.equal(decoded[1],-.5);assert.ok(Number.isNaN(decoded[2]));assert.throws(()=>decodeTerrariumPixels(new Uint8Array(4)),/256/);
});

test('bilinear interpolation crosses all four source tile seams without clamping to a neighbouring edge',()=>{
 const tiles=tilesFor(bounds,(x,y)=>(x-seam[0]*scale)*2+(y-seam[1]*scale)*3),lookup=new Map(tiles.map(t=>[key(t.x,t.y),t]));
 assert.equal(tiles.length,4);assert.equal(sampleTerrariumTiles(lookup,...seam),-2.5);
 assert.ok(Math.abs(sampleTerrariumTiles(lookup,seam[0]+cell*.2,seam[1]-cell*.1)-(-2.4))<1e-6);
 lookup.delete(key(5263,12704));assert.equal(sampleTerrariumTiles(lookup,...seam),null);
 assert.equal(sampleTerrariumTiles(lookup,NaN,0),null);
 assert.throws(()=>elevationTileCoverage([0,0,1,1]),/verified campus bound/);assert.throws(()=>elevationTileCoverage([0,0,NaN,1]),/finite/);
});

test('the full grid is south-first, finite and alpha-aware; missing coverage never becomes sea level',async()=>{
 const tiles=tilesFor(bounds,(x,y)=>(y-seam[1]*scale)*4),signal=new AbortController().signal;
 const grid=await resampleElevationGrid(bounds,4,tiles,signal);
 assert.ok(grid[0]>grid[4*4*3],'south row has larger north-first source y than north row');
 for(let i=3;i<grid.length;i+=4)assert.equal(grid[i],1);
 const bad=tiles.map(t=>({...t,heights:new Float32Array(t.heights)}));bad[0].heights.fill(NaN);
 const missing=await resampleElevationGrid(bounds,4,bad,signal);assert.ok([...missing].some((v,i)=>i%4===3&&v===0));
 await assert.rejects(resampleElevationGrid(bounds,4,tiles.slice(1),signal),/incomplete/);
 const aborted=new AbortController();aborted.abort();await assert.rejects(resampleElevationGrid(bounds,4,tiles,aborted.signal),{name:'AbortError'});
});

test('loading has bounded concurrency and complete coverage, then releases workers before returning',async()=>{
 let active=0,peak=0,requests=0,decodes=0;
 const grid=await loadCampusElevation(bounds,256,new AbortController().signal,{
  fetcher:async(url,{signal})=>{assert.match(String(url),/terrarium\/15\/526[34]\/1270[45]\.png$/);assert.equal(signal.aborted,false);requests++;active++;peak=Math.max(peak,active);await new Promise(r=>setImmediate(r));return response();},
  decode:async()=>{decodes++;active--;return new Float32Array(256**2).fill(17);},yieldRows:async()=>{}
 });
 assert.equal(requests,4);assert.equal(decodes,4);assert.equal(peak,ELEVATION_CONCURRENCY);assert.equal(active,0);assert.equal(grid.byteLength,1024*1024);
 for(let i=0;i<grid.length;i+=4){assert.equal(grid[i],17);assert.equal(grid[i+3],1);}
});

test('HTTP failure cancels sibling work; timeout, caller abort and missing samples remain retryable errors',async()=>{
 let calls=0,aborted=0;
 await assert.rejects(loadCampusElevation(bounds,2,new AbortController().signal,{fetcher:async(_url,{signal})=>{
  if(++calls===1)return {...response(),ok:false,status:503};
  return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted++;reject(signal.reason);},{once:true}));
 }}),/503/);assert.equal(aborted,2);
 const pending=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 await assert.rejects(loadCampusElevation(bounds,2,new AbortController().signal,{fetcher:pending,timeoutMs:5}),/timed out/);
 const controller=new AbortController(),promise=loadCampusElevation(bounds,2,controller.signal,{fetcher:pending});controller.abort();await assert.rejects(promise,{name:'AbortError'});
 await assert.rejects(loadCampusElevation(bounds,2,new AbortController().signal,{fetcher:async()=>response(),decode:async()=>new Float32Array(256**2).fill(NaN)}),/missing DEM/);
 const retry=await loadCampusElevation(bounds,2,new AbortController().signal,{fetcher:async()=>response(),decode:async()=>new Float32Array(256**2)});assert.equal(retry[0],0);assert.equal(retry[3],1);
});

test('PNG decode disables colour conversion and closes its bitmap and canvas on success or cancellation',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldCanvas=globalThis.OffscreenCanvas,bitmaps=[],canvases=[],pixels=new Uint8ClampedArray(256**2*4);
 for(let i=0;i<pixels.length;i+=4)pixels.set([127,255,128,255],i);
 let onDecode=()=>{};
 globalThis.createImageBitmap=async(_blob,options)=>{assert.deepEqual(options,{colorSpaceConversion:'none',premultiplyAlpha:'none'});const bitmap={width:256,height:256,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);onDecode();return bitmap;};
 globalThis.OffscreenCanvas=class {constructor(width,height){this.width=width;this.height=height;canvases.push(this);}getContext(kind,options){assert.equal(kind,'2d');assert.equal(options.colorSpace,'srgb');return {drawImage(){},getImageData:()=>({data:pixels})};}};
 try{
  const data=await decodeElevationPng(new Blob(['fixture']),new AbortController().signal);assert.equal(data[0],-.5);assert.ok(bitmaps[0].closed);assert.equal(canvases[0].width,0);assert.equal(canvases[0].height,0);
  const abort=new AbortController();onDecode=()=>abort.abort();await assert.rejects(decodeElevationPng(new Blob(),abort.signal),{name:'AbortError'});assert.ok(bitmaps[1].closed);
 }finally{if(oldBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldBitmap;if(oldCanvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=oldCanvas;}
});
