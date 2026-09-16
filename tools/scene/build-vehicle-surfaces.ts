/** harness: actual accepted network, PLATEAU TrafficArea rings and displayed
 * roads.mesh. This bounded publisher preserves source holes and layer choices.
 * It does not rebuild roads or change the movement graph.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { decodeMesh, encodeMesh, type MeshData } from "../../src/world/mesh.ts";
import type { LaneEdge, NetworkData } from "../../src/world/network-data.ts";
import type { PlanPoint, SurfaceVertex, VehicleCorridor, VehicleSurfaceTriangle, VehicleSurfaces } from "../../src/world/vehicle-surfaces.ts";
import { counterclockwise, partitionConvex, signedArea, uncovered } from "../../src/agents/core/planar.ts";
import { headingAt, projectOntoEdge, sampleEdge } from "../../src/network/geometry.ts";
import { VehicleSurfaceQuery } from "../../src/agents/core/surfaces.ts";
import { readVehicleSourceAreas } from "./vehicle-source.ts";
import type { PavementSourcePiece } from "./select-pavement-source.ts";
import { reconcileVehicleSeam } from "./vehicle-seams.ts";

const specs = [
  {id:"23334638-boundary",roadId:"tran_8fc1da63-18dd-46f7-b240-bd0ef07f6c3d",sourceRoadIds:["tran_8fc1da63-18dd-46f7-b240-bd0ef07f6c3d","tran_4fb88985-63a0-48db-8d9c-59a9c0ad984e"],adjacentPublishedRoadIds:["tran_1a9246bd-aa93-424a-99b0-080a4621cc98","tran_1411caf5-ee7e-43bd-9e15-e7c28f306549"],edges:["lane:23334638:0:0:ground0:f:0:section0","lane:23334638:0:0:ground0:r:0:section1"]},
  {id:"23443810-bend",roadId:"tran_ea1be6e1-00b4-4f99-9b19-185dafccc11b",sourceRoadIds:["tran_ea1be6e1-00b4-4f99-9b19-185dafccc11b"],adjacentPublishedRoadIds:["tran_07f1e586-4741-48fc-9605-370134a28313"],edges:["lane:23443810:1:0:ground0:f:1:section1"]},
] as const;
const adjacentPolygonIds = new Set(["poly_24e6db9d-96d2-4c32-a2d7-0726bd0a97d1","poly_611846f1-ef84-4b97-9bda-e65254f91fc3","poly_42dc29b7-bb6f-4c00-bc0f-cfa89b96dce2"]);
const sourceSeams=[
  {corridor:"23334638-boundary",left:"poly_19e9f09d-f939-4fd5-a607-18b4e6019dcd",leftEdge:2,right:"poly_611846f1-ef84-4b97-9bda-e65254f91fc3",rightEdge:1,lower:"poly_3c829eea-25fc-4ac6-b738-02bcc4924a25"},
  {corridor:"23443810-bend",left:"poly_85784299-548f-4eb8-959e-71875f803cbf",leftEdge:0,right:"poly_42dc29b7-bb6f-4c00-bc0f-cfa89b96dce2",rightEdge:0,lower:"poly_8ec2057a-b615-40e0-90e0-e79cc13b8845"},
] as const;
// Reserve 0.2mm inside the approved 2mm distance for emitted overlap/float32.
const strip=(a:PlanPoint,b:PlanPoint):PlanPoint[]=>{const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),x=-dz/length*.0018,z=dx/length*.0018;return counterclockwise([[a[0]+x,a[1]+z],[b[0]+x,b[1]+z],[b[0]-x,b[1]-z],[a[0]-x,a[1]-z]]);};
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const bounds = (p: readonly PlanPoint[]): readonly [number,number,number,number] => [Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
const intersects = (a: readonly number[],b: readonly number[]): boolean => a[0]!<=b[2]!&&a[2]!>=b[0]!&&a[1]!<=b[3]!&&a[3]!>=b[1]!;
function plane(vertices: readonly SurfaceVertex[]): readonly [number,number,number] {
  const [a,b,c]=vertices as readonly [SurfaceVertex,SurfaceVertex,SurfaceVertex],den=(b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]);
  const dx=((b[1]-a[1])*(c[2]-a[2])-(c[1]-a[1])*(b[2]-a[2]))/den,dz=((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))/den;
  return [dx,dz,a[1]-dx*a[0]-dz*a[2]];
}
export async function buildVehicleSurfaces(outDir: string): Promise<VehicleSurfaces> {
  const paths=["data/network/network.json","data/scene/roads.mesh","data/scene/agents/vehicles.json","data/scene/pavement-source.json",...["85","86","95","96"].map(s=>`data/plateau/udx/tran/533935${s}_tran_6697_op.gml`)];
  const bytes=await Promise.all(paths.map(p=>readFile(p))),network=JSON.parse(bytes[0]!.toString()) as NetworkData,mesh=decodeMesh(bytes[1]!);
  const pavement=JSON.parse(bytes[3]!.toString()) as {pieces:PavementSourcePiece[]};
  const sourceFiles=paths.map((path,i)=>({path,sha256:sha(bytes[i]!)})),areas=bytes.slice(4).flatMap(b=>readVehicleSourceAreas(b.toString(),new Set([...specs.flatMap(s=>[...s.sourceRoadIds,...s.adjacentPublishedRoadIds]),"tran_96c5c5ed-6c46-4e98-8b9a-8c5431b8b2dd"])));
  console.log(`Vehicle surfaces: ${areas.length} selected source areas, ${mesh.header.triangleCount} displayed triangles.`);
  const displayed=[];
  for(let i=0;i<mesh.indices.length;i+=3) {
    const v=[0,1,2].map(j=>{const k=mesh.indices[i+j]!*3;return [mesh.positions[k]!,mesh.positions[k+1]!,mesh.positions[k+2]!] as SurfaceVertex;}),ring=counterclockwise(v.map(p=>[p[0],p[2]]));
    if(Math.abs(signedArea(ring))>1e-10) displayed.push({index:i/3,vertices:v,ring,bounds:bounds(ring),plane:plane(v)});
  }
  const triangles:VehicleSurfaceTriangle[]=[],corridors:VehicleCorridor[]=[],reconciliation:VehicleSurfaces["reconciliation"][number][]=[],diagnostics=[];
  for(const spec of specs) {
    const edges=spec.edges.map(id=>{const edge=network.lanes.find(e=>e.id===id);if(!edge)throw new Error(`Named vehicle corridor requires actual source edge ${id}.`);return edge;});
    const routePoints=edges.flatMap(e=>e.points),box=bounds(routePoints.map(p=>[p.x,p.z])),region:PlanPoint[]=[[box[0]-14,box[1]-14],[box[2]+14,box[1]-14],[box[2]+14,box[3]+14],[box[0]-14,box[3]+14]];
    const selected=areas.filter(a=>([...spec.sourceRoadIds,...spec.adjacentPublishedRoadIds] as readonly string[]).includes(a.source.roadId)),drivable=selected.filter(a=>a.source.functionCode<2000&&(!(spec.adjacentPublishedRoadIds as readonly string[]).includes(a.source.roadId)||(a.source.lod===3&&adjacentPolygonIds.has(a.source.polygonId))));
    // Use the renderer's selected physical pavement pieces. Raw overlapping
    // LOD2 and LOD3 alternatives are not two separate curbs.
    const blocked=pavement.pieces.filter(p=>([...spec.sourceRoadIds,...spec.adjacentPublishedRoadIds] as readonly string[]).includes(p.source.roadId)).map(p=>counterclockwise(p.ring.map(v=>[v[0],v[2]])));
    if(!drivable.length)throw new Error(`Named vehicle source road ${spec.roadId} has no mapped carriageway.`);
    const pieces=drivable.flatMap(a=>a.triangles.flatMap(t=>uncovered(partitionConvex(t,region).inside,blocked).filter(p=>Math.abs(signedArea(p))>1e-9).map(p=>({ring:p,source:a.source}))));
    const allowed=pieces.map(p=>p.ring),layerId=`ground:${spec.roadId}`,local:VehicleSurfaceTriangle[]=[];
    console.log(`${spec.id}: ${pieces.length} allowed pieces; matching displayed layer.`);
    for(const displayedTriangle of displayed.filter(t=>intersects(t.bounds,bounds(region)))) for(const piece of pieces) {
      if(!intersects(displayedTriangle.bounds,bounds(piece.ring)))continue;
      const clipped=partitionConvex(displayedTriangle.ring,piece.ring).inside;if(Math.abs(signedArea(clipped))<1e-9)continue;
      const [a,b,c]=displayedTriangle.plane,centroid=clipped.reduce((s,p)=>[s[0]+p[0]/clipped.length,s[1]+p[1]/clipped.length] as [number,number],[0,0] as [number,number]);
      const projected=edges.map(e=>({e,p:projectOntoEdge(e,{x:centroid[0],y:0,z:centroid[1]})})).sort((u,v)=>u.p.offsetM-v.p.offsetM)[0]!;
      // Explicit named ground-layer assignment; no global highest XY query.
      const expected=sampleEdge(projected.e,projected.p.distanceM).y;
      if(Math.abs(a*centroid[0]+b*centroid[1]+c-expected)>.75)continue;
      for(let i=1;i+1<clipped.length;i++) {const face=[clipped[0]!,clipped[i]!,clipped[i+1]!];if(Math.abs(signedArea(face))<1e-10)continue;local.push({id:`${spec.id}:road${displayedTriangle.index}:${local.length}`,layerId,vertices:face.map(([x,z])=>[x,a*x+b*z+c,z]) as unknown as VehicleSurfaceTriangle["vertices"],source:piece.source,provenance:"displayed-road",roadTriangleIds:[displayedTriangle.index]});}
    }
    // Report remaining source-surface gaps. A later explicit reconciliation is
    // published as the same displayed mesh, never as an invisible query fallback.
    for(const seam of sourceSeams.filter(s=>s.corridor===spec.id)){
      const left=areas.find(a=>a.source.polygonId===seam.left),right=areas.find(a=>a.source.polygonId===seam.right),lower=areas.find(a=>a.source.polygonId===seam.lower);
      if(!left||!right||!lower||left.source.lod!==3||right.source.lod!==3||lower.source.lod!==2)throw new Error(`Source seam ${seam.left}/${seam.right} lost its exact published pair/lower footprint.`);
      const paired=[{source:left.source,a:left.ring[seam.leftEdge]!,b:left.ring[(seam.leftEdge+1)%left.ring.length]!},{source:right.source,a:right.ring[seam.rightEdge]!,b:right.ring[(seam.rightEdge+1)%right.ring.length]!}],bands=paired.map(e=>strip(e.a,e.b)),common=partitionConvex(bands[0]!,bands[1]!).inside;
      const raw=lower.triangles.flatMap(t=>{const permitted=partitionConvex(common,t).inside;return uncovered(permitted,[...allowed,...blocked]).map(gap=>({gap,permitted}));});
      for(const [index,{gap,permitted}]of raw.entries()){
        const patch=reconcileVehicleSeam(gap,[permitted],local,`${spec.id}:source-seam:${index}`,reason=>console.log(`${spec.id} source seam ${index}: ${reason}`));if(!patch)continue;
        const mask=patch.triangles.map(t=>counterclockwise(t.vertices.map(v=>[v[0],v[2]])));
        // Every convex emitted face, not selected sample points, stays within
        // both 2mm edge bands and the lower source with all holes removed.
        for(const p of mask){const added=uncovered(p,allowed),maxEdgeDistance=Math.max(0,...added.flat().flatMap(q=>paired.map(({a,b})=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dz*t);}))),lowerOutside=added.flatMap(q=>uncovered(q,lower.triangles)).reduce((s,q)=>s+Math.abs(signedArea(q)),0),pavementArea=Math.max(0,...blocked.map(b=>Math.abs(signedArea(partitionConvex(p,b).inside))));if(maxEdgeDistance>.002||lowerOutside>1e-8||pavementArea>1e-8)throw new Error(`Source seam ${seam.left}/${seam.right} float32 addition violates bounds: paired distance ${maxEdgeDistance}m, lower uncovered ${lowerOutside}m², pavement ${pavementArea}m².`);}
        let addedArea=0;for(const p of mask){addedArea+=uncovered(p,allowed).reduce((s,q)=>s+Math.abs(signedArea(q)),0);allowed.push(p);}
        local.push(...patch.triangles);reconciliation.push({kind:"source-carriageway-seam",corridorId:spec.id,source:left.source,pairedEdges:paired,lowerSource:lower.source,areaM2:addedArea,maximumWidthM:patch.maximumWidthM,maximumAdjacentHeightDifferenceM:patch.maximumAdjacentHeightDifferenceM,triangleIds:patch.triangles.map(t=>t.id)});
      }
    }
    const covers=local.map(t=>counterclockwise(t.vertices.map(p=>[p[0],p[2]]))),gaps=allowed.flatMap(p=>uncovered(p,covers));
    console.log(`${spec.id}: ${local.length} support triangles, ${gaps.length} remaining pieces.`);
    if(spec.id==="23334638-boundary")for(const [index,gap]of gaps.entries()){
      const patch=reconcileVehicleSeam(gap,allowed,local,`${spec.id}:seam${index}`);if(!patch)continue;
      local.push(...patch.triangles);reconciliation.push({corridorId:spec.id,source:patch.triangles[0]!.source,areaM2:Math.abs(signedArea(gap)),maximumWidthM:patch.maximumWidthM,maximumAdjacentHeightDifferenceM:patch.maximumAdjacentHeightDifferenceM,triangleIds:patch.triangles.map(t=>t.id)});
    }
    diagnostics.push({corridorId:spec.id,sourceAreas:drivable.map(a=>({source:a.source,sourceHeightRangeM:a.sourceHeightRangeM})),holes:drivable.reduce((s,a)=>s+a.holes.length,0),gapCount:gaps.length,gapAreaM2:gaps.reduce((s,p)=>s+Math.abs(signedArea(p)),0),gaps:gaps.filter(p=>Math.abs(signedArea(p))>1e-8)});
    // Named boundary accepts 1.75 degrees (measured fleet fits <=1.691) and the
    // bend 3. Larger source slopes
    // remain unavailable here; this is not the future city's grade policy.
    triangles.push(...local);corridors.push({id:spec.id,layerId,routeEdgeIds:[...spec.edges],allowed,sourceAreas:drivable.map(a=>a.source),triangleIds:local.map(t=>t.id),maximumTiltRadians:(spec.id==="23334638-boundary"?2:3)*Math.PI/180});
  }
  const authored=triangles.filter(t=>t.provenance==="authored-seam-reconciliation"),positions=new Float32Array(authored.flatMap(t=>t.vertices.flat())),normals=new Float32Array(positions.length),indices=new Uint32Array(authored.length*3);
  for(let i=0;i<authored.length;i++){const t=authored[i]!,[a,b]=plane(t.vertices),length=Math.hypot(a,1,b);for(let j=0;j<3;j++){normals.set([-a/length,1/length,-b/length],i*9+j*3);indices[i*3+j]=i*3+(signedArea(t.vertices.map(p=>[p[0],p[2]]))>0?2-j:j);}}
  const all=authored.flatMap(t=>t.vertices),meshBounds={min:[0,1,2].map(i=>all.length?Math.min(...all.map(p=>p[i]!)):0) as [number,number,number],max:[0,1,2].map(i=>all.length?Math.max(...all.map(p=>p[i]!)):0) as [number,number,number]};
  const overlay:MeshData={header:{version:1,name:"vehicle-support-overlay",vertexCount:positions.length/3,triangleCount:authored.length,bounds:meshBounds,note:"Authored crack reconciliation: <=20mm width, <=5mm adjacent-height disagreement, 0.1mm overlap before float32 quantization. Exactly these vertices are used by core support."},positions,normals,indices},overlayBytes=encodeMesh(overlay);
  const data:VehicleSurfaces={version:1,scope:"named-vehicle-trajectory-increment",inputs:{network:sourceFiles[0]!.sha256,roads:sourceFiles[1]!.sha256,vehicles:sourceFiles[2]!.sha256,pavementSource:sourceFiles[3]!.sha256,sourceFiles},overlay:{url:"/scene/vehicle-support-overlay.mesh",sha256:sha(overlayBytes),triangles:authored.length},corridors,triangles,reconciliation};
  new VehicleSurfaceQuery(data);
  await mkdir(outDir,{recursive:true});await writeFile(resolve(outDir,"vehicle-surfaces.json"),JSON.stringify(data)+"\n");await writeFile(resolve(outDir,"vehicle-support-overlay.mesh"),overlayBytes);await writeFile(resolve(outDir,"surface-diagnostics.json"),JSON.stringify(diagnostics,null,2)+"\n");
  return data;
}
export function namedVehiclePath(network:NetworkData,edgeId:string,bendStartM=9.8723302773):{edge:LaneEdge;start:{x:number;y:number;z:number};end:{x:number;y:number;z:number};startHeading:number;endHeading:number} {
  const edge=network.lanes.find(e=>e.id===edgeId);if(!edge)throw new Error(`Named trajectory ${edgeId} is missing.`);
  if(edge.sourceWayId===23443810) return {edge,start:sampleEdge(edge,bendStartM),end:sampleEdge(edge,bendStartM+10),startHeading:headingAt(edge,bendStartM),endHeading:headingAt(edge,bendStartM+10)};
  const start={...edge.points[0]!},end={...edge.points.at(-1)!},startHeading=headingAt(edge,0),endHeading=headingAt(edge,edge.lengthM);
  if(network.portals.vehicleEntry.includes(edge.id)){start.x-=6.6*Math.sin(startHeading);start.z-=6.6*Math.cos(startHeading);}
  if(network.portals.vehicleExit.includes(edge.id)){end.x+=6.6*Math.sin(endHeading);end.z+=6.6*Math.cos(endHeading);}
  return {edge,start,end,startHeading,endHeading};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const out=process.argv[2]??"artifacts/network/vehicle-increment";const data=await buildVehicleSurfaces(out);console.log(JSON.stringify({out,corridors:data.corridors.length,triangles:data.triangles.length,reconciliations:data.reconciliation.length}));}
