import type { Map as MapLibreMap } from 'maplibre-gl';

/** Pan in screen pixels while a map-focused WASD key is held. */
export function enableHeldKeyboardPan(map: Pick<MapLibreMap, 'getCanvas' | 'panBy' | 'stop'>): () => void {
  const canvas = map.getCanvas();
  const document = canvas.ownerDocument;
  const ownerWindow = document.defaultView!;
  const held = new Set<string>();
  const pointers = new Set<number>();
  const keys = new Set(['w', 'a', 's', 'd']);
  const pixelsPerSecond = 560;
  let frame: number | undefined;
  let wheelTimer: number | undefined;
  let previousTime = 0;
  let disposed = false;

  const direction = (): [number, number] => [Number(held.has('d')) - Number(held.has('a')), Number(held.has('s')) - Number(held.has('w'))];
  const cancelFrame = (): void => {
    if (frame !== undefined) ownerWindow.cancelAnimationFrame(frame);
    frame = undefined;
  };
  const clearKeys = (): void => { held.clear(); cancelFrame(); };
  const clearWheel = (): void => {
    if (wheelTimer !== undefined) ownerWindow.clearTimeout(wheelTimer);
    wheelTimer = undefined;
  };
  const clear = (): void => { clearKeys(); pointers.clear(); clearWheel(); };
  const tick = (time: number): void => {
    frame = undefined;
    if (disposed) return;
    const [x, y] = direction();
    const length = Math.hypot(x, y);
    if (!length) return;
    // A suspended tab must not catch up with a large camera jump.
    const distance = pixelsPerSecond * Math.max(0, Math.min(time - previousTime, 50)) / 1000;
    previousTime = time;
    map.panBy([x / length * distance, y / length * distance], { animate: false });
    frame = ownerWindow.requestAnimationFrame(tick);
  };
  const sync = (): void => {
    if (disposed) return;
    const [x, y] = direction();
    // Public camera updates stop MapLibre's native handlers. Let a pointer
    // gesture finish, then resume any keys that are still held.
    if (pointers.size || wheelTimer !== undefined || (!x && !y)) { cancelFrame(); return; }
    if (frame !== undefined) return;
    map.stop();
    previousTime = ownerWindow.performance.now();
    frame = ownerWindow.requestAnimationFrame(tick);
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) { clearKeys(); return; }
    const key = event.key.toLowerCase();
    if (!keys.has(key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    held.add(key);
    sync();
  };
  const keyup = (event: KeyboardEvent): void => {
    if (held.delete(event.key.toLowerCase())) sync();
  };
  const pointerdown = (event: PointerEvent): void => { pointers.add(event.pointerId); cancelFrame(); };
  const pointerend = (event: PointerEvent): void => { if (pointers.delete(event.pointerId)) sync(); };
  const wheel = (): void => {
    cancelFrame();
    clearWheel();
    // Native wheel smoothing and its end delay take up to 400 ms. A bounded
    // settle window also resumes at zoom limits where no zoom event occurs.
    wheelTimer = ownerWindow.setTimeout(() => { wheelTimer = undefined; sync(); }, 500);
  };
  const visibility = (): void => { if (document.hidden) clear(); };
  canvas.addEventListener('keydown', keydown, { capture: true });
  canvas.addEventListener('blur', clear);
  canvas.addEventListener('pointerdown', pointerdown, { capture: true });
  canvas.addEventListener('wheel', wheel, { capture: true, passive: true });
  ownerWindow.addEventListener('keyup', keyup);
  ownerWindow.addEventListener('blur', clear);
  ownerWindow.addEventListener('pointerup', pointerend, { capture: true });
  ownerWindow.addEventListener('pointercancel', pointerend, { capture: true });
  document.addEventListener('visibilitychange', visibility);
  return () => {
    if (disposed) return;
    disposed = true;
    clear();
    canvas.removeEventListener('keydown', keydown, { capture: true });
    canvas.removeEventListener('blur', clear);
    canvas.removeEventListener('pointerdown', pointerdown, { capture: true });
    canvas.removeEventListener('wheel', wheel, { capture: true });
    ownerWindow.removeEventListener('keyup', keyup);
    ownerWindow.removeEventListener('blur', clear);
    ownerWindow.removeEventListener('pointerup', pointerend, { capture: true });
    ownerWindow.removeEventListener('pointercancel', pointerend, { capture: true });
    document.removeEventListener('visibilitychange', visibility);
  };
}
