/** Bound: exact cached518 decode, original mesh/UV preservation, emitted scalar
 * eligibility arithmetic and complete plugin fetch. No pixel/reflectance claim. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { BufferAttribute, BufferGeometry, Group, Matrix3, Mesh, MeshStandardMaterial, ShaderLib, Texture, Vector3 } from "three";
import { parseB3dm, parseGlb, readBatchColumn } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { CROSSING_CORNER, CROSSING_CORNER_GLSL, prepareCrossingCorner } from "../src/scene/crossing-corner-material.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";
import { createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";

const bytes = readFileSync(new URL("../data/scene/buildings/data/data518.b3dm", import.meta.url));
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
expect(sha(bytes), "Restore the reviewed cached data518; no remote fetch or substituted source").toBe("5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b");
const b3dm = parseB3dm(bytes), glb = parseGlb(b3dm.glb);
const decoded = await decodePrimitive(glb.json, glb.binary!, glb.json.meshes![0]!.primitives[1]!, true);
const untextured = await decodePrimitive(glb.json, glb.binary!, glb.json.meshes![0]!.primitives[0]!, true);
const gml = readBatchColumn(b3dm.batchTableJson, b3dm.batchTableBinary, "gml_id", b3dm.featureTableJson.BATCH_LENGTH as number);
const geometry = new BufferGeometry();
geometry.setAttribute("position", new BufferAttribute(decoded.positions, 3));
geometry.setAttribute("normal", new BufferAttribute(decoded.surface!.normals, 3));
geometry.setAttribute("uv", new BufferAttribute(decoded.surface!.uv!, 2));
geometry.setAttribute("_batchid", new BufferAttribute(decoded.batchIds!, 1));
geometry.setIndex(new BufferAttribute(decoded.surface!.indices, 1));
afterAll(() => geometry.dispose());
function fixture(identity = true) {
  const scene = new Group() as Group & { batchTable: { getDataFromId(id: number): Record<string, unknown> } };
  scene.batchTable = { getDataFromId: id => ({ gml_id: identity ? gml[id] : "bldg_wrong" }) };
  const texture = new Texture({ width: 1, height: 1 } as never); texture.flipY = false;
  const material = new MeshStandardMaterial({ map: texture });
  const mesh = new Mesh(geometry.clone(), material);
  const plainGeometry = new BufferGeometry(); plainGeometry.setAttribute("position", new BufferAttribute(untextured.positions, 3)); plainGeometry.setAttribute("normal", new BufferAttribute(untextured.surface!.normals, 3)); plainGeometry.setAttribute("_batchid", new BufferAttribute(untextured.batchIds!, 1)); plainGeometry.setIndex(new BufferAttribute(untextured.surface!.indices, 1));
  const plainMaterial = new MeshStandardMaterial(), plain = new Mesh(plainGeometry, plainMaterial); scene.add(plain);
  scene.matrix.fromArray(glb.json.nodes![1]!.matrix!); scene.matrixAutoUpdate = false; scene.add(mesh); scene.updateMatrixWorld(true);
  return { scene, mesh, plain, material, texture, dispose() { plainGeometry.dispose(); plainMaterial.dispose(); mesh.geometry.dispose(); material.map?.dispose(); if (material.map !== texture) texture.dispose(); material.dispose(); } };
}
function sample(mesh: Mesh, face: number, weights: number[]) {
  const p = new Vector3(), n = new Vector3(), uv = [0, 0];
  for (let i = 0; i < 3; i++) {
    const id = mesh.geometry.index!.getX(face * 3 + i), weight = weights[i]!;
    p.addScaledVector(new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), id).applyMatrix4(mesh.matrixWorld), weight);
    n.addScaledVector(new Vector3().fromBufferAttribute(mesh.geometry.getAttribute("normal"), id).applyNormalMatrix(new Matrix3().getNormalMatrix(mesh.matrixWorld)), weight);
    uv[0]! += mesh.geometry.getAttribute("uv").getX(id) * weight; uv[1]! += mesh.geometry.getAttribute("uv").getY(id) * weight;
  }
  return [...p.toArray(), ...n.normalize().toArray(), ...uv, 1];
}
// Evaluate the actual emitted scalar predicate, not a duplicate CPU classifier.
const scalar = CROSSING_CORNER_GLSL.split("float mapsCrossingCorner(")[0]!.replace(/float (mapsCorner\w+)\(/g, "function $1(").replace(/float (\w+)(?=\s*[,\)])/g, "$1").replace(/(?:float|bool) (\w+)\s*=/g, "let $1 =");
const smoothstep = (lo: number, hi: number, v: number) => { const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return t*t*(3-2*t); };
const predicate = new Function("abs", "smoothstep", scalar + "return mapsCornerWeight;")(Math.abs, smoothstep) as (...values: number[]) => number;

describe("source-bound lower crossing frontage", () => {
  it("admits both decoded lower triangles and excludes upper, side, wrong UV/normal/plane", () => {
    const f = fixture();
    try {
      const lower = sample(f.mesh, 494, [.6, .08, .32]); expect(predicate(...lower)).toBe(1);
      expect(predicate(...sample(f.mesh, 495, [.05, .05, .9]))).toBe(1);
      expect(predicate(...sample(f.mesh, 494, [.15, .7, .15]))).toBe(0);
      expect(predicate(...sample(f.mesh, 481, [.6, .08, .32]))).toBe(0);
      for (const mutate of [(v: number[]) => { v[7] = .8; }, (v: number[]) => { v[8] = 0; }, (v: number[]) => { v[3]! *= -1; v[4]! *= -1; v[5]! *= -1; }, (v: number[]) => { v[2]! += .02; }]) {
        const v = lower.slice(); mutate(v); expect(predicate(...v)).toBe(0);
      }
      const y0 = sample(f.mesh, 494, [1,0,0])[1]!, y1 = sample(f.mesh, 494, [0,1,0])[1]!;
      const t = (27.2-y0)/(y1-y0); const transition = sample(f.mesh,494,[.8-t,t,.2]);
      expect(predicate(...transition)).toBeGreaterThan(0); expect(predicate(...transition)).toBeLessThan(1);
    } finally { f.dispose(); }
  });
  it.each(["good", "wrong-bytes", "wrong-gml", "wrong-uv", "other-lod"])("checks %s through actual tile fetch/plugin, retaining source arrays", async mode => {
    const f = fixture(mode !== "wrong-gml"); const oldArrays = ["position","normal","uv","_batchid"].map(n => sha(new Uint8Array(f.mesh.geometry.getAttribute(n).array.buffer))); const indices = sha(new Uint8Array(f.mesh.geometry.index!.array.buffer));
    const plugin = new FacadeTexturePlugin({ ...DEFAULT_FACADE_OPTIONS, signageIntensity: { value: 1 }, style: createFacadeStyle(worldStyle("satellite")) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(mode === "wrong-bytes" ? new Uint8Array([1,2,3]) : Uint8Array.from(bytes))));
    vi.stubGlobal("OffscreenCanvas", class { getContext() { return { drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([150,150,150,255]) }; } }; } });
    try {
      if (mode === "wrong-bytes") { await expect(plugin.fetchData("/scene/buildings/data/data518.b3dm", {})).rejects.toThrow(/SHA-256/); return; }
      if (mode === "other-lod") { prepareCrossingCorner(f.scene,"data/data517.b3dm",undefined); expect(f.mesh.geometry.getAttribute("mapsCornerEligible")).toBeUndefined(); return; }
      await plugin.fetchData("/scene/buildings/data/data518.b3dm", {});
      if (mode === "wrong-uv") { f.texture.offset.set(.1,.2); await expect(plugin.processTileModel(f.scene,{ content: { uri: CROSSING_CORNER.tileUri } })).rejects.toThrow(/UV0-orientation/); expect(f.material.map).toBe(f.texture); return; }
      await plugin.processTileModel(f.scene,{ content: { uri: CROSSING_CORNER.tileUri } });
      expect(f.plain.geometry.getAttribute("mapsCornerEligible")).toBeUndefined();
      const attribute = f.mesh.geometry.getAttribute("mapsCornerEligible");
      if (mode === "wrong-gml") { expect(attribute).toBeUndefined(); expect(f.material.userData.mapsCrossingCorner).toBeUndefined(); }
      else {
        expect(attribute.count).toBe(decoded.vertexCount); // Exactly4 bytes per vertex on this bound mesh.
        expect(attribute.array.byteLength).toBe(decoded.vertexCount*4);
        const faceVertex = f.mesh.geometry.index!.getX(494*3); expect(attribute.getX(faceVertex)).toBe(1);
        expect(Array.from(attribute.array).some(v=>v===0)).toBe(true);
        const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader }; f.material.onBeforeCompile(shader as never,{} as never);
        expect(shader.vertexShader).toContain("mapsCornerBinding = mapsCornerEligible");
        expect(shader.fragmentShader).toContain("mapsCrossingCorner(mapsWorld, mapsNormal, mapsSourceUv, mapsCornerBinding)");
        expect(shader.fragmentShader).toContain("* (1.0 - corner)");
        expect(shader.fragmentShader).toContain("metalnessFactor = mix(metalnessFactor, 0.0, corner)");
        expect(shader.fragmentShader.indexOf("float corner =")).toBeGreaterThan(shader.fragmentShader.indexOf("} else if (mapsGrid > 0.5)"));
      }
      expect(["position","normal","uv","_batchid"].map(n=>sha(new Uint8Array(f.mesh.geometry.getAttribute(n).array.buffer)))).toEqual(oldArrays);
      expect(sha(new Uint8Array(f.mesh.geometry.index!.array.buffer))).toBe(indices);
    } finally { vi.unstubAllGlobals(); f.dispose(); }
  });
});
