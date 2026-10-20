import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { createStyle } from '../src/style.ts';

test('custom cartography passes MapLibre’s actual runtime style validator', () => {
  assert.deepEqual(validateStyleMin(createStyle()).map(error => error.message), []);
});

test('style validator rejects the nested-zoom road regression control', () => {
  const control = createStyle();
  const road = control.layers.find(layer => layer.id === 'main-road');
  road.paint['line-width'] = ['*', ['interpolate', ['linear'], ['zoom'], 6, 1, 18, 8], 1.2];
  assert.ok(validateStyleMin(control).some(error => /zoom.*top-level/.test(error.message)));
});

test('regional cartography has water and readable places but never extrudes regional buildings', () => {
  const style = createStyle();
  assert.equal(style.sources.openmaptiles.url, 'https://tiles.openfreemap.org/planet');
  assert.ok(style.layers.some(layer => layer['source-layer'] === 'water' && layer.type === 'fill'));
  assert.ok(style.layers.some(layer => layer['source-layer'] === 'place' && layer.type === 'symbol'));
  assert.deepEqual(style.layers.filter(layer => layer.type === 'fill-extrusion'), []);
});
