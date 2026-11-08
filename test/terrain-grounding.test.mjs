import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TerrainAnchorBuilder,TerrainGrounding,TERRAIN_SIZE,MAX_TERRAIN_TEXTURE_BYTES,buildingTerrainAnchors,terrainTextureLayout,sampleTerrainGrid,decodeTerrainObjectId,isTerrainObjectId,terrainTileMatrix,BAY_TERRAIN_BOUNDS} from '../src/terrain-grounding.ts';
import {createStyle} from '../src/style.ts';
import {projectLocal,MERCATOR_ORIGIN,METERS_TO_MERCATOR,prepareBuildingDetails,buildBuildingGeometry,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {buildChurchInterior,CHURCH_ID} from '../src/church-interior.ts';
import {HOOVER_PART_IDS} from '../src/hoover-architecture.ts';
import {STADIUM_CONCOURSE_ID,STADIUM_SEATING_IDS} from '../src/stadium-architecture.ts';
const source=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));

test('regional terrain uses the real bounded Terrarium source, full attribution, globe and one-to-one heights',()=>{
 const style=createStyle(),dem=style.sources['bay-area-terrain'];
 assert.deepEqual(style.terrain,{source:'bay-area-terrain',exaggeration:1});assert.deepEqual(style.projection,{type:'globe'});
 assert.deepEqual(dem.bounds,BAY_TERRAIN_BOUNDS);assert.equal(dem.type,'raster-dem');assert.equal(dem.encoding,'terrarium');assert.equal(dem.tileSize,256);assert.equal(dem.maxzoom,15);
 assert.deepEqual(dem.tiles,['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png']);assert.match(dem.attribution,/USGS.*NOAA/);
 // Official Sonoma County GIS extent, queried for the nine Bay Area counties.
 const countyExtent=[-123.53574010431784,36.884046574343635,-121.1880075335135,38.864749471385984];
 assert.ok(dem.bounds[0]<countyExtent[0]&&dem.bounds[1]<countyExtent[1]&&dem.bounds[2]>countyExtent[2]&&dem.bounds[3]>countyExtent[3]);
 assert.equal(style.layers.find(l=>l.id==='regional-relief').source,'bay-area-hillshade');
 assert.deepEqual(style.sources['bay-area-hillshade'],dem,'hillshade uses its own source cache with the same elevation dataset');
});

test('building assemblies and church interior share rigid anchors without modifying mapped heights or footprints',()=>{
 const before=JSON.stringify(source),data=prepareBuildingDetails(source),anchors=buildingTerrainAnchors(data),churchIndex=data.features.findIndex(f=>f.properties.id===CHURCH_ID);
 const church=buildChurchInterior(data);
 for(const mesh of [church.roofs,church.facades])for(let i=0;i<mesh.length;i+=VERTEX_FLOATS)assert.equal(mesh[i+12],churchIndex,'interior vertices use the exterior anchor index');
 for(const ids of [HOOVER_PART_IDS,new Set([STADIUM_CONCOURSE_ID,...STADIUM_SEATING_IDS])]){
  const indices=data.features.flatMap((f,i)=>ids.has(f.properties.id)?[i]:[]);assert.ok(indices.length>1);
  for(const i of indices)assert.deepEqual(anchors.slice(i*2,i*2+2),anchors.slice(indices[0]*2,indices[0]*2+2),'connected tower/bowl parts must not acquire different vertical datums');
 }
 assert.equal(anchors.length,source.features.length*2);assert.ok(anchors.every(Number.isFinite));assert.equal(JSON.stringify(source),before);
});

test('trees, benches and lamps retain one anchor per object and the existing 13-float geometry layout',()=>{
 const environment={type:'FeatureCollection',features:[
  {type:'Feature',properties:{id:'node/1',version:1,kind:'tree'},geometry:{type:'Point',coordinates:[-122.1697,37.4278]}},
  {type:'Feature',properties:{id:'node/2',version:1,kind:'lamp'},geometry:{type:'Point',coordinates:[-122.1695,37.4278]}},
  {type:'Feature',properties:{id:'way/3',version:1,kind:'bench'},geometry:{type:'LineString',coordinates:[[-122.1693,37.4278],[-122.1692,37.4278]]}}
 ]};
 const geometry=buildBuildingGeometry({type:'FeatureCollection',features:[]},environment),groups=new Map();
 assert.equal(VERTEX_FLOATS,13);assert.equal(geometry.terrainAnchors.length,6);
 for(let i=0;i<geometry.roofs.length;i+=VERTEX_FLOATS){const id=geometry.roofs[i+12];assert.ok(isTerrainObjectId(id));groups.set(id,(groups.get(id)||0)+1);}
 assert.equal(groups.size,3);assert.ok([...groups.values()].every(n=>n>30));
 assert.deepEqual([...geometry.terrainAnchors.slice(0,2)],projectLocal(environment.features[0].geometry.coordinates));
 assert.equal(decodeTerrainObjectId(-1000),0);assert.equal(decodeTerrainObjectId(-1002),2);for(const id of [-1,-2,-4,-5,0,1,-1000.5])assert.equal(decodeTerrainObjectId(id),undefined);
 const builder=new TerrainAnchorBuilder();assert.equal(builder.add([2,3]),-1000);assert.equal(builder.add([7,8]),-1001);assert.deepEqual([...builder.finish()],[2,3,7,8]);assert.throws(()=>builder.add([NaN,3]),/finite/);
});

