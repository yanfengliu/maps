/** Bounds: byte-bound synthetic canonical-AOI entry, actual three-class fleet,
 * fixed-tick transit, mapped entry dwell/yield, and failed-operation atomicity.
 * Full-source named traces are a separate tool; this is not city traffic. */
import {describe,expect,it} from "vitest";
import {generateNetwork} from "../tools/network/generate.ts";
import type {OsmDocument} from "../tools/network/osm.ts";
import {BOUNDARY_SOURCE_VEHICLES} from "./network-boundary-source-fixture.ts";
import {decodeMesh,encodeMesh,type MeshData} from "../src/world/mesh.ts";
import type {VehicleSurfaces} from "../src/world/vehicle-surfaces.ts";
import type {VehiclePoseBuffers} from "../src/world/agent-poses.ts";
import {createVehicleMotionContext,sha256,type VehicleMotionBytes} from "../src/agents/core/motion-inputs.ts";
import {createBoundaryIngressPlan,sampleBoundaryIngress,ingressStopLineDistance,type IngressSample} from "../src/agents/core/ingress.ts";
import {straightSpan} from "../src/agents/core/trajectory.ts";
import {JunctionAdmissions,type AdmissionRequest,type BoundaryActorBinding} from "../src/network/admissions.ts";
import {createBoundaryEntryPassage} from "../src/network/passages.ts";
import {headingAt} from "../src/network/geometry.ts";
import type {ControlHardwareData} from "../src/world/control-hardware.ts";

