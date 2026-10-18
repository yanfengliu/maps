/** Bounds: actual street-detail construction, source population/footprints,
 * finite support probes, UV phase, texture content/cost and resource ownership.
 * Native headless images separately check appearance and raster depth ordering.
 */
import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { DataTexture, LinearMipmapLinearFilter, Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { createStreetDetails } from "../src/scene/street-details.js";
import { createTactileFinish } from "../src/scene/tactile-paving.js";
import { createSurfaceMaterial } from "../src/scene/surface-materials.js";
import { createPaintSupport } from "../src/scene/paint-support.js";
import { decodeMesh } from "../src/world/mesh.js";
import { worldStyle } from "../src/world/styles.js";
import type { NetworkData, PhysicalTactilePath } from "../src/world/network-data.js";

const style = worldStyle("satellite");
const path = (id: string, points: number[][], extent: PhysicalTactilePath["extent"] = "path"): PhysicalTactilePath => ({
  id, sourceWayId: 1, sourceReason: "tactile_paving_tag", extent,
  paths: [points.map(([x, z]) => ({ x: x!, y: 15, z: z! }))],
});
const fixture = (tactilePaths: PhysicalTactilePath[]): NetworkData => ({ physical: { crossings: [], tactilePaths, trafficControls: [] }, lanes: [], junctions: [] }) as unknown as NetworkData;
const pixel = (texture: DataTexture, u: number, v: number): number => {
  const image = texture.image as { data: Uint8Array; width: number; height: number };
  return image.data[(Math.floor(v * image.height) * image.width + Math.floor(u * image.width)) * 4]!;
};

it("builds directional relief and tile joints with deterministic mipped material data", () => {
  const a = createTactileFinish(style), b = createTactileFinish(style), sidewalk = createSurfaceMaterial("sidewalk", style);
  try {
    const textures = [a.material.map, a.material.bumpMap, a.material.roughnessMap] as DataTexture[];
    expect(textures.every(t => t instanceof DataTexture && t.generateMipmaps && t.minFilter === LinearMipmapLinearFilter && t.wrapS === RepeatWrapping && t.wrapT === RepeatWrapping)).toBe(true);
    expect(a.material.map!.colorSpace).toBe(SRGBColorSpace);
    expect(textures.reduce((sum, t) => sum + (t.image.data as Uint8Array).byteLength, 0)).toBe(786432);
    for (const [index, second] of [b.material.map, b.material.bumpMap, b.material.roughnessMap].entries()) expect(textures[index]!.image.data).toEqual(second!.image.data);
    // Four longitudinal high strips, with a low joint between .3m tiles.
    for (const u of [.125, .375, .625, .875]) {
      expect(pixel(a.material.bumpMap as DataTexture, u, .125)).toBeGreaterThan(200);
      expect(pixel(a.material.bumpMap as DataTexture, u, .0001)).toBeLessThan(10);
      expect(pixel(a.material.roughnessMap as DataTexture, u, .125)).toBeLessThan(215);
    }
    for (const u of [.25, .5, .75]) expect(pixel(a.material.bumpMap as DataTexture, u, .125)).toBeLessThan(40);
    expect(a.material.bumpScale).toBe(.005);
    // Physical top height alone did not outrank the sidewalk's slope bias in
    // the first native prototype. Keep the real material relationship explicit.
    expect(a.material.polygonOffset).toBe(true);
    expect(a.material.polygonOffsetFactor).toBeLessThan(sidewalk.material.polygonOffsetFactor);
    expect(a.material.polygonOffsetUnits).toBeLessThan(sidewalk.material.polygonOffsetUnits);
  } finally { a.dispose(); b.dispose(); sidewalk.dispose(); }
});

it("keeps short, long and bent source segments, carries tile phase and excludes unqualified extents", () => {
  const sources = [path("bent", [[0, 0], [1, 0], [1, 2], [1.06, 2]]), path("endpoints", [[0, 3], [4, 3]], "endpoints"), path("unspecified", [[0, 4], [4, 4]], "unspecified")];
  const streets = createStreetDetails(fixture(sources), style, () => 15);
  try {
    const mesh = streets.root.getObjectByName("streets:tactile-paving") as Mesh;
    const position = mesh.geometry.getAttribute("position"), uv = mesh.geometry.getAttribute("uv");
    expect(streets.paintPlacements.map(p => [p.sourceId, p.partIndex, p.status])).toEqual([["bent", 0, "placed"], ["bent", 1, "placed"], ["bent", 2, "placed"]]);
    expect(uv.count).toBe(position.count);
    let distanceM = 0;
    for (const p of streets.paintPlacements) {
      const dx = p.end.x - p.start.x, dz = p.end.z - p.start.z, length = Math.hypot(dx, dz);
      for (let i = p.vertexStart; i < p.vertexStart + p.vertexCount; i++) {
        const along = ((position.getX(i) - p.start.x) * dx + (position.getZ(i) - p.start.z) * dz) / length;
        const across = ((position.getX(i) - p.start.x) * -dz + (position.getZ(i) - p.start.z) * dx) / length;
        expect(uv.getY(i) * 1.2).toBeCloseTo(distanceM + along, 5);
        expect(uv.getX(i)).toBeCloseTo(across / .3 + .5, 5);
        expect(position.getY(i)).toBeCloseTo(15.02, 5);
        expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-5); expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-5);
      }
      distanceM += length;
    }
    // Unsupported segments do not acquire texture/geometry by partial emission.
    const absent = createStreetDetails(fixture([sources[0]!]), style, () => undefined);
    try { expect(absent.paintPlacements.every(p => p.status === "unplaced" && p.vertexCount === 0)).toBe(true); }
    finally { absent.dispose(); }
  } finally { streets.dispose(); }
});

