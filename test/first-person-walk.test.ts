/** Bound: real camera input ownership, walking speed and bounded movement sweeps,
 * and native-geometry street support on CPU
 * event targets. Browser delivery, whole-scene coverage and pixels are separate. */
import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Ray, Vector3 } from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import type { Tile } from "3d-tiles-renderer/core";
import { createCameraRig } from "../src/render/camera.js";
import { createFirstPersonWalk, createWalkGround, type WalkGround } from "../src/render/first-person-walk.js";
import { createBuildingWalkCollision } from "../src/scene/buildings.js";

class Target extends EventTarget {
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    if (callback) { const set = this.listeners.get(type) ?? new Set(); set.add(callback); this.listeners.set(type, set); }
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
    if (callback) this.listeners.get(type)?.delete(callback);
    super.removeEventListener(type, callback, options);
  }
  get listenerCount(): number { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
class Element extends Target {
  style = {}; id = ""; textContent = ""; hidden = false; disabled = false; type = "";
  readonly children: Element[] = [];
  readonly attributes = new Map<string, string>();
  removed = false;
  append(...children: Element[]): void { this.children.push(...children); }
  remove(): void { this.removed = true; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  get tabIndex(): number { return Number(this.getAttribute("tabindex") ?? -1); }
  set tabIndex(value: number) { this.setAttribute("tabindex", String(value)); }
}
class Document extends Target {
  readonly defaultView = new Target(); readonly body = new Element();
  activeElement: object | null = this.body; hidden = false;
  createElement(): Element { return new Element(); }
}
class Canvas extends Element {
  readonly ownerDocument = new Document();
  clientWidth = 1280; clientHeight = 720;
  readonly captures = new Set<number>();
  getRootNode(): Document { return this.ownerDocument; }
  setPointerCapture(id: number): void { this.captures.add(id); }
  hasPointerCapture(id: number): boolean { return this.captures.has(id); }
  releasePointerCapture(id: number): void { this.captures.delete(id); }
  focus(): void { this.ownerDocument.activeElement = this; this.ownerDocument.dispatchEvent(new Event("focusin")); }
  key(type: string, code: string, fields: Record<string, unknown> = {}): Event {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, key: code, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...fields });
    this.ownerDocument.defaultView.dispatchEvent(event); return event;
  }
  pointer(type: string, x: number, y: number, id = 1): void {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { button: 0, pointerId: id, pointerType: "mouse", clientX: x, clientY: y, ctrlKey: false, shiftKey: false, metaKey: false });
    this.dispatchEvent(event);
  }
}
function fixture(ground: WalkGround = { heightAt: () => 15.4, blocked: () => false }) {
  const canvas = new Canvas();
  const rig = createCameraRig(canvas as unknown as HTMLCanvasElement);
  let ready = true;
  const walk = createFirstPersonWalk({ canvas: canvas as unknown as HTMLCanvasElement, ...rig, ground, ready: () => ready, invalidate() {} });
  const panel = canvas.ownerDocument.body.children[0]!, button = panel.children[0]!;
  const tick = (delta = 1 / 60): void => { walk.update(delta); if (!walk.active) rig.controls.update(delta); };
  return { canvas, ...rig, walk, panel, button, tick, setReady: (value: boolean) => { ready = value; },
    enter() { tick(); button.dispatchEvent(new Event("click")); },
    dispose() { walk.dispose(); rig.controls.dispose(); },
  };
}

