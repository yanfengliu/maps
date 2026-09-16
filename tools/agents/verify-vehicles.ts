/** harness: ordinary vehicle-only asset admission; no human pipeline or downloaded assets.
 * Bounds: actual selected GLB triangles, nominal metadata and continuous wheel clearance.
 * Visual/world/population acceptance is separate. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh, Texture } from "three";
import { VEHICLE_CLASSES, type VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import { verifyVehicleGeometry } from "./vehicle-clearance.ts";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function readInput(file: string): Promise<Buffer> {
  try { return await readFile(file); }
  catch (cause) { throw new Error(`Vehicle asset input ${file} could not be read: ${cause instanceof Error ? cause.message : String(cause)}. Run npm run data:vehicles to rebuild the fleet.`, { cause }); }
}
function parseInput(text: string, file: string): unknown {
  try { return JSON.parse(text); }
  catch (cause) { throw new Error(`Vehicle asset input ${file} contains malformed JSON: ${cause instanceof Error ? cause.message : String(cause)}. Run npm run data:vehicles to rebuild the fleet.`, { cause }); }
}
function check(ok: boolean, message: string): asserts ok {
  if (!ok) throw new Error(`Vehicle asset check failed: ${message}. Run npm run data:vehicles to rebuild the fleet.`);
}
export function validateVehicleManifest(value: unknown): asserts value is VehicleAssetManifest & { recipeSha256: string; blenderVersion: string } {
  const m = value as VehicleAssetManifest & { recipeSha256?: string; blenderVersion?: string };
  check(!!m && m.version === 1 && m.units === "metres" && m.up === "+Y" && m.forward === "+Z" && m.origin === "ground-centre" && m.yawAxis === "+Y", "vehicles.json must declare version1, metres, ground-centre, +Y up/yaw and +Z forward");
  check(m.licence === "MIT" && typeof m.source === "string" && m.source.length > 0 && /^[a-f0-9]{64}$/.test(m.recipeSha256 ?? "") && m.blenderVersion === "5.2.0 LTS", "vehicles.json requires the original MIT source, recipe digest and pinned Blender5.2.0 LTS");
  check(Array.isArray(m.vehicles) && m.vehicles.length === 3, "vehicles.json requires exactly kei, taxi and bus in that order");
  for (const [i, id] of VEHICLE_CLASSES.entries()) {
    const v = m.vehicles[i]; check(!!v && v.id === id, `fleet slot ${i} must be ${id}`);
    check(v.model === `vehicle-${id}.glb` && basename(v.model) === v.model && /^[a-f0-9]{64}$/.test(v.sha256), `${id} requires its local model filename and SHA-256`);
    const sizes = [v.bytes, v.vertexCount, v.length, v.width, v.height, v.wheelRadius, v.collision?.width, v.collision?.length, v.axles?.trackMetres];
    check(sizes.every(x => Number.isFinite(x) && x > 0) && Number.isInteger(v.bytes) && Number.isInteger(v.vertexCount), `${id} dimensions/counts must be finite and positive`);
    check(Number.isFinite(v.axles?.frontZ) && Number.isFinite(v.axles?.rearZ) && v.axles.frontZ > v.axles.rearZ, `${id} must declare ordered front/rear axles`);
    check(Array.isArray(v.bounds?.min) && Array.isArray(v.bounds?.max) && v.bounds.min.length === 3 && v.bounds.max.length === 3 && v.bounds.min.every((x: number, a: number) => Number.isFinite(x) && Number.isFinite(v.bounds.max[a]) && x < v.bounds.max[a]!), `${id} requires finite ordered XYZ bounds`);
    check(Array.isArray(v.wheelObjects) && v.wheelObjects.length === 4 && new Set(v.wheelObjects).size === 4 && v.wheelObjects.every((x: string) => typeof x === "string" && x.length > 0), `${id} requires four unique named wheel roots`);
  }
}

export function validateVehicleGlb(bytes: Buffer, file: string): void {
  check(bytes.length >= 28 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `${file} is not a complete glTF2 GLB`);
  const size = bytes.readUInt32LE(12);
  check(bytes.readUInt32LE(16) === 0x4e4f534a && size % 4 === 0 && size + 28 <= bytes.length, `${file} has an invalid JSON chunk`);
  const json = parseInput(bytes.subarray(20, 20 + size).toString("utf8"), `${file} JSON chunk`) as { buffers?: { uri?: string }[]; images?: unknown[]; textures?: unknown[]; scenes?: { nodes?: number[] }[]; scene?: number };
  check(!!json && typeof json === "object", `${file} JSON chunk must be an object`);
  check(json.buffers?.length === 1 && !json.buffers[0]?.uri && !json.images?.length && !json.textures?.length, `${file} must be self-contained untextured geometry; external buffers/images are unsupported`);
  check(bytes.readUInt32LE(24 + size) === 0x004e4942 && bytes.readUInt32LE(20 + size) + size + 28 === bytes.length, `${file} has an invalid embedded geometry chunk`);
  check((json.scenes?.[json.scene ?? 0]?.nodes?.length ?? 0) > 0, `${file} has an empty selected scene`);
}

export async function verifyVehicleDirectory(directory: string, expectedRecipeSha256?: string) {
  const file = resolve(directory, "vehicles.json"), raw = await readInput(file);
  const manifest = parseInput(raw.toString("utf8"), file); validateVehicleManifest(manifest);
  if (expectedRecipeSha256) check(manifest.recipeSha256 === expectedRecipeSha256, `vehicles.json recipe ${manifest.recipeSha256} differs from current recipe ${expectedRecipeSha256}`);
  const reports = [];
  for (const asset of manifest.vehicles) {
    const bytes = await readInput(resolve(directory, asset.model));
    check(bytes.length === asset.bytes && hash(bytes) === asset.sha256, `${asset.model} bytes/digest differ from vehicles.json`);
    validateVehicleGlb(bytes, asset.model);
    const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "").catch(cause => {
      throw new Error(`Vehicle model ${asset.model} could not decode its embedded geometry: ${cause instanceof Error ? cause.message : String(cause)}. Run npm run data:vehicles to rebuild the fleet.`, { cause });
    });
    try { reports.push(verifyVehicleGeometry(gltf.scene, asset)); }
    finally {
      gltf.scene.traverse(object => { if (object instanceof Mesh) { object.geometry.dispose(); for (const material of [object.material].flat()) { for (const value of Object.values(material)) if (value instanceof Texture) value.dispose(); material.dispose(); } } });
    }
  }
  return { manifest, manifestSha256: hash(raw), reports };
}

export function vehicleDirectoryArgument(args: readonly string[]): string {
  if (!args.length) return resolve(import.meta.dirname, "../../data/scene/agents");
  check(args.length === 2 && args[0] === "--directory" && !!args[1] && !args[1].startsWith("--"), "use --directory <fleet-output-directory>, or omit it for data/scene/agents");
  return resolve(args[1]!);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const recipe = await readFile(resolve(import.meta.dirname, "build-vehicles.py"));
  const result = await verifyVehicleDirectory(vehicleDirectoryArgument(process.argv.slice(2)), hash(recipe));
  console.log(JSON.stringify(result, null, 2));
}
