/**
 * Vehicle run gate. Bound: the delivered network and fleet, seed `0x5b1b0a`, 1,200
 * ticks at 1/60 s — 20 simulated seconds — with 60 vehicles and no pedestrians,
 * sampled every tick. Every input is named here because the numbers below are
 * properties of this window and not of the deliverable.
 *
 * What it says nothing about, and these bounds are the ones that matter:
 *
 *  - **The bus class is never drawn.** The plan phase refuses every bus with
 *    `vehicle class bus at scale 1.002 has no AOI entry portal whose junction
 *    sections are long enough for its 5.541 m footprint radius`, so the 3.280 m
 *    body whose lane keeping this criterion is most nervous about has no
 *    representation in this run at all. The lane-keeping clause therefore states
 *    its floor over kei and taxi only, and the bus is a recorded structural limit
 *    rather than something this gate measures.
 *  - **No signal-governed entry happens.** Not one body in this window enters a
 *    signalized junction's conflict disk on a governed approach lane. Controls
 *    that *are* gated elsewhere are named in the signal clause below; the green
 *    half is not gated here and cannot be, because this fixture never reaches it.
 *  - **Not the acceptance population.** 60 vehicles, not the 200 in
 *    `PERFORMANCE_TARGET`, and no pedestrians at all. The 20-second window is
 *    under one signal cycle, so a body cannot be watched across a green-to-red
 *    transition.
 *  - **Not appearance.** Nothing here sees a pixel, a frame or a renderer.
 *
 * Claim: over this run, the vehicles the population draws hold their lanes, obey
 * the authority that governs their entries, execute their turns as movement
 * rather than as a change of plan, and both enter and retire through the boundary.
 * Each of the four clauses reports its own evidence, and each reports how many
 * times it had the opportunity to fail — because a clause with no opportunity is
 * not a clause that passed.
 *
 * Made to go red by three arms. What each one changes and which clause it reddens
 * are recorded in `artifacts/vehicle-gate/REPORT.md`, and the messages they produce
 * are not yet recorded anywhere, because this gate has not been run:
 *
 *  1. `populationInvariants.misplaceVehicleInLane` draws every body on the zeroth
 *     lateral lane of its route, which is a 1.35 m sideways displacement on a
 *     3.0 m lane. This reddens the lane-keeping clause.
 *  2. Reading the entry-portal set from the *exit* portal list reddens the entry
 *     half of the boundary clause without touching the run, which is what shows
 *     the clause tests portal membership rather than merely counting lanes.
 *  3. Zeroing the run's vehicle samples, turns or retirements reddens the matching
 *     vacuity guard, one quantity at a time.
 *
 * **The signal clause has no red control here, and the vacuity guard is what
 * fires instead.** Signal obedience is enforced in `JunctionAdmissions.resolve`,
 * which will not grant entry to a signal group that is not green, and the half of
 * it that closes — a body that enters a governed section anyway — is already gated
 * by `population-authority.test.ts` through `status.authorityViolations`, with a
 * mutation that produces 637 violations against 0 unmutated. What was missing was
 * the temporal half: nobody watched a run to see whether that enforcement holds
 * over time. This gate does watch it, and reports `governedEntries`. In this
 * fixture that number is 0, so there is no observation to assert on and no
 * mutation this gate could apply that would prove more than the vacuity guard
 * already does. The honest control is therefore the guard on an absent
 * measurement, and the header says so rather than implying a fourth arm exists.
 *
 * Measured on this window while the gate was written, and not re-measured after
 * it: 28,923 lane samples with a largest offset from the lane centreline of
 * 0.0216 m; the drawn envelope no more than 0.3899 m inside its lane edge; 46
 * completed turns and 150 lane-section changes at junctions; 34 entries, all at
 * an entry portal; 6 exits, all at an exit portal; 0 authority violations against
 * 2,755 grants. Those numbers came from throwaway probes that have been deleted,
 * and the gate's own run of them is the one verification this file has not yet
 * had.
 */
import { afterEach, describe, expect, it } from "vitest";

