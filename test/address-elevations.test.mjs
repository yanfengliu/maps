import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADDRESS_ELEVATIONS} from '../src/address-elevations.ts';
import {ADDRESS_ELEVATION_REFERENCES} from '../tools/quality/address-elevation-refs.mjs';
import {buildingArchitecture,describeBuildingArchitecture} from '../src/building-architecture.ts';
import {buildBuildingGeometry,prepareBuildingDetails,VERTEX_FLOATS} from '../src/building-geometry.ts';

const all = JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const source = {...all,features:all.features.filter(f => ADDRESS_ELEVATIONS[f.id])};
const prepared = prepareBuildingDetails(source);
const mesh = buildBuildingGeometry(prepared);

test('the four individually photographed homes preserve their source geometry and mapped levels', () => {
  assert.equal(prepared.features.length, 4);
  const pages = new Set();
  for (const [index, f] of prepared.features.entries()) {
    const p = f.properties, home = ADDRESS_ELEVATIONS[f.id];
    const ref = ADDRESS_ELEVATION_REFERENCES.find(r => r.ids.includes(f.id));
    pages.add(ref.sources[0].url);
    assert.equal(ref.sources[0].date, '2016');
    assert.equal(p.detailPlaceName, ref.title);
    assert.equal(p.name, null);
    assert.equal(f.geometry, source.features[index].geometry);
    assert.equal(p.height, source.features[index].properties.height);
    assert.equal(p.detailArchitecture.profile, 'residential');
    assert.equal(p.detailArchitecture.floors, home.floors);
    assert.equal(p.detailArchitecture.roofShape, home.shape);
    assert.equal(p.detailRoofColor, home.roof);
    assert.equal(p.detailWallColor, home.wall);
    assert.ok(Math.abs(p.detailRoofHeight - (p.heightSource === 'estimated' ? 3.9 : p.height)) < 1e-9);
    assert.equal(p.detailArchitecture.floorSource, p.heightSource === 'estimated' ? 'official-description' : 'osm-levels');
    assert.ok(p.detailRoofHeight > p.detailWallHeight && p.detailWallHeight > 2);
    assert.match(describeBuildingArchitecture(p), /2016/);
    const changed = {...p, heightSource:'osm-height', height:8.7, 'osm:building:levels':'3', 'osm:roof:shape':'hipped'};
    const next = prepareBuildingDetails({...source,features:[{...f,properties:changed}]});
    assert.equal(next.features[0].properties.detailRoofHeight, 8.7);
    assert.equal(buildingArchitecture(changed,7).floors, 3);
    assert.equal(buildingArchitecture(changed,7).roofSource,'osm-roof-shape');
  }
  assert.equal(pages.size, 4);
});

test('pitched house roofs omit barrel tiles and the 518 east elevation carries a separate lower finish', () => {
  const roofs = new Set(), pink = [0xa6, 0x7b, 0x61].map(k => k/255);
  for (let i = 0; i < mesh.roofs.length; i += VERTEX_FLOATS) {
    assert.ok(![0,17].includes(mesh.roofs[i + 11]), 'clay barrel tile material on surveyed house');
    if (mesh.roofs[i + 11] === 2 || mesh.roofs[i + 5] < 0.5) continue;
    roofs.add(mesh.roofs[i + 12]);
    assert.equal(mesh.roofs[i + 11], 9);
  }
  assert.equal(roofs.size, 4);
  const brick = [];
  for (let i = 0; i < mesh.facades.length; i += VERTEX_FLOATS) {
    if (pink.every((v,k) => Math.abs(mesh.facades[i + 6 + k] - v) < 1e-5)) brick.push(mesh.facades.subarray(i, i + VERTEX_FLOATS));
  }
  assert.ok(brick.length > 0);
  for (const v of brick) {
    assert.equal(prepared.features[v[12]].id, 'way/232715619');
    assert.ok(v[2] < 3);
    assert.equal(v[11], 4);
  }
});
