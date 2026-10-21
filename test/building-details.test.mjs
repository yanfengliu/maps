import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import earcut from 'earcut';
import { prepareBuildingDetails, buildBuildingGeometry, MAX_DETAIL_TRIANGLES, VERTEX_FLOATS, projectLocal, distanceToRings } from '../src/building-geometry.ts';
import { createBuildingDetailsLayer } from '../src/building-details.ts';
import { buildingArchitecture, describeBuildingArchitecture } from '../src/building-architecture.ts';
import { composeMainQuad } from '../src/compose-building-parts.ts';
import { isSimpleRing } from '../tools/data/fetch-stanford.mjs';

const original = JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson', import.meta.url), 'utf8'));
const before = JSON.stringify(original);
const detailed = prepareBuildingDetails(original);
const geometry = buildBuildingGeometry(detailed);

function area(ring) {
  return Math.abs(ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
}
function sourceTriangles(polygon) {
  const rings=polygon.map(r=>r.slice(0,-1).map(projectLocal)),points=rings.flat(),holes=[];
  let offset=rings[0].length;for(const r of rings.slice(1)){holes.push(offset);offset+=r.length;}
  const indices=earcut(points.flat(),holes,2),result=[];
  for(let i=0;i<indices.length;i+=3)result.push(indices.slice(i,i+3).map(index=>points[index]));
  return result;
}
// Independent convex clipping oracle: intersect source triangles, without
// invoking the boundary-composition implementation or its side probes.
function triangleIntersectionArea(subject,clip) {
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const sign=Math.sign(cross(...clip));let points=subject;
  for(let i=0;i<3&&points.length;i++){
    const a=clip[i],b=clip[(i+1)%3],next=[];
    for(let j=0;j<points.length;j++){
      const u=points[j],v=points[(j+1)%points.length],du=cross(a,b,u)*sign,dv=cross(a,b,v)*sign;
      if(du>=0)next.push(u);
      if((du>0)!==(dv>0)){const t=du/(du-dv);if(Number.isFinite(t))next.push([u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]);}
    }
    points=next;
  }
  return points.length>=3?area(points):0;
}

test('render preparation leaves source objects and metadata unchanged; only the Quad has a composed render footprint', () => {
  assert.equal(JSON.stringify(original), before);
  detailed.features.forEach((feature, index) => {
    const { detailWallHeight, detailRoofHeight, detailArchitecture, detailWallColor, detailRoofColor, ...properties } = feature.properties;
    assert.deepEqual(properties, original.features[index].properties);
    if(properties.id==='relation/35820')assert.notEqual(feature.geometry,original.features[index].geometry,'the source church part is composed out of the rendered Quad');
    else assert.equal(feature.geometry, original.features[index].geometry);
    assert.ok(detailWallHeight >= properties.base && detailWallHeight < properties.height, properties.id);
    assert.ok(detailRoofHeight>detailWallHeight && detailRoofHeight<=properties.height,properties.id);
    assert.equal(typeof detailArchitecture.profile, 'string');
  });
});

test('render-only Quad composition uses source vertices, retains courtyard coverage and removes exactly the actual church intersection', () => {
  const quad=original.features.find(f=>f.properties.id==='relation/35820'),church=original.features.find(f=>f.properties.id==='way/836474103'),rendered=detailed.features.find(f=>f.properties.id==='relation/35820');
  const vertices=new Set([...quad.geometry.coordinates.flat(),...church.geometry.coordinates.flat()].map(p=>JSON.stringify(p)));
  for(const ring of rendered.geometry.coordinates){
    assert.deepEqual(ring[0],ring.at(-1));assert.ok(isSimpleRing(ring));
    for(const point of ring){assert.ok(point.every(Number.isFinite));assert.ok(vertices.has(JSON.stringify(point)),'composition must not invent a replacement footprint vertex');}
  }
  const quadTriangles=sourceTriangles(quad.geometry.coordinates),churchTriangles=sourceTriangles(church.geometry.coordinates),resultTriangles=sourceTriangles(rendered.geometry.coordinates);
  const intersect=(a,b)=>a.reduce((sum,t)=>sum+b.reduce((subtotal,u)=>subtotal+triangleIntersectionArea(t,u),0),0);
  const intersection=intersect(quadTriangles,churchTriangles),sourceArea=quadTriangles.reduce((s,t)=>s+area(t),0),resultArea=resultTriangles.reduce((s,t)=>s+area(t),0);
  assert.ok(intersection>1800,'the source has a material overlapping church part');
  assert.ok(Math.abs(resultArea-(sourceArea-intersection))<0.0001,'the difference must subtract the actual intersection, not an assumed rectangle');
  assert.ok(intersect(resultTriangles,churchTriangles)<0.0001,'the rendered Quad must not remain under the church');
  assert.ok(Math.abs(intersect(resultTriangles,quadTriangles)-resultArea)<0.0001,'the composition must retain only the actual Quad footprint');
  for(const hole of quad.geometry.coordinates.slice(1)){
    const holeTriangles=sourceTriangles([hole]);
    assert.ok(intersect(resultTriangles,holeTriangles)<0.0001,'every original courtyard area stays empty, including the courtyard opened by the church cut');
  }
  assert.equal(rendered.properties.height,18);assert.equal(rendered.properties['osm:building:levels'],'5');
  assert.equal(rendered.properties.detailRoofHeight,9.5);assert.equal(rendered.properties.detailWallHeight,6.2);
  assert.equal(rendered.properties.detailArchitecture.floorSource,'reference-profile');assert.equal(rendered.properties.detailArchitecture.floors,1);
  assert.match(describeBuildingArchitecture(rendered.properties),/OSM tags list 5 levels.*authored low arcade.*not a floor survey/);
  const square={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]]]};
  const crossing={type:'Polygon',coordinates:[[[5,-2],[12,-2],[12,5],[5,5],[5,-2]]]};
  assert.throws(()=>composeMainQuad(square,crossing,p=>p),/cross without a shared source vertex/,'unsupported changed topology must fail clearly');
});

