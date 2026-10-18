/** Bound: frozen source visits/whole-body halts and real admission state transitions.
 * Does not certify route ground support, queue capacity, integrated driving or pixels. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { JunctionAdmissions, isCurrentHaltAuthorityView, type AdmissionRequest } from "../src/network/admissions.ts";
import { createRouteVisits, queryRouteHalts, routeHaltObligations } from "../src/network/halts.ts";
import { createBoundaryEntryPassage, type RoutePassage } from "../src/network/passages.ts";
import { footprintOccupies, vehicleEnvelope, type ActorFootprint } from "../src/network/footprints.ts";
import { RouteLibrary, vehicleRouteFootprint, vehicleRoutePose, vehicleScale, type PlannedRoute, type VehicleRouteBody } from "../src/agents/population/routes.ts";
import { RefusalCounts } from "../src/agents/population/status.ts";
import type { Junction, LaneEdge, NetworkData } from "../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../src/world/agent-assets.ts";
import { historicalTrafficInputs, currentTrafficHardware } from "./traffic-vintage-inputs.ts";
import { REVIEWED_SIGNAL_IDS, REVIEWED_STOP_IDS } from "./shibuya-source-fixture.ts";
import { BOUNDARY_SOURCE_NETWORK, BOUNDARY_SOURCE_ROUTES } from "./network-boundary-source-fixture.ts";

interface FrozenWitnesses {
  clearRoute:{ids:string[];class:string;scale:number};
  provenance: { networkSha256:string;fleetSha256:string };
  hero: { ids:string[];totalM:number;holds:{class:string;scale:number;radius:number;visits:{entryIndex:number;haltDistanceM:number;touched:string[]}[]}[] };
  stops:{ids:string[];passage:{entryIndex:number;lastConflictIndex:number;controls:{routeIndex:number;distanceM:number;nodeIds:number[];rule:string}[]};progressAfterEntry:number;remainingAuthorityFrontM:number}[];
}
const frozen=JSON.parse(readFileSync(new URL("./fixtures/traffic-halt-routes.json",import.meta.url),"utf8")) as FrozenWitnesses;
// Literal reviewed OLD / fresh1695 inputs; route/body expectations below stay unchanged.
const reviewedSourcePins: Record<string, readonly (readonly [number, string])[]> = {
  "data/network/network.json": [[10239410, "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677"], [10301111, "1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f"]],
  "data/scene/agents/vehicles.json": [[4128, "5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01"], [4128, "83569d3bf6a41bbe6ae37edcc6bcad212615f4c69e76ca1b6714d8001f6deb9f"]],
};
function pinned<T>(path: string, originalSha256: string): T {
  const pins = reviewedSourcePins[path];
  if (!pins || originalSha256 !== pins[0]![1]) throw Error(`Unreviewed fixture source identity for ${path}; restore the original reviewed route fixture.`);
  const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!pins.some(([size, digest]) => bytes.length === size && sha256 === digest)) throw Error(`Unreviewed ${path}: ${bytes.length} bytes / ${sha256}; restore reviewed OLD or fresh1695 source bytes.`);
  return JSON.parse(bytes.toString()) as T;
}
const currentNetwork=pinned<NetworkData>("data/network/network.json",frozen.provenance.networkSha256);
const currentFleet=pinned<VehicleAssetManifest>("data/scene/agents/vehicles.json",frozen.provenance.fleetSha256);
const {network,fleet}=historicalTrafficInputs();
const currentFresh=currentNetwork.provenance.osmSha256==="162fbdec3baa5ed5c07eed33fa8ae20568dbd74d8f1f36a3490dccfbbd2d32b0";
const freshScenarios=JSON.parse(readFileSync(new URL("./fixtures/traffic-source-vintages.json",import.meta.url),"utf8")) as FrozenWitnesses & {body:{classId:string;scale:number;radiusM:number}};
const currentScenarios=currentFresh?freshScenarios:frozen;
const dt=.25;
const bodyFor=(variant=0):VehicleRouteBody=>({asset:fleet.vehicles[variant]!,scale:vehicleScale(()=>1,fleet.vehicles[variant]!),laneIndex:0,frame:"population-upright"});
/** Logical factory route only: deliberately usable for negative complete-validator fixtures. */
function logical(n:NetworkData,ids:readonly string[],radius:number):PlannedRoute {
  const byId=new Map(n.lanes.map(e=>[e.id,e])),edges=ids.map(id=>byId.get(id)!),starts:number[]=[];let total=0;
  for(const e of edges){starts.push(total);total+=e.lengthM;}
  const passages=createRouteVisits(n,"vehicle",ids);
  return Object.freeze({entryEdgeId:ids[0]!,edgeIds:Object.freeze([...ids]),edges:Object.freeze(edges),starts:Object.freeze(starts),totalLengthM:total,passages,
    gates:Object.freeze(passages.map((p,i)=>Object.freeze({passageIndex:i,entryIndex:p.entryIndex,entryEdgeId:ids[p.entryIndex]!,junctionId:p.junctionId,gateDistanceM:starts[p.entryIndex]!,holdDistanceM:starts[p.entryIndex]!-radius,passageStarts:p.starts,controls:p.controls}))),speedLimits:Object.freeze(edges.map(e=>e.speedMps))});
}
function observation(route:PlannedRoute,distance:number,body:VehicleRouteBody){const at=vehicleRoutePose(route,distance,0);return{routeIndex:at.occurrence,distanceM:Math.max(0,distance-route.starts[at.occurrence]!),footprint:vehicleRouteFootprint(route,distance,body)};}
function request(route:PlannedRoute,p:RoutePassage,footprint:ActorFootprint,index=p.entryIndex,stoppedSeconds=0,generation=1):AdmissionRequest{return{actorId:"v",kind:"vehicle",passage:p,entryEdgeId:p.edges[index]!.id,routeIndex:index,footprint,stoppedSeconds,yieldSatisfied:true,receivingSpace:true,routeIdentity:route,generation};}
function grant(a:JunctionAdmissions,r:AdmissionRequest){for(let i=0;i<600;i++)if(a.resolve(dt,[r]).includes(r.actorId))return;throw Error("No actual grant in the bounded 150-second controller cycle.");}
function query(a:JunctionAdmissions,route:PlannedRoute,progressM:number,radiusM:number,generation=1){return queryRouteHalts({route,actorId:"v",generation,progressM,radiusM,authority:a.haltStateFor("v",route,generation)});}
function clearControl(a:JunctionAdmissions,route:PlannedRoute,p:RoutePassage,control:RoutePassage["controls"][number],body:VehicleRouteBody){
  const radius=vehicleEnvelope(body.asset,body.scale).diameter/2,distance=p.starts[control.routeIndex]!+control.distanceM-radius,obs=observation(route,distance,body);
  a.observe("v",obs);
  for(let stopped=dt;stopped<=1;stopped+=dt){a.resolve(dt,[request(route,p,obs.footprint,control.routeIndex,stopped)]);if(stopped<1)expect(a.haltStateFor("v",route,1).held!.unclearedControls).toContain(control);}
  expect(a.haltStateFor("v",route,1).held!.unclearedControls).not.toContain(control);
}
function completePrior(a:JunctionAdmissions,route:PlannedRoute,p:RoutePassage,body:VehicleRouteBody){
  const r=vehicleEnvelope(body.asset,body.scale).diameter/2;
  grant(a,request(route,p,vehicleRouteFootprint(route,Math.max(0,p.starts[p.entryIndex]!-r),body)));
  for(const control of p.controls)clearControl(a,route,p,control,body);
  let released=false;
  for(let i=p.lastConflictIndex+1;i<route.edges.length;i++){
    if(route.edges[i]!.junctionId)break;
    for(let d=0;d<=route.edges[i]!.lengthM;d+=.5)if(a.observe("v",observation(route,route.starts[i]!+d,body))){released=true;break;}
    if(released)break;
  }
  expect(released,`actual full-body release after occurrence ${p.lastConflictIndex}`).toBe(true);
}

