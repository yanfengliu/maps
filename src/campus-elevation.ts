/** Camera-independent sampling of the same public Terrarium DEM as the map.
 * RGB formula and north-first tiles: https://github.com/tilezen/joerd/blob/master/docs/formats.md
 * Attribution remains on the native terrain source. No elevation assets are bundled. */
export type MercatorBounds=readonly [number,number,number,number];
export interface ElevationTile {x:number;y:number;heights:Float32Array}
export type ElevationGridLoader=(bounds:MercatorBounds,size:number,signal:AbortSignal)=>Promise<Float32Array>;
export const ELEVATION_ZOOM=15;
export const ELEVATION_TILE_SIZE=256;
export const MAX_ELEVATION_TILES=16;
export const ELEVATION_CONCURRENCY=3;
export const ELEVATION_TIMEOUT_MS=15_000;
const MAX_PNG_BYTES=512*1024;
export const elevationTileUrl=(x:number,y:number)=>`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ELEVATION_ZOOM}/${x}/${y}.png`;

export function decodeTerrariumPixel(red:number,green:number,blue:number,alpha=255):number|null {
  if(alpha!==255||![red,green,blue].every(value=>Number.isInteger(value)&&value>=0&&value<=255))return null;
  return red*256+green+blue/256-32768;
}

export function decodeTerrariumPixels(rgba:Uint8ClampedArray|Uint8Array):Float32Array {
  if(rgba.length!==ELEVATION_TILE_SIZE*ELEVATION_TILE_SIZE*4)throw new Error('Elevation tile must contain 256 × 256 RGBA pixels.');
  const heights=new Float32Array(rgba.length/4);
  for(let i=0;i<heights.length;i++)heights[i]=rgba[i*4+3]===255?rgba[i*4]*256+rgba[i*4+1]+rgba[i*4+2]/256-32768:NaN;
  return heights;
}

/** Include both neighbours at pixel seams, not just the tiles containing bounds. */
export function elevationTileCoverage(bounds:MercatorBounds):{x:number;y:number}[] {
  const [west,north,east,south]=bounds;
  if(!bounds.every(Number.isFinite)||west<0||north<0||east>1||south>1||west>=east||north>=south)throw new Error('Campus elevation bounds must be finite Mercator coordinates.');
  const scale=2**ELEVATION_ZOOM*ELEVATION_TILE_SIZE,max=2**ELEVATION_ZOOM-1;
  const tile=(pixel:number)=>Math.max(0,Math.min(max,Math.floor(pixel/ELEVATION_TILE_SIZE)));
  const minX=tile(Math.floor(west*scale-.5)),maxX=tile(Math.floor(east*scale-.5)+1);
  const minY=tile(Math.floor(north*scale-.5)),maxY=tile(Math.floor(south*scale-.5)+1);
  const count=(maxX-minX+1)*(maxY-minY+1);
  if(count>MAX_ELEVATION_TILES)throw new Error(`Campus elevation requires ${count} tiles; the verified campus bound permits ${MAX_ELEVATION_TILES}.`);
  const tiles=[];for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)tiles.push({x,y});return tiles;
}

const tileKey=(x:number,y:number)=>y*2**ELEVATION_ZOOM+x;
export function sampleTerrariumTiles(tiles:ReadonlyMap<number,ElevationTile>,x:number,y:number):number|null {
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1||y>1)return null;
  const scale=2**ELEVATION_ZOOM*ELEVATION_TILE_SIZE,px=x*scale-.5,py=y*scale-.5;
  const ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
  const pixel=(column:number,row:number)=>{
    column=Math.max(0,Math.min(scale-1,column));row=Math.max(0,Math.min(scale-1,row));
    const tile=tiles.get(tileKey(Math.floor(column/ELEVATION_TILE_SIZE),Math.floor(row/ELEVATION_TILE_SIZE)));
    const height=tile?.heights[(row%ELEVATION_TILE_SIZE)*ELEVATION_TILE_SIZE+column%ELEVATION_TILE_SIZE];
    return height!==undefined&&Number.isFinite(height)?height:null;
  };
  const a=pixel(ix,iy),b=pixel(ix+1,iy),c=pixel(ix,iy+1),d=pixel(ix+1,iy+1);
  if(a===null||b===null||c===null||d===null)return null;
  return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
}

const yieldTask=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
/** One south-first RGBA32F grid, with alpha indicating actual DEM coverage.
 * Scratch is at most 16 decoded 256² float tiles (4 MiB), then released. */
