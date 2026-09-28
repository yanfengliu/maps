/** Trial-only, on-demand geometry observation. Never updates a transform, draws,
 * moves the camera, writes an attribute, or returns a live three.js object. */
import { Box3, BufferGeometry, Group, InstancedMesh, Material, Matrix4, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Triangle, Vector3 } from "three";
import { createSurfaceMaterial } from "../scene/surface-materials.js";
import { createFacadeStyle, patchTileMaterials } from "../scene/tile-materials.js";
import { worldStyle } from "../world/styles.js";
import type { PopulationStatus } from "../agents/population/status.js";
import { CITY_CLIP_PLANES } from "../scene/aoi-cutout.js";

export interface Witness { identity?: RailIdentity; object: string; instance: number | null; batch: number | null; face?: number; reason: string; winding?: number }
export interface RailCameraClearance {
  bound: string;
  frame: number; revision: number; cameraWorld: number[]; projection: number[]; eye: number[]; nearPlane: number[][];
  eligible: boolean; unknown: Witness[]; intersections: Witness[]; containment: Witness[];
  counts: { meshes: number; instances: number; groups: number; broadphase: number; testedTriangles: number };
}
interface Part { batch: number | null; material: number; faces: number[]; vertices: Set<number> }
interface Cache { position: unknown; positionVersion: number; index: unknown; indexVersion: number; batch: unknown; batchVersion: number; range: string; parts: Part[] }
interface Entry { mesh: Mesh; instance: number | null; part: Part; matrix: Matrix4; box: Box3; material: Material; key: string }

function freezePlain<T>(value: T): T {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freezePlain(child); Object.freeze(value); }
  return value;
}
/** Only the existing position-preserving hooks are admitted. Compare their
 * actual function bodies from the same bundled factories, not a spoofable
 * material name/cache key. Unknown hooks are never executed by this observer. */
export function knownRailHooks(): Set<string> {
  const hooks = new Set([Material.prototype.onBeforeCompile.toString()]);
  const style = worldStyle("satellite");
  for (const kind of ["ground", "road", "sidewalk"] as const) { const surface = createSurfaceMaterial(kind, style); hooks.add(surface.material.onBeforeCompile.toString()); surface.dispose(); }
  const g = new BufferGeometry(), m = new MeshStandardMaterial(), root = new Group(); root.add(new Mesh(g, m));
  patchTileMaterials(root, { enabled: true, signageIntensity: { value: 0 }, style: createFacadeStyle(style) });
  hooks.add(m.onBeforeCompile.toString()); g.dispose(); m.dispose(); root.clear(); return hooks;
}
export interface RailIdentity { key: string; kind: "rail-asset" | "building" | "scene"; uri?: string; sha256?: string | null; gmlId?: string; file?: string }
/** Body and cap draws retain one asset identity; building fragments retain the
 * published tile/GML identity. A key never depends on a winding result. */
