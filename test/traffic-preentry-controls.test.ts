/** Bound: pinned route (bus planner-ineligible since179), all three maximum bodies, actual authority calls
 * at its pre-entry stop. No motion, dynamic lane-change or ground-support claim. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { JunctionAdmissions, isCurrentHaltAuthorityView, type AdmissionRequest } from "../src/network/admissions.ts";
import { queryRouteHalts } from "../src/network/halts.ts";
import { footprintOccupies, vehicleEnvelope } from "../src/network/footprints.ts";
import { createBoundaryEntryPassage, type RoutePassage } from "../src/network/passages.ts";
import { createRouteVisits } from "../src/network/halts.ts";
import { RouteLibrary, vehicleRouteFootprint, vehicleRoutePose, vehicleScale, type PlannedRoute, type VehicleRouteBody } from "../src/agents/population/routes.ts";
import { RefusalCounts } from "../src/agents/population/status.ts";
import type { NetworkData } from "../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../src/world/agent-assets.ts";

const frozen = JSON.parse(readFileSync(new URL("./fixtures/traffic-preentry-stop.json", import.meta.url), "utf8")) as {
  provenance: { networkSha256: string; fleetSha256: string };
  seed: number; edgeIds: string[]; entryIndex: number; entryDistanceM: number; completedThrough: number;
  control: { routeIndex: number; distanceM: number; nodeIds: number[]; rule: string };
  classes: { id: string; scale: number; radius: number; stop: number; hold: number }[];
};
function pinned<T>(path: string, sha: string): T {
  const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
  expect(createHash("sha256").update(bytes).digest("hex"), `Restore reviewed ${path}; changed source requires review.`).toBe(sha);
  return JSON.parse(bytes.toString()) as T;
}
const network = pinned<NetworkData>("data/network/network.json", frozen.provenance.networkSha256);
const fleet = pinned<VehicleAssetManifest>("data/scene/agents/vehicles.json", frozen.provenance.fleetSha256);
const actorId = "preentry", generation = 1, step = .25;

function setup(classId: string, qualified = true) {
  const expected = frozen.classes.find(value => value.id === classId)!;
  const asset = fleet.vehicles.find(value => value.id === classId)!;
  const body: VehicleRouteBody = { asset, scale: vehicleScale(() => 1, asset), laneIndex: 0, frame: "population-upright" };
  const radius = vehicleEnvelope(asset, body.scale).diameter / 2;
  expect(body.scale).toBe(expected.scale); expect(radius).toBe(expected.radius);
  const library = new RouteLibrary(network, new RefusalCounts());
  const planned = library.planFrom(library.vehicleGraph, "vehicle", frozen.edgeIds[0]!, frozen.seed,
    { footprintRadiusM: radius, maxEdges: 120, walkAttempts: 3, vehicleBody: body });
  // The original 173 bus planner-positive is now refused: its 3 m lanes cannot
  // contain that generated body. Keep its unchanged direct authority inputs as
  // a logical-route regression, never as evidence of admitted bus driving.
  let route: PlannedRoute;
  if (classId === "bus") {
    const checked = library.validateVehicleCandidate(frozen.edgeIds, body);
    expect(checked.route).toBeNull(); expect(checked.reason).toMatch(/cannot contain bus/);
    const edges = frozen.edgeIds.map(id => network.lanes.find(edge => edge.id === id)!);
    const starts: number[] = []; let totalLengthM = 0;
    for (const edge of edges) { starts.push(totalLengthM); totalLengthM += edge.lengthM; }
    const passages = createRouteVisits(network, "vehicle", frozen.edgeIds);
    const logical = { entryEdgeId: frozen.edgeIds[0]!, edgeIds: Object.freeze([...frozen.edgeIds]), edges: Object.freeze(edges), starts: Object.freeze(starts), totalLengthM, passages,
      gates: Object.freeze(passages.map((p, passageIndex) => ({ passageIndex, entryIndex: p.entryIndex, entryEdgeId: frozen.edgeIds[p.entryIndex]!, junctionId: p.junctionId, gateDistanceM: starts[p.entryIndex]!, holdDistanceM: starts[p.entryIndex]! - radius, passageStarts: p.starts, controls: p.controls }))), speedLimits: Object.freeze(edges.map(edge => edge.speedMps)) };
    route = Object.freeze({ ...logical, boundaryEntryPassage: createBoundaryEntryPassage(network, "vehicle", frozen.edgeIds, vehicleRouteFootprint(logical, 0, body)) });
  } else {
    expect(planned.route, planned.reason).not.toBeNull();
    route = planned.route!;
  }
  expect(route.edgeIds).toEqual(frozen.edgeIds);
  const passage = route.passages.find(value => value.entryIndex === frozen.entryIndex)!;
  const control = passage.controls.find(value => value.nodeIds.includes(13302752096))!;
  expect(control).toEqual(frozen.control);
  expect(passage.starts[passage.entryIndex]).toBe(frozen.entryDistanceM);
  const stop = passage.starts[control.routeIndex]! + control.distanceM - radius;
  expect(stop).toBe(expected.stop); expect(stop).toBeLessThan(frozen.entryDistanceM);
  const admissions = new JunctionAdmissions(network);
  const request = (p: RoutePassage, distance: number, index = p.entryIndex, stoppedSeconds = 0): AdmissionRequest => ({
    actorId, kind: "vehicle", routeIdentity: route, generation, passage: p,
    entryEdgeId: route.edgeIds[index]!, routeIndex: index, footprint: vehicleRouteFootprint(route, distance, body),
    stoppedSeconds, yieldSatisfied: true, receivingSpace: true,
  });
  const observe = (distance: number) => {
    const pose = vehicleRoutePose(route, distance, 0);
    return admissions.observe(actorId, { routeIndex: pose.occurrence, distanceM: distance - route.starts[pose.occurrence]!, footprint: vehicleRouteFootprint(route, distance, body) });
  };
  const grant = (r: AdmissionRequest) => {
    for (let tick = 0; tick < 600; tick++) if (admissions.resolve(step, [r]).includes(actorId)) return;
    throw new Error("No actual grant in the bounded 150-second controller cycle.");
  };
  const release = (p: RoutePassage) => {
    for (let index = p.lastConflictIndex + 1; index < route.edges.length && !route.edges[index]!.junctionId; index++) {
      for (let local = 0; local <= route.edges[index]!.lengthM; local += .25) if (observe(route.starts[index]! + local)) return;
    }
    throw new Error(`Actual full-body release was not observed after occurrence ${p.lastConflictIndex}.`);
  };
  const visits = [...(route.boundaryEntryPassage ? [route.boundaryEntryPassage] : []),
    ...route.passages.filter(p => !route.boundaryEntryPassage || p.entryIndex > route.boundaryEntryPassage.lastConflictIndex)];
  for (const previous of visits) {
    if (previous === passage) break;
    grant(request(previous, Math.max(0, previous.starts[previous.entryIndex]! - radius)));
    for (const priorControl of previous.controls) {
      const distance = previous.starts[priorControl.routeIndex]! + priorControl.distanceM - radius;
      observe(distance);
      for (let tick = 1; tick <= 4; tick++) admissions.resolve(step, [request(previous, distance, priorControl.routeIndex, tick * step)]);
      expect(admissions.haltStateFor(actorId, route, generation).held!.unclearedControls).not.toContain(priorControl);
    }
    release(previous);
  }
  expect(admissions.haltStateFor(actorId, route, generation).completedThroughIndex).toBe(frozen.completedThrough);
  const atStop = (seconds = 0, distance = stop) => {
    const r = request(passage, distance, passage.entryIndex, seconds);
    if (!qualified) { delete r.routeIdentity; delete r.generation; }
    return r;
  };
  grant(atStop(0, expected.hold));
  const view = () => admissions.haltStateFor(actorId, route, generation);
  const query = (progressM = stop) => queryRouteHalts({ route, actorId, generation, progressM, radiusM: radius, authority: view() });
  return { admissions, route, body, radius, passage, control, stop, atStop, observe, release, view, query };
}

describe("mapped stop before passage entry (R169-1)", () => {
  expect(fleet.vehicles.map(asset => asset.id).sort()).toEqual(frozen.classes.map(row => row.id).sort());
  for (const { id } of frozen.classes) {
    it(`${id} clears the actual pre-entry stop only after measured dwell, then can enter and release`, () => {
      const s = setup(id);
      s.observe(s.stop);
      expect(vehicleRoutePose(s.route, s.stop, 0).occurrence).toBe(9);
      expect(s.atStop().routeIndex).toBe(10); // The origin has not entered the requested control occurrence.
      expect(footprintOccupies(network.junctions.find(j => j.id === s.passage.junctionId)!, vehicleRouteFootprint(s.route, s.stop, s.body))).toBe(false);
      expect(s.view().held!.entered).toBe(false);
      expect(s.query().control!.control).toBe(s.control);
      for (let tick = 1; tick <= 4; tick++) {
        s.observe(s.stop);
        const old = s.view();
        s.admissions.resolve(step, [s.atStop(tick * step)]);
        expect(isCurrentHaltAuthorityView(old)).toBe(false);
        expect(s.view().held!.entered).toBe(false); // Clearing does not fabricate entry.
        expect(s.view().held!.passage).toBe(s.passage);
        expect(s.view().generation).toBe(generation);
        if (tick < 4) expect(s.view().held!.unclearedControls).toContain(s.control);
      }
      expect(s.view().held!.unclearedControls, "Observed one-second dwell must clear the mapped line without requiring entry").not.toContain(s.control);
      expect(s.query().refusal).toBeNull(); expect(s.query().stopDistanceM).toBeGreaterThan(s.stop);
      expect(() => s.observe(s.stop + .01)).not.toThrow();
      s.release(s.passage);
      expect(s.view().held).toBeNull(); expect(s.view().completedThroughIndex).toBe(s.passage.lastConflictIndex);
    });

    it(`${id} retains the pre-entry stop without observation, away from the line, or without its eligibility`, () => {
      const s = setup(id);
      const retained = () => { expect(s.view().held!.entered).toBe(false); expect(s.view().held!.unclearedControls).toContain(s.control); };
      s.admissions.resolve(step, [s.atStop(2)]); retained(); // A grant/request footprint alone is not observation.
      s.observe(s.stop - .5);
      s.admissions.resolve(step, [s.atStop(2, s.stop - .5)]); retained();
      s.observe(s.stop);
      for (const request of [s.atStop(.75), { ...s.atStop(2), yieldSatisfied: false }, { ...s.atStop(2), receivingSpace: false }]) {
        s.admissions.resolve(step, [request]); retained();
        expect(s.query().stopDistanceM).toBe(s.stop);
      }
      const current = s.view();
      expect(() => s.admissions.resolve(step, [{ ...s.atStop(2), generation: generation + 1 }])).toThrow(/route identity or generation/);
      expect(() => s.admissions.resolve(step, [{ ...s.atStop(2), routeIdentity: Object.freeze({ ...s.route }) }])).toThrow(/route identity or generation/);
      expect(isCurrentHaltAuthorityView(current)).toBe(true);
      expect(() => s.observe(s.stop + .01)).toThrow(/mapped stop node\/13302752096/);
      expect(s.query(s.stop + .01).refusal).toMatch(/mapped stop node\/13302752096/);
      retained();
    });

    it(`${id} leaves an unqualified legacy holder's pre-entry behavior unchanged`, () => {
      const s = setup(id, false);
      s.observe(s.stop);
      for (let tick = 1; tick <= 8; tick++) s.admissions.resolve(step, [s.atStop(tick * step)]);
      expect(s.admissions.commitmentFor(actorId)!.entered).toBe(false);
      expect(s.view().held).toBeNull(); // No identity-qualified exemption can be obtained.
      expect(() => s.observe(s.stop + .01)).toThrow(/mapped stop node\/13302752096/);
    });
  }
});
