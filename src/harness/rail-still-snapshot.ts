/** Frozen settled-trial evidence only. Copies actual CPU storage once per still;
 * it neither establishes GPU upload identity nor detects external writers. */
import { BufferAttribute, BufferGeometry, Group, InstancedBufferAttribute, InstancedMesh, Material, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Plane, Vector3 } from "three";
import type { PopulationStatus } from "../agents/population/status.js";
import { createRailCameraObserver, knownRailHooks, railIdentity, railMaterialProblem, railMeshProblem, type RailCameraClearance, type RailIdentity, type Witness } from "./rail-camera-clearance.js";

type Binding = { frame: number; revision: number; ready: boolean; population: PopulationStatus };
interface AttributeRecord { buffer: number; type: string; byteOffset: number; length: number; itemSize: number; normalized: boolean; version: number }
interface MaterialRecord { uuid: string; version: number; visible: boolean; side: number; clipping: number[][]; clipIntersection: boolean; hook: string; problem: string | null }
interface MeshRecord {
  uuid: string; name: string; geometry: string; position: AttributeRecord; index: AttributeRecord | null; batch: AttributeRecord | null;
  range: [number, number | null]; groups: { start: number; count: number; materialIndex?: number }[];
  matrixWorld: number[]; visible: boolean; layers: number; drawSelected: boolean;
  instance: AttributeRecord | null; count: number | null; materials: MaterialRecord[]; materialArray: boolean;
  identities: Record<string, RailIdentity>; sectionSide: number | null; source: unknown; replacement: unknown;
}
export interface RailStillState extends Binding {
  cameraWorld: number[]; projection: number[]; eye: number[]; nearPlane: number[][];
  camera: { fov: number; aspect: number; near: number; far: number; zoom: number; filmOffset: number; view: PerspectiveCamera["view"] };
  membership: { uuid: string; geometry: string; visible: boolean; layers: number; selected: boolean; matrixWorld: number[]; positionVersion: number; indexVersion: number; instances: number | null }[];
}
export interface RailStillSnapshot {
  version: 1; bound: string; state: RailStillState; buffers: { bytes: number; base64: string }[]; meshes: MeshRecord[]; unknown: Witness[];
}
function selected(object: Object3D, camera: PerspectiveCamera): boolean {
  if (!object.layers.test(camera.layers)) return false;
  for (let p: Object3D | null = object; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
/** Read only: no transform updates, render callbacks, camera or control setters. */
export function createRailStillObserver(root: Object3D, camera: PerspectiveCamera, binding: () => Binding): { railStillState(): RailStillState; railStillSnapshot(): RailStillSnapshot } {
  const hooks = knownRailHooks();
  function railStillState(): RailStillState {
    const membership: RailStillState["membership"] = [];
    root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      membership.push({ uuid: object.uuid, geometry: object.geometry.uuid, visible: object.visible, layers: object.layers.mask, selected: selected(object, camera), matrixWorld: object.matrixWorld.toArray(), positionVersion: (object.geometry.getAttribute("position") as BufferAttribute | undefined)?.version ?? -1, indexVersion: object.geometry.index?.version ?? -1, instances: object instanceof InstancedMesh ? object.count : null });
    });
    return { ...structuredClone(binding()), cameraWorld: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), eye: new Vector3().setFromMatrixPosition(camera.matrixWorld).toArray(), nearPlane: [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => new Vector3(x!,y!,-1).unproject(camera).toArray()), camera: { fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, zoom: camera.zoom, filmOffset: camera.filmOffset, view: structuredClone(camera.view) }, membership };
  }
  function railStillSnapshot(): RailStillSnapshot {
    const buffers: RailStillSnapshot["buffers"] = [], bufferIds = new Map<ArrayBufferLike, number>(), meshes: MeshRecord[] = [], unknown: Witness[] = [];
    const state = railStillState();
    const attribute = (a: BufferAttribute): AttributeRecord => {
      if (typeof SharedArrayBuffer !== "undefined" && a.array.buffer instanceof SharedArrayBuffer) throw Error("Shared attribute storage is outside the frozen still pipeline");
      let buffer = bufferIds.get(a.array.buffer);
      if (buffer === undefined) { buffer = buffers.length; bufferIds.set(a.array.buffer, buffer); const copy = new Uint8Array(a.array.buffer).slice(); buffers.push({ bytes: copy.byteLength, base64: encode(copy) }); }
      return { buffer, type: a.array.constructor.name, byteOffset: a.array.byteOffset, length: a.array.length, itemSize: a.itemSize, normalized: a.normalized, version: a.version };
    };
    root.traverse(object => {
      const witness = { object: object.name || object.type, instance: null, batch: null };
      if (!(object instanceof Mesh)) {
        if ((object as Object3D & { isLine?: boolean; isPoints?: boolean; isSprite?: boolean }).isLine || (object as Object3D & { isPoints?: boolean }).isPoints || (object as Object3D & { isSprite?: boolean }).isSprite) unknown.push({ ...witness, reason: "unsupported non-triangle physical member" });
        return;
      }
      const problem = railMeshProblem(object);
      if (problem) { unknown.push({ ...witness, reason: problem }); return; }
      if (meshes.length >= 10000) { unknown.push({ ...witness, reason: "finite10000-mesh snapshot limit" }); return; }
      const g = object.geometry, batch = g.getAttribute("_batchid") as BufferAttribute | undefined;
      const identities: Record<string, RailIdentity> = {};
      for (const id of batch ? new Set(Array.from({ length: batch.count }, (_, i) => batch.getX(i))) : [null]) {
        const identity = railIdentity(object, id); identities[String(id)] = identity;
        if (identity.kind === "building" && (!identity.uri || !identity.gmlId)) unknown.push({ ...witness, batch: id, identity, reason: "building member lacks stable tile/GML identity" });
      }
      let tileRoot: Object3D | null = object;
      while (tileRoot && !tileRoot.userData.railTileIdentity) tileRoot = tileRoot.parent;
      // Existing section meshes merge batches by AOI side. Preserve that fact;
      // do not manufacture a GML identity or infer a closed individual shell.
      if (tileRoot && !batch && !object.userData.railReplacement) identities["null"] = { key: `tile-section:${tileRoot.userData.railTileIdentity.uri}:${object.userData.cutoutSectionSide}`, kind: "scene", uri: tileRoot.userData.railTileIdentity.uri, sha256: tileRoot.userData.railTileIdentity.sha256 };
      try {
        meshes.push({ uuid: object.uuid, name: object.name, geometry: g.uuid, position: attribute(g.getAttribute("position") as BufferAttribute), index: g.index ? attribute(g.index) : null, batch: batch ? attribute(batch) : null, range: [g.drawRange.start, g.drawRange.count === Infinity ? null : g.drawRange.count], groups: g.groups.map((v: { start: number; count: number; materialIndex?: number }) => ({ ...v })), matrixWorld: object.matrixWorld.toArray(), visible: object.visible, layers: object.layers.mask, drawSelected: selected(object, camera), instance: object instanceof InstancedMesh ? attribute(object.instanceMatrix) : null, count: object instanceof InstancedMesh ? object.count : null, materialArray: Array.isArray(object.material), materials: (Array.isArray(object.material) ? object.material : [object.material]).map(material => ({ uuid: material.uuid, version: material.version, visible: material.visible, side: material.side, clipping: (material.clippingPlanes ?? []).map((p: Plane) => [...p.normal.toArray(), p.constant]), clipIntersection: material.clipIntersection, hook: material.onBeforeCompile.toString(), problem: railMaterialProblem(material, hooks) })), identities, sectionSide: object.userData.cutoutSectionSide ?? null, source: structuredClone(object.userData.railSource ?? null), replacement: object.userData.railReplacement ? { id: object.userData.railReplacement.id, uri: object.userData.railReplacement.uri, source: object.userData.railReplacement.source } : null });
      } catch (error) { unknown.push({ ...witness, reason: String(error) }); }
    });
    return { version: 1, bound: "Complete loaded city mesh census, including draw-hidden physical members. Actual ordered CPU position/index/batch storage is copied and shared once. Known frozen static source pipeline only; no arbitrary mutation, GPU upload or moving-scene claim. Merged building AOI sections have tile/side identity only. Clipping does not establish a closed union.", state, buffers, meshes, unknown };
  }
  return { railStillState, railStillSnapshot };
}
/** Offline consumer of retained live bytes. It reuses the same geometric kernel;
 * no source reconstruction or cross-runtime winding equality binds this still. */
