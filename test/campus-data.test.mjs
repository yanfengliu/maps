import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { convertOsm, heightProperties, isSimpleRing, parseMetres, pointInRing, ringInsideRing, segmentInsideRing } from '../tools/data/fetch-stanford.mjs';

const file = name => new URL(`../public/data/${name}`, import.meta.url);
const bytes = await readFile(file('stanford-buildings.geojson'));
const campusBytes = await readFile(file('stanford-campus.geojson'));
const buildings = JSON.parse(bytes);
const campus = JSON.parse(campusBytes);
const provenance = JSON.parse(await readFile(file('stanford-provenance.json')));
const digest = value => createHash('sha256').update(value).digest('hex');
const polygons = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

test('reviewed actual footprint bytes, named landmarks and courtyard holes remain pinned', () => {
  assert.equal(digest(bytes), 'a27c564f8c7472bfddafd28e3328cffdf12acadb2f9854da1f1e429fd1d41d2f');
  assert.equal(digest(campusBytes), 'e8890575c26f83f0b6eec7beb710520b74fb400d7e8509b0814d64ead67ed9dc');
  assert.equal(buildings.type, 'FeatureCollection');
  assert.equal(buildings.features.length, 648);
  assert.equal(new Set(buildings.features.map(feature => feature.id)).size, 648);
  const named = name => buildings.features.find(feature => feature.properties.name === name);
  assert.equal(named('Main Quad').id, 'relation/35820');
  assert.equal(named('Main Quad').geometry.coordinates.length, 8);
  assert.equal(named('Hoover Tower').properties.height, 87);
  assert.equal(named('Hoover Tower').properties.heightSource, 'osm-height');
  assert.equal(named('Hoover Tower').id, 'way/1346548889');
  assert.equal(named('Hoover Tower').properties['osm:outline'], 'way/232805688');
  assert.equal(named('Memorial Church').id, 'way/836474103');
  assert.equal(named('Memorial Church').properties.heightSource, 'estimated');
  assert.ok(named('Cantor Arts Center'));
  assert.ok(named('Bing Concert Hall'));
});

test('all rings are finite, nondegenerate, closed, simple and in the real Stanford extent', () => {
  const area = ring => ring.slice(1).reduce((sum, p, i) => sum + (ring[i][0] - ring[0][0]) * (p[1] - ring[0][1]) - (p[0] - ring[0][0]) * (ring[i][1] - ring[0][1]), 0);
  for (const feature of [...buildings.features, ...campus.features]) {
    assert.ok(['Polygon', 'MultiPolygon'].includes(feature.geometry.type), feature.id);
    for (const polygon of polygons(feature.geometry)) for (let r = 0; r < polygon.length; r++) {
      const ring = polygon[r];
      assert.ok(ring.length >= 4, feature.id);
      assert.deepEqual(ring[0], ring.at(-1), feature.id);
      assert.ok(isSimpleRing(ring), feature.id);
      assert.ok(r === 0 ? area(ring) > 0 : area(ring) < 0, `${feature.id} RFC 7946 winding`);
      for (const coordinate of ring) {
        assert.equal(coordinate.length, 2);
        assert.ok(coordinate.every(Number.isFinite));
        assert.ok(coordinate[0] >= -122.19 && coordinate[0] <= -122.15, feature.id);
        assert.ok(coordinate[1] >= 37.415 && coordinate[1] <= 37.445, feature.id);
      }
    }
  }
});

// This independent predicate does not call the generator's containment helpers.
function inside(point, ring) {
  let intersections = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    const [a, b] = [ring[i], ring[i + 1]];
    if ((a[1] > point[1]) === (b[1] > point[1])) continue;
    const x = a[0] + (point[1] - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
    if (x > point[0]) intersections++;
  }
  return intersections % 2 === 1;
}
test('campus selection excludes surrounding Palo Alto and whole source edges stay inside its perimeter', () => {
  const boundary = campus.features[0];
  assert.equal(boundary.id, 'way/29268613');
  assert.equal(boundary.properties.osmVersion, 52);
  const ring = boundary.geometry.coordinates[0];
  assert.ok(inside([-122.1701, 37.4275], ring));
  assert.equal(inside([-122.1601, 37.4433], ring), false); // Palo Alto residential side, inside fetch bbox.
  for (const feature of buildings.features) for (const polygon of polygons(feature.geometry)) {
    // Independently sample every edge, not only each footprint's centre/vertices.
    for (let i = 0; i + 1 < polygon[0].length; i++) for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const [a, b] = [polygon[0][i], polygon[0][i + 1]];
      assert.ok(inside([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ring), feature.id);
    }
  }
});

test('concave boundary rejects an edge even when both endpoints and its midpoint are inside', () => {
  const notched = [[0, 0], [5, 0], [5, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0]];
  const a = [0.5, 2], b = [4.5, 2];
  assert.ok(pointInRing(a, notched));
  assert.ok(pointInRing(b, notched));
  assert.ok(pointInRing([2.5, 2], notched));
  assert.equal(segmentInsideRing(a, b, notched), false);
  assert.equal(ringInsideRing([a, b, [4.5, 2.5], a], notched), false);
  assert.equal(segmentInsideRing([0, 0], [5, 0], notched), true); // Shared boundary edge.
  assert.equal(segmentInsideRing([0.2, 0.2], [4.8, 0.8], notched), true);
  assert.equal(isSimpleRing([[0, 0], [2, 2], [0, 2], [2, 0], [0, 0]]), false);
});

