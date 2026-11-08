import test from 'node:test';
import assert from 'node:assert/strict';
import {GPU_VERTEX_BYTES,CPU_VERTEX_FLOATS,MAX_GPU_GEOMETRY_BYTES,MAX_DETAIL_TRIANGLES,gpuGeometryBytes,packGpuVertices} from '../src/gpu-geometry.ts';
import {createBuildingDetailsLayer} from '../src/building-details.ts';

const floatSlots=[[0,0],[1,4],[2,8],[3,12],[4,16],[5,20],[9,28],[10,32],[11,36],[12,40]];
const clamp=value=>Math.min(1,Math.max(0,value));
function vertices(count,seed=0){
  const values=new Float32Array(count*CPU_VERTEX_FLOATS);
  for(let i=0;i<count;i++)values.set([i+.123456,-i-.765432,1e-5*(i+1),-.5,.25,-.125,((i+seed)%256)/255,((i*37+seed)%1024)/1023,((i*13+seed)%257)/256,i/37,-i/19,50+(i%3),i%648],i*CPU_VERTEX_FLOATS);
  return values;
}
function checkVertex(values,sourceVertex,packed,packedVertex){
  const original=new DataView(values.buffer,values.byteOffset,values.byteLength),actual=new DataView(packed.buffer,packed.byteOffset,packed.byteLength);
  for(const [slot,offset] of floatSlots)assert.equal(actual.getUint32(packedVertex*44+offset,true),original.getUint32((sourceVertex*13+slot)*4,true),`float slot ${slot}, vertex ${sourceVertex} changed bits`);
  for(let c=0;c<3;c++)assert.ok(Math.abs(packed[packedVertex*44+24+c]/255-clamp(values[sourceVertex*13+6+c]))<=1/510+1e-12,`RGB quantization exceeded half a byte step at vertex ${sourceVertex}`);
  assert.equal(packed[packedVertex*44+27],255,'padding remains deterministic');
}

test('RGB8 packing preserves every non-color float bit, including negative zero, subnormals and large IDs',()=>{
  assert.equal(CPU_VERTEX_FLOATS,13);assert.equal(GPU_VERTEX_BYTES,44);
  const values=vertices(1027),bits=new Uint32Array(values.buffer);
  const patterns=[0x80000000,0x00000001,0x007fffff,0x00800000,0x7f7fffff,0xff7fffff,0x3f800001,0xbf800001,0x4b000001,0x3eaaaaab];
  for(let i=0;i<patterns.length;i++)bits[floatSlots[i][0]]=patterns[i];
  // Out-of-range authored colors are clamped, without touching adjacent UVs.
  values.set([-.25,1.25,.5],13+6);
  const before=new Uint32Array(values.buffer).slice(),packed=packGpuVertices(values);
  assert.equal(packed.byteLength,values.length/13*44);assert.equal(gpuGeometryBytes(values),packed.byteLength);
  assert.deepEqual(new Uint32Array(values.buffer),before,'packing must not modify the CPU mesh');
  for(let i=0;i<values.length/13;i++)checkVertex(values,i,packed,i);
});

test('start/end slices and source views pack exactly their requested vertices without leaking adjacent values',()=>{
  const backing=vertices(71),values=backing.subarray(13*4,13*67),full=packGpuVertices(values);
  for(const [start,end] of [[0,1],[0,63],[1,62],[62,63],[17,17],[0,0],[63,63]]){
    const packed=packGpuVertices(values,start,end);
    assert.deepEqual(packed,full.subarray(start*44,end*44));
    for(let i=start;i<end;i++)checkVertex(values,i,packed,i-start);
  }
  assert.equal(packGpuVertices(new Float32Array()).byteLength,0);
  for(const [start,end] of [[-1,1],[2,1],[0,64],[.5,2],[0,2.5],[NaN,1],[0,NaN],[Infinity,Infinity],[0,Infinity]])assert.throws(()=>packGpuVertices(values,start,end),/Invalid GPU vertex slice/);
  assert.throws(()=>packGpuVertices(new Float32Array(14)),/Invalid GPU vertex slice/);
});