describe("shared visit and mapped-control halt policy",()=>{
  it("uses complete validation for the portal screen and final plan without widening the attempt budget",()=>{
    const body=bodyFor(2),radius=vehicleEnvelope(body.asset,body.scale).diameter/2,library=new RouteLibrary(network,new RefusalCounts());
    const walk=vi.spyOn(library as unknown as {walk:(...args:unknown[])=>string[]|null},"walk").mockReturnValue([...frozen.hero.ids]);
    const request={footprintRadiusM:radius,maxEdges:120,walkAttempts:3,vehicleBody:body};
    try {
      expect(library.drivablePortals(library.vehicleGraph,[frozen.hero.ids[0]!],request)).toEqual([]);
      expect(walk).toHaveBeenCalledTimes(3);
      expect(library.planFrom(library.vehicleGraph,"vehicle",frozen.hero.ids[0]!,5970698,request).route).toBeNull();
      expect(walk).toHaveBeenCalledTimes(6);
      walk.mockReturnValue(null);
      library.planFrom(library.vehicleGraph,"vehicle",frozen.hero.ids[0]!,5970698,request);
      expect(walk).toHaveBeenCalledTimes(7); // Existing final-plan null break remains.
    } finally { walk.mockRestore(); }
  });
  it("accepts one fixed clear complete route but revalidates the actual body/frame rather than reusing it",()=>{
    const body=bodyFor(),radius=vehicleEnvelope(body.asset,body.scale).diameter/2,library=new RouteLibrary(network,new RefusalCounts());
    const walk=vi.spyOn(library as unknown as {walk:(...args:unknown[])=>string[]|null},"walk").mockReturnValue([...frozen.clearRoute.ids]);
    try {
      const request={footprintRadiusM:radius,maxEdges:120,vehicleBody:body};
      expect(library.route("vehicle",0,1,frozen.clearRoute.ids[0]!,request)?.edgeIds).toEqual(frozen.clearRoute.ids);
      expect(library.route("vehicle",0,1,frozen.clearRoute.ids[0]!,{...request,vehicleBody:{...body,frame:"unknown" as VehicleRouteBody["frame"]}})).toBeNull();
      expect(library.planFrom(library.vehicleGraph,"vehicle",frozen.clearRoute.ids[0]!,5970698,{footprintRadiusM:radius,maxEdges:120}).reason).toMatch(/actual asset, scale and core body frame/);
    } finally { walk.mockRestore(); }
  });
  it("retains the exact old overlapping holds and source path while deriving clear approaches for width-fitting bodies",()=>{
    for(let variant=0;variant<3;variant++){
      const body=bodyFor(variant),radius=vehicleEnvelope(body.asset,body.scale).diameter/2,route=logical(network,frozen.hero.ids,radius);
      expect(route.edgeIds).toEqual(frozen.hero.ids);expect(route.edges).toHaveLength(70);expect(route.totalLengthM).toBe(frozen.hero.totalM);
      expect(route.passages.map(p=>p.entryIndex)).toEqual([1,35,42,50,63,69]);expect(route.passages[0]!.lastConflictIndex).toBe(30);
      expect(route.edges[4]!.junctionId).toBeNull();expect(route.edges[13]!.junctionId).toBeNull();expect(route.edges[2]!.lengthM).toBeCloseTo(.096993703,8);
      const halts=routeHaltObligations(route,radius);
      expect(halts.controls).toEqual([]);
      const expected=frozen.hero.holds.find(row=>row.class===body.asset.id)!;
      for(const h of halts.admissions){const fp=vehicleRouteFootprint(route,h.distanceM,body),touched=network.junctions.filter(j=>footprintOccupies(j,fp)).map(j=>j.id);expect(h.distanceM).toBeCloseTo(expected.visits.find(v=>v.entryIndex===h.entryIndex)!.haltDistanceM,10);expect(touched).toEqual(expected.visits.find(v=>v.entryIndex===h.entryIndex)!.touched);}
      expect(network.junctions.filter(j=>footprintOccupies(j,vehicleRouteFootprint(route,halts.admissions[0]!.distanceM,body)))).toEqual([]);
      const result=new RouteLibrary(network,new RefusalCounts()).validateVehicleCandidate(frozen.hero.ids,body);
      if(body.asset.id==='bus'){expect(result.route).toBeNull();expect(result.reason).toMatch(/cannot contain bus/);}else{
        expect(Boolean(result.route),result.reason).toBe(true);expect(result.route!.edgeIds).toEqual(frozen.hero.ids);
        for(const halt of routeHaltObligations(result.route!,radius).admissions)expect(network.junctions.filter(j=>footprintOccupies(j,vehicleRouteFootprint(result.route!,halt.distanceM,body)))).toEqual([]);
        expect(result.route!.approachHalts!.find(h=>h.entryIndex===35)!.distanceM).toBeLessThan(halts.admissions.find(h=>h.entryIndex===35)!.distanceM);
      }
      expect(network.portals.vehicleExit).toContain(route.edgeIds.at(-1));
    }
    expect(bodyFor(2).scale).toBe(1.001695679710784);expect(()=>vehicleEnvelope(fleet.vehicles[2]!,1.04)).toThrow(/exceeds/);
  });

  for(const [caseIndex,witness] of frozen.stops.entries())it(`retains real mapped stop ${caseIndex+1} through entry, actual dwell and authority clearance`,()=>{
    const body=bodyFor(),radius=vehicleEnvelope(body.asset,body.scale).diameter/2,route=logical(network,witness.ids,radius),a=new JunctionAdmissions(network);
    expect(network.physical!.trafficControls.filter(c=>c.kind==="stop")).toHaveLength(41);expect(network.physical!.trafficControls.filter(c=>c.kind==="give_way")).toHaveLength(0);
    const p=route.passages.find(p=>p.entryIndex===witness.passage.entryIndex)!;expect(p.controls).toEqual(witness.passage.controls);
    for(const prior of route.passages){if(prior===p)break;completePrior(a,route,prior,body);}
    const hold=p.starts[p.entryIndex]!-radius,control=p.controls[0]!,line=p.starts[control.routeIndex]!+control.distanceM;
    expect(query(a,route,hold-.01,radius).control?.control).toBe(control);
    grant(a,request(route,p,vehicleRouteFootprint(route,hold,body)));
    expect(query(a,route,hold+.01,radius).control?.control).toBe(control);
    a.observe("v",observation(route,witness.progressAfterEntry,body));expect(a.haltStateFor("v",route,1).held!.entered).toBe(true);
    const during=query(a,route,witness.progressAfterEntry,radius);expect(during.control?.control).toBe(control);expect(during.control!.distanceM-witness.progressAfterEntry).toBeCloseTo(witness.remainingAuthorityFrontM,10);
    // A grant/entered flag, or standstill far before the line, is not clearance.
    a.resolve(dt,[request(route,p,vehicleRouteFootprint(route,witness.progressAfterEntry,body),control.routeIndex,1)]);
    expect(a.haltStateFor("v",route,1).held!.unclearedControls).toContain(control);
    expect(()=>a.observe("v",observation(route,line-radius+.01,body))).toThrow(/mapped stop/);
    expect(query(a,route,line-radius+.01,radius).refusal).toMatch(/mapped stop/);
    clearControl(a,route,p,control,body);
    expect(query(a,route,line-radius,radius).control?.control).not.toBe(control);
    expect(()=>a.observe("v",observation(route,line-radius+.01,body))).not.toThrow();
  });
});