import { JunctionAdmissions } from "../src/network/admissions.ts";
import { MAX_BOUNDARY_EGRESS_M } from "../src/network/admission-bounds.ts";
import { createPopulation, populationInvariants, type Population } from "../src/agents/population/tick.ts";
import { populationSettings } from "../src/agents/population/config.ts";
import type { LaneEdge, NetworkData, WorldPoint } from "../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../src/world/agent-assets.ts";
import { describe as describeValues, envelopeBeyondLaneEdgeM, halfExtents, projectOnPolyline } from "../tools/agents/vehicle-run-metrics.ts";
import { deliveredFleet, deliveredNetwork, resetInvariants } from "./population-fixture.ts";

const STEP = 1 / 60;
const SEED = 0x5b1b0a;
const VEHICLES = 60;
const PEDESTRIANS = 0;
const TICKS = 1_200;
/**
 * How far a drawn body may sit from the centreline of the lane it is on, metres.
 *
 * Measured on this window: 20,610 of 28,923 samples sit exactly on the
 * centreline and the largest offset anywhere is 0.0216 m, so 0.05 m is more than
 * twice the worst the delivered placement produces. It is a tolerance and not a
 * derivation: the body is placed by `placeVehicle` and this gate re-derives the
 * distance from the published pose and the delivered polyline rather than
 * restating `sampleRoute`.
 */
const LANE_TOLERANCE_M = 0.05;
/** A lane section change the plan did not intend is a re-home, not a turn. */
const TURN_SWING_FLOOR_DEG = 20;

/* ------------------------------------------------------------- measurement */

export interface VehicleRunReport {
  readonly bound: { readonly seed: number; readonly vehicles: number; readonly pedestrians: number; readonly ticks: number; readonly simulatedSeconds: number };
  readonly active: { readonly distinctBodies: number; readonly maximum: number; readonly mean: number };
  readonly lifecycle: { readonly spawned: number; readonly retired: number; readonly retiredInPlace: number; readonly boundarySpawns: number };
  readonly lanes: {
    readonly samples: number;
    readonly egressSamplesExcluded: number;
    readonly offsetM: ReturnType<typeof describeValues>;
    readonly envelopeBeyondEdgeM: ReturnType<typeof describeValues>;
    readonly crossingSamples: number;
    readonly laneWidthsM: readonly number[];
    readonly classesDrawn: readonly number[];
  };
  readonly signals: {
    readonly authorityViolations: number;
    readonly grants: number;
    readonly governedEntries: number;
    readonly ungovernedDiskEntries: number;
    readonly signalJunctionsWithACycleAdvance: number;
    readonly signalJunctions: number;
  };
  readonly turns: {
    readonly transitionsAtAJunction: number;
    readonly turnsCompleted: number;
    readonly maximumSwingDeg: number;
    readonly minimumTicksOnATurnLane: number;
    readonly maximumOffsetDuringATurnM: number;
  };
  readonly boundary: {
    readonly entries: number;
    readonly entriesAtAnEntryPortal: number;
    readonly exits: number;
    readonly exitsAtAnExitPortal: number;
    readonly maximumOutwardM: number;
    readonly envelopeM: number;
  };
}

export interface RunInputs {
  readonly network: NetworkData;
  readonly fleet: VehicleAssetManifest;
  readonly vehicles: number;
  readonly ticks: number;
  readonly spawnIntervalTicks?: number;
}

/** The seams this gate drives to make its own clauses go red. */
export interface RunMutations {
  /**
   * Draw every body on the zeroth lateral lane of its route. The population's own
   * seam; a body whose route drives lane 1 is drawn 1.35 m to the side of it.
   */
  readonly misplaceVehicleInLane?: boolean;
  /**
   * Read the entry-portal set from the *exit* portal list instead of the entry
   * list. The population is untouched: the run draws, turns and retires exactly
   * as it does unmutated, and the only thing that changes is which portal list
   * the boundary clause checks against, which is the claim being tested.
   */
  readonly readExitsAsEntries?: boolean;
}

interface BodyState {
  readonly generation: number;
  egressing: boolean;
  /** The portal edge this body began retiring on, held after the plan clears. */
  egressEdgeId: string;
  /** Turn lanes entered and not yet left, with the ticks and offsets spent on each. */
  readonly turns: Map<string, { ticks: number; maximumOffsetM: number }>;
  /** Junction disks this body has already been counted into on this entry. */
  readonly inside: Set<string>;
}

