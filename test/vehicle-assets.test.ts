/** Bounds: selected rigid fixture triangles and file admission errors. The named
 * full-fleet red/green geometry and byte-repeat proofs are separate offline gates.
 * In particular a triangle with all vertices outside the disk can still cross it.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import type { VehicleAsset, VehicleAssetManifest } from "../src/world/agent-assets.ts";
import { continuousWheelBounds, projectedTriangleDistance, triangleClearsWheel, verifyVehicleGeometry } from "../tools/agents/vehicle-clearance.ts";
import { validateVehicleGlb, validateVehicleManifest, verifyVehicleDirectory } from "../tools/agents/verify-vehicles.ts";

function fixture() {
  const scene = new Group(), material = new MeshStandardMaterial();
  const body = new Mesh(new BoxGeometry(.5, .2, .5), material); body.name = "body"; body.position.y = 1.2; scene.add(body);
  const wheelObjects: string[] = [];
  for (const z of [-1, 1]) for (const x of [-1, 1]) {
    const wheel = new Mesh(new SphereGeometry(.3, 16, 12), material);
    wheel.name = `wheel-${x}-${z}`; wheel.position.set(x, .3, z); scene.add(wheel); wheelObjects.push(wheel.name);
  }
  const bounds = new Box3().setFromObject(scene);
  const asset: VehicleAsset = { id: "kei", length: 3, width: 3, height: 1.4, wheelRadius: .3,
    collision: { width: 3, length: 3 }, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    axles: { frontZ: 1, rearZ: -1, trackMetres: 2 }, model: "vehicle-kei.glb", sha256: "0".repeat(64), bytes: 1, vertexCount: 1, wheelObjects };
  return { scene, asset };
}
function manifest() {
  const asset = fixture().asset;
  return { version: 1, units: "metres", up: "+Y", forward: "+Z", origin: "ground-centre", yawAxis: "+Y", licence: "MIT", source: "Original fixture", recipeSha256: "0".repeat(64), blenderVersion: "5.2.0 LTS",
    vehicles: ["kei", "taxi", "bus"].map(id => ({ ...asset, id, model: `vehicle-${id}.glb` })) } as VehicleAssetManifest;
}
async function temporary(test: (folder: string) => Promise<void>) {
  const folder = await mkdtemp(resolve(tmpdir(), "maps-vehicle-test-"));
  try { await test(folder); } finally { await rm(folder, { recursive: true, force: true }); }
}

describe("continuous wheel clearance", () => {
  it("checks the whole triangle, including a disk inside three distant corners", () => {
    const tri = [new Vector3(0, -2, -2), new Vector3(0, 2, -2), new Vector3(0, 0, 2)] as const;
    expect(tri.every(p => Math.hypot(p.y, p.z) > 1)).toBe(true);
    expect(projectedTriangleDistance(tri, new Vector3())).toBe(0);
    expect(triangleClearsWheel(tri, new Vector3(), .2, .8, 1)).toBe(false);
    expect(triangleClearsWheel(tri.map(p => p.clone().add(new Vector3(1, 0, 0))) as unknown as typeof tri, new Vector3(), .2, .8, 1)).toBe(true);
  });
  it("includes interior angular extrema and degenerate projected edges", () => {
    const [x, z] = continuousWheelBounds(.02, .4, 35 * Math.PI / 180);
    expect(z).toBeCloseTo(Math.hypot(.02, .4), 12);
    expect(x).toBeCloseTo(.02 * Math.cos(35 * Math.PI / 180) + .4 * Math.sin(35 * Math.PI / 180), 12);
    expect(projectedTriangleDistance([new Vector3(0, 2, 0), new Vector3(1, 2, 0), new Vector3(2, 2, 0)], new Vector3())).toBe(2);
  });
  it("admits all selected wheels and body and rejects a solid rim-crossing triangle", () => {
    const { scene, asset } = fixture(); expect(verifyVehicleGeometry(scene, asset).wheels).toHaveLength(4);
    const geometry = new BufferGeometry(); geometry.setAttribute("position", new Float32BufferAttribute([1,.1,.6, 1,.1,1.4, 1,.8,1],3)); geometry.computeVertexNormals();
    const trim = new Mesh(geometry, new MeshStandardMaterial()); trim.name="crossing-trim"; scene.add(trim);
    const bounds = new Box3().setFromObject(scene), changed = { ...asset, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
    expect(() => verifyVehicleGeometry(scene, changed)).toThrow(/continuous wheel clearance volume/);
  });
  it("does not admit empty scenes, orphan wheels or wrong pivots", () => {
    const { scene, asset } = fixture(); expect(() => verifyVehicleGeometry(new Group(), asset)).toThrow(/selected scene/);
    const wheel=scene.getObjectByName(asset.wheelObjects[0]!)!; scene.remove(wheel);
    expect(() => verifyVehicleGeometry(scene, asset)).toThrow(); scene.add(wheel); wheel.position.x += .1;
    expect(() => verifyVehicleGeometry(scene, asset)).toThrow();
  });
});
describe("vehicle input errors", () => {
  it("rejects invalid counts and unsafe model filenames with rebuild guidance", () => {
    const m=manifest(); validateVehicleManifest(m);
    expect(() => validateVehicleManifest({...m,vehicles:[]})).toThrow(/exactly kei, taxi and bus.*data:vehicles/);
    expect(() => validateVehicleManifest({...m,vehicles:[{...m.vehicles[0],model:"../outside.glb"},...m.vehicles.slice(1)]})).toThrow(/local model filename.*data:vehicles/);
  });
  it("names missing manifests and malformed JSON, retaining the cause", async () => temporary(async folder => {
    await expect(verifyVehicleDirectory(folder)).rejects.toThrow(/vehicles.json could not be read.*data:vehicles/);
    await writeFile(resolve(folder,"vehicles.json"),"{");
    const error = await verifyVehicleDirectory(folder).catch(e => e as Error);
    expect(error).toBeInstanceOf(Error); expect((error as Error).message).toMatch(/vehicles.json contains malformed JSON.*data:vehicles/); expect((error as Error).cause).toBeInstanceOf(SyntaxError);
  }));
  it("names a missing model without contacting a network service", async () => temporary(async folder => {
    await writeFile(resolve(folder,"vehicles.json"),JSON.stringify(manifest()));
    await expect(verifyVehicleDirectory(folder)).rejects.toThrow(/vehicle-kei.glb could not be read.*data:vehicles/);
  }));
  it("names malformed embedded GLB JSON while preserving structural rejection", () => {
    const bytes=Buffer.alloc(32); bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(32,8);bytes.writeUInt32LE(4,12);bytes.writeUInt32LE(0x4e4f534a,16);bytes.write("{   ",20);bytes.writeUInt32LE(0,24);bytes.writeUInt32LE(0x004e4942,28);
    expect(() => validateVehicleGlb(bytes,"broken.glb")).toThrow(/broken.glb JSON chunk contains malformed JSON.*data:vehicles/);
    bytes.writeUInt32LE(99,12);expect(() => validateVehicleGlb(bytes,"broken.glb")).toThrow(/invalid JSON chunk.*data:vehicles/);
  });
});
