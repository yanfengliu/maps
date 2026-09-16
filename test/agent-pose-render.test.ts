/** Bound: interpolation math and generation resets; no GPU or simulation claim. */
import { Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { writePoseMatrix } from "../src/agents/render/pose.js";
import { assertAgentPoseBuffers, type AgentPoseBuffers } from "../src/world/agent-poses.js";

function poses(): AgentPoseBuffers {
  const snapshot = () => ({ position: new Float32Array(3), supportNormal: new Float32Array([0, 1, 0]), yaw: new Float32Array(1), travelledMetres: new Float64Array(1), generation: new Uint32Array(1) });
  return { count: 1, previous: snapshot(), current: snapshot(), active: new Uint8Array([1]), speedMps: new Float32Array([1]), scale: new Float32Array([1]), variant: new Uint8Array(1) };
}
describe("renderer reads stable simulation slots", () => {
  it("uses the short heading arc across plus/minus pi and interpolates actual distance", () => {
    const p = poses();
    p.previous.yaw[0] = Math.PI - .1;
    p.current.yaw[0] = -Math.PI + .1;
    p.previous.position[0] = 2; p.current.position[0] = 4;
    p.previous.travelledMetres[0] = 20; p.current.travelledMetres[0] = 22;
    const matrix = new Matrix4();
    expect(writePoseMatrix(p, 0, .5, matrix)).toBe(21);
    expect(matrix.elements[12]).toBe(3);
    expect(new Vector3(0, 0, 1).transformDirection(matrix).z).toBeCloseTo(-1);
  });
  it("never flies through the city when a slot is respawned", () => {
    const p = poses();
    p.previous.position.set([-400, 0, -400]); p.current.position.set([400, 20, 400]);
    p.current.generation[0] = 1; p.current.travelledMetres[0] = 9;
    const matrix = new Matrix4();
    expect(writePoseMatrix(p, 0, .1, matrix)).toBe(9);
    expect(new Vector3().setFromMatrixPosition(matrix).toArray()).toEqual([400, 20, 400]);
  });
  it("rejects a position array whose denominator differs from the stable slot count", () => {
    const p = poses();
    expect(() => assertAgentPoseBuffers({ ...p, current: { ...p.current, position: new Float32Array(2) } }, "Pedestrian")).toThrow("current.position has 2 entries");
  });
});