function gpu(){
  const live={shaders:new Set(),programs:new Set(),vaos:new Set(),buffers:new Set()},allocations=new Map(),layouts=new Map(),chunks=[],draws=[];
  let boundBuffer=null,boundVao=null,frame=0,bufferCreates=0,vaoCreates=0;
  const allocate=kind=>{const value={};live[kind].add(value);return value;};
  const gl={FLOAT:0x1406,UNSIGNED_BYTE:0x1401,ARRAY_BUFFER:0x8892,STATIC_DRAW:0x88e4,TRIANGLES:4,LINK_STATUS:0x8b82,
    createShader:()=>allocate('shaders'),createProgram:()=>allocate('programs'),createVertexArray:()=>{vaoCreates++;return allocate('vaos');},createBuffer:()=>{bufferCreates++;return allocate('buffers');},
    deleteShader:v=>live.shaders.delete(v),deleteProgram:v=>live.programs.delete(v),deleteVertexArray:v=>live.vaos.delete(v),deleteBuffer:v=>live.buffers.delete(v),
    getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:()=>({}),getExtension:()=>({COMPLETION_STATUS_KHR:1}),
    bindBuffer:(_,value)=>{boundBuffer=value;},bindVertexArray:value=>{boundVao=value;},
    bufferData:(_,size)=>{assert.equal(typeof size,'number','allocation must not synchronously transfer CPU arrays');assert.ok(Number.isInteger(size));assert.ok(live.buffers.has(boundBuffer));allocations.set(boundBuffer,{size,bytes:new Uint8Array(size),frame});},
    vertexAttribPointer:(...args)=>{assert.ok(live.vaos.has(boundVao));const list=layouts.get(boundVao)??[];list.push(args);layouts.set(boundVao,list);},
    bufferSubData:(_,offset,bytes)=>{assert.ok(bytes instanceof Uint8Array);assert.ok(bytes.byteLength<=1024*1024);const allocation=allocations.get(boundBuffer);assert.ok(allocation);assert.ok(offset+bytes.byteLength<=allocation.size);allocation.bytes.set(bytes,offset);chunks.push({buffer:boundBuffer,offset,size:bytes.byteLength,frame});},
    drawArrays:(...args)=>draws.push({vao:boundVao,args,frame}),
  };
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','enableVertexAttribArray','useProgram','uniformMatrix4fv','uniform1f','uniform2f','enable','depthFunc','depthMask','disable'])gl[name]=()=>{};
  return {gl,live,allocations,layouts,chunks,draws,nextFrame:()=>++frame,getCreates:()=>({buffers:bufferCreates,vaos:vaoCreates})};
}
const options={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}};
function withLayer(geometry,check){
  const previous=globalThis.Worker,workers=[],gpuState=gpu(),listeners=new Map();
  globalThis.Worker=class{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}};
  const owner={getZoom:()=>16,getCenter:()=>({toArray:()=>[-122.1697,37.4278]}),on:(name,fn)=>listeners.set(name,fn),off:name=>listeners.delete(name),triggerRepaint(){}};
  const layer=createBuildingDetailsLayer({type:'FeatureCollection',features:[]});
  const render=()=>{gpuState.nextFrame();layer.render(gpuState.gl,options);};
  try{
    layer.onAdd(owner,gpuState.gl);render();assert.equal(workers.length,1);
    workers[0].onmessage({data:{geometry,buildMs:1}});assert.equal(workers[0].terminated,true);
    check({layer,render,...gpuState});
  }finally{
    layer.onRemove(owner,gpuState.gl);
    if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;
    for(const [kind,objects] of Object.entries(gpuState.live))assert.equal(objects.size,0,`${kind} leaked`);
    assert.equal(listeners.size,0);
  }
}
const geometry=(roofs,facades)=>({roofs,facades,buildings:1,roofTriangles:roofs.length/39,facadeTriangles:facades.length/39,triangles:(roofs.length+facades.length)/39,bytes:roofs.byteLength+facades.byteLength,environment:{},sculptures:{}});

