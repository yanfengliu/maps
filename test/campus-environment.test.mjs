import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildBuildingGeometry,BuildingGeometryBuilder,prepareBuildingDetails,projectLocal,VERTEX_FLOATS} from '../src/building-geometry.ts';
import {validateCampusEnvironment,environmentDimensions,addCampusEnvironment} from '../src/campus-environment.ts';
import {footprintClearance} from '../tools/data/build-campus-environment.mjs';

const load=name=>readFileSync(new URL('../public/data/'+name,import.meta.url));
const bytes=load('stanford-environment.geojson'),environment=validateCampusEnvironment(JSON.parse(bytes));
const provenance=JSON.parse(load('stanford-environment-provenance.json'));
const source=JSON.parse(load('stanford-buildings.geojson'));
const campus=JSON.parse(load('stanford-campus.geojson')).features[0].geometry.coordinates[0];
const prepared=prepareBuildingDetails(source);
const geometry=buildBuildingGeometry(prepared,environment);
const empty={type:'FeatureCollection',features:[]};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Separate ray/segment oracle works in the precise renderer metre frame.
const inside=(p,ring)=>{let hits=0;for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if((a[1]>p[1])!==(b[1]>p[1])&&a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1])>p[0])hits++;}return hits%2===1;};
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy,t=q?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/q)):0;return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);};

test('bounded ODbL environment input has pinned positions, source hashes and explicit exclusions, with no generated planting grid',()=>{
  assert.equal(digest(bytes),'554f290a952942cbc323e8171986b31f465f4b5fc8e50abe34d1680a61725317');
  assert.equal(provenance.outputs['stanford-environment.geojson'].sha256,digest(bytes));
  assert.equal(provenance.license,'ODbL 1.0');assert.equal(environment.features.length,1002);
  assert.deepEqual(provenance.beforeExclusions,{tree:728,bench:166,lamp:81});
  assert.deepEqual(provenance.retained,{tree:726,bench:196,lamp:80});assert.equal(provenance.excluded.length,6);
  assert.deepEqual(provenance.sources.map(s=>s.sha256),JSON.parse(load('stanford-provenance.json')).sources.map(s=>s.sha256));
  const palm=environment.features.find(f=>f.properties.id==='node/6475091349');
  assert.deepEqual(palm.geometry.coordinates,[-122.171698,37.4278552]);assert.equal(palm.properties.species,'Phoenix canariensis');
  for(const feature of environment.features){assert.match(feature.properties.id,/^(node|way)\/\d+$/);for(const point of feature.geometry.type==='Point'?[feature.geometry.coordinates]:feature.geometry.coordinates)assert.ok(inside(point,campus));assert.equal(feature.properties.authored,undefined);}
  assert.equal(environment.features.filter(f=>f.geometry.type==='Point').length,969);
  assert.deepEqual(provenance.benchLines,{mapped:25,quadSeatWalls:8,excluded:[]});
});

test('mapped roots and furniture stay outside actual building material, preserve courtyard planting, and enforce wall clearance',()=>{
  const polygons=source.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(p=>p.map(r=>r.map(projectLocal)));
  for(const feature of environment.features){
    for(const coordinate of feature.geometry.type==='Point'?[feature.geometry.coordinates]:feature.geometry.coordinates){
    const point=projectLocal(coordinate);
    for(const polygon of polygons){
      assert.ok(!inside(point,polygon[0])||polygon.slice(1).some(r=>inside(point,r)),feature.properties.id+' is inside building material');
      for(const ring of polygon)for(let i=1;i<ring.length;i++)assert.ok(distance(point,ring[i-1],ring[i])>0.63,feature.properties.id+' has no root clearance');
    }
    }
  }
  // An exclusion predicate that only tests the outer ring would wrongly erase
  // the real Inner Quad planting. A filled hole must return an exclusion.
  const fixture=[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]];
  assert.equal(footprintClearance([1,1],[fixture]),-1);
  assert.equal(footprintClearance([5,5],[fixture]),2);
  assert.equal(footprintClearance([5,5],[[fixture[0]]]),-1);
});

