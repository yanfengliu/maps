/** Bound: current delivered default first entry, 180 fixed ticks, small admission
 * controls and 1,200 vehicle-only ticks for status parity. Not all-time motion,
 * contact or visual acceptance. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPopulation } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { PedestrianEntrySpace, pedestrianEntryBody } from "../src/agents/population/pedestrian-entry.ts";
import { JunctionAdmissions } from "../src/network/admissions.ts";
import { projectVehicleFootprint } from "../src/network/footprints.ts";
import { deliveredFleet, deliveredNetwork, fixture } from "./population-fixture.ts";

afterEach(() => vi.restoreAllMocks());

describe("displayed pedestrian entry", () => {
  it("rejects occupied and same-tick entries, accepts cleared space and distinct height", () => {
    const space = new PedestrianEntrySpace();
    const body = pedestrianEntryBody({ x: -1.99, y: 20, z: -2.01 }, 1, 1.08);
    expect(space.hasClearance(body)).toBe(true);
    space.occupy(body);
    expect(space.hasClearance(body)).toBe(false);
    expect(space.hasClearance(pedestrianEntryBody({ x: -0.90, y: 20, z: -2.01 }, 1, 1.08))).toBe(false);
    expect(space.hasClearance(pedestrianEntryBody({ x: -0.81, y: 20, z: -2.01 }, 1, 1.08))).toBe(false);
    expect(space.hasClearance(pedestrianEntryBody({ x: 0, y: 20, z: -2.01 }, 1, 1.08))).toBe(true);
    expect(space.hasClearance(pedestrianEntryBody({ x: -1.99, y: 24, z: -2.01 }, 1, 1.08))).toBe(true);
    space.clear();
    expect(space.hasClearance(body)).toBe(true);
  });

  it("uses the live vehicle projected hull, including supported tilt", () => {
    const space = new PedestrianEntrySpace();
    const vehicle = projectVehicleFootprint(deliveredFleet().vehicles[0]!, { x: 0, y: 0, z: 0 }, Math.PI / 3, { x: 0.08, y: 1, z: 0.04 });
    space.occupyVehicle(vehicle);
    expect(space.hasClearance(pedestrianEntryBody({ x: vehicle.position.x, y: 0, z: vehicle.position.z }, 0, 1))).toBe(false);
    expect(space.hasClearance(pedestrianEntryBody({ x: 20, y: 0, z: 0 }, 0, 1))).toBe(true);
    expect(space.hasClearance(pedestrianEntryBody({ x: 0, y: 20, z: 0 }, 0, 1))).toBe(true);
  });

  it("a refused stable candidate waits sixty fixed ticks between clearance attempts", () => {
    const { population, admissions } = fixture({ pedestrians: 1, vehicles: 0 });
    const attempts: { tick: number; body: unknown }[] = [];
    const spy = vi.spyOn(PedestrianEntrySpace.prototype, "hasClearance").mockImplementation(body => {
      attempts.push({ tick: population.status().ticks, body: structuredClone(body) });
      return false;
    });
    try {
      for (let tick = 1; tick <= 180; tick++) {
        population.update(1 / 60, tick / 60);
        expect(population.status().lifecycle).toMatchObject({ spawned: 0, retired: 0, generations: 0, reused: 0 });
      }
      expect(attempts.map(attempt => attempt.tick)).toEqual([1, 61, 121]);
      expect(attempts.every(attempt => JSON.stringify(attempt.body) === JSON.stringify(attempts[0]!.body))).toBe(true);
      expect(population.status().pedestrians).toMatchObject({ requested: 1, active: 0, waiting: 1, pending: 1 });
      expect(admissions.commitmentFor("pedestrian:0")).toBeNull();
    } finally { spy.mockRestore(); population.dispose(); }
  });

  it("the runtime entry space includes live vehicle bodies during candidate checks", () => {
    const { population } = fixture({ pedestrians: 128, vehicles: 200 });
    const ordinary = PedestrianEntrySpace.prototype.hasClearance;
    let witnessed = 0;
    const spy = vi.spyOn(PedestrianEntrySpace.prototype, "hasClearance").mockImplementation(function (this: PedestrianEntrySpace, body) {
      const diagnostics = population.diagnostics();
      const pedestriansOnly = new PedestrianEntrySpace();
      for (const pedestrian of diagnostics.pedestrians) if (pedestrian.active) {
        pedestriansOnly.occupy(pedestrianEntryBody({ x: pedestrian.position[0], y: pedestrian.position[1], z: pedestrian.position[2] }, pedestrian.variant, pedestrian.scale));
      }
      for (const vehicle of diagnostics.vehicles) {
        if (!vehicle.active || !vehicle.footprint) continue;
        const probe = pedestrianEntryBody(vehicle.footprint.position, 0, 1);
        // Independent absence of pedestrians isolates the actual runtime vehicle
        // insertion. This probe is a query, not a materialized actor or collision.
        if (!ordinary.call(pedestriansOnly, probe)) continue;
        expect(ordinary.call(this, probe), `live vehicle slot ${vehicle.slot} is absent from entry occupancy`).toBe(false);
        witnessed++;
      }
      return ordinary.call(this, body);
    });
    try { population.update(1 / 60, 1 / 60); expect(witnessed).toBeGreaterThan(0); }
    finally { spy.mockRestore(); population.dispose(); }
  });

  it("preserves vehicle reuse semantics and status reads cannot advance state", () => {
    // Match the existing lifecycle gate's 12-vehicle/1,200-tick retirement
    // fixture. The separate default-load entry case keeps all 3,000/200 requests.
    const { population } = fixture({ pedestrians: 0, vehicles: 12 });
    try {
      for (let tick = 1; tick <= 1200; tick++) {
        population.update(1 / 60, tick / 60);
        const status = population.status();
        const diagnostics = population.diagnostics();
        const registered = diagnostics.vehicles.filter(row => row.routeEdges > 0).length;
        expect(status.lifecycle.reused).toBe(Math.max(0, status.lifecycle.spawned - registered));
        expect(status.lifecycle.spawned).toBe(status.lifecycle.retired + status.lifecycle.active + status.vehicles.pending);
        expect(population.status()).toEqual(status);
        expect(population.diagnostics()).toEqual(diagnostics);
      }
      expect(population.status().lifecycle.retired).toBeGreaterThan(0);
    } finally { population.dispose(); }
  });

  it("first active poses have disjoint measured body envelopes", () => {
    const { population } = fixture({ pedestrians: 3000, vehicles: 200 });
    try {
      population.update(1 / 60, 1 / 60);
      const poses = population.poses.pedestrians;
      const active = [...poses.active.keys()].filter(slot => poses.active[slot]);
      expect(active.length).toBeGreaterThan(0);
      const radii = [0.5086563874565755, 0.5316764158019738, 0.4940710961199064];
      for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!, b = active[j]!;
        if (Math.abs(poses.current.position[a * 3 + 1]! - poses.current.position[b * 3 + 1]!) > 0.15) continue;
        const distance = Math.hypot(poses.current.position[a * 3]! - poses.current.position[b * 3]!, poses.current.position[a * 3 + 2]! - poses.current.position[b * 3 + 2]!);
        expect(distance, `displayed first-entry bodies ${a} and ${b} overlap`).toBeGreaterThanOrEqual(radii[poses.variant[a]!]! * poses.scale[a]! + radii[poses.variant[b]!]! * poses.scale[b]!);
      }
    } finally { population.dispose(); }
  });

  it("keeps 3000 requested slots, admits safely, preserves waiting candidates and makes progress", () => {
    const { population, admissions } = fixture({ pedestrians: 3000, vehicles: 200 });
    const poses = population.poses.pedestrians;
    const priorGeneration = new Uint32Array(3000);
    let firstActive = 0, entries = 0, moved = 0;
    let remembered: ReturnType<typeof population.diagnostics>["pedestrians"][number] | undefined;
    try {
      for (let tick = 1; tick <= 180; tick++) {
        population.update(1 / 60, tick / 60);
        const status = population.status();
        expect(status.pedestrians.requested).toBe(3000);
        expect(status.pedestrians.active + status.pedestrians.waiting).toBe(3000);
        expect(status.lifecycle.spawned).toBe(status.lifecycle.retired + status.lifecycle.active + status.vehicles.pending);
        if (tick === 1) {
          firstActive = status.pedestrians.active;
          expect(firstActive).toBeGreaterThan(0);
          expect(firstActive).toBeLessThan(128);
          remembered = population.diagnostics().pedestrians.find(row => row.pending);
          expect(remembered).toBeDefined();
        }
        if (tick === 2 && remembered) {
          const now = population.diagnostics().pedestrians[remembered.slot]!;
          expect(now).toEqual(remembered);
          expect(admissions.commitmentFor(`pedestrian:${now.slot}`)).toBeNull();
          expect(population.pedestrianRoute(now.slot)).toBeNull();
          expect(poses.current.generation[now.slot]).toBe(0);
          expect(poses.active[now.slot]).toBe(0);
        }
        for (let a = 0; a < poses.count; a++) {
          if (!poses.active[a] || poses.current.generation[a] === priorGeneration[a]) continue;
          entries++;
          // Independent sufficient lower bound from decoded mesh extents, not
          // the implementation constants or its spatial index. The per-tick
          // integration may spend <4 cm of the 5 cm initial air margin.
          const radii = [0.5086563874565755, 0.5316764158019738, 0.4940710961199064];
          for (let b = 0; b < poses.count; b++) {
            if (a === b || !poses.active[b]) continue;
            const dy = Math.abs(poses.current.position[a * 3 + 1]! - poses.current.position[b * 3 + 1]!);
            if (dy > 0.15) continue;
            const distance = Math.hypot(poses.current.position[a * 3]! - poses.current.position[b * 3]!, poses.current.position[a * 3 + 2]! - poses.current.position[b * 3 + 2]!);
            expect(distance, `new entry ${a} overlaps ${b} at tick ${tick}`).toBeGreaterThanOrEqual(radii[poses.variant[a]!]! * poses.scale[a]! + radii[poses.variant[b]!]! * poses.scale[b]!);
          }
        }
        priorGeneration.set(poses.current.generation);
      }
      for (const row of population.diagnostics().pedestrians) if (row.active && row.travelledM > 0.5) moved++;
      expect(population.status().pedestrians.active).toBeGreaterThan(firstActive);
      expect(moved).toBeGreaterThan(20);
      expect(entries).toBeGreaterThan(60);
      expect(population.diagnostics().pedestrians.some(row => row.slot > 2500 && (row.active || row.pending))).toBe(true);
    } finally { population.dispose(); }
  });

  it("is deterministic and does not starve later free slots or alias with an interval", () => {
    const execute = () => {
      const { population } = fixture({ pedestrians: 300, vehicles: 0, spawnIntervalTicks: 24 });
      const ordinary = PedestrianEntrySpace.prototype.hasClearance;
      let checks = 0;
      const spy = vi.spyOn(PedestrianEntrySpace.prototype, "hasClearance").mockImplementation(function (this: PedestrianEntrySpace, body) {
        checks++;
        // A fixed region remains blocked. Other portals must still enter.
        return body.z < 0 ? false : ordinary.call(this, body);
      });
      try {
        for (let tick = 1; tick <= 100; tick++) population.update(1 / 60, tick / 60);
        expect(checks).toBeGreaterThan(300);
        const rows = population.diagnostics().pedestrians;
        expect(rows.some(row => row.slot >= 256 && row.active)).toBe(true);
        expect(rows.some(row => row.pending)).toBe(true);
        expect(rows.every(row => row.active || row.pending)).toBe(true);
        return rows;
      } finally { spy.mockRestore(); population.dispose(); }
    };
    expect(execute()).toEqual(execute());
  });

  it("retries a later generation through the same gate without consuming its identity", () => {
    const source = deliveredNetwork(), template = source.walks[0]!;
    const entry = { ...template, id: "entry", from: "a", to: "b", points: [{ x: 0, y: 0, z: -4 }, { x: 0, y: 0, z: -2 }], lengthM: 2, widthM: 1, nextIds: [], kind: "sidewalk" as const, junctionId: null, signalGroupId: null };
    const diagonal = { ...entry, id: "walk:fixture:scramble-diagonal:f", points: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }] };
    const network = { ...source, walks: [entry, diagonal], lanes: [], junctions: [], portals: { ...source.portals, pedestrian: [entry.id], vehicleEntry: [], vehicleExit: [] } };
    const admissions = new JunctionAdmissions(network);
    const population = createPopulation({ network, admissions, fleet: deliveredFleet(), settings: populationSettings({ pedestrians: 1, vehicles: 0 }) });
    const ordinary = PedestrianEntrySpace.prototype.hasClearance;
    let blockedReuse = false;
    const spy = vi.spyOn(PedestrianEntrySpace.prototype, "hasClearance").mockImplementation(function (this: PedestrianEntrySpace, body) {
      if (population.status().pedestrians.completed > 0) { blockedReuse = true; return false; }
      return ordinary.call(this, body);
    });
    try {
      let tick = 0;
      while (!blockedReuse && tick < 600) {
        tick++; population.update(1 / 60, tick / 60);
        expect(population.status().lifecycle.reused).toBe(0);
      }
      expect(blockedReuse).toBe(true);
      expect(population.poses.pedestrians.current.generation[0]).toBe(1);
      expect(population.status().pedestrians).toMatchObject({ requested: 1, active: 0, waiting: 1, pending: 1, completed: 1 });
      expect(population.status().lifecycle).toMatchObject({ spawned: 1, retired: 1, generations: 1 });
      expect(population.status().lifecycle.reused, "generation two is only prepared, not activated").toBe(0);
      expect(admissions.commitmentFor("pedestrian:0")).toBeNull();
      const blockedUntil = tick + 180;
      while (tick < blockedUntil) {
        tick++; population.update(1 / 60, tick / 60);
        expect(population.status().pedestrians).toMatchObject({ requested: 1, active: 0, waiting: 1, pending: 1, completed: 1 });
        expect(population.status().lifecycle).toMatchObject({ spawned: 1, retired: 1, active: 0, generations: 1, reused: 0 });
        expect(population.poses.pedestrians.current.generation[0]).toBe(1);
        expect(admissions.commitmentFor("pedestrian:0")).toBeNull();
      }
      spy.mockRestore();
      const end = tick + 65;
      while (tick < end) {
        tick++; population.update(1 / 60, tick / 60);
        const activated = population.poses.pedestrians.current.generation[0] === 2;
        expect(population.status().lifecycle.reused).toBe(activated ? 1 : 0);
      }
      expect(population.poses.pedestrians.current.generation[0]).toBe(2);
      expect(population.status().pedestrians.active).toBe(1);
      expect(population.status().lifecycle).toMatchObject({ spawned: 2, retired: 1, active: 1, generations: 2, reused: 1 });
    } finally { spy.mockRestore(); population.dispose(); }
  });
});
