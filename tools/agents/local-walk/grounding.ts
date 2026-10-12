import {inputProfile} from './profile.mjs';
import {projectPath} from './paths.mjs';
/** Review149 pure displayed-pose prototype. No slot writer or production permit. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMesh} from '../../../src/world/mesh.ts';
import {counterclockwise,convexHull,partitionConvex,signedArea,uncovered} from '../../../src/agents/core/planar.ts';
export const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export const area=(ring:any[])=>Math.abs(signedArea(ring));
export const height=(t:any,p:any)=>t.a.y+t.dx*(p.x-t.a.x)+t.dz*(p.z-t.a.z);
export const weights=(t:any,p:any)=>{const u=((p.x-t.a.x)*(t.c.z-t.a.z)-(p.z-t.a.z)*(t.c.x-t.a.x))/t.det,v=((t.b.x-t.a.x)*(p.z-t.a.z)-(t.b.z-t.a.z)*(p.x-t.a.x))/t.det;return [u,v,1-u-v];};
export function ownedTriangle(mesh:string,index:number,vertices:any[]){
 if(mesh!=='pavements'||index<402706||index>=460443)throw Error('wrong-level-or-owner');
 const [a,b,c]=vertices,det=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);if(Math.abs(det)<1e-12)return null;
 const dx=((b.y-a.y)*(c.z-a.z)-(c.y-a.y)*(b.z-a.z))/det,dz=((b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y))/det;
 return {mesh,index,vertices,a,b,c,det,dx,dz,ny:1/Math.hypot(dx,dz,1),ring:counterclockwise(vertices.map(p=>[p.x,p.z]))};
}
export function loadOwnedHero(project:string,profile="historical"){
 const inputs:any[]=[];
 for(const binding of inputProfile(profile).heroInputs){const bytes=readFileSync(projectPath(project,binding.path)),sha256=hash(bytes);if(sha256!==binding.sha256||bytes.length!==binding.bytes)throw Error('Walker '+profile+' hero input '+binding.path+' differs; restore this profile’s exact reviewed bytes before bounded preparation');inputs.push({path:binding.path,sha256});}
 const mesh=decodeMesh(readFileSync(projectPath(project,'data/scene/pavements.mesh'))),triangles:any[]=[],cells=new Map<string,any[]>();
 for(let i=402706;i<460443;i++){const vertices=[0,1,2].map(k=>{const n=mesh.indices[i*3+k]!*3;return {x:mesh.positions[n]!,y:mesh.positions[n+1]!,z:mesh.positions[n+2]!};}),t=ownedTriangle('pavements',i,vertices);if(!t)continue;triangles.push(t);
 for(let x=Math.floor(Math.min(t.a.x,t.b.x,t.c.x)/4);x<=Math.floor(Math.max(t.a.x,t.b.x,t.c.x)/4);x++)for(let z=Math.floor(Math.min(t.a.z,t.b.z,t.c.z)/4);z<=Math.floor(Math.max(t.a.z,t.b.z,t.c.z)/4);z++){const key=x+','+z,bucket=cells.get(key);if(bucket)bucket.push(t);else cells.set(key,[t]);}}
 const nearby=(ring:any[])=>{const set=new Set<any>();for(let x=Math.floor(Math.min(...ring.map(p=>p[0]))/4);x<=Math.floor(Math.max(...ring.map(p=>p[0]))/4);x++)for(let z=Math.floor(Math.min(...ring.map(p=>p[1]))/4);z<=Math.floor(Math.max(...ring.map(p=>p[1]))/4);z++)for(const t of cells.get(x+','+z)??[])set.add(t);return [...set];};
 return {productionReady:false,inputs,triangles,nearby};
}
export function cover(ring:any[],floors:any[]){
 const touching=floors.filter(t=>area(partitionConvex(ring,t.ring).inside)>1e-12),missingM2=uncovered(ring,touching.map(t=>t.ring)).reduce((s,r)=>s+area(r),0);
 if(missingM2>1e-12)return {ok:false,reason:'missing-complete-footprint-patch',missingM2,touching};
 for(let i=0;i<touching.length;i++)for(let j=i+1;j<touching.length;j++){const a=touching[i],b=touching[j],both=partitionConvex(partitionConvex(ring,a.ring).inside,b.ring).inside;
 if(area(both)>1e-12&&both.some(q=>Math.abs(height(a,{x:q[0],z:q[1]})-height(b,{x:q[0],z:q[1]}))>1e-5))return {ok:false,reason:'competing-owned-levels',a:a.index,b:b.index,touching};}
 return {ok:true,touching,missingM2};
}
export function groundedPose(logical:any,footprintRing:any[],floors:any[],generation=1){
 const coverage=cover(footprintRing,floors);if(!coverage.ok)return coverage;
 const anchors=coverage.touching.filter(t=>Math.min(...weights(t,logical))>=-1e-10).map(t=>({triangle:t.index,y:height(t,logical)}));if(!anchors.length)return {ok:false,reason:'missing-anchor'};
 const y=anchors[0]!.y;if(anchors.some(a=>Math.abs(a.y-y)>1e-5))return {ok:false,reason:'ambiguous-anchor'};
 return {ok:true,productionReady:false,logical:{...logical},displayed:{...logical,y:Math.fround(y)},supportNormal:{x:0,y:1,z:0},generation,anchorTriangle:anchors[0]!.triangle};
}
/** A core trace is a read-only piecewise physical height law, not endpoint-Y lerp. */
export function groundTrace(from:any,to:any,floors:any[],generation=1){
 const spans:any[]=[];for(const t of floors){const a=weights(t,from),b=weights(t,to);let lo=0,hi=1;for(let i=0;i<3;i++){const d=b[i]!-a[i]!;if(d===0){if(a[i]!<-1e-10){hi=-1;break;}}else if(d>0)lo=Math.max(lo,-a[i]!/d);else hi=Math.min(hi,-a[i]!/d);}if(lo<=hi&&hi>=0&&lo<=1)spans.push({lo:Math.max(0,lo),hi:Math.min(1,hi),triangle:t});}
 const knots=[0,1,...spans.flatMap(s=>[s.lo,s.hi])].sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>1e-12),pieces:any[]=[];
 for(let i=0;i<knots.length-1;i++){const lo=knots[i],hi=knots[i+1],mid=(lo+hi)/2,owners=spans.filter(s=>s.lo<=mid&&s.hi>=mid);if(!owners.length)return {ok:false,reason:'support-exit-or-gap',fraction:lo};const point=(u:number)=>({x:from.x+(to.x-from.x)*u,z:from.z+(to.z-from.z)*u}),first=owners[0].triangle;
 if(owners.some(o=>[lo,hi].some(u=>Math.abs(height(o.triangle,point(u))-height(first,point(u)))>1e-5)))return {ok:false,reason:'competing-owned-levels'};
 const y0=height(first,point(lo)),y1=height(first,point(hi));if(pieces.length&&Math.abs(pieces.at(-1).y1-y0)>1e-5)return {ok:false,reason:'displayed-height-discontinuity',fraction:lo};pieces.push({lo,hi,y0,y1,triangle:first.index});}
 return {ok:true,productionReady:false,from:{...from},to:{...to},generation,pieces};
}
export function sampleGroundTrace(trace:any,alpha:number,generation:number){if(!trace.ok)throw Error('Cannot sample refused ground trace');if(trace.generation!==generation)throw Error('generation-mismatch');const t=Math.max(0,Math.min(1,alpha)),p=trace.pieces.find((p:any)=>p.lo<=t&&p.hi>=t);if(!p)throw Error('missing-trace-piece');return {x:trace.from.x+(trace.to.x-trace.from.x)*t,y:p.y0+(p.y1-p.y0)*(p.hi===p.lo?0:(t-p.lo)/(p.hi-p.lo)),z:trace.from.z+(trace.to.z-trace.from.z)*t};}
export {convexHull};
