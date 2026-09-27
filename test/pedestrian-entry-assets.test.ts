/** Bound: every selected indexed VAT point of the three pinned delivered humans,
 * all LODs and frames, plus the actual upright renderer instance transform.
 * Convex frame/clip interpolation cannot escape the resulting cylinder.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { DataUtils, Matrix4 } from "three";
import { describe, expect, it } from "vitest";
import { selectedHumanParts, type HumanGlbJson } from "../src/agents/render/human-admission.ts";
import { writeInstanceMatrix, writePoseMatrix } from "../src/agents/render/pose.ts";
import { createSlotTable, placeSlot, spawnSlot, stageSlot } from "../src/agents/population/slots.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { PEDESTRIAN_ENTRY_BOUNDS, pedestrianEntryBody } from "../src/agents/population/pedestrian-entry.ts";
import type { AgentAssetManifest } from "../src/world/agent-assets.ts";
import { ROOT } from "./population-fixture.ts";

const pins = [
  ["commuter-male", "72a2230ae9283d66670aaa9a493895e67de357b65a2406b70d36a2f89d1e8718"],
  ["office-male", "3e6ca8dae64f303197a71669c6b156ac36cb55740d9468e859c3253226e215f1"],
  ["commuter-female", "3228439e0f0b6a0082f80750e2a3e315a1a234a6b7ce639023fe3000f0aa6d92"],
] as const;
const asset = (name: string, hash: string): Buffer => {
  const bytes = readFileSync(resolve(ROOT, "data/scene/agents", name));
  expect(createHash("sha256").update(bytes).digest("hex"), `${name} needs reviewed cached bytes`).toBe(hash);
  return bytes;
};

describe("displayed entry envelope contains the delivered mesh", () => {
  for (const [variant, [id, pin]] of pins.entries()) it(`${id}: all drawn points, LODs and animation frames`, () => {
    const manifest = JSON.parse(asset(`${id}.json`, pin).toString()) as AgentAssetManifest;
    const poses = createSlotTable(populationSettings({ pedestrians: 1, vehicles: 0 })).poses.pedestrians;
    poses.scale[0] = 1.08;
    placeSlot(poses, 0, { x: 499.125, y: 32.75, z: -499.375 }, 0.713);
    spawnSlot(poses, 0); stageSlot(poses, 0);
    const matrix = new Matrix4(), instance = new Float32Array(16);
    writePoseMatrix(poses, 0, 0.37, matrix); writeInstanceMatrix(matrix, instance, 0);
    const envelope = pedestrianEntryBody({ x: instance[12]!, y: instance[13]!, z: instance[14]! }, variant, poses.scale[0]!);
    let checked = 0, maximumRadius = 0, minimumY = Infinity, maximumY = -Infinity, nominalRadiusEscapes = 0;
    for (const lod of manifest.lods) {
      const model = asset(lod.model, lod.modelSha256);
      const jsonLength = model.readUInt32LE(12);
      expect(model.readUInt32LE(24 + jsonLength)).toBe(0x004e4942);
      const gltf = JSON.parse(model.subarray(20, 20 + jsonLength).toString()) as HumanGlbJson;
      const binStart = 28 + jsonLength;
      const parts = selectedHumanParts(gltf, lod, `${id}/${lod.id}`);
      expect(parts).toHaveLength(6);
      const value = (accessor: number, index: number): number => {
        const acc = gltf.accessors[accessor]!, view = gltf.bufferViews[acc.bufferView]!;
        const size = acc.componentType === 5121 ? 1 : acc.componentType === 5123 ? 2 : 4;
        const offset = binStart + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0) + index * (view.byteStride ?? size);
        if (acc.componentType === 5126) return model.readFloatLE(offset);
        if (acc.componentType === 5125) return model.readUInt32LE(offset);
        if (acc.componentType === 5123) return model.readUInt16LE(offset);
        expect(acc.componentType).toBe(5121); return model.readUInt8(offset);
      };
      const drawn = new Set<number>();
      for (const part of parts) {
        const primitive = gltf.meshes[part.meshIndex]!.primitives[part.primitive]!;
        const lookup = primitive.attributes["_VAT_ID"]!;
        const acc = gltf.accessors[lookup]!;
        expect(acc.type).toBe("SCALAR"); expect(acc.componentType).toBe(5126);
        const count = primitive.indices === undefined ? acc.count : gltf.accessors[primitive.indices]!.count;
        for (let i = 0; i < count; i++) {
          const local = primitive.indices === undefined ? i : value(primitive.indices, i);
          const vertex = value(lookup, local);
          if (!Number.isInteger(vertex) || vertex < 0 || vertex >= lod.vertexCount) throw new Error(`${id}/${lod.id}: invalid drawn VAT vertex ${vertex}`);
          drawn.add(vertex);
        }
      }
      const vat = asset(lod.positions, lod.positionSha256);
      const frameCount = Math.max(...manifest.clips.map(clip => clip.firstFrame + clip.frameCount));
      expect(frameCount).toBe(48);
      expect(vat.length).toBe(lod.textureWidth * lod.textureHeight * 8);
      for (let frame = 0; frame < frameCount; frame++) for (const vertex of drawn) {
        const offset = (frame * lod.rowsPerFrame * lod.textureWidth + vertex) * 8;
        const x = DataUtils.fromHalfFloat(vat.readUInt16LE(offset)), y = DataUtils.fromHalfFloat(vat.readUInt16LE(offset + 2)), z = DataUtils.fromHalfFloat(vat.readUInt16LE(offset + 4));
        const radius = Math.hypot(x, z);
        maximumRadius = Math.max(maximumRadius, radius); minimumY = Math.min(minimumY, y); maximumY = Math.max(maximumY, y);
        if (radius > 0.25) nominalRadiusEscapes++;
        // Float32 instance upload and multiply/add rounding, at AOI-scale origins.
        const world = (row: number) => Math.fround(Math.fround(Math.fround(instance[row]! * x) + Math.fround(instance[row + 4]! * y)) + Math.fround(instance[row + 8]! * z) + instance[row + 12]!);
        const wx = world(0), wy = world(1), wz = world(2);
        if (Math.hypot(wx - envelope.x, wz - envelope.z) > envelope.radiusM || wy < envelope.minimumY || wy > envelope.maximumY) {
          throw new Error(`${id}/${lod.id} frame ${frame} vertex ${vertex} escapes the displayed entry envelope at actual renderer scale/yaw`);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100_000);
    expect(maximumRadius).toBeLessThan(PEDESTRIAN_ENTRY_BOUNDS[variant]!.radiusM);
    expect(minimumY).toBeGreaterThan(PEDESTRIAN_ENTRY_BOUNDS[variant]!.minimumY);
    expect(maximumY).toBeLessThan(PEDESTRIAN_ENTRY_BOUNDS[variant]!.maximumY);
    expect(nominalRadiusEscapes).toBeGreaterThan(10_000);
  });
});
