/**
 * Pure physical walking candidate. Bounds: the supplied route, a materialized
 * polyline, strict origin support and explicit geometric turn events. Neither
 * turn events nor origin support certify animation, soles or crowd avoidance.
 * Source route identities are retained; physical arc is measured after Y fitting.
 */
import { sampleRoute, type PlannedRoute } from "./routes.ts";
import { walkingCorridorContains } from "./walking-corridor.ts";
import type { WorldPoint } from "../../world/network-data.ts";
import type { WalkingContact, WalkingSurfaceInterval, WalkingSurfaceQuery, WalkingSurfaceRefusal, WalkingSurfaceSource } from "./walking-surfaces.ts";

export interface WalkingPathPoint extends Readonly<WorldPoint> {
  readonly physicalM: number;
  readonly sourceM: number;
  readonly occurrence: number;
  readonly localM: number;
  readonly support: WalkingContact;
}
export type WalkingStep =
  | Readonly<{ kind: "move"; from: WalkingPathPoint; to: WalkingPathPoint; heading: number }>
  | Readonly<{ kind: "turn"; at: WalkingPathPoint; fromHeading: number; toHeading: number; angle: number; locomotion: "unverified" }>;
export interface WalkingPath {
  readonly productionReady: false;
  readonly sourceRoute: PlannedRoute;
  readonly points: readonly WalkingPathPoint[];
  readonly steps: readonly WalkingStep[];
  readonly physicalLengthM: number;
  readonly initialHeading: number;
  readonly terminalHeading: number;
  readonly surfaceBinding: WalkingSurfaceQuery["binding"];
  readonly coverage: "strict-origin-support; local-corridor-centre-contained; body-sole-turn-unverified";
}
export interface WalkingPathRefusal {
  readonly reason: "surface" | "invalid-route" | "source-without-motion" | "outside-corridor";
  readonly detail: string;
  readonly sourceM: number;
  readonly occurrence: number;
  readonly surface?: WalkingSurfaceRefusal;
  readonly sourceInterval?: readonly [number, number];
}
export type WalkingPathResult = { readonly ok: true; readonly path: WalkingPath } | { readonly ok: false; readonly refusal: WalkingPathRefusal };
export interface WalkingPathOptions {
  readonly route: PlannedRoute;
  readonly surfaces: WalkingSurfaceQuery;
  /** Chord sampling of the retained offset sampler; not a foot-support spacing. */
  readonly maxSegmentM: number;
  /** Maximum trimmed neighborhood on each side of an occurrence join. */
  readonly joinWindowM: number;
}
interface SourceSample extends WorldPoint { sourceM: number; occurrence: number; localM: number; corridorFirst?: number; corridorLast?: number }
const distance = (a: Readonly<WorldPoint>, b: Readonly<WorldPoint>) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const angleBetween = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const finitePositive = (n: number) => Number.isFinite(n) && n > 0;
function sourceAt(route: PlannedRoute, sourceM: number): { occurrence: number; localM: number } {
  let lo = 0, hi = route.starts.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (route.starts[mid]! <= sourceM) lo = mid; else hi = mid - 1; }
  return { occurrence: lo, localM: Math.max(0, Math.min(route.edges[lo]!.lengthM, sourceM - route.starts[lo]!)) };
}
function sourceContext(route: PlannedRoute, sample: SourceSample): WalkingSurfaceSource {
  const edge = route.edges[sample.occurrence]!;
  return { occurrence: sample.occurrence, edgeId: edge.id, sourceWayId: edge.sourceWayId, sourceY: sample.y };
}
function sampled(route: PlannedRoute, occurrence: number, localM: number): SourceSample {
  return { ...sampleRoute(route, occurrence, localM), sourceM: route.starts[occurrence]! + localM, occurrence, localM };
}

