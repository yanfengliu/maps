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

import { Color, Group, Mesh, MeshStandardMaterial } from "three";
import { DEFAULT_WORLD_STYLE_ID, worldStyle, type WorldStyle } from "../world/styles.js";
import { createSurfaceMaterial } from "./surface-materials.js";

import { SCENE_FILES } from "../world/scene-data.js";
import { loadMesh, loadMeshWithDigest, toGeometry } from "./mesh-loader.js";
import { surfaceSampler } from "../world/surface-sampler.js";
import { createPaintSupport, type PaintSupport } from "./paint-support.js";

export interface RoadsInfo {
  triangleCount: number;
  vertexCount: number;
}

export interface Roads {
  root: Group;
  info: RoadsInfo;
  inputDigests: { roads: string; pavements: string };
  heightAt(x: number, z: number): number | undefined;
  paintHeightAt: PaintSupport;
  setStyle(style: WorldStyle): void;
  dispose(): void;
}

export async function createRoads(style: WorldStyle = worldStyle(DEFAULT_WORLD_STYLE_ID)): Promise<Roads> {
  const [roadInput, pavementInput, markingMesh] = await Promise.all([loadMeshWithDigest(SCENE_FILES.roads), loadMeshWithDigest(SCENE_FILES.pavements), loadMesh(SCENE_FILES.markings)]);
  const mesh = roadInput.mesh, pavementMesh = pavementInput.mesh;
  const geometry = toGeometry(mesh);
  const roadAt = surfaceSampler(mesh, true); const pavementAt = surfaceSampler(pavementMesh, true);

  const treatment = createSurfaceMaterial("road", style);
  const material = treatment.material;
    // The offline build already lifts every road vertex 0.2 m clear of the
    // ground. This is the second defence, and it is the one that works at any
    // camera distance: the lift is a fixed number of metres and the depth
    // buffer's resolution is not, so at the 950 m the overhead sweep sits at the
    // two surfaces are within a few centimetres of each other in depth.

  const surface = new Mesh(geometry, material);
  surface.name = "roads:plateau-tran";
  surface.receiveShadow = true;
  surface.castShadow = false;

  const group = new Group();
  group.name = "roads";
  group.add(surface);
  const paving = createSurfaceMaterial("sidewalk", style);
  const pavementGeometry = toGeometry(pavementMesh);
  const pavement = new Mesh(pavementGeometry, paving.material);
  pavement.name = "roads:plateau-semantic-pavement";
  pavement.receiveShadow = true;
  group.add(pavement);
  const markingGeometry = toGeometry(markingMesh);
  const markingMaterial = new MeshStandardMaterial({ color: new Color(style.palette.sidewalk).lerp(new Color(0xffffff), 0.88), roughness: 0.74, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const markings = new Mesh(markingGeometry, markingMaterial);
  markings.name = "roads:plateau-source-markings";
  markings.receiveShadow = true;
  group.add(markings);

  return {
    root: group,
    inputDigests: { roads: roadInput.sha256, pavements: pavementInput.sha256 },
    paintHeightAt: createPaintSupport(mesh, pavementMesh),
    heightAt(x, z): number | undefined { const road = roadAt(x, z); const pavement = pavementAt(x, z); return road === undefined ? pavement : pavement === undefined ? road : Math.max(road, pavement); },
    info: { triangleCount: mesh.header.triangleCount, vertexCount: mesh.header.vertexCount },
    setStyle(next): void { treatment.apply(next); paving.apply(next); markingMaterial.color.setHex(next.palette.sidewalk).lerp(new Color(0xffffff), 0.88); },
    dispose(): void {
      geometry.dispose();
      material.dispose();
      pavementGeometry.dispose();
      paving.material.dispose();
      markingGeometry.dispose();
      markingMaterial.dispose();
    },
  };
}
