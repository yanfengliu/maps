/**
 * Load the delivered Phase 6 network for a population test.
 *
 * Bound: this reads `data/network/network.json` and validates its version only.
 * The full `validateShibuyaNetwork` source gate is `test/network-review.test.ts`'s
 * subject; a population test needs a real graph, not a re-audit of the builder.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { JunctionAdmissions } from "../src/network/admissions.ts";
import { createPopulation, populationInvariants, type Population } from "../src/agents/population/tick.ts";
import { populationSettings, type PopulationSettings } from "../src/agents/population/config.ts";
import type { NetworkData } from "../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../src/world/agent-assets.ts";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Restore the shipped defaults for every test seam. Tests share one module
 * instance of the population, so a seam left set is a mutation escaping into the
 * next file, which is how a gate passes for the wrong reason.
 */
export function resetInvariants(): void {
  populationInvariants.driveWithoutGrant = false;
  populationInvariants.ignoreCurb = false;
  populationInvariants.leakRetiredBody = false;
  populationInvariants.violations = 0;
}

export function deliveredNetwork(): NetworkData {
  const bytes = readFileSync(resolve(ROOT, "data/network/network.json"));
  const network = JSON.parse(bytes.toString("utf8")) as NetworkData;
  if (network.version !== 1) throw new Error(`Delivered network version ${String(network.version)} is not 1; population tests pin version 1.`);
  return network;
}

export function deliveredFleet(): VehicleAssetManifest {
  const bytes = readFileSync(resolve(ROOT, "data/scene/agents/vehicles.json"));
  const fleet = JSON.parse(bytes.toString("utf8")) as VehicleAssetManifest;
  if (fleet.version !== 1 || fleet.units !== "metres") throw new Error("Delivered vehicle manifest is not the version-1 metre fleet the population projects footprints from.");
  return fleet;
}

export interface Fixture {
  readonly network: NetworkData;
  readonly fleet: VehicleAssetManifest;
  readonly admissions: JunctionAdmissions;
  readonly population: Population;
}

export function fixture(overrides: Partial<PopulationSettings> = {}): Fixture {
  const network = deliveredNetwork();
  const fleet = deliveredFleet();
  const admissions = new JunctionAdmissions(network);
  const settings = populationSettings({ pedestrians: 60, vehicles: 12, seed: 0x5b1b0a, spawnIntervalTicks: 1, ...overrides });
  const population = createPopulation({ network, fleet, admissions, settings });
  return { network, fleet, admissions, population };
}

export function run(population: Population, ticks: number, step = 1 / 60): void {
  for (let tick = 1; tick <= ticks; tick += 1) population.update(step, tick * step);
}
