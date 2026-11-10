import type {CustomRenderMethodInput} from 'maplibre-gl';
import {MERCATOR_ORIGIN,METERS_TO_MERCATOR,projectLocal,type CampusData} from './building-geometry.ts';
import {HOOVER_PART_IDS} from './hoover-architecture.ts';
import {STADIUM_CENTER,STADIUM_CONCOURSE_ID,STADIUM_SEATING_IDS,STADIUM_PRESSBOX_IDS,STADIUM_SCOREBOARD_IDS} from './stadium-architecture.ts';
import {loadCampusElevation,type ElevationGridLoader,type MercatorBounds} from './campus-elevation.ts';

/** Native DEM source is deliberately regional; its attribution is valid for US
 * 3DEP/NED, GMTED/SRTM and NOAA ETOPO1 rather than every global contributor. */
export const BAY_TERRAIN_BOUNDS:[number,number,number,number]=[-123.6,36.7,-121.0,39.0];
export const TERRAIN_SOURCE_ID='bay-area-terrain';
// Pinned stop-control extent plus a 20 m roadside-placement margin. Buildings
// alone omit southern campus roads. The union still uses the same 16 DEM tiles.
export const STOP_CONTROL_BOUNDS:readonly number[]=[-122.1847,37.4153,-122.1551,37.4424];
export const TERRAIN_SIZE=256;
export const MAX_TERRAIN_ANCHORS=16384;
export const MAX_TERRAIN_TEXTURE_BYTES=TERRAIN_SIZE*TERRAIN_SIZE*16+MAX_TERRAIN_ANCHORS*8;
export const TERRAIN_OBJECT_BASE=-1000;
const EMPTY_ANCHORS=new Float32Array();
// Completed CPU data survives mode/style/context replacement; GPU handles never do.
const elevationGrids=new WeakMap<CampusData,Float32Array>();
export function decodeTerrainObjectId(id:number):number|undefined{return Number.isInteger(id)&&id<=TERRAIN_OBJECT_BASE?TERRAIN_OBJECT_BASE-id:undefined;}
export const isTerrainObjectId=(id:number)=>decodeTerrainObjectId(id)!==undefined;
export type RegisterTerrainAnchor=(point:readonly number[])=>number;
export class TerrainAnchorBuilder {
  private values:number[]=[];
  readonly add:RegisterTerrainAnchor=(point)=>{
    if(point.length!==2||!point.every(Number.isFinite)||this.values.length/2>=MAX_TERRAIN_ANCHORS)throw new Error('Campus object terrain anchors exceed their finite bounded input.');
    const id=TERRAIN_OBJECT_BASE-this.values.length/2;this.values.push(point[0],point[1]);return id;
  };
  finish():Float32Array{return new Float32Array(this.values);}
}

/** One unchanged origin for every vertex of a building. Tower/stadium source
 * parts share their assembly datum; church interior uses the same feature ID. */
export function buildingTerrainAnchors(data:CampusData):Float32Array {
  const values=new Float32Array(data.features.length*2);
  let hoover:readonly number[]|undefined;
  for(const feature of data.features)if(HOOVER_PART_IDS.has(String(feature.properties?.id))){
    const rings=feature.geometry.type==='Polygon'?feature.geometry.coordinates:feature.geometry.coordinates.flat();
    const points=rings[0].map(projectLocal),x=points.map(p=>p[0]),y=points.map(p=>p[1]);
    hoover=[(Math.min(...x)+Math.max(...x))/2,(Math.min(...y)+Math.max(...y))/2];break;
  }
  const stadium=projectLocal(STADIUM_CENTER);
  data.features.forEach((feature,i)=>{
    const id=String(feature.properties?.id),polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    const points=polygons.flatMap(p=>p[0].map(projectLocal)),x=points.map(p=>p[0]),y=points.map(p=>p[1]);
    let point:readonly number[]=[(Math.min(...x)+Math.max(...x))/2,(Math.min(...y)+Math.max(...y))/2];
    if(HOOVER_PART_IDS.has(id)&&hoover)point=hoover;
    if(id===STADIUM_CONCOURSE_ID||STADIUM_SEATING_IDS.has(id)||STADIUM_PRESSBOX_IDS.has(id)||STADIUM_SCOREBOARD_IDS.has(id))point=stadium;
    if(!point.every(Number.isFinite))throw new Error('Building terrain anchor has no finite source footprint.');
    values.set(point,i*2);
  });
  return values;
}