/** Retain interior offsets; connect trimmed occurrence tracks with real motion. */
export function buildWalkingPath(options: WalkingPathOptions): WalkingPathResult {
  const { route, surfaces, maxSegmentM, joinWindowM } = options;
  if (!surfaces || typeof surfaces.begin !== "function" || typeof surfaces.trace !== "function") throw new Error("Walking path needs an explicit WalkingSurfaceQuery; provide byte-bound mesh support or an analytic test surface.");
  if (!finitePositive(maxSegmentM) || !Number.isFinite(joinWindowM) || joinWindowM < 0) throw new Error("Walking path needs a positive finite chord length and a non-negative finite join window.");
  const refuse = (reason: WalkingPathRefusal["reason"], detail: string, sample: { sourceM: number; occurrence: number }, surface?: WalkingSurfaceRefusal, sourceInterval?: readonly [number, number]): WalkingPathResult => ({ ok: false, refusal: Object.freeze({ reason, detail, sourceM: sample.sourceM, occurrence: sample.occurrence, ...(surface ? { surface } : {}), ...(sourceInterval ? { sourceInterval } : {}) }) });
  if (!route.edges.length || route.starts.length !== route.edges.length || route.edgeIds.length !== route.edges.length || route.starts[0] !== 0) return refuse("invalid-route", "A walking path needs the complete nonempty route with its unchanged source starts and edge identities.", { sourceM: 0, occurrence: 0 });
  let expectedStart = 0;
  for (let i = 0; i < route.edges.length; i++) {
    const edge = route.edges[i]!;
    if (("kind" in edge && edge.kind === "lane") || !finitePositive(edge.lengthM) || edge.points.length < 2 || edge.id !== route.edgeIds[i] || Math.abs(route.starts[i]! - expectedStart) > 1e-7) return refuse("invalid-route", `Walking occurrence ${i} (${edge.id}) has invalid source identity, geometry or cumulative length.`, { sourceM: route.starts[i]!, occurrence: i });
    expectedStart += edge.lengthM;
  }
  if (Math.abs(expectedStart - route.totalLengthM) > 1e-7) return refuse("invalid-route", "Walking source total differs from its complete occurrence lengths.", { sourceM: expectedStart, occurrence: route.edges.length - 1 });
  const raw: SourceSample[] = [];
  const trims = new Float64Array(route.edges.length + 1);
  for (let i = 1; i < route.edges.length; i++) {
    const incoming = sampleRoute(route, i - 1, route.edges[i - 1]!.lengthM).heading, outgoing = sampleRoute(route, i, 0).heading;
    // Trimming a returning path joins two nearby points by skipping its tip.
    // Keep that tip and spend the reversal as a geometric turn instead.
    trims[i] = Math.cos(outgoing - incoming) < 0 ? 0 : Math.min(joinWindowM, route.edges[i - 1]!.lengthM / 3, route.edges[i]!.lengthM / 3);
    if (trims[i]! > 0 && !walkingCorridorContains(sampled(route, i - 1, route.edges[i - 1]!.lengthM - trims[i]!), sampled(route, i, trims[i]!), [route.edges[i - 1]!, route.edges[i]!])) trims[i] = 0;
  }
  for (let i = 0; i < route.edges.length; i++) {
    const edge = route.edges[i]!, lo = trims[i]!, hi = edge.lengthM - trims[i + 1]!;
    const cuts = new Set<number>([lo, hi]);
    let along = 0;
    for (let j = 1; j < edge.points.length; j++) {
      along += distance(edge.points[j - 1]!, edge.points[j]!);
      // These are all derivative boundaries of the current offset sampler.
      for (const cut of [along - .2, along, along + .2]) if (cut > lo && cut < hi) cuts.add(cut);
    }
    const ordered = [...cuts].sort((a, b) => a - b);
    const samples: SourceSample[] = [sampled(route, i, lo)];
    for (let j = 1; j < ordered.length; j++) {
      const a = ordered[j - 1]!, b = ordered[j]!;
      const count = Math.max(1, Math.ceil((b - a) / maxSegmentM));
      for (let k = 1; k <= count; k++) samples.push(sampled(route, i, a + (b - a) * k / count));
    }
    if (raw.length) {
      const a = raw.at(-1)!, b = samples[0]!;
      b.corridorFirst = i - 1; b.corridorLast = i;
      const count = Math.max(1, Math.ceil(distance(a, b) / maxSegmentM));
      for (let k = 1; k < count; k++) {
        const t = k / count, sourceM = a.sourceM + (b.sourceM - a.sourceM) * t;
        raw.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, sourceM, ...sourceAt(route, sourceM), corridorFirst: i - 1, corridorLast: i });
      }
    }
    raw.push(...samples);
  }
  const points: WalkingPathPoint[] = [];
  let interval: WalkingSurfaceInterval | undefined;
  let previousRaw: SourceSample | undefined;
  let current: WalkingContact | undefined;
  const add = (support: WalkingContact, sourceM: number): WalkingPathResult | undefined => {
    const previous = points.at(-1), delta = previous ? distance(previous, support.position) : 0;
    const location = sourceAt(route, sourceM);
    if (previous && delta <= 1e-12) {
      if (sourceM - previous.sourceM > 1e-9) return refuse("source-without-motion", "A constructed source interval advances without physical motion; preserve it as an explicit unresolved mapping rather than skipping authority.", { sourceM, occurrence: location.occurrence });
      return;
    }
    points.push(Object.freeze({ ...support.position, sourceM, ...location, physicalM: (previous?.physicalM ?? 0) + delta, support }));
  };
  for (const sample of raw) {
    if (!current) {
      const opened = surfaces.begin(sourceContext(route, sample), sample);
      if (!opened.ok) return refuse("surface", opened.refusal.detail, sample, opened.refusal);
      interval = opened.value; current = interval.anchor;
      const failure = add(current, sample.sourceM); if (failure) return failure;
    } else {
      if (!walkingCorridorContains(previousRaw!, sample, route.edges.slice(Math.min(previousRaw!.corridorFirst ?? previousRaw!.occurrence, sample.corridorFirst ?? sample.occurrence), Math.max(previousRaw!.corridorLast ?? previousRaw!.occurrence, sample.corridorLast ?? sample.occurrence) + 1))) return refuse("outside-corridor", "The physical centre segment leaves its local source corridor union; support elsewhere does not authorize that shortcut.", sample);
      if (interval!.source.occurrence !== sample.occurrence) {
        // Re-anchor at the current physical point, never jump to the next point.
        const context = { ...sourceContext(route, sample), sourceY: previousRaw!.y };
        const opened = surfaces.begin(context, current.position, current);
        if (!opened.ok) return refuse("surface", opened.refusal.detail, sample, opened.refusal, [previousRaw!.sourceM, sample.sourceM]);
        interval = opened.value;
      }
      const traced = surfaces.trace(interval!, current, sample, previousRaw!.y);
      if (!traced.ok) return refuse("surface", traced.refusal.detail, sample, traced.refusal, [previousRaw!.sourceM, sample.sourceM]);
      for (const point of traced.value.slice(1)) {
        const sourceM = previousRaw!.sourceM + (sample.sourceM - previousRaw!.sourceM) * point.fraction;
        const failure = add(point.contact, sourceM); if (failure) return failure;
      }
      current = traced.value.at(-1)!.contact;
    }
    previousRaw = sample;
  }
  const initialHeading = sampleRoute(route, 0, 0).heading, terminalHeading = sampleRoute(route, route.edges.length - 1, route.edges.at(-1)!.lengthM).heading;
  const steps: WalkingStep[] = [];
  let heading = initialHeading;
  const turn = (at: WalkingPathPoint, desired: number) => {
    const angle = angleBetween(heading, desired);
    if (Math.abs(angle) > 1e-10) steps.push(Object.freeze({ kind: "turn", at, fromHeading: heading, toHeading: heading + angle, angle, locomotion: "unverified" }));
    heading += angle;
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    if (Math.hypot(b.x - a.x, b.z - a.z) > 1e-12) turn(a, Math.atan2(b.x - a.x, b.z - a.z));
    steps.push(Object.freeze({ kind: "move", from: a, to: b, heading }));
  }
  turn(points.at(-1)!, terminalHeading);
  return { ok: true, path: Object.freeze({ productionReady: false, sourceRoute: route, points: Object.freeze(points), steps: Object.freeze(steps), physicalLengthM: points.at(-1)!.physicalM, initialHeading, terminalHeading, surfaceBinding: surfaces.binding, coverage: "strict-origin-support; local-corridor-centre-contained; body-sole-turn-unverified" }) };
}

