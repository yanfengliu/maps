/** Bound: admitted ordinary singleton's original moving/turn poses and all3
 * complete source sets in Node; no pixels, continuous contact or later-route claim. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe,it,expect,vi} from 'vitest';
import {createLocalRig,type LocalRig,type LocalRigPacket} from '../src/agents/render/local-walk-rig.js';
import {LocalWalkGait,type LocalGaitSample} from '../src/agents/population/local-walk-gait.js';
import {createOrderedFootEngine,type OrderedFootEngine} from '../src/agents/population/local-ordered/controller.mjs';
import {LocalSupportAdmission,createLocalFloor,height,weights,type LocalContext} from '../src/agents/population/local-walk-support.js';
import {readLocalWalkPacket} from '../tools/agents/local-walk/packet.js';
const sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const files=readLocalWalkPacket(resolve(dirname(fileURLToPath(import.meta.url)),'../data/scene/local-walk/packet'));
const context=JSON.parse(files.get('context.json')!.toString()) as LocalContext,rigs=['near','medium','far'].map(id=>createLocalRig(JSON.parse(files.get('rig-'+id+'.json')!.toString()) as LocalRigPacket));
type Anchor={mode:string;points:number[][]};
// Original6796B source SHA162d40f0a23caa0306f7364c757b09e7e94e8c0ea96668faa1477626e6772983.
// Only the reference class name changes; its normalized literal hash is pinned below.
class LiteralSupportAdmission {
  private anchors: Anchor[][];
  readonly floor: ReturnType<typeof createLocalFloor>;
  readonly measures = { samples: 0, minimumShoeM: Infinity, maximumPlantMinimumM: 0, maximumDriftM: 0, fullBodySamples: 0 };
  constructor(readonly context: LocalContext, readonly rigs: LocalRig[], readonly engine: OrderedFootEngine) { this.floor=createLocalFloor(context);this.anchors=rigs.map(()=>[{mode:'',points:[]},{mode:'',points:[]}]); }
  checkpoint(): Anchor[][] { return structuredClone(this.anchors); }
  restore(anchors: Anchor[][]): void { this.anchors=anchors; }
  observe(sample: LocalGaitSample, fullBody=false): void {
    const c=this.context,p=sample.root,floors=this.floor.nearby(p.x,p.z,1),boxes=[...c.obstacles.nearestBuildings,...c.obstacles.nearestFurniture];
    for(const j of c.authority)for(const a of j.areas)if(Math.hypot(p.x-a.position.x,p.z-a.position.z)<a.radiusM+.496*c.scale)throw Error('Local actor reached unheld physical authority '+j.id);
    for(const [index,rig] of this.rigs.entries()) {
      const pose=this.engine.scenePose(rig.d,rig.source,sample.gait,sample.input);if(!pose.valid||!pose.point)throw Error('Actual female leg solve failed at '+rig.packet.id);
      const cache=new Map<number,{point:number[];residual:number}>();
      const residual=(id:number)=>{const old=cache.get(id);if(old)return old;const q=pose.point!(rig.byId.get(id)!),point=[c.origin.x+q.x*c.scale,c.origin.y+q.y*c.scale,c.origin.z+q.z*c.scale],p={x:point[0]!,z:point[2]!},t=floors.find(t=>Math.min(...weights(t,p))>=-1e-10);if(!t)throw Error('Actual female foot VAT '+id+' has no retained support');const r={point,residual:(point[1]!-height(t,p))*t.ny};cache.set(id,r);return r;};
      for(const id of rig.packet.shoes){const r=residual(id);this.measures.samples++;this.measures.minimumShoeM=Math.min(this.measures.minimumShoeM,r.residual);if(r.residual<-.015)throw Error('Actual female shoe penetration exceeds 15mm at '+rig.packet.id+'/'+id);}
      for(let side=0;side<2;side++){const foot=sample.gait.feet[side],rs=rig.packet.soles[side]!.map(residual),anchor=this.anchors[index]![side]!;
        if(foot.mode==='plant'){const minimum=Math.min(...rs.map(r=>r.residual));this.measures.maximumPlantMinimumM=Math.max(this.measures.maximumPlantMinimumM,Math.abs(minimum));if(Math.abs(minimum)>.015)throw Error('Actual female planted minimum exceeds 15mm');if(anchor.mode!=='plant')anchor.points=rs.map(r=>r.point);for(const [i,r] of rs.entries()){const a=anchor.points[i]!,drift=Math.hypot(...r.point.map((v,k)=>v-a[k]!));this.measures.maximumDriftM=Math.max(this.measures.maximumDriftM,drift);if(drift>=.005)throw Error('Actual female planted drift reaches 5mm');}}
        anchor.mode=foot.mode;
      }
      if(fullBody)for(const v of rig.packet.source.vertices){const q=pose.point(v),point=[c.origin.x+q.x*c.scale,c.origin.y+q.y*c.scale,c.origin.z+q.z*c.scale];this.measures.fullBodySamples++;if(point.some((v,k)=>v<c.obstacles.actorEnvelope.min[k]!||v>c.obstacles.actorEnvelope.max[k]!))throw Error('Actual female body left the checked static corridor');for(const b of boxes)if(point.every((v,k)=>v>=b.min[k]!&&v<=b.max[k]!))throw Error('Actual female body entered conservative static obstacle '+(b.sourceId??b.id));}
    }
  }
}

function fixture(){const floor=createLocalFloor(context),engine=createOrderedFootEngine(floor.normalizedFloor),owner=new LocalWalkGait(context.legs,{generation:1,scale:context.scale,cruiseMps:1.1*context.scale,accelerationMps2:1.1*context.scale/.4,turnRateRadps:Math.PI/2,origin:context.origin,floorY:(x,z)=>floor.floorAt(x,z).y},engine,rigs[0]!.d);return {engine,owner};}
const foot=(proposal:any)=>({ok:true,sourceSurface:proposal.sourceSurface,landingSurface:proposal.landingSurface,evidence:{kind:'actual retained singleton support patches'}});
describe('incumbent support observation extraction',()=>{
 it('retains the independently pinned committed literal reference',()=>{const text=readFileSync(fileURLToPath(import.meta.url),'utf8'),literal=('export '+text.slice(text.indexOf('class LiteralSupportAdmission'),text.indexOf('\nfunction fixture()')).replaceAll('LiteralSupportAdmission','LocalSupportAdmission')).replace(/\r\n/g,'\n').trim();expect(sha(literal)).toBe('b1c79b5b1d8221b7a7e81c851d0ebeb3f733de310c4c69bd3d7d16edcf68a5f8');});
 it('matches original points/first triangles/normal residuals/measures and copied anchors through scratch overwrite',async()=>{
  const {engine,owner}=fixture(),displace=process.env.MAPS_SINGLETON_SUPPORT_DISPLACEMENT==='1',omit=process.env.MAPS_SINGLETON_SUPPORT_OMISSION==='1',receipt={mode:displace?'displaced original-point RED':omit?'omitted shoe observation RED':'literal singleton parity GREEN',observations:[] as {tick:number;alpha:number;points:number;firstHits:number}[],points:0,firstHits:0,witness:null as null|{tick:number;alpha:number;lod:string;vertex:number;original:number[];actual:number[]},omission:null as null|{lod:string;vertex:number;originalSamples:number;actualSamples:number},failure:null as string|null};
  const check=(sample:LocalGaitSample,tick:number,alpha:number)=>{
   const originals=rigs.map(()=>new Map<number,number[]>()),oldHits:{lod:number;vertex:number;triangle:number;point:number[];residual:number}[]=[],newHits:typeof oldHits=[];
   const observedEngine=(old:boolean):OrderedFootEngine=>{let last={lod:0,vertex:0,point:[] as number[]};const view:OrderedFootEngine={...engine,scenePose:(d,source,state,input)=>{const pose=engine.scenePose(d,source,state,input),lod=rigs.findIndex(r=>r.d===d);return {...pose,point(vertex){const q=pose.point!(vertex);if(!old&&displace)q.y+=.0001;const point=[context.origin.x+q.x*context.scale,context.origin.y+q.y*context.scale,context.origin.z+q.z*context.scale];last={lod,vertex:vertex.id,point};if(old)originals[lod]!.set(vertex.id,point);return q;}};}};Reflect.set(view,'trace',(floor:ReturnType<typeof createLocalFloor>)=>{const nearby=floor.nearby;vi.spyOn(floor,'nearby').mockImplementation((...args)=>nearby(...args).map(t=>({...t,get ny(){const p=last.point;(old?oldHits:newHits).push({...last,triangle:t.index,residual:(p[1]!-height(t,{x:p[0]!,z:p[2]!}))*t.ny});return t.ny;}})));});return view;};
   const oldEngine=observedEngine(true),newEngine=observedEngine(false),original=new LiteralSupportAdmission(context,rigs,oldEngine),optimized=new LocalSupportAdmission(context,rigs,newEngine);
   for(const [view,support]of [[oldEngine,original],[newEngine,optimized]] as const)(Reflect.get(view,'trace') as (floor:ReturnType<typeof createLocalFloor>)=>void)(support.floor);
   let omittedVertex=-1;if(omit){const level=(Reflect.get(optimized,'scratch') as {shoes:number[];vertices:LocalRig['packet']['source']['vertices']}[])[0]!;omittedVertex=level.vertices[level.shoes.pop()!]!.id;}
   original.observe(sample,true);optimized.observe(sample,true);if(omit)receipt.omission={lod:rigs[0]!.packet.id,vertex:omittedVertex,originalSamples:original.measures.samples,actualSamples:optimized.measures.samples};
   const scratch=Reflect.get(optimized,'scratch') as {vertices:LocalRig['packet']['source']['vertices'];points:Float64Array;residuals:Float64Array;valid:Uint8Array}[],slots=scratch.map(level=>new Map(level.vertices.map((v,i)=>[v.id,i]))),observation={tick,alpha,points:0,firstHits:oldHits.length};
   for(const [lod,level]of scratch.entries()){expect(originals[lod]!.size).toBe(level.vertices.length);for(const [slot,vertex]of level.vertices.entries()){const actual=Array.from(level.points.subarray(slot*3,slot*3+3)),old=originals[lod]!.get(vertex.id)!;expect(level.valid[slot]!&1).toBe(1);receipt.points++;observation.points++;if(actual.some((v,k)=>v!==old[k])&&!receipt.witness)receipt.witness={tick,alpha,lod:rigs[lod]!.packet.id,vertex:vertex.id,original:old,actual};expect(actual,'original coordinate '+JSON.stringify({tick,alpha,lod,vertex:vertex.id})).toEqual(old);}}
   expect(newHits,'actual first triangle/normal residual').toEqual(oldHits);for(const hit of oldHits)expect(scratch[hit.lod]!.residuals[slots[hit.lod]!.get(hit.vertex)!]).toBe(hit.residual);expect(optimized.measures).toEqual(original.measures);expect(optimized.checkpoint()).toEqual(original.checkpoint());
   const saved=optimized.checkpoint(),oldSaved=original.checkpoint(),copy=structuredClone(saved);expect(Array.isArray(saved)).toBe(true);const changed:LocalGaitSample={...sample,gait:structuredClone(sample.gait)},planted=sample.gait.feet.findIndex((f:{mode:string})=>f.mode==='plant');expect(planted).toBeGreaterThanOrEqual(0);changed.gait.feet[planted]!.p[0]+=.010;
   expect(()=>original.observe(changed)).toThrow(/planted drift/);expect(()=>optimized.observe(changed)).toThrow(/planted drift/);expect(saved).toEqual(copy);expect(optimized.measures).toEqual(original.measures);
   original.restore(oldSaved);optimized.restore(saved);expect(Reflect.get(optimized,'anchors')).toBe(saved);expect(Reflect.get(original,'anchors')).toBe(oldSaved);optimized.observe(sample);original.observe(sample);expect(saved).toEqual(copy);expect(optimized.checkpoint()).toEqual(original.checkpoint());expect(optimized.measures).toEqual(original.measures);receipt.firstHits+=observation.firstHits;receipt.observations.push(observation);vi.restoreAllMocks();
  };
  try{check(owner.current(),0,1);for(let tick=1;tick<=320;tick++){const frame=owner.advance(1/60,{occupancy:{tick,otherActors:[]},foot,interval:()=>({ok:true})});expect(frame.refused).toBeNull();if(tick%60===0)await new Promise<void>(done=>setImmediate(done));if(tick===60){expect(frame.current.root.speedMps).toBeGreaterThan(0);}if(tick===320){expect(frame.current.gait.turnControl).toBeTruthy();expect(Math.abs(frame.current.root.heading-frame.previous.root.heading)).toBeGreaterThan(1e-8);}if(tick===60||tick===320)for(const alpha of [.5,1])check(frame.sample(alpha,1),tick,alpha);}expect(receipt.points).toBe(5*rigs.reduce((n,r)=>n+r.packet.source.vertices.length,0));}
  catch(error){receipt.failure=String(error);throw error;}finally{vi.restoreAllMocks();if(process.env.MAPS_SINGLETON_SUPPORT_RECEIPT)writeFileSync(process.env.MAPS_SINGLETON_SUPPORT_RECEIPT,JSON.stringify(receipt,null,2));}
 },60000);
 it.each(['missing-support','penetration','plant-height','body-corridor','static-obstacle','authority','invalid-pose'])('retains the original %s refusal',kind=>{
  const {engine,owner}=fixture(),sample=owner.current(),c=structuredClone(context),view:OrderedFootEngine={...engine,scenePose:(...args)=>{const pose=engine.scenePose(...args);if(kind==='invalid-pose')return {...pose,valid:false};if(kind==='penetration'||kind==='plant-height')return {...pose,point(v){const p=pose.point!(v);p.y+=kind==='penetration'?-.03:.03;return p;}};return pose;}};
  if(kind==='missing-support')c.triangles=[];if(kind==='body-corridor')c.obstacles.actorEnvelope={min:[-1,-1,-1],max:[1,1,1]};if(kind==='static-obstacle')c.obstacles.nearestFurniture.push({...c.obstacles.actorEnvelope,sourceId:'test occupied source corridor'});if(kind==='authority')c.authority=[{id:'test unheld authority',areas:[{position:{x:sample.root.x,z:sample.root.z},radiusM:1}]}];
  const old=new LiteralSupportAdmission(c,rigs,view),optimized=new LocalSupportAdmission(c,rigs,view);let oldFailure='',actualFailure='';try{old.observe(sample,true);}catch(error){oldFailure=String(error);}try{optimized.observe(sample,true);}catch(error){actualFailure=String(error);}expect(oldFailure).not.toBe('');expect(actualFailure).toBe(oldFailure);expect(optimized.measures).toEqual(old.measures);
 });
});
