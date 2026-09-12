/** Bounds: fixed-tick admission, measured stop/yield eligibility, route-aware full-footprint clearance and bounded eligible-request fairness. */
import { describe, expect, it } from "vitest";
import { JunctionReservations, STOP_DWELL_SECONDS, type ReservationRequest } from "../src/network/reservations.ts";
import { createRoutePassage } from "../src/network/passages.ts";
import { SignalController } from "../src/network/signals.ts";
import type { Junction, LaneEdge, NetworkData, WalkEdge } from "../src/world/network-data.ts";

const junction:Junction={id:"j",controlKind:"reservation",controlSource:"mapped",position:{x:0,y:15,z:0},radiusM:5,vehicleGroups:[],pedestrianGroup:"j:pedestrian",clearanceSeconds:2,vehicleGreenSeconds:10,pedestrianGreenSeconds:10};
const lane=(id:string,entryRule:LaneEdge["entryRule"],start=-5,end=5,nextIds=["exit"],junctionId:string|null="j"):LaneEdge=>({id,entryRule,sourceControlNodeIds:entryRule==="stop"?[1496233582]:[],kind:"lane",from:id+":a",to:id+":b",points:[{x:0,y:15,z:start},{x:0,y:15,z:end}],lengthM:end-start,widthM:3,sourceWayId:30012066,nextIds,junctionId,signalGroupId:null,speedMps:8,leftLaneId:null,rightLaneId:null});
const walking:WalkEdge={...lane("walk","yield",-5,5,["walk-exit"]),kind:"crossing"},walkExit:WalkEdge={...lane("walk-exit","none",5,15,[],null),kind:"sidewalk"};
const network:Pick<NetworkData,"junctions"|"lanes"|"walks">={junctions:[junction],lanes:[lane("priority","priority",-5,0,["inside"]),lane("inside","priority",0,5),lane("stop","stop"),lane("yield","yield"),lane("exit","none",5,15,[],null)],walks:[walking,walkExit]};
const passages=new Map(["priority","stop","yield","walk"].map(id=>[id,createRoutePassage(network,id==="walk"?"pedestrian":"vehicle",id==="priority"?["priority","inside","exit"]:[id,id==="walk"?"walk-exit":"exit"],0)]));
const footprint=(z:number,lengthM=4)=>({position:{x:0,y:15,z},headingRadians:0,lengthM,widthM:2});
const request=(actorId:string,entryEdgeId="priority",extra:Partial<ReservationRequest>={}):ReservationRequest=>({actorId,entryEdgeId,kind:entryEdgeId==="walk"?"pedestrian":"vehicle",passage:passages.get(entryEdgeId)??passages.get("priority")!,footprint:footprint(-10),stoppedSeconds:STOP_DWELL_SECONDS,yieldSatisfied:true,receivingSpace:true,...extra});
function observation(entry:string,z:number,lengthM=4){const passage=passages.get(entry)!,index=passage.edges.findIndex(e=>z<=e.points.at(-1)!.z),routeIndex=index<0?passage.edges.length-1:index,edge=passage.edges[routeIndex]!;return{routeIndex,distanceM:Math.max(0,Math.min(edge.lengthM,z-edge.points[0]!.z)),footprint:footprint(z,lengthM)};}
function clear(controller:JunctionReservations,id:string):void {const entry=controller.snapshot().find(c=>c.actorId===id)!.entryEdgeId;expect(controller.release("j",id,observation(entry,0))).toBe(false);expect(controller.release("j",id,observation(entry,10))).toBe(true);}

describe("shared unsignalized reservations",()=>{
  it("requires mapped stop dwell, a measured gap and receiving space",()=>{
    const controller=new JunctionReservations(network);
    expect(controller.resolve(.25,[request("s","stop",{stoppedSeconds:STOP_DWELL_SECONDS-.01})])).toEqual([]);
    expect(controller.resolve(.25,[request("s","stop",{yieldSatisfied:false})])).toEqual([]);
    expect(controller.resolve(.25,[request("s","stop",{receivingSpace:false})])).toEqual([]);
    expect(controller.resolve(.25,[request("s","stop")])).toEqual(["s"]);expect(controller.snapshot()[0]!.entryEdgeId).toBe("stop");
  });
  it("resolves the same simultaneous requests in either caller iteration order",()=>{
    const a=new JunctionReservations(network),b=new JunctionReservations(network),requests=[request("z"),request("a"),request("p","walk")];
    expect(a.resolve(1/60,requests)).toEqual(b.resolve(1/60,requests.toReversed()));expect(a.snapshot()).toEqual(b.snapshot());expect(a.snapshot()[0]!.actorId).toBe("a");
  });
  it("retains ownership before entry, across internal requests and until a vehicle tail clears",()=>{
    const controller=new JunctionReservations(network);controller.resolve(.25,[request("v")]);
    expect(controller.release("j","v",observation("priority",-10))).toBe(false);expect(controller.occupied("j")).toBe(false);
    expect(controller.release("j","v",observation("priority",0))).toBe(false);expect(controller.occupied("j")).toBe(true);
    expect(controller.resolve(.25,[request("v","inside",{passage:passages.get("priority")!,routeIndex:1}),request("p","walk")])).toEqual(["v"]);
    expect(controller.release("j","p",observation("walk",10))).toBe(false);
    expect(controller.release("j","v",observation("priority",6))).toBe(false);
    expect(controller.release("j","v",observation("priority",10))).toBe(true);
    expect(controller.resolve(.25,[request("p","walk")])).toEqual(["p"]);
  });
  it("holds a pedestrian lease against vehicles and requires actual yield eligibility",()=>{
    const controller=new JunctionReservations(network);expect(controller.resolve(.25,[request("p","walk",{yieldSatisfied:false})])).toEqual([]);
    expect(controller.resolve(.25,[request("p","walk")])).toEqual(["p"]);expect(controller.resolve(.25,[request("v")])).toEqual([]);
    clear(controller,"p");expect(controller.resolve(.25,[request("v")])).toEqual(["v"]);expect(new SignalController(network.junctions).snapshot()).toEqual([]);
  });
  it("ages eligible lower-priority actors so repeated fresh priority requests do not starve them",()=>{
    const controller=new JunctionReservations(network);let served=false;
    for(let tick=0;tick<20;tick++){const result=controller.resolve(.25,[request(`priority${tick}`),request("waiting","stop")]);expect(result).toHaveLength(1);if(result[0]==="waiting")served=true;clear(controller,result[0]!);if(served)break;}expect(served).toBe(true);
  });
  it("rejects malformed or duplicate requests and a changing tick duration",()=>{
    const controller=new JunctionReservations(network);controller.resolve(.25,[]);
    expect(()=>controller.resolve(.25,[request("a"),request("a")])).toThrow(/duplicated/);
    expect(()=>controller.resolve(.25,[request("a","absent")])).toThrow(/entry absent/);
    expect(()=>controller.resolve(.25,[request("a","stop",{stoppedSeconds:NaN})])).toThrow(/measured stopped/);
    expect(controller.snapshot()).toEqual([]);expect(()=>controller.resolve(.1,[])).toThrow(/step changed/);
  });
});
