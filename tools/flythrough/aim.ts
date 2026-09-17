/**
 * Aim the flythrough's street legs at the population, from measurements.
 *
 * This tool exists because aiming a camera at a crowd by counting bodies is how
 * an earlier flythrough photographed an empty street: the population stacks
 * several bodies on one position, so a camera sees *positions* and a probe that
 * counts bodies measures something the frame cannot show. This scores candidate
 * poses by the number of distinct positions in frame and by how many of those are
 * moving, and reports the vehicles in the same frustum.
 *
 * It also has to know where a camera *can* stand, which is two constraints no
 * free search would find:
 *
 * - the controls' target height is fixed at the crossing's ground level, so only
 *   the angle the camera looks at a target can be chosen, and a camera standing
 *   beside a target 20 m above it is looking up a hillside;
 * - the frame's centre is the target, so the subject has to be at the target.
 *
 * So a candidate is `(camera on a walking way within reach, azimuth, distance)`
 * where the camera looks down at the knot from 3 m above the ground, which is the
 * pose `FlythroughDriver.standAt` can stand the camera in.
 *
 *   node tools/flythrough/aim.ts --dump artifacts/flythrough2/reference-dump-t5400.json
 *
 * Reference dumps are the populated lane's own probe output, kept as a measurement
 * of the population rather than as evidence about a frame. Re-measure from a live
 * probe when the population changes:
 *
 *   node tools/populated/probe.ts --ticks 5400 --dump-tick 5400 --dump-file <path>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FOV_Y_DEG = 55;
const ASPECT = 1280 / 720;

/** The generator's own field of view, from `src/render/camera.ts`: 55 degrees vertical. */
const HALF_Y = (FOV_Y_DEG * Math.PI) / 360;
const HALF_X = Math.atan(Math.tan(HALF_Y) * ASPECT);

/** The height a street leg stands at, metres above the terrain under the camera. */
const STAND_M = 3;

/** The controls' target height, `GROUND_AT_ORIGIN_M` in `src/world/scene-data.ts`. */
const TARGET_Y_M = 15.2;

interface Dump {
  tick: number;
  pedestrians: number[][];
  vehicles: number[][];
}

function argument(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

const ROOT = resolve(import.meta.dirname, "..", "..");
const dumpFiles = process.argv
  .map((value, index) => (process.argv[index - 1] === "--dump" ? value : null))
  .filter((value): value is string => value !== null);
if (dumpFiles.length === 0) {
  throw new Error(
    "aim.ts needs at least one position dump: --dump <path>. The dump is the populated lane's probe output " +
      "(`node tools/populated/probe.ts --ticks 5400 --dump-tick 5400 --dump-file <path>`); without it this tool has " +
      "no population to aim at and would produce a plausible-looking pose aimed at nothing.",
  );
}
const out = argument("out", resolve(import.meta.dirname, "aim.json"));

function loadTerrain(): { positions: Float32Array; vertexCount: number } {
  const bytes = readFileSync(resolve(ROOT, "data/scene/terrain.mesh"));
  const magic = bytes.toString("ascii", 0, 8);
  if (magic !== "MAPSMSH1") {
    throw new Error(
      `data/scene/terrain.mesh starts with "${magic}" rather than MAPSMSH1, so no pose can be checked against the ` +
        "ground it stands over. Run `npm run data:scene`.",
    );
  }
  const headerLength = bytes.readUInt32LE(8);
  const header = JSON.parse(bytes.toString("utf8", 12, 12 + headerLength)) as { vertexCount: number };
  return {
    positions: new Float32Array(bytes.buffer, bytes.byteOffset + 12 + headerLength, header.vertexCount * 3),
    vertexCount: header.vertexCount,
  };
}

const { positions: terrain, vertexCount: terrainCount } = loadTerrain();

/**
 * The highest terrain within 20 m of a point.
 *
 * Five cells of an 8 m grid, because the camera's own clearance is measured this
 * way in the driver and a pose chosen against a lower figure than the driver will
 * accept is a pose the lane would refuse.
 */
const CELL_M = 8;
const groundGrid = new Map<string, number>();
for (let index = 0; index < terrainCount; index += 1) {
  const key = `${Math.floor(terrain[index * 3]! / CELL_M)}:${Math.floor(terrain[index * 3 + 2]! / CELL_M)}`;
  const y = terrain[index * 3 + 1]!;
  const held = groundGrid.get(key);
  if (held === undefined || y > held) groundGrid.set(key, y);
}

function ground(x: number, z: number): number {
  const cx = Math.floor(x / CELL_M);
  const cz = Math.floor(z / CELL_M);
  let highest = Number.NaN;
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dz = -2; dz <= 2; dz += 1) {
      const y = groundGrid.get(`${cx + dx}:${cz + dz}`);
      if (y === undefined) continue;
      if (Number.isNaN(highest) || y > highest) highest = y;
    }
  }
  return highest;
}

