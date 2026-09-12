/** Offline authority grouping over legal successor graphs. No physical circle or source marking is enlarged. */
import type { Junction, LaneEdge, NetworkData, NetworkEdge, WalkEdge } from "../../src/world/network-data.ts";
import { ADMISSION_BOUNDS } from "../../src/network/admission-bounds.ts";
import { headingAt } from "../../src/network/geometry.ts";

export interface AuthorityTransition {from:string;to:string;gapM:number}
/** Consecutive authorities through any finite outside path. Keeping the shortest discovered distance also terminates cycles. */
export function authorityTransitions(edges:readonly NetworkEdge[]):AuthorityTransition[] {
  const byId=new Map(edges.map(e=>[e.id,e])),pairs=new Map<string,AuthorityTransition>();
  for(const edge of edges){if(!edge.junctionId)continue;const pending=edge.nextIds.map(id=>({id,gapM:0})),seen=new Map<string,number>();
    while(pending.length){const item=pending.pop()!,next=byId.get(item.id)!;
      if(next.junctionId){if(next.junctionId!==edge.junctionId){const key=`${edge.junctionId}>${next.junctionId}`,previous=pairs.get(key);if(!previous||item.gapM<previous.gapM)pairs.set(key,{from:edge.junctionId,to:next.junctionId,gapM:item.gapM});}continue;}
      if((seen.get(next.id)??Infinity)<=item.gapM)continue;seen.set(next.id,item.gapM);
      for(const id of next.nextIds)pending.push({id,gapM:item.gapM+next.lengthM});
    }
  }
  return [...pairs.values()].sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
}
export function primitiveSeparation(a:Junction,b:Junction):number {
  return Math.min(...(a.conflictAreas??[a]).flatMap(x=>(b.conflictAreas??[b]).map(y=>Math.hypot(x.position.x-y.position.x,x.position.z-y.position.z)-x.radiusM-y.radiusM)));
}
/** Analytical support-circle bound over every consecutive authority in both complete successor graphs. */
export function validateCompoundClearance(network:Pick<NetworkData,"junctions"|"lanes"|"walks">):void {
  const byId=new Map(network.junctions.map(j=>[j.id,j]));
  for(const[kind,edges]of [["vehicle",network.lanes],["pedestrian",network.walks]] as const)for(const t of authorityTransitions(edges)){
    const separation=primitiveSeparation(byId.get(t.from)!,byId.get(t.to)!);
    if(t.gapM<ADMISSION_BOUNDS.routeGroupingGapM-1e-6||separation<ADMISSION_BOUNDS.maxFootprintDiagonalM+ADMISSION_BOUNDS.stopGapM-1e-6)throw new Error(`Compound clearance: ${kind} route ${t.from} -> ${t.to} has ${t.gapM} m route gap / ${separation} m primitive separation; group its authorities for the supported footprint and stop gap.`);
  }
}
export function groupCompounds(junctions:Junction[],lanes:LaneEdge[],walks:WalkEdge[]):{junctions:Junction[];owners:Map<string,string>} {
  const byId=new Map(junctions.map(j=>[j.id,j])),parent=new Map(junctions.map(j=>[j.id,j.id]));
  const find=(id:string):string=>{let root=id;while(parent.get(root)!==root)root=parent.get(root)!;return root;};
  for(const transition of [...authorityTransitions(lanes),...authorityTransitions(walks)]){
    const a=byId.get(transition.from)!,b=byId.get(transition.to)!;
    if(transition.gapM<ADMISSION_BOUNDS.routeGroupingGapM||primitiveSeparation(a,b)<ADMISSION_BOUNDS.maxFootprintDiagonalM+ADMISSION_BOUNDS.stopGapM){const left=find(a.id),right=find(b.id);if(left!==right)parent.set(right,left);}
  }
  const clusters=new Map<string,Junction[]>();for(const j of junctions){const id=find(j.id),members=clusters.get(id)??[];members.push(j);clusters.set(id,members);}
  const owners=new Map<string,string>(),result:Junction[]=[];
  for(const members of clusters.values()){
    members.sort((a,b)=>Number(b.id==="scramble")-Number(a.id==="scramble")||a.id.localeCompare(b.id));const anchor=members[0]!;
    for(const j of members)owners.set(j.id,anchor.id);
    const areas=members.flatMap(j=>j.conflictAreas??[{position:j.position,radiusM:j.radiusM}]);
    result.push({...anchor,memberIds:members.flatMap(j=>j.memberIds??[j.id]),controlKind:members.some(j=>j.controlKind==="signal")?"signal":"reservation",controlSource:members.some(j=>j.controlSource==="mapped")?"mapped":members.some(j=>j.controlSource==="authored")?"authored":"inferred",conflictAreas:areas,radiusM:Math.max(...areas.map(a=>Math.hypot(a.position.x-anchor.position.x,a.position.z-anchor.position.z)+a.radiusM)),vehicleGreenSeconds:Math.max(...members.map(j=>j.vehicleGreenSeconds)),pedestrianGreenSeconds:Math.max(...members.map(j=>j.pedestrianGreenSeconds)),clearanceSeconds:Math.max(...members.map(j=>j.clearanceSeconds)),vehicleGroups:[],pedestrianGroup:`${anchor.id}:pedestrian`});
  }
  const compoundById=new Map(result.map(j=>[j.id,j]));
  for(const edge of [...lanes,...walks])if(edge.junctionId){edge.junctionId=owners.get(edge.junctionId)!;const owner=compoundById.get(edge.junctionId)!;const lane=edge as LaneEdge;if(lane.kind==="lane"||lane.kind==="turn"){const sector=((Math.round(headingAt(edge,0)/(Math.PI/2))%4)+4)%4;edge.signalGroupId=owner.controlKind==="signal"?`${owner.id}:vehicle:${sector}`:null;if(lane.entryRule!=="stop"&&lane.entryRule!=="yield")lane.entryRule=owner.controlKind==="signal"?"signal":"priority";}else edge.signalGroupId=owner.controlKind==="signal"?owner.pedestrianGroup:null;}
  for(const j of result)j.vehicleGroups=[...new Set(lanes.filter(e=>e.junctionId===j.id&&e.signalGroupId).map(e=>e.signalGroupId!))].sort();
  // Union changes which primitives belong to each consecutive authority. Reach a
  // fixed point over those new boundaries; a one-pass feasibility census is insufficient.
  if(result.length<junctions.length){const next=groupCompounds(result,lanes,walks);for(const[id,owner]of owners)owners.set(id,next.owners.get(owner)!);return{junctions:next.junctions,owners};}
  return{junctions:result,owners};
}
