import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url)));
const {rows} = read('../tools/quality/facility-refs-footprints.json');
const {features} = read('../public/data/stanford-buildings.geojson');

test('public campus plan matches preserve every source ID and both overlap directions', () => {
  assert.deepEqual(rows.map(row => row.id), features.map(feature => feature.properties.id));
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  for (const row of rows) {
    const winner = row.candidates[0];
    for (const candidate of row.candidates) {
      assert.ok(candidate.code ? /^[0-9]{2}-[A-Z0-9-]+$/.test(candidate.code) : /^ID_\d+$/.test(candidate.anonymousPlacemark));
      const {sourceCoverage:a,facilityCoverage:b,iou} = candidate;
      assert.ok(a>0 && a<=1 && b>0 && b<=1 && iou>=0 && iou<=1);
      assert.ok(Math.abs(iou - a*b/(a+b-a*b)) < .002);
    }
    if (row.status === 'unmatched') continue;
    assert.ok(winner);
    assert.equal(row.status.startsWith('anonymous-'), winner.code === null);
    if (row.status.endsWith('footprint')) {
      assert.ok(winner.sourceCoverage >= .72 && winner.facilityCoverage >= .65 && winner.iou >= .57);
      assert.ok((row.candidates[1]?.sourceCoverage || 0) <= .15);
    }
  }
  const ticketOffice = rows.find(row => row.id === 'way/232715585');
  assert.equal(ticketOffice.status, 'footprint');
  assert.equal(ticketOffice.candidates[0].code, '09-535');
  assert.ok(rows.some(row=>row.status === 'anonymous-footprint'));
  assert.ok(rows.some(row=>row.status === 'within-facility' && row.part));
});

test('examined visitor photos have individual sources and exclude Stanford’s own placeholder pixels', () => {
  const {facilities,placeholderSha256} = read('../tools/quality/facility-refs-photos.json');
  const codes = new Set();
  for (const {code,status,images} of facilities) {
    assert.ok(!codes.has(code)); codes.add(code);
    assert.equal(status === 'exterior-photo', images.length>0);
    for (const {page,image,sha256,width,height} of images) {
      const source = new URL(page), photo = new URL(image);
      assert.ok(['campus-map.stanford.edu','maps.stanford.edu'].includes(source.hostname));
      assert.ok([...source.searchParams.values()].includes(code));
      assert.equal(photo.hostname,'campus-map.stanford.edu');
      assert.ok(photo.pathname.includes('/images_repo/bldg/'+code+'/'));
      assert.match(sha256,/^[a-f0-9]{64}$/);
      assert.notEqual(sha256,placeholderSha256);
      assert.ok(width>0 && height>0);
    }
  }
  assert.equal(facilities.find(f=>f.code==='09-535').status,'placeholder');
  assert.equal(facilities.find(f=>f.code==='14-411').status,'exterior-photo');
});
