import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildingDetailsLayer } from '../src/building-details.ts';
import { emptyEnvironmentCounts } from '../src/campus-environment.ts';
import { emptySculptureCounts } from '../src/campus-sculptures.ts';

function fixture() {
  const previousWorker=globalThis.Worker,workers=[],listeners=new Map(),live={buffers:new Set(),vaos:new Set(),programs:new Set(),shaders:new Set()},uniforms=new Map();
  globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}};
  const allocate=kind=>{const value={};live[kind].add(value);return value;};
  const gl={createBuffer:()=>allocate('buffers'),createVertexArray:()=>allocate('vaos'),createProgram:()=>allocate('programs'),createShader:()=>allocate('shaders'),
    deleteBuffer:value=>live.buffers.delete(value),deleteVertexArray:value=>live.vaos.delete(value),deleteProgram:value=>live.programs.delete(value),deleteShader:value=>live.shaders.delete(value),
    getExtension:()=>({COMPLETION_STATUS_KHR:1}),getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,uniform1f:(name,value)=>uniforms.set(name,value)};
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','bindVertexArray','bindBuffer','bufferData','bufferSubData','enableVertexAttribArray','vertexAttribPointer','useProgram','uniformMatrix4fv','uniform2f','enable','depthFunc','depthMask','disable','drawArrays'])gl[name]=()=>{};
  const owner={getZoom:()=>20,getCenter:()=>({toArray:()=>[-122.1697,37.4278]}),triggerRepaint(){},on:(name,fn)=>listeners.set(name,fn),off:name=>listeners.delete(name)};
  const data={type:'FeatureCollection',features:[]},layer=createBuildingDetailsLayer(data),options={defaultProjectionData:{mainMatrix:new Array(16).fill(0)}};
  const render=()=>layer.render(gl,options);
  const ready=()=>{for(let i=0;i<15&&!layer.stats.ready;i++)render();assert.equal(layer.stats.ready,true);};
  const close=()=>{layer.onRemove(owner,gl);for(const [kind,objects]of Object.entries(live))assert.equal(objects.size,0,`${kind} leaked`);if(previousWorker===undefined)delete globalThis.Worker;else globalThis.Worker=previousWorker;};
  layer.onAdd(owner,gl);
  return {workers,listeners,live,uniforms,gl,owner,data,layer,render,ready,close};
}

function geometry(triangles=2){
  const roofs=new Float32Array(39),facades=new Float32Array((triangles-1)*39);
  return {roofs,facades,buildings:1,roofTriangles:1,facadeTriangles:triangles-1,triangles,bytes:roofs.byteLength+facades.byteLength,environment:emptyEnvironmentCounts(),sculptures:emptySculptureCounts()};
}

test('switching modes cancels stale worker success and failure without cancelling the replacement',()=>{
  const f=fixture();try{
    f.render();const old=f.workers[0];assert.equal(old.message.interior,false);
    f.layer.setInterior(true);assert.equal(old.terminated,true);f.render();const current=f.workers[1];
    assert.equal(current.message.interior,true);assert.equal(current.message.data,f.data);
    old.onmessage({data:{geometry:geometry(7)}});old.onerror();
    assert.equal(f.layer.stats.error,null);assert.equal(f.layer.stats.ready,false);assert.equal(current.terminated,false);
    current.onmessage({data:{geometry:geometry(3),buildMs:1}});f.ready();
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
    f.render();f.workers[1].onmessage({data:{geometry:geometry(3),buildMs:2}});f.ready();f.render();
    assert.equal(f.layer.stats.drawCalls,2);assert.equal(f.live.buffers.size,2);assert.equal(f.layer.stats.triangles,3);
    f.layer.setCeiling(true);f.render();assert.equal(f.uniforms.get('u_ceiling'),1);assert.equal(f.layer.stats.ceiling,true);
    f.layer.setInterior(false);assert.equal(f.live.buffers.size,0);assert.equal(f.layer.stats.ceiling,false);f.ready();f.render();
    assert.equal(f.workers.length,2,'campus cache should survive the focused visit');assert.equal(f.layer.stats.triangles,5);assert.equal(f.layer.stats.mode,'campus');assert.equal(f.uniforms.get('u_ceiling'),0);
    f.layer.setCeiling(true);assert.equal(f.layer.stats.ceiling,false,'ceiling is never visible in campus mode');
  }finally{f.close();}
});

test('partial uploads and context restoration keep the chosen interior and release abandoned resources',()=>{
  const f=fixture();try{
    f.render();f.workers[0].onmessage({data:{geometry:geometry(4)}});f.render();assert.equal(f.live.buffers.size,1);
    f.layer.setInterior(true);assert.equal(f.live.buffers.size,0);assert.equal(f.live.vaos.size,0);
    f.render();f.workers[1].onmessage({data:{geometry:geometry(3)}});f.ready();f.layer.setCeiling(true);
    f.listeners.get('webglcontextlost')();for(const values of Object.values(f.live))assert.equal(values.size,0);
    f.listeners.get('webglcontextrestored')();f.ready();f.render();
    assert.equal(f.layer.stats.mode,'church-interior');assert.equal(f.layer.stats.ceiling,true);assert.equal(f.uniforms.get('u_ceiling'),1);assert.equal(f.layer.stats.triangles,3);assert.equal(f.workers.length,2);
    f.layer.onRemove(f.owner,f.gl);
    const replacement=createBuildingDetailsLayer(f.data);replacement.setInterior(true);replacement.setCeiling(true);replacement.onAdd(f.owner,f.gl);
    try{for(let i=0;i<12&&!replacement.stats.ready;i++)replacement.render(f.gl,{defaultProjectionData:{mainMatrix:new Array(16).fill(0)}});assert.equal(replacement.stats.ready,true);assert.equal(replacement.stats.mode,'church-interior');assert.equal(replacement.stats.triangles,3);assert.equal(f.workers.length,2,'style recreation must use the correct mode cache');}
    finally{replacement.onRemove(f.owner,f.gl);}
  }finally{f.close();}
});
