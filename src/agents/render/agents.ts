import { Camera, Group } from "three";
import { assertAgentPoseBuffers, assertVehiclePoseBuffers, type WorldAgentPoses } from "../../world/agent-poses.js";
import type { WorldStyle } from "../../world/styles.js";
import { HumanRenderer } from "./humans.js";
import { VehicleRenderer } from "./vehicles.js";

/** Asset-backed rendering only. The core owns every authoritative agent value. */
export async function createAgentRenderer(poses: WorldAgentPoses, style: WorldStyle) {
  assertAgentPoseBuffers(poses.pedestrians, "Pedestrian");
  assertVehiclePoseBuffers(poses.vehicles, "Vehicle");
  const humans = new HumanRenderer(poses.pedestrians);
  const vehicles = new VehicleRenderer(poses.vehicles);
  const group = new Group();
  group.name = "world-agents";
  try {
    // Limit concurrent decoded textures while the substantial city is resident.
    await humans.load(style);
    await vehicles.load(style);
    group.add(humans.group, vehicles.group);
  } catch (error) { humans.dispose(); vehicles.dispose(); throw error; }
  return {
    group,
    /** Same manifest that supplied the displayed fleet, including collision bounds. */
    fleet: vehicles.manifest!,
    update(alpha: number, camera: Camera, elapsedSeconds: number): void {
      humans.update(alpha, camera, elapsedSeconds);
      vehicles.update(alpha, camera);
    },
    setStyle(next: WorldStyle): void { humans.setStyle(next); vehicles.setStyle(next); },
    get renderedPedestrians(): number { return humans.renderedCount; },
    get renderedVehicles(): number { return vehicles.renderedCount; },
    dispose(): void { humans.dispose(); vehicles.dispose(); group.clear(); group.removeFromParent(); },
  };
}

export type AgentRenderer = Awaited<ReturnType<typeof createAgentRenderer>>;
