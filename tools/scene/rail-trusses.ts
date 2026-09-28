/** The finite Review150 open through-truss presentation; no engineering solver. */
import assert from "node:assert/strict";
import { counterclockwise, partitionConvex } from "../../src/agents/core/planar.ts";
import { area, conform, triangulate, wrap, topology, unionPieces, type Face, type P2, type P3 } from "./rail-geometry.ts";
import { admitStoredPlan } from "./rail-plan.ts";
import { refineStored } from "./rail-stored.ts";

export interface RailPoint {x:number;z:number}
export interface RailChain {id:number;points:RailPoint[]}
export interface Foundation {track:number;end:string;z:number;lateral:number;foundation:string;poly:P2[]}
interface Knot {s:number;x:number;z:number;n:P2}
/** Outward-round an authored foundation bottom, never the unchanged terrain.
 * Nearest Float32 can leave a sub-micrometre air gap above a sloping triangle. */
export function foundationHeight(y:number):number {
  assert.ok(Number.isFinite(y), `Rail foundation height ${y} is not finite.`);
  const f=Math.fround(y);if(f<=y)return f;
  const view=new DataView(new ArrayBuffer(4));view.setFloat32(0,f);
  view.setUint32(0,view.getUint32(0)+(f>0?-1:1));return view.getFloat32(0);
}
function miter(c:RailChain,i:number):P2 {
  const p=c.points[i]!,a=c.points[Math.max(0,i-1)]!,b=c.points[Math.min(c.points.length-1,i+1)]!;
  const unit=(a:RailPoint,b:RailPoint):P2=>{const L=Math.hypot(b.x-a.x,b.z-a.z);return[(b.z-a.z)/L,(a.x-b.x)/L];};
  if(i===0)return unit(p,b);if(i===c.points.length-1)return unit(a,p);
  const u=unit(a,p),v=unit(p,b),d=1+u[0]*v[0]+u[1]*v[1];return[(u[0]+v[0])/d,(u[1]+v[1])/d];
}
function sourceSection(c:RailChain,z:number):Omit<Knot,"s"> {
  const i=c.points.findIndex((b,i)=>i>0&&z>=c.points[i-1]!.z&&z<=b.z);
  assert.ok(i>0,`Truss ${c.id} has no source segment at Z${z}.`);
  const a=c.points[i-1]!,b=c.points[i]!,u=miter(c,i-1),v=miter(c,i),t=(z-a.z)/(b.z-a.z);
  return{x:a.x+(b.x-a.x)*t,z,n:[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]};
}
const rect=(a:number,b:number,low:number,high:number):P2[]=>[[a,low],[b,low],[b,high],[a,high]];

