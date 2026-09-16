/**
 * harness: the geometry the two spacing measurements are computed with.
 *
 * This module is the measurement, and it is deliberately independent of the
 * simulation's own bookkeeping. It reads only the published pose buffers and the
 * delivered collision envelopes, and it re-derives separation from those bytes:
 * it never asks the car-following law what it thought the gap was, and it never
 * reuses the spatial hash the crowd is built on. A measurement built from the
 * same symbol as the thing it measures proves only that the code agrees with
 * itself, which is how the defect these tools exist for stayed invisible.
 *
 * Bound: the pose buffers as published at one tick, one delivered fleet manifest,
 * one delivered network. It measures interpenetration and spacing; it cannot see
 * whether a body is where its route says it should be, and it says nothing about
 * what a frame looks like.
 *
 * The body frames are the ones the population places poses with:
 * `placeSlot` writes a heading whose forward axis is `(sin h, cos h)` and whose
 * right axis is `(cos h, -sin h)`, which is the convention `sampleRoute`'s
 * `headingAt` produces and the one `placeVehicle` offsets lanes along.
 */

import type { WorldAgentPoses } from "../../src/world/agent-poses.ts";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";

/**
 * The loader's own resolution of a specifier relative to this file, or null when
 * the runtime does not expose one.
 *
 * Both tools print this, because a worktree whose `data` and `node_modules` are
 * junctions can load `../../src/...` from the checkout beside it or from the
 * primary checkout, and the two are indistinguishable from a run's own output.
 * A measurement that does not say which tree it loaded cannot be compared with
 * another measurement.
 */
export function importMetaResolve(specifier: string): string | null {
  const resolveSpecifier = (import.meta as { resolve?: (specifier: string) => string }).resolve;
  if (!resolveSpecifier) return null;
  try {
    return resolveSpecifier(specifier);
  } catch {
    return null;
  }
}

/** One body's collision envelope, projected into the world frame at its pose. */
export interface BodyBox {
  readonly slot: number;
  readonly label: string;
  readonly x: number;
  readonly z: number;
  readonly forwardX: number;
  readonly forwardZ: number;
  readonly rightX: number;
  readonly rightZ: number;
  readonly halfLengthM: number;
  readonly halfWidthM: number;
}

export interface OverlappingPair {
  readonly a: number;
  readonly b: number;
  readonly labelA: string;
  readonly labelB: string;
  /** Smallest translation that separates the two envelopes, metres. */
  readonly penetrationM: number;
  /** Overlap along A's own forward axis, metres. Negative means no longitudinal overlap. */
  readonly longitudinalOverlapM: number;
  /** Overlap along A's own right axis, metres. Negative means no lateral overlap. */
  readonly lateralOverlapM: number;
  readonly centreDistanceM: number;
  /** Origin-to-origin distance along A's forward axis, metres. */
  readonly originGapM: number;
  /** Difference between the two headings, degrees in [0, 180]. */
  readonly headingDeltaDegrees: number;
}

/**
 * Whether an overlapping pair is a car-following conflict or a head-on one.
 *
 * The split matters because the two are different claims. A same-direction pair
 * that interpenetrates is the car-following law failing at its own job: two
 * bodies in one lane, one behind the other, closer than their envelopes allow. A
 * head-on pair is not a following relation at all — no rule about leaders can
 * order two bodies driving into each other — and on this network it is produced by
 * lane geometry that folds back on its own centreline (see the report's
 * network section).
 */
export function sameDirection(pair: OverlappingPair): boolean {
  return pair.headingDeltaDegrees <= 90;
}

export interface FollowingPair {
  readonly follower: number;
  readonly leader: number;
  /** Free distance between the follower's front face and the leader's rear face, metres. */
  readonly clearanceM: number;
  /** The same pair measured centre to centre along the follower's heading, metres. */
  readonly originGapM: number;
  readonly lateralM: number;
  /** Difference between the two headings, degrees in [0, 180]. */
  readonly headingDeltaDegrees: number;
}

