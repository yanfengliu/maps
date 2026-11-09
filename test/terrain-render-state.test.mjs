import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildingDetailsLayer} from '../src/building-details.ts';

// WebGL validates every active sampler against the current color attachment,
// even when a runtime uniform disables the branch that samples it. This oracle
// derives sampler names from the real program's shaders, not a fixed count.
function gpuOracle(){
 const live={shaders:new Set(),programs:new Set(),vaos:new Set(),buffers:new Set(),textures:new Set()},draws=[];
 let active=33989,program=null,framebuffer=null,colorAttachment=null,viewport=[0,0,1056,1013],enforce=false;
 const bindings=new Map(),allocate=kind=>{const object={};live[kind].add(object);return object;};
 const gl={TEXTURE0:33984,TEXTURE_2D:3553,TEXTURE_BINDING_2D:32873,ACTIVE_TEXTURE:34016,FRAMEBUFFER:36160,FRAMEBUFFER_BINDING:36006,VIEWPORT:2978,
  VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,LINK_STATUS:35714,RGBA32F:34836,RG32F:33328,RGBA:6408,RG:33319,FLOAT:5126,UNSIGNED_BYTE:5121,
  TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,NEAREST:9728,LINEAR:9729,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,CLAMP_TO_EDGE:33071,
  ARRAY_BUFFER:34962,STATIC_DRAW:35044,TRIANGLES:4,DEPTH_TEST:2929,STENCIL_TEST:2960,CULL_FACE:2884,BLEND:3042,LEQUAL:515,
  createShader:()=>allocate('shaders'),createProgram:()=>Object.assign(allocate('programs'),{shaders:[],samplers:new Set(),uniforms:new Map()}),
  createVertexArray:()=>allocate('vaos'),createBuffer:()=>allocate('buffers'),createTexture:()=>allocate('textures'),
  deleteShader:o=>live.shaders.delete(o),deleteProgram:o=>live.programs.delete(o),deleteVertexArray:o=>live.vaos.delete(o),deleteBuffer:o=>live.buffers.delete(o),deleteTexture:o=>live.textures.delete(o),
  shaderSource:(shader,source)=>{shader.source=source;},attachShader:(p,shader)=>p.shaders.push(shader),
  linkProgram:p=>{for(const shader of p.shaders)for(const match of shader.source.matchAll(/uniform\s+sampler2D\s+(\w+)\s*;/g)){p.samplers.add(match[1]);p.uniforms.set(match[1],0);}},
  getExtension:name=>name==='KHR_parallel_shader_compile'?{COMPLETION_STATUS_KHR:37297}:name==='EXT_color_buffer_float'?{}:null,
  getProgramParameter:()=>true,getShaderParameter:()=>true,getUniformLocation:(p,name)=>({program:p,name}),useProgram:p=>{program=p;},
  uniform1i:(location,value)=>location.program.uniforms.set(location.name,value),uniform1f:(location,value)=>location.program.uniforms.set(location.name,value),
  uniform2f:(location,...value)=>location.program.uniforms.set(location.name,value),uniform4f:(location,...value)=>location.program.uniforms.set(location.name,value),
  getParameter:key=>key===34016?active:key===32873?bindings.get(active)||null:key===36006?framebuffer:key===2978?[...viewport]:null,
  activeTexture:unit=>{active=unit;},bindTexture:(_,texture)=>bindings.set(active,texture),
  bindFramebuffer:(_,value)=>{framebuffer=value;},viewport:(...value)=>{viewport=value;},
  texImage2D:()=>{const texture=bindings.get(active);assert.ok(live.textures.has(texture),'texture upload must target an owned allocation');texture.allocated=true;},
  drawArrays:(_,first,count)=>{
   if(enforce){
    assert.ok(program?.samplers.size>=4,'the actual terrain/artwork shader must be under test');
    for(const name of program.samplers){
     const unit=gl.TEXTURE0+(program.uniforms.get(name)??0),texture=bindings.get(unit);
     assert.ok(texture,`${name} has no texture bound on unit ${unit-gl.TEXTURE0}`);
     assert.notEqual(texture,colorAttachment,`feedback loop: ${name} samples active framebuffer color attachment, even if its branch is disabled`);
    }
   }
   draws.push({first,count,uniforms:new Map(program?.uniforms),textures:new Map(bindings),framebuffer});
  },
 };
 for(const name of ['compileShader','bindVertexArray','bindBuffer','bufferData','bufferSubData','enableVertexAttribArray','vertexAttribPointer','uniformMatrix4fv','texParameteri','enable','disable','depthFunc','depthMask','blendEquation','blendFuncSeparate'])gl[name]=()=>{};
 const snapshot=()=>({active,framebuffer,viewport:[...viewport],bindings:new Map(bindings)});
 const enterNativePass=()=>{
  framebuffer={nativeFramebuffer:true};colorAttachment={nativeColorAttachment:true};viewport=[3,7,512,512];
  for(let unit=0;unit<4;unit++)bindings.set(gl.TEXTURE0+unit,colorAttachment);
  bindings.set(gl.TEXTURE0+5,{unrelatedNativeTexture:true});active=gl.TEXTURE0+5;enforce=true;draws.length=0;
  return snapshot();
 };
 return {gl,live,draws,enterNativePass,snapshot,resetSamplerDefaults(){for(const p of live.programs)for(const name of p.samplers)p.uniforms.set(name,0);}};
}

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function geometry(interior=false){
 const roofs=new Float32Array(39),facades=new Float32Array(39);
 for(let v=0;v<3;v++){
  roofs[v*13+5]=facades[v*13+5]=1;
  roofs[v*13+11]=interior?29:60;roofs[v*13+12]=interior?0:-4;
  facades[v*13+11]=interior?25:12;facades[v*13+12]=0;
 }
 return {roofs,facades,churchTextures:interior,terrainAnchors:new Float32Array(),buildings:1,roofTriangles:1,facadeTriangles:1,triangles:2,bytes:roofs.byteLength+facades.byteLength,
  environment:{trees:0,palms:0,broadleaf:0,conifers:0,benches:0,lamps:0},sculptures:{works:0,figures:0,triangles:0}};
}

