/** F4 bounds: exact reviewed car/bus/mixed routes, two directions where mapped, and synthetic short actors, internal controls and route loops. Full-source checks run separately. */
import { describe, expect, it } from "vitest";
import { COMPOUND_SOURCE_FIXTURE, COMPOUND_SOURCE_ROUTES } from "./network-compound-source-fixture.ts";
import { MAPPED_STOP_FIXTURE, MAPPED_STOP_ROUTE } from "./network-mapped-control-source-fixture.ts";
import { groupCompounds, validateCompoundClearance } from "../tools/network/compounds.ts";
import { JunctionAdmissions, type ActorFootprint, type AdmissionRequest } from "../src/network/admissions.ts";
import { createRoutePassage, type RoutePassage } from "../src/network/passages.ts";
import { assertSupportedFootprint } from "../src/network/admission-bounds.ts";
import { headingAt, occupiesJunction, pathLength, sampleEdge } from "../src/network/geometry.ts";
import type { Junction, LaneEdge, NetworkData, WalkEdge } from "../src/world/network-data.ts";

const dt=1/60;
const body={car:{lengthM:4.6,widthM:1.8},bus:{lengthM:10.565,widthM:3.28},small:{lengthM:.4,widthM:.3}};
function groupedSource(){const n=structuredClone(COMPOUND_SOURCE_FIXTURE);n.junctions=groupCompounds(n.junctions,n.lanes,n.walks).junctions;return n;}
function at(p:RoutePassage,index:number,distanceM:number,size=body.car){const edge=p.edges[index]!;return{routeIndex:index,distanceM,footprint:{position:sampleEdge(edge,distanceM),headingRadians:headingAt(edge,distanceM),...size}};}
function req(id:string,p:RoutePassage,index=p.entryIndex,extra:Partial<AdmissionRequest>={}):AdmissionRequest{return{actorId:id,kind:p.kind,passage:p,entryEdgeId:p.edges[index]!.id,routeIndex:index,footprint:at(p,index,0).footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true,...extra};}
function obtain(c:JunctionAdmissions,r:AdmissionRequest){for(let tick=0;tick<60*180;tick++)if(c.resolve(dt,[r]).includes(r.actorId))return;throw new Error(`No admission for ${r.actorId} over 180 seconds.`);}
function finish(c:JunctionAdmissions,id:string,p:RoutePassage,startIndex:number,size=body.car,others:AdmissionRequest[]=[]){let released=false;for(let index=startIndex;index<p.edges.length;index++){const edge=p.edges[index]!;for(let s=0;s<=edge.lengthM;s+=.25){if(p.controls.some(control=>control.routeIndex===index))c.resolve(dt,[req(id,p,index,{footprint:at(p,index,s,size).footprint}),...others]);else c.resolve(dt,others);released=c.observe(id,at(p,index,s,size))||released;}released=c.observe(id,at(p,index,edge.lengthM,size))||released;}return released;}

