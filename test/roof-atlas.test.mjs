import test from 'node:test';
import assert from 'node:assert/strict';
import {tileUrl,topSurfaces} from '../tools/quality/roof-atlas.mjs';
import {FACADE_PHOTOS} from '../tools/quality/stanford-facade-photos.mjs';
import {VERTEX_FLOATS} from '../src/building-geometry.ts';

test('atlas tile requests share boundaries in the projected grid',()=>{
  const bbox=(x,y)=>new URL(tileUrl(x,y)).searchParams.get('bbox').split(',').map(Number);
  const here=bbox(-1,1),east=bbox(0,1),north=bbox(-1,2);
  assert.equal(here[2],east[0]);assert.equal(here[3],north[1]);
  assert.ok(here[0]<here[2] && here[1]<here[3]);
});

test('the overhead mesh includes surfaces from both batches, removes vertical faces and isolates source owners',()=>{
  const face=(z,owner,positions=[[1,2],[3,2],[1,3]])=>positions.flatMap(([x,y])=>{
    const v=Array(VERTEX_FLOATS).fill(0);v[0]=x;v[1]=y;v[2]=z;v[12]=owner;return v;
  });
  const mesh={roofs:new Float32Array([...face(9,1),...face(3,-1)]),facades:new Float32Array([...face(4,1),...face(6,0,[[1,1],[2,2],[3,3]])])};
  const result=topSurfaces(mesh,2);
  assert.deepEqual(result[0],[]);assert.deepEqual(result[1].map(f=>f.height),[4,9]);
  assert.deepEqual(result[1][0].points,[[1,-2],[3,-2],[1,-3]]);
});

test('each compared Stanford photograph has one matched building and an exact image on its own facility page',()=>{
  assert.equal(FACADE_PHOTOS.length,45);
  assert.equal(new Set(FACADE_PHOTOS.flatMap(row=>row.ids)).size,45);
  for (const row of FACADE_PHOTOS) {
    const code=new URL(row.sources[1].url).searchParams.get('FACIL_ID');
    assert.ok(new URL(row.sources[0].url).pathname.includes('/'+code+'/'));
    assert.ok(row.observed.length>40 && row.title!=='Stanford Federal Credit Union');
  }
});
