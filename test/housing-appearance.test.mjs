import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOUSING_APPEARANCE} from '../src/housing-appearance.ts';
import {HOUSING_REFERENCES} from '../tools/quality/housing-refs.mjs';

const campus = JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson', import.meta.url)));
const ids = new Set(campus.features.map(f => f.properties.id));

test('housing finishes are attached to specific extant footprints with individual exterior evidence', () => {
  const covered = new Set();
  for (const reference of HOUSING_REFERENCES) {
    assert.ok(reference.sources.some(s => s.kind === 'photo' && new URL(s.url).protocol === 'https:'));
    for (const id of reference.ids) {
      assert.ok(ids.has(id), id);
      assert.ok(!covered.has(id), id);
      covered.add(id);
    }
  }
  for (const [id, appearance] of Object.entries(HOUSING_APPEARANCE)) {
    assert.ok(covered.has(id), id);
    for (const color of [appearance.wall, appearance.roof].filter(Boolean)) assert.match(color, /^#[0-9a-f]{6}$/);
  }
  assert.equal(HOUSING_APPEARANCE['way/30775656'].roofShape, 'flat');
  assert.equal(HOUSING_APPEARANCE['way/232805661'].roof, '#84847b');
  assert.equal(HOUSING_APPEARANCE['way/232805739'].roofShape, 'hipped');
  assert.equal(HOUSING_APPEARANCE['way/160447376'].roofShape, undefined);
});
