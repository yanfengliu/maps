import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** r180's pan primitive is also used by its pointer and arrow-key handlers. */
type PanControls = OrbitControls & { _pan(deltaX: number, deltaY: number): void };

const PAN_VIEWPORTS_PER_SECOND = 0.3;
const PAN_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);

/** Queue held keyboard input through OrbitControls, without another pose writer. */
export function installCameraKeyboard(controls: OrbitControls, canvas: HTMLCanvasElement): void {
  const panControls = controls as PanControls;
  if (typeof panControls._pan !== "function") {
    throw new Error("Camera keyboard panning requires OrbitControls' _pan input primitive; restore the supported three.js control version.");
  }

  const document = canvas.ownerDocument;
  const view = document?.defaultView;
  // CPU pointer fixtures and an offscreen canvas have no keyboard window.
  if (!view) return;

  const held = new Set<string>();
  const originalUpdate = controls.update.bind(controls);
  const originalDispose = controls.dispose.bind(controls);
  const previousTabIndex = canvas.getAttribute("tabindex");
  canvas.tabIndex = 0;
  let disposed = false;

  const focusAllowsPan = (): boolean => {
    const focused = document.activeElement;
    return !focused || focused === document.body || focused === canvas;
  };
  const clear = (): void => { held.clear(); };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !focusAllowsPan() || !controls.enabled || !controls.enablePan) {
      clear();
      return;
    }
    if (!PAN_KEYS.has(event.code) || event.defaultPrevented) return;
    held.add(event.code);
    event.preventDefault();
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (held.delete(event.code)) event.preventDefault();
  };
  const onFocus = (): void => { if (!focusAllowsPan()) clear(); };
  const onVisibility = (): void => { if (document.hidden) clear(); };
  const onPointerDown = (): void => { canvas.focus({ preventScroll: true }); };
  const onMouseDown = (event: MouseEvent): void => { if (event.button === 1) event.preventDefault(); };

  view.addEventListener("keydown", onKeyDown);
  view.addEventListener("keyup", onKeyUp);
  view.addEventListener("blur", clear);
  document.addEventListener("focusin", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("mousedown", onMouseDown);

  // Install outside control-rest: its residual flush may call native update
  // twice, but a held key must be queued only once per actual rendered frame.
  controls.update = (delta?: number | null): boolean => {
    if (held.size && (!focusAllowsPan() || document.hidden || !controls.enabled || !controls.enablePan)) clear();
    if (held.size && typeof delta === "number" && Number.isFinite(delta) && delta > 0) {
      const x = Number(held.has("KeyA")) - Number(held.has("KeyD"));
      const y = Number(held.has("KeyW")) - Number(held.has("KeyS"));
      const length = Math.hypot(x, y);
      if (length && canvas.clientHeight > 0) {
        const pixels = canvas.clientHeight * PAN_VIEWPORTS_PER_SECOND * Math.min(delta, 0.25) / length;
        panControls._pan(x * pixels, y * pixels);
      }
    }
    return originalUpdate(delta);
  };

  controls.dispose = (): void => {
    if (disposed) return;
    disposed = true;
    clear();
    view.removeEventListener("keydown", onKeyDown);
    view.removeEventListener("keyup", onKeyUp);
    view.removeEventListener("blur", clear);
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("mousedown", onMouseDown);
    if (canvas.tabIndex === 0) {
      if (previousTabIndex === null) canvas.removeAttribute("tabindex");
      else canvas.setAttribute("tabindex", previousTabIndex);
    }
    controls.update = originalUpdate;
    originalDispose();
  };
}
