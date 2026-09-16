/**
 * harness: validates the generated GLB/VAT contract before the city renders it.
 * Bound: the three listed variants and all their LODs/clips. This catches missing,
 * corrupted, reordered or non-finite animation data; it does not prove a good
 * silhouette, natural motion, crowd collision behaviour or runtime frame rate.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { DataUtils, Matrix4, Quaternion, Vector3 } from "three";
import { HUMAN_ASSET_URLS, VEHICLE_ASSET_URL, VEHICLE_CLASSES, type AgentAssetManifest, type VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import { selectedHumanParts, type HumanGlbJson } from "../../src/agents/render/human-admission.ts";
import type { AgentAssetLod } from "../../src/world/agent-assets.ts";

const root = resolve(import.meta.dirname, "../..");
const directoryIndex = process.argv.indexOf("--directory");
const folder = resolve(directoryIndex >= 0 ? process.argv[directoryIndex + 1]! : resolve(root, "data/scene/agents"));
function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Agent asset check failed: ${message}`);
}
async function asset(file: string, expected: string): Promise<Buffer> {
  check(basename(file) === file, `asset path ${file} must be a filename inside ${folder}.`);
  const bytes = await readFile(resolve(folder, file));
  const actual = createHash("sha256").update(bytes).digest("hex");
  check(actual === expected, `${file} SHA-256 is ${actual}; manifest requires ${expected}. Rebuild this asset.`);
  return bytes;
}
async function drawnVatVertices(file: string, digest: string, vertexCount: number, lod: AgentAssetLod) {
  const bytes = await asset(file, digest);
  check(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `${file} must be a complete glTF 2 GLB.`);
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString()) as HumanGlbJson;
  const parts = selectedHumanParts(gltf, lod, file);
  const value = (id: number, index: number): number => {
    const accessor = gltf.accessors[id]!;
    const view = gltf.bufferViews[accessor.bufferView]!;
    const size = accessor.componentType === 5121 ? 1 : accessor.componentType === 5123 ? 2 : 4;
    const offset = 28 + length + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + index * (view.byteStride ?? size);
    if (accessor.componentType === 5126) return bytes.readFloatLE(offset);
    if (accessor.componentType === 5125) return bytes.readUInt32LE(offset);
    if (accessor.componentType === 5123) return bytes.readUInt16LE(offset);
    check(accessor.componentType === 5121, `${file} has an unsupported index component type ${accessor.componentType}.`);
    return bytes.readUInt8(offset);
  };
  const drawn = new Set<number>();
  let splitVertices = 0;
  for (const part of parts) {
    const primitive = gltf.meshes[part.meshIndex]!.primitives[part.primitive]!;
    const id = primitive.attributes["_VAT_ID"];
    check(id !== undefined, `${file} has a primitive without _VAT_ID.`);
    const accessor = gltf.accessors[id]!;
    check(accessor.componentType === 5126 && accessor.type === "SCALAR", `${file} _VAT_ID must be a float scalar.`);
    for (let index = 0; index < accessor.count; index++) {
      const vertex = value(id, index);
      check(Number.isInteger(vertex) && vertex >= 0 && vertex < vertexCount, `${file} _VAT_ID ${vertex} is outside ${vertexCount} baked vertices.`);
    }
    const count = primitive.indices === undefined ? accessor.count : gltf.accessors[primitive.indices]!.count;
    for (let index = 0; index < count; index++) {
      const local = primitive.indices === undefined ? index : value(primitive.indices, index);
      check(local >= 0 && local < accessor.count, `${file} triangle index ${local} is outside its primitive.`);
      drawn.add(value(id, local));
    }
    splitVertices += accessor.count;
  }
  return { drawn, splitVertices };
}
for (const url of process.argv.includes("--vehicles-only") ? [] : HUMAN_ASSET_URLS) {
const manifest = JSON.parse(await readFile(resolve(folder, basename(url)), "utf8")) as AgentAssetManifest;
check(manifest.version === 2 && manifest.units === "metres" && manifest.up === "+Y" && manifest.forward === "+Z" && manifest.origin === "feet" && manifest.yawAxis === "+Y" && manifest.vatSpace === "world-baked", "human assets must use version 2, world-baked VAT, metres, feet origin, +Y up and yaw, +Z forward. Run npm run data:agents:manifests --write to derive the version-2 fields from the delivered GLBs without replacing them, or npm run data:agents to rebuild the fleet from the pinned sources.");
check(manifest.vertexAttribute === "_VAT_ID" && manifest.textureFormat === "rgba16f-le", "GLB vertices must carry _VAT_ID into RGBA16F animation textures.");
check(["idle", "walk"].every((id) => manifest.clips.some((clip) => clip.id === id)), "both idle and walk clips are required.");
const frameCount = Math.max(...manifest.clips.map((clip) => clip.firstFrame + clip.frameCount));
for (const clip of manifest.clips) {
  check(Number.isInteger(clip.firstFrame) && clip.firstFrame >= 0 && Number.isInteger(clip.frameCount) && clip.frameCount > 1 && clip.durationSeconds > 0, `${clip.id} must contain multiple frames, a non-negative offset and positive duration.`);
  check(clip.id !== "walk" || clip.strideMetres > 0, "walk must name the metres travelled in one gait cycle.");
}
check(["near", "medium", "far"].every((id) => manifest.lods.some((lod) => lod.id === id)), "near, medium and far geometry LODs are all required.");
for (const lod of manifest.lods) {
  check(lod.textureWidth > 0 && lod.rowsPerFrame * lod.textureWidth >= lod.vertexCount && lod.textureHeight === lod.rowsPerFrame * frameCount, `${lod.id} texture dimensions must hold every vertex in every frame.`);
  const positions = await asset(lod.positions, lod.positionSha256);
  const normals = await asset(lod.normals, lod.normalSha256);
  const expectedBytes = lod.textureWidth * lod.textureHeight * 4 * 2;
  check(positions.length === expectedBytes && normals.length === expectedBytes, `${lod.id} VAT files must each contain ${expectedBytes} bytes.`);
  for (const bytes of [positions, normals]) {
    for (let offset = 0; offset < bytes.length; offset += 2) {
      check(Number.isFinite(DataUtils.fromHalfFloat(bytes.readUInt16LE(offset))), `${lod.id} has a non-finite half float at byte ${offset}.`);
    }
  }
  // Read the delivered half-float positions independently of the baker's rig
  // metrics. Follow the lowest sole vertices through each planted half-cycle.
  const { drawn, splitVertices } = await drawnVatVertices(lod.model, lod.modelSha256, lod.vertexCount, lod);
  const walk = manifest.clips.find((clip) => clip.id === "walk")!;
  const point = (frame: number, vertex: number): number[] => {
    const offset = ((walk.firstFrame + frame) * lod.rowsPerFrame * lod.textureWidth + vertex) * 8;
    return [0, 2, 4].map((component) => DataUtils.fromHalfFloat(positions.readUInt16LE(offset + component)));
  };
  let measuredSoleDrift = 0;
  let worstSole = "";
  let lowestContact = Infinity;
  let highestContact = -Infinity;
  for (const [sign, start] of [[1, 0], [-1, walk.frameCount / 2]] as const) {
    const candidates = Array.from(drawn, (id) => ({ id, p: point(start, id) }))
      .filter(({ p }) => p[0]! * sign > 0.03);
    const bottom = Math.min(...candidates.map(({ p }) => p[1]!));
    const sole = candidates.filter(({ p }) => p[1]! < bottom + 0.030);
    check(sole.length >= 3, `${lod.id} side ${sign} needs at least three drawn sole vertices; found ${sole.length}.`);
    for (let frame = start; frame < start + walk.frameCount / 2; frame++) {
      const contact = Math.min(...sole.map(({ id }) => point(frame, id)[1]!));
      lowestContact = Math.min(lowestContact, contact);
      highestContact = Math.max(highestContact, contact);
      check(Math.abs(contact) < 0.015, `${lod.id} absolute stance sole height is ${contact}m at side ${sign}, frame ${frame}; require contact within 0.015m of the ground, independently of drift.`);
    }
    for (let frame = start + 1; frame < start + walk.frameCount / 2; frame++) {
      for (const { id, p: initial } of sole) {
        const p = point(frame, id);
        const drift = Math.hypot(p[0]! - initial[0]!, p[1]! - initial[1]!, p[2]! - initial[2]! + (frame - start) / walk.frameCount * walk.strideMetres);
        if (drift > measuredSoleDrift) {
          measuredSoleDrift = drift;
          worstSole = `vertex ${id}, frame ${frame}, initial ${initial.join(",")}, current ${p.join(",")}`;
        }
      }
    }
  }
  check(measuredSoleDrift < 0.005, `${lod.id} delivered VAT sole vertices drift ${measuredSoleDrift}m in stance (${worstSole}); require less than 0.005m after actor travel.`);
  check(lod.maxAnkleTargetErrorMetres < 0.015, `${lod.id} ankle missed its stance/swing target by ${lod.maxAnkleTargetErrorMetres}m; gait contact requires less than 0.015m.`);
  check(lod.maxStanceWorldDriftMetres < 0.005, `${lod.id} stance foot drifted ${lod.maxStanceWorldDriftMetres}m after adding actor travel; require less than 0.005m.`);
  console.log(`${manifest.id}/${lod.id}: ${lod.vertexCount} baked vertices, ${splitVertices} glTF seam vertices, ${frameCount} animated frames, ${lod.bytes} bytes; sole drift ${measuredSoleDrift.toFixed(6)}m, absolute contact ${lowestContact.toFixed(6)}…${highestContact.toFixed(6)}m; hashes, VAT lookup and stance contact verified.`);
}
}

if (!process.argv.includes("--bake-only") && !process.argv.includes("--humans-only")) {
  const fleet = JSON.parse(await readFile(resolve(folder, basename(VEHICLE_ASSET_URL)), "utf8")) as VehicleAssetManifest;
  check(fleet.version === 1 && fleet.units === "metres" && fleet.up === "+Y" && fleet.forward === "+Z" && fleet.origin === "ground-centre", "vehicle frame must be version 1, metres, ground-centre origin, +Y up and +Z forward.");
  for (const [index, id] of VEHICLE_CLASSES.entries()) {
    const vehicle = fleet.vehicles[index];
    check(vehicle?.id === id, `fleet class ${index} must be ${id}.`);
    const bytes = await asset(vehicle.model, vehicle.sha256);
    check(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(8) === bytes.length, `${vehicle.model} must be a complete GLB.`);
    const jsonLength = bytes.readUInt32LE(12);
    const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()) as {
      scene?: number;
      scenes: { nodes: number[] }[];
      nodes: { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
      meshes: { primitives: { attributes: Record<string, number> }[] }[];
      accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number; type: string }[];
      bufferViews: { byteOffset?: number; byteStride?: number }[];
    };
    const minimum = new Vector3(Infinity, Infinity, Infinity);
    const maximum = new Vector3(-Infinity, -Infinity, -Infinity);
    let wheels = 0;
    const visit = (nodeIndex: number, parent: Matrix4): void => {
      const node = gltf.nodes[nodeIndex]!;
      const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
        new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1]));
      const matrix = parent.clone().multiply(local);
      const centre = new Vector3().setFromMatrixPosition(matrix);
      const wheel = vehicle.wheelObjects.includes(node.name ?? "");
      let radius = 0;
      if (wheel) wheels++;
      if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        const accessor = gltf.accessors[primitive.attributes["POSITION"]!]!;
        check(accessor.componentType === 5126 && accessor.type === "VEC3", `${vehicle.model} positions must be float XYZ.`);
        const view = gltf.bufferViews[accessor.bufferView]!;
        const start = 28 + jsonLength + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        for (let vertex = 0; vertex < accessor.count; vertex++) {
          const offset = start + vertex * (view.byteStride ?? 12);
          const point = new Vector3(bytes.readFloatLE(offset), bytes.readFloatLE(offset + 4), bytes.readFloatLE(offset + 8)).applyMatrix4(matrix);
          check(Number.isFinite(point.x + point.y + point.z), `${vehicle.model} has a non-finite position.`);
          minimum.min(point); maximum.max(point);
          if (wheel) radius = Math.max(radius, Math.hypot(point.y - centre.y, point.z - centre.z));
        }
      }
      if (wheel) check(Math.abs(radius - vehicle.wheelRadius) < 0.00001 && Math.abs(centre.y - radius) < 0.00001, `${vehicle.model}/${node.name} radius ${radius} and centre Y ${centre.y} must agree with ${vehicle.wheelRadius}m rolling radius and ground contact.`);
      for (const child of node.children ?? []) visit(child, matrix);
    };
    for (const node of gltf.scenes[gltf.scene ?? 0]!.nodes) visit(node, new Matrix4());
    check(wheels === 4, `${vehicle.model} must contain its four named wheel assemblies; found ${wheels}.`);
    check(Math.abs(minimum.y) < 0.00001, `${vehicle.model} actual minimum Y is ${minimum.y}; ground contact must be zero, including liners and body trim.`);
    check(Math.max(Math.abs(minimum.x), Math.abs(maximum.x)) * 2 <= vehicle.collision.width + 0.00001 && Math.max(Math.abs(minimum.z), Math.abs(maximum.z)) * 2 <= vehicle.collision.length + 0.00001, `${vehicle.model} collision envelope must contain actual mirrors, bumpers and wheels.`);
    console.log(`${id}: actual GLB ground contact, four rolling radii and ${vehicle.collision.width.toFixed(3)}m × ${vehicle.collision.length.toFixed(3)}m collision envelope verified.`);
  }
}
