// Offline authoring tool. No Python or skeleton library is bundled in the product.
// Download the pinned BSD-3 wheel into ignored artifacts first:
// python -m pip download --no-deps --dest artifacts/skeleton-tools py_straight_skeleton==0.1.0
// node tools/data/build-campus-roofs.mjs artifacts/skeleton-tools/py_straight_skeleton-0.1.0-py3-none-any.whl
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { prepareBuildingDetails, projectLocal } from '../../src/building-geometry.ts';
import { evaluateRoofSkeleton, orientRoofRings, roofSourceSignature, roofSignatureMargin, ROOF_SIGNATURE_ROUNDOFF } from '../../src/roof-skeleton.ts';

const wheelSha256 = 'f9602b88d09147bf69551ec81e209281eca3e295a40b7d6e26ee0921b8c8d317';
const wheel = resolve(process.argv[2] ?? 'artifacts/skeleton-tools/py_straight_skeleton-0.1.0-py3-none-any.whl');
const digest = value => createHash('sha256').update(value).digest('hex');
if (digest(readFileSync(wheel)) !== wheelSha256) throw Error('Wrong skeleton authoring tool; download the pinned wheel.');
const source = readFileSync('public/data/stanford-buildings.geojson');
const prepared = prepareBuildingDetails(JSON.parse(source));
const cases = [];
for (const feature of prepared.features.filter(f => f.properties.id === 'relation/12460152' || f.properties.detailArchitecture.roofShape === 'hipped' && !['quad','quad-wing'].includes(f.properties.detailArchitecture.profile))) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const [index, polygon] of polygons.entries()) cases.push({ id: `${feature.properties.id}/${index}`, rings: orientRoofRings(polygon.map(ring => ring.slice(0, -1).map(projectLocal))) });
}
const run = spawnSync('python', ['tools/data/quad-roof-skeleton.py', wheel], { input: JSON.stringify(cases), encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
if (run.status !== 0) throw Error(run.stderr || 'Skeleton authoring failed.');
const determinant = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

// A source boundary can contain consecutive exactly-collinear segments. The
// authoring library creates degree-two nodes on their common roof plane. Merge
// those faces and remove only redundant interior ridge nodes; all source
// vertices remain exact. This is topology normalization, never simplification.
function normalizeCoplanar(model,source){
  const plane=face=>{const a=source[face[0]],b=source[face[1]],d=[b[0]-a[0],b[1]-a[1]],l=Math.hypot(...d);return {a,n:[-d[1]/l,d[0]/l]};};
  let merged=true;
  while(merged){merged=false;
    outer:for(let i=0;i<model.faces.length;i++)for(let j=i+1;j<model.faces.length;j++){
      const p=plane(model.faces[i]),q=plane(model.faces[j]);
      if(Math.hypot(p.n[0]-q.n[0],p.n[1]-q.n[1])>1e-12||Math.abs((q.a[0]-p.a[0])*p.n[0]+(q.a[1]-p.a[1])*p.n[1])>1e-10)continue;
      const edges=new Map();let common=0;
      for(const face of [model.faces[i],model.faces[j]])for(let k=0;k<face.length;k++){
        const a=face[k],b=face[(k+1)%face.length],reverse=b+','+a;
        if(edges.has(reverse)){edges.delete(reverse);common++;}else edges.set(a+','+b,[a,b]);
      }
      if(!common)continue;
      const next=new Map([...edges.values()]),start=model.faces[i][0],face=[];let current=start;
      do{face.push(current);current=next.get(current);}while(current!==start&&current!==undefined&&face.length<=next.size);
      if(current!==start||face.length!==next.size)throw Error('Non-simple coplanar union');
      model.faces[i]=face;model.faces.splice(j,1);merged=true;break outer;
    }
  }
  let changed=true;
  while(changed){changed=false;
    for(let i=source.length;i<model.vertices.length;i++){
      const incident=model.faces.filter(f=>f.includes(i));if(incident.length!==2)continue;
      const triples=incident.map(f=>{const k=f.indexOf(i);return [model.vertices[f[(k+f.length-1)%f.length]],model.vertices[i],model.vertices[f[(k+1)%f.length]]];});
      if(triples.every(([a,b,c])=>Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-8)){
        for(const f of incident)f.splice(f.indexOf(i),1);changed=true;
      }
    }
  }
  const used=new Set(model.faces.flat()),indices=new Map();model.vertices=model.vertices.filter((_,i)=>{if(i<source.length||used.has(i)){indices.set(i,indices.size);return true;}return false;});
  model.faces=model.faces.map(f=>f.map(i=>indices.get(i)));
}

const profiles = {};
for (const model of JSON.parse(run.stdout)) {
  const { rings } = cases.find(c => c.id === model.id), source = rings.flat();
  const offset = [0, 0.0000013, 0.0000027, 0.0000041].find(value => roofSignatureMargin(rings.map(r => r.map(([x,y]) => [x+value,y+value]))) > ROOF_SIGNATURE_ROUNDOFF);
  if(offset===undefined)throw Error('No robust signature grid phase for '+model.id);
  normalizeCoplanar(model,source);
  if (source.some((p, i) => p[0] !== model.vertices[i][0] || p[1] !== model.vertices[i][1] || model.vertices[i][2] !== 0)) throw Error('Authoring tool changed a source vertex.');
  const planes = model.faces.map(face => { const a = source[face[0]], b = source[face[1]], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy); return [-dy / length, dx / length, -1]; });
  const intersections = [];
  for (let i = source.length; i < model.vertices.length; i++) {
    const incident = model.faces.flatMap((face, j) => face.includes(i) ? [j] : []);
    let best = 0, triple;
    for (let a = 0; a < incident.length; a++) for (let b = a + 1; b < incident.length; b++) for (let c = b + 1; c < incident.length; c++) {
      const selected = [incident[a], incident[b], incident[c]], size = Math.abs(determinant(...selected.map(j => planes[j])));
      if (size > best) { best = size; triple = selected; }
    }
    if (!triple) throw Error(`No ridge intersection for ${model.id}/${i}`);
    intersections.push(triple);
  }
  const topology = { source: source.length, intersections, faces: model.faces };
  const evaluated = evaluateRoofSkeleton(rings, topology);
  profiles[model.id] = { signature: roofSourceSignature(rings.map(r=>r.map(([x,y])=>[x+offset,y+offset]))), offset, ...topology };
  console.log(`${model.id}: ${topology.faces.length} planes, ${evaluated.triangles.length} triangles, max time ${evaluated.maximumTime}`);
}
writeFileSync('src/campus-roof-profile.ts', `// Derived topology; source positions are read from the unchanged mapped footprints.\n// Reproduce with tools/data/build-campus-roofs.mjs. Tool: py_straight_skeleton 0.1.0 (BSD-3-Clause).\n// Wheel SHA256: ${wheelSha256}\n// Only face connectivity is retained; ridge positions and times are evaluated from source planes.\n// Runtime signatures alone use a 10 um grid; rendered/source coordinates stay exact.\nimport type { RoofTopology } from './roof-skeleton.ts';\nexport const CAMPUS_ROOF_SOURCE_SHA256 = '${digest(source)}';\nexport const CAMPUS_ROOF_PROFILES: Record<string, RoofTopology & { signature: string; offset: number }> = {\n${Object.entries(profiles).map(([id, profile]) => `  '${id}': ${JSON.stringify(profile)},`).join('\n')}\n};\n`);
