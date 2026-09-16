/** Bounds: pure facade treatment and generated ground geometry. GPU materials,
 * style switching and temporal output additionally require the real browser gate.
 */
import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { floorLayout, prepareProceduralFacades } from "../src/scene/procedural-facades.js";
import { createStreetDetails, pointAlong } from "../src/scene/street-details.js";
import { DEFAULT_WORLD_STYLE_ID, worldStyle } from "../src/world/styles.js";
import { delightInPlace, NO_DELIGHT, PLATEAU_DELIGHT } from "../src/scene/delight.js";
import { lightingForPreset } from "../src/scene/time-of-day.js";
import type { NetworkData } from "../src/world/network-data.js";

describe("facades keep real heights and floor counts", () => {
  it("uses valid floor counts and rejects every missing-value encoding", () => {
    expect(floorLayout(28, 8)).toEqual({ floors: 8, floorHeightM: 3.5 });
    for (const raw of [null, undefined, 9999, "9999", 0, ""]) expect(floorLayout(14, raw)).toEqual({ floors: 4, floorHeightM: 3.5 });
  });
  it("writes world-space floor params after the tile transform without changing geometry", () => {
    const root = new Group(); root.position.set(20, 17, -30);
    const mesh = new Mesh(new BoxGeometry(5, 14, 6), new MeshStandardMaterial()); mesh.position.y = 7; root.add(mesh);
    const positions = Array.from(mesh.geometry.attributes.position!.array);
    expect(prepareProceduralFacades(root)).toBe(1);
    const params = mesh.geometry.getAttribute("mapsFloorParams");
    for (let i = 0; i < params.count; i += 1) { expect(params.getX(i)).toBe(17); expect(params.getY(i)).toBe(3.5); }
    expect(Array.from(mesh.geometry.attributes.position!.array)).toEqual(positions);
    mesh.geometry.dispose(); mesh.material.dispose();
  });
});

describe("street markings follow network geometry", () => {
  it("interpolates slope and turns without zero-height fallback", () => {
    const points = [{ x: 0, y: 15, z: 0 }, { x: 10, y: 17, z: 0 }, { x: 10, y: 18, z: 10 }];
    expect(pointAlong(points, 5).point).toEqual({ x: 5, y: 16, z: 0 });
    expect(pointAlong(points, 15).point).toEqual({ x: 10, y: 17.5, z: 5 });
  });
  it("draws a bidirectional crossing once, above its supplied height, facing upward", () => {
    const edge = { id: "cross:f", from: "a", to: "b", points: [{ x: -10, y: 15, z: 0 }, { x: 10, y: 17, z: 0 }], lengthM: 20, widthM: 5, kind: "crossing" as const, nextIds: [], sourceWayId: 42, signalGroupId: null, junctionId: null };
    const crossing = { id: "physical42", source: "osm", sourceWayId: 42, paths: [edge.points], markings: "zebra", sourceMarkings: "zebra", control: "unknown", widthM: 5, widthSource: "osm" };
    const network = { walks: [edge, { ...edge, id: "cross:r", points: [...edge.points].reverse() }], lanes: [], junctions: [], physical: { crossings: [crossing, { ...crossing, id: "none", markings: "none" }, { ...crossing, id: "unknown", markings: "unknown" }], trafficControls: [], tactilePaths: [] } } as unknown as NetworkData;
    const streets = createStreetDetails(network, worldStyle("satellite"), x => 16 + x * .1);
    expect(streets.counts.crossings).toBe(1); expect(streets.counts.stripes).toBeGreaterThan(10);
    expect(streets.counts.signalHeads).toBe(0);
    expect(streets.root.getObjectByName("streets:sidewalk")).toBeUndefined();
    const paint = streets.root.getObjectByName("streets:paint") as Mesh;
    const normals = paint.geometry.getAttribute("normal");
    const normal = new Vector3();
    for (let i = 0; i < normals.count; i += 1) expect(normal.fromBufferAttribute(normals, i).y).toBeGreaterThan(0.9);
    paint.geometry.computeBoundingBox();
    expect(paint.geometry.boundingBox!.min.y).toBeGreaterThan(15);
    expect(paint.geometry.boundingBox!.max.y).toBeLessThan(17.1);
    streets.dispose();
  });
  it("drapes the entire crossing width over transverse slopes and rejects unsupported corners", () => {
    const points = [{ x: -4, y: 15, z: 0 }, { x: 4, y: 15, z: 0 }];
    const network = { walks: [], lanes: [], junctions: [], physical: { crossings: [{ id: "slope", source: "osm", sourceWayId: 42, paths: [points], markings: "zebra", sourceMarkings: "zebra", control: "unknown", widthM: 5, widthSource: "osm" }], trafficControls: [], tactilePaths: [] } } as unknown as NetworkData;
    const support = (x: number, z: number): number => 15 + x * 0.02 + Math.abs(z) * 0.15;
    const streets = createStreetDetails(network, worldStyle("satellite"), support);
    try {
      const geometry = (streets.root.getObjectByName("streets:paint") as Mesh).geometry;
      const positions = geometry.getAttribute("position");
      let outsideCentreline = 0;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i); const z = positions.getZ(i);
        expect(positions.getY(i) - support(x, z)).toBeCloseTo(0.06, 4);
        if (Math.abs(z) > 2) outsideCentreline++;
      }
      expect(outsideCentreline).toBeGreaterThan(0);
    } finally { streets.dispose(); }
    const unsupported = createStreetDetails(network, worldStyle("satellite"), (x, z) => Math.abs(z) > 2 ? undefined : support(x, z));
    try {
      expect(unsupported.counts.stripes).toBe(0);
      expect(unsupported.paintPlacements.length).toBeGreaterThan(0);
      expect(unsupported.paintPlacements.every(p => p.status === "unplaced" && p.reason.includes("support"))).toBe(true);
    } finally { unsupported.dispose(); }
  });
});

describe("two world treatments", () => {
  it("keeps the requested default and distinct data-driven palettes", () => {
    expect(DEFAULT_WORLD_STYLE_ID).toBe("satellite");
    expect(worldStyle("satellite").facade).toBe("photographic");
    expect(worldStyle("cartographic").facade).toBe("procedural");
    expect(worldStyle("cartographic").palette.road).not.toBe(worldStyle("satellite").palette.road);
    expect(() => worldStyle("missing")).toThrow(/missing.*cartographic.*satellite/);
  });
  it("dusk and noon have independently plausible solar geometry", () => {
    expect(lightingForPreset("noon").solar.elevationDegrees).toBeCloseTo(45.88, 1);
    expect(lightingForPreset("noon").solar.azimuthDegrees).toBeCloseTo(179.98, 1);
    expect(lightingForPreset("dusk").solar.elevationDegrees).toBeCloseTo(-3.48, 1);
  });
  it("de-lighting changes photographic range and preserves the sign mask", () => {
    const original = new Uint8Array([24, 24, 24, 51, 200, 200, 200, 102]);
    const identity = original.slice(); delightInPlace(identity, NO_DELIGHT);
    expect(Array.from(identity)).toEqual(Array.from(original));
    const treated = original.slice(); delightInPlace(treated, PLATEAU_DELIGHT);
    expect(treated[0]).toBeGreaterThan(original[0]!);
    expect(treated[4]! - treated[0]!).toBeLessThan(original[4]! - original[0]!);
    expect([treated[3], treated[7]]).toEqual([51, 102]);
  });
});
