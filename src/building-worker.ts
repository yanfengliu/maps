import { buildBuildingGeometry, type CampusData } from './building-geometry.ts';
import { validateCampusEnvironment } from './campus-environment.ts';
import { validateCampusSculptures } from './campus-sculptures.ts';

async function readLocalInput(file:string,label:string):Promise<unknown> {
  const input=`/data/${file}`;
  let response:Response;
  try {response=await fetch(input,{signal:AbortSignal.timeout(15_000)});}
  catch(error){throw new Error(`${label} ${input} could not load: ${error instanceof Error?error.message:'network failure'}. Check the local input and retry campus detail.`);}
  if(!response.ok)throw new Error(`${label} input returned HTTP ${response.status}. Restore ${input} and retry campus detail.`);
  try{return await response.json();}
  catch{throw new Error(`${label} ${input} is not valid JSON. Restore the pinned input and retry campus detail.`);}
}

self.onmessage = async (event: MessageEvent<CampusData>) => {
  try {
    const [source,sculptureSource]=await Promise.all([
      readLocalInput('stanford-environment.geojson','Campus environment'),
      readLocalInput('stanford-sculptures.geojson','Campus sculpture')
    ]);
    const environment=validateCampusEnvironment(source),sculptures=validateCampusSculptures(sculptureSource);
    const started=performance.now();
    const geometry = buildBuildingGeometry(event.data,environment,sculptures);
    self.postMessage({ geometry, buildMs: performance.now() - started }, { transfer: [geometry.roofs.buffer, geometry.facades.buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Campus geometry generation failed.' });
  }
};
