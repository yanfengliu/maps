import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TerrainAnchorBuilder,TerrainGrounding,TERRAIN_SIZE,MAX_TERRAIN_TEXTURE_BYTES,buildingTerrainAnchors,terrainTextureLayout,sampleTerrainGrid,decodeTerrainObjectId,isTerrainObjectId,terrainTileMatrix,BAY_TERRAIN_BOUNDS} from '../src/terrain-grounding.ts';
import {createStyle} from '../src/style.ts';
import {projectLocal,MERCATOR_ORIGIN,METERS_TO_MERCATOR,prepareBuildingDetails,buildBuildingGeometry,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {buildChurchInterior,CHURCH_ID} from '../src/church-interior.ts';
import {HOOVER_PART_IDS} from '../src/hoover-architecture.ts';
import {STADIUM_CONCOURSE_ID,STADIUM_SEATING_IDS} from '../src/stadium-architecture.ts';
import {elevationTileCoverage,MAX_ELEVATION_TILES} from '../src/campus-elevation.ts';
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

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const completeGrid=()=>{const grid=new Float32Array(TERRAIN_SIZE*TERRAIN_SIZE*4);for(let i=0;i<grid.length;i+=4){grid[i]=28;grid[i+3]=1;}return grid;};

test('fresh offscreen stadium anchors use a complete campus grid and retain bounded textures across camera and context changes',async()=>{
 const data=prepareBuildingDetails(structuredClone(source)),fake=fakeGl(false),grid=completeGrid();let calls=0,bounds;
 const resource=new TerrainGrounding(data,()=>{},async(value,size)=>{calls++;bounds=value;assert.equal(size,TERRAIN_SIZE);return grid;});
 const options={renderTerrainHeightMap:()=>assert.fail('viewport-only terrain capture must never be used')};
 resource.setObjects(new Float32Array([1,2,3,4]));resource.prerender(fake.gl,options,true);
 assert.equal(resource.status,'loading');assert.equal(resource.bytes,0);await tick();resource.prerender(fake.gl,options,true);
 assert.equal(resource.status,'active');assert.equal(fake.live.size,2);assert.equal(calls,1);
 assert.equal(elevationTileCoverage(bounds).length,MAX_ELEVATION_TILES);assert.ok(resource.bytes<=MAX_TERRAIN_TEXTURE_BYTES);
 assert.equal(fake.uploads[0][8],grid);assert.equal(fake.uploads.length,2);
 const anchors=buildingTerrainAnchors(data),stadium=data.features.findIndex(f=>f.properties.id===STADIUM_CONCOURSE_ID),anchor=[anchors[stadium*2],anchors[stadium*2+1]];
 const mercator=[MERCATOR_ORIGIN[0]+anchor[0]*METERS_TO_MERCATOR,MERCATOR_ORIGIN[1]-anchor[1]*METERS_TO_MERCATOR];
 assert.equal(sampleTerrainGrid(grid,256,256,(mercator[0]-bounds[0])/(bounds[2]-bounds[0]),(bounds[3]-mercator[1])/(bounds[3]-bounds[1])),28,'stadium datum exists without ever viewing the shared center');
 const pressbox=projectLocal([-122.161929,37.4337265]);assert.ok(Math.hypot(pressbox[0]-anchor[0],pressbox[1]-anchor[1])>50,'regression viewpoint is materially separated from assembly datum');
 const environment=JSON.parse(readFileSync(new URL('../public/data/stanford-environment.geojson',import.meta.url)));
 for(const feature of environment.features)for(const p of feature.geometry.type==='Point'?[feature.geometry.coordinates]:feature.geometry.coordinates)assert.doesNotThrow(()=>resource.setObjects(new Float32Array(projectLocal(p))),'every mapped environment point is covered');
 resource.prerender(fake.gl,options,true,2);assert.equal(calls,1,'world copy/camera changes never refetch the DEM');
 resource.dispose(fake.gl);assert.equal(fake.live.size,0);assert.equal(resource.bytes,0);
 resource.prerender(fake.gl,options,true);assert.equal(resource.status,'active');assert.equal(fake.live.size,2);assert.equal(calls,1);
 resource.dispose(fake.gl);assert.equal(fake.live.size,0);
 const recreated=new TerrainGrounding(data,()=>{},()=>assert.fail('completed CPU grid must survive new custom layer creation'));
 recreated.prerender(fake.gl,options,true);assert.equal(recreated.status,'active');recreated.dispose(fake.gl);
 const layout=terrainTextureLayout(new Float32Array([1,2]),new Float32Array([3,4]));assert.deepEqual([...layout.values.slice(0,4)],[1,2,3,4]);
 assert.throws(()=>terrainTextureLayout(new Float32Array(32770)),/16,384/);
});

test('pending DEM requests abort on removal, late results cannot publish, and failed or incomplete loads can retry',async()=>{
 const data=prepareBuildingDetails(structuredClone(source)),fake=fakeGl();let release,signal,changed=0;
 const resource=new TerrainGrounding(data,()=>changed++,async(_bounds,_size,value)=>{signal=value;return new Promise(resolve=>release=resolve);});
 resource.prerender(fake.gl,{},true);resource.dispose(fake.gl);assert.equal(signal.aborted,true);release(completeGrid());await tick();assert.equal(changed,0);assert.equal(fake.live.size,0);
 const failed=new TerrainGrounding(data,()=>changed++,async()=>{throw new Error('HTTP 503');});failed.prerender(fake.gl,{},true);await tick();
 assert.throws(()=>failed.prerender(fake.gl,{},true),/Campus elevation.*Retry.*503/);failed.dispose(fake.gl);
 const missing=new TerrainGrounding(data,()=>{},async()=>new Float32Array(TERRAIN_SIZE*TERRAIN_SIZE*4));missing.prerender(fake.gl,{},true);await tick();assert.throws(()=>missing.prerender(fake.gl,{},true),/incomplete/);missing.dispose(fake.gl);
 const retry=new TerrainGrounding(data,()=>{},async()=>completeGrid());retry.prerender(fake.gl,{},true);await tick();retry.prerender(fake.gl,{},true);assert.equal(retry.status,'active');
 assert.throws(()=>retry.setObjects(new Float32Array([1e8,2])),/outside verified elevation/);retry.dispose(fake.gl);assert.equal(fake.live.size,0);
});