async function fixture({interior=false,elevationGate,beforeElevationReady}={}){
 const previous={Worker:globalThis.Worker,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap};
 const workers=[],bitmaps=[],requests=[],gpu=gpuOracle(),listeners=new Map();
 globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(){}terminate(){this.terminated=true;}};
 globalThis.fetch=async url=>{requests.push(String(url));return {ok:true,blob:async()=>new Blob(['fixture artwork'])};};
 globalThis.createImageBitmap=async()=>{const bitmap={width:4,height:4,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);return bitmap;};
 const owner={getZoom:()=>17,getCenter:()=>({toArray:()=>[-122.1697,37.4278]}),getTerrain:()=>({source:'bay-area-terrain',exaggeration:1}),getBearing:()=>0,getPitch:()=>58,
  on:(name,callback)=>listeners.set(name,callback),off:name=>listeners.delete(name),triggerRepaint(){}};
 // A new source identity keeps the production weak caches independent between tests.
 const layer=createBuildingDetailsLayer({type:'FeatureCollection',features:[]},undefined,async()=>{
  if(elevationGate)await elevationGate;
  const grid=new Float32Array(256*256*4);for(let i=0;i<grid.length;i+=4){grid[i]=28;grid[i+3]=1;}return grid;
 });
 const options={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],projectionTransition:0},renderTerrainHeightMap:target=>assert.ok(gpu.live.textures.has(target.texture))};
 const close=async()=>{
  layer.onRemove(owner,gpu.gl);await tick();
  for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  for(const [kind,objects] of Object.entries(gpu.live))assert.equal(objects.size,0,`${kind} leaked after renderer removal`);
  assert.ok(workers.every(w=>w.terminated));assert.ok(bitmaps.every(bitmap=>bitmap.closed));assert.equal(listeners.size,0);
 };
 try{
  layer.onAdd(owner,gpu.gl);if(interior)layer.setInterior(true);
  layer.prerender(gpu.gl,options);layer.render(gpu.gl,options);assert.equal(workers.length,1);
  workers[0].onmessage({data:{geometry:geometry(interior),buildMs:1}});
  for(let i=0;i<30&&!layer.stats.ready;i++){layer.prerender(gpu.gl,options);layer.render(gpu.gl,options);await tick();}
  if(beforeElevationReady){
   await beforeElevationReady({layer,gpu});
   for(let i=0;i<30&&!layer.stats.ready;i++){layer.prerender(gpu.gl,options);layer.render(gpu.gl,options);await tick();}
  }
  assert.equal(layer.stats.error,null);assert.equal(layer.stats.ready,true);assert.equal(layer.stats.terrainStatus,'active');
  return {...gpu,layer,owner,options,requests,bitmaps,close};
 }catch(error){await close();throw error;}
}

