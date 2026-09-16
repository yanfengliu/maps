import type { VehicleAsset } from "../../world/agent-assets.ts";
import { writeSupportBasis } from "../../world/agent-poses.ts";
import { vehicleEnvelope } from "../../network/footprints.ts";
import type { PlanPoint } from "../../world/vehicle-surfaces.ts";
import { convexHull, partitionConvex, signedArea, uncovered } from "./planar.ts";
import { assertTrajectory, bezierDerivative, bezierValue, splitBezier, VEHICLE_DYNAMICS, type VehicleTrajectory } from "./trajectory.ts";
import type { VehicleSurfaceQuery } from "./surfaces.ts";

export interface VehicleSweep {
  readonly trajectory: VehicleTrajectory;
  readonly classId: VehicleAsset["id"];
  readonly speedMps: number;
  readonly pieces: readonly (readonly PlanPoint[])[];
  readonly maximumTiltRadians: number;
  readonly maximumUncoveredAreaM2: number;
  readonly maximumCurvaturePerM: number;
  readonly maximumSteeringRateRadiansPerSecond: number;
}
const sweeps = new WeakSet<object>();
type Interval = readonly [number, number];
const range = (points: readonly PlanPoint[], axis: 0 | 1): Interval => points.length ? [Math.min(...points.map(p => p[axis])), Math.max(...points.map(p => p[axis]))] : [0, 0];
const product = (a: Interval, b: Interval): Interval => { const products = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]]; return [Math.min(...products), Math.max(...products)]; };
const absolute = (a: Interval): number => Math.max(Math.abs(a[0]), Math.abs(a[1]));
function crossBound(a: readonly PlanPoint[], b: readonly PlanPoint[]): number { const p = product(range(a, 0), range(b, 1)), q = product(range(a, 1), range(b, 0)); return absolute([p[0] - q[1], p[1] - q[0]]); }
function dotBound(a: readonly PlanPoint[], b: readonly PlanPoint[]): number { const p = product(range(a, 0), range(b, 0)), q = product(range(a, 1), range(b, 1)); return absolute([p[0] + q[0], p[1] + q[1]]); }

/** Every curve point lies in its Bézier control hull. Every derivative lies in
 * its derivative-control hull. The resulting angular cone and the support
 * cone bound all poses in the interval, rather than sampling a few poses.
 *
 * In the flat-yaw frame the canonical projected basis has Rz=0,
 * Rx in[cos(a),1], |Fx|<=sin(a)^2/(2cos(a)), Fz in[cos(a),1],
 * |Nx|,|Nz|<=sin(a). These bounds include the body's real vertical extent.
 */