describe("compound source clearance",()=>{
  it.each(COMPOUND_SOURCE_ROUTES.map(r=>[r.name,r.edgeIds] as const))("groups and clears exact %s route without a second authority acquisition",(name,ids)=>{
    const n=groupedSource(),p=createRoutePassage(n,"vehicle",ids,0),a=p.edges[0]!,gap=p.edges[1]!,b=p.edges[2]!,size=name.startsWith("bus")?body.bus:body.car,c=new JunctionAdmissions(n);
    expect(a.junctionId).toBe(b.junctionId);expect(p.lastConflictIndex).toBeGreaterThanOrEqual(2);
    if(name==="car-forward")expect(gap.lengthM).toBeCloseTo(.23153420385868426,10);
    if(name==="bus-reverse")expect(gap.lengthM).toBeCloseTo(4.704644408329627,10);
    obtain(c,req("vehicle",p,0,{footprint:at(p,0,0,size).footprint}));
    const stopped=a.lengthM+gap.lengthM-size.lengthM/2;
    c.observe("vehicle",at(p,0,0,size));
    if(stopped>=0&&stopped<a.lengthM){expect(c.observe("vehicle",at(p,0,stopped,size))).toBe(false);expect(c.occupied(p.junctionId)).toBe(true);}
    expect(c.resolve(dt,[req("vehicle",p,2,{footprint:at(p,2,0,size).footprint})])).toEqual(["vehicle"]);
    expect(finish(c,"vehicle",p,1,size)).toBe(true);expect(c.snapshot()).toEqual([]);
  });
  it("serializes the real opposing mixed-authority pair and serves both directions",()=>{
    const n=groupedSource(),forward=createRoutePassage(n,"vehicle",COMPOUND_SOURCE_ROUTES.find(r=>r.name==="mixed-forward")!.edgeIds,0),reverse=createRoutePassage(n,"vehicle",COMPOUND_SOURCE_ROUTES.find(r=>r.name==="mixed-reverse")!.edgeIds,0),c=new JunctionAdmissions(n);
    expect(forward.junctionId).toBe(reverse.junctionId);let granted:string[]=[];
    for(let tick=0;tick<180*60&&!granted.length;tick++)granted=c.resolve(dt,[req("out",forward),req("back",reverse)]);
    expect(granted).toHaveLength(1);const first=granted[0]!,firstPath=first==="out"?forward:reverse,other=first==="out"?"back":"out",otherPath=other==="out"?forward:reverse;
    c.observe(first,at(firstPath,0,0));expect(c.resolve(dt,[req(other,otherPath)])).toEqual([]);
    expect(finish(c,first,firstPath,0,body.car,[req(other,otherPath)])).toBe(true);
    // It may have received its green on the final outside section; otherwise wait for that finite phase.
    if(!c.snapshot().some(s=>s.actorId===other))obtain(c,req(other,otherPath));
    expect(finish(c,other,otherPath,0)).toBe(true);
    for(let i=0;i<360*60;i++)c.resolve(dt,[]);
    expect(c.signalSnapshot().every(s=>s.cycle>=2)).toBe(true);expect(c.snapshot()).toEqual([]);
  });
  it("rejects the frozen ungrouped source at the analytical clearance gate",()=>{
    expect(()=>validateCompoundClearance(COMPOUND_SOURCE_FIXTURE)).toThrow(/Compound clearance/);
    expect(()=>validateCompoundClearance(groupedSource())).not.toThrow();
  });
});

