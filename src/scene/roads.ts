/**
 * The road network. Surfaces here from Phase 3; the graph is Phase 6's.
 *
 * Two separate things belong at this address and they must not be confused:
 *
 * - The road *surface* — asphalt, and later markings, kerbs, signals and street
 *   furniture. That is rendered geometry. The asphalt is here now; the rest is
 *   Phase 4's work.
 * - The road *graph* — lanes, sidewalks, crossings and the signal phase model.
 *   That is simulation data built from OpenStreetMap, Phase 6's work, and it
 *   stays in files of its own: the rendered scene is a Produced Work with no
 *   share-alike, but that graph is a Derivative Database under ODbL section 4.6.
 *   See plan item 23.
 *
 * What draws now is PLATEAU's `tran` surfaces, built offline by
 * `tools/scene/build-roads.ts`. The trap that file exists to avoid is worth
 * repeating here: **`tran` LOD1 and LOD2 polygons are flat at z = 0**, fifteen
 * metres below the valley floor, so the 64% of roads that have no LOD3 are draped
 * onto the terrain rather than drawn as published.
 */

import { Group, Mesh, MeshStandardMaterial } from "three";

import { SCENE_FILES } from "../world/scene-data.js";
import { loadMesh, toGeometry } from "./mesh-loader.js";

export interface RoadsInfo {
  triangleCount: number;
  vertexCount: number;
}

export interface Roads {
  root: Group;
  info: RoadsInfo;
  dispose(): void;
}

export async function createRoads(): Promise<Roads> {
  const mesh = await loadMesh(SCENE_FILES.roads);
  const geometry = toGeometry(mesh);

  const material = new MeshStandardMaterial({
    color: 0x3f4247,
    roughness: 0.88,
    metalness: 0.0,
    // The offline build already lifts every road vertex 0.2 m clear of the
    // ground. This is the second defence, and it is the one that works at any
    // camera distance: the lift is a fixed number of metres and the depth
    // buffer's resolution is not, so at the 950 m the overhead sweep sits at the
    // two surfaces are within a few centimetres of each other in depth.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });

  const surface = new Mesh(geometry, material);
  surface.name = "roads:plateau-tran";
  surface.receiveShadow = true;
  surface.castShadow = false;

  const group = new Group();
  group.name = "roads";
  group.add(surface);

  return {
    root: group,
    info: { triangleCount: mesh.header.triangleCount, vertexCount: mesh.header.vertexCount },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
