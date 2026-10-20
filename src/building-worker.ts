import { buildBuildingGeometry, type CampusData } from './building-geometry.ts';

self.onmessage = (event: MessageEvent<CampusData>) => {
  const started = performance.now();
  try {
    const geometry = buildBuildingGeometry(event.data);
    self.postMessage({ geometry, buildMs: performance.now() - started }, { transfer: [geometry.roofs.buffer, geometry.facades.buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Campus geometry generation failed.' });
  }
};
