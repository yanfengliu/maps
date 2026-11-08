// Offline authoring tool. No Python or skeleton library is bundled in the product.
// Download the pinned BSD-3 wheel into ignored artifacts first:
// python -m pip download --no-deps --dest artifacts/skeleton-tools py_straight_skeleton==0.1.0
// node tools/data/build-quad-roofs.mjs artifacts/skeleton-tools/py_straight_skeleton-0.1.0-py3-none-any.whl
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { prepareBuildingDetails, projectLocal } from '../../src/building-geometry.ts';
import { QUAD_WING_IDS } from '../../src/quad-architecture.ts';
import { evaluateRoofSkeleton, orientRoofRings, roofSourceSignature, roofSignatureMargin, ROOF_SIGNATURE_ROUNDOFF } from '../../src/roof-skeleton.ts';

const wheelSha256 = 'f9602b88d09147bf69551ec81e209281eca3e295a40b7d6e26ee0921b8c8d317';
const wheel = resolve(process.argv[2] ?? 'artifacts/skeleton-tools/py_straight_skeleton-0.1.0-py3-none-any.whl');
const digest = value => createHash('sha256').update(value).digest('hex');
if (digest(readFileSync(wheel)) !== wheelSha256) throw Error('Wrong skeleton authoring tool; download the pinned wheel.');
const source = readFileSync('public/data/stanford-buildings.geojson');
const prepared = prepareBuildingDetails(JSON.parse(source));
const cases = [];
for (const feature of prepared.features.filter(f => f.properties.id === 'relation/35820' || QUAD_WING_IDS.has(f.properties.id))) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const [index, polygon] of polygons.entries()) cases.push({ id: `${feature.properties.id}/${index}`, rings: orientRoofRings(polygon.map(ring => ring.slice(0, -1).map(projectLocal))) });
}
const run = spawnSync('python', ['tools/data/quad-roof-skeleton.py', wheel], { input: JSON.stringify(cases), encoding: 'utf8', windowsHide: true });
if (run.status !== 0) throw Error(run.stderr || 'Skeleton authoring failed.');
const determinant = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
const profiles = {};
for (const model of JSON.parse(run.stdout)) {
  const { rings } = cases.find(c => c.id === model.id), source = rings.flat();
  if (roofSignatureMargin(rings) <= ROOF_SIGNATURE_ROUNDOFF) throw Error(`Projection signature is too close to a grid boundary for ${model.id}; review the guard precision before regenerating.`);
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
  profiles[model.id] = { signature: roofSourceSignature(rings), ...topology };
  console.log(`${model.id}: ${topology.faces.length} planes, ${evaluated.triangles.length} triangles, max time ${evaluated.maximumTime}`);
}
writeFileSync('src/quad-roof-profile.ts', `// Derived topology; source positions are read from the unchanged mapped footprints.\n// Reproduce with tools/data/build-quad-roofs.mjs. Tool: py_straight_skeleton 0.1.0 (BSD-3-Clause).\n// Wheel SHA256: ${wheelSha256}\n// Only face connectivity is retained; ridge positions and times are evaluated from source planes.\n// Runtime signatures alone use a 10 um grid; rendered/source coordinates stay exact.\nimport type { RoofTopology } from './roof-skeleton.ts';\nexport const QUAD_ROOF_SOURCE_SHA256 = '${digest(source)}';\nexport const QUAD_ROOF_PROFILES: Record<string, RoofTopology & { signature: string }> = {\n${Object.entries(profiles).map(([id, profile]) => `  '${id}': ${JSON.stringify(profile)},`).join('\n')}\n};\n`);
