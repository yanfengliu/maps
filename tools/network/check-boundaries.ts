/** harness: complete data:network graph, generated fleet bounds and public boundary lifecycle. This is not a swept-turn or motion/visual test. */
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import type {NetworkData,NetworkEdge} from "../../src/world/network-data.ts";
import type {VehicleAssetManifest} from "../../src/world/agent-assets.ts";
import type {AgentPoseBuffers} from "../../src/world/agent-poses.ts";
import {JunctionAdmissions,type AdmissionRequest} from "../../src/network/admissions.ts";
import {createRoutePassage,createBoundaryEntryPassage,type ActorKind} from "../../src/network/passages.ts";
import {footprintOccupies,projectVehicleFootprint,vehicleEnvelope,type ActorFootprint} from "../../src/network/footprints.ts";
import {boundaryProfile} from "../../src/network/boundaries.ts";
import {sampleEdge,headingAt} from "../../src/network/geometry.ts";
import {AOI_BOUNDS_WGS84,AOI_ORIGIN_EPSG6677} from "../../src/world/aoi.ts";
import {geographicToPlaneRectangular} from "../geo/plane-rectangular.ts";
import {planeRectangularToWorld} from "../../src/world/frame.ts";

const bytes=await readFile("data/network/network.json"),network=JSON.parse(bytes.toString()) as NetworkData;
const assetBytes=await readFile("data/scene/agents/vehicles.json"),assets=JSON.parse(assetBytes.toString()) as VehicleAssetManifest,dt=1/60;
const bounds=AOI_BOUNDS_WGS84,canonical=[[bounds.south,bounds.west],[bounds.south,bounds.east],[bounds.north,bounds.east],[bounds.north,bounds.west]].map(([lat,lon])=>planeRectangularToWorld({...geographicToPlaneRectangular(lat!,lon!),height:0},AOI_ORIGIN_EPSG6677));
assert.deepEqual(network.boundary.polygon,canonical.map(p=>({x:p.x,y:p.y,z:p.z})),"Retirement must use the canonical geographic AOI projected into the world frame.");
const nodeBoundary=new Set(network.nodes.filter(n=>n.boundary).map(n=>n.id));
const results:{kind:ActorKind;id:string;variant:string;initiallyControlled:boolean;leaseAtTerminus:boolean;retired:boolean}[]=[],entryResults:{kind:ActorKind;id:string;variant:string;required:string[];activated:boolean}[]=[],excludedEntries:string[]=[];
function poses():AgentPoseBuffers{const make=()=>({position:new Float32Array(3),yaw:new Float32Array(1),supportNormal:new Float32Array([0,1,0]),travelledMetres:new Float64Array(1),generation:new Uint32Array([1]),wheelOffsets:new Float32Array(4)});return{count:1,previous:make(),current:make(),active:new Uint8Array(1),speedMps:new Float32Array(1),scale:new Float32Array([1]),variant:new Uint8Array(1)};}
function put(p:AgentPoseBuffers,f:ActorFootprint){const origin=f.origin??f.position;p.current.position.set([origin.x,origin.y,origin.z]);p.current.yaw[0]=f.headingRadians;p.current.supportNormal.set(f.supportNormal?[f.supportNormal.x,f.supportNormal.y,f.supportNormal.z]:[0,1,0]);}
function makeFootprint(kind:ActorKind,variant:number,edge:NetworkEdge,s:number,tilted=false):ActorFootprint{const origin=sampleEdge(edge,s),yaw=headingAt(edge,s);return kind==="vehicle"?projectVehicleFootprint(assets.vehicles[variant]!,origin,yaw,tilted?{x:.2,y:Math.sqrt(.92),z:.2}:{x:0,y:1,z:0}):{position:origin,headingRadians:yaw,lengthM:.45,widthM:.5};}
function routeToExit(start:string,byId:Map<string,NetworkEdge>,exits:Set<string>):string[]|null{const queue=[start],previous=new Map<string,string|null>([[start,null]]);let end:string|undefined;for(let i=0;i<queue.length;i++){const id=queue[i]!;if(exits.has(id)){end=id;break;}for(const next of byId.get(id)!.nextIds)if(!previous.has(next)){previous.set(next,id);queue.push(next);}}if(!end)return null;const route:string[]=[];for(let id:string|null=end;id;id=previous.get(id)!)route.push(id);return route.reverse();}
function prefixFromControl(exit:string,byId:Map<string,NetworkEdge>,previous:Map<string,string[]>):string[]{const queue=[exit],toward=new Map<string,string|null>([[exit,null]]);let start=exit;for(let i=0;i<queue.length;i++){const id=queue[i]!;if(byId.get(id)!.junctionId){start=id;break;}for(const prev of previous.get(id)??[])if(!toward.has(prev)){toward.set(prev,id);queue.push(prev);}}const route:string[]=[];for(let id:string|null=start;id;id=toward.get(id)!)route.push(id);return route;}
function request(actorId:string,p:ReturnType<typeof createRoutePassage>,index:number,footprint:ActorFootprint):AdmissionRequest{return{actorId,kind:p.kind,passage:p,entryEdgeId:p.edges[index]!.id,routeIndex:index,footprint,stoppedSeconds:1,yieldSatisfied:true,receivingSpace:true};}
let delayedSignalChecked=false;
const entryTransitions:{entry:string;variant:string;initialOwner:string;physicalOnly:boolean;released:boolean;retired:boolean;nextAdmitted:string|null;samples:number}[]=[];
for(const kind of ["vehicle","pedestrian"] as const){
  const edges=kind==="vehicle"?network.lanes:network.walks,byId=new Map<string,NetworkEdge>(edges.map(e=>[e.id,e])),exits=new Set(edges.filter(e=>nodeBoundary.has(e.to)).map(e=>e.id)),entries=kind==="vehicle"?network.portals.vehicleEntry:network.portals.pedestrian,previous=new Map<string,string[]>();
  for(const e of edges)for(const next of e.nextIds){const ids=previous.get(next)??[];ids.push(e.id);previous.set(next,ids);}
  assert.equal(exits.size,kind==="vehicle"?77:33);
  for(const exit of exits)for(let variant=0;variant<(kind==="vehicle"?3:1);variant++){
    const ids=prefixFromControl(exit,byId,previous),route=ids.map(id=>byId.get(id)!),c=new JunctionAdmissions(network),buffer=poses(),actorId=`${kind}:${exit}:${variant}`,binding=c.bindBoundaryActor(actorId,kind,0,buffer,ids),entryIndex=route.findIndex(e=>e.junctionId),p=entryIndex>=0?createRoutePassage(network,kind,ids,entryIndex):null;
    buffer.variant[0]=variant;
    if(p){let admitted=false;const f=makeFootprint(kind,variant,route[entryIndex]!,0,true);for(let tick=0;tick<180*60&&!admitted;tick++)admitted=c.resolve(dt,[request(actorId,p,entryIndex,f)]).includes(actorId);assert(admitted,`No finite grant for exit trace ${actorId}`);}
    // This is an already admitted interior seed, not a boundary-spawn operation.
    buffer.active[0]=1;
    for(let index=0;index<route.length;index++){const edge=route[index]!;
      if(p?.controls.some(control=>control.routeIndex===index))assert(c.resolve(dt,[request(actorId,p,index,makeFootprint(kind,variant,edge,0,true))]).includes(actorId));
      for(let s=0;s<edge.lengthM;s+=.5){const footprint=makeFootprint(kind,variant,edge,s,true);put(buffer,footprint);if(p)c.observe(actorId,{routeIndex:index,distanceM:s,footprint});c.resolve(dt,[]);}
      const footprint=makeFootprint(kind,variant,edge,edge.lengthM,true);put(buffer,footprint);if(p)c.observe(actorId,{routeIndex:index,distanceM:edge.lengthM,footprint});
    }
    const last=route.at(-1)!,profile=boundaryProfile(network,kind,last)!,terminal=makeFootprint(kind,variant,last,last.lengthM,true),observation={routeIndex:route.length-1,distanceM:last.lengthM,footprint:terminal};put(buffer,terminal);
    const leaseAtTerminus=c.snapshot().some(s=>s.actorId===actorId),before=JSON.stringify(c.snapshot());assert.throws(()=>c.retireBoundary(binding,observation),/inside the AOI/);assert.equal(buffer.active[0],1);assert.equal(JSON.stringify(c.snapshot()),before);
    let retired=false;for(let out=.25;out<=7.5&&!retired;out+=.25){const origin={x:profile.position.x+profile.outward.x*out,y:profile.position.y,z:profile.position.z+profile.outward.z*out},footprint=kind==="vehicle"?projectVehicleFootprint(assets.vehicles[variant]!,origin,terminal.headingRadians,terminal.supportNormal!):{...terminal,position:origin};put(buffer,footprint);const o={...observation,footprint};if(c.observeBoundaryEgress(binding,o)){c.retireBoundary(binding,o);retired=true;}}
    assert(retired,`No bounded full-body retirement for ${actorId}`);assert.equal(buffer.active[0],0);assert(!c.snapshot().some(s=>s.actorId===actorId));
    if(exit.includes("172125348")&&kind==="vehicle"&&!delayedSignalChecked){for(let tick=0;tick<360*60;tick++)c.resolve(dt,[]);assert(c.signalSnapshot().every(s=>s.cycle>=3&&!s.clearanceHeld));delayedSignalChecked=true;}
    results.push({kind,id:exit,variant:kind==="vehicle"?assets.vehicles[variant]!.id:"pedestrian",initiallyControlled:last.junctionId!==null,leaseAtTerminus,retired});
  }
  for(const entry of entries){const ids=routeToExit(entry,byId,exits);if(!ids){assert(kind==="vehicle"&&network.diagnostics.vehicleEntriesWithoutExit.includes(entry),`New unreachable boundary ${entry}`);excludedEntries.push(entry);continue;}
    for(let variant=0;variant<(kind==="vehicle"?3:1);variant++){
      const first=byId.get(entry)!,c=new JunctionAdmissions(network),buffer=poses(),actorId=`spawn:${kind}:${entry}:${variant}`,binding=c.bindBoundaryActor(actorId,kind,0,buffer,ids),footprint=makeFootprint(kind,variant,first,0,true);put(buffer,footprint);
      buffer.variant[0]=variant;
      const required=network.junctions.filter(j=>kind==="vehicle"?footprintOccupies(j,footprint):j.id===first.junctionId).map(j=>j.id);
      const entryPassage=required.length?createBoundaryEntryPassage(network,kind,ids,footprint):null;
      if(required.length){assert.equal(required.length,1,`Boundary ${entry} spans independent controllers before materialization`);assert.throws(()=>c.activateBoundary(binding,footprint),/admission/);assert.equal(buffer.active[0],0);const p=entryPassage!;let admitted=false;for(let tick=0;tick<180*60&&!admitted;tick++)admitted=c.resolve(dt,[request(actorId,p,0,footprint)]).includes(actorId);assert(admitted);}
      c.activateBoundary(binding,footprint);assert.equal(buffer.active[0],1);if(required.length)assert(c.occupied(required[0]!));entryResults.push({kind,id:entry,variant:kind==="vehicle"?assets.vehicles[variant]!.id:"pedestrian",required,activated:true});
      if(required.length){
        const p=entryPassage!,route=ids.map(id=>byId.get(id)!);let released=false,retired=false,nextAdmitted:string|null=null,samples=0,travelled=0;
        outer:for(let index=0;index<route.length;index++){
          const edge=route[index]!;
          if(p.controls.some(control=>control.routeIndex===index)&&!released)assert(c.resolve(dt,[request(actorId,p,index,makeFootprint(kind,variant,edge,0,true))]).includes(actorId));
          for(let s=0;s<=edge.lengthM;s=Math.min(s+.25,edge.lengthM)){
            const tilt=.2*Math.cos((travelled+s)/13),body=kind==="vehicle"?projectVehicleFootprint(assets.vehicles[variant]!,sampleEdge(edge,s),headingAt(edge,s),{x:tilt,y:Math.sqrt(1-2*tilt*tilt),z:tilt}):makeFootprint(kind,variant,edge,s);put(buffer,body);samples++;
            const touching=network.junctions.filter(j=>kind==="vehicle"?footprintOccupies(j,body):edge.junctionId===j.id).map(j=>j.id);
            if(!released){assert(touching.every(id=>id===p.junctionId),`Initial ${entry}/${variant} body overlaps an unheld authority at ${edge.id}/${s}: ${touching}`);released=c.observe(actorId,{routeIndex:index,distanceM:s,footprint:body});}
            if(released){
              assert(!touching.length,`Prefix ${entry}/${variant} released while its body still occupied ${touching}`);
              const next=route.findIndex((e,i)=>i>=index&&e.junctionId!==null);
              if(next>=0){const ordinary=createRoutePassage(network,kind,ids,next);let granted=false;for(let tick=0;tick<180*60&&!granted;tick++)granted=c.resolve(dt,[request(actorId,ordinary,next,body)]).includes(actorId);assert(granted,`No finite ordinary grant after initial tail ${entry}/${variant}`);nextAdmitted=ordinary.junctionId;
                let entered=false;
                for(let nextIndex=index;nextIndex<=next&&!entered;nextIndex++){
                  const nextEdge=route[nextIndex]!;
                  for(let distance=nextIndex===index?s:0;distance<=nextEdge.lengthM;distance=Math.min(distance+.25,nextEdge.lengthM)){
                    const arc=route.slice(0,nextIndex).reduce((sum,e)=>sum+e.lengthM,0)+distance,tilt=.2*Math.cos(arc/13),f=kind==="vehicle"?projectVehicleFootprint(assets.vehicles[variant]!,sampleEdge(nextEdge,distance),headingAt(nextEdge,distance),{x:tilt,y:Math.sqrt(1-2*tilt*tilt),z:tilt}):makeFootprint(kind,variant,nextEdge,distance),other=network.junctions.filter(j=>kind==="vehicle"?footprintOccupies(j,f):nextEdge.junctionId===j.id);assert(other.every(j=>j.id===ordinary.junctionId),`Prefix transition ${entry}/${variant} overlaps an unheld third authority at ${nextEdge.id}/${distance}`);
                    let grant=false;for(let tick=0;tick<180*60&&!grant;tick++)grant=c.resolve(dt,[request(actorId,ordinary,next,f)]).includes(actorId);assert(grant);put(buffer,f);c.observe(actorId,{routeIndex:nextIndex,distanceM:distance,footprint:f});
                    if(c.occupied(ordinary.junctionId)){entered=true;break;}if(distance===nextEdge.lengthM)break;
                  }
                }assert(entered,`Prefix transition ${entry}/${variant} did not enter its next leased authority.`);
              }
              break outer;
            }
            c.resolve(dt,[]);if(s===edge.lengthM)break;
          }travelled+=edge.lengthM;
        }
        if(!released){
          assert(p.boundaryExit,`Initial passage ${entry}/${variant} never reached release or a physical retirement boundary.`);
          const last=route.at(-1)!,profile=p.boundaryExit,origin={x:profile.position.x+profile.outward.x*7.25,y:profile.position.y,z:profile.position.z+profile.outward.z*7.25},body=kind==="vehicle"?projectVehicleFootprint(assets.vehicles[variant]!,origin,headingAt(last,last.lengthM),{x:.2,y:Math.sqrt(.92),z:.2}):{position:origin,headingRadians:headingAt(last,last.lengthM),lengthM:.45,widthM:.5};put(buffer,body);
          c.retireBoundary(binding,{routeIndex:route.length-1,distanceM:last.lengthM,footprint:body});assert.equal(buffer.active[0],0);assert(!c.occupied(p.junctionId));retired=true;
        }
        entryTransitions.push({entry,variant:kind==="vehicle"?assets.vehicles[variant]!.id:"pedestrian",initialOwner:p.junctionId,physicalOnly:p.lastConflictIndex===-1,released,retired,nextAdmitted,samples});
      }
    }
  }
}
assert(delayedSignalChecked);const sha=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex"),report={networkSha256:sha(bytes),vehicleManifestSha256:sha(assetBytes),envelopes:assets.vehicles.map(a=>({class:a.id,...vehicleEnvelope(a)})),exitCases:results.length,entryCases:entryResults.length,entryTransitions,existingExcludedEntries:excludedEntries,results,entryResults,signalAfterRetirement:{simulatedSeconds:360,minimumCycles:3,clearanceHeld:false},bounds:"All 77 vehicle exits times three actual tilted asset bodies, all 33 walking exits, 78 vehicle and 33 walking entrances. One previously documented no-U-turn dead-end entry remains excluded from demand, not removed. Synthetic outward-normal sampled positions test lifecycle only; continuous trajectories, swept turning, contact, class-width routing and population throughput are not established."};await writeFile("artifacts/network/f5-boundary-check.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({networkSha256:report.networkSha256,exitCases:results.length,entryCases:entryResults.length,entryTransitionCases:entryTransitions.length,physicalOnlyTransitions:entryTransitions.filter(t=>t.physicalOnly).length,ordinaryHandoffs:entryTransitions.filter(t=>t.nextAdmitted).length,existingExcludedEntries:excludedEntries,signalAfterRetirement:report.signalAfterRetirement},null,2));
