import type { ActorFootprint } from "../../network/footprints.ts";
import type { WorldPoint } from "../../world/network-data.ts";
import type { PlannedRoute } from "./routes.ts";

/**
 * Review 138: selected, indexed half-float VAT positions, all 48 frames and all
 * three LODs per variant. Rounded outward by at least 1 mm for float32 instance
 * transforms. The asset-point test pins and decodes the delivered bytes.
 * Pedestrian support is upright; yaw preserves these XZ radii. Frame/clip blends
 * are convex combinations, so they cannot escape these cylinders.
 */
export const PEDESTRIAN_ENTRY_BOUNDS = Object.freeze([
  Object.freeze({ radiusM: 0.510, minimumY: -0.0011, maximumY: 1.629 }),
  Object.freeze({ radiusM: 0.533, minimumY: -0.0011, maximumY: 1.833 }),
  Object.freeze({ radiusM: 0.496, minimumY: -0.0011, maximumY: 1.512 }),
]);

/** Air beyond both displayed bodies, not the motion or signal footprint. */
export const PEDESTRIAN_ENTRY_MARGIN_M = 0.05;
/** Slots inspected per tick, including active and not-yet-eligible slots. */
export const PEDESTRIAN_ENTRY_SCAN_BUDGET = 128;

/** A future legal interior initializer can prepare this same activation input. */
export interface PedestrianEntryCandidate {
  readonly route: PlannedRoute;
  readonly variant: number;
  readonly scale: number;
  readonly generation: number;
  readonly travelledM: number;
}

export interface EntryBody {
  readonly x: number;
  readonly z: number;
  readonly radiusM: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

export function pedestrianEntryBody(at: WorldPoint, variant: number, scale: number): EntryBody {
  const bounds = PEDESTRIAN_ENTRY_BOUNDS[variant];
  if (!bounds || !Number.isFinite(scale) || scale <= 0 || ![at.x, at.y, at.z].every(Number.isFinite)) {
    throw new Error(`Pedestrian entry needs a delivered variant, positive scale and finite position; received variant ${variant}, scale ${scale}, position ${at.x},${at.y},${at.z}.`);
  }
  return { x: at.x, z: at.z, radiusM: bounds.radiusM * scale, minimumY: at.y + bounds.minimumY * scale, maximumY: at.y + bounds.maximumY * scale };
}

export function entryBodiesOverlap(a: EntryBody, b: EntryBody): boolean {
  const margin = PEDESTRIAN_ENTRY_MARGIN_M;
  if (a.maximumY + margin <= b.minimumY || b.maximumY + margin <= a.minimumY) return false;
  return Math.hypot(a.x - b.x, a.z - b.z) < a.radiusM + b.radiusM + margin;
}

/** Rebuilt from current occupants once per lifecycle, then updated atomically. */
export class PedestrianEntrySpace {
  private readonly cells = new Map<string, EntryBody[]>();
  private readonly vehicles: ActorFootprint[] = [];
  private maximumRadius = 0;
  private readonly cellSizeM = 2;

  clear(): void { this.cells.clear(); this.vehicles.length = 0; this.maximumRadius = 0; }

  occupy(body: EntryBody): void {
    const key = this.key(Math.floor(body.x / this.cellSizeM), Math.floor(body.z / this.cellSizeM));
    let cell = this.cells.get(key);
    if (!cell) { cell = []; this.cells.set(key, cell); }
    cell.push(body);
    this.maximumRadius = Math.max(this.maximumRadius, body.radiusM);
  }

  occupyVehicle(footprint: ActorFootprint): void { this.vehicles.push(footprint); }

  hasClearance(body: EntryBody): boolean {
    const reach = body.radiusM + this.maximumRadius + PEDESTRIAN_ENTRY_MARGIN_M;
    for (let x = Math.floor((body.x - reach) / this.cellSizeM); x <= Math.floor((body.x + reach) / this.cellSizeM); x++) {
      for (let z = Math.floor((body.z - reach) / this.cellSizeM); z <= Math.floor((body.z + reach) / this.cellSizeM); z++) {
        for (const other of this.cells.get(this.key(x, z)) ?? []) if (entryBodiesOverlap(body, other)) return false;
      }
    }
    for (const vehicle of this.vehicles) {
      // The authority's projected hull already contains supported tilt and wheel
      // travel. Its 3D diameter supplies a conservative vertical interval.
      const halfHeight = vehicle.envelopeDiameterM! / 2;
      if (body.minimumY >= vehicle.position.y + halfHeight + PEDESTRIAN_ENTRY_MARGIN_M || body.maximumY + PEDESTRIAN_ENTRY_MARGIN_M <= vehicle.position.y - halfHeight) continue;
      const hull = vehicle.hull!;
      let inside = true;
      let distanceSquared = Infinity;
      for (let i = 0; i < hull.length; i++) {
        const a = hull[i]!, b = hull[(i + 1) % hull.length]!;
        const dx = b.x - a.x, dz = b.z - a.z;
        if (dx * (body.z - a.z) - dz * (body.x - a.x) < 0) inside = false;
        const t = Math.max(0, Math.min(1, ((body.x - a.x) * dx + (body.z - a.z) * dz) / (dx * dx + dz * dz)));
        distanceSquared = Math.min(distanceSquared, (body.x - a.x - t * dx) ** 2 + (body.z - a.z - t * dz) ** 2);
      }
      if (inside || distanceSquared < (body.radiusM + PEDESTRIAN_ENTRY_MARGIN_M) ** 2) return false;
    }
    return true;
  }

  private key(x: number, z: number): string { return `${x},${z}`; }
}
