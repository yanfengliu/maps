/** Floor grids for untextured tile meshes. Published geometry stays unchanged.
 * Bounds: floor counts come from the tile's batch table when valid; missing
 * counts use measured geometry / 3.5 m. This is facade treatment, not a survey
 * of where any real window sits. Textured facades retain their photographs.
 */
import { Float32BufferAttribute, Mesh, MeshStandardMaterial, Vector3, type Object3D } from "three";
import { readStoreysAboveGround, type RawAttribute } from "../world/building-attributes.js";
import { createRng } from "../world/rng.js";

interface BatchReader { getDataFromId(id: number): Record<string, unknown> }

export function floorLayout(heightM: number, rawStoreys: RawAttribute): { floors: number; floorHeightM: number } {
  const height = Math.max(0.1, heightM);
  const floors = readStoreysAboveGround(rawStoreys) ?? Math.max(1, Math.round(height / 3.5));
  return { floors, floorHeightM: height / floors };
}

export function prepareProceduralFacades(scene: Object3D): number {
  const table = (scene as Object3D & { batchTable?: BatchReader }).batchTable;
  scene.updateMatrixWorld(true);
  let treated = 0;
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (!materials.some((material) => material instanceof MeshStandardMaterial)) return;
    const geometry = object.geometry;
    const positions = geometry.getAttribute("position");
    const ids = geometry.getAttribute("_batchid") ?? geometry.getAttribute("_BATCHID");
    const bounds = new Map<number, { bottom: number; top: number }>();
    const world = new Vector3();
    const vertices: { id: number; y: number }[] = [];
    for (let index = 0; index < positions.count; index += 1) {
      world.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      const id = ids?.getX(index) ?? 0;
      const bound = bounds.get(id) ?? { bottom: Infinity, top: -Infinity };
      bound.bottom = Math.min(bound.bottom, world.y);
      bound.top = Math.max(bound.top, world.y);
      bounds.set(id, bound);
      vertices.push({ id, y: world.y });
    }
    const layouts = new Map<number, { bottom: number; floorHeight: number; tone: number }>();
    for (const [id, bound] of bounds) {
      const data = table?.getDataFromId(id);
      const layout = floorLayout(bound.top - bound.bottom, data?.["bldg:storeysAboveGround"] as RawAttribute);
      let seed = id + 3917;
      const identifier = data?.["gml_id"];
      if (typeof identifier === "string") { seed = 2166136261; for (const character of identifier) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619); }
      layouts.set(id, { bottom: bound.bottom, floorHeight: layout.floorHeightM, tone: createRng(seed)() });
    }
    const params = new Float32Array(positions.count * 3);
    for (let index = 0; index < vertices.length; index += 1) {
      const layout = layouts.get(vertices[index]!.id)!;
      params.set([layout.bottom, layout.floorHeight, layout.tone], index * 3);
    }
    geometry.setAttribute("mapsFloorParams", new Float32BufferAttribute(params, 3));
    treated += bounds.size;
  });
  return treated;
}
