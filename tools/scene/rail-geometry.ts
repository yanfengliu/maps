/** Bounded offline geometry for the Shibuya rail candidate. No source or scene writer. */
import { Vector3 } from "three";
import { counterclockwise, partitionConvex, signedArea } from "../../src/agents/core/planar.ts";
export type P2 = [number, number];
export type P3 = [number, number, number];
export interface Vertex { p: P3; weights: number[] }
export interface HalfPlane { n: P3; d: number }
export interface Face { vertices: Vertex[]; source: number; material: number }
export const EPS = 1e-8;
export const area = (p: readonly P2[]): number => Math.abs(signedArea(p));
export function area3(v: readonly Vertex[]): number { let a=0; for(let i=2;i<v.length;i++) a+=new Vector3(...v[i-1]!.p).sub(new Vector3(...v[0]!.p)).cross(new Vector3(...v[i]!.p).sub(new Vector3(...v[0]!.p))).length()/2; return a; }
export function split(vertices: readonly Vertex[], plane: HalfPlane): { inside: Vertex[]; outside: Vertex[] } {
  const d=(v:Vertex):number=>v.p[0]*plane.n[0]+v.p[1]*plane.n[1]+v.p[2]*plane.n[2]+plane.d;
  if(vertices.every(v=>Math.abs(d(v))<=EPS)) return {inside:[...vertices],outside:[]};
  const inside:Vertex[]=[],outside:Vertex[]=[];
  for(let i=0;i<vertices.length;i++){const a=vertices[i]!,b=vertices[(i+1)%vertices.length]!,da=d(a),db=d(b);if(da>=-EPS)inside.push(a);if(da<=EPS)outside.push(a);if(da*db<0&&Math.abs(da)>EPS&&Math.abs(db)>EPS){const t=da/(da-db);const v:Vertex={p:a.p.map((x,k)=>x+(b.p[k]!-x)*t) as P3,weights:a.weights.map((x,k)=>x+(b.weights[k]!-x)*t)};inside.push(v);outside.push(v);}}
  return {inside,outside};
}
export function subtract(poly: readonly Vertex[], planes: readonly HalfPlane[]): {inside:Vertex[];outside:Vertex[][]} {
  let inside=[...poly];const outside:Vertex[][]=[];
  for(const plane of planes){const s=split(inside,plane);if(area3(s.outside)>1e-12)outside.push(s.outside);inside=s.inside;if(area3(inside)<1e-12)return{inside:[],outside};}return{inside,outside};
}
export function clip(poly: readonly Vertex[], planes: readonly HalfPlane[]): Vertex[] {let p=[...poly];for(const plane of planes)p=split(p,plane).inside;return area3(p)>1e-12?p:[];}
export function wrap(points: readonly P3[]): Vertex[] {return points.map((p,i)=>({p,weights:points.map((_,j)=>+(i===j))}));}
export function prism(poly: readonly P2[], bottom:number,top:number): HalfPlane[] {
  return [...poly.map((a,i)=>{const b=poly[(i+1)%poly.length]!,dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);return{n:[-dz/L,0,dx/L] as P3,d:(dz*a[0]-dx*a[1])/L};}),{n:[0,1,0] as P3,d:-bottom},{n:[0,-1,0] as P3,d:top}];
}
export function triangulate(face: Face): Face[] {return face.vertices.slice(2).map((v,i)=>({...face,vertices:[face.vertices[0]!,face.vertices[i+1]!,v]}));}
export const box2=(p:readonly P2[]):[number,number,number,number]=>[Math.min(...p.map(v=>v[0])),Math.max(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[1]))];
export const overlap=(a:readonly number[],b:readonly number[]):boolean=>!(a[1]!<b[0]!||a[0]!>b[1]!||a[3]!<b[2]!||a[2]!>b[3]!);

/** A disjoint convex partition of a polygon union. Shared internal boundaries are not walls. */
export function unionPieces(polygons: readonly (readonly P2[])[]): P2[][] {
  const out:P2[][]=[];const bounds:[number,number,number,number][]=[];
  for(const original of polygons){let ps:P2[][]=[counterclockwise(original) as P2[]];const bb=box2(original);for(let i=0;i<out.length&&ps.length;i++){if(!overlap(bb,bounds[i]!))continue;ps=ps.flatMap(p=>partitionConvex(p,out[i]!).outside as P2[][]);}for(const p of ps)if(area(p)>1e-10){out.push(p);bounds.push(box2(p));}}
  return out;
}

