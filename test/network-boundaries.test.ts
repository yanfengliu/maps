/** F5 bounds: seven promoted real routes, full-body terminal retirement, bound-slot atomicity, initial physical-only entry and independently calculated tilted bounds. Whole-portal census is tools/network/check-boundaries.ts. */
import {describe,expect,it} from "vitest";
import {BOUNDARY_SOURCE_NETWORK as network,BOUNDARY_SOURCE_ROUTES,BOUNDARY_SOURCE_VEHICLES as vehicles} from "./network-boundary-source-fixture.ts";
import {JunctionAdmissions,type AdmissionRequest,type BoundaryActorBinding} from "../src/network/admissions.ts";
import {createRoutePassage,createBoundaryEntryPassage,type ActorKind} from "../src/network/passages.ts";
import {projectVehicleFootprint,footprintOccupies,vehicleEnvelope,type ActorFootprint} from "../src/network/footprints.ts";
import {boundaryProfile} from "../src/network/boundaries.ts";
import {headingAt,sampleEdge} from "../src/network/geometry.ts";
import type {AgentPoseBuffers} from "../src/world/agent-poses.ts";

const dt=1/60,normal={x:.2,y:Math.sqrt(.92),z:.2};
function buffers():AgentPoseBuffers{const make=()=>({position:new Float32Array(6),yaw:new Float32Array(2),supportNormal:new Float32Array([0,1,0,0,1,0]),travelledMetres:new Float64Array(2),generation:new Uint32Array([3,7]),wheelOffsets:new Float32Array(8)});return{count:2,previous:make(),current:make(),active:new Uint8Array(2),scale:new Float32Array([1,1]),speedMps:new Float32Array(2),variant:new Uint8Array(2)};}
function put(poses:AgentPoseBuffers,footprint:ActorFootprint){const p=footprint.origin??footprint.position;poses.current.position.set([p.x,p.y,p.z]);poses.current.yaw[0]=footprint.headingRadians;poses.current.supportNormal.set(footprint.supportNormal?[footprint.supportNormal.x,footprint.supportNormal.y,footprint.supportNormal.z]:[0,1,0]);}
function setup(name:string,variant=0){
  const source=BOUNDARY_SOURCE_ROUTES.find(r=>r.name===name)!,kind=source.kind as ActorKind,route=source.ids.map(id=>[...network.lanes,...network.walks].find(e=>e.id===id)!),c=new JunctionAdmissions(network),poses=buffers(),binding=c.bindBoundaryActor("actor",kind,0,poses,source.ids);
  poses.variant[0]=variant;
  const at=(index:number,s:number)=>{const p=sampleEdge(route[index]!,s),yaw=headingAt(route[index]!,s),footprint:ActorFootprint=kind==="vehicle"?projectVehicleFootprint(vehicles[variant]!,p,yaw,normal):{position:p,headingRadians:yaw,lengthM:.45,widthM:.5};put(poses,footprint);return{routeIndex:index,distanceM:s,footprint};};
  const first=route.findIndex(e=>e.junctionId),p=first>=0?createRoutePassage(network,kind,source.ids,first):null;
  const req=(index:number):AdmissionRequest=>({actorId:"actor",kind,passage:p!,entryEdgeId:route[index]!.id,routeIndex:index,footprint:at(index,0).footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true});
  const grant=(request:AdmissionRequest)=>{for(let tick=0;tick<180*60;tick++)if(c.resolve(dt,[request]).includes("actor"))return;throw new Error("No finite entry phase.");};
  const toEnd=()=>{if(p)grant(req(first));poses.active[0]=1;for(let index=0;index<route.length;index++){if(p?.controls.some(control=>control.routeIndex===index))c.resolve(dt,[req(index)]);for(let s=0;s<route[index]!.lengthM;s+=.25)if(p)c.observe("actor",at(index,s));if(p)c.observe("actor",at(index,route[index]!.lengthM));}return at(route.length-1,route.at(-1)!.lengthM);};
  const outside=()=>{const edge=route.at(-1)!,profile=boundaryProfile(network,kind,edge)!,p={x:profile.position.x+profile.outward.x*7.25,y:profile.position.y,z:profile.position.z+profile.outward.z*7.25},yaw=headingAt(edge,edge.lengthM),footprint:ActorFootprint=kind==="vehicle"?projectVehicleFootprint(vehicles[variant]!,p,yaw,normal):{position:p,headingRadians:yaw,lengthM:.45,widthM:.5};put(poses,footprint);return{routeIndex:route.length-1,distanceM:edge.lengthM,footprint};};
  return{source,kind,route,c,poses,binding,at,p,req,grant,toEnd,outside};
}
describe("boundary passage completion",()=>{
  it.each(BOUNDARY_SOURCE_ROUTES.filter(r=>r.name!=="initial-tail-only").map(r=>r.name))("constructs and retires real %s with the full body outside the AOI",name=>{
    const t=setup(name,name.includes("22566960")?2:0),terminal=t.toEnd();expect(()=>t.c.retireBoundary(t.binding,terminal)).toThrow(/inside the AOI/);expect(t.poses.active[0]).toBe(1);
    const out=t.outside();expect(t.c.observeBoundaryEgress(t.binding,out)).toBe(true);t.c.retireBoundary(t.binding,out);expect(t.poses.active[0]).toBe(0);expect(t.c.snapshot()).toEqual([]);
    for(let tick=0;tick<360*60;tick++)t.c.resolve(dt,[]);expect(t.c.signalSnapshot().every(s=>s.cycle>=3&&!s.clearanceHeld)).toBe(true);
  });
  it("binds actor/kind/slot/generation and leaves active plus lease unchanged on every failed retirement",()=>{
    const t=setup("tail:172125348:0:0:ground0:f:0");t.toEnd();const out=t.outside(),before=JSON.stringify(t.c.snapshot()),unchanged=()=>{expect(t.poses.active[0]).toBe(1);expect(JSON.stringify(t.c.snapshot())).toBe(before);};
    for(const changed of [{...t.binding,slot:1},{...t.binding,kind:"pedestrian"},{...t.binding,generation:99}]){expect(()=>t.c.retireBoundary(changed as BoundaryActorBinding,out)).toThrow(/binding/);unchanged();}
    t.poses.current.generation[0]=t.poses.current.generation[0]!+1;expect(()=>t.c.retireBoundary(t.binding,out)).toThrow(/generation/);unchanged();t.poses.current.generation[0]=t.poses.current.generation[0]!-1;
    expect(()=>t.c.retireBoundary(t.binding,{...out,distanceM:NaN})).toThrow(/terminal route/);unchanged();
    t.poses.current.position[0]=t.poses.current.position[0]!+1;expect(()=>t.c.retireBoundary(t.binding,out)).toThrow(/current pose/);unchanged();t.poses.current.position[0]=t.poses.current.position[0]!-1;
    t.poses.scale[0]=2;expect(()=>t.c.retireBoundary(t.binding,out)).toThrow(/class and scale/);unchanged();t.poses.scale[0]=1;
    t.poses.variant[0]=2;expect(()=>t.c.retireBoundary(t.binding,out)).toThrow(/class and scale/);unchanged();t.poses.variant[0]=0;
    const wheels=(t.poses.current as import("../src/world/agent-poses.ts").VehiclePoseSnapshot).wheelOffsets;wheels[0]=.051;expect(()=>t.c.retireBoundary(t.binding,out)).toThrow(/wheel offsets/);unchanged();wheels[0]=0;
    t.c.retireBoundary(t.binding,out);expect(()=>t.c.retireBoundary(t.binding,out)).toThrow(/stale/);expect(t.poses.active[0]).toBe(0);
  });
  it("does not permit a terminal point, an outward jump beyond the bound or backward egress to clear an actor",()=>{
    const t=setup("tail:87250212:2:0:ground0:f:0"),terminal=t.toEnd(),out=t.outside();t.c.observeBoundaryEgress(t.binding,out);
    put(t.poses,terminal.footprint);expect(()=>t.c.observeBoundaryEgress(t.binding,terminal)).toThrow(/backward/);expect(t.poses.active[0]).toBe(1);expect(t.c.occupied(t.p!.junctionId)).toBe(true);
    const origin=out.footprint.origin!,tooFar=projectVehicleFootprint(vehicles[0]!,{x:origin.x+20,y:origin.y,z:origin.z},out.footprint.headingRadians,normal);put(t.poses,tooFar);expect(()=>t.c.retireBoundary(t.binding,{...out,footprint:tooFar})).toThrow(/envelope/);expect(t.c.snapshot()).toHaveLength(1);
  });
  it("pre-admits and clears a physical-only incoming tail without inventing a route control",()=>{
    const t=setup("initial-tail-only"),first=t.at(0,0),p=createBoundaryEntryPassage(network,"vehicle",t.source.ids,first.footprint)!;
    expect(p).not.toBeNull();expect(p.lastConflictIndex).toBe(-1);expect(t.route.some(e=>e.junctionId===p.junctionId)).toBe(false);
    expect(()=>t.c.activateBoundary(t.binding,first.footprint)).toThrow(/admission/);expect(t.poses.active[0]).toBe(0);
    t.grant({actorId:"actor",kind:"vehicle",passage:p,entryEdgeId:t.route[0]!.id,footprint:first.footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true});t.c.activateBoundary(t.binding,first.footprint);expect(t.c.occupied(p.junctionId)).toBe(true);
    let released=false;for(let index=0;index<t.route.length&&!released;index++)for(let s=0;s<t.route[index]!.lengthM&&!released;s+=.25){const observation=t.at(index,s);for(const j of network.junctions)if(j.id!==p.junctionId)expect(footprintOccupies(j,observation.footprint)).toBe(false);released=t.c.observe("actor",observation);}
    expect(released).toBe(true);expect(t.c.snapshot()).toEqual([]);expect(t.poses.active[0]).toBe(1);
  });
  it("rejects activation with a wrong observed pose or after its pending green expires",()=>{
    const t=setup("initial-tail-only"),first=t.at(0,0),p=createBoundaryEntryPassage(network,"vehicle",t.source.ids,first.footprint)!;
    t.grant({actorId:"actor",kind:"vehicle",passage:p,entryEdgeId:t.route[0]!.id,footprint:first.footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true});const before=JSON.stringify(t.c.snapshot());
    t.poses.current.yaw[0]=t.poses.current.yaw[0]!+1;expect(()=>t.c.activateBoundary(t.binding,first.footprint)).toThrow(/current pose/);expect(t.poses.active[0]).toBe(0);expect(JSON.stringify(t.c.snapshot())).toBe(before);put(t.poses,first.footprint);
    if(network.junctions.find(j=>j.id===p.junctionId)!.controlKind==="signal"){for(let tick=0;tick<20*60;tick++)t.c.resolve(dt,[]);expect(()=>t.c.activateBoundary(t.binding,first.footprint)).toThrow(/admission/);expect(t.poses.active[0]).toBe(0);}
  });
});
describe("supported three-dimensional vehicle projection",()=>{
  it("includes tilted body height, shifted collision centre and wheel travel using actual bus bounds",()=>{
    const bus=vehicles[2]!,phi=Math.PI/6,normal={x:Math.sin(phi),y:Math.cos(phi),z:0},f=projectVehicleFootprint(bus,{x:0,y:0,z:0},0,normal),w=bus.collision.width,ymin=bus.bounds.min[1]!-.05,ymax=bus.bounds.max[1]!+.05;
    expect(Math.min(...f.hull!.map(p=>p.x))).toBeCloseTo(-w/2*Math.cos(phi)+ymin*Math.sin(phi),7);expect(Math.max(...f.hull!.map(p=>p.x))).toBeCloseTo(w/2*Math.cos(phi)+ymax*Math.sin(phi),7);
    expect(f.position.x).toBeCloseTo((ymin+ymax)/2*Math.sin(phi),7);expect(vehicleEnvelope(bus).diameter).toBeCloseTo(11.580363412717547,8);
    const j={...network.junctions[0]!,position:{x:2.8,y:0,z:0},radiusM:.1};delete j.conflictAreas;expect(footprintOccupies(j,f)).toBe(true);expect(footprintOccupies(j,{position:{x:0,y:0,z:0},headingRadians:0,lengthM:bus.collision.length,widthM:bus.collision.width})).toBe(false);
    expect(()=>projectVehicleFootprint(bus,{x:0,y:0,z:0},0,normal,1.003)).toThrow(/3D envelope/);expect(()=>projectVehicleFootprint(bus,{x:0,y:0,z:0},0,normal,1,[.051])).toThrow(/wheel residual/);
  });
});
