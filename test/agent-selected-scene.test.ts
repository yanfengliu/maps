/** Bound: selected-scene membership/transforms and actual GLTFLoader admission.
 * Hash-preserving binary mutation controls live in tools/agents/prove-scene.ts.
 */
import { Matrix4 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { admitHumanDraws, selectedHumanParts, type HumanGlbJson } from "../src/agents/render/human-admission.js";
import type { AgentAssetLod } from "../src/world/agent-assets.js";

function fixture(): { json: HumanGlbJson; lod: AgentAssetLod; binary: Buffer } {
  const bindMatrix = new Matrix4().makeTranslation(0, .004, 0).toArray();
  const json: HumanGlbJson = {
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: "rig", translation: [0, .004, 0], children: [1, 2] }, { name: "body", mesh: 0 }, { name: "shoes", mesh: 1 }],
    meshes: [0, 1].map(i => ({ primitives: [{ attributes: { POSITION: i * 2, _VAT_ID: i * 2 + 1 } }] })),
    accessors: [0, 1].flatMap(i => [{ bufferView: i * 2, componentType: 5126, type: "VEC3", count: 3, min: [0,0,0], max: [1,1,0] }, { bufferView: i * 2 + 1, componentType: 5126, type: "SCALAR", count: 3 }]),
    bufferViews: [{ byteOffset: 0 }, { byteOffset: 36 }, { byteOffset: 48 }, { byteOffset: 84 }],
  };
  const lod: AgentAssetLod = { id: "near", model: "fixture.glb", modelSha256: "fixture", vertexCount: 6,
    drawParts: ["body", "shoes"].map(node => ({ node, primitive: 0, vertexCount: 3, indexCount: 3, bindMatrix })),
    bounds: { min: [0,0,0], max: [1,1,0] }, positions: "p", normals: "n", positionSha256: "p", normalSha256: "n",
    textureWidth: 8, textureHeight: 1, rowsPerFrame: 1, bytes: 96, maxAnkleTargetErrorMetres: 0, maxStanceWorldDriftMetres: 0 };
  const floats = new Float32Array([0,0,0, 1,0,0, 0,1,0, 0,1,2, 0,0,0, 1,0,0, 0,1,0, 3,4,5]);
  return { json, lod, binary: Buffer.from(floats.buffer) };
}

async function load(json: HumanGlbJson, binary: Buffer) {
  const document = { ...json, asset: { version: "2.0" }, buffers: [{ byteLength: binary.length }],
    bufferViews: json.bufferViews.map((view, i) => ({ ...view, buffer: 0, byteLength: i % 2 === 0 ? 36 : 12 })) };
  const encoded = Buffer.from(JSON.stringify(document));
  const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(padded);
  const glb = Buffer.alloc(28 + padded.length + binary.length);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20);
  glb.writeUInt32LE(binary.length, 20 + padded.length); glb.writeUInt32LE(0x004e4942, 24 + padded.length); binary.copy(glb, 28 + padded.length);
  return new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length) as ArrayBuffer, "");
}

describe("human selected-scene admission", () => {
  it("accepts the actual loader's two transformed required primitives without double-applying their bind transform", async () => {
    const { json, lod, binary } = fixture();
    const model = await load(json, binary);
    const meshes = admitHumanDraws(model, lod, "fixture");
    expect(meshes).toHaveLength(2);
    expect(meshes[0]!.matrixWorld.elements[13]).toBe(.004);
    expect(selectedHumanParts(json, lod, "fixture")[1]!.node).toBe("shoes");
    for (const mesh of meshes) mesh.geometry.dispose();
  });
  it.each(["empty", "orphan-shoes", "transform", "duplicate"] as const)("rejects %s while the original mesh pool remains intact", async mutation => {
    const { json, lod, binary } = fixture();
    if (mutation === "empty") json.scenes[0]!.nodes = [];
    if (mutation === "orphan-shoes") json.nodes[0]!.children = [1];
    if (mutation === "transform") json.nodes[0]!.translation = [0, .3, 0];
    if (mutation === "duplicate") json.nodes[0]!.children = [1, 2, 2];
    expect(json.meshes).toHaveLength(2);
    expect(() => selectedHumanParts(json, lod, "fixture")).toThrow(/selected scene/);
    if (mutation !== "duplicate") {
      const model = await load(json, binary);
      expect(() => admitHumanDraws(model, lod, "fixture")).toThrow(/selected scene/);
    }
  });
  it("rejects a loader scene that instantiates none of its advertised draws", async () => {
    const { json, lod, binary } = fixture();
    const model = await load(json, binary);
    model.scene.clear();
    expect(() => admitHumanDraws(model, lod, "fixture")).toThrow("loader omitted 2 required drawable primitives");
  });
});