export function railIdentity(mesh: Mesh, batch: number | null): RailIdentity {
  const retained = mesh.userData.railObservedIdentities?.[String(batch)] as RailIdentity | undefined;
  if (retained) return retained;
  const asset = mesh.userData.railAsset as { file: string; sha256: string } | undefined;
  if (asset) return { key: `rail:${asset.file}:${asset.sha256}`, kind: "rail-asset", file: asset.file, sha256: asset.sha256 };
  let parent: Object3D | null = mesh;
  while (parent && !(parent as Object3D & { batchTable?: unknown }).batchTable) parent = parent.parent;
  const table = (parent as (Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }) | null)?.batchTable;
  const replacement = mesh.userData.railReplacement;
  const id = replacement?.id ?? (table && batch !== null ? table.getDataFromId(batch).gml_id : null);
  const tile = parent?.userData.railTileIdentity;
  if (id) return { key: `building:${replacement?.uri ?? tile?.uri ?? parent?.uuid}:${String(id)}`, kind: "building", uri: replacement?.uri ?? tile?.uri, sha256: tile?.sha256 ?? null, gmlId: String(id) };
  return { key: mesh.parent?.name === "terrain" ? "complete-terrain-cutout" : `${mesh.uuid}:${batch}`, kind: "scene" };
}
export function railMeshProblem(mesh: Mesh): string | null {
  const g = mesh.geometry, p = g.getAttribute("position");
  if (!p || (mesh as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh || (mesh as Mesh & { isBatchedMesh?: boolean }).isBatchedMesh || mesh.morphTargetInfluences?.some(v => v !== 0) || (mesh instanceof InstancedMesh && mesh.morphTexture)) return "missing position, skinned, batched or active morph geometry";
  if (mesh.onBeforeRender !== Object3D.prototype.onBeforeRender || mesh.onAfterRender !== Object3D.prototype.onAfterRender) return "unrecognized object render callback";
  if ([p, g.index, g.getAttribute("_batchid")].some(a => a && "isInterleavedBufferAttribute" in a && a.isInterleavedBufferAttribute)) return "unsupported interleaved position/index/batch storage";
  const aligned = (n: number): boolean => Number.isInteger(n) && n >= 0 && n % 3 === 0;
  const count = g.index?.count ?? p.count;
  let supported = aligned(g.drawRange.start) && (g.drawRange.count === Infinity || aligned(g.drawRange.count)) && aligned(count);
  if (Array.isArray(mesh.material)) {
    let end = 0;
    for (const group of g.groups) { supported &&= group.start === end && aligned(group.count) && Number.isInteger(group.materialIndex) && group.materialIndex! >= 0 && group.materialIndex! < mesh.material.length; end = group.start + group.count; }
    supported &&= end === count;
  }
  return supported ? null : "unsupported draw ranges/material groups: require aligned triangles and a complete ordered material-array partition";
}
export function railMaterialProblem(material: Material, hooks: Set<string>): string | null {
  return (material as Material & { isShaderMaterial?: boolean; displacementMap?: unknown }).isShaderMaterial || (material as Material & { displacementMap?: unknown }).displacementMap || !hooks.has(material.onBeforeCompile.toString()) || material.onBeforeRender !== Material.prototype.onBeforeRender || material.clipIntersection ? "shader/displacement or unrecognized vertex hook" : null;
}
export function createRailCameraObserver(root: Object3D, camera: PerspectiveCamera, state: () => { frame: number; revision: number; population: PopulationStatus; ready: boolean }): () => RailCameraClearance {
  const cache = new WeakMap<BufferGeometry, Cache>(), hooks = knownRailHooks();
  function parts(g: BufferGeometry): Part[] {
    const p = g.getAttribute("position"), index = g.index, batch = g.getAttribute("_batchid"), range = JSON.stringify([g.drawRange, g.groups]);
    const version = (a: unknown): number => (a as { version?: number } | undefined)?.version ?? 0;
    const previous = cache.get(g);
    if (previous?.position === p && previous.positionVersion === version(p) && previous.index === index && previous.indexVersion === version(index) && previous.batch === batch && previous.batchVersion === version(batch) && previous.range === range) return previous.parts;
    const grouped = new Map<string, Part>(), end = Math.min(index?.count ?? p.count, g.drawRange.start + g.drawRange.count);
    for (let i = g.drawRange.start; i + 2 < end; i += 3) {
      const vertex = index ? index.getX(i) : i, id = batch ? batch.getX(vertex) : null;
      const group = g.groups.find(r => i >= r.start && i < r.start + r.count), material = group?.materialIndex ?? 0;
      const key = `${id}/${material}`, part = grouped.get(key) ?? { batch: id, material, faces: [], vertices: new Set<number>() };
      part.faces.push(i);
      for (let j = 0; j < 3; j++) part.vertices.add(index ? index.getX(i + j) : i + j);
      grouped.set(key, part);
    }
    const result = [...grouped.values()]; cache.set(g, { position: p, positionVersion: version(p), index, indexVersion: version(index), batch, batchVersion: version(batch), range, parts: result }); return result;
  }
  return () => {
    const binding = state(), eye = new Vector3().setFromMatrixPosition(camera.matrixWorld), inverse = camera.matrixWorld.clone().invert();
    const near = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new Vector3(x!, y!, -1).unproject(camera));
    const nearBox = new Box3().setFromPoints(near), query = nearBox.clone().expandByPoint(eye);
    const out: RailCameraClearance = { bound: "Current visible city position buffers, material clipping, draw ranges and instances; agents0 only. Known position-preserving shader hooks are source-bound. Open/ambiguous winding and unsupported drawing report unknown. This is an on-demand geometric observation, not appearance or moving-body proof.", frame: binding.frame, revision: binding.revision, cameraWorld: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), eye: eye.toArray(), nearPlane: near.map(p => p.toArray()), eligible: false, unknown: [], intersections: [], containment: [], counts: { meshes: 0, instances: 0, groups: 0, broadphase: 0, testedTriangles: 0 } };
    if (!binding.ready || !root.visible) out.unknown.push({ object: root.name, instance: null, batch: null, reason: "city is not fully ready/visible" });
    if (binding.population.attached || binding.population.pedestrians.requested || binding.population.vehicles.requested) out.unknown.push({ object: "agents", instance: null, batch: null, reason: "camera trial requires agents=0" });
    const ordinaryProjection = new PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far).projectionMatrix;
    if (camera.zoom !== 1 || camera.filmOffset !== 0 || camera.view?.enabled || !camera.projectionMatrix.equals(ordinaryProjection)) {
      out.unknown.push({ object: "camera", instance: null, batch: null, reason: "unsupported projection: require ordinary unshifted perspective, zoom1 and its unchanged projection matrix" });
      return freezePlain(out);
    }
    const groups = new Map<string, { entries: Entry[]; box: Box3 }>();
    let limited = false;
    root.traverseVisible(object => {
      if (limited) return;
      if (!(object instanceof Mesh)) {
        if ((object as Object3D & { isLine?: boolean; isPoints?: boolean; isSprite?: boolean }).isLine || (object as Object3D & { isPoints?: boolean }).isPoints || (object as Object3D & { isSprite?: boolean }).isSprite) out.unknown.push({ object: object.name || object.type, instance: null, batch: null, reason: "unsupported non-triangle draw type" });
        return;
      }
      out.counts.meshes++;
      if (out.counts.meshes > 10000) { limited = true; out.unknown.push({ object: object.name, instance: null, batch: null, reason: "finite10000-mesh observation limit" }); return; }
      const mesh = object, problem = railMeshProblem(mesh);
      if (problem) { out.unknown.push({ object: mesh.name, instance: null, batch: null, reason: problem }); return; }
      const instanceCount = mesh instanceof InstancedMesh ? mesh.count : 1;
      for (let instance = 0; instance < instanceCount; instance++) {
        if (++out.counts.instances > 50000) { limited = true; out.unknown.push({ object: mesh.name, instance, batch: null, reason: "finite50000-instance observation limit" }); break; }
        const matrix = mesh.matrixWorld.clone(); if (mesh instanceof InstancedMesh) { const local = new Matrix4(); mesh.getMatrixAt(instance, local); matrix.multiply(local); }
        for (const part of parts(mesh.geometry)) {
          const material = Array.isArray(mesh.material) ? mesh.material[part.material] : mesh.material;
          if (!material || !material.visible) continue;
          const name = mesh.name || mesh.uuid;
          const problem = railMaterialProblem(material, hooks);
          if (problem) { out.unknown.push({ object: name, instance: mesh instanceof InstancedMesh ? instance : null, batch: part.batch, reason: problem }); continue; }
          const identity = railIdentity(mesh, part.batch), key = `${identity.key}${mesh instanceof InstancedMesh ? `:instance${instance}` : ""}`;
          // Transform every referenced vertex, not the corners of its local
          // axis-aligned box. Rotation can make that box a false candidate.
          // Union all material fragments below before testing containment.
          const box = new Box3(), point = new Vector3(), positions = mesh.geometry.getAttribute("position");
          for (const vertex of part.vertices) box.expandByPoint(point.fromBufferAttribute(positions, vertex).applyMatrix4(matrix));
          const entry: Entry = { mesh, instance: mesh instanceof InstancedMesh ? instance : null, part, matrix, box, material, key };
          const group = groups.get(key) ?? { entries: [], box: new Box3() }; group.entries.push(entry); group.box.union(box); groups.set(key, group);
        }
      }
    });
    out.counts.groups = groups.size;
    const queries = [eye, ...near];
    const h = camera.near * Math.tan(camera.fov * Math.PI / 360), w = h * camera.aspect;
    const clip = (poly: Vector3[], distance: (p: Vector3) => number): Vector3[] => {
      const result: Vector3[] = [];
      for (let i = 0; i < poly.length; i++) { const a = poly[i]!, b = poly[(i + 1) % poly.length]!, da = distance(a), db = distance(b); if (da <= 0) result.push(a); if ((da < 0 && db > 0) || (da > 0 && db < 0)) result.push(a.clone().lerp(b, da / (da - db))); }
      return result;
    };
    for (const group of groups.values()) {
      if (!group.box.intersectsBox(query)) continue;
      out.counts.broadphase++;
      // Roads, paint and mapped grass are sheets, not filled volumes between
      // unrelated road elevations. They still take the complete near-plane test.
      const sheets = group.entries.every(e => e.mesh.name.startsWith("roads:") || e.mesh.name === "streets:paint" || e.mesh.name === "streets:tactile-paving" || e.mesh.name === "vegetation:ground-cover");
      const sums = queries.map(() => 0), contained = queries.map(p => !sheets && group.box.containsPoint(p) && CITY_CLIP_PLANES.every(plane => plane.distanceToPoint(p) >= 0));
      let hasClipping = false;
      for (const entry of group.entries) {
        const { mesh, part, matrix, material } = entry, g = mesh.geometry, positions = g.getAttribute("position"), index = g.index;
        const witness = { object: mesh.name || mesh.uuid, instance: entry.instance, batch: part.batch, identity: railIdentity(mesh, part.batch) };
        for (const face of part.faces) {
          if (++out.counts.testedTriangles > 2000000) { out.unknown.push({ ...witness, face: face / 3, reason: "finite2000000-triangle narrow-phase limit" }); limited = true; break; }
          let points = [0, 1, 2].map(j => new Vector3().fromBufferAttribute(positions, index ? index.getX(face + j) : face + j).applyMatrix4(matrix));
          for (const plane of material.clippingPlanes ?? []) { const before = points; points = clip(points, p => -plane.distanceToPoint(p)); if (points.length !== before.length || points.some((p, i) => p !== before[i])) hasClipping = true; }
          if (!points.length) continue;
          for (let j = 1; j + 1 < points.length; j++) {
            const triangle = [points[0]!, points[j]!, points[j + 1]!];
            const surface = new Triangle(...triangle as [Vector3, Vector3, Vector3]);
            const normal = surface.getNormal(new Vector3());
            if (normal.lengthSq() > 0 && normal.dot(eye.clone().sub(triangle[0]!)) === 0 && surface.containsPoint(eye)) out.intersections.push({ ...witness, face: face / 3, reason: "eye contacts visible triangle" });
            for (let k = 0; k < queries.length; k++) if (contained[k]) {
              const [a, b, c] = triangle.map(p => p.clone().sub(queries[k]!)) as [Vector3, Vector3, Vector3];
              const numerator = a.dot(b.clone().cross(c)), denominator = a.length() * b.length() * c.length() + a.dot(b) * c.length() + b.dot(c) * a.length() + c.dot(a) * b.length();
              sums[k]! += 2 * Math.atan2(numerator, denominator);
            }
          }
          if (!entry.box.intersectsBox(nearBox)) continue;
          let nearPoly = points.map(p => p.clone().applyMatrix4(inverse));
          for (const [axis, sign, limit] of [["x", 1, w], ["x", -1, w], ["y", 1, h], ["y", -1, h]] as const) nearPoly = clip(nearPoly, p => sign * p[axis] - limit);
          if (nearPoly.length && Math.min(...nearPoly.map(p => p.z)) <= -camera.near && Math.max(...nearPoly.map(p => p.z)) >= -camera.near) out.intersections.push({ ...witness, face: face / 3, reason: "visible triangle intersects complete near rectangle" });
        }
        if (limited) break;
      }
      for (let k = 0; k < sums.length; k++) {
        const winding = sums[k]! / (4 * Math.PI); if (Math.abs(winding) <= 1e-7) continue;
        const entry = group.entries[0]!, witness = { object: entry.mesh.name || entry.mesh.uuid, instance: entry.instance, batch: entry.part.batch, identity: railIdentity(entry.mesh, entry.part.batch), winding, reason: `${k === 0 ? "eye" : `near corner${k}`} ${hasClipping ? "clipped/open" : "stored"} winding` };
        if (Math.abs(winding) >= .99 && !hasClipping) out.containment.push(witness); else out.unknown.push(witness);
      }
      if (limited) break;
    }
    out.eligible = out.unknown.length === 0 && out.intersections.length === 0 && out.containment.length === 0;
    return freezePlain(out);
  };
}