function assertRestored(f,before){
 const after=f.snapshot();assert.equal(after.active,before.active,'ACTIVE_TEXTURE must be restored');
 assert.deepEqual(after.bindings,before.bindings,'every touched texture unit must return to its native binding');
 assert.equal(after.framebuffer,before.framebuffer,'custom terrain painting must retain the native tile framebuffer');
 assert.deepEqual(after.viewport,before.viewport,'custom terrain painting must retain the native tile viewport');
}
const tileOptions={tileID:{canonical:{z:16,x:10526,y:25410},wrap:0},width:512,height:512};

test('completed mesh remains unready while campus DEM loads, then publishes without restarting uploads',async()=>{
 let release,slices;const gate=new Promise(resolve=>release=resolve);
 const f=await fixture({elevationGate:gate,beforeElevationReady:async({layer,gpu})=>{
  assert.equal(layer.stats.ready,false,'native fallback must remain until complete elevation is resident');
  assert.equal(layer.stats.terrainStatus,'loading');assert.ok(layer.stats.bytes>0,'mesh upload completed independently');
  assert.equal(gpu.live.buffers.size,2);assert.equal(gpu.draws.length,0);slices=layer.stats.uploadSlices;release();await tick();
 }});
 try{assert.equal(f.layer.stats.ready,true);assert.equal(f.layer.stats.uploadSlices,slices,'waiting for DEM must not rebuild or restart the mesh');assert.equal(f.live.buffers.size,2);}
 finally{await f.close();}
});

test('ground sidecar binds every active sampler away from native tile attachments and restores borrowed state',async()=>{
 const f=await fixture();try{
  const before=f.enterNativePass();f.layer.groundLayer.renderToTerrainTile(f.gl,tileOptions);
  assert.equal(f.draws.length,2,'exercise both real production buffer draws');
  for(const draw of f.draws){assert.equal(draw.uniforms.get('u_groundPass'),1);assert.equal(draw.uniforms.get('u_terrainEnabled'),0);}
  assertRestored(f,before);
 }finally{await f.close();}
});

test('campus main pass without artwork initializes all samplers and restores native texture units',async()=>{
 const f=await fixture();try{
  assert.equal(f.requests.length,0);const before=f.enterNativePass();f.layer.render(f.gl,f.options);
  assert.equal(f.draws.length,2);for(const draw of f.draws)assert.equal(draw.uniforms.get('u_groundPass'),0);
  assertRestored(f,before);
 }finally{await f.close();}
});

test('church artwork pass rebinds its own photos after ground painting and restores all four texture units',async()=>{
 const f=await fixture({interior:true});try{
  assert.equal(f.requests.length,2);assert.ok(f.requests.some(url=>url.endsWith('/textures/church-nave.jpg')));assert.ok(f.requests.some(url=>url.endsWith('/textures/church-chancel.jpg')));
  const beforeGround=f.enterNativePass();f.layer.groundLayer.renderToTerrainTile(f.gl,tileOptions);assertRestored(f,beforeGround);
  const before=f.enterNativePass();f.layer.render(f.gl,f.options);assert.equal(f.draws.length,1);
  const draw=f.draws[0],nave=draw.uniforms.get('u_nave'),chancel=draw.uniforms.get('u_chancel');
  assert.equal(nave,0);assert.equal(chancel,1);assert.notEqual(draw.textures.get(f.gl.TEXTURE0+nave),draw.textures.get(f.gl.TEXTURE0+chancel));
  assertRestored(f,before);
 }finally{await f.close();}
});

test('negative control detects old unused-photo sampler feedback despite disabled artwork and height branches',async()=>{
 const f=await fixture();const assign=f.gl.uniform1i;
 try{
  f.resetSamplerDefaults();const before=f.enterNativePass();
  // Simulate the old renderer omitting only the unused-photo sampler assignments.
  f.gl.uniform1i=(location,value)=>{if(!['u_nave','u_chancel'].includes(location.name))assign(location,value);};
  assert.throws(()=>f.layer.groundLayer.renderToTerrainTile(f.gl,tileOptions),/feedback loop: u_nave|feedback loop: u_chancel/);
  assertRestored(f,before,'the failing draw must still release borrowed texture state');
 }finally{f.gl.uniform1i=assign;await f.close();}
});