/**
 * Drive the delivered population and measure the four clauses over the run.
 *
 * The lane reading is built from the pose buffers and the delivered lane
 * polylines: the offset is the perpendicular distance from the drawn position to
 * the polyline of the lane the body is on, and the lane is the plan's own
 * occurrence rather than a nearest-lane search, which would be ambiguous wherever
 * two lanes run within a lane's width of each other. That is the one piece of
 * bookkeeping the lane clause borrows, and it is borrowed deliberately: what is
 * being checked is whether the drawn pose is on the lane the plan names, which is
 * a question about the pose and the plan together and cannot be asked of either
 * alone. Position continuity, the envelope width and the portal geometry are all
 * re-derived here from the buffers, the manifest and the delivered polylines.
 */
export function measureVehicleRun(inputs: RunInputs, mutations: RunMutations = {}): VehicleRunReport {
  const { network, fleet, vehicles, ticks } = inputs;
  const admissions = new JunctionAdmissions(network);
  // The seam is set before construction, which is the only moment it is read.
  populationInvariants.misplaceVehicleInLane = mutations.misplaceVehicleInLane ?? false;
  const population: Population = createPopulation({
    network,
    fleet,
    admissions,
    settings: populationSettings({ pedestrians: PEDESTRIANS, vehicles, seed: SEED, spawnIntervalTicks: inputs.spawnIntervalTicks ?? 1 }),
  });

  const laneById = new Map<string, LaneEdge>(network.lanes.map((lane) => [lane.id, lane]));
  const entryPortals = new Set(mutations.readExitsAsEntries ? network.portals.vehicleExit : network.portals.vehicleEntry);
  const exitPortals = new Set(network.portals.vehicleExit);
  const signalJunctions = network.junctions.filter((junction) => junction.controlKind === "signal");

  const offsets: number[] = [];
  const beyondEdge: number[] = [];
  const widths = new Set<number>();
  const classes = new Set<number>();
  const turnSwing: number[] = [];
  const turnTicks: number[] = [];
  const turnOffsets: number[] = [];
  const outward: number[] = [];
  const bodies = new Map<number, BodyState>();
  const cycles = new Map<string, number>();
  const lastCycle = new Map<string, number>();
  let samples = 0;
  let egressSamplesExcluded = 0;
  let crossingSamples = 0;
  let activeSum = 0;
  let maximumActive = 0;
  let entries = 0;
  let entriesAtPortal = 0;
  let exits = 0;
  let exitsAtPortal = 0;
  let turnsCompleted = 0;
  let transitionsAtAJunction = 0;
  let governedEntries = 0;
  let ungovernedDiskEntries = 0;
  let maximumSwing = 0;

  for (let tick = 1; tick <= ticks; tick += 1) {
    population.update(STEP, tick * STEP);
    const snapshots = admissions.signalSnapshot();
    for (const snapshot of snapshots) {
      const previous = lastCycle.get(snapshot.junctionId);
      if (previous !== undefined && snapshot.cycle > previous) cycles.set(snapshot.junctionId, (cycles.get(snapshot.junctionId) ?? 0) + (snapshot.cycle - previous));
      lastCycle.set(snapshot.junctionId, snapshot.cycle);
    }

    const poses = population.poses.vehicles;
    const diagnosed = new Map(population.diagnostics().vehicles.map((entry) => [entry.slot, entry]));
    let active = 0;

    for (let slot = 0; slot < poses.count; slot += 1) {
      if (poses.active[slot] !== 1) {
        bodies.delete(slot);
        continue;
      }
      active += 1;
      const generation = poses.current.generation[slot]!;
      const x = poses.current.position[slot * 3]!;
      const z = poses.current.position[slot * 3 + 2]!;
      const entry = diagnosed.get(slot);
      const route = population.vehicleRoute(slot);
      const routeIndex = entry?.routeIndex ?? 0;
      const edgeId = route?.edgeIds[routeIndex] ?? "";
      const edge = laneById.get(edgeId) ?? null;
      const egressing = entry?.egressing ?? false;
      const variant = entry?.variant ?? poses.variant[slot]!;
      const scale = entry?.scale ?? poses.scale[slot]!;
      classes.add(variant);

      let state = bodies.get(slot);
      if (!state || state.generation !== generation) {
        // A spawn. The contract materializes a body as an invisible pose at its
        // actual entrance portal and activation is what makes it present, so the
        // reading is the route's own first occurrence against the portal list.
        entries += 1;
        if (routeIndex === 0 && entryPortals.has(edgeId)) entriesAtPortal += 1;
        bodies.set(slot, { generation, egressing, egressEdgeId: "", turns: new Map(), inside: new Set() });
        continue;
      }

      if (edge) {
        widths.add(edge.widthM);
        const projection = projectOnPolyline(edge.points, x, z);
        if (!egressing) {
          samples += 1;
          offsets.push(projection.distanceM);
          const half = halfExtents(fleet, variant, scale);
          const beyond = envelopeBeyondLaneEdgeM(projection.distanceM, half.halfWidthM, edge.widthM);
          beyondEdge.push(beyond);
          if (beyond <= 0) crossingSamples += 1;
        } else {
          egressSamplesExcluded += 1;
        }
      }

      if (egressing && !state.egressing) {
        // The exit is read the tick a body starts retiring, while its plan is
        // still attached: `retireSlot` clears the route in the same tick the
        // egress completes, so a reader that waits for the route to vanish reads
        // an empty edge id and cannot tell a portal from anywhere else.
        exits += 1;
        const last = route?.edgeIds.at(-1) ?? "";
        if (exitPortals.has(last)) exitsAtPortal += 1;
        state.egressEdgeId = last;
      }
      if (egressing && state.egressEdgeId) {
        // Displacement from the exit portal's own last vertex, re-derived from
        // the delivered polyline rather than from the population's own
        // `boundaryProgress`, which is what the authority uses to decide.
        const portal = laneById.get(state.egressEdgeId)?.points.at(-1);
        if (portal) outward.push(Math.hypot(x - portal.x, z - portal.z));
      }

      // Turns: a body on a `turn` lane is on a section change the plan made at a
      // junction. It has to spend the junction on that lane and stay on it.
      if (edge?.kind === "turn") {
        const record = state.turns.get(edgeId) ?? { ticks: 0, maximumOffsetM: 0 };
        record.ticks += 1;
        record.maximumOffsetM = Math.max(record.maximumOffsetM, projectOnPolyline(edge.points, x, z).distanceM);
        state.turns.set(edgeId, record);
      }
      // Any turn lane this body is no longer on has been left, whether it left it
      // for the next section or for the next lane: what is being measured is the
      // section change the plan made, not where the body went afterwards. This
      // runs every tick rather than only on an edge change, so a body that reaches
      // the end of the window mid-turn is still counted.
      for (const [turnId, record] of [...state.turns]) {
        if (turnId === edgeId) continue;
        const turn = laneById.get(turnId);
        const swing = turn ? polylineSwingDeg(turn.points) : 0;
        turnSwing.push(swing);
        maximumSwing = Math.max(maximumSwing, swing);
        transitionsAtAJunction += 1;
        if (swing >= TURN_SWING_FLOOR_DEG) {
          turnsCompleted += 1;
          turnTicks.push(record.ticks);
          turnOffsets.push(record.maximumOffsetM);
        }
        state.turns.delete(turnId);
      }

      // Signal clause: the first tick a body's origin is inside a signalized
      // junction's conflict disk, on an approach lane that carries an entry
      // group. A body already inside is lawfully clearing and is not an entry.
      for (const junction of signalJunctions) {
        const inside = Math.hypot(x - junction.position.x, z - junction.position.z) <= junction.radiusM;
        const was = state.inside.has(junction.id);
        if (inside && !was) {
          state.inside.add(junction.id);
          if (edge?.signalGroupId) governedEntries += 1;
          else ungovernedDiskEntries += 1;
        } else if (!inside && was) {
          state.inside.delete(junction.id);
        }
      }

      state.egressing = egressing;
    }

    activeSum += active;
    if (active > maximumActive) maximumActive = active;
  }

  const status = population.status();
  population.dispose();
  return {
    bound: { seed: SEED, vehicles, pedestrians: PEDESTRIANS, ticks, simulatedSeconds: Number((ticks * STEP).toFixed(1)) },
    active: { distinctBodies: bodies.size, maximum: maximumActive, mean: Number((activeSum / Math.max(1, ticks)).toFixed(2)) },
    lifecycle: { spawned: status.lifecycle.spawned, retired: status.lifecycle.retired, retiredInPlace: status.retiredInPlace, boundarySpawns: status.boundarySpawns },
    lanes: {
      samples,
      egressSamplesExcluded,
      offsetM: describeValues(offsets),
      envelopeBeyondEdgeM: describeValues(beyondEdge),
      crossingSamples,
      laneWidthsM: [...widths].sort((left, right) => left - right),
      classesDrawn: [...classes].sort((left, right) => left - right),
    },
    signals: {
      authorityViolations: status.authorityViolations,
      grants: status.grants,
      governedEntries,
      ungovernedDiskEntries,
      signalJunctionsWithACycleAdvance: cycles.size,
      signalJunctions: signalJunctions.length,
    },
    turns: {
      transitionsAtAJunction,
      turnsCompleted,
      maximumSwingDeg: Number(maximumSwing.toFixed(3)),
      minimumTicksOnATurnLane: turnTicks.length ? Math.min(...turnTicks) : 0,
      maximumOffsetDuringATurnM: turnOffsets.length ? Number(Math.max(...turnOffsets).toFixed(4)) : 0,
    },
    boundary: {
      entries,
      entriesAtAnEntryPortal: entriesAtPortal,
      exits,
      exitsAtAnExitPortal: exitsAtPortal,
      maximumOutwardM: outward.length ? Number(Math.max(...outward).toFixed(4)) : 0,
      envelopeM: MAX_BOUNDARY_EGRESS_M,
    },
  };
}

