import test from 'node:test';
import assert from 'node:assert/strict';
import { createStyle } from '../src/style.ts';

test('regional cartography has water and readable places but never extrudes regional buildings', () => {
  const style = createStyle();
  assert.equal(style.sources.openmaptiles.url, 'https://tiles.openfreemap.org/planet');
  assert.ok(style.layers.some(layer => layer['source-layer'] === 'water' && layer.type === 'fill'));
  assert.ok(style.layers.some(layer => layer['source-layer'] === 'place' && layer.type === 'symbol'));
  assert.deepEqual(style.layers.filter(layer => layer.type === 'fill-extrusion'), []);
});
