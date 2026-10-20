import type { Map as MapLibreMap } from 'maplibre-gl';

/** Middle-drag tilts without invoking the browser's middle-button autoscroll. */
export function enableMiddleMouseTilt(map: MapLibreMap): () => void {
  const canvas = map.getCanvas();
  const ownerWindow = canvas.ownerDocument.defaultView!;
  let drag: { pointer: number; y: number; pitch: number } | undefined;
  const end = () => {
    const pointer = drag?.pointer;
    drag = undefined;
    if (pointer !== undefined && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  };
  const start = (event: PointerEvent) => {
    if (event.button !== 1) return;
    event.preventDefault();
    map.stop();
    drag = { pointer: event.pointerId, y: event.clientY, pitch: map.getPitch() };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!(event.buttons & 4)) { end(); return; }
    event.preventDefault();
    map.jumpTo({ pitch: Math.max(map.getMinPitch(), Math.min(map.getMaxPitch(), drag.pitch + (drag.y - event.clientY) * 0.25)) });
  };
  const preventAutoscroll = (event: MouseEvent) => { if (event.button === 1) event.preventDefault(); };
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('auxclick', preventAutoscroll);
  ownerWindow.addEventListener('blur', end);
  return () => {
    end();
    canvas.removeEventListener('pointerdown', start);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', end);
    canvas.removeEventListener('pointercancel', end);
    canvas.removeEventListener('lostpointercapture', end);
    canvas.removeEventListener('auxclick', preventAutoscroll);
    ownerWindow.removeEventListener('blur', end);
  };
}
