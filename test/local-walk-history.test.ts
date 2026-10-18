/** Bound: current-motion cloning, complete ordered event diagnostics and snapshot
 * ownership for one adapter; no native rendering or frame-rate claim. */
import {describe,it,expect,vi} from 'vitest';
import {LocalWalkGait,type LocalFootEngine,type LocalGaitAdmission,type LocalGaitFrame} from '../src/agents/population/local-walk-gait.js';
const initialCount=256;
const initialEvents=()=>Array.from({length:initialCount},(_,id)=>({id,payload:{historical:true,values:[id,id+1]}}));
function fixture(throwAt=0){
 const callerEvents=initialEvents();
 const engine:LocalFootEngine={init:()=>({feet:[{mode:'plant',p:[0,0,0]},{mode:'plant',p:[0,0,0]}],drop:0,sourceBlend:0,sourcePhase:0,walkPhase:0,events:callerEvents,failure:null,lastIntervals:[]}),
  update(state,input,admit){const draft=structuredClone(state);draft.events.push({id:initialCount+Math.round(input.time*60)-1,payload:{historical:false,values:[input.time]}});draft.walkPhase=input.time;draft.sourcePhase=input.time%1;
   admit({kind:'test-current-motion'},structuredClone(draft),input);if(Math.round(input.time*60)===throwAt)throw Error('test engine failed after proposed event');Object.assign(state,draft);},resumeWalking(){}};
 const legs=Array.from({length:4},(_,occurrence)=>({from:{x:0,y:0,z:0},to:{x:1000,y:0,z:0},length:1000,heading:Math.PI/2,sourceFrom:0,sourceTo:1000,occurrence,edgeId:'owned:'+occurrence}));
 const options={generation:1,scale:1,cruiseMps:1,accelerationMps2:2,turnRateRadps:1,origin:{x:0,y:0,z:0},floorY:()=>0};
 return {owner:new LocalWalkGait(legs,options,engine,{}),callerEvents,legs,options,engine};
}
function admission(tick:number,extra:Partial<LocalGaitAdmission>={}):LocalGaitAdmission{return {occupancy:{tick,otherActors:[]},foot:()=>({ok:true}),interval:()=>({ok:true}),...extra};}
function serializable(frame:LocalGaitFrame){return JSON.parse(JSON.stringify({previous:{root:frame.previous.root,gait:frame.previous.gait},current:{root:frame.current.root,gait:frame.current.gait},middle:{root:frame.sample(.5,1).root,gait:frame.sample(.5,1).gait}}));}
describe('complete local walker history outside motion clones',()=>{
 it('does not duplicate prior event payloads during fixed steps or interpolation',()=>{
  const {owner}=fixture(),clone=globalThis.structuredClone;let copiedHistoricalEvents=0;
  const spy=vi.spyOn(globalThis,'structuredClone').mockImplementation((value,options)=>{const events=Array.isArray(value)?value:value&&typeof value==='object'?Reflect.get(value,'events'):undefined;if(Array.isArray(events))copiedHistoricalEvents+=events.filter(event=>event?.payload?.historical===true).length;return clone(value,options);});
  try{for(let tick=1;tick<=100;tick++){const frame=owner.advance(1/60,admission(tick));expect(frame.refused).toBeNull();for(const alpha of [.1,.5,.9])frame.sample(alpha,1);}expect(copiedHistoricalEvents,'historical payloads copied by actual structuredClone calls on hot callbacks').toBe(0);}finally{spy.mockRestore();}
  expect(owner.current().gait.events.map((event:{id:number})=>event.id)).toEqual(Array.from({length:initialCount+100},(_,i)=>i));
 });
 it('retains complete diagnostics, previous interpolation history and immutable old samples',()=>{
  const {owner,callerEvents,legs,options}=fixture(),old=owner.current(),oldJSON=JSON.stringify(old.gait);callerEvents[0]!.payload.values[0]=999;legs[0]!.to.x=99;options.origin.x=99;
  const one=owner.advance(1/60,admission(1)),saved=serializable(one),middle=one.sample(.5,1);
  expect(one.current.gait.events.map((event:{id:number})=>event.id)).toEqual(Array.from({length:initialCount+1},(_,i)=>i));expect(middle.gait.events).toEqual(initialEvents());expect(one.previous.gait.events).toEqual(initialEvents());
  expect(Object.isFrozen(old.gait)).toBe(true);expect(Object.isFrozen(old.gait.events)).toBe(true);expect(Object.isFrozen(old.gait.events[0].payload.values)).toBe(true);expect(()=>old.gait.events[0].payload.values.push(99)).toThrow();
  for(let tick=2;tick<=20;tick++)owner.advance(1/60,admission(tick));expect(JSON.stringify(old.gait)).toBe(oldJSON);expect(serializable(one)).toEqual(saved);expect(structuredClone(one.current.gait)).toEqual(JSON.parse(JSON.stringify(one.current.gait)));
  expect(middle.root.x).toBe((one.previous.root.x+one.current.root.x)/2);expect(middle.input.body).toEqual([middle.root.x,middle.root.y,middle.root.z]);
 });
 it('preserves independently mutable full admission drafts and frozen owned inputs',()=>{
  const {owner}=fixture();let seen=0;
  owner.advance(1/60,admission(1,{foot:(_proposal,gait,input)=>{seen++;expect(gait.events).toHaveLength(initialCount+1);expect(Object.isFrozen(gait)).toBe(false);gait.events[0].payload.values[0]=999;gait.feet[0].p[0]=999;expect(Object.isFrozen(input)).toBe(true);expect(Object.isFrozen(input.body)).toBe(true);expect(()=>{(input.body as number[])[0]=99;}).toThrow();const forecast=input.bodyForecast!(input.time+.1);expect(Object.isFrozen(forecast.body)).toBe(true);return {ok:true};}}));
  expect(seen).toBe(1);expect(owner.current().gait.events[0].payload.values[0]).toBe(0);expect(owner.current().gait.feet[0].p[0]).toBe(0);
 });
 it('does not publish rejected events after interval refusal or an engine throw',()=>{
  const {owner}=fixture(),before=JSON.stringify(owner.current().gait),refused=owner.advance(1/60,admission(1,{interval(frame){expect(frame.current.gait.events).toHaveLength(initialCount+1);return {ok:false,reason:'test refusal after event'};}}));
  expect(refused.refused).toBe('test refusal after event');expect(JSON.stringify(owner.current().gait)).toBe(before);expect(refused.sample(.5,1)).toBe(refused.previous);expect(owner.advance(1/60,admission(2)).current.gait.events).toHaveLength(initialCount);
  const throwing=fixture(1);expect(()=>throwing.owner.advance(1/60,admission(1))).toThrow('test engine failed');expect(throwing.owner.current().gait.events).toEqual(initialEvents());throwing.engine.update=(state)=>{state.events.push({id:initialCount,payload:{historical:false,values:[1]}});};expect(throwing.owner.advance(1/60,admission(1)).current.gait.events).toHaveLength(initialCount+1);
 });
});
