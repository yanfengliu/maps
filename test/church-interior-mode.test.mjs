import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildingDetailsLayer } from '../src/building-details.ts';
import { emptyEnvironmentCounts } from '../src/campus-environment.ts';
import { emptySculptureCounts } from '../src/campus-sculptures.ts';
import { readFileSync } from 'node:fs';

function fixture(data={type:'FeatureCollection',features:[]}) {
  const previousWorker=globalThis.Worker,workers=[],listeners=new Map(),live={buffers:new Set(),vaos:new Set(),programs:new Set(),shaders:new Set()},uniforms=new Map();
  globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}};
  const allocate=kind=>{const value={};live[kind].add(value);return value;};
  const gl={createBuffer:()=>allocate('buffers'),createVertexArray:()=>allocate('vaos'),createProgram:()=>allocate('programs'),createShader:()=>allocate('shaders'),
    deleteBuffer:value=>live.buffers.delete(value),deleteVertexArray:value=>live.vaos.delete(value),deleteProgram:value=>live.programs.delete(value),deleteShader:value=>live.shaders.delete(value),
    getExtension:()=>({COMPLETION_STATUS_KHR:1}),getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,uniform1f:(name,value)=>uniforms.set(name,value),uniform2f:(name,x,y)=>uniforms.set(name,[x,y])};
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','bindVertexArray','bindBuffer','bufferData','bufferSubData','enableVertexAttribArray','vertexAttribPointer','useProgram','uniformMatrix4fv','enable','depthFunc','depthMask','disable','drawArrays','blendEquation','blendFuncSeparate'])gl[name]=()=>{};
  const owner={getZoom:()=>20,getCenter:()=>({toArray:()=>[-122.1697,37.4278]}),triggerRepaint(){},on:(name,fn)=>listeners.set(name,fn),off:name=>listeners.delete(name)};
  const layer=createBuildingDetailsLayer(data),options={defaultProjectionData:{mainMatrix:new Array(16).fill(0)}};
  const render=()=>layer.render(gl,options);
  const ready=()=>{for(let i=0;i<15&&!layer.stats.ready;i++)render();assert.equal(layer.stats.ready,true);};
  const close=()=>{layer.onRemove(owner,gl);for(const [kind,objects]of Object.entries(live))assert.equal(objects.size,0,`${kind} leaked`);if(previousWorker===undefined)delete globalThis.Worker;else globalThis.Worker=previousWorker;};
  layer.onAdd(owner,gl);
  return {workers,listeners,live,uniforms,gl,owner,data,layer,render,ready,close};
}

function geometry(triangles=2,interior=false){
  const roofs=new Float32Array(39),facades=new Float32Array((triangles-1)*39);
  if(interior)for(let i=11;i<roofs.length;i+=13)roofs[i]=29;
  return {roofs,facades,buildings:1,roofTriangles:1,facadeTriangles:triangles-1,triangles,bytes:roofs.byteLength+facades.byteLength,environment:emptyEnvironmentCounts(),sculptures:emptySculptureCounts()};
}

function recordRendering(f){
  const state={blend:false,depthWrite:true,vao:null,buffer:null,blendEquation:null,blendFactors:null},draws=[],uploads=[],sources=[];
  for(const constant of ['BLEND','DEPTH_TEST','CULL_FACE','FUNC_ADD','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE','ARRAY_BUFFER','TRIANGLES'])f.gl[constant]=constant;
  f.gl.enable=key=>{if(key==='BLEND')state.blend=true;};f.gl.disable=key=>{if(key==='BLEND')state.blend=false;};
  f.gl.depthMask=value=>{state.depthWrite=value;};f.gl.bindVertexArray=value=>{state.vao=value;};f.gl.bindBuffer=(_,value)=>{state.buffer=value;};
  f.gl.blendEquation=value=>{state.blendEquation=value;};f.gl.blendFuncSeparate=(...values)=>{state.blendFactors=values;};
  f.gl.drawArrays=(_,first,count)=>draws.push({...state,first,count});
  f.gl.bufferSubData=(_,offset,values)=>uploads.push({buffer:state.buffer,offset,bytes:new Uint8Array(values.buffer,values.byteOffset,values.byteLength).slice()});
  f.gl.shaderSource=(_,source)=>sources.push(source);
  return {state,draws,uploads,sources};
}