export function sampleWalkingPath(path: WalkingPath, physicalM: number): WalkingPathPoint {
  if (!Number.isFinite(physicalM)) throw new Error("Walking sample needs a finite physical distance.");
  const s = Math.max(0, Math.min(path.physicalLengthM, physicalM));
  let lo = 0, hi = path.points.length - 1;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (path.points[mid]!.physicalM < s) lo = mid + 1; else hi = mid; }
  if (lo === 0) return path.points[0]!;
  const a = path.points[lo - 1]!, b = path.points[lo]!, t = (s - a.physicalM) / (b.physicalM - a.physicalM), sourceM = a.sourceM + (b.sourceM - a.sourceM) * t;
  const position = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  return { ...position, physicalM: s, sourceM, ...sourceAt(path.sourceRoute, sourceM), support: { ...b.support, position } };
}

export interface WalkingState {
  readonly step: number;
  readonly pose: WalkingPathPoint;
  readonly heading: number;
  readonly done: boolean;
}
export interface WalkingObservedPose extends WalkingPathPoint {
  readonly heading: number;
}
/** One interval of the existing geometric update, not a gait admission.
 * Times are relative to this call. Endpoints are detached, deeply frozen copies.
 * `unspent` is only the existing <= 1e-12 s loop remainder. A completed path
 * records a `done` remainder. Neither spends distance or advances source state.
 * Floating-point time boundaries are clipped to [0, dt]; an operation rounded
 * to zero duration can still retain a changed pose or heading.
 */
