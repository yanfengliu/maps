/**
 * Buildings. Owned by Phases 2, 3 and 4.
 *
 * What lands here: PLATEAU LOD2 geometry converted to glTF offline, clipped to
 * the area of interest, snapped to the terrain, then given procedural facades
 * and emissive signage in Phase 4.
 *
 * What is here now: a grid of boxes on a 100 m pitch with heights drawn from a
 * seeded generator, sized so the scene reads at Shibuya's scale. They are
 * placeholders and they look like placeholders on purpose. Their only job is to
 * put real geometry in front of the visual gate — something with silhouette,
 * shadow and parallax, so a frame from one azimuth is visibly not a frame from
 * another.
 */

import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";

import { AOI_HALF_EXTENT_M } from "../world/frame.js";
import { DEFAULT_SEED, createRng, randomBetween } from "../world/rng.js";

/** Distance between block centres, metres. */
const BLOCK_PITCH_M = 100;
/** How much of a block the placeholder building fills, as a fraction. */
const FOOTPRINT_FILL = 0.62;
/**
 * The open plaza kept clear at the origin, in metres.
 *
 * The world origin is the Scramble Crossing. Leaving it empty means the
 * street-level shots in the visual sweep look out across an open space instead
 * of into the inside face of a box, and it marks where the crossing goes.
 */
const PLAZA_RADIUS_M = 90;

export interface BuildingsOptions {
  seed?: number;
}

export function createBuildings(options: BuildingsOptions = {}): Group {
  const group = new Group();
  group.name = "buildings";

  const rng = createRng(options.seed ?? DEFAULT_SEED);
  const placements = planPlacements(rng);

  // One instanced mesh for the whole placeholder city: the draw-call budget in
  // Phase 9 is the reason instancing is the default here rather than something
  // to retrofit later.
  const geometry = new BoxGeometry(1, 1, 1);
  // Move the box's origin to its base so a unit-height scale is a metre of
  // height above the ground rather than half a metre either side of it.
  geometry.translate(0, 0.5, 0);

  const material = new MeshStandardMaterial({
    roughness: 0.75,
    metalness: 0.05,
  });

  const mesh = new InstancedMesh(geometry, material, placements.length);
  mesh.name = "buildings:placeholder-blocks";
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const matrix = new Matrix4();
  const position = new Vector3();
  const scale = new Vector3();
  const rotation = new Quaternion();
  const colour = new Color();

  placements.forEach((placement, index) => {
    position.set(placement.x, 0, placement.z);
    scale.set(placement.width, placement.height, placement.depth);
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    // Tall towers read cooler and glassier, low blocks warmer and more concrete.
    const tallness = Math.min(placement.height / 180, 1);
    colour.setHSL(0.58 - 0.1 * (1 - tallness), 0.05 + 0.06 * tallness, 0.34 + 0.2 * tallness);
    mesh.setColorAt(index, colour);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;

  group.add(mesh);
  return group;
}

interface Placement {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

function planPlacements(rng: () => number): Placement[] {
  const placements: Placement[] = [];
  const blocksPerSide = Math.floor((AOI_HALF_EXTENT_M * 2) / BLOCK_PITCH_M);
  const first = -((blocksPerSide - 1) / 2) * BLOCK_PITCH_M;

  for (let row = 0; row < blocksPerSide; row += 1) {
    for (let column = 0; column < blocksPerSide; column += 1) {
      const x = first + column * BLOCK_PITCH_M;
      const z = first + row * BLOCK_PITCH_M;
      // Draw for every cell, including skipped ones, so the plaza does not shift
      // the sequence for everything after it.
      const width = BLOCK_PITCH_M * FOOTPRINT_FILL * randomBetween(rng, 0.8, 1.0);
      const depth = BLOCK_PITCH_M * FOOTPRINT_FILL * randomBetween(rng, 0.8, 1.0);
      const distance = Math.hypot(x, z);
      // Heights fall off from the centre: Shibuya's towers cluster on the
      // station side and the streets get low fast as you walk out.
      const centrality = Math.max(0, 1 - distance / (AOI_HALF_EXTENT_M * 1.1));
      const height = randomBetween(rng, 12, 34) + centrality ** 2 * randomBetween(rng, 20, 190);

      if (distance < PLAZA_RADIUS_M) continue;
      placements.push({ x, z, width, depth, height });
    }
  }

  return placements;
}
