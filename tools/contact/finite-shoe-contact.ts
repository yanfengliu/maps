/**
 * Finite, supplied-pose rigid-shoe diagnostic. No surface selection, controller,
 * force model, anatomical verdict or continuous swept-collision claim.
 * Upward height-field support only; vertical supports are explicitly unresolved.
 * Contact uses normal projection, clearance uses complete shoe triangles, and
 * drift keeps the original per-vertex plant baseline across support changes.
 */
export type Point = readonly [number, number, number];
export type Triangle = readonly [Point, Point, Point];
export type Verdict = "pass" | "fail" | "uncertain";
export interface Binding {
  variant: string; lod: string; modelSha256: string; referenceSha256: string;
  weightsSha256: string; membershipSha256: string; scale: number;
}
export interface ShoeTriangle { id: string; ids: readonly [number, number, number] }
export interface ShoeReference {
  binding: Binding; triangles: readonly ShoeTriangle[];
  soleTriangleIds: readonly string[]; sampleIds: readonly number[];
}
export interface ShoePose {
  binding: Binding; points: ReadonlyMap<number, Point>;
  /** Exact supplied query point; packingErrorM does not describe this point. */
  loadPoint: Point;
  /** Maximum Euclidean discrepancy of each shoe vertex, world metres. */
  packingErrorM: number;
}
export interface SurfaceTriangle {
  id: string; meshSha256: string; role: "surface" | "cap"; points: Triangle;
}
export interface SupportSelection {
  meshSha256: string; triangleIds: readonly string[];
  /** Each listed bank must contribute a resolved positive-area patch. */
  requiredBanks?: readonly (readonly string[])[];
}
export interface PlantBaseline {
  binding: Binding; samples: readonly { id: number; point: Point }[];
  packingErrorM: number;
}
export interface PatchVertex { shoe: Point; projection: Point; normalM: number; verticalM: number }
export interface ContactPatch {
  shoeTriangleId: string; supportTriangleId: string; vertices: PatchVertex[];
  witness: PatchVertex;
  projectedAreaM2: number; areaUncertaintyM2: number; verdict: Verdict;
}
export interface ContactRegion {
  shoeTriangleId: string; supportTriangleId: string; vertices: PatchVertex[];
  projectedAreaM2: number; areaUncertaintyM2: number;
}
type P2 = readonly [number, number];
const CONTACT_M = 0.015, DRIFT_M = 0.005;
const cross2 = (a: P2, b: P2, c: P2) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const xz = (p: Point): P2 => [p[0],p[2]];
const dot = (a: Point,b: Point) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub = (a: Point,b: Point): Point => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mix = (a: Point,b: Point,t: number): Point => [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])];
const distance = (a: Point,b: Point) => Math.hypot(...sub(a,b));
function requireInput(ok: unknown, detail: string): asserts ok {
  if (!ok) throw Error(`Shoe contact input ${detail}. Supply the frozen reference, complete pose and explicitly selected triangles.`);
}
function pointValid(p: Point): boolean { return p.length===3 && p.every(Number.isFinite); }
function sameBinding(a: Binding,b: Binding): boolean {
  return a.variant===b.variant && a.lod===b.lod && a.modelSha256===b.modelSha256 && a.referenceSha256===b.referenceSha256 && a.weightsSha256===b.weightsSha256 && a.membershipSha256===b.membershipSha256 && a.scale===b.scale;
}
function validate(ref: ShoeReference,pose: ShoePose): void {
  requireInput(sameBinding(ref.binding,pose.binding),"variant, LOD, scale, model, palette, weights or membership differs from its reference");
  requireInput(Number.isFinite(ref.binding.scale)&&ref.binding.scale>0,"scale is not positive");
  requireInput(Number.isFinite(pose.packingErrorM)&&pose.packingErrorM>=0,"packing uncertainty is missing or negative");
  requireInput(pointValid(pose.loadPoint),"foot-joint load point is not finite");
  const ids=new Set<number>(),triangleIds=new Set<string>();
  for(const t of ref.triangles){requireInput(!triangleIds.has(t.id),`repeats shoe triangle ${t.id}`);triangleIds.add(t.id);for(const id of t.ids)ids.add(id);}
  requireInput(ids.size>0&&pose.points.size===ids.size,"pose does not contain exactly the drawn shoe vertices");
  for(const id of ids)requireInput(pose.points.has(id)&&pointValid(pose.points.get(id)!),`vertex ${id} is absent or non-finite`);
  requireInput(ref.soleTriangleIds.length>0&&new Set(ref.soleTriangleIds).size===ref.soleTriangleIds.length&&ref.soleTriangleIds.every(id=>triangleIds.has(id)),"sole triangle membership is absent, repeated or outside the shoe");
  requireInput(ref.sampleIds.length>0&&new Set(ref.sampleIds).size===ref.sampleIds.length&&ref.sampleIds.every(id=>ids.has(id)),"plant sample membership is absent, repeated or outside the shoe");
}
/** The returned immutable sample set is independent of later support triangles. */
export function commitPlant(ref: ShoeReference,pose: ShoePose): PlantBaseline {
  validate(ref,pose);
  return Object.freeze({binding:Object.freeze({...ref.binding}),packingErrorM:pose.packingErrorM,samples:Object.freeze(ref.sampleIds.map(id=>Object.freeze({id,point:Object.freeze([...pose.points.get(id)!]) as Point})))});
}
function clip(poly: Point[],value:(p:Point)=>number): Point[] {
  const out:Point[]=[];
  for(let i=0;i<poly.length;i++){const a=poly[i]!,b=poly[(i+1)%poly.length]!,fa=value(a),fb=value(b);if(fa>=0)out.push(a);if((fa>=0)!==(fb>=0))out.push(mix(a,b,fa/(fa-fb)));}
  return out;
}
function ccw(poly: Point[]): Point[] {return areaSigned(poly.map(xz))<0?[...poly].reverse():poly;}
function areaSigned(p: readonly P2[]):number{return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length]!;return s+a[0]*b[1]-a[1]*b[0];},0)/2;}
const area=(p:readonly Point[])=>Math.abs(areaSigned(p.map(xz)));
function perimeter(p: readonly P2[]):number{return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length]!;return s+Math.hypot(a[0]-b[0],a[1]-b[1]);},0);}
function clipXZ(poly:Point[],boundary:readonly Point[],projection:(p:Point)=>Point=p=>p,insetM=0):Point[]{
  const b=ccw([...boundary]);let out=poly;
  for(let i=0;i<b.length&&out.length;i++){const a=xz(b[i]!),c=xz(b[(i+1)%b.length]!),edgeLength=Math.hypot(c[0]-a[0],c[1]-a[1]);out=clip(out,p=>cross2(a,c,xz(projection(p)))-insetM*edgeLength);}
  return out;
}
/** Convex subtraction preserves every uncovered piece; it never fills a hole. */
function subtractXZ(poly:Point[],boundary:readonly Point[]):Point[][]{
  const out:Point[][]=[],b=ccw([...boundary]);let remaining=poly;
  for(let i=0;i<b.length&&remaining.length;i++){const a=xz(b[i]!),c=xz(b[(i+1)%b.length]!);const outside=clip(remaining,p=>-cross2(a,c,xz(p)));if(area(outside)>0)out.push(outside);remaining=clip(remaining,p=>cross2(a,c,xz(p)));}
  return out;
}
function plane(t:Triangle){
  const a=sub(t[1],t[0]),b=sub(t[2],t[0]);let n:Point=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length=Math.hypot(...n);if(!length)return null;
  n=n.map(x=>x/length) as unknown as Point;if(n[1]<0)n=n.map(x=>-x) as unknown as Point;
  if(n[1]===0)return null;
  const normal=(p:Point)=>dot(sub(p,t[0]),n);
  return {n,normal,vertical:(p:Point)=>normal(p)/n[1],project:(p:Point):Point=>{const r=normal(p);return [p[0]-r*n[0],p[1]-r*n[1],p[2]-r*n[2]];}};
}
function hull(points:readonly P2[]):P2[]{
  const sorted=[...new Map(points.map(p=>[`${p[0]},${p[1]}`,p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(sorted.length<3)return sorted;
  const half=(rows:P2[])=>{const out:P2[]=[];for(const p of rows){while(out.length>=2&&cross2(out[out.length-2]!,out[out.length-1]!,p)<=0)out.pop();out.push(p);}return out;};
  const lower=half(sorted),upper=half([...sorted].reverse());return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function margins(shape:readonly P2[],load:P2):number[]{
  return shape.map((p,i)=>{const q=shape[(i+1)%shape.length]!;return cross2(p,q,load)/Math.hypot(q[0]-p[0],q[1]-p[1]);});
}
/** Distance to a point/line hull also bounds possible contact if packing opens it. */
function outsideDistance(shape:readonly P2[],load:P2):number{
  if(!shape.length)return Infinity;
  if(shape.length>=3&&margins(shape,load).every(m=>m>=0))return 0;
  return Math.min(...shape.map((a,i)=>{const b=shape[(i+1)%shape.length]!,dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz;
    const t=l2?Math.max(0,Math.min(1,((load[0]-a[0])*dx+(load[1]-a[1])*dz)/l2)):0;
    return Math.hypot(load[0]-a[0]-t*dx,load[1]-a[1]-t*dz);
  }));
}
function segmentClip(a:Point,b:Point,boundary:Triangle):Point[]{
  let low=0,high=1;const poly=ccw([...boundary]);
  for(let i=0;i<3;i++){const p=xz(poly[i]!),q=xz(poly[(i+1)%3]!),fa=cross2(p,q,xz(a)),fb=cross2(p,q,xz(b));if(fa<0&&fb<0)return [];if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);if(fa<0)low=Math.max(low,t);else high=Math.min(high,t);}}
  return low<=high?[mix(a,b,low),mix(a,b,high)]:[];
}
export function observeShoe(ref:ShoeReference,pose:ShoePose,selection:SupportSelection,supports:readonly SurfaceTriangle[],obstacles:readonly SurfaceTriangle[],plant?:PlantBaseline){
  validate(ref,pose);
  requireInput(supports.length>0&&selection.triangleIds.length>0,"selected support is empty");
  const allowed=new Set(selection.triangleIds),seen=new Set<string>();
  requireInput(allowed.size===selection.triangleIds.length,"selection repeats a triangle");
  for(const s of supports){requireInput(s.role==="surface"&&s.meshSha256===selection.meshSha256&&allowed.has(s.id),`support ${s.id} is a cap, wrong sheet or unselected triangle`);requireInput(!seen.has(s.id),`support repeats triangle ${s.id}`);seen.add(s.id);}
  requireInput(seen.size===allowed.size,"selected support triangles are missing");
  for(const s of [...supports,...obstacles])requireInput(s.points.length===3&&s.points.every(pointValid),`surface ${s.id} is not a finite triangle`);
  const extent=Math.max(1,...[...pose.points.values(),...supports.flatMap(s=>s.points),...obstacles.flatMap(s=>s.points)].flat().map(Math.abs));
  // Arithmetic guard is independent of packing, not a physical contact allowance.
  const numericM=128*Number.EPSILON*extent,epsilonM=pose.packingErrorM+numericM;
  const patches:ContactPatch[]=[],uncovered:{shoeTriangleId:string;polygon:Point[];areaM2:number;areaUncertaintyM2:number;areaVerdict:"positive"|"uncertain"}[]=[],unresolved:string[]=[];
  const innerPatches:ContactRegion[]=[],outerPatches:ContactRegion[]=[];
  const sole=new Set(ref.soleTriangleIds),clearance:{shoeTriangleId:string;surfaceTriangleId:string;minimumNormalM:number;minimumVerticalM:number;at:Point;verdict:Verdict;degenerateShoeProjection:boolean}[]=[];
  for(const s of [...supports,...obstacles])if(!plane(s.points))unresolved.push(`Surface ${s.id} is degenerate or vertical; height-field clearance is unavailable`);
  for(const t of ref.triangles){
    const points=t.ids.map(id=>pose.points.get(id)!) as unknown as Triangle;
    if(sole.has(t.id)){
      let pieces:Point[][]=[[...points]];
      for(const s of supports){
        const p=plane(s.points);if(!p)continue;
        pieces=pieces.flatMap(piece=>subtractXZ(piece,s.points));
        // A barycentric combination of vertex errors has norm <= epsilonM.
        // Orthogonal projection onto this fixed support plane is nonexpansive,
        // as is taking X/Z. Insetting each support edge by epsilonM and both
        // normal-band edges by epsilonM therefore retains corresponding contact
        // points for every allowed perturbation. Their positions can still move
        // by epsilonM: only the inset hull test below may certify a load point.
        // Expanding the same inequalities contains every possible contact's
        // nominal preimage, without dividing by a near-zero plane intersection.
        const region=(insetM:number):ContactRegion=>{
          let poly=clipXZ([...points],s.points,p.project,insetM);
          poly=clip(clip(poly,v=>CONTACT_M-insetM-p.normal(v)),v=>CONTACT_M-insetM+p.normal(v));
          const projected=poly.map(p.project);
          return {shoeTriangleId:t.id,supportTriangleId:s.id,vertices:poly.map(shoe=>({shoe,projection:p.project(shoe),normalM:p.normal(shoe),verticalM:p.vertical(shoe)})),projectedAreaM2:area(projected),areaUncertaintyM2:perimeter(projected.map(xz))*epsilonM+Math.PI*epsilonM**2};
        };
        const inner=region(epsilonM),outer=region(-epsilonM);
        if(inner.vertices.length)innerPatches.push(inner);
        if(outer.vertices.length)outerPatches.push(outer);
        let patch=clipXZ([...points],s.points,p.project);
        patch=clip(clip(patch,v=>CONTACT_M-p.normal(v)),v=>CONTACT_M+p.normal(v));
        if(patch.length>=3){
          const projected=patch.map(p.project),a=area(projected),err=perimeter(projected.map(xz))*epsilonM+Math.PI*epsilonM**2;
          if(a>0){const vertices=patch.map(shoe=>({shoe,projection:p.project(shoe),normalM:p.normal(shoe),verticalM:p.vertical(shoe)}));
            // This is NOMINAL evidence. Its center and boundary do not certify
            // hull support; verdict only says a resolved inner patch exists.
            const center=patch.reduce((v,q)=>[v[0]+q[0]/patch.length,v[1]+q[1]/patch.length,v[2]+q[2]/patch.length] as Point,[0,0,0] as Point);
            patches.push({shoeTriangleId:t.id,supportTriangleId:s.id,vertices,witness:{shoe:center,projection:p.project(center),normalM:p.normal(center),verticalM:p.vertical(center)},projectedAreaM2:a,areaUncertaintyM2:err,verdict:inner.projectedAreaM2>inner.areaUncertaintyM2?"pass":"uncertain"});
          }
        }
      }
      for(const polygon of pieces)if(area(polygon)>0){const a=area(polygon),err=perimeter(polygon.map(xz))*epsilonM+Math.PI*epsilonM**2;uncovered.push({shoeTriangleId:t.id,polygon,areaM2:a,areaUncertaintyM2:err,areaVerdict:a>err?"positive":"uncertain"});}
    }
    for(const s of [...supports,...obstacles]){
      const p=plane(s.points);if(!p)continue;
      const degenerate=area(points)===0;
      // Edge endpoints also cover vertical/zero-XZ-area shoe faces. Their affine
      // extrema give the minimum over a line projection without dropping it.
      const overlap=degenerate?points.flatMap((a,i)=>segmentClip(a,points[(i+1)%3]!,s.points)):clipXZ([...points],s.points);
      if(!overlap.length)continue;
      const at=overlap.reduce((a,b)=>p.normal(a)<=p.normal(b)?a:b),r=p.normal(at);
      clearance.push({shoeTriangleId:t.id,surfaceTriangleId:s.id,minimumNormalM:r,minimumVerticalM:p.vertical(at),at,verdict:r< -epsilonM?"fail":r>epsilonM?"pass":"uncertain",degenerateShoeProjection:degenerate});
    }
  }
  const resolved=innerPatches.filter(p=>p.projectedAreaM2>p.areaUncertaintyM2),shape=hull(resolved.flatMap(p=>p.vertices.map(v=>xz(v.projection)))),shapeArea=Math.abs(areaSigned(shape));
  const possibleHull=hull(outerPatches.flatMap(p=>p.vertices.map(v=>xz(v.projection)))),nominalHull=hull(patches.flatMap(p=>p.vertices.map(v=>xz(v.projection))));
  const shapeErr=perimeter(shape)*epsilonM+Math.PI*epsilonM**2,load=xz(pose.loadPoint);
  const loadMargins=margins(shape,load),possibleHullDistanceM=possibleHull.length?outsideDistance(possibleHull,load):null;
  // The load query is exact. The margin pays for the projected shoe-point
  // displacement once; no nominal clipped contact boundary is certified.
  const hullVerdict:Verdict=shape.length>=3&&shapeArea>shapeErr&&loadMargins.every(x=>x>epsilonM)?"pass":possibleHullDistanceM===null||possibleHullDistanceM>epsilonM?"fail":"uncertain";
  const banks=(selection.requiredBanks??[]).map(ids=>({triangleIds:[...ids],verdict:ids.some(id=>resolved.some(p=>p.supportTriangleId===id))?"pass" as Verdict:ids.some(id=>outerPatches.some(p=>p.supportTriangleId===id))?"uncertain" as Verdict:"fail" as Verdict}));
  const contactVerdict:Verdict=resolved.length?"pass":outerPatches.length?"uncertain":"fail";
  const clearanceVerdict:Verdict=clearance.some(x=>x.verdict==="fail")?"fail":unresolved.length||clearance.some(x=>x.verdict==="uncertain")?"uncertain":"pass";
  let drift:null|{maximumM:number;uncertaintyM:number;verdict:Verdict;samples:{id:number;distanceM:number}[]}=null;
  if(plant){
    requireInput(sameBinding(plant.binding,ref.binding),"plant reference binding changed");
    requireInput(plant.samples.length===ref.sampleIds.length&&plant.samples.every((s,i)=>s.id===ref.sampleIds[i]),"committed plant sample membership changed");
    requireInput(Number.isFinite(plant.packingErrorM)&&plant.packingErrorM>=0&&plant.samples.every(s=>pointValid(s.point)),"committed plant baseline is invalid");
    const samples=plant.samples.map(s=>({id:s.id,distanceM:distance(s.point,pose.points.get(s.id)!)})),maximumM=Math.max(...samples.map(s=>s.distanceM)),uncertaintyM=plant.packingErrorM+epsilonM;
    drift={maximumM,uncertaintyM,samples,verdict:maximumM-uncertaintyM>=DRIFT_M?"fail":maximumM+uncertaintyM<DRIFT_M?"pass":"uncertain"};
  }
  const verdicts=[contactVerdict,hullVerdict,clearanceVerdict,...banks.map(b=>b.verdict),...(drift?[drift.verdict]:[])];
  const verdict:Verdict=verdicts.includes("fail")?"fail":verdicts.includes("uncertain")?"uncertain":"pass";
  return {verdict,contactVerdict,hullVerdict,clearanceVerdict,banks,drift,patches,innerPatches,outerPatches,clearance,uncovered,unresolved,hull:shape,nominalHull,possibleHull,hullAreaM2:shapeArea,loadMarginsM:loadMargins,possibleHullDistanceM,uncertainty:{packingM:pose.packingErrorM,numericM,totalM:epsilonM,loadPoint:"exact supplied query"},denominator:{shoeTriangles:ref.triangles.length,soleTriangles:ref.soleTriangleIds.length,plantSamples:ref.sampleIds.length,supportTriangles:supports.length,obstacleTriangles:obstacles.length},claim:"Finite supplied pose, rigid-shoe hull and height-field clearance only"};
}
