import type { PlanPoint, VehicleSurfaceTriangle } from "../../src/world/vehicle-surfaces.ts";
import { convexHull, cross, partitionConvex, signedArea } from "../../src/agents/core/planar.ts";

/** Authored numerical crack repair, not missing road reconstruction. */
export const VEHICLE_SEAM_LIMITS = Object.freeze({widthM:.02,adjacentHeightDifferenceM:.005,overlapM:.0001});
const pointDistance = (p:PlanPoint,ring:readonly PlanPoint[]):number => {
  if(ring.every((a,i)=>cross(a,ring[(i+1)%ring.length]!,p)>=0))return 0;
  return Math.min(...ring.map((a,i)=>{const b=ring[(i+1)%ring.length]!,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);}));
};
const width = (ring:readonly PlanPoint[]):number => Math.min(...ring.map((a,i)=>{const b=ring[(i+1)%ring.length]!,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1e-10)return Infinity;const projections=ring.map(p=>(p[0]*dz-p[1]*dx)/length);return Math.max(...projections)-Math.min(...projections);}));
function height(t:VehicleSurfaceTriangle,p:PlanPoint):number {
  const [a,b,c]=t.vertices,den=cross([a[0],a[2]],[b[0],b[2]],[c[0],c[2]]),u=cross(p,[b[0],b[2]],[c[0],c[2]])/den,v=cross([a[0],a[2]],p,[c[0],c[2]])/den;
  return u*a[1]+v*b[1]+(1-u-v)*c[1];
}
export function reconcileVehicleSeam(gap:readonly PlanPoint[],allowed:readonly (readonly PlanPoint[])[],triangles:readonly VehicleSurfaceTriangle[],prefix:string,note?:(reason:string)=>void):{triangles:VehicleSurfaceTriangle[];maximumWidthM:number;maximumAdjacentHeightDifferenceM:number}|null {
  const maximumWidthM=width(gap);if(Math.abs(signedArea(gap))<1e-8||maximumWidthM>VEHICLE_SEAM_LIMITS.widthM)return null;
  const nearby=triangles.map(t=>({t,ring:t.vertices.map(v=>[v[0],v[2]] as PlanPoint)})).filter(({ring})=>gap.some(p=>pointDistance(p,ring)<=VEHICLE_SEAM_LIMITS.widthM));
  if(!nearby.length)return null;
  let maximumAdjacentHeightDifferenceM=0;
  const sample=(p:PlanPoint):number|null=>{
    const hits=nearby.map(({t,ring})=>({t,d:pointDistance(p,ring)})).filter(h=>h.d<=VEHICLE_SEAM_LIMITS.widthM).sort((a,b)=>a.d-b.d||a.t.id.localeCompare(b.t.id));
    if(!hits.length)return null;
    const heights=hits.map(h=>height(h.t,p)),spread=Math.max(...heights)-Math.min(...heights);maximumAdjacentHeightDifferenceM=Math.max(maximumAdjacentHeightDifferenceM,spread);
    if(spread>VEHICLE_SEAM_LIMITS.adjacentHeightDifferenceM)return null;
    return height(hits[0]!.t,p);
  };
  if(gap.some(p=>sample(p)===null)){note?.(`No bounded support on source gap: neighboring height spread ${maximumAdjacentHeightDifferenceM}m.`);return null;}
  const expanded=convexHull(gap.flatMap(([x,z])=>[-1,1].flatMap(dx=>[-1,1].map(dz=>[x+dx*VEHICLE_SEAM_LIMITS.overlapM,z+dz*VEHICLE_SEAM_LIMITS.overlapM] as PlanPoint))));
  const clipped=allowed.map(p=>partitionConvex(expanded,p).inside).filter(p=>Math.abs(signedArea(p))>1e-10),result:VehicleSurfaceTriangle[]=[],seen=new Set<string>();
  for(const p of clipped)for(let i=1;i+1<p.length;i++) {
    const face=[p[0]!,p[i]!,p[i+1]!],values=face.map(q=>sample(q));if(values.some(v=>v===null)){note?.(`No bounded support on emitted overlap: neighboring height spread ${maximumAdjacentHeightDifferenceM}m.`);return null;}
    const vertices=face.map(([x,z],j)=>[Math.fround(x),Math.fround(values[j]!),Math.fround(z)] as const),ring=vertices.map(v=>[v[0],v[2]] as PlanPoint);
    if(Math.abs(signedArea(ring))<1e-10)continue;
    const key=vertices.toSorted((a,b)=>a[0]-b[0]||a[2]-b[2]).map(v=>v.join(",")).join(";");if(seen.has(key))continue;seen.add(key);
    result.push({id:`${prefix}:${result.length}`,layerId:nearby[0]!.t.layerId,vertices:vertices as unknown as VehicleSurfaceTriangle["vertices"],source:nearby[0]!.t.source,provenance:"authored-seam-reconciliation",roadTriangleIds:[...new Set(nearby.flatMap(t=>t.t.roadTriangleIds))].sort((a,b)=>a-b)});
  }
  return result.length?{triangles:result,maximumWidthM,maximumAdjacentHeightDifferenceM}:null;
}
