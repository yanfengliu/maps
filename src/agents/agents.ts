/**
 * Agents — pedestrians and vehicles. Owned by Phases 7 and 8.
 *
 * What lands here: the population foundation. `src/agents/population/tick.ts`
 * drives the frozen Phase 6 network and the shared signal clock through the one
 * admission authority, and the existing asset-backed instanced renderer draws
 * the slots it fills.
 *
 * The split of authority is the contract's, and it does not move:
 *
 * - the **core** (`src/agents/population/`) is the sole writer of the dense
 *   `WorldAgentPoses` buffers, and `JunctionAdmissions.resolve` is the sole
 *   admission owner for both kinds;
 * - the **renderer** (`src/agents/render/`) only reads those buffers — it is
 *   attached from the app once its GLBs are loaded;
 * - the **harness** (`src/harness/bridge.ts`) only observes, through
 *   `population()`.
 *
 * `update` is registered as a **fixed step** on the render loop, not a frame
 * step. Both populations are integrators and both have to advance on the same
 * clock as the signal phases, or a frame will show traffic crossing the scramble
 * while pedestrians are still on it. The renderer runs on the frame step, with
 * the loop's real interpolation alpha.
 */

import { Group } from "three";

import { JunctionAdmissions } from "../network/admissions.ts";
import type { NetworkData } from "../world/network-data.ts";
import type { VehicleAssetManifest } from "../world/agent-assets.ts";
import type { WorldAgentPoses } from "../world/agent-poses.ts";
import { DEFAULT_POPULATION_SETTINGS, populationSettings, type PopulationSettings } from "./population/config.ts";
import { createPopulation, type Population } from "./population/tick.ts";
import { emptyPopulationStatus, type PopulationStatus } from "./population/status.ts";
import type { RenderLoop } from "../render/loop.ts";

export interface AgentSystem {
  /** Everything the agents draw. Added to the scene by the caller. */
  readonly root: Group;
  /**
   * Advance the simulation by exactly one step.
   *
   * `step` is constant, so an integrator written here gives the same answer on
   * every machine. `simulatedSeconds` is the clock the signal phase model reads.
   */
  update(step: number, simulatedSeconds: number): void;
  dispose(): void;
  /**
   * Build the population for a loaded network. Called once, from the app, after
   * `loadNetwork()` resolves: the population cannot exist before its graph does,
   * and it must not be rebuilt while actors are moving.
   */
  attach(network: NetworkData, fleet: VehicleAssetManifest, overrides?: Partial<PopulationSettings>): void;
  /** Whether a population is attached and stepping. */
  readonly attached: boolean;
  /** The pose buffers the renderer reads, or null before `attach`. */
  readonly poses: WorldAgentPoses | null;
  /** Read-only status, cloned for the bridge. */
  status(): PopulationStatus;
  /** True while any active actor is moving, which the still predicate reads. */
  moving(): boolean;
  /** The renderer, once the app has loaded and mounted it. */
  mountRenderer(renderer: AgentRendererLike | null): void;
  /** The mounted renderer, so its update can run on the loop's frame step. */
  readonly renderer: AgentRendererLike | null;
}

/** The subset of `createAgentRenderer`'s result this module drives. */
export interface AgentRendererLike {
  readonly group: Group;
  update(alpha: number, camera: unknown, elapsedSeconds: number): void;
  setStyle(style: unknown): void;
  dispose(): void;
  readonly renderedPedestrians: number;
  readonly renderedVehicles: number;
  /** Instances actually drawn at each human level in the last frame. */
  readonly renderedByLevel?: { readonly near: number; readonly medium: number; readonly far: number };
}

/**
 * Create the agent system and register it on the loop.
 *
 * With no population settings the system is inert and mounts nothing, which is
 * what a run without `?agents=1` gets: the same scene the appearance evidence
 * was captured from.
 */
export function createAgents(loop: RenderLoop, settings?: Partial<PopulationSettings>): AgentSystem {
  const root = new Group();
  root.name = "agents";

  let population: Population | null = null;
  let admissions: JunctionAdmissions | null = null;
  let renderer: AgentRendererLike | null = null;
  let isAttached = false;

  const unregister = loop.onFixedStep((step, simulatedSeconds) => {
    system.update(step, simulatedSeconds);
  });

  const system: AgentSystem = {
    root,
    get attached(): boolean { return isAttached; },
    get poses(): WorldAgentPoses | null { return population?.poses ?? null; },
    get renderer(): AgentRendererLike | null { return renderer; },
    update(step: number, simulatedSeconds: number): void {
      population?.update(step, simulatedSeconds);
    },
    attach(network: NetworkData, fleet: VehicleAssetManifest, overrides: Partial<PopulationSettings> = {}): void {
      if (isAttached) {
        throw new Error("The population is already attached to a network; a running population cannot be rebuilt in place, because its actors hold admission commitments against the graph they were planned on.");
      }
      const resolved = populationSettings({ ...DEFAULT_POPULATION_SETTINGS, ...settings, ...overrides });
      if (resolved.pedestrians === 0 && resolved.vehicles === 0) {
        isAttached = true;
        return;
      }
      admissions = new JunctionAdmissions(network);
      population = createPopulation({ network, fleet, admissions, settings: resolved });
      isAttached = true;
    },
    status(): PopulationStatus {
      const status = population?.status() ?? emptyPopulationStatus();
      status.rendered = {
        pedestrians: renderer?.renderedPedestrians ?? 0,
        vehicles: renderer?.renderedVehicles ?? 0,
        near: renderer?.renderedByLevel?.near ?? 0,
        medium: renderer?.renderedByLevel?.medium ?? 0,
        far: renderer?.renderedByLevel?.far ?? 0,
        attached: renderer !== null,
      };
      return status;
    },
    moving(): boolean {
      return population?.moving() ?? false;
    },
    mountRenderer(next: AgentRendererLike | null): void {
      renderer = next;
    },
    dispose(): void {
      unregister();
      population?.dispose();
      population = null;
      renderer?.dispose();
      renderer = null;
      root.clear();
    },
  };

  return system;
}
