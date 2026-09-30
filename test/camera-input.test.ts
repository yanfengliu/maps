/** Bound: actual OrbitControls handlers and held-key frame input on CPU event
 * targets. Browser delivery, rendered appearance and performance are separate. */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createCameraRig } from "../src/render/camera.js";

class TrackedTarget extends EventTarget {
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    if (callback) {
      const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
      listeners.add(callback); this.listeners.set(type, listeners);
    }
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
    if (callback) this.listeners.get(type)?.delete(callback);
    super.removeEventListener(type, callback, options);
  }
  get listenerCount(): number { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

class Document extends TrackedTarget {
  readonly defaultView = new TrackedTarget();
  readonly body = {};
  activeElement: object | null = this.body;
  hidden = false;
}

class Canvas extends TrackedTarget {
  readonly ownerDocument = new Document();
  clientWidth = 1280;
  clientHeight = 720;
  style = {};
  private readonly attributes = new Map<string, string>();
  get tabIndex(): number { return Number(this.attributes.get("tabindex") ?? -1); }
  set tabIndex(value: number) { this.attributes.set("tabindex", String(value)); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  getRootNode(): Document { return this.ownerDocument; }
  setPointerCapture(): void { /* CPU fixture has no native pointer. */ }
  releasePointerCapture(): void { /* CPU fixture has no native pointer. */ }
  focus(): void { this.ownerDocument.activeElement = this; this.ownerDocument.dispatchEvent(new Event("focusin")); }
  key(type: "keydown" | "keyup", code: string, fields: Record<string, unknown> = {}): Event {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, key: code.slice(3).toLowerCase(), altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false, ...fields });
    this.ownerDocument.defaultView.dispatchEvent(event); return event;
  }
  pointer(type: string, button: number, clientX: number, clientY: number): Event {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { button, pointerId: 1, pointerType: "mouse", clientX, clientY, ctrlKey: false, shiftKey: false, metaKey: false });
    this.dispatchEvent(event); return event;
  }
  wheel(deltaY = 120): void {
    const event = new Event("wheel", { cancelable: true });
    Object.assign(event, { deltaY, deltaMode: 0, clientX: 640, clientY: 360, ctrlKey: false, shiftKey: false, metaKey: false });
    this.dispatchEvent(event);
  }
}

function fixture() {
  const canvas = new Canvas();
  const rig = createCameraRig(canvas as unknown as HTMLCanvasElement);
  return { canvas, ...rig, settle: () => { for (let i = 0; i < 160; i++) rig.controls.update(1 / 60); } };
}

function heldPan(keys: string[], fps = 60, repeats = 0): Vector3 {
  const f = fixture();
  try {
    const before = f.controls.target.clone();
    for (const key of keys) f.canvas.key("keydown", key);
    for (let i = 0; i < repeats; i++) f.canvas.key("keydown", keys[0]!, { repeat: true });
    for (let i = 0; i < fps; i++) f.controls.update(1 / fps);
    for (const key of keys) f.canvas.key("keyup", key);
    f.settle();
    return f.controls.target.clone().sub(before);
  } finally { f.controls.dispose(); }
}

