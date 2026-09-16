/** harness: full-source named surfaces/trajectory checker plus the real fixed
 * admission controller. Incoming exterior transit is physically supported;
 * outgoing starts from an explicitly precommitted interior seed. Neither
 * claims a supported complete city trip between these separate paths. */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createVehicleMotionContext,type VehicleMotionBytes} from "../../src/agents/core/motion-inputs.ts";
import {createBoundaryIngressPlan,sampleBoundaryIngress,type IngressSample} from "../../src/agents/core/ingress.ts";
import {straightSpan,createTrajectory} from "../../src/agents/core/trajectory.ts";
import {fitVehicleSupport} from "../../src/agents/core/surfaces.ts";
import {JunctionAdmissions,type AdmissionRequest} from "../../src/network/admissions.ts";
import {createBoundaryEntryPassage,createRoutePassage} from "../../src/network/passages.ts";
import {projectVehicleFootprint,footprintOccupies} from "../../src/network/footprints.ts";
import {headingAt,sampleEdge} from "../../src/network/geometry.ts";
import {boundaryProfile,boundaryProgress} from "../../src/network/boundaries.ts";
import type {VehiclePoseBuffers} from "../../src/world/agent-poses.ts";
import {namedVehiclePath} from "../scene/build-vehicle-surfaces.ts";