interface WayPoint {
  x: number;
  z: number;
  id: string;
}

function walkingWays(): WayPoint[] {
  const network = JSON.parse(readFileSync(resolve(ROOT, "data/network/network.json"), "utf8")) as {
    walks: { id: string; points: { x: number; z: number }[] }[];
  };
  const points: WayPoint[] = [];
  for (const walk of network.walks) {
    const step = Math.max(1, Math.floor(walk.points.length / 10));
    for (let index = 0; index < walk.points.length; index += step) {
      points.push({ x: walk.points[index]!.x, z: walk.points[index]!.z, id: walk.id });
    }
  }
  return points;
}

/** Distinct positions in a set of actor dumps, with the fastest speed seen at each. */
function distinct(actors: number[][]): { x: number; z: number; bodies: number; speed: number }[] {
  const seen = new Map<string, { bodies: number; speed: number }>();
  for (const actor of actors) {
    const key = `${actor[0]!.toFixed(2)}:${actor[2]!.toFixed(2)}`;
    const held = seen.get(key);
    if (held === undefined) seen.set(key, { bodies: 1, speed: Math.abs(actor[3] ?? 0) });
    else {
      held.bodies += 1;
      held.speed = Math.max(held.speed, Math.abs(actor[3] ?? 0));
    }
  }
  return [...seen.entries()].map(([key, held]) => {
    const [x, z] = key.split(":").map(Number) as [number, number];
    return { x, z, bodies: held.bodies, speed: held.speed };
  });
}

/** What a pose sees: distinct positions in frame, how many move, and the vehicles. */
function look(camera: { x: number; z: number }, azimuth: number, distance: number) {
  const forward = { x: Math.sin(azimuth), z: Math.cos(azimuth) };
  const right = { x: forward.z, z: -forward.x };
  const cameraY = ground(camera.x, camera.z) + STAND_M;
  const lateral = Math.tan(HALF_X);
  const vertical = Math.tan(HALF_Y);

  const inside = (list: { x: number; z: number }[], bodyHeightM: number): { x: number; z: number }[] => {
    const hit: { x: number; z: number }[] = [];
    for (const entry of list) {
      const dx = entry.x - camera.x;
      const dz = entry.z - camera.z;
      const depth = dx * forward.x + dz * forward.z;
      if (depth < 4 || depth > 220) continue;
      if (Math.abs(dx * right.x + dz * right.z) > depth * lateral) continue;
      const bodyY = TARGET_Y_M + bodyHeightM;
      const rayY = cameraY + ((TARGET_Y_M - cameraY) * depth) / distance;
      if (Math.abs(bodyY - rayY) > depth * vertical) continue;
      hit.push(entry);
    }
    return hit;
  };
  return { inside, cameraY };
}

const azimuths = Array.from({ length: 48 }, (_, index) => (index * Math.PI * 2) / 48);
const distances = [26, 32, 40, 52];

const report: Record<string, unknown> = {
  tool: "tools/flythrough/aim.ts",
  bound:
    "Aiming aid, not evidence. It scores candidate poses against an offline dump of the population's positions, " +
    "which is the same simulation the browser runs from the same seed and the same fixed step, and it says nothing " +
    "about what any frame looks like.",
  fovYDegrees: FOV_Y_DEG,
  standM: STAND_M,
  targetY: TARGET_Y_M,
  dumps: [],
};

const ways = walkingWays();