test('local detail waits for the adaptive globe transition and resumes without rebuilding',()=>{
  const f=fixture();try{
    const options={defaultProjectionData:{mainMatrix:new Array(16).fill(0),projectionTransition:0.5}};
    f.layer.render(f.gl,options);assert.equal(f.workers.length,0);assert.equal(f.layer.stats.drawCalls,0);
    options.defaultProjectionData.projectionTransition=0;
    f.layer.render(f.gl,options);f.workers[0].onmessage({data:{geometry:geometry(3)}});f.ready();
    assert.equal(f.layer.stats.drawCalls,2);
    options.defaultProjectionData.projectionTransition=1;f.layer.render(f.gl,options);assert.equal(f.layer.stats.drawCalls,0);
    options.defaultProjectionData.projectionTransition=0;f.layer.render(f.gl,options);assert.equal(f.layer.stats.drawCalls,2);assert.equal(f.workers.length,1);
  }finally{f.close();}
});

test('renderer updates whole-wall visibility during camera rotation and clears it outside the interior',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/data/stanford-buildings.geojson',import.meta.url))),f=fixture(data);
  try{
    f.owner.getBearing=()=>120;f.owner.getPitch=()=>60;
    f.layer.setInterior(true);f.render();f.workers[0].onmessage({data:{geometry:geometry(3,true)}});f.ready();
    assert.deepEqual(f.uniforms.get('u_sideWalls'),[1,0]);assert.deepEqual(f.uniforms.get('u_endWalls'),[0,1]);
    f.owner.getBearing=()=>300;f.render();assert.deepEqual(f.uniforms.get('u_sideWalls'),[0,1]);assert.deepEqual(f.uniforms.get('u_endWalls'),[1,0]);
    f.owner.getPitch=()=>0;f.render();assert.deepEqual(f.uniforms.get('u_sideWalls'),[1,1]);assert.deepEqual(f.uniforms.get('u_endWalls'),[1,1]);
    f.layer.setInterior(false);f.render();f.workers.at(-1).onmessage({data:{geometry:geometry(4)}});f.ready();
    assert.deepEqual(f.uniforms.get('u_sideWalls'),[1,1]);assert.deepEqual(f.uniforms.get('u_endWalls'),[1,1]);
  }finally{f.close();}
});

test('authored campus follows the native wrapped world without moving source coordinates',()=>{
  const f=fixture();try{
    let longitude=-122.1697,matrices=[];f.owner.getCenter=()=>({toArray:()=>[longitude,37.4278]});
    f.gl.uniformMatrix4fv=(_,__,matrix)=>matrices.push([...matrix]);
    const options={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}};
    f.layer.render(f.gl,options);f.workers[0].onmessage({data:{geometry:geometry(3)}});f.ready();
    f.layer.render(f.gl,options);const initial=matrices.at(-1);const focus=f.uniforms.get('u_focus');
    longitude+=360;f.layer.render(f.gl,options);const wrapped=matrices.at(-1);
    assert.ok(Math.abs(wrapped[12]-initial[12]-1)<1e-6,'custom geometry must move one Mercator world alongside native layers');
    assert.ok(Math.hypot(...f.uniforms.get('u_focus').map((v,i)=>v-focus[i]))<1e-6);
    longitude-=720;f.layer.render(f.gl,options);assert.ok(Math.abs(matrices.at(-1)[12]-initial[12]+1)<1e-6);
  }finally{f.close();}
});

test('switching modes cancels stale worker success and failure without cancelling the replacement',()=>{
  const f=fixture();try{
    f.render();const old=f.workers[0];assert.equal(old.message.interior,false);
    f.layer.setInterior(true);assert.equal(old.terminated,true);f.render();const current=f.workers[1];
    assert.equal(current.message.interior,true);assert.equal(current.message.data,f.data);
    old.onmessage({data:{geometry:geometry(7)}});old.onerror();
    assert.equal(f.layer.stats.error,null);assert.equal(f.layer.stats.ready,false);assert.equal(current.terminated,false);
    current.onmessage({data:{geometry:geometry(3,true),buildMs:1}});f.ready();
    assert.equal(f.layer.stats.mode,'church-interior');assert.equal(f.layer.stats.triangles,3);
    f.layer.onRemove(f.owner,f.gl);current.onmessage({data:{error:'stale removal failure'}});current.onerror();
    assert.equal(f.layer.stats.error,null);
  }finally{f.close();}
});

