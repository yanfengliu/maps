import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ROOF_PHOTO_CHECKS,ROOF_PHOTO_REFERENCES} from '../tools/quality/roof-photo-register.mjs';

test('two-year photo comparison covers the exact outstanding IDs at 5a1c696 and keeps inconclusive views explicit',()=>{
  const ids = [...ROOF_PHOTO_CHECKS.keys()].sort();
  assert.equal(ids.length,521);
  assert.equal(createHash('sha256').update(ids.join('\n')+'\n').digest('hex'),'9b77803ee3481e979faa42afc91f282f930241ec8411d52f8ecf9b9087b3d149');
  const promoted = new Set(ROOF_PHOTO_REFERENCES.map(r=>r.ids[0]));
  for (const [id,{observation,sources}] of ROOF_PHOTO_CHECKS) {
    const [first,second] = sources.map(s=>new URL(s.url));
    assert.notEqual(first.hostname,second.hostname);
    assert.equal(first.searchParams.get('bbox'),second.searchParams.get('bbox'));
    const [left,bottom,right,top] = first.searchParams.get('bbox').split(',').map(Number);
    assert.ok(right>left && top>bottom && Math.abs((right-left)-(top-bottom))<0.025);
    assert.equal(promoted.has(id),!['indistinct','changed-site','underlying-part'].includes(observation));
  }
});
