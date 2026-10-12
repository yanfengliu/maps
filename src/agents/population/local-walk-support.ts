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
  declare private readonly scratch: { vertices: LocalRig['packet']['source']['vertices']; shoes: number[]; soles: number[][]; points: Float64Array; residuals: Float64Array; valid: Uint8Array }[];
  readonly floor: ReturnType<typeof createLocalFloor>;
  readonly measures = { samples: 0, minimumShoeM: Infinity, maximumPlantMinimumM: 0, maximumDriftM: 0, fullBodySamples: 0 };
  constructor(readonly context: LocalContext, readonly rigs: LocalRig[], readonly engine: OrderedFootEngine) {
    this.floor=createLocalFloor(context);this.anchors=rigs.map(()=>[{mode:'',points:[]},{mode:'',points:[]}]);
    this.scratch=rigs.map(rig=>{const vertices=rig.packet.source.vertices,slots=new Map(vertices.map((v,i)=>[v.id,i]));return {vertices,shoes:rig.packet.shoes.map(id=>slots.get(id)!),soles:rig.packet.soles.map(ids=>ids.map(id=>slots.get(id)!)),points:new Float64Array(vertices.length*3),residuals:new Float64Array(vertices.length),valid:new Uint8Array(vertices.length)};});
  }
  checkpoint(): Anchor[][] { return structuredClone(this.anchors); }
  restore(anchors: Anchor[][]): void { this.anchors=anchors; }
  observe(sample: LocalGaitSample, fullBody=false): void {
    const c=this.context,p=sample.root,floors=this.floor.nearby(p.x,p.z,1),boxes=[...c.obstacles.nearestBuildings,...c.obstacles.nearestFurniture];
    for(const j of c.authority)for(const a of j.areas)if(Math.hypot(p.x-a.position.x,p.z-a.position.z)<a.radiusM+.496*c.scale)throw Error('Local actor reached unheld physical authority '+j.id);
    for(const [index,rig] of this.rigs.entries()) {
      const pose=this.engine.scenePose(rig.d,rig.source,sample.gait,sample.input);if(!pose.valid||!pose.point)throw Error('Actual female leg solve failed at '+rig.packet.id);
      const scratch=this.scratch[index]!,{points,residuals,valid}=scratch;valid.fill(0);
      const point=(slot:number)=>{const offset=slot*3;if(!(valid[slot]!&1)){const q=pose.point!(scratch.vertices[slot]!);points[offset]=c.origin.x+q.x*c.scale;points[offset+1]=c.origin.y+q.y*c.scale;points[offset+2]=c.origin.z+q.z*c.scale;valid[slot]=1;}return offset;};
      const residual=(slot:number)=>{
        if(valid[slot]!&2)return residuals[slot]!;
        const offset=point(slot),x=points[offset]!,z=points[offset+2]!;
        // Exact incumbent arithmetic/order; avoid per-triangle arrays/callbacks.
        for(const t of floors){const u=((x-t.a.x)*(t.c.z-t.a.z)-(z-t.a.z)*(t.c.x-t.a.x))/t.det,v=((t.b.x-t.a.x)*(z-t.a.z)-(t.b.z-t.a.z)*(x-t.a.x))/t.det;
          if(u>=-1e-10&&v>=-1e-10&&1-u-v>=-1e-10){const r=(points[offset+1]!-(t.a.y+t.dx*(x-t.a.x)+t.dz*(z-t.a.z)))*t.ny;residuals[slot]=r;valid[slot]=3;return r;}}
        throw Error('Actual female foot VAT '+scratch.vertices[slot]!.id+' has no retained support');
      };
      for(const slot of scratch.shoes){const r=residual(slot);this.measures.samples++;this.measures.minimumShoeM=Math.min(this.measures.minimumShoeM,r);if(r<-.015)throw Error('Actual female shoe penetration exceeds 15mm at '+rig.packet.id+'/'+scratch.vertices[slot]!.id);}
      for(let side=0;side<2;side++){const foot=sample.gait.feet[side],sole=scratch.soles[side]!,anchor=this.anchors[index]![side]!;let minimum=Infinity;for(const slot of sole)minimum=Math.min(minimum,residual(slot));
        if(foot.mode==='plant'){this.measures.maximumPlantMinimumM=Math.max(this.measures.maximumPlantMinimumM,Math.abs(minimum));if(Math.abs(minimum)>.015)throw Error('Actual female planted minimum exceeds 15mm');if(anchor.mode!=='plant')anchor.points=sole.map(slot=>{const offset=point(slot);return [points[offset]!,points[offset+1]!,points[offset+2]!];});for(let i=0;i<sole.length;i++){const offset=point(sole[i]!),a=anchor.points[i]!,drift=Math.hypot(points[offset]!-a[0]!,points[offset+1]!-a[1]!,points[offset+2]!-a[2]!);this.measures.maximumDriftM=Math.max(this.measures.maximumDriftM,drift);if(drift>=.005)throw Error('Actual female planted drift reaches 5mm');}}
        anchor.mode=foot.mode;
      }
      if(fullBody)for(let slot=0;slot<scratch.vertices.length;slot++){const offset=point(slot),x=points[offset]!,y=points[offset+1]!,z=points[offset+2]!,envelope=c.obstacles.actorEnvelope;this.measures.fullBodySamples++;if(x<envelope.min[0]!||x>envelope.max[0]!||y<envelope.min[1]!||y>envelope.max[1]!||z<envelope.min[2]!||z>envelope.max[2]!)throw Error('Actual female body left the checked static corridor');for(const b of boxes)if(x>=b.min[0]!&&x<=b.max[0]!&&y>=b.min[1]!&&y<=b.max[1]!&&z>=b.min[2]!&&z<=b.max[2]!)throw Error('Actual female body entered conservative static obstacle '+(b.sourceId??b.id));}
    }
  }
}
