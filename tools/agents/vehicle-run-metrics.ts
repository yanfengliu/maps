/**
 * The geometry the vehicle-run measurement is computed with.
 *
 * This module is the measurement, and it is deliberately independent of the
 * simulation's own bookkeeping wherever the claim allows it. Lane keeping and
 * position continuity are re-derived from the published pose buffers and the
 * delivered lane polylines: the module never asks the population where it thought
 * a body was, and it never reuses the population's own spatial index. A
 * measurement built from the same symbol as the thing it measures proves only
 * that the code agrees with itself.
 *
 * Where the claim is about the plan rather than the pose — whether a route turns,
 * and whether a body entered through a portal and left through the boundary
 * envelope — the plan is the right source and is named as such. Those readings
 * are labelled `route` rather than `pose` in the report so a reader can see which
 * half of the run each number came from.
 *
 * Bound: one delivered network, one delivered fleet manifest, one tick window at
 * one seed. It measures positions, headings and lane geometry; it cannot see what
 * a frame looks like, and it says nothing about pedestrian behaviour.
 */

import type { WorldPoint } from "../../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";

/** The projection of a world point onto a lane polyline. */
export interface PolylineProjection {
  /** Perpendicular distance to the polyline, metres. */
  readonly distanceM: number;
  /** Arc distance along the polyline of the closest point, metres. */
  readonly alongM: number;
  /** Total polyline length, metres. */
  readonly lengthM: number;
  /** True when the closest point is the polyline's first or last vertex. */
  readonly atEnd: boolean;
}

/**
 * Project a point onto a polyline, returning the perpendicular distance as well
 * as the arc distance.
 *
 * Both numbers are returned because they answer different questions and the
 * difference is not visible from either alone: a small perpendicular distance at
 * an arc distance past the polyline's own end is a body that has left the lane,
 * which a bare nearest-distance measurement reports as lane keeping.
 */
export function projectOnPolyline(points: readonly WorldPoint[], x: number, z: number): PolylineProjection {
  const first = points[0]!;
  let best = { distanceM: Number.POSITIVE_INFINITY, alongM: 0, atEnd: true };
  let travelled = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared)) : 0;
    const distanceM = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
    if (distanceM < best.distanceM) best = { distanceM, alongM: travelled + t * length, atEnd: t === 0 || t === 1 };
    travelled += length;
  }
  if (!Number.isFinite(best.distanceM)) return { distanceM: Math.hypot(x - first.x, z - first.z), alongM: 0, lengthM: 0, atEnd: true };
  return { distanceM: best.distanceM, alongM: best.alongM, lengthM: travelled, atEnd: best.atEnd };
}

/** A shortest-path reading over a list of samples, in the shape the repo's other gates print. */
export function describe(values: readonly number[]): { count: number; minimum: number; p50: number; p95: number; p99: number; maximum: number } {
  if (!values.length) return { count: 0, minimum: 0, p50: 0, p95: 0, p99: 0, maximum: 0 };
  const sorted = [...values].sort((left, right) => left - right);
  const at = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]!;
  return {
    count: sorted.length,
    minimum: finite(sorted[0]!),
    p50: finite(sorted[Math.floor(sorted.length / 2)]!),
    p95: finite(at(0.95)),
    p99: finite(at(0.99)),
    maximum: finite(sorted.at(-1)!),
  };
}

function finite(value: number): number {
  return Number(value.toFixed(4));
}

/** One active body's collision envelope half extents at its drawn scale. */
export function halfExtents(fleet: VehicleAssetManifest, variant: number, scale: number): { halfWidthM: number; halfLengthM: number } {
  const asset = fleet.vehicles[variant];
  if (!asset) throw new Error(`Vehicle class index ${variant} is not in the delivered ${fleet.vehicles.length}-class fleet; the pose buffers and the manifest disagree.`);
  return { halfWidthM: (asset.collision.width * scale) / 2, halfLengthM: (asset.collision.length * scale) / 2 };
}

/**
 * Whether the body's drawn envelope crosses the edge of the lane it is on.
 *
 * A body whose lateral offset from its lane's centreline plus its own half width
 * exceeds the lane's half width has part of its collision envelope drawn outside
 * its lane. Positive means the envelope crosses the edge by that many metres.
 *
 * The bus is the reason this is a floor rather than a zero: at 3.280 m wide
 * against 2.5 m and 3.0 m lanes, a drawn bus crosses its lane edge by 0.39 m
 * whichever lane it is in and whatever lateral offset it holds. That is a
 * recorded structural limit of the delivered fleet, not a defect this gate
 * repairs, and the gate asserts the measured floor rather than a zero it cannot
 * honestly reach.
 */
export function envelopeBeyondLaneEdgeM(offsetFromCentrelineM: number, halfWidthM: number, laneWidthM: number): number {
  return offsetFromCentrelineM + halfWidthM - laneWidthM / 2;
}

/**
 * The lane the drawn body is nearest, by perpendicular distance to the lane's own
 * polyline.
 *
 * Chosen from geometry rather than from the route, so lane keeping can be checked
 * against the lane the body is actually over. Ties are broken by the lower index
 * so the function is deterministic; the caller is expected to say when the
 * nearest and second-nearest candidates are close enough that the assignment is
 * ambiguous.
 */
export function nearestLane<T extends { readonly id: string; readonly points: readonly WorldPoint[] }>(
  lanes: readonly T[],
  x: number,
  z: number,
): { lane: T; projection: PolylineProjection; runnerUpDistanceM: number } | null {
  let best: T | null = null;
  let bestProjection: PolylineProjection | null = null;
  let runnerUp = Number.POSITIVE_INFINITY;
  for (const lane of lanes) {
    const projection = projectOnPolyline(lane.points, x, z);
    if (bestProjection === null || projection.distanceM < bestProjection.distanceM) {
      if (bestProjection !== null) runnerUp = bestProjection.distanceM;
      best = lane;
      bestProjection = projection;
    } else if (projection.distanceM < runnerUp) {
      runnerUp = projection.distanceM;
    }
  }
  return best && bestProjection ? { lane: best, projection: bestProjection, runnerUpDistanceM: runnerUp } : null;
}
