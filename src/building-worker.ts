import { buildBuildingGeometry, type CampusData } from './building-geometry.ts';
import { validateCampusEnvironment } from './campus-environment.ts';

self.onmessage = async (event: MessageEvent<CampusData>) => {
  try {
    let response:Response;
    try { response=await fetch('/data/stanford-environment.geojson',{signal:AbortSignal.timeout(15_000)}); }
    catch(error){throw new Error(`Campus environment /data/stanford-environment.geojson could not load: ${error instanceof Error?error.message:'network failure'}. Check the local input and retry campus detail.`);}
    if(!response.ok)throw new Error(`Campus environment input returned HTTP ${response.status}. Restore /data/stanford-environment.geojson and retry campus detail.`);
    let source:unknown;
    try {source=await response.json();}
    catch{throw new Error('Campus environment /data/stanford-environment.geojson is not valid JSON. Restore the pinned environment input and retry campus detail.');}
    const environment=validateCampusEnvironment(source);
    const started=performance.now();
    const geometry = buildBuildingGeometry(event.data,environment);
    self.postMessage({ geometry, buildMs: performance.now() - started }, { transfer: [geometry.roofs.buffer, geometry.facades.buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Campus geometry generation failed.' });
  }
};
