/** Bound: one finite retained local path, actual three-LOD foot support and changed
 * walking articulation in Node. No appearance, continuous collision or new-source qualification. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createLocalRig, type LocalRigPacket } from '../src/agents/render/local-walk-rig.js';
import { createOrderedFootEngine } from '../src/agents/population/local-ordered/controller.mjs';
import { LocalWalkGait, type LocalGaitSample, type LocalGaitRoot } from '../src/agents/population/local-walk-gait.js';
import { createLocalFloor, LocalSupportAdmission, type LocalContext } from '../src/agents/population/local-walk-support.js';

const packetDirectory = resolve('artifacts/pedestrian-native253-20260928/packet');
function pinned<T>(name: string, sha: string): T {
  const bytes = readFileSync(resolve(packetDirectory, name));
  expect(createHash('sha256').update(bytes).digest('hex'), 'Restore the retained native253 packet; do not regenerate '+name).toBe(sha);
  return JSON.parse(bytes.toString()) as T;
}
const context = pinned<LocalContext>('context.json', '0339db04b4f700655bdb9b89912e06a6143bc748cc3792fed041865c8f9aadce');
const rigs = [
  ['near', '88247600d41eab2d0ee83f6646a821dae72c8525345965e0836a73f54ff0a243'],
  ['medium', 'aade34bf9005af3c3e530ab5b23d1bfd0c1df280c2b1d6520848daf084f0118f'],
  ['far', '235019d2592f9564eaf2945878426b447c30a77a8cecfc6433f2918532a62cf2'],
].map(([lod, sha]) => createLocalRig(pinned<LocalRigPacket>('rig-'+lod+'.json', sha!)));
function fixture() {
  const floor = createLocalFloor(context), engine = createOrderedFootEngine(floor.normalizedFloor);
  const owner = new LocalWalkGait(context.legs, { generation: 1, scale: context.scale, cruiseMps: 1.1*context.scale,
    accelerationMps2: 1.1*context.scale/.4, turnRateRadps: Math.PI/2, origin: context.origin,
    floorY: (x,z) => floor.floorAt(x,z).y }, engine, rigs[0]!.d);
  return { engine, owner, support: new LocalSupportAdmission(context, rigs, engine) };
}
const footAdmission = (p: any) => ({ ok: true, sourceSurface: p.sourceSurface, landingSurface: p.landingSurface,
  evidence: { kind: 'retained patches; posed interval checked by LocalSupportAdmission' } });

describe('finite retained local walking support', () => {
  it('keeps actual soles supported through all four legs, corners and walking resumption', () => {
    const { engine, owner, support } = fixture(); support.observe(owner.current(), true);
    let events = 0, ticks = 0, walkingDepartures = 0, stoppedDepartures = 0, minimumShoeBoxGap = Infinity, maximumWalkingLiftM = 0;
    const seen = new Set<number>(), recorded: { time: number; end: number; side: number; speed: number; target: number[]; height: number }[] = [];
    const roots: LocalGaitRoot[] = [], states: string[] = [];
    const stateDigest = (sample: LocalGaitSample) => createHash('sha256').update(JSON.stringify({ root:sample.root, gait:sample.gait })).digest('hex');
    const shoes = rigs[0]!.packet.shoes.map(id => rigs[0]!.byId.get(id)!);
    const checkShoes = (sample: LocalGaitSample) => {
      const pose = engine.scenePose(rigs[0]!.d, rigs[0]!.source, sample.gait, sample.input);
      expect(pose.valid).toBe(true);
      if(sample.input.speed>0) for(const f of sample.gait.feet) if(f.mode==='swing') {
        const floor= support.floor.normalizedFloor(f.p[0],f.p[2]);
        maximumWalkingLiftM=Math.max(maximumWalkingLiftM,(f.p[1]-f.ground-floor.y)*context.scale);
      }
      const boxes = [1, -1].map(sign => {
        const points = shoes.filter(v => v.idle[0]*sign > 0).map(v => pose.point!(v).sub(new Vector3(...sample.input.body)).applyAxisAngle(new Vector3(0,1,0), -sample.input.yaw));
        return { min: [0,1,2].map(k => Math.min(...points.map(v => v.getComponent(k)))),
          max: [0,1,2].map(k => Math.max(...points.map(v => v.getComponent(k)))) };
      });
      // Disjoint posed boxes in the actor basis prove finite non-overlap; world-axis
      // boxes spuriously overlap when two separate long shoes face diagonally.
      const gap = Math.max(...[0,1,2].map(k => Math.max(boxes[1]!.min[k]!-boxes[0]!.max[k]!, boxes[0]!.min[k]!-boxes[1]!.max[k]!)))*context.scale;
      minimumShoeBoxGap = Math.min(minimumShoeBoxGap, gap);
      expect(gap, 'posed shoe boxes overlap at '+sample.root.elapsedSeconds).toBeGreaterThan(0);
    };
    for (ticks=1; ticks<=1800; ticks++) {
      const frame = owner.advance(1/60, { occupancy: { tick: ticks, otherActors: [] }, foot: footAdmission,
        interval(candidate) {
          const changed = candidate.current.gait.events.length !== events;
          support.observe(candidate.sample(.5, 1), changed); support.observe(candidate.current, changed);
          if (changed || ticks%6===0) { checkShoes(candidate.sample(.5, 1)); checkShoes(candidate.current); }
          return { ok: true };
        } });
      expect(frame.refused, 'finite support refusal at tick '+ticks).toBeNull();
      const a=frame.previous.gait, b=frame.current.gait;
      for (let side=0; side<2; side++) if(a.feet[side].mode==='plant') {
        expect(b.feet[side].p, 'a planted anchor moved before its flight').toEqual(a.feet[side].p);
      }
      for(const p of b.lastIntervals??[]) if(p.kind==='departure') {
        const lateral = new Vector3(...p.target.p).sub(new Vector3(...frame.current.input.body));
        // Endpoint is relative to the forecast landing body, not the current body.
        const forecast=frame.current.input.bodyForecast?.(p.end);
        if(forecast) lateral.copy(new Vector3(...p.target.p).sub(new Vector3(...forecast.body))).applyAxisAngle(new Vector3(0,1,0),-forecast.yaw);
        else lateral.applyAxisAngle(new Vector3(0,1,0),-frame.current.input.yaw);
        if(frame.current.input.speed>0) {
          walkingDepartures++;
          expect(Math.abs(lateral.x)*context.scale).toBeGreaterThan(.085);
          expect(Math.abs(lateral.x)*context.scale).toBeLessThan(.100);
          expect(p.swing.height*context.scale).toBeGreaterThan(.065);
          expect(p.swing.height*context.scale).toBeLessThan(.085);
        } else { stoppedDepartures++; expect(p.swing.height).toBe(.035); }
        expect(p.trajectory.flight.height).toBe(p.swing.height);
        recorded.push({time:p.time,end:p.end,side:p.side,speed:frame.current.input.speed,target:p.target.p,height:p.swing.height});
      }
      events=b.events.length; seen.add(frame.current.root.occurrence); roots.push(frame.current.root); states.push(stateDigest(frame.current));
      if(frame.current.root.cycle===1 && frame.current.root.localM>.5) break;
    }
    expect(ticks).toBeLessThan(1800); expect(seen.size).toBe(3);
    expect(walkingDepartures).toBeGreaterThan(20); expect(stoppedDepartures).toBeGreaterThan(4);
    expect(support.measures.maximumDriftM).toBeLessThan(.005);
    expect(support.measures.minimumShoeM).toBeGreaterThan(-.015);
    expect(support.measures.maximumPlantMinimumM).toBeLessThan(.015);
    expect(maximumWalkingLiftM).toBeGreaterThan(.065); expect(maximumWalkingLiftM).toBeLessThan(.085);
    const moveStarts: number[] = [], moveEnds: number[] = [], turnStarts: number[] = [];
    let turning=false;
    for(const [i,r] of roots.entries()) {
      const p=roots[i-1],rotating=!!p&&r.speedMps===0&&r.heading!==p.heading;
      if(r.speedMps>0&&(!p||p.speedMps===0))moveStarts.push(i+1);
      if(p&&r.speedMps===0&&p.speedMps>0)moveEnds.push(i+1);
      if(rotating&&!turning)turnStarts.push(i+1); turning=rotating;
    }
    // Accepted291 predecessor trace: exact translating root records, with only
    // elapsed wall-of-simulation time omitted. No gait policy derives these pins.
    const baselineStarts=[1,375,577,951,1153],baselineEnds=[290,482,866,1058],baselineTurns=[291,493,867,1069];
    const movementPins=[
      'd198b5a144507451101bf13062b824988c914a614e69911b4e7652d06b3ce72a',
      'de8a7376b8335b5669e6ff923a920165a9adef9f91f53bbd301de1e0eeced586',
      '6f76524463476448e0341fd9657ec73e7a3dde5f1bf01867cfc958a1cf9929a4',
      '248d2818cccc87e7d78b2beb4a6dcfd8daccb8f03fdfb7facf38797e62b63aee',
    ];
    expect(moveStarts).toHaveLength(5); expect(moveEnds).toHaveLength(4); expect(turnStarts).toHaveLength(4);
    expect(moveStarts[0]).toBe(1); expect(moveEnds[0]).toBe(290);
    const delays=moveStarts.map((tick,i)=>tick-baselineStarts[i]!);
    const extraSettling=delays.slice(1).map((delay,i)=>delay-delays[i]!);
    for(const [i,extra] of extraSettling.entries()) {
      expect(extra).toBeGreaterThanOrEqual(0); expect(extra).toBeLessThanOrEqual(2);
      expect(turnStarts[i]!-baselineTurns[i]!).toBe(delays[i+1]);
      expect(moveEnds[i]!-moveStarts[i]!).toBe(baselineEnds[i]!-baselineStarts[i]!);
      const motion=roots.slice(moveStarts[i]!-1,moveEnds[i]).map(r=>({...r,elapsedSeconds:undefined}));
      expect(createHash('sha256').update(JSON.stringify(motion)).digest('hex')).toBe(movementPins[i]);
    }
    expect(delays.at(-1)).toBeLessThanOrEqual(4);
    // Repeat only the deterministic controller trace, not physical/source qualification.
    const replay=fixture().owner;
    for(let tick=1;tick<=ticks;tick++) {
      const frame=replay.advance(1/60,{occupancy:{tick,otherActors:[]},foot:footAdmission,interval:()=>({ok:true})});
      expect(frame.refused).toBeNull(); expect(stateDigest(frame.current)).toBe(states[tick-1]);
    }
    if(process.env.MAPS_GAIT_RECEIPT) writeFileSync(process.env.MAPS_GAIT_RECEIPT, JSON.stringify({ticks,walkingDepartures,stoppedDepartures,minimumShoeBoxGap,maximumWalkingLiftM,measures:support.measures,departures:recorded,roots,moveStarts,moveEnds,turnStarts,extraSettling,deterministicSamples:states.length},null,2));
  }, 180000);
  it('rejects a displaced planted foot with the unchanged real support admission', () => {
    const {owner,support}=fixture(),sample=owner.current(); support.observe(sample, true);
    const changed={...sample,gait:structuredClone(sample.gait)}; changed.gait.feet[0].p[0]+=.010;
    expect(()=>support.observe(changed)).toThrow(/planted drift/);
  });
});
