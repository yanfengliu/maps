/** Bound: the frozen female packet and its one 22-second local route at 60 Hz.
 * Checks source-to-mesh coordination, continuous sampled poses and exact303 physical
 * history. The separate finite support test owns contact/static-body admission.
 * Correlation and continuity do not establish natural-looking rendered motion. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Vector3} from 'three';
import {beforeAll,describe,expect,it} from 'vitest';
import {createLocalRig,type LocalRigPacket} from '../src/agents/render/local-walk-rig.js';
import {createLocalFloor,type LocalContext} from '../src/agents/population/local-walk-support.js';
import {LocalWalkGait,type LocalGaitFrame,type LocalGaitSample} from '../src/agents/population/local-walk-gait.js';
import {createOrderedFootEngine} from '../src/agents/population/local-ordered/controller.mjs';
function pinned<T>(name:string,sha:string):T{const bytes=readFileSync('artifacts/pedestrian-native253-20260928/packet/'+name);expect(createHash('sha256').update(bytes).digest('hex'),'Restore the retained native253 packet '+name).toBe(sha);return JSON.parse(bytes.toString()) as T;}
const context=pinned<LocalContext>('context.json','0339db04b4f700655bdb9b89912e06a6143bc748cc3792fed041865c8f9aadce');
const rig=createLocalRig(pinned<LocalRigPacket>('rig-near.json','88247600d41eab2d0ee83f6646a821dae72c8525345965e0836a73f54ff0a243'));
const floor=createLocalFloor(context),engine=createOrderedFootEngine(floor.normalizedFloor),joint=(name:string)=>rig.packet.jointNames.indexOf(name),up=new Vector3(0,1,0);
const below=(node:number,ancestor:number):boolean=>{let n:number|undefined=node;while(n!==undefined&&n!==ancestor)n=rig.d.parents[n];return n===ancestor;};
const groups=['hand_l','hand_r','foot_l','foot_r'].map(name=>rig.packet.source.vertices.filter(v=>v.influences.reduce((sum,t)=>sum+(below(t.joint,joint(name))?t.weight:0),0)>=.95));
const oldClock=process.env.MAPS_PHASE_317_OLD_CLOCK==='1';
function pose(sample:LocalGaitSample){const gait=oldClock?{...sample.gait,walkPhase:undefined}:sample.gait;const p=engine.scenePose(rig.d,rig.source,gait,sample.input);if(!p.valid||!p.mats||!p.point)throw Error('Finite actual female pose failed');return p as Required<typeof p>;}
const range=(v:number[])=>Math.max(...v)-Math.min(...v);
function correlation(a:number[],b:number[]){const ma=a.reduce((s,v)=>s+v,0)/a.length,mb=b.reduce((s,v)=>s+v,0)/b.length;return a.reduce((s,v,i)=>s+(v-ma)*(b[i]!-mb),0)/Math.sqrt(a.reduce((s,v)=>s+(v-ma)**2,0)*b.reduce((s,v)=>s+(v-mb)**2,0));}
type Row={time:number;H:number;F:number;meshH:number;meshF:number;leftZ:number;rightZ:number;phase:number};
const rows:Row[]=[],frames:LocalGaitFrame[]=[],windows=[ [.6,1.3],[.6,4.3],[3.3,4.3],[6.6,7.6],[20,21.6] ];
let physicalDigest='',maximumPhaseStep=0,maximumHandStepM=0,maximumBoundaryHandM=0;
beforeAll(()=>{
 const owner=new LocalWalkGait(context.legs,{generation:1,scale:context.scale,cruiseMps:1.1*context.scale,accelerationMps2:1.1*context.scale/.4,turnRateRadps:Math.PI/2,origin:context.origin,floorY:(x,z)=>floor.floorAt(x,z).y},engine,rig.d),physical=createHash('sha256');
 for(let tick=1;tick<=1320;tick++){
  const frame=owner.advance(1/60,{occupancy:{tick,otherActors:[]},foot:p=>({ok:true,sourceSurface:p.sourceSurface,landingSurface:p.landingSurface,evidence:{kind:'baseline physical history'}}),interval:()=>({ok:true})});if(frame.refused)throw Error(frame.refused);frames.push(frame);
  const s=frame.current,{walkPhase,walkPhaseFlight,...gait}=s.gait;void walkPhaseFlight;physical.update(JSON.stringify({root:s.root,gait}));
  const p=pose(s),m=p.mats,scale=context.scale,centroids=groups.map(group=>group.reduce((sum,v)=>sum+p.point(v).sub(new Vector3(...s.input.body)).applyAxisAngle(up,-s.input.yaw).z*scale,0)/group.length),leftZ=m[joint('hand_l')]!.elements[14]!*scale,rightZ=m[joint('hand_r')]!.elements[14]!*scale;
  rows.push({time:s.input.time,H:leftZ-rightZ,F:(m[joint('foot_l')]!.elements[14]!-m[joint('foot_r')]!.elements[14]!)*scale,meshH:centroids[0]!-centroids[1]!,meshF:centroids[2]!-centroids[3]!,leftZ,rightZ,phase:walkPhase});
  const delta=walkPhase-frame.previous.gait.walkPhase;if(delta<0)throw Error('Walk phase ran backward');maximumPhaseStep=Math.max(maximumPhaseStep,delta);
  const previous=pose(frame.previous),nearPrevious=pose(frame.sample(1e-6,1)),nearCurrent=pose(frame.sample(1-1e-6,1));
  for(const name of ['hand_l','hand_r']){const id=joint(name),point=(q:ReturnType<typeof pose>)=>new Vector3().setFromMatrixPosition(q.mats[id]!).multiplyScalar(scale);maximumHandStepM=Math.max(maximumHandStepM,point(p).distanceTo(point(previous)));maximumBoundaryHandM=Math.max(maximumBoundaryHandM,point(nearPrevious).distanceTo(point(previous)),point(nearCurrent).distanceTo(point(p)));}
 }
 physicalDigest=physical.digest('hex');
 if(process.env.MAPS_PHASE_317_RECEIPT)writeFileSync(process.env.MAPS_PHASE_317_RECEIPT,JSON.stringify({oldClock,ticks:rows.length,physicalDigest,groupCounts:groups.map(g=>g.length),maximumPhaseStep,maximumHandStepM,maximumBoundaryHandM,windows:windows.map(([from,to])=>{const set=rows.filter(r=>r.time>=from!-1e-10&&r.time<=to!+1e-10);return{from,to,samples:set.length,jointCorrelation:correlation(set.map(r=>r.H),set.map(r=>r.F)),meshCorrelation:correlation(set.map(r=>r.meshH),set.map(r=>r.meshF))};}),rows},null,2));
},60000);
describe('actual foot-linked upper-body source phase',()=>{
 it('opposes actual feet in the frozen near, end, turn-resume and held-out medium windows',()=>{
  const source=Array.from({length:32},(_,i)=>rig.source.worldsAt('walk',i/32).worlds),h=source.map(m=>m[joint('hand_l')]!.elements[14]!-m[joint('hand_r')]!.elements[14]!),f=source.map(m=>m[joint('foot_l')]!.elements[14]!-m[joint('foot_r')]!.elements[14]!);
  expect(correlation(h,f)).toBeLessThan(-.99);expect(f[0]).toBeGreaterThan(.5);expect(f[16]).toBeLessThan(-.5);
  for(const [from,to] of windows){const set=rows.filter(r=>r.time>=from!-1e-10&&r.time<=to!+1e-10);expect(set.length).toBeGreaterThan(40);expect(correlation(set.map(r=>r.H),set.map(r=>r.F)),`joint opposition ${from}–${to}s`).toBeLessThan(-.95);expect(correlation(set.map(r=>r.meshH),set.map(r=>r.meshF)),`actual mesh opposition ${from}–${to}s`).toBeLessThan(-.95);}
 });
 it('preserves every303 root and controller-history field outside the two new phase fields',()=>{
  // Captured before the phase change from the actual303 engine, with the pinned
  // source packet and exact callback evidence above. Not derived from the fix.
  expect(physicalDigest).toBe('febdf9a2bfc7902a7a43fb89e92bfae7e29b45c52a1a215245d77e72c9a13d59');
 });
 it('keeps source swing amplitude and continuous poses through start, departures, landings and turn resumption',()=>{
  const cruise=rows.filter(r=>r.time>=.6&&r.time<=4.3);
  for(const [name,key] of [['hand_l','leftZ'],['hand_r','rightZ']] as const){const original=Array.from({length:32},(_,i)=>rig.source.worldsAt('walk',i/32).worlds[joint(name)]!.elements[14]!*context.scale);expect(range(cruise.map(r=>r[key]))).toBeCloseTo(range(original),4);}
  expect(maximumPhaseStep).toBeLessThan(.06);expect(maximumHandStepM).toBeLessThan(.06);expect(maximumBoundaryHandM).toBeLessThan(1e-6);
  expect(frames.some(f=>f.current.input.turn)).toBe(true);expect(frames.filter(f=>f.previous.input.speed===0&&f.current.input.speed>0)).toHaveLength(5);
 });
});