export function terrainTextureLayout(buildings:Float32Array,objects:Float32Array=new Float32Array()){
  if(buildings.length%2||objects.length%2||!buildings.every(Number.isFinite)||!objects.every(Number.isFinite))throw new Error('Terrain anchor pairs must be finite.');
  const count=(buildings.length+objects.length)/2;if(count>MAX_TERRAIN_ANCHORS)throw new Error('Terrain anchor lookup exceeds 16,384 objects.');
  const width=Math.min(128,Math.max(1,2**Math.ceil(Math.log2(Math.max(1,Math.ceil(Math.sqrt(count))))))),height=Math.max(1,Math.ceil(count/width));
  const values=new Float32Array(width*height*2);values.set(buildings);values.set(objects,buildings.length);
  return {width,height,values,count,bytes:values.byteLength};
}

/** CPU oracle for the GPU's south-first, alpha-aware bilinear sampling. Null
 * means unavailable DEM; zero remains a valid sea-level elevation. */
export function sampleTerrainGrid(rgba:Float32Array,width:number,height:number,u:number,v:number):number|null{
  if(rgba.length!==width*height*4||u<0||u>1||v<0||v>1)return null;
  const x=u*width-0.5,y=v*height-0.5,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const pixel=(a:number,b:number)=>{const index=(Math.max(0,Math.min(height-1,b))*width+Math.max(0,Math.min(width-1,a)))*4;return rgba[index+3]>=0.999&&Number.isFinite(rgba[index])?rgba[index]:null;};
  const a=pixel(ix,iy),b=pixel(ix+1,iy),c=pixel(ix,iy+1),d=pixel(ix+1,iy+1);
  if(a===null||b===null||c===null||d===null)return null;
  return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
}

/** Local metres -> terrain tile clip space; south-west is (-1,-1). */
export function terrainTileMatrix(z:number,x:number,y:number,wrap=0):Float32Array{
  const size=1/2**z,matrix=new Float32Array(16);matrix[0]=matrix[5]=2*METERS_TO_MERCATOR/size;matrix[15]=1;
  matrix[12]=2*(MERCATOR_ORIGIN[0]+wrap-(x*size+wrap))/size-1;
  matrix[13]=2*((y+1)*size-MERCATOR_ORIGIN[1])/size-1;
  return matrix;
}

export const TERRAIN_VERTEX_HELPERS=`
uniform sampler2D u_terrainHeights;
uniform sampler2D u_terrainAnchors;
uniform vec4 u_terrainBounds;
uniform float u_terrainEnabled;
uniform int u_terrainBuildingCount;
out float v_terrainAvailable;
vec2 terrainAnchor(int index) {
  ivec2 size=textureSize(u_terrainAnchors,0);
  return texelFetch(u_terrainAnchors,ivec2(index%size.x,index/size.x),0).rg;
}
vec2 terrainElevation(vec2 point) {
  vec2 uv=(point-u_terrainBounds.xy)/(u_terrainBounds.zw-u_terrainBounds.xy);
  if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return vec2(0);
  ivec2 size=textureSize(u_terrainHeights,0);
  vec2 cell=uv*vec2(size)-0.5,weight=fract(cell);ivec2 p=ivec2(floor(cell));
  vec4 a=texelFetch(u_terrainHeights,clamp(p,ivec2(0),size-1),0);
  vec4 b=texelFetch(u_terrainHeights,clamp(p+ivec2(1,0),ivec2(0),size-1),0);
  vec4 c=texelFetch(u_terrainHeights,clamp(p+ivec2(0,1),ivec2(0),size-1),0);
  vec4 d=texelFetch(u_terrainHeights,clamp(p+ivec2(1,1),ivec2(0),size-1),0);
  float valid=step(0.999,min(min(a.a,b.a),min(c.a,d.a)));
  return vec2(mix(mix(a.r,b.r,weight.x),mix(c.r,d.r,weight.x),weight.y),valid);
}
vec3 groundPosition(vec3 position,float building) {
  v_terrainAvailable=1.0;if(u_terrainEnabled<0.5)return position;
  vec2 samplePoint=position.xy;
  if(building>=0.0)samplePoint=terrainAnchor(int(building+0.5));
  else if(building<=-1000.0)samplePoint=terrainAnchor(u_terrainBuildingCount+int(-1000.0-building+0.5));
  vec2 elevation=terrainElevation(samplePoint);
  // Ground-contact foundation edges meet the DEM while roofs, windows and all
  // above-ground object parts stay rigid on their shared anchor.
  if(building>=0.0&&position.z<=0.03)elevation=terrainElevation(position.xy);
  v_terrainAvailable=elevation.y;position.z+=elevation.x;return position;
}`;

