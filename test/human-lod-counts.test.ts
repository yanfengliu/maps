/**
 * Bound: the renderer's own counting loop, driven with synthetic pose buffers
 * and synthetic level parts. No GLB is loaded, no GPU draws, and nothing here
 * says a pedestrian looks right — only that the counts `population()` reports
 * describe the population rather than one variant of it.
 *
 * Claim: `rendered.near/medium/far` add up over every loaded human variant, so
 * they agree with `rendered.pedestrians` and with the instance counts actually
 * set on the level meshes. The defect this gate exists for assigned each level's
 * count from the variant the loop happened to finish on: the reported numbers
 * were the last variant's, while the pedestrian total beside them was the true
 * one, and the near/medium instance caps are recorded as hypotheses that those
 * numbers are how a later measurement judges.
 *
 * The numbers are read from `HumanRenderer` itself, not from a copy of its
 * arithmetic: the mutation that reintroduces the defect is an assignment where
 * the fix accumulates, inside `update`.
 */
import { BufferGeometry, Color, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { describe, expect, it } from "vitest";

import { HumanRenderer, type HumanLod } from "../src/agents/render/humans.js";
import { POPULATION_LIMITS } from "../src/agents/population/config.js";
import type { AgentPoseBuffers } from "../src/world/agent-poses.js";

/** A pedestrian population at the given distances from the origin, by variant. */
function population(slots: readonly { at: number; variant: number }[]): AgentPoseBuffers {
  const count = slots.length;
  const snapshot = () => ({
    position: new Float32Array(count * 3),
    supportNormal: new Float32Array(count * 3),
    yaw: new Float32Array(count),
    travelledMetres: new Float64Array(count),
    generation: new Uint32Array(count),
  });
  const buffers: AgentPoseBuffers = {
    count,
    previous: snapshot(),
    current: snapshot(),
    active: new Uint8Array(count).fill(1),
    speedMps: new Float32Array(count).fill(1.1),
    scale: new Float32Array(count).fill(1),
    variant: new Uint8Array(slots.map((slot) => slot.variant)),
  };
  slots.forEach((slot, index) => {
    buffers.current.position[index * 3] = slot.at;
    buffers.current.supportNormal[index * 3 + 1] = 1;
    buffers.previous.position[index * 3] = slot.at;
    buffers.previous.supportNormal[index * 3 + 1] = 1;
  });
  return buffers;
}

/**
 * One loaded level, with the parts an instance count is set on.
 *
 * Stand-ins for the GLB's drawable primitives: `update` writes matrices and
 * counts on them, which is all the counting path touches, and the mesh is real
 * so its `count` can be read back the way the frame's draw would read it.
 */
function level(variant: number, id: "near" | "medium" | "far", capacity: number): HumanLod {
  const mesh = new InstancedMesh(new BufferGeometry(), new MeshBasicMaterial(), capacity);
  mesh.count = 0;
  return {
    manifest: { id: `variant-${variant}` },
    lod: { id, drawParts: [{}] },
    parts: [{
      mesh,
      material: new MeshBasicMaterial(),
      originalColor: new Color(),
      originalMap: null,
      flatColor: new Color(),
      flatUniform: { value: 0 },
    }],
    motion: new InstancedBufferAttribute(new Float32Array(capacity * 3), 3),
    textures: [],
    strideMetres: 1.1,
    idleDuration: 1,
    count: 0,
  } as unknown as HumanLod;
}

/** A renderer with `variants` loaded levels of each name and nothing else. */
function renderer(slots: readonly { at: number; variant: number }[], variants: number): { humans: HumanRenderer; poses: AgentPoseBuffers } {
  const poses = population(slots);
  const humans = new HumanRenderer(poses);
  for (let variant = 0; variant < variants; variant += 1) {
    humans.lods.push((["near", "medium", "far"] as const).map((id) => level(variant, id, poses.count)));
  }
  return { humans, poses };
}

/** Every instance count the level meshes were left holding, summed by level. */
function drawnByLevel(humans: HumanRenderer): { near: number; medium: number; far: number } {
  const drawn = { near: 0, medium: 0, far: 0 };
  for (const levels of humans.lods) levels.forEach((entry, at) => {
    drawn[(["near", "medium", "far"] as const)[at]!] += entry.parts[0]!.mesh.count;
  });
  return drawn;
}

const camera = new PerspectiveCamera();
camera.position.set(0, 0, 0);

describe("the drawn human counts", () => {
  it("adds up over every variant instead of reporting the last one", () => {
    const { humans } = renderer([
      { at: 5, variant: 0 },
      { at: 10, variant: 0 },
      { at: 30, variant: 0 },
      { at: 12, variant: 1 },
      { at: 40, variant: 1 },
      { at: 100, variant: 1 },
    ], 2);
    humans.update(0, camera, 0);

    // Variant 0 alone holds 2/1/0 of these six and variant 1 alone holds
    // 1/1/1. Reporting either is the defect; the population is 3/2/1.
    expect(humans.renderedCount).toBe(6);
    expect(humans.renderedByLevel).toEqual({ near: 3, medium: 2, far: 1 });
    expect(drawnByLevel(humans)).toEqual(humans.renderedByLevel);
  });

  it("counts every variant's share of one level, and the thresholds stay the population's", () => {
    const near = POPULATION_LIMITS.nearThresholdM;
    const { humans } = renderer([
      { at: near - 0.5, variant: 0 },
      { at: near + 0.5, variant: 1 },
      { at: POPULATION_LIMITS.mediumThresholdM - 0.5, variant: 2 },
      { at: POPULATION_LIMITS.mediumThresholdM + 0.5, variant: 2 },
    ], 3);
    humans.update(0, camera, 0);
    expect(humans.renderedByLevel).toEqual({ near: 1, medium: 2, far: 1 });
  });

  /**
   * The instance caps are per variant, so the population's own near count can
   * exceed `nearInstances`. That is a property of the renderer and not of this
   * fix, and it is asserted here because `nearInstances` is recorded as a
   * hypothesis about the near level's cost: read as a population-wide budget,
   * the number would be wrong by the variant count.
   */
  it("demotes within a variant, so the population's near count is the per-variant budget times variants", () => {
    const slots = [
      ...Array.from({ length: POPULATION_LIMITS.nearInstances + 1 }, () => ({ at: 5, variant: 0 })),
      ...Array.from({ length: 2 }, () => ({ at: 5, variant: 1 })),
    ];
    const { humans } = renderer(slots, 2);
    humans.update(0, camera, 0);
    expect(humans.renderedByLevel).toEqual({ near: POPULATION_LIMITS.nearInstances + 2, medium: 1, far: 0 });
    expect(humans.renderedCount).toBe(slots.length);
    expect(drawnByLevel(humans)).toEqual(humans.renderedByLevel);
  });

  it("counts nothing, at every level, when no slot is active", () => {
    const { humans, poses } = renderer([{ at: 5, variant: 0 }, { at: 30, variant: 1 }], 2);
    humans.update(0, camera, 0);
    expect(humans.renderedByLevel).toEqual({ near: 1, medium: 1, far: 0 });
    poses.active.fill(0);
    humans.update(0, camera, 0);
    expect(humans.renderedCount).toBe(0);
    expect(humans.renderedByLevel).toEqual({ near: 0, medium: 0, far: 0 });
  });
});
