import type { Junction, LaneEdge, NetworkData, NetworkEdge } from "../world/network-data.ts";
import { VEHICLE_WHEEL_OFFSET_LIMIT_METRES, type AgentPoseBuffers, type VehiclePoseSnapshot } from "../world/agent-poses.ts";
import { VEHICLE_CLASSES } from "../world/agent-assets.ts";
import { footprintOccupies, footprintRadius, validateActorFootprint, type ActorFootprint } from "./footprints.ts";
import { boundaryProfile, boundaryProgress, type BoundaryNetwork, type BoundaryProfile } from "./boundaries.ts";
import { assertRoutePassage, type ActorKind, type RouteControl, type RoutePassage } from "./passages.ts";
import { SignalController, type SignalSnapshot } from "./signals.ts";
import { assertBoundaryIngressPlan, validateIngressFootprint, ingressStopLineDistance, type BoundaryIngressPlan } from "../agents/core/ingress.ts";

export const STOP_DWELL_SECONDS=1;
export type { ActorFootprint } from "./footprints.ts";
export interface BoundaryActorBinding {readonly actorId:string;readonly kind:ActorKind;readonly slot:number;readonly generation:number}
interface BoundActor {binding:BoundaryActorBinding;poses:AgentPoseBuffers;route:NetworkEdge[];entry:BoundaryProfile|null;exit:BoundaryProfile;retired:boolean;outwardM:number;ingress:BoundaryIngressPlan|undefined;ingressDistanceM:number;ingressTick:number;ingressComplete:boolean;stoppedSeconds:number}
export interface AdmissionRequest {
  actorId:string;kind:ActorKind;entryEdgeId:string;passage:RoutePassage;routeIndex?:number;footprint:ActorFootprint;
  /** Measured continuous stop duration at the applicable mapped control. */
  stoppedSeconds:number;yieldSatisfied:boolean;receivingSpace:boolean;
}
export interface PassageObservation {routeIndex:number;distanceM:number;footprint:ActorFootprint}
export interface AdmissionSnapshot {junctionId:string;actorId:string;kind:ActorKind;entryEdgeId:string;heldSeconds:number;entered:boolean;routeIndex:number;lastConflictIndex:number}
interface Commitment extends AdmissionSnapshot {passage:RoutePassage;progressM:number;clearedControls:Set<RouteControl>}

/** One shared admission authority. Route commitments survive physical gaps, group changes and mapped internal stops. */
export class JunctionAdmissions {
  private readonly junctions:Map<string,Junction>;
  private readonly signals:SignalController;
  private readonly commitments=new Map<string,Commitment>();
  private readonly byJunction=new Map<string,Map<string,Commitment>>();
  private readonly edges:Map<string,object>;
  private readonly checkedPassages=new WeakSet<object>();
  private readonly boundaryNetwork:Partial<BoundaryNetwork>;
  private readonly boundActors=new WeakMap<BoundaryActorBinding,BoundActor>();
  private readonly boundIds=new Map<string,BoundActor>();
  private readonly boundSlots=new WeakMap<Uint8Array,Map<number,BoundActor>>();
  private readonly waits=new Map<string,{passage:RoutePassage;routeIndex:number;age:number}>();
  private fixedStep:number|null=null;
  private tick=0;
  constructor(network:Pick<NetworkData,"junctions"|"lanes"|"walks">&Partial<BoundaryNetwork>){this.junctions=new Map(network.junctions.map(j=>[j.id,j]));this.signals=new SignalController(network.junctions);this.edges=new Map([...network.lanes,...network.walks].map(e=>[e.id,e]));this.boundaryNetwork=network;}

