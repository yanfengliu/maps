import type { Handler, Map as MapLibreMap } from 'maplibre-gl';
import { registerInputHandler } from './input-handler.ts';

/** Middle-drag adds tilt to native camera input without browser autoscroll. */
export function enableMiddleMouseTilt(map: MapLibreMap): () => void {
  const canvas = map.getCanvas();
  const document = canvas.ownerDocument;
  const ownerWindow = document.defaultView!;
  let y: number | undefined;
  let enabled = true;
  let disposed = false;
  const reset = (): void => { y = undefined; };
  const handler: Handler = {
    enable: () => { enabled = true; },
    disable: () => { enabled = false; reset(); },
    isEnabled: () => enabled,
    isActive: () => y !== undefined,
    reset,
    mousedown: (event: MouseEvent) => {
      if (event.button !== 1) return;
      event.preventDefault();
      y = event.clientY;
      canvas.focus({ preventScroll: true });
    },
    mousemoveWindow: (event: MouseEvent) => {
      if (y === undefined) return;
      if (!(event.buttons & 4)) { reset(); return; }
      event.preventDefault();
      const pitchDelta = (y - event.clientY) * 0.25;
      y = event.clientY;
      return pitchDelta ? { pitchDelta, noInertia: true } : undefined;
    },
    mouseup: (event: MouseEvent) => { if (event.button === 1) reset(); },
    mouseupWindow: (event: MouseEvent) => { if (event.button === 1) reset(); },
  };
  const registration = registerInputHandler(map, 'middleMouseTilt', handler);
  const clear = (): void => { if (y !== undefined) { reset(); registration.requestFrame(); } };
  const visibility = (): void => { if (document.hidden) clear(); };
  const preventAutoscroll = (event: MouseEvent): void => { if (event.button === 1) event.preventDefault(); };
  canvas.addEventListener('auxclick', preventAutoscroll);
  canvas.addEventListener('blur', clear);
  ownerWindow.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    if (disposed) return;
    disposed = true;
    registration.dispose();
    canvas.removeEventListener('auxclick', preventAutoscroll);
    canvas.removeEventListener('blur', clear);
    ownerWindow.removeEventListener('blur', clear);
    document.removeEventListener('visibilitychange', visibility);
  };
}