describe("map camera input", () => {
  it.each(["KeyW", "KeyA", "KeyS", "KeyD"])("holds %s to pan both camera and target on the ground", (key) => {
    const f = fixture();
    try {
      const position = f.camera.position.clone(), target = f.controls.target.clone();
      const offset = position.clone().sub(target);
      const right = new Vector3().setFromMatrixColumn(f.camera.matrix, 0);
      const forward = new Vector3().crossVectors(f.camera.up, right);
      const direction = key === "KeyW" ? forward : key === "KeyS" ? forward.negate() : key === "KeyD" ? right : right.negate();
      expect(f.canvas.key("keydown", key).defaultPrevented).toBe(true);
      for (let i = 0; i < 60; i++) f.controls.update(1 / 60);
      expect(f.canvas.key("keyup", key).defaultPrevented).toBe(true);
      f.settle();
      const moved = f.controls.target.clone().sub(target);
      expect(moved.length()).toBeGreaterThan(500);
      expect(moved.length()).toBeLessThan(650);
      expect(moved.clone().normalize().dot(direction)).toBeCloseTo(1, 12);
      expect(moved.y).toBeCloseTo(0, 10);
      expect(f.camera.position.clone().sub(position).distanceTo(moved)).toBeLessThan(1e-8);
      expect(f.camera.position.clone().sub(f.controls.target).distanceTo(offset)).toBeLessThan(1e-8);
    } finally { f.controls.dispose(); }
  });

  it("uses elapsed frame time rather than frame count or OS repeat", () => {
    const at30 = heldPan(["KeyW"], 30), at60 = heldPan(["KeyW"], 60), at120 = heldPan(["KeyW"], 120);
    expect(at30.length()).toBeGreaterThan(500);
    expect(at30.distanceTo(at60)).toBeLessThan(1e-8);
    expect(at120.distanceTo(at60)).toBeLessThan(1e-8);
    expect(heldPan(["KeyW"], 60, 50).distanceTo(at60)).toBeLessThan(1e-8);
  });

  it("normalizes diagonals and cancels opposite held keys", () => {
    const straight = heldPan(["KeyW"]), diagonal = heldPan(["KeyW", "KeyD"]);
    expect(diagonal.length()).toBeCloseTo(straight.length(), 8);
    expect(diagonal.clone().normalize().dot(straight.clone().normalize())).toBeCloseTo(Math.SQRT1_2, 12);
    expect(heldPan(["KeyW", "KeyS", "KeyA", "KeyD"]).length()).toBe(0);
  });

  it.each([25, 220, 1800])("moves on every held frame at the %sm view without changing height or zoom", (requestedDistance) => {
    const f = fixture();
    try {
      for (let i = 0; i < 100 && f.controls.getDistance() > requestedDistance * 1.05; i++) f.canvas.wheel(-120);
      f.settle();
      const distance = f.controls.getDistance(), height = f.camera.position.y, targetHeight = f.controls.target.y;
      expect(distance).toBeGreaterThanOrEqual(requestedDistance * 0.9);
      expect(distance).toBeLessThanOrEqual(requestedDistance * 1.05);
      f.canvas.key("keydown", "KeyW");
      let previous = f.controls.target.clone();
      for (let i = 0; i < 60; i++) {
        f.controls.update(1 / 60);
        const movement = f.controls.target.distanceTo(previous);
        expect(movement).toBeGreaterThan(distance * 0.0001);
        // One frame may flush existing damping, but must not queue time twice.
        expect(movement).toBeLessThan(distance * 0.013);
        expect(f.controls.getDistance()).toBeCloseTo(distance, 8);
        expect(f.camera.position.y).toBeCloseTo(height, 8);
        expect(f.controls.target.y).toBeCloseTo(targetHeight, 12);
        previous = f.controls.target.clone();
      }
      f.canvas.key("keyup", "KeyW"); f.settle();
      const rested = f.controls.target.clone();
      for (let i = 0; i < 30; i++) f.controls.update(1 / 60);
      expect(f.controls.target.distanceTo(rested)).toBe(0);
    } finally { f.controls.dispose(); }
  });

  it("does not pan from pointer-handler updates without a frame delta", () => {
    const f = fixture();
    try {
      const before = f.controls.target.clone(); f.canvas.key("keydown", "KeyW");
      for (const delta of [undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) f.controls.update(delta);
      expect(f.controls.target.distanceTo(before)).toBe(0);
      f.controls.update(1 / 60); expect(f.controls.target.distanceTo(before)).toBeGreaterThan(0);
    } finally { f.controls.dispose(); }
  });

  it.each(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "contenteditable"])("leaves %s focus alone and clicking the canvas restores panning", (tagName) => {
    const f = fixture();
    try {
      f.canvas.ownerDocument.activeElement = { tagName, isContentEditable: tagName === "contenteditable" };
      const before = f.controls.target.clone();
      expect(f.canvas.key("keydown", "KeyW").defaultPrevented).toBe(false);
      for (let i = 0; i < 10; i++) f.controls.update(1 / 60);
      expect(f.controls.target.distanceTo(before)).toBe(0);
      f.canvas.pointer("pointerdown", 0, 640, 360); f.canvas.pointer("pointerup", 0, 640, 360);
      expect(f.canvas.ownerDocument.activeElement).toBe(f.canvas);
      f.canvas.key("keydown", "KeyW"); f.controls.update(1 / 60);
      expect(f.controls.target.distanceTo(before)).toBeGreaterThan(0);
    } finally { f.controls.dispose(); }
  });

  it.each(["altKey", "ctrlKey", "metaKey", "shiftKey"])("leaves %s shortcuts alone", (modifier) => {
    const f = fixture();
    try {
      const before = f.controls.target.clone();
      expect(f.canvas.key("keydown", "KeyW", { [modifier]: true }).defaultPrevented).toBe(false);
      for (let i = 0; i < 10; i++) f.controls.update(1 / 60);
      expect(f.controls.target.distanceTo(before)).toBe(0);
    } finally { f.controls.dispose(); }
  });

  it.each(["blur", "visibilitychange", "focusin"])("clears a held key on %s", (type) => {
    const f = fixture();
    try {
      f.canvas.key("keydown", "KeyW");
      if (type === "blur") f.canvas.ownerDocument.defaultView.dispatchEvent(new Event(type));
      else {
        if (type === "visibilitychange") f.canvas.ownerDocument.hidden = true;
        else f.canvas.ownerDocument.activeElement = { tagName: "INPUT" };
        f.canvas.ownerDocument.dispatchEvent(new Event(type));
      }
      f.canvas.ownerDocument.hidden = false; f.canvas.ownerDocument.activeElement = f.canvas.ownerDocument.body;
      const before = f.controls.target.clone();
      for (let i = 0; i < 20; i++) f.controls.update(1 / 60);
      expect(f.controls.target.distanceTo(before)).toBe(0);
    } finally { f.controls.dispose(); }
  });

  it.each([0, 1])("button %s rotates through the actual pointer handlers without zooming", (button) => {
    const f = fixture();
    try {
      const distance = f.controls.getDistance(), azimuth = f.controls.getAzimuthalAngle(), polar = f.controls.getPolarAngle();
      f.canvas.pointer("pointerdown", button, 640, 360);
      f.canvas.pointer("pointermove", button, 740, 400);
      f.canvas.pointer("pointerup", button, 740, 400); f.settle();
      expect(Math.abs(f.controls.getAzimuthalAngle() - azimuth)).toBeGreaterThan(0.2);
      expect(Math.abs(f.controls.getPolarAngle() - polar)).toBeGreaterThan(0.1);
      expect(f.controls.getDistance()).toBeCloseTo(distance, 8);
    } finally { f.controls.dispose(); }
  });

  it("keeps right-drag pan and wheel zoom, and prevents only middle-click autoscroll", () => {
    const f = fixture();
    try {
      expect(f.canvas.pointer("mousedown", 1, 640, 360).defaultPrevented).toBe(true);
      expect(f.canvas.pointer("mousedown", 0, 640, 360).defaultPrevented).toBe(false);
      expect(f.canvas.pointer("mousedown", 2, 640, 360).defaultPrevented).toBe(false);
      const target = f.controls.target.clone(), distance = f.controls.getDistance(), azimuth = f.controls.getAzimuthalAngle();
      f.canvas.pointer("pointerdown", 2, 640, 360); f.canvas.pointer("pointermove", 2, 700, 360); f.canvas.pointer("pointerup", 2, 700, 360); f.settle();
      expect(f.controls.target.distanceTo(target)).toBeGreaterThan(1);
      expect(f.controls.getAzimuthalAngle()).toBeCloseTo(azimuth, 8);
      f.canvas.wheel(); f.settle(); expect(f.controls.getDistance()).toBeGreaterThan(distance);
    } finally { f.controls.dispose(); }
  });

  it("removes owned listeners, clears held input and restores canvas focusability on disposal", () => {
    const f = fixture();
    expect(f.canvas.tabIndex).toBe(0);
    f.canvas.key("keydown", "KeyW");
    f.controls.dispose(); f.controls.dispose();
    const before = f.controls.target.clone();
    expect(f.canvas.key("keydown", "KeyW").defaultPrevented).toBe(false);
    f.controls.update(1 / 60);
    expect(f.controls.target.distanceTo(before)).toBe(0);
    expect(f.canvas.listenerCount).toBe(0);
    expect(f.canvas.ownerDocument.listenerCount).toBe(0);
    expect(f.canvas.ownerDocument.defaultView.listenerCount).toBe(0);
    expect(f.canvas.getAttribute("tabindex")).toBe(null);
  });
});