export interface WalkingAdvanceInterval {
  readonly mode: "move" | "turn-unverified" | "held" | "done" | "unspent";
  readonly step: number;
  readonly fromTimeSeconds: number;
  readonly toTimeSeconds: number;
  readonly fromPose: WalkingObservedPose;
  readonly toPose: WalkingObservedPose;
  readonly physicalDistanceM: number;
  readonly sourceDistanceM: number;
  readonly heldBy?: string;
}
/** Called once after the calculation, including any zero-motion remainder.
 * The callback cannot alter the calculation through its detached argument.
 * A callback exception propagates; this function then returns no result.
 */
export type WalkingAdvanceObserver = (intervals: readonly WalkingAdvanceInterval[]) => void;
function observedPose(pose: WalkingPathPoint, heading: number): WalkingObservedPose {
  return Object.freeze({ ...pose, heading, support: Object.freeze({
    position: Object.freeze({ ...pose.support.position }),
    normal: Object.freeze({ ...pose.support.normal }),
    surface: Object.freeze({ ...pose.support.surface }),
  }) });
}
export interface WalkingForbiddenArea { readonly ownerId: string; readonly x: number; readonly z: number; readonly radiusM: number }
export interface WalkingAuthority {
  /** The caller's same-tick occurrence-resolved route station. Its earliest
   * physical preimage holds further progress, including a constant-source join. */
  readonly sourceHoldM?: number;
  /** All applicable unheld physical primitives, including the next distinct owner. */
  readonly forbiddenAreas: readonly WalkingForbiddenArea[];
  readonly footprintWidthM: number;
  readonly footprintLengthM: number;
}
export function initialWalkingState(path: WalkingPath): WalkingState { return Object.freeze({ step: 0, pose: path.points[0]!, heading: path.initialHeading, done: path.steps.length === 0 }); }
function separation(area: WalkingForbiddenArea, p: Readonly<WorldPoint>, yaw: number, width: number, length: number): number {
  const dx = area.x - p.x, dz = area.z - p.z, c = Math.cos(yaw), s = Math.sin(yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - width / 2), Math.max(0, Math.abs(dx * s + dz * c) - length / 2)) - area.radiusM;
}
/** Conservative continuous advancement from the actual rectangle. The distance
 * field changes by at most translation + circumscribed-radius * yaw. It cannot
 * skip a collision between endpoints. The iteration bound can hold early. */