/** The world-frame boxes of every active vehicle, from the published pose buffers. */
export function vehicleBoxes(fleet: VehicleAssetManifest, poses: WorldAgentPoses): BodyBox[] {
  const buffers = poses.vehicles;
  const boxes: BodyBox[] = [];
  for (let slot = 0; slot < buffers.count; slot += 1) {
    if (!buffers.active[slot]) continue;
    const variant = buffers.variant[slot]!;
    const asset = fleet.vehicles[variant];
    if (!asset) throw new Error(`Vehicle slot ${slot} carries class index ${variant}; the delivered fleet has ${fleet.vehicles.length} classes.`);
    const scale = buffers.scale[slot]!;
    boxes.push(box(slot, `${asset.id}#${slot}`, buffers.current.position[slot * 3]!, buffers.current.position[slot * 3 + 2]!, buffers.current.yaw[slot]!, (asset.collision.length * scale) / 2, (asset.collision.width * scale) / 2));
  }
  return boxes;
}

/** A body frame from a published pose. Pedestrians are squares: one radius, two axes. */
export function bodyBox(slot: number, label: string, x: number, z: number, yaw: number, lengthM: number, widthM: number): BodyBox {
  return box(slot, label, x, z, yaw, lengthM / 2, widthM / 2);
}

function box(slot: number, label: string, x: number, z: number, yaw: number, halfLengthM: number, halfWidthM: number): BodyBox {
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);
  return { slot, label, x, z, forwardX, forwardZ, rightX: forwardZ, rightZ: -forwardX, halfLengthM, halfWidthM };
}

function extentAlong(a: BodyBox, ax: number, az: number): number {
  return Math.abs(ax * a.forwardX + az * a.forwardZ) * a.halfLengthM + Math.abs(ax * a.rightX + az * a.rightZ) * a.halfWidthM;
}

function projection(a: BodyBox, b: BodyBox, ax: number, az: number): number {
  return (b.x - a.x) * ax + (b.z - a.z) * az;
}

/**
 * Separating-axis overlap of two oriented rectangles.
 *
 * The axes are each box's own forward and right axis, which is exact for two
 * rectangles. The reported penetration is the smallest push that separates them,
 * and the pair is reported with the longitudinal and lateral overlap read in A's
 * own frame, because "how deep" and "how deep along the queue" are different
 * numbers and the defect this measures is longitudinal.
 */
export function boxOverlap(a: BodyBox, b: BodyBox): OverlappingPair | null {
  const axes: readonly (readonly [number, number])[] = [
    [a.forwardX, a.forwardZ], [a.rightX, a.rightZ], [b.forwardX, b.forwardZ], [b.rightX, b.rightZ],
  ];
  let penetration = Number.POSITIVE_INFINITY;
  for (const [ax, az] of axes) {
    const overlap = extentAlong(a, ax, az) + extentAlong(b, ax, az) - Math.abs(projection(a, b, ax, az));
    if (overlap <= 0) return null;
    if (overlap < penetration) penetration = overlap;
  }
  const along = projection(a, b, a.forwardX, a.forwardZ);
  const across = projection(a, b, a.rightX, a.rightZ);
  const headingDelta = Math.abs(Math.atan2(a.forwardX * b.forwardZ - a.forwardZ * b.forwardX, a.forwardX * b.forwardX + a.forwardZ * b.forwardZ)) * (180 / Math.PI);
  return {
    a: a.slot,
    b: b.slot,
    labelA: a.label,
    labelB: b.label,
    penetrationM: penetration,
    longitudinalOverlapM: a.halfLengthM + b.halfLengthM - Math.abs(along),
    lateralOverlapM: a.halfWidthM + b.halfWidthM - Math.abs(across),
    centreDistanceM: Math.hypot(b.x - a.x, b.z - a.z),
    originGapM: along,
    headingDeltaDegrees: headingDelta,
  };
}

