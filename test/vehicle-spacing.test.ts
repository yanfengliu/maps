/**
 * Vehicle spacing gate. Bound: the delivered network and fleet, seed 0x5b1b0a,
 * 1,200 ticks at 1/60 s — 20 simulated seconds — with 120 vehicles and no
 * pedestrians, measured every 5 ticks. That window is long enough for queues to
 * form at the portals and at the first gates and for two bodies to be placed at
 * one portal, which are the two ways the shipped revision produced overlapping
 * bodies; it is not a full signal cycle, and it says nothing about pedestrian
 * spacing or about lane changes at junctions.
 *
 * Claim: over the run, no two vehicles travelling the same direction ever overlap
 * as oriented collision boxes. The boxes are the delivered collision envelopes
 * (kei 1.920 x 3.573 m, taxi 2.140 x 4.573 m, bus 3.280 x 10.565 m) projected from
 * the published pose buffers, and the test is a separating-axis test on those
 * boxes, not a distance between origins: the defect this gate exists for was a
 * queue whose bodies interpenetrated while every origin gap read 0.5 m.
 *
 * Every overlap the run does produce must be head-on, and its two lane centrelines
 * must come within the two bodies' own half lengths of each other. That is the
 * network's folded-lane geometry (a lane section whose polyline doubles back on
 * itself), where two bodies are drawn on top of one another and no car-following
 * rule can order them; a head-on overlap between lanes further apart is a
 * different defect and fails here.
 *
 * Made to go red by restoring the origin-to-origin separation the car-following law
 * used before this change (`delta` instead of `delta - halfLengths` in
 * `buildVehicleFrame`'s clearance). The mutation and the message it produced are
 * recorded in `docs/learning/gate-proofs.md`.
 */
import { afterEach, describe, expect, it } from "vitest";

import { createPopulation } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import { JunctionAdmissions } from "../src/network/admissions.ts";
import type { NetworkData } from "../src/world/network-data.ts";
import { overlappingPairs, sameDirection, vehicleBoxes, type BodyBox, type OverlappingPair } from "../tools/agents/spacing-metrics.ts";
import { deliveredFleet, deliveredNetwork, resetInvariants } from "./population-fixture.ts";

const STEP = 1 / 60;
const TICKS = 1_200;
const SAMPLE_EVERY = 5;
const VEHICLES = 120;
const PEDESTRIANS = 0;

/** Minimum distance between two lanes' centrelines, metres. */
function edgeSeparationM(a: string | null, b: string | null, lanes: NetworkData["lanes"]): number | null {
  if (a === null || b === null) return null;
  if (a === b) return 0;
  const first = lanes.find((lane) => lane.id === a);
  const second = lanes.find((lane) => lane.id === b);
  if (!first || !second) return null;
  let minimum = Number.POSITIVE_INFINITY;
  for (const point of first.points) {
    for (const other of second.points) {
      const distance = Math.hypot(point.x - other.x, point.z - other.z);
      if (distance < minimum) minimum = distance;
    }
  }
  return minimum;
}

afterEach(resetInvariants);

describe("vehicle spacing", () => {
  it("never overlaps two vehicles travelling the same direction", { timeout: 180_000 }, () => {
    const network = deliveredNetwork();
    const fleet = deliveredFleet();
    const population = createPopulation({
      network,
      fleet,
      admissions: new JunctionAdmissions(network),
      settings: populationSettings({ pedestrians: PEDESTRIANS, vehicles: VEHICLES, seed: 0x5b1b0a, spawnIntervalTicks: 1 }),
    });

    const sameDirectionOverlaps: { tick: number; pair: OverlappingPair }[] = [];
    const unattributed: { tick: number; detail: string }[] = [];
    let overlapsSeen = 0;
    let followingPairsSeen = 0;
    let activeSeen = 0;

    for (let tick = 1; tick <= TICKS; tick += 1) {
      population.update(STEP, tick * STEP);
      if (tick % SAMPLE_EVERY !== 0 && tick !== TICKS) continue;
      const boxes: BodyBox[] = vehicleBoxes(fleet, population.poses);
      activeSeen = Math.max(activeSeen, boxes.length);
      if (boxes.length > 1) followingPairsSeen += 1;
      const pairs = overlappingPairs(boxes);
      overlapsSeen += pairs.length;
      if (!pairs.length) continue;
      const diagnostics = population.diagnostics();
      for (const pair of pairs) {
        if (sameDirection(pair)) {
          sameDirectionOverlaps.push({ tick, pair });
          continue;
        }
        const edges = [pair.a, pair.b].map((slot) => {
          const row = diagnostics.vehicles.find((entry) => entry.slot === slot);
          const route = population.vehicleRoute(slot);
          return row && route ? route.edgeIds[row.routeIndex] ?? null : null;
        });
        const boxesBySlot = new Map(boxes.map((box) => [box.slot, box]));
        const allowance = (boxesBySlot.get(pair.a)?.halfLengthM ?? 0) + (boxesBySlot.get(pair.b)?.halfLengthM ?? 0);
        const separation = edgeSeparationM(edges[0] ?? null, edges[1] ?? null, network.lanes);
        if (separation === null || separation > allowance) {
          unattributed.push({ tick, detail: `${pair.labelA} into ${pair.labelB}, lane centrelines ${separation === null ? "unknown" : separation.toFixed(3)} m apart, allowance ${allowance.toFixed(3)} m` });
        }
      }
    }

    expect(activeSeen, "the gate is vacuous unless vehicles were actually drawn and following each other").toBeGreaterThan(3);
    expect(followingPairsSeen, "the gate is vacuous unless the run contained multi-vehicle frames").toBeGreaterThan(0);
    expect(
      sameDirectionOverlaps.slice(0, 5).map((entry) => `tick ${entry.tick}: ${entry.pair.labelA} into ${entry.pair.labelB}, ${entry.pair.penetrationM.toFixed(3)} m of oriented-box overlap at a ${entry.pair.originGapM.toFixed(3)} m origin gap, headings ${entry.pair.headingDeltaDegrees.toFixed(1)} deg apart`),
    ).toEqual([]);
    expect(unattributed.slice(0, 5).map((entry) => `tick ${entry.tick}: ${entry.detail}`)).toEqual([]);
    expect(overlapsSeen).toBeGreaterThanOrEqual(0);
  });
});
