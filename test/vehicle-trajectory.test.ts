/** Bound: authored straight/quintic motion, exact generated fleet envelopes,
 * analytic planes and explicit holes. Source publication and city flow are
 * separate gates. A nine-point mask cannot pass the swept-body hole case.
 */
import { describe, expect, it } from "vitest";
import { BOUNDARY_SOURCE_VEHICLES } from "./network-boundary-source-fixture.ts";
import { createTrajectory, quinticSpan, straightSpan } from "../src/agents/core/trajectory.ts";
import { fitVehicleSupport, supportYawForBearing, VehicleSurfaceQuery } from "../src/agents/core/surfaces.ts";
import { certifyVehicleSweep, sweepsOverlap } from "../src/agents/core/sweep.ts";
import { writeSupportBasis } from "../src/world/agent-poses.ts";
import { projectVehicleFootprint } from "../src/network/footprints.ts";
import { cross, signedArea, uncovered } from "../src/agents/core/planar.ts";
import type { PlanPoint, VehicleSurfaceTriangle, VehicleSurfaces } from "../src/world/vehicle-surfaces.ts";
import { reconcileVehicleSeam } from "../tools/scene/vehicle-seams.ts";

const source = { roadId: "source-road", areaId: "carriageway", polygonId: "polygon", functionCode: 1000, lod: 3 as const };
const square = (x0: number, z0: number, x1: number, z1: number): PlanPoint[] => [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
function surface(a = 0, b = 0, base = 10, allowed = [square(-20,-20,20,60)]): VehicleSurfaces {
  const ring = square(-20,-20,20,60), vertices = ring.map(([x,z]) => [x, base + a*x + b*z, z] as const);
  const triangles: VehicleSurfaceTriangle[] = [[0,1,2],[0,2,3]].map((indices,i) => ({ id: `triangle${i}`, layerId: "ground", vertices: indices.map(j => vertices[j]!) as unknown as VehicleSurfaceTriangle["vertices"], source, provenance: "displayed-road", roadTriangleIds: [i] }));
  return {version:1,scope:"named-vehicle-trajectory-increment", inputs:{network:"fixture",vehicles:"fixture",roads:"fixture",pavementSource:"fixture",sourceFiles:[]},overlay:{url:"/scene/vehicle-support-overlay.mesh",sha256:"fixture",triangles:0},triangles,corridors:[{id:"corridor",layerId:"ground",routeEdgeIds:["edge"],allowed,sourceAreas:[source],triangleIds:triangles.map(t=>t.id),maximumTiltRadians:.2}],reconciliation:[]};
}
const bus = BOUNDARY_SOURCE_VEHICLES.find(a => a.id === "bus")!;
const sample = () => ({x:0,z:0,headingRadians:0,curvaturePerM:0});
const angleError = (a: number,b: number) => Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

describe("bounded vehicle trajectory", () => {
  it("joins a straight to a C2 bend, with curvature signed as actual bearing change", () => {
    const trajectory = createTrajectory(["edge"],"corridor",[straightSpan([0,-10],[0,0]),quinticSpan([0,0],[4,20],0,.35,20)]);
    const before=sample(),after=sample(); trajectory.sample(10,before); trajectory.sample(10.001,after);
    expect(Math.hypot(before.x-after.x,before.z-after.z)).toBeLessThan(.0011);
    expect(Math.abs(before.curvaturePerM-after.curvaturePerM)).toBeLessThan(.0001);
    const middle=sample(),left=sample(),right=sample(); const s=trajectory.lengthM*.7;
    trajectory.sample(s,middle); trajectory.sample(s-.001,left); trajectory.sample(s+.001,right);
    expect(middle.curvaturePerM).toBeGreaterThan(0);
    expect(middle.curvaturePerM).toBeCloseTo((right.headingRadians-left.headingRadians)/.002,5);
    expect(trajectory.maximumArcErrorM).toBeLessThanOrEqual(.0015);
    expect(()=>trajectory.sample(trajectory.lengthM+.01,middle)).toThrow(/outside/);
  });
  it("rejects reversed endpoint clipping and discontinuous source headings", () => {
    expect(()=>createTrajectory(["edge"],"corridor",[quinticSpan([0,0],[0,1],Math.PI,0,1)])).toThrow(/reversed/);
    expect(()=>createTrajectory(["edge"],"corridor",[straightSpan([0,0],[0,1]),straightSpan([0,1],[1,1])])).toThrow(/discontinuously/);
  });
});
describe("coupled displayed support and true motion", () => {
  it("inverts the unchanged helper on grade plus crossfall and uses the same parameter for the entire body", () => {
    const query=new VehicleSurfaceQuery(surface(.07,.11)),support=fitVehicleSupport(query,"corridor",bus,{x:0,y:10,z:0},.31),basis=new Float64Array(9),wrong=new Float64Array(9);
    writeSupportBasis(support.supportYawRadians,support.normal.x,support.normal.y,support.normal.z,basis);
    writeSupportBasis(support.headingRadians,support.normal.x,support.normal.y,support.normal.z,wrong);
    expect(angleError(Math.atan2(basis[6]!,basis[8]!),support.headingRadians)).toBeLessThan(1e-12);
    expect(angleError(Math.atan2(wrong[6]!,wrong[8]!),support.headingRadians)).toBeGreaterThan(.001);
    expect(Math.max(...support.wheelOffsets.map(Math.abs))).toBeLessThan(1e-10);
    for(const hit of support.contacts) expect(hit.point.y).toBeCloseTo(10+.07*hit.point.x+.11*hit.point.z,10);
    const footprint=projectVehicleFootprint(bus,support.position,support.supportYawRadians,support.normal,1,support.wheelOffsets);
    expect(footprint.headingRadians).toBe(support.supportYawRadians);
    expect(footprint.headingRadians).not.toBe(support.headingRadians);
  });
  it("preserves every bearing over the supported normal cone, including nonunit input normals", () => {
    for(let az=0;az<16;az++) for(let bearing=0;bearing<16;bearing++) {
      const n={x:2*Math.sin(.19)*Math.sin(az),y:2*Math.cos(.19),z:2*Math.sin(.19)*Math.cos(az)},yaw=bearing*Math.PI/8,basis=new Float64Array(9);
      writeSupportBasis(supportYawForBearing(yaw,n),n.x,n.y,n.z,basis);
      expect(angleError(Math.atan2(basis[6]!,basis[8]!),yaw)).toBeLessThan(1e-12);
    }
  });
  it("does not substitute an overpass or hide an out-of-travel exposed upper triangle", () => {
    const data=surface(),upper=surface(0,0,30).triangles.map(t=>({...t,id:`upper${t.id}`,layerId:"overpass"}));
    const query=new VehicleSurfaceQuery({...data,triangles:[...data.triangles,...upper]});
    expect(query.sample("corridor",0,0,10).point.y).toBe(10);
    expect(()=>query.sample("corridor",0,0,30)).toThrow(/assigned route level/);
    const raised=data.triangles.map(t=>({...t,id:`raised${t.id}`,vertices:t.vertices.map(p=>[p[0],p[1]+.06,p[2]]) as unknown as VehicleSurfaceTriangle["vertices"]}));
    const layered=new VehicleSurfaceQuery({...data,triangles:[...data.triangles,...raised],corridors:data.corridors.map(c=>({...c,triangleIds:[...c.triangleIds,...raised.map(t=>t.id)]}))});
    expect(()=>layered.normalContact("corridor",{x:0,y:10,z:0},{x:0,y:1,z:0})).toThrow(/exposed assigned surface/);
  });
});
describe("continuous full vehicle hull", () => {
  it("does not manufacture a missing strip when a source clip repeats an endpoint", () => {
    const clip:PlanPoint[]=[[-456.87118458174234,-73.44782152969863],[-462.2220000064008,-68.27899982730014],[-462.2214078627818,-68.28036589248678],[-456.87120000631876,-73.44789982870861],[-456.87120000631876,-73.44789982870861],[-456.87120000631876,-73.4478998287086]];
    const body:PlanPoint[]=[[-460.79190622028483,-69.66083406916876],[-460.79257142647725,-69.65981020470333],[-461.5025520228681,-68.97397770560508],[-461.502820340802,-68.97415203362281]];
    expect(uncovered(body,[clip]).reduce((s,p)=>s+Math.abs(signedArea(p)),0)).toBeLessThan(1e-10);
    expect(uncovered(square(0,0,1,1),[[[-1,-1],[2,-1],[2,2],[2,2],[-1,2]]])).toEqual([]);
  });
  it("contains independently projected tilted bus bodies throughout a curve", () => {
    const query=new VehicleSurfaceQuery(surface()),trajectory=createTrajectory(["edge"],"corridor",[quinticSpan([0,0],[4,20],0,.35,20)]),sweep=certifyVehicleSweep(trajectory,bus,query,2);
    for(let i=0;i<=100;i++) {
      const p=sample();trajectory.sample(trajectory.lengthM*i/100,p);
      for(let az=0;az<8;az++) {
        const n={x:Math.sin(.2)*Math.sin(az),y:Math.cos(.2),z:Math.sin(.2)*Math.cos(az)},body=projectVehicleFootprint(bus,{x:p.x,y:10,z:p.z},supportYawForBearing(p.headingRadians,n),n);
        for(const v of body.hull!) expect(sweep.pieces.some(piece=>piece.every((a,j)=>cross(a,piece[(j+1)%piece.length]!,[v.x,v.z])>=-1e-8))).toBe(true);
      }
    }
  });
  it("rejects a thin internal source hole missed by centre/corners and nominal lane guidance", () => {
    const outer=square(-20,-20,20,60),hole=square(.4,9.9,.6,10.1),allowed=uncovered(outer,[hole]);
    const query=new VehicleSurfaceQuery(surface(0,0,10,allowed)),trajectory=createTrajectory(["edge"],"corridor",[straightSpan([0,0],[0,20])]);
    expect(()=>certifyVehicleSweep(trajectory,bus,query)).toThrow(/outside source carriageway/);
  });
  it("retains all three real classes and detects bus occupation of a neighboring lane", () => {
    const query=new VehicleSurfaceQuery(surface()),make=(x:number,asset=bus)=>certifyVehicleSweep(createTrajectory(["edge"],"corridor",[straightSpan([x,0],[x,20])]),asset,query);
    for(const asset of BOUNDARY_SOURCE_VEHICLES) expect(make(0,asset).classId).toBe(asset.id);
    expect(sweepsOverlap(make(0),make(3.2))).toBe(true);
    expect(sweepsOverlap(make(-10),make(10))).toBe(false);
  });
});
describe("bounded displayed crack reconciliation",()=>{
  it("publishes float32 support triangles only across narrow, level-compatible cracks",()=>{
    const make=(x0:number,x1:number,y:number)=>{const points=square(x0,-1,x1,1);return [[0,1,2],[0,2,3]].map((f,i)=>({id:`side${x0}:${i}`,layerId:"ground",source,provenance:"displayed-road" as const,roadTriangleIds:[i],vertices:f.map(j=>[points[j]![0],y,points[j]![1]]) as unknown as VehicleSurfaceTriangle["vertices"]}));};
    const allowed=[square(-1,-1,1,1)],gap=square(-.0005,-.5,.0005,.5),triangles=[...make(-1,-.0005,10),...make(.0005,1,10)];
    const patch=reconcileVehicleSeam(gap,allowed,triangles,"fixture");
    expect(patch).not.toBeNull();expect(patch!.maximumWidthM).toBeCloseTo(.001,12);
    expect(patch!.triangles.every(t=>t.provenance==="authored-seam-reconciliation"&&t.vertices.flat().every(v=>v===Math.fround(v)))).toBe(true);
    expect(reconcileVehicleSeam(square(-.02,-.5,.02,.5),allowed,triangles,"wide")).toBeNull();
    expect(reconcileVehicleSeam(gap,allowed,[...make(-1,-.0005,10),...make(.0005,1,10.006)],"step")).toBeNull();
  });
});
