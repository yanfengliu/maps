/** Bounded single-actor ordered-foot lifecycle. No default population activation.
 * The injected engine is the retained ordered departure/landing mechanism.
 * One immutable sample drives geometry, occupancy and the renderer boundary.
 */
export interface LocalFootEngine {
  init(rig: unknown, phase: number, input: LocalRigInput): any;
  update(state: any, input: LocalRigInput, admit: (proposal: any, draft: any, input: LocalRigInput) => any): void;
  resumeWalking(state: any): void;
}
export interface LocalRigInput {
  readonly time: number; readonly body: readonly number[]; readonly yaw: number; readonly speed: number;
  readonly physicalDistanceM: number; readonly sourceDistanceM: number;
  readonly turn?: Readonly<{ id: string; targetYaw: number }>;
  readonly bodyForecast?: (absoluteTime: number) => Readonly<{ body: readonly number[]; yaw: number }>;
}
export interface LocalWalkLeg { from: { x: number; y: number; z: number }; to: { x: number; y: number; z: number }; length: number; heading: number; sourceFrom: number; sourceTo: number; occurrence: number; edgeId: string }
export interface LocalGaitRoot {
  readonly x: number; readonly y: number; readonly z: number; readonly heading: number; readonly speedMps: number;
  readonly elapsedSeconds: number; readonly physicalTravelM: number; readonly sourceCycleM: number;
  readonly cycle: number; readonly occurrence: number; readonly localM: number; readonly edgeId: string; readonly generation: number;
}
export interface LocalGaitSample { readonly root: LocalGaitRoot; readonly gait: any; readonly input: Readonly<LocalRigInput> }
export interface LocalGaitFrame {
  readonly previous: LocalGaitSample; readonly current: LocalGaitSample;
  readonly source: "one-core-root-and-rig-owner"; readonly refused: string | null;
  readonly sample: (alpha: number, generation: number) => LocalGaitSample;
}
export interface LocalGaitAdmission {
  /** Required same-tick snapshot identity, even when its other-actor list is empty. */
  readonly occupancy: { readonly tick: number; readonly otherActors: readonly unknown[] };
  readonly foot: (proposal: any, draft: any, input: LocalRigInput) => { ok: boolean; reason?: string; sourceSurface?: string; landingSurface?: string; evidence?: unknown };
  readonly interval: (frame: LocalGaitFrame, occupancy: LocalGaitAdmission["occupancy"]) => { ok: true } | { ok: false; reason: string };
}
export interface LocalGaitOptions { generation: number; scale: number; cruiseMps: number; accelerationMps2: number; turnRateRadps: number; origin: { x: number; y: number; z: number }; floorY: (x: number,z: number) => number }
const angle=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const freeze=(x:any):any=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
interface EventHistory { readonly previous:EventHistory|null; readonly events:readonly unknown[]; readonly length:number }
const emptyHistory:EventHistory=Object.freeze({previous:null,events:Object.freeze([]),length:0});
const motionByGait=new WeakMap<object,any>(),historyByGait=new WeakMap<object,EventHistory>();
function appendHistory(previous:EventHistory,events:unknown[]):EventHistory {
  if(!events.length)return previous;
  const owned=freeze(structuredClone(events));
  return Object.freeze({previous,events:owned,length:previous.length+owned.length});
}
function historyEvents(history:EventHistory):unknown[] {
  const events=new Array<unknown>(history.length);let at=history.length;
  for(let cursor:EventHistory|null=history;cursor;cursor=cursor.previous){at-=cursor.events.length;for(let i=0;i<cursor.events.length;i++)events[at+i]=cursor.events[i];}
  return events;
}
/** Complete history stays available, but only an explicit diagnostic read materializes it. */
function publishGait(state:any,history:EventHistory,immutable=true):any {
  const motion={...state,events:[]},view={...motion};let events:unknown[]|undefined;
  Object.defineProperty(view,'events',{enumerable:true,configurable:!immutable,get:()=>events??=(immutable?Object.freeze(historyEvents(history)):structuredClone(historyEvents(history))) as unknown[],...(!immutable?{set:(value:unknown[])=>{events=value;}}:{})});
  motionByGait.set(view,motion);historyByGait.set(view,history);
  if(immutable){for(const value of Object.values(motion))freeze(value);Object.freeze(view);}
  return view;
}
function cloneMotion(gait:any):any{return structuredClone(motionByGait.get(gait)??gait);}
/** Reads the complete sequence length without copying its historical payload. */
export function localGaitEventCount(sample:LocalGaitSample):number{return historyByGait.get(sample.gait)?.length??sample.gait.events.length;}
function immutableInput(input:LocalRigInput):LocalRigInput {
  const forecast=input.bodyForecast;
  return freeze({...input,body:[...input.body],...(input.turn?{turn:{...input.turn}}:{}),...(forecast?{bodyForecast:(time:number)=>{const p=forecast(time);return freeze({...p,body:[...p.body]});}}:{})});
}
function valueAt(p:any,time:number){const t=Math.max(0,Math.min(time,p.deadline)-p.originTime);return p.coefficients.reduce((s:number,c:number,k:number)=>s+c*t**k,0);}
function sampleFeet(previous:any,current:any,time:number,alpha:number){const state=cloneMotion(previous);state.drop=previous.drop+(current.drop-previous.drop)*alpha;state.sourceBlend=previous.sourceBlend+(current.sourceBlend-previous.sourceBlend)*alpha;const advance=((current.sourcePhase-previous.sourcePhase)%1+1)%1;state.sourcePhase=(previous.sourcePhase+advance*alpha)%1;if(previous.walkPhase!==undefined&&current.walkPhase!==undefined)state.walkPhase=previous.walkPhase+(current.walkPhase-previous.walkPhase)*alpha;
 for(const p of current.lastIntervals??[]){if(p.kind==="departure"||time<p.trajectory.fromTime)continue;const tr=p.trajectory,f=state.feet[p.side],through=Math.min(time,tr.evaluatedThroughTime),vertical=tr.vertical.find((s:any)=>through<=s.throughTime+1e-12)??tr.vertical.at(-1);if(!vertical)continue;f.p=[valueAt(tr.x,through),valueAt(vertical,through),valueAt(tr.z,through)];f.yaw=valueAt(tr.yaw,through);if(time>=tr.flight.end){f.mode="plant";f.patch=current.feet[p.side].patch;}else f.mode="swing";}
 return state;
}
export class LocalWalkGait {
  private readonly legs:readonly LocalWalkLeg[]; private readonly options:Readonly<LocalGaitOptions>; private readonly engine:LocalFootEngine;
  private history:EventHistory=emptyHistory; private gait:any; private pose:LocalGaitRoot; private legIndex=0; private cycle=0; private clock=0; private stage:"move"|"settle"|"turn"="move"; private moveTime=0; private turnFrom=0; private turnGoal=0; private turnTime=0; private refusal:string|null=null; private tick=0;
  constructor(legs:readonly LocalWalkLeg[],options:Readonly<LocalGaitOptions>,engine:LocalFootEngine,rig:unknown){
    this.legs=freeze(structuredClone(legs));this.options=freeze({...options,origin:{...options.origin}});this.engine=engine;
    if(legs.length!==4||options.generation<1||options.scale<=0||legs.some(l=>l.length<=0))throw Error("Local gait requires the four real local legs, positive scale and one generation");
    const a=legs[0]!;this.pose=freeze({x:a.from.x,y:a.from.y,z:a.from.z,heading:a.heading,speedMps:0,elapsedSeconds:0,physicalTravelM:0,sourceCycleM:0,cycle:0,occurrence:0,localM:0,edgeId:a.edgeId,generation:options.generation});this.gait=engine.init(rig,0,this.input(this.pose));this.history=appendHistory(this.history,this.gait.events);this.gait.events=[];
  }
  private input(p:LocalGaitRoot):LocalRigInput {const o=this.options,leg=this.legs[this.legIndex]!,start=this.clock-this.moveTime,heading=p.heading+angle(p.heading,leg.heading);const bodyForecast=(time:number)=>{const v=this.profile(leg,Math.max(0,time-start)),u=v.distance/leg.length,x=leg.from.x+(leg.to.x-leg.from.x)*u,z=leg.from.z+(leg.to.z-leg.from.z)*u;return{body:[(x-o.origin.x)/o.scale,(o.floorY(x,z)-o.origin.y)/o.scale,(z-o.origin.z)/o.scale],yaw:heading}};return immutableInput({time:p.elapsedSeconds,body:[(p.x-o.origin.x)/o.scale,(p.y-o.origin.y)/o.scale,(p.z-o.origin.z)/o.scale],yaw:p.heading,speed:p.speedMps/o.scale,physicalDistanceM:p.physicalTravelM,sourceDistanceM:p.sourceCycleM,...(this.stage==="turn"?{turn:{id:`local:${this.cycle}:${this.legIndex}`,targetYaw:this.turnGoal}}:{}),...(this.stage==="move"?{bodyForecast}:{})});}
  private profile(leg:LocalWalkLeg,t:number){const a=this.options.accelerationMps2,v=Math.min(this.options.cruiseMps,Math.sqrt(a*leg.length)),ramp=v/a,cruise=(leg.length-v*v/a)/v,total=2*ramp+cruise;let distance:number,speed:number;if(t<ramp){distance=.5*a*t*t;speed=a*t;}else if(t<ramp+cruise){distance=.5*a*ramp*ramp+v*(t-ramp);speed=v;}else{const left=Math.max(0,total-t);distance=leg.length-.5*a*left*left;speed=a*left;}return{distance,speed,done:t>=total};}
  current():LocalGaitSample{return freeze({root:this.pose,gait:publishGait(structuredClone(this.gait),this.history),input:this.input(this.pose)});}
  advance(dt:number,admission:LocalGaitAdmission):LocalGaitFrame {
    if(!(dt>0&&dt<=.1)||admission.occupancy.tick!==this.tick+1)throw Error("Local gait needs a bounded fixed step and its exact next-tick occupancy snapshot");
    const before={tick:this.tick,pose:this.pose,gait:this.gait,history:this.history,refusal:this.refusal,legIndex:this.legIndex,cycle:this.cycle,clock:this.clock,stage:this.stage,moveTime:this.moveTime,turnFrom:this.turnFrom,turnGoal:this.turnGoal,turnTime:this.turnTime},previous=this.current(),old=this.pose;this.tick++;
    try {
    if(this.refusal)return Object.freeze({source:"one-core-root-and-rig-owner",previous,current:previous,refused:this.refusal,sample:()=>previous});
    this.clock+=dt;const leg=this.legs[this.legIndex]!;let next={...old,elapsedSeconds:this.clock,speedMps:0};
    if(this.stage==="move") {this.moveTime+=dt;const p=this.profile(leg,this.moveTime),u=p.distance/leg.length,x=leg.from.x+(leg.to.x-leg.from.x)*u,z=leg.from.z+(leg.to.z-leg.from.z)*u,y=this.options.floorY(x,z),source=leg.sourceFrom+(leg.sourceTo-leg.sourceFrom)*u;next={...next,x,y,z,heading:old.heading+angle(old.heading,leg.heading),speedMps:p.speed,physicalTravelM:old.physicalTravelM+Math.hypot(x-old.x,y-old.y,z-old.z),sourceCycleM:source,occurrence:leg.occurrence,edgeId:leg.edgeId,localM:leg.sourceTo===leg.sourceFrom?0:source-leg.sourceFrom,cycle:this.cycle};if(p.done)this.stage="settle";}
    else if(this.stage==="turn") {this.turnTime+=dt;const delta=this.turnGoal-this.turnFrom;next.heading=this.turnFrom+Math.sign(delta)*Math.min(Math.abs(delta),this.options.turnRateRadps*this.turnTime);}
    const draft=structuredClone(this.gait),input=this.input(next);this.engine.update(draft,input,(proposal,gait,view)=>admission.foot(proposal,publishGait(gait,appendHistory(this.history,gait.events),false),immutableInput(view)));
    const history=appendHistory(this.history,draft.events);draft.events=[];
    const current=freeze({root:freeze(next),gait:publishGait(draft,history),input}),sample=(alpha:number,generation:number):LocalGaitSample=>{if(generation!==next.generation||alpha>=1)return current;if(alpha<=0)return previous;const sourceStart=old.cycle===next.cycle?old.sourceCycleM:0,localStart=old.cycle===next.cycle&&old.occurrence===next.occurrence?old.localM:0;const root=freeze({...previous.root,x:old.x+(next.x-old.x)*alpha,y:old.y+(next.y-old.y)*alpha,z:old.z+(next.z-old.z)*alpha,heading:old.heading+angle(old.heading,next.heading)*alpha,speedMps:old.speedMps+(next.speedMps-old.speedMps)*alpha,elapsedSeconds:old.elapsedSeconds+dt*alpha,physicalTravelM:old.physicalTravelM+(next.physicalTravelM-old.physicalTravelM)*alpha,sourceCycleM:sourceStart+(next.sourceCycleM-sourceStart)*alpha,localM:localStart+(next.localM-localStart)*alpha,cycle:next.cycle,occurrence:next.occurrence,edgeId:next.edgeId});return freeze({root,gait:publishGait(sampleFeet(previous.gait,current.gait,root.elapsedSeconds,alpha),historyByGait.get(previous.gait)!),input:{...input,time:root.elapsedSeconds,body:[(root.x-this.options.origin.x)/this.options.scale,(root.y-this.options.origin.y)/this.options.scale,(root.z-this.options.origin.z)/this.options.scale],yaw:root.heading,speed:root.speedMps/this.options.scale,physicalDistanceM:root.physicalTravelM,sourceDistanceM:root.sourceCycleM}});};
    const frame:LocalGaitFrame=Object.freeze({source:"one-core-root-and-rig-owner",previous,current,refused:null,sample});
    const verdict=draft.failure?{ok:false as const,reason:JSON.stringify(draft.failure)}:admission.interval(frame,admission.occupancy);
    if(!verdict.ok){Object.assign(this,before);this.tick=before.tick+1;this.refusal=verdict.reason;return Object.freeze({...frame,current:previous,refused:this.refusal,sample:()=>previous});}
    this.pose=current.root;this.gait=structuredClone(draft);this.history=history;
    if(this.stage==="settle"&&this.gait.feet.every((f:any)=>f.mode==="plant")){this.stage="turn";this.turnFrom=next.heading;this.turnGoal=next.heading+angle(next.heading,this.legs[(this.legIndex+1)%4]!.heading);this.turnTime=0;}
    else if(this.stage==="turn"&&this.gait.turnControl?.status==="aligned"){this.engine.resumeWalking(this.gait);this.legIndex=(this.legIndex+1)%4;if(this.legIndex===0)this.cycle++;this.stage="move";this.moveTime=0;}
    return frame;
    } catch(error) { Object.assign(this,before); throw error; }
  }
}