function synthetic(corridor=2,rule:"priority"|"yield"="priority"){
 const j:Junction={id:"a",controlKind:"reservation",controlSource:"mapped",position:{x:0,y:0,z:12},radiusM:1,vehicleGroups:[],pedestrianGroup:"p",clearanceSeconds:1,vehicleGreenSeconds:1,pedestrianGreenSeconds:1};
 const lane=(id:string,start:number,end:number,owner:string|null,nextIds:string[]):LaneEdge=>({id,kind:"lane",from:`${start}`,to:`${end}`,points:[{x:0,y:0,z:start},{x:0,y:0,z:end}],lengthM:Math.abs(end-start),widthM:3,sourceWayId:1,nextIds,junctionId:owner,signalGroupId:null,speedMps:8,leftLaneId:null,rightLaneId:null,entryRule:owner?rule:"none",sourceControlNodeIds:owner&&rule==="yield"?[999]:[]});
 const lanes=[lane("approach",0,10,null,["a"]),lane("a",10,14,"a",["out1","exit"]),lane("exit",14,30,null,[])];
 for(let i=1;i<=corridor;i++)lanes.push(lane(`out${i}`,14+(i-1)*8,14+i*8,null,[i===corridor?"a":`out${i+1}`]));
 const n={junctions:[j],lanes,walks:[]} as unknown as NetworkData;
 const ids=["approach","a",...Array.from({length:corridor},(_,i)=>`out${i+1}`),"a","exit"];
 const radius=Math.hypot(.5,.5)/2,route=logical(n,ids,radius);
 const fp=(z:number):ActorFootprint=>({position:{x:0,y:0,z},headingRadians:0,lengthM:.5,widthM:.5});
 return{n,route,radius,fp};
}
describe("authority identity, freshness and release windows",()=>{
 it("does not turn a held owner's name into permission for a later visit and rejects stale generations/views",()=>{
  const {n,route,radius,fp}=synthetic(),a=new JunctionAdmissions(n),first=route.passages[0]!,later=route.passages[1]!;
  grant(a,request(route,first,fp(10-radius)));
  const before=a.haltStateFor("v",route,1);expect(query(a,route,10,radius).admission!.passage).toBe(later);
  expect(query(a,route,10,radius,2).refusal).toMatch(/uncleared admission/);
  expect(queryRouteHalts({route,actorId:"foreign",generation:1,progressM:10,radiusM:radius,authority:before}).refusal).toMatch(/uncleared admission/);
  const copied={...before};expect(isCurrentHaltAuthorityView(copied)).toBe(false);
  a.observe("v",{routeIndex:1,distanceM:1,footprint:fp(11)});expect(isCurrentHaltAuthorityView(before)).toBe(false);
  expect(a.observe("v",{routeIndex:2,distanceM:2,footprint:fp(16)})).toBe(true);
  expect(query(a,route,16,radius).admission!.passage).toBe(later);
  expect(a.haltStateFor("v",route,1).completedThroughIndex).toBe(1);
  a.forgetRoute("v",route,1);expect(query(a,route,16,radius).refusal).toMatch(/uncleared admission/);
  grant(a,request(route,first,fp(10-radius),first.entryIndex,0,2));expect(query(a,route,10,radius,2).admission!.passage).toBe(later);
  expect(queryRouteHalts({route,actorId:"v",generation:1,progressM:10,radiusM:radius,authority:before}).refusal).not.toBeNull();
 });
 it("retains a single null gap and never uses a legacy request as a plan-qualified exemption",()=>{
  const {n,route,radius,fp}=synthetic(1),a=new JunctionAdmissions(n),p=route.passages[0]!;expect(route.passages).toHaveLength(1);expect(p.lastConflictIndex).toBe(3);
  const r=request(route,p,fp(10-radius));delete r.routeIdentity;delete r.generation;grant(a,r);
  expect(query(a,route,11,radius).refusal).not.toBeNull();
  a.observe("v",{routeIndex:2,distanceM:2,footprint:fp(16)});expect(a.commitmentFor("v")).not.toBeNull();
 });

 it("an expired unentered signal grant and its old snapshot grant no exemption",()=>{
  const {n,route:unused,radius,fp}=synthetic();void unused;
  n.junctions[0]!.controlKind="signal";n.junctions[0]!.vehicleGroups=["a:vehicle:0"];
  n.lanes.find(edge=>edge.id==="a")!.signalGroupId="a:vehicle:0";
  const route=logical(n,["approach","a","out1","out2","a","exit"],radius),a=new JunctionAdmissions(n),p=route.passages[0]!;
  grant(a,request(route,p,fp(10-radius)));const granted=a.haltStateFor("v",route,1);
  for(let tick=0;tick<600&&a.commitmentFor("v");tick++)a.resolve(dt,[]);
  expect(a.commitmentFor("v")).toBeNull();expect(isCurrentHaltAuthorityView(granted)).toBe(false);
  expect(query(a,route,10-radius,radius).admission!.passage).toBe(p);
  expect(queryRouteHalts({route,actorId:"v",generation:1,progressM:10,radiusM:radius,authority:granted}).refusal).not.toBeNull();
 });
 it("a synthetic yield remains an obligation until measured yield eligibility is granted",()=>{
  const {n,route,radius,fp}=synthetic(2,"yield"),a=new JunctionAdmissions(n),p=route.passages[0]!,r=request(route,p,fp(10-radius));r.yieldSatisfied=false;
  expect(a.resolve(dt,[r])).toEqual(["v"]);expect(query(a,route,10-radius,radius).control?.control.rule).toBe("yield");
  a.observe("v",{routeIndex:0,distanceM:10-radius,footprint:fp(10-radius)});
  expect(a.resolve(dt,[r])).toEqual([]);expect(query(a,route,10-radius,radius).control?.control.rule).toBe("yield");
  r.yieldSatisfied=true;expect(a.resolve(dt,[r])).toEqual(["v"]);expect(query(a,route,10-radius,radius).control?.passage).toBe(route.passages[1]);
 });
 it("a real physical-only boundary prefix covers no ordinary gate",()=>{
  const n=BOUNDARY_SOURCE_NETWORK as NetworkData,ids=BOUNDARY_SOURCE_ROUTES.find(r=>r.name==="initial-tail-only")!.ids,body=bodyFor(),radius=vehicleEnvelope(body.asset,body.scale).diameter/2,base=logical(n,ids,radius);
  const prefix=createBoundaryEntryPassage(n,"vehicle",ids,vehicleRouteFootprint(base,0,body))!;expect(prefix.lastConflictIndex).toBe(-1);
  const route=Object.freeze({...base,boundaryEntryPassage:prefix}),a=new JunctionAdmissions(n);grant(a,request(route,prefix,vehicleRouteFootprint(route,0,body)));
  const expected=route.passages[0]!;expect(query(a,route,0,radius).admission!.passage).toBe(expected);
 });
});