const directory=process.argv[2]??"artifacts/network/vehicle-increment",paths={network:"data/network/network.json",vehicles:"data/scene/agents/vehicles.json",surfaces:resolve(directory,"vehicle-surfaces.json"),overlay:resolve(directory,"vehicle-support-overlay.mesh"),roads:"data/scene/roads.mesh",pavementSource:"data/scene/pavement-source.json",pavements:"data/scene/pavements.mesh",hardware:"data/scene/control-hardware.json"};
const input=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([key,path])=>[key,await readFile(path)]))) as unknown as VehicleMotionBytes,context=await createVehicleMotionContext(input),network=context.network,byId=new Map(network.lanes.map(e=>[e.id,e])),dt=1/60;
function completeRoute(first:string):string[]{const queue=[[first]],seen=new Set<string>();while(queue.length){const path=queue.shift()!,id=path.at(-1)!;if(network.portals.vehicleExit.includes(id))return path;if(seen.has(id))continue;seen.add(id);for(const next of byId.get(id)!.nextIds)queue.push([...path,next]);}throw new Error(`Named source entry ${first} has no complete exit route.`);}
function buffers(variant:number):VehiclePoseBuffers{const frame=()=>({position:new Float32Array(3),yaw:new Float32Array(1),supportNormal:new Float32Array([0,1,0]),travelledMetres:new Float64Array(1),generation:new Uint32Array([1]),wheelOffsets:new Float32Array(4),frontSteeringRadians:new Float32Array(1)});return{count:1,previous:frame(),current:frame(),active:new Uint8Array(1),variant:new Uint8Array([variant]),scale:new Float32Array([1]),speedMps:new Float32Array(1)};}
function put(poses:VehiclePoseBuffers,sample:IngressSample,speed:number){const s=sample.support;poses.current.position.set([s.position.x,s.position.y,s.position.z]);poses.current.supportNormal.set([s.normal.x,s.normal.y,s.normal.z]);poses.current.yaw[0]=s.supportYawRadians;poses.current.wheelOffsets.set(s.wheelOffsets);poses.current.frontSteeringRadians[0]=sample.steeringRadians;poses.speedMps[0]=speed;}
const incoming=network.lanes.find(e=>e.id==="lane:23334638:0:0:ground0:f:0:section0")!,route=completeRoute(incoming.id),nominal=namedVehiclePath(network,incoming.id),results=[];
for(const [variant,asset]of context.fleet.vehicles.entries()){
  const plan=await createBoundaryIngressPlan(context,route,"23334638-boundary",asset.id,[straightSpan([nominal.start.x,nominal.start.z],[incoming.points[0]!.x,incoming.points[0]!.z])]),poses=buffers(variant),admissions=new JunctionAdmissions(network),binding=admissions.bindBoundaryActor(asset.id,"vehicle",0,poses,route,plan),initial=sampleBoundaryIngress(plan,0),passage=createBoundaryEntryPassage(network,"vehicle",route,initial.footprint,plan);put(poses,initial,0);
  if(passage){const request:AdmissionRequest={actorId:asset.id,kind:"vehicle",passage,entryEdgeId:incoming.id,footprint:initial.footprint,stoppedSeconds:0,yieldSatisfied:false,receivingSpace:true};let granted=false;for(let i=0;i<180*60&&!granted;i++)granted=admissions.resolve(dt,[request]).includes(asset.id);if(!granted)throw new Error(`No finite ${asset.id} ingress phase.`);}
  admissions.activateBoundary(binding,initial.footprint);let observations=0;
  for(let distance=0;distance<plan.lengthM;){const next=Math.min(plan.lengthM,distance+2*dt),p=sampleBoundaryIngress(plan,next);put(poses,p,(next-distance)/dt);admissions.resolve(dt,[]);const done=admissions.observeBoundaryIngress(binding,{distanceM:next,footprint:p.footprint});distance=next;observations++;if(done){if(Math.abs(distance-plan.lengthM)>1e-8)throw new Error("Ingress completed before its actual portal.");break;}}
  const end=sampleBoundaryIngress(plan,plan.lengthM);admissions.observe(asset.id,{routeIndex:0,distanceM:0,footprint:end.footprint});
  results.push({kind:"incoming",classId:asset.id,edgeId:incoming.id,completeRouteIds:route,plan:plan.digests,authorityId:plan.authorityId,observations,phase:admissions.boundarySnapshot()[0]!.phase,active:poses.active[0]});
}
const outgoing=byId.get("lane:23334638:0:0:ground0:r:0:section1")!,outPath=namedVehiclePath(network,outgoing.id),predecessor=network.lanes.find(e=>e.junctionId&&e.nextIds.includes(outgoing.id));if(!predecessor)throw new Error("Named outgoing seed lacks its actual preceding conflict section.");
for(const [variant,asset]of context.fleet.vehicles.entries()){
  const routeIds=[predecessor.id,outgoing.id],passage=createRoutePassage(network,"vehicle",routeIds,0),admissions=new JunctionAdmissions(network),poses=buffers(variant),binding=admissions.bindBoundaryActor(asset.id,"vehicle",0,poses,routeIds),seed=projectVehicleFootprint(asset,sampleEdge(predecessor,0),headingAt(predecessor,0),{x:0,y:1,z:0}),request:AdmissionRequest={actorId:asset.id,kind:"vehicle",passage,entryEdgeId:predecessor.id,footprint:seed,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true};
  let granted=false;for(let i=0;i<180*60&&!granted;i++)granted=admissions.resolve(dt,[request]).includes(asset.id);if(!granted)throw new Error(`No finite outgoing ${asset.id} phase.`);
  // Explicit test initialization: this gate starts with an already admitted
  // actor at the named supported section. It does not certify its earlier road.
  admissions.observe(asset.id,{routeIndex:0,distanceM:0,footprint:seed});poses.active[0]=1;
  const trajectory=createTrajectory([outgoing.id],"23334638-boundary",[straightSpan([outPath.start.x,outPath.start.z],[outPath.end.x,outPath.end.z])]),insideLength=Math.hypot(outgoing.points.at(-1)!.x-outPath.start.x,outgoing.points.at(-1)!.z-outPath.start.z);let retiredAt:number|null=null,tailHeld=false,observations=0;
  for(let distance=0;distance<=trajectory.lengthM+1e-8;distance=Math.min(trajectory.lengthM,distance+2*dt)){
    const p={x:0,z:0,headingRadians:0,curvaturePerM:0};trajectory.sample(distance,p);const support=fitVehicleSupport(context.surfaces,"23334638-boundary",asset,{x:p.x,y:outPath.start.y+(outPath.end.y-outPath.start.y)*distance/trajectory.lengthM,z:p.z},p.headingRadians),footprint=projectVehicleFootprint(asset,support.position,support.supportYawRadians,support.normal,1,support.wheelOffsets);put(poses,{support,footprint,steeringRadians:0},2);admissions.resolve(dt,[]);observations++;
    if(distance<=insideLength)admissions.observe(asset.id,{routeIndex:1,distanceM:outgoing.lengthM*distance/insideLength,footprint});
    else {const observation={routeIndex:1,distanceM:outgoing.lengthM,footprint};if(admissions.observeBoundaryEgress(binding,observation)){admissions.retireBoundary(binding,observation);retiredAt=distance;break;}}
    if(footprintOccupies(network.junctions.find(j=>j.id===passage.junctionId)!,footprint)){if(!admissions.occupied(passage.junctionId))throw new Error("Outgoing seed lost authority before its tail cleared.");tailHeld=true;}
    if(distance===trajectory.lengthM)break;
  }
  if(retiredAt===null||poses.active[0]!==0||admissions.snapshot().length)throw new Error(`Outgoing ${asset.id} did not atomically retire within its actual supported egress.`);
  for(let tick=0;tick<3*120*60;tick++)admissions.resolve(dt,[]);
  if(admissions.signalSnapshot().some(s=>s.cycle<3||s.clearanceHeld))throw new Error("Outgoing retirement left a signal clearance held.");
  results.push({kind:"outgoing-precommitted-seed",classId:asset.id,edgeId:outgoing.id,tailHeld,observations,retiredAtM:retiredAt,active:poses.active[0],remainingLeases:admissions.snapshot().length,minimumSignalCycles:Math.min(...admissions.signalSnapshot().map(s=>s.cycle))});
}
const negatives=[];
for(const prefix of ["lane:520446649:0:0:ground0:r:0","lane:60264932:"]){const edge=network.lanes.find(e=>e.id.startsWith(prefix)&&network.portals.vehicleExit.includes(e.id))!;if(!edge)throw new Error(`Named negative ${prefix} was lost.`);const profile=boundaryProfile(network,"vehicle",edge)!,yaw=headingAt(edge,edge.lengthM),asset=context.fleet.vehicles[2]!,end={x:profile.position.x+7.5*Math.sin(yaw),y:profile.position.y,z:profile.position.z+7.5*Math.cos(yaw)},footprint=projectVehicleFootprint(asset,end,yaw,{x:0,y:1,z:0});let reason:string;try{const result=boundaryProgress(profile,footprint);if(result.fullyOutside)throw new Error("Named negative unexpectedly retired.");reason="full bus remains inside AOI at the 7.5 m bound";}catch(error){reason=(error as Error).message;if(reason==="Named negative unexpectedly retired.")throw error;}negatives.push({edgeId:edge.id,outwardDot:Math.sin(yaw)*profile.outward.x+Math.cos(yaw)*profile.outward.z,reason});}
const report={inputs:context.digests,roadTriangleVerification:context.roadTriangleVerification,bounds:"Source-bound incoming prefix and separate complete outgoing supported section from an explicitly precommitted seed; planar dynamics/sweep and per-tick support, not a complete city trip or population throughput.",results,negatives};await writeFile(resolve(directory,"ingress-result.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
