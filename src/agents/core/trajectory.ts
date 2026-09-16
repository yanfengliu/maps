import type { PlanPoint } from "../../world/vehicle-surfaces.ts";
import { VEHICLE_FRONT_STEERING_LIMIT_RADIANS } from "../../world/agent-poses.ts";

export const VEHICLE_DYNAMICS = Object.freeze({ maximumSteeringRadians: VEHICLE_FRONT_STEERING_LIMIT_RADIANS, maximumSteeringRateRadiansPerSecond: 15 * Math.PI / 180, maximumLateralAccelerationMps2: 2 });
export interface TrajectorySample { x: number; z: number; headingRadians: number; /** Signed d(atan2(dx,dz))/ds: positive turns toward +X from +Z. */ curvaturePerM: number }
export interface TrajectorySpan { readonly controls: readonly PlanPoint[] }
interface ArcSample { t: number; s: number }
interface PreparedSpan { span: TrajectorySpan; startM: number; lengthM: number; arc: readonly ArcSample[] }
export interface VehicleTrajectory {
  readonly routeEdgeIds: readonly string[];
  readonly corridorId: string;
  readonly spans: readonly TrajectorySpan[];
  readonly lengthM: number;
  readonly maximumArcErrorM: number;
  sample(distanceM: number, out: TrajectorySample): void;
}
const trajectories = new WeakSet<object>();
const lerp = (a: PlanPoint, b: PlanPoint, t: number): PlanPoint => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const norm = (point: PlanPoint): number => Math.hypot(point[0], point[1]);
const difference = (a: PlanPoint, b: PlanPoint): PlanPoint => [a[0] - b[0], a[1] - b[1]];
export function bezierValue(controls: readonly PlanPoint[], t: number): PlanPoint {
  let row = [...controls];
  while (row.length > 1) row = row.slice(0, -1).map((a, i) => lerp(a, row[i + 1]!, t));
  return row[0]!;
}
export function bezierDerivative(controls: readonly PlanPoint[]): PlanPoint[] {
  const degree = controls.length - 1;
  return controls.slice(0, -1).map((a, i) => [(controls[i + 1]![0] - a[0]) * degree, (controls[i + 1]![1] - a[1]) * degree]);
}
export function splitBezier(controls: readonly PlanPoint[], t = .5): [PlanPoint[], PlanPoint[]] {
  let row = [...controls];
  const left = [row[0]!], right = [row.at(-1)!];
  while (row.length > 1) { row = row.slice(0, -1).map((a, i) => lerp(a, row[i + 1]!, t)); left.push(row[0]!); right.push(row.at(-1)!); }
  return [left, right.reverse()];
}
export function straightSpan(start: PlanPoint, end: PlanPoint): TrajectorySpan { return { controls: [start, end] }; }
/** Zero endpoint second derivatives permit C2 joins to straight sections. */
export function quinticSpan(start: PlanPoint, end: PlanPoint, startHeading: number, endHeading: number, tangentLengthM: number): TrajectorySpan {
  if (!Number.isFinite(tangentLengthM) || tangentLengthM <= 0) throw new Error(`Quintic tangent length ${tangentLengthM} must be positive metres.`);
  const a: PlanPoint = [start[0] + Math.sin(startHeading) * tangentLengthM / 5, start[1] + Math.cos(startHeading) * tangentLengthM / 5];
  const b: PlanPoint = [end[0] - Math.sin(endHeading) * tangentLengthM / 5, end[1] - Math.cos(endHeading) * tangentLengthM / 5];
  return { controls: [start, a, [2 * a[0] - start[0], 2 * a[1] - start[1]], [2 * b[0] - end[0], 2 * b[1] - end[1]], b, end] };
}
function evaluate(span: TrajectorySpan, t: number, out: TrajectorySample): void {
  const p = bezierValue(span.controls, t), d = bezierValue(bezierDerivative(span.controls), t);
  const second = bezierDerivative(bezierDerivative(span.controls)), a = second.length ? bezierValue(second, t) : [0, 0];
  const speed = norm(d);
  if (!(speed > 1e-9)) throw new Error(`Trajectory has a stationary or reversed parameter tangent at ${t}; construct a forward supported span.`);
  out.x = p[0]; out.z = p[1]; out.headingRadians = Math.atan2(d[0], d[1]); out.curvaturePerM = (d[1] * a[0]! - d[0] * a[1]!) / speed ** 3;
}
export function createTrajectory(routeEdgeIds: readonly string[], corridorId: string, spans: readonly TrajectorySpan[], toleranceM = .0005): VehicleTrajectory {
  if (!corridorId || !routeEdgeIds.length || !spans.length || !Number.isFinite(toleranceM) || toleranceM <= 0 || toleranceM > .001) throw new Error("Vehicle trajectory needs a corridor, actual route, spans and an arc tolerance up to 1 mm.");
  const frozen = spans.map(span => Object.freeze({ controls: Object.freeze(span.controls.map(p => Object.freeze([...p]) as PlanPoint)) }));
  const prepared: PreparedSpan[] = [];
  let total = 0;
  for (const [index, span] of frozen.entries()) {
    if (![2, 6].includes(span.controls.length) || span.controls.some(p => p.length !== 2 || !p.every(Number.isFinite))) throw new Error(`Trajectory span ${index} needs two or six finite XZ controls.`);
    const chord = difference(span.controls.at(-1)!, span.controls[0]!), chordLength = norm(chord), d = bezierDerivative(span.controls);
    if (!(chordLength > 1e-6) || d.some(v => (v[0] * chord[0] + v[1] * chord[1]) / chordLength <= 1e-6)) throw new Error(`Trajectory span ${index} has a zero/reversed forward derivative; split or repair its source join.`);
    if (index) {
      const previous = frozen[index - 1]!, a = previous.controls.at(-1)!, b = span.controls[0]!, first = { x: 0, z: 0, headingRadians: 0, curvaturePerM: 0 }, second = { ...first };
      evaluate(previous, 1, first); evaluate(span, 0, second);
      if (norm(difference(a, b)) > 1e-6 || Math.abs(Math.atan2(Math.sin(first.headingRadians - second.headingRadians), Math.cos(first.headingRadians - second.headingRadians))) > 1e-6 || Math.abs(first.curvaturePerM - second.curvaturePerM) > 1e-7) throw new Error(`Trajectory join ${index} changes position, heading or curvature discontinuously.`);
    }
    const arc: ArcSample[] = [{ t: 0, s: 0 }]; let length = 0;
    const visit = (controls: readonly PlanPoint[], t0: number, t1: number, depth: number): void => {
      const direct = norm(difference(controls.at(-1)!, controls[0]!));
      const polygon = controls.slice(1).reduce((sum, p, i) => sum + norm(difference(p, controls[i]!)), 0);
      const acceleration = bezierDerivative(bezierDerivative(controls));
      const interpolationBound = acceleration.length ? Math.max(...acceleration.map(norm)) / 8 : 0;
      if (polygon - direct > 2 * toleranceM * (t1 - t0) || interpolationBound > toleranceM || polygon > .25) {
        if (depth >= 24) throw new Error(`Trajectory span ${index} cannot meet its ${toleranceM} m arc bound.`);
        const [left, right] = splitBezier(controls); visit(left, t0, (t0 + t1) / 2, depth + 1); visit(right, (t0 + t1) / 2, t1, depth + 1);
      } else { length += (polygon + direct) / 2; arc.push({ t: t1, s: length }); }
    };
    visit(span.controls, 0, 1, 0); prepared.push({ span, startM: total, lengthM: length, arc }); total += length;
  }
  const trajectory: VehicleTrajectory = Object.freeze({ routeEdgeIds: Object.freeze([...routeEdgeIds]), corridorId, spans: Object.freeze(frozen), lengthM: total, maximumArcErrorM: (spans.length + 1) * toleranceM,
    sample(distanceM: number, out: TrajectorySample): void {
      if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > total + 1e-8) throw new Error(`Trajectory distance ${distanceM} is outside its 0–${total} m plan.`);
      const p = prepared.find(p => distanceM <= p.startM + p.lengthM) ?? prepared.at(-1)!, local = Math.min(p.lengthM, distanceM - p.startM);
      let lo = 0, hi = p.arc.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p.arc[mid]!.s < local) lo = mid; else hi = mid; }
      const a = p.arc[lo]!, b = p.arc[hi]!, fraction = (local - a.s) / (b.s - a.s);
      evaluate(p.span, a.t + (b.t - a.t) * fraction, out);
    },
  });
  trajectories.add(trajectory); return trajectory;
}
export function assertTrajectory(trajectory: VehicleTrajectory): void {
  if (!trajectory || !trajectories.has(trajectory)) throw new Error("Vehicle motion requires a factory-issued trajectory from the actual source corridor.");
}
