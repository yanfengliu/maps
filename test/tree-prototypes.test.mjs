import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TREE_MATERIAL,TREE_MATERIAL_KINDS,TREE_VARIANTS,treePrototype,treeVariant,mappedTreeForm,addTreePrototype} from '../src/tree-prototypes.ts';
import {addCampusEnvironment,environmentDimensions} from '../src/campus-environment.ts';
import {buildBuildingGeometry,prepareBuildingDetails,projectLocal} from '../src/building-geometry.ts';
import {MAX_DETAIL_TRIANGLES,MAX_GPU_GEOMETRY_BYTES,gpuGeometryBytes} from '../src/gpu-geometry.ts';
import {TerrainAnchorBuilder,decodeTerrainObjectId} from '../src/terrain-grounding.ts';

const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url)));
const prototypes=Object.entries(TREE_VARIANTS).flatMap(([form,count])=>Array.from({length:count},(_,v)=>treePrototype(form,v)));
const recorder=()=>{
  const triangles=[],mesh={triangle(a,b,c,tint,kind,id,uv,normals){triangles.push({points:[a,b,c],tint,kind,id,uv,normals});},quad(a,b,c,d,tint,kind,id){this.triangle(a,b,c,tint,kind,id);this.triangle(a,c,d,tint,kind,id);}};
  return {mesh,triangles};
};
const area=([a,b,c])=>{const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);};
const leafKinds=[TREE_MATERIAL.leaf,TREE_MATERIAL.feather,TREE_MATERIAL.fan,TREE_MATERIAL.needle];

test('a small immutable prototype library is reused by stable source identity without changing botanical families',()=>{
  assert.equal(prototypes.length,10);
  for(const [form,count] of Object.entries(TREE_VARIANTS)){
    const assignments=Array.from({length:200},(_,i)=>treeVariant(`node/${i}`,form));
    assert.equal(new Set(assignments).size,count,'all variants should be reusable rather than one generated mesh per instance');
    assert.deepEqual(assignments,Array.from({length:200},(_,i)=>treeVariant(`node/${i}`,form)));
    assert.equal(new Set(Array.from({length:count},(_,v)=>JSON.stringify(treePrototype(form,v).triangles))).size,count,'variants must have distinct geometry');
    for(let variant=0;variant<count;variant++){
      const p=treePrototype(form,variant);assert.equal(p,treePrototype(form,variant));
      assert.throws(()=>{p.triangles[0].points[0][0]=100;},TypeError);
      assert.throws(()=>{p.triangles.push(p.triangles[0]);},TypeError);
    }
  }
  assert.equal(mappedTreeForm({species:'Phoenix canariensis'},'palm'),'feather');
  assert.equal(mappedTreeForm({genus:'Washingtonia'},'palm'),'fan');
  assert.equal(mappedTreeForm({species:'Livistona australis'},'palm'),'fan');
  assert.equal(mappedTreeForm({},'palm'),'feather','unknown palms keep the existing fallback, without inventing a species');
  assert.equal(mappedTreeForm({},'broadleaf'),'broadleaf');assert.equal(mappedTreeForm({},'conifer'),'conifer');
  assert.throws(()=>treePrototype('feather',3));assert.throws(()=>treePrototype('conifer',-.1));
});

test('every prototype stays inside the recorded height/crown envelope with finite noncollapsed faces and unit normals',()=>{
  // Redistribute the same scene reservation from solid crowns into arching
  // fronds. The exact whole-scene triangle and GPU caps below are unchanged.
  const caps={feather:72,fan:76,broadleaf:44,conifer:208};
  for(const p of prototypes){
    assert.ok(p.triangles.length<=caps[p.form],`${p.form}/${p.variant} exceeds its tree allocation`);
    for(const t of p.triangles){
      assert.ok(TREE_MATERIAL_KINDS.includes(t.kind));assert.ok(area(t.points)>1e-8);
      assert.equal(t.points.length,3);assert.equal(t.uv.length,3);assert.equal(t.normals.length,3);
      for(const point of t.points){assert.ok(point.every(Number.isFinite));assert.ok(point[2]>=0&&point[2]<=1,`${p.form} height ${point[2]}`);assert.ok(Math.hypot(point[0],point[1])<=1.01,`${p.form} radius`);}
      for(const n of t.normals)assert.ok(Math.abs(Math.hypot(...n)-1)<1e-10);
      assert.ok(t.uv.flat().every(Number.isFinite));
    }
    const z=p.triangles.flatMap(t=>t.points.map(p=>p[2]));
    assert.equal(Math.min(...z),0);assert.equal(Math.max(...z),1);
  }
});

