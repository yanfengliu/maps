/** Bounds: the three actual PLATEAU carriageway holes and the two published
 * road triangles beneath/above one named ground lane. No generic layer repair
 * or full-city drivability is inferred from these geometric counterexamples. */
import {describe,expect,it} from "vitest";
import {VEHICLE_SOURCE_HOLES,VEHICLE_SOURCE_LEVELS} from "./vehicle-source-fixture.ts";
import {readVehicleSourceAreas} from "../tools/scene/vehicle-source.ts";
import {VehicleSurfaceQuery} from "../src/agents/core/surfaces.ts";
import type {PlanPoint,VehicleSurfaceTriangle,VehicleSurfaces} from "../src/world/vehicle-surfaces.ts";

function area(ring:readonly PlanPoint[]):number{return Math.abs(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length]!;return sum+p[0]*q[1]-q[0]*p[1];},0)/2);}
function inside(ring:readonly PlanPoint[],x:number,z:number):boolean{let hits=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i]!,b=ring[j]!;if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hits=!hits;}return hits;}
describe("actual vehicle source counterexamples",()=>{
  it.each(VEHICLE_SOURCE_HOLES)("preserves the interior ring of $source.polygonId",fixture=>{
    const parsed=readVehicleSourceAreas(fixture.xml,new Set([fixture.source.roadId]));expect(parsed).toHaveLength(1);const source=parsed[0]!;expect(source.holes).toHaveLength(fixture.source.holeCount);expect(source.sourceHeightRangeM).toEqual([0,0]);
    expect(source.triangles.reduce((sum,t)=>sum+area(t),0)).toBeCloseTo(area(source.ring)-source.holes.reduce((sum,h)=>sum+area(h),0),5);
    let holeSamples=0;for(const hole of source.holes){const xs=hole.map(p=>p[0]),zs=hole.map(p=>p[1]),x0=Math.min(...xs),z0=Math.min(...zs),width=Math.max(...xs)-x0,depth=Math.max(...zs)-z0;for(let i=1;i<20;i++)for(let j=1;j<20;j++){const x=x0+width*i/20,z=z0+depth*j/20;if(inside(hole,x,z)){holeSamples++;expect(source.triangles.some(t=>inside(t,x,z))).toBe(false);}}}expect(holeSamples).toBeGreaterThan(0);
  });
  it("keeps the real 15.232 m ground triangle separate from the 29.695 m overpass",()=>{
    const source={roadId:"fixture-assigned-mesh-layer",areaId:"geometric-counterexample",polygonId:"not-a-published-corridor",functionCode:1000,lod:3 as const};
    const triangles:VehicleSurfaceTriangle[]=VEHICLE_SOURCE_LEVELS.triangles.map((t,i)=>({id:String(t.id),layerId:i?"upper":"ground",source,vertices:t.vertices,provenance:"displayed-road",roadTriangleIds:[t.id]}));
    const data:VehicleSurfaces={version:1,scope:"named-vehicle-trajectory-increment",inputs:{network:"fixture",vehicles:"fixture",roads:VEHICLE_SOURCE_LEVELS.meshSha256,pavementSource:"fixture",sourceFiles:[]},overlay:{url:"/scene/vehicle-support-overlay.mesh",sha256:"fixture",triangles:0},triangles,corridors:triangles.map(t=>({id:t.layerId,layerId:t.layerId,routeEdgeIds:[VEHICLE_SOURCE_LEVELS.edgeId],allowed:[[[200,130],[270,130],[270,200],[200,200]]],sourceAreas:[source],triangleIds:[t.id],maximumTiltRadians:.1})),reconciliation:[]};
    const query=new VehicleSurfaceQuery(data),p=VEHICLE_SOURCE_LEVELS.position;
    expect(query.sample("ground",p.x,p.z,p.y).point.y).toBeCloseTo(15.23218922835,9);
    expect(query.sample("upper",p.x,p.z,29.7).point.y).toBeCloseTo(29.69494593114,9);
    expect(()=>query.sample("upper",p.x,p.z,p.y)).toThrow(/assigned route level/);
    const bad:VehicleSurfaces={...data,triangles:[data.triangles[0]!,{...data.triangles[1]!,layerId:"ground"}],corridors:[{...data.corridors[0]!,triangleIds:data.triangles.map(t=>t.id)}]};expect(()=>new VehicleSurfaceQuery(bad).sample("ground",p.x,p.z,p.y)).toThrow(/ambiguous physical levels/);
  });
});