test('facade profiles retain mapped floor counts and distinguish explicit zero, estimates and non-storey structures', () => {
  const profile = (p, wall=12) => buildingArchitecture({ base:0, building:'university', ...p },wall);
  assert.deepEqual([profile({'osm:building:levels':'2'}).floors,profile({'osm:building:levels':'2'}).floorSource],[2,'osm-levels']);
  assert.equal(profile({'osm:building:levels':'0'}).floors,0);
  assert.equal(profile({'osm:building:levels':'4','osm:building:min_level':'1'}).floors,3);
  assert.equal(profile({}).floorSource,'estimated');
  assert.equal(profile({building:'dormitory'}).profile,'residential');
  assert.equal(profile({building:'garage'}).profile,'garage');
  assert.equal(profile({building:'hospital'}).profile,'modern');
  assert.equal(profile({building:'shed'}).profile,'service');
  assert.equal(profile({building:'dormitory'}).roofShape,'gabled');
  assert.equal(profile({building:'hospital'}).roofShape,'flat');
  assert.equal(profile({building:'hospital','osm:roof:shape':'hipped'}).roofShape,'hipped');
  assert.equal(profile({'osm:roof:shape':'hipped'}).roofSource,'osm-roof-shape');
  assert.equal(profile({building:'roof'}).floors,null);
  assert.equal(profile({id:'way/836474103'}).floorSource,'not-applicable');
  assert.match(describeBuildingArchitecture({detailArchitecture:profile({'osm:building:levels':'2'})}),/OSM records 2 levels.*exact counts have not been surveyed/);
  assert.match(describeBuildingArchitecture({detailArchitecture:profile({})}),/approximately.*source has no floor count/);
});