test('feather palms contain arching nonplanar fronds, upright new leaves and descending tips, not twelve solid diamond paddles',()=>{
  for(let variant=0;variant<TREE_VARIANTS.feather;variant++){
    const p=treePrototype('feather',variant),leaves=p.triangles.filter(t=>t.kind===TREE_MATERIAL.feather);
    const groups=new Map();
    for(const t of leaves){
      // The closed growing point uses a tiny solid UV region; full fronds span
      // their own 0..1 longitudinal range for derivative-filtered leaflet gaps.
      if(Math.max(...t.uv.map(p=>Math.abs(p[0])))<.5)continue;
      const group=Math.floor(t.uv[0][1]/2),a=groups.get(group)??[];a.push(t);groups.set(group,a);
    }
    assert.ok(groups.size>=14,'several curved fronds must fill each crown within its unchanged Quad allocation');
    let hanging=0,upright=0,curved=0;
    for(const [id,faces] of groups){
      const samples=faces.flatMap(t=>t.points.map((p,i)=>({p,u:t.uv[i][0],t:t.uv[i][1]-2*id}))),base=samples.filter(s=>s.t<.1),middle=samples.filter(s=>s.t>.3&&s.t<.7),tip=samples.filter(s=>s.t>.9);
      assert.ok(base.length&&middle.length&&tip.length);assert.ok(samples.some(s=>s.u<-.5)&&samples.some(s=>s.u>.5),'leaflet UVs must cover both sides of each rachis');
      const middleZ=Math.max(...middle.map(s=>s.p[2])),tipZ=Math.max(...tip.map(s=>s.p[2])),baseZ=Math.max(...base.map(s=>s.p[2]));
      if(tipZ<baseZ-.08)hanging++;if(tipZ>.95)upright++;if(middleZ>Math.max(baseZ,tipZ)+.04)curved++;
      assert.ok(faces.some(t=>t.normals.some(n=>Math.abs(n[2])<.95)),'the frond needs a tilted surface visible in profile');
    }
    assert.ok(hanging>=4&&upright>=4&&curved>=Math.ceil(groups.size/2),'the crown needs a mixture of growing, spreading and hanging fronds');
    assert.ok(leaves.some(t=>t.points.some(p=>Math.hypot(p[0],p[1])<1e-8&&p[2]>.99)),'the growing point must close the upper center, not leave an annular hole');
  }
});

test('broadleaf trunks fork below irregular crowns and conifers retain narrowing layered silhouettes',()=>{
  for(const p of prototypes.filter(p=>p.form==='broadleaf')){
    const branches=p.triangles.filter(t=>t.kind===TREE_MATERIAL.bark).flatMap(t=>t.points).filter(v=>v[2]>.5);
    assert.ok(branches.some(v=>v[0]<-.3)&&branches.some(v=>v[0]>.3),'visible forked branches must connect the trunk to both crown sides');
    const outline=p.triangles.filter(t=>t.kind===TREE_MATERIAL.leaf).flatMap(t=>t.points).filter(v=>v[2]>.4&&v[2]<.6);
    assert.ok(Math.max(...outline.map(v=>Math.hypot(v[0],v[1])))-Math.min(...outline.map(v=>Math.hypot(v[0],v[1])))>.1,'the canopy should not be a circular extrusion');
  }
  for(const p of prototypes.filter(p=>p.form==='conifer')){
    const points=p.triangles.filter(t=>t.kind===TREE_MATERIAL.needle).flatMap(t=>t.points),low=points.filter(v=>v[2]<.4),high=points.filter(v=>v[2]>.7);
    assert.ok(Math.max(...low.map(v=>Math.hypot(v[0],v[1])))>Math.max(...high.map(v=>Math.hypot(v[0],v[1])))*1.8);
    assert.ok(new Set(points.map(v=>v[2].toFixed(4))).size>12,'conifers must have independently angled branch layers');
    const boughs=new Set(p.triangles.filter(t=>t.kind===TREE_MATERIAL.needle).map(t=>Math.floor((t.uv[0][1]+1.001)/4)));
    assert.ok(boughs.size>=48,'the rejected twelve-spray tree left sparse leaf-like planes instead of a dense branched silhouette');
  }
});

