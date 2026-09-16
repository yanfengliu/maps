/** F9 bound: all 12 actual selected GLB wheel roots in the retained old fleet,
 * two body headings and shuffled manifest order on asymmetric nonplanar support.
 * A plane has zero residual and cannot detect swapped named wheel offsets.
 * This is a contact correspondence gate, not a browser or continuous tire proof.
 */
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { fitVehicleSupport, VehicleSurfaceQuery } from "../src/agents/core/surfaces.ts";
import { writeSupportBasis } from "../src/world/agent-poses.ts";
import type { PlanPoint, VehicleSurfaceTriangle, VehicleSurfaces } from "../src/world/vehicle-surfaces.ts";
import { BOUNDARY_SOURCE_VEHICLES } from "./network-boundary-source-fixture.ts";

interface PivotFixture {
  provenance: { manifestSha256: string };
  vehicles: { id: string; sha256: string; wheels: { name: string; position: [number, number, number] }[] }[];
}
const fixture = JSON.parse(await readFile(new URL("./fixtures/vehicle-wheel-pivots.json", import.meta.url), "utf8")) as PivotFixture;
const source = { roadId: "F9-asymmetric-source", areaId: "quadrants", polygonId: "fixture", functionCode: 1000, lod: 3 as const };
const triangles: VehicleSurfaceTriangle[] = [], allowed: PlanPoint[][] = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const x0 = sx < 0 ? -10 : 0, x1 = sx < 0 ? 0 : 10, z0 = sz < 0 ? -10 : 0, z1 = sz < 0 ? 0 : 10;
  const ring: PlanPoint[] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  allowed.push(ring);
  for (const face of [[0, 1, 2], [0, 2, 3]]) triangles.push({
    id: `triangle${triangles.length}`, layerId: "source", source, provenance: "displayed-road", roadTriangleIds: [triangles.length],
    vertices: face.map(index => [ring[index]![0], .01 * sx * sz, ring[index]![1]]) as unknown as VehicleSurfaceTriangle["vertices"],
  });
}
const data: VehicleSurfaces = {
  version: 1, scope: "named-vehicle-trajectory-increment",
  inputs: { network: "fixture", vehicles: fixture.provenance.manifestSha256, roads: "fixture", pavementSource: "fixture", sourceFiles: [] },
  overlay: { url: "/scene/vehicle-support-overlay.mesh", sha256: "fixture", triangles: 0 }, triangles,
  corridors: [{ id: "fixture", layerId: "source", routeEdgeIds: ["fixture"], allowed, sourceAreas: [source], triangleIds: triangles.map(t => t.id), maximumTiltRadians: .2 }],
  reconciliation: [],
};
const query = new VehicleSurfaceQuery(data);

for (const original of BOUNDARY_SOURCE_VEHICLES) for (const bearing of [0, Math.PI / 2]) for (const shuffled of [false, true]) {
  it(`${original.id}: actual named wheel support at heading ${bearing}, shuffled order ${shuffled}`, () => {
    const observed = fixture.vehicles.find(vehicle => vehicle.id === original.id)!;
    expect(observed.sha256).toBe(original.sha256);
    expect(observed.wheels).toHaveLength(4);
    const names = original.wheelObjects;
    const asset = { ...original, wheelObjects: shuffled ? [names[2]!, names[0]!, names[3]!, names[1]!] : names };
    const support = fitVehicleSupport(query, "fixture", asset, { x: 0, y: 0, z: 0 }, bearing), basis = new Float64Array(9);
    writeSupportBasis(support.supportYawRadians, support.normal.x, support.normal.y, support.normal.z, basis);
    for (const [index, name] of asset.wheelObjects.entries()) {
      // Coordinates are observed from the selected source GLB, not reconstructed
      // from a second copy of the fitter's right/left naming rule.
      const pivot = observed.wheels.find(wheel => wheel.name === name)!.position;
      const x = basis[0]! * pivot[0] + basis[6]! * pivot[2], z = basis[2]! * pivot[0] + basis[8]! * pivot[2];
      const expected = .01 * Math.sign(x) * Math.sign(z);
      expect.soft(support.wheelOffsets[index], `${name} residual at its actual pivot`).toBeCloseTo(expected, 10);
      expect.soft(Math.hypot(support.contacts[index]!.point.x - x, support.contacts[index]!.point.z - z), `${name} sampled the actual root`).toBeLessThan(2e-7);
      const tireBottom = support.position.y + basis[1]! * pivot[0] + basis[4]! * (pivot[1] - asset.wheelRadius) + basis[7]! * pivot[2] + support.normal.y * support.wheelOffsets[index]!;
      expect.soft(Math.abs(tireBottom - expected), `${name} actual pivot/radius contact`).toBeLessThan(2e-7);
    }
  });
}