/** The total heading change along a polyline, degrees. */
export function polylineSwingDeg(points: readonly WorldPoint[]): number {
  let total = 0;
  for (let index = 2; index < points.length; index += 1) {
    const a = points[index - 2]!;
    const b = points[index - 1]!;
    const c = points[index]!;
    const first = Math.atan2(b.x - a.x, b.z - a.z);
    const second = Math.atan2(c.x - b.x, c.z - b.z);
    let delta = second - first;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    total += Math.abs((delta * 180) / Math.PI);
  }
  return total;
}

/* --------------------------------------------------------- the four clauses */

/**
 * Every way this report fails its claim, one message per finding, empty when the
 * run satisfies all four clauses.
 *
 * The guards are part of the claim and not a preamble to it: a report whose lane
 * sample count is zero has not kept any lane, and one whose turn count is zero
 * has not turned. Each guard names the quantity that was absent rather than
 * asserting a floor nobody can interpret.
 */
export function controlFailures(report: VehicleRunReport): string[] {
  const failures: string[] = [];

  // Not vacuous: the run has to have drawn bodies, changed section and retired
  // one, or the clauses below are describing an empty run.
  if (report.lanes.samples === 0) failures.push("the run drew no vehicle pose at all, so no clause below measured anything: 0 lane samples over the window");
  if (report.active.maximum <= 3) failures.push(`the run never held more than ${report.active.maximum} vehicles, which is too few for a lane, a turn and a boundary retirement to be separate events`);
  if (report.turns.transitionsAtAJunction === 0) failures.push("no vehicle changed lane section at a junction, so the turn clause never had an opportunity to fail");
  if (report.turns.turnsCompleted === 0) failures.push(`no lane section change at a junction swung ${TURN_SWING_FLOOR_DEG} degrees or more, so nothing in this run turned`);
  if (report.boundary.entries === 0) failures.push("no vehicle entered the run, so the entry clause measured nothing");
  if (report.boundary.exits === 0) failures.push("no vehicle retired through the boundary, so the exit clause measured nothing");

  // Hold their lanes.
  if (report.lanes.offsetM.maximum > LANE_TOLERANCE_M) {
    failures.push(`a drawn body sat ${report.lanes.offsetM.maximum.toFixed(4)} m from the centreline of the lane it is on, over a ${LANE_TOLERANCE_M} m tolerance`);
  }

  // Obey the signals.
  //
  // The half of this clause that can fail is already gated, and is not duplicated
  // here: a body that enters a governed conflict section with no grant of its own
  // is counted by `status.authorityViolations` and gated by
  // `population-authority.test.ts`, which watches that counter go from 0 to 637
  // under `driveWithoutGrant`. `JunctionAdmissions.resolve` is also the only path
  // into either population's governed sections, and it refuses an entry while
  // `SignalController.canEnter` is false for the entry group, which the population
  // has no way to reach around: `test/population-authority.test.ts` asserts that
  // no module under `src/agents/population/` even names `canEnter`.
  //
  // What was missing is the temporal half — watching a run to see that the
  // enforcement holds over time — and that is what this gate adds, by counting
  // `governedEntries`. In this window the number is 0: the driven corridors do not
  // contain a signalized junction's governed approaches, so this gate has no
  // observation of a green-light entry and says so in its own reading rather than
  // reporting the absence as agreement.
  if (report.signals.authorityViolations !== 0) {
    failures.push(`${report.signals.authorityViolations} vehicles moved into a governed conflict section with no grant of their own; the single-authority invariant is broken`);
  }

  // Turn.
  for (const turn of ["turnsCompleted", "transitionsAtAJunction"] as const) {
    if (report.turns[turn] === 0) failures.push(`turn clause: ${turn} is 0, so there is no turn in this run to check`);
  }
  if (report.turns.turnsCompleted > 0 && report.turns.minimumTicksOnATurnLane < 2) {
    failures.push(`a turn was completed in ${report.turns.minimumTicksOnATurnLane} tick(s), which is a section change rather than a driven junction`);
  }
  if (report.turns.maximumOffsetDuringATurnM > LANE_TOLERANCE_M) {
    failures.push(`a body turned ${report.turns.maximumOffsetDuringATurnM.toFixed(4)} m off its turn lane, so the turn was not driven along the junction geometry`);
  }

  // Spawn and despawn at the boundary.
  if (report.boundary.entries !== report.boundary.entriesAtAnEntryPortal) {
    failures.push(`${report.boundary.entries - report.boundary.entriesAtAnEntryPortal} of ${report.boundary.entries} vehicles appeared somewhere other than a vehicle entry portal's own first occurrence`);
  }
  if (report.boundary.exits !== report.boundary.exitsAtAnExitPortal) {
    failures.push(`${report.boundary.exits - report.boundary.exitsAtAnExitPortal} of ${report.boundary.exits} vehicles retired through a path that is not a vehicle exit portal`);
  }
  if (report.lifecycle.retiredInPlace !== 0) {
    failures.push(`${report.lifecycle.retiredInPlace} vehicles vanished on the network instead of retiring through the boundary envelope`);
  }
  if (report.boundary.exits > 0 && report.boundary.maximumOutwardM > report.boundary.envelopeM) {
    failures.push(`a retiring body reached ${report.boundary.maximumOutwardM.toFixed(4)} m from its exit portal, past the authored ${report.boundary.envelopeM} m retirement envelope`);
  }

  return failures;
}

