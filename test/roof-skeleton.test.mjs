import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import earcut from 'earcut';
import { prepareBuildingDetails, projectLocal } from '../src/building-geometry.ts';
import { evaluateRoofSkeleton, orientRoofRings, roofSourceSignature, roofSignatureMargin, ROOF_SIGNATURE_GRID, ROOF_SIGNATURE_ROUNDOFF } from '../src/roof-skeleton.ts';
import { QUAD_ROOF_PROFILES, QUAD_ROOF_SOURCE_SHA256 } from '../src/quad-roof-profile.ts';
import { quadRoof, QUAD_ROOF_MAXIMUM_TIME } from '../src/quad-roof.ts';

const sourceBytes = readFileSync(new URL('../public/data/stanford-buildings.geojson', import.meta.url));
const prepared = prepareBuildingDetails(JSON.parse(sourceBytes));
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = ring => Math.abs(ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - p[1] * q[0]; }, 0) / 2);
const intersectionArea = (subject, clip) => {
  const sign = Math.sign(cross(...clip)); let polygon = subject;
  for (let i = 0; i < 3 && polygon.length; i++) {
    const a = clip[i], b = clip[(i + 1) % 3], next = [];
    for (const [j, u] of polygon.entries()) {
      const v = polygon[(j + 1) % polygon.length], du = cross(a, b, u) * sign, dv = cross(a, b, v) * sign;
      if (du >= 0) next.push(u);
      if ((du > 0) !== (dv > 0)) { const t = du / (du - dv); next.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]); }
    }
    polygon = next;
  }
  return polygon.length < 3 ? 0 : area(polygon);
};
function sourceTriangles(rings) {
  const points = rings.flat(), holes = []; let offset = rings[0].length;
  for (const ring of rings.slice(1)) { holes.push(offset); offset += ring.length; }
  const indices = earcut(points.flat(), holes), result = [];
  for (let i = 0; i < indices.length; i += 3) result.push(indices.slice(i, i + 3).map(j => points[j]));
  return result;
}

// These symmetric roofs have analytically known ridges. They exercise an L
// valley and an entire courtyard, independently of the mapped Quad topology.
const fixtures = [
  { name: '100 by 10 bar', rings: [[[0, 0], [100, 0], [100, 10], [0, 10]]], topology: { source: 4, intersections: [[0, 2, 3], [0, 1, 2]], faces: [[0, 1, 5, 4], [1, 2, 5], [2, 3, 4, 5], [3, 0, 4]] }, ridges: [[5, 5, 5], [95, 5, 5]] },
  { name: 'L wing', rings: [[[0, 0], [60, 0], [60, 10], [10, 10], [10, 50], [0, 50]]], topology: { source: 6, intersections: [[0, 1, 2], [0, 2, 3], [3, 4, 5]], faces: [[0, 1, 6, 7], [1, 2, 6], [2, 3, 7, 6], [3, 4, 8, 7], [4, 5, 8], [5, 0, 7, 8]] }, ridges: [[55, 5, 5], [5, 5, 5], [5, 45, 5]] },
  { name: 'courtyard ring', rings: [[[0, 0], [100, 0], [100, 80], [0, 80]], [[10, 10], [10, 70], [90, 70], [90, 10]]], topology: { source: 8, intersections: [[0, 3, 4], [2, 3, 4], [1, 2, 5], [0, 1, 6]], faces: [[0, 1, 11, 8], [1, 2, 10, 11], [2, 3, 9, 10], [3, 0, 8, 9], [4, 5, 9, 8], [5, 6, 10, 9], [6, 7, 11, 10], [7, 4, 8, 11]] }, ridges: [[5, 5, 5], [5, 75, 5], [95, 75, 5], [95, 5, 5]] },
];