test('emitted facade rows follow two recorded floors even when the height would fit many more', () => {
  const fixture={type:'FeatureCollection',features:[{type:'Feature',properties:{id:'test/two-floors',building:'university',height:30,base:0,'osm:building:levels':'2'},geometry:{type:'Polygon',coordinates:[[[-122.17,37.427],[-122.1698,37.427],[-122.1698,37.4272],[-122.17,37.4272],[-122.17,37.427]]]}}]};
  const mesh=buildBuildingGeometry(prepareBuildingDetails(fixture)).facades;
  let highestUv=0;
  for(let i=0;i<mesh.length;i+=VERTEX_FLOATS)if(mesh[i+11]===1)highestUv=Math.max(highestUv,mesh[i+10]);
  assert.ok(Math.abs(highestUv-7.2)<0.00001,'two shader cells must span the full wall rather than repeating every 3.6 physical metres');
  fixture.features[0].properties['osm:building:levels']='0';
  const zero=buildBuildingGeometry(prepareBuildingDetails(fixture)).facades;
  for(let i=0;i<zero.length;i+=VERTEX_FLOATS)assert.equal(zero[i+11],2,'explicit zero must not receive a fabricated positive floor row');
});

test('photo-grounded Roble and Bing Wing profiles have three floor rows and three tall front bays without changing their source tags', () => {
  const roble=detailed.features.find(f=>f.properties.id==='way/232805733');
  assert.equal(roble.properties.building,'yes');assert.equal(roble.properties['osm:building:levels'],undefined);
  assert.equal(roble.properties.height,10);assert.equal(roble.properties.detailArchitecture.profile,'residential');
  assert.equal(roble.properties.detailArchitecture.floors,3);assert.equal(roble.properties.detailArchitecture.floorSource,'official-description');
  assert.match(describeBuildingArchitecture(roble.properties),/Stanford housing describes Roble Hall as three stories.*Window spacing.*modeled/);
  const bing=original.features.findIndex(f=>f.properties.id==='way/232805680');
  const vertices=[];
  for(let i=0;i<geometry.facades.length;i+=VERTEX_FLOATS)if(geometry.facades[i+12]===bing&&geometry.facades[i+11]===8)vertices.push(geometry.facades.slice(i,i+VERTEX_FLOATS));
  assert.equal(vertices.length,12,'two consecutive source wall segments carry one continuous three-bay facade');
  assert.ok(Math.abs(Math.min(...vertices.map(v=>v[9])))<0.00001);
  assert.ok(Math.abs(Math.max(...vertices.map(v=>v[9]))-11.4)<0.00001,'three 3.8-unit shader cells span the whole west facade');
  assert.ok(Math.abs(Math.max(...vertices.map(v=>v[10]))-3.6)<0.00001,'tall entrance bays span a single full-height facade band');
});

