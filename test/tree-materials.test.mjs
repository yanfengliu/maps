import test from 'node:test';
import assert from 'node:assert/strict';
import {treeCutoutCoverage} from './helpers/tree-cutout-reference.mjs';

const coverageStats=coverage=>{
  const cells=Array.from({length:16},()=>({on:0,total:0}));
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
    const cell=cells[Math.floor(y/24)*4+Math.floor(x/24)];cell.total++;
    if(coverage([((x+.5)/96-.5)*1.2,((y+.5)/96-.5)*1.2])>=.46)cell.on++;
  }
  return cells.map(c=>c.on/c.total);
};
const distributed=ratios=>ratios.every(v=>v>.25&&v<.94);

test('leaf masks expose distributed air gaps inside every branch spray rather than only roughening a solid silhouette',()=>{
  for(const kind of [90,93])for(let id=0;id<8;id++){
    const ratios=coverageStats(p=>treeCutoutCoverage([p[0],p[1]+id*4],kind));
    assert.ok(distributed(ratios),`${kind}/${id}: ${ratios.map(v=>v.toFixed(2))}`);
  }
  assert.equal(distributed(coverageStats(()=>1)),false,'negative control: solid blob has no interior air gaps and must be rejected');
});

test('subpixel leaf holes merge while the irregular branch outline remains cut out',()=>{
  for(const kind of [90,93])for(let id=0;id<8;id++){
    const offset=id*4;
    assert.ok(treeCutoutCoverage([0,offset],kind,[.2,0],[0,.2])>=.46,'distant cluster core must remain present');
    assert.ok(treeCutoutCoverage([1,offset+1],kind,[.2,0],[0,.2])<.46,'distant cluster must never reveal its rectangular carrier');
    assert.ok(treeCutoutCoverage([0,offset],kind,[.001,0],[0,.001])<=1);
  }
});

test('feather masks have narrow connected rachises and staggered swept leaflets',()=>{
  for(let id=0;id<14;id++){
    for(let j=1;j<10;j++)assert.ok(treeCutoutCoverage([0,id*2+j/10],91)>=.46,'a frond cannot disconnect at its central rachis');
    let left=0,right=0,difference=0,total=0;
    for(let y=0;y<80;y++)for(let x=0;x<25;x++){
      const u=.2+x/25*.6,v=.15+y/80*.7,l=treeCutoutCoverage([-u,id*2+v],91)>=.46,r=treeCutoutCoverage([u,id*2+v],91)>=.46;
      left+=l;right+=r;difference+=l!==r;total++;
    }
    assert.ok(left/total>.25&&left/total<.8&&right/total>.25&&right/total<.8);
    assert.ok(difference/total>.2,'opposite leaflets cannot form matched horizontal ladder rungs');
  }
});

// The old .25..78 derivative fade filled whole blades even while each leaflet
// still spanned more than two pixels in the native 3 m view. Probe this footprint
// explicitly, in addition to the near-zero derivative material checks above.
test('palms retain feather gaps at resolved native-scale footprints and ragged edges when finer gaps merge',()=>{
  for(let id=0;id<14;id++){
    let kept=0,total=0,edgeCut=0;
    for(let y=0;y<100;y++)for(let x=0;x<40;x++){
      const u=.15+x/40*.6,v=.1+y/100*.8;
      kept+=treeCutoutCoverage([u,id*2+v],91,[.012,0],[0,.009])>=.46;total++;
    }
    assert.ok(kept/total>.25&&kept/total<.86,`resolved feather gaps disappeared for frond ${id}: ${kept/total}`);
    for(let y=0;y<100;y++)edgeCut+=treeCutoutCoverage([.86,id*2+.1+y*.008],91,[.04,0],[0,.06])<.46;
    assert.ok(edgeCut>25,'the coarse fallback must not reveal the straight carrier edge');
  }
});
