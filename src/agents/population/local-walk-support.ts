import type { LocalWalkLeg, LocalGaitSample } from './local-walk-gait.js';
import type { LocalRig } from '../render/local-walk-rig.js';
import type { OrderedFootEngine } from './local-ordered/controller.mjs';
type Point = { x: number; y: number; z: number };
export interface Triangle { index: number; a: Point; b: Point; c: Point; vertices: Point[]; det: number; dx: number; dz: number; ny: number }
interface Box { min: number[]; max: number[]; sourceId?: string; id?: number }
export interface LocalContext {
  scale: number; origin: Point; legs: LocalWalkLeg[]; triangles: Triangle[];
  obstacles: { actorEnvelope: Box; nearestBuildings: Box[]; nearestFurniture: Box[]; inputs: {path: string; sha256: string}[] };
  authority: {id: string; areas: {position: {x: number; z: number}; radiusM: number}[]}[];
  route: string[]; networkEdges: unknown[];
}
export const weights = (t: Triangle, p: {x: number; z: number}): number[] => {
  const u = ((p.x-t.a.x)*(t.c.z-t.a.z)-(p.z-t.a.z)*(t.c.x-t.a.x))/t.det, v = ((t.b.x-t.a.x)*(p.z-t.a.z)-(t.b.z-t.a.z)*(p.x-t.a.x))/t.det; return [u,v,1-u-v];
};
export const height = (t: Triangle, p: {x: number; z: number}): number => t.a.y+t.dx*(p.x-t.a.x)+t.dz*(p.z-t.a.z);
export function createLocalFloor(context: LocalContext) {
  // Rebuild the retained source's 4m index in original triangle order, including
  // its query insertion order. The seam exception remains local to this actor.
  const cells = new Map<string, Triangle[]>();
  for (const t of [...context.triangles].sort((a,b)=>a.index-b.index)) for(let x=Math.floor(Math.min(t.a.x,t.b.x,t.c.x)/4);x<=Math.floor(Math.max(t.a.x,t.b.x,t.c.x)/4);x++) for(let z=Math.floor(Math.min(t.a.z,t.b.z,t.c.z)/4);z<=Math.floor(Math.max(t.a.z,t.b.z,t.c.z)/4);z++) { const key=x+','+z; const list=cells.get(key)??[];list.push(t);cells.set(key,list); }
  const nearby = (x: number,z: number,r=.6): Triangle[] => { const set=new Set<Triangle>();for(let a=Math.floor((x-r)/4);a<=Math.floor((x+r)/4);a++)for(let b=Math.floor((z-r)/4);b<=Math.floor((z+r)/4);b++)for(const t of cells.get(a+','+b)??[])set.add(t);return [...set]; };
  function floorAt(x: number,z: number) {
    const floors=nearby(x,z),hits=floors.filter(t=>Math.min(...weights(t,{x,z}))>=-1e-10);let selected=hits,seam=false;
    if(!hits.length){const distance=(t:Triangle)=>Math.min(...[0,1,2].map(k=>{const a=t.vertices[k]!,b=t.vertices[(k+1)%3]!,dx=b.x-a.x,dz=b.z-a.z,q=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-q*dx,z-a.z-q*dz);}));const near=floors.map(t=>({t,d:distance(t)})).filter(r=>r.d<=.000005).sort((a,b)=>a.d-b.d);if(near.length<2)throw Error('Local foot patch unavailable at '+JSON.stringify({x,z}));selected=near.slice(0,2).map(r=>r.t);seam=true;}
    const ys=selected.map(t=>height(t,{x,z}));if(Math.max(...ys)-Math.min(...ys)>.00001)throw Error('Competing real local foot-patch heights');
    return {y:ys.reduce((s,y)=>s+y,0)/ys.length,patch:{id:'hero:'+selected.map(t=>t.index).sort().join(','),triangles:selected.map(t=>t.index),rootHeightLaw:seam?'two actual bounding patches; root is over numeric seam':'actual retained pavement',seam}};
  }
  return { nearby, floorAt, normalizedFloor(x:number,z:number){const f=floorAt(context.origin.x+x*context.scale,context.origin.z+z*context.scale);return {y:(f.y-context.origin.y)/context.scale,patch:f.patch};} };
}
type Anchor = { mode: string; points: number[][] };
/** Actual finite shoes/soles and unheld-owner checks, not an origin-height proxy. */
export class LocalSupportAdmission {
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
