import type { Junction, LaneEdge, NetworkData, NetworkEdge } from "../world/network-data.ts";
import { headingAt, projectOntoEdge } from "./geometry.ts";
import { boundaryProfile, type BoundaryNetwork, type BoundaryProfile } from "./boundaries.ts";
import { footprintOccupies,validateActorFootprint,type ActorFootprint } from "./footprints.ts";

export type ActorKind="vehicle"|"pedestrian";
export interface RouteControl {routeIndex:number;distanceM:number;nodeIds:readonly number[];rule:"stop"|"yield"}
export interface RoutePassage {
  readonly kind:ActorKind;readonly junctionId:string;readonly entryIndex:number;readonly lastConflictIndex:number;
  readonly routeEdgeIds:readonly string[];readonly edges:readonly NetworkEdge[];readonly starts:readonly number[];
  readonly controls:readonly RouteControl[];
  readonly boundaryExit:BoundaryProfile|null;
  readonly boundaryEntry:boolean;readonly entrySignalGroupId:string|null;
}
const passages=new WeakSet<object>();
/** Use the actual complete planned route. Repeated edge IDs are allowed; occurrence indices distinguish a later lap. */
export function createRoutePassage(network:Pick<NetworkData,"lanes"|"walks">&Partial<Pick<NetworkData,"physical">&BoundaryNetwork>,kind:ActorKind,routeEdgeIds:readonly string[],entryIndex:number):RoutePassage {
  return buildPassage(network,kind,routeEdgeIds,entryIndex);
}
/** A materializing body can overlap a controller even when its route starts outside all conflict sections. */
export function createBoundaryEntryPassage(network:Pick<NetworkData,"lanes"|"walks"|"junctions"|"nodes"|"boundary"|"portals"|"physical">,kind:ActorKind,routeEdgeIds:readonly string[],footprint:ActorFootprint):RoutePassage|null {
  validateActorFootprint(footprint);const first=(kind==="vehicle"?network.lanes:network.walks).find(e=>e.id===routeEdgeIds[0]);
  const profile=first&&boundaryProfile(network,kind,first,true),origin=footprint.origin??footprint.position;
  if(!profile||Math.hypot(origin.x-profile.position.x,origin.z-profile.position.z)>.001)throw new Error("Boundary entry passage requires the actual prepared body at a real entrance portal.");
  const owners=network.junctions.filter(j=>kind==="pedestrian"?j.id===first!.junctionId:footprintOccupies(j,footprint));
  if(!owners.length)return null;if(owners.length!==1)throw new Error(`Boundary ${first!.id} body spans ${owners.length} independent authorities; regroup the supported portal envelope before materializing.`);
  const owner=owners[0]!,yaw=headingAt(first!,0),group=kind==="pedestrian"?owner.pedestrianGroup:owner.vehicleGroups.toSorted((a,b)=>{
    const angle=(id:string)=>{const sector=Number(id.split(":").at(-1));if(!Number.isInteger(sector)||sector<0||sector>3)throw new Error(`Boundary controller group ${id} has no authored heading sector.`);return Math.abs(Math.atan2(Math.sin(yaw-sector*Math.PI/2),Math.cos(yaw-sector*Math.PI/2)));};return angle(a)-angle(b)||a.localeCompare(b);
  })[0]??null;
  if(owner.controlKind==="signal"&&!group)throw new Error(`Boundary ${first!.id} needs an authored vehicle phase in ${owner.id} before materialization.`);
  return buildPassage(network,kind,routeEdgeIds,0,{owner,group:owner.controlKind==="signal"?group:null});
}
function buildPassage(network:Pick<NetworkData,"lanes"|"walks">&Partial<Pick<NetworkData,"physical">&BoundaryNetwork>,kind:ActorKind,routeEdgeIds:readonly string[],entryIndex:number,boundary?:{owner:Junction;group:string|null}):RoutePassage {
  const byId=new Map((kind==="vehicle"?network.lanes:network.walks).map(e=>[e.id,e]));
  if(!Array.isArray(routeEdgeIds)||!routeEdgeIds.length||!Number.isInteger(entryIndex)||entryIndex<0||entryIndex>=routeEdgeIds.length)throw new Error("Route passage needs a complete directed route and a valid conflict entry index.");
  const edges=routeEdgeIds.map(id=>{const edge=byId.get(id);if(!edge)throw new Error(`Route passage ${kind} edge ${id} is missing from the network.`);return edge;});
  for(let i=1;i<edges.length;i++)if(!edges[i-1]!.nextIds.includes(edges[i]!.id))throw new Error(`Route passage cannot jump from ${edges[i-1]!.id} to ${edges[i]!.id}; use legal nextIds.`);
  const junctionId=boundary?.owner.id??edges[entryIndex]!.junctionId;
  if(!junctionId)throw new Error(`Route passage entry ${edges[entryIndex]!.id} is outside every conflict authority.`);
  let lastConflictIndex=boundary?-1:entryIndex;
  for(let i=boundary?entryIndex:entryIndex+1;i<edges.length;i++){const owner=edges[i]!.junctionId;if(owner&&owner!==junctionId)break;if(owner===junctionId)lastConflictIndex=i;}
  const boundaryExit=boundaryProfile(network,kind,edges.at(-1)!);
  if((lastConflictIndex+1>=edges.length&&!boundaryExit)||(lastConflictIndex+1<edges.length&&edges[lastConflictIndex+1]!.junctionId))throw new Error(`Route passage for ${junctionId} needs an outside exit section or a true AOI terminal with explicit boundary retirement.`);
  const starts:number[]=[],controls:RouteControl[]=[];let total=0;
  for(let i=0;i<edges.length;i++){
    starts.push(total);const edge=edges[i]!;total+=edge.lengthM;
    if(i<entryIndex||i>lastConflictIndex||kind!=="vehicle"||network.physical)continue;
    const lane=edge as LaneEdge;if(lane.entryRule!=="stop"&&lane.entryRule!=="yield")continue;
    const nodeIds=lane.sourceControlNodeIds;
    if(nodeIds.length)controls.push(Object.freeze({routeIndex:i,distanceM:0,nodeIds:Object.freeze([...nodeIds]),rule:lane.entryRule}));
  }
  // Physical entry IDs identify lease boundaries, not a relocated stop line.
  // Project each mapped node onto each occurrence of its directed approach.
  if(kind==="vehicle"&&network.physical)for(const source of network.physical.trafficControls){
    if(!["stop","give_way"].includes(source.kind)||source.controllerId!==junctionId)continue;
    const approaches=new Set(source.approachEdgeIds);let best:{routeIndex:number;distanceM:number;offsetM:number}|undefined;
    const flush=()=>{if(best)controls.push(Object.freeze({routeIndex:best.routeIndex,distanceM:best.distanceM,nodeIds:Object.freeze([source.sourceNodeId]),rule:source.kind==="stop"?"stop":"yield"}));best=undefined;};
    for(let i=entryIndex;i<=lastConflictIndex;i++){
      const edge=edges[i]!;if(!approaches.has(edge.id)){flush();continue;}
      if(edge.junctionId!==junctionId)continue;
      const projected=projectOntoEdge(edge,source.position);if(!best||projected.offsetM<best.offsetM-1e-9)best={routeIndex:i,...projected};
    }
    flush();
  }
  controls.sort((a,b)=>a.routeIndex-b.routeIndex||a.distanceM-b.distanceM||a.nodeIds[0]!-b.nodeIds[0]!);
  const passage=Object.freeze({kind,junctionId,entryIndex,lastConflictIndex,routeEdgeIds:Object.freeze([...routeEdgeIds]),edges:Object.freeze(edges),starts:Object.freeze(starts),controls:Object.freeze(controls),boundaryExit,boundaryEntry:Boolean(boundary),entrySignalGroupId:boundary?boundary.group:edges[entryIndex]!.signalGroupId});passages.add(passage);return passage;
}
export function assertRoutePassage(passage:RoutePassage):void {if(!passage||!passages.has(passage))throw new Error("Admission requires a RoutePassage derived from the actual complete route with createRoutePassage.");}
