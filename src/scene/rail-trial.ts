/** Exact admitted static geometry. No camera, terrain or actor mutation. */
import { BufferAttribute, BufferGeometry, Group, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type Material, type Object3D } from "three";
import type { GLTFLoaderPlugin, GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { decodeMesh, type MeshData } from "../world/mesh.js";
import { RAIL_DATA_PREPARATION, RAIL_TRIAL_BINDING, trialAssets, validateRailTrial, type RailAssetPin, type RailReplacement, type RailReplacementTriangle, type RailSourceFace, type RailTrialManifest } from "../world/rail-trial.js";
import type { RenderLoop } from "../render/loop.js";
import { createRailTrains, type RailTrains } from "./rail-trains.js";
import type { TrainSource } from "./train-path.js";
import type { WorldStyle } from "../world/styles.js";
import { CITY_CLIP_PLANES, clipCityRoot } from "./aoi-cutout.js";
import { toGeometry } from "./mesh-loader.js";
import { applyRailFinishStyle, createRailFinishSet } from "./rail-finish.js";

interface SourceBinding { node: number; primitive: number; material: number; rawWorld: number[]; parserWorld: number[] }
type Finishes = Record<string, Record<string, [number, number, number]>>;
export interface RailTrialData {
  manifest: RailTrialManifest; digest: string;
  replacements: RailReplacement[];
  layers: { pin: RailTrialManifest["layers"][number]; mesh: MeshData }[];
  finishes: Finishes;
  trainSource?: TrainSource;
}
export async function verifyRailBytes(pin: Pick<RailAssetPin, "file" | "sha256"> & { bytes?: number }, bytes: ArrayBuffer): Promise<void> {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
  if ((pin.bytes !== undefined && bytes.byteLength !== pin.bytes) || hash !== pin.sha256) throw Error(`Rail data ${pin.file} has different bytes (${hash}). ${RAIL_DATA_PREPARATION}`);
}
async function fetchPin(pin: Pick<RailAssetPin, "file" | "sha256"> & { bytes?: number }, url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Rail data ${url} returned HTTP ${response.status}. ${RAIL_DATA_PREPARATION}`);
  const bytes = await response.arrayBuffer(); await verifyRailBytes(pin, bytes); return bytes;
}
export async function loadRailTrial(binding = RAIL_TRIAL_BINDING): Promise<RailTrialData | null> {
  if (!binding) return null;
  const manifest = JSON.parse(new TextDecoder().decode(await fetchPin({ file: binding.url, sha256: binding.sha256 }, binding.url))) as RailTrialManifest;
  validateRailTrial(manifest);
  const entries = await Promise.all(trialAssets(manifest).map(async pin => [pin.file, await fetchPin(pin, `/rail-trial/${pin.file}`)] as const));
  const bytes = new Map(entries), json = <T>(file: string): T => JSON.parse(new TextDecoder().decode(bytes.get(file)!)) as T;
  const replacements = manifest.replacements.map(pin => {
    const data = json<RailReplacement>(pin.file);
    if (data.id !== pin.id || !data.sourceIdentity.length || data.sourceIdentity.some(s => s.uri !== pin.uri || s.gmlId !== pin.id)) throw Error(`Rail trial ${pin.file} does not match its source batch binding.`);
    return data;
  });
  return { manifest, digest: binding.sha256, replacements, layers: manifest.layers.map(pin => ({ pin, mesh: decodeMesh(new Uint8Array(bytes.get(pin.file)!)) })), finishes: json<Finishes>(manifest.materials.file), trainSource: { chains: json<Pick<TrainSource, "chains">>(manifest.provenance.file).chains, recipe: json<TrainSource["recipe"]>(manifest.recipe.file) } };
}

/** The GLTF parser supplies node/primitive/material identity, never a mesh-name guess. */
export function railSourcePlugin(parser: GLTFParser): GLTFLoaderPlugin {
  return { name: "MAPS_RAIL_SOURCE_BINDINGS", afterRoot(result) {
    const matrices = new Map<number, { rawWorld: number[]; parserWorld: number[] }>();
    const walk = (index: number, rawParent: Matrix4, parsedParent: Matrix4): void => {
      const node = parser.json.nodes[index] as { matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; children?: number[] };
      const raw = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1]));
      const parsed = raw.clone();
      if (node.matrix) { const p = new Vector3(), q = new Quaternion(), s = new Vector3(); parsed.decompose(p, q, s); parsed.compose(p, q, s); }
      raw.premultiply(rawParent); parsed.premultiply(parsedParent);
      matrices.set(index, { rawWorld: raw.toArray(), parserWorld: parsed.toArray() });
      for (const child of node.children ?? []) walk(child, raw, parsed);
    };
    for (const index of parser.json.scenes[parser.json.scene ?? 0].nodes as number[]) walk(index, new Matrix4(), new Matrix4());
    result.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const association = parser.associations.get(object) as { meshes?: number; primitives?: number; nodes?: number } | undefined;
      if (association?.meshes === undefined || association.primitives === undefined) return;
      let parent: Object3D | null = object; let node: number | undefined;
      while (parent && node === undefined) { node = parser.associations.get(parent)?.nodes; parent = parent.parent; }
      if (node === undefined) throw Error(`Rail source glTF mesh ${association.meshes}/${association.primitives} has no node association.`);
      const primitive = parser.json.meshes[association.meshes].primitives[association.primitives] as { material?: number };
      const matrix = matrices.get(node);
      if (!matrix) throw Error(`Rail source glTF node ${node} has no rooted source transform.`);
      object.userData.railSource = { node, primitive: association.primitives, material: primitive.material ?? -1, ...matrix } satisfies SourceBinding;
    });
    return null;
  } };
}

const sourceKey = (s: Pick<RailSourceFace, "node" | "primitive">): string => `${s.node}/${s.primitive}`;
const identity = new Matrix4();
function sourceError(uri: string, detail: string): never { throw Error(`Rail source ${uri}: ${detail}. Restore the pinned final leaf; partial replacement is refused.`); }
function sameFloat(a: number, b: number): boolean { return Math.fround(a) === Math.fround(b); }

/** Validate the complete tile before changing any index. Source geometry buffers
 * stay shared with their original mesh; only targeted face indices are removed.
 * Added source fragments reuse the exact original primitive's material/atlas. */
export function replaceRailBuildings(scene: Object3D, uri: string, finalLeaf: boolean, data: RailTrialData): { ids: string[]; returns: Mesh[]; sourceTriangles: number; returnTriangles: number } {
  const selected = data.replacements.filter(r => r.sourceIdentity[0]!.uri === uri);
  const empty = { ids: [], returns: [], sourceTriangles: 0, returnTriangles: 0 };
  if (!selected.length) return empty;
  if (!finalLeaf) sourceError(uri, "replacement requested for a non-final LOD");
  if (scene.userData.railTrialApplied) sourceError(uri, "replacement was requested twice");
  scene.updateMatrixWorld(true);
  if (!scene.matrixWorld.equals(identity)) sourceError(uri, "tile root is not the reviewed identity world transform");
  const batchTable = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  if (!batchTable) sourceError(uri, "batch table is missing");
  const bindings = new Map<string, Mesh>(), geometryOwners = new Map<BufferGeometry, number>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometryOwners.set(object.geometry, (geometryOwners.get(object.geometry) ?? 0) + 1);
    const binding = object.userData.railSource as SourceBinding | undefined;
    if (!binding) sourceError(uri, "a source mesh has no parser node/primitive identity");
    const key = sourceKey(binding);
    if (bindings.has(key)) sourceError(uri, `duplicate primitive binding ${key}`);
    bindings.set(key, object);
  });
  const expected = new Map<string, RailSourceFace[]>();
  for (const r of selected) for (const source of r.sourceIdentity) {
    const list = expected.get(sourceKey(source)) ?? []; list.push(source); expected.set(sourceKey(source), list);
  }
  const edits: { mesh: Mesh; kept: number[] }[] = [];
  for (const [key, sources] of expected) {
    const mesh = bindings.get(key); if (!mesh) sourceError(uri, `missing primitive ${key}`);
    const geometry = mesh.geometry, index = geometry.index, position = geometry.getAttribute("position"), normal = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv"), batch = geometry.getAttribute("_batchid");
    if (!index || !position || !normal || !batch || Array.isArray(mesh.material) || geometry.groups.length || geometryOwners.get(geometry) !== 1) sourceError(uri, `primitive ${key} has unsupported shared/non-indexed/grouped source buffers`);
    const binding = mesh.userData.railSource as SourceBinding;
    if (!mesh.matrixWorld.equals(new Matrix4().fromArray(binding.parserWorld))) sourceError(uri, `unexpected parser transform for primitive ${key}`);
    const byFace = new Map(sources.map(s => [s.face, s]));
    if (byFace.size !== sources.length) sourceError(uri, `primitive ${key} repeats a source face`);
    const targetIds = new Set(selected.map(r => r.id));
    // The source's affine placement has a slight shear. GLTFLoader decomposes
    // it; that measured baseline differs by up to11.375mm on these ten objects.
    // Validate both contracts separately. Replacements use the admitted raw
    // source world bytes, while all other objects retain the parser transform.
    const raw = new Matrix4().fromArray(binding.rawWorld);
    const kept: number[] = []; const nm = new Matrix3().getNormalMatrix(raw);
    for (let face = 0; face < index.count / 3; face++) {
      const indices = [index.getX(face * 3), index.getX(face * 3 + 1), index.getX(face * 3 + 2)];
      const batchId = batch.getX(indices[0]!);
      if (indices.some(i => batch.getX(i) !== batchId)) sourceError(uri, `${key}/${face} spans source batches`);
      const id = String(batchTable.getDataFromId(batchId).gml_id), source = byFace.get(face);
      if (!source) {
        if (targetIds.has(id)) sourceError(uri, `${id} contains an unbound face ${key}/${face}`);
        kept.push(...indices); continue;
      }
      if (source.batchId !== batchId || source.gmlId !== id || source.material !== binding.material || Boolean(source.uv) !== Boolean(uv)) sourceError(uri, `identity/material/UV mismatch at ${key}/${face}`);
      for (let j = 0; j < 3; j++) {
        const i = indices[j]!;
        const p = new Vector3().fromBufferAttribute(position, i).applyMatrix4(raw).toArray();
        const n = new Vector3().fromBufferAttribute(normal, i).applyNormalMatrix(nm).toArray();
        if (p.some((v, k) => !sameFloat(v, source.p[j]![k]!)) || n.some((v, k) => !sameFloat(v, source.n[j]![k]!)) || (uv && source.uv && (uv.getX(i) !== source.uv[j]![0] || uv.getY(i) !== source.uv[j]![1]))) sourceError(uri, `world transform/normal/UV mismatch at ${key}/${face}/${j}: ${JSON.stringify({ p, expectedP: source.p[j], n, expectedN: source.n[j], uv: uv ? [uv.getX(i), uv.getY(i)] : null, expectedUv: source.uv?.[j] ?? null })}`);
      }
      byFace.delete(face);
    }
    if (byFace.size) sourceError(uri, `primitive ${key} omitted ${byFace.size} pinned faces`);
    edits.push({ mesh, kept });
  }
  const additions: Mesh[] = [], returns: Mesh[] = [], finishSet = createRailFinishSet(true);
  let sourceTriangles = 0, returnTriangles = 0;
  try {
    for (const r of selected) {
      const batches = new Map<string, RailReplacementTriangle[]>();
      for (const t of r.triangles) { const key = t.source < 0 ? "return" : sourceKey(t.sourceIdentity!); const list = batches.get(key) ?? []; list.push(t); batches.set(key, list); }
      for (const [key, triangles] of batches) {
        const isReturn = key === "return";
        const material = isReturn ? new MeshStandardMaterial({ roughness: .95 }) : bindings.get(key)?.material;
        if (!material || Array.isArray(material)) sourceError(uri, `${r.id}/${key} has no unique source material`);
        const source = r.sourceIdentity.find(s => isReturn || sourceKey(s) === key)!;
        const geometry = replacementGeometry(triangles, source.batchId);
        if (isReturn) finishSet.dress("portal", geometry, material as MeshStandardMaterial);
        const mesh = new Mesh(geometry, material); mesh.name = `rail:${r.id}:${key}`;
        mesh.userData.railReplacement = { id: r.id, uri, source: !isReturn, sourceFaces: triangles.map(t => t.sourceIdentity), material: isReturn ? -1 : source.material };
        mesh.castShadow = true; mesh.receiveShadow = true;
        if (isReturn) { returns.push(mesh); returnTriangles += triangles.length; } else { additions.push(mesh); sourceTriangles += triangles.length; }
      }
    }
  } catch (cause) {
    for (const mesh of [...additions, ...returns]) { mesh.geometry.dispose(); if (returns.includes(mesh)) (mesh.material as Material).dispose(); }
    for (const texture of finishSet.textures) texture.dispose();
    throw cause;
  }
  for (const edit of edits) edit.mesh.geometry.setIndex(new BufferAttribute(new Uint32Array(edit.kept), 1));
  scene.add(...additions); scene.userData.railTrialApplied = selected.map(r => r.id);
  return { ids: selected.map(r => r.id), returns, sourceTriangles, returnTriangles };
}
function replacementGeometry(triangles: RailReplacementTriangle[], batchId: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(triangles.flatMap(t => t.positions)), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(triangles.flatMap(t => t.normals)), 3));
  if (triangles[0]!.uv) geometry.setAttribute("uv", new BufferAttribute(new Float32Array(triangles.flatMap(t => t.uv!)), 2));
  geometry.setAttribute("_batchid", new BufferAttribute(new Float32Array(triangles.length * 3).fill(batchId), 1));
  geometry.userData.railSourceIndices = triangles.map(t => t.source);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}

/** Partition stored triangle indices only. AOI section faces omit their own
 * clipping plane, as building sections do; all other planes still apply. The
 * plane-distance bound is the analytical Float32 storage error, not a new cut. */
export function railSectionGroups(mesh: MeshData): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  const halfUlp = (x: number): number => x === 0 ? 2 ** -150 : 2 ** (Math.floor(Math.log2(Math.abs(x))) - 24);
  for (let f = 0; f < mesh.indices.length; f += 3) {
    const indices = [mesh.indices[f]!, mesh.indices[f + 1]!, mesh.indices[f + 2]!];
    const side = CITY_CLIP_PLANES.findIndex(plane => indices.every(i => {
      const x = mesh.positions[i * 3]!, z = mesh.positions[i * 3 + 2]!;
      const normal = new Vector3().fromArray(mesh.normals, i * 3);
      const round = Math.abs(plane.normal.x) * halfUlp(x) + Math.abs(plane.normal.z) * halfUlp(z) + Number.EPSILON * (Math.abs(x) + Math.abs(z) + Math.abs(plane.constant)) * 4;
      return Math.abs(plane.distanceToPoint(new Vector3(x, 0, z))) <= round && Math.abs(normal.dot(plane.normal)) >= 1 - 1e-7;
    }));
    const list = groups.get(side) ?? []; list.push(...indices); groups.set(side, list);
  }
  return groups;
}
export interface RailTrialScene { root: Group; trains?: RailTrains; setStyle(style: WorldStyle): void; dispose(): void }
export function createRailTrialScene(data: RailTrialData, style: WorldStyle, train?: { loop: RenderLoop; ready: () => boolean }): RailTrialScene {
  const root = new Group(); root.name = "rail-trial";
  const finishSet = createRailFinishSet();
  const resources: { geometry: BufferGeometry; material: MeshStandardMaterial; kind: string }[] = [];
  let trains: RailTrains | undefined;
  let disposed = false;
  const setStyle = (next: WorldStyle): void => {
    trains?.setStyle(next);
    for (const r of resources) {
      const finish = data.finishes[next.id]?.[r.kind];
      if (!finish || finish.length !== 3 || finish.some(x => !Number.isFinite(x))) throw Error(`Rail trial has no valid ${next.id}/${r.kind} finish; restore authored-materials.json.`);
      r.material.color.setHex(finish[0]); r.material.roughness = finish[1]; r.material.metalness = finish[2];
      applyRailFinishStyle(r.material, next.id === "satellite");
    }
  };
  const dispose = (): void => { if (disposed) return; disposed = true; trains?.dispose(); root.removeFromParent(); for (const r of resources) { r.geometry.dispose(); r.material.dispose(); } for (const texture of finishSet.textures) texture.dispose(); root.clear(); };
  try {
    for (const { pin, mesh } of data.layers) {
      for (const [side, indices] of railSectionGroups(mesh)) {
        const geometry = toGeometry({ ...mesh, indices: new Uint32Array(indices) });
        const material = new MeshStandardMaterial(); resources.push({ geometry, material, kind: pin.kind });
        finishSet.dress(pin.kind, geometry, material);
        const object = new Mesh(geometry, material); object.name = `rail:${pin.file}:${side}`;
        object.userData.railAsset = { file: pin.file, sha256: pin.sha256, triangles: indices.length / 3 };
        if (side >= 0) object.userData.cutoutSectionSide = side;
        object.castShadow = true; object.receiveShadow = true; root.add(object);
      }
    }
    if (train) {
      const rails = data.layers.find(layer => layer.pin.kind === "rails");
      if (!rails || !data.trainSource) throw Error("Train needs the admitted source-centrelines, authored recipe and rails.mesh from the rail packet.");
      trains = createRailTrains(data.trainSource, rails.mesh, train.loop, style, train.ready); root.add(trains.root);
    }
    setStyle(style); clipCityRoot(root); return { root, ...(trains ? { trains } : {}), setStyle, dispose };
  } catch (cause) { dispose(); throw cause; }
}
