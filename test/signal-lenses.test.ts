/**
 * Bound: the lens colours `createStreetDetails` writes for one synthetic signal
 * head, read back off the instanced mesh. No frame is rendered and no browser is
 * involved, so this says nothing about whether a lens is visible at a captured
 * pose — that is a rendered check, and the crossing capture is where it lives.
 *
 * Claim: a lens is bright exactly when the phase the snapshot describes has its
 * group, amber is the preceding approach and every other lens stays red, and the
 * same phase twice does not rewrite the mesh. The defect this gate exists for
 * was the rendered city keeping its "no group active" colours forever because
 * nothing ever passed live state in; this covers the other half of that path,
 * which is what the state does once it arrives.
 *
 * Brightness is compared against the same lens's own dim colour rather than
 * across lenses, because three converts each hue into linear working space and
 * the three dim values therefore differ from each other.
 */
import { InstancedMesh } from "three";
import { describe, expect, it } from "vitest";

import { createStreetDetails } from "../src/scene/street-details.js";
import type { SignalSnapshot } from "../src/network/signals.js";
import type { ControlHardwarePlacement } from "../src/world/control-hardware.js";
import type { NetworkData } from "../src/world/network-data.js";
import { worldStyle } from "../src/world/styles.js";

const VEHICLE_GROUP = "controller:vehicle:0";
const PEDESTRIAN_GROUP = "controller:pedestrian";

/** A junction with one vehicle approach, and that approach's entry lane. */
const network = {
  lanes: [{ id: "road", widthM: 3.5, signalGroupId: VEHICLE_GROUP, points: [{ x: 0, y: 15, z: -10 }, { x: 0, y: 15, z: 10 }] }],
  walks: [],
  junctions: [{ id: "controller", controlKind: "signal", controlSource: "authored", position: { x: 0, y: 15, z: 0 }, radiusM: 12, vehicleGroups: [VEHICLE_GROUP], pedestrianGroup: PEDESTRIAN_GROUP, clearanceSeconds: 3, vehicleGreenSeconds: 12, pedestrianGreenSeconds: 8 }],
  physical: {
    trafficControls: [{ id: "logical", sourceNodeId: 1, position: { x: 0, y: 15, z: 0 }, kind: "traffic_signals", travelDirection: { x: 0, z: 1 }, sourceTags: {}, approachEdgeIds: ["road"], entryEdgeIds: ["road"], controllerId: "controller", sourceWayIds: [10] }],
    crossings: [],
    tactilePaths: [],
  },
} as unknown as NetworkData;

const placement = {
  sourceId: "logical",
  sourceNodeId: 1,
  sourcePosition: { x: 0, y: 15, z: 0 },
  status: "placed",
  reason: "fixture",
  base: { x: 0, y: 15, z: 2 },
  head: { x: 0, y: 18.5, z: 0 },
  direction: { x: 0, y: 0, z: 1 },
  evidence: {},
} as unknown as ControlHardwarePlacement;

const state = (overrides: Partial<SignalSnapshot>): SignalSnapshot => ({
  junctionId: "controller",
  stage: "vehicle",
  activeGroup: VEHICLE_GROUP,
  amberGroup: null,
  elapsedSeconds: 1,
  remainingSeconds: 11,
  clearanceHeld: false,
  cycle: 0,
  ...overrides,
});

/** The brightness of the lens at `index`, as the mesh holds it. */
function brightnessOf(lenses: InstancedMesh, index: number): number {
  const colours = lenses.instanceColor!;
  return colours.getX(index) + colours.getY(index) + colours.getZ(index);
}

describe("signal lens colours", () => {
  const streets = createStreetDetails(network, worldStyle("satellite"), undefined, [placement]);
  const lenses = streets.root.getObjectByName("streets:signal-lenses") as InstancedMesh;
  // `head` builds a vehicle head's lenses in green, amber, red order.
  const read = (): number[] => [0, 1, 2].map((index) => brightnessOf(lenses, index));
  const apply = (phase: SignalSnapshot): number[] => { streets.updateSignals([phase]); return read(); };

  // The four phases this head can be in, as the signal clock reports them.
  const CLEARANCE = state({ stage: "clearance", activeGroup: null, amberGroup: null });
  const VEHICLE = state({});
  const AMBER = state({ stage: "amber", activeGroup: null, amberGroup: VEHICLE_GROUP });
  const PEDESTRIAN = state({ stage: "pedestrian", activeGroup: PEDESTRIAN_GROUP });

  it("has three lenses and starts with no group active, which is every lens red", () => {
    expect(lenses.count).toBe(3);
    const [green, amber, red] = read();
    // The construction call passes the empty snapshot, which is the state a
    // population-free run shows for its whole life: nothing lit but red.
    expect(red).toBeGreaterThan(green!);
    expect(red).toBeGreaterThan(amber!);
    for (const value of [green, amber, red]) expect(value).toBeGreaterThan(0);
  });

  it("lights the active group's lens, and turns the others off by the same 60:1 the colours use", () => {
    const [greenOff, amberOff, redOn] = apply(CLEARANCE);
    const [greenOn, amberStillOff, redOff] = apply(VEHICLE);
    expect(greenOn).toBeCloseTo(greenOff! * 60, 6);
    expect(amberStillOff).toBeCloseTo(amberOff!, 6);
    expect(redOff).toBeCloseTo(redOn! / 60, 6);
  });

  it("shows amber for the preceding approach and red for the lenses it does not own", () => {
    const [greenOff, amberOff, redOn] = apply(CLEARANCE);
    const [greenStillOff, amberOn, redOff] = apply(AMBER);
    expect(amberOn).toBeCloseTo(amberOff! * 60, 6);
    expect(greenStillOff).toBeCloseTo(greenOff!, 6);
    // Amber on an approach is that approach's red off: the two are exclusive.
    expect(redOff).toBeCloseTo(redOn! / 60, 6);

    // Clearance names no vehicle group and the pedestrian stage names the
    // pedestrian one, which is not this head's: a vehicle head stays red
    // through the scramble's pedestrian green, and that is the whole of what
    // the crossing frames can show of this signal.
    expect(apply(PEDESTRIAN), "the pedestrian stage lit a vehicle lens").toEqual(apply(CLEARANCE));
  });

  it("does not rewrite the lenses when the phase it is given has not changed", () => {
    apply(VEHICLE);
    const colours = lenses.instanceColor!;
    const version = colours.version;
    const lit = read();
    // The same groups at a later clock are the same phase: the mesh is left
    // alone rather than rewritten on every frame of the step.
    apply(state({ elapsedSeconds: 5, remainingSeconds: 7 }));
    expect(colours.version).toBe(version);
    expect(read()).toEqual(lit);

    // An empty snapshot is a state of its own, and it is written once.
    streets.updateSignals([]);
    const clearedVersion = colours.version;
    expect(clearedVersion).toBeGreaterThan(version);
    const cleared = read();
    streets.updateSignals([]);
    expect(colours.version).toBe(clearedVersion);
    expect(read()).toEqual(cleared);
    streets.dispose();
  });
});