describe("first-person walking input", () => {
  it("starts through the action at street eye height, leaves overview unchanged before entry, and restores it", () => {
    const f = fixture();
    try {
      const initial = f.camera.position.clone(), target = f.controls.target.clone(), near = f.camera.near;
      f.tick(); expect(f.walk.active).toBe(false); expect(f.camera.position.distanceTo(initial)).toBeLessThan(1e-9);
      expect(f.button.textContent).toBe("Start walking");
      f.enter(); expect(f.walk.active).toBe(true); expect(f.controls.enabled).toBe(false);
      expect(f.panel.children[1]!.textContent).toContain("Hold Shift to move faster");
      expect(f.camera.position.toArray()).toEqual([0, 17.1, 0]); expect(f.camera.near).toBe(0.08);
      f.canvas.key("keydown", "KeyW"); for (let i = 0; i < 60; i++) f.tick();
      expect(Math.hypot(f.camera.position.x, f.camera.position.z)).toBeCloseTo(2.8, 8);
      expect(f.camera.position.y).toBeCloseTo(17.1, 8);
      f.canvas.key("keydown", "Escape");
      expect(f.walk.active).toBe(false); expect(f.controls.enabled).toBe(true); expect(f.button.textContent).toBe("Start walking");
      expect(f.camera.position.distanceTo(initial)).toBeLessThan(1e-9); expect(f.controls.target.distanceTo(target)).toBeLessThan(1e-9); expect(f.camera.near).toBe(near);
      const direction = f.camera.getWorldDirection(new Vector3()); expect(direction.distanceTo(target.clone().sub(initial).normalize())).toBeLessThan(1e-9);
    } finally { f.dispose(); }
  });

  it("normalizes diagonals and aliases at both speeds, and integrates the same walk at 30 and 60 fps", () => {
    const distance = (keys: string[], fps: number): number => {
      const f = fixture();
      try { f.enter(); for (const key of keys) f.canvas.key("keydown", key); for (let i = 0; i < fps; i++) f.tick(1 / fps); return Math.hypot(f.camera.position.x, f.camera.position.z); }
      finally { f.dispose(); }
    };
    for (const keys of [["KeyW"], ["KeyW", "KeyD"], ["KeyW", "ArrowUp"]]) for (const fps of [30, 60]) {
      expect(distance(keys, fps)).toBeCloseTo(2.8, 8);
      expect(distance([...keys, "ShiftLeft"], fps)).toBeCloseTo(8.4, 8);
    }
  });

  it("moves faster only while either Shift key is held and returns to normal speed on release", () => {
    const f = fixture();
    const step = (): number => {
      const before = f.camera.position.clone(); f.tick(0.1); return f.camera.position.distanceTo(before);
    };
    try {
      f.enter(); f.canvas.key("keydown", "KeyW"); expect(step()).toBeCloseTo(0.28, 8);
      f.canvas.key("keydown", "ShiftLeft"); expect(step()).toBeCloseTo(0.84, 8);
      f.canvas.key("keydown", "ShiftRight"); f.canvas.key("keyup", "ShiftLeft"); expect(step()).toBeCloseTo(0.84, 8);
      f.canvas.key("keyup", "ShiftRight"); expect(step()).toBeCloseTo(0.28, 8);
      f.canvas.key("keyup", "KeyW"); f.canvas.key("keydown", "ShiftRight"); expect(step()).toBe(0);
      f.button.dispatchEvent(new Event("click")); f.enter();
      f.canvas.key("keydown", "KeyW"); expect(step()).toBeCloseTo(0.28, 8);
    } finally { f.dispose(); }
  });

  it("looks through drag input and walks relative to yaw without flying when looking up", () => {
    const f = fixture();
    try {
      f.enter(); const before = f.camera.getWorldDirection(new Vector3());
      f.canvas.pointer("pointerdown", 200, 200); f.canvas.pointer("pointermove", 450, -2000); f.canvas.pointer("pointerup", 450, -2000);
      const look = f.camera.getWorldDirection(new Vector3()); expect(look.distanceTo(before)).toBeGreaterThan(0.8); expect(look.y).toBeGreaterThan(0.99);
      f.canvas.key("keydown", "ArrowUp"); for (let i = 0; i < 60; i++) f.tick();
      expect(f.camera.position.y).toBeCloseTo(17.1, 8);
      const horizontal = new Vector3(look.x, 0, look.z).normalize();
      expect(f.camera.position.clone().setY(0).distanceTo(horizontal.multiplyScalar(2.8))).toBeLessThan(1e-8);
      expect(f.canvas.captures.size).toBe(0);
    } finally { f.dispose(); }
  });

  it("clears held movement, faster speed and drag on focus changes, blur and visibility loss", () => {
    const f = fixture();
    try {
      f.enter();
      for (const loseFocus of [() => { f.canvas.ownerDocument.activeElement = f.button; f.canvas.ownerDocument.dispatchEvent(new Event("focusin")); }, () => f.canvas.ownerDocument.defaultView.dispatchEvent(new Event("blur")), () => { f.canvas.ownerDocument.hidden = true; f.canvas.ownerDocument.dispatchEvent(new Event("visibilitychange")); }]) {
        f.canvas.key("keydown", "KeyW"); f.canvas.key("keydown", "ShiftLeft"); f.canvas.pointer("pointerdown", 20, 20);
        const before = f.camera.position.clone(); loseFocus();
        expect(f.canvas.captures.size).toBe(0); f.canvas.ownerDocument.hidden = false; f.canvas.focus(); f.tick();
        expect(f.camera.position.distanceTo(before)).toBe(0);
        f.canvas.key("keydown", "KeyW"); f.tick(0.1);
        expect(f.camera.position.distanceTo(before)).toBeCloseTo(0.28, 8); f.canvas.key("keyup", "KeyW");
      }
      const before = f.camera.position.clone();
      f.canvas.key("keydown", "KeyW", { ctrlKey: true }); f.tick(); expect(f.camera.position.distanceTo(before)).toBe(0);
      f.setReady(false); f.canvas.key("keydown", "KeyW"); f.canvas.key("keydown", "ShiftRight"); f.tick(); f.setReady(true); f.tick();
      expect(f.camera.position.distanceTo(before)).toBe(0);
      f.canvas.key("keydown", "KeyW"); f.tick(0.1); expect(f.camera.position.distanceTo(before)).toBeCloseTo(0.28, 8);
    } finally { f.dispose(); }
  });

  it("bounds time jumps, rejects invalid deltas, honors missing support and cannot cross blocked geometry", () => {
    const f = fixture({ heightAt: (x, _z, previous) => x < 0.5 && (previous === undefined || Math.abs(15.4 + x * 0.1 - previous) < 0.35) ? 15.4 + x * 0.1 : undefined, blocked: (_from, to) => to.x > 0.3 });
    try {
      f.enter(); f.canvas.key("keydown", "KeyW");
      for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) f.tick(delta);
      expect(f.camera.position.x).toBe(0);
      f.tick(20); expect(Math.hypot(f.camera.position.x, f.camera.position.z)).toBeCloseTo(0.28, 8);
      for (let i = 0; i < 120; i++) f.tick();
      expect(f.camera.position.x).toBeGreaterThan(0.25); expect(f.camera.position.x).toBeLessThanOrEqual(0.3);
      expect(f.camera.position.y).toBeCloseTo(17.1 + f.camera.position.x * 0.1, 8);
    } finally { f.dispose(); }
  });

  it("keeps fast diagonal collision substeps within 0.12 m even after a large time jump", () => {
    const sweeps: number[] = [];
    const f = fixture({ heightAt: () => 15.4, blocked: (from, to) => { sweeps.push(Math.hypot(to.x - from.x, to.z - from.z)); return false; } });
    try {
      f.enter(); sweeps.length = 0;
      f.canvas.key("keydown", "KeyW"); f.canvas.key("keydown", "KeyD"); f.canvas.key("keydown", "ShiftLeft"); f.tick(20);
      expect(Math.hypot(f.camera.position.x, f.camera.position.z)).toBeCloseTo(0.84, 8);
      expect(sweeps.length).toBeGreaterThanOrEqual(7); expect(Math.max(...sweeps)).toBeLessThanOrEqual(0.12 + 1e-12);
      expect(sweeps.reduce((sum, distance) => sum + distance, 0)).toBeCloseTo(0.84, 8);
    } finally { f.dispose(); }
  });

  it("refuses unavailable entry, supports the visible Overview exit and disposes every owned listener", () => {
    const rejected = fixture({ heightAt: () => undefined, blocked: () => false });
    try { rejected.enter(); expect(rejected.walk.active).toBe(false); expect(rejected.panel.children[1]!.textContent).toContain("no clear street support"); } finally { rejected.dispose(); }
    const f = fixture(); f.setReady(false); f.enter(); expect(f.button.disabled).toBe(true); expect(f.walk.active).toBe(false);
    f.setReady(true); f.enter(); f.button.dispatchEvent(new Event("click")); expect(f.walk.active).toBe(false);
    f.enter(); f.canvas.pointer("pointerdown", 10, 10); f.dispose(); f.walk.dispose();
    expect(f.canvas.captures.size).toBe(0); expect(f.panel.removed).toBe(true); expect(f.button.listenerCount).toBe(0);
    expect(f.canvas.listenerCount).toBe(0); expect(f.canvas.ownerDocument.listenerCount).toBe(0); expect(f.canvas.ownerDocument.defaultView.listenerCount).toBe(0);
    expect(f.walk.active).toBe(false);
  });
});

