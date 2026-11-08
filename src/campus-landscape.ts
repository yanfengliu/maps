import earcut from 'earcut';
import type * as GeoJSON from 'geojson';

type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface MeshWriter {triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void}
interface LandscapeProperties {id:string;version:number;kind:'grass'|'red-flowers'|'white-flowers'|'rose-bed'|'border';groundEvidence:string;geometrySource:string;[key:string]:unknown}
export type CampusLandscape=GeoJSON.FeatureCollection<GeoJSON.Polygon|GeoJSON.MultiPolygon,LandscapeProperties>;
export interface LandscapeCounts {lawns:number;flowerbeds:number;borders:number;triangles:number}
export const emptyLandscapeCounts=():LandscapeCounts=>({lawns:0,flowerbeds:0,borders:0,triangles:0});
export const LANDSCAPE_BUILDING=-5;
export const MAX_LANDSCAPE_TRIANGLES=2399;
const fail=(id:string,reason:string)=>new Error(`Campus landscape ${id} ${reason}. Restore the pinned landscape input and retry campus detail.`);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const point=(p:unknown):p is Point=>Array.isArray(p)&&p.length===2&&p.every(finite)&&p[0]>=-122.19&&p[0]<=-122.15&&p[1]>=37.415&&p[1]<=37.445;
const kinds=['grass','red-flowers','white-flowers','rose-bed','border'];
const polygons=(g:GeoJSON.Polygon|GeoJSON.MultiPolygon)=>g.type==='Polygon'?[g.coordinates]:g.coordinates;

/** Reject unsupported planting and malformed cache input through the same
 * actionable failure path as the other campus detail data. */
export function validateCampusLandscape(value:unknown):CampusLandscape {
 const data=value as CampusLandscape;if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>200)throw fail('input','must contain at most 200 evidenced areas');
 const ids=new Set<string>();let total=0;
 for(const f of data.features){
  const p=f?.properties,g=f?.geometry,id=String(p?.id??'unknown');
  if(f?.type!=='Feature'||!p||!/^((way|relation)\/\d+|derived\/[a-z0-9-]+)$/.test(id)||ids.has(id)||!Number.isInteger(p.version)||p.version<1||!kinds.includes(p.kind)||typeof p.groundEvidence!=='string'||!p.groundEvidence||p.groundEvidence==='unverified'||typeof p.geometrySource!=='string'||!p.geometrySource)throw fail(id,'has no valid identity or planting evidence');
  if(p.kind==='grass'&&!['osm-landuse-grass','osm-surface-grass'].includes(p.groundEvidence))throw fail(id,'assigns turf without an explicit mapped grass tag');
  if(g?.type!=='Polygon'&&g?.type!=='MultiPolygon')throw fail(id,'has unsupported geometry');
  if(!Array.isArray(g.coordinates)||!g.coordinates.length)throw fail(id,'has empty geometry');
  for(const polygon of polygons(g)){
   if(!Array.isArray(polygon)||!polygon.length||polygon.length>100)throw fail(id,'has invalid polygon rings');
   for(const ring of polygon){
    if(!Array.isArray(ring)||ring.length<4||ring.length>2000||ring.some(p=>!point(p))||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])throw fail(id,'has invalid or unclosed Stanford coordinates');
    total+=ring.length;if(total>10000)throw fail('input','exceeds the coordinate budget');
   }
  }
  ids.add(id);
 }
 return data;
}

const materials:Record<LandscapeProperties['kind'],{kind:number;color:Color;height:number}>={
 grass:{kind:80,color:[.43,.55,.30],height:.012},
 'red-flowers':{kind:81,color:[.65,.11,.15],height:.18},
 'white-flowers':{kind:82,color:[.91,.89,.73],height:.16},
 'rose-bed':{kind:83,color:[.58,.24,.28],height:.30},
 border:{kind:84,color:[.37,.45,.29],height:.12},
};

/** Turf and blooms share the existing opaque ground batch. World-metre UVs
 * keep blades continuous across every triangulation edge. The caller drapes
 * sentinel -5 onto terrain; these z values are only estimated plant relief. */
export function addCampusLandscape(mesh:MeshWriter,data:CampusLandscape,project:(coordinate:readonly number[])=>Point):LandscapeCounts {
 const counts=emptyLandscapeCounts();
 for(const feature of data.features){
  const material=materials[feature.properties.kind];
  if(feature.properties.kind==='grass')counts.lawns++;else if(feature.properties.kind==='border')counts.borders++;else counts.flowerbeds++;
  for(const polygon of polygons(feature.geometry)){
   const rings=polygon.map(r=>r.slice(0,-1).map(project)),points=rings.flat(),holes:number[]=[];let offset=rings[0].length;
   for(const ring of rings.slice(1)){holes.push(offset);offset+=ring.length;}
   const indices=earcut(points.flat(),holes,2);
   for(let i=0;i<indices.length;i+=3){
    if(++counts.triangles>MAX_LANDSCAPE_TRIANGLES)throw fail('mesh','exceeds its 2399-triangle budget');
    const p=indices.slice(i,i+3).map(index=>points[index]);
    mesh.triangle([...p[0],material.height],[...p[1],material.height],[...p[2],material.height],material.color,material.kind,LANDSCAPE_BUILDING,p as [Point,Point,Point]);
   }
  }
 }
 return counts;
}