test('all combined building and environment geometry stays finite within approved 160k triangles and 24MiB in two buffers',()=>{
  assert.equal(geometry.buildings,648);assert.ok(geometry.triangles<160000);assert.ok(geometry.bytes<24*1024*1024);
  assert.deepEqual(geometry.environment,{trees:726,palms:337,broadleaf:363,conifers:26,benches:196,lamps:80});
  let environmentVertices=0;
  for(const mesh of [geometry.roofs,geometry.facades])for(let i=0;i<mesh.length;i+=VERTEX_FLOATS){
    assert.ok(mesh.slice(i,i+VERTEX_FLOATS).every(Number.isFinite));
    const id=mesh[i+12],kind=mesh[i+11];
    if(id<0){
      assert.equal(id,-2,'environment may never use selected=-1, which would highlight every tree by default');
      assert.ok([10,11,12].includes(kind),'foliage and furniture must not acquire facade windows or roof tiles');
      assert.ok(mesh[i+2]>=0&&mesh[i+2]<=28);environmentVertices++;
    }else{
      assert.ok(id<648&&Number.isInteger(id));assert.ok(mesh[i+2]<=source.features[id].properties.height+0.0001);assert.ok(mesh[i+2]>=source.features[id].properties.base-0.0001);
    }
  }
  assert.ok(environmentVertices>100000,'the render buffers must contain the sourced planting, not just report its count');
  const builder=new BuildingGeometryBuilder(prepared,environment);while(!builder.done)builder.step();const first=builder.finish();assert.equal(builder.finish(),first,'repeated reads must not duplicate trees or reset their counts');
});

// Independent emitted-geometry oracle: this does not use the production angle helper.
function benchTriangles(feature){
  const result=[],mesh={triangle:(a,b,c,tint,kind,building)=>result.push({points:[a,b,c],tint,kind,building}),quad:(a,b,c,d,tint,kind,building)=>{mesh.triangle(a,b,c,tint,kind,building);mesh.triangle(a,c,d,tint,kind,building);}};
  addCampusEnvironment(mesh,{type:'FeatureCollection',features:[feature]},projectLocal);return result;
}
const fixtureBench=properties=>({type:'Feature',properties:{id:'node/123',version:1,kind:'bench',material:'wood',backrest:'yes',...properties},geometry:{type:'Point',coordinates:[-122.1697,37.4278]}});
test('numeric and cardinal bench direction is seated facing, with the back behind it and solid supports',()=>{
  for(const [direction,front] of [[0,[0,1]],['N',[0,1]],[90,[1,0]],['E',[1,0]],[180,[0,-1]],['SW',[-Math.SQRT1_2,-Math.SQRT1_2]]]){
    const triangles=benchTriangles(fixtureBench({direction}));
    const high=triangles.flatMap(t=>t.points).filter(p=>p[2]>0.5),dot=high.map(p=>p[0]*front[0]+p[1]*front[1]);
    assert.ok(Math.max(...dot)<-0.19,`${direction}: back is not behind the seated facing normal`);
    const low=triangles.filter(t=>t.points.every(p=>p[2]<=0.41));
    const projections=low.flatMap(t=>t.points).map(p=>p[0]*front[0]+p[1]*front[1]);
    assert.ok(Math.max(...projections)-Math.min(...projections)>0.39,'supports have physical depth, not paper-thin planes');
    assert.ok(low.some(t=>{const [a,b,c]=t.points;return a[2]===b[2]&&b[2]===c[2]&&Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>0.01;}),'supports have non-zero horizontal caps');
  }
});

test('mapped unknown seats are neutral flat markers; wood/concrete/backrests and photographed teak remain distinct',()=>{
  const unknown=benchTriangles(fixtureBench({material:undefined,backrest:undefined}));
  assert.equal(unknown.length,2);assert.ok(unknown.flatMap(t=>t.points).every(p=>p[2]===0.025));
  assert.ok(unknown.every(t=>t.tint[0]<t.tint[1]),'unknown material must not silently receive brown wood');
  const concrete=benchTriangles(fixtureBench({material:'concrete',backrest:'no'}));
  assert.ok(concrete.flatMap(t=>t.points).every(p=>p[2]<=0.46));assert.ok(concrete.some(t=>t.tint[0]>0.7));
  const wood=benchTriangles(fixtureBench({backrest:'no'}));assert.ok(wood.flatMap(t=>t.points).every(p=>p[2]<=0.46));
  const photographed=benchTriangles(fixtureBench({benchModel:'courtyard-teak'}));
  const high=photographed.flatMap(t=>t.points).filter(p=>p[2]>0.6);
  assert.ok(high.some(p=>p[1]>0.2),'photographed curved arms must reach forward');
  assert.ok(new Set(high.map(p=>p[0].toFixed(3))).size>20,'photographed backs need separated vertical spindles');
  const p=photographed.flatMap(t=>t.points);assert.ok(Math.abs(Math.max(...p.map(v=>v[0]))-Math.min(...p.map(v=>v[0]))-1.83)<0.001);
});

