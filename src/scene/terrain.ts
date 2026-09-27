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

import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from "three";
import { AOI_CORNERS_WORLD } from "../world/aoi.js";
import { clipCityRoot } from "./aoi-cutout.js";
import { terrainSectionGeometry } from "./cutout-sections.js";
import { DEFAULT_WORLD_STYLE_ID, worldStyle, type WorldStyle } from "../world/styles.js";
import { createSurfaceMaterial } from "./surface-materials.js";

import { SCENE_FILES } from "../world/scene-data.js";
import { loadMesh, toGeometry } from "./mesh-loader.js";
import { surfaceSampler } from "../world/surface-sampler.js";

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
  heightAt(x: number, z: number): number | undefined;
  setStyle(style: WorldStyle): void;
  dispose(): void;
}

export async function createTerrain(style: WorldStyle = worldStyle(DEFAULT_WORLD_STYLE_ID)): Promise<Terrain> {
  const mesh = await loadMesh(SCENE_FILES.terrain);
  const geometry = toGeometry(mesh);

  const treatment = createSurfaceMaterial("ground", style);
  const material = treatment.material;

  const ground = new Mesh(geometry, material);
  ground.name = "terrain:plateau-tin";
  ground.receiveShadow = true;
  // The ground cannot shadow itself usefully at this shadow-map resolution and
  // casting from 183,000 triangles costs a full extra pass over them.
  ground.castShadow = false;

  const group = new Group();
  group.name = "terrain";
  group.add(ground);

  const floor = mesh.header.bounds.min[1] - 12;
  const sections = terrainSectionGeometry(mesh, floor);
  const sectionMaterial = new MeshStandardMaterial({ color: new Color(style.palette.ground).multiplyScalar(0.48), roughness: 1 });
  sections.forEach((section, side) => {
    // Each side owns clipping against the other three planes.
    const face = new Mesh(section, sectionMaterial.clone());
    face.name = `terrain:cutout-section-${side}`; face.userData.cutoutSectionSide = side;
    face.receiveShadow = true; group.add(face);
  });
  sectionMaterial.dispose();
  const bottom = new BufferGeometry();
  bottom.setAttribute("position", new Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap(index => [AOI_CORNERS_WORLD[index]![0], floor, AOI_CORNERS_WORLD[index]![1]]), 3));
  bottom.computeVertexNormals(); sections.push(bottom);
  const base = new Mesh(bottom, new MeshStandardMaterial({ color: new Color(style.palette.ground).multiplyScalar(0.48), roughness: 1 }));
  base.name = "terrain:cutout-bottom"; group.add(base);
  clipCityRoot(group);

  return {
    root: group,
    heightAt: surfaceSampler(mesh),
    setStyle(next): void {
      treatment.apply(next);
      for (const child of group.children) if (child instanceof Mesh && child !== ground) (child.material as MeshStandardMaterial).color.setHex(next.palette.ground).multiplyScalar(0.48);
    },
    info: {
      triangleCount: mesh.header.triangleCount,
      vertexCount: mesh.header.vertexCount,
      minimumHeightM: mesh.header.bounds.min[1],
      maximumHeightM: mesh.header.bounds.max[1],
    },
    dispose(): void {
      geometry.dispose();
      for (const section of sections) section.dispose();
      for (const child of group.children) if (child instanceof Mesh && child !== ground) (child.material as MeshStandardMaterial).dispose();
      // Through the treatment, not `material.dispose()`: the ground's material owns
      // the world-space detail texture, and disposing only the material would leave
      // that texture on the GPU.
      treatment.dispose();
    },
  };
}
