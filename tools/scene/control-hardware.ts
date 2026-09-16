import type { VehicleAsset } from "../../src/world/agent-assets.ts";
import type { ControlHardwarePlacement } from "../../src/world/control-hardware.ts";
import type { NetworkData, WorldPoint } from "../../src/world/network-data.ts";
import { segmentDistance, supportedVehicle, type ContactQuery, type SupportedVehicle } from "./hardware-support.ts";

const STEP = .5, POLE_RADIUS = .065, CLEARANCE = .6;
interface PoseBox { minX: number; maxX: number; minZ: number; maxZ: number; pose: SupportedVehicle | null; edgeId: string }
const overlaps = (a: { minX: number; maxX: number; minZ: number; maxZ: number }, b: { minX: number; maxX: number; minZ: number; maxZ: number }): boolean => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
const box = (a: WorldPoint, b: WorldPoint, radius: number) => ({ minX: Math.min(a.x, b.x) - radius, maxX: Math.max(a.x, b.x) + radius, minZ: Math.min(a.z, b.z) - radius, maxZ: Math.max(a.z, b.z) + radius });

/** Validate only the metadata consumed by this placement calculation. The
 * standalone vehicle verifier owns source GLB/manifest correspondence.
 */
function assertHardwareVehicles(value: unknown): asserts value is readonly VehicleAsset[] {
  const fail = (reason: string): never => { throw new Error(`data/scene/agents/vehicles.json ${reason}; run npm run data:vehicles and npm run data:vehicles:verify before npm run data:hardware.`); };
  if (!Array.isArray(value) || value.length !== 3) fail("must contain the three actual kei, taxi and bus records");
  const vehicles = value as readonly VehicleAsset[];
  for (let index = 0; index < vehicles.length; index++) {
    const vehicle = vehicles[index];
    if (!vehicle || typeof vehicle !== "object" || typeof vehicle.id !== "string") fail(`has a malformed vehicle record at index ${index}`);
    const { bounds, axles, collision } = vehicle!;
    if (!bounds || !Array.isArray(bounds.min) || !Array.isArray(bounds.max) || bounds.min.length !== 3 || bounds.max.length !== 3 || !axles || !collision || ![...bounds.min, ...bounds.max, axles.frontZ, axles.rearZ, axles.trackMetres, collision.width, collision.length].every(Number.isFinite) || bounds.min.some((v, i) => v >= bounds.max[i]!) || axles.trackMetres <= 0 || axles.frontZ <= axles.rearZ || collision.width <= 0 || collision.length <= 0) fail(`has malformed measured bounds or axle contacts for record ${index} (${vehicle!.id})`);
  }
  if (!["kei", "taxi", "bus"].every(id => vehicles.some(vehicle => vehicle.id === id))) fail("must contain each actual kei, taxi and bus record exactly once");
}

/** Bounded authored hardware, not a map survey. Route poses are sampled every
 * 0.5 m with a half-step horizontal margin. Pose support requires all manifest
 * wheel contacts; unsupported nearby bodies block placement, not validation.
 */
