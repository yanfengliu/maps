/** Current-body clearance only: conservative upright vehicle envelopes, not predicted trajectories. */
import { vehicleEnvelope } from "../../network/footprints.ts";
import { sampleEdge } from "../../network/geometry.ts";
import type { RoutePassage } from "../../network/passages.ts";
import type { VehicleAssetManifest } from "../../world/agent-assets.ts";
import type { WorldPoint } from "../../world/network-data.ts";
import type { PlannedRoute } from "./routes.ts";
import type { SlotTable } from "./slots.ts";

/** Include the generated collision centre's offset from the published origin. */
export function vehicleOriginRadius(fleet: VehicleAssetManifest, table: SlotTable, slot: number): number {
  const state = table.vehicles[slot]!;
  const envelope = vehicleEnvelope(fleet.vehicles[state.variant]!, state.scale);
  return envelope.diameter / 2 + Math.hypot(envelope.centre.x, envelope.centre.z);
}

// Four float32 relative-error units cover both X/Z coordinates and rounded scale.
function publicationMargin(x: number, z: number, radius: number): number {
  return (Math.max(1, Math.abs(x), Math.abs(z)) + radius) * 2 ** -22;
}

/** Active and pending bodies occupy the entrance with their own generated sizes. */
export function hasVehicleEntrySpace(table: SlotTable, fleet: VehicleAssetManifest, self: number, pending: ReadonlySet<number>, stopGapM: number, captureM: number): boolean {
  const positions = table.poses.vehicles.current.position;
  const x = positions[self * 3]!, z = positions[self * 3 + 2]!;
  const radius = vehicleOriginRadius(fleet, table, self);
  for (const state of table.vehicles) {
    const other = state.slot;
    if (other === self || (!table.poses.vehicles.active[other] && !pending.has(other))) continue;
    const ox = positions[other * 3]!, oz = positions[other * 3 + 2]!;
    const otherRadius = vehicleOriginRadius(fleet, table, other);
    const gap = radius + otherRadius + stopGapM + captureM + publicationMargin(x, z, radius) + publicationMargin(ox, oz, otherRadius);
    if (Math.abs(ox - x) >= gap || Math.abs(oz - z) >= gap) continue;
    if (Math.hypot(ox - x, oz - z) < gap) return false;
  }
  return true;
}

/**
 * Before a new passage grant, reserve its physical sweep and receiving section.
 * A disk about every source-polyline segment contains the entire generated body
 * at every heading, including headingAt's +/-0.2 m probes and sharp yaw changes.
 * Lateral placement is contained by expanding each segment by its actual lane
 * offset. All source vertices are retained; this is not an endpoint pose check.
 *
 * It measures present active/pending bodies on every edge. It does not predict
 * their later motion, alter authority ownership, or stop a committed actor.
 * Work is bounded by the route's source segments times the finite slot count;
 * a segment AABB rejects distant bodies before the distance calculation.
 */
export function hasVehiclePassageSpace(table: SlotTable, fleet: VehicleAssetManifest, route: PlannedRoute, passage: RoutePassage, travelledM: number, self: number, pending: ReadonlySet<number>, stopGapM: number): boolean {
  const radius = vehicleOriginRadius(fleet, table, self);
  const last = Math.max(0, passage.lastConflictIndex);
  const after = passage.lastConflictIndex < 0 ? travelledM : route.starts[last]! + route.edges[last]!.lengthM;
  const finalRelease = route.vehicleFinalRelease;
  const release = finalRelease?.passage === passage ? Math.max(after, finalRelease.distanceM) : after;
  const end = Math.min(route.totalLengthM, release + 2 * radius + stopGapM);
  const positions = table.poses.vehicles.current.position;
  const others = table.vehicles.filter(state => state.slot !== self && (table.poses.vehicles.active[state.slot] || pending.has(state.slot)))
    .map(state => ({ x: positions[state.slot * 3]!, z: positions[state.slot * 3 + 2]!, radius: vehicleOriginRadius(fleet, table, state.slot) }));
  const clear = (a: WorldPoint, b: WorldPoint, lateralM: number): boolean => {
    const dx = b.x - a.x, dz = b.z - a.z, squared = dx * dx + dz * dz;
    const ownRadius = radius + Math.abs(lateralM) + Math.max(publicationMargin(a.x, a.z, radius), publicationMargin(b.x, b.z, radius));
    for (const other of others) {
      const gap = ownRadius + other.radius + stopGapM + publicationMargin(other.x, other.z, other.radius);
      if (other.x < Math.min(a.x, b.x) - gap || other.x > Math.max(a.x, b.x) + gap || other.z < Math.min(a.z, b.z) - gap || other.z > Math.max(a.z, b.z) + gap) continue;
      const t = squared > 0 ? Math.max(0, Math.min(1, ((other.x - a.x) * dx + (other.z - a.z) * dz) / squared)) : 0;
      if (Math.hypot(other.x - a.x - t * dx, other.z - a.z - t * dz) < gap) return false;
    }
    return true;
  };
  let previous: WorldPoint | undefined;
  let previousLateral = 0;
  for (let index = 0; index < route.edges.length; index++) {
    const edge = route.edges[index]!, start = route.starts[index]!;
    if (start + edge.lengthM < travelledM || start > end) continue;
    const lo = Math.max(0, travelledM - start), hi = Math.min(edge.lengthM, end - start);
    const lateral = table.vehicles[self]!.laneIndex * edge.widthM * .45;
    let a = sampleEdge(edge, lo), along = 0;
    if (previous && !clear(previous, a, Math.max(Math.abs(lateral), previousLateral))) return false;
    for (let point = 1; point < edge.points.length; point++) {
      const p = edge.points[point - 1]!, q = edge.points[point]!;
      along += Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
      if (along <= lo || along >= hi) continue;
      if (!clear(a, q, lateral)) return false;
      a = q;
    }
    const b = sampleEdge(edge, hi);
    if (!clear(a, b, lateral)) return false;
    previous = b; previousLateral = Math.abs(lateral);
  }
  // Boundary retirement publishes the actual authored outward line, not a lane continuation.
  const exit = passage.boundaryExit;
  if (exit && end === route.totalLengthM && previous) {
    const b = { ...exit.position, x: exit.position.x + exit.outward.x * exit.maxDistanceM, z: exit.position.z + exit.outward.z * exit.maxDistanceM };
    if (!clear(previous, exit.position, previousLateral) || !clear(exit.position, b, 0)) return false;
  }
  return true;
}