/** Closed surface census uses the actual Float32 positions, with no tolerance weld. */
export function topology(faces: readonly Face[]): {triangles:number;degenerate:number;boundary:number;nonManifold:number;wrongWinding:number;signedVolume:number} {
  const edges=new Map<string,{count:number;balance:number}>();let degenerate=0,signedVolume=0,triangles=0;
  for(const face of faces)for(const t of triangulate(face)){const p=t.vertices.map(v=>v.p.map(Math.fround) as P3),keys=p.map(v=>v.join(','));triangles++;if(area3(wrap(p))<1e-14){degenerate++;continue;}signedVolume+=new Vector3(...p[0]!).dot(new Vector3(...p[1]!).cross(new Vector3(...p[2]!)))/6;for(let i=0;i<3;i++){const a=keys[i]!,b=keys[(i+1)%3]!,key=a<b?a+'|'+b:b+'|'+a,r=edges.get(key)??{count:0,balance:0};r.count++;r.balance+=a<b?1:-1;edges.set(key,r);}}
  const values=[...edges.values()];return{triangles,degenerate,boundary:values.filter(v=>v.count===1).length,nonManifold:values.filter(v=>v.count>2).length,wrongWinding:values.filter(v=>v.count===2&&v.balance!==0).length,signedVolume};
}

/** Quantize once and split T-junctions using only existing vertices on the same edge.
 * Canonical rounding is bounded at 0.1 micrometre before Float32 storage; it is
 * not a visible coordinate fit or a source-centreline rewrite. */
export function conform(faces: readonly Face[]): {faces:Face[];maximumSnap:number;inserted:number;collapsedPairs:number} {
  const vertices=new Map<string,P3>();let maximumSnap=0;
  const canonical=(p:P3):P3=>{const key=p.map(x=>Math.round(x*1e7)).join(','),old=vertices.get(key);if(old)return old;vertices.set(key,p);return p;};
  const all=faces.map(f=>({...f,vertices:f.vertices.map(v=>({...v,p:canonical(v.p)}))}));
  const pool=[...new Map([...vertices.values()].map(p=>[p.join(','),p])).values()],grid=new Map<string,P3[]>(),size=2;
  for(const p of pool){const key=p.map(x=>Math.floor(x/size)).join(',');const bucket=grid.get(key)??[];bucket.push(p);grid.set(key,bucket);}
  const splitEdge=(a:Vertex,b:Vertex):Vertex[]=>{const dx=b.p.map((x,k)=>x-a.p[k]!),L2=dx.reduce((s,x)=>s+x*x,0);if(L2===0)return[];const found:{t:number;p:P3}[]=[];
    const lo=a.p.map((x,k)=>Math.floor((Math.min(x,b.p[k]!)-.0000001)/size)),hi=a.p.map((x,k)=>Math.floor((Math.max(x,b.p[k]!)+.0000001)/size));
    for(let x=lo[0]!;x<=hi[0]!;x++)for(let y=lo[1]!;y<=hi[1]!;y++)for(let z=lo[2]!;z<=hi[2]!;z++)for(const p of grid.get(`${x},${y},${z}`)??[]){const t=p.reduce((s,x,k)=>s+(x-a.p[k]!)*dx[k]!,0)/L2;if(t<=1e-7||t>=1-1e-7)continue;const err=Math.hypot(...p.map((x,k)=>x-a.p[k]!-dx[k]!*t));if(err<=2e-8)found.push({t,p});}
    return found.sort((a,b)=>a.t-b.t).map(v=>({p:v.p,weights:a.weights.map((x,k)=>x+(b.weights[k]!-x)*v.t)}));};
  let inserted=0;const result:Face[]=[];
  for(const f of all){const ring:Vertex[]=[];for(let i=0;i<f.vertices.length;i++){const a=f.vertices[i]!,b=f.vertices[(i+1)%f.vertices.length]!,ps=splitEdge(a,b);ring.push(a,...ps);inserted+=ps.length;}
    if(ring.length===3){if(area3(ring)>1e-14)result.push({...f,vertices:ring});continue;}
    const centre:Vertex={p:[0,1,2].map(k=>ring.reduce((s,v)=>s+v.p[k]!,0)/ring.length) as P3,weights:f.vertices[0]!.weights.map((_,k)=>ring.reduce((s,v)=>s+v.weights[k]!,0)/ring.length)};
    for(let i=0;i<ring.length;i++){const v=[centre,ring[i]!,ring[(i+1)%ring.length]!];if(area3(v)>1e-14)result.push({...f,vertices:v});}
  }
  const stored=result.map(f=>({...f,vertices:f.vertices.map(v=>{const p=v.p.map(Math.fround) as P3;maximumSnap=Math.max(maximumSnap,Math.hypot(...p.map((x,k)=>x-v.p[k]!)));return{...v,p};})})).filter(f=>area3(f.vertices)>1e-14);
  // A sliver can collapse to an exactly reversed triangle pair in Float32.
  // Cancel only within the same source face/material (or authored return), never
  // between two distinct source faces such as a two-sided source panel.
  const pending=new Map<string,{index:number;orientation:number}[]>(),removed=new Set<number>();let collapsedPairs=0;
  for(const [index,f]of stored.entries()){const keys=f.vertices.map(v=>v.p.join(',')),sorted=keys.toSorted(),key=`${f.source}/${f.material}/`+sorted.join('|'),orientation=(keys[1]===sorted[(sorted.indexOf(keys[0]!)+1)%3]?1:-1),rows=pending.get(key)??[],opposite=rows.findIndex(r=>r.orientation!==orientation);if(opposite>=0){removed.add(rows[opposite]!.index);removed.add(index);rows.splice(opposite,1);collapsedPairs++;}else rows.push({index,orientation});pending.set(key,rows);}
  return{faces:stored.filter((_,i)=>!removed.has(i)),maximumSnap,inserted,collapsedPairs};
}