  /** Call once per fixed tick after observing preceding positions. Signals advance before new entries resolve. */
  resolve(stepSeconds:number,requests:readonly AdmissionRequest[]):string[] {
    if(!Number.isFinite(stepSeconds)||stepSeconds<=0||stepSeconds>.25)throw new Error(`Admission step ${stepSeconds} is invalid; use a fixed step up to 0.25 seconds.`);
    if(this.fixedStep!==null&&Math.abs(this.fixedStep-stepSeconds)>1e-12)throw new Error(`Admission step changed from ${this.fixedStep} to ${stepSeconds}; call once per fixed tick.`);
    const seen=new Set<string>();
    // Validate the complete batch before advancing time or mutating commitments.
    for(const r of requests){
      if(!r.actorId||seen.has(r.actorId))throw new Error(`Admission actor ${r.actorId} is missing or duplicated in one tick.`);seen.add(r.actorId);assertRoutePassage(r.passage);
      if(!this.checkedPassages.has(r.passage)){if(r.passage.edges.some(e=>this.edges.get(e.id)!==e))throw new Error(`Actor ${r.actorId} supplied a passage from a different network snapshot.`);this.checkedPassages.add(r.passage);}
      const index=r.routeIndex??r.passage.entryIndex,edge=r.passage.edges[index];
      if(!edge||edge.id!==r.entryEdgeId||(!(r.passage.boundaryEntry&&index===r.passage.entryIndex)&&edge.junctionId!==r.passage.junctionId)||r.kind!==r.passage.kind||!this.junctions.has(r.passage.junctionId)||index<r.passage.entryIndex||index>Math.max(r.passage.entryIndex,r.passage.lastConflictIndex))throw new Error(`Admission entry ${r.entryEdgeId} does not match the actor's compound route occurrence.`);
      if(!Number.isFinite(r.stoppedSeconds)||r.stoppedSeconds<0||typeof r.yieldSatisfied!=="boolean"||typeof r.receivingSpace!=="boolean")throw new Error(`Admission actor ${r.actorId} must supply measured stopped seconds, yield and receiving-space eligibility.`);
      this.validateFootprint(r.actorId,r.footprint);const held=this.commitments.get(r.actorId);
      if(held&&held.passage!==r.passage)throw new Error(`Actor ${r.actorId} already holds another junction/passage; retain its entire route commitment until the tail clears.`);
      if(held&&index<held.routeIndex)throw new Error(`Actor ${r.actorId} requested a passed route occurrence ${index}.`);
      if(!held?.entered&&index!==r.passage.entryIndex)throw new Error(`Actor ${r.actorId} must enter its compound at the planned first occurrence ${r.passage.entryIndex}.`);
      const boundary=this.boundIds.get(r.actorId);
      if(boundary?.ingress&&!boundary.ingressComplete){
        this.validateBoundaryPresence(boundary.binding,r.footprint,held?.entered?1:0);
        this.validateIngressPose(boundary,boundary.ingressDistanceM,r.footprint);
        if(index!==0||r.passage.junctionId!==boundary.ingress.authorityId)throw new Error(`Actor ${r.actorId} ingress request must retain its certified outer authority and first route occurrence.`);
        this.validateBoundCommitment(boundary,{kind:r.kind,passage:r.passage});
      }
    }
    this.fixedStep=stepSeconds;this.tick++;for(const c of this.commitments.values())c.heldSeconds+=stepSeconds;
    this.signals.advance(stepSeconds,id=>this.occupied(id));
    // A signal grant that was never entered expires with green. It cannot become an entry on amber/red.
    for(const[id,c]of this.commitments)if(!c.entered&&this.junctions.get(c.junctionId)!.controlKind==="signal"&&!this.signals.canEnter(c.passage.entrySignalGroupId))this.remove(id);
    const queues=new Map<string,{request:AdmissionRequest;index:number;age:number;priority:number}[]>(),granted:string[]=[];
    for(const r of requests){
      const index=r.routeIndex??r.passage.entryIndex,edge=r.passage.edges[index]!,owner=this.junctions.get(r.passage.junctionId)!,held=this.commitments.get(r.actorId),control=r.passage.controls.find(c=>c.routeIndex===index&&!held?.clearedControls.has(c)&&(held?.entered||c.distanceM<1e-6));
      const rule=control?.rule??(r.kind==="pedestrian"?"yield":(edge as LaneEdge).entryRule),stopNeeded=control?.rule==="stop"||(!held&&rule==="stop"&&!r.passage.controls.length),yieldNeeded=Boolean(control)||(!held&&["stop","yield"].includes(rule)&&!r.passage.controls.length);
      const boundary=this.boundIds.get(r.actorId),ingress=boundary?.ingress&&!boundary.ingressComplete,outerOnly=ingress&&!held?.entered;
      const atIngressControl=!ingress||!control||Math.abs(ingressStopLineDistance(boundary.ingress!,r.footprint,control.distanceM)+.125)<=.125+1e-6;
      const measuredStop=!ingress||boundary.stoppedSeconds+1e-9>=STOP_DWELL_SECONDS;
      const eligible=(held?.entered||r.receivingSpace)&&(outerOnly||(!control||atIngressControl)&&(!stopNeeded||r.stoppedSeconds+1e-9>=STOP_DWELL_SECONDS&&measuredStop)&&(!yieldNeeded||r.yieldSatisfied));
      if(held){if(eligible){if(control&&!outerOnly)held.clearedControls.add(control);granted.push(r.actorId);}continue;}
      if(index!==r.passage.entryIndex)throw new Error(`Actor ${r.actorId} must enter its compound at the planned first occurrence ${r.passage.entryIndex}.`);
      const entryGroup=index===r.passage.entryIndex?r.passage.entrySignalGroupId:edge.signalGroupId;
      if(!eligible||(owner.controlKind==="signal"&&(!entryGroup||!this.signals.canEnter(entryGroup)))){this.waits.delete(r.actorId);continue;}
      const previous=this.waits.get(r.actorId),age=previous?.passage===r.passage&&previous.routeIndex===index?previous.age+stepSeconds:0;this.waits.set(r.actorId,{passage:r.passage,routeIndex:index,age});const queue=queues.get(owner.id)??[];queue.push({request:r,index,age,priority:rule==="priority"||rule==="signal"?0:rule==="yield"?1:2});queues.set(owner.id,queue);
    }
    for(const id of this.waits.keys())if(!seen.has(id))this.waits.delete(id);
    for(const[junctionId,queue]of queues){
      const owner=this.junctions.get(junctionId)!,held=[...(this.byJunction.get(junctionId)?.values()??[])];queue.sort((a,b)=>Math.floor((b.age+1e-9)/2)-Math.floor((a.age+1e-9)/2)||a.priority-b.priority||b.age-a.age||a.request.actorId.localeCompare(b.request.actorId));
      const pedestrianBatch=owner.controlKind==="signal"&&queue.every(c=>c.request.kind==="pedestrian")&&held.every(c=>c.kind==="pedestrian");if(held.length&&!pedestrianBatch)continue;
      for(const candidate of pedestrianBatch?queue:queue.slice(0,1)){const r=candidate.request,boundary=this.boundIds.get(r.actorId),outerOnly=boundary?.ingress&&!boundary.ingressComplete,c:Commitment={actorId:r.actorId,kind:r.kind,junctionId,entryEdgeId:r.entryEdgeId,heldSeconds:0,entered:false,routeIndex:r.passage.entryIndex,progressM:-Infinity,lastConflictIndex:r.passage.lastConflictIndex,passage:r.passage,clearedControls:new Set(outerOnly?[]:r.passage.controls.filter(c=>c.routeIndex===candidate.index&&c.distanceM<1e-6))};this.commitments.set(r.actorId,c);const holders=this.byJunction.get(junctionId)??new Map<string,Commitment>();holders.set(r.actorId,c);this.byJunction.set(junctionId,holders);this.waits.delete(r.actorId);granted.push(r.actorId);}
    }
    return granted.sort();
  }
  /** A gap remains occupied logically until the planned final primitive and full tail have passed. */
  observe(actorId:string,observation:PassageObservation):boolean {
    const bound=this.boundIds.get(actorId);if(bound?.ingress&&!bound.ingressComplete)throw new Error(`Actor ${actorId} must finish its certified exterior-to-portal ingress before ordinary route observation.`);
    const c=this.commitments.get(actorId);if(!c)return false;this.validateFootprint(actorId,observation.footprint);
    const {routeIndex,distanceM,footprint}=observation,edge=c.passage.edges[routeIndex];
    if(!Number.isInteger(routeIndex)||!edge||!Number.isFinite(distanceM)||distanceM<0||distanceM>edge.lengthM+1e-6)throw new Error(`Actor ${actorId} has invalid route progress ${routeIndex}/${distanceM}; report its actual route occurrence and arc distance.`);
    const progressM=c.passage.starts[routeIndex]!+distanceM;if(progressM+1e-6<c.progressM)throw new Error(`Actor ${actorId} moved backwards in its committed route; repeated edges require their later occurrence index.`);
    for(const control of c.passage.controls)if(!c.clearedControls.has(control)&&progressM+footprintRadius(footprint)>=c.passage.starts[control.routeIndex]!+control.distanceM+1e-6)throw new Error(`Actor ${actorId} reached mapped ${control.rule} node/${control.nodeIds.join(",")} without measured admission at route occurrence ${control.routeIndex}.`);
    c.progressM=progressM;c.routeIndex=routeIndex;
    const physical=footprintOccupies(this.junctions.get(c.junctionId)!,footprint),entryStart=c.passage.starts[c.passage.entryIndex]!;
    if(progressM>entryStart+1e-6||(physical&&progressM+footprintRadius(footprint)>=entryStart))c.entered=true;
    if(c.entered&&routeIndex>c.lastConflictIndex&&!physical){this.remove(actorId);return true;}return false;
  }
  release(junctionId:string,actorId:string,observation:PassageObservation):boolean {if(this.commitments.get(actorId)?.junctionId!==junctionId)return false;return this.observe(actorId,observation);}
  cancelPending(actorId:string):boolean {const c=this.commitments.get(actorId);if(!c||c.entered)return false;this.remove(actorId);this.waits.delete(actorId);return true;}
  occupied(junctionId:string):boolean {return [...(this.byJunction.get(junctionId)?.values()??[])].some(c=>c.entered);}
  signalSnapshot():SignalSnapshot[]{return this.signals.snapshot();}
  snapshot():AdmissionSnapshot[]{return [...this.commitments.values()].map(JunctionAdmissions.published).sort((a,b)=>a.junctionId.localeCompare(b.junctionId)||a.actorId.localeCompare(b.actorId));}
  /** The published shape of one commitment: exactly the fields `AdmissionSnapshot` names, in the
   * order `snapshot()` has always emitted them, so a consumer's key order and JSON do not move. */
  private static published(c:Commitment):AdmissionSnapshot{return {actorId:c.actorId,kind:c.kind,junctionId:c.junctionId,entryEdgeId:c.entryEdgeId,heldSeconds:c.heldSeconds,entered:c.entered,routeIndex:c.routeIndex,lastConflictIndex:c.lastConflictIndex};}
  /**
   * The one commitment the authority holds for `actorId`, or `null`.
   *
   * `snapshot()` answers this question too, by rebuilding and sorting every commitment the
   * authority holds. The lifecycle asks it once per slot it is about to plan and again for a slot
   * it is about to release, so that shape pays for the whole population to answer about one actor.
   * The record is the same projection, built from the same fields in the same order, so a reader
   * cannot tell which of the two it was given.
   */
  commitmentFor(actorId:string):AdmissionSnapshot|null {const c=this.commitments.get(actorId);return c?JunctionAdmissions.published(c):null;}
  /**
   * Every commitment as `snapshot()` publishes them, in the authority's own insertion order.
   *
   * The sort is part of the published list's contract. A consumer that keys by `actorId` — the
   * population builds a `Map` of lease floors and a `Set` of live actors — reads the same entries
   * and the same fields, and the `localeCompare` over every commitment buys it nothing.
   */
  heldCommitments():AdmissionSnapshot[]{const held:AdmissionSnapshot[]=[];for(const c of this.commitments.values())held.push(JunctionAdmissions.published(c));return held;}
  boundarySnapshot(){return [...this.boundIds.values()].map(s=>Object.freeze({...s.binding,phase:s.poses.active[s.binding.slot]===0?"prepared":s.ingressComplete?"route":"ingress",ingressDistanceM:s.ingressDistanceM,measuredStoppedSeconds:s.stoppedSeconds}));}
  /** Core-owned slot binding. No renderer or callback can activate or retire a commitment. */
  bindBoundaryActor(actorId:string,kind:ActorKind,slot:number,poses:AgentPoseBuffers,routeIds:readonly string[],ingress?:BoundaryIngressPlan):BoundaryActorBinding {
    if(!actorId||!["vehicle","pedestrian"].includes(kind)||!Number.isInteger(poses.count)||!Number.isInteger(slot)||slot<0||slot>=poses.count||poses.active.length!==poses.count||poses.current.position.length!==poses.count*3||poses.current.supportNormal.length!==poses.count*3||poses.current.yaw.length!==poses.count||poses.current.generation.length!==poses.count)throw new Error(`Boundary actor ${actorId} needs a valid stable slot and complete current pose buffers.`);
    if(this.boundIds.has(actorId)||this.boundSlots.get(poses.active)?.has(slot))throw new Error(`Boundary actor ${actorId} or slot ${slot} is already bound; retire that generation before reuse.`);
    const route=routeIds.map(id=>{const edge=this.edges.get(id) as NetworkEdge|undefined;if(!edge||((edge as LaneEdge).kind==="lane"||(edge as LaneEdge).kind==="turn")!==(kind==="vehicle"))throw new Error(`Boundary route ${id} is not a ${kind} edge in this network.`);return edge;});
    if(!route.length||route.some((e,i)=>i>0&&!route[i-1]!.nextIds.includes(e.id)))throw new Error(`Boundary actor ${actorId} needs its complete legal directed route.`);
    const exit=boundaryProfile(this.boundaryNetwork,kind,route.at(-1)!);if(!exit)throw new Error(`Boundary actor ${actorId} route does not end at a real AOI exit portal.`);
    if(ingress){assertBoundaryIngressPlan(ingress,this.boundaryNetwork,routeIds);if(kind!=="vehicle")throw new Error("A vehicle ingress plan cannot bind a pedestrian slot.");}
    const binding=Object.freeze({actorId,kind,slot,generation:poses.current.generation[slot]!}),state:BoundActor={binding,poses,route,entry:boundaryProfile(this.boundaryNetwork,kind,route[0]!,true),exit,retired:false,outwardM:-Infinity,ingress,ingressDistanceM:0,ingressTick:this.tick,ingressComplete:!ingress,stoppedSeconds:0};
    this.boundActors.set(binding,state);this.boundIds.set(actorId,state);const slots=this.boundSlots.get(poses.active)??new Map<number,BoundActor>();slots.set(slot,state);this.boundSlots.set(poses.active,slots);return binding;
  }
  /** All validation precedes the synchronous active-byte/commitment mutation. */
  activateBoundary(binding:BoundaryActorBinding,footprint:ActorFootprint):void {
    const state=this.validateBoundaryPresence(binding,footprint,0);if(!state.entry)throw new Error(`Boundary actor ${binding.actorId} cannot spawn at an interior route origin.`);
    const origin=footprint.origin??footprint.position;
    if(state.ingress)this.validateIngressPose(state,0,footprint);
    else if(Math.hypot(origin.x-state.entry.position.x,origin.z-state.entry.position.z)>.001)throw new Error(`Boundary actor ${binding.actorId} prepared pose is not at its actual entrance portal.`);
    // Sidewalk staging can lie inside an authored disk without entering a crossing.
    const c=this.commitments.get(binding.actorId),touching=[...this.junctions.values()].filter(j=>binding.kind==="pedestrian"?j.id===state.route[0]!.junctionId:footprintOccupies(j,footprint));
    this.validateBoundCommitment(state,c);
    if(state.ingress&&(c?.junctionId??null)!==state.ingress.authorityId)throw new Error(`Boundary actor ${binding.actorId} needs fresh admission for its complete ingress sweep before materializing.`);
    if(touching.some(j=>j.id!==c?.junctionId)||touching.length&&!c)throw new Error(`Boundary actor ${binding.actorId} needs admission for every intersected authority before materializing.`);
    if(c&&(c.entered||this.junctions.get(c.junctionId)!.controlKind==="signal"&&!this.signals.canEnter(c.passage.entrySignalGroupId)))throw new Error(`Boundary actor ${binding.actorId} has no fresh entry grant for this tick.`);
    if(c&&(touching.length||state.ingress)){c.entered=true;c.routeIndex=0;c.progressM=state.ingress?-state.ingress.lengthM:0;}
    state.ingressTick=this.tick;
    state.poses.active[binding.slot]=1;
  }
  /** One observed supported pose per fixed tick; no caller-provided sweep or
   * arbitrary callback can authorize the transition into the ordinary route. */
  observeBoundaryIngress(binding:BoundaryActorBinding,observation:{distanceM:number;footprint:ActorFootprint}):boolean {
    const state=this.validateBoundaryPresence(binding,observation.footprint,1),plan=state.ingress;
    if(!plan||state.ingressComplete)throw new Error(`Boundary actor ${binding.actorId} has no unfinished certified ingress.`);
    this.validateIngressPose(state,observation.distanceM,observation.footprint);
    const delta=observation.distanceM-state.ingressDistanceM;
    if(!this.fixedStep||this.tick!==state.ingressTick+1||delta< -1e-8||delta>plan.speedLimitMps*this.fixedStep+1e-7)throw new Error(`Boundary actor ${binding.actorId} ingress must progress monotonically once per fixed tick within its certified speed; skipped or repeated ticks cannot advance it.`);
    const c=this.commitments.get(binding.actorId);this.validateBoundCommitment(state,c);
    if(plan.authorityId&&(!c?.entered||c.junctionId!==plan.authorityId))throw new Error(`Boundary actor ${binding.actorId} lost its committed ingress authority.`);
    if(c)for(const control of c.passage.controls)if(control.routeIndex===0&&!c.clearedControls.has(control)&&ingressStopLineDistance(plan,observation.footprint,control.distanceM)>1e-6)throw new Error(`Boundary actor ${binding.actorId} passed mapped ${control.rule} node/${control.nodeIds.join(",")} during ingress without measured entry admission.`);
    const complete=observation.distanceM>=plan.lengthM-1e-8,stopped=delta<=1e-7&&state.poses.speedMps[binding.slot]!<=.01;
    // All throwing checks precede the progress and logical-occupancy writes.
    state.stoppedSeconds=stopped?state.stoppedSeconds+this.fixedStep:0;state.ingressDistanceM=observation.distanceM;state.ingressTick=this.tick;state.ingressComplete=complete;
    if(c){c.progressM=complete?0:observation.distanceM-plan.lengthM;c.routeIndex=0;}
    return complete;
  }
  /** The core supplies continuous outbound poses; this method neither moves nor turns an actor. */
  observeBoundaryEgress(binding:BoundaryActorBinding,observation:PassageObservation):boolean {
    const checked=this.validateBoundaryEgress(binding,observation);checked.state.outwardM=checked.progress.outwardM;return checked.progress.fullyOutside;
  }
  retireBoundary(binding:BoundaryActorBinding,observation:PassageObservation):void {
    const checked=this.validateBoundaryEgress(binding,observation);
    if(!checked.progress.fullyOutside)throw new Error(`Boundary actor ${binding.actorId} still has a supported body inside the AOI; reaching its route terminus is insufficient for retirement.`);
    // No callback, await or remaining validation occurs between these writes.
    checked.state.poses.active[binding.slot]=0;if(this.commitments.has(binding.actorId))this.remove(binding.actorId);
    checked.state.retired=true;this.boundIds.delete(binding.actorId);this.boundSlots.get(checked.state.poses.active)!.delete(binding.slot);
  }
  private validateBoundaryPresence(binding:BoundaryActorBinding,footprint:ActorFootprint,expectedActive:0|1):BoundActor {
    const state=this.boundActors.get(binding);
    if(!state||state.retired||state.binding!==binding||state.poses.current.generation[binding.slot]!==binding.generation||this.boundIds.get(binding.actorId)!==state||this.boundSlots.get(state.poses.active)?.get(binding.slot)!==state)throw new Error(`Boundary actor ${binding.actorId} has a stale or wrong slot/generation binding.`);
    if(state.poses.active[binding.slot]!==expectedActive)throw new Error(`Boundary actor ${binding.actorId} slot ${binding.slot} must be ${expectedActive?"active":"inactive"} before this lifecycle operation.`);
    this.validateFootprint(binding.actorId,footprint);const origin=footprint.origin??footprint.position,index=binding.slot*3,p=state.poses.current;
    if(![p.position[index],p.position[index+1],p.position[index+2],p.yaw[binding.slot],p.supportNormal[index],p.supportNormal[index+1],p.supportNormal[index+2]].every(Number.isFinite)||Math.abs(Math.hypot(p.supportNormal[index]!,p.supportNormal[index+1]!,p.supportNormal[index+2]!)-1)>.001||p.supportNormal[index+1]!<=0)throw new Error(`Boundary actor ${binding.actorId} current pose must contain finite coordinates, yaw and an upward unit support normal.`);
    if(Math.hypot(origin.x-p.position[index]!,origin.y-p.position[index+1]!,origin.z-p.position[index+2]!)>.001||Math.abs(Math.atan2(Math.sin(footprint.headingRadians-p.yaw[binding.slot]!),Math.cos(footprint.headingRadians-p.yaw[binding.slot]!)))>1e-5)throw new Error(`Boundary actor ${binding.actorId} observation does not match its core-owned current pose.`);
    if(footprint.supportNormal&&Math.hypot(footprint.supportNormal.x-p.supportNormal[index]!,footprint.supportNormal.y-p.supportNormal[index+1]!,footprint.supportNormal.z-p.supportNormal[index+2]!)>.001)throw new Error(`Boundary actor ${binding.actorId} footprint support differs from the displayed support frame.`);
    if(binding.kind==="vehicle"){
      const wheels=(p as VehiclePoseSnapshot).wheelOffsets;
      if(!footprint.hull||!footprint.vehicle||footprint.vehicle.classId!==VEHICLE_CLASSES[state.poses.variant[binding.slot]!]||!Number.isFinite(state.poses.scale[binding.slot])||Math.abs(footprint.vehicle.scale-state.poses.scale[binding.slot]!)>1e-6)throw new Error(`Boundary actor ${binding.actorId} needs its actual displayed vehicle class and scale projected from generated bounds.`);
      if(!wheels||wheels.length!==state.poses.count*4||![0,1,2,3].every(i=>Number.isFinite(wheels[binding.slot*4+i])&&Math.abs(wheels[binding.slot*4+i]!)<=Math.fround(VEHICLE_WHEEL_OFFSET_LIMIT_METRES)))throw new Error(`Boundary actor ${binding.actorId} wheel offsets exceed the supported fleet travel or are missing.`);
    }
    return state;
  }
  private validateBoundCommitment(state:BoundActor,c:Pick<Commitment,"kind"|"passage">|undefined):void {
    if(c&&(c.kind!==state.binding.kind||c.passage.routeEdgeIds.length!==state.route.length||state.route.some((e,i)=>e.id!==c.passage.routeEdgeIds[i])))throw new Error(`Boundary actor ${state.binding.actorId} commitment belongs to a different kind or complete route.`);
  }
  private validateIngressPose(state:BoundActor,distanceM:number,footprint:ActorFootprint):void {
    const expected=validateIngressFootprint(state.ingress!,distanceM,footprint),pose=state.poses.current as VehiclePoseSnapshot,slot=state.binding.slot;
    if(!pose.frontSteeringRadians||!Number.isFinite(pose.frontSteeringRadians[slot])||!Number.isFinite(state.poses.speedMps[slot])||state.poses.speedMps[slot]!<0||state.poses.speedMps[slot]!>state.ingress!.speedLimitMps+1e-6||Math.abs(pose.frontSteeringRadians[slot]!-expected.steeringRadians)>1e-6||expected.support.wheelOffsets.some((v,i)=>Math.abs(v-pose.wheelOffsets[slot*4+i]!)>1e-6))throw new Error(`Boundary actor ${state.binding.actorId} displayed steering, wheel contacts or speed differ from its certified ingress pose.`);
  }
  private validateBoundaryEgress(binding:BoundaryActorBinding,observation:PassageObservation){
    const state=this.validateBoundaryPresence(binding,observation.footprint,1),last=state.route.length-1;
    if(state.ingress&&!state.ingressComplete)throw new Error(`Boundary actor ${binding.actorId} cannot retire before finishing its certified ingress.`);
    if(observation.routeIndex!==last||!Number.isFinite(observation.distanceM)||Math.abs(observation.distanceM-state.route[last]!.lengthM)>1e-6)throw new Error(`Boundary actor ${binding.actorId} must complete its actual terminal route occurrence before egress.`);
    const c=this.commitments.get(binding.actorId);this.validateBoundCommitment(state,c);
    if(c&&(!c.entered||c.passage.controls.some(control=>!c.clearedControls.has(control))))throw new Error(`Boundary actor ${binding.actorId} must enter and satisfy every mapped control before retiring its passage.`);
    const progress=boundaryProgress(state.exit,observation.footprint);
    if(progress.outwardM+1e-6<state.outwardM)throw new Error(`Boundary actor ${binding.actorId} moved backward in its egress envelope.`);
    return{state,progress};
  }
  private remove(actorId:string):void {const c=this.commitments.get(actorId);if(!c)return;this.commitments.delete(actorId);const holders=this.byJunction.get(c.junctionId)!;holders.delete(actorId);if(!holders.size)this.byJunction.delete(c.junctionId);}
  private validateFootprint(actorId:string,footprint:ActorFootprint):void {try{validateActorFootprint(footprint);}catch(error){throw new Error(`Actor ${actorId}: ${(error as Error).message}`);}}
}
