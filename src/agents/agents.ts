/**
 * Agents — pedestrians and vehicles. Owned by Phases 7 and 8.
 *
 * What lands here: IDM car following with MOBIL lane changes for vehicles,
 * ORCA/RVO2 avoidance over a spatial hash for pedestrians, both instanced, both
 * reading the lane and crossing graph and the signal phase model that Phase 6
 * freezes. The budget they are built against is in `PERFORMANCE_TARGET`:
 * 60 fps at 1080p with 3,000 animated pedestrians and 200 vehicles.
 *
 * What is here now: the seam and nothing else.
 *
 * `update` is registered as a **fixed step** on the render loop, not a frame
 * step. That is the whole reason the loop has two kinds of callback. Both agent
 * systems are integrators, and both have to advance on the same clock as the
 * signal phases or a frame will show traffic crossing the scramble while
 * pedestrians are still on it.
 */

import { Group } from "three";

import type { RenderLoop } from "../render/loop.js";

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
}

/**
 * The empty agent system.
 *
 * It registers, it is called every step, and it does nothing. Keeping it wired
 * up means the seam is exercised by the running app and by the visual gate from
 * the first commit, rather than being a comment that turns out not to fit when
 * Phase 7 arrives.
 */
export function createAgents(loop: RenderLoop): AgentSystem {
  const root = new Group();
  root.name = "agents";

  const unregister = loop.onFixedStep((step, simulatedSeconds) => {
    system.update(step, simulatedSeconds);
  });

  const system: AgentSystem = {
    root,
    update(): void {
      // Phases 7 and 8.
    },
    dispose(): void {
      unregister();
      root.clear();
    },
  };

  return system;
}