for (const file of dumpFiles) {
  const dump = JSON.parse(readFileSync(file, "utf8")) as Dump;
  const people = distinct(dump.pedestrians);
  const moving = people.filter((entry) => entry.speed > 0.2);
  const vehicles = distinct(dump.vehicles);

  // Candidate cameras: walking ways within 60 m of a knot of moving pedestrians.
  const knots = new Map<string, { n: number; x: number; z: number }>();
  for (const entry of moving) {
    const key = `${Math.floor(entry.x / 12)}:${Math.floor(entry.z / 12)}`;
    const held = knots.get(key) ?? { n: 0, x: 0, z: 0 };
    held.n += 1;
    held.x += entry.x;
    held.z += entry.z;
    knots.set(key, held);
  }
  const centres = [...knots.values()]
    .map((knot) => ({ n: knot.n, x: knot.x / knot.n, z: knot.z / knot.n }))
    .filter((knot) => knot.n >= 5)
    .sort((a, b) => b.n - a.n)
    .slice(0, 30);
  const cameras = ways.filter((way) => centres.some((centre) => Math.hypot(way.x - centre.x, way.z - centre.z) < 60));

  const results: {
    camera: { x: number; z: number };
    way: string;
    azimuth: number;
    distance: number;
    people: number;
    moving: number;
    vehicles: number;
    standM: number;
    target: { x: number; z: number };
  }[] = [];

  for (const camera of cameras) {
    const cameraY = ground(camera.x, camera.z) + STAND_M;
    if (Number.isNaN(cameraY)) continue;
    for (const distance of distances) {
      for (const azimuth of azimuths) {
        // The frame's centre is the controls' target, so the subject has to be at
        // it: the candidate is only real if a point 600 m up the hill is not what
        // the camera is aimed at.
        const target = { x: camera.x + Math.sin(azimuth) * distance, z: camera.z + Math.cos(azimuth) * distance };
        if (Number.isNaN(ground(target.x, target.z))) continue;
        const view = look(camera, azimuth, distance);
        const seen = view.inside(moving, 0.9);
        const cars = view.inside(vehicles, 0.8);
        results.push({
          camera: { x: camera.x, z: camera.z },
          way: camera.id,
          azimuth,
          distance,
          people: view.inside(people, 0.9).length,
          moving: seen.length,
          vehicles: cars.length,
          standM: STAND_M,
          target,
        });
      }
    }
  }

  const byCell = new Map<string, (typeof results)[number]>();
  for (const result of results) {
    const key = `${Math.round(result.camera.x / 10)}:${Math.round(result.camera.z / 10)}:${Math.round(result.azimuth * 6)}`;
    const held = byCell.get(key);
    const score = (entry: (typeof results)[number]): number => entry.moving + entry.vehicles * 4;
    if (held === undefined || score(result) > score(held)) byCell.set(key, result);
  }
  const ranked = [...byCell.values()].sort((a, b) => b.moving + b.vehicles * 4 - (a.moving + a.vehicles * 4));
  const crowded = [...byCell.values()].sort((a, b) => b.moving - a.moving).slice(0, 5);
  const traffic = [...byCell.values()].sort((a, b) => b.vehicles - a.vehicles || b.moving - a.moving).slice(0, 5);

  console.log(
    `\n== ${file} tick ${dump.tick}: ${dump.pedestrians.length} bodies at ${people.length} distinct positions ` +
      `(${moving.length} moving), ${dump.vehicles.length} vehicles at ${vehicles.length} positions`,
  );
  console.log(`   ${cameras.length} candidate camera positions on walking ways, ${results.length} poses scored`);
  for (const [label, list] of [
    ["best overall (moving + 4 x vehicles)", ranked.slice(0, 5)],
    ["most moving pedestrians in frame", crowded],
    ["most vehicles in frame", traffic],
  ] as const) {
    console.log(`-- ${label} --`);
    for (const entry of list) {
      console.log(
        `   camera (${entry.camera.x.toFixed(1)}, ${entry.camera.z.toFixed(1)}) ground ` +
          `${ground(entry.camera.x, entry.camera.z).toFixed(1)} m -> target (${entry.target.x.toFixed(0)}, ` +
          `${entry.target.z.toFixed(0)}) az ${((entry.azimuth * 180) / Math.PI).toFixed(0)} deg ` +
          `dist ${entry.distance} m: ${entry.moving} moving / ${entry.people} positions, ${entry.vehicles} vehicles ` +
          `[${entry.way}]`,
      );
    }
  }

  (report["dumps"] as unknown[]).push({
    file,
    tick: dump.tick,
    bodies: dump.pedestrians.length,
    distinctPositions: people.length,
    movingPositions: moving.length,
    vehicles: dump.vehicles.length,
    candidateCameras: cameras.length,
    bestOverall: ranked.slice(0, 8),
    mostMoving: crowded,
    mostVehicles: traffic,
  });
}

writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`\naim written to ${out}`);
