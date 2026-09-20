/** Read-only F26 interval contract on finite analytic routes and authorities.
 * These cases preserve the legacy output and account for every tick interval,
 * including constant-source movement, geometric turns and held/done remainders.
 * They do not admit gait, foot contact, source policy or city/population motion.
 */
import { serialize } from "node:v8";
import { describe, expect, it } from "vitest";
import { advanceWalking, buildWalkingPath, initialWalkingState, sampleWalkingPath, type WalkingAdvanceInterval, type WalkingAuthority, type WalkingPath, type WalkingState } from "../src/agents/population/walking-path.ts";
import type { WalkingContact, WalkingSurfaceQuery } from "../src/agents/population/walking-surfaces.ts";
import type { PlannedRoute } from "../src/agents/population/routes.ts";
import type { WalkEdge, WorldPoint } from "../src/world/network-data.ts";

const point = (x: number, z: number, y = .22): WorldPoint => ({ x, y, z });
const hash = "a".repeat(64);
const free: WalkingAuthority = { forbiddenAreas: [], footprintWidthM: .5, footprintLengthM: .5 };
function construct(paths: WorldPoint[][], offsets = paths.map(() => 0), joinWindowM = 0, height = (_x: number, _z: number) => 0): WalkingPath {
  let length = 0;
  const starts: number[] = [];
  const edges = paths.map((points, i): WalkEdge => {
    starts.push(length);
    const lengthM = points.slice(1).reduce((sum, p, k) => sum + Math.hypot(p.x - points[k]!.x, p.y - points[k]!.y, p.z - points[k]!.z), 0);
    length += lengthM;
    return { id: `e${i}`, kind: "sidewalk", from: `n${i}`, to: `n${i + 1}`, points, lengthM, widthM: 5, sourceWayId: 1, nextIds: i + 1 < paths.length ? [`e${i + 1}`] : [], junctionId: null, signalGroupId: null } as WalkEdge;
  });
  const route: PlannedRoute = { entryEdgeId: "e0", edgeIds: edges.map(e => e.id), edges, starts, totalLengthM: length, lateralOffsetsM: Float64Array.from(offsets), gates: [], passages: [], speedLimits: edges.map(() => 1) };
  const contact = (x: number, z: number): WalkingContact => ({ position: { x, y: height(x, z), z }, normal: { x: 0, y: 1, z: 0 }, surface: { mesh: "terrain", triangle: 0, sha256: hash } });
  const surfaces: WalkingSurfaceQuery = {
    binding: { fixture: "explicit-analytic-surface" },
    begin(source, at) { return { ok: true, value: { source, kind: "source-ground", anchor: contact(at.x, at.z), evidence: { networkSha256: hash, sourceFactsSha256: hash, sceneManifestSha256: hash, groundWayId: 1 } } }; },
    trace(_interval, from, to) { return { ok: true, value: [{ fraction: 0, contact: from }, { fraction: 1, contact: contact(to.x, to.z) }] }; },
  };
  const built = buildWalkingPath({ route, surfaces, maxSegmentM: .2, joinWindowM });
  if (!built.ok) throw new Error(built.refusal.detail);
  return built.path;
}
function observe(path: WalkingPath, state: WalkingState, dt: number, speed = 1, yawRate = Math.PI, authority = free) {
  const without = advanceWalking(path, state, dt, speed, yawRate, authority);
  let calls = 0, intervals: readonly WalkingAdvanceInterval[] = [];
  const result = advanceWalking(path, state, dt, speed, yawRate, authority, value => { calls++; intervals = value; });
  // V8 serialization retains exact Number bits, including signed zero.
  expect(serialize(result).equals(serialize(without))).toBe(true);
  expect(calls).toBe(1);
  expect(intervals.length).toBeGreaterThan(0);
  expect(intervals[0]!.fromTimeSeconds).toBe(0);
  expect(intervals.at(-1)!.toTimeSeconds).toBe(dt);
  expect(Object.isFrozen(intervals)).toBe(true);
  let duration = 0, physical = 0, source = 0;
  for (let i = 0; i < intervals.length; i++) {
    const item = intervals[i]!;
    expect(item.fromTimeSeconds).toBe(i ? intervals[i - 1]!.toTimeSeconds : 0);
    expect(item.toTimeSeconds).toBeGreaterThanOrEqual(item.fromTimeSeconds);
    if (i) expect(item.fromPose).toEqual(intervals[i - 1]!.toPose);
    expect(item.physicalDistanceM).toBe(item.toPose.physicalM - item.fromPose.physicalM);
    expect(item.sourceDistanceM).toBe(item.toPose.sourceM - item.fromPose.sourceM);
    expect(item.physicalDistanceM).toBeGreaterThanOrEqual(0);
    expect(item.sourceDistanceM).toBeGreaterThanOrEqual(0);
    duration += item.toTimeSeconds - item.fromTimeSeconds;
    physical += item.physicalDistanceM; source += item.sourceDistanceM;
    for (const p of [item.fromPose, item.toPose]) {
      for (const value of [item, p, p.support, p.support.position, p.support.normal, p.support.surface]) expect(Object.isFrozen(value)).toBe(true);
    }
    if (item.mode === "held" || item.mode === "done" || item.mode === "unspent") {
      expect(item.fromPose).toEqual(item.toPose);
      expect(item.physicalDistanceM).toBe(0); expect(item.sourceDistanceM).toBe(0);
    }
  }
  expect(duration).toBeCloseTo(dt, 13);
  expect(physical).toBeCloseTo(result.physicalDistanceM, 13);
  expect(source).toBeCloseTo(result.state.pose.sourceM - state.pose.sourceM, 13);
  expect(intervals[0]!.fromPose).toEqual({ ...state.pose, heading: state.heading });
  expect(intervals.at(-1)!.toPose).toEqual({ ...result.state.pose, heading: result.state.heading });
  return { result, intervals };
}
function at(path: WalkingPath, distance: number): WalkingState {
  const step = path.steps.findIndex(s => s.kind === "move" && s.from.physicalM <= distance && s.to.physicalM > distance);
  const item = path.steps[step]!;
  if (item.kind !== "move") throw Error("Missing fixture move");
  return { step, pose: sampleWalkingPath(path, distance), heading: item.heading, done: false };
}

