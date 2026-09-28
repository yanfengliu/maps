/** Bound: pinned178 source witnesses plus 120 vehicles/20 s at seed0x5b1b0a.
 * Current-body clearance is conservative, not future-trajectory or support proof.
 * Bus logical passages below are deliberately planner-ineligible after body fit. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createPopulation } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { createSlotTable, placeSlot } from "../src/agents/population/slots.ts";
import { RouteLibrary, vehicleRouteFootprint, vehicleScale, type PlannedRoute, type VehicleRouteBody } from "../src/agents/population/routes.ts";
import { RefusalCounts } from "../src/agents/population/status.ts";
import { hasReceivingSpace, placeVehicle, vehicleFootprint } from "../src/agents/population/vehicles.ts";
import { hasVehicleEntrySpace, hasVehiclePassageSpace } from "../src/agents/population/vehicle-clearance.ts";
import { JunctionAdmissions, type AdmissionRequest } from "../src/network/admissions.ts";
import { createBoundaryEntryPassage } from "../src/network/passages.ts";
import { createRouteVisits } from "../src/network/halts.ts";
import { footprintOccupies, vehicleEnvelope } from "../src/network/footprints.ts";
import { overlappingPairs, vehicleBoxes } from "../tools/agents/spacing-metrics.ts";
import type { NetworkData } from "../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../src/world/agent-assets.ts";

interface WitnessActor { slot: number; variant: number; scale: number; position: [number, number, number]; yaw: number; travelledM: number; edgeIds: string[] }
const fixture = JSON.parse(readFileSync(new URL("./fixtures/vehicle-clearance.json", import.meta.url), "utf8")) as {
  provenance: { networkSha256: string; fleetSha256: string };
  lane: { actor: WitnessActor };
  entry: { actors: WitnessActor[] };
  turn: { request: AdmissionRequest; actors: (WitnessActor & { route: { edgeIds: string[] } })[] };
};
function pinned<T>(file: string, sha: string): T {
  const bytes = readFileSync(new URL(`../${file}`, import.meta.url));
  expect(createHash("sha256").update(bytes).digest("hex"), `Restore reviewed ${file}; changed source needs review.`).toBe(sha);
  return JSON.parse(bytes.toString()) as T;
}
const network = pinned<NetworkData>("data/network/network.json", fixture.provenance.networkSha256);
const fleet = pinned<VehicleAssetManifest>("data/scene/agents/vehicles.json", fixture.provenance.fleetSha256);
const settings = populationSettings({ pedestrians: 0, vehicles: 2, seed: 0x5b1b0a });
function logical(ids: readonly string[], body: VehicleRouteBody): PlannedRoute {
  const edges = ids.map(id => network.lanes.find(e => e.id === id)!);
  const starts: number[] = []; let totalLengthM = 0;
  for (const edge of edges) { starts.push(totalLengthM); totalLengthM += edge.lengthM; }
  const passages = createRouteVisits(network, "vehicle", ids), radius = vehicleEnvelope(body.asset, body.scale).diameter / 2;
  const route = Object.freeze({ entryEdgeId: ids[0]!, edgeIds: Object.freeze([...ids]), edges: Object.freeze(edges), starts: Object.freeze(starts), totalLengthM, passages,
    gates: Object.freeze(passages.map((p, passageIndex) => ({ passageIndex, entryIndex: p.entryIndex, entryEdgeId: ids[p.entryIndex]!, junctionId: p.junctionId, gateDistanceM: starts[p.entryIndex]!, holdDistanceM: starts[p.entryIndex]! - radius, passageStarts: p.starts, controls: p.controls }))), speedLimits: Object.freeze(edges.map(e => e.speedMps)) });
  return Object.freeze({ ...route, boundaryEntryPassage: createBoundaryEntryPassage(network, "vehicle", ids, vehicleRouteFootprint(route, 0, body)) });
}
function pairTable() {
  const table = createSlotTable(settings);
  for (const [slot, a] of fixture.entry.actors.entries()) {
    Object.assign(table.vehicles[slot]!, { variant: a.variant, scale: a.scale });
    table.poses.vehicles.variant[slot] = a.variant; table.poses.vehicles.scale[slot] = a.scale;
    placeSlot(table.poses.vehicles, slot, { x: a.position[0], y: a.position[1], z: a.position[2] }, a.yaw);
    table.poses.vehicles.active[slot] = 1;
  }
  return table;
}
function turnTable(variant = 2) {
  const table = createSlotTable(settings), bus = fixture.turn.actors.find(a => a.slot === 49)!, kei = fixture.turn.actors.find(a => a.slot === 0)!;
  const scale = variant === 2 ? fixture.turn.request.footprint.vehicle!.scale : 1;
  const body: VehicleRouteBody = { asset: fleet.vehicles[variant]!, scale, laneIndex: 0, frame: "population-upright" };
  const route = logical(bus.route.edgeIds, body), passage = route.boundaryEntryPassage!;
  Object.assign(table.vehicles[0]!, { variant, scale }); table.vehicleRoutes[0] = route;
  placeVehicle(table, 0, 0); table.poses.vehicles.active[0] = 1;
  Object.assign(table.vehicles[1]!, { variant: 0, scale: kei.scale });
  table.vehicleRoutes[1] = logical(kei.route.edgeIds, { asset: fleet.vehicles[0]!, scale: kei.scale, laneIndex: 0, frame: "population-upright" });
  placeVehicle(table, 1, kei.travelledM); table.vehicles[1]!.travelledM = kei.travelledM; table.poses.vehicles.active[1] = 1;
  const clear = (pending: ReadonlySet<number> = new Set<number>()) => hasReceivingSpace(table, route, 0, 0, 0, vehicleEnvelope(body.asset, body.scale).diameter / 2, network.admissionBounds.stopGapM, fleet, pending, passage);
  return { table, route, passage, body, clear };
}

describe("vehicle body fit and physical clearance (R178)", () => {
  it("refuses the actual bus-width witness through both final validation and the unchanged portal attempt budget", () => {
    const a = fixture.lane.actor, body: VehicleRouteBody = { asset: fleet.vehicles[a.variant]!, scale: a.scale, laneIndex: 0, frame: "population-upright" };
    const library = new RouteLibrary(network, new RefusalCounts());
    expect(library.validateVehicleCandidate(a.edgeIds, body).reason).toMatch(/cannot contain bus/);
    const walk = vi.spyOn(library as unknown as { walk: (...args: unknown[]) => string[] | null }, "walk").mockReturnValue(a.edgeIds);
    try {
      const request = { footprintRadiusM: vehicleEnvelope(body.asset, body.scale).diameter / 2, maxEdges: 120, walkAttempts: 3, vehicleBody: body };
      expect(library.drivablePortals(library.vehicleGraph, [a.edgeIds[0]!], request)).toEqual([]);
      expect(walk).toHaveBeenCalledTimes(3);
      expect(library.planFrom(library.vehicleGraph, "vehicle", a.edgeIds[0]!, 5970698, request).route).toBeNull();
      expect(walk).toHaveBeenCalledTimes(6);
    } finally { walk.mockRestore(); }
  });

  it("retains width-fitting kei/taxi routes and refuses every supported bus scale on the narrow source witness", () => {
    const library = new RouteLibrary(network, new RefusalCounts()), ids = fixture.lane.actor.edgeIds;
    for (const variant of [0, 1]) {
      const asset = fleet.vehicles[variant]!, body: VehicleRouteBody = { asset, scale: vehicleScale(() => 1, asset), laneIndex: 0, frame: "population-upright" };
      expect(library.validateVehicleCandidate(ids, body).route).not.toBeNull();
    }
    for (const draw of [0, .5, 1]) {
      const asset = fleet.vehicles[2]!, body: VehicleRouteBody = { asset, scale: vehicleScale(() => draw, asset), laneIndex: 0, frame: "population-upright" };
      expect(library.validateVehicleCandidate(ids, body).reason).toMatch(/cannot contain bus/);
    }
  });

  it("refuses the actual smaller entrant beside a larger body whether that body is active or pending", () => {
    const table = pairTable();
    expect(overlappingPairs(vehicleBoxes(fleet, table.poses))).toHaveLength(1);
    expect(hasVehicleEntrySpace(table, fleet, 1, new Set(), .5, 1.5)).toBe(false);
    table.poses.vehicles.active[0] = 0;
    expect(hasVehicleEntrySpace(table, fleet, 1, new Set([0]), .5, 1.5)).toBe(false);
    expect(hasVehicleEntrySpace(table, fleet, 1, new Set(), .5, 1.5)).toBe(true);
  });

  it("reserves the bounded same-tick halt capture and permits a genuinely clear entry", () => {
    const table = createSlotTable(settings);
    for (const state of table.vehicles) Object.assign(state, { variant: 0, scale: 1 });
    table.poses.vehicles.active[0] = 1;
    placeSlot(table.poses.vehicles, 0, { x: 0, y: 0, z: 5.2 }, 0);
    placeSlot(table.poses.vehicles, 1, { x: 0, y: 0, z: 0 }, 0);
    expect(hasVehicleEntrySpace(table, fleet, 1, new Set(), .5, 0)).toBe(true);
    expect(hasVehicleEntrySpace(table, fleet, 1, new Set(), .5, 1.5)).toBe(false);
    placeSlot(table.poses.vehicles, 0, { x: 0, y: 0, z: 12 }, 0);
    expect(hasVehicleEntrySpace(table, fleet, 1, new Set(), .5, 1.5)).toBe(true);
  });

  it("refuses the historical turning bus's actual external neighbor before its first grant", () => {
    const s = turnTable();
    const other = vehicleFootprint(fleet, s.table, 1);
    const owner = network.junctions.find(j => j.id === s.passage.junctionId)!;
    expect(footprintOccupies(owner, other)).toBe(false);
    expect(s.table.vehicleRoutes[1]!.edgeIds[0]).not.toBe(s.route.edgeIds[0]);
    expect(s.clear()).toBe(false);
    s.table.poses.vehicles.active[1] = 0;
    expect(s.clear(new Set([1]))).toBe(false);
    const admissions = new JunctionAdmissions(network);
    const request: AdmissionRequest = { actorId: "turn", kind: "vehicle", routeIdentity: s.route, generation: 1, passage: s.passage, routeIndex: s.passage.entryIndex, entryEdgeId: s.route.edgeIds[s.passage.entryIndex]!, footprint: vehicleRouteFootprint(s.route, 0, s.body), stoppedSeconds: 0, yieldSatisfied: true, receivingSpace: s.clear(new Set([1])) };
    expect(admissions.resolve(1 / 60, [request])).toEqual([]);
    placeSlot(s.table.poses.vehicles, 1, { x: 400, y: 28, z: -400 }, 0);
    expect(s.clear(new Set([1]))).toBe(true);
    expect(admissions.resolve(1 / 60, [{ ...request, receivingSpace: s.clear(new Set([1])) }])).toEqual(["turn"]);
  });

  it("also measures physical neighbors for a width-fitting actual kei route and allows its free passage", () => {
    const s = turnTable(0), library = new RouteLibrary(network, new RefusalCounts());
    expect(library.validateVehicleCandidate(s.route.edgeIds, s.body).route).not.toBeNull();
    expect(s.clear()).toBe(false);
    placeSlot(s.table.poses.vehicles, 1, { x: 400, y: 28, z: -400 }, 0);
    expect(s.clear()).toBe(true);
  });

  it("contains every intermediate source bend and the actual boundary egress, not only endpoint poses", () => {
    const s = turnTable(0);
    const edge = { ...s.route.edges[0]!, points: [{ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 20, y: 0, z: 20 }, { x: 0, y: 0, z: 20 }, { x: 0, y: 0, z: 0 }], lengthM: 80 };
    const route = { ...s.route, edges: [edge], starts: [0], totalLengthM: 80 };
    const passage = { ...s.passage, lastConflictIndex: 0, boundaryExit: null };
    placeSlot(s.table.poses.vehicles, 1, { x: 20, y: 0, z: 10 }, Math.PI / 2);
    expect(hasVehiclePassageSpace(s.table, fleet, route, passage, 0, 0, new Set(), .5)).toBe(false);
    placeSlot(s.table.poses.vehicles, 1, { x: 40, y: 0, z: 10 }, 0);
    expect(hasVehiclePassageSpace(s.table, fleet, route, passage, 0, 0, new Set(), .5)).toBe(true);
    const boundary = turnTable();
    const exit = boundary.passage.boundaryExit!;
    expect(exit).not.toBeNull();
    placeSlot(boundary.table.poses.vehicles, 1, { ...exit.position, x: exit.position.x + 13 * exit.outward.x, z: exit.position.z + 13 * exit.outward.z }, 0);
    expect(boundary.clear()).toBe(false);
    expect(hasVehiclePassageSpace(boundary.table, fleet, boundary.route, { ...boundary.passage, boundaryExit: null }, 0, 0, new Set(), .5)).toBe(true);
  });

  it("never activates a new body into another body's same-direction box in the unchanged actual window", { timeout: 20_000 }, () => {
    const admissions = new JunctionAdmissions(network), population = createPopulation({ network, fleet, admissions, settings: populationSettings({ pedestrians: 0, vehicles: 120, seed: 0x5b1b0a, spawnIntervalTicks: 1 }) });
    const seen = new Set<string>(); let activations = 0; const overlaps: string[] = [];
    try {
      for (let tick = 1; tick <= 1200; tick++) {
        population.update(1 / 60, tick / 60);
        const poses = population.poses.vehicles, boxes = vehicleBoxes(fleet, population.poses), fresh = new Set<number>();
        for (const box of boxes) { const key = `${box.slot}:${poses.current.generation[box.slot]}`; if (!seen.has(key)) { seen.add(key); fresh.add(box.slot); activations++; } }
        for (const pair of overlappingPairs(boxes)) if ((fresh.has(pair.a) || fresh.has(pair.b)) && pair.headingDeltaDegrees <= 90) overlaps.push(`${tick}:${pair.a}:${pair.b}`);
      }
      expect(activations).toBeGreaterThan(10); expect(overlaps).toEqual([]);
      expect(population.status().lifecycle.retired).toBeGreaterThan(0);
      expect(population.status().authorityViolations).toBe(0);
    } finally { population.dispose(); }
  });
});
