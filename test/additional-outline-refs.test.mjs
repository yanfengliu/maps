import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {ADDITIONAL_OUTLINE_ASSESSMENTS as survey, ADDITIONAL_OUTLINE_REFERENCES as references} from '../tools/quality/additional-outline-refs.mjs';

const data = readFileSync(new URL('../public/data/stanford-buildings.geojson', import.meta.url));
const campus = new Set(JSON.parse(data).features.map(f => f.id));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('the independent outline check accounts for every original unnamed intake ID and overlapping neighbor', () => {
  assert.equal(sha256(data), survey.localSha256);
  const ids = survey.rows.map(row => row[0]);
  assert.equal(new Set(ids).size, 112);
  const expected = 'cb4c932f8420b20dc7588c863a5ffa1a3cb7ca653cbe6a967f497141693c5df3';
  assert.equal(sha256(ids.slice().sort().join('\n')), expected);
  assert.equal(survey.intakeIdSha256, expected);
  assert.equal(survey.externalCount, 1284);
  assert.equal(survey.externalSha256, '0919f04cf53ec4dd0238976dfaefafc9dbd540e045d1576d52a25dd3844413c4');
  for (const [id, status, external, neighbors] of survey.rows) {
    assert.ok(campus.has(id));
    assert.equal(status === 'no-overlap', external.length === 0);
    for (const [hits, known] of [[external, key => Object.hasOwn(survey.catalog, key)], [neighbors, key => key !== id && campus.has(key)]]) {
      let last = 1;
      for (const [key, local, other, iou] of hits) {
        assert.ok(known(key), key);
        for (const n of [local, other, iou]) assert.ok(Number.isFinite(n) && n >= 0 && n <= 1);
        assert.ok(iou <= last);
        assert.ok(iou <= Math.min(local, other));
        last = iou;
      }
    }
  }
});

test('only three visually inspected ORNL matches qualify as independent outline documents', () => {
  assert.equal(references.length, 3);
  const promoted = survey.rows.filter(row => row[1] === 'matched-outline').map(row => row[0]);
  assert.deepEqual(promoted, references.flatMap(ref => ref.ids));
  for (const ref of references) {
    const [, , [best, ...alternatives], neighbors] = survey.rows.find(row => row[0] === ref.ids[0]);
    assert.ok(best[1] >= 0.8 && best[2] >= 0.8 && best[3] >= 0.7);
    assert.ok([...alternatives, ...neighbors].every(hit => hit[1] < 0.20 && hit[3] < 0.35));
    assert.deepEqual(survey.catalog[best[0]].slice(1, 5), ['ORNL','10400100963EE500','2024-05-13','Manual']);
    assert.equal(ref.status, 'document-supported');
    assert.equal(ref.sources[0].date, '2024-05-13');
    assert.equal(new URL(ref.sources[0].url).searchParams.get('where'), 'BUILD_ID=' + best[0]);
    assert.ok(!ref.sources.some(s => s.kind === 'photo'));
  }
  const byId = new Map(survey.rows.map(row => [row[0], row]));
  assert.equal(byId.get('way/232715816')[1], 'uncertain-lineage');
  assert.equal(byId.get('way/1509660401')[1], 'inside-larger-outline');
  assert.equal(byId.get('way/1509660401')[2][0][1], 1);
  assert.equal(byId.get('way/657542640')[1], 'contains-smaller-outline');
  assert.equal(byId.get('way/232715822')[1], 'edge-only');
});
