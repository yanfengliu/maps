import type {CampusTrafficData} from './campus-traffic.ts';
import type {CampusRoadData} from './campus-road-layer.ts';
import type {RegisterTerrainAnchor} from './terrain-grounding.ts';

type Point=[number,number];
type Vertex=[number,number,number];
interface MeshWriter {quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,color:Vertex,kind:number,object:number,uv?:[Point,Point,Point,Point]):void}
export interface StopSignInput {controls:CampusTrafficData;roads:CampusRoadData}
export interface StopSignCounts {stops:number;sourceDirected:number;estimatedFacing:number;junctionControls:number}
export const emptyStopSignCounts=():StopSignCounts=>({stops:0,sourceDirected:0,estimatedFacing:0,junctionControls:0});
// Standard-scale interpretation, not surveyed dimensions of individual signs.
export const STOP_SIGN={width:0.762,bottom:2.134,postRadius:0.032,shoulder:0.6,faceKind:96,postKind:97} as const;
export interface StopSignPlacement {id:string;source:Point;position:Point;travel:Point;roadId:string;roadWidth:number;setback:number;facingEvidence:'source-direction'|'estimated-road-direction';poleEvidence:'estimated-roadside-offset';junctionControlIds:string[]}

/** Preserve each regulatory source point. A separate render placement puts the
 * object beside its associated road, never edits the source into a pole survey.
 * Unknown/all-way nodes get one representative sign, not an invented pole count. */
export function stopSignPlacements(input:StopSignInput,project:(p:readonly number[])=>Point):StopSignPlacement[]{
  const roads=new Map(input.roads.features.map(f=>[f.properties.id,f]));
  const placements:StopSignPlacement[]=input.controls.features.filter(f=>f.properties.controlType==='stop').map(f=>{
    const p=f.properties,source=project(f.geometry.coordinates),node=p.id.replace(/^node\//,'');
    const candidates=(Array.isArray(p.retainedWayIds)?p.retainedWayIds:[]).map(id=>roads.get(String(id))).filter(r=>r?.geometry.type==='LineString').sort((a,b)=>String(a!.properties.id).localeCompare(String(b!.properties.id)));
    const road=candidates[0];
    if(!road||road.geometry.type!=='LineString')throw new Error(`Stop sign ${p.id} has no retained road for physical placement.`);
    const index=road.properties.sourceNodeIds.findIndex(id=>id.replace(/^node\//,'')===node),points=road.geometry.coordinates;
    if(index<0)throw new Error(`Stop sign ${p.id} is disconnected from its source road.`);
    const raw=String(p['stop:direction']??p.direction??'');
    const knownRelative=(raw==='forward'||raw==='backward')&&candidates.length===1;
    const compass=raw.trim()!==''&&Number.isFinite(Number(raw))&&Number(raw)>=0&&Number(raw)<=360;
    // Select the incoming segment when direction is known, retaining way order.
    const backward=raw==='backward'||(!knownRelative&&index===0);
    const a=project(points[backward?index:Math.max(0,index-1)]),b=project(points[backward?Math.min(points.length-1,index+1):index]);
    let dx=b[0]-a[0],dy=b[1]-a[1];
    if(Math.hypot(dx,dy)<1e-6){const start=project(points[Math.max(0,index-1)]),end=project(points[Math.min(points.length-1,index+1)]);dx=end[0]-start[0];dy=end[1]-start[1];}
    const length=Math.hypot(dx,dy);if(length<1e-6)throw new Error(`Stop sign ${p.id} has a zero-length road direction.`);
    let travel:Point=[dx/length*(backward?-1:1),dy/length*(backward?-1:1)];
    if(compass){const angle=Number(raw)*Math.PI/180;travel=[Math.sin(angle),Math.cos(angle)];}
    const roadWidth=Number(road.properties.modeledWidth);
    if(!Number.isFinite(roadWidth)||roadWidth<=0)throw new Error(`Stop sign ${p.id} has no finite road width.`);
    const offset=roadWidth/2+STOP_SIGN.shoulder;
    // A node at the intersection itself needs an upstream corner placement,
    // otherwise the lateral offset lands in the crossing carriageway.
    const setback=candidates.length>1?Math.max(...candidates.map(r=>Number(r!.properties.modeledWidth)))/2+1:0;
    return {id:p.id,source,position:[source[0]+travel[1]*offset-travel[0]*setback,source[1]-travel[0]*offset-travel[1]*setback],travel,roadId:road.properties.id,roadWidth,setback,facingEvidence:knownRelative||compass?'source-direction':'estimated-road-direction',poleEvidence:'estimated-roadside-offset',junctionControlIds:[]};
  });
  const sourceById=new Map(input.controls.features.map(f=>[f.properties.id,f.properties]));
  return placements.filter(sign=>{
    const p=sourceById.get(sign.id)!;
    if(p.stop!=='all'||sign.facingEvidence==='source-direction')return true;
    // OSM permits stop=all on the junction as well as individually mapped
    // approach nodes. Keep the control identity, but do not invent another
    // physical post when a directed approach on the same road already exists.
    const approach=placements.filter(other=>other.facingEvidence==='source-direction'&&Math.hypot(other.source[0]-sign.source[0],other.source[1]-sign.source[1])<30&&(p.retainedWayIds as string[]).includes(other.roadId)).sort((a,b)=>a.id.localeCompare(b.id))[0];
    if(!approach)return true;
    approach.junctionControlIds.push(sign.id);return false;
  });
}

/** Shared metre-scale object: triangular steel post and a two-sided plate.
 * Fragment clipping cuts the plate to an octagon; its back is bare metal.
 * Eight triangles per sign keep the complete set within the campus budget. */
export function addStopSigns(mesh:MeshWriter,placements:readonly StopSignPlacement[],anchor:RegisterTerrainAnchor):StopSignCounts{
  const counts=emptyStopSignCounts(),{width,bottom,postRadius,faceKind,postKind}=STOP_SIGN;
  for(const sign of placements){
    const [x,y]=sign.position,[dx,dy]=sign.travel,right:Point=[dy,-dx],normal:Point=[-dx,-dy],object=anchor(sign.position);
    const point=(u:number,z:number,depth=0):Vertex=>[x+right[0]*u+normal[0]*depth,y+right[1]*u+normal[1]*depth,z];
    // The post goes just below ground; all vertices share one rigid DEM anchor.
    for(let side=0;side<3;side++){
      const a=2*Math.PI*side/3,b=2*Math.PI*(side+1)/3;
      const at=(angle:number,z:number):Vertex=>[x+postRadius*Math.cos(angle),y+postRadius*Math.sin(angle),z];
      mesh.quad(at(a,-0.08),at(b,-0.08),at(b,bottom+width*.78),at(a,bottom+width*.78),[.58,.60,.59],postKind,object);
    }
    mesh.quad(point(-width/2,bottom,postRadius+.006),point(width/2,bottom,postRadius+.006),point(width/2,bottom+width,postRadius+.006),point(-width/2,bottom+width,postRadius+.006),[.72,.08,.07],faceKind,object,[[0,0],[1,0],[1,1],[0,1]]);
    counts.stops++;if(sign.facingEvidence==='source-direction')counts.sourceDirected++;else counts.estimatedFacing++;
    counts.junctionControls+=sign.junctionControlIds.length;
  }
  return counts;
}
