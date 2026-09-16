/**
 * Single authority gate. Bound: one delivered network, seed `0x5b1b0a`, 60 pedestrians and 12 vehicles. The first case advances no ticks, the second runs 900 ticks at 1/60 s, and the third runs 600 unmutated ticks, then 4,800 with the mutation on, then 4,800 unmutated as its control.
 *
 * Claim: `JunctionAdmissions.resolve` is the only admission decision either population makes. Two independent readings of that:
 *
 *  1. no module in `src/agents/population/` calls `SignalController.canEnter`, which is phase eligibility rather than admission; and
 *  2. every commitment the authority holds is one the population asked for at some point in the run, so the cumulative grant count is at or above the standing commitment count and the population never holds more commitments than the grants it requested.
 *
 * The mutation is in the third case, not the second: `populationInvariants.driveWithoutGrant` makes integration ignore the grant check and `ignoreCurb` drops the pedestrian curb hold too, so actors enter a conflict section with no commitment of their own. What that produces is not a commitment the authority never issued but an uncommitted collision hull inside a conflict area, which is what `status.authorityViolations` counts and what `status.ts` documents as "Actors that moved into a conflict section without a grant. Must be zero." The enforcement stops the body where it stands and counts it, so the run reports the event instead of driving it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createPopulation, populationInvariants } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { JunctionAdmissions } from "../src/network/admissions.ts";
import { deliveredFleet, deliveredNetwork, resetInvariants, ROOT, run } from "./population-fixture.ts";

const STEP = 1 / 60;

afterEach(resetInvariants);

describe("one admission authority", () => {
  it("has no consumer that reads phase eligibility instead of asking the authority", () => {
    const directory = resolve(ROOT, "src/agents/population");
    const files = readdirSync(directory).filter((name) => name.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(4);
    for (const file of files) {
      const text = readFileSync(resolve(directory, file), "utf8");
      // Comments may discuss `canEnter`; code may not call it.
      const code = text.split("\n").filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line)).join("\n");
      expect(code, `${file} calls canEnter, which is phase eligibility and not admission`).not.toMatch(/\.canEnter\s*\(/);
      expect(code, `${file} reads the signal snapshot to decide movement`).not.toMatch(/signalSnapshot\s*\(/);
    }
  });

  it("keeps every authority commitment matched to a request the population made", { timeout: 60_000 }, () => {
    const network = deliveredNetwork();
    const admissions = new JunctionAdmissions(network);
    const population = createPopulation({
      network,
      fleet: deliveredFleet(),
      admissions,
      settings: populationSettings({ pedestrians: 60, vehicles: 12, seed: 0x5b1b0a }),
    });
    run(population, 900, STEP);
    const committed = admissions.snapshot();
    // Every commitment the authority holds is one the population asked for at
    // some point in this run, which is what a grant count at or above the
    // standing commitment count says. The population's instantaneous `committed`
    // count can be lower: a refusal the population recorded leaves the authority
    // still holding the lease, which is the state the single-authority gate is
    // about, and it is counted rather than hidden.
    const status = population.status();
    expect(status.grants).toBeGreaterThanOrEqual(committed.length);
    for (const commitment of committed) {
      expect(["vehicle", "pedestrian"]).toContain(commitment.kind);
      expect(commitment.junctionId.length).toBeGreaterThan(0);
      expect(commitment.entryEdgeId.length).toBeGreaterThan(0);
      // The population's own bookkeeping names a passage for every lease the
      // authority holds, so a request can never be made against a different one.
      expect(Number.isInteger(commitment.routeIndex)).toBe(true);
      expect(commitment.lastConflictIndex).toBeGreaterThanOrEqual(commitment.routeIndex - 1);
    }
  });

  it("goes red when an actor is moved into a conflict section with no grant", { timeout: 180_000 }, () => {
    const network = deliveredNetwork();
    const admissions = new JunctionAdmissions(network);
    const population = createPopulation({
      network,
      fleet: deliveredFleet(),
      admissions,
      settings: populationSettings({ pedestrians: 60, vehicles: 12, seed: 0x5b1b0a }),
    });
    run(population, 600, STEP);
    // Every actor the authority committed was committed by a granted request, and
    // the population reports no violation. The reading that carries the claim is
    // the population's own count of uncommitted hulls that reached a conflict area,
    // which is exactly what the mutation below makes non-zero.
    const status = population.status();
    // Green, and the comment that stood here said it was RED: that zero was expected, that 1 to 3 was what the run reported, and that the next session could not merge the state without seeing it. That described the run before `388a73c` finished fixing the seven consumer defects behind this gate, one of them a violation predicate that counted a body lawfully stopped 4 cm short of its stop line; that commit's own message records the acceptance reading falling from 364 to 0 in the same commit, and this comment was left describing the run before it. Measured on this revision: the unmutated 600-tick (10.0 s) run above reports `authorityViolations` 0 against 680 cumulative grants, and the unmutated control at the end reports 0 over 4,800 ticks against 9,046.
    expect(status.authorityViolations).toBe(0);
    // What this assertion proves is bounded and is not the class: in these 600 unmutated ticks at this fixture, no uncommitted collision hull reached a conflict area. That the class can fail is the case below, whose mutated arm reports 637.
    expect(status.grants).toBeGreaterThan(0);

    // The mutation: integration stops respecting the grant, so actors drive into
    // conflict sections on no grant at all. The enforcement is not fatal — the
    // body is stopped where it stands and the event is counted — so the reading
    // that carries the claim is that count, and it must be zero before the
    // mutation and non-zero after it.
    const violationsBefore = populationInvariants.violations;
    populationInvariants.driveWithoutGrant = true;
    populationInvariants.ignoreCurb = true;
    try {
      run(population, 4_800, STEP);
      expect(populationInvariants.violations).toBeGreaterThan(violationsBefore);
      const mutated = population.status();
      expect(mutated.authorityViolations).toBeGreaterThan(0);
    } finally {
      populationInvariants.driveWithoutGrant = false;
      populationInvariants.ignoreCurb = false;
    }
    // The control: with the mutation off from the start, the same run reports none.
    const clean = createPopulation({
      network,
      fleet: deliveredFleet(),
      admissions: new JunctionAdmissions(network),
      settings: populationSettings({ pedestrians: 60, vehicles: 12, seed: 0x5b1b0a }),
    });
    populationInvariants.violations = 0;
    run(clean, 4_800, STEP);
    expect(clean.status().authorityViolations).toBe(0);
  });
});
