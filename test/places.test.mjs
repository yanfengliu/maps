import test from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, searchPlaces, geometryCenter, buildingPlaces, normalizeBearing } from '../src/places.ts';

test('local destination search matches accents, multiple words and no-result queries', () => {
  assert.equal(searchPlaces(' san jose ', PLACES)[0].id, 'san-jose');
  assert.equal(searchPlaces('bay oakland', PLACES)[0].id, 'oakland');
  assert.equal(searchPlaces('university', PLACES)[0].id, 'stanford');
  assert.deepEqual(searchPlaces('New York', PLACES), []);
  assert.deepEqual(searchPlaces(' ', PLACES), []);
});

test('footprint search includes named multipolygons and excludes unnamed or invalid footprints', () => {
  const geometry = { type: 'MultiPolygon', coordinates: [[[[-122.2,37.4],[-122.1,37.4],[-122.1,37.5],[-122.2,37.4]]]] };
  assert.deepEqual(geometryCenter(geometry), [-122.15,37.45]);
  const results = buildingPlaces([
    { geometry, properties: { id: '123', name: 'Hoover Tower' } },
    { geometry, properties: { id: '124', name: null } },
    { geometry: { type: 'Polygon', coordinates: [] }, properties: { id: '125', name: 'Invalid' } },
  ]);
  assert.equal(results.length, 1);
  assert.equal(results[0].buildingId, '123');
  assert.equal(searchPlaces('hoover', results)[0].name, 'Hoover Tower');
});

test('compass bearings wrap without changing the represented direction', () => {
  for (const [input, expected] of [[0,0],[360,0],[-390,-30],[725,5],[-181,179]]) {
    assert.equal(normalizeBearing(input), expected);
  }
});