// Current-vintage counterparts run in addition to every historical case above.
describe("current exact source halt counterparts",()=>{
 it("keeps the literal complete clear route and actual body/frame requirements",()=>{
  const asset=currentFleet.vehicles[0]!,body:VehicleRouteBody={asset,scale:vehicleScale(()=>1,asset),laneIndex:0,frame:"population-upright"},radius=vehicleEnvelope(asset,body.scale).diameter/2;
  const ids=currentScenarios.clearRoute.ids,library=new RouteLibrary(currentNetwork,new RefusalCounts()),walk=vi.spyOn(library as unknown as {walk:(...args:unknown[])=>string[]|null},"walk").mockReturnValue([...ids]);
  try {const request={footprintRadiusM:radius,maxEdges:120,vehicleBody:body};
   const route=library.route("vehicle",0,1,ids[0]!,request);expect(route?.edgeIds).toEqual(ids);expect(currentNetwork.portals.vehicleExit).toContain(ids.at(-1));
   for(let i=1;i<ids.length;i++)expect(currentNetwork.lanes.find(e=>e.id===ids[i-1])!.nextIds).toContain(ids[i]);
   if(currentFresh){expect(body.asset.id).toBe(freshScenarios.body.classId);expect(body.scale).toBe(freshScenarios.body.scale);expect(radius).toBe(freshScenarios.body.radiusM);expect(route!.totalLengthM).toBe((freshScenarios.clearRoute as typeof freshScenarios.clearRoute & {totalM:number}).totalM);}
   expect(library.route("vehicle",0,1,ids[0]!,{...request,vehicleBody:{...body,frame:"unknown" as VehicleRouteBody["frame"]}})).toBeNull();
   expect(library.planFrom(library.vehicleGraph,"vehicle",ids[0]!,5970698,{footprintRadiusM:radius,maxEdges:120}).reason).toMatch(/actual asset, scale and core body frame/);
  }finally{walk.mockRestore();}
 });
 it("retains every original control identity/kind and only the exact fresh empty-applicability exception",()=>{
  const controls=currentNetwork.physical.trafficControls,expected=[...REVIEWED_SIGNAL_IDS.map(id=>[id,"traffic_signals"]),...REVIEWED_STOP_IDS.map(id=>[id,"stop"]),...(currentFresh?[[728435717,"stop"]]:[])].map(row=>JSON.stringify(row)).sort();
  expect(controls.map(c=>JSON.stringify([c.sourceNodeId,c.kind])).sort()).toEqual(expected);
  expect(controls.filter(c=>c.kind==="traffic_signals")).toHaveLength(78);expect(controls.filter(c=>c.kind==="stop")).toHaveLength(currentFresh?42:41);
  const hardware=currentTrafficHardware();expect(hardware.records).toHaveLength(controls.length);expect(hardware.inputs.network).toBe(currentFresh?"1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f":"314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677");
  if(currentFresh){const c=controls.find(c=>c.sourceNodeId===728435717)!;
   expect(c).toEqual({id:"osm:node:728435717:stop",sourceNodeId:728435717,kind:"stop",direction:"forward",position:{x:226.59930697600066,y:15.107587770987186,z:196.13809874963044},travelDirection:null,sourceTags:{direction:"forward",highway:"stop"},sourceWayIds:[58777418],controllerId:"junction:walk:1569138624:0:0:ground0",approachEdgeIds:[],entryEdgeIds:[]});
   expect(currentNetwork.lanes.some(e=>e.sourceWayId===58777433||e.sourceControlNodeIds.includes(728435717))).toBe(false);
   expect(hardware.records.find(r=>r.sourceNodeId===728435717)).toMatchObject({sourceId:c.id,status:"unplaced",reason:"No source-associated travel direction for authored hardware orientation.",base:null,head:null,direction:null});
  }
 });
 for(const [i,witness] of currentScenarios.stops.entries())it(`retains mapped stop context ${i+1} through real entry and measured line dwell`,()=>{
  const asset=currentFleet.vehicles[0]!,body:VehicleRouteBody={asset,scale:vehicleScale(()=>1,asset),laneIndex:0,frame:"population-upright"},radius=vehicleEnvelope(asset,body.scale).diameter/2,route=logical(currentNetwork,witness.ids,radius),a=new JunctionAdmissions(currentNetwork);
  const p=route.passages.find(p=>p.entryIndex===witness.passage.entryIndex)!;expect(p.lastConflictIndex).toBe(witness.passage.lastConflictIndex);expect(p.controls).toEqual(witness.passage.controls);expect(p.controls[0]!.nodeIds).toEqual([[13782042827],[13782042827],[13781883297],[13782042827]][i]);
  let completed=0;for(const prior of route.passages){if(prior===p)break;completePrior(a,route,prior,body);completed++;}expect(completed>0).toBe(i!==2);
  const hold=p.starts[p.entryIndex]!-radius,control=p.controls[0]!,line=p.starts[control.routeIndex]!+control.distanceM;
  expect(query(a,route,hold-.01,radius).control?.control).toBe(control);grant(a,request(route,p,vehicleRouteFootprint(route,hold,body)));expect(query(a,route,hold+.01,radius).control?.control).toBe(control);
  a.observe("v",observation(route,witness.progressAfterEntry,body));expect(a.haltStateFor("v",route,1).held!.entered).toBe(true);
  const during=query(a,route,witness.progressAfterEntry,radius);expect(during.control?.control).toBe(control);expect(during.control!.distanceM-witness.progressAfterEntry).toBeCloseTo(witness.remainingAuthorityFrontM,10);
  a.resolve(dt,[request(route,p,vehicleRouteFootprint(route,witness.progressAfterEntry,body),control.routeIndex,1)]);expect(a.haltStateFor("v",route,1).held!.unclearedControls).toContain(control);
  expect(()=>a.observe("v",observation(route,line-radius+.01,body))).toThrow(/mapped stop/);expect(query(a,route,line-radius+.01,radius).refusal).toMatch(/mapped stop/);
  clearControl(a,route,p,control,body);expect(query(a,route,line-radius,radius).control?.control).not.toBe(control);expect(()=>a.observe("v",observation(route,line-radius+.01,body))).not.toThrow();
 });
});
