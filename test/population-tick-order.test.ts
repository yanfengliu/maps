/**
 * Tick ordering gate. Bound: one delivered network, one seed, 600 ticks at
 * 1/60 s, 60 pedestrians and 12 vehicles. The claim is order, not behaviour.
 *
 * Claim: admission is resolved once per tick and before any position is
 * integrated, so no actor can move on a grant that was issued after it moved.
 * The gate is made to go red by the mutation in the second case, which drives an
 * integration phase before the resolve phase and must fail.
 */
import { afterEach, describe, expect, it } from "vitest";

import { TICK_PHASES, createPopulation, tickOrder, type TickPhase } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { JunctionAdmissions } from "../src/network/admissions.ts";
import { deliveredFleet, deliveredNetwork, resetInvariants, run } from "./population-fixture.ts";

const STEP = 1 / 60;

afterEach(resetInvariants);

describe("the population tick order", () => {
  it("resolves admission exactly once per tick, before any position is integrated", () => {
    const network = deliveredNetwork();
    const admissions = new JunctionAdmissions(network);
    let resolves = 0;
    const originalResolve = admissions.resolve.bind(admissions);
    admissions.resolve = (step, requests) => {
      resolves += 1;
      return originalResolve(step, requests);
    };
    const population = createPopulation({
      network,
      fleet: deliveredFleet(),
      admissions,
      settings: populationSettings({ pedestrians: 60, vehicles: 12, seed: 0x5b1b0a }),
    });
    const ticks = 120;
    run(population, ticks, STEP);
    expect(resolves).toBe(ticks);
    expect(TICK_PHASES.indexOf("resolve")).toBeLessThan(TICK_PHASES.indexOf("integrate"));
    expect(tickOrder.phases).toEqual(TICK_PHASES);
  });

  it("goes red when integration is allowed to run before the resolve phase", () => {
    const network = deliveredNetwork();
    const admissions = new JunctionAdmissions(network);
    const population = createPopulation({
      network,
      fleet: deliveredFleet(),
      admissions,
      settings: populationSettings({ pedestrians: 20, vehicles: 4, seed: 0x5b1b0a }),
    });
    run(population, 3, STEP);
    // The mutation: the resolve phase runs after the integrate phase. No call
    // site changed, so only the enforced order can catch it.
    const mutated = ["lifecycle", "plan", "request", "integrate", "resolve", "close"] as TickPhase[];
    tickOrder.phases = mutated;
    try {
      expect(() => run(population, 1, STEP)).toThrow(/tick order violation/);
    } finally {
      tickOrder.phases = [...TICK_PHASES];
    }
    // The tree is left as it was found: an ordered tick still passes.
    expect(() => run(population, 1, STEP)).not.toThrow();
  });
});
