import { Point, getVersion, type Handler, type Map as MapLibreMap } from 'maplibre-gl';

/** Copy the native zoom anchor; public activity includes its finish interval. */
export function activeZoomAnchor(map: MapLibreMap): Point | undefined {
  if (!map.scrollZoom.isZooming()) return;
  const point = map.scrollZoom._aroundPoint;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('Cannot compose wheel zoom: MapLibre 6.15.0 must provide a finite native zoom anchor.');
  }
  return new Point(point.x, point.y);
}

/**
 * Pinned compatibility boundary: public camera setters cancel native gestures.
 * An appended handler instead shares MapLibre 6.15's additive camera pipeline.
 * Recheck this boundary and the real mixed-input gate when upgrading MapLibre.
 */
export function registerInputHandler(map: MapLibreMap, name: string, handler: Handler): { requestFrame(): void; dispose(): void } {
  const manager = map._handlers;
  if (getVersion() !== '6.15.0' || !manager || !Array.isArray(manager._handlers)
    || typeof manager._add !== 'function' || typeof manager._triggerRenderFrame !== 'function'
    || !manager._handlersById || manager._handlersById[name]) {
    throw new Error(`Cannot register ${name}: simultaneous controls require the pinned MapLibre 6.15.0 handler interface.`);
  }
  // Appending leaves native handlers' arbitration unchanged. Our handler accepts
  // every earlier handler, including another application input handler.
  manager._add(name, handler, manager._handlers.map(entry => entry.handlerName));
  let disposed = false;
  const detach = (): void => {
    map.off('render', detach);
    map.off('remove', detach);
    const index = manager._handlers.findIndex(entry => entry.handlerName === name && entry.handler === handler);
    if (index !== -1) manager._handlers.splice(index, 1);
    if (manager._handlersById[name] === handler) delete manager._handlersById[name];
  };
  return {
    requestFrame: () => { if (!disposed) manager._triggerRenderFrame(); },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      handler.disable();
      // A native trailing frame closes drag/pitch events before removing the
      // identity they reference. Removal cancels that frame and detaches too.
      map.once('render', detach);
      map.once('remove', detach);
      manager._triggerRenderFrame();
    },
  };
}
