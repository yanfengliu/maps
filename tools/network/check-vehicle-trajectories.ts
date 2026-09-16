/** harness: bounded source publisher + core continuous sweep and four actual
 * wheel contacts at 1/60-second poses. This is not full-city route acceptance.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { NetworkData } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import type { VehicleSurfaces } from "../../src/world/vehicle-surfaces.ts";
import { VehicleSurfaceQuery, fitVehicleSupport } from "../../src/agents/core/surfaces.ts";
import { createTrajectory, straightSpan, quinticSpan } from "../../src/agents/core/trajectory.ts";
import { certifyVehicleSweep } from "../../src/agents/core/sweep.ts";
import { namedVehiclePath } from "../scene/build-vehicle-surfaces.ts";
import { projectVehicleFootprint } from "../../src/network/footprints.ts";

const directory=process.argv[2]??"artifacts/network/vehicle-increment",paths=["data/network/network.json","data/scene/agents/vehicles.json",resolve(directory,"vehicle-surfaces.json")],inputs=await Promise.all(paths.map(path=>readFile(path)));
const network=JSON.parse(inputs[0]!.toString()) as NetworkData,fleet=JSON.parse(inputs[1]!.toString()) as VehicleAssetManifest,surfaces=JSON.parse(inputs[2]!.toString()) as VehicleSurfaces,query=new VehicleSurfaceQuery(surfaces),results=[];
for(const corridor of surfaces.corridors)for(const edgeId of corridor.routeEdgeIds) {
  // Later local bend keeps the entire bus tail beyond the rejected preceding
  // source seam. It does not establish a route through that seam.
  const path=namedVehiclePath(network,edgeId,11.8723302773),start=[path.start.x,path.start.z] as const,end=[path.end.x,path.end.z] as const;
  // Authored 5 cm inward placement only on the last 10 m of the interior
  // approach. Exterior start, actual portal and both headings are unchanged.
  const incoming=network.portals.vehicleEntry.includes(edgeId),join=[path.end.x-Math.sin(path.endHeading)*10,path.end.z-Math.cos(path.endHeading)*10] as const,placedEnd=[end[0]-.05*Math.cos(path.endHeading),end[1]+.05*Math.sin(path.endHeading)] as const;
  const spans=incoming?[straightSpan(start,join),quinticSpan(join,placedEnd,path.startHeading,path.endHeading,10)]:[path.edge.sourceWayId===23443810?quinticSpan(start,end,path.startHeading,path.endHeading,10):straightSpan(start,end)],trajectory=createTrajectory([edgeId],corridor.id,spans);
  for(const asset of fleet.vehicles) {
    let sweepError:string|undefined;const contacts=[],failures=[],bodyFailures=[];let maxResidual=0,maxTilt=0,maxYawParameterError=0;
    try{certifyVehicleSweep(trajectory,asset,query,2);}catch(error){sweepError=(error as Error).message;}
    const count=Math.ceil(trajectory.lengthM/(2/60));
    for(let i=0;i<=count;i++) {
      const distanceM=trajectory.lengthM*i/count,p={x:0,z:0,headingRadians:0,curvaturePerM:0};trajectory.sample(distanceM,p);
      const expectedY=path.start.y+(path.end.y-path.start.y)*distanceM/trajectory.lengthM;
      try {
        const fit=fitVehicleSupport(query,corridor.id,asset,{x:p.x,y:expectedY,z:p.z},p.headingRadians);
        maxResidual=Math.max(maxResidual,...fit.wheelOffsets.map(Math.abs));maxTilt=Math.max(maxTilt,Math.acos(fit.normal.y));maxYawParameterError=Math.max(maxYawParameterError,Math.abs(Math.atan2(Math.sin(fit.supportYawRadians-p.headingRadians),Math.cos(fit.supportYawRadians-p.headingRadians))));
        const body=projectVehicleFootprint(asset,fit.position,fit.supportYawRadians,fit.normal),area=query.uncoveredArea(corridor.id,body.hull!.map(v=>[v.x,v.z]));if(area>1e-8)bodyFailures.push({distanceM,areaM2:area,x:p.x,z:p.z});
        contacts.push({distanceM,position:fit.position,normal:fit.normal,yaw:fit.supportYawRadians,heading:p.headingRadians,wheelOffsets:fit.wheelOffsets,steeringRadians:Math.atan((asset.axles.frontZ-asset.axles.rearZ)*p.curvaturePerM),triangleIds:fit.contacts.map(c=>c.triangleId)});
      }catch(error){failures.push({distanceM,x:p.x,z:p.z,expectedY,message:(error as Error).message});}
    }
    results.push({corridorId:corridor.id,edgeId,classId:asset.id,lengthM:trajectory.lengthM,poses:count+1,sweepError:sweepError??null,maximumWheelResidualM:maxResidual,maximumTiltRadians:maxTilt,maximumYawParameterDifferenceRadians:maxYawParameterError,contactFailures:failures,bodyFailures,contacts});
  }
}
const negatives=[];
for(const [edgeId,corridorId,bendStartM]of [["lane:23334638:0:0:ground0:f:0:section0","23334638-boundary",0],["lane:23443810:1:0:ground0:f:1:section1","23443810-bend",9.8723302773]] as const){
  const path=namedVehiclePath(network,edgeId,bendStartM),start=[path.start.x,path.start.z] as const,end=[path.end.x,path.end.z] as const,trajectory=createTrajectory([edgeId],corridorId,[bendStartM?quinticSpan(start,end,path.startHeading,path.endHeading,10):straightSpan(start,end)]);let reason:string|null=null;
  try{certifyVehicleSweep(trajectory,fleet.vehicles.find(a=>a.id==="bus")!,query,2);}catch(error){reason=(error as Error).message;}
  if(!reason)throw new Error(`Preserved original bus candidate ${edgeId} unexpectedly passed; inspect the source mask and sweep before replacing its rejection.`);
  negatives.push({edgeId,bendStartM,reason});
}
await mkdir(directory,{recursive:true});const report={inputs:paths.map((path,i)=>({path,sha256:createHash("sha256").update(inputs[i]!).digest("hex")})),bounds:"Continuous conservative XZ hull, authored steering/dynamics interval bounds; four-wheel support checked every 1/60 second at 2m/s, not continuous vertical support proof or integrated traffic.",results,negatives};
await writeFile(resolve(directory,"trajectory-result.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(results.map(({contacts,contactFailures,bodyFailures,...r})=>({...r,contactFailures:contactFailures.length,firstFailure:contactFailures[0],bodyFailures:bodyFailures.length,firstBodyFailure:bodyFailures[0]})),null,2));
if(results.some(r=>r.sweepError||r.contactFailures.length||r.bodyFailures.length))process.exitCode=1;