export async function resampleElevationGrid(bounds:MercatorBounds,size:number,tiles:readonly ElevationTile[],signal:AbortSignal,yieldRows:()=>Promise<void>=yieldTask):Promise<Float32Array> {
  if(!Number.isInteger(size)||size<1||size>256)throw new Error('Campus elevation grid must be at most 256 × 256.');
  const required=elevationTileCoverage(bounds),lookup=new Map<number,ElevationTile>();
  for(const tile of tiles){
    if(tile.heights.length!==ELEVATION_TILE_SIZE**2||lookup.has(tileKey(tile.x,tile.y)))throw new Error('Elevation tiles must be complete and unique.');
    lookup.set(tileKey(tile.x,tile.y),tile);
  }
  if(tiles.length!==required.length||required.some(t=>!lookup.has(tileKey(t.x,t.y))))throw new Error('Campus elevation tile coverage is incomplete.');
  const result=new Float32Array(size*size*4),[west,north,east,south]=bounds;
  for(let row=0;row<size;row++){
    signal.throwIfAborted();const y=south-(row+.5)/size*(south-north);
    for(let column=0;column<size;column++){
      const value=sampleTerrariumTiles(lookup,west+(column+.5)/size*(east-west),y),offset=(row*size+column)*4;
      if(value!==null){result[offset]=value;result[offset+3]=1;}
    }
    if(row%16===15)await yieldRows();
  }
  signal.throwIfAborted();return result;
}

export async function decodeElevationPng(blob:Blob,signal:AbortSignal):Promise<Float32Array> {
  signal.throwIfAborted();
  const bitmap=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  try{
    signal.throwIfAborted();
    if(bitmap.width!==ELEVATION_TILE_SIZE||bitmap.height!==ELEVATION_TILE_SIZE)throw new Error('Elevation PNG dimensions differ from 256 × 256.');
    const canvas=new OffscreenCanvas(ELEVATION_TILE_SIZE,ELEVATION_TILE_SIZE);
    try{
      const context=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});
      if(!context)throw new Error('Elevation PNG decoding needs an OffscreenCanvas 2D context.');
      context.imageSmoothingEnabled=false;context.globalCompositeOperation='copy';context.drawImage(bitmap,0,0);
      const pixels=context.getImageData(0,0,ELEVATION_TILE_SIZE,ELEVATION_TILE_SIZE,{colorSpace:'srgb'}).data;
      signal.throwIfAborted();return decodeTerrariumPixels(pixels);
    }finally{canvas.width=0;canvas.height=0;}
  }finally{bitmap.close();}
}

interface LoadOptions {
  fetcher?:typeof fetch;
  decode?:(blob:Blob,signal:AbortSignal)=>Promise<Float32Array>;
  timeoutMs?:number;
  yieldRows?:()=>Promise<void>;
}
/** At most three tile requests/decodes run concurrently. Failure cancels siblings;
 * awaiting all workers ensures no bitmap, request or rejected promise escapes. */
export async function loadCampusElevation(bounds:MercatorBounds,size:number,signal:AbortSignal,options:LoadOptions={}):Promise<Float32Array> {
  const coverage=elevationTileCoverage(bounds),tiles:ElevationTile[]=[],cancel=new AbortController();
  const combined=AbortSignal.any([signal,cancel.signal]),fetcher=options.fetcher??((url,init)=>fetch(url,init)),decode=options.decode??decodeElevationPng;
  let next=0,firstError:unknown;
  const worker=async()=>{
    while(next<coverage.length){
      combined.throwIfAborted();const {x,y}=coverage[next++],timeout=new AbortController();
      const timer=setTimeout(()=>timeout.abort(new Error('Elevation tile request timed out.')),options.timeoutMs??ELEVATION_TIMEOUT_MS);
      const tileSignal=AbortSignal.any([combined,timeout.signal]);
      try{
        const response=await fetcher(elevationTileUrl(x,y),{signal:tileSignal});tileSignal.throwIfAborted();
        if(!response.ok)throw new Error(`Elevation tile ${x}/${y} returned HTTP ${response.status}.`);
        const length=Number(response.headers.get('content-length')??0);
        if(length>MAX_PNG_BYTES)throw new Error('Elevation PNG exceeds its download bound.');
        const blob=await response.blob();tileSignal.throwIfAborted();
        if(blob.size>MAX_PNG_BYTES)throw new Error('Elevation PNG exceeds its download bound.');
        const heights=await decode(blob,tileSignal);tileSignal.throwIfAborted();
        if(heights.length!==ELEVATION_TILE_SIZE**2)throw new Error('Decoded elevation tile has an invalid size.');
        tiles.push({x,y,heights});
      }catch(error){firstError??=error;cancel.abort(error);throw error;}
      finally{clearTimeout(timer);}
    }
  };
  try{
    await Promise.allSettled(Array.from({length:Math.min(ELEVATION_CONCURRENCY,coverage.length)},worker));
    if(firstError)throw firstError;combined.throwIfAborted();
    const grid=await resampleElevationGrid(bounds,size,tiles,combined,options.yieldRows);
    // Missing source pixels are not zero-height ground. Keep fallback buildings
    // and surface an actionable error instead of publishing an incomplete grid.
    for(let i=3;i<grid.length;i+=4)if(grid[i]!==1)throw new Error('Campus elevation contains missing DEM samples.');
    return grid;
  }finally{cancel.abort();tiles.length=0;}
}
