import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAsset} from '../src/public-assets.ts';

test('public data, worker inputs, artwork and source links resolve under root and project deployments',()=>{
  for(const path of ['data/stanford-surfaces.geojson','data/stanford-buildings.geojson','data/stanford-campus.geojson','data/stanford-environment.geojson','data/stanford-sculptures.geojson','textures/church-nave.jpg','textures/church-chancel.jpg','textures/ATTRIBUTION.md','data/stanford-provenance.json']){
    assert.equal(new URL(publicAsset(path,'/'), 'https://example.org/').pathname,`/${path}`);
    assert.equal(new URL(publicAsset(path,'/maps/'),'https://example.org/maps/').pathname,`/maps/${path}`);
    assert.equal(publicAsset('/'+path,'/maps/'),`/maps/${path}`);
  }
});
