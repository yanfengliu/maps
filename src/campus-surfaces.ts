import earcut from 'earcut';
import type * as GeoJSON from 'geojson';

type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface MeshWriter {
 triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void;
 quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void;
}
interface SurfaceProperties {
 id:string;version:number;kind:'plaza'|'street'|'crossing';
 modeledSurface:'pavers'|'asphalt'|'concrete'|'unknown';surfaceEvidence:string;
 modeledWidth?:number;widthSource?:'osm-tag'|'class-estimate';
 modeledBearing?:number;orientationSource?:string;roadWidth?:number;
 [key:string]:unknown;
}
export type CampusSurfaces=GeoJSON.FeatureCollection<GeoJSON.Polygon|GeoJSON.LineString|GeoJSON.Point,SurfaceProperties>;
export interface SurfaceCounts {plazas:number;streets:number;crossings:number;markings:number;triangles:number}
export const emptySurfaceCounts=():SurfaceCounts=>({plazas:0,streets:0,crossings:0,markings:0,triangles:0});
export const SURFACE_BUILDING=-4;
export const MAX_SURFACE_TRIANGLES=10_000;
const error=(id:string,reason:string)=>new Error(`Campus surface ${id} ${reason}. Restore the pinned surface input and retry campus detail.`);
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const width=(x:unknown)=>finite(x)&&x>=.5&&x<=30;
const coordinate=(p:unknown):p is Point=>Array.isArray(p)&&p.length===2&&p.every(finite)&&p[0]>=-122.19&&p[0]<=-122.15&&p[1]>=37.415&&p[1]<=37.445;

/** Keep bad cached input on the existing visible detail/retry path. Source tags
 * are preserved, and an unverified material cannot silently become brick. */
export function validateCampusSurfaces(value:unknown):CampusSurfaces {
 const data=value as CampusSurfaces;
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>1000)throw error('input','must contain no more than 1000 mapped features');
 const ids=new Set<string>();let pointCount=0;
 for(const f of data.features){
  const p=f?.properties,g=f?.geometry,id=String(p?.id??'unknown');
  if(f?.type!=='Feature'||!p||!/^((node|way|relation)\/\d+|derived\/[a-z0-9-]+)$/.test(id)||ids.has(id)||!Number.isInteger(p.version)||p.version<1||!['plaza','street','crossing'].includes(p.kind)||!['pavers','asphalt','concrete','unknown'].includes(p.modeledSurface)||typeof p.surfaceEvidence!=='string'||!p.surfaceEvidence.length)throw error(id,'has an invalid identity, version, kind or surface evidence');
  if(p.surfaceEvidence==='unverified'&&p.modeledSurface!=='unknown')throw error(id,'assigns a surface material without supporting evidence');
  ids.add(id);
  let points:unknown[]=[];
  if(g?.type==='Polygon'&&p.kind==='plaza'&&Array.isArray(g.coordinates)&&g.coordinates.length<=20){
   if(!g.coordinates.length||g.coordinates.some(r=>!Array.isArray(r)||r.length<4||r.length>2000||!coordinate(r[0])||!coordinate(r.at(-1))||r[0][0]!==r.at(-1)![0]||r[0][1]!==r.at(-1)![1]))throw error(id,'has invalid or unclosed polygon rings');
   points=g.coordinates.flat();
  }else if(g?.type==='LineString'&&p.kind==='street'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2&&g.coordinates.length<=500){
   points=g.coordinates;
   if(!width(p.modeledWidth)||!['osm-tag','class-estimate'].includes(String(p.widthSource)))throw error(id,'has no bounded, sourced street width');
  }else if(g?.type==='Point'&&p.kind==='crossing'){
   points=[g.coordinates];
   if(!width(p.modeledWidth)||!width(p.roadWidth)||!finite(p.modeledBearing)||p.modeledBearing<0||p.modeledBearing>=360||!/^way\/\d+$/.test(String(p.orientationSource)))throw error(id,'has no valid crossing width or mapped road orientation');
  }else throw error(id,'has an unsupported geometry/kind combination');
  if(points.some(point=>!coordinate(point)))throw error(id,'has an invalid Stanford coordinate');
  pointCount+=points.length;if(pointCount>8000)throw error('input','exceeds the bounded coordinate budget');
  if(p.modeledCurbHeight!==undefined&&(!finite(p.modeledCurbHeight)||p.modeledCurbHeight<.06||p.modeledCurbHeight>.18||typeof p.curbEvidence!=='string'||!p.curbEvidence||p.curbEvidence==='unverified'))throw error(id,'assigns a curb without bounded height and supporting evidence');
  if(p.modeledMarkings!==undefined&&(!['lines','zebra'].includes(String(p.modeledMarkings))||typeof p.markingsEvidence!=='string'||!p.markingsEvidence||p.markingsEvidence==='unverified'))throw error(id,'assigns crossing markings without a reviewed pattern reference');
 }
 return data;
}

