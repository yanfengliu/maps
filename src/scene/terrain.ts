/**
 * Terrain. Plan item 11, delivered in Phase 2.
 *
 * PLATEAU's own 2.5 m TIN, clipped to the area of interest plus a margin,
 * projected into the world frame offline and written as an indexed mesh. Nothing
 * is decimated: what draws here is the survey, 183,188 triangles of which 81,052
 * are inside the box itself.
 *
 * Heights are orthometric metres above Tokyo Bay mean sea level, which is what
 * scene Y means everywhere in this project. Ground at the crossing is 15.2 m, the
 * valley floor runs down to 8.7 m towards the Shibuya River, and Dōgenzaka climbs
 * to 36.4 m in the south-west. That relief is the point — a flat ground plane
 * reads as wrong immediately, and worse, a ground plane at the wrong *height*
 * reads as fine while every building floats or sinks.
 *
 * The material is deliberately plain. Phase 4 owns what the ground looks like;
 * this is enough to see the shape of it honestly.
 */

import { Group, Mesh, MeshStandardMaterial } from "three";

import { SCENE_FILES } from "../world/scene-data.js";
import { loadMesh, toGeometry } from "./mesh-loader.js";

export interface TerrainInfo {
  triangleCount: number;
  vertexCount: number;
  /** Lowest and highest ground in the mesh, metres above sea level. */
  minimumHeightM: number;
  maximumHeightM: number;
}

export interface Terrain {
  root: Group;
  info: TerrainInfo;
  dispose(): void;
}

export async function createTerrain(): Promise<Terrain> {
  const mesh = await loadMesh(SCENE_FILES.terrain);
  const geometry = toGeometry(mesh);

  const material = new MeshStandardMaterial({
    color: 0x8d8b82,
    roughness: 0.96,
    metalness: 0.0,
  });

  const ground = new Mesh(geometry, material);
  ground.name = "terrain:plateau-tin";
  ground.receiveShadow = true;
  // The ground cannot shadow itself usefully at this shadow-map resolution and
  // casting from 183,000 triangles costs a full extra pass over them.
  ground.castShadow = false;

  const group = new Group();
  group.name = "terrain";
  group.add(ground);

  return {
    root: group,
    info: {
      triangleCount: mesh.header.triangleCount,
      vertexCount: mesh.header.vertexCount,
      minimumHeightM: mesh.header.bounds.min[1],
      maximumHeightM: mesh.header.bounds.max[1],
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
