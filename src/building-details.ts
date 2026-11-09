import {LANDSCAPE_HELPERS,LANDSCAPE_FRAGMENT} from './campus-landscape-materials.ts';
import {emptyLandscapeCounts,type LandscapeCounts} from './campus-landscape.ts';
import {ROOF_TILE_FRAGMENT} from './roof-materials.ts';
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from 'maplibre-gl';
import { DETAIL_ORIGIN, MERCATOR_ORIGIN, METERS_TO_MERCATOR, VERTEX_FLOATS, projectLocal, type CampusData, type DetailGeometry } from './building-geometry.ts';
import { STADIUM_FIELD_HELPERS, STADIUM_FIELD_FRAGMENT } from './stadium-materials.ts';
import { STADIUM_ELEVATION_FRAGMENT } from './stadium-elevation.ts';
import { GARAGE_FRAGMENT } from './garage-materials.ts';
import { ENGINEERING_FRAGMENT } from './engineering-materials.ts';
import { HOOVER_FRAGMENT } from './hoover-materials.ts';
import { SURFACE_FRAGMENT } from './campus-surface-materials.ts';
import { emptySurfaceCounts, type SurfaceCounts } from './campus-surfaces.ts';
import { GPU_VERTEX_BYTES, MAX_GPU_GEOMETRY_BYTES, gpuGeometryBytes, packGpuVertices } from './gpu-geometry.ts';
import { emptyEnvironmentCounts, type EnvironmentCounts } from './campus-environment.ts';
import { emptySculptureCounts, type SculptureCounts } from './campus-sculptures.ts';
import { ChurchTextures } from './church-textures.ts';
import { churchAxes, churchWallMask } from './church-cutaway.ts';
import {TerrainGrounding,TERRAIN_VERTEX_HELPERS,terrainTileMatrix} from './terrain-grounding.ts';
import type {ElevationGridLoader} from './campus-elevation.ts';
export { prepareBuildingDetails } from './building-geometry.ts';

export interface BuildingDetailStats {
  mode: 'campus' | 'church-interior';
  ceiling: boolean;
  ready: boolean;
  buildingCount: number;
  roofTriangles: number;
  facadeTriangles: number;
  triangles: number;
  bytes: number;
  textureBytes: number;
  terrainTextureBytes:number;
  terrainStatus:'disabled'|'loading'|'active';
  terrainOffscreenDrawCalls:number;
  environment: EnvironmentCounts;
  sculptures: SculptureCounts;
  surfaces: SurfaceCounts;
  landscape: LandscapeCounts;
  /** CPU geometry generation runs in the dedicated worker. */
  buildMs: number;
  /** Longest observed main-thread shader, upload, or ceiling-sort slice. */
  maxSliceMs: number;
  shaderReady: boolean;
  /** Asynchronous compiler wall time; not a main-thread blocking duration. */
  compileMs: number;
  uploadMs: number;
  uploadSlices:number;
  uploadWallMs:number;
  drawCalls: number;
  lastDrawDetail: 'none' | 'roofs' | 'facades';
  error: string | null;
}

export interface BuildingDetailsLayer extends CustomLayerInterface {
  /** Add immediately before this layer; remove/recreate it with this layer.
   * It shares the two geometry buffers and paints only ground into native DEM tiles. */
  readonly groundLayer:CustomLayerInterface;
  setSelected(id: string | null): void;
  setInterior(enabled: boolean): void;
  setCeiling(visible: boolean): void;
  readonly stats: Readonly<BuildingDetailStats>;
}