const materials={pavers:{kind:60,color:[.63,.55,.51] as Color},asphalt:{kind:61,color:[.37,.38,.36] as Color},concrete:{kind:62,color:[.76,.75,.68] as Color},unknown:{kind:63,color:[.66,.66,.61] as Color}};
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const dot=(a:Point,b:Point)=>a[0]*b[0]+a[1]*b[1];
const move=(p:Point,n:Point,d:number):Point=>[p[0]+n[0]*d,p[1]+n[1]*d];

/** Ground stays in the existing two geometry batches. Metre UVs are independent
 * of zoom and footprint dimensions. No centreline or lane arrow is inferred. */
export function addCampusSurfaces(mesh:MeshWriter,data:CampusSurfaces,project:(coordinate:readonly number[])=>Point):SurfaceCounts {
 const counts=emptySurfaceCounts();
 // Shared mapped nodes with three or more incident street segments identify
 // junctions. Break side curbs there rather than barricading a crossing road.
 const nodes=new Map<string,{point:Point;neighbors:Set<string>;width:number}>();
 for(const f of data.features)if(f.geometry.type==='LineString')for(let i=0;i<f.geometry.coordinates.length;i++){
  const coordinate=f.geometry.coordinates[i],key=coordinate.join(','),node=nodes.get(key)??{point:project(coordinate),neighbors:new Set<string>(),width:0};
  node.width=Math.max(node.width,Number(f.properties.modeledWidth));
  for(const j of [i-1,i+1])if(j>=0&&j<f.geometry.coordinates.length)node.neighbors.add(f.geometry.coordinates[j].join(','));
  nodes.set(key,node);
 }
 const junctions=[...nodes.values()].filter(node=>node.neighbors.size>=3);
 const triangle=(a:Vertex,b:Vertex,c:Vertex,color:Color,kind:number,uv?:[Point,Point,Point])=>{
  if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-8&&a[2]===b[2]&&b[2]===c[2])return;
  if(++counts.triangles>MAX_SURFACE_TRIANGLES)throw error('mesh','exceeds the 10000-triangle surface budget');
  mesh.triangle(a,b,c,color,kind,SURFACE_BUILDING,uv);
 };
 const quad=(points:[Vertex,Vertex,Vertex,Vertex],color:Color,kind:number,uv?:[Point,Point,Point,Point])=>{
  triangle(points[0],points[1],points[2],color,kind,uv?[uv[0],uv[1],uv[2]]:undefined);
  triangle(points[0],points[2],points[3],color,kind,uv?[uv[0],uv[2],uv[3]]:undefined);
 };
 for(const feature of data.features){
  const p=feature.properties,geometry=feature.geometry,{color,kind}=materials[p.modeledSurface];
  if(geometry.type==='Point'){
   counts.crossings++;
   const tagged=p['crossing:markings'],marking=tagged==='no'?'no':tagged??(p.markingsEvidence&&p.markingsEvidence!=='unverified'?p.modeledMarkings:undefined);if(marking!=='zebra'&&marking!=='lines')continue;
   const origin=project(geometry.coordinates),angle=Number(p.modeledBearing)*Math.PI/180,along:Point=[Math.sin(angle),Math.cos(angle)],across:Point=[along[1],-along[0]],half=Number(p.roadWidth)/2,span=Number(p.modeledWidth)/2;
   const at=(u:number,v:number):Vertex=>[origin[0]+across[0]*u+along[0]*v,origin[1]+across[1]*u+along[1]*v,.05];
   const stripe=(u0:number,u1:number,v0:number,v1:number)=>quad([at(u0,v0),at(u1,v0),at(u1,v1),at(u0,v1)],[.91,.90,.83],64,[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]);
   if(marking==='lines')for(const v of [-span,span])stripe(-half,half,v-.07,v+.07);
   else for(let u=-half+.15;u<half-.15;u+=1.1)stripe(u,Math.min(u+.5,half-.15),-span,span);
   counts.markings++;continue;
  }
  const points=(geometry.type==='Polygon'?geometry.coordinates[0]:geometry.coordinates).map(project),origin=points[0];
  let first=1;while(first<points.length&&distance(points[first],origin)<.001)first++;
  if(first===points.length)throw error(p.id,'has no nonzero edge');
  const length=distance(origin,points[first]),axis:Point=[(points[first][0]-origin[0])/length,(points[first][1]-origin[1])/length],normal:Point=[-axis[1],axis[0]];
  const uv=(point:Point):Point=>[dot([point[0]-origin[0],point[1]-origin[1]],axis),dot([point[0]-origin[0],point[1]-origin[1]],normal)];
  if(geometry.type==='Polygon'){
   counts.plazas++;
   const rings=geometry.coordinates.map(r=>r.slice(0,-1).map(project)),vertices=rings.flat(),holes:number[]=[];let offset=rings[0].length;
   for(const ring of rings.slice(1)){holes.push(offset);offset+=ring.length;}
   const indices=earcut(vertices.flat(),holes,2);
   for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>vertices[j]);triangle([...a,.025],[...b,.025],[...c,.025],color,kind,[uv(a),uv(b),uv(c)]);}
   continue;
  }
  counts.streets++;
  // The complete road network is now drawn by native, terrain-draped MapLibre
  // lines/fills. Do not retain overlapping custom ribbons, pointed end hulls or
  // duplicate material shading. Only independently evidenced curb relief stays.
  if(typeof p.modeledCurbHeight!=='number'||!p.curbEvidence||p.curbEvidence==='unverified')continue;
  const path:Point[]=[];for(const point of points)if(!path.length||distance(point,path.at(-1)!)>.001)path.push(point);
  if(path.length<2)throw error(p.id,'has no nonzero street segment');
  const half=Number(p.modeledWidth)/2;
  const normals=path.slice(1).map((b,i):Point=>{const a=path[i],length=distance(a,b);return [-(b[1]-a[1])/length,(b[0]-a[0])/length];});
  const joins=path.map((point,i):Point|null=>{
   if(i===0)return normals[0];if(i===path.length-1)return normals.at(-1)!;
   const a=normals[i-1],b=normals[i],sum:Point=[a[0]+b[0],a[1]+b[1]],den=dot(sum,b);
   if(den<.5)return null;
   const miter:Point=[sum[0]/den,sum[1]/den];
   // Limit both miter length and its projection along short source segments.
   return Math.hypot(...miter)<=2&&Math.abs(dot(miter,[a[1],-a[0]])*half)<Math.min(distance(path[i-1],point),distance(point,path[i+1]))*.45?miter:null;
  });
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],n=normals[i-1],na=joins[i-1]??n,nb=joins[i]??n;
   const corners:[Point,Point,Point,Point]=[move(a,na,half),move(a,na,-half),move(b,nb,-half),move(b,nb,half)];
   // Only an evidenced curb gets relief. Leave mapped junctions and crossing
   // landings open; a raised sidewall must not barricade either route.
   if(typeof p.modeledCurbHeight==='number'&&p.curbEvidence&&p.curbEvidence!=='unverified'){
    const length=distance(a,b),tangent:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length],gaps:[number,number][]=[];
    const gap=(point:Point,radius:number)=>{const delta:Point=[point[0]-a[0],point[1]-a[1]],along=dot(delta,tangent),away=Math.abs(dot(delta,n));if(away<half+.5&&along+radius>0&&along-radius<length)gaps.push([Math.max(0,(along-radius)/length),Math.min(1,(along+radius)/length)]);};
    for(const junction of junctions)gap(junction.point,junction.width/2+.35);
    for(const crossing of data.features)if(crossing.geometry.type==='Point'&&crossing.properties.orientationSource===p.id)gap(project(crossing.geometry.coordinates),Number(crossing.properties.modeledWidth)/2+.35);
    const stops=[0,...gaps.flat(),1].sort((a,b)=>a-b),mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    for(let interval=1;interval<stops.length;interval++){
     const lo=stops[interval-1],hi=stops[interval],middle=(lo+hi)/2;if(hi-lo<1e-6||gaps.some(([x,y])=>middle>x&&middle<y))continue;
     for(const [start,end,side] of [[corners[0],corners[3],1],[corners[1],corners[2],-1]] as [Point,Point,number][]){
      const q=mix(start,end,lo),r=mix(start,end,hi),top=p.modeledCurbHeight;
      quad([[...q,.035],[...r,.035],[...r,top],[...q,top]],[.69,.69,.64],65);
      quad([[...q,top],[...r,top],[...move(r,n,-side*.14),top],[...move(q,n,-side*.14),top]],[.76,.75,.69],65);
     }
    }
   }
  }
 }
 return counts;
}
