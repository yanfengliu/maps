/** Review145: existing Float32 points split exact collinear edges. No fitting. */
import assert from "node:assert/strict";
import { topology, type Face, type P3, type Vertex } from "./rail-geometry.ts";

type Q3 = [bigint, bigint, bigint];
const bits = new DataView(new ArrayBuffer(4));
const cache = new Map<number, bigint>();
function exact(x: number): bigint {
  assert.ok(Number.isFinite(x) && Math.fround(x) === x, `Stored rail point ${x} must already be finite Float32.`);
  const old = cache.get(x); if (old !== undefined) return old;
  bits.setFloat32(0, x); const b = bits.getUint32(0), e = (b >>> 23) & 255;
  const m = (b & 0x7fffff) | (e ? 0x800000 : 0);
  const value = (BigInt(m) << BigInt(e ? e - 1 : 0)) * (b >>> 31 ? -1n : 1n);
  cache.set(x, value); return value;
}
const q = (p: P3): Q3 => p.map(exact) as Q3;
const sub = (a: Q3, b: Q3): Q3 => a.map((v, i) => v - b[i]!) as Q3;
const cross = (a: Q3, b: Q3): Q3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a: Q3, b: Q3): bigint => a.reduce((s, v, i) => s + v*b[i]!, 0n);
function collinear(a: P3, b: P3, p: P3): boolean {
  const A=q(a), D=sub(q(b),A), P=sub(q(p),A), t=dot(P,D), L=dot(D,D);
  return t>0n && t<L && cross(D,P).every(v=>v===0n);
}
function ears(ring: Vertex[], normal: Q3, identity: string): Vertex[][] {
  const ori=(a:Vertex,b:Vertex,c:Vertex):bigint=>dot(cross(sub(q(b.p),q(a.p)),sub(q(c.p),q(a.p))),normal);
  const ids=ring.map((_,i)=>i), result:Vertex[][]=[];
  while(ids.length>3){let found=false;
    for(let i=0;i<ids.length;i++){
      const a=ids[(i-1+ids.length)%ids.length]!,b=ids[i]!,c=ids[(i+1)%ids.length]!;
      const A=ring[a]!,B=ring[b]!,C=ring[c]!;
      if(ori(A,B,C)<=0n)continue;
      if(ids.some(j=>j!==a&&j!==b&&j!==c&&ori(A,B,ring[j]!)>=0n&&ori(B,C,ring[j]!)>=0n&&ori(C,A,ring[j]!)>=0n))continue;
      result.push([A,B,C]);ids.splice(i,1);found=true;break;
    }
    assert.ok(found, `Stored rail refinement ${identity} has no positive ear; no vertex movement or inferred fill is allowed.`);
  }
  const last=ids.map(i=>ring[i]!);
  assert.ok(ori(last[0]!,last[1]!,last[2]!)>0n, `Stored rail refinement ${identity} has a nonpositive final ear.`);
  result.push(last);return result;
}

export function refineStored(faces: readonly Face[], identity: string): {faces:Face[];inserted:number;changed:number} {
  const pool=[...new Map(faces.flatMap(f=>f.vertices.map(v=>[v.p.join(','),v.p] as const))).values()];
  const grid=new Map<string,P3[]>(),size=4;
  for(const p of pool){q(p);const k=p.map(x=>Math.floor(x/size)).join(','),r=grid.get(k)??[];r.push(p);grid.set(k,r);}
  let inserted=0,changed=0;const output:Face[]=[];
  for(const [fi,f] of faces.entries()){
    assert.equal(f.vertices.length,3,`Stored rail refinement ${identity}/${fi} requires triangles.`);
    const ring:Vertex[]=[];
    for(let i=0;i<3;i++){
      const a=f.vertices[i]!,b=f.vertices[(i+1)%3]!,D=b.p.map((v,j)=>v-a.p[j]!);
      const axis=D.map(Math.abs).indexOf(Math.max(...D.map(Math.abs)));
      const lo=a.p.map((v,j)=>Math.floor(Math.min(v,b.p[j]!)/size)),hi=a.p.map((v,j)=>Math.floor(Math.max(v,b.p[j]!)/size));
      const inside:(Vertex&{t:number})[]=[];
      for(let x=lo[0]!;x<=hi[0]!;x++)for(let y=lo[1]!;y<=hi[1]!;y++)for(let z=lo[2]!;z<=hi[2]!;z++)for(const p of grid.get(`${x},${y},${z}`)??[]){
        if(p.some((v,j)=>v<Math.min(a.p[j]!,b.p[j]!)||v>Math.max(a.p[j]!,b.p[j]!)))continue;
        if(collinear(a.p,b.p,p)){const t=(p[axis]!-a.p[axis]!)/D[axis]!;inside.push({p,weights:a.weights.map((w,j)=>w+(b.weights[j]!-w)*t),t});}
      }
      inside.sort((a,b)=>a.t-b.t);ring.push(a,...inside);inserted+=inside.length;
    }
    if(ring.length===3){output.push(f);continue;}
    changed++;const normal=cross(sub(q(f.vertices[1]!.p),q(f.vertices[0]!.p)),sub(q(f.vertices[2]!.p),q(f.vertices[0]!.p)));
    for(const vertices of ears(ring,normal,`${identity}/${fi}`))output.push({...f,vertices});
  }
  return {faces:output,inserted,changed};
}

/** Exact edge identities, not merely the number of inherited defects. */
export function storedEdges(faces: readonly Face[]): {boundary:string[];nonManifold:string[];wrongWinding:string[]} {
  const edges=new Map<string,{count:number;balance:number}>();
  for(const f of faces){assert.equal(f.vertices.length,3);const keys=f.vertices.map(v=>v.p.map(Math.fround).join(','));
    for(let i=0;i<3;i++){const a=keys[i]!,b=keys[(i+1)%3]!,k=a<b?a+'|'+b:b+'|'+a,r=edges.get(k)??{count:0,balance:0};r.count++;r.balance+=a<b?1:-1;edges.set(k,r);}
  }
  return {boundary:[...edges].filter(([,r])=>r.count===1).map(([k])=>k).sort(),nonManifold:[...edges].filter(([,r])=>r.count>2).map(([k])=>k).sort(),wrongWinding:[...edges].filter(([,r])=>r.count===2&&r.balance!==0).map(([k])=>k).sort()};
}
export function admitStoredCut(source: readonly Face[], candidate: readonly Face[], identity: string): ReturnType<typeof storedEdges> {
  assert.ok(source.length>0 && candidate.length>0, `Rail cut ${identity} has absent source or replacement faces; an empty edge list is not a completed cut.`);
  const before=storedEdges(source),after=storedEdges(candidate),census=topology(candidate);
  assert.equal(census.degenerate,0,`Rail cut ${identity} contains degenerate stored triangles.`);
  assert.deepEqual(after,before,`Rail cut ${identity} changed inherited stored edge keys; no new opening, winding defect or nonmanifold edge is admitted.`);
  return after;
}