test('real layer allocations and attributes match packed RGB8 bytes, and full-budget uploads are contiguous and at most 1 MiB per frame',()=>{
  assert.ok(MAX_DETAIL_TRIANGLES*3*GPU_VERTEX_BYTES<=MAX_GPU_GEOMETRY_BYTES,'triangle limit must fit the unchanged 24 MiB GPU budget');
  const roofVertices=Math.floor(MAX_DETAIL_TRIANGLES/2)*3,facadeVertices=(MAX_DETAIL_TRIANGLES-Math.floor(MAX_DETAIL_TRIANGLES/2))*3;
  const roofs=vertices(roofVertices,7),facades=vertices(facadeVertices,23),expectedBytes=(roofVertices+facadeVertices)*44;
  assert.ok(roofs.byteLength+facades.byteLength>MAX_GPU_GEOMETRY_BYTES,'exercise the case where CPU arrays exceed the GPU-only budget');
  withLayer(geometry(roofs,facades),({layer,render,gl,allocations,layouts,chunks,draws})=>{
    for(let i=0;i<100&&!layer.stats.ready&&!layer.stats.error;i++){render();if(!layer.stats.ready)assert.equal(draws.length,0,'partial meshes must not draw');}
    assert.equal(layer.stats.error,null);assert.equal(layer.stats.ready,true);assert.equal(layer.stats.drawCalls,2);
    assert.equal(allocations.size,2);assert.equal(layouts.size,2);
    const total=[...allocations.values()].reduce((sum,a)=>sum+a.size,0);assert.equal(total,expectedBytes);assert.ok(total<=24*1024*1024);assert.equal(layer.stats.bytes,total);
    const expectedLayout=[[0,3,gl.FLOAT,false,44,0],[1,3,gl.FLOAT,false,44,12],[2,3,gl.UNSIGNED_BYTE,true,44,24],[3,2,gl.FLOAT,false,44,28],[4,1,gl.FLOAT,false,44,36],[5,1,gl.FLOAT,false,44,40]];
    for(const attributes of layouts.values())assert.deepEqual(attributes,expectedLayout);
    let meshIndex=0;
    for(const [buffer,allocation] of allocations){
      let end=0;const ownChunks=chunks.filter(c=>c.buffer===buffer);
      assert.ok(ownChunks.length>1,'exercise multiple chunks and a partial final chunk');
      for(const chunk of ownChunks){assert.equal(chunk.offset,end,'missing or repeated upload byte range');assert.equal(chunk.offset%44,0);assert.equal(chunk.size%44,0);assert.ok(chunk.size<=1024*1024);end+=chunk.size;}
      assert.equal(end,allocation.size,'ready must wait for the complete buffer');
      const original=meshIndex++===0?roofs:facades;
      for(const vertex of [0,1,Math.floor(1024*1024/44)-1,Math.floor(1024*1024/44),original.length/13-1])checkVertex(original,vertex,allocation.bytes,vertex);
      assert.deepEqual(allocation.bytes,packGpuVertices(original),'integration uploads must use packed bytes, not CPU byte offsets');
    }
    const frameBytes=new Map();for(const c of chunks)frameBytes.set(c.frame,(frameBytes.get(c.frame)??0)+c.size);
    for(const bytes of frameBytes.values())assert.ok(bytes<=1024*1024,'combined transfers exceeded the frame budget');
    for(const allocation of allocations.values())assert.equal(frameBytes.has(allocation.frame),false,'allocation and transfer must occupy separate frame slices');
    assert.deepEqual(draws.map(d=>d.args),[[gl.TRIANGLES,0,roofVertices],[gl.TRIANGLES,0,facadeVertices]]);
  });
});

test('combined geometry over 24 MiB is rejected before any VAO or GPU buffer allocation',()=>{
  const count=Math.ceil((MAX_GPU_GEOMETRY_BYTES/44+1)/3)*3;
  withLayer(geometry(new Float32Array(count*13),new Float32Array(39)),({layer,render,allocations,chunks,draws,getCreates})=>{
    render();assert.match(layer.stats.error,/24 MiB GPU geometry limit/);assert.equal(layer.stats.ready,false);
    assert.equal(allocations.size,0);assert.equal(chunks.length,0);assert.equal(draws.length,0);assert.deepEqual(getCreates(),{buffers:0,vaos:0});
  });
});
