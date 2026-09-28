/** Bound: integration238's pinned final-tail re-entry plus bounded API controls.
 * Enclosing-origin contact bounds are conservative authority/receiving protection,
 * not road support, obstacle clearance, traffic throughput or rendering evidence. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { RouteLibrary, vehicleRouteFootprint, vehicleRoutePose, type PlannedRoute, type VehicleRouteBody } from '../src/agents/population/routes.ts';
import { RefusalCounts } from '../src/agents/population/status.ts';
import { vehicleFinalRelease } from '../src/agents/population/vehicle-approach.ts';
import { hasVehiclePassageSpace } from '../src/agents/population/vehicle-clearance.ts';
import { createSlotTable, placeSlot } from '../src/agents/population/slots.ts';
import { createPopulation } from '../src/agents/population/tick.ts';
import { populationSettings } from '../src/agents/population/config.ts';
import { JunctionAdmissions, type AdmissionRequest } from '../src/network/admissions.ts';
import { createRouteVisits } from '../src/network/halts.ts';
import { boundaryProgress } from '../src/network/boundaries.ts';
import { footprintOccupies, projectVehicleFootprint, vehicleEnvelope } from '../src/network/footprints.ts';
import type { NetworkData, LaneEdge, WorldPoint } from '../src/world/network-data.ts';
import type { VehicleAssetManifest } from '../src/world/agent-assets.ts';
const witness=JSON.parse(readFileSync(new URL('./fixtures/vehicle-final-tail.json',import.meta.url),'utf8')) as {inputs:{network:string;fleet:string};classId:string;scale:number;edgeIds:string[];owner:string;entryIndex:number;lastConflictIndex:number;firstEntryM:number;oldReleaseM:number;reentryM:number;totalLengthM:number};
function pinned<T>(path:string,digest:string):T {
 const bytes=readFileSync(new URL(`../${path}`,import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex'),`Restore reviewed ${path}; changed source needs review.`).toBe(digest);
 return JSON.parse(bytes.toString()) as T;
}
const network=pinned<NetworkData>('data/network/network.json',witness.inputs.network),fleet=pinned<VehicleAssetManifest>('data/scene/agents/vehicles.json',witness.inputs.fleet);
const body:VehicleRouteBody={asset:fleet.vehicles.find(v=>v.id===witness.classId)!,scale:witness.scale,laneIndex:0,frame:'population-upright'};
function sourceRoute() {
 const checked=new RouteLibrary(network,new RefusalCounts()).validateVehicleCandidate(witness.edgeIds,body);
 expect(checked.route,checked.reason).not.toBeNull();return checked.route!;
}
function grant(a:JunctionAdmissions,route:PlannedRoute,distanceM:number) {
 const passage=route.passages[0]!;
 const request:AdmissionRequest={actorId:'tail',kind:'vehicle',passage,entryEdgeId:route.edgeIds[passage.entryIndex]!,routeIdentity:route,generation:1,footprint:vehicleRouteFootprint(route,distanceM,body),stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true};
 for(let t=0;t<600;t++)if(a.resolve(.25,[request]).includes('tail'))return;
 throw Error('The retained source visit received no grant in 150 seconds.');
}
function observe(a:JunctionAdmissions,route:PlannedRoute,distanceM:number) {
 const pose=vehicleRoutePose(route,distanceM,0);
 return a.observe('tail',{routeIndex:pose.occurrence,distanceM:distanceM-route.starts[pose.occurrence]!,footprint:vehicleRouteFootprint(route,distanceM,body)});
}
describe('final vehicle visit physical tail',()=>{
 it('retains the exact factory visit through the observed clear gap and later same-owner re-entry',()=>{
  const route=sourceRoute(),p=route.passages[0]!,owner=network.junctions.find(j=>j.id===witness.owner)!,a=new JunctionAdmissions(network);
  expect(route.edgeIds).toEqual(witness.edgeIds);expect(p.entryIndex).toBe(witness.entryIndex);expect(p.lastConflictIndex).toBe(witness.lastConflictIndex);
  expect(route.vehicleFinalRelease?.passage).toBe(p);expect(Object.isFrozen(route.vehicleFinalRelease)).toBe(true);
  expect(route.vehicleFinalRelease?.distanceM).toBeCloseTo(witness.totalLengthM,10);
  grant(a,route,route.gates[0]!.holdDistanceM);observe(a,route,witness.firstEntryM);
  expect(footprintOccupies(owner,vehicleRouteFootprint(route,witness.oldReleaseM,body))).toBe(false);
  expect(observe(a,route,witness.oldReleaseM)).toBe(false);expect(a.commitmentFor('tail')?.entered).toBe(true);
  expect(footprintOccupies(owner,vehicleRouteFootprint(route,witness.reentryM,body))).toBe(true);
  expect(observe(a,route,witness.reentryM)).toBe(false);expect(a.occupied(owner.id)).toBe(true);
  observe(a,route,route.totalLengthM);
  for(let t=0;t<600;t++)a.resolve(.25,[]);
  expect(a.commitmentFor('tail')?.entered).toBe(true);expect(a.signalSnapshot().find(s=>s.junctionId===owner.id)?.clearanceHeld).toBe(true);
  const exit=p.boundaryExit!,pose=vehicleRoutePose(route,route.totalLengthM,0),origin={...exit.position,x:exit.position.x+2*exit.outward.x,z:exit.position.z+2*exit.outward.z};
  const footprint=projectVehicleFootprint(body.asset,origin,pose.heading,{x:0,y:1,z:0},body.scale,[0,0,0,0]);
  expect(boundaryProgress(exit,footprint).fullyOutside).toBe(true);expect(network.junctions.some(j=>footprintOccupies(j,footprint))).toBe(false);
  expect(a.observe('tail',{routeIndex:route.edges.length-1,distanceM:route.edges.at(-1)!.lengthM,footprint})).toBe(true);
  expect(a.commitmentFor('tail')).toBeNull();expect(a.occupied(owner.id)).toBe(false);
 });
 it('retires the actual formerly failing slot through its bound outward envelope without an in-place retirement',()=>{
  const a=new JunctionAdmissions(network),p=createPopulation({network,fleet,admissions:a,settings:populationSettings({pedestrians:60,vehicles:12,seed:0x5b1b0a})});
  try {
   for(let tick=1;tick<=2100;tick++){
    p.update(1/60,tick/60);
    if(tick===1921||tick===1955){expect(p.diagnostics().vehicles[11]!.committed).toBe(true);expect(a.commitmentFor('vehicle:11')?.entered).toBe(true);}
   }
   const actor=p.diagnostics().vehicles[11]!;
   expect(actor.active).toBe(false);expect(actor.egressOffsetM).toBeGreaterThan(2);expect(actor.egressOffsetM).toBeLessThan(7.5);
   expect(p.status().authorityViolations).toBe(0);expect(p.status().retiredInPlace).toBe(0);expect(a.commitmentFor('vehicle:11')).toBeNull();
  } finally {p.dispose();}
 });
 it('protects an active or pending body on the terminal outward line that the old source-end sweep omitted',()=>{
  const route=sourceRoute(),p=route.passages[0]!,table=createSlotTable(populationSettings({pedestrians:0,vehicles:2})),exit=p.boundaryExit!;
  for(const state of table.vehicles)Object.assign(state,{variant:1,scale:body.scale});
  table.vehicleRoutes[0]=route;
  placeSlot(table.poses.vehicles,1,{...exit.position,x:exit.position.x+6.5*exit.outward.x,z:exit.position.z+6.5*exit.outward.z},0);
  const clear=(r:PlannedRoute,pending:ReadonlySet<number>)=>hasVehiclePassageSpace(table,fleet,r,p,route.gates[0]!.holdDistanceM,0,pending,network.admissionBounds.stopGapM);
  const {vehicleFinalRelease:removed,...old}=route;void removed;
  expect(clear(old,new Set([1]))).toBe(true);
  expect(clear(route,new Set([1]))).toBe(false);
  table.poses.vehicles.active[1]=1;expect(clear(route,new Set())).toBe(false);
  table.poses.vehicles.active[1]=0;expect(clear(route,new Set())).toBe(true);
 });
 it('releases a genuinely clear final tail before the route terminus and keeps earlier visits separate',()=>{
  const pt=(z:number):WorldPoint=>({x:0,y:0,z});
  const lane=(id:string,lo:number,hi:number,junctionId:string|null,nextIds:string[]):LaneEdge=>({id,kind:'lane',from:id+'a',to:id+'b',points:[pt(lo),pt(hi)],lengthM:hi-lo,widthM:4,sourceWayId:1,nextIds,junctionId,signalGroupId:null,speedMps:8,leftLaneId:null,rightLaneId:null,entryRule:'priority',sourceControlNodeIds:[]});
  const lanes=[lane('approach',0,20,null,['one']),lane('one',20,24,'one',['gap']),lane('gap',24,40,null,['two']),lane('two',40,44,'two',['exit']),lane('exit',44,100,null,[])];
  const junctions=[20,40].map((z,i)=>({id:i?'two':'one',position:pt(z+2),radiusM:1,controlKind:'reservation' as const,controlSource:'mapped' as const,vehicleGroups:[],pedestrianGroup:'ped',clearanceSeconds:1,vehicleGreenSeconds:1,pedestrianGreenSeconds:1}));
  const n={lanes,junctions,walks:[],admissionBounds:network.admissionBounds} as unknown as NetworkData,passages=createRouteVisits(n,'vehicle',lanes.map(e=>e.id));
  const base:PlannedRoute={entryEdgeId:'approach',edgeIds:lanes.map(e=>e.id),edges:Object.freeze(lanes),starts:[0,20,24,40,44],totalLengthM:100,passages,gates:[],speedLimits:lanes.map(e=>e.speedMps)};
  const envelope=vehicleEnvelope(body.asset,body.scale),release=vehicleFinalRelease(n,base,envelope.diameter/2+Math.hypot(envelope.centre.x,envelope.centre.z))!;
  const route=Object.freeze({...base,vehicleFinalRelease:release}),a=new JunctionAdmissions(n);
  expect(release.passage).toBe(passages[1]);expect(release.distanceM).toBeGreaterThan(45);expect(release.distanceM).toBeLessThan(47);
  grant(a,route,10);observe(a,route,22);expect(observe(a,route,30)).toBe(true);
  const p=passages[1]!;
  expect(a.resolve(.25,[{actorId:'tail',kind:'vehicle',passage:p,entryEdgeId:'two',routeIdentity:route,generation:1,footprint:vehicleRouteFootprint(route,35,body),stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true}])).toEqual(['tail']);
  observe(a,route,42);expect(observe(a,route,release.distanceM+1)).toBe(true);expect(a.commitmentFor('tail')).toBeNull();
 });
});