export function evaluateRailStill(snapshot: RailStillSnapshot): RailCameraClearance {
  if (snapshot.version !== 1) throw Error("Rail still requires version1 retained live geometry");
  const root = new Group(), owned: { geometry: BufferGeometry; materials: Material[] }[] = [];
  const arrays = snapshot.buffers.map(row => { const binary = atob(row.base64); if (binary.length !== row.bytes) throw Error("Rail still buffer byte count changed"); return Uint8Array.from(binary, c => c.charCodeAt(0)).buffer; });
  const types = { Float32Array, Float64Array, Uint32Array, Uint16Array, Uint8Array, Int32Array, Int16Array, Int8Array, Uint8ClampedArray };
  const attribute = (row: AttributeRecord): BufferAttribute => {
    const Type = types[row.type as keyof typeof types]; if (!Type || !arrays[row.buffer]) throw Error(`Rail still unsupported or missing ${row.type} buffer${row.buffer}`);
    return new BufferAttribute(new Type(arrays[row.buffer]!, row.byteOffset, row.length), row.itemSize, row.normalized);
  };
  const unknown = [...snapshot.unknown];
  try {
    for (const row of snapshot.meshes) {
      const geometry = new BufferGeometry(); geometry.setAttribute("position", attribute(row.position)); if (row.index) geometry.setIndex(attribute(row.index)); if (row.batch) geometry.setAttribute("_batchid", attribute(row.batch));
      geometry.setDrawRange(row.range[0], row.range[1] ?? Infinity); for (const g of row.groups) geometry.addGroup(g.start, g.count, g.materialIndex);
      const materials = row.materials.map(r => { const m = new MeshBasicMaterial(); m.side = r.side as Material["side"]; m.clippingPlanes = r.clipping.map(p => new Plane(new Vector3(p[0],p[1],p[2]),p[3])); m.clipIntersection = r.clipIntersection; if (r.problem) unknown.push({ object: row.name, instance: null, batch: null, reason: r.problem }); return m; });
      const material = row.materialArray ? materials : materials[0]!;
      const mesh = row.instance ? new InstancedMesh(geometry, material, row.count!) : new Mesh(geometry, material);
      if (mesh instanceof InstancedMesh) mesh.instanceMatrix = new InstancedBufferAttribute(attribute(row.instance!).array,16);
      mesh.name = row.name; mesh.matrixAutoUpdate = false; mesh.matrix.fromArray(row.matrixWorld); mesh.matrixWorld.copy(mesh.matrix); mesh.userData.railObservedIdentities = row.identities;
      // Whole physical membership is conservative: visibility/layer/frustum
      // omission cannot make an enclosing solid disappear from clearance.
      root.add(mesh); owned.push({ geometry, materials });
    }
    const s = snapshot.state, c = s.camera, camera = new PerspectiveCamera(c.fov,c.aspect,c.near,c.far);
    camera.zoom = c.zoom; camera.filmOffset = c.filmOffset; camera.view = structuredClone(c.view); camera.matrixWorld.fromArray(s.cameraWorld); camera.projectionMatrix.fromArray(s.projection); camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const result = createRailCameraObserver(root,camera,() => s)();
    return { ...result, bound: snapshot.bound, unknown: [...unknown,...result.unknown], eligible: !unknown.length && result.eligible };
  } finally { for (const r of owned) { r.geometry.dispose(); for (const m of r.materials) m.dispose(); } root.clear(); }
}
