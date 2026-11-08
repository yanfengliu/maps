import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildChurchInterior,churchInteriorLocation} from '../src/church-interior.ts';
import {projectLocal} from '../src/building-geometry.ts';

const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))),mesh=buildChurchInterior(data);
const origin=projectLocal(churchInteriorLocation(data,0,0)),east=projectLocal(churchInteriorLocation(data,1,0)),inward=projectLocal(churchInteriorLocation(data,0,1));
const local=v=>[(v[0]-origin[0])*(east[0]-origin[0])+(v[1]-origin[1])*(east[1]-origin[1]),(v[0]-origin[0])*(inward[0]-origin[0])+(v[1]-origin[1])*(inward[1]-origin[1]),v[2]];
const faces=[];
for(let i=0;i<mesh.facades.length;i+=39){const vertices=[0,13,26].map(j=>Array.from(mesh.facades.subarray(i+j,i+j+13)));faces.push({vertices,p:vertices.map(local)});}
// Intersect the actual emitted triangles from the nave toward the entrance.
// The nearest surface at each probe must be the visible door, not a plain wall.
const hitAt=(x,z)=>{
  const hits=[];const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]),probe=[x,0,z];
  for(const f of faces){if(f.p.some(v=>v[1]<5.9||v[1]>6.7))continue;const area=cross(...f.p);if(Math.abs(area)<1e-8)continue;const w=[cross(probe,f.p[1],f.p[2])/area,cross(f.p[0],probe,f.p[2])/area,cross(f.p[0],f.p[1],probe)/area];if(w.some(v=>v< -1e-5))continue;hits.push({...f,y:w.reduce((s,n,i)=>s+n*f.p[i][1],0)});}
  return hits.sort((a,b)=>b.y-a.y)[0];
};

test('entrance has three visible timber door assemblies beneath the organ loft, including both central leaves',()=>{
  for(const x of [-7.15,-6.45,-.55,.55,6.45,7.15]){
    const hit=hitAt(x,1.45);assert.ok(hit,`door at ${x} must exist on the nave side of the vestibule`);
    assert.equal(hit.vertices[0][11],316,'visible door uses timber shading and the entrance cutaway group');
    const [r,g,b]=hit.vertices[0].slice(6,9);assert.ok(r>g&&g>b&&r<.5,'door is dark timber, not the plain gold wall');
  }
});

test('three arched fanlights and every door attachment follow the complete entrance wall cutaway',()=>{
  for(const [x,z] of [[-6.8,3.75],[0,4.15],[6.8,3.75]]){
    const fan=hitAt(x+.30,z);assert.ok(fan,'fanlight must be visible above each door');const [r,,b]=fan.vertices[0].slice(6,9);assert.ok(b>r,'fanlight has blue glazing, not a solid masonry cap');
  }
  // Stop before the unrelated first nave columns, whose bases start at y=6.3375.
  const entrance=faces.filter(f=>f.p.every(v=>v[1]>5.9&&v[1]<6.31&&v[2]>.15&&v[2]<5.35));
  assert.ok(entrance.length>300,'doors include relief frames, hardware and glazing');
  for(const f of entrance)assert.ok(f.vertices.every(v=>Math.floor(v[11]/100)===3),'all under-loft assemblies hide with the entrance wall');
});
