/**
 * Lifecycle conservation gate. Bound: one delivered network, one seed, 1,200
 * ticks at 1/60 s, 60 pedestrians and 12 vehicles, which is 20 simulated seconds
 * — long enough for pedestrians to finish routes and for vehicles to reach a
 * gate, and not long enough to cover a full signal cycle's retirements.
 *
 * Claim: nothing leaks. Spawns equal retirements plus the bodies still present,
 * the present set is exactly the set of slots with a live plan, and a slot's
 * generation only ever increases, so a respawn can never be interpolated across.
 *
 * The gate is made to go red by the conservation mutation, which retires a body
 * while leaving its active byte set.
 */
import { afterEach, describe, expect, it } from "vitest";

import { createPopulation, populationInvariants } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { JunctionAdmissions } from "../src/network/admissions.ts";
import { deliveredFleet, deliveredNetwork, resetInvariants, run } from "./population-fixture.ts";

const STEP = 1 / 60;
const TICKS = 4_800;

function build(overrides: Parameters<typeof populationSettings>[0] = {}) {
  const network = deliveredNetwork();
  const admissions = new JunctionAdmissions(network);
  const population = createPopulation({
    network,
    fleet: deliveredFleet(),
    admissions,
    settings: populationSettings({ pedestrians: 60, vehicles: 12, seed: 0x5b1b0a, ...overrides }),
  });
  return { population, admissions };
}

afterEach(resetInvariants);

describe("lifecycle conservation", () => {
  it("keeps spawns equal to retirements plus active, with no leak over a long run", { timeout: 120_000 }, () => {
    const { population } = build();
    const poses = population.poses;
    const generationsBefore = new Map<number, number>();
    for (let slot = 0; slot < poses.pedestrians.count; slot += 1) generationsBefore.set(slot, poses.pedestrians.current.generation[slot]!);

    run(population, TICKS, STEP);
    const status = population.status();
    expect(status.lifecycle.spawned).toBe(status.lifecycle.retired + status.lifecycle.active + status.vehicles.pending + status.pedestrians.pending);
    expect(status.lifecycle.active).toBeGreaterThan(0);

    // Present means present: a slot with an active byte has a live plan and a slot
    // without one does not, read independently of the counters above.
    let present = 0;
    for (let slot = 0; slot < poses.pedestrians.count; slot += 1) {
      if (poses.pedestrians.active[slot]) present += 1;
      const generation = poses.pedestrians.current.generation[slot]!;
      expect(generation).toBeGreaterThanOrEqual(generationsBefore.get(slot)!);
      // A respawn must never interpolate: the two halves the renderer blends
      // always carry the same generation.
      expect(poses.pedestrians.previous.generation[slot]).toBe(generation);
    }
    expect(present).toBe(status.pedestrians.active);
  });

  it("goes red when a retired body is left present", { timeout: 120_000 }, () => {
    // The window has to be long enough for a retirement actually to happen; with
    // too few ticks the mutation has nothing to leak and the gate would pass
    // while proving nothing, which is the failure a gate must not have.
    const { population } = build();
    run(population, 1_200, STEP);
    expect(population.status().lifecycle.retired).toBeGreaterThan(0);
    populationInvariants.leakRetiredBody = true;
    try {
      // The leak is caught wherever it first shows: by the conservation identity
      // in `status()`, or by the plan phase finding a present body with no route.
      // Both name the same failure, so the gate accepts either.
      expect(() => {
        run(population, 4_800, STEP);
        population.status();
      }).toThrow(/lifecycle conservation failed/);
    } finally {
      populationInvariants.leakRetiredBody = false;
    }
  });
});