test('all bench solids and ribbons clear building material, preserve mapped curves, and do not duplicate point seats',()=>{
  const polygons=source.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(p=>p.map(r=>r.map(projectLocal)));
  const inMaterial=p=>polygons.some(polygon=>inside(p,polygon[0])&&!polygon.slice(1).some(r=>inside(p,r)));
  const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const cross=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<-1e-10&&orient(c,d,a)*orient(c,d,b)<-1e-10;
  const benches=environment.features.filter(f=>f.properties.kind==='bench');
  let minimum=Infinity;
  for(const feature of benches){
    for(const triangle of benchTriangles(feature)){
      for(const p of triangle.points){assert.ok(!inMaterial(p),feature.properties.id+' has a solid vertex in a building');for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++)minimum=Math.min(minimum,distance(p,ring[i-1],ring[i]));}
      for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++)for(let edge=0;edge<3;edge++)assert.ok(!cross(triangle.points[edge],triangle.points[(edge+1)%3],ring[i-1],ring[i]),feature.properties.id+' crosses a building wall');
    }
    if(feature.geometry.type==='LineString')for(const point of benches.filter(f=>f.geometry.type==='Point')){
      const p=projectLocal(point.geometry.coordinates),line=feature.geometry.coordinates.map(projectLocal);
      assert.ok(line.slice(1).every((b,i)=>distance(p,line[i],b)>1.0),feature.properties.id+' duplicates '+point.properties.id);
    }
  }
  assert.ok(minimum>0.1,'the complete emitted seat envelope needs positive wall clearance');
  const curved=environment.features.find(f=>f.properties.id==='way/1505422554');assert.equal(curved.geometry.coordinates.length,16);assert.equal(curved.properties.material,'stone');
  const walls=benches.filter(f=>f.properties.benchModel==='quad-seat-wall');assert.equal(walls.length,8);
  for(const wall of walls){assert.deepEqual(wall.geometry.coordinates[0],wall.geometry.coordinates.at(-1));const mesh=benchTriangles(wall);assert.equal(mesh.length,(wall.geometry.coordinates.length-1)*6);assert.ok(mesh.flatMap(t=>t.points).every(p=>p[2]===0||p[2]===0.45));assert.equal(wall.properties.material,undefined,'modeled concrete interpretation must not invent a source material tag');}
  // A real full-length triangle can cross a narrow wall while all its endpoints
  // are outside it. This negative catches a vertex-only clearance oracle.
  assert.ok(cross([-2,0],[2,0],[0,-1],[0,1]));
});

test('actual emitted palm, broadleaf and conifer silhouettes differ; untagged size stays an estimate',()=>{
  const one=properties=>({type:'FeatureCollection',features:[{type:'Feature',properties:{id:'node/123',version:1,kind:'tree',...properties},geometry:{type:'Point',coordinates:[-122.1697,37.4278]}}]});
  const make=properties=>buildBuildingGeometry(empty,one(properties));
  const palm=make({species:'Phoenix canariensis'}),broadleaf=make({leaf_type:'broadleaved'}),conifer=make({leaf_type:'needleleaved'});
  const vertices=g=>{const result=[];for(let i=0;i<g.roofs.length;i+=VERTEX_FLOATS)if(g.roofs[i+11]===10)result.push([...g.roofs.slice(i,i+3)]);return result;};
  const extent=g=>{const points=vertices(g);return {low:Math.min(...points.map(p=>p[2])),high:Math.max(...points.map(p=>p[2])),width:Math.max(...points.map(p=>Math.hypot(p[0],p[1])))};};
  const p=extent(palm),b=extent(broadleaf),c=extent(conifer);
  assert.ok(p.low/p.high>0.68,'palms need a high crown over a tall exposed trunk');
  assert.ok(b.low/b.high<0.4,'broadleaf crowns start much lower than palm fronds');
  assert.ok(c.low/c.high<0.4);assert.ok(p.width>3&&b.width>2&&c.width>2);
  assert.notEqual(palm.roofTriangles,broadleaf.roofTriangles);assert.notDeepEqual(vertices(broadleaf),vertices(conifer));
  const huge=environmentDimensions({id:'node/1',kind:'tree',version:1,height:'1000',diameter_crown:'1000'});
  assert.equal(huge.height,28);assert.ok(huge.radius<9,'unbounded dimensions cannot exhaust the finite scene');
});

