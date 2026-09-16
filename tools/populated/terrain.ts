/**
 * The ground under any world point, from the terrain mesh the app is served.
 *
 * This exists because the populated lane put its camera underground twice. The
 * controls' target is pinned at the crossing's own 15.2 m — both of
 * `OrbitControls`' pan axes are horizontal, so panning never changes the target's
 * height — while the terrain runs from 7.3 m to 38.9 m across this AOI
 * (`data/scene/terrain.mesh`). A pose that looks level is therefore five metres
 * above the street at the scramble and inside the hill at the west edge.
 *
 * The first attempt at this used the nearest paint placement from the bridge's
 * `paint()` observation. That is the wrong instrument: paint exists only where
 * there are crossings and tactile strips, so on the west hill the nearest
 * placement was about 20 m of elevation below the target and 100 m away, and the
 * camera was aimed 14 m into the ground. The terrain mesh is the ground
 * everywhere, it is the same file the app renders, and reading it here writes
 * nothing to the page.
 *
 * Format, as `src/world/mesh.ts` decodes it: magic "MAPSMSH1", a uint32 JSON
 * header length, the padded JSON header, then float32 positions, float32 normals
 * and uint32 indices.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TerrainSample {
  /** Highest terrain vertex within the radius: what a camera there must clear. */
  highestM: number;
  /** Lowest, which is the ground an eye at that spot is standing over. */
  lowestM: number;
  vertices: number;
}

let cache: { positions: Float32Array; vertexCount: number; bounds: { min: number[]; max: number[] } } | null = null;

function terrain(): { positions: Float32Array; vertexCount: number; bounds: { min: number[]; max: number[] } } {
  if (cache !== null) return cache;
  const file = resolve(".", "data/scene/terrain.mesh");
  const bytes = readFileSync(file);
  const magic = bytes.toString("ascii", 0, 8);
  if (magic !== "MAPSMSH1") {
    throw new Error(
      `${file} starts with "${magic}" rather than MAPSMSH1, so the ground under a pose cannot be read and every camera ` +
        "placed from it would be a guess. Run `npm run data:scene`.",
    );
  }
  const headerLength = bytes.readUInt32LE(8);
  const header = JSON.parse(bytes.toString("utf8", 12, 12 + headerLength)) as {
    vertexCount: number;
    bounds: { min: number[]; max: number[] };
  };
  cache = {
    positions: new Float32Array(bytes.buffer, bytes.byteOffset + 12 + headerLength, header.vertexCount * 3),
    vertexCount: header.vertexCount,
    bounds: header.bounds,
  };
  return cache;
}

/** The terrain within `radius` metres of a world point. */
export function terrainAt(x: number, z: number, radius = 6): TerrainSample {
  const { positions, vertexCount } = terrain();
  let highest = Number.NEGATIVE_INFINITY;
  let lowest = Number.POSITIVE_INFINITY;
  let count = 0;
  const squared = radius * radius;
  for (let index = 0; index < vertexCount; index += 1) {
    const dx = positions[index * 3]! - x;
    const dz = positions[index * 3 + 2]! - z;
    if (dx * dx + dz * dz > squared) continue;
    const y = positions[index * 3 + 1]!;
    if (y > highest) highest = y;
    if (y < lowest) lowest = y;
    count += 1;
  }
  return { highestM: highest, lowestM: lowest, vertices: count };
}

export interface PosePlan {
  /** Controls target, world metres. */
  target: { x: number; z: number };
  azimuth: number;
  distance: number;
  /** How far above the ground the camera should stand, metres. */
  standHeightM: number;
  /** The crossing's height, which is where the controls' target is pinned. */
  targetY: number;
}

export interface PoseSolution {
  /** The polar angle that stands the camera `standHeightM` above the ground. */
  polar: number;
  /** Where the camera ends up, and the ground under it. */
  camera: { x: number; y: number; z: number };
  cameraGroundM: number;
  targetGroundM: number;
  /** Metres between the camera and the highest terrain under it. */
  clearanceM: number;
}

/**
 * Solve the polar angle for a pose, against the real ground at both ends.
 *
 * The camera's own position depends on the angle, and the angle depends on the
 * ground under the camera, so this iterates: start from the ground at the target,
 * place the camera, read the ground there, place it again. Three passes converge
 * because the geometry barely moves.
 *
 * `clearanceM` is the number to look at. Negative means the camera is inside the
 * hill, which renders the city from underneath with the sky behind it — a broken
 * frame that looks like a rendering fault and is really a framing one.
 */
export function solvePose(plan: PosePlan, groundRadiusM = 8): PoseSolution {
  const targetGround = terrainAt(plan.target.x, plan.target.z, groundRadiusM);
  if (targetGround.vertices === 0) {
    throw new Error(
      `No terrain vertex is within ${groundRadiusM} m of (${plan.target.x}, ${plan.target.z}), so this pose is off the ` +
        "built mesh and its camera height would be a guess.",
    );
  }
  let desiredCameraY = targetGround.highestM + plan.standHeightM;
  let polar = Math.acos(clamp((desiredCameraY - plan.targetY) / plan.distance, 0.02, 0.97));

  for (let pass = 0; pass < 3; pass += 1) {
    const cameraX = plan.target.x + plan.distance * Math.sin(polar) * Math.sin(plan.azimuth);
    const cameraZ = plan.target.z + plan.distance * Math.sin(polar) * Math.cos(plan.azimuth);
    const cameraGround = terrainAt(cameraX, cameraZ, groundRadiusM);
    // The camera has to clear the ground it stands over too, not only the ground
    // at the target: on a hillside those are metres apart.
    const required = Math.max(targetGround.highestM, cameraGround.vertices === 0 ? -Infinity : cameraGround.highestM);
    desiredCameraY = required + plan.standHeightM;
    polar = Math.acos(clamp((desiredCameraY - plan.targetY) / plan.distance, 0.02, 0.97));
  }

  const cameraX = plan.target.x + plan.distance * Math.sin(polar) * Math.sin(plan.azimuth);
  const cameraZ = plan.target.z + plan.distance * Math.sin(polar) * Math.cos(plan.azimuth);
  const cameraY = plan.targetY + plan.distance * Math.cos(polar);
  const cameraGround = terrainAt(cameraX, cameraZ, groundRadiusM);

  return {
    polar,
    camera: { x: cameraX, y: cameraY, z: cameraZ },
    cameraGroundM: cameraGround.vertices === 0 ? Number.NaN : cameraGround.highestM,
    targetGroundM: targetGround.highestM,
    clearanceM: cameraGround.vertices === 0 ? Number.NaN : cameraY - cameraGround.highestM,
  };
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return high;
  return Math.max(low, Math.min(high, value));
}
