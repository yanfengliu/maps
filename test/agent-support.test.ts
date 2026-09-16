/** Bound: shared support basis, generation interpolation and actual vehicle instance
 * offset wiring on a synthetic planar grade. No real pavement/crowd claim.
 */
import { BoxGeometry, Camera, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { expect, it, vi } from "vitest";
import { assertVehiclePoseBuffers, writeSupportBasis, type VehiclePoseBuffers } from "../src/world/agent-poses.js";
import { writePoseMatrix } from "../src/agents/render/pose.js";
import { WORLD_STYLES } from "../src/world/styles.js";

vi.mock("../src/agents/render/assets.js", async () => {
  const actual = await vi.importActual<typeof import("../src/agents/render/assets.js")>("../src/agents/render/assets.js");
  return { ...actual,
    loadManifest: async () => ({ version: 1, units: "metres", up: "+Y", forward: "+Z", origin: "ground-centre", yawAxis: "+Y",
      vehicles: ["kei", "taxi", "bus"].map(id => ({ id, model: id, sha256: "fixture", wheelRadius: .3, axles: { frontZ: 1, rearZ: -1, trackMetres: 1.2 },
        wheelObjects: ["wheel_0_left", "wheel_0_right", "wheel_1_left", "wheel_1_right"] })) }),
    loadModel: async () => {
      const scene = new Group();
      const body = new Mesh(new BoxGeometry(1, 1, 2), new MeshStandardMaterial());
      body.name = "body"; scene.add(body);
      const wheelGeometry = new BoxGeometry(.1, .6, .6), wheelMaterial = new MeshStandardMaterial();
      for (const [index, name] of ["wheel_0_left", "wheel_0_right", "wheel_1_left", "wheel_1_right"].entries()) {
        const wheel = new Mesh(wheelGeometry, wheelMaterial); wheel.name = name;
        wheel.position.set(index % 2 ? -.6 : .6, .3, index < 2 ? 1 : -1); scene.add(wheel);
      }
      return { scene };
    },
  };
});
const { VehicleRenderer } = await import("../src/agents/render/vehicles.js");

function poses(): VehiclePoseBuffers {
  const normal = new Vector3(.03, 1, -.05).normalize();
  const snapshot = () => ({ position: new Float32Array([2, 3, 4]), supportNormal: new Float32Array(normal.toArray()),
    yaw: new Float32Array([.4]), travelledMetres: new Float64Array(1), generation: new Uint32Array(1), wheelOffsets: new Float32Array(4), frontSteeringRadians: new Float32Array(1) });
  return { count: 1, previous: snapshot(), current: snapshot(), active: new Uint8Array([1]), speedMps: new Float32Array([1]), scale: new Float32Array([2]), variant: new Uint8Array(1) };
}

it("makes an orthonormal right-handed basis with the expected planar support", () => {
  const values = new Float64Array(9);
  writeSupportBasis(.4, .03, 1, -.05, values);
  const right = new Vector3().fromArray(values, 0), up = new Vector3().fromArray(values, 3), forward = new Vector3().fromArray(values, 6);
  expect(right.length()).toBeCloseTo(1, 12); expect(up.length()).toBeCloseTo(1, 12); expect(forward.length()).toBeCloseTo(1, 12);
  expect(right.dot(up)).toBeCloseTo(0, 12); expect(forward.dot(up)).toBeCloseTo(0, 12);
  expect(new Vector3().crossVectors(right, up).distanceTo(forward)).toBeLessThan(1e-12);
  const p = poses(), matrix = new Matrix4();
  writePoseMatrix(p, 0, .5, matrix);
  const origin = new Vector3().setFromMatrixPosition(matrix);
  for (const z of [3.276, -2.86]) {
    const contact = new Vector3(.6, 0, z).applyMatrix4(matrix).sub(origin);
    expect(contact.dot(up)).toBeCloseTo(0, 6);
  }
});

it("snaps the support normal with generation changes and validates exact array denominators", () => {
  const p = poses(), matrix = new Matrix4();
  p.previous.supportNormal.set([0, 1, 0]); p.current.generation[0] = 1;
  writePoseMatrix(p, 0, .1, matrix);
  expect(new Vector3(0, 1, 0).transformDirection(matrix).distanceTo(new Vector3().fromArray(p.current.supportNormal).normalize())).toBeLessThan(1e-7);
  expect(() => assertVehiclePoseBuffers({ ...p, current: { ...p.current, wheelOffsets: new Float32Array(3) } })).toThrow("current.wheelOffsets has 3 entries");
  expect(() => assertVehiclePoseBuffers({ ...p, current: { ...p.current, supportNormal: new Float32Array(2) } })).toThrow("current.supportNormal has 2 entries");
  p.current.wheelOffsets.fill(.05); expect(() => assertVehiclePoseBuffers(p)).not.toThrow();
  p.current.wheelOffsets[0] = .051; expect(() => assertVehiclePoseBuffers(p)).toThrow("support travel");
});

it("uses manifest wheel order, model-metre scale and generation-safe offsets on actual instance matrices", async () => {
  const p = poses(), renderer = new VehicleRenderer(p), camera = new Camera();
  p.current.wheelOffsets.set([.05, -.05, .025, -.025]);
  try {
    await renderer.load(WORLD_STYLES[0]!);
    for (const respawn of [false, true]) {
      p.current.generation[0] = Number(respawn);
      renderer.update(.25, camera);
      const actor = new Matrix4(); writePoseMatrix(p, 0, .25, actor);
      const up = new Vector3(0, 1, 0).transformDirection(actor);
      const model = renderer.models[0]!;
      for (const part of model.parts) for (const [index, occurrence] of part.occurrences.entries()) {
        const actual = new Matrix4(); part.mesh.getMatrixAt(index, actual);
        const baseline = new Matrix4().copy(actor).multiply(occurrence.transform);
        const point = new Vector3(0, occurrence.wheel ? -.3 : 0, 0).applyMatrix4(actual);
        const basePoint = new Vector3(0, occurrence.wheel ? -.3 : 0, 0).applyMatrix4(baseline);
        const expectedOffset = occurrence.wheel ? p.current.wheelOffsets[occurrence.wheelIndex]! * (respawn ? 1 : .25) * p.scale[0]! : 0;
        expect(point.sub(basePoint).distanceTo(up.clone().multiplyScalar(expectedOffset))).toBeLessThan(1e-6);
      }
    }
  } finally { renderer.dispose(); }
});