/** Every overlapping pair among `boxes`, deepest first. */
export function overlappingPairs(boxes: readonly BodyBox[]): OverlappingPair[] {
  const pairs: OverlappingPair[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const overlap = boxOverlap(boxes[i]!, boxes[j]!);
      if (overlap) pairs.push(overlap);
    }
  }
  return pairs.sort((left, right) => right.penetrationM - left.penetrationM);
}

/**
 * Whether two bodies share a lane, read symmetrically: they conflict in
 * car-following terms when their envelopes overlap laterally in *either* body's
 * own frame. A body beside you in the next lane fails both tests and is not a
 * leader; a body crossing in front of you passes yours and is one.
 */
export function laterallyConflicting(a: BodyBox, b: BodyBox): boolean {
  const acrossA = Math.abs(projection(a, b, a.rightX, a.rightZ));
  const acrossB = Math.abs(projection(b, a, b.rightX, b.rightZ));
  return Math.min(acrossA - (a.halfWidthM + b.halfWidthM), acrossB - (a.halfWidthM + b.halfWidthM)) < 0;
}

/**
 * The nearest body ahead of each body, in its own lane, with the free distance
 * between their envelopes. This is the spacing distribution's unit of
 * measurement: one entry per body that has something in front of it.
 *
 * Only same-direction bodies count. A body driving toward this one is inside its
 * forward cone and would otherwise be measured as the thing it is following,
 * which reports the network's folded-lane geometry as though it were a queue
 * spacing: the run's minimum "following clearance" is negative for exactly the
 * pairs whose headings are 180 degrees apart.
 */
export function followingPairs(boxes: readonly BodyBox[]): FollowingPair[] {
  const pairs: FollowingPair[] = [];
  for (const follower of boxes) {
    let best: FollowingPair | null = null;
    for (const leader of boxes) {
      if (leader.slot === follower.slot) continue;
      if (follower.forwardX * leader.forwardX + follower.forwardZ * leader.forwardZ <= 0) continue;
      const along = projection(follower, leader, follower.forwardX, follower.forwardZ);
      if (along <= 0) continue;
      const across = projection(follower, leader, follower.rightX, follower.rightZ);
      // The leader must be in this body's own lane, measured in this body's own
      // frame. The symmetric either-frame test used for overlap classification
      // admits a body 18 m to the side crossing at 87 degrees, which is a junction
      // crossing and not a spacing at all — measured, it was what made the run's
      // minimum "following clearance" read -3.59 m while every same-direction
      // overlap was zero.
      if (Math.abs(across) >= follower.halfWidthM + leader.halfWidthM) continue;
      const clearanceM = along - follower.halfLengthM - leader.halfLengthM;
      const headingDelta = Math.abs(Math.atan2(follower.forwardX * leader.forwardZ - follower.forwardZ * leader.forwardX, follower.forwardX * leader.forwardX + follower.forwardZ * leader.forwardZ)) * (180 / Math.PI);
      if (!best || clearanceM < best.clearanceM) best = { follower: follower.slot, leader: leader.slot, clearanceM, originGapM: along, lateralM: across, headingDeltaDegrees: headingDelta };
    }
    if (best) pairs.push(best);
  }
  return pairs;
}

export interface PedestrianPositions {
  readonly count: number;
  readonly x: Float64Array;
  readonly z: Float64Array;
  readonly yaw: Float64Array;
  readonly radiusM: Float64Array;
  readonly slot: Int32Array;
}

/** The active pedestrians' positions and authored radii, from the published pose buffers. */
export function pedestrianPositions(poses: WorldAgentPoses, radiusM: number): PedestrianPositions {
  const buffers = poses.pedestrians;
  const x = new Float64Array(buffers.count);
  const z = new Float64Array(buffers.count);
  const yaw = new Float64Array(buffers.count);
  const radius = new Float64Array(buffers.count);
  const slot = new Int32Array(buffers.count);
  let count = 0;
  for (let index = 0; index < buffers.count; index += 1) {
    if (!buffers.active[index]) continue;
    x[count] = buffers.current.position[index * 3]!;
    z[count] = buffers.current.position[index * 3 + 2]!;
    yaw[count] = buffers.current.yaw[index]!;
    radius[count] = radiusM * buffers.scale[index]!;
    slot[count] = index;
    count += 1;
  }
  return { count, x: x.subarray(0, count), z: z.subarray(0, count), yaw: yaw.subarray(0, count), radiusM: radius.subarray(0, count), slot: slot.subarray(0, count) };
}

