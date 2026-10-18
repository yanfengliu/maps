import type { MeshData } from "../world/mesh.js";
import { surfaceSampler } from "../world/surface-sampler.js";
import { CITY_CLIP_PLANES } from "./aoi-cutout.js";
import { Vector3 } from "three";

export interface TrainSource {
  chains: { id: number; points: { x: number; z: number }[] }[];
  recipe: { anchors: [number, number][]; gauge: number; railHeadAboveBed: number };
}
export const TRAIN_TRACK = 146060273;
export const TRAIN_RAIL_OFFSET = 0.5685;

/** Same original-node miters and section interpolation as the admitted static rails.
 * Height authority is the actual upward rail-head triangles, never terrain. */
export function createTrainPath(source: TrainSource, rails: MeshData) {
  const chain = source.chains.find(c => c.id === TRAIN_TRACK), recipe = source.recipe;
  if (!chain || chain.points.length < 2 || recipe.gauge !== 1.067 || recipe.railHeadAboveBed !== 0.33 || recipe.anchors.length < 2) throw Error(`Train track ${TRAIN_TRACK} needs the admitted 1067 mm rail source and authored bed recipe; restore the pinned rail packet.`);
  if (recipe.anchors.some(([z, y], i) => !Number.isFinite(z) || !Number.isFinite(y) || (i > 0 && z <= recipe.anchors[i - 1]![0]))) throw Error(`Train track ${TRAIN_TRACK} needs finite, increasing bed anchors; restore authored-recipe.json.`);
  const points = chain.points, stations = [0];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (![p.x, p.z].every(Number.isFinite) || (i && p.z <= points[i - 1]!.z)) throw Error(`Train track ${TRAIN_TRACK} source node ${i} needs finite X/Z and increasing Z; restore source-centrelines.json.`);
    if (i) stations.push(stations[i - 1]! + Math.hypot(p.x - points[i - 1]!.x, p.z - points[i - 1]!.z));
  }
  const normal = (i: number): [number, number] => {
    const p = points[i]!, a = points[Math.max(0, i - 1)]!, b = points[Math.min(points.length - 1, i + 1)]!;
    const unit = (a: typeof p, b: typeof p): [number, number] => { const length = Math.hypot(b.x - a.x, b.z - a.z); return [(b.z - a.z) / length, (a.x - b.x) / length]; };
    if (i === 0) return unit(p, b);
    if (i === points.length - 1) return unit(a, p);
    const u = unit(a, p), v = unit(p, b), d = 1 + u[0] * v[0] + u[1] * v[1];
    return [(u[0] + v[0]) / d, (u[1] + v[1]) / d];
  };
  const normals = points.map((_, i) => normal(i));
  const topIndices: number[] = [], p = rails.positions;
  for (let i = 0; i < rails.indices.length; i += 3) {
    const a = rails.indices[i]! * 3, b = rails.indices[i + 1]! * 3, c = rails.indices[i + 2]! * 3;
    const ny = (p[b + 2]! - p[a + 2]!) * (p[c]! - p[a]!) - (p[b]! - p[a]!) * (p[c + 2]! - p[a + 2]!);
    if (ny > 1e-10) topIndices.push(rails.indices[i]!, rails.indices[i + 1]!, rails.indices[i + 2]!);
  }
  const heightAt = surfaceSampler({ ...rails, indices: new Uint32Array(topIndices) }, true);
  const bed = (z: number): number => {
    for (let i = 1; i < recipe.anchors.length; i++) { const [a, ya] = recipe.anchors[i - 1]!, [b, yb] = recipe.anchors[i]!; if (z <= b) { const t = Math.max(0, (z - a) / (b - a)); return ya + (yb - ya) * t * t * (3 - 2 * t); } }
    return recipe.anchors.at(-1)![1];
  };
  const sample = (station: number, lateral = 0) => {
    const i = stations.findIndex((s, i) => i > 0 && station <= s);
    if (!Number.isFinite(station) || !Number.isFinite(lateral) || i < 1 || station < 0) throw Error(`Train track ${TRAIN_TRACK} station ${station} exceeds source interval 0..${stations.at(-1)}; shorten the authored service.`);
    const a = points[i - 1]!, b = points[i]!, t = (station - stations[i - 1]!) / (stations[i]! - stations[i - 1]!);
    const nx = normals[i - 1]![0] + (normals[i]![0] - normals[i - 1]![0]) * t, nz = normals[i - 1]![1] + (normals[i]![1] - normals[i - 1]![1]) * t;
    const z = a.z + (b.z - a.z) * t;
    return { x: a.x + (b.x - a.x) * t + nx * lateral, z: z + nz * lateral, y: bed(z) + recipe.railHeadAboveBed, nx, nz };
  };
  const stationAtZ = (z: number): number => { const i = points.findIndex((p, i) => i > 0 && z <= p.z); if (i < 1 || z < points[0]!.z) throw Error(`Train track ${TRAIN_TRACK} has no source segment at Z${z}.`); return stations[i - 1]! + (stations[i]! - stations[i - 1]!) * (z - points[i - 1]!.z) / (points[i]!.z - points[i - 1]!.z); };
  const head = (station: number, side: -1 | 1) => {
    const point = sample(station, side * TRAIN_RAIL_OFFSET), inside = CITY_CLIP_PLANES.every(plane => plane.distanceToPoint(new Vector3(point.x, point.y, point.z)) >= 0);
    const actual = inside ? heightAt(point.x, point.z) : undefined;
    if (inside && (actual === undefined || Math.abs(actual - point.y) > 0.001)) throw Error(`Train track ${TRAIN_TRACK} wheel at station ${station}, side ${side}, X${point.x}, Z${point.z} has no matching admitted rail head (expected Y${point.y}, actual ${actual}); restore the pinned rails.mesh and source recipe.`);
    return { ...point, y: actual ?? point.y, supported: inside, outside: !inside };
  };
  return { sample, head, stationAtZ, track: TRAIN_TRACK };
}