/**
 * What this window did not reach, in the gate's own output rather than only in a
 * comment. A clause that measured nothing is a fact about the gate and belongs
 * where a reader of a passing run will see it.
 */
export function unmeasuredClauses(report: VehicleRunReport): string[] {
  const notes: string[] = [];
  if (report.signals.governedEntries === 0) {
    notes.push(`signal clause unmeasured: 0 of ${report.signals.ungovernedDiskEntries} junction-disk entries in this window were on an approach lane carrying an entry signal group, so nothing here observed a green-light entry; the authority half is gated in test/population-authority.test.ts`);
  }
  return notes;
}

/** A copy of `report` with named fields replaced, for proving a guard can fire. */
export function withOverrides(report: VehicleRunReport, overrides: {
  lanes?: Partial<VehicleRunReport["lanes"]>;
  signals?: Partial<VehicleRunReport["signals"]>;
  turns?: Partial<VehicleRunReport["turns"]>;
  boundary?: Partial<VehicleRunReport["boundary"]>;
  lifecycle?: Partial<VehicleRunReport["lifecycle"]>;
  active?: Partial<VehicleRunReport["active"]>;
}): VehicleRunReport {
  return {
    ...report,
    lanes: { ...report.lanes, ...overrides.lanes },
    signals: { ...report.signals, ...overrides.signals },
    turns: { ...report.turns, ...overrides.turns },
    boundary: { ...report.boundary, ...overrides.boundary },
    lifecycle: { ...report.lifecycle, ...overrides.lifecycle },
    active: { ...report.active, ...overrides.active },
  };
}

