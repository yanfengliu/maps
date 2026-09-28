/** Bound: CPU shader-source composition and opt-in policy. No shader compile or appearance claim. */
import { afterEach,describe,it,expect,vi } from 'vitest';
import { ShaderLib, MeshStandardMaterial } from 'three';
import { patchLocalShader,localDrawUniforms,applyLocalDraw } from '../src/agents/render/local-walk-material.js';
import { populationFromQuery } from '../src/agents/population/config.js';
describe('actual native walker draw-pass composition',()=>{
  for(const [name,normals]of [['standard',true],['normal',true],['depth',false],['distanceRGBA',false]] as const)it(name+' samples local positions and preserves clipping/UV hooks',()=>{
    const lib=ShaderLib[name],shader={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};
    patchLocalShader(shader,localDrawUniforms(),normals,name==='standard');
    expect(shader.vertexShader).toContain('vec3 transformed = texelFetch(localWalkPosition');
    expect(shader.vertexShader).toContain('#include <project_vertex>');
    expect(shader.vertexShader).toContain('#include <clipping_planes_vertex>');
    expect(shader.vertexShader).toContain('#include <uv_vertex>');
    if(normals){expect(shader.vertexShader).toContain('mat3(viewMatrix) * texelFetch(localWalkNormal');expect(shader.vertexShader).not.toContain('#include <defaultnormal_vertex>');expect(shader.vertexShader).not.toContain('normalMatrix * texelFetch(localWalkNormal');}
    expect(shader.fragmentShader).toContain('#include <clipping_planes_fragment>');
    if(name==='standard'){expect(shader.fragmentShader).toContain('#include <map_fragment>');expect(shader.fragmentShader).toContain('diffuseColor.rgb=localWalkColor');expect(shader.fragmentShader).toContain('#include <alphatest_fragment>');}
  });
  it('composes the AO alpha-cutout hook instead of replacing it',()=>{
    const material=new MeshStandardMaterial();material.onBeforeCompile=shader=>{shader.fragmentShader+='\n// preexisting cutout';};
    applyLocalDraw(material,localDrawUniforms(),true,true);
    const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0],null as never);
    expect(shader.fragmentShader).toContain('// preexisting cutout');expect(material.customProgramCacheKey()).toContain('native253');material.dispose();
  });
  it('refuses a pass without the expected geometry hooks',()=>expect(()=>patchLocalShader({uniforms:{},vertexShader:'void main(){}',fragmentShader:''},localDrawUniforms(),true)).toThrow('position replacement hook'));
});
describe('private opt-in boundary through the real population parser',()=>{
  const seed=5970698;
  const binding={url:'/local-walk/manifest.json',sha256:'fixture binding; no assets fetched'};
  afterEach(()=>vi.unstubAllGlobals());
  async function request(query:string,sceneSeed=seed,prepared=true):Promise<boolean> {
    vi.resetModules();
    vi.stubGlobal('__MAPS_LOCAL_WALK__',prepared?binding:null);
    const {localWalkRequested}=await import('../src/agents/local-walk-options.js');
    return localWalkRequested(new URLSearchParams(query),sceneSeed,populationFromQuery(query,sceneSeed));
  }
  it.each(['','agents=0','agents=1'])('keeps unrequested startup unchanged for %s',async query=>{
    expect(await request(query,seed,false)).toBe(false);
  });
  it.each([
    'local-walk=1&seed=5970698&style=satellite',
    'local-walk=1&agents=0',
    'local-walk=1&pedestrians=0&vehicles=0',
    'local-walk=1&agents=1&pedestrians=0&vehicles=0',
  ])('admits effective zero generic actors from %s',async query=>{
    expect(populationFromQuery(query,seed)).toMatchObject({pedestrians:0,vehicles:0});
    expect(await request(query)).toBe(true);
  });
  it.each([
    'local-walk=1&agents=1',
    'local-walk=1&pedestrians=1&vehicles=0',
    'local-walk=1&pedestrians=0&vehicles=1',
  ])('refuses coexisting generic actors from %s',async query=>{
    await expect(request(query)).rejects.toThrow('cannot coexist');
  });
  it.each([
    ['local-walk=1&agents=2','not a population setting'],
    ['local-walk=1&agents=0&pedestrians=1','switches the population off'],
  ])('retains parser refusal for %s',async(query,message)=>{
    await expect(request(query!)).rejects.toThrow(message!);
  });
  it('still requires the private prepared binding',async()=>{
    await expect(request('local-walk=1',seed,false)).rejects.toThrow('prepared prototype build');
  });
  it('still refuses a different scene seed',async()=>{
    await expect(request('local-walk=1&seed=9137',9137)).rejects.toThrow('retained seed 5970698');
  });
  it('still refuses an unknown local walk mode',async()=>{
    await expect(request('local-walk=2')).rejects.toThrow('prepared prototype build');
  });
});
