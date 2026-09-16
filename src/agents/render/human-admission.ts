import { Matrix4, Mesh, Quaternion, Vector3 } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { AgentAssetLod, AgentDrawPart } from "../../world/agent-assets.js";

export interface HumanGlbJson {
  scene?: number;
  scenes: { nodes?: number[] }[];
  nodes: { name?: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  meshes: { primitives: { mode?: number; attributes: Record<string, number>; indices?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number; type: string }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}

interface SelectedPart extends AgentDrawPart { nodeIndex: number; meshIndex: number }

function requireDraw(condition: unknown, label: string, detail: string): asserts condition {
  if (!condition) throw new Error(`Human ${label} selected scene ${detail}. Run npm run data:agents to rebuild the complete human asset.`);
}

/** Read the selected scene, compose its transforms, and compare its required draw set. */
export function selectedHumanParts(json: HumanGlbJson, lod: AgentAssetLod, label: string): SelectedPart[] {
  requireDraw(Array.isArray(lod.drawParts) && lod.drawParts.length > 0, label, "has no version-2 required drawParts contract");
  const scene = json.scenes?.[json.scene ?? 0];
  requireDraw(scene && scene.nodes && scene.nodes.length > 0, label, "contains no root nodes");
  const visited = new Set<number>();
  const parts: SelectedPart[] = [];
  const visit = (index: number, parent: Matrix4): void => {
    requireDraw(Number.isInteger(index) && !visited.has(index), label, `repeats or cycles through node ${index}`);
    visited.add(index);
    const node = json.nodes[index];
    requireDraw(node, label, `references absent node ${index}`);
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1]));
    const matrix = parent.clone().multiply(local);
    requireDraw(matrix.elements.every(Number.isFinite), label, `node ${index} has a non-finite bind transform`);
    if (node.mesh !== undefined) {
      const mesh = json.meshes[node.mesh];
      requireDraw(mesh && node.name, label, `node ${index} has no named mesh`);
      for (const [primitive, part] of mesh.primitives.entries()) {
        requireDraw((part.mode ?? 4) === 4, label, `${node.name}/${primitive} is not triangle geometry`);
        const positions = json.accessors[part.attributes["POSITION"]!];
        const vat = json.accessors[part.attributes["_VAT_ID"]!];
        const indexCount = part.indices === undefined ? positions?.count : json.accessors[part.indices]?.count;
        requireDraw(positions && vat && vat.count === positions.count && indexCount && indexCount % 3 === 0, label, `${node.name}/${primitive} has missing or empty drawable POSITION/_VAT_ID triangles`);
        parts.push({ node: node.name, primitive, vertexCount: positions.count, indexCount, bindMatrix: matrix.toArray(), nodeIndex: index, meshIndex: node.mesh });
      }
    }
    for (const child of node.children ?? []) visit(child, matrix);
  };
  for (const index of scene.nodes) visit(index, new Matrix4());
  requireDraw(parts.length === lod.drawParts.length, label, `has ${parts.length} drawable primitives; required drawParts declares ${lod.drawParts.length}`);
  const expected = new Map<string, AgentDrawPart>(lod.drawParts.map(part => [`${part.node}/${part.primitive}`, part]));
  requireDraw(expected.size === lod.drawParts.length, label, "drawParts repeats a required node/primitive");
  for (const part of parts) {
    const key = `${part.node}/${part.primitive}`;
    const contract = expected.get(key);
    requireDraw(contract, label, `draws unexpected primitive ${key}`);
    expected.delete(key);
    requireDraw(part.vertexCount === contract.vertexCount && part.indexCount === contract.indexCount, label, `${key} draw counts disagree with its required primitive`);
    requireDraw(contract.bindMatrix.length === 16 && contract.bindMatrix.every((value, i) => Number.isFinite(value) && Math.abs(value - part.bindMatrix[i]!) < 1e-6), label, `${key} bind transform disagrees with its world-baked VAT contract`);
  }
  requireDraw(expected.size === 0, label, `omits required primitives ${[...expected.keys()].join(", ")}`);
  return parts;
}

/** The actual loader scene must instantiate every advertised primitive exactly once. */
export function admitHumanDraws(gltf: GLTF, lod: AgentAssetLod, label: string): Mesh[] {
  const selected = selectedHumanParts(gltf.parser.json as HumanGlbJson, lod, label);
  const expected = new Map(selected.map(part => [`${part.nodeIndex}/${part.meshIndex}/${part.primitive}`, part]));
  const meshes: Mesh[] = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const association = gltf.parser.associations.get(object) as { meshes?: number; primitives?: number } | undefined;
    let ancestor = object as typeof object | null;
    let node: number | undefined;
    while (ancestor && node === undefined) { node = gltf.parser.associations.get(ancestor)?.nodes; ancestor = ancestor.parent as typeof object | null; }
    const key = `${node}/${association?.meshes}/${association?.primitives}`;
    const contract = expected.get(key);
    requireDraw(contract, label, `loader produced unexpected or duplicated primitive ${key}`);
    expected.delete(key);
    const geometry = object.geometry;
    const positions = geometry.getAttribute("position");
    const vat = geometry.getAttribute("_vat_id");
    const count = geometry.index?.count ?? positions?.count;
    requireDraw(positions?.count === contract.vertexCount && vat?.count === contract.vertexCount && count === contract.indexCount && geometry.drawRange.start === 0 && geometry.drawRange.count >= count, label, `${contract.node}/${contract.primitive} loader geometry is empty or incomplete`);
    requireDraw(object.matrixWorld.elements.every((value, i) => Math.abs(value - contract.bindMatrix[i]!) < 1e-6), label, `${contract.node}/${contract.primitive} loader bind transform disagrees with world-baked VAT`);
    for (let i = 0; i < vat.count; i++) requireDraw(Number.isInteger(vat.getX(i)) && vat.getX(i) >= 0 && vat.getX(i) < lod.vertexCount, label, `${contract.node}/${contract.primitive} has an out-of-range VAT lookup`);
    requireDraw(object.visible && (Array.isArray(object.material) ? object.material.every(material => material.visible) : object.material.visible), label, `${contract.node}/${contract.primitive} loader hides a required part`);
    meshes.push(object);
  });
  requireDraw(expected.size === 0 && meshes.length > 0, label, `loader omitted ${expected.size} required drawable primitives`);
  return meshes;
}
