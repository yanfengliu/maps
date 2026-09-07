/**
 * Terrain. Owned by Phases 2 and 3.
 *
 * What lands here: a mesh built offline from the GSI 5 m DEM, projected through
 * `planeRectangularToWorld`, tiled for culling. Shibuya is a valley and
 * Dōgenzaka means slope, so flat ground reads as wrong the moment you look at
 * it — which is exactly why the placeholder below is flat and obviously fake.
 * It exists to give the visual gate a floor and a sense of scale, nothing more.
 */

import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  CanvasTexture,
  SRGBColorSpace,
} from "three";

import { AOI_HALF_EXTENT_M } from "../world/frame.js";

/** How far past the area of interest the placeholder ground reaches, in metres. */
const GROUND_MARGIN_M = 700;

export function createTerrain(): Group {
  const group = new Group();
  group.name = "terrain";

  const extent = (AOI_HALF_EXTENT_M + GROUND_MARGIN_M) * 2;
  const geometry = new PlaneGeometry(extent, extent, 1, 1);
  // PlaneGeometry is built in the XY plane; lay it down so it spans X and Z.
  geometry.rotateX(-Math.PI / 2);

  const material = new MeshStandardMaterial({
    map: createBlockPavingTexture(extent),
    roughness: 0.92,
    metalness: 0.0,
  });

  const ground = new Mesh(geometry, material);
  ground.name = "terrain:placeholder-ground";
  ground.receiveShadow = true;
  group.add(ground);

  return group;
}

/**
 * A one-tile street pattern, drawn once into a canvas and repeated.
 *
 * This is not a road network — Phase 4 owns markings and Phase 6 owns the lane
 * graph. It is here so an overhead frame shows a street grid instead of an
 * unbroken grey field, which is the difference between a frame you can judge and
 * a frame you cannot.
 */
function createBlockPavingTexture(extentMetres: number): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error(
      "A 2D canvas context was refused, so the placeholder paving texture cannot be drawn. " +
        "This usually means the page is running without a working canvas implementation.",
    );
  }

  // Asphalt.
  context.fillStyle = "#3a3d42";
  context.fillRect(0, 0, size, size);
  // Pavement blocks, inset so the gap between them reads as a street.
  const roadWidth = 34;
  context.fillStyle = "#6a6d72";
  context.fillRect(roadWidth, roadWidth, size - roadWidth * 2, size - roadWidth * 2);
  // A kerb line around each block.
  context.strokeStyle = "#8d9096";
  context.lineWidth = 3;
  context.strokeRect(roadWidth, roadWidth, size - roadWidth * 2, size - roadWidth * 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // One tile per 100 m block, matching the placeholder building pitch.
  const tiles = extentMetres / 100;
  texture.repeat.set(tiles, tiles);
  texture.anisotropy = 4;
  return texture;
}
