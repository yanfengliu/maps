/** harness: mutate delivered VAT bytes, keeping their hash valid, to prove the sole gate fires. */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { DataUtils } from "three";
import type { AgentAssetManifest } from "../../src/world/agent-assets.ts";

const root = resolve(import.meta.dirname, "../..");
const directoryIndex = process.argv.indexOf("--directory");
const source = resolve(directoryIndex >= 0 ? process.argv[directoryIndex + 1]! : resolve(root, "data/scene/agents"));
const target = resolve(root, `artifacts/agents/candidates/contact-mutation-${Date.now()}`);
await mkdir(target, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(source, "commuter-male.json"), "utf8")) as AgentAssetManifest;
const lod = manifest.lods[0]!;
const bytes = await readFile(resolve(source, lod.positions));
const heightMutation = process.argv.includes("--height");
let lowest = Infinity;
let chosen = -1;
for (let id = 0; id < lod.vertexCount; id++) {
  const x = DataUtils.fromHalfFloat(bytes.readUInt16LE(id * 8));
  const y = DataUtils.fromHalfFloat(bytes.readUInt16LE(id * 8 + 2));
  if (x > 0.03 && y < lowest) { lowest = y; chosen = id; }
}
if (chosen < 0) throw new Error("Contact mutation needs a left stance sole vertex from the built near LOD.");
const offset = (4 * lod.rowsPerFrame * lod.textureWidth + chosen) * 8 + 4;
if (heightMutation) {
  for (let index = 2; index < bytes.length; index += 8) bytes.writeUInt16LE(DataUtils.toHalfFloat(DataUtils.fromHalfFloat(bytes.readUInt16LE(index)) + 0.03), index);
} else bytes.writeUInt16LE(DataUtils.toHalfFloat(DataUtils.fromHalfFloat(bytes.readUInt16LE(offset)) + 0.03), offset);
await writeFile(resolve(target, lod.positions), bytes);
await copyFile(resolve(source, lod.normals), resolve(target, lod.normals));
await copyFile(resolve(source, lod.model), resolve(target, lod.model));
const mutated = JSON.parse(JSON.stringify(manifest));
mutated.lods[0].positionSha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(resolve(target, "commuter-male.json"), JSON.stringify(mutated, null, 2));
const result = spawnSync(process.execPath, [resolve(root, "tools/agents/verify.ts"), "--directory", target, "--humans-only"], { cwd: root, windowsHide: true, encoding: "utf8" });
const output = result.stdout + result.stderr;
await writeFile(resolve(target, "result.json"), JSON.stringify({ kind: heightMutation ? "absolute-height" : "stance-drift", vertex: chosen, frame: 4, displacementMetres: 0.03, exitCode: result.status, output }, null, 2));
const expected = heightMutation ? "absolute stance sole height" : "delivered VAT sole vertices drift";
if (result.status !== 1 || !output.includes(expected)) throw new Error(`Sole mutation did not reach ${expected}: ${output}`);
console.log(`Sole mutation rejected at ${expected}: +0.03m, valid updated hash. Evidence: ${target}`);