test('modern Memorial Church has a separate multilevel roof silhouette, seven front windows and three portals without generic floor texture', () => {
  const index=original.features.findIndex(f=>f.properties.id==='way/836474103');
  assert.equal(detailed.features[index].properties.detailArchitecture.profile,'memorial-church');
  assert.ok(Math.abs(detailed.features[index].properties.detailWallHeight-8.4)<1e-8);
  let roofVertices=0,facadeVertices=0;
  const heights=new Set();
  for(const mesh of [geometry.roofs,geometry.facades]) for(let i=0;i<mesh.length;i+=VERTEX_FLOATS) if(mesh[i+12]===index) {
    assert.ok(mesh[i+11]===0||mesh[i+11]===2,'church must not inherit generic repeated-storey shading');
    heights.add(Math.round(mesh[i+2]*100)/100);
    if(mesh===geometry.roofs)roofVertices++;else facadeVertices++;
  }
  assert.ok(roofVertices>150 && facadeVertices>3000,'landmark needs an authored roof and facade, not a renamed extrusion');
  for(const expected of [8.47,14.4,17.5,20.7,22.7,23.8,24]) assert.ok(heights.has(expected),`missing church roof/detail elevation ${expected}`);
  // Count disconnected opening intervals in the actual emitted front mesh,
  // independently of the renderer's authored window/portal loops.
  const ring=original.features[index].geometry.coordinates[0].slice(0,-1).map(projectLocal);
  const a=ring[0],b=ring.at(-1),length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],v=[u[1],-u[0]],origin=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const inside=(p)=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
  for(const mesh of [geometry.roofs,geometry.facades])for(let i=0;i<mesh.length;i+=VERTEX_FLOATS)if(mesh[i+12]===index){
    const point=[mesh[i],mesh[i+1]];
    // Only facade relief projects beyond the real wall, by less than 18 cm.
    if(!inside(point))assert.ok(distanceToRings(point,[ring])<(mesh===geometry.roofs?0.001:0.18),'church major geometry left its actual footprint');
  }
  const openingIntervals=(color,depth,minHeight)=>{
    const intervals=[],mesh=geometry.facades;
    for(let i=0;i<mesh.length;i+=VERTEX_FLOATS*3){
      if(mesh[i+12]!==index || color.some((c,k)=>Math.abs(mesh[i+6+k]-c)>0.00001))continue;
      const points=[0,1,2].map(j=>{const k=i+j*VERTEX_FLOATS,dx=mesh[k]-origin[0],dy=mesh[k+1]-origin[1];return [dx*u[0]+dy*u[1],dx*v[0]+dy*v[1],mesh[k+2]];});
      if(points.some(p=>Math.abs(p[1]-depth)>0.001||p[2]<minHeight))continue;
      intervals.push([Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0]))]);
    }
    intervals.sort((a,b)=>a[0]-b[0]);const groups=[];
    for(const interval of intervals){const last=groups.at(-1);if(last&&interval[0]<=last[1]+0.001)last[1]=Math.max(last[1],interval[1]);else groups.push(interval.slice());}
    return groups;
  };
  assert.equal(openingIntervals([0.32,0.40,0.39],-0.10,10).length,7,'current facade has a central arched window with flanking triplets');
  assert.equal(openingIntervals([0.28,0.29,0.25],-0.11,0).length,3,'front facade has three separate arched portals');
  assert.match(describeBuildingArchitecture(detailed.features[index].properties),/three entrance arches.*central arched window.*24 m source height is estimated/);
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
  const church=sourceTriangles(original.features.find(f=>f.properties.id==='way/836474103').geometry.coordinates);
  const sourceQuad=sourceTriangles(original.features[index].geometry.coordinates);
  const overlap=sourceQuad.reduce((sum,t)=>sum+church.reduce((subtotal,u)=>subtotal+triangleIntersectionArea(t,u),0),0);
  const targetArea = area(polygon[0]) - polygon.slice(1).reduce((sum, ring) => sum + area(ring), 0)-overlap;
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
      if (geometry.roofs[i + 11] === 0 || geometry.roofs[i+11]===9) highestRoof = Math.max(highestRoof, geometry.roofs[i + 2]);
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
  for (const name of ['shaderSource','compileShader','attachShader','linkProgram','bindVertexArray','bindBuffer','bufferData','bufferSubData','enableVertexAttribArray','vertexAttribPointer','useProgram','uniformMatrix4fv','uniform1f','uniform2f','enable','depthFunc','depthMask','disable','drawArrays']) gl[name] = () => {};
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
    for(let i=0;i<80&&!retry.stats.ready;i++)retry.render(gl,options);
    assert.equal(retry.stats.drawCalls, 1); assert.equal(retry.stats.lastDrawDetail, 'roofs');
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

test('high zoom in San Francisco starts no Stanford worker; approaching campus starts it once',()=>{
  const priorWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class {constructor(){this.terminated=false;workers.push(this);}postMessage(){}terminate(){this.terminated=true;}};
  let center=[-122.4194,37.7749];
  const owner={getZoom:()=>15,getCenter:()=>({toArray:()=>center}),on(){},off(){},triggerRepaint(){}};
  const options={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}};
  const {gl,live}=gpu();const layer=createBuildingDetailsLayer(prepareBuildingDetails(structuredClone(original)));
  try{
    layer.onAdd(owner,gl);for(let i=0;i<3;i++)layer.render(gl,options);
    assert.equal(workers.length,0,'an offscreen campus must not trigger its geometry worker or environment fetch');
    assert.equal(live.buffers.size,0);
    center=[-122.1697,37.4278];layer.render(gl,options);layer.render(gl,options);
    assert.equal(workers.length,1,'the actual campus approach starts one worker');
  }finally{layer.onRemove(owner,gl);if(priorWorker===undefined)delete globalThis.Worker;else globalThis.Worker=priorWorker;}
  assert.ok(workers[0].terminated);for(const values of Object.values(live))assert.equal(values.size,0);
});

