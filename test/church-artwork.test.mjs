import test from 'node:test';
import assert from 'node:assert/strict';
import { photoProjection, photoTriangles, APSE_BOTTOM, APSE_TOP } from '../src/church-artwork.ts';

// Independent pinhole camera: a wall recedes strongly rightwards, and the camera
// is above its centre. Straight upright marks must survive UV rectification.
const camera = ([u,v]) => [(60+420*u)/(1+1.6*u), (460-350*v+150*u)/(1+1.6*u)];
const quad = [[0,0],[1,0],[1,1],[0,1]];
const region = {size:[1280,853], corners:quad.map(camera)};

test('photographed planar wall grids rectify without a diagonal kink or tilted verticals',()=>{
  const project=photoProjection(region);
  for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
    const p=[i/20,j/20], expected=camera(p), actual=project(p);
    assert.ok(Math.hypot(actual[0]*1280-expected[0],actual[1]*853-expected[1])<1e-9);
  }
});

test('rendered triangle interpolation stays below half a source pixel across the full photo, including the diagonal',()=>{
  let count=0;
  for(const indices of [[0,1,2],[0,2,3]])photoTriangles(region,indices.map(i=>quad[i]),(p,uv)=>{
    count++;
    for(const w of [[1/3,1/3,1/3],[.25,.5,.25],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
      const wall=[0,1].map(k=>p.reduce((s,v,i)=>s+v[k]*w[i],0));
      const sampled=[0,1].map(k=>uv.reduce((s,v,i)=>s+v[k]*w[i],0)*region.size[k]);
      const expected=camera(wall);
      assert.ok(Math.hypot(sampled[0]-expected[0],sampled[1]-expected[1])<.5);
    }
  });
  assert.ok(count>2&&count<5000,'perspective needs bounded subdivision, not two affine triangles');
});

test('curved apse cornices stay level and adjacent strip edges use identical pixels at every height',()=>{
  const strips=APSE_BOTTOM.slice(0,-1).map((p,i)=>({size:[960,720],curved:true,corners:[p,APSE_BOTTOM[i+1],APSE_TOP[i+1],APSE_TOP[i]]}));
  for(let i=0;i<strips.length;i++){
    const project=photoProjection(strips[i]);
    for(let step=0;step<=20;step++){
      const v=step/20,edge=project([1,v]);
      if(i+1<strips.length)assert.deepEqual(edge,photoProjection(strips[i+1])([0,v]));
    }
    for(const indices of [[0,1,2],[0,2,3]])photoTriangles(strips[i],indices.map(j=>quad[j]),(p,uv)=>{
      const centre=[0,1].map(k=>p.reduce((s,v)=>s+v[k]/3,0)), expected=project(centre);
      assert.ok(Math.hypot(...[0,1].map(k=>(uv.reduce((s,v)=>s+v[k]/3,0)-expected[k])*strips[i].size[k]))<.5);
    });
  }
});