test('interior replaces GPU buffers, preserves the program, reports only current counts and returns to cached campus detail',()=>{
  const f=fixture();try{
    f.render();f.workers[0].onmessage({data:{geometry:geometry(5),buildMs:4}});f.ready();
    const program=[...f.live.programs][0];assert.equal(f.live.buffers.size,2);
    f.layer.setInterior(true);assert.equal(f.live.buffers.size,0);assert.equal(f.live.vaos.size,0);assert.equal(f.layer.stats.ready,false);
    assert.equal(f.layer.stats.triangles,0);assert.equal(f.layer.stats.bytes,0);assert.equal(f.layer.stats.drawCalls,0);assert.equal([...f.live.programs][0],program);
    f.render();f.workers[1].onmessage({data:{geometry:geometry(3,true),buildMs:2}});f.ready();f.render();
    assert.equal(f.layer.stats.drawCalls,1);assert.equal(f.live.buffers.size,2);assert.equal(f.layer.stats.triangles,3);
    f.layer.setCeiling(true);f.render();assert.equal(f.uniforms.get('u_ceiling'),1);assert.equal(f.layer.stats.ceiling,true);assert.equal(f.layer.stats.drawCalls,2);
    f.layer.setInterior(false);assert.equal(f.live.buffers.size,0);assert.equal(f.layer.stats.ceiling,false);f.ready();f.render();
    assert.equal(f.workers.length,2,'campus cache should survive the focused visit');assert.equal(f.layer.stats.triangles,5);assert.equal(f.layer.stats.mode,'campus');assert.equal(f.uniforms.get('u_ceiling'),0);
    f.layer.setCeiling(true);assert.equal(f.layer.stats.ceiling,false,'ceiling is never visible in campus mode');
  }finally{f.close();}
});

test('partial uploads and context restoration keep the chosen interior and release abandoned resources',()=>{
  const f=fixture();try{
    f.render();f.workers[0].onmessage({data:{geometry:geometry(4)}});f.render();assert.equal(f.live.buffers.size,1);
    f.layer.setInterior(true);assert.equal(f.live.buffers.size,0);assert.equal(f.live.vaos.size,0);
    f.render();f.workers[1].onmessage({data:{geometry:geometry(3,true)}});f.ready();f.layer.setCeiling(true);
    f.listeners.get('webglcontextlost')();for(const values of Object.values(f.live))assert.equal(values.size,0);
    f.listeners.get('webglcontextrestored')();f.ready();f.render();
    assert.equal(f.layer.stats.mode,'church-interior');assert.equal(f.layer.stats.ceiling,true);assert.equal(f.uniforms.get('u_ceiling'),1);assert.equal(f.layer.stats.triangles,3);assert.equal(f.workers.length,2);
    f.layer.onRemove(f.owner,f.gl);
    const replacement=createBuildingDetailsLayer(f.data);replacement.setInterior(true);replacement.setCeiling(true);replacement.onAdd(f.owner,f.gl);
    try{for(let i=0;i<12&&!replacement.stats.ready;i++)replacement.render(f.gl,{defaultProjectionData:{mainMatrix:new Array(16).fill(0)}});assert.equal(replacement.stats.ready,true);assert.equal(replacement.stats.mode,'church-interior');assert.equal(replacement.stats.triangles,3);assert.equal(f.workers.length,2,'style recreation must use the correct mode cache');}
    finally{replacement.onRemove(f.owner,f.gl);}
  }finally{f.close();}
});

test('transparent ceiling follows the opaque interior, preserves map depth, and reuses its two buffers',()=>{
  const f=fixture(),r=recordRendering(f);
  try{
    f.layer.setInterior(true);f.render();f.workers[0].onmessage({data:{geometry:geometry(3,true)}});f.ready();r.draws.length=0;
    f.render();assert.equal(r.draws.length,1);assert.equal(r.draws[0].count,6);assert.equal(r.draws[0].blend,false);assert.equal(r.draws[0].depthWrite,true);
    f.layer.setCeiling(true);r.draws.length=0;f.render();
    assert.deepEqual(r.draws.map(d=>[d.count,d.blend,d.depthWrite]),[[6,false,true],[3,true,false]]);
    assert.equal(r.draws[1].blendEquation,'FUNC_ADD');assert.deepEqual(r.draws[1].blendFactors,['SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE','ONE_MINUS_SRC_ALPHA']);
    assert.equal(r.state.blend,false);assert.equal(r.state.depthWrite,true);assert.equal(r.state.vao,null);assert.equal(r.state.buffer,null);
    assert.equal(f.live.buffers.size,2);assert.equal(f.workers.length,1,'ceiling switch must not rebuild the room');
    f.owner.getZoom=()=>14.5;r.draws.length=0;f.render();assert.equal(r.draws.length,2,'opaque ground and interior remain present while zooming out with the ceiling on');
    f.layer.setCeiling(false);r.draws.length=0;f.render();assert.deepEqual(r.draws.map(d=>[d.count,d.blend,d.depthWrite]),[[6,false,true]]);
    f.owner.getZoom=()=>20;f.layer.setInterior(false);f.render();f.workers[1].onmessage({data:{geometry:geometry(4)}});f.ready();r.draws.length=0;f.render();
    assert.deepEqual(r.draws.map(d=>[d.count,d.blend,d.depthWrite]),[[3,false,true],[9,false,true]],'exterior stays in its original two opaque passes');
  }finally{f.close();}
});