/** Source-solid section, even/odd fill including holes. The only authored source
 * closure admitted here is one pair of unambiguous tips no farther than 1 mm. */
export function solidSection(triangles:readonly P3[][],plane:HalfPlane,identity:string):{faces:Face[];connector:number|null} {
  const n=new Vector3(...plane.n).normalize(),origin=n.clone().multiplyScalar(-plane.d),u=(Math.abs(n.y)<.9?new Vector3(0,1,0):new Vector3(1,0,0)).cross(n).normalize(),v=n.clone().cross(u).normalize();
  const project=(p:P3):P2=>{const q=new Vector3(...p).sub(origin);return[q.dot(u),q.dot(v)];},world=(p:P2):P3=>origin.clone().addScaledVector(u,p[0]).addScaledVector(v,p[1]).toArray() as P3;
  const segments:[P2,P2][]=[];
  for(const points of triangles){const ds=points.map(p=>n.dot(new Vector3(...p))+plane.d);if(Math.min(...ds)>1e-7||Math.max(...ds)<-1e-7)continue;const hits:P2[]=[];const add=(p:P3):void=>{const q=project(p);if(!hits.some(h=>Math.hypot(h[0]-q[0],h[1]-q[1])<1e-7))hits.push(q);};for(let i=0;i<3;i++){const a=points[i]!,b=points[(i+1)%3]!,d=ds[i]!,e=ds[(i+1)%3]!;if(Math.abs(d)<=1e-7)add(a);if(d*e<0&&Math.abs(d)>1e-7&&Math.abs(e)>1e-7){const t=d/(d-e);add(a.map((x,k)=>x+(b[k]!-x)*t) as P3);}}if(hits.length===2)segments.push([hits[0]!,hits[1]!]);}
  if(!segments.length)return{faces:[],connector:null};
  const vertices:{p:P2;degree:number}[]=[];const edges=new Set<string>();
  for(const s of segments){const ids=s.map(p=>{let i=vertices.findIndex(v=>Math.hypot(v.p[0]-p[0],v.p[1]-p[1])<1e-7);if(i<0){i=vertices.length;vertices.push({p,degree:0});}return i;});if(ids[0]===ids[1])continue;const key=ids.toSorted((a,b)=>a-b).join(':');if(edges.has(key))throw Error(`Rail section ${identity} contains duplicate source slice edges; no inferred fill is admitted.`);edges.add(key);vertices[ids[0]!]!.degree++;vertices[ids[1]!]!.degree++;}
  const odd=vertices.filter(v=>v.degree%2);let connector:number|null=null;
  if(odd.length){if(odd.length!==2||odd.some(v=>v.degree!==1))throw Error(`Rail section ${identity} has ${odd.length} ambiguous open tips; source-solid adaptation refused.`);const a=odd[0]!.p,b=odd[1]!.p;connector=Math.hypot(a[0]-b[0],a[1]-b[1]);if(connector>.001)throw Error(`Rail section ${identity} needs a ${connector}m connector, exceeding the reviewed 0.001m bound.`);segments.push([a,b]);}
  const ss=segments.map(s=>s.toSorted((a,b)=>a[0]-b[0]) as [P2,P2]).filter(s=>s[1][0]-s[0][0]>1e-7),at=(s:[P2,P2],x:number):number=>s[0][1]+(s[1][1]-s[0][1])*(x-s[0][0])/(s[1][0]-s[0][0]);
  const knots=segments.flatMap(s=>s.map(p=>p[0]));for(let i=0;i<ss.length;i++)for(let j=i+1;j<ss.length;j++){const a=ss[i]!,b=ss[j]!,lo=Math.max(a[0][0],b[0][0]),hi=Math.min(a[1][0],b[1][0]);if(hi-lo<=1e-7)continue;const x=at(a,lo)-at(b,lo),y=at(a,hi)-at(b,hi);if(x*y<0)knots.push(lo+(hi-lo)*x/(x-y));}
  const zs=knots.toSorted((a,b)=>a-b).filter((x,i,a)=>i===0||x-a[i-1]!>1e-7),faces:Face[]=[];
  for(let i=1;i<zs.length;i++){const a=zs[i-1]!,b=zs[i]!,mid=(a+b)/2,rows=ss.filter(s=>s[0][0]<mid&&s[1][0]>mid).sort((a,b)=>at(a,mid)-at(b,mid));if(rows.length%2)throw Error(`Rail section ${identity} has an odd slice crossing count; no solid region is established.`);for(let j=0;j<rows.length;j+=2){const lo=rows[j]!,hi=rows[j+1]!,p:P2[]=[[a,at(lo,a)],[b,at(lo,b)],[b,at(hi,b)],[a,at(hi,a)]];if(area(p)<1e-12)continue;faces.push({source:-1,material:-1,vertices:wrap(p.map(world))});}}
  return{faces,connector};
}

