import type { NetworkData } from "../../world/network-data.ts";
import { VEHICLE_CLASSES, type VehicleAssetManifest } from "../../world/agent-assets.ts";
import { validateControlHardware, CONTROL_HARDWARE_REBUILD } from "../../world/control-hardware.ts";
import type { VehicleSurfaces } from "../../world/vehicle-surfaces.ts";
import { decodeMesh } from "../../world/mesh.ts";
import { validateNetwork } from "../../network/validate.ts";
import { vehicleEnvelope } from "../../network/footprints.ts";
import { VehicleSurfaceQuery } from "./surfaces.ts";

/** Exact loaded bytes, including the fleet already selected for display. No
 * independently reserialized fleet may inherit hardware clearance. */
export interface VehicleMotionBytes {
  network:Uint8Array; vehicles:Uint8Array; surfaces:Uint8Array; overlay:Uint8Array;
  roads:Uint8Array; pavementSource:Uint8Array; pavements:Uint8Array; hardware:Uint8Array;
}
export interface VehicleMotionContext {
  readonly network:NetworkData;
  readonly fleet:VehicleAssetManifest;
  readonly surfaces:VehicleSurfaceQuery;
  readonly digests:Readonly<Record<keyof VehicleMotionBytes,string>>;
  readonly roadTriangleVerification:Readonly<{displayedTriangles:number;referencedTriangles:number;maximumPlaneDistanceM:number;maximumOutsideDistanceM:number;numericToleranceM:number}>;
}
const contexts=new WeakSet<object>();
export async function sha256(bytes:Uint8Array):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(bytes))),v=>v.toString(16).padStart(2,"0")).join("");}
const freeze=(value:unknown):void=>{if(value&&typeof value==="object"&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}};
export async function createVehicleMotionContext(input:VehicleMotionBytes):Promise<VehicleMotionContext> {
  // Copy before the first await: changing a caller's buffer during hashing
  // cannot swap the geometry that is subsequently parsed and certified.
  const keys=Object.keys(input) as (keyof VehicleMotionBytes)[],bytes=Object.fromEntries(keys.map(key=>[key,new Uint8Array(input[key])])) as unknown as VehicleMotionBytes;
  for(const key of ["network","vehicles","surfaces","overlay","roads","pavementSource","pavements","hardware"] as const)if(!bytes[key]?.length)throw new Error(`Vehicle motion is missing loaded ${key} bytes; supply the displayed scene inputs before admission.`);
  const digests=Object.fromEntries(await Promise.all(keys.map(async key=>[key,await sha256(bytes[key])])) ) as Record<keyof VehicleMotionBytes,string>;
  const parse=(key:keyof VehicleMotionBytes):unknown=>{try{return JSON.parse(new TextDecoder().decode(bytes[key]));}catch{throw new Error(`Vehicle motion ${key} input is not JSON; rebuild that scene artifact.`);}};
  const network=parse("network");validateNetwork(network);
  const fleet=parse("vehicles") as VehicleAssetManifest;
  if(fleet?.version!==1||fleet.units!=="metres"||fleet.up!=="+Y"||fleet.forward!=="+Z"||fleet.origin!=="ground-centre"||!Array.isArray(fleet.vehicles)||fleet.vehicles.length!==VEHICLE_CLASSES.length||fleet.vehicles.some((a,i)=>a.id!==VEHICLE_CLASSES[i]))throw new Error("Vehicle motion needs the displayed version1 kei/taxi/bus manifest in its fixed class order.");
  fleet.vehicles.forEach(a=>vehicleEnvelope(a));
  const surfaces=new VehicleSurfaceQuery(parse("surfaces") as VehicleSurfaces);
  for(const key of ["network","vehicles","roads","pavementSource"] as const)if(surfaces.data.inputs[key]!==digests[key])throw new Error(`Vehicle surface ${key} digest differs from the displayed input; rebuild the vehicle surface artifact before admission.`);
  if(surfaces.data.overlay.sha256!==digests.overlay)throw new Error("Vehicle support overlay differs from its certified surface bytes; rebuild and display the matching overlay before admission.");
  // The producer clips original triangles against source carriageway masks.
  // Each resulting triangle must stay on ONE referenced decoded triangle;
  // being on the same infinite plane or on an arbitrary union is insufficient.
  const roads=decodeMesh(bytes.roads),referenced=new Set<number>(),numericToleranceM=1e-6;
  let displayedTriangles=0,maximumPlaneDistanceM=0,maximumOutsideDistanceM=0;
  for(const triangle of surfaces.data.triangles){
    if(!Array.isArray(triangle.roadTriangleIds)||!triangle.roadTriangleIds.length||triangle.roadTriangleIds.some(id=>!Number.isInteger(id)||id<0||id>=roads.header.triangleCount))throw new Error(`Vehicle support ${triangle.id} has no valid referenced actual road triangle.`);
    if(triangle.provenance!=="displayed-road")continue;
    if(triangle.roadTriangleIds.length!==1)throw new Error(`Vehicle support ${triangle.id} must be clipped from one actual road triangle, not a plane union.`);
    const id=triangle.roadTriangleIds[0]!,original=[0,1,2].map(j=>{const v=roads.indices[id*3+j]!*3;return Array.from(roads.positions.subarray(v,v+3));});
    if(original.some(p=>p.length!==3||!p.every(Number.isFinite)))throw new Error(`Vehicle support ${triangle.id} references malformed actual road triangle ${id}.`);
    const [a,b,c]=original,ux=b![0]!-a![0]!,uy=b![1]!-a![1]!,uz=b![2]!-a![2]!,vx=c![0]!-a![0]!,vy=c![1]!-a![1]!,vz=c![2]!-a![2]!,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,normalLength=Math.hypot(nx,ny,nz),sign=Math.sign(ux*vz-uz*vx);
    if(!(normalLength>1e-12)||!sign)throw new Error(`Vehicle support ${triangle.id} references a degenerate actual road triangle ${id}.`);
    for(const p of triangle.vertices){
      const planeDistance=Math.abs((p[0]-a![0]!)*nx+(p[1]-a![1]!)*ny+(p[2]-a![2]!)*nz)/normalLength;let outsideDistance=0;
      for(let i=0;i<3;i++){const q=original[i]!,r=original[(i+1)%3]!,dx=r[0]!-q[0]!,dz=r[2]!-q[2]!,length=Math.hypot(dx,dz);outsideDistance=Math.max(outsideDistance,-sign*(dx*(p[2]-q[2]!)-dz*(p[0]-q[0]!))/length);}
      if(!Number.isFinite(planeDistance)||!Number.isFinite(outsideDistance)||planeDistance>numericToleranceM||outsideDistance>numericToleranceM)throw new Error(`Vehicle support ${triangle.id} does not lie on its actual road triangle ${id}: plane residual ${planeDistance} m, outside distance ${outsideDistance} m; rebuild the source-clipped support artifact.`);
      maximumPlaneDistanceM=Math.max(maximumPlaneDistanceM,planeDistance);maximumOutsideDistanceM=Math.max(maximumOutsideDistanceM,outsideDistance);
    }
    displayedTriangles++;referenced.add(id);
  }
  const overlay=decodeMesh(bytes.overlay),authored=surfaces.data.triangles.filter(t=>t.provenance==="authored-seam-reconciliation");
  if(overlay.header.triangleCount!==authored.length||surfaces.data.overlay.triangles!==authored.length)throw new Error("Vehicle support overlay does not contain every authored support triangle.");
  const key=(vertices:readonly (readonly number[])[])=>vertices.map(p=>p.join(",")).sort().join(";");
  for(let i=0;i<authored.length;i++){
    const vertices=[0,1,2].map(j=>{const v=overlay.indices[i*3+j]!*3;return Array.from(overlay.positions.subarray(v,v+3));});
    if(key(vertices)!==key(authored[i]!.vertices))throw new Error(`Vehicle overlay triangle ${i} differs from the actual support vertices; publish identical geometry.`);
    const [a,b,c]=vertices,up=(b![2]!-a![2]!)*(c![0]!-a![0]!)-(b![0]!-a![0]!)*(c![2]!-a![2]!);
    if(!(up>0))throw new Error(`Vehicle overlay triangle ${i} lacks upward winding; retain the producer's visible face orientation.`);
  }
  const hardware=validateControlHardware(parse("hardware"),network,{roads:digests.roads,pavements:digests.pavements,networkCanonical:await sha256(new TextEncoder().encode(JSON.stringify(network)))});
  if(hardware.inputs.vehicles!==digests.vehicles)throw new Error(`Displayed vehicle manifest differs from traffic hardware clearance; run ${CONTROL_HARDWARE_REBUILD}.`);
  freeze(network);freeze(fleet);Object.freeze(surfaces);
  const roadTriangleVerification=Object.freeze({displayedTriangles,referencedTriangles:referenced.size,maximumPlaneDistanceM,maximumOutsideDistanceM,numericToleranceM});
  const context=Object.freeze({network,fleet,surfaces,digests:Object.freeze(digests),roadTriangleVerification});contexts.add(context);return context;
}
export function assertVehicleMotionContext(context:VehicleMotionContext):void{if(!context||!contexts.has(context))throw new Error("Vehicle ingress requires the exact byte-bound motion context created from displayed scene and fleet inputs.");}
