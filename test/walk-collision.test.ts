/** Bound: exact boolean contact against the installed Three Raycaster on static
 * CPU geometry, including seams, transforms and current material/range rules.
 * This does not measure browser FPS or qualify walking support elsewhere. */
import { describe, expect, it, vi } from "vitest";
import { BackSide, BoxGeometry, BufferAttribute, DoubleSide, FrontSide, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Ray, Raycaster, Vector3 } from "three";
import { createWalkCollision } from "../src/render/walk-collision.js";

function cast(origin: number[], direction: number[], near = 0, far = Infinity): Raycaster {
  return new Raycaster(new Vector3(...origin), new Vector3(...direction).normalize(), near, far);
}
function oracle(mesh: Mesh, ray: Raycaster): boolean { return ray.intersectObject(mesh, false).length > 0; }

describe("walking triangle acceleration", () => {
  it("matches literal winding, seam and near/far answers", () => {
    const mesh = new Mesh(new PlaneGeometry(4, 4, 16, 16), new MeshBasicMaterial());
    mesh.updateMatrixWorld();
    const collision = createWalkCollision([mesh]);
    for (const [side, front, back] of [[FrontSide, true, false], [BackSide, false, true], [DoubleSide, true, true]] as const) {
      mesh.material.side = side;
      for (const [x, y] of [[0, 0], [-2, 0], [2, 0], [2, 2], [-2, -2], [0.25, -0.25]]) {
        for (const [z, answer] of [[2, front], [-2, back]] as const) {
          const ray = cast([x!, y!, z], [0, 0, -Math.sign(z)]);
          expect(oracle(mesh, ray)).toBe(answer); expect(collision.intersects(ray)).toBe(answer);
        }
      }
    }
    mesh.material.side = DoubleSide;
    for (const [near, far, answer] of [[0, 1.999, false], [0, 2, true], [2, 2, true], [2.001, 3, false]] as const) {
      const ray = cast([0, 0, 2], [0, 0, -1], near, far);
      expect(oracle(mesh, ray)).toBe(answer); expect(collision.intersects(ray)).toBe(answer);
    }
    expect(collision.intersects(cast([2.000001, 0, 2], [0, 0, -1]))).toBe(false);
    expect(collision.intersects(cast([0, 0, 2], [1, 0, 0]))).toBe(false);
  });

  it("matches the original for indexed and nonindexed transformed geometry and deterministic rays", () => {
    let seed = 213713;
    const random = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
    for (const indexed of [true, false]) {
      const geometry = new BoxGeometry(7, 9, 5, 12, 12, 12);
      const mesh = new Mesh(indexed ? geometry : geometry.toNonIndexed(), new MeshBasicMaterial({ side: DoubleSide }));
      mesh.position.set(14.2, -3.1, 29.4); mesh.rotation.set(0.4, -0.7, 0.15); mesh.scale.set(-1.7, 0.6, 2.1); mesh.updateMatrixWorld();
      const collision = createWalkCollision([mesh]);
      for (let i = 0; i < 600; i++) {
        const origin = new Vector3((random() - 0.5) * 24, (random() - 0.5) * 24, (random() - 0.5) * 24).applyMatrix4(mesh.matrixWorld);
        const target = new Vector3((random() - 0.5) * 10, (random() - 0.5) * 10, (random() - 0.5) * 10).applyMatrix4(mesh.matrixWorld);
        const ray = new Raycaster(origin, target.sub(origin).normalize(), random() * 2, random() * 35);
        expect(collision.intersects(ray), `${indexed ? "indexed" : "nonindexed"} ray ${i}`).toBe(oracle(mesh, ray));
      }
      // The same BVH follows later transforms without changing its local triangles.
      mesh.matrixWorld.premultiply(new Matrix4().makeTranslation(-5, 11, -8));
      const ray = cast([9.2, 7.9, 50], [0, 0, -1]);
      expect(collision.intersects(ray)).toBe(oracle(mesh, ray));
    }
  });

  it("preserves group materials, overlaps, partial draw ranges and nonaligned fallback", () => {
    const geometry = new PlaneGeometry(4, 2, 2, 1);
    geometry.clearGroups(); geometry.addGroup(0, 6, 0); geometry.addGroup(6, 6, 1);
    const mesh = new Mesh(geometry, [new MeshBasicMaterial({ side: FrontSide }), new MeshBasicMaterial({ side: BackSide })]);
    mesh.updateMatrixWorld(); const collision = createWalkCollision([mesh]);
    for (const [x, z, answer] of [[-1, 2, true], [-1, -2, false], [1, 2, false], [1, -2, true]] as const) {
      const ray = cast([x, 0.2, z], [0, 0, -Math.sign(z)]);
      expect(oracle(mesh, ray)).toBe(answer); expect(collision.intersects(ray)).toBe(answer);
    }
    for (const [start, count] of [[0, 0], [0, 3], [3, 4], [6, 6], [1, 8], [0, Infinity]]) {
      geometry.setDrawRange(start!, count!);
      for (const x of [-1.5, -0.5, 0, 0.5, 1.5]) for (const z of [-2, 2]) {
        const ray = cast([x, 0.2, z], [0, 0, -Math.sign(z)]);
        expect(collision.intersects(ray)).toBe(oracle(mesh, ray));
      }
    }
    geometry.addGroup(0, 12, 1);
    expect(collision.intersects(cast([-1, 0.2, -2], [0, 0, 1]))).toBe(true);
    geometry.clearGroups();
    expect(collision.intersects(cast([-1, 0.2, 2], [0, 0, -1]))).toBe(false);
  });

  it("rebuilds changed geometry and index attributes and honors query layers/candidates", () => {
    const mesh = new Mesh(new PlaneGeometry(4, 4, 8, 8), new MeshBasicMaterial({ side: DoubleSide }));
    mesh.updateMatrixWorld(); const collision = createWalkCollision([mesh]);
    const ray = cast([0.3, 0.2, 2], [0, 0, -1]);
    expect(collision.intersects(ray)).toBe(true);
    const position = mesh.geometry.attributes.position!;
    for (let i = 0; i < position.count; i++) position.setX(i, position.getX(i) + 20);
    position.needsUpdate = true; mesh.geometry.computeBoundingSphere();
    expect(collision.intersects(ray)).toBe(oracle(mesh, ray)); expect(collision.intersects(ray)).toBe(false);
    mesh.geometry = new PlaneGeometry(4, 4, 8, 8);
    expect(collision.intersects(ray)).toBe(true);
    const originalIndex = mesh.geometry.index!;
    mesh.geometry.setIndex(new BufferAttribute(new Uint16Array([0, 1, 9]), 1));
    expect(collision.intersects(ray)).toBe(oracle(mesh, ray)); expect(collision.intersects(ray)).toBe(false);
    mesh.geometry.setIndex(originalIndex);
    expect(collision.intersects(ray)).toBe(true);
    expect(collision.intersects(ray, [])).toBe(false);
    mesh.layers.set(1); expect(collision.intersects(ray)).toBe(false);
    ray.layers.enable(1); expect(collision.intersects(ray)).toBe(true);
  });

  it("delegates custom raycasts and morph geometry to the original path", () => {
    const mesh = new Mesh(new PlaneGeometry(4, 4), new MeshBasicMaterial({ side: DoubleSide }));
    mesh.updateMatrixWorld(); const collision = createWalkCollision([mesh]);
    const ray = cast([0.3, 0.2, 2], [0, 0, -1]);
    const custom = vi.fn(mesh.raycast.bind(mesh)); mesh.raycast = custom;
    expect(collision.intersects(ray)).toBe(true); expect(custom).toHaveBeenCalledOnce();
    mesh.raycast = Mesh.prototype.raycast;
    mesh.geometry.morphAttributes.position = [mesh.geometry.attributes.position!.clone()];
    mesh.updateMorphTargets(); mesh.morphTargetInfluences![0] = 1;
    const morph = mesh.geometry.morphAttributes.position[0]!;
    for (let i = 0; i < morph.count; i++) morph.setZ(i, 5);
    mesh.geometry.computeBoundingSphere();
    expect(collision.intersects(ray)).toBe(oracle(mesh, ray)); expect(collision.intersects(ray)).toBe(false);
  });

  it("retains the original refusal for missing, fractional or absent group materials", () => {
    const geometry = new PlaneGeometry(4, 4); geometry.clearGroups(); geometry.addGroup(0, 6, 0);
    const mesh = new Mesh(geometry, [new MeshBasicMaterial({ side: DoubleSide })]); mesh.updateMatrixWorld();
    const collision = createWalkCollision([mesh]), ray = cast([0.3, 0.2, 2], [0, 0, -1]);
    for (const index of [undefined, 0.5, -1, 1]) {
      if (index === undefined) delete geometry.groups[0]!.materialIndex; else geometry.groups[0]!.materialIndex = index;
      expect(() => oracle(mesh, ray)).toThrow(TypeError);
      expect(() => collision.intersects(ray)).toThrow(TypeError);
    }
    geometry.groups[0]!.materialIndex = 0;
    expect(collision.intersects(ray)).toBe(true);
    delete mesh.material[0];
    expect(() => oracle(mesh, ray)).toThrow(TypeError); expect(() => collision.intersects(ray)).toThrow(TypeError);
  });

  it("delegates absent material and custom intersection implementations", () => {
    const mesh = new Mesh(new PlaneGeometry(4, 4), new MeshBasicMaterial({ side: DoubleSide })); mesh.updateMatrixWorld();
    const collision = createWalkCollision([mesh]), ray = cast([0.3, 0.2, 2], [0, 0, -1]);
    expect(collision.intersects(ray)).toBe(true);
    const material = mesh.material; Reflect.set(mesh, "material", undefined);
    expect(oracle(mesh, ray)).toBe(false); expect(collision.intersects(ray)).toBe(false);
    mesh.material = material;
    const custom = vi.fn(); Reflect.set(mesh, "_computeIntersections", custom);
    expect(oracle(mesh, ray)).toBe(false); expect(custom).toHaveBeenCalledOnce();
    custom.mockClear(); expect(collision.intersects(ray)).toBe(false); expect(custom).toHaveBeenCalledOnce();
    Reflect.deleteProperty(mesh, "_computeIntersections"); expect(collision.intersects(ray)).toBe(true);
  });

  it("rejects empty regions before triangle tests while retaining the original answer", () => {
    const mesh = new Mesh(new PlaneGeometry(100, 100, 100, 100), new MeshBasicMaterial({ side: DoubleSide }));
    mesh.updateMatrixWorld(); const collision = createWalkCollision([mesh]);
    const ray = cast([0.21, 0.37, 2], [0, 0, -1]);
    const triangle = vi.spyOn(Ray.prototype, "intersectTriangle");
    try {
      expect(oracle(mesh, ray)).toBe(true); const originalCalls = triangle.mock.calls.length;
      triangle.mockClear(); expect(collision.intersects(ray)).toBe(true);
      expect(originalCalls).toBe(20_000); expect(triangle.mock.calls.length).toBeLessThan(32);
    } finally { triangle.mockRestore(); }
  });
});
