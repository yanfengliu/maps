/**
 * harness: derives, checks and repairs the version-2 drawParts contract of
 * delivered human manifests from the GLB bytes beside them.
 *
 * Bound: every human manifest (`*.json` carrying a `lods` array) in one directory,
 * and each LOD's GLB as pinned by its `modelSha256`. It proves the manifest
 * describes the delivered selected scene exactly, and it never rewrites a GLB or a
 * VAT texture — the accepted 5 mm/15 mm contact evidence stays bound to the bytes
 * it was measured on. It does not prove a good silhouette, natural motion, crowd
 * behaviour or frame rate.
 *
 * The authority for what a correct manifest means is `selectedHumanParts` and
 * `admitHumanDraws` in src/agents/render/human-admission.ts — the gate the shipping
 * runtime calls at load. The derivation here exists only to write a manifest that
 * gate then has to admit; it is deliberately a second implementation, so a manifest
 * that only agrees with its own producer is still rejected.
 *
 * `--write` rewrites the manifest JSON in place and touches nothing else. It is the
 * repair path for a delivered directory whose GLBs are accepted and whose manifests
 * predate the version-2 contract, where re-baking would replace accepted bytes.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Matrix4, Quaternion, Vector3 } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { admitHumanDraws, selectedHumanParts, type HumanGlbJson } from "../../src/agents/render/human-admission.ts";
import { AGENT_ASSET_VERSION, HUMAN_ASSET_URLS, type AgentAssetLod, type AgentAssetManifest, type AgentDrawPart } from "../../src/world/agent-assets.ts";

const root = resolve(import.meta.dirname, "../..");
const directoryIndex = process.argv.indexOf("--directory");
const folder = resolve(directoryIndex >= 0 ? process.argv[directoryIndex + 1]! : resolve(root, "data/scene/agents"));
const variants = process.argv.flatMap((value, index) => value === "--variant" ? [process.argv[index + 1]!] : []);
const writing = process.argv.includes("--write");
const shipping = new Set(HUMAN_ASSET_URLS.map(url => url.slice(url.lastIndexOf("/") + 1)));

function fail(message: string): never {
  throw new Error(`Human manifest check failed: ${message}`);
}

/** Split a GLB into its JSON chunk, refusing anything that is not a complete glTF 2 GLB. */
function glbJson(bytes: Buffer, file: string): HumanGlbJson {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    fail(`${file} is not a complete glTF 2 GLB; the delivered model is truncated or is not a GLB at all.`);
  }
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as HumanGlbJson;
}

/**
 * The drawParts a version-2 manifest must declare for this GLB: every primitive of
 * the selected scene, in traversal order, with the world transform the world-baked
 * VAT already contains. Primitives outside the selected scene are not drawn and are
 * deliberately not listed, however many the GLB's mesh pool holds.
 */
function derivedDrawParts(json: HumanGlbJson, label: string): AgentDrawPart[] {
  const scene = json.scenes?.[json.scene ?? 0];
  if (!scene?.nodes?.length) fail(`${label} has a GLB with no selected-scene root nodes, so it declares no drawable primitives.`);
  const visited = new Set<number>();
  const parts: AgentDrawPart[] = [];
  const visit = (index: number, parent: Matrix4): void => {
    if (!Number.isInteger(index) || visited.has(index)) fail(`${label} has a GLB that repeats or cycles through node ${index}.`);
    visited.add(index);
    const node = json.nodes[index];
    if (!node) fail(`${label} has a GLB that references absent node ${index}.`);
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1]));
    const matrix = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      const mesh = json.meshes[node.mesh];
      if (!mesh || !node.name) fail(`${label} has a GLB whose selected scene draws mesh ${node.mesh} from an unnamed node.`);
      for (const [primitive, part] of mesh.primitives.entries()) {
        const positions = json.accessors[part.attributes["POSITION"]!];
        const indexCount = part.indices === undefined ? positions?.count : json.accessors[part.indices]?.count;
        if (!positions || !indexCount) fail(`${label} has a GLB whose ${node.name}/${primitive} carries no POSITION or no triangles.`);
        parts.push({ node: node.name, primitive, vertexCount: positions.count, indexCount, bindMatrix: matrix.toArray() });
      }
    }
    for (const child of node.children ?? []) visit(child, matrix);
  };
  for (const index of scene.nodes) visit(index, new Matrix4());
  if (parts.length === 0) fail(`${label} has a GLB whose selected scene draws nothing.`);
  return parts;
}

