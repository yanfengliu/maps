import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MAP_ZOOM,PLACES,SCULPTURE_PLACES, searchPlaces, geometryCenter, buildingPlaces, normalizeBearing } from '../src/places.ts';
import {readFileSync} from 'node:fs';

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

test('both reviewed artworks are searchable and use the mapped sculpture coordinates at an inspectable native zoom',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/data/stanford-sculptures.geojson',import.meta.url)));
  assert.equal(SCULPTURE_PLACES.length,2);
  for(const place of SCULPTURE_PLACES){
    const feature=data.features.find(f=>f.properties.model===place.sculptureId);assert.ok(feature);
    assert.deepEqual(place.center,feature.geometry.coordinates);assert.equal(place.name,feature.properties.name);
    assert.equal(place.artist,feature.properties.artist);assert.equal(place.material.toLowerCase(),feature.properties.material);
    assert.ok(place.zoom>=21&&place.zoom<=21.5);assert.equal(place.campus,true);
    assert.equal(searchPlaces(place.name,[...PLACES,...SCULPTURE_PLACES])[0].id,place.id);
    assert.match(place.sourceUrl,/^https:\/\/news\.stanford\.edu\//);
  }
  assert.equal(searchPlaces('rodin sculpture',SCULPTURE_PLACES)[0].sculptureId,'burghers-of-calais');
});

test('every place flight lands within the map native maximum zoom, the artwork flights included',()=>{
  // main.ts builds the map with maxZoom MAX_MAP_ZOOM; a flight past it would stop short of its real-scale view.
  const footprints=buildingPlaces(JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))).features);
  assert.ok(footprints.length>0);
  for(const place of [...PLACES,...SCULPTURE_PLACES,...footprints])assert.ok(place.zoom<=MAX_MAP_ZOOM,`${place.name} flies to zoom ${place.zoom}, past ${MAX_MAP_ZOOM}`);
  assert.ok(SCULPTURE_PLACES.every(place=>place.zoom>19.5),'artwork flights need the raised limit; the old 19.5 would clip them');
  assert.match(readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),/maxZoom:\s*MAX_MAP_ZOOM\b/,'the map must take its maximum zoom from MAX_MAP_ZOOM');
});