function safeFraction(a: Readonly<WorldPoint>, b: Readonly<WorldPoint>, yaw: number, angle: number, authority: WalkingAuthority): { fraction: number; ownerId?: string } {
  const bound = Math.hypot(b.x - a.x, b.z - a.z) + Math.hypot(authority.footprintWidthM, authority.footprintLengthM) / 2 * Math.abs(angle);
  if (bound <= 1e-14 || !authority.forbiddenAreas.length) return { fraction: 1 };
  let fraction = 0;
  for (let iteration = 0; iteration < 128; iteration++) {
    const p = { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, z: a.z + (b.z - a.z) * fraction };
    let gap = Infinity, ownerId = "";
    for (const area of authority.forbiddenAreas) {
      const value = separation(area, p, yaw + angle * fraction, authority.footprintWidthM, authority.footprintLengthM);
      if (value < gap) { gap = value; ownerId = area.ownerId; }
    }
    if (gap <= 1e-10) return { fraction, ownerId };
    if (gap / bound >= 1 - fraction) return { fraction: 1 };
    const advance = gap / bound;
    if (advance <= 1e-12) return { fraction, ownerId };
    fraction += advance;
  }
  return { fraction, ownerId: "conservative-sweep-budget" };
}

/** Lower inverse of the monotone source mapping. A source plateau begins at
 * its first physical point; choosing its last point would spend unheld motion.
 * A newly supplied hold behind the current pose stops there, never rewinds it. */
function physicalSourceHold(path: WalkingPath, sourceM: number): number {
  if (sourceM > path.points.at(-1)!.sourceM) return Infinity;
  let lo = 0, hi = path.points.length - 1;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (path.points[mid]!.sourceM < sourceM) lo = mid + 1; else hi = mid; }
  if (lo === 0) return path.points[0]!.physicalM;
  const a = path.points[lo - 1]!, b = path.points[lo]!;
  const fraction = (sourceM - a.sourceM) / (b.sourceM - a.sourceM);
  return a.physicalM + fraction * (b.physicalM - a.physicalM);
}