test('material families differentiate sandstone, pink Roble, modern light roofs and historic tile without overwriting source tags',()=>{
  const find=id=>prepared.features.find(f=>f.properties.id===id).properties;
  assert.equal(find('way/232805733').detailWallColor,'#c8aaa0');
  assert.notEqual(find('relation/35820').detailWallColor,find('way/232805733').detailWallColor);
  const modern=prepared.features.find(f=>f.properties.detailArchitecture.profile==='modern'&&f.properties.detailArchitecture.roofShape==='flat');
  assert.equal(modern.properties.detailRoofColor,'#c1cbc7');assert.equal(modern.properties.roofColor,'#b96f54');
  const roble=source.features.findIndex(f=>f.properties.id==='way/232805733'),bing=source.features.findIndex(f=>f.properties.id==='way/232805680');
  for(const index of [roble,bing]){
    let relief=0;for(let i=0;i<geometry.facades.length;i+=VERTEX_FLOATS)if(geometry.facades[i+12]===index&&geometry.facades[i+11]===2)relief++;
    assert.ok(relief>300,'photo-grounded entrances need actual trim geometry as well as a flat window mask');
  }
  let ivyVertices=0,plainVertices=0;
  for(let i=0;i<geometry.facades.length;i+=VERTEX_FLOATS)if(geometry.facades[i+12]===roble){
    const kind=geometry.facades[i+11];if(kind===13){assert.ok(geometry.facades[i+3]*0.49+geometry.facades[i+4]*0.87>0.7,'ivy escaped the photographed front-facing elevations');ivyVertices++;}if(kind===4)plainVertices++;
  }
  assert.ok(ivyVertices>=12&&plainVertices>=12,'the model must preserve both photographed ivy panels and plain pink stone on untreated elevations');
});

test('planar roof optimization preserves independent source area and a real courtyard at the full source height',()=>{
  const outer=[[-122.1700,37.4270],[-122.1696,37.4270],[-122.1696,37.4274],[-122.1700,37.4274],[-122.1700,37.4270]];
  const hole=[[-122.1699,37.4271],[-122.1699,37.4273],[-122.1697,37.4273],[-122.1697,37.4271],[-122.1699,37.4271]];
  const fixture={type:'FeatureCollection',features:[{type:'Feature',properties:{id:'test/flat-courtyard',base:0,height:12,building:'hospital','osm:roof:shape':'flat'},geometry:{type:'Polygon',coordinates:[outer,hole]}}]};
  const mesh=buildBuildingGeometry(prepareBuildingDetails(fixture));
  const signed=ring=>ring.slice(1).reduce((sum,b,i)=>sum+ring[i][0]*b[1]-b[0]*ring[i][1],0)/2;
  const expected=Math.abs(signed(outer.map(projectLocal)))-Math.abs(signed(hole.map(projectLocal)));
  let total=0,triangles=0;
  for(let i=0;i<mesh.roofs.length;i+=VERTEX_FLOATS*3)if(mesh.roofs[i+11]===9){
    const points=[0,1,2].map(j=>[...mesh.roofs.slice(i+j*VERTEX_FLOATS,i+j*VERTEX_FLOATS+3)]);
    total+=Math.abs(signed([...points,points[0]]));triangles++;
    for(const point of points)assert.ok(Math.abs(point[2]-12)<0.00001);
    const center=[0,1].map(axis=>points.reduce((sum,p)=>sum+p[axis]/3,0));assert.ok(!inside(center,hole.map(projectLocal)));
  }
  assert.equal(triangles,8,'a flat eight-corner polygon with a four-corner courtyard needs eight source triangles, with no redundant subdivisions');
  assert.ok(Math.abs(total-expected)<0.001,'optimization changed the actual projected roof area');
});

test('invalid, duplicate and out-of-campus environment inputs fail explicitly before mesh allocation',()=>{
  assert.throws(()=>validateCampusEnvironment({type:'FeatureCollection',features:new Array(1201)}),/at most 1,200/);
  const changed=structuredClone(environment);changed.features.push(structuredClone(changed.features[0]));assert.throws(()=>validateCampusEnvironment(changed),/invalid identity, kind or Stanford coordinate/);
  const outside=structuredClone(environment);outside.features[0].geometry.coordinates=[0,0];assert.throws(()=>validateCampusEnvironment(outside),/Restore the pinned environment input/);
  for(const coordinates of [null,'broken',[],[[0,0]],[[NaN,37.427],[-122.17,37.427]]])assert.throws(()=>validateCampusEnvironment({type:'FeatureCollection',features:[{type:'Feature',properties:{id:'way/1',version:1,kind:'bench'},geometry:{type:'LineString',coordinates}}]}),/invalid identity, kind or Stanford coordinate/);
});
