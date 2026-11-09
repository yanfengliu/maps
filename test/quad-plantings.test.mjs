import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectLocal} from '../src/building-geometry.ts';
import {addCampusEnvironment} from '../src/campus-environment.ts';
import {addQuadPlantings,locateQuadPlantings,quadPlantingCoverage} from '../src/quad-plantings.ts';
import {QUAD_SPECIES,QUAD_PLANTING_REFERENCE,QUAD_PLANTING_SOURCE} from '../src/quad-planting-reference.ts';
import {TREE_MATERIAL_KINDS} from '../src/tree-prototypes.ts';

const bytes=readFileSync(new URL('../public/data/stanford-environment.geojson',import.meta.url));
const data=JSON.parse(bytes),before=JSON.stringify(data);
const buildings=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url)));
const circles=locateQuadPlantings(data,projectLocal);
const inside=(p,ring)=>{let hits=0;for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if((a[1]>p[1])!==(b[1]>p[1])&&a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1])>p[0])hits++;}return hits%2===1;};
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function recorder(){const triangles=[];const mesh={triangle:(a,b,c,tint,kind,building,uv,normals)=>triangles.push({points:[a,b,c],tint,kind,building,normals}),quad:(a,b,c,d,tint,kind,building)=>{mesh.triangle(a,b,c,tint,kind,building);mesh.triangle(a,c,d,tint,kind,building);}};return {triangles,mesh};}

test('all eight circles have an auditable botanical transcription, including the formerly empty island',()=>{
  const coverage=quadPlantingCoverage();assert.equal(coverage.total,102);
  assert.deepEqual(coverage.circles.map(c=>c.count),[9,16,13,8,12,13,16,15]);
  assert.equal(coverage.source.date,'2025-10-17');assert.match(coverage.source.url,/trees\.stanford\.edu\/treewalks\/innerquadtrees-2025-10-17\.pdf$/);
  assert.match(coverage.source.positionMethod,/schematic/);assert.match(coverage.source.dimensionMethod,/not measured/);
  const ids=QUAD_PLANTING_REFERENCE.flatMap(c=>c.plants.map(p=>p.id));assert.equal(new Set(ids).size,102);assert.ok(ids.every(id=>id.startsWith('reference/')&&!/^(node|way)\//.test(id)));
  assert.ok(QUAD_PLANTING_REFERENCE.every(c=>c.plants.every(p=>QUAD_SPECIES[p.code])));
  assert.deepEqual(QUAD_PLANTING_SOURCE.omitted.map(p=>[p.circle,p.code]),[[5,'DAin']]);
  assert.ok(!QUAD_PLANTING_REFERENCE.some(c=>c.plants.some(p=>p.code==='DAin')),'the published removal note supersedes its old diagram dot');
  assert.deepEqual(coverage.circles[6].species['Cordyline australis'],8,'dotted groups are individual plants, not one label');
});

test('diagram orientation matches both campus rows and keeps every root inside its actual mapped circle and outside buildings',()=>{
  assert.equal(circles.length,8);
  const by=n=>circles.find(c=>c.number===n),east=by(5).center.map((v,i)=>v-by(8).center[i]),north=by(8).center.map((v,i)=>v-by(4).center[i]);
  const along=(a,b,v)=>(a[0]-b[0])*v[0]+(a[1]-b[1])*v[1];
  for(const row of [[4,3,2,1],[8,7,6,5]])for(let i=1;i<row.length;i++)assert.ok(along(by(row[i]).center,by(row[i-1]).center,east)>1000);
  for(const [south,n] of [[1,5],[2,6],[3,7],[4,8]])assert.ok(along(by(n).center,by(south).center,north)>500);
  const polygons=buildings.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(poly=>poly.map(r=>r.map(projectLocal)));
  for(const circle of circles){
    const mapped=data.features.find(f=>f.properties.id===circle.sourceId).geometry.coordinates.map(projectLocal);
    for(const p of circle.plants){
      assert.ok(inside(p.position,mapped),p.id+' root outside source island');
      const clearance=Math.min(...mapped.slice(1).map((b,i)=>distance(p.position,mapped[i],b)));
      assert.ok(clearance>0.5,p.id+' trunk intersects the seat-wall footprint');
      for(const polygon of polygons)assert.ok(!inside(p.position,polygon[0])||polygon.slice(1).some(r=>inside(p.position,r)),p.id+' lies inside building material');
      // Left/right and up/down dot signs must survive the diagram transform.
      const u=along(p.position,circle.center,east),v=along(p.position,circle.center,[-east[1],east[0]]);
      assert.ok(u*p.u>=-1e-8&&v*p.v>=-1e-8,'diagram axis mirrored');
    }
  }
});

test('only mapped trees within the eight rings are superseded; original identities, bytes and other environments survive',()=>{
  const {mesh}=recorder(),result=addQuadPlantings(mesh,data,projectLocal);
  const replaced=data.features.filter(f=>f.properties.kind==='tree'&&result.containsMappedTree(f.geometry.coordinates));
  assert.equal(replaced.length,13);assert.ok(replaced.every(f=>f.properties.species==='Phoenix canariensis'));
  const expected=new Set(data.features.filter(f=>f.properties.kind==='tree'&&circles.some(c=>inside(projectLocal(f.geometry.coordinates),[...c.ring,c.ring[0]]))).map(f=>f.properties.id));
  assert.deepEqual(new Set(replaced.map(f=>f.properties.id)),expected);
  assert.equal(circles[6].plants.length,16);assert.ok(!replaced.some(f=>inside(projectLocal(f.geometry.coordinates),[...circles[6].ring,circles[6].ring[0]])),'formerly empty island needs sourced plants despite no OSM tree');
  const counts=addCampusEnvironment(recorder().mesh,data,projectLocal);
  assert.deepEqual(counts,{trees:815,palms:347,broadleaf:438,conifers:30,benches:196,lamps:80});
  assert.equal(JSON.stringify(data),before);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'d9c056c55c154a98bf33309477155f0731aef3d58039bff7f6a099f87a1b6fa0');
  const small={type:'FeatureCollection',features:[replaced[0]]};assert.equal(addCampusEnvironment(recorder().mesh,small,projectLocal).trees,1,'isolated source callers must retain their supplied trees');
});

test('reference geometry has low shrubs, documented varied crowns, eight bounded groundcovers, finite triangles and a strict cost cap',()=>{
  const {mesh,triangles}=recorder(),result=addQuadPlantings(mesh,data,projectLocal);
  assert.deepEqual(result.counts,{trees:102,palms:23,broadleaf:75,conifers:4});
  assert.ok(triangles.length>4000&&triangles.length<=5815+2500,'crown refinement may use only its additional 2,500-triangle reservation');
  assert.ok(triangles.length*3*44<1100000);
  const shapes=new Set(QUAD_PLANTING_REFERENCE.flatMap(c=>c.plants.map(p=>QUAD_SPECIES[p.code].shape)));assert.equal(shapes.size,8);
  for(const triangle of triangles){
    assert.equal(triangle.building,-2);assert.ok([10,11,12,...TREE_MATERIAL_KINDS].includes(triangle.kind));
    assert.ok(triangle.points.flat().every(Number.isFinite));assert.ok(triangle.points.every(p=>p[2]>=0&&p[2]<=17));
    const [a,b,c]=triangle.points,ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);assert.ok(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])>1e-8,'no collapsed triangles');
    if(triangle.kind===12)assert.ok(circles.some(c=>triangle.points.every(p=>inside(p,[...c.ring,c.ring[0]]))),'groundcover crosses a planter boundary');
  }
  for(const circle of circles)assert.ok(triangles.some(t=>t.kind===12&&Math.hypot(t.points[0][0]-circle.center[0],t.points[0][1]-circle.center[1])<0.01),'each planter needs groundcover');
  assert.ok(QUAD_SPECIES.CRja.height<1&&QUAD_SPECIES.JUsp.height<1,'diagram dwarf conifers must not inherit generic tall tree dimensions');
  assert.ok(QUAD_SPECIES.BRdi.height<4,'the 2024 replacement is a young tree');
});

