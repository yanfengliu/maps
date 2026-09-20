/**
 * Bound: analytic surface/path fixtures and exact mesh gaps/levels in this file.
 * Checks actual polyline arc independently, finite turn-time accounting, byte
 * binding and continuous rectangle sweep. Does not certify soles or city motion.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encodeMesh } from "../src/world/mesh.ts";
import type { WorldPoint, WalkEdge } from "../src/world/network-data.ts";
import type { PlannedRoute } from "../src/agents/population/routes.ts";
import { advanceWalking, buildWalkingPath, initialWalkingState, sampleWalkingPath } from "../src/agents/population/walking-path.ts";
import { walkingCorridorContains } from "../src/agents/population/walking-corridor.ts";
import { createWalkingSurfaceQuery, type BoundBytes, type WalkingContact, type WalkingSurfaceQuery, type WalkingSurfaceInputs } from "../src/agents/population/walking-surfaces.ts";

const bytes = (value: Uint8Array | string): BoundBytes => { const b = typeof value === "string" ? new TextEncoder().encode(value) : value; return { bytes: b, sha256: createHash("sha256").update(b).digest("hex") }; };
const hash = "a".repeat(64);
function route(paths: WorldPoint[][], offsets = paths.map(() => 0), widths = paths.map(() => 5)): PlannedRoute {
  let length = 0; const starts: number[] = [];
  const edges = paths.map((points, i): WalkEdge => {
    starts.push(length); const lengthM = points.slice(1).reduce((sum, p, k) => sum + Math.hypot(p.x - points[k]!.x, p.y - points[k]!.y, p.z - points[k]!.z), 0); length += lengthM;
    return { id: `e${i}`, kind: "sidewalk", from: `n${i}`, to: `n${i + 1}`, points, lengthM, widthM: widths[i]!, sourceWayId: 1, nextIds: i + 1 < paths.length ? [`e${i + 1}`] : [], junctionId: null, signalGroupId: null } as WalkEdge;
  });
  return { entryEdgeId: "e0", edgeIds: edges.map(e => e.id), edges, starts, totalLengthM: length, lateralOffsetsM: Float64Array.from(offsets), gates: [], passages: [], speedLimits: edges.map(() => 1) };
}
const point = (x: number, z: number, y = .22): WorldPoint => ({ x, y, z });
function analytic(height: (x: number, z: number) => number = () => 0): WalkingSurfaceQuery {
  const contact = (x: number, z: number): WalkingContact => ({ position: { x, y: height(x, z), z }, normal: { x: 0, y: 1, z: 0 }, surface: { mesh: "terrain", triangle: 0, sha256: hash } });
  return {
    binding: { fixture: "explicit-analytic-surface" },
    begin(source, at) { return { ok: true, value: { source, kind: "source-ground", anchor: contact(at.x, at.z), evidence: { networkSha256: hash, sourceFactsSha256: hash, sceneManifestSha256: hash, groundWayId: 1 } } }; },
    trace(_interval, from, to) { return { ok: true, value: [{ fraction: 0, contact: from }, { fraction: 1, contact: contact(to.x, to.z) }] }; },
  };
}
function construct(r: PlannedRoute, surfaces = analytic()) { const result = buildWalkingPath({ route: r, surfaces, maxSegmentM: .25, joinWindowM: .5 }); if (!result.ok) throw new Error(JSON.stringify(result.refusal)); return result.path; }
const free = { forbiddenAreas: [], footprintWidthM: .5, footprintLengthM: .5 };

describe("walking physical path", () => {
  it("requires an explicit support query and retains route/offset identities", () => {
    const r = route([[point(0, 0), point(0, 4)], [point(0, 4), point(4, 4)]], [.8, 1.9]);
    expect(() => buildWalkingPath({ route: r, surfaces: undefined as unknown as WalkingSurfaceQuery, maxSegmentM: .25, joinWindowM: .5 })).toThrow("explicit WalkingSurfaceQuery");
    const before = JSON.stringify(r), path = construct(r);
    expect(path.sourceRoute).toBe(r); expect(JSON.stringify(r)).toBe(before); expect(path.productionReady).toBe(false);
    expect(path.points[0]!.x).toBeCloseTo(.8, 12); expect(path.points.at(-1)!.x).toBeCloseTo(4, 12); expect(path.points.at(-1)!.z).toBeCloseTo(2.1, 12);
    expect(path.terminalHeading).toBeCloseTo(Math.PI / 2, 12);
  });
  it("fits Y before measuring 3D arc and supplies coherent interpolated support", () => {
    const path = construct(route([[point(0, 0), point(0, 4)]]), analytic((_x, z) => z * .5));
    expect(path.physicalLengthM).toBeCloseTo(Math.sqrt(20), 12);
    const pose = sampleWalkingPath(path, path.physicalLengthM * .37);
    expect(pose.y).toBeCloseTo(pose.z * .5, 12); expect(pose.support.position).toEqual({ x: pose.x, y: pose.y, z: pose.z });
    const step = advanceWalking(path, initialWalkingState(path), .3, 1, Math.PI, free);
    expect(step.physicalDistanceM).toBeCloseTo(.3, 12);
    expect(Math.hypot(step.state.pose.x, step.state.pose.y, step.state.pose.z)).toBeCloseTo(.3, 12);
  });
  it("covers width joins, internal kinks, near/exact reversals and short adjacent joins without radius exclusions", () => {
    for (const paths of [
      [[point(0, 0), point(0, 3)], [point(0, 3), point(0, 6)]],
      [[point(0, 0), point(0, 2), point(2, 2)]],
      [[point(0, 0), point(0, 2)], [point(0, 2), point(0, 0)]],
      [[point(0, 0), point(0, 2)], [point(0, 2), point(.001, 0)]],
      [[point(0, 0), point(0, .1)], [point(0, .1), point(.1, .1)], [point(.1, .1), point(.1, .2)]],
    ]) {
      const r = route(paths, paths.map((_, i) => .1 + .05 * i)), path = construct(r);
      expect(path.physicalLengthM).toBeGreaterThan(0);
      for (let i = 1; i < path.points.length; i++) expect(path.points[i]!.sourceM).toBeGreaterThanOrEqual(path.points[i - 1]!.sourceM - 1e-12);
      let state = initialWalkingState(path), elapsed = 0, turnTime = 0;
      for (let i = 0; i < 20000 && !state.done; i++) {
        const old = state, result = advanceWalking(path, state, 1 / 60, 1.2, Math.PI, free);
        expect(Math.hypot(result.state.pose.x - old.pose.x, result.state.pose.y - old.pose.y, result.state.pose.z - old.pose.z)).toBeLessThanOrEqual(1.2 / 60 + 1e-10);
        expect(Math.abs(Math.atan2(Math.sin(result.state.heading - old.heading), Math.cos(result.state.heading - old.heading)))).toBeLessThanOrEqual(Math.PI / 60 + 1e-10);
        state = result.state; elapsed += result.elapsedSeconds; turnTime += result.turnSeconds;
      }
      expect(state.done).toBe(true);
      expect(elapsed).toBeCloseTo(path.physicalLengthM / 1.2 + turnTime, 8);
      expect(state.pose.sourceM).toBeCloseTo(r.totalLengthM, 10);
    }
  });
  it("independently clips physical segment budgets and makes source-distance integration go red", () => {
    const path = construct(route([[point(0, 0), point(0, 4)], [point(0, 4), point(0, 8)]], [.1, 1.8]));
    let worstWrongRatio = 0;
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1]!, b = path.points[i]!, length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), source = b.sourceM - a.sourceM;
      if (source > 0) worstWrongRatio = Math.max(worstWrongRatio, length / source);
    }
    expect(worstWrongRatio).toBeGreaterThan(1.5);
    for (let k = 0; k < 80; k++) {
      const start = path.physicalLengthM * k / 81, budget = .03;
      let total = 0, consumed = 0; let expected: WorldPoint | undefined;
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1]!, b = path.points[i]!, length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const lo = Math.max(0, start - total), hi = Math.min(length, start + budget - total);
        if (hi >= lo && lo <= length && hi >= 0) { consumed += hi - lo; expected = { x: a.x + (b.x - a.x) * hi / length, y: a.y + (b.y - a.y) * hi / length, z: a.z + (b.z - a.z) * hi / length }; }
        total += length; if (total >= start + budget) break;
      }
      const actual = sampleWalkingPath(path, start + budget);
      expect(consumed).toBeCloseTo(budget, 10); expect(Math.hypot(actual.x - expected!.x, actual.y - expected!.y, actual.z - expected!.z)).toBeLessThan(1e-10);
    }
  });
  it("rejects a supported shortcut outside a narrow corner and keeps its source tip instead", () => {
    const r = route([[point(0, -10), point(0, 0)], [point(0, 0), point(10, 1)]], [0, 0], [.2, .2]);
    expect(walkingCorridorContains(point(0, -2), point(2, .2), r.edges)).toBe(false);
    const result = buildWalkingPath({ route: r, surfaces: analytic(), maxSegmentM: .25, joinWindowM: 2 });
    if (!result.ok) throw new Error(result.refusal.detail);
    expect(result.path.points.some(p => Math.hypot(p.x, p.z) < 1e-10)).toBe(true);
    expect(result.path.physicalLengthM).toBeCloseTo(r.totalLengthM, 10);
    const outside = buildWalkingPath({ route: route([[point(0, 0), point(0, 3)]], [2], [1]), surfaces: analytic(), maxSegmentM: .25, joinWindowM: .5 });
    expect(outside.ok).toBe(false); if (!outside.ok) expect(outside.refusal.reason).toBe("outside-corridor");
  });
  it("stops at the earlier source hold or actual swept rectangle contact", () => {
    const path = construct(route([[point(0, 0), point(0, 10)]]));
    const source = advanceWalking(path, initialWalkingState(path), 10, 2, Math.PI, { ...free, sourceHoldM: 2 });
    expect(source.state.pose.z).toBeCloseTo(2, 10); expect(source.heldBy).toBe("source-hold");
    const physical = advanceWalking(path, initialWalkingState(path), 10, 2, Math.PI, { ...free, sourceHoldM: 8, forbiddenAreas: [{ ownerId: "next-owner", x: 0, z: 4, radiusM: 1 }] });
    expect(physical.state.pose.z).toBeLessThanOrEqual(2.7500000001); expect(physical.state.pose.z).toBeGreaterThan(2.7499); expect(physical.heldBy).toBe("next-owner");
  });
  it.each([1.9, 2, 2.4, 3.1])("holds the earliest physical preimage of a constant-source join from %s m without backtracking", start => {
    // Review46 F26: the one-metre lateral connector is all at source station 2.
    // Its earliest physical preimage is 2 m, not its last point at 3 m.
    const result = buildWalkingPath({ route: route([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 4)]], [0, 1]), surfaces: analytic(), maxSegmentM: .2, joinWindowM: 0 });
    if (!result.ok) throw new Error(result.refusal.detail);
    const path = result.path, step = path.steps.findIndex(s => s.kind === "move" && s.from.physicalM <= start && s.to.physicalM > start);
    const item = path.steps[step]!; if (item.kind !== "move") throw new Error("Missing fixture move");
    const initial = { step, pose: sampleWalkingPath(path, start), heading: item.heading, done: false };
    const held = advanceWalking(path, initial, 20, 1, Math.PI, { ...free, sourceHoldM: 2 });
    expect(held.state.pose.physicalM).toBeCloseTo(Math.max(start, 2), 10);
    expect(held.physicalDistanceM).toBeCloseTo(Math.max(0, 2 - start), 10);
    expect(held.heldBy).toBe("source-hold");
    expect(advanceWalking(path, held.state, 20, 1, Math.PI, { ...free, sourceHoldM: 2 }).physicalDistanceM).toBe(0);
  });
  it("keeps an earlier rectangle hold independent of source pullback and releases the entire join when authority changes", () => {
    const result = buildWalkingPath({ route: route([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 4)]], [0, 1]), surfaces: analytic(), maxSegmentM: .2, joinWindowM: 0 });
    if (!result.ok) throw new Error(result.refusal.detail);
    const path = result.path, authority = { forbiddenAreas: [{ ownerId: "earlier-owner", x: 0, z: 1.6, radiusM: .1 }], footprintWidthM: .2, footprintLengthM: .2, sourceHoldM: 2 };
    const blocked = advanceWalking(path, initialWalkingState(path), 20, 1, Math.PI, authority);
    expect(blocked.heldBy).toBe("earlier-owner"); expect(blocked.state.pose.physicalM).toBeCloseTo(1.4, 8);
    const atSource = advanceWalking(path, initialWalkingState(path), 20, 1, Math.PI, { ...free, sourceHoldM: 2 });
    const released = advanceWalking(path, atSource.state, 20, 1, Math.PI, free);
    expect(released.state.done).toBe(true); expect(released.state.pose.physicalM).toBeCloseTo(5, 10);
    expect(released.physicalDistanceM).toBeCloseTo(3, 10);
  });
  it("accounts for a pivot that contacts a disk only between its endpoint yaws", () => {
    const r = route([[point(0, 0), point(0, 2)], [point(0, 2), point(0, 0)]], [0, 0]);
    const path = construct(r);
    const turnIndex = path.steps.findIndex(s => s.kind === "turn" && Math.abs(s.angle) > 3);
    const turn = path.steps[turnIndex]!; if (turn.kind !== "turn") throw new Error("Missing reversal");
    const initial = { step: turnIndex, pose: turn.at, heading: turn.fromHeading, done: false };
    const result = advanceWalking(path, initial, 2, 1, Math.PI, { forbiddenAreas: [{ ownerId: "side-owner", x: .9, z: turn.at.z, radiusM: .1 }], footprintWidthM: .2, footprintLengthM: 2 });
    expect(result.mode).toBe("held"); expect(result.heldBy).toBe("side-owner"); expect(result.physicalDistanceM).toBe(0);
    expect(result.state.pose.sourceM).toBe(initial.pose.sourceM); expect(result.state.heading).toBeGreaterThan(initial.heading); expect(result.state.heading).toBeLessThan(Math.PI / 2);
    const unheld = advanceWalking(path, initial, .2, 1, Math.PI, free);
    expect(unheld.mode).toBe("turn-unverified"); expect(unheld.turnSeconds).toBeCloseTo(.2, 10); expect(unheld.physicalDistanceM).toBe(0);
  });
});

function mesh(rects: readonly { x0: number; x1: number; z0: number; z1: number; y: number }[]): BoundBytes {
  const positions: number[] = [], indices: number[] = [];
  for (const r of rects) { const i = positions.length / 3; positions.push(r.x0, r.y, r.z0, r.x1, r.y, r.z0, r.x1, r.y, r.z1, r.x0, r.y, r.z1); indices.push(i, i + 1, i + 2, i, i + 2, i + 3); }
  return bytes(encodeMesh({ header: { version: 1, name: "fixture", vertexCount: positions.length / 3, triangleCount: indices.length / 3, bounds: { min: [-20, -20, -20], max: [20, 20, 20] } }, positions: Float32Array.from(positions), normals: new Float32Array(positions.length), indices: Uint32Array.from(indices) }));
}
const rect = (x0: number, x1: number, y: number) => ({ x0, x1, z0: -10, z1: 10, y });
function inputs(options: { roads?: BoundBytes; pavements?: BoundBytes; terrain?: BoundBytes; caps?: number; tags?: Record<string, string>; historical?: string } = {}): WalkingSurfaceInputs {
  const osm = bytes(JSON.stringify({ osm3s: { timestamp_osm_base: "2026-09-19" }, elements: [{ type: "way", id: 1, nodes: [1, 2], tags: options.tags ?? { highway: "footway" } }] }));
  return { roads: options.roads ?? mesh([rect(-10, 10, .2)]), pavements: options.pavements ?? mesh([]), terrain: options.terrain ?? mesh([rect(-10, 10, 0)]), sceneManifest: bytes(JSON.stringify({ terrain: { triangleCount: 2, capTriangleCount: options.caps ?? 0 } })), osm, networkSha256: hash, historicalNetworkOsmSha256: options.historical ?? osm.sha256, maxAnchorResidualM: .75 };
}
const context = { occurrence: 0, edgeId: "walk:1", sourceWayId: 1, sourceY: .225 };
describe("walking local surface selection", () => {
  it("verifies bytes, metadata and preserves historical source mismatch explicitly", async () => {
    const supplied = inputs({ historical: "b".repeat(64) }), query = await createWalkingSurfaceQuery(supplied);
    expect(query.binding.sourceEligibilityStatus).toContain("historical-eligibility-unverified");
    await expect(createWalkingSurfaceQuery({ ...supplied, roads: { ...supplied.roads, sha256: "c".repeat(64) } })).rejects.toThrow("Supply matching input bytes");
    await expect(createWalkingSurfaceQuery({ ...supplied, sceneManifest: bytes('{"terrain":{"triangleCount":3,"capTriangleCount":0}}') })).rejects.toThrow("source/cap counts disagree");
  });
  it("keeps byte identity and source inputs stable across asynchronous hashing", async () => {
    const supplied = inputs(), expected = supplied.roads.sha256, pending = createWalkingSurfaceQuery(supplied);
    supplied.roads.bytes.fill(0);
    Object.assign(supplied.roads, { sha256: "c".repeat(64) });
    Object.assign(supplied, { networkSha256: "d".repeat(64), maxAnchorResidualM: 1e-10 });
    const query = await pending, opened = query.begin(context, { x: 0, z: 0 });
    expect(query.binding.roadsSha256).toBe(expected); expect(query.binding.networkSha256).toBe(hash);
    expect(opened.ok).toBe(true); if (opened.ok) expect(opened.value.anchor.surface.sha256).toBe(expected);
  });
  it("retains a road sheet and reports a submillimetre gap instead of snapping 0.2 m to terrain", async () => {
    const query = await createWalkingSurfaceQuery(inputs({ roads: mesh([rect(-10, -.0001, .2), rect(.0001, 10, .2)]) }));
    const opened = query.begin(context, { x: -1, z: 0 }); expect(opened.ok).toBe(true); if (!opened.ok) return;
    expect(opened.value.kind).toBe("road-pavement");
    const traced = query.trace(opened.value, opened.value.anchor, point(1, 0, .225), .225);
    expect(traced.ok).toBe(false); if (!traced.ok) { expect(traced.refusal.reason).toBe("missing-support"); expect(traced.refusal.detail).toContain("seam-foot proof"); }
  });
  it("accepts eligible source ground below an unrelated higher road", async () => {
    const query = await createWalkingSurfaceQuery(inputs({ roads: mesh([rect(-10, 10, 1.95)]) }));
    const opened = query.begin(context, { x: -1, z: 0 }); expect(opened.ok).toBe(true); if (!opened.ok) return;
    expect(opened.value.kind).toBe("source-ground"); expect(opened.value.anchor.position.y).toBe(0);
    expect(query.trace(opened.value, opened.value.anchor, point(1, 0), .225).ok).toBe(true);
  });
  it.each([{ bridge: "yes" }, { tunnel: "yes" }, { level: "1" }, { layer: "1" }, { access: "private" }])("does not infer source ground from excluded way tags %j", async tags => {
    const query = await createWalkingSurfaceQuery(inputs({ roads: mesh([]), tags: { highway: "footway", ...tags } }));
    const opened = query.begin(context, { x: 0, z: 0 }); expect(opened.ok).toBe(false); if (!opened.ok) expect(opened.refusal.reason).toBe("source-ground-unverified");
  });
  it("excludes authored cap triangles even when they are the only support", async () => {
    const query = await createWalkingSurfaceQuery(inputs({ roads: mesh([]), caps: 2 }));
    const opened = query.begin(context, { x: 0, z: 0 }); expect(opened.ok).toBe(false); if (!opened.ok) expect(opened.refusal.reason).toBe("missing-support");
  });
  it("reports ambiguous anchor levels and an actual sheet-height step", async () => {
    const ambiguous = await createWalkingSurfaceQuery(inputs({ roads: mesh([rect(-10, 10, .5), rect(-10, 10, -.5)]), terrain: mesh([rect(-10, 10, -2)]) }));
    const opened = ambiguous.begin({ ...context, sourceY: 0 }, { x: 0, z: 0 }); expect(opened.ok).toBe(false); if (!opened.ok) expect(opened.refusal.reason).toBe("ambiguous-level");
    const stepped = await createWalkingSurfaceQuery(inputs({ roads: mesh([rect(-10, 0, .2), rect(0, 10, .4)]) }));
    const start = stepped.begin(context, { x: -1, z: 0 }); if (!start.ok) throw new Error(start.refusal.detail);
    const trace = stepped.trace(start.value, start.value.anchor, point(1, 0, .425), .225); expect(trace.ok).toBe(false); if (!trace.ok) expect(trace.refusal.reason).toBe("level-change");
  });
  it("finds a narrow road cover inside a long ground triangle segment", async () => {
    const query = await createWalkingSurfaceQuery(inputs({ roads: mesh([rect(.1, .2, .2)]) }));
    const opened = query.begin(context, { x: -1, z: 0 }); if (!opened.ok) throw new Error(opened.refusal.detail);
    const trace = query.trace(opened.value, opened.value.anchor, point(1, 0), .225); expect(trace.ok).toBe(false); if (!trace.ok) expect(trace.refusal.reason).toBe("ground-covered");
  });
});