describe("actual street support and native building collision", () => {
  it("uses bounded triangle queries through the street collision caller on a dense wall", () => {
    // A source-like 20,000-triangle frontage shares one nearby world AABB.
    // Count actual Three triangle tests, independently of the helper's internals.
    const geometry = new PlaneGeometry(20, 3, 100, 100), material = new MeshBasicMaterial({ side: DoubleSide });
    const wall = new Mesh(geometry, material); wall.rotation.y = Math.PI / 2; wall.position.set(1, 16.7, 0);
    const ground = createWalkGround({ terrainAt: () => 15.2, streetAt: () => 15.2, buildings: { revision: 1, forEachModel(callback) { callback(wall); } } });
    const triangle = vi.spyOn(Ray.prototype, "intersectTriangle");
    try {
      expect(ground.blocked(new Vector3(0.65, 15.2, 0.21), new Vector3(0.77, 15.2, 0.21))).toBe(true);
      expect(triangle.mock.calls.length).toBeGreaterThan(0); expect(triangle.mock.calls.length).toBeLessThan(100);
    } finally { triangle.mockRestore(); geometry.dispose(); material.dispose(); }
  });

  it("requires finite terrain and street support, rejects elevated decks, abrupt steps and the projected AOI edge", () => {
    let terrain: number | undefined = 15.2, street: number | undefined = 15.4;
    const ground = createWalkGround({ terrainAt: () => terrain, streetAt: () => street, buildings: { revision: 1, forEachModel() {} } });
    expect(ground.heightAt(0, 0)).toBe(15.4); expect(ground.heightAt(0, -499.25)).toBeUndefined(); expect(ground.heightAt(700, 0)).toBeUndefined();
    expect(ground.heightAt(0, 0, 14)).toBeUndefined(); street = 30; expect(ground.heightAt(0, 0)).toBeUndefined();
    street = undefined; expect(ground.heightAt(0, 0)).toBeUndefined(); street = 15.4; terrain = Number.NaN; expect(ground.heightAt(0, 0)).toBeUndefined();
  });
  it("blocks short sweeps at actual native walls and refreshes after geometry changes", () => {
    const buildings = new Group(), geometry = new BoxGeometry(0.1, 3, 3), material = new MeshBasicMaterial({ side: DoubleSide });
    const wall = new Mesh(geometry, material); wall.position.set(1, 16.5, 0); buildings.add(wall); let revision = 1;
    const ground = createWalkGround({ terrainAt: () => 15, streetAt: () => 15.2, buildings: { get revision() { return revision; }, forEachModel(callback) { callback(buildings); } } });
    try {
      expect(ground.blocked(new Vector3(0, 15.2, 0), new Vector3(0.1, 15.2, 0))).toBe(false);
      expect(ground.blocked(new Vector3(0.6, 15.2, 0), new Vector3(0.72, 15.2, 0))).toBe(true);
      expect(ground.blocked(new Vector3(0.8, 15.2, 0), new Vector3(0.8, 15.2, 0))).toBe(true);
      buildings.remove(wall); revision++;
      expect(ground.blocked(new Vector3(0.6, 15.2, 0), new Vector3(0.72, 15.2, 0))).toBe(false);
    } finally { geometry.dispose(); material.dispose(); }
  });

  it("uses installed retained final leaves across same-revision visibility changes, backwards walking and logical disposal", () => {
    // Synthetic retained hierarchy; enumeration, visibility, active parenting and
    // disposal are the installed renderer's methods. No parsing/GPU claim.
    const viewer = new TilesRenderer() as TilesRenderer & { setTileVisible(tile: Tile, visible: boolean): void; setTileActive(tile: Tile, active: boolean): void; disposeTile(tile: Tile): void };
    const geometry = new BoxGeometry(3, 3, 0.1), material = new MeshBasicMaterial({ side: DoubleSide });
    const makeTile = (z: number) => {
      const scene = new Group(); scene.position.z = z;
      const wall = new Mesh(geometry, material); wall.position.y = 16.7; scene.add(wall);
      return { children: [], content: { uri: `wall-${z}.b3dm` }, engineData: { scene, geometry: [], materials: [], textures: [] }, traversal: { visible: false, active: false }, internal: { hasRenderableContent: true } } as unknown as Tile & { engineData: { scene: Group | null } };
    };
    const leaf = makeTile(0.65), unprepared = makeTile(0.1), root = makeTile(0.15);
    root.children = [leaf, unprepared];
    Object.assign(viewer, { rootTileset: { root } });
    let revision = 0;
    const admitted = new Set<Tile>([root, leaf]);
    viewer.addEventListener("load-model", () => { revision++; });
    viewer.addEventListener("dispose-model", ({ tile }) => { revision++; admitted.delete(tile); });
    viewer.dispatchEvent({ type: "load-model", tile: leaf, scene: leaf.engineData.scene!, url: "wall-0.65.b3dm" });
    const source = createBuildingWalkCollision(viewer, tile => admitted.has(tile), () => revision);
    const ground = createWalkGround({ terrainAt: () => 15, streetAt: () => 15.2, buildings: source });
    const model = leaf.engineData.scene!, positions = [...geometry.attributes.position!.array];
    const f = fixture(ground);
    try {
      const included: object[] = []; source.forEachModel(scene => included.push(scene));
      expect(included).toEqual([model]); expect(viewer.group.children).toHaveLength(0); expect(model.parent).toBeNull();
      const from = new Vector3(0, 15.2, 0.28), to = new Vector3(0, 15.2, 0.4);
      expect(ground.blocked(from, to)).toBe(true); // Initially off-view, before any visible parenting.
      const retainedRevision = source.revision;
      viewer.setTileVisible(leaf, true); expect(model.parent).toBe(viewer.group); expect(source.revision).toBe(retainedRevision);
      expect(ground.blocked(from, to)).toBe(true);
      viewer.setTileActive(leaf, true); viewer.setTileVisible(leaf, false);
      expect(viewer.group.children).not.toContain(model); expect(model.parent).toBe(viewer.group); expect(source.revision).toBe(retainedRevision);
      expect(ground.blocked(from, to)).toBe(true);
      viewer.setTileActive(leaf, false); expect(model.parent).toBeNull(); expect(source.revision).toBe(retainedRevision);
      expect(ground.blocked(from, to)).toBe(true);
      // Real controls move backwards towards a model absent from the draw group.
      f.enter(); expect(f.walk.active).toBe(true); f.canvas.key("keydown", "KeyS"); f.canvas.key("keydown", "ShiftLeft"); f.tick(20);
      for (let i = 0; i < 120; i++) f.tick();
      expect(f.camera.position.z).toBeGreaterThan(0.2); expect(f.camera.position.z).toBeLessThan(0.4);
      expect(model.position.toArray()).toEqual([0, 0, 0.65]); expect([...geometry.attributes.position!.array]).toEqual(positions);
      viewer.disposeTile(leaf); expect(source.revision).toBe(retainedRevision + 1); expect(leaf.engineData.scene).toBeNull();
      expect(ground.blocked(from, to)).toBe(false);
      for (let i = 0; i < 60; i++) f.tick(); expect(f.camera.position.z).toBeGreaterThan(0.9);
    } finally { f.dispose(); geometry.dispose(); material.dispose(); viewer.dispose(); }
  });
});