export function generateTruss(chain:RailChain,from:Foundation,to:Foundation,side:-1|1):{faces:Face[];details:unknown} {
  assert.ok(from.track===chain.id&&to.track===chain.id&&from.z<to.z);
  const zs=[from.z,...chain.points.filter(p=>p.z>from.z&&p.z<to.z).map(p=>p.z),to.z];
  let arc=0;const knots:Knot[]=zs.map((z,i)=>{const p=sourceSection(chain,z);if(i){const prev=sourceSection(chain,zs[i-1]!);arc+=Math.hypot(p.x-prev.x,p.z-prev.z);}return{...p,s:Math.fround(arc)};});
  // Stored local station keys map back to genuine source nodes; subdivision
  // interpolates these original miter sections, never recomputes their normals.
  const point=(s:number,y:number,w:number):P3=>{const i=knots.findIndex((p,i)=>i>0&&s>=knots[i-1]!.s&&s<=p.s);assert.ok(i>0,`Truss ${chain.id}/${side} local station ${s} is outside its source interval.`);const a=knots[i-1]!,b=knots[i]!,t=(s-a.s)/(b.s-a.s),offset=side*1.5+w;return[a.x+(b.x-a.x)*t+(a.n[0]+(b.n[0]-a.n[0])*t)*offset,y,a.z+(b.z-a.z)*t+(a.n[1]+(b.n[1]-a.n[1])*t)*offset];};
  const end=knots.at(-1)!.s,panels:number[]=[0];
  for(let i=1;i<knots.length;i++){const a=knots[i-1]!,b=knots[i]!,count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/6);for(let j=1;j<=count;j++)panels.push(Math.fround(a.s+(b.s-a.s)*j/count));}
  const raw:P2[][]=[rect(0,end,20.25,20.55),rect(0,end,23.55,23.85)];
  // Chords own their complete 0.20m thickness; the open web occupies only the
  // 0.16m central thickness and terminates on the chord surfaces.
  const web:P2[][]=[rect(0,.16,20.55,23.55),rect(end-.16,end,20.55,23.55)];
  for(let i=1;i<panels.length;i++){
    const a=panels[i-1]!,b=panels[i]!,low=i%2?20.55:23.55,high=i%2?23.55:20.55;
    const dx=b-a,dy=high-low,L=Math.hypot(dx,dy),nx=-dy/L*.08,ny=dx/L*.08;
    const p=counterclockwise([[a+nx,low+ny],[b+nx,high+ny],[b-nx,high-ny],[a-nx,low-ny]]) as P2[];
    const clipped=partitionConvex(p,rect(a,b,20.55,23.55)).inside as P2[];
    assert.ok(area(clipped)>0);web.push(clipped);
  }
  const plans:Face[]=[];
  for(const [kind,polys]of [[0,raw],[1,unionPieces(web)]] as const)for(const p of polys)for(let i=1;i<knots.length;i++){
    const clipped=partitionConvex(p,rect(knots[i-1]!.s,knots[i]!.s,20,24)).inside as P2[];
    if(area(clipped)>1e-10)plans.push(...triangulate({source:kind,material:0,vertices:wrap(clipped.map(([s,y])=>[s,0,y] as P3))}));
  }
  const admission=admitStoredPlan(conform(plans).faces),plan=admission.faces;
  const solidCells:P3[][]=[],faces:Face[]=[],edges=new Map<string,{a:P3;b:P3;half:number}[]>();
  for(const f of plan){const half=f.source===0?.1:.08,p=f.vertices.map(v=>v.p);
    solidCells.push([...p.map(v=>point(v[0],v[2],half)),...p.map(v=>point(v[0],v[2],-half))].map(p=>p.map(Math.fround) as P3));
    // Local CCW (s,y) maps to the right-handed (s,y,w) frame.
    faces.push({source:-1,material:3,vertices:wrap(p.map(v=>point(v[0],v[2],half)).toReversed())},{source:-1,material:3,vertices:wrap(p.map(v=>point(v[0],v[2],-half)))});
    for(let i=0;i<3;i++){const a=p[i]!,b=p[(i+1)%3]!,ak=a.join(','),bk=b.join(','),key=ak<bk?ak+'|'+bk:bk+'|'+ak,rows=edges.get(key)??[];rows.push({a,b,half});edges.set(key,rows);}
  }
  for(const [key,rows] of edges){assert.ok(rows.length<=2,`Truss ${chain.id}/${side} plan edge ${key} has ${rows.length} incident cells.`);const first=rows[0]!,other=rows[1];if(other&&first.half===other.half)continue;
    const row=other&&other.half>first.half?other:first,inner=other?Math.min(first.half,other.half):0;
    for(const [lo,hi]of other?[[-row.half,-inner],[inner,row.half]]:[[-row.half,row.half]])faces.push(...triangulate({source:-1,material:3,vertices:wrap([point(row.a[0],row.a[2],lo!),point(row.a[0],row.a[2],hi!),point(row.b[0],row.b[2],hi!),point(row.b[0],row.b[2],lo!)])}));
  }
  const stored=refineStored(conform(faces).faces,`truss ${chain.id}/${side}`),census=topology(stored.faces);
  assert.deepEqual([census.degenerate,census.boundary,census.nonManifold,census.wrongWinding],[0,0,0,0],`Truss ${chain.id}/${side} stored topology is not a closed consistently wound union.`);
  assert.ok(census.signedVolume>0,`Truss ${chain.id}/${side} has reversed volume.`);
  const lengths=panels.slice(1).map((s,i)=>{const a=point(panels[i]!,0,-side*1.5),b=point(s,0,-side*1.5);return Math.hypot(b[0]-a[0],b[2]-a[2]);});
  assert.ok(lengths.every(n=>n<=6),`Truss ${chain.id}/${side} exceeds the 6m source-arc panel bound.`);
  return{faces:stored.faces,details:{track:chain.id,side,from:from.z,to:to.z,sourceArc:arc,knots,panels,lengths,solidCells,planChanges:admission.changes,refinement:{inserted:stored.inserted,changed:stored.changed},census}};
}