/** Preserve source shells that merely touch at a non-manifold edge as separate
 * source components. This does not join, delete or move any source triangle. */
export function sourceComponents(triangles:readonly P3[][]):number[][] {
  const edges=new Map<string,number[]>();for(const[i,t]of triangles.entries())for(let j=0;j<3;j++){const a=t[j]!.map(Math.fround).join(','),b=t[(j+1)%3]!.map(Math.fround).join(','),key=a<b?a+'|'+b:b+'|'+a;const rows=edges.get(key)??[];rows.push(i);edges.set(key,rows);}
  const neighbours=triangles.map(()=>[] as number[]);for(const rows of edges.values())if(rows.length===2){neighbours[rows[0]!]!.push(rows[1]!);neighbours[rows[1]!]!.push(rows[0]!);}
  const seen=new Set<number>(),result:number[][]=[];for(let i=0;i<triangles.length;i++){if(seen.has(i))continue;const todo=[i],part:number[]=[];while(todo.length){const j=todo.pop()!;if(seen.has(j))continue;seen.add(j);part.push(j);todo.push(...neighbours[j]!);}result.push(part);}return result;
}

/** Exact, oppositely wound duplicate triangles are a two-sided zero-thickness
 * panel. Keep them in the presented source; omit only from solid-volume slicing. */
export function volumeTriangles(triangles:readonly P3[][]):{triangles:P3[][];panels:number[][]} {
  const groups=new Map<string,number[]>();triangles.forEach((t,i)=>{const key=t.map(p=>p.join(',')).sort().join('|'),g=groups.get(key)??[];g.push(i);groups.set(key,g);});
  const omitted=new Set<number>(),panels:number[][]=[];
  for(const rows of groups.values()){if(rows.length===1)continue;if(rows.length!==2)throw Error('Source solid has more than two exactly coincident triangles; a bounded source review is required.');const normal=(t:P3[]):Vector3=>new Vector3(...t[1]!).sub(new Vector3(...t[0]!)).cross(new Vector3(...t[2]!).sub(new Vector3(...t[0]!))).normalize();if(normal(triangles[rows[0]!]!).dot(normal(triangles[rows[1]!]!))>-.999999999)throw Error('Source solid has duplicate triangles with equal winding; no solid-volume inference is admitted.');rows.forEach(i=>omitted.add(i));panels.push(rows);}
  return{triangles:triangles.filter((_,i)=>!omitted.has(i)),panels};
}
