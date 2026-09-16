/** Bound: shared steering admission and actual VehicleRenderer instance matrices for
 * all three classes, signed input limits, translated child primitives, rolling sign,
 * support/scale and generation changes. Actual GLB envelope/native evidence is separate.
 */
import { BoxGeometry, Camera, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { expect, it, vi } from "vitest";
import { assertVehiclePoseBuffers, VEHICLE_FRONT_STEERING_LIMIT_RADIANS as LIMIT, type VehiclePoseBuffers } from "../src/world/agent-poses.js";
import { writePoseMatrix, poseBlend } from "../src/agents/render/pose.js";
import { writeWheelTransform } from "../src/agents/render/wheel-transform.js";
import { WORLD_STYLES } from "../src/world/styles.js";

const specs = [
  { id: "kei", radius: .285, front: 1.037, rear: -1.037, track: 1.37 },
  { id: "taxi", radius: .315, front: 1.342, rear: -1.342, track: 1.59 },
  { id: "bus", radius: .48, front: 3.276, rear: -2.86, track: 2.39 },
];
// Manifest order is deliberately not axle order; classification must use the real pivot.
const names = ["wheel_1_left", "wheel_0_right", "wheel_1_right", "wheel_0_left"];
let badPivot = false;
vi.mock("../src/agents/render/assets.js", async () => {
  const actual = await vi.importActual<typeof import("../src/agents/render/assets.js")>("../src/agents/render/assets.js");
  return { ...actual,
    loadManifest: async () => ({ version: 1, units: "metres", up: "+Y", forward: "+Z", origin: "ground-centre", yawAxis: "+Y",
      vehicles: specs.map(s => ({ id: s.id, model: s.id, sha256: "fixture", wheelRadius: s.radius, wheelObjects: names,
        axles: { frontZ: s.front, rearZ: s.rear, trackMetres: s.track } })) }),
    loadModel: async (url: string) => {
      const s = specs.find(s => url.endsWith(s.id))!, scene = new Group();
      const body = new Mesh(new BoxGeometry(1, 1, 2), new MeshStandardMaterial()); body.name = "body"; scene.add(body);
      for (const name of names) {
        const wheel = new Group(); wheel.name = name;
        wheel.position.set((name.endsWith("left") ? 1 : -1) * s.track / 2, s.radius, name.includes("wheel_0") ? s.front : s.rear);
        if (badPivot) wheel.position.z += .1;
        // The draw primitive's own origin/axes differ from its wheel pivot.
        const part = new Mesh(new BoxGeometry(.2, .4, .4), new MeshStandardMaterial()); part.position.set(.04, .02, .03); part.rotation.z = .17;
        wheel.add(part); scene.add(wheel);
      }
      return { scene };
    },
  };
});
const { VehicleRenderer } = await import("../src/agents/render/vehicles.js");

function population(): VehiclePoseBuffers {
  const normal = new Vector3(.1, 1, -.15).normalize();
  const snapshot = () => ({ position: new Float32Array([1, 2, 3, 5, 2, 0, -2, 1, -7]), supportNormal: new Float32Array([...normal.toArray(), ...normal.toArray(), ...normal.toArray()]),
    yaw: new Float32Array([.4, -.2, .6]), travelledMetres: new Float64Array(3), generation: new Uint32Array(3), wheelOffsets: new Float32Array(12), frontSteeringRadians: new Float32Array(3) });
  return { count: 3, previous: snapshot(), current: snapshot(), active: new Uint8Array([1, 1, 1]), speedMps: new Float32Array([1, 1, 1]), scale: new Float32Array([2, 1, .8]), variant: new Uint8Array([0, 1, 2]) };
}

it("requires exactly one finite bicycle-equivalent angle per slot in both snapshots", () => {
  const p = population();
  for (const side of ["previous", "current"] as const) {
    expect(() => assertVehiclePoseBuffers({ ...p, [side]: { ...p[side], frontSteeringRadians: new Float32Array(2) } })).toThrow(`${side}.frontSteeringRadians has 2 entries`);
    for (const value of [NaN, Infinity, -Infinity, LIMIT + .001, -LIMIT - .001]) {
      p[side].frontSteeringRadians[0] = value;
      expect(() => assertVehiclePoseBuffers(p)).toThrow(`${side}.frontSteeringRadians value`);
    }
    p[side].frontSteeringRadians.set([LIMIT, -LIMIT, 0]);
    expect(() => assertVehiclePoseBuffers(p)).not.toThrow();
  }
});

it("steers only front wheels about real pivots before rolling, with support, scale and generation-safe interpolation", async () => {
  const p = population(), renderer = new VehicleRenderer(p), camera = new Camera();
  try {
    await renderer.load(WORLD_STYLES[0]!);
    for (const sign of [-1, 0, 1]) for (const respawn of [false, true]) {
      p.current.frontSteeringRadians.fill(sign * LIMIT);
      p.previous.frontSteeringRadians.fill(-sign * LIMIT / 2);
      p.current.generation.fill(Number(respawn));
      for (let slot = 0; slot < 3; slot++) {
        p.current.travelledMetres[slot] = specs[slot]!.radius * p.scale[slot]! * Math.PI / 2;
        p.current.wheelOffsets.set([.05, -.025, .01, -.05], slot * 4);
      }
      renderer.update(.25, camera);
      expect(renderer.renderedCount).toBe(3);
      for (let slot = 0; slot < 3; slot++) {
        const model = renderer.models[slot]!, actor = new Matrix4(), blend = poseBlend(p, slot, .25), travelled = writePoseMatrix(p, slot, .25, actor);
        const steering = p.previous.frontSteeringRadians[slot]! + (p.current.frontSteeringRadians[slot]! - p.previous.frontSteeringRadians[slot]!) * blend;
        const spin = travelled / (specs[slot]!.radius * p.scale[slot]!);
        for (const part of model.parts) for (const [instance, occurrence] of part.occurrences.entries()) {
          const actual = new Matrix4(); part.mesh.getMatrixAt(instance, actual);
          for (const local of [new Vector3(), new Vector3(.1, -.2, .2)]) {
            const expected = local.clone().applyMatrix4(occurrence.transform);
            if (occurrence.wheel) {
              expected.sub(occurrence.pivot!).applyAxisAngle(new Vector3(1, 0, 0), spin);
              if (occurrence.front) expected.applyAxisAngle(new Vector3(0, 1, 0), steering);
              expected.add(occurrence.pivot!); expected.y += p.current.wheelOffsets[slot * 4 + occurrence.wheelIndex]! * blend;
            }
            expected.applyMatrix4(actor);
            expect(local.clone().applyMatrix4(actual).distanceTo(expected)).toBeLessThan(2e-6);
          }
          if (occurrence.wheel) {
            const pivotLocal = occurrence.pivot!.clone().applyMatrix4(occurrence.transform.clone().invert());
            const pivotExpected = occurrence.pivot!.clone(); pivotExpected.y += p.current.wheelOffsets[slot * 4 + occurrence.wheelIndex]! * blend; pivotExpected.applyMatrix4(actor);
            expect(pivotLocal.applyMatrix4(actual).distanceTo(pivotExpected)).toBeLessThan(2e-6);
          }
        }
      }
    }
    p.current.frontSteeringRadians[0] = LIMIT + .01;
    expect(() => renderer.update(1, camera)).toThrow("Vehicle slot 0 steering");
  } finally { renderer.dispose(); }
});

it("uses the forward rolling sign and does not rotate a front wheel about the car origin", () => {
  const pivot = new Vector3(.7, .3, 1.2), bind = new Matrix4().makeTranslation(...pivot.toArray()), out = new Matrix4(), epsilon = .001;
  writeWheelTransform(bind, pivot, .4, epsilon, 0, out);
  expect(new Vector3().applyMatrix4(out).distanceTo(pivot)).toBeLessThan(1e-12);
  const movingBottom = new Vector3(0, -.3, 0).applyMatrix4(out).sub(pivot);
  expect(movingBottom.z).toBeLessThan(0); expect(movingBottom.x).toBeLessThan(0);
  const forward = new Vector3(Math.sin(.4), 0, Math.cos(.4));
  expect(movingBottom.clone().addScaledVector(forward, .3 * epsilon).z).toBeCloseTo(0, 8);
});

it("rejects a selected GLB wheel root that disagrees with the manifest axle pivot", async () => {
  badPivot = true; const renderer = new VehicleRenderer(population());
  try { await expect(renderer.load(WORLD_STYLES[0]!)).rejects.toThrow("does not match its manifest axles"); }
  finally { badPivot = false; renderer.dispose(); }
});