/** The declared drawParts must be exactly the derived ones, or `--write` would change the contract. */
function compare(declared: readonly AgentDrawPart[] | undefined, derived: readonly AgentDrawPart[], label: string, model: string): void {
  // Array.isArray would widen the element type to any, so keep the declared rows typed.
  if (!Array.isArray(declared) || declared.length === 0) {
    fail(`${label} declares no drawParts, so it is not a version-${AGENT_ASSET_VERSION} human contract; ${model} draws ${derived.length} primitives in its selected scene.`);
  }
  const rows: readonly AgentDrawPart[] = declared;
  const contract = new Map(rows.map(part => [`${part.node}/${part.primitive}`, part]));
  if (contract.size !== rows.length) fail(`${label} drawParts repeats a node/primitive, so one of its required parts would never be admitted.`);
  if (contract.size !== derived.length) fail(`${label} declares ${contract.size} drawParts; ${model} draws ${derived.length} primitives in its selected scene.`);
  for (const part of derived) {
    const key = `${part.node}/${part.primitive}`;
    const declaredPart = contract.get(key);
    if (!declaredPart) fail(`${label} drawParts omits ${key}, which ${model} draws.`);
    if (declaredPart.vertexCount !== part.vertexCount || declaredPart.indexCount !== part.indexCount) {
      fail(`${label} ${key} declares ${declaredPart.vertexCount} vertices and ${declaredPart.indexCount} indices; ${model} has ${part.vertexCount} and ${part.indexCount}.`);
    }
    if (declaredPart.bindMatrix.length !== 16 || !declaredPart.bindMatrix.every((value, i) => Number.isFinite(value) && Math.abs(value - part.bindMatrix[i]!) < 1e-6)) {
      fail(`${label} ${key} bindMatrix disagrees with the world-baked VAT contract in ${model}.`);
    }
  }
}

/**
 * The delivered GLBs embed their clothing textures, and decoding a PNG needs a
 * browser. Only the load path that fetches those images is stubbed here: what
 * `admitHumanDraws` proves is the draw set, its transforms and its _VAT_ID lookups,
 * and none of that reads a texture. Every byte the loader parses is still the
 * delivered GLB.
 */
function browserGlobals(): void {
  const scope = globalThis as unknown as Record<string, unknown>;
  scope.self ??= globalThis;
  scope.createImageBitmap ??= async () => ({ width: 1, height: 1, close(): void {} });
}

async function admitted(bytes: Buffer, lod: AgentAssetLod, label: string): Promise<number> {
  const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) as ArrayBuffer;
  let gltf: GLTF;
  try {
    browserGlobals();
    gltf = await new GLTFLoader().parseAsync(binary, "");
  } catch (error) {
    // The delivered GLBs embed clothing textures, and a decode needs a browser.
    // Report the limitation rather than reporting admission that did not happen:
    // tests/agent-selected-scene.test.ts owns the loader proof on a fixture.
    fail(`${label} could not be handed to the shipping GLTFLoader outside a browser (${(error as Error).message}). The selected-scene contract above was still checked against the delivered bytes.`);
  }
  return admitHumanDraws(gltf, lod, label).length;
}

/** Rebuild the manifest with the version-2 fields in the order the recipe writes them. */
function upgraded(manifest: Record<string, unknown>, parts: Map<string, AgentDrawPart[]>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(manifest)) {
    if (key === "lods") {
      result.lods = (value as Record<string, unknown>[]).map(lod => {
        const entry: Record<string, unknown> = {};
        for (const [field, fieldValue] of Object.entries(lod)) {
          entry[field] = fieldValue;
          if (field === "vertexCount") entry.drawParts = parts.get(String(lod.id))!;
        }
        return entry;
      });
      continue;
    }
    result[key] = key === "version" ? AGENT_ASSET_VERSION : value;
    if (key === "textureFormat") result.vatSpace = "world-baked";
  }
  return result;
}