test('mesh upload transfers at most 1MiB per frame, draws only complete meshes and restarts cleanly after loss, removal and failure',()=>{
  const priorWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class{constructor(){this.terminated=false;workers.push(this);}postMessage(){}terminate(){this.terminated=true;}};
  const listeners=new Map(),owner={getZoom:()=>16,getCenter:()=>({toArray:()=>[-122.1697,37.4278]}),on:(name,fn)=>listeners.set(name,fn),off:name=>listeners.delete(name),triggerRepaint(){}};
  const options={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}};
  const data=prepareBuildingDetails(structuredClone(original));
  const {gl,live}=gpu();let bound;const allocations=new Map(),chunks=[];
  gl.bindBuffer=(_,buffer)=>{bound=buffer;};
  gl.bufferData=(_,size)=>{assert.equal(typeof size,'number','allocation must not upload the whole array synchronously');allocations.set(bound,size);};
  gl.bufferSubData=(_,offset,values)=>{assert.ok(values.byteLength<=1024*1024,'one render callback exceeded the finite transfer budget');chunks.push({buffer:bound,offset,size:values.byteLength});};
  const layer=createBuildingDetailsLayer(data);
  try{
    layer.onAdd(owner,gl);layer.render(gl,options);workers[0].onmessage({data:{geometry,buildMs:10}});
    layer.render(gl,options);assert.equal(live.buffers.size,1);assert.equal(layer.stats.ready,false);assert.equal(layer.stats.drawCalls,0);
    layer.render(gl,options);assert.equal(chunks.length,1);assert.equal(layer.stats.ready,false);assert.equal(layer.stats.drawCalls,0);
    listeners.get('webglcontextlost')();for(const values of Object.values(live))assert.equal(values.size,0,'partial uploads leaked across lost context');
    chunks.length=0;allocations.clear();listeners.get('webglcontextrestored')();
    for(let i=0;i<100&&!layer.stats.ready;i++)layer.render(gl,options);
    assert.equal(layer.stats.ready,true);assert.equal(layer.stats.drawCalls,2);assert.ok(layer.stats.uploadSlices>10);
    assert.equal(allocations.size,2);
    for(const [buffer,size]of allocations){let end=0;for(const chunk of chunks.filter(c=>c.buffer===buffer)){assert.equal(chunk.offset,end,'upload omitted or duplicated a byte range');end+=chunk.size;}assert.equal(end,size,'ready was reported before the full buffer was transferred');}
    layer.onRemove(owner,gl);for(const values of Object.values(live))assert.equal(values.size,0);

    const cancelled=createBuildingDetailsLayer(data);cancelled.onAdd(owner,gl);cancelled.render(gl,options);assert.equal(live.buffers.size,1);assert.equal(cancelled.stats.ready,false);cancelled.onRemove(owner,gl);
    for(const values of Object.values(live))assert.equal(values.size,0,'removal left a partial allocation');
    gl.bufferSubData=()=>{throw new Error('injected partial transfer failure');};
    const failed=createBuildingDetailsLayer(data);failed.onAdd(owner,gl);failed.render(gl,options);failed.render(gl,options);
    assert.match(failed.stats.error,/injected partial transfer failure/);assert.equal(failed.stats.ready,false);
    for(const values of Object.values(live))assert.equal(values.size,0,'failed transfer leaked partial GPU objects');failed.onRemove(owner,gl);
  }finally{layer.onRemove(owner,gl);if(priorWorker===undefined)delete globalThis.Worker;else globalThis.Worker=priorWorker;}
});