const cachedGeometry = new WeakMap<CampusData, { geometry: DetailGeometry; buildMs: number }>();
const cachedInterior = new WeakMap<CampusData, { geometry: DetailGeometry; buildMs: number }>();
const SHADER_APPROACH_ZOOM = 12;
const vertexShader = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec3 a_color;
layout(location=3) in vec2 a_uv;
layout(location=4) in float a_kind;
layout(location=5) in float a_building;
uniform mat4 u_matrix;
uniform float u_selected;
uniform vec2 u_sideWalls;
uniform vec2 u_endWalls;
out vec3 v_color;
out vec2 v_uv;
out vec2 v_position;
flat out float v_kind;
flat out float v_wallVisible;
flat out float v_groundSurface;
uniform float u_groundPass;
${TERRAIN_VERTEX_HELPERS}
void main() {
  float material=mod(a_kind,100.0);
  v_groundSurface=(abs(a_building+5.0)<0.1||(abs(a_building+4.0)<0.1&&material<64.5))?1.0:0.0;
  vec3 position=u_groundPass>0.5?vec3(a_position.xy,0.0):groundPosition(a_position,a_building);
  if(u_groundPass>0.5)v_terrainAvailable=1.0;
  gl_Position=u_groundPass>0.5&&v_groundSurface<0.5?vec4(2,2,2,1):u_matrix*vec4(position,1.0);
  float illumination = 0.72 + 0.28 * abs(dot(normalize(a_normal), normalize(vec3(-0.45,0.6,0.85))));
  vec3 tint = abs(a_building - u_selected) < 0.1 ? mix(a_color, vec3(0.90,0.65,0.35),0.18) : a_color;
  v_color = tint * illumination;
  v_uv = a_uv;
  float wall = floor(a_kind / 100.0);
  v_kind = mod(a_kind,100.0);
  v_wallVisible = wall < 0.5 ? 1.0 : wall < 1.5 ? u_sideWalls.x : wall < 2.5 ? u_sideWalls.y : wall < 3.5 ? u_endWalls.x : u_endWalls.y;
  v_position = a_position.xy;
}`;
const fragmentShader = `#version 300 es
precision highp float;
in vec3 v_color;
in vec2 v_uv;
in vec2 v_position;
flat in float v_kind;
flat in float v_wallVisible;
flat in float v_groundSurface;
in float v_terrainAvailable;
uniform float u_groundPass;
uniform float u_drapeGround;
uniform vec2 u_focus;
uniform float u_radius;
uniform sampler2D u_nave;
uniform sampler2D u_chancel;
uniform float u_ceiling;
out vec4 outColor;
${STADIUM_FIELD_HELPERS}
${LANDSCAPE_HELPERS}
void main() {
  if(u_groundPass>0.5?v_groundSurface<0.5:(u_drapeGround>0.5&&v_groundSurface>0.5))discard;
  if(v_terrainAvailable<0.999)discard;
  if (v_wallVisible < 0.5) discard;
  bool ceiling = v_kind > 28.9 && v_kind < 30.1;
  if (ceiling && u_ceiling<0.5) discard;
  vec3 tint = v_color;
  ${ROOF_TILE_FRAGMENT}
  if ((v_kind > 0.5 && v_kind < 8.5 && abs(v_kind - 2.0) > 0.1) || abs(v_kind-13.0)<0.1) {
    // Nearby elevations use meter-sized bays, recessed glazing and stone
    // surrounds. Main Quad's lower storey reads as a shaded arcade.
    float distanceToFocus = distance(v_position,u_focus);
    float detail = 1.0-smoothstep(u_radius*0.72,u_radius,distanceToFocus);
    vec2 cell = fract(v_uv / vec2(3.8,3.6));
    bool residential = abs(v_kind-4.0)<0.1 || abs(v_kind-13.0)<0.1;
    bool modern = abs(v_kind-5.0)<0.1;
    bool garage = abs(v_kind-6.0)<0.1;
    bool tower = abs(v_kind-7.0)<0.1;
    vec2 edge = abs(cell - vec2(0.5,tower ? 0.88 : 0.53));
    // Each facade's UV range is normalized to its recorded storeys, or to a
    // labeled height estimate. Distinct uses have different opening rhythms.
    if (residential) edge.x = abs(abs(cell.x-0.5)-0.14);
    vec2 aa = max(fwidth(cell),vec2(0.008));
    float halfWidth = residential ? 0.075 : modern ? 0.39 : garage ? 0.39 : tower ? 0.115 : 0.21;
    float halfHeight = garage ? 0.33 : tower ? 0.045 : modern ? 0.19 : 0.26;
    float opening = (1.0-smoothstep(halfWidth-aa.x,halfWidth+aa.x,edge.x)) * (1.0-smoothstep(halfHeight-aa.y,halfHeight+aa.y,edge.y));
    float surround = (1.0-smoothstep(0.245-aa.x,0.245+aa.x,edge.x)) * (1.0-smoothstep(0.29-aa.y,0.29+aa.y,edge.y));
    vec3 recess = mix(vec3(0.31,0.40,0.40),vec3(0.53,0.62,0.60),smoothstep(0.34,0.7,cell.y));
    if(modern)recess=mix(vec3(0.34,0.48,0.51),vec3(0.65,0.73,0.70),smoothstep(0.3,0.74,cell.y));
    // Quiet, metre-scale stone courses retain visual depth without a texture asset.
    if(!modern&&!garage&&!residential){
      float row=floor(v_uv.y*2.3),course=abs(fract(v_uv.y*2.3)-0.5);
      float joint=min(course,abs(fract(v_uv.x*1.15+mod(row,2.0)*0.5)-0.5));
      float fade=1.0-smoothstep(0.18,0.55,max(fwidth(v_uv.x),fwidth(v_uv.y)));
      tint*=1.0-(1.0-smoothstep(0.012,0.035,joint))*0.065*fade*detail;
    }
    if (abs(v_kind-3.0)<0.1 && v_uv.y < 3.6) {
      float x = (cell.x-0.5)*3.8;
      float y = v_uv.y;
      float arch = max(abs(x)-1.12, y>2.1 ? length(vec2(x,y-2.1))-1.12 : -1.0);
      opening = (1.0-smoothstep(-0.04,0.04,arch))*smoothstep(0.08,0.18,y);
      surround = (1.0-smoothstep(0.10,0.20,arch))*smoothstep(0.03,0.1,y);
      recess = vec3(0.48,0.43,0.34);
    }
    if (abs(v_kind-8.0)<0.1) {
      float x=(cell.x-0.5)*3.8,y=cell.y*3.6;
      float arch=max(abs(x)-1.12,y>1.4?length(vec2(x,(y-1.4)*1.3))-1.12:-1.0);
      opening=(1.0-smoothstep(-0.04,0.04,arch))*smoothstep(0.09,0.18,y);
      surround=(1.0-smoothstep(0.09,0.18,arch))*smoothstep(0.03,0.1,y);
      if(cell.y>0.78){
        vec2 small=vec2(fract(cell.x*3.0)-0.5,(cell.y-0.87)*5.0);
        float smallArch=max(abs(small.x)-0.23,small.y>0.0?length(small)-0.23:-1.0);
        opening=(1.0-smoothstep(-0.02,0.02,smallArch))*step(-0.33,small.y);
      }
      recess=vec3(0.43,0.48,0.45);
    }
    tint = mix(tint,tint*1.035,surround*detail);
    if (garage) recess = vec3(0.48,0.45,0.39);
    float recessStrength = abs(v_kind-3.0)<0.1 && v_uv.y >= 3.6 ? 0.48 : 0.75;
    tint = mix(tint,recess,opening*recessStrength*detail);
    // A thin light sill and dark upper reveal supply depth without separate
    // per-window objects or draw calls.
    float sill = (1.0-smoothstep(0.018,0.035,abs(cell.y-0.27))) * step(edge.x,0.245);
    tint = mix(tint,v_color*1.08,sill*detail);
    if (modern || garage) {
      float mullion = 1.0-smoothstep(0.016,0.035,abs(fract(cell.x*3.0)-0.5));
      tint = mix(tint,v_color*1.04,mullion*opening*detail);
    }
    if(abs(v_kind-13.0)<0.1){
      // The inspected front has connected ivy, with exposed stone around its
      // openings. Keep fine leaf variation quiet as the facade recedes.
      float edge=0.45+0.12*sin(v_uv.x*1.4);
      float ivy=smoothstep(edge,edge+0.3,v_uv.y)*(1.0-surround);
      float leafDetail=1.0-smoothstep(0.05,0.14,max(fwidth(v_uv.x),fwidth(v_uv.y)));
      float leaves=sin(v_uv.x*18.0)*sin(v_uv.y*13.0+sin(v_uv.x*4.1))*0.018*leafDetail;
      vec3 foliage=vec3(0.29,0.39,0.26)+leaves;
      tint=mix(tint,foliage,ivy*0.89*detail);
    }
  }
  if(abs(v_kind-14.0)<0.1 || abs(v_kind-18.0)<0.1 || abs(v_kind-20.0)<0.1){
    // Sandstone blocks have staggered joints and restrained face variation.
    // Dimensions are in metres, so close views gain detail without crawling
    // one-pixel brick lines at the campus overview.
    vec2 masonry=vec2(v_uv.x/1.05+mod(floor(v_uv.y/0.45),2.0)*0.5,v_uv.y/0.45);
    vec2 cell=fract(masonry),aa=max(fwidth(masonry),vec2(0.006));
    float joint=min(min(cell.x,1.0-cell.x),min(cell.y,1.0-cell.y));
    float fade=1.0-smoothstep(0.30,0.8,max(aa.x,aa.y));
    float variation=fract(sin(dot(floor(masonry),vec2(12.9898,78.233)))*43758.5453)-0.5;
    tint*=1.0+variation*0.025*fade;
    tint*=1.0-(1.0-smoothstep(0.008,0.025+max(aa.x,aa.y),joint))*0.065*fade;
    if(abs(v_kind-18.0)<0.1){
      float x=mod(v_uv.x,5.2)-2.6,y=v_uv.y;
      // Closed room elevations have rectangular windows. Open front arcades
      // are real geometry; this material is used only above their openings.
      float lower=(1.0-smoothstep(1.10,1.16,abs(x)))*smoothstep(0.95,1.02,y)*(1.0-smoothstep(4.45,4.52,y));
      float ring=(1.0-smoothstep(1.22,1.28,abs(x)))*step(0.83,y)*(1.0-step(4.64,y))-lower;
      float upper=step(6.2,y)*(1.0-step(9.0,y))*(1.0-smoothstep(1.65,1.72,abs(x)));
      float surround=step(6.05,y)*(1.0-step(9.16,y))*(1.0-smoothstep(1.78,1.84,abs(x)));
      vec3 glass=mix(vec3(0.23,0.30,0.28),vec3(0.43,0.49,0.43),smoothstep(1.0,9.0,y));
      float opening=max(lower,upper);
      tint=mix(tint,tint*1.09,max(ring,surround-upper));
      tint=mix(tint,glass,opening*0.9);
      float vertical=(1.0-smoothstep(0.035,0.07,abs(x)))+1.0-smoothstep(0.035,0.07,abs(abs(x)-0.82));
      float transom=1.0-smoothstep(0.04,0.09,min(abs(y-8.22),abs(y-8.68)));
      tint=mix(tint,v_color*1.07,clamp(max(vertical,transom)*upper,0.0,1.0));
      float lowerFrame=max(1.0-smoothstep(0.025,0.055,abs(x)),1.0-smoothstep(0.035,0.07,abs(y-2.5)));
      tint=mix(tint,vec3(0.18,0.22,0.20),lowerFrame*lower);
    }else if(abs(v_kind-20.0)<0.1){
      float x=mod(v_uv.x,3.8)-1.9,y=v_uv.y;
      float opening=(1.0-smoothstep(0.64,0.70,abs(x)))*smoothstep(0.65,0.70,y)*(1.0-smoothstep(2.7,2.75,y));
      vec3 glass=mix(vec3(0.24,0.30,0.27),vec3(0.41,0.46,0.39),y/3.6);
      tint=mix(tint,glass,opening*0.9);
      float frame=max(1.0-smoothstep(0.025,0.055,abs(x)),1.0-smoothstep(0.025,0.055,abs(y-2.22)));
      tint=mix(tint,v_color*1.04,frame*opening);
    }
  }else if(abs(v_kind-21.0)<0.1){
    // Divided windows sit in the recessed corridor wall, not in the arch.
    float border=1.0-smoothstep(0.025,0.045,min(min(v_uv.x,1.0-v_uv.x),min(v_uv.y,1.0-v_uv.y)));
    float frame=max(border,max(1.0-smoothstep(0.018,0.035,abs(v_uv.x-0.5)),1.0-smoothstep(0.018,0.035,abs(v_uv.y-0.79))));
    tint=mix(v_color,vec3(0.57,0.53,0.43),frame);
  }else if(abs(v_kind-15.0)<0.1){
    float edge=abs(fract(v_uv.x/0.7)-0.5);
    tint*=0.88+0.12*smoothstep(0.0,0.5,edge);
  }else if(abs(v_kind-16.0)<0.1){
    float grain=sin(v_uv.x*17.0+sin(v_uv.y*2.0));
    tint*=1.0+grain*0.045;
  }
  if(abs(v_kind-24.0)<0.1){
    vec2 p=vec2(mod(v_uv.x,0.48)-0.24,v_uv.y-0.24);
    float angle=atan(p.y,p.x),r=length(p);
    float leaf=0.12+0.055*cos(angle*6.0);
    float aa=max(fwidth(r),0.003);
    float relief=1.0-smoothstep(0.012,0.028+aa,abs(r-leaf));
    float border=1.0-smoothstep(0.013,0.030+aa,min(abs(v_uv.y-0.045),abs(v_uv.y-0.43)));
    float fade=1.0-smoothstep(0.08,0.22,max(fwidth(v_uv.x),fwidth(v_uv.y)));
    tint*=1.0-(relief*0.21+border*0.13)*fade;
  }
  if(abs(v_kind-31.0)<0.1){
    // Physical terraces supply the bowl profile. Metre-scale seat divisions
    // and aligned concrete aisles add close detail without extra draw calls.
    float aa=max(fwidth(v_uv.x),0.002);
    float seat=abs(mod(v_uv.x+0.25,0.5)-0.25);
    float seatFade=1.0-smoothstep(0.12,0.45,aa);
    tint*=1.0-(1.0-smoothstep(0.012,0.025+aa,seat))*0.23*seatFade;
    float aisleDistance=abs(mod(v_uv.x+6.0,12.0)-6.0);
    float aisle=1.0-smoothstep(max(0.0,0.55-aa),0.65+aa,aisleDistance);
    tint=mix(tint,vec3(0.58,0.57,0.53),aisle*(1.0-smoothstep(0.8,2.4,aa)));
  }
  if(abs(v_kind-22.0)<0.1 || abs(v_kind-23.0)<0.1){
    vec3 photo=abs(v_kind-22.0)<0.1?texture(u_nave,v_uv).rgb:texture(u_chancel,v_uv).rgb;
    float gray=dot(photo,vec3(0.2126,0.7152,0.0722));
    tint=mix(photo,vec3(gray),0.14)*vec3(0.95,0.98,1.03);
  }
  ${STADIUM_FIELD_FRAGMENT}
  ${STADIUM_ELEVATION_FRAGMENT}
  ${GARAGE_FRAGMENT}
  ${ENGINEERING_FRAGMENT}
${SURFACE_FRAGMENT}
${HOOVER_FRAGMENT}
${LANDSCAPE_FRAGMENT}
  if(abs(v_kind-29.0)<0.1 && v_color.r>v_color.g*1.5){
    // Long timber boards remain legible through the ghosted ceiling surface.
    float boards=v_uv.x/0.24,aa=max(fwidth(boards),0.002);
    float seam=min(fract(boards),1.0-fract(boards));
    tint*=1.0-(1.0-smoothstep(0.012,0.028+aa,seam))*0.18*(1.0-smoothstep(0.25,0.8,aa));
  }
  outColor = vec4(tint,ceiling ? (v_kind < 29.5 ? 0.24 : 0.45) : 1.0);
}`;

interface GpuMesh { vao: WebGLVertexArrayObject; buffer: WebGLBuffer; vertices: number }

/** The ceiling is small and independent of the campus mesh. Reuse its packed
 * arrays and reorder only for a changed view direction, never for pan/zoom.
 * Sorting whole triangles far-to-near gives ordinary alpha blending a stable
 * order without another GPU buffer or a dependency on wall visibility. */
function ceilingOrder(values:Float32Array){
  const count=values.length/VERTEX_FLOATS/3,centers=new Float64Array(count*3),depths=new Float64Array(count),order=new Uint32Array(count);
  const original=new Uint32Array(packGpuVertices(values).buffer),sorted=new Uint32Array(original.length),stride=GPU_VERTEX_BYTES*3/4;
  let previous:number[]|undefined;
  for(let i=0;i<count;i++){
    order[i]=i;
    for(let v=0;v<3;v++){
      const offset=(i*3+v)*VERTEX_FLOATS;
      if(values[offset+11]!==29&&values[offset+11]!==30)throw new Error('Church ceiling buffer contains opaque geometry.');
      for(let axis=0;axis<3;axis++)centers[i*3+axis]+=values[offset+axis]/3;
    }
  }
  return {sorted,update(matrix:Float32Array):boolean{
    let direction=[matrix[3],matrix[7],matrix[11]],length=Math.hypot(...direction);
    if(length<1e-20){direction=[matrix[2],matrix[6],matrix[10]];length=Math.hypot(...direction);}
    direction=direction.map(n=>length?n/length:0);
    if(previous&&direction.every((n,i)=>Math.abs(n-previous![i])<1e-7))return false;
    previous=direction;
    for(let i=0;i<count;i++)depths[i]=centers[i*3]*direction[0]+centers[i*3+1]*direction[1]+centers[i*3+2]*direction[2];
    order.sort((a,b)=>depths[b]-depths[a]||a-b);
    for(let i=0;i<count;i++)for(let j=0;j<stride;j++)sorted[i*stride+j]=original[order[i]*stride+j];
    return true;
  }};
}

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const result = gl.createShader(type);
  if (!result) throw new Error('Campus detail shader could not be allocated.');
  gl.shaderSource(result, source); gl.compileShader(result);
  return result;
}

interface PendingProgram { program: WebGLProgram; shaders: WebGLShader[]; parallel: KHR_parallel_shader_compile | null; started: number }

function beginProgram(gl: WebGL2RenderingContext): PendingProgram {
  // Request the extension before compilation. Reading COMPILE_STATUS or
  // LINK_STATUS here would synchronously wait for the GPU compiler.
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const started = performance.now();
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexShader);
  let fragment: WebGLShader | undefined;
  let result: WebGLProgram | null = null;
  try {
    fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    result = gl.createProgram();
    if (!result) throw new Error('Campus detail GPU program could not be allocated.');
    gl.attachShader(result, vertex); gl.attachShader(result, fragment); gl.linkProgram(result);
    return { program: result, shaders: [vertex, fragment], parallel, started };
  } catch (error) {
    if (result) gl.deleteProgram(result);
    gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment);
    throw error;
  }
}

function allocateMesh(gl: WebGL2RenderingContext, values: Float32Array): GpuMesh {
  const vao = gl.createVertexArray(), buffer = gl.createBuffer();
  if (!vao || !buffer) {
    if (vao) gl.deleteVertexArray(vao); if (buffer) gl.deleteBuffer(buffer);
    throw new Error('Campus detail GPU buffers could not be allocated.');
  }
  try {
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, gpuGeometryBytes(values), gl.STATIC_DRAW);
    for (const [attribute, size, offset] of [[0,3,0],[1,3,12],[2,3,24],[3,2,28],[4,1,36],[5,1,40]]) {
      gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, size, attribute===2?gl.UNSIGNED_BYTE:gl.FLOAT, attribute===2, GPU_VERTEX_BYTES, offset);
    }
    return { vao, buffer, vertices: values.length / VERTEX_FLOATS };
  } catch (error) {
    gl.deleteVertexArray(vao); gl.deleteBuffer(buffer); throw error;
  } finally { gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null); }
}

const UPLOAD_SLICE_VERTICES=Math.floor(1024*1024/GPU_VERTEX_BYTES);
interface MeshUpload {roofs?:GpuMesh;facades?:GpuMesh;roofOffset:number;facadeOffset:number;started:number}
/** One allocation or at most 1 MiB transfer per render callback. */
function advanceUpload(gl:WebGL2RenderingContext,job:MeshUpload,geometry:DetailGeometry):boolean {
  if(gpuGeometryBytes(geometry.roofs)+gpuGeometryBytes(geometry.facades)>MAX_GPU_GEOMETRY_BYTES)throw new Error('Campus detail exceeds the 24 MiB GPU geometry limit.');
  if(!job.roofs){job.roofs=allocateMesh(gl,geometry.roofs);return false;}
  if(job.roofOffset<geometry.roofs.length/VERTEX_FLOATS){
    const end=Math.min(geometry.roofs.length/VERTEX_FLOATS,job.roofOffset+UPLOAD_SLICE_VERTICES);
    try{gl.bindBuffer(gl.ARRAY_BUFFER,job.roofs.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,job.roofOffset*GPU_VERTEX_BYTES,packGpuVertices(geometry.roofs,job.roofOffset,end));job.roofOffset=end;}
    finally{gl.bindBuffer(gl.ARRAY_BUFFER,null);}return false;
  }
  if(!job.facades){job.facades=allocateMesh(gl,geometry.facades);return false;}
  if(job.facadeOffset<geometry.facades.length/VERTEX_FLOATS){
    const end=Math.min(geometry.facades.length/VERTEX_FLOATS,job.facadeOffset+UPLOAD_SLICE_VERTICES);
    try{gl.bindBuffer(gl.ARRAY_BUFFER,job.facades.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,job.facadeOffset*GPU_VERTEX_BYTES,packGpuVertices(geometry.facades,job.facadeOffset,end));job.facadeOffset=end;}
    finally{gl.bindBuffer(gl.ARRAY_BUFFER,null);}return job.facadeOffset===geometry.facades.length/VERTEX_FLOATS;
  }
  return true;
}

/** Campus-scale layer: adaptive globe has reached Mercator before detail draws. */
export function createBuildingDetailsLayer(data: CampusData, onError?: (message: string) => void, loadElevationGrid?:ElevationGridLoader): BuildingDetailsLayer {
  const wallAxes = churchAxes(data);
  let map: MapLibreMap | undefined, context: WebGL2RenderingContext | undefined;
  let gpuProgram: WebGLProgram | undefined, roofs: GpuMesh | undefined, facades: GpuMesh | undefined;
  let transparentCeiling:ReturnType<typeof ceilingOrder>|undefined;
  let uploading:MeshUpload|undefined;
  let compiling: PendingProgram | undefined;
  let idleCompile: number | undefined, compileTimer: ReturnType<typeof setTimeout> | undefined;
  let worker: Worker | undefined, removed = false, selected = -1, interior = false;
  let pending = cachedGeometry.get(data);
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const matrix = new Float32Array(16);
  const indices = new Map(data.features.map((feature, index) => [String(feature.properties?.id), index]));
  const state: BuildingDetailStats = { mode:'campus', ceiling:false, ready: false, buildingCount: data.features.length, roofTriangles: 0, facadeTriangles: 0, triangles: 0, bytes: 0, textureBytes: 0,terrainTextureBytes:0,terrainStatus:'disabled',terrainOffscreenDrawCalls:0, environment:emptyEnvironmentCounts(),sculptures:emptySculptureCounts(),surfaces:emptySurfaceCounts(),landscape:emptyLandscapeCounts(), buildMs: 0, maxSliceMs: 0, shaderReady: false, compileMs: 0, uploadMs: 0,uploadSlices:0,uploadWallMs:0, drawCalls: 0, lastDrawDetail: 'none', error: null };
  const photos = new ChurchTextures(() => map?.triggerRepaint());
  let groundRevision=0;
  const grounding=new TerrainGrounding(data,()=>{groundRevision++;map?.triggerRepaint();},loadElevationGrid);
  const releaseMeshes = () => {
    photos.dispose();state.textureBytes=0;
    if (context) for (const mesh of [roofs,facades,uploading?.roofs,uploading?.facades]) if (mesh) { context.deleteVertexArray(mesh.vao); context.deleteBuffer(mesh.buffer); }
    roofs=undefined;facades=undefined;uploading=undefined;transparentCeiling=undefined;state.ready=false;
    groundRevision++;
  };
  const destroyGpu = () => {
    if (idleCompile !== undefined) { window.cancelIdleCallback(idleCompile); idleCompile = undefined; }
    if (compileTimer !== undefined) { clearTimeout(compileTimer); compileTimer = undefined; }
    if (context) {
      grounding.dispose(context);state.terrainTextureBytes=0;state.terrainStatus='disabled';
      if (gpuProgram) context.deleteProgram(gpuProgram);
      if (compiling) { context.deleteProgram(compiling.program); compiling.shaders.forEach(value => context!.deleteShader(value)); }
    }
    releaseMeshes();compiling = undefined;gpuProgram = undefined;state.shaderReady = false;
  };
  const fail = (message: string) => {
    state.error = message; worker?.terminate(); worker = undefined; destroyGpu(); onError?.(message);
  };
  const finishProgram = () => {
    if (!context || !compiling || removed) return;
    if (compiling.parallel && !context.getProgramParameter(compiling.program, compiling.parallel.COMPLETION_STATUS_KHR)) { map?.triggerRepaint(); return; }
    const started = performance.now();
    if (!context.getProgramParameter(compiling.program, context.LINK_STATUS)) {
      const diagnostics=compiling.shaders.map(shader=>context!.getShaderInfoLog?.(shader)).filter(Boolean).join(' ');
      fail(`Campus detail GPU program could not link: ${context.getProgramInfoLog(compiling.program) ?? 'no GPU diagnostic'} ${diagnostics}`); return;
    }
    gpuProgram = compiling.program;
    compiling.shaders.forEach(value => context!.deleteShader(value));
    state.compileMs = performance.now() - compiling.started;
    compiling = undefined; state.shaderReady = true;
    for (const name of ['u_matrix','u_selected','u_focus','u_radius','u_ceiling','u_nave','u_chancel','u_sideWalls','u_endWalls','u_groundPass','u_drapeGround','u_terrainHeights','u_terrainAnchors','u_terrainBounds','u_terrainEnabled','u_terrainBuildingCount']) uniforms[name] = context.getUniformLocation(gpuProgram, name);
    state.maxSliceMs = Math.max(state.maxSliceMs, performance.now() - started);
    map?.triggerRepaint();
  };
  const warmProgram = () => {
    // Regional startup needs only the basemap. Begin the extra GPU work while
    // approaching campus, ahead of geometry generation at zoom 14.
    if (!context || !map || map.getZoom() < SHADER_APPROACH_ZOOM || compiling || gpuProgram || removed || state.error) return;
    const started = performance.now();
    try {
      compiling = beginProgram(context);
      state.maxSliceMs = Math.max(state.maxSliceMs, performance.now() - started);
      if (!compiling.parallel) {
        // Older WebGL2 implementations lack nonblocking completion polling.
        // Finish during approach idle time rather than blocking a detail draw.
        if (typeof window.requestIdleCallback === 'function') idleCompile = window.requestIdleCallback(() => { idleCompile = undefined; finishProgram(); }, { timeout: 800 });
        else compileTimer = setTimeout(() => { compileTimer = undefined; finishProgram(); }, 0);
      }
    } catch (error) { fail(error instanceof Error ? error.message : 'Campus detail shaders could not initialize.'); }
  };
  const lost = () => { destroyGpu(); };
  const restored = () => { if (!removed) { warmProgram(); map?.triggerRepaint(); } };
  const groundLayer:CustomLayerInterface={
    id:'stanford-ground-surfaces',type:'custom',renderingMode:'2d',
    get terrainTileRevision(){return groundRevision;},
    render(){/* With terrain disabled, the main 3D layer draws flat ground. */},
    renderToTerrainTile(gl,options){
      if(!map||removed||state.error||!state.ready||!gpuProgram||!roofs||!facades||grounding.status!=='active')return;
      const {canonical,wrap=0}=options.tileID,tileMatrix=terrainTileMatrix(canonical.z,canonical.x,canonical.y,wrap);
      gl.useProgram(gpuProgram);
      const restoreGroundTextures=grounding.bind(gl,uniforms);
      // WebGL validates active samplers even when their shader branch is off.
      // Never leave photo samplers pointing at MapLibre's current tile target.
      gl.uniform1i(uniforms.u_nave,2);gl.uniform1i(uniforms.u_chancel,2);
      gl.uniformMatrix4fv(uniforms.u_matrix,false,tileMatrix);gl.uniform1f(uniforms.u_groundPass,1);gl.uniform1f(uniforms.u_drapeGround,0);gl.uniform1f(uniforms.u_terrainEnabled,0);
      gl.uniform1f(uniforms.u_selected,-1);gl.uniform1f(uniforms.u_ceiling,0);gl.uniform2f(uniforms.u_sideWalls,1,1);gl.uniform2f(uniforms.u_endWalls,1,1);gl.uniform2f(uniforms.u_focus,0,0);gl.uniform1f(uniforms.u_radius,1600);
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(false);
      try{for(const mesh of [roofs,facades])if(mesh.vertices){gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.vertices);state.terrainOffscreenDrawCalls++;}}
      finally{gl.bindVertexArray(null);gl.depthMask(true);restoreGroundTextures();}
    },
  };
  return {
    id: 'stanford-architectural-details', type: 'custom', renderingMode: '3d',
    groundLayer,
    get stats() { return Object.freeze({ ...state,ready:state.ready&&(!map?.getTerrain?.()||grounding.status==='active'),environment:Object.freeze({...state.environment}),sculptures:Object.freeze({...state.sculptures}),surfaces:Object.freeze({...state.surfaces}),landscape:Object.freeze({...state.landscape}) }); },
    setSelected(id) { selected = id === null ? -1 : (indices.get(id) ?? -1); map?.triggerRepaint(); },
    setInterior(enabled) {
      if(interior===enabled)return;
      interior=enabled;worker?.terminate();worker=undefined;
      // Only one mesh pair is GPU-resident. Keep the shared program warm and
      // discard even a partial upload before replacing the campus with a room.
      releaseMeshes();pending=(interior?cachedInterior:cachedGeometry).get(data);
      Object.assign(state,{mode:interior?'church-interior':'campus',ceiling:false,buildingCount:interior?1:data.features.length,roofTriangles:0,facadeTriangles:0,triangles:0,bytes:0,environment:emptyEnvironmentCounts(),sculptures:emptySculptureCounts(),surfaces:emptySurfaceCounts(),landscape:emptyLandscapeCounts(),buildMs:0,uploadMs:0,uploadSlices:0,uploadWallMs:0,drawCalls:0,lastDrawDetail:'none',error:null});
      map?.triggerRepaint();
    },
    setCeiling(visible) { state.ceiling=interior&&visible;map?.triggerRepaint(); },
    onAdd(owner, gl) { map = owner; context = gl; removed = false; owner.on('webglcontextlost', lost); owner.on('webglcontextrestored', restored); warmProgram(); },
    onRemove() {
      removed = true; worker?.terminate(); worker = undefined; pending = undefined;
      map?.off('webglcontextlost', lost); map?.off('webglcontextrestored', restored);
      destroyGpu(); map = undefined; context = undefined;
    },
    prerender(gl,options){
      state.terrainOffscreenDrawCalls=0;
      if(!map||removed||state.error||map.getZoom()<14||options.defaultProjectionData.projectionTransition>0)return;
      const view=map.getCenter().toArray(),worldOffset=Math.round((view[0]-DETAIL_ORIGIN[0])/360),focus=projectLocal([view[0]-worldOffset*360,view[1]]);
      if(Math.hypot(...focus)>6000)return;
      const started=performance.now();
      try{grounding.setObjects(pending?.geometry.terrainAnchors);grounding.prerender(gl,options,Boolean(map.getTerrain?.()),worldOffset);state.terrainTextureBytes=grounding.bytes;state.terrainStatus=grounding.status;}
      catch(error){fail(error instanceof Error?error.message:'Elevation sampling could not initialize. Retry terrain and campus detail.');}
      finally{state.maxSliceMs=Math.max(state.maxSliceMs,performance.now()-started);}
    },
    render(gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
      state.drawCalls = 0; state.lastDrawDetail = 'none';
      if (!map || removed || state.error) return;
      warmProgram();
      if (compiling?.parallel) finishProgram();
      if (state.error || map.getZoom() < 14 || options.defaultProjectionData.projectionTransition > 0) return;
      // Native map layers repeat around the dateline. Draw authored Stanford
      // detail in the same nearest world copy, without changing source points.
      const viewCenter=map.getCenter().toArray(),worldOffset=Math.round((viewCenter[0]-DETAIL_ORIGIN[0])/360);
      const focus=projectLocal([viewCenter[0]-worldOffset*360,viewCenter[1]]);
      // High zoom in another Bay Area city must not fetch or build Stanford's
      // environment. Six kilometres includes campus and its arrival context.
      if(!pending&&!state.ready&&Math.hypot(...focus)>6000)return;
      if (!state.ready) {
        if (!pending) {
          if (!worker) {
            const job = new Worker(new URL('./building-worker.ts', import.meta.url), { type: 'module' });
            worker=job;
            const cache=interior?cachedInterior:cachedGeometry;
            job.onmessage = (event: MessageEvent<{ geometry?: DetailGeometry; buildMs?: number; error?: string }>) => {
              if (removed || worker!==job) return;
              job.terminate(); worker = undefined;
              if (event.data.error || !event.data.geometry) { fail(event.data.error ?? 'Campus geometry worker returned no mesh.'); return; }
              pending = { geometry: event.data.geometry, buildMs: event.data.buildMs ?? 0 };
              cache.set(data, pending); map?.triggerRepaint();
            };
            job.onerror = () => { if(!removed&&worker===job)fail('Architectural detail could not load. Retry to rebuild its geometry worker.'); };
            job.postMessage({data,interior});
          }
          return;
        }
        if (!state.shaderReady) return;
        if(interior && pending.geometry.churchTextures){
          const started=performance.now();
          try{if(!photos.advance(gl))return;state.textureBytes=photos.bytes;}
          catch(error){fail(error instanceof Error?error.message:'Church artwork could not initialize.');return;}
          finally{state.maxSliceMs=Math.max(state.maxSliceMs,performance.now()-started);}
        }
        if(!uploading){uploading={roofOffset:0,facadeOffset:0,started:performance.now()};state.uploadMs=0;state.uploadSlices=0;state.uploadWallMs=0;}
        const started = performance.now();
        try {
          const complete=advanceUpload(gl,uploading,pending.geometry);
          state.uploadSlices++;
          if(!complete){const elapsed=performance.now()-started;state.uploadMs+=elapsed;state.maxSliceMs=Math.max(state.maxSliceMs,elapsed);map.triggerRepaint();return;}
          roofs=uploading.roofs;facades=uploading.facades;state.uploadWallMs=performance.now()-uploading.started;uploading=undefined;
          if(interior)transparentCeiling=ceilingOrder(pending.geometry.roofs);
          const elapsed=performance.now()-started;state.uploadMs+=elapsed;state.maxSliceMs=Math.max(state.maxSliceMs,elapsed);
          Object.assign(state, { ready: true, roofTriangles: pending.geometry.roofTriangles, facadeTriangles: pending.geometry.facadeTriangles,
            triangles: pending.geometry.triangles, bytes: gpuGeometryBytes(pending.geometry.roofs)+gpuGeometryBytes(pending.geometry.facades), environment:pending.geometry.environment,sculptures:pending.geometry.sculptures,surfaces:pending.geometry.surfaces??emptySurfaceCounts(),landscape:pending.geometry.landscape??emptyLandscapeCounts(), buildMs: pending.buildMs });
          groundRevision++;map.triggerRepaint();
        } catch (error) { fail(error instanceof Error ? error.message : 'Campus GPU detail could not initialize.'); return; }
      }
      const main = options.defaultProjectionData.mainMatrix;
      // Compose in double precision before sending a local matrix to the GPU.
      // Sending large global coordinates in the float32 vertex buffer loses the
      // centimetres needed by window planes and eaves.
      for (let row = 0; row < 4; row++) {
        matrix[row] = main[row] * METERS_TO_MERCATOR;
        matrix[4 + row] = -main[4 + row] * METERS_TO_MERCATOR;
        matrix[8 + row] = main[8 + row] * METERS_TO_MERCATOR;
        matrix[12 + row] = main[row] * (MERCATOR_ORIGIN[0]+worldOffset) + main[4 + row] * MERCATOR_ORIGIN[1] + main[12 + row];
      }
      gl.useProgram(gpuProgram!); gl.uniformMatrix4fv(uniforms.u_matrix, false, matrix); gl.uniform1f(uniforms.u_selected, interior?-1:selected); gl.uniform1f(uniforms.u_ceiling,state.ceiling?1:0);
      const terrainEnabled=Boolean(map.getTerrain?.());
      if(terrainEnabled&&grounding.status!=='active')return;
      gl.uniform1f(uniforms.u_groundPass,0);gl.uniform1f(uniforms.u_drapeGround,terrainEnabled?1:0);
      const walls=interior?churchWallMask(wallAxes,map.getBearing?.()??0,map.getPitch?.()??0):[1,1,1,1];
      gl.uniform2f(uniforms.u_sideWalls,walls[0],walls[1]); gl.uniform2f(uniforms.u_endWalls,walls[2],walls[3]);
      gl.uniform2f(uniforms.u_focus, focus[0], focus[1]); gl.uniform1f(uniforms.u_radius, Math.max(450, 1600 / Math.pow(1.35, map.getZoom() - 16)));
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      const restoreTextures=photos.ready?photos.bind(gl,uniforms):undefined;
      const restoreTerrain=grounding.bind(gl,uniforms);
      if(!photos.ready&&grounding.status==='active'){gl.uniform1i(uniforms.u_nave,2);gl.uniform1i(uniforms.u_chancel,2);}
      try{
        if(interior){
          // Ground and room surfaces write depth before any transparent ceiling.
          gl.bindVertexArray(facades!.vao);gl.drawArrays(gl.TRIANGLES,0,facades!.vertices);
          state.drawCalls=1;state.lastDrawDetail='facades';
          if(state.ceiling&&roofs!.vertices){
            const started=performance.now();
            if(transparentCeiling!.update(matrix)){
              try{gl.bindBuffer(gl.ARRAY_BUFFER,roofs!.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,transparentCeiling!.sorted);}
              finally{gl.bindBuffer(gl.ARRAY_BUFFER,null);}
            }
            state.maxSliceMs=Math.max(state.maxSliceMs,performance.now()-started);
            gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
            gl.bindVertexArray(roofs!.vao);gl.drawArrays(gl.TRIANGLES,0,roofs!.vertices);
            state.drawCalls=2;state.lastDrawDetail='roofs';
          }
        }else{
          gl.bindVertexArray(roofs!.vao); gl.drawArrays(gl.TRIANGLES, 0, roofs!.vertices);
          state.drawCalls = 1; state.lastDrawDetail = 'roofs';
          if (map.getZoom() >= 15.5) { gl.bindVertexArray(facades!.vao); gl.drawArrays(gl.TRIANGLES, 0, facades!.vertices); state.drawCalls = 2; state.lastDrawDetail = 'facades'; }
        }
      }finally{gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);restoreTerrain();restoreTextures?.();}
    },
  };
}
