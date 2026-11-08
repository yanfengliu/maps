import { buildBuildingGeometry, type CampusData } from './building-geometry.ts';
import { validateCampusEnvironment } from './campus-environment.ts';
import { validateCampusSculptures } from './campus-sculptures.ts';
import { buildChurchInterior } from './church-interior.ts';

async function readLocalInput(file:string,label:string):Promise<unknown> {
  const input=`/data/${file}`;
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
      const started=performance.now(),geometry=buildChurchInterior(event.data.data);
      self.postMessage({geometry,buildMs:performance.now()-started},{transfer:[geometry.roofs.buffer,geometry.facades.buffer]});
      return;
    }
    const [source,sculptureSource]=await Promise.all([
      readLocalInput('stanford-environment.geojson','Campus environment'),
      readLocalInput('stanford-sculptures.geojson','Campus sculpture')
    ]);
    const environment=validateCampusEnvironment(source),sculptures=validateCampusSculptures(sculptureSource);
    const started=performance.now();
    const geometry = buildBuildingGeometry(event.data.data,environment,sculptures);
    self.postMessage({ geometry, buildMs: performance.now() - started }, { transfer: [geometry.roofs.buffer, geometry.facades.buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Campus geometry generation failed.' });
  }
};