test('groundcover does not reveal radial wedges',()=>{
  const {mesh,triangles}=recorder();addQuadPlantings(mesh,data,projectLocal);
  const cover=triangles.filter(t=>t.kind===12);
  assert.equal(new Set(cover.map(t=>t.tint.join(','))).size,1,'shared planar triangles must not alternate planting colors');
});

test('fan palms have full arched crowns with hanging fans rather than horizontal umbrellas',()=>{
  const {mesh,triangles}=recorder();addQuadPlantings(mesh,data,projectLocal);
  const palm=circles[7].plants.find(p=>p.code==='WAro'),{height,radius}=QUAD_SPECIES.WAro;
  // This tall outer-NW specimen is isolated above its neighboring shrubs. The
  // check measures emitted geometry independently of the tier construction.
  const crown=triangles.filter(t=>t.kind===10&&t.points.every(p=>p[2]>height-radius*1.7&&Math.hypot(p[0]-palm.position[0],p[1]-palm.position[1])<radius*1.05));
  assert.ok(crown.length>=180,'a few disconnected diamond paddles cannot fill the crown');
  const vertices=crown.flatMap(t=>t.points),zs=vertices.map(p=>p[2]),base=height-radius*0.45;
  assert.ok(Math.max(...zs)-Math.min(...zs)>radius*1.1,'fans need a rounded vertical silhouette');
  assert.ok(vertices.some(p=>p[2]<base-radius*0.7),'lower fronds must hang below the crown center');
  assert.ok(vertices.some(p=>p[2]>base+radius*0.35),'new upright fronds must fill the crown top');
  let tilted=0;
  for(const {points:[a,b,c]} of crown){
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(Math.abs(normal[2])/Math.hypot(...normal)<0.8)tilted++;
  }
  assert.ok(tilted/crown.length>0.45,'a crown must not collapse into horizontal umbrellas');
});