test('ceiling triangles sort far-to-near on rotation without uploading again for pan, zoom or selection',()=>{
  const f=fixture(),r=recordRendering(f),g=geometry(3,true),roofs=new Float32Array(3*39);
  for(let triangle=0;triangle<3;triangle++)for(let vertex=0;vertex<3;vertex++){
    const offset=triangle*39+vertex*13;roofs[offset]=(triangle-1)*4;roofs[offset+1]=vertex;roofs[offset+2]=10;roofs[offset+11]=triangle===1?30:29;
  }
  Object.assign(g,{roofs,roofTriangles:3,triangles:5,bytes:roofs.byteLength+g.facades.byteLength});
  const mainMatrix=[1,0,0,1,0,1,0,0,0,0,1,0,0,0,0,1],options={defaultProjectionData:{mainMatrix}};
  const order=()=>{const floats=new Float32Array(r.uploads.at(-1).bytes.buffer);return [floats[0],floats[33],floats[66]];};
  try{
    f.layer.setInterior(true);f.render();f.workers[0].onmessage({data:{geometry:g}});f.ready();r.uploads.length=0;
    f.layer.setCeiling(true);f.layer.render(f.gl,options);assert.equal(r.uploads.length,1);assert.deepEqual(order(),[4,0,-4]);
    const roofBuffer=r.uploads[0].buffer;assert.ok(f.live.buffers.has(roofBuffer));
    mainMatrix[12]+=0.2;mainMatrix[3]*=2;f.owner.getZoom=()=>21;f.layer.setSelected('unrelated');f.layer.render(f.gl,options);assert.equal(r.uploads.length,1,'unchanged view direction reuses triangle order');
    mainMatrix[3]*=-1;f.layer.render(f.gl,options);assert.equal(r.uploads.length,2);assert.deepEqual(order(),[-4,0,4]);assert.equal(r.uploads[1].buffer,roofBuffer);
    f.layer.setCeiling(false);f.layer.render(f.gl,options);f.layer.setCeiling(true);f.layer.render(f.gl,options);assert.equal(r.uploads.length,2,'toggle does not duplicate the sorted buffer');
    f.listeners.get('webglcontextlost')();assert.equal(f.live.buffers.size,0);f.listeners.get('webglcontextrestored')();f.ready();f.layer.render(f.gl,options);assert.deepEqual(order(),[-4,0,4]);assert.equal(f.live.buffers.size,2);assert.equal(f.workers.length,1);
  }finally{f.close();}
});

test('a failed transparent draw restores depth and blend state, and opaque roof payload is rejected',()=>{
  const f=fixture(),r=recordRendering(f);
  try{
    f.layer.setInterior(true);f.render();f.workers[0].onmessage({data:{geometry:geometry(3,true)}});f.ready();f.layer.setCeiling(true);
    f.gl.drawArrays=()=>{if(r.state.blend)throw new Error('draw failure');};
    assert.throws(()=>f.render(),/draw failure/);assert.equal(r.state.depthWrite,true);assert.equal(r.state.blend,false);assert.equal(r.state.vao,null);
    f.layer.setInterior(false);f.render();f.workers.at(-1).onmessage({data:{geometry:geometry(4)}});f.ready();
  }finally{f.close();}
  const invalid=fixture();
  try{
    invalid.layer.setInterior(true);invalid.render();invalid.workers[0].onmessage({data:{geometry:geometry(3)}});
    for(let i=0;i<15&&!invalid.layer.stats.error;i++)invalid.render();
    assert.match(invalid.layer.stats.error,/ceiling buffer contains opaque geometry/);assert.equal(invalid.layer.stats.ready,false);assert.equal(invalid.live.buffers.size,0);
  }finally{invalid.close();}
});