function verify(rings, topology) {
  const model = evaluateRoofSkeleton(rings, topology), source = rings.flat(), triangles = model.triangles.map(triangle => triangle.map(i => model.vertices[i]));
  assert.deepEqual(model.vertices.slice(0, source.length), source.map(p => [...p, 0]), 'every boundary coordinate is exact and at the eave');
  for (const vertex of model.vertices) assert.ok(vertex.every(Number.isFinite) && vertex[2] >= 0);
  const boundary = new Set(); let offset = 0;
  for (const ring of rings) { for (let i = 0; i < ring.length; i++) boundary.add([offset + i, offset + (i + 1) % ring.length].sort((a, b) => a - b).join(',')); offset += ring.length; }
  const used = new Map();
  for (const face of topology.faces) {
    const a = model.vertices[face[0]], b = model.vertices[face[1]], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const i of face) assert.ok(Math.abs(cross(a, b, model.vertices[i]) / length - model.vertices[i][2]) < 1e-7, 'all vertices lie on their one source-edge plane; every triangulation therefore has the same surface');
    for (let i = 0; i < face.length; i++) { const key = [face[i], face[(i + 1) % face.length]].sort((a, b) => a - b).join(','); used.set(key, (used.get(key) ?? 0) + 1); }
  }
  for (const [edge, count] of used) assert.equal(count, boundary.has(edge) ? 1 : 2, 'ridges and valleys have one shared node pair and no cracks');
  assert.deepEqual(new Set([...used].filter(([, count]) => count === 1).map(([edge]) => edge)), boundary, 'all and only source boundary edges are exposed');
  const footprint = sourceTriangles(rings), total = triangles.reduce((sum, triangle) => sum + area(triangle), 0);
  assert.ok(Math.abs(total - (area(rings[0]) - rings.slice(1).reduce((sum, ring) => sum + area(ring), 0))) < 1e-7);
  for (const triangle of triangles) {
    const covered = footprint.reduce((sum, part) => sum + intersectionArea(triangle, part), 0);
    assert.ok(Math.abs(covered - area(triangle)) < 1e-7, 'each full triangle is inside the footprint, outside every courtyard');
  }
  for (let i = 0; i < triangles.length; i++) for (let j = i + 1; j < triangles.length; j++) assert.ok(intersectionArea(triangles[i], triangles[j]) < 1e-7, 'roof faces cannot overlap');
  for (const [a, b, c] of triangles) {
    const determinant = cross(a, b, c);
    if (Math.abs(determinant) < 1e-8) continue;
    const dx = ((b[2] - a[2]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[2] - a[2])) / determinant;
    const dy = ((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / determinant;
    assert.ok(Math.abs(Math.hypot(dx, dy) - 1) < 1e-7, 'every face has one consistent pitch');
  }
  return model;
}

for (const fixture of fixtures) test(`${fixture.name} retains continuous analytic ridges under translation and rotation`, () => {
  for (const angle of [0, 0.271, 1.581]) {
    const transform = ([x, y, z]) => [x * Math.cos(angle) - y * Math.sin(angle) + 317.25, x * Math.sin(angle) + y * Math.cos(angle) - 482.5, z];
    const rings = fixture.rings.map(ring => ring.map(p => transform(p).slice(0, 2))), model = verify(rings, fixture.topology);
    for (const [i, expected] of fixture.ridges.entries()) assert.ok(Math.hypot(...model.vertices[fixture.topology.source + i].map((value, axis) => value - transform(expected)[axis])) < 1e-7);
  }
});

test('held-out East Wing source validates the same evaluator without changing production geometry', () => {
  // Selected after the evaluator and Quad profiles were complete. The pinned
  // offline tool produced this topology without an evaluator change or repair.
  const topology = {"source":28,"intersections":[[6,7,8],[2,3,4],[0,25,27],[25,26,27],[1,2,4],[0,1,5],[1,4,5],[22,24,25],[22,23,24],[9,11,12],[9,10,11],[15,16,17],[0,21,22],[0,22,25],[9,12,13],[8,9,13],[5,6,19],[5,19,20],[14,17,18],[14,15,17],[5,20,21],[0,5,21],[6,8,13],[6,13,14],[6,14,18],[6,18,19]],"faces":[[0,1,33,49,40,41,30],[1,2,32,34,33],[2,3,29,32],[3,4,29],[4,5,34,32,29],[5,6,44,45,48,49,33,34],[6,7,28,50,51,52,53,44],[7,8,28],[8,9,43,50,28],[9,10,38,37,42,43],[10,11,38],[11,12,37,38],[12,13,42,37],[13,14,51,50,43,42],[14,15,47,46,52,51],[15,16,39,47],[16,17,39],[17,18,46,47,39],[18,19,53,52,46],[19,20,45,44,53],[20,21,48,45],[21,22,40,49,48],[22,23,36,35,41,40],[23,24,36],[24,25,35,36],[25,26,31,30,41,35],[26,27,31],[27,0,30,31]]};
  const feature = JSON.parse(sourceBytes).features.find(f => f.properties.id === 'way/232805660');
  assert.equal(feature.properties.name, 'East Wing');
  assert.equal(QUAD_ROOF_PROFILES['way/232805660/0'], undefined);
  const rings = orientRoofRings(feature.geometry.coordinates.map(ring => ring.slice(0, -1).map(projectLocal))), baseline = verify(rings, topology);
  for (const angle of [0.271, 1.581]) {
    const transform = ([x, y, z]) => [x * Math.cos(angle) - y * Math.sin(angle) + 317.25, x * Math.sin(angle) + y * Math.cos(angle) - 482.5, z];
    const result = verify(rings.map(ring => ring.map(p => transform(p).slice(0, 2))), topology);
    for (const [i, point] of baseline.vertices.entries()) assert.ok(Math.hypot(...result.vertices[i].map((value, axis) => value - transform(point)[axis])) < 1e-7);
  }
});

test('runtime source guard tolerates projection roundoff without rounding geometry or accepting a 1 mm source change', () => {
  assert.equal(ROOF_SIGNATURE_GRID, 0.00001, 'guard bins are only 10 micrometres wide');
  // Live Chromium/Node comparison of the unchanged source found this maximum
  // delta in Y only. Keep the captured first differing values as regressions.
  const observed = {
    'relation/35820/0': [-127.34852447463557, -127.34852447286896],
    'way/836474099/0': [59.06633113417996, 59.06633113594657],
    'way/836474102/0': [-77.42234621554208, -77.42234621730869],
    'way/836474106/0': [66.36894468500749, 66.3689446867741],
  };
  for (const [id, topology] of Object.entries(QUAD_ROOF_PROFILES)) {
    const parts = id.split('/'), component = Number(parts.pop()), sourceId = parts.join('/');
    const feature = prepared.features.find(f => f.properties.id === sourceId), polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const rings = orientRoofRings(polygons[component].map(ring => ring.slice(0, -1).map(projectLocal))), before = structuredClone(rings);
    assert.ok(roofSignatureMargin(rings) > ROOF_SIGNATURE_ROUNDOFF, 'every pinned coordinate has a verified margin from a rounding boundary');
    if (observed[id]) {
      const [node, browser] = observed[id], captured = structuredClone(rings), point = captured.flat().find(p => p[1] === node);
      assert.ok(point, 'the observed Node coordinate belongs to the exact pinned source');
      assert.ok(Math.abs(browser - node) < 2e-9 && browser !== node);
      point[1] = browser;
      assert.equal(roofSourceSignature(captured), topology.signature);
      assert.doesNotThrow(() => quadRoof(sourceId, component, captured));
    }
    for (const amplitude of [0.5e-9, 2e-9, ROOF_SIGNATURE_ROUNDOFF]) for (const sign of [-1, 1]) {
      const noisy = rings.map(ring => ring.map(([x, y], i) => [x + sign * amplitude, y + sign * amplitude * (i % 2 ? -1 : 1)]));
      assert.notDeepEqual(noisy, rings, 'the old exact-double signature would reject this harmless variation');
      assert.equal(roofSourceSignature(noisy), topology.signature);
      assert.doesNotThrow(() => quadRoof(sourceId, component, noisy));
      const evaluated = evaluateRoofSkeleton(noisy, topology);
      assert.deepEqual(evaluated.vertices.slice(0, topology.source), noisy.flat().map(p => [...p, 0]), 'evaluation retains every input double, not guard-grid coordinates');
      verify(noisy, topology);
    }
    for (const axis of [0, 1]) for (const sign of [-1, 1]) {
      const changed = structuredClone(rings); changed[0][0][axis] += sign * 0.001;
      assert.notEqual(roofSourceSignature(changed), topology.signature);
      assert.throws(() => quadRoof(sourceId, component, changed), /footprint changed/);
    }
    assert.deepEqual(rings, before, 'signature generation never mutates source geometry');
  }
});

test('pinned Main Quad, every courtyard and all real concave wings have planar, watertight roofs with exact coverage', () => {
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), QUAD_ROOF_SOURCE_SHA256, 'source changes require regenerated and reviewed roof topology');
  let components = 0, concaveWing = false;
  for (const [id, topology] of Object.entries(QUAD_ROOF_PROFILES)) {
    const parts = id.split('/'), component = Number(parts.pop()), sourceId = parts.join('/');
    const feature = prepared.features.find(f => f.properties.id === sourceId), polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const rings = orientRoofRings(polygons[component].map(ring => ring.slice(0, -1).map(projectLocal)));
    assert.equal(roofSourceSignature(rings), topology.signature);
    const model = verify(rings, topology);
    if (sourceId === 'relation/35820') { components++; assert.ok(model.maximumTime <= QUAD_ROOF_MAXIMUM_TIME + 1e-10); }
    if (sourceId === 'way/836474105') { assert.equal(rings[0].length, 31); assert.ok(rings[0].some((p, i, r) => cross(p, r[(i + 1) % r.length], r[(i + 2) % r.length]) < -0.01)); concaveWing = true; }
    if (id === 'relation/35820/0' || sourceId === 'way/836474105') for (const angle of [0.271, 1.581]) {
      const transform = ([x, y, z]) => [x * Math.cos(angle) - y * Math.sin(angle) + 317.25, x * Math.sin(angle) + y * Math.cos(angle) - 482.5, z];
      const transformed = verify(rings.map(ring => ring.map(p => transform(p).slice(0, 2))), topology);
      for (const [i, point] of model.vertices.entries()) assert.ok(Math.hypot(...transformed.vertices[i].map((value, axis) => value - transform(point)[axis])) < 1e-7, 'real concave roofs are invariant under rigid transforms');
    }
    const changed = structuredClone(rings); changed[0][0][0] += 0.001;
    assert.throws(() => quadRoof(sourceId, component, changed), /footprint changed/);
  }
  assert.equal(components, 3); assert.ok(concaveWing);
});
