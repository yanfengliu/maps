import type { Junction, NetworkData } from "../../world/network-data.ts";
import type { VehicleAsset } from "../../world/agent-assets.ts";
import { boundaryProfile, boundaryProgress, type BoundaryProfile } from "../../network/boundaries.ts";
import { headingAt, sampleEdge } from "../../network/geometry.ts";
import { projectVehicleFootprint, validateActorFootprint, type ActorFootprint } from "../../network/footprints.ts";
import { assertVehicleMotionContext, sha256, type VehicleMotionContext } from "./motion-inputs.ts";
import { createTrajectory, type TrajectorySpan, type VehicleTrajectory } from "./trajectory.ts";
import { certifyVehicleSweep, type VehicleSweep } from "./sweep.ts";
import { fitVehicleSupport, type VehicleSupport } from "./surfaces.ts";
import { cross } from "./planar.ts";

export interface BoundaryIngressPlan {
  readonly routeEdgeIds:readonly string[];
  readonly corridorId:string;
  readonly classId:VehicleAsset["id"];
  readonly lengthM:number;
  readonly speedLimitMps:number;
  readonly authorityId:string|null;
  readonly digests:Readonly<{network:string;vehicles:string;surfaces:string;trajectory:string}>;
}
export interface IngressSample {
  readonly support:VehicleSupport;
  readonly footprint:ActorFootprint;
  readonly steeringRadians:number;
}
interface PreparedIngress {context:VehicleMotionContext;asset:VehicleAsset;trajectory:VehicleTrajectory;sweep:VehicleSweep;profile:BoundaryProfile}
const plans=new WeakMap<BoundaryIngressPlan,PreparedIngress>();
const angleError=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function sweepTouches(junction:Junction,sweep:VehicleSweep):boolean {
  return(junction.conflictAreas??[junction]).some(area=>sweep.pieces.some(ring=>{
    if(ring.every((a,i)=>cross(a,ring[(i+1)%ring.length]!,[area.position.x,area.position.z])>=0))return true;
    return ring.some((a,i)=>{const b=ring[(i+1)%ring.length]!,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((area.position.x-a[0])*dx+(area.position.z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(a[0]+dx*t-area.position.x,a[1]+dz*t-area.position.z)<area.radiusM;});
  }));
}
function sample(prepared:PreparedIngress,distanceM:number):IngressSample {
  const {trajectory,context,asset,profile}=prepared,p={x:0,z:0,headingRadians:0,curvaturePerM:0};trajectory.sample(distanceM,p);
  const support=fitVehicleSupport(context.surfaces,trajectory.corridorId,asset,{x:p.x,y:profile.position.y,z:p.z},p.headingRadians);
  const footprint=projectVehicleFootprint(asset,support.position,support.supportYawRadians,support.normal,1,support.wheelOffsets);
  return Object.freeze({support,footprint,steeringRadians:Math.atan((asset.axles.frontZ-asset.axles.rearZ)*p.curvaturePerM)});
}
/** This factory certifies its own sweep. Callers cannot provide a wide hull as
 * admission permission. The first increment supports at most one authority. */
export async function createBoundaryIngressPlan(context:VehicleMotionContext,routeEdgeIds:readonly string[],corridorId:string,classId:VehicleAsset["id"],spans:readonly TrajectorySpan[],speedLimitMps=2):Promise<BoundaryIngressPlan> {
  assertVehicleMotionContext(context);
  if(!Number.isFinite(speedLimitMps)||speedLimitMps<=0||speedLimitMps>2)throw new Error("This bounded ingress increment supports positive speeds up to 2 m/s; revalidate faster motion before admission.");
  const route=[...routeEdgeIds],byId=new Map(context.network.lanes.map(e=>[e.id,e])),edges=route.map(id=>byId.get(id));
  if(!edges.length||edges.some((e,i)=>!e||i>0&&!edges[i-1]!.nextIds.includes(e.id))||!context.network.portals.vehicleExit.includes(route.at(-1)!))throw new Error("Vehicle ingress needs its actual complete legal directed route ending at an AOI exit.");
  const first=edges[0]!,profile=boundaryProfile(context.network,"vehicle",first,true),asset=context.fleet.vehicles.find(a=>a.id===classId);
  if(!profile||!asset)throw new Error(`Vehicle ingress ${route[0]}/${classId} has no actual entrance or displayed fleet class.`);
  const trajectory=createTrajectory([first.id],corridorId,spans),sweep=certifyVehicleSweep(trajectory,asset,context.surfaces,speedLimitMps);
  const start={x:0,z:0,headingRadians:0,curvaturePerM:0},end={...start};trajectory.sample(0,start);trajectory.sample(trajectory.lengthM,end);
  if(Math.hypot(end.x-profile.position.x,end.z-profile.position.z)>.0001||angleError(end.headingRadians,headingAt(first,0))>1e-6||Math.abs(end.curvaturePerM)>1e-7)throw new Error(`Vehicle ingress ${first.id} must join its actual portal with continuous position, source bearing and zero straight-approach curvature.`);
  // A convex half-plane/disk bound on all controls bounds the entire Bézier
  // origin path. It does not permit a normal displacement or heading snap.
  if(trajectory.spans.some(span=>span.controls.some(([x,z])=>Math.hypot(x-profile.position.x,z-profile.position.z)>profile.maxDistanceM+1e-6||(x-profile.position.x)*profile.outward.x+(z-profile.position.z)*profile.outward.z<-.0001)))throw new Error(`Vehicle ingress ${first.id} leaves the canonical exterior ${profile.maxDistanceM} m preparation envelope.`);
  const prepared={context,asset,trajectory,sweep,profile},initial=sample(prepared,0);
  if(!boundaryProgress(profile,initial.footprint).fullyOutside)throw new Error(`Vehicle ingress ${first.id} must prepare the entire supported body outside the canonical AOI.`);
  // Contact is checked at every fixed-step-sized candidate interval and again
  // at every actual observation. This is not a continuous vertical proof.
  const count=Math.ceil(trajectory.lengthM/(speedLimitMps/60));for(let i=1;i<=count;i++)sample(prepared,trajectory.lengthM*i/count);
  const owners=context.network.junctions.filter(j=>sweepTouches(j,sweep));
  if(owners.length>1)throw new Error(`Vehicle ingress ${first.id} sweeps independent authorities ${owners.map(j=>j.id).join(", ")}; do not materialize before a reviewed compound solution.`);
  const trajectoryDigest=await sha256(new TextEncoder().encode(JSON.stringify({route,corridorId,classId,speedLimitMps,spans:trajectory.spans})));
  const plan:BoundaryIngressPlan=Object.freeze({routeEdgeIds:Object.freeze(route),corridorId,classId,lengthM:trajectory.lengthM,speedLimitMps,authorityId:owners[0]?.id??null,digests:Object.freeze({network:context.digests.network,vehicles:context.digests.vehicles,surfaces:context.digests.surfaces,trajectory:trajectoryDigest})});plans.set(plan,prepared);return plan;
}
export function assertBoundaryIngressPlan(plan:BoundaryIngressPlan,network?:Partial<NetworkData>,route?:readonly string[]):void {
  const prepared=plans.get(plan);
  if(!prepared||network&&prepared.context.network!==network||route&&(route.length!==plan.routeEdgeIds.length||route.some((id,i)=>id!==plan.routeEdgeIds[i])))throw new Error("Boundary ingress requires a factory-issued plan bound to this exact network and complete route.");
}
export function sampleBoundaryIngress(plan:BoundaryIngressPlan,distanceM:number):IngressSample {assertBoundaryIngressPlan(plan);return sample(plans.get(plan)!,distanceM);}
export function validateIngressFootprint(plan:BoundaryIngressPlan,distanceM:number,footprint:ActorFootprint):IngressSample {
  assertBoundaryIngressPlan(plan);validateActorFootprint(footprint);
  const expected=sampleBoundaryIngress(plan,distanceM),origin=footprint.origin,normal=footprint.supportNormal;
  if(!origin||!normal||footprint.vehicle?.classId!==plan.classId||footprint.vehicle.scale!==1||Math.hypot(origin.x-expected.support.position.x,origin.y-expected.support.position.y,origin.z-expected.support.position.z)>.001||angleError(footprint.headingRadians,expected.support.supportYawRadians)>1e-5||Math.hypot(normal.x-expected.support.normal.x,normal.y-expected.support.normal.y,normal.z-expected.support.normal.z)>1e-5||footprint.hull?.length!==expected.footprint.hull!.length||footprint.hull.some((p,i)=>Math.hypot(p.x-expected.footprint.hull![i]!.x,p.z-expected.footprint.hull![i]!.z)>.001))throw new Error("Boundary ingress observation differs from its certified class, scale, support, heading or monotonic plan position.");
  return expected;
}
/** Signed front distance from the actual first route stop line. Negative is
 * still outside. This uses the true source bearing, not support-yaw input. */
export function ingressStopLineDistance(plan:BoundaryIngressPlan,footprint:ActorFootprint,controlDistanceM=0):number {
  assertBoundaryIngressPlan(plan);const prepared=plans.get(plan)!,edge=prepared.context.network.lanes.find(e=>e.id===plan.routeEdgeIds[0])!,heading=headingAt(edge,controlDistanceM),p=sampleEdge(edge,controlDistanceM);
  return Math.max(...footprint.hull!.map(v=>(v.x-p.x)*Math.sin(heading)+(v.z-p.z)*Math.cos(heading)));
}
export function ingressSweep(plan:BoundaryIngressPlan):VehicleSweep{assertBoundaryIngressPlan(plan);return plans.get(plan)!.sweep;}
