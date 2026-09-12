import type { Junction } from "../world/network-data.ts";

export type SignalStage = "vehicle" | "amber" | "clearance" | "pedestrian";
export interface SignalSnapshot {
  junctionId: string;
  stage: SignalStage;
  activeGroup: string | null;
  /** The preceding vehicle approach shows amber; every other approach remains red. */
  amberGroup: string | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  clearanceHeld: boolean;
  cycle: number;
}

interface SignalState {
  junction: Junction;
  stage: SignalStage;
  groupIndex: number;
  elapsed: number;
  held: boolean;
  cycle: number;
}

/**
 * One fixed-step signal authority for both populations. No wall clock is read.
 * Each approach gets exclusive green, then amber and an empty-junction clearance.
 * Pedestrian entry is exclusive of every vehicle approach, including turning cars.
 * Timing is authored for the simulation; it does not reproduce Tokyo's controllers.
 */
export class SignalController {
  private readonly states: SignalState[];
  private readonly groups = new Map<string, SignalState>();
  private stepSeconds: number | null = null;

  constructor(junctions: readonly Junction[]) {
    const ids = new Set<string>();
    this.states = junctions.filter((junction)=>junction.controlKind!=="reservation").map((junction) => {
      if (ids.has(junction.id)) throw new Error(`Signal junction ${junction.id} is duplicated; IDs must be unique.`);
      ids.add(junction.id);
      for (const [name, value] of Object.entries({clearanceSeconds: junction.clearanceSeconds, vehicleGreenSeconds: junction.vehicleGreenSeconds, pedestrianGreenSeconds: junction.pedestrianGreenSeconds})) {
        if (!Number.isFinite(value) || value <= 0) throw new Error(`Signal ${junction.id} has ${name}=${value}; duration must be finite and positive.`);
      }
      const state: SignalState = { junction, stage: junction.vehicleGroups.length ? "vehicle" : "pedestrian", groupIndex: 0, elapsed: 0, held: false, cycle: 0 };
      for (const group of [...junction.vehicleGroups, junction.pedestrianGroup]) {
        if (!group || this.groups.has(group)) throw new Error(`Signal group ${group} is missing or duplicated; every group must have one owner.`);
        this.groups.set(group, state);
      }
      return state;
    });
  }

  /** Call exactly once per simulation tick, before either population updates. */
  advance(stepSeconds: number, occupied: (junctionId: string) => boolean): void {
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0 || stepSeconds > 0.25) throw new Error(`Signal step ${stepSeconds} is invalid; use a fixed positive step no larger than 0.25 seconds.`);
    if (this.stepSeconds !== null && Math.abs(this.stepSeconds - stepSeconds) > 1e-12) throw new Error(`Signal step changed from ${this.stepSeconds} to ${stepSeconds}; drive signals from RenderLoop.onFixedStep.`);
    this.stepSeconds = stepSeconds;
    for (const state of this.states) {
      state.elapsed += stepSeconds;
      state.held = false;
      const duration = this.duration(state);
      if (state.elapsed + 1e-9 < duration) continue;
      if (state.stage === "clearance" && occupied(state.junction.id)) {
        state.elapsed = duration;
        state.held = true;
        continue;
      }
      state.elapsed = Math.max(0, state.elapsed - duration);
      switch (state.stage) {
        case "vehicle": state.stage = "amber"; break;
        case "amber": state.stage = "clearance"; break;
        case "pedestrian": state.stage = "clearance"; state.groupIndex = state.junction.vehicleGroups.length; break;
        case "clearance": {
          state.groupIndex += 1;
          if (state.groupIndex > state.junction.vehicleGroups.length) {
            state.groupIndex = 0;
            state.cycle += 1;
          }
          state.stage = state.groupIndex < state.junction.vehicleGroups.length ? "vehicle" : "pedestrian";
          break;
        }
      }
    }
  }

  canEnter(groupId: string | null): boolean {
    if (groupId === null) return true;
    const state = this.groups.get(groupId);
    if (!state) throw new Error(`Signal group ${groupId} has no controller; validate the network before simulation.`);
    return this.activeGroup(state) === groupId;
  }

  snapshot(): SignalSnapshot[] {
    return this.states.map((state) => ({
      junctionId: state.junction.id, stage: state.stage, activeGroup: this.activeGroup(state),
      amberGroup: state.stage === "amber" ? state.junction.vehicleGroups[state.groupIndex]! : null,
      elapsedSeconds: state.elapsed, remainingSeconds: Math.max(0, this.duration(state) - state.elapsed),
      clearanceHeld: state.held, cycle: state.cycle,
    }));
  }

  private activeGroup(state: SignalState): string | null {
    if (state.stage === "pedestrian") return state.junction.pedestrianGroup;
    if (state.stage === "vehicle") return state.junction.vehicleGroups[state.groupIndex]!;
    return null;
  }

  private duration(state: SignalState): number {
    if (state.stage === "vehicle") return state.junction.vehicleGreenSeconds;
    if (state.stage === "pedestrian") return state.junction.pedestrianGreenSeconds;
    if (state.stage === "amber") return 3;
    return state.junction.clearanceSeconds;
  }
}
