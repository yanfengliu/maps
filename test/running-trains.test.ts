/** Bound: admitted rail packet through actual loadRailTrial/createRailTrialScene,
 * CPU geometry/contact, shared-loop motion/style/lifetime. No pixel, building
 * clearance, railway timetable, whole-city collision or population/FPS claim. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DoubleSide, Material, Mesh, MeshBasicMaterial, Raycaster, Vector3, type BufferGeometry } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { RenderLoop } from "../src/render/loop.js";
import { createRailTrialScene, loadRailTrial, type RailTrialData, type RailTrialScene } from "../src/scene/rail-trial.js";
import { createTrainPath } from "../src/scene/train-path.js";
import { createTrainSchedule } from "../src/scene/train-schedule.js";
import { toGeometry } from "../src/scene/mesh-loader.js";
import { worldStyle } from "../src/world/styles.js";

const overlay = path.resolve("data/rail"), scenes: RailTrialScene[] = [];
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
let data: RailTrialData;
beforeAll(async () => {
  const manifest = fs.readFileSync(path.join(overlay, "manifest.json"));
  expect(sha(manifest)).toBe("e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const file = url === "/rail-trial/manifest.json" ? "manifest.json" : url.replace("/rail-trial/", "");
    if (!/^[a-zA-Z0-9_.-]+$/.test(file)) throw Error(`Unexpected rail test fetch ${url}`);
    return new Response(fs.readFileSync(path.join(overlay, file)));
  }));
  try { data = (await loadRailTrial({ url: "/rail-trial/manifest.json", sha256: sha(manifest) }))!; }
  finally { vi.unstubAllGlobals(); }
});
afterEach(() => { scenes.splice(0).forEach(s => s.dispose()); });
function setup() {
  const loop = new RenderLoop({ render() {} }), ready = { value: true };
  const scene = createRailTrialScene(data, worldStyle("satellite"), { loop, ready: () => ready.value }); scenes.push(scene);
  return { loop, ready, scene, train: scene.trains! };
}
const meshDigest = (): string[] => data.layers.map(({ mesh }) => sha(Buffer.concat([Buffer.from(mesh.positions.buffer), Buffer.from(mesh.normals.buffer), Buffer.from(mesh.indices.buffer)])));

describe("representative four-car train on the admitted rails", () => {
  it("loads pinned source/recipe and makes four joined carriages at full scale", () => {
    const { train } = setup(), s = train.status();
    expect(s.track).toBe(146060273); expect(s.cars).toHaveLength(4); expect(s.wheels).toHaveLength(32);
    for (const car of s.cars) expect(new Vector3().fromArray(car.front).distanceTo(new Vector3().fromArray(car.rear))).toBeCloseTo(19.6, 8);
    for (let i = 1; i < 4; i++) {
      const gap = new Vector3().fromArray(s.cars[i - 1]!.front).distanceTo(new Vector3().fromArray(s.cars[i]!.rear));
      expect(gap).toBeGreaterThan(0.6); expect(gap).toBeLessThan(0.9);
    }
    expect(train.root.children.filter(c => c.name === "train:gangway")).toHaveLength(3);
    expect(s.wheels.every(w => w.supported)).toBe(true);
  });

  it("places every visible wheel tread on actual upward triangles, independently raycast", () => {
    const { train, loop } = setup(), rails = data.layers.find(l => l.pin.kind === "rails")!.mesh;
    const geometry = toGeometry(rails), material = new MeshBasicMaterial({ side: DoubleSide }), object = new Mesh(geometry, material);
    const ray = new Raycaster(); object.updateMatrixWorld(true);
    try {
      for (let frame = 0; frame <= 360; frame++) {
        loop.advance(frame * 1000 / 60);
        if (frame % 120) continue;
        train.root.updateMatrixWorld(true);
        const wheels = train.root.children.filter((child): child is Mesh => child instanceof Mesh && child.name === "train:wheel");
        for (const [index, wheel] of train.status().wheels.entries()) {
          ray.set(new Vector3(wheel.x, 40, wheel.z), new Vector3(0, -1, 0));
          const hits = ray.intersectObject(object).filter(hit => hit.face!.normal.y > 0.5);
          expect(hits.length, `wheel ${wheel.x},${wheel.z} needs a visible rail-head triangle`).toBeGreaterThan(0);
          expect(wheel.railY).toBeCloseTo(hits[0]!.point.y, 6);
          expect(wheel.y - 0.43).toBeCloseTo(hits[0]!.point.y, 6);
          ray.set(new Vector3(wheel.x, wheel.railY - 0.01, wheel.z), new Vector3(0, 1, 0));
          const tread = ray.intersectObject(wheels[index]!)[0];
          expect(tread, "Actual rotated polygon wheel must reach the rail").toBeDefined();
          expect(Math.abs(tread!.point.y - wheel.railY)).toBeLessThan(0.001);
        }
      }
    } finally { geometry.dispose(); material.dispose(); }
  });

  it("holds for readiness, advances on shared fixed steps and preserves progress across styles", () => {
    const { loop, train, scene, ready } = setup(); ready.value = false;
    const start = train.status(); for (let i = 0; i <= 60; i++) loop.advance(i * 1000 / 60);
    expect(train.status()).toEqual(start); expect(train.moving()).toBe(false);
    ready.value = true; for (let i = 61; i <= 180; i++) loop.advance(i * 1000 / 60);
    expect(train.status().station - start.station).toBeGreaterThan(23);
    const before = train.status(); scene.setStyle(worldStyle("cartographic")); scene.setStyle(worldStyle("satellite"));
    expect(train.status()).toEqual(before); expect(train.moving()).toBe(true);
    loop.holdFixedSteps(true); for (let i = 181; i <= 240; i++) loop.advance(i * 1000 / 60);
    const held = train.status(); for (let i = 241; i <= 300; i++) loop.advance(i * 1000 / 60);
    expect(train.status()).toEqual(held);
  });

  it("turns back continuously with a real dwell and no frame jump for a complete cycle", () => {
    const { loop, train } = setup(); let previous = train.status(), dwellFrames = 0, reverse = false, forwardAgain = false;
    for (let frame = 1; frame <= 7500; frame++) {
      loop.advance(frame * 1000 / 60); const current = train.status();
      expect(Math.abs(current.station - previous.station)).toBeLessThanOrEqual(0.200001);
      expect(current.speed).toBeGreaterThanOrEqual(0); expect(current.speed).toBeLessThanOrEqual(12.000001);
      if (current.dwelling) { expect(current.speed).toBe(0); dwellFrames++; }
      if (current.direction === -1 && current.speed > 0) reverse = true;
      if (reverse && current.direction === 1 && current.speed > 0) forwardAgain = true;
      previous = current;
    }
    expect(dwellFrames).toBeGreaterThan(1200); expect(reverse).toBe(true); expect(forwardAgain).toBe(true);
  }, 30000);

  it("releases every train geometry/material and callback once without changing source buffers", () => {
    const before = meshDigest(), { train, scene, loop } = setup();
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
    train.root.traverse(o => { if (o instanceof Mesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); } });
    let released = 0; for (const resource of [...geometries, ...materials]) resource.addEventListener("dispose", () => released++);
    const state = train.status(); scene.dispose(); scene.dispose(); loop.advance(1000);
    expect(released).toBe(geometries.size + materials.size); expect(train.status()).toEqual(state);
    expect(train.root.children).toHaveLength(0); expect(train.root.parent).toBeNull(); expect(train.moving()).toBe(false);
    expect(meshDigest()).toEqual(before);
  });

  it("refuses an unsupported changed rail and malformed source instead of terrain fallback", () => {
    const rails = data.layers.find(l => l.pin.kind === "rails")!.mesh;
    const unsupported = { ...rails, indices: new Uint32Array() }, p = createTrainPath(data.trainSource!, unsupported);
    expect(() => p.head(p.stationAtZ(-385), 1)).toThrow(/no matching admitted rail head/);
    expect(() => p.sample(NaN)).toThrow(/station NaN/);
    expect(() => createTrainPath({ ...data.trainSource!, recipe: { ...data.trainSource!.recipe, anchors: [[0, 23], [0, 24]] } }, rails)).toThrow(/increasing bed anchors/);
    expect(() => createTrainSchedule(0, 100)).toThrow(/needs more than 180/);
    const schedule = createTrainSchedule(10, 420);
    for (const direction of [-1, 1] as const) expect(schedule.sample(schedule.initialPhase(220, direction)).station).toBeCloseTo(220, 9);
    expect(schedule.sample(schedule.period - 1e-6).station).toBeCloseTo(schedule.sample(0).station, 9);
  });
});