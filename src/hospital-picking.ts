import earcut from 'earcut';
import type {MapGeoJSONFeature} from 'maplibre-gl';
import {projectLocal,VERTEX_FLOATS,type CampusData,type Point} from './building-geometry.ts';
import {HOSPITAL_EXTERIORS} from './hospital-exteriors.ts';
import {PASTEUR_300_ID} from './pasteur-pods.ts';

export const HOSPITAL_PICK_IDS=new Set([PASTEUR_300_ID,...Object.keys(HOSPITAL_EXTERIORS)]);
type Vertex=[number,number,number];
type Clip=(x:number,y:number,z:number)=>Vertex|null;
type Surface={index:number;start:number;end:number;mesh:Float32Array};
export type PickCandidate=Pick<MapGeoJSONFeature,'geometry'|'properties'|'layer'>;

function triangleDepth([x,y]:Point,a:Vertex|null,b:Vertex|null,c:Vertex|null):number {
  if(!a||!b||!c)return Infinity;
  const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(den)<1e-16)return Infinity;
  const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den;
  const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,t=1-u-v;
  if(u<0||v<0||t<0)return Infinity;
  const depth=u*a[2]+v*b[2]+t*c[2];
  return depth>=-1&&depth<=1?depth:Infinity;
}

/** MapLibre returns the evaluated paint and tile-clipped polygon of each native
 * hit. Compare only opaque wall/cap layers. Invisible selection prisms carry
 * no depth. As in FillExtrusionBucket the upper datum is the mean ring vertex. */
function nativeSurfaceDepth(f:PickCandidate,point:Point,clip:Clip,elevation:(p:Point)=>number|null):number {
  const layer=f.layer;
  if(layer.type!=='fill-extrusion'||!['stanford-buildings','stanford-roofs'].includes(layer.id))return Infinity;
  const paint=layer.paint,base=Number(paint?.['fill-extrusion-base']),top=Number(paint?.['fill-extrusion-height']);
  if(!Number.isFinite(base)||!Number.isFinite(top)||paint?.['fill-extrusion-opacity']===0)return Infinity;
  let depth=Infinity;
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];
  for(const polygon of polygons){
    const rings=polygon.map(r=>r.slice(0,-1)),flat=rings.flat();
    if(!flat.length)continue;
    const origin=flat.reduce<Point>(([x,y],p)=>[x+p[0]/flat.length,y+p[1]/flat.length],[0,0]);
    const terrain=elevation(origin),datum=terrain??0,local=flat.map(projectLocal);
    const bottom=base+datum-(terrain!==null&&base<=0?10:0);
    const upper=local.map(([x,y])=>clip(x,y,top+datum)),lower=local.map(([x,y])=>clip(x,y,bottom));
    const holes:number[]=[];let i=0;
    for(const ring of rings){
      if(i)holes.push(i);
      for(let j=0;j<ring.length;j++){
        const a=i+j,b=i+(j+1)%ring.length;
        depth=Math.min(depth,triangleDepth(point,lower[a],lower[b],upper[b]),triangleDepth(point,lower[a],upper[b],upper[a]));
      }
      i+=ring.length;
    }
    const indices=earcut(local.flat(),holes);
    for(let j=0;j<indices.length;j+=3)depth=Math.min(depth,triangleDepth(point,upper[indices[j]],upper[indices[j+1]],upper[indices[j+2]]));
  }
  return depth;
}

/** Index ranges into the original render buffers once. Per click, test hospital
 * triangles first. Only compare the queried neighbors when a hospital is hit. */
export function hospitalSurfacePicker(data:CampusData,roofs:Float32Array,facades:Float32Array=new Float32Array()) {
  const surfaces=new Map<string,Surface[]>();
  for(const mesh of [roofs,facades]){
    let last:Surface|undefined;
    for(let i=0;i<mesh.length;i+=3*VERTEX_FLOATS){
      const index=mesh[i+12];
      if(index<0)continue;
      if(last?.index===index&&last.end===i){last.end+=3*VERTEX_FLOATS;continue;}
      last={index,start:i,end:i+3*VERTEX_FLOATS,mesh};
      const id=String(data.features[index].properties?.id);
      const list=surfaces.get(id);
      if(list)list.push(last);else surfaces.set(id,[last]);
    }
  }
  return (point:Point,matrix:Float32Array,buildingDatum:(index:number)=>number|null,groundDatum:(x:number,y:number)=>number|null,
    candidates:PickCandidate[]=[],drawFacades=true,nativeElevation:(p:Point)=>number|null=()=>null):string|null=>{
    const clip:Clip=(x,y,z)=>{
      const w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
      if(w<=0)return null;
      return [(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w,(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w,(matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w];
    };
    const meshDepth=(id:string)=>{
      let depth=Infinity;
      for(const {index,start,end,mesh} of surfaces.get(id)??[]){
        if(mesh===facades&&!drawFacades)continue;
        const datum=buildingDatum(index);
        if(datum===null)continue;
        const vertex=(offset:number)=>{
          const x=mesh[offset],y=mesh[offset+1],height=mesh[offset+2];
          if(height<0)return null;
          const ground=height<=.03?groundDatum(x,y):datum;
          return ground===null?null:clip(x,y,ground+height);
        };
        for(let i=start;i<end;i+=3*VERTEX_FLOATS){
          depth=Math.min(depth,triangleDepth(point,vertex(i),vertex(i+VERTEX_FLOATS),vertex(i+2*VERTEX_FLOATS)));
        }
      }
      return depth;
    };
    let nearest=Infinity,hit:string|null=null;
    for(const id of HOSPITAL_PICK_IDS){
      const depth=meshDepth(id);
      if(depth<nearest){nearest=depth;hit=id;}
    }
    if(!hit){
      const native=candidates.find(f=>f.layer.id!=='stanford-roofs'&&!HOSPITAL_PICK_IDS.has(String(f.properties.id)));
      return native?String(native.properties.id):null;
    }
    const seen=new Set<string>();
    for(const f of candidates){
      const id=String(f.properties.id);
      if(HOSPITAL_PICK_IDS.has(id))continue;
      let depth=nativeSurfaceDepth(f,point,clip,nativeElevation);
      if(!seen.has(id)){depth=Math.min(depth,meshDepth(id));seen.add(id);}
      if(depth<nearest){nearest=depth;hit=id;}
    }
    return hit;
  };
}