describe("walking ordered observer", () => {
  it("retains actual move, turn, move and held order within one fixed tick", () => {
    const path = construct([[point(0, 0), point(0, .004)], [point(0, .004), point(.004, .004)]]);
    // .004 s travel, .005 s geometric pivot, .002 s travel, then hold.
    const { result, intervals } = observe(path, initialWalkingState(path), 1 / 60, 1, Math.PI * 100, { ...free, sourceHoldM: .006 });
    expect(intervals.map(x => x.mode)).toEqual(["move", "turn-unverified", "move", "held"]);
    for (const [i, expected] of [.004, .009, .011, 1 / 60].entries()) expect(intervals[i]!.toTimeSeconds).toBeCloseTo(expected, 13);
    expect(intervals[1]!.fromPose.heading).toBe(0);
    expect(intervals[1]!.toPose.heading).toBe(Math.PI / 2);
    expect(intervals[2]!.fromPose.sourceM).toBe(.004);
    expect(intervals[3]!.heldBy).toBe("source-hold");
    expect(result.elapsedSeconds).toBe(.011);
    expect(result.physicalDistanceM).toBe(.006);
  });
  it.each([1.9, 2, 2.4, 3.1])("keeps plateau source holds and no rewind from %s m", start => {
    const path = construct([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 4)]], [0, 1]);
    const { result, intervals } = observe(path, at(path, start), 20, 1, Math.PI, { ...free, sourceHoldM: 2 });
    expect(result.state.pose.physicalM).toBeCloseTo(Math.max(start, 2), 10);
    expect(intervals.at(-1)!.mode).toBe("held"); expect(intervals.at(-1)!.heldBy).toBe("source-hold");
    const held = observe(path, result.state, 1 / 60, 1, Math.PI, { ...free, sourceHoldM: 2 });
    expect(held.intervals.map(x => x.mode)).toEqual(["held"]);
    expect(held.result.physicalDistanceM).toBe(0);
  });
  it("retains real constant-source travel on release and a done remainder", () => {
    const path = construct([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 4)]], [0, 1]);
    const held = observe(path, initialWalkingState(path), 20, 1, Math.PI, { ...free, sourceHoldM: 2 });
    const released = observe(path, held.result.state, 20);
    const plateau = released.intervals.filter(x => x.mode === "move" && x.sourceDistanceM === 0);
    expect(plateau.length).toBeGreaterThan(0);
    expect(plateau.reduce((sum, x) => sum + x.physicalDistanceM, 0)).toBeCloseTo(1, 12);
    expect(released.result.physicalDistanceM).toBeCloseTo(3, 12);
    expect(released.intervals.at(-1)!.mode).toBe("done");
    expect(observe(path, released.result.state, 1 / 60).intervals.map(x => x.mode)).toEqual(["done"]);
  });
  it("retains an earlier physical hold and its independent source limit", () => {
    const path = construct([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 4)]], [0, 1]);
    const authority = { forbiddenAreas: [{ ownerId: "earlier-owner", x: 0, z: 1.6, radiusM: .1 }], footprintWidthM: .2, footprintLengthM: .2, sourceHoldM: 2 };
    const blocked = observe(path, initialWalkingState(path), 20, 1, Math.PI, authority);
    expect(blocked.result.state.pose.physicalM).toBeCloseTo(1.4, 8);
    expect(blocked.intervals.at(-1)!.heldBy).toBe("earlier-owner");
    expect(blocked.intervals.at(-1)!.fromTimeSeconds).toBe(blocked.result.elapsedSeconds);
  });
  it("observes the rotating footprint's partial pivot before the held remainder", () => {
    const path = construct([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 0)]]);
    const step = path.steps.findIndex(s => s.kind === "turn" && Math.abs(s.angle) > 3), turn = path.steps[step]!;
    if (turn.kind !== "turn") throw Error("Missing fixture reversal");
    const state = { step, pose: turn.at, heading: turn.fromHeading, done: false };
    const authority = { forbiddenAreas: [{ ownerId: "side-owner", x: .9, z: turn.at.z, radiusM: .1 }], footprintWidthM: .2, footprintLengthM: 2 };
    const { result, intervals } = observe(path, state, 2, 1, Math.PI, authority);
    expect(intervals.map(x => x.mode)).toEqual(["turn-unverified", "held"]);
    expect(intervals[0]!.toTimeSeconds).toBe(result.turnSeconds);
    expect(intervals[0]!.toPose.heading).toBeGreaterThan(state.heading);
    expect(intervals[0]!.toPose.heading).toBeLessThan(Math.PI / 2);
    expect(intervals[1]!.heldBy).toBe("side-owner");
  });
  it("covers the existing loop tolerance without manufacturing movement", () => {
    const path = construct([[point(0, 0), point(0, 1)]]);
    const { result, intervals } = observe(path, initialWalkingState(path), 5e-13);
    expect(intervals.map(x => x.mode)).toEqual(["unspent"]);
    expect(result.elapsedSeconds).toBe(0); expect(result.physicalDistanceM).toBe(0);
  });
  it("clips only recorded time roundoff and preserves the original elapsed value", () => {
    const path = construct([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 0)]]);
    const step = path.steps.findIndex(s => s.kind === "turn" && Math.abs(s.angle) > 3), turn = path.steps[step]!;
    if (turn.kind !== "turn") throw Error("Missing fixture reversal");
    const { result, intervals } = observe(path, { step, pose: turn.at, heading: turn.fromHeading, done: false }, .1, 1, .025);
    expect(result.elapsedSeconds).toBe(.10000000000000002);
    expect(intervals.map(x => x.mode)).toEqual(["turn-unverified"]);
    expect(intervals[0]!.toTimeSeconds).toBe(.1);
    expect(intervals[0]!.toPose.heading).toBe(result.state.heading);
  });
  it("observes a physical hold even when its supplied owner name is empty", () => {
    const path = construct([[point(0, 0), point(0, 2)]]);
    const authority = { ...free, forbiddenAreas: [{ ownerId: "", x: 0, z: 1, radiusM: .1 }] };
    const { result, intervals } = observe(path, initialWalkingState(path), 2, 1, Math.PI, authority);
    expect(result.mode).toBe("held");
    expect(intervals.at(-1)!.mode).toBe("held"); expect(intervals.at(-1)!.heldBy).toBe("");
  });
  it("keeps old returns exact across finite fixed-step joins and slope controls", () => {
    const fixtures = [
      construct([[point(0, 0), point(0, 1)]], [0], 0, (_x, z) => z * .5),
      construct([[point(0, 0), point(0, 1)], [point(0, 1), point(1, 1)]], [.1, .2], .2),
      construct([[point(0, 0), point(0, 1)], [point(0, 1), point(0, 0)]]),
    ];
    for (const path of fixtures) {
      let state = initialWalkingState(path), ticks = 0;
      for (; ticks < 600 && !state.done; ticks++) state = observe(path, state, 1 / 60, 1.2).result.state;
      expect(state.done).toBe(true); expect(ticks).toBeGreaterThan(0);
    }
  });
  it("gives the observer no mutable aliases into the path, input state or return", () => {
    const path = construct([[point(0, 0), point(0, 1)]]), state = initialWalkingState(path);
    const before = serialize({ path, state });
    let received: readonly WalkingAdvanceInterval[] = [];
    const result = advanceWalking(path, state, .2, 1, Math.PI, free, intervals => {
      received = intervals;
      expect(() => Object.assign(intervals, { 0: null })).toThrow(TypeError);
      for (const pose of [intervals[0]!.fromPose, intervals[0]!.toPose]) {
        expect(() => Object.assign(pose, { x: 10 })).toThrow(TypeError);
        expect(() => Object.assign(pose.support, { position: null })).toThrow(TypeError);
        expect(() => Object.assign(pose.support.position, { x: 10 })).toThrow(TypeError);
        expect(() => Object.assign(pose.support.normal, { y: 10 })).toThrow(TypeError);
        expect(() => Object.assign(pose.support.surface, { triangle: 10 })).toThrow(TypeError);
      }
    });
    expect(serialize({ path, state }).equals(before)).toBe(true);
    expect(serialize(result).equals(serialize(advanceWalking(path, state, .2, 1, Math.PI, free)))).toBe(true);
    for (const observed of [received[0]!.fromPose, received[0]!.toPose]) {
      for (const source of [state.pose, result.state.pose, ...path.points]) {
        expect(observed).not.toBe(source); expect(observed.support).not.toBe(source.support);
        expect(observed.support.position).not.toBe(source.support.position);
        expect(observed.support.normal).not.toBe(source.support.normal);
        expect(observed.support.surface).not.toBe(source.support.surface);
      }
    }
  });
  it("propagates an observer exception after calculation without mutating inputs", () => {
    const path = construct([[point(0, 0), point(0, 1)]]), state = initialWalkingState(path), before = serialize({ path, state });
    const failure = Error("observer refused its own record");
    expect(() => advanceWalking(path, state, .2, 1, Math.PI, free, () => { throw failure; })).toThrow(failure);
    expect(serialize({ path, state }).equals(before)).toBe(true);
  });
});
