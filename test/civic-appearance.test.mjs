import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CIVIC_FACADE_PHOTOS} from '../src/civic-facades.ts';
import {CAMPUS_FRONTAGES,CIVIC_APPEARANCES,civicFacade} from '../src/civic-appearance.ts';
import {buildBuildingGeometry,prepareBuildingDetails,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {CIVIC_PHOTO_REFERENCES as CIVIC_REFERENCES} from '../tools/quality/civic-refs.mjs';

const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
test('photographed civic elevations and roof fields are present on the original footprint and within its source height',()=>{
  for(const record of CIVIC_REFERENCES){
    const id=record.ids[0], appearance=CIVIC_APPEARANCES[id];
    const feature=source.features.find(f=>f.properties.id===id);
    const data=prepareBuildingDetails({type:'FeatureCollection',features:[feature]});
    const prepared=data.features[0],p=prepared.properties;
    assert.equal(prepared.geometry,feature.geometry);
    assert.equal(p.height,feature.properties.height);
    if(!appearance){
      const photo=CIVIC_FACADE_PHOTOS[id];assert.equal(p.detailWallColor,photo.wall);
      assert.ok(record.sources.some(s=>s.kind==='photo'&&(s.url.includes('/'+photo.code+'/')||!s.url.includes('MapServer')&&!s.url.includes('images_repo'))));
      const front=CAMPUS_FRONTAGES[id];
      if(front){
        const geometry=buildBuildingGeometry(data);
        assert.ok([geometry.roofs,geometry.facades].some(mesh=>{
          for(let i=0;i<mesh.length;i+=VERTEX_FLOATS)if(mesh[i+11]===front.material)return true;
          return false;
        }),id+' must emit its photographed elevation');
      }
      continue;
    }
    assert.equal(p.detailArchitecture.roofShape,appearance.roofShape);
    assert.equal(p.detailArchitecture.roofSource,'reference-profile');
    assert.equal(p.detailWallColor,appearance.wall);
    assert.equal(p.detailRoofColor,appearance.roofColor);
    if (!appearance.frontage) continue;
    const geometry=buildBuildingGeometry(data),kinds=new Set();
    for(const mesh of [geometry.roofs,geometry.facades])for(let i=0;i<mesh.length;i+=VERTEX_FLOATS){
      const kind=mesh[i+11];kinds.add(kind);
      if(kind===appearance.frontage.material){
        assert.ok(mesh[i+2]>=p.base&&mesh[i+2]<=p.height);
        assert.ok(mesh[i+10]===0||mesh[i+10]===appearance.frontage.bands);
      }
    }
    assert.ok(kinds.has(appearance.frontage.material),id);
    if(id==='way/493811440')assert.ok(kinds.has(58),'clerestory continues around the other gallery walls');
  }
});

test('the zinc band crosses split lawn edges continuously and stays off unphotographed walls',()=>{
  const ring=[[0,0],[0,10],[0,30],[5,30],[5,0]];
  const face=civicFacade('relation/8530450',ring);
  const a=face(ring[0],ring[1],1,0),b=face(ring[1],ring[2],1,0);
  assert.equal(a.material,55); assert.equal(a.u1,b.u0);
  assert.ok(b.u1>a.u1&&a.u1>a.u0);
  assert.equal(face(ring[2],ring[3],-1,0),undefined);
});