function synthetic(signal=false,stop=false){
  const makeJ=(id:string,z:number,kind:Junction["controlKind"]):Junction=>({id,controlKind:kind,controlSource:"mapped",position:{x:0,y:15,z},radiusM:2,vehicleGroups:kind==="signal"?[`${id}:vehicle:0`]:[],pedestrianGroup:`${id}:pedestrian`,clearanceSeconds:1,vehicleGreenSeconds:2,pedestrianGreenSeconds:2});
  const makeLane=(id:string,start:number,end:number,owner:string|null,nextIds:string[],rule:LaneEdge["entryRule"]="priority"):LaneEdge=>({id,kind:"lane",from:`z${start}`,to:`z${end}`,points:[{x:0,y:15,z:start},{x:0,y:15,z:end}],lengthM:Math.abs(end-start),widthM:3,sourceWayId:1,nextIds,junctionId:owner,signalGroupId:owner&&signal?`${owner}:vehicle:0`:null,speedMps:8,leftLaneId:null,rightLaneId:null,entryRule:rule,sourceControlNodeIds:rule==="stop"?[99]:[]});
  const lanes=[makeLane("approach",-12,-2,null,["a"]),makeLane("a",-2,2,"a",["gap"]),makeLane("gap",2,6,null,["b"]),makeLane("b",6,10,"b",["exit"],stop?"stop":"priority"),makeLane("exit",10,22,null,[])];
  const walks:WalkEdge[]=lanes.map(e=>({...e,id:`walk:${e.id}`,kind:e.junctionId?"crossing":"sidewalk",nextIds:e.nextIds.map(id=>`walk:${id}`)}));
  const n:Pick<NetworkData,"junctions"|"lanes"|"walks">={junctions:[makeJ("a",0,signal?"signal":"reservation"),makeJ("b",8,"reservation")],lanes,walks};n.junctions=groupCompounds(n.junctions,lanes,walks).junctions;return n;
}
describe("compound progress and footprint contract",()=>{
  it("locates source stop 1519695413 at its mapped route point inside the compound",()=>{
    const p=createRoutePassage(MAPPED_STOP_FIXTURE,"vehicle",MAPPED_STOP_ROUTE,0),c=new JunctionAdmissions(MAPPED_STOP_FIXTURE);
    expect(p.controls).toEqual([{routeIndex:2,distanceM:3.855238570695163,nodeIds:[1519695413],rule:"stop"}]);
    // Admission at the first disk does not move the mapped stop to that boundary.
    obtain(c,req("v",p,0,{stoppedSeconds:0}));c.observe("v",at(p,0,0,body.small));
    expect(c.observe("v",at(p,2,1,body.small))).toBe(false);
    expect(()=>c.observe("v",at(p,2,p.edges[2]!.lengthM,body.small))).toThrow(/mapped stop node\/1519695413/);
    expect(c.resolve(dt,[req("v",p,2,{stoppedSeconds:.99})])).toEqual([]);
    expect(c.resolve(dt,[req("v",p,2)])).toEqual(["v"]);c.observe("v",at(p,2,p.edges[2]!.lengthM,body.small));expect(finish(c,"v",p,3,body.small)).toBe(true);
  });
  it.each(["vehicle","pedestrian"] as const)("retains a short %s through a physically empty internal gap",kind=>{
    const n=synthetic(),ids=["approach","a","gap","b","exit"].map(id=>kind==="pedestrian"?`walk:${id}`:id),p=createRoutePassage(n,kind,ids,1),c=new JunctionAdmissions(n);
    obtain(c,req("small",p,1,{footprint:at(p,0,0,body.small).footprint}));expect(c.observe("small",at(p,0,0,body.small))).toBe(false);expect(c.occupied(p.junctionId)).toBe(false);
    c.observe("small",at(p,1,1,body.small));const gap=at(p,2,2,body.small);
    expect(occupiesJunction(n.junctions[0]!,gap.footprint.position,0,body.small.lengthM,body.small.widthM)).toBe(false);
    expect(c.observe("small",gap)).toBe(false);expect(c.occupied(p.junctionId)).toBe(true);expect(c.cancelPending("small")).toBe(false);
    expect(finish(c,"small",p,3,body.small)).toBe(true);expect(c.occupied(p.junctionId)).toBe(false);
  });
  it("holds signal clearance while a short actor is in the internal gap, then admits a pedestrian batch",()=>{
    const n=synthetic(true),p=createRoutePassage(n,"vehicle",["approach","a","gap","b","exit"],1),walk=createRoutePassage(n,"pedestrian",["walk:approach","walk:a","walk:gap","walk:b","walk:exit"],1),c=new JunctionAdmissions(n);
    obtain(c,req("car",p));c.observe("car",at(p,1,1,body.small));c.observe("car",at(p,2,2,body.small));
    for(let tick=0;tick<60*20;tick++)expect(c.resolve(dt,[req("p1",walk),req("p2",walk)])).toEqual([]);
    expect(c.signalSnapshot()[0]!.clearanceHeld).toBe(true);expect(c.signalSnapshot()[0]!.cycle).toBe(0);
    expect(finish(c,"car",p,3,body.small)).toBe(true);
    let admitted:string[]=[];for(let tick=0;tick<60*20&&!admitted.length;tick++)admitted=c.resolve(dt,[req("p1",walk),req("p2",walk)]);
    expect(admitted).toEqual(["p1","p2"]);
  });
  it("requires a new measured stop at an internal mapped control while preserving the existing commitment",()=>{
    const n=synthetic(false,true),p=createRoutePassage(n,"vehicle",["approach","a","gap","b","exit"],1),c=new JunctionAdmissions(n);
    obtain(c,req("v",p));c.observe("v",at(p,1,0));
    expect(c.resolve(dt,[req("v",p,3,{stoppedSeconds:.99})])).toEqual([]);expect(c.resolve(dt,[req("v",p,3,{yieldSatisfied:false})])).toEqual([]);
    expect(()=>c.observe("v",at(p,3,0))).toThrow(/mapped stop node\/99/);expect(c.snapshot()).toHaveLength(1);
    expect(c.resolve(dt,[req("v",p,3)])).toEqual(["v"]);expect(finish(c,"v",p,3)).toBe(true);
  });
  it("retains an internal mapped yield obligation without inventing stop dwell",()=>{
    const n=synthetic(false,true),b=n.lanes.find(e=>e.id==="b")!;b.entryRule="yield";
    const p=createRoutePassage(n,"vehicle",["approach","a","gap","b","exit"],1),c=new JunctionAdmissions(n);
    obtain(c,req("v",p));c.observe("v",at(p,1,0));
    expect(c.resolve(dt,[req("v",p,3,{stoppedSeconds:0,yieldSatisfied:false})])).toEqual([]);
    expect(()=>c.observe("v",at(p,3,0))).toThrow(/mapped yield node\/99/);expect(c.occupied(p.junctionId)).toBe(true);
    expect(c.resolve(dt,[req("v",p,3,{stoppedSeconds:0,yieldSatisfied:true})])).toEqual(["v"]);
    expect(finish(c,"v",p,3)).toBe(true);
  });
  it("expires an unused green grant without holding clearance for a queue before the stop line",()=>{
    const n=synthetic(true),p=createRoutePassage(n,"vehicle",["approach","a","gap","b","exit"],1),c=new JunctionAdmissions(n);
    obtain(c,req("queued",p,1,{footprint:at(p,0,0).footprint}));c.observe("queued",at(p,0,0));
    expect(c.occupied(p.junctionId)).toBe(false);
    for(let tick=0;tick<3*60;tick++)c.resolve(dt,[]);
    expect(c.snapshot()).toEqual([]);expect(c.resolve(dt,[req("queued",p)])).toEqual([]);
    for(let tick=0;tick<30*60;tick++)c.resolve(dt,[]);
    expect(c.signalSnapshot()[0]!.cycle).toBeGreaterThanOrEqual(3);expect(c.occupied(p.junctionId)).toBe(false);
  });
  it("repeats grouping after a union exposes a new unsafe primitive separation",()=>{
    const n=synthetic(),b=n.lanes.find(e=>e.id==="b")!,exit=n.lanes.find(e=>e.id==="exit")!,third:Junction={...n.junctions[0]!,id:"c",memberIds:["c"],position:{x:0,y:15,z:-15},radiusM:2,conflictAreas:[{position:{x:0,y:15,z:-15},radiusM:2}],pedestrianGroup:"c:pedestrian"};
    // Recreate two original authorities: first-pass a+b leaves b->c far apart,
    // but the new union includes a's disk only 11 m from c's disk.
    const originalA:Junction={...third,id:"a",memberIds:["a"],position:{x:0,y:15,z:0},conflictAreas:[{position:{x:0,y:15,z:0},radiusM:2}]};
    const originalB:Junction={...third,id:"b",memberIds:["b"],position:{x:0,y:15,z:8},conflictAreas:[{position:{x:0,y:15,z:8},radiusM:2}]};
    b.junctionId="b";b.nextIds=["long-gap"];
    const gap:LaneEdge={...exit,id:"long-gap",points:[{x:0,y:15,z:10},{x:20,y:15,z:10},{x:20,y:15,z:-17},{x:0,y:15,z:-17}],nextIds:["c-edge"]};gap.lengthM=pathLength(gap.points);
    const cEdge:LaneEdge={...b,id:"c-edge",junctionId:"c",points:[{x:0,y:15,z:-17},{x:0,y:15,z:-13}],lengthM:4,nextIds:["exit"]};
    const lanes=[...n.lanes,gap,cEdge],result=groupCompounds([originalA,originalB,third],lanes,[]);
    expect(result.junctions).toHaveLength(1);expect(result.junctions[0]!.memberIds?.sort()).toEqual(["a","b","c"]);
    expect(()=>validateCompoundClearance({junctions:result.junctions,lanes,walks:[]})).not.toThrow();
  });
  it("rejects fabricated passages, disconnected routes and incomplete exits",()=>{
    const n=synthetic(),p=createRoutePassage(n,"vehicle",["approach","a","gap","b","exit"],1),c=new JunctionAdmissions(n);
    expect(()=>createRoutePassage(n,"vehicle",["approach","a","b","exit"],1)).toThrow(/cannot jump/);
    expect(()=>createRoutePassage(n,"vehicle",["approach","a","gap","b"],1)).toThrow(/outside exit section/);
    expect(()=>c.resolve(dt,[req("v",{...p})])).toThrow(/createRoutePassage/);
    const other=synthetic(),foreign=createRoutePassage(other,"vehicle",["approach","a","gap","b","exit"],1);
    expect(()=>c.resolve(dt,[req("v",foreign)])).toThrow(/different network snapshot/);expect(c.snapshot()).toEqual([]);
  });
  it("distinguishes repeated route occurrences and retains a commitment through a loop",()=>{
    const n=synthetic(false,true),b=n.lanes.find(e=>e.id==="b")!,loop:LaneEdge={...b,id:"loop",entryRule:"priority",sourceControlNodeIds:[],junctionId:null,signalGroupId:null,from:b.to,to:n.lanes.find(e=>e.id==="a")!.from,points:[{x:0,y:15,z:10},{x:20,y:15,z:10},{x:20,y:15,z:-2},{x:0,y:15,z:-2}],lengthM:52,nextIds:["a"]};loop.lengthM=pathLength(loop.points);b.nextIds.push("loop");n.lanes.push(loop);
    const physical={crossings:[],tactilePaths:[],trafficControls:[{...MAPPED_STOP_FIXTURE.physical.trafficControls[0]!,sourceNodeId:99,controllerId:n.junctions[0]!.id,approachEdgeIds:["gap","b"],entryEdgeIds:["a"],position:{x:0,y:15,z:8}}]};
    const p=createRoutePassage({...n,physical},"vehicle",["approach","a","gap","b","loop","a","gap","b","exit"],1),c=new JunctionAdmissions(n);expect(p.lastConflictIndex).toBe(7);
    expect(p.controls.map(control=>[control.routeIndex,control.distanceM])).toEqual([[3,2],[7,2]]);
    obtain(c,req("v",p));c.observe("v",at(p,1,0));c.resolve(dt,[req("v",p,3)]);c.observe("v",at(p,3,1));expect(c.observe("v",at(p,4,30))).toBe(false);expect(c.occupied(p.junctionId)).toBe(true);
    expect(()=>c.observe("v",at(p,1,1))).toThrow(/backwards/);c.observe("v",at(p,5,0));
    expect(c.resolve(dt,[req("v",p,7,{stoppedSeconds:0})])).toEqual([]);expect(()=>c.observe("v",at(p,7,0))).toThrow(/mapped stop/);
    c.resolve(dt,[req("v",p,7)]);expect(finish(c,"v",p,7)).toBe(true);
  });
  it("projects a mapped stop at a split boundary onto the controlled section once",()=>{
    const n=synthetic(false,true),physical={crossings:[],tactilePaths:[],trafficControls:[{...MAPPED_STOP_FIXTURE.physical.trafficControls[0]!,sourceNodeId:99,controllerId:n.junctions[0]!.id,approachEdgeIds:["gap","b"],entryEdgeIds:["a"],position:{x:1.5,y:15,z:6+5e-7}}]},p=createRoutePassage({...n,physical},"vehicle",["approach","a","gap","b","exit"],1);
    expect(p.controls).toHaveLength(1);expect(p.controls[0]!.routeIndex).toBe(3);expect(p.controls[0]!.distanceM).toBeCloseTo(5e-7,10);
  });
  it("checks generated-size engineering bounds and exact rectangle contact in both headings",()=>{
    expect(()=>assertSupportedFootprint(body.bus)).not.toThrow();expect(()=>assertSupportedFootprint(body.bus,1.06)).toThrow(/diagonal bound/);
    const j=synthetic().junctions[0]!;for(const yaw of [0,Math.PI]){expect(occupiesJunction(j,{x:0,y:15,z:-4},yaw,4.6,1.8)).toBe(true);expect(occupiesJunction(j,{x:0,y:15,z:-5},yaw,4.6,1.8)).toBe(false);}
    const n=synthetic(),p=createRoutePassage(n,"vehicle",["approach","a","gap","b","exit"],1),c=new JunctionAdmissions(n),oversize:ActorFootprint={...at(p,0,0).footprint,lengthM:12,widthM:3};
    expect(()=>c.resolve(dt,[req("big",p,1,{footprint:oversize})])).toThrow(/diagonal bound/);
  });
});
