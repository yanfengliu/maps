import type { VehicleAsset } from "../world/agent-assets.ts";
import { VEHICLE_WHEEL_OFFSET_LIMIT_METRES, writeSupportBasis } from "../world/agent-poses.ts";
import type { Junction, WorldPoint } from "../world/network-data.ts";
import { ADMISSION_BOUNDS, assertSupportedFootprint } from "./admission-bounds.ts";
import { occupiesJunction } from "./geometry.ts";

export interface ActorFootprint {
  /** Collision centre; projected bodies retain the distinct rendered origin. */
  position:WorldPoint;headingRadians:number;lengthM:number;widthM:number;
  origin?:WorldPoint;supportNormal?:WorldPoint;hull?:readonly WorldPoint[];envelopeDiameterM?:number;
  vehicle?:Readonly<{classId:VehicleAsset["id"];scale:number}>;
}
const projected=new WeakSet<object>();
/** Actual asset bounds plus collision padding and supported wheel travel, never nominal body dimensions. */
export function vehicleEnvelope(asset:VehicleAsset,scale=1){
  const min=asset.bounds.min,max=asset.bounds.max;
  if(!Number.isFinite(scale)||scale<=0||min.length!==3||max.length!==3||![...min,...max,asset.collision.length,asset.collision.width].every(Number.isFinite)||asset.collision.length<=0||asset.collision.width<=0||min.some((v,i)=>v>=max[i]!))throw new Error(`Vehicle ${asset.id} needs finite ordered generated bounds, positive collision dimensions and scale.`);
  const width=Math.max(max[0]!-min[0]!,asset.collision.width),length=Math.max(max[2]!-min[2]!,asset.collision.length),height=max[1]!-min[1]!+2*VEHICLE_WHEEL_OFFSET_LIMIT_METRES;
  const diameter=Math.hypot(width,length,height)*scale;
  if(diameter>ADMISSION_BOUNDS.maxFootprintDiagonalM+1e-9)throw new Error(`Vehicle ${asset.id} supported 3D envelope ${diameter} m at scale ${scale} exceeds the ${ADMISSION_BOUNDS.maxFootprintDiagonalM} m network bound; rebuild and review grouping before admission.`);
  return{width:width*scale,length:length*scale,height:height*scale,diameter,centre:{x:(min[0]!+max[0]!)*scale/2,y:(min[1]!+max[1]!)*scale/2,z:(min[2]!+max[2]!)*scale/2}};
}
export function projectVehicleFootprint(asset:VehicleAsset,origin:WorldPoint,yaw:number,normal:WorldPoint,scale=1,wheelOffsets:readonly number[]=[]):ActorFootprint {
  if(![origin.x,origin.y,origin.z].every(Number.isFinite)||wheelOffsets.some(v=>!Number.isFinite(v)||Math.abs(v)>Math.fround(VEHICLE_WHEEL_OFFSET_LIMIT_METRES)))throw new Error(`Vehicle ${asset.id} has an invalid pose or wheel residual outside supported travel.`);
  const envelope=vehicleEnvelope(asset,scale),basis=new Float64Array(9);writeSupportBasis(yaw,normal.x,normal.y,normal.z,basis);
  if(!basis.every(Number.isFinite))throw new Error(`Vehicle ${asset.id} support normal cannot produce a finite projected heading basis.`);
  const transform=(x:number,y:number,z:number):WorldPoint=>({x:origin.x+basis[0]!*x+basis[3]!*y+basis[6]!*z,y:origin.y+basis[1]!*x+basis[4]!*y+basis[7]!*z,z:origin.z+basis[2]!*x+basis[5]!*y+basis[8]!*z});
  const points:WorldPoint[]=[];for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])points.push(transform(envelope.centre.x+x*envelope.width,envelope.centre.y+y*envelope.height,envelope.centre.z+z*envelope.length));
  points.sort((a,b)=>a.x-b.x||a.z-b.z);const cross=(a:WorldPoint,b:WorldPoint,c:WorldPoint)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const half=(ordered:WorldPoint[])=>{const result:WorldPoint[]=[];for(const p of ordered){while(result.length>=2&&cross(result.at(-2)!,result.at(-1)!,p)<=0)result.pop();result.push(p);}result.pop();return result;};
  const hull=Object.freeze([...half(points),...half(points.toReversed())].map(p=>Object.freeze(p))),footprint:ActorFootprint=Object.freeze({position:Object.freeze(transform(envelope.centre.x,envelope.centre.y,envelope.centre.z)),origin:Object.freeze({...origin}),headingRadians:yaw,supportNormal:Object.freeze({x:basis[3]!,y:basis[4]!,z:basis[5]!}),lengthM:envelope.length,widthM:envelope.width,hull,envelopeDiameterM:envelope.diameter,vehicle:Object.freeze({classId:asset.id,scale})});projected.add(footprint);return footprint;
}
export function validateActorFootprint(footprint:ActorFootprint):void {
  if(!footprint||![footprint.position?.x,footprint.position?.y,footprint.position?.z,footprint.headingRadians].every(Number.isFinite))throw new Error("Actor footprint needs a finite collision centre and heading.");
  if(footprint.hull){if(!projected.has(footprint)||!footprint.envelopeDiameterM||footprint.envelopeDiameterM>ADMISSION_BOUNDS.maxFootprintDiagonalM+1e-9)throw new Error("Tilted vehicle footprint must come from projectVehicleFootprint with the generated asset bounds.");}
  else assertSupportedFootprint(footprint);
}
export function footprintVertices(f:ActorFootprint):readonly WorldPoint[]{
  if(f.hull)return f.hull;const s=Math.sin(f.headingRadians),c=Math.cos(f.headingRadians);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:f.position.x+x!*f.widthM/2*c+z!*f.lengthM/2*s,y:f.position.y,z:f.position.z-x!*f.widthM/2*s+z!*f.lengthM/2*c}));
}
export function footprintRadius(f:ActorFootprint):number{return(f.envelopeDiameterM??Math.hypot(f.lengthM,f.widthM))/2;}
export function footprintOccupies(j:Junction,f:ActorFootprint):boolean {
  if(!f.hull)return occupiesJunction(j,f.position,f.headingRadians,f.lengthM,f.widthM);
  return(j.conflictAreas??[j]).some(area=>{let inside=true;for(let i=0;i<f.hull!.length;i++){
    const a=f.hull![i]!,b=f.hull![(i+1)%f.hull!.length]!,dx=b.x-a.x,dz=b.z-a.z,px=area.position.x-a.x,pz=area.position.z-a.z;
    if(dx*pz-dz*px<0)inside=false;const t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(dx*dx+dz*dz)));
    if(Math.hypot(px-dx*t,pz-dz*t)<area.radiusM-1e-6)return true;
  }return inside;});
}
