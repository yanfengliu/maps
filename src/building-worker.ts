import {validateCampusLandscape} from './campus-landscape.ts';
import { buildBuildingGeometry, appendCampusSurfaces, appendCampusLandscape, type CampusData } from './building-geometry.ts';
import { validateCampusSurfaces } from './campus-surfaces.ts';
import { validateCampusEnvironment } from './campus-environment.ts';
import { validateCampusSculptures } from './campus-sculptures.ts';
import { buildChurchInterior } from './church-interior.ts';
import { publicAsset } from './public-assets.ts';

async function readLocalInput(file:string,label:string):Promise<unknown> {
  const input=publicAsset(`data/${file}`);
  let response:Response;
  try {response=await fetch(input,{signal:AbortSignal.timeout(15_000)});}
  catch(error){throw new Error(`${label} ${input} could not load: ${error instanceof Error?error.message:'network failure'}. Check the local input and retry campus detail.`);}
  if(!response.ok)throw new Error(`${label} input returned HTTP ${response.status}. Restore ${input} and retry campus detail.`);
  try{return await response.json();}
  catch{throw new Error(`${label} ${input} is not valid JSON. Restore the pinned input and retry campus detail.`);}
}

self.onmessage = async (event: MessageEvent<{data:CampusData;interior:boolean}>) => {
  try {
    if(event.data.interior){
      const [surfaces,landscape]=await Promise.all([readLocalInput('stanford-surfaces.geojson','Campus paving').then(validateCampusSurfaces),readLocalInput('stanford-landscape.geojson','Campus landscape').then(validateCampusLandscape)]);
      const started=performance.now(),geometry=appendCampusLandscape(appendCampusSurfaces(buildChurchInterior(event.data.data),surfaces,'facades'),landscape,'facades');
      self.postMessage({geometry,buildMs:performance.now()-started},{transfer:[geometry.roofs.buffer,geometry.facades.buffer]});
      return;
    }
    const [source,sculptureSource,surfaceSource,landscapeSource]=await Promise.all([
      readLocalInput('stanford-environment.geojson','Campus environment'),
      readLocalInput('stanford-sculptures.geojson','Campus sculpture'),
      readLocalInput('stanford-surfaces.geojson','Campus paving'),
      readLocalInput('stanford-landscape.geojson','Campus landscape')
    ]);
    const environment=validateCampusEnvironment(source),sculptures=validateCampusSculptures(sculptureSource);
    const started=performance.now();
    const geometry = buildBuildingGeometry(event.data.data,environment,sculptures,validateCampusSurfaces(surfaceSource),validateCampusLandscape(landscapeSource));
    self.postMessage({ geometry, buildMs: performance.now() - started }, { transfer: [geometry.roofs.buffer, geometry.facades.buffer,...(geometry.terrainAnchors?[geometry.terrainAnchors.buffer]:[])] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Campus geometry generation failed.' });
  }
};