/** The window every case below shares, and the only inputs the gate varies. */
const WINDOW: RunInputs = { network: deliveredNetwork(), fleet: deliveredFleet(), vehicles: VEHICLES, ticks: TICKS };

/**
 * The window is measured once and every case reads that one report, so the green
 * case and the evidence case cannot disagree about the run they describe.
 */
let measured: VehicleRunReport | null = null;
function window(): VehicleRunReport {
  measured ??= measureVehicleRun(WINDOW);
  return measured;
}

afterEach(resetInvariants);

describe("vehicles over a run", () => {
  it("holds lanes, turns, and enters and retires through the boundary", { timeout: 120_000 }, () => {
    expect(controlFailures(window())).toEqual([]);
  });

  it("shows the window reached all four clauses", () => {
    // The evidence behind the green case above, so a reader can see the window
    // was not empty and how big it was. These are floors and ceilings rather than
    // the exact readings, because the exact readings are recorded in the header of
    // this file and in the lane clause's tolerance; a range that a changed window
    // would leave is the check, and a copy of one run's floats is not.
    const report = window();
    expect(report.lanes.samples).toBeGreaterThan(20_000);
    expect(report.lanes.egressSamplesExcluded).toBeGreaterThan(0);
    expect(report.lanes.offsetM.maximum).toBeLessThan(LANE_TOLERANCE_M);
    expect(report.lanes.envelopeBeyondEdgeM.maximum).toBeLessThan(0);
    expect(report.lanes.laneWidthsM.length).toBeGreaterThan(0);
    expect(report.turns.transitionsAtAJunction).toBeGreaterThan(50);
    expect(report.turns.turnsCompleted).toBeGreaterThan(10);
    expect(report.turns.maximumSwingDeg).toBeGreaterThan(90);
    expect(report.turns.minimumTicksOnATurnLane).toBeGreaterThanOrEqual(2);
    expect(report.turns.maximumOffsetDuringATurnM).toBeLessThan(LANE_TOLERANCE_M);
    expect(report.boundary.entries).toBeGreaterThan(10);
    expect(report.boundary.entriesAtAnEntryPortal).toBe(report.boundary.entries);
    expect(report.boundary.exits).toBeGreaterThan(0);
    expect(report.boundary.exitsAtAnExitPortal).toBe(report.boundary.exits);
    expect(report.boundary.maximumOutwardM).toBeLessThan(report.boundary.envelopeM);
    expect(report.lifecycle.retiredInPlace).toBe(0);
    expect(report.signals.authorityViolations).toBe(0);
    expect(report.signals.grants).toBeGreaterThan(100);
    // What this window did not reach. Asserted, not just commented: a later change
    // that starts driving the signalized corridors will fail here, which is the
    // signal that the signal clause has become measurable and should be asserted
    // rather than noted.
    expect(unmeasuredClauses(report)).toEqual([
      `signal clause unmeasured: 0 of ${report.signals.ungovernedDiskEntries} junction-disk entries in this window were on an approach lane carrying an entry signal group, so nothing here observed a green-light entry; the authority half is gated in test/population-authority.test.ts`,
    ]);
  });

  it("is vacuous unless vehicles were drawn, turned, and retired through the boundary", () => {
    // Case one: no vehicle pose was ever published. This is the run that never
    // started, and every clause below it would otherwise have read green.
    const empty = withOverrides(window(), { lanes: { samples: 0 }, active: { maximum: 0 }, turns: { transitionsAtAJunction: 0, turnsCompleted: 0 }, boundary: { entries: 0, exits: 0 } });
    expect(controlFailures(empty)).toEqual([
      "the run drew no vehicle pose at all, so no clause below measured anything: 0 lane samples over the window",
      "the run never held more than 0 vehicles, which is too few for a lane, a turn and a boundary retirement to be separate events",
      "no vehicle changed lane section at a junction, so the turn clause never had an opportunity to fail",
      `no lane section change at a junction swung ${TURN_SWING_FLOOR_DEG} degrees or more, so nothing in this run turned`,
      "no vehicle entered the run, so the entry clause measured nothing",
      "no vehicle retired through the boundary, so the exit clause measured nothing",
      "turn clause: turnsCompleted is 0, so there is no turn in this run to check",
      "turn clause: transitionsAtAJunction is 0, so there is no turn in this run to check",
    ]);

    // Case two: the run happened but nothing turned. The guard fires on its own
    // quantity and leaves the boundary clause alone.
    const straight = withOverrides(window(), { turns: { transitionsAtAJunction: 0, turnsCompleted: 0 } });
    expect(controlFailures(straight)).toEqual([
      "no vehicle changed lane section at a junction, so the turn clause never had an opportunity to fail",
      `no lane section change at a junction swung ${TURN_SWING_FLOOR_DEG} degrees or more, so nothing in this run turned`,
      "turn clause: turnsCompleted is 0, so there is no turn in this run to check",
      "turn clause: transitionsAtAJunction is 0, so there is no turn in this run to check",
    ]);

    const neverRetired = withOverrides(window(), { boundary: { exits: 0, exitsAtAnExitPortal: 0 } });
    expect(controlFailures(neverRetired)).toEqual(["no vehicle retired through the boundary, so the exit clause measured nothing"]);

    const neverEntered = withOverrides(window(), { boundary: { entries: 0, entriesAtAnEntryPortal: 0 } });
    expect(controlFailures(neverEntered)).toEqual(["no vehicle entered the run, so the entry clause measured nothing"]);
  });

  it("goes red when a body is drawn on the wrong lane", { timeout: 120_000 }, () => {
    const mutated = measureVehicleRun(WINDOW, { misplaceVehicleInLane: true });
    const failures = controlFailures(mutated);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("from the centreline of the lane it is on");
    // The mutation moves bodies sideways and changes nothing else: the run still
    // draws, still turns and still retires, so the reading that moved is the lane
    // offset rather than the whole report.
    expect(mutated.lanes.samples).toBeGreaterThan(1_000);
    expect(mutated.lanes.offsetM.maximum).toBeGreaterThan(LANE_TOLERANCE_M);
    expect(mutated.turns.turnsCompleted).toBeGreaterThan(0);
  });

  it("goes red when the boundary clause is checked against the wrong portal list", { timeout: 120_000 }, () => {
    // The population is not mutated here. The run draws, turns and retires exactly
    // as it does above; what changes is which portal list the clause reads, which
    // is the claim under test. If the entry reading were satisfied by any lane at
    // all rather than by a vehicle entry portal, this arm would stay green.
    const mutated = measureVehicleRun(WINDOW, { readExitsAsEntries: true });
    const failures = controlFailures(mutated);
    expect(failures).toEqual([
      `${mutated.boundary.entries - mutated.boundary.entriesAtAnEntryPortal} of ${mutated.boundary.entries} vehicles appeared somewhere other than a vehicle entry portal's own first occurrence`,
    ]);
    expect(mutated.boundary.entries).toBeGreaterThan(0);
    expect(mutated.boundary.entriesAtAnEntryPortal).toBe(0);
    // The rest of the run is unchanged, which is what says the mutation moved the
    // portal reading rather than the run.
    expect(mutated.lanes.samples).toBeGreaterThan(20_000);
    expect(mutated.boundary.exits).toBe(mutated.boundary.exitsAtAnExitPortal);
    expect(mutated.turns.turnsCompleted).toBeGreaterThan(10);
  });
});
