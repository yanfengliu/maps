/**
 * The passage window ends where the visit ends.
 *
 * The defect this file gates: `lastConflictIndex` was the last occurrence of the
 * compound anywhere before the next distinct authority, so a route that crossed a
 * compound, walked a corridor and crossed the same compound again held *one* lease
 * for the whole round trip. On the delivered walking graph that was
 * `pedestrian:308` holding `junction:walk:1009982019` for 282.7 s over an 8.6 m
 * crossing, with every other ask at that compound refused for 16,952 consecutive
 * ticks.
 *
 * The rule the class is checked against: an ungoverned stretch that is a run of two
 * or more sections is the outside a route walks through to leave and return, so the
 * visit ends before it; the single null section the contract's internal-gap clause
 * names stays inside the visit.
 *
 * Bound: one synthetic compound and one real `JunctionAdmissions`. This says nothing
 * about the delivered graph's geometry — `artifacts/passage-window/REPORT.md` carries
 * that measurement — and nothing about a corridor the graph happens to build as a
 * single section, which is the case the last two assertions pin.
 */
import { describe, expect, it } from "vitest";
import { groupCompounds } from "../tools/network/compounds.ts";
import { JunctionAdmissions, type AdmissionRequest } from "../src/network/admissions.ts";
import { createRoutePassage, type RoutePassage } from "../src/network/passages.ts";
import { headingAt, sampleEdge } from "../src/network/geometry.ts";
import type { Junction, LaneEdge, NetworkData } from "../src/world/network-data.ts";

const dt = 1 / 60;
const body = { lengthM: 4.6, widthM: 1.8 };

function makeJunction(id: string, z: number): Junction {
  return { id, controlKind: "reservation", controlSource: "mapped", position: { x: 0, y: 15, z }, radiusM: 2, vehicleGroups: [], pedestrianGroup: `${id}:pedestrian`, clearanceSeconds: 1, vehicleGreenSeconds: 2, pedestrianGreenSeconds: 2 };
}
function makeLane(id: string, start: number, end: number, owner: string | null, nextIds: string[]): LaneEdge {
  return { id, kind: "lane", from: `z${start}`, to: `z${end}`, points: [{ x: 0, y: 15, z: start }, { x: 0, y: 15, z: end }], lengthM: Math.abs(end - start), widthM: 3, sourceWayId: 1, nextIds, junctionId: owner, signalGroupId: null, speedMps: 8, leftLaneId: null, rightLaneId: null, entryRule: "priority", sourceControlNodeIds: [] };
}
/** One compound from two grouped authorities, a corridor of `corridor` ungoverned sections, and the way back in. */
function network(corridor: number): Pick<NetworkData, "junctions" | "lanes" | "walks"> {
  const lanes: LaneEdge[] = [makeLane("approach", -12, -2, null, ["a"]), makeLane("a", -2, 2, "a", ["gap"]), makeLane("gap", 2, 6, null, ["b"]), makeLane("b", 6, 10, "b", ["exit"])];
  const corridorIds = Array.from({ length: corridor }, (_, index) => `out${index + 1}`);
  for (const [index, id] of corridorIds.entries()) lanes.push(makeLane(id, 10 + index * 8, 18 + index * 8, null, [corridorIds[index + 1] ?? "a"]));
  lanes.push(makeLane("exit", 10, 22, null, []));
  const b = lanes.find((lane) => lane.id === "b")!;
  b.nextIds = ["exit", corridorIds[0]!];
  const junctions = groupCompounds([makeJunction("a", 0), makeJunction("b", 8)], lanes, []).junctions;
  return { junctions, lanes, walks: lanes.map((lane) => ({ ...lane, id: `walk:${lane.id}`, kind: lane.junctionId ? "crossing" : "sidewalk", nextIds: lane.nextIds.map((id) => `walk:${id}`) })) };
}
function at(p: RoutePassage, index: number, distanceM: number) {
  const edge = p.edges[index]!;
  return { routeIndex: index, distanceM, footprint: { position: sampleEdge(edge, distanceM), headingRadians: headingAt(edge, distanceM), ...body } };
}
function request(p: RoutePassage, index: number): AdmissionRequest {
  return { actorId: "v", kind: "vehicle", passage: p, entryEdgeId: p.edges[index]!.id, routeIndex: index, footprint: at(p, index, 0).footprint, stoppedSeconds: 1, yieldSatisfied: true, receivingSpace: true };
}
function obtain(c: JunctionAdmissions, p: RoutePassage): void {
  for (let tick = 0; tick < 60 * 180; tick += 1) if (c.resolve(dt, [request(p, p.entryIndex)]).includes("v")) return;
  throw new Error("No admission over 180 seconds.");
}
/** Walk the body from `from` to `to` along the passage, observing each sample. */
function drive(c: JunctionAdmissions, p: RoutePassage, from: number, to: number): boolean {
  let released = false;
  for (let index = from; index <= to; index += 1) {
    const edge = p.edges[index]!;
    for (let s = 0; s <= edge.lengthM; s += 0.25) { c.resolve(dt, []); released = c.observe("v", at(p, index, s)) || released; }
  }
  return released;
}