const entries = (await readdir(folder, { withFileTypes: true })).filter(entry => entry.isFile() && entry.name.endsWith(".json")).map(entry => entry.name).sort();
const manifests: { file: string; manifest: AgentAssetManifest }[] = [];
for (const file of entries) {
  const parsed = JSON.parse(await readFile(resolve(folder, file), "utf8")) as Partial<AgentAssetManifest>;
  if (!Array.isArray(parsed.lods)) continue;
  if (variants.length > 0 && !variants.includes(parsed.id ?? "")) continue;
  manifests.push({ file, manifest: parsed as AgentAssetManifest });
}
if (manifests.length === 0) fail(`no human manifest (a JSON file with a lods array) was found in ${folder}.`);

// Repair first, so the check below reads exactly what a later session will read.
// A manifest that already declares drawParts is never silently rewritten: it has to
// agree with the delivered GLB, or this refuses and says which part disagrees.
let repaired = 0;
if (writing) {
  for (const { file, manifest } of manifests) {
    const parts = new Map<string, AgentDrawPart[]>();
    for (const lod of manifest.lods) {
      const derived = derivedDrawParts(glbJson(await readFile(resolve(folder, lod.model)), lod.model), `${manifest.id}/${lod.id}`);
      if (Array.isArray(lod.drawParts) && lod.drawParts.length > 0) compare(lod.drawParts, derived, `${manifest.id}/${lod.id}`, lod.model);
      parts.set(lod.id, derived);
    }
    const text = JSON.stringify(upgraded(manifest as unknown as Record<string, unknown>, parts), null, 2);
    if (await readFile(resolve(folder, file), "utf8") !== text) {
      await writeFile(resolve(folder, file), text);
      repaired++;
    }
  }
}

const header = ["variant/lod", "version", "vatSpace", "primitives", "drawParts", "vertices", "indices", "loader", "verdict"];
const rows: string[][] = [];
for (const { file, manifest: declared } of manifests) {
  const manifest = JSON.parse(await readFile(resolve(folder, file), "utf8")) as AgentAssetManifest;
  if (manifest.version !== AGENT_ASSET_VERSION || manifest.vatSpace !== "world-baked") {
    fail(`${file} is version ${manifest.version} with vatSpace ${manifest.vatSpace ?? "absent"}; a human manifest must be version ${AGENT_ASSET_VERSION} with world-baked VAT, because its GLBs carry _VAT_ID lookups into a world-baked texture. Run npm run data:agents:manifests --write to repair it, or npm run data:agents to rebuild the fleet.`);
  }
  for (const lod of manifest.lods) {
    // commuter.json is a legacy duplicate whose id already collides with a shipping
    // variant, so a row names its file whenever the two disagree.
    const label = `${declared.id}${file === `${declared.id}.json` ? "" : ` (${file})`}/${lod.id}`;
    const bytes = await readFile(resolve(folder, lod.model));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== lod.modelSha256) fail(`${lod.model} is ${digest}; ${file} pins ${lod.modelSha256}. The delivered model is not the one the manifest describes.`);
    const json = glbJson(bytes, lod.model);
    const derived = derivedDrawParts(json, label);
    compare(lod.drawParts, derived, label, lod.model);
    // The shipping gate itself, over the delivered bytes. selectedHumanParts runs
    // first inside it, so a contract error still surfaces with its own message.
    selectedHumanParts(json, lod, label);
    const drawn = await admitted(bytes, lod, label);
    rows.push([label, String(manifest.version), String(manifest.vatSpace), String(derived.length), String(lod.drawParts.length),
      String(lod.vertexCount), String(derived.reduce((sum, part) => sum + part.indexCount, 0)), String(drawn), shipping.has(file) ? "admitted" : `admitted (${file} is not in HUMAN_ASSET_URLS)`]);
  }
}

const widths = header.map((title, column) => Math.max(title.length, ...rows.map(row => row[column]!.length)));
const line = (row: string[]): string => row.map((cell, column) => cell.padEnd(widths[column]!)).join("  ").trimEnd();
console.log(line(header));
for (const row of rows) console.log(line(row));
console.log(`${rows.length} LODs across ${manifests.length} human manifests in ${folder}: version-${AGENT_ASSET_VERSION} drawParts, delivered model digests and the shipping admission gate all agree.`);
if (writing) console.log(`--write rewrote ${repaired} of ${manifests.length} manifests; no GLB or VAT texture was touched.`);