it("shares one finish through real style application and disposes every owned resource once", () => {
  const streets = createStreetDetails(fixture([path("run", [[0, 0], [3, 0]])]), style, () => 15);
  const mesh = streets.root.getObjectByName("streets:tactile-paving") as Mesh;
  const material = mesh.material as MeshStandardMaterial, textures = [material.map!, material.bumpMap!, material.roughnessMap!];
  let materialDisposals = 0, textureDisposals = 0, geometryDisposals = 0;
  material.addEventListener("dispose", () => materialDisposals++);
  textures.forEach(texture => texture.addEventListener("dispose", () => textureDisposals++));
  mesh.geometry.addEventListener("dispose", () => geometryDisposals++);
  streets.setStyle(worldStyle("cartographic")); streets.setStyle(style);
  expect(mesh.material).toBe(material); expect([material.map, material.bumpMap, material.roughnessMap]).toEqual(textures);
  streets.dispose(); expect([materialDisposals, textureDisposals, geometryDisposals]).toEqual([1, 3, 1]);
});

it("retains the cached16-feature267-segment population and bounded actual support", async () => {
  const sourcePins = [
    { file: "data/network/network.json", pins: [[10239410, "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677"], [10301111, "1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f"]] },
    { file: "data/scene/roads.mesh", pins: [[6509676, "0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc"]] },
    { file: "data/scene/pavements.mesh", pins: [[13071300, "841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6"]] },
  ];
  const inputs = await Promise.all(sourcePins.map(async ({ file, pins }) => {
    const bytes = await readFile(file).catch(cause => { throw new Error(`Tactile regression requires reviewed cached ${file}; restore the recorded scene/network cache before npm test. No download or skip is performed.`, { cause }); });
    expect(pins, `Restore reviewed OLD or fresh1695 ${file}; changed source needs review.`).toContainEqual([bytes.length, createHash("sha256").update(bytes).digest("hex")]); return bytes;
  }));
  const network = JSON.parse(inputs[0]!.toString()) as NetworkData;
  const support = createPaintSupport(decodeMesh(inputs[1]!), decodeMesh(inputs[2]!));
  const streets = createStreetDetails({ ...network, physical: { ...network.physical, crossings: [], trafficControls: [] } }, style, support);
  try {
    expect(network.physical.tactilePaths.filter(p => p.extent === "path")).toHaveLength(16);
    expect(streets.paintPlacements).toHaveLength(267);
    const sourceSegments = network.physical.tactilePaths.filter(p => p.extent === "path").flatMap(feature =>
      feature.paths.flatMap((points, pathIndex) => points.slice(1).map((end, partIndex) =>
        ({ sourceId: feature.id, pathIndex, partIndex, start: points[partIndex]!, end }))));
    expect(streets.paintPlacements.map(({ sourceId, pathIndex, partIndex, start, end }) => ({ sourceId, pathIndex, partIndex, start, end }))).toEqual(sourceSegments);
    expect(new Set(streets.paintPlacements.map(p => p.sourceId)).size).toBe(16);
    expect(streets.paintPlacements.filter(p => p.status === "placed")).toHaveLength(260);
    expect(streets.paintPlacements.filter(p => p.status === "unplaced")).toHaveLength(7);
    const geometry = (streets.root.getObjectByName("streets:tactile-paving") as Mesh).geometry;
    const p = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
    expect(p.count).toBe(18144); expect(uv.count).toBe(p.count);
    expect(Array.from(uv.array).every(Number.isFinite)).toBe(true);
    // Preserve width/segment footprints and sampled top clearance using the
    // actual accepted triangles, not the material's declared lift constant.
    for (const placement of streets.paintPlacements) {
      if (placement.status !== "placed") { expect(placement.vertexCount).toBe(0); continue; }
      const a = placement.start, b = placement.end, dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (let i = placement.vertexStart; i < placement.vertexStart + placement.vertexCount; i += 3) {
        for (const weights of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3], [.5, .25, .25], [.25, .5, .25], [.25, .25, .5]]) {
          const at = (axis: "X" | "Y" | "Z"): number => weights.reduce((sum, w, j) => sum + w * p[`get${axis}`](i + j), 0);
          const x = at("X"), y = at("Y"), z = at("Z"), along = ((x - a.x) * dx + (z - a.z) * dz) / length;
          expect(Math.abs(((x - a.x) * -dz + (z - a.z) * dx) / length)).toBeLessThanOrEqual(.15005);
          expect(along).toBeGreaterThanOrEqual(-.00005); expect(along).toBeLessThanOrEqual(length + .00005);
          const expected = a.y + (b.y - a.y) * Math.max(0, Math.min(1, along / length)), top = support(x, z, expected);
          expect(top).toBeDefined(); expect(y - top!).toBeGreaterThan(.004); expect(y - top!).toBeLessThan(.035);
        }
      }
    }
  } finally { streets.dispose(); }
}, 30_000);