function intervalHull(controls: readonly PlanPoint[], derivative: readonly PlanPoint[], acceleration: readonly PlanPoint[], jerk: readonly PlanPoint[], asset: VehicleAsset, tilt: number): { hull: PlanPoint[]; minimumSpeed: number; curvature: number; curvatureSlope: number } {
  const tangent = bezierValue(derivative, .5), heading = Math.atan2(tangent[0], tangent[1]);
  const minimumSpeed = Math.min(...derivative.map(p => p[0] * Math.sin(heading) + p[1] * Math.cos(heading)));
  if (!(minimumSpeed > 1e-12)) throw new Error("Vehicle sweep has no strictly forward tangent cone; split the trajectory before certification.");
  // Inverting the shared projection can shift its input parameter relative to
  // true horizontal bearing by at most atan(sin(a)^2/(2*cos(a))).
  const parameterShift = Math.atan(Math.sin(tilt) ** 2 / (2 * Math.cos(tilt)));
  const angle = parameterShift + Math.max(...derivative.map(p => Math.abs(Math.atan2(Math.sin(Math.atan2(p[0], p[1]) - heading), Math.cos(Math.atan2(p[0], p[1]) - heading)))));
  const envelope = vehicleEnvelope(asset), minX = envelope.centre.x - envelope.width / 2, maxX = envelope.centre.x + envelope.width / 2, minZ = envelope.centre.z - envelope.length / 2, maxZ = envelope.centre.z + envelope.length / 2;
  const x = Math.max(Math.abs(minX), Math.abs(maxX)), y = Math.max(Math.abs(envelope.centre.y - envelope.height / 2), Math.abs(envelope.centre.y + envelope.height / 2)), z = Math.max(Math.abs(minZ), Math.abs(maxZ));
  const sine = Math.sin(tilt), cosine = Math.cos(tilt), lateral = x * (1 - cosine) + y * sine + z * sine ** 2 / (2 * cosine), longitudinal = y * sine + z * (1 - cosine);
  const radius = Math.hypot(x + lateral, z + longitudinal), rotationPadding = 2 * radius * Math.sin(angle / 2), basis = new Float64Array(9);
  writeSupportBasis(heading, 0, 1, 0, basis);
  const points: PlanPoint[] = [];
  for (const p of controls) for (const localX of [minX - lateral, maxX + lateral]) for (const localZ of [minZ - longitudinal, maxZ + longitudinal]) for (const dx of [-rotationPadding, rotationPadding]) for (const dz of [-rotationPadding, rotationPadding]) points.push([p[0] + basis[0]! * localX + basis[6]! * localZ + dx, p[1] + basis[2]! * localX + basis[8]! * localZ + dz]);
  const cross = crossBound(derivative, acceleration), curvature = cross / minimumSpeed ** 3;
  const curvatureSlope = crossBound(derivative, jerk) / minimumSpeed ** 4 + 3 * cross * dotBound(derivative, acceleration) / minimumSpeed ** 6;
  return { hull: convexHull(points), minimumSpeed, curvature, curvatureSlope };
}
export function certifyVehicleSweep(trajectory: VehicleTrajectory, asset: VehicleAsset, surfaces: VehicleSurfaceQuery, speedMps = 2): VehicleSweep {
  assertTrajectory(trajectory);
  if (!Number.isFinite(speedMps) || speedMps <= 0) throw new Error(`Vehicle sweep speed ${speedMps} must be positive metres per second.`);
  const corridor = surfaces.corridor(trajectory.corridorId);
  if (trajectory.routeEdgeIds.some(id => !corridor.routeEdgeIds.includes(id))) throw new Error(`Vehicle trajectory references a route outside assigned corridor ${corridor.id}.`);
  const wheelbase = asset.axles.frontZ - asset.axles.rearZ, pieces: PlanPoint[][] = [];
  let maximumUncoveredAreaM2 = 0, maximumCurvaturePerM = 0, maximumSteeringRateRadiansPerSecond = 0;
  const visit = (controls: readonly PlanPoint[], derivative: readonly PlanPoint[], acceleration: readonly PlanPoint[], jerk: readonly PlanPoint[], depth: number): void => {
    const interval = intervalHull(controls, derivative, acceleration, jerk, asset, corridor.maximumTiltRadians), area = surfaces.uncoveredArea(corridor.id, interval.hull);
    const steering = Math.atan(wheelbase * interval.curvature), steeringRate = wheelbase * interval.curvatureSlope * speedMps;
    const covered = area <= 1e-8, dynamics = steering <= VEHICLE_DYNAMICS.maximumSteeringRadians && steeringRate <= VEHICLE_DYNAMICS.maximumSteeringRateRadiansPerSecond && interval.curvature * speedMps ** 2 <= VEHICLE_DYNAMICS.maximumLateralAccelerationMps2;
    if (!covered || !dynamics) {
      if (depth >= 16 || controls.length === 2) {
        const missing=uncovered(interval.hull,corridor.allowed).toSorted((a,b)=>Math.abs(signedArea(b))-Math.abs(signedArea(a)))[0],location=missing?.reduce((s,p)=>[s[0]+p[0]/missing.length,s[1]+p[1]/missing.length] as [number,number],[0,0] as [number,number]);
        throw new Error(`Vehicle ${asset.id} sweep in ${corridor.id} leaves ${area}m² outside source carriageway near ${location?.join(",")??"no missing source area"} or exceeds authored steering/dynamics (steering ${steering}rad, rate ${steeringRate}rad/s).`);
      }
      // Restrict the original derivative polynomials. Differentiating tiny
      // subdivided world coordinates magnifies floating-point cancellation.
      const [left,right]=splitBezier(controls),[dl,dr]=splitBezier(derivative),[al,ar]=acceleration.length?splitBezier(acceleration):[[],[]],[jl,jr]=jerk.length?splitBezier(jerk):[[],[]];
      visit(left,dl,al,jl,depth+1);visit(right,dr,ar,jr,depth+1);return;
    }
    pieces.push(interval.hull); maximumUncoveredAreaM2 = Math.max(maximumUncoveredAreaM2, area); maximumCurvaturePerM = Math.max(maximumCurvaturePerM, interval.curvature); maximumSteeringRateRadiansPerSecond = Math.max(maximumSteeringRateRadiansPerSecond, steeringRate);
  };
  for (const span of trajectory.spans) {const d=bezierDerivative(span.controls),a=bezierDerivative(d),j=bezierDerivative(a);visit(span.controls,d,a,j,0);}
  const sweep: VehicleSweep = Object.freeze({ trajectory, classId: asset.id, speedMps, pieces: Object.freeze(pieces.map(p => Object.freeze(p.map(v => Object.freeze(v))))), maximumTiltRadians: corridor.maximumTiltRadians, maximumUncoveredAreaM2, maximumCurvaturePerM, maximumSteeringRateRadiansPerSecond });
  sweeps.add(sweep); return sweep;
}
export function assertVehicleSweep(sweep: VehicleSweep): void {
  if (!sweep || !sweeps.has(sweep)) throw new Error("Vehicle ingress or movement needs a certified sweep issued from the actual trajectory, body and source corridor.");
}
/** Conservative swept occupation includes any borrowed adjacent lane space.
 * Caller supplies real other-body sweeps; a nominal lane width is irrelevant.
 */
export function sweepsOverlap(a: VehicleSweep, b: VehicleSweep): boolean {
  assertVehicleSweep(a); assertVehicleSweep(b);
  return a.pieces.some(p => b.pieces.some(q => Math.abs(signedArea(partitionConvex(p, q).inside)) > 1e-8));
}