export class TerrainGrounding {
  private buildings:Float32Array;
  private objects:Float32Array=new Float32Array();
  private heights?:WebGLTexture;
  private anchors?:WebGLTexture;
  private dirty=true;
  private layout=terrainTextureLayout(new Float32Array());
  private bounds:[number,number,number,number];
  private data:CampusData;
  private grid?:Float32Array;
  private request?:AbortController;
  private failure?:Error;
  private changed:()=>void;
  private loadGrid:ElevationGridLoader;
  status:'disabled'|'loading'|'active'='disabled';
  constructor(data:CampusData,changed:()=>void=()=>{},loadGrid:ElevationGridLoader=loadCampusElevation){
    this.data=data;this.changed=changed;this.loadGrid=loadGrid;this.grid=elevationGrids.get(data);
    this.buildings=buildingTerrainAnchors(data);
    const points=data.features.flatMap(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flatMap(p=>p[0].map(projectLocal)));
    points.push(projectLocal(STOP_CONTROL_BOUNDS.slice(0,2)),projectLocal(STOP_CONTROL_BOUNDS.slice(2,4)));
    const x=points.map(p=>p[0]),y=points.map(p=>p[1]);
    this.bounds=points.length?[Math.min(...x)-150,Math.min(...y)-150,Math.max(...x)+150,Math.max(...y)+150]:[-2000,-2000,2000,2000];
    for(let i=0;i<this.buildings.length;i+=2){
      this.bounds[0]=Math.min(this.bounds[0],this.buildings[i]-150);this.bounds[2]=Math.max(this.bounds[2],this.buildings[i]+150);
      this.bounds[1]=Math.min(this.bounds[1],this.buildings[i+1]-150);this.bounds[3]=Math.max(this.bounds[3],this.buildings[i+1]+150);
    }
  }
  get bytes(){return this.heights?TERRAIN_SIZE*TERRAIN_SIZE*16+(this.anchors?this.layout.bytes:0):0;}
  setObjects(values?:Float32Array){
    const next=values??EMPTY_ANCHORS;if(next===this.objects)return;
    if(next.length%2)throw new Error('Campus terrain object anchors must be coordinate pairs.');
    for(let i=0;i<next.length;i+=2)if(!Number.isFinite(next[i])||!Number.isFinite(next[i+1])||next[i]<this.bounds[0]||next[i]>this.bounds[2]||next[i+1]<this.bounds[1]||next[i+1]>this.bounds[3])throw new Error('Campus object anchor lies outside verified elevation coverage.');
    this.objects=next;this.dirty=true;
  }
  prerender(gl:WebGL2RenderingContext,_options:CustomRenderMethodInput,enabled:boolean,_worldOffset=0){
    if(!enabled){this.request?.abort();this.request=undefined;this.status='disabled';return;}
    if(this.failure)throw this.failure;
    const wasActive=this.status==='active';
    this.status='loading';
    if(!this.grid){
      if(!this.request){
        const request=new AbortController();this.request=request;
        const [west,south,east,north]=this.bounds;
        const bounds:MercatorBounds=[MERCATOR_ORIGIN[0]+west*METERS_TO_MERCATOR,MERCATOR_ORIGIN[1]-north*METERS_TO_MERCATOR,MERCATOR_ORIGIN[0]+east*METERS_TO_MERCATOR,MERCATOR_ORIGIN[1]-south*METERS_TO_MERCATOR];
        void this.loadGrid(bounds,TERRAIN_SIZE,request.signal).then(grid=>{
          if(this.request!==request||request.signal.aborted)return;
          if(grid.length!==TERRAIN_SIZE*TERRAIN_SIZE*4)throw new Error('Campus elevation grid has an invalid size.');
          for(let i=0;i<grid.length;i+=4)if(!Number.isFinite(grid[i])||grid[i+3]!==1)throw new Error('Campus elevation grid is incomplete.');
          this.grid=grid;elevationGrids.set(this.data,grid);this.request=undefined;this.changed();
        }).catch(error=>{
          if(this.request!==request||request.signal.aborted)return;
          this.request=undefined;this.failure=new Error(`Campus elevation could not load. Retry terrain and campus detail. ${error instanceof Error?error.message:String(error)}`);this.changed();
        });
      }
      return;
    }
    if(!this.heights){
      this.heights=gl.createTexture()??undefined;if(!this.heights)throw new Error('Terrain height texture could not be allocated.');
      const previous=gl.getParameter(gl.TEXTURE_BINDING_2D);
      try{gl.bindTexture(gl.TEXTURE_2D,this.heights);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,TERRAIN_SIZE,TERRAIN_SIZE,0,gl.RGBA,gl.FLOAT,this.grid);this.textureParameters(gl);}
      finally{gl.bindTexture(gl.TEXTURE_2D,previous);}
    }
    if(this.dirty){
      this.layout=terrainTextureLayout(this.buildings,this.objects);
      this.anchors??=gl.createTexture()??undefined;if(!this.anchors)throw new Error('Terrain object lookup texture could not be allocated.');
      const previous=gl.getParameter(gl.TEXTURE_BINDING_2D);
      try{gl.bindTexture(gl.TEXTURE_2D,this.anchors);gl.texImage2D(gl.TEXTURE_2D,0,gl.RG32F,this.layout.width,this.layout.height,0,gl.RG,gl.FLOAT,this.layout.values);this.textureParameters(gl);}
      finally{gl.bindTexture(gl.TEXTURE_2D,previous);}
      this.dirty=false;
    }
    this.status='active';
    if(!wasActive)this.changed();
  }
  private textureParameters(gl:WebGL2RenderingContext){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  bind(gl:WebGL2RenderingContext,uniforms:Record<string,WebGLUniformLocation|null>):()=>void{
    const enabled=this.status==='active'&&!this.dirty;gl.uniform1f(uniforms.u_terrainEnabled,enabled?1:0);
    if(!enabled)return ()=>{};
    const active=gl.getParameter(gl.ACTIVE_TEXTURE),saved:(WebGLTexture|null)[]=[];
    for(const [unit,texture,name] of [[2,this.heights,'u_terrainHeights'],[3,this.anchors,'u_terrainAnchors']] as const){gl.activeTexture(gl.TEXTURE0+unit);saved.push(gl.getParameter(gl.TEXTURE_BINDING_2D));gl.bindTexture(gl.TEXTURE_2D,texture!);gl.uniform1i(uniforms[name],unit);}
    gl.uniform4f(uniforms.u_terrainBounds,...this.bounds);gl.uniform1i(uniforms.u_terrainBuildingCount,this.buildings.length/2);
    gl.activeTexture(active);
    return ()=>{saved.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+2+i);gl.bindTexture(gl.TEXTURE_2D,texture);});gl.activeTexture(active);};
  }
  dispose(gl:WebGL2RenderingContext){this.request?.abort();this.request=undefined;this.failure=undefined;if(this.heights)gl.deleteTexture(this.heights);if(this.anchors)gl.deleteTexture(this.anchors);this.heights=undefined;this.anchors=undefined;this.dirty=true;this.status='disabled';}
}
