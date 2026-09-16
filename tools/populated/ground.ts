/**
 * Ground height anywhere in the area of interest, from the built terrain mesh.
 *
 * This exists because the populated lane put its camera underground twice. The
 * controls' target is pinned at the crossing's own 15.2 m — both of
 * `OrbitControls`' pan axes are horizontal — while the terrain runs from 8.71 m
 * to 36.35 m (`data/scene/manifest.json`), so a pose that looks level is five
 * metres above the street at one place and inside the hill at another. The
 * repair is to check the plan against the actual mesh before spending a browser
 * run on it.
 *
 * It reads the same file the app is served and the same header layout
 * `src/world/mesh.ts` decodes: magic "MAPSMSH1", a uint32 JSON header length, the
 * padded JSON header, then float32 positions, float32 normals and uint32 indices.
 *
 * RUN IT:
 *
 *   node tools/populated/ground.ts --at -490,425 --at 390,470 --radius 4
 *
 * Prints the highest terrain vertex within `radius` of each point, which is the
 * ground a camera at that spot has to clear, and the lowest, which is the ground
 * an eye there is standing over.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

const radius = Number(argument("radius") ?? 4);
const points = process.argv
  .map((value, index) => (value === "--at" ? process.argv[index + 1] : undefined))
  .filter((value): value is string => value !== undefined)
  .map((value) => {
    const [x, z] = value.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error(`--at takes "x,z"; received "${value}".`);
    return { x: x as number, z: z as number };
  });
if (points.length === 0) throw new Error('--at "x,z" is required at least once.');

const bytes = readFileSync(resolve(".", "data/scene/terrain.mesh"));
const magic = bytes.toString("ascii", 0, 8);
if (magic !== "MAPSMSH1") throw new Error(`data/scene/terrain.mesh starts with "${magic}", not MAPSMSH1; run npm run data:scene.`);
const headerLength = bytes.readUInt32LE(8);
const header = JSON.parse(bytes.toString("utf8", 12, 12 + headerLength)) as { vertexCount: number; bounds: { min: number[]; max: number[] } };
const positions = new Float32Array(bytes.buffer, bytes.byteOffset + 12 + headerLength, header.vertexCount * 3);

export function groundNear(x: number, z: number, searchRadius = radius): { highestM: number; lowestM: number; vertices: number } {
  let highest = Number.NEGATIVE_INFINITY;
  let lowest = Number.POSITIVE_INFINITY;
  let count = 0;
  const squared = searchRadius * searchRadius;
  for (let index = 0; index < header.vertexCount; index += 1) {
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

export const TERRAIN_BOUNDS = Object.freeze({ min: header.bounds.min.map(Number), max: header.bounds.max.map(Number) });

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(
    `terrain ${header.vertexCount} vertices, y ${header.bounds.min[1]} to ${header.bounds.max[1]} m\n`,
  );
  for (const point of points) {
    const ground = groundNear(point.x, point.z);
    if (ground.vertices === 0) {
      process.stdout.write(`  (${point.x}, ${point.z})  no terrain vertex within ${radius} m — outside the mesh\n`);
      continue;
    }
    process.stdout.write(
      `  (${point.x}, ${point.z})  ground ${ground.lowestM.toFixed(2)} to ${ground.highestM.toFixed(2)} m ` +
        `from ${ground.vertices} vertices within ${radius} m\n`,
    );
  }
}
