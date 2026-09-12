import type { NetworkData, NetworkEdge, WorldPoint } from "../world/network-data.ts";
import { MAX_BOUNDARY_EGRESS_M } from "./admission-bounds.ts";
import { footprintVertices, type ActorFootprint } from "./footprints.ts";

export interface BoundaryProfile {edgeId:string;position:WorldPoint;outward:{x:number;z:number};maxDistanceM:number;provenance:"authored-boundary-retirement-envelope"}
export type BoundaryNetwork=Pick<NetworkData,"nodes"|"boundary"|"portals">;
export function boundaryProfile(network:Partial<BoundaryNetwork>,kind:"vehicle"|"pedestrian",edge:NetworkEdge,entrance=false):BoundaryProfile|null {
  if(!network.boundary||!network.nodes||!network.portals)return null;
  const nodeId=entrance?edge.from:edge.to;
  if(!network.nodes.some(n=>n.id===nodeId&&n.boundary))return null;
  if(kind==="vehicle"&&!(entrance?network.portals.vehicleEntry:network.portals.vehicleExit).includes(edge.id))return null;
  if(kind==="pedestrian"&&entrance&&!network.portals.pedestrian.includes(edge.id))return null;
  const polygon=network.boundary.polygon,position=entrance?edge.points[0]!:edge.points.at(-1)!;
  let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!;area+=a.x*b.z-b.x*a.z;}
  const sign=area<0?1:-1;let nearest:{normal:{x:number;z:number};distance:number}|undefined;
  for(let i=0;i<polygon.length;i++){const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),normal={x:-dz/length*sign,z:dx/length*sign},distance=Math.abs((position.x-a.x)*normal.x+(position.z-a.z)*normal.z);if(!nearest||distance<nearest.distance)nearest={normal,distance};}
  if(!nearest||nearest.distance>.02)throw new Error(`Portal ${edge.id} is not on the canonical projected AOI polygon; rebuild boundary metadata.`);
  return Object.freeze({edgeId:edge.id,position:{...position},outward:nearest.normal,maxDistanceM:MAX_BOUNDARY_EGRESS_M,provenance:"authored-boundary-retirement-envelope"});
}
/** This bounds lifecycle positions; it does not synthesize velocity, yaw or a road successor. */
export function boundaryProgress(profile:BoundaryProfile,footprint:ActorFootprint):{outwardM:number;fullyOutside:boolean} {
  const origin=footprint.origin??footprint.position,dx=origin.x-profile.position.x,dz=origin.z-profile.position.z,outwardM=dx*profile.outward.x+dz*profile.outward.z;
  if(Math.hypot(dx,dz)>profile.maxDistanceM+1e-6||outwardM<-.001)throw new Error(`Actor egress at ${profile.edgeId} leaves the authored ${profile.maxDistanceM} m outward retirement envelope; supply a continuous supported boundary trajectory.`);
  return{outwardM,fullyOutside:footprintVertices(footprint).every(p=>(p.x-profile.position.x)*profile.outward.x+(p.z-profile.position.z)*profile.outward.z>1e-5)};
}