/** Geometric time accounting only. Turn output is explicitly unverified locomotion. */
export function advanceWalking(path: WalkingPath, state: WalkingState, dt: number, maxSpeedMps: number, maxYawRateRadps: number, authority: WalkingAuthority, observer?: WalkingAdvanceObserver): { state: WalkingState; physicalDistanceM: number; elapsedSeconds: number; turnSeconds: number; mode: "move" | "turn-unverified" | "held" | "done"; heldBy?: string } {
  if (!finitePositive(dt) || !finitePositive(maxSpeedMps) || !finitePositive(maxYawRateRadps) || !finitePositive(authority.footprintWidthM) || !finitePositive(authority.footprintLengthM)) throw new Error("Walking advance needs positive finite time, speed, yaw rate and actual footprint dimensions.");
  if (authority.sourceHoldM !== undefined && !Number.isFinite(authority.sourceHoldM)) throw new Error("Walking source hold must be a finite source station.");
  if (authority.forbiddenAreas.some(a => ![a.x, a.z, a.radiusM].every(Number.isFinite) || a.radiusM <= 0)) throw new Error("Walking forbidden areas need finite centers and positive radii.");
  const holdPhysicalM = authority.sourceHoldM === undefined ? Infinity : physicalSourceHold(path, authority.sourceHoldM);
  let step = state.step, pose = state.pose, heading = state.heading, time = dt, turnSeconds = 0;
  let mode: "move" | "turn-unverified" | "held" | "done" = state.done ? "done" : "held", heldBy: string | undefined;
  const intervals: WalkingAdvanceInterval[] | undefined = observer ? [] : undefined;
  const observe = (kind: WalkingAdvanceInterval["mode"], beforeTime: number, beforePose: WalkingPathPoint, beforeHeading: number) => {
    if (!intervals || (beforeTime === time && beforePose.physicalM === pose.physicalM && beforeHeading === heading)) return;
    intervals.push(Object.freeze({ mode: kind, step, fromTimeSeconds: Math.max(0, Math.min(dt, dt - beforeTime)), toTimeSeconds: Math.max(0, Math.min(dt, dt - time)), fromPose: observedPose(beforePose, beforeHeading), toPose: observedPose(pose, heading), physicalDistanceM: pose.physicalM - beforePose.physicalM, sourceDistanceM: pose.sourceM - beforePose.sourceM }));
  };
  for (let operations = 0; time > 1e-12 && step < path.steps.length; operations++) {
    if (operations > path.steps.length * 2 + 1) throw new Error("Walking advance did not progress through its finite path steps.");
    if (pose.physicalM >= holdPhysicalM - 1e-12) { heldBy = "source-hold"; mode = "held"; break; }
    const item = path.steps[step]!;
    if (item.kind === "turn") {
      const remaining = angleBetween(heading, item.toHeading);
      if (Math.abs(remaining) <= 1e-10) { step++; continue; }
      const requested = Math.sign(remaining) * Math.min(Math.abs(remaining), maxYawRateRadps * time);
      const sweep = safeFraction(pose, pose, heading, requested, authority), used = Math.abs(requested * sweep.fraction) / maxYawRateRadps;
      const beforeTime = time, beforeHeading = heading;
      heading += requested * sweep.fraction; time -= used; turnSeconds += used; mode = "turn-unverified";
      observe("turn-unverified", beforeTime, pose, beforeHeading);
      if (sweep.fraction < 1) { heldBy = sweep.ownerId; mode = "held"; break; }
      if (Math.abs(angleBetween(heading, item.toHeading)) <= 1e-10) step++;
      continue;
    }
    const remaining = item.to.physicalM - pose.physicalM;
    if (remaining <= 1e-12) { step++; continue; }
    let budget = Math.min(remaining, maxSpeedMps * time, Math.max(0, holdPhysicalM - pose.physicalM));
    const requested = sampleWalkingPath(path, pose.physicalM + budget), sweep = safeFraction(pose, requested, heading, 0, authority);
    budget *= sweep.fraction;
    const beforeTime = time, beforePose = pose;
    pose = sampleWalkingPath(path, pose.physicalM + budget);
    time -= budget / maxSpeedMps; mode = "move";
    observe("move", beforeTime, beforePose, heading);
    if (sweep.fraction < 1) { heldBy = sweep.ownerId; mode = "held"; break; }
    if (pose.physicalM >= holdPhysicalM - 1e-12) { heldBy = "source-hold"; mode = "held"; break; }
    if (remaining - budget <= 1e-12) step++;
  }
  const done = step >= path.steps.length;
  const result = { state: Object.freeze({ step, pose, heading, done }), physicalDistanceM: pose.physicalM - state.pose.physicalM, elapsedSeconds: dt - time, turnSeconds, mode: done ? "done" as const : mode, ...(heldBy ? { heldBy } : {}) };
  if (intervals && time > 0) intervals.push(Object.freeze({ mode: done ? "done" : heldBy !== undefined ? "held" : "unspent", step, fromTimeSeconds: Math.max(0, Math.min(dt, dt - time)), toTimeSeconds: dt, fromPose: observedPose(pose, heading), toPose: observedPose(pose, heading), physicalDistanceM: 0, sourceDistanceM: 0, ...(heldBy !== undefined ? { heldBy } : {}) }));
  if (observer) observer(Object.freeze(intervals!));
  return result;
}