const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),dt=1/60;
const empty:MeshData={header:{version:1,name:"fixture",vertexCount:0,triangleCount:0,bounds:{min:[0,0,0],max:[0,0,0]}},positions:new Float32Array(),normals:new Float32Array(),indices:new Uint32Array()};
async function fixture(kind="traffic_signals",controlAtPortal=false) {
  const raw:OsmDocument={osm3s:{timestamp_osm_base:"2026-09-07"},elements:[{type:"node",id:1,lat:35.6595,lon:139.694},{type:"node",id:2,lat:35.6595,lon:139.695025,tags:{highway:kind}},{type:"node",id:3,lat:35.6595,lon:139.707},{type:"way",id:10,nodes:[1,2,3],tags:{highway:"tertiary",lanes:"2"}}]};
  const network=generateNetwork(raw,{groundHeight:()=>15,provenance:{osmTimestamp:"2026-09-07",osmSha256:"a".repeat(64),terrainSha256:"b".repeat(64),roadsSha256:"c".repeat(64),method:"ingress fixture"},includeScramble:false});
  const first=network.lanes.find(e=>network.portals.vehicleEntry.includes(e.id)&&e.points[0]!.x<0)!,byId=new Map(network.lanes.map(e=>[e.id,e])),queue=[[first.id]],seen=new Set<string>();let route:string[]=[];
  // Synthetic mapped-control fixture at the exact clipped portal; this is
  // deliberately distinct from the real source excerpts in vehicle-source.
  if(controlAtPortal)for(const control of network.physical.trafficControls)control.position={...first.points[0]!};
  while(queue.length){const ids=queue.shift()!,last=ids.at(-1)!;if(network.portals.vehicleExit.includes(last)){route=ids;break;}if(seen.has(last))continue;seen.add(last);for(const id of byId.get(last)!.nextIds)queue.push([...ids,id]);}
  expect(route.length).toBeGreaterThan(0);
  const source={roadId:"fixture-road",areaId:"fixture-carriageway",polygonId:"fixture-polygon",functionCode:1000,lod:3 as const},ring=[[-650,-650],[650,-650],[650,650],[-650,650]] as const;
  const vertices=ring.map(([x,z])=>[x,15.22+x*.001+z*.002,z] as const),triangles=[[0,1,2],[0,2,3]].map((ids,i)=>({id:`source${i}`,layerId:"ground",vertices:ids.map(j=>vertices[j]!) as unknown as VehicleSurfaces["triangles"][number]["vertices"],source,provenance:"displayed-road" as const,roadTriangleIds:[i]}));
  const roads=encodeMesh({...empty,header:{...empty.header,vertexCount:4,triangleCount:2,bounds:{min:[-650,13,-650],max:[650,18,650]}},positions:new Float32Array(vertices.flat()),normals:new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]),indices:new Uint32Array([0,1,2,0,2,3])}),pavements=encodeMesh(empty),pavementSource=bytes({}),overlay=encodeMesh(empty),vehicles=bytes({version:1,units:"metres",up:"+Y",forward:"+Z",origin:"ground-centre",yawAxis:"+Y",licence:"fixture",source:"promoted actual fleet",vehicles:BOUNDARY_SOURCE_VEHICLES}),networkBytes=bytes(network);
  const digests={network:await sha256(networkBytes),vehicles:await sha256(vehicles),roads:await sha256(roads),pavementSource:await sha256(pavementSource)};
  const surfaces:VehicleSurfaces={version:1,scope:"named-vehicle-trajectory-increment",inputs:{...digests,sourceFiles:[]},overlay:{url:"/scene/vehicle-support-overlay.mesh",sha256:await sha256(overlay),triangles:0},corridors:[{id:"corridor",layerId:"ground",routeEdgeIds:[first.id],allowed:[ring],sourceAreas:[source],triangleIds:triangles.map(t=>t.id),maximumTiltRadians:.02}],triangles,reconciliation:[]};
  const hardware:ControlHardwareData={version:1,method:"fixture",bounds:{vehicleScale:1,routeStepM:.5,clearanceM:.6,searchRadiusM:18},inputs:{network:digests.network,networkCanonical:digests.network,vehicles:digests.vehicles,roads:digests.roads,pavements:await sha256(pavements)},records:network.physical.trafficControls.map(c=>({sourceId:c.id,sourceNodeId:c.sourceNodeId,sourcePosition:c.position,status:"unplaced",reason:"fixture has no presentation hardware",base:null,head:null,direction:null,evidence:{pavementTriangles:[],supportTriangles:[],vehiclePoseCount:0,maxVehicleTopY:null,pedestrianGapM:null}}))};
  const input:VehicleMotionBytes={network:networkBytes,vehicles,surfaces:bytes(surfaces),overlay,roads,pavementSource,pavements,hardware:bytes(hardware)};
  const context=await createVehicleMotionContext(input),edge=context.network.lanes.find(e=>e.id===first.id)!,heading=headingAt(edge,0),end=[edge.points[0]!.x,edge.points[0]!.z] as const,start=[end[0]-Math.sin(heading)*6.6,end[1]-Math.cos(heading)*6.6] as const;
  return{input,context,route,edge,start,end};
}
function buffers(variant:number):VehiclePoseBuffers{const frame=()=>({position:new Float32Array(3),yaw:new Float32Array(1),supportNormal:new Float32Array([0,1,0]),travelledMetres:new Float64Array(1),generation:new Uint32Array([5]),wheelOffsets:new Float32Array(4),frontSteeringRadians:new Float32Array(1)});return{count:1,previous:frame(),current:frame(),active:new Uint8Array(1),variant:new Uint8Array([variant]),scale:new Float32Array([1]),speedMps:new Float32Array(1)};}
function put(poses:VehiclePoseBuffers,p:IngressSample,speed=0){const f=p.support;poses.current.position.set([f.position.x,f.position.y,f.position.z]);poses.current.supportNormal.set([f.normal.x,f.normal.y,f.normal.z]);poses.current.yaw[0]=f.supportYawRadians;poses.current.wheelOffsets.set(f.wheelOffsets);poses.current.frontSteeringRadians[0]=p.steeringRadians;poses.speedMps[0]=speed;}
async function setup(kind="traffic_signals",variant=0,controlAtPortal=false){const f=await fixture(kind,controlAtPortal),plan=await createBoundaryIngressPlan(f.context,f.route,"corridor",BOUNDARY_SOURCE_VEHICLES[variant]!.id,[straightSpan(f.start,f.end)]),poses=buffers(variant),admissions=new JunctionAdmissions(f.context.network),binding=admissions.bindBoundaryActor("actor","vehicle",0,poses,f.route,plan),initial=sampleBoundaryIngress(plan,0);put(poses,initial);const passage=createBoundaryEntryPassage(f.context.network,"vehicle",f.route,initial.footprint,plan)!;
  const request=(sample:IngressSample,stoppedSeconds=0,yieldSatisfied=false,receivingSpace=true):AdmissionRequest=>({actorId:"actor",kind:"vehicle",entryEdgeId:f.edge.id,passage,footprint:sample.footprint,stoppedSeconds,yieldSatisfied,receivingSpace});
  const grant=()=>{for(let i=0;i<180*60;i++)if(admissions.resolve(dt,[request(initial)]).includes("actor"))return;throw new Error("Fixture ingress has no finite entry phase.");};
  const step=(distance:number,speed=2)=>{const p=sampleBoundaryIngress(plan,distance);put(poses,p,speed);admissions.resolve(dt,[]);return admissions.observeBoundaryIngress(binding,{distanceM:distance,footprint:p.footprint});};
  return{...f,plan,poses,admissions,binding,initial,passage,request,grant,step};
}
describe("opaque supported ingress",()=>{
  it.each(["stop","give_way"])("never clears mapped %s by repeating an outer request while inactive",async kind=>{
    const t=await setup(kind,2,true);expect(t.passage.controls[0]!.distanceM).toBe(0);t.grant();expect(t.poses.active[0]).toBe(0);
    t.admissions.resolve(dt,[t.request(t.initial)]);t.admissions.activateBoundary(t.binding,t.initial.footprint);
    expect(()=>{for(let s=2*dt;s<t.plan.lengthM;s+=2*dt)t.step(s);}).toThrow(/passed mapped (stop|yield)/);
  });
  it.each([0,1,2])("pre-admits class %s, keeps the outside queue inactive and transfers only at the actual portal",async variant=>{
    const t=await setup("traffic_signals",variant);expect(t.plan.authorityId).toBeTruthy();expect(()=>t.admissions.activateBoundary(t.binding,t.initial.footprint)).toThrow(/admission/);expect(t.poses.active[0]).toBe(0);
    expect(t.admissions.resolve(dt,[t.request(t.initial,0,false,false)])).toEqual([]);expect(t.poses.active[0]).toBe(0);
    t.grant();t.admissions.activateBoundary(t.binding,t.initial.footprint);expect(t.poses.active[0]).toBe(1);expect(t.admissions.occupied(t.plan.authorityId!)).toBe(true);expect(t.admissions.cancelPending("actor")).toBe(false);
    expect(()=>t.admissions.observe("actor",{routeIndex:0,distanceM:0,footprint:t.initial.footprint})).toThrow(/finish.*ingress/);
    let complete=false;for(let s=2*dt;s<t.plan.lengthM;s+=2*dt)complete=t.step(s);expect(complete).toBe(false);expect(t.step(t.plan.lengthM)).toBe(true);
    const end=sampleBoundaryIngress(t.plan,t.plan.lengthM);expect(()=>t.admissions.observe("actor",{routeIndex:0,distanceM:0,footprint:end.footprint})).not.toThrow();
  });
  it("does not turn an outer reservation into mapped stop dwell or yield permission",async()=>{
    const t=await setup("stop",2);expect(t.passage.controls).toHaveLength(1);const control=t.passage.controls[0]!;t.grant();t.admissions.activateBoundary(t.binding,t.initial.footprint);
    let lo=0,hi=t.plan.lengthM;for(let i=0;i<48;i++){const mid=(lo+hi)/2;if(ingressStopLineDistance(t.plan,sampleBoundaryIngress(t.plan,mid).footprint,control.distanceM)<-.1)lo=mid;else hi=mid;}const stop=(lo+hi)/2;
    for(let s=2*dt;s<stop;s+=2*dt)t.step(s);t.step(stop);
    const p=sampleBoundaryIngress(t.plan,stop);put(t.poses,p);expect(t.admissions.resolve(dt,[t.request(p,99,true)])).toEqual([]);t.admissions.observeBoundaryIngress(t.binding,{distanceM:stop,footprint:p.footprint});
    for(let i=0;i<60;i++)t.step(stop,0);
    put(t.poses,p);expect(t.admissions.resolve(dt,[t.request(p,1,false)])).toEqual([]);t.admissions.observeBoundaryIngress(t.binding,{distanceM:stop,footprint:p.footprint});
    expect(t.admissions.resolve(dt,[t.request(p,1,true)])).toEqual(["actor"]);t.admissions.observeBoundaryIngress(t.binding,{distanceM:stop,footprint:p.footprint});
    for(let s=stop+2*dt;s<t.plan.lengthM;s+=2*dt)t.step(s);expect(t.step(t.plan.lengthM)).toBe(true);
  });
  it("leaves active/lease/progress unchanged for forged plans, wrong slots, stale poses, skipped ticks and backward progress",async()=>{
    const t=await setup();expect(()=>t.admissions.bindBoundaryActor("forged","vehicle",0,buffers(0),t.route,{...t.plan})).toThrow(/factory-issued/);
    t.grant();t.admissions.activateBoundary(t.binding,t.initial.footprint);let before=JSON.stringify(t.admissions.snapshot());const unchanged=()=>{expect(t.poses.active[0]).toBe(1);expect(JSON.stringify(t.admissions.snapshot())).toBe(before);};
    const p=sampleBoundaryIngress(t.plan,.01);put(t.poses,p,2);
    expect(()=>t.admissions.observeBoundaryIngress(t.binding,{distanceM:.01,footprint:p.footprint})).toThrow(/once per fixed tick/);unchanged();t.admissions.resolve(dt,[]);before=JSON.stringify(t.admissions.snapshot());
    expect(()=>t.admissions.observeBoundaryIngress({...t.binding,slot:9} as BoundaryActorBinding,{distanceM:.01,footprint:p.footprint})).toThrow(/binding/);unchanged();
    t.poses.current.frontSteeringRadians[0]=.1;expect(()=>t.admissions.observeBoundaryIngress(t.binding,{distanceM:.01,footprint:p.footprint})).toThrow(/steering/);unchanged();put(t.poses,p,2);
    const far=sampleBoundaryIngress(t.plan,1);put(t.poses,far,2);expect(()=>t.admissions.observeBoundaryIngress(t.binding,{distanceM:1,footprint:far.footprint})).toThrow(/certified speed/);unchanged();put(t.poses,p,2);t.admissions.observeBoundaryIngress(t.binding,{distanceM:.01,footprint:p.footprint});
    const saved=JSON.stringify(t.admissions.snapshot());put(t.poses,t.initial,0);t.admissions.resolve(dt,[]);expect(()=>t.admissions.observeBoundaryIngress(t.binding,{distanceM:0,footprint:t.initial.footprint})).toThrow(/monotonically/);expect(t.admissions.snapshot()[0]!.routeIndex).toBe(JSON.parse(saved)[0].routeIndex);
  });
  it("rejects changed raw fleet/overlay/hardware inputs and forged contexts",async()=>{
    const f=await fixture();await expect(createVehicleMotionContext({...f.input,vehicles:new Uint8Array([...f.input.vehicles,32])})).rejects.toThrow(/vehicles digest/);
    await expect(createVehicleMotionContext({...f.input,overlay:new Uint8Array([...f.input.overlay,32])})).rejects.toThrow(/overlay differs/);
    const hardware=JSON.parse(new TextDecoder().decode(f.input.hardware));hardware.inputs.vehicles="f".repeat(64);await expect(createVehicleMotionContext({...f.input,hardware:bytes(hardware)})).rejects.toThrow(/Displayed vehicle.*data:hardware/);
    await expect(createBoundaryIngressPlan({...f.context},f.route,"corridor","bus",[straightSpan(f.start,f.end)])).rejects.toThrow(/exact byte-bound/);
    const heading=headingAt(f.edge,0);await expect(createBoundaryIngressPlan(f.context,f.route,"corridor","bus",[straightSpan([f.end[0]-Math.sin(heading),f.end[1]-Math.cos(heading)],f.end)])).rejects.toThrow(/entire supported body/);
  });
  it("rejects re-authored displayed-road vertices and wrong or absent referenced road triangles despite consistent raw digests",async()=>{
    const f=await fixture(),surfaces=JSON.parse(new TextDecoder().decode(f.input.surfaces));surfaces.triangles[0].vertices[0][1]+=.01;
    await expect(createVehicleMotionContext({...f.input,surfaces:bytes(surfaces)})).rejects.toThrow(/actual road triangle/);
    const wrong=JSON.parse(new TextDecoder().decode(f.input.surfaces));wrong.triangles[0].roadTriangleIds=[1];await expect(createVehicleMotionContext({...f.input,surfaces:bytes(wrong)})).rejects.toThrow(/actual road triangle/);
    const absent=JSON.parse(new TextDecoder().decode(f.input.surfaces)),hardware=JSON.parse(new TextDecoder().decode(f.input.hardware)),roads=encodeMesh(empty);absent.inputs.roads=await sha256(roads);hardware.inputs.roads=absent.inputs.roads;
    await expect(createVehicleMotionContext({...f.input,roads,surfaces:bytes(absent),hardware:bytes(hardware)})).rejects.toThrow(/actual road triangle/);
    const unknown=JSON.parse(new TextDecoder().decode(f.input.surfaces));unknown.triangles[0].provenance="unclassified";unknown.triangles[0].vertices[0][1]+=.01;await expect(createVehicleMotionContext({...f.input,surfaces:bytes(unknown)})).rejects.toThrow(/unsupported provenance/);
    delete unknown.triangles[0].provenance;await expect(createVehicleMotionContext({...f.input,surfaces:bytes(unknown)})).rejects.toThrow(/unsupported provenance/);
  });
  it("requires the exact overlay triangle to face upward rather than accepting a reversed vertex set",async()=>{
    const f=await fixture(),surface=JSON.parse(new TextDecoder().decode(f.input.surfaces)),road=decodeMesh(f.input.roads),vertices=[0,1,2].map(i=>Array.from(road.positions.subarray(i*3,i*3+3)));
    surface.triangles.push({...surface.triangles[0],id:"authored-face",provenance:"authored-seam-reconciliation",vertices});surface.corridors[0].triangleIds.push("authored-face");
    const overlay:MeshData={...empty,header:{...empty.header,vertexCount:3,triangleCount:1},positions:new Float32Array(vertices.flat()),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),indices:new Uint32Array([2,1,0])};
    let raw=encodeMesh(overlay);surface.overlay={...surface.overlay,triangles:1,sha256:await sha256(raw)};await expect(createVehicleMotionContext({...f.input,overlay:raw,surfaces:bytes(surface)})).resolves.toBeTruthy();
    overlay.indices.set([0,1,2]);raw=encodeMesh(overlay);surface.overlay.sha256=await sha256(raw);let failure:unknown;try{await createVehicleMotionContext({...f.input,overlay:raw,surfaces:bytes(surface)});}catch(error){failure=error;}
    expect(failure).toBeInstanceOf(Error);expect((failure as Error).message).toMatch(/upward winding/);
  });
});
