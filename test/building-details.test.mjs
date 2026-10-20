import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareBuildingDetails, buildBuildingGeometry, MAX_DETAIL_TRIANGLES, VERTEX_FLOATS, projectLocal } from '../src/building-geometry.ts';
import { createBuildingDetailsLayer } from '../src/building-details.ts';

const original = JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson', import.meta.url), 'utf8'));
const before = JSON.stringify(original);
const detailed = prepareBuildingDetails(original);
const geometry = buildBuildingGeometry(detailed);

function area(ring) {
  return Math.abs(ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
}

test('roof enrichment retains every original source property, footprint and height', () => {
  assert.equal(JSON.stringify(original), before);
  detailed.features.forEach((feature, index) => {
    const { detailWallHeight, ...properties } = feature.properties;
    assert.deepEqual(properties, original.features[index].properties);
    assert.equal(feature.geometry, original.features[index].geometry);
    assert.ok(detailWallHeight >= properties.base && detailWallHeight < properties.height, properties.id);
  });
});

test('all 648 detailed buildings stay finite, under their source heights and within the triangle budget', () => {
  assert.equal(geometry.buildings, 648);
  assert.ok(geometry.triangles > 50_000 && geometry.triangles <= MAX_DETAIL_TRIANGLES);
  assert.equal(geometry.triangles, geometry.roofTriangles + geometry.facadeTriangles);
  assert.ok(geometry.bytes < 24 * 1024 * 1024);
  for (const mesh of [geometry.roofs, geometry.facades]) {
    assert.equal(mesh.length % (VERTEX_FLOATS * 3), 0);
    assert.ok(mesh.every(Number.isFinite));
    for (let i = 0; i < mesh.length; i += VERTEX_FLOATS) {
      const feature = original.features[mesh[i + 12]];
      assert.ok(mesh[i + 2] <= feature.properties.height + 0.0001, feature.properties.id);
      assert.ok(mesh[i + 2] >= feature.properties.base - 0.0001, feature.properties.id);
    }
  }
});

test('triangulated roofs retain the actual Main Quad and every courtyard area rather than covering the holes', () => {
  const index = original.features.findIndex(feature => feature.properties.id === 'relation/35820');
  const polygon = original.features[index].geometry.coordinates.map(ring => ring.slice(0, -1).map(projectLocal));
  assert.equal(polygon.length, 8, 'the source has seven courtyard holes');
  const targetArea = area(polygon[0]) - polygon.slice(1).reduce((sum, ring) => sum + area(ring), 0);
  let meshArea = 0;
  const inside = (p, ring) => {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  };
  const mesh = geometry.roofs;
  for (let i = 0; i < mesh.length; i += VERTEX_FLOATS * 3) {
    if (mesh[i + 12] !== index || mesh[i + 11] !== 0) continue;
    const triangle = [0, 1, 2].map(offset => [mesh[i + offset * VERTEX_FLOATS], mesh[i + offset * VERTEX_FLOATS + 1]]);
    const center = [0, 1].map(axis => triangle.reduce((sum, p) => sum + p[axis], 0) / 3);
    assert.ok(inside(center, polygon[0]));
    assert.ok(polygon.slice(1).every(hole => !inside(center, hole)), 'roof triangle spans a courtyard');
    meshArea += area(triangle);
  }
  assert.ok(Math.abs(meshArea - targetArea) < targetArea * 0.00001, `roof ${meshArea}m² differs from source ${targetArea}m²`);
  // A filled outer ring is a meaningful negative control for this check.
  assert.ok(area(polygon[0]) - targetArea > targetArea * 0.25);
});

test('Hoover dome remains 87m with a curved silhouette and Main Quad gets arcade elevations', () => {
  const hoover = original.features.findIndex(feature => feature.properties.name === 'Hoover Tower');
  const quad = original.features.findIndex(feature => feature.properties.id === 'relation/35820');
  const heights = new Set();
  for (let i = 0; i < geometry.roofs.length; i += VERTEX_FLOATS) if (geometry.roofs[i + 12] === hoover && geometry.roofs[i + 11] === 0) heights.add(geometry.roofs[i + 2]);
  assert.equal(Math.max(...heights), 87);
  assert.ok(heights.size > 8);
  let arcadeVertices = 0;
  for (let i = 0; i < geometry.facades.length; i += VERTEX_FLOATS) if (geometry.facades[i + 12] === quad && geometry.facades[i + 11] === 3) arcadeVertices++;
  assert.ok(arcadeVertices > 500);
});

test('mapped gables have an exact ridge and flat/skillion raised edges have stone closing faces', () => {
  for (const [index, feature] of detailed.features.entries()) {
    const shape = feature.properties['osm:roof:shape'];
    if (!['gabled','flat','skillion'].includes(shape)) continue;
    let highestRoof = -Infinity, highestClosure = -Infinity;
    for (let i = 0; i < geometry.roofs.length; i += VERTEX_FLOATS) if (geometry.roofs[i + 12] === index) {
      if (geometry.roofs[i + 11] === 0) highestRoof = Math.max(highestRoof, geometry.roofs[i + 2]);
      if (geometry.roofs[i + 11] === 2) highestClosure = Math.max(highestClosure, geometry.roofs[i + 2]);
    }
    assert.ok(Math.abs(highestRoof - feature.properties.height) < 0.0001, `${feature.properties.id} roof does not reach its source height`);
    assert.ok(Math.abs(highestClosure - feature.properties.height) < 0.0001, `${feature.properties.id} has an open roof boundary`);
  }
});

function gpu() {
  const live = { shaders: new Set(), programs: new Set(), vaos: new Set(), buffers: new Set() };
  const allocate = kind => { const value = {}; live[kind].add(value); return value; };
  const gl = {
    createShader: () => allocate('shaders'), createProgram: () => allocate('programs'),
    createVertexArray: () => allocate('vaos'), createBuffer: () => allocate('buffers'),
    deleteShader: value => live.shaders.delete(value), deleteProgram: value => live.programs.delete(value),
    deleteVertexArray: value => live.vaos.delete(value), deleteBuffer: value => live.buffers.delete(value),
    getShaderParameter: () => true, getProgramParameter: () => true, getUniformLocation: () => ({}),
    getExtension: () => ({ COMPLETION_STATUS_KHR: 1 }),
  };
  for (const name of ['shaderSource','compileShader','attachShader','linkProgram','bindVertexArray','bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer','useProgram','uniformMatrix4fv','uniform1f','uniform2f','enable','depthFunc','depthMask','disable','drawArrays']) gl[name] = () => {};
  return { gl, live };
}

test('regional startup defers all architectural shader work until approach', () => {
  const { gl, live } = gpu();
  let zoom = 9, extensionQueries = 0;
  gl.getExtension = () => { extensionQueries++; return { COMPLETION_STATUS_KHR: 1 }; };
  const owner = { getZoom: () => zoom, on() {}, off() {}, triggerRepaint() {} };
  const layer = createBuildingDetailsLayer(detailed);
  try {
    layer.onAdd(owner, gl);
    for (const regionZoom of [9, 10, 11.99]) {
      zoom = regionZoom; layer.render(gl, {});
      for (const objects of Object.values(live)) assert.equal(objects.size, 0, `architectural GPU allocation at regional zoom ${zoom}`);
      assert.equal(extensionQueries, 0, 'regional frames must not query the custom shader compiler');
    }
    zoom = 12; layer.render(gl, {});
    assert.equal(extensionQueries, 1);
    assert.equal(live.programs.size, 1);
    assert.equal(layer.stats.shaderReady, true);
    assert.equal(layer.stats.ready, false, 'approach warms shaders without starting geometry');
    assert.equal(live.buffers.size, 0);
  } finally { layer.onRemove(owner, gl); }
  for (const objects of Object.values(live)) assert.equal(objects.size, 0);
});

test('GPU shader warmup never waits for compile/link status before parallel completion', () => {
  const { gl, live } = gpu();
  let complete = false;
  const queries = [];
  gl.LINK_STATUS = 2;
  gl.getShaderParameter = () => { throw new Error('COMPILE_STATUS must not block shader warmup'); };
  gl.getProgramParameter = (_, parameter) => { queries.push(parameter); return parameter === 1 ? complete : true; };
  const owner = { getZoom: () => 12, on() {}, off() {}, triggerRepaint() {} };
  const layer = createBuildingDetailsLayer(detailed);
  try {
    layer.onAdd(owner, gl);
    assert.deepEqual(queries, []);
    layer.render(gl, {});
    assert.deepEqual(queries, [1]);
    assert.equal(layer.stats.shaderReady, false);
    complete = true; layer.render(gl, {});
    assert.deepEqual(queries, [1, 1, 2]);
    assert.equal(layer.stats.shaderReady, true);
    assert.equal(layer.stats.ready, false, 'approach warmup does not build campus geometry');
  } finally { layer.onRemove(owner, gl); }
  for (const objects of Object.values(live)) assert.equal(objects.size, 0);
});

test('without parallel compilation, approach idle warmup is cancellable on style removal', () => {
  const previousWindow = globalThis.window;
  let callback, cancelled = false;
  globalThis.window = { requestIdleCallback: fn => { callback = fn; return 8; }, cancelIdleCallback: handle => { assert.equal(handle, 8); cancelled = true; } };
  const { gl, live } = gpu();
  gl.getExtension = () => null;
  gl.getProgramParameter = () => { throw new Error('link status must wait for approach idle'); };
  const owner = { getZoom: () => 12, on() {}, off() {}, triggerRepaint() {} };
  const layer = createBuildingDetailsLayer(detailed);
  try {
    layer.onAdd(owner, gl); assert.equal(typeof callback, 'function');
    layer.render(gl, {}); assert.equal(layer.stats.shaderReady, false);
    layer.onRemove(owner, gl); assert.ok(cancelled);
    callback(); assert.equal(layer.stats.shaderReady, false);
    for (const objects of Object.values(live)) assert.equal(objects.size, 0);
  } finally { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});

test('graphics context restoration defers regional shaders and warms again on approach', () => {
  const { gl, live } = gpu();
  let zoom = 12;
  const listeners = new Map();
  const owner = { getZoom: () => zoom, triggerRepaint() {}, on: (name, fn) => listeners.set(name, fn), off: name => listeners.delete(name) };
  const layer = createBuildingDetailsLayer(detailed);
  try {
    layer.onAdd(owner, gl);
    assert.equal(live.programs.size, 1, 'attaching during approach warms immediately');
    layer.render(gl, {}); assert.equal(layer.stats.shaderReady, true);
    listeners.get('webglcontextlost')();
    for (const objects of Object.values(live)) assert.equal(objects.size, 0);
    zoom = 9; listeners.get('webglcontextrestored')(); layer.render(gl, {});
    assert.equal(layer.stats.shaderReady, false);
    assert.equal(live.programs.size, 0, 'restoring in the region must remain deferred');
    zoom = 12; layer.render(gl, {});
    assert.equal(layer.stats.shaderReady, true);
    listeners.get('webglcontextlost')(); listeners.get('webglcontextrestored')();
    assert.equal(live.programs.size, 1, 'restoring during approach warms immediately');
    layer.render(gl, {}); assert.equal(layer.stats.shaderReady, true);
  } finally { layer.onRemove(owner, gl); }
  assert.equal(listeners.size, 0);
  for (const objects of Object.values(live)) assert.equal(objects.size, 0);
});

test('detail layer is lazy, cancels its worker and releases all GPU resources on removal and retry', () => {
  const priorWorker = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() { this.terminated = false; workers.push(this); }
    postMessage() {}
    terminate() { this.terminated = true; }
  };
  let zoom = 9;
  const listeners = new Set();
  const owner = { getZoom: () => zoom, getCenter: () => ({ toArray: () => [-122.1697,37.4278] }), triggerRepaint() {}, on: (name, fn) => listeners.add(fn), off: (name, fn) => listeners.delete(fn) };
  const options = { defaultProjectionData: { mainMatrix: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] } };
  try {
    const { gl, live } = gpu();
    const layer = createBuildingDetailsLayer(detailed);
    layer.onAdd(owner, gl); layer.render(gl, options);
    assert.equal(workers.length, 0);
    assert.equal(live.programs.size, 0, 'the regional view does not warm architectural shaders');
    assert.equal(live.buffers.size, 0, 'geometry upload remains lazy');
    zoom = 12; layer.render(gl, options);
    assert.equal(live.programs.size, 1, 'the shader warms while approaching campus');
    zoom = 15; layer.render(gl, options); assert.equal(workers.length, 1);
    layer.onRemove(owner, gl); assert.ok(workers[0].terminated); assert.equal(listeners.size, 0);

    const retry = createBuildingDetailsLayer(detailed);
    retry.onAdd(owner, gl); retry.render(gl, options);
    workers[1].onmessage({ data: { geometry, buildMs: 10 } });
    assert.ok(workers[1].terminated);
    retry.render(gl, options); assert.equal(retry.stats.drawCalls, 1); assert.equal(retry.stats.lastDrawDetail, 'roofs');
    zoom = 15.8; retry.render(gl, options); assert.equal(retry.stats.drawCalls, 2); assert.equal(retry.stats.lastDrawDetail, 'facades');
    assert.ok(Object.isFrozen(retry.stats)); retry.setSelected(original.features[0].properties.id);
    retry.onRemove(owner, gl);
    assert.equal(listeners.size, 0);
    for (const objects of Object.values(live)) assert.equal(objects.size, 0);

    gl.bufferData = () => { throw new Error('injected buffer upload failure'); };
    const failedUpload = createBuildingDetailsLayer(detailed);
    failedUpload.onAdd(owner, gl); failedUpload.render(gl, options);
    assert.match(failedUpload.stats.error, /injected buffer upload failure/);
    failedUpload.onRemove(owner, gl);
    assert.equal(listeners.size, 0);
    for (const objects of Object.values(live)) assert.equal(objects.size, 0, 'failed upload left a GPU allocation');
  } finally { if (priorWorker === undefined) delete globalThis.Worker; else globalThis.Worker = priorWorker; }
});