describe("the passage window ends where the visit ends", () => {
  it("ends a visit before a corridor the route leaves and returns along", () => {
    const n = network(3);
    const ids = ["approach", "a", "gap", "b", "out1", "out2", "out3", "a", "gap", "b", "exit"];
    const p = createRoutePassage(n, "vehicle", ids, 1);
    // The first visit ends at section 3. The delivered rule would read 9: the return
    // crossing 34 m and three ungoverned sections later.
    expect(p.lastConflictIndex).toBe(3);
    expect(ids.slice(4, 7).every((id) => n.lanes.find((lane) => lane.id === id)!.junctionId === null)).toBe(true);
    // The exit requirement is answered by the section that really follows the visit.
    expect(p.edges[4]!.junctionId).toBeNull();
  });

  it("releases the lease at the end of the visit instead of after the round trip", () => {
    const n = network(3);
    const c = new JunctionAdmissions(n);
    const p = createRoutePassage(n, "vehicle", ["approach", "a", "gap", "b", "out1", "out2", "out3", "a", "gap", "b", "exit"], 1);
    obtain(c, p);
    c.observe("v", at(p, 1, 0));
    expect(c.occupied(p.junctionId)).toBe(true);
    // Through the compound and out onto the corridor: released, because the visit is
    // over. The delivered rule held this lease for the whole corridor and the return.
    expect(drive(c, p, 1, 3)).toBe(false);
    expect(c.occupied(p.junctionId)).toBe(true);
    expect(drive(c, p, 4, 4)).toBe(true);
    expect(c.occupied(p.junctionId)).toBe(false);
    // The later crossing is a separate commitment, and the route's own passage for it
    // is legal on its own terms.
    const later = createRoutePassage(n, "vehicle", ["approach", "a", "gap", "b", "out1", "out2", "out3", "a", "gap", "b", "exit"], 7);
    expect(later.lastConflictIndex).toBe(9);
  });

  it("still refuses a route whose last occurrence is its own compound", () => {
    const n = network(3);
    expect(() => createRoutePassage(n, "vehicle", ["approach", "a", "gap", "b", "out1", "out2", "out3", "a"], 7)).toThrow(/outside exit section/);
  });

  it("keeps the single null section the internal-gap clause names inside the visit", () => {
    const n = network(1);
    const p = createRoutePassage(n, "vehicle", ["approach", "a", "gap", "b", "out1", "a", "gap", "b", "exit"], 1);
    // One ungoverned section between two primitives of one compound is an internal
    // gap: the commitment is retained through it, as `network-compound.test.ts` also
    // pins for a 52 m single-section loop.
    expect(p.lastConflictIndex).toBe(7);
    const c = new JunctionAdmissions(n);
    obtain(c, p);
    c.observe("v", at(p, 1, 0));
    expect(drive(c, p, 2, 4)).toBe(false);
    expect(c.occupied(p.junctionId)).toBe(true);
  });
});