test('recorded heights, level estimates and missing-height defaults are explicitly distinguishable', () => {
  const counts = { 'osm-height': 0, 'osm-levels': 0, estimated: 0 };
  for (const { id, properties: p } of buildings.features) {
    assert.equal(typeof p.name === 'string' || p.name === null, true, id);
    assert.equal(p.id, id);
    assert.ok(Number.isFinite(p.height) && p.height > p.base && p.base >= 0, id);
    assert.match(p.color, /^#[0-9a-f]{6}$/i);
    assert.match(p.roofColor, /^#[0-9a-f]{6}$/i);
    assert.ok(p.heightSource in counts, id);
    counts[p.heightSource]++;
    if (p.heightSource === 'osm-height') assert.equal(p.height, Math.round(parseMetres(p['osm:height']) * 100) / 100, id);
    if (p.heightSource === 'osm-levels') assert.ok(Number(p['osm:building:levels']) > 0, id);
    if (p.heightSource === 'estimated') assert.equal(parseMetres(p['osm:height']), null, id);
  }
  assert.deepEqual(counts, { 'osm-height': 81, 'osm-levels': 80, estimated: 487 });
  assert.deepEqual(heightProperties({ height: '100 ft', 'building:levels': '7' }), { height: 30.48, base: 0, heightSource: 'osm-height' });
  assert.deepEqual(heightProperties({ 'building:levels': '3', 'roof:levels': '1', min_height: '2 m' }), { height: 12, base: 2, heightSource: 'osm-levels' });
  assert.deepEqual(heightProperties({ building: 'church' }), { height: 24, base: 0, heightSource: 'estimated' });
  assert.equal(parseMetres('unknown'), null);
  assert.equal(parseMetres('7;9'), null);
});

const synthetic = `<?xml version="1.0"?><osm version="0.6">
<node id="1" version="1" lat="0" lon="0"/><node id="2" version="1" lat="0" lon="5"/><node id="3" version="1" lat="5" lon="5"/><node id="4" version="1" lat="5" lon="0"/>
<node id="11" version="1" lat="1" lon="1"/><node id="12" version="1" lat="1" lon="2"/><node id="13" version="1" lat="2" lon="2"/><node id="14" version="1" lat="2" lon="1"/>
<node id="21" version="1" lat="7" lon="7"/><node id="22" version="1" lat="7" lon="8"/><node id="23" version="1" lat="8" lon="8"/><node id="24" version="1" lat="8" lon="7"/>
<way id="29268613" version="52"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="amenity" v="university"/></way>
<way id="100" version="1"><nd ref="11"/><nd ref="12"/><nd ref="13"/><nd ref="14"/><nd ref="11"/><tag k="building" v="university"/><tag k="height" v="15"/><tag k="name" v="Example &amp; Hall"/></way>
<way id="101" version="1"><nd ref="21"/><nd ref="22"/><nd ref="23"/><nd ref="24"/><nd ref="21"/><tag k="building" v="yes"/></way>
<way id="102" version="1"><nd ref="11"/><nd ref="12"/><nd ref="13"/><nd ref="14"/><nd ref="11"/><tag k="building" v="yes"/><tag k="height" v="0"/></way>
</osm>`;
test('offline source processing is deterministic and preserves source coordinates without inventing footprints', () => {
  const output = convertOsm([synthetic]);
  assert.deepEqual(output, convertOsm([synthetic, synthetic]));
  assert.equal(output.buildings.features.length, 1);
  const feature = output.buildings.features[0];
  assert.equal(feature.id, 'way/100');
  assert.equal(feature.properties.name, 'Example & Hall');
  assert.equal(feature.properties.height, 15);
  assert.deepEqual(feature.geometry.coordinates, [[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]);
  assert.equal(output.excluded.length, 0);
});

test('provenance identifies actual retrieval times, source hashes, ODbL and bounded retained outputs', () => {
  assert.equal(provenance.fetchedAt, '2026-10-20T06:13:20.820Z');
  assert.equal(provenance.license, 'ODbL 1.0');
  assert.equal(provenance.attribution, '© OpenStreetMap contributors');
  assert.equal(provenance.featureCount, buildings.features.length);
  assert.deepEqual(provenance.heightSources, { 'osm-height': 81, 'osm-levels': 80, estimated: 487 });
  assert.equal(provenance.sources.length, 4);
  assert.ok(provenance.sources.every(source => /^https:\/\/www\.openstreetmap\.org\/api\/0.6\/map\?bbox=/.test(source.url) && /^[a-f0-9]{64}$/.test(source.sha256) && Date.parse(source.retrievedAt) <= Date.parse(provenance.fetchedAt)));
  assert.equal(provenance.outputs['stanford-buildings.geojson'].sha256, digest(bytes));
  assert.equal(provenance.outputs['stanford-campus.geojson'].sha256, digest(campusBytes));
  assert.equal(provenance.outputs['stanford-buildings.geojson'].bytes, bytes.length);
  assert.ok(bytes.length <= 512 * 1024 && campusBytes.length <= 512 * 1024);
  assert.ok(provenance.largeBlobReason.includes('real Stanford footprint vertices'));
  assert.deepEqual(provenance.excludedInvalidSourceFeatures, []);
  assert.equal(provenance.suppressed3DOutlines.length, 1);
  assert.equal(provenance.suppressed3DOutlines[0].id, 'way/232805688');
  assert.equal(provenance.suppressed3DOutlines[0].renderedParts.length, 8);
});
