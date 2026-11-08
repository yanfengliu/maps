import test from 'node:test';
import assert from 'node:assert/strict';
import { ChurchTextures } from '../src/church-textures.ts';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function bitmap(width=800,height=600){return {width,height,closed:0,close(){this.closed++;assert.equal(this.closed,1,'an ImageBitmap must close exactly once');}};}

function fixture(){
  const previousFetch=globalThis.fetch,previousDecode=globalThis.createImageBitmap,requests=[],decodes=[],live=new Set(),deleted=[],uploads=[],uniforms=[];
  let repaints=0,active=103,allocationFailure=false,uploadFailure=false;
  const bindings=new Map([[100,{name:'map0'}],[101,{name:'map1'}],[103,{name:'map3'}]]),initialBindings=new Map(bindings);
  globalThis.fetch=(path,options)=>{const job={path,options,...deferred()};requests.push(job);return job.promise;};
  globalThis.createImageBitmap=blob=>{const job={blob,...deferred()};decodes.push(job);return job.promise;};
  const gl={TEXTURE0:100,ACTIVE_TEXTURE:1,TEXTURE_BINDING_2D:2,TEXTURE_2D:3,TEXTURE_MIN_FILTER:4,TEXTURE_MAG_FILTER:5,TEXTURE_WRAP_S:6,TEXTURE_WRAP_T:7,LINEAR:8,CLAMP_TO_EDGE:9,RGBA:10,UNSIGNED_BYTE:11,
    getParameter:name=>name===1?active:bindings.get(active)??null,
    activeTexture:value=>{active=value;},bindTexture:(_,texture)=>bindings.set(active,texture),texParameteri(){},
    createTexture(){if(allocationFailure)return null;const value={};live.add(value);return value;},
    deleteTexture(value){assert.ok(live.delete(value),'texture deleted twice or not owned');deleted.push(value);},
    texImage2D(...args){if(uploadFailure)throw new Error('injected GPU upload failure');uploads.push(args.at(-1));},
    uniform1i:(location,value)=>uniforms.push([location,value])};
  const textures=new ChurchTextures(()=>repaints++);
  const fetches=async(start=0)=>{for(const request of requests.slice(start))request.resolve({ok:true,blob:async()=>({path:request.path})});await tick();};
  const decoded=async(images,start=0)=>{images.forEach((image,i)=>decodes[start+i].resolve(image));await tick();};
  const restore=()=>{textures.dispose();assert.equal(live.size,0,'resident textures leaked');globalThis.fetch=previousFetch;if(previousDecode===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=previousDecode;};
  return {gl,textures,requests,decodes,live,deleted,uploads,uniforms,bindings,initialBindings,fetches,decoded,restore,get repaints(){return repaints;},get active(){return active;},failAllocation(){allocationFailure=true;},failUpload(){uploadFailure=true;}};
}

test('artwork decodes off-frame, uploads one image per advance, and restores texture units and bindings',async()=>{
  const f=fixture(),images=[bitmap(1280,960),bitmap(1000,800)];try{
    assert.equal(f.textures.advance(f.gl),false);assert.equal(f.requests.length,2);assert.equal(f.live.size,0);assert.equal(f.textures.ready,false);
    assert.deepEqual(f.requests.map(request=>request.path),['/textures/church-nave.jpg','/textures/church-chancel.jpg']);
    await f.fetches();assert.equal(f.decodes.length,2);await f.decoded(images);assert.equal(f.repaints,1);assert.equal(f.live.size,0,'decoding must not allocate GPU objects');
    assert.equal(f.textures.advance(f.gl),false);assert.equal(f.live.size,1);assert.equal(f.uploads.length,1);assert.equal(images[0].closed,1);assert.equal(images[1].closed,0);
    assert.equal(f.textures.ready,false);assert.equal(f.textures.bytes,1280*960*4);assert.equal(f.active,103);assert.deepEqual(f.bindings,f.initialBindings);
    assert.equal(f.textures.advance(f.gl),true);assert.equal(f.live.size,2);assert.equal(f.uploads.length,2);assert.equal(images[1].closed,1);
    assert.equal(f.textures.bytes,(1280*960+1000*800)*4);assert.deepEqual(f.bindings,f.initialBindings);
    for(let i=0;i<4;i++)assert.equal(f.textures.advance(f.gl),true);assert.equal(f.uploads.length,2,'ready frames must reuse the two allocations');
    const restoreBindings=f.textures.bind(f.gl,{u_nave:'nave',u_chancel:'chancel'});
    assert.deepEqual(f.uniforms,[['nave',0],['chancel',1]]);assert.ok(f.live.has(f.bindings.get(100)));assert.ok(f.live.has(f.bindings.get(101)));
    restoreBindings();assert.equal(f.active,103);assert.deepEqual(f.bindings,f.initialBindings);
    f.textures.dispose();assert.equal(f.deleted.length,2);assert.equal(f.textures.bytes,0);assert.equal(f.textures.ready,false);
    f.textures.dispose();assert.equal(f.deleted.length,2);assert.deepEqual(images.map(image=>image.closed),[1,1]);
  }finally{f.restore();}
});

test('cancelling pending fetches aborts both requests and cannot publish an old error into a new visit',async()=>{
  const f=fixture();try{
    f.textures.advance(f.gl);const stale=f.requests.slice();f.textures.dispose();assert.ok(stale.every(request=>request.options.signal.aborted));
    f.textures.advance(f.gl);assert.equal(f.requests.length,4);stale.forEach(request=>request.reject(new DOMException('Aborted','AbortError')));await tick();
    assert.equal(f.repaints,0);assert.equal(f.textures.advance(f.gl),false);assert.equal(f.live.size,0);
    await f.fetches(2);const images=[bitmap(),bitmap()];await f.decoded(images);f.textures.advance(f.gl);assert.equal(f.textures.advance(f.gl),true);
    assert.equal(f.requests.length,4);assert.deepEqual(images.map(image=>image.closed),[1,1]);
  }finally{f.restore();}
});

test('cancellation between the two decodes closes an already resolved bitmap and a late bitmap exactly once',async()=>{
  const f=fixture(),old=[bitmap(),bitmap()];try{
    f.textures.advance(f.gl);await f.fetches();f.decodes[0].resolve(old[0]);await tick();
    assert.equal(old[0].closed,0);f.textures.dispose();f.textures.advance(f.gl);
    f.decodes[1].resolve(old[1]);await tick();assert.deepEqual(old.map(image=>image.closed),[1,1]);assert.equal(f.repaints,0);assert.equal(f.live.size,0);
    await f.fetches(2);const current=[bitmap(),bitmap()];await f.decoded(current,2);assert.equal(f.repaints,1);
    f.textures.advance(f.gl);assert.equal(f.textures.advance(f.gl),true);assert.deepEqual(current.map(image=>image.closed),[1,1]);
    f.textures.dispose();assert.deepEqual(old.map(image=>image.closed),[1,1]);
  }finally{f.restore();}
});

for(const uploaded of [0,1])test(`exit after ${uploaded} uploads releases queued images and only the owned GPU allocations`,async()=>{
  const f=fixture(),images=[bitmap(),bitmap()];try{
    f.textures.advance(f.gl);await f.fetches();await f.decoded(images);if(uploaded)f.textures.advance(f.gl);
    f.textures.dispose();assert.equal(f.deleted.length,uploaded);assert.equal(f.live.size,0);assert.deepEqual(images.map(image=>image.closed),[1,1]);assert.equal(f.textures.bytes,0);
    f.textures.dispose();assert.deepEqual(images.map(image=>image.closed),[1,1]);
  }finally{f.restore();}
});

test('an HTTP failure reports a retryable error and releases the other decoded image',async()=>{
  const f=fixture(),image=bitmap();try{
    f.textures.advance(f.gl);f.requests[0].resolve({ok:false,status:503});f.requests[1].resolve({ok:true,blob:async()=>({})});await tick();
    f.decodes[0].resolve(image);await tick();assert.equal(image.closed,1);assert.equal(f.live.size,0);assert.equal(f.textures.ready,false);
    assert.throws(()=>f.textures.advance(f.gl),/Church artwork could not load.*Retry.*HTTP 503/);assert.throws(()=>f.textures.advance(f.gl),/HTTP 503/);
    f.textures.dispose();assert.equal(f.textures.advance(f.gl),false,'disposal permits a fresh retry');assert.equal(f.requests.length,4);
  }finally{f.restore();}
});

test('a known fetch failure is actionable even while the sibling request is pending',async()=>{
  const f=fixture();try{
    f.textures.advance(f.gl);f.requests[0].reject(new TypeError('network unavailable'));await tick();
    assert.equal(f.textures.ready,false);assert.equal(f.live.size,0);
    assert.throws(()=>f.textures.advance(f.gl),/Church artwork could not load.*Retry.*network unavailable/);
  }finally{f.restore();}
});

for(const size of [[1281,700],[700,1281]])test(`oversized ${size.join(' by ')} artwork closes both decodes and never uploads`,async()=>{
  const f=fixture(),images=[bitmap(...size),bitmap()];try{
    f.textures.advance(f.gl);await f.fetches();await f.decoded(images);
    assert.deepEqual(images.map(image=>image.closed),[1,1]);assert.equal(f.live.size,0);assert.equal(f.uploads.length,0);assert.equal(f.textures.bytes,0);
    assert.throws(()=>f.textures.advance(f.gl),/exceeds its texture budget/);assert.equal(f.textures.ready,false);
  }finally{f.restore();}
});

for(const kind of ['allocation','upload'])test(`GPU ${kind} failure restores bindings, releases resources and remains an actionable error`,async()=>{
  const f=fixture(),images=[bitmap(),bitmap()];try{
    f.textures.advance(f.gl);await f.fetches();await f.decoded(images);if(kind==='allocation')f.failAllocation();else f.failUpload();
    assert.throws(()=>f.textures.advance(f.gl),kind==='allocation'?/could not be allocated/:/injected GPU upload failure/);
    assert.equal(images[0].closed,1);assert.equal(f.live.size,0);assert.equal(f.textures.bytes,0);assert.equal(f.active,103);assert.deepEqual(f.bindings,f.initialBindings);
    // Failure must not silently turn into an endless false-ready loop after
    // the first thrown frame has consumed an image from the upload queue.
    assert.throws(()=>f.textures.advance(f.gl));assert.throws(()=>f.textures.advance(f.gl));
  }finally{f.restore();assert.deepEqual(images.map(image=>image.closed),[1,1]);}
});