test('broadleaf branch sprays are distributed bent surfaces with several orientations, not closed crown shells or one billboard',()=>{
  const projectedArea=(faces,direction)=>faces.reduce((sum,t)=>{
    const [a,b,c]=t.points,u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    return sum+Math.abs(cross.reduce((s,n,i)=>s+n*direction[i],0));
  },0);
  const viewRatio=faces=>{
    const areas=[];for(const elevation of [0,.4,.85,Math.PI/2])for(let j=0;j<24;j++)areas.push(projectedArea(faces,[Math.cos(j*Math.PI/12)*Math.cos(elevation),Math.sin(j*Math.PI/12)*Math.cos(elevation),Math.sin(elevation)]));
    return Math.min(...areas)/Math.max(...areas);
  };
  for(const p of prototypes.filter(p=>p.form==='broadleaf')){
    const leaves=p.triangles.filter(t=>t.kind===TREE_MATERIAL.leaf),groups=new Map();
    for(const t of leaves){const id=Math.floor((t.uv[0][1]+1.001)/4);const group=groups.get(id)??[];group.push(t);groups.set(id,group);}
    assert.ok(groups.size>=8,'several spatial branch clusters must replace the old closed whole-crown envelopes');
    for(const faces of groups.values()){
      const vertices=[...new Map(faces.flatMap(t=>t.points).map(p=>[p.join(','),p])).values()],edges=new Map();
      for(const t of faces)for(let i=0;i<3;i++){const edge=[t.points[i].join(','),t.points[(i+1)%3].join(',')].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
      assert.ok([...edges.values()].some(n=>n===1),'a branch spray must remain an open surface rather than another solid crown shell');
      const [a,b,c]=vertices,u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],size=Math.hypot(...normal);
      assert.ok(vertices.some(p=>Math.abs(p.reduce((sum,n,i)=>sum+(n-a[i])*normal[i],0))/size>.03),'a spray must have measurable depth across its folds');
    }
    assert.ok(viewRatio(leaves)>.18,'the 3D crown must keep projected foliage through profile, steep and opposite views');
    const flat=leaves.map(t=>({...t,points:t.points.map(p=>[p[0],p[1],.6])}));
    assert.ok(viewRatio(flat)<.001,'negative control: a single flat foliage plane must be rejected');
  }
});

test('scaled instances preserve independent terrain anchors, immutable templates and normalized transformed normals',()=>{
  for(const p of prototypes){
    const {mesh,triangles}=recorder(),before=JSON.stringify(p),anchors=new TerrainAnchorBuilder();
    const position=[234,-89],anchor=anchors.add(position);
    addTreePrototype(mesh,p,position,14,3.2,1.1,[.4,.5,.3],[.5,.4,.3],anchor);
    assert.equal(JSON.stringify(p),before);assert.deepEqual(Array.from(anchors.finish()),position);
    assert.ok(triangles.every(t=>t.id===anchor));assert.equal(decodeTerrainObjectId(anchor),0);
    assert.equal(triangles.length,p.triangles.length);
    for(const t of triangles){for(const n of t.normals)assert.ok(Math.abs(Math.hypot(...n)-1)<1e-10);assert.ok(t.points.every(v=>v[2]>=0&&v[2]<=14&&Math.hypot(v[0]-position[0],v[1]-position[1])<=3.24));}
  }
});

test('real source instances reuse the library while retaining mapped positions, dimensions, family and source tags',()=>{
  const data=load('stanford-environment.geojson'),original=JSON.stringify(data),mapped=data.features.filter(f=>f.properties.kind==='tree');
  for(const feature of mapped){
    const {mesh,triangles}=recorder(),anchors=new TerrainAnchorBuilder(),p=feature.properties,d=environmentDimensions(p),family=mappedTreeForm(p,d.type);
    // Render individually so the separate dated Quad reconstruction cannot
    // replace a mapped node during this source-preservation check.
    const counts=addCampusEnvironment(mesh,{type:'FeatureCollection',features:[feature]},projectLocal,anchors.add);
    assert.equal(counts.trees,1);assert.deepEqual(Array.from(anchors.finish()),Array.from(new Float32Array(projectLocal(feature.geometry.coordinates))));
    assert.equal(triangles.length,treePrototype(family,treeVariant(p.id,family)).triangles.length);
    assert.ok(triangles.some(t=>leafKinds.includes(t.kind)));assert.ok(triangles.every(t=>decodeTerrainObjectId(t.id)===0));
    assert.ok(Math.abs(Math.max(...triangles.flatMap(t=>t.points.map(p=>p[2])))-d.height)<1e-8);
  }
  assert.equal(JSON.stringify(data),original);
});

test('the complete campus retains its unchanged triangle and packed GPU budgets with all environment layers included',()=>{
  const geometry=buildBuildingGeometry(prepareBuildingDetails(load('stanford-buildings.geojson')),load('stanford-environment.geojson'),load('stanford-sculptures.geojson'),load('stanford-surfaces.geojson'),load('stanford-landscape.geojson'));
  assert.equal(MAX_DETAIL_TRIANGLES,190000);assert.equal(MAX_GPU_GEOMETRY_BYTES,24*1024*1024);
  assert.ok(geometry.triangles<=MAX_DETAIL_TRIANGLES);assert.ok(gpuGeometryBytes(geometry.roofs)+gpuGeometryBytes(geometry.facades)<=MAX_GPU_GEOMETRY_BYTES);
  assert.deepEqual(geometry.environment,{trees:815,palms:347,broadleaf:438,conifers:30,benches:196,lamps:80});
});