export function placeControlHardware(network: NetworkData, vehicles: readonly VehicleAsset[], pavement: ContactQuery, road: ContactQuery): ControlHardwarePlacement[] {
  assertHardwareVehicles(vehicles);
  const lanes = new Map(network.lanes.map(edge => [edge.id, edge]));
  const laneSegments = network.lanes.flatMap(edge => edge.points.slice(1).map((b, i) => ({ a: edge.points[i]!, b, id: edge.id, width: edge.widthM })));
  const walks = network.walks.filter(edge => !edge.id.endsWith(":r")).flatMap(edge => edge.points.slice(1).map((b, i) => ({ a: edge.points[i]!, b, width: edge.widthM })));
  const reach = Math.max(...vehicles.map(v => Math.hypot(v.collision.length, v.collision.width, v.bounds.max[1]!) / 2));
  return network.physical.trafficControls.map(control => {
    const record: ControlHardwarePlacement = { sourceId: control.id, sourceNodeId: control.sourceNodeId, sourcePosition: { ...control.position }, status: "unplaced", reason: "No supported pavement base clear of local route corridors within the 18 m transverse search.", base: null, head: null, direction: null, evidence: { pavementTriangles: [], vehiclePoseCount: 0, maxVehicleTopY: null, pedestrianGapM: null, supportTriangles: [] } };
    const approach = control.approachEdgeIds.map(id => lanes.get(id)).find(edge => edge && edge.points.length > 1);
    const raw = control.travelDirection ?? (approach ? { x: approach.points[1]!.x - approach.points[0]!.x, z: approach.points[1]!.z - approach.points[0]!.z } : null);
    if (!raw || Math.hypot(raw.x, raw.z) < 1e-6) { record.reason = "No source-associated travel direction for authored hardware orientation."; return record; }
    const length = Math.hypot(raw.x, raw.z), direction = { x: raw.x / length, y: 0, z: raw.z / length }, across = { x: direction.z, z: -direction.x };
    record.direction = direction;
    const nearby = laneSegments.filter(s => segmentDistance(control.position, s.a, s.b).distance <= 18 + reach && Math.abs(segmentDistance(control.position, s.a, s.b).point.y - control.position.y) < 1.5);
    const poses: PoseBox[] = [];
    for (const segment of nearby) {
      const distance = Math.hypot(segment.b.x - segment.a.x, segment.b.z - segment.a.z), steps = Math.max(1, Math.ceil(distance / STEP)), yaw = Math.atan2(segment.b.x - segment.a.x, segment.b.z - segment.a.z);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = { x: segment.a.x + (segment.b.x - segment.a.x) * t, y: segment.a.y + (segment.b.y - segment.a.y) * t, z: segment.a.z + (segment.b.z - segment.a.z) * t };
        for (const vehicle of vehicles) {
          const pose = supportedVehicle(vehicle, p, yaw, road);
          // Unknown pose gets the conservative orientation-independent extent;
          // it can forbid placement but can never justify a tall clear head.
          const bounds = pose ? { minX: Math.min(...pose.corners.map(c => c.x)) - STEP / 2, maxX: Math.max(...pose.corners.map(c => c.x)) + STEP / 2, minZ: Math.min(...pose.corners.map(c => c.z)) - STEP / 2, maxZ: Math.max(...pose.corners.map(c => c.z)) + STEP / 2 } : box(p, p, reach + STEP / 2);
          poses.push({ ...bounds, pose: pose ?? null, edgeId: segment.id });
        }
      }
    }
    const nearWalks = walks.filter(s => segmentDistance(control.position, s.a, s.b).distance < 22 && Math.abs(segmentDistance(control.position, s.a, s.b).point.y - control.position.y) < 1.5);
    let unsupported = false;
    const candidates = [0, ...Array.from({ length: 71 }, (_, i) => .5 + i * .25).flatMap(d => [-d, d])];
    for (const offset of candidates) {
      const x = control.position.x + across.x * offset, z = control.position.z + across.z * offset;
      const base = pavement(x, z, control.position.y); if (!base) continue;
      const triangles = [base.triangle]; let supported = true;
      // Nine samples cover the 0.3 m footing square. This is a stated discrete
      // support check, not an assertion about unseen citywide surface interiors.
      for (const dx of [-.3, 0, .3]) for (const dz of [-.3, 0, .3]) {
        const q = pavement(x + dx, z + dz, base.point.y), r = road(x + dx, z + dz, base.point.y);
        if (!q || Math.abs(q.point.y - base.point.y) > .15 || (r && q.point.y - r.point.y < .025)) { supported = false; break; }
        triangles.push(q.triangle);
      }
      if (!supported) continue;
      const pedestrianGap = Math.min(...nearWalks.map(s => segmentDistance(base.point, s.a, s.b).distance - s.width / 2 - POLE_RADIUS));
      if (pedestrianGap < .2) continue;
      const pole = box(base.point, base.point, POLE_RADIUS + .2);
      const touching = poses.filter(p => overlaps(p, pole));
      if (touching.length) { unsupported ||= touching.some(p => !p.pose); continue; }
      const vehicleSignal = control.kind === "traffic_signals" && control.sourceTags["traffic_signals"] !== "pedestrian";
      // A short authored arm faces the associated road. The logical OSM node is
      // neither pole XY nor head XY authority.
      const arm = vehicleSignal ? Math.min(2.5, Math.abs(offset)) : 0;
      const headXZ = { x: x - across.x * Math.sign(offset) * arm, y: base.point.y, z: z - across.z * Math.sign(offset) * arm };
      const hardware = box(base.point, headXZ, vehicleSignal ? .65 : .5), below = poses.filter(p => overlaps(p, hardware));
      if (below.some(p => !p.pose)) { unsupported = true; continue; }
      const maxY = below.length ? Math.max(...below.map(p => p.pose!.maxY)) : null;
      const halfHead = vehicleSignal ? .175 : control.kind === "stop" ? .38 : .4;
      const y = Math.max(base.point.y + (vehicleSignal ? 4.6 : control.kind === "stop" ? 2.05 : 2.5), (maxY ?? -Infinity) + CLEARANCE + halfHead);
      if (y - base.point.y > 6) continue;
      return { ...record, status: "placed", reason: "Authored pavement-supported base and short arm; sampled local fleet bodies and declared walking corridors clear within the recorded bounds.", base: base.point, head: { ...headXZ, y }, evidence: { pavementTriangles: [...new Set(triangles)], vehiclePoseCount: below.length, maxVehicleTopY: maxY, pedestrianGapM: Number.isFinite(pedestrianGap) ? pedestrianGap : null, supportTriangles: [...new Set(below.flatMap(p => p.pose!.supportTriangles))] } };
    }
    if (unsupported) record.reason += " Some candidate hardware footprints overlap road poses without four supported wheel contacts.";
    return record;
  });
}