/**
 * A uniform grid over world XZ, built here rather than reused from the
 * population. The population's own structure is one of the things a measurement
 * like this must not depend on: if its query were wrong in the same way twice,
 * a measurement built on it would agree with the defect.
 */
export class MeasurementGrid {
  private readonly cellSizeM: number;
  private readonly cells = new Map<number, number[]>();

  constructor(cellSizeM: number) {
    this.cellSizeM = cellSizeM;
  }

  private static key(column: number, row: number): number {
    return (row + 0x4000) * 0x10000 + (column + 0x4000);
  }

  rebuild(points: readonly { x: number; z: number }[]): void {
    this.cells.clear();
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]!;
      const key = MeasurementGrid.key(Math.floor(point.x / this.cellSizeM), Math.floor(point.z / this.cellSizeM));
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(index);
      else this.cells.set(key, [index]);
    }
  }

  /** Indices within `radius` of (x, z), in slot order. */
  near(points: readonly { x: number; z: number }[], x: number, z: number, radius: number, out: number[]): number {
    out.length = 0;
    const radiusSquared = radius * radius;
    const firstColumn = Math.floor((x - radius) / this.cellSizeM);
    const lastColumn = Math.floor((x + radius) / this.cellSizeM);
    const firstRow = Math.floor((z - radius) / this.cellSizeM);
    const lastRow = Math.floor((z + radius) / this.cellSizeM);
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      for (let row = firstRow; row <= lastRow; row += 1) {
        for (const index of this.cells.get(MeasurementGrid.key(column, row)) ?? []) {
          const dx = points[index]!.x - x;
          const dz = points[index]!.z - z;
          if (dx * dx + dz * dz <= radiusSquared) out.push(index);
        }
      }
    }
    out.sort((left, right) => left - right);
    return out.length;
  }
}

export interface PedestrianPair { readonly a: number; readonly b: number; readonly penetrationM: number; readonly distanceM: number; readonly headingDeltaDegrees: number }

export interface NeighbourDistribution {
  readonly radiusM: number;
  readonly mean: number;
  readonly median: number;
  readonly p95: number;
  readonly maximum: number;
  /** Bodies with at least `cap` neighbours inside the radius. */
  readonly atOrAboveCap: number;
  readonly cap: number;
}

export interface PedestrianOverlapReport {
  readonly active: number;
  /** Pairs whose collision circles interpenetrate, one entry per pair. */
  readonly overlappingPairs: readonly PedestrianPair[];
  readonly deepest: PedestrianPair | null;
  /** Bodies inside at least one other body's collision circle. */
  readonly overlappingBodies: number;
  /** Distance from the world origin, over every active body: how the crowd is spread. */
  readonly originDistance: { readonly count: number; readonly minimum: number; readonly p05: number; readonly median: number; readonly p95: number; readonly maximum: number };
  readonly within200m: number;
  /** Crowding at the density radius, and the count against ORCA's own query and cap. */
  readonly density: NeighbourDistribution;
  readonly orcaNeighbourhood: NeighbourDistribution;
}

export interface PedestrianReportOptions {
  readonly densityRadiusM: number;
  readonly orcaRadiusM: number;
  readonly orcaCap: number;
}

/**
 * Overlap and crowding, measured on the authored collision radius — the same
 * radius ORCA and the admission footprint share, so "overlapping" here means
 * exactly "closer than the two bodies' own collision envelopes allow".
 *
 * The neighbour counts are true counts within the radius and not the capped
 * eight ORCA sees, because the number that matters is how far past the cap the
 * crowd is: a solver that can see eight of the sixty-five bodies it is standing
 * among is not solving the crowd it is in.
 */