test('south-first DEM interpolation distinguishes valid zero from missing alpha and never manufactures sea-level fallback',()=>{
 const grid=new Float32Array([0,0,0,1,10,0,0,1,20,0,0,1,30,0,0,1]);
 assert.equal(sampleTerrainGrid(grid,2,2,0,0),0);assert.equal(sampleTerrainGrid(grid,2,2,1,1),30);assert.equal(sampleTerrainGrid(grid,2,2,.5,.5),15);
 grid[15]=0;assert.equal(sampleTerrainGrid(grid,2,2,.5,.5),null);assert.equal(sampleTerrainGrid(grid,2,2,1.01,.5),null);
 assert.equal(sampleTerrainGrid(new Float32Array(0),2,2,.5,.5),null);
});

test('terrain tile painting maps source metres exactly to tile corners and preserves repeated-world alignment',()=>{
 const z=16,x=Math.floor(MERCATOR_ORIGIN[0]*2**z),y=Math.floor(MERCATOR_ORIGIN[1]*2**z),size=1/2**z;
 const matrix=terrainTileMatrix(z,x,y),point=(mx,my)=>[(mx-MERCATOR_ORIGIN[0])/METERS_TO_MERCATOR,(MERCATOR_ORIGIN[1]-my)/METERS_TO_MERCATOR];
 for(const [p,target] of [[point(x*size,(y+1)*size),[-1,-1]],[point((x+1)*size,y*size),[1,1]]]){
  assert.ok(Math.abs(matrix[0]*p[0]+matrix[12]-target[0])<1e-6);assert.ok(Math.abs(matrix[5]*p[1]+matrix[13]-target[1])<1e-6);
 }
 assert.deepEqual(terrainTileMatrix(z,x,y,2),matrix);
});

function fakeGl(supported=true){
 const live=new Set(),uploads=[],bindings=new Map();let unit=0,id=0;
 return {live,uploads,gl:{TEXTURE_2D:1,TEXTURE_BINDING_2D:2,ACTIVE_TEXTURE:3,TEXTURE0:0,RGBA32F:4,RGBA:5,FLOAT:6,RG32F:7,RG:8,TEXTURE_MIN_FILTER:9,TEXTURE_MAG_FILTER:10,NEAREST:11,TEXTURE_WRAP_S:12,TEXTURE_WRAP_T:13,CLAMP_TO_EDGE:14,
  getExtension:name=>name==='EXT_color_buffer_float'&&supported?{}:null,createTexture(){const t={id:id++};live.add(t);return t;},deleteTexture:t=>live.delete(t),getParameter:key=>key===3?unit:bindings.get(unit)||null,bindTexture:(_target,t)=>bindings.set(unit,t),activeTexture:v=>unit=v,texImage2D:(...args)=>uploads.push(args),texParameteri(){},uniform1f(){},uniform1i(){},uniform4f(){}}};
}

test('terrain textures have bounded separate accounting, explicit capability failure and clean restoration',()=>{
 const data={type:'FeatureCollection',features:source.features.slice(0,1)},resource=new TerrainGrounding(data),fake=fakeGl(),targets=[];
 const options={renderTerrainHeightMap:target=>targets.push(target)};
 assert.throws(()=>resource.prerender(fakeGl(false).gl,options,true),/EXT_color_buffer_float/);assert.equal(resource.bytes,0);
 assert.throws(()=>resource.prerender(fake.gl,{},true),/unavailable/);
 resource.setObjects(new Float32Array([1,2,3,4]));resource.prerender(fake.gl,options,true);
 assert.equal(resource.status,'active');assert.equal(fake.live.size,2);assert.equal(targets[0].width,TERRAIN_SIZE);assert.equal(targets[0].height,TERRAIN_SIZE);
 assert.ok(targets[0].bounds[0]<targets[0].bounds[2]&&targets[0].bounds[1]<targets[0].bounds[3]);assert.ok(resource.bytes<=MAX_TERRAIN_TEXTURE_BYTES);
 assert.equal(fake.uploads.length,2);resource.prerender(fake.gl,options,true);assert.equal(fake.uploads.length,2,'moving camera re-renders DEM into existing textures instead of reallocating');
 resource.dispose(fake.gl);assert.equal(fake.live.size,0);assert.equal(resource.bytes,0);
 resource.prerender(fake.gl,options,true);assert.equal(fake.live.size,2);assert.equal(fake.uploads.length,4,'context restoration recreates both owned textures');
 resource.dispose(fake.gl);assert.equal(fake.live.size,0);
 const layout=terrainTextureLayout(new Float32Array([1,2]),new Float32Array([3,4]));assert.deepEqual([...layout.values.slice(0,4)],[1,2,3,4]);
 assert.throws(()=>terrainTextureLayout(new Float32Array(32770)),/16,384/);
});
