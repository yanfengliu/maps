import { Point, type Handler, type HandlerResult, type Map as MapLibreMap } from 'maplibre-gl';
import { activeZoomAnchor, registerInputHandler } from './input-handler.ts';

/** Pan in screen pixels while a map-focused WASD key is held, alongside gestures. */
export function enableHeldKeyboardPan(map: MapLibreMap): () => void {
  const canvas = map.getCanvas();
  const document = canvas.ownerDocument;
  const ownerWindow = document.defaultView!;
  const held = new Set<string>();
  const keys = new Set(['w', 'a', 's', 'd']);
  const pixelsPerSecond = 560;
  let previousTime = 0;
  let enabled = true;
  let disposed = false;
  let ownsPan = false;
  const direction = (): [number, number] => [Number(held.has('d')) - Number(held.has('a')), Number(held.has('s')) - Number(held.has('w'))];
  const moving = (): boolean => { const [x, y] = direction(); return Boolean(x || y); };
  const handler: Handler = {
    enable: () => { enabled = true; },
    disable: () => { enabled = false; held.clear(); ownsPan = false; },
    isEnabled: () => enabled,
    // A keyboard frame may own the combined drag event. Releasing the key must
    // not end that event while an overlapping native pan is still held.
    isActive: () => {
      const keyboardMoving = moving(), nativeMoving = map.dragPan.isActive();
      if (!keyboardMoving && !nativeMoving) ownsPan = false;
      return keyboardMoving || (ownsPan && nativeMoving);
    },
    reset: () => { held.clear(); ownsPan = false; },
    renderFrame: (): HandlerResult | void => {
      const [x, y] = direction();
      const length = Math.hypot(x, y);
      if (!length) return;
      const time = ownerWindow.performance.now();
      const distance = pixelsPerSecond * Math.max(0, Math.min(time - previousTime, 50)) / 1000;
      previousTime = time;
      // Handler panDelta moves the map surface; panBy used the opposite sign.
      const panDelta = new Point(-x / length * distance, -y / length * distance);
      // The native mercator helper ignores panning about the exact center.
      // Treat keys as dragging from the center, while preserving wheel zoom's
      // pointer anchor throughout its native animation and finish interval.
      const around = (activeZoomAnchor(map) ?? map.project(map.getCenter())).add(panDelta);
      ownsPan = true;
      return { panDelta, around, needsRenderFrame: true, noInertia: true };
    },
  };
  const registration = registerInputHandler(map, 'heldKeyboardPan', handler);
  const clear = (): void => {
    if (!held.size) return;
    held.clear();
    registration.requestFrame();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) { clear(); return; }
    const key = event.key.toLowerCase();
    if (!keys.has(key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    const wasMoving = moving();
    held.add(key);
    if (!wasMoving) previousTime = ownerWindow.performance.now();
    registration.requestFrame();
  };
  const keyup = (event: KeyboardEvent): void => {
    const wasMoving = moving();
    if (!held.delete(event.key.toLowerCase())) return;
    if (!wasMoving) previousTime = ownerWindow.performance.now();
    registration.requestFrame();
  };
  const visibility = (): void => { if (document.hidden) clear(); };
  canvas.addEventListener('keydown', keydown, { capture: true });
  canvas.addEventListener('blur', clear);
  ownerWindow.addEventListener('keyup', keyup);
  ownerWindow.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    if (disposed) return;
    disposed = true;
    registration.dispose();
    canvas.removeEventListener('keydown', keydown, { capture: true });
    canvas.removeEventListener('blur', clear);
    ownerWindow.removeEventListener('keyup', keyup);
    ownerWindow.removeEventListener('blur', clear);
    document.removeEventListener('visibilitychange', visibility);
  };
}
