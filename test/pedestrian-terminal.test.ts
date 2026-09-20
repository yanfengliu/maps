/**
 * Bound: synthetic compound terminals and the delivered three-radius scramble
 * exit, plus a one-walker real tick through two generations. Null junction IDs
 * and end-of-route counters cannot establish physical tail clearance. The body,
 * plan, generation and entered lease must survive a refused retirement.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPedestrianTerminal, pedestrianTerminalIsClear } from "../src/agents/population/pedestrian-terminal.ts";
import * as terminals from "../src/agents/population/pedestrian-terminal.ts";
import { RouteLibrary } from "../src/agents/population/routes.ts";
import { MovementGraph } from "../src/agents/population/graph.ts";
import { RefusalCounts } from "../src/agents/population/status.ts";
import { createPopulation } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { JunctionAdmissions } from "../src/network/admissions.ts";
import { footprintOccupies } from "../src/network/footprints.ts";
import { RenderLoop } from "../src/render/loop.ts";
import type { NetworkData, WalkEdge } from "../src/world/network-data.ts";
import { deliveredFleet, deliveredNetwork } from "./population-fixture.ts";

function smallNetwork(clearTail = true): NetworkData {
  const source = deliveredNetwork();
  const template = source.walks[0]!;
  const edge = (id: string, from: number, to: number, nextIds: string[], governed = false): WalkEdge => ({
    ...template, id, from: `n:${from}`, to: `n:${to}`, points: [{ x: 0, y: 0, z: from }, { x: 0, y: 0, z: to }],
    lengthM: to - from, widthM: 1, nextIds, kind: governed ? "crossing" : "sidewalk",
    junctionId: governed ? "scramble" : null, signalGroupId: governed ? "scramble:pedestrian" : null,
  });
  const junction = source.junctions.find(value => value.id === "scramble")!;
  return {
    ...source, lanes: [],
    walks: [edge("approach", -10, -2, ["walk:authored:scramble-diagonal:f"]), edge("walk:authored:scramble-diagonal:f", -2, 2, ["inside"], true), edge("inside", 2, 2.8, clearTail ? ["clear"] : []), ...(clearTail ? [edge("clear", 2.8, 4, [])] : [])],
    portals: { ...source.portals, pedestrian: ["approach"], vehicleEntry: [], vehicleExit: [] },
    junctions: [{ ...junction, position: { x: 0, y: 0, z: 0 }, radiusM: 3.5, conflictAreas: [{ position: { x: 0, y: 0, z: 0 }, radiusM: 1.4 }, { position: { x: 0, y: 0, z: 2.5 }, radiusM: 0.7 }] }],
  };
}

const request = { destination: "centre" as const, footprintRadiusM: 0.25, maxEdges: 120, walkAttempts: 3 };
afterEach(() => vi.restoreAllMocks());

describe("pedestrian terminal clearance", () => {
  it("continues through a null-junction section that still touches a late compound primitive", () => {
    const network = smallNetwork(), graph = new MovementGraph(network, "pedestrian");
    expect(pedestrianTerminalIsClear(network, graph.edge("inside"), 0.25)).toBe(false);
    const prefix = ["approach", "walk:authored:scramble-diagonal:f", "inside"];
    expect(clearPedestrianTerminal(network, graph, prefix, 0.25, 120, 1000)).toEqual([...prefix, "clear"]);
    expect(pedestrianTerminalIsClear(network, graph.edge("clear"), 0.25)).toBe(true);
    expect(clearPedestrianTerminal(network, graph, [...prefix, "clear"], 0.25, 120, 1000)).toEqual([...prefix, "clear"]);
  });

  it("refuses no-clearance, edge-budget and length-budget tails without returning a shorter unsafe route", () => {
    const network = smallNetwork(false), graph = new MovementGraph(network, "pedestrian");
    expect(clearPedestrianTerminal(network, graph, ["inside"], 0.25, 120, 1000)).toBeNull();
    const available = smallNetwork(), availableGraph = new MovementGraph(available, "pedestrian");
    expect(clearPedestrianTerminal(available, availableGraph, ["inside"], 0.25, 1, 1000)).toBeNull();
    expect(clearPedestrianTerminal(available, availableGraph, ["inside"], 0.25, 120, 1)).toBeNull();
    const library = new RouteLibrary(network, new RefusalCounts());
    const failed = library.planFrom(library.pedestrianGraph, "pedestrian", "approach", 123, request);
    expect(failed.route).toBeNull();
    expect(failed.reason).toMatch(/inside.*physical clearance.*directed continuation/);
  });

  it.each([0.26668550333939495, 0.24254460809752346, 0.2420761473849416])("appends the actual shortest clear successor for the observed radius %s", radiusM => {
    const network = deliveredNetwork(), graph = new MovementGraph(network, "pedestrian");
    const id = "walk:664532522:1:0:ground0:r";
    expect(pedestrianTerminalIsClear(network, graph.edge(id), radiusM)).toBe(false);
    const complete = clearPedestrianTerminal(network, graph, [id], radiusM, 120, 1000);
    expect(complete).toEqual([id, "walk:664532523:0:0:ground0:f"]);
    expect(graph.edge(complete![1]!).lengthM).toBe(6.313157353948492);
  });

  it("keeps the chosen prefix and RNG choice when fitting another body, without reusing smaller-body clearance", () => {
    const network = smallNetwork();
    network.walks.find(edge => edge.id === "clear")!.points.at(-1)!.z = 3.4;
    network.walks.find(edge => edge.id === "clear")!.lengthM = 0.6;
    const library = new RouteLibrary(network, new RefusalCounts());
    // The private planner is spied on only to count actual route-choice calls;
    // the real implementation and all of its RNG calls still execute normally.
    const choices = vi.spyOn(library as unknown as { plan: (...args: unknown[]) => unknown }, "plan");
    const planner = library as unknown as { walkToCentre: (graph: MovementGraph, id: string, rng: () => number, maxEdges: number, viable?: (id: string) => boolean) => string[] | null };
    const ordinaryChoice = planner.walkToCentre.bind(library);
    let rngDraws = 0;
    vi.spyOn(planner, "walkToCentre").mockImplementation((graph, id, rng, maxEdges, viable) => ordinaryChoice(graph, id, () => { rngDraws += 1; return rng(); }, maxEdges, viable));
    const small = library.route("pedestrian", 0, 1, "approach", { ...request, footprintRadiusM: 0.1 });
    expect(small?.edgeIds).toEqual(["approach", "walk:authored:scramble-diagonal:f", "inside", "clear"]);
    expect(choices).toHaveBeenCalledTimes(1);
    const firstDraws = rngDraws;
    expect(firstDraws).toBeGreaterThan(0);
    const again = library.route("pedestrian", 7, 1, "approach", { ...request, footprintRadiusM: 0.1 });
    expect(again?.passages).toBe(small?.passages);
    expect(library.route("pedestrian", 22, 2, "approach", { ...request, footprintRadiusM: 0.4 })).toBeNull();
    expect(choices).toHaveBeenCalledTimes(1);
    const smaller = library.route("pedestrian", 28, 9, "approach", { ...request, footprintRadiusM: 0.15 });
    expect(smaller?.edgeIds).toEqual(small?.edgeIds);
    expect(choices).toHaveBeenCalledTimes(1);
    expect(smaller?.gates[0]?.holdDistanceM).not.toBe(small?.gates[0]?.holdDistanceM);
    for (let i = 0; i < 100; i += 1) expect(library.route("pedestrian", i, 10, "approach", { ...request, footprintRadiusM: 0.01 + i * 0.0015 })).not.toBeNull();
    expect(rngDraws).toBe(firstDraws);
    expect((library as unknown as { caches: Map<string, unknown> }).caches.size).toBe(1);
  });

  it("the real tick observes the current body and releases before completion and generation reuse", () => {
    const network = smallNetwork(), admissions = new JunctionAdmissions(network);
    const population = createPopulation({ network, admissions, fleet: deliveredFleet(), settings: populationSettings({ pedestrians: 1, vehicles: 0, seed: 5970698 }) });
    const poses = population.poses.pedestrians;
    const ordinaryObserve = admissions.observe.bind(admissions);
    let actualObservations = 0, entered = false, retired = 0;
    vi.spyOn(admissions, "observe").mockImplementation((actor, observation) => {
      if (actor === "pedestrian:0") {
        expect(observation.footprint.position).toEqual({ x: poses.current.position[0], y: poses.current.position[1], z: poses.current.position[2] });
        expect(observation.footprint.headingRadians).toBe(poses.current.yaw[0]);
        actualObservations += 1;
      }
      const result = ordinaryObserve(actor, observation);
      entered ||= admissions.commitmentFor(actor)?.entered ?? result;
      return result;
    });
    for (let tick = 1; tick <= 20_000; tick += 1) {
      const generation = poses.current.generation[0]!;
      const active = poses.active[0]!;
      population.update(1 / 60, tick / 60);
      if (active && !poses.active[0]) {
        retired += 1;
        expect(admissions.commitmentFor("pedestrian:0")).toBeNull();
        const fp = { position: { x: poses.current.position[0]!, y: poses.current.position[1]!, z: poses.current.position[2]! }, headingRadians: poses.current.yaw[0]!, lengthM: 0.5 * poses.scale[0]!, widthM: 0.5 * poses.scale[0]! };
        expect(network.junctions.some(junction => footprintOccupies(junction, fp))).toBe(false);
      }
      if (poses.current.generation[0]! > generation && generation > 0 && population.status().pedestrians.completed >= 2) break;
    }
    expect(actualObservations).toBeGreaterThan(0);
    expect(entered).toBe(true);
    expect(retired).toBeGreaterThanOrEqual(2);
    expect(population.status().pedestrians.completed).toBeGreaterThanOrEqual(2);
    expect(poses.current.generation[0]).toBeGreaterThanOrEqual(3);
    expect(population.status().refusedRoutes.some(row => row.reason.includes("previous generation"))).toBe(false);
  });

  it.each([0.1, 0.25])("viability rejects a retained forbidden prefix at requested radius %s", radius => {
    const network = smallNetwork(), refusals = new RefusalCounts();
    const library = new RouteLibrary(network, refusals);
    const original = library.route("pedestrian", 0, 1, "approach", { ...request, footprintRadiusM: 0.1 });
    expect(original?.edgeIds).toContain("inside");
    const result = library.route("pedestrian", 1, 1, "approach", { ...request, footprintRadiusM: radius, viable: id => id !== "inside" });
    expect(result).toBeNull();
    expect(refusals.snapshot().some(row => /viable.*inside/.test(row.reason))).toBe(true);
    expect(library.route("pedestrian", 2, 1, "approach", { ...request, footprintRadiusM: 0.1 })?.passages).toBe(original?.passages);
  });

  it.each([false, true])("viability selects an allowed longer tail with prior fit cache = %s", warmCache => {
    const network = smallNetwork();
    const tail = network.walks.find(edge => edge.id === "clear")!;
    network.walks.push({ ...tail, id: "alternative", to: "n:4.4", points: [tail.points[0]!, { x: 0, y: 0, z: 4.4 }], lengthM: 1.6 });
    network.walks.find(edge => edge.id === "inside")!.nextIds.push("alternative");
    const library = new RouteLibrary(network, new RefusalCounts());
    if (warmCache) expect(library.route("pedestrian", 0, 1, "approach", request)?.edgeIds.at(-1)).toBe("clear");
    const viable = (id: string) => id !== "clear";
    const route = library.route("pedestrian", 1, 1, "approach", { ...request, viable });
    expect(route?.edgeIds).toEqual(["approach", "walk:authored:scramble-diagonal:f", "inside", "alternative"]);
    expect(route?.edgeIds.every(viable)).toBe(true);
  });

  it("viability rechecks a predicate's current state across calls without poisoning the unconstrained cache", () => {
    const network = smallNetwork(), library = new RouteLibrary(network, new RefusalCounts());
    const original = library.route("pedestrian", 0, 1, "approach", request)!;
    const forbidden = new Set<string>();
    const viable = (id: string) => !forbidden.has(id);
    expect(library.route("pedestrian", 1, 1, "approach", { ...request, viable })?.edgeIds).toEqual(original.edgeIds);
    forbidden.add("clear");
    expect(library.route("pedestrian", 2, 1, "approach", { ...request, viable })).toBeNull();
    forbidden.clear();
    expect(library.route("pedestrian", 3, 1, "approach", { ...request, footprintRadiusM: 0.27, viable })?.edgeIds).toEqual(original.edgeIds);
    forbidden.add("approach");
    expect(library.route("pedestrian", 4, 1, "approach", { ...request, footprintRadiusM: 0.23, viable })).toBeNull();
    expect(library.route("pedestrian", 5, 1, "approach", request)?.passages).toBe(original.passages);
  });

  it("viability checks every supplied prefix edge even when its endpoint already clears", () => {
    const network = smallNetwork(), graph = new MovementGraph(network, "pedestrian");
    const prefix = ["approach", "walk:authored:scramble-diagonal:f", "inside", "clear"];
    for (const forbidden of prefix) {
      expect(clearPedestrianTerminal(network, graph, prefix, 0.25, 120, 1000, id => id !== forbidden)).toBeNull();
    }
  });

  it("viability refuses a fresh route when no allowed terminal continuation exists", () => {
    const library = new RouteLibrary(smallNetwork(), new RefusalCounts());
    const result = library.planFrom(library.pedestrianGraph, "pedestrian", "approach", 123, { ...request, viable: id => id !== "clear" });
    expect(result.route).toBeNull();
    expect(result.reason).toMatch(/physical clearance.*viable/);
  });

  it("viability on a fresh request does not replace the later unconstrained route choice", () => {
    const library = new RouteLibrary(smallNetwork(), new RefusalCounts());
    const constrained = library.route("pedestrian", 0, 1, "approach", { ...request, viable: id => id !== "inside" });
    expect(constrained?.edgeIds).toEqual(["approach"]);
    const ordinary = library.route("pedestrian", 1, 1, "approach", request);
    expect(ordinary?.edgeIds).toEqual(["approach", "walk:authored:scramble-diagonal:f", "inside", "clear"]);
    expect(ordinary?.edgeIds).toEqual(new RouteLibrary(smallNetwork(), new RefusalCounts()).route("pedestrian", 1, 1, "approach", request)?.edgeIds);
  });

  it("keeps an occupied terminal body and its entered lease without stopping the real render loop", () => {
    // Deliberately reintroduce the old planner's assumption that a null-junction
    // terminal is clear. This corrupt plan must not leak a body or stop frames.
    vi.spyOn(terminals, "clearPedestrianTerminal").mockImplementation((_network, _graph, prefix) => prefix);
    const network = smallNetwork(), admissions = new JunctionAdmissions(network);
    const population = createPopulation({ network, admissions, fleet: deliveredFleet(), settings: populationSettings({ pedestrians: 1, vehicles: 0, seed: 5970698 }) });
    const render = vi.fn(), frame = vi.fn();
    const loop = new RenderLoop({ render });
    loop.onFixedStep((step, seconds) => population.update(step, seconds));
    loop.onFrame(frame);
    let tick = 0;
    while (tick < 20_000 && population.status().pedestrians.completed === 0 && !population.status().refusedRoutes.some(row => row.reason.includes("cannot retire"))) {
      tick += 1;
      loop.advance(tick * 1000 / 60);
    }
    expect(tick).toBeLessThan(20_000);
    const poses = population.poses.pedestrians;
    const generation = poses.current.generation[0];
    const route = population.pedestrianRoute(0);
    const commitment = admissions.commitmentFor("pedestrian:0");
    expect(commitment?.entered).toBe(true);
    expect(poses.active[0]).toBe(1);
    expect(population.status().pedestrians.completed).toBe(0);
    expect(population.status().refusedRoutes.some(row => /still occupies scramble.*physically clear continuation/.test(row.reason))).toBe(true);
    for (let i = 0; i < 10; i += 1) loop.advance(++tick * 1000 / 60);
    expect(render).toHaveBeenCalledTimes(tick);
    expect(frame).toHaveBeenCalledTimes(tick);
    expect(poses.active[0]).toBe(1);
    expect(poses.current.generation[0]).toBe(generation);
    expect(population.pedestrianRoute(0)).toBe(route);
    expect(admissions.commitmentFor("pedestrian:0")?.entryEdgeId).toBe(commitment?.entryEdgeId);
    expect(population.status().pedestrians.completed).toBe(0);
  });
});