export function pedestrianOverlapReport(positions: PedestrianPositions, options: PedestrianReportOptions): PedestrianOverlapReport {
  const points: { x: number; z: number }[] = [];
  for (let index = 0; index < positions.count; index += 1) points.push({ x: positions.x[index]!, z: positions.z[index]! });
  const grid = new MeasurementGrid(2);
  grid.rebuild(points);
  const pairs: PedestrianPair[] = [];
  const overlapping = new Uint8Array(positions.count);
  const densityCounts = new Int32Array(positions.count);
  const orcaCounts = new Int32Array(positions.count);
  const originDistances: number[] = [];
  let within200m = 0;
  const candidates: number[] = [];
  const reach = Math.max(options.densityRadiusM, options.orcaRadiusM) + 0.5;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.x[index]!;
    const z = positions.z[index]!;
    const radius = positions.radiusM[index]!;
    const originDistance = Math.hypot(x, z);
    originDistances.push(originDistance);
    if (originDistance <= 200) within200m += 1;
    grid.near(points, x, z, reach, candidates);
    for (const other of candidates) {
      if (other === index) continue;
      const distance = Math.hypot(positions.x[other]! - x, positions.z[other]! - z);
      if (other > index) {
        if (distance <= options.densityRadiusM) {
          densityCounts[index] = densityCounts[index]! + 1;
          densityCounts[other] = densityCounts[other]! + 1;
        }
        if (distance <= options.orcaRadiusM) {
          orcaCounts[index] = orcaCounts[index]! + 1;
          orcaCounts[other] = orcaCounts[other]! + 1;
        }
        const contact = radius + positions.radiusM[other]!;
        if (distance < contact) {
          const headingDelta = Math.abs(positions.yaw[index]! - positions.yaw[other]!);
          const wrapped = Math.min(headingDelta, 2 * Math.PI - headingDelta) * (180 / Math.PI);
          pairs.push({ a: positions.slot[index]!, b: positions.slot[other]!, penetrationM: contact - distance, distanceM: distance, headingDeltaDegrees: wrapped });
          overlapping[index] = 1;
          overlapping[other] = 1;
        }
      }
    }
  }
  const sorted = [...pairs].sort((left, right) => right.penetrationM - left.penetrationM);
  const neighbours = (counts: Int32Array, radiusM: number): NeighbourDistribution => {
    const values = [...counts].sort((left, right) => left - right);
    const total = counts.reduce((sum, value) => sum + value, 0);
    return {
      radiusM,
      mean: positions.count ? total / positions.count : 0,
      median: values[Math.floor(values.length / 2)] ?? 0,
      p95: values[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)] ?? 0,
      maximum: values.at(-1) ?? 0,
      atOrAboveCap: counts.reduce((sum, value) => sum + (value >= options.orcaCap ? 1 : 0), 0),
      cap: options.orcaCap,
    };
  };
  return {
    active: positions.count,
    overlappingPairs: sorted,
    deepest: sorted[0] ?? null,
    overlappingBodies: overlapping.reduce((sum, value) => sum + value, 0),
    originDistance: distribution(originDistances),
    within200m,
    density: neighbours(densityCounts, options.densityRadiusM),
    orcaNeighbourhood: neighbours(orcaCounts, options.orcaRadiusM),
  };
}

export function distribution(samples: readonly number[]): { count: number; minimum: number; p05: number; median: number; p95: number; maximum: number } {
  if (!samples.length) return { count: 0, minimum: 0, p05: 0, median: 0, p95: 0, maximum: 0 };
  const sorted = [...samples].sort((left, right) => left - right);
  const at = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]!;
  return { count: sorted.length, minimum: sorted[0]!, p05: at(0.05), median: sorted[Math.floor(sorted.length / 2)]!, p95: at(0.95), maximum: sorted.at(-1)! };
}
