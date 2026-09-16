/**
 * The harness contract gate. Bound: the installed bridge objects and the
 * declared interface, in one Node process with no browser. It says nothing about
 * what the app does with a bridge — only that the read-only window a harness
 * reaches through is the window the type describes.
 *
 * Claim: every member `installBridge` and `installFailedBridge` publish is
 * declared on `HarnessBridge`, and every declared member is published by both.
 * The gate is two-sided on purpose, because the defect it exists for was
 * one-sided: `installBridge` published `population()` while the interface above
 * it did not declare the member, so `tools/populated/driver.ts` had to widen the
 * type with a cast to call a function that was already installed.
 *
 * The type half is enforced by `tsc` over `test/`, the runtime half by vitest:
 *
 * 1. `everyDeclaredMemberIsListed` fails to compile if `HarnessBridge` gains a
 *    member the list below does not name.
 * 2. `bridge[name]` fails to compile if the list names something the interface
 *    does not declare, because the list is indexed into the typed bridge rather
 *    than into a string map.
 * 3. `bridge.population()` on a value typed `HarnessBridge` fails to compile if
 *    the member is not declared.
 * 4. The key comparison fails at run time if an install path publishes a member
 *    the list does not name.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { HARNESS_KEY, installBridge, installFailedBridge, type BridgeSources, type HarnessBridge } from "../src/harness/bridge.js";
import { emptyPopulationStatus, type PopulationStatus } from "../src/agents/population/status.js";
import type { SignalSnapshot } from "../src/network/signals.js";

/**
 * The unit gate runs in Node, which has no `window`, and a bridge is installed
 * on one by definition. This stub is the whole of the browser these cases claim:
 * reads and writes of one property, and nothing else.
 */
const page = globalThis as unknown as { window?: Record<string, unknown> };
beforeEach(() => { page.window = {}; });

/**
 * Every member of `HarnessBridge`, by name.
 *
 * Typed as a tuple of the interface's own keys as well as a runtime list: the
 * `MissingFromList` assertion below makes an omission here a compile error, and
 * indexing the typed bridge with it below makes an entry the interface does not
 * declare a compile error.
 */
const MEMBERS = [
  "version",
  "status",
  "camera",
  "tiles",
  "lighting",
  "post",
  "style",
  "facadeSamples",
  "hardware",
  "paint",
  "paintSeams",
  "population",
  "signals",
] as const;

type MissingFromList = Exclude<keyof HarnessBridge, (typeof MEMBERS)[number]>;
const everyDeclaredMemberIsListed: MissingFromList extends never ? true : never = true;

const signals: SignalSnapshot[] = [{
  junctionId: "j",
  stage: "pedestrian",
  activeGroup: "j:pedestrian",
  amberGroup: null,
  elapsedSeconds: 1,
  remainingSeconds: 24,
  clearanceHeld: false,
  cycle: 1,
}];

/**
 * A stand-in for the app's own sources.
 *
 * Only the members these cases call are implemented; the rest are unreachable
 * from here, and `installBridge` reads each one lazily inside its own member, so
 * nothing else is touched before a harness asks for it.
 */
function sources(overrides: Partial<BridgeSources> = {}): BridgeSources {
  const unreachable = (name: string) => () => {
    throw new Error(`The test bridge source ${name} was called; this case only reads population(), signals() and status().`);
  };
  return {
    renderer: null as unknown as BridgeSources["renderer"],
    camera: null as unknown as BridgeSources["camera"],
    controls: null as unknown as BridgeSources["controls"],
    loop: null as unknown as BridgeSources["loop"],
    isReady: () => false,
    contextLost: () => false,
    error: () => null,
    tiles: unreachable("tiles") as unknown as BridgeSources["tiles"],
    lighting: unreachable("lighting") as unknown as BridgeSources["lighting"],
    post: unreachable("post") as unknown as BridgeSources["post"],
    style: () => ({ id: "satellite", label: "Satellite" }),
    facadeSamples: () => [],
    hardware: () => [],
    paint: () => [],
    paintSeams: () => [],
    population: () => emptyPopulationStatus(),
    signals: () => [],
    ...overrides,
  };
}

/** What an install path left on the stub window, if it left anything. */
const installedOnWindow = (): HarnessBridge | undefined => page.window?.[HARNESS_KEY] as HarnessBridge | undefined;

/** Install a bridge without leaving it on a window that outlives the case. */
function installed(sources_: BridgeSources): HarnessBridge {
  const bridge = installBridge(sources_);
  Reflect.deleteProperty(page.window!, HARNESS_KEY);
  return bridge;
}

/** Every declared member is published, as the right kind of thing. */
function expectPublishesEveryMember(bridge: HarnessBridge, install: string): void {
  expect(bridge.version, `${install} published the wrong version`).toBe(1);
  for (const name of MEMBERS) {
    if (name === "version") continue;
    expect(typeof bridge[name], `${install} has no ${name}()`).toBe("function");
  }
  expect(Object.keys(bridge).sort(), `${install} publishes members the list above does not name`).toEqual([...MEMBERS].sort());
}

describe("the harness bridge contract", () => {
  it("declares population() and signals() as callable observations with no cast", () => {
    const population: PopulationStatus = { ...emptyPopulationStatus(), attached: true, ticks: 42 };
    const bridge: HarnessBridge = installed(sources({
      population: () => population,
      signals: () => signals,
    }));

    // No cast on either call: a harness that needs one is reading a type that
    // does not describe the object the app installs.
    expect(bridge.population().ticks).toBe(42);
    expect(bridge.signals()).toEqual(signals);
    expect(bridge.population().attached).toBe(true);
  });

  it("hands out copies, so a reader cannot reach the population's own state", () => {
    const status = { ...emptyPopulationStatus(), attached: true, ticks: 7 };
    const bridge = installed(sources({ population: () => status, signals: () => signals }));
    const read = bridge.population();
    read.ticks = 9_999;
    expect(bridge.population().ticks).toBe(7);
    expect(bridge.signals()).not.toBe(signals);
    expect(bridge.signals()).toEqual(signals);
  });

  it("publishes every declared member on the installed bridge and the failed one", () => {
    expect(everyDeclaredMemberIsListed).toBe(true);
    expectPublishesEveryMember(installed(sources()), "installBridge");

    installFailedBridge(new Error("the scene did not start"));
    const failed = installedOnWindow();
    expect(failed, "installFailedBridge installed nothing on window").toBeDefined();
    expectPublishesEveryMember(failed!, "installFailedBridge");
    // A failed bridge answers the same questions as a live one, with the
    // failure in `status()` and an empty observation everywhere else.
    expect(failed!.status().error).toBe("the scene did not start");
    expect(failed!.population()).toEqual(emptyPopulationStatus());
    expect(failed!.signals()).toEqual([]);
  });

  it("refuses to be mutated through the window it is installed on", () => {
    installFailedBridge(new Error("frozen"));
    const failed = installedOnWindow()!;
    expect(Object.isFrozen(failed)).toBe(true);
    expect(() => { (failed as unknown as { status: () => unknown }).status = () => null; }).toThrow(TypeError);
  });
});
