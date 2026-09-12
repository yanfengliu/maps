/** harness: data:network's full-source graph and data:agents' measured collision envelopes; no browser or actor renderer is used. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { NetworkData, NetworkEdge } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import { JunctionAdmissions, type AdmissionRequest } from "../../src/network/admissions.ts";
import { createRoutePassage } from "../../src/network/passages.ts";
import { vehicleEnvelope } from "../../src/network/footprints.ts";
import { headingAt, occupiesJunction, sampleEdge } from "../../src/network/geometry.ts";

const root=resolve(import.meta.dirname,"../.."),bytes=await readFile(resolve(root,"data/network/network.json")),data=JSON.parse(bytes.toString()) as NetworkData;
const assetBytes=await readFile(resolve(root,"data/scene/agents/vehicles.json")),assets=JSON.parse(assetBytes.toString("utf8")) as VehicleAssetManifest;
const sizes=assets.vehicles.map(v=>({id:v.id,lengthM:v.collision.length,widthM:v.collision.width}));
assert.deepEqual(sizes.map(v=>v.id),["kei","taxi","bus"],"Check all three generated classes, not an empty/subset manifest.");
const largestDiagonal=Math.max(...assets.vehicles.map(v=>vehicleEnvelope(v).diameter));
assert(largestDiagonal<=data.admissionBounds.maxFootprintDiagonalM,"Actual generated collision bodies exceed the reviewed network support bound.");

// Independent of groupCompounds/authorityTransitions: walk legal graph paths and
// compare the raw disk centres/radii directly against actual asset diagonals.
const junctions=new Map(data.junctions.map(j=>[j.id,j]));
const census:{kind:string;transitions:number;minimumRouteGapM:number;minimumPrimitiveSeparationM:number}[]=[];
for(const[kind,list]of [["vehicle",data.lanes],["pedestrian",data.walks]] as const){
  const byId=new Map<string,NetworkEdge>(list.map(e=>[e.id,e])),pairs=new Map<string,{from:string;to:string;gap:number}>();
  for(const initial of list){if(!initial.junctionId)continue;const frontier=initial.nextIds.map(id=>({id,distance:0})),best=new Map<string,number>();
    for(let cursor=0;cursor<frontier.length;cursor++){const item=frontier[cursor]!,edge=byId.get(item.id)!;
      if(edge.junctionId){if(edge.junctionId!==initial.junctionId){const key=`${initial.junctionId}>${edge.junctionId}`,previous=pairs.get(key);if(!previous||item.distance<previous.gap)pairs.set(key,{from:initial.junctionId,to:edge.junctionId,gap:item.distance});}continue;}
      if((best.get(edge.id)??Infinity)<=item.distance)continue;best.set(edge.id,item.distance);for(const id of edge.nextIds)frontier.push({id,distance:item.distance+edge.lengthM});
    }
  }
  let minimumRouteGapM=Infinity,minimumPrimitiveSeparationM=Infinity;
  for(const pair of pairs.values()){const a=junctions.get(pair.from)!,b=junctions.get(pair.to)!;let separation=Infinity;
    for(const x of a.conflictAreas??[a])for(const y of b.conflictAreas??[b])separation=Math.min(separation,Math.sqrt((x.position.x-y.position.x)**2+(x.position.z-y.position.z)**2)-x.radiusM-y.radiusM);
    assert(separation>=largestDiagonal+data.admissionBounds.stopGapM,`${kind} ${pair.from}->${pair.to} cannot contain the actual largest body plus stop gap.`);
    assert(pair.gap>=data.admissionBounds.routeGroupingGapM-1e-6,`${kind} short route gap escaped compound grouping.`);
    minimumRouteGapM=Math.min(minimumRouteGapM,pair.gap);minimumPrimitiveSeparationM=Math.min(minimumPrimitiveSeparationM,separation);
  }
  assert(pairs.size>10,`${kind} census must cover the whole populated graph.`);census.push({kind,transitions:pairs.size,minimumRouteGapM,minimumPrimitiveSeparationM});
}

const edges=new Map(data.lanes.map(e=>[e.id,e])),exits=new Set(data.portals.vehicleExit),dt=1/60;
const seeds=["lane:46770374:1:0:ground0:f:0:section0","lane:87250220:0:0:ground0:f:0:section0","lane:87250220:0:0:ground0:r:0:section0","lane:1377702569:0:0:ground0:f:0:section0","lane:1377702569:0:0:ground0:r:0:section0"];
function routeToExit(start:string):string[]{const queue=[start],previous=new Map<string,string|null>([[start,null]]);let end:string|undefined;for(let cursor=0;cursor<queue.length;cursor++){const id=queue[cursor]!;if(exits.has(id)){end=id;break;}for(const next of edges.get(id)!.nextIds)if(!previous.has(next)){previous.set(next,id);queue.push(next);}}assert(end,`Named source entry ${start} lost its AOI exit.`);const route:string[]=[];for(let id:string|null=end;id;id=previous.get(id)!)route.push(id);return route.reverse();}
const traces=[];
for(const seed of seeds)for(const size of sizes){
  const passage=createRoutePassage(data,"vehicle",routeToExit(seed),0),admissions=new JunctionAdmissions(data),actorId=`${size.id}:${seed}`;
  const observation=(index:number,s:number)=>({routeIndex:index,distanceM:s,footprint:{position:sampleEdge(passage.edges[index]!,s),headingRadians:headingAt(passage.edges[index]!,s),lengthM:size.lengthM,widthM:size.widthM}});
  const request=(index:number):AdmissionRequest=>({actorId,kind:"vehicle",passage,entryEdgeId:passage.edges[index]!.id,routeIndex:index,footprint:observation(index,0).footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true});
  let granted=false;for(let tick=0;tick<180*60&&!granted;tick++)granted=admissions.resolve(dt,[request(0)]).includes(actorId);assert(granted,`No finite admission for ${actorId}.`);
  let released=false,heldGapSamples=0,physicalGapSamples=0;
  for(let index=0;index<=passage.lastConflictIndex+1&&!released;index++){const edge=passage.edges[index]!;
    if(passage.controls.some(c=>c.routeIndex===index))assert(admissions.resolve(dt,[request(index)]).includes(actorId),`Internal mapped control lost ${actorId}.`);
    for(let s=0;s<=edge.lengthM;s+=.25){const o=observation(index,s);admissions.resolve(dt,[]);released=admissions.observe(actorId,o);if(index>0&&index<passage.lastConflictIndex&&!edge.junctionId){heldGapSamples++;if(!occupiesJunction(junctions.get(passage.junctionId)!,o.footprint.position,o.footprint.headingRadians,size.lengthM,size.widthM))physicalGapSamples++;assert(!released&&admissions.occupied(passage.junctionId),`Early gap release for ${actorId}.`);}if(released)break;}
    if(!released)released=admissions.observe(actorId,observation(index,edge.lengthM));
  }
  assert(heldGapSamples>0&&released,`Trace did not exercise both an internal gap and final full-tail release: ${actorId}.`);traces.push({seed,class:size.id,compound:passage.junctionId,lastConflictIndex:passage.lastConflictIndex,heldGapSamples,physicalGapSamples,released});
}

function timeline(){const c=new JunctionAdmissions(data);let firstPedestrian:number|undefined,firstCycle:number|undefined;for(let tick=1;tick<=360*60;tick++){c.resolve(dt,[]);const scramble=c.signalSnapshot().find(s=>s.junctionId==="scramble")!;if(scramble.stage==="pedestrian"&&firstPedestrian===undefined)firstPedestrian=tick/60;if(scramble.cycle>0&&firstCycle===undefined)firstCycle=tick/60;}const states=c.signalSnapshot();assert(states.length>20&&states.every(s=>s.cycle>=3));assert.equal(firstPedestrian,88);assert.equal(firstCycle,116);return{simulatedSeconds:360,stepSeconds:dt,signals:states.length,minimumCycles:Math.min(...states.map(s=>s.cycle)),firstPedestrian,firstCycle};}
function delayedTimeline(){
  const seed=seeds[4]!,size=sizes[0]!,p=createRoutePassage(data,"vehicle",routeToExit(seed),0),c=new JunctionAdmissions(data),owner=junctions.get(p.junctionId)!;
  assert.equal(owner.controlKind,"signal");
  const at=(index:number,s:number)=>({routeIndex:index,distanceM:s,footprint:{position:sampleEdge(p.edges[index]!,s),headingRadians:headingAt(p.edges[index]!,s),lengthM:size.lengthM,widthM:size.widthM}});
  const request=(index:number):AdmissionRequest=>({actorId:"delayed",kind:"vehicle",passage:p,entryEdgeId:p.edges[index]!.id,routeIndex:index,footprint:at(index,0).footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true});
  let admitted=false;for(let tick=0;tick<180*60&&!admitted;tick++)admitted=c.resolve(dt,[request(0)]).includes("delayed");assert(admitted);
  let gap:{routeIndex:number;distanceM:number}|undefined;
  for(let index=0;index<p.lastConflictIndex&&!gap;index++){
    const edge=p.edges[index]!;if(p.controls.some(control=>control.routeIndex===index))assert(c.resolve(dt,[request(index)]).includes("delayed"));
    for(let s=0;s<edge.lengthM;s+=.25){const observation=at(index,s);assert(!c.observe("delayed",observation));if(index>0&&!edge.junctionId&&!occupiesJunction(owner,observation.footprint.position,observation.footprint.headingRadians,size.lengthM,size.widthM)){gap={routeIndex:index,distanceM:s};break;}}
  }
  assert(gap,"The full-source delayed case must actually reach a physically empty internal gap.");
  const before=c.signalSnapshot().find(s=>s.junctionId===p.junctionId)!;
  for(let tick=0;tick<40*60;tick++){c.resolve(dt,[]);assert(c.occupied(p.junctionId));}
  const held=c.signalSnapshot().find(s=>s.junctionId===p.junctionId)!;assert(held.clearanceHeld);assert.equal(held.cycle,before.cycle);
  let released=false;for(let index=gap.routeIndex;index<=p.lastConflictIndex+1&&!released;index++){
    const edge=p.edges[index]!;if(p.controls.some(control=>control.routeIndex===index))assert(c.resolve(dt,[request(index)]).includes("delayed"));
    for(let s=index===gap.routeIndex?gap.distanceM:0;s<edge.lengthM;s+=.25){c.resolve(dt,[]);released=c.observe("delayed",at(index,s));if(released)break;}
    if(!released)released=c.observe("delayed",at(index,edge.lengthM));
  }
  assert(released);for(let tick=0;tick<360*60;tick++)c.resolve(dt,[]);const states=c.signalSnapshot();assert(states.every(s=>s.cycle>=3));
  return{seed,class:size.id,compound:p.junctionId,physicalGap:gap,holdSeconds:40,clearanceHeld:held.clearanceHeld,heldCycle:held.cycle,released,secondsAfterRelease:360,minimumCycles:Math.min(...states.map(s=>s.cycle))};
}
const report={networkSha256:createHash("sha256").update(bytes).digest("hex"),vehicleManifestSha256:createHash("sha256").update(assetBytes).digest("hex"),bounds:data.admissionBounds,actualCollisionSizes:sizes,largestActualDiagonalM:largestDiagonal,independentGapCensus:census,traces,emptyTimeline:timeline(),delayedTimeline:delayedTimeline(),limitations:"Controller clearance and admission only. These traces do not claim lane-width compatibility, vehicle dynamics, receiving-capacity implementation, traffic throughput, pedestrian avoidance or visual acceptance."};
await mkdir(resolve(root,"artifacts/network"),{recursive:true});await writeFile(resolve(root,"artifacts/network/f5-admission-check.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({networkSha256:report.networkSha256,independentGapCensus:census,actualClasses:sizes.map(s=>s.id),traceCount:traces.length,emptyTimeline:report.emptyTimeline,delayedTimeline:report.delayedTimeline},null,2));
