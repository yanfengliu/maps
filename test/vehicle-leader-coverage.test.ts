/** Bound: exact delivered taxi10/56 state before penetration, plus route-occurrence controls.
 * It checks production leader lookup without source caches or altered actor demand. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { populationSettings } from "../src/agents/population/config.ts";
import { createSlotTable } from "../src/agents/population/slots.ts";
import { buildVehicleFrame, JunctionIndex } from "../src/agents/population/vehicles.ts";
import type { PlannedRoute } from "../src/agents/population/routes.ts";
import type { ActorFootprint } from "../src/network/footprints.ts";
import type { NetworkData, NetworkEdge } from "../src/world/network-data.ts";

const literal = JSON.parse(readFileSync(new URL("./fixtures/vehicle-short-connector.json", import.meta.url), "utf8")) as {
  starts: number[]; edges: NetworkEdge[]; expectedGapM: number;
  actors: { slot: number; routeIndex: number; travelledM: number; speedMps: number; footprint: ActorFootprint }[];
};
function plan(edges: readonly NetworkEdge[], starts: readonly number[]): PlannedRoute {
  return { entryEdgeId: edges[0]!.id, edgeIds: edges.map(edge => edge.id), edges, starts,
    totalLengthM: starts.at(-1)! + edges.at(-1)!.lengthM, speedLimits: edges.map(() => 8), passages: [], gates: [] };
}
const emptyIndex = () => new JunctionIndex({ junctions: [] } as unknown as NetworkData);

describe("vehicle leader coverage across route occurrences", () => {
  it("keeps the stopped taxi two occurrences ahead across the unchanged 0.088 m connector", () => {
    const table = createSlotTable(populationSettings({ pedestrians: 0, vehicles: 57 }));
    const footprints: (ActorFootprint | undefined)[] = [];
    for (const actor of literal.actors) {
      table.poses.vehicles.active[actor.slot] = 1;
      Object.assign(table.vehicles[actor.slot]!, { routeIndex: actor.routeIndex, travelledM: actor.travelledM, speedMps: actor.speedMps });
      table.vehicleRoutes[actor.slot] = plan(literal.edges, literal.starts);
      footprints[actor.slot] = actor.footprint;
    }
    expect(table.vehicleRoutes[10]).not.toBe(table.vehicleRoutes[56]);
    expect(literal.edges[1]!.lengthM).toBe(0.0881458332056666);
    const frame = buildVehicleFrame(table, footprints, () => false, emptyIndex());
    expect(frame.ahead[56], "taxi56 must see the physical stopped taxi10 before reaching the short connector").not.toBeNull();
    expect(frame.ahead[56]!.gapM).toBeCloseTo(literal.expectedGapM, 10);
    expect(frame.ahead[56]!.speedMps).toBe(0);
    expect(frame.ahead[10]).toBeNull();
  });
});

function straightRoute(ids: string[], lengths: number[]): PlannedRoute {
  let start = 0;
  const starts = lengths.map(length => { const at = start; start += length; return at; });
  return plan(ids.map((id, i) => ({ ...literal.edges[0]!, id, lengthM: lengths[i]! })), starts);
}
function frameFor(actors: { route: PlannedRoute; occurrence: number; distance: number; z: number; x?: number; speed?: number }[]) {
  const table = createSlotTable(populationSettings({ pedestrians: 0, vehicles: actors.length }));
  const footprints: ActorFootprint[] = [];
  actors.forEach((actor, slot) => {
    table.poses.vehicles.active[slot] = 1;
    table.vehicleRoutes[slot] = actor.route;
    Object.assign(table.vehicles[slot]!, { routeIndex: actor.occurrence, travelledM: actor.distance, speedMps: actor.speed ?? 4 });
    footprints[slot] = { position: { x: actor.x ?? 0, y: 0, z: actor.z }, headingRadians: 0, lengthM: 4, widthM: 2 };
  });
  return buildVehicleFrame(table, footprints, () => false, emptyIndex());
}

describe("vehicle leader occurrence boundaries", () => {
  it("preserves same-edge ahead/behind and the lane field", () => {
    const route = straightRoute(["a"], [100]);
    const frame = frameFor([{ route, occurrence: 0, distance: 10, z: 10 }, { route, occurrence: 0, distance: 20, z: 20 }]);
    expect(frame.ahead[0]?.gapM).toBe(6);
    expect(frame.behind[1]?.gapM).toBe(6);
    expect(frame.ahead[1]).toBeNull();
    expect(frame.lane.get("a#0")?.ahead?.gapM).toBe(6);
  });
  it("covers an immediate-next body on an independent plan with a different prefix distance", () => {
    const follower = straightRoute(["a", "b"], [10, 100]);
    const leader = straightRoute(["prefix", "a", "b"], [100, 10, 100]);
    const frame = frameFor([{ route: follower, occurrence: 0, distance: 8, z: 8 }, { route: leader, occurrence: 2, distance: 114, z: 14 }]);
    expect(frame.ahead[0]?.gapM).toBe(2);
    expect(frame.ahead[1]).toBeNull();
  });
  it("looks through several short connectors and selects the nearest physical leader", () => {
    const route = straightRoute(["a", "b", "c", "d", "e"], [10, .08, .05, 2, 100]);
    const frame = frameFor([{ route, occurrence: 0, distance: 6, z: 6 },
      { route, occurrence: 3, distance: 11, z: 11, speed: 1 }, { route, occurrence: 4, distance: 14, z: 14, speed: 2 }]);
    expect(frame.ahead[0]?.gapM).toBe(1);
    expect(frame.ahead[0]?.speedMps).toBe(1);
  });
  it("does not follow a branch, a body behind it, or a laterally clear body", () => {
    const own = straightRoute(["a", "b", "c"], [10, .08, 100]);
    const branch = straightRoute(["branch"], [100]);
    const frame = frameFor([{ route: own, occurrence: 0, distance: 6, z: 6 },
      { route: branch, occurrence: 0, distance: 12, z: 12 },
      { route: straightRoute(["c"], [100]), occurrence: 0, distance: 1, z: 2 },
      { route: straightRoute(["c"], [100]), occurrence: 0, distance: 2, z: 14, x: 5 }]);
    expect(frame.ahead[0]).toBeNull();
  });
  it("does not reinterpret a repeated current edge as a future visit or follow itself", () => {
    const route = straightRoute(["a", "b", "a", "c"], [10, .08, .08, 100]);
    const frame = frameFor([{ route, occurrence: 1, distance: 10.02, z: 10.02 },
      { route, occurrence: 0, distance: 9, z: 9 }]);
    expect(frame.ahead[0]).toBeNull();
    expect(frameFor([{ route, occurrence: 0, distance: 9, z: 9 }]).ahead[0]).toBeNull();
  });
  it("stops looking beyond the existing body/headway/braking distance", () => {
    const route = straightRoute(["a", "b", "c"], [10, 100, 100]);
    const frame = frameFor([{ route, occurrence: 0, distance: 6, z: 6 },
      { route, occurrence: 2, distance: 111, z: 111 }]);
    expect(frame.ahead[0]).toBeNull();
  });
});
