import { Color, type Material, type Texture, type WebGLProgramParametersWithUniforms } from 'three';

export interface LocalDrawUniforms { localPositions: {value: Texture | null}; worldNormals: {value: Texture | null}; width: {value: number}; flat: {value: number}; flatColor: {value: Color} }
export function localDrawUniforms(): LocalDrawUniforms { return {localPositions:{value:null},worldNormals:{value:null},width:{value:256},flat:{value:0},flatColor:{value:new Color(0xffffff)}}; }
export function patchLocalShader(shader: Pick<WebGLProgramParametersWithUniforms,'uniforms'|'vertexShader'|'fragmentShader'>, u: LocalDrawUniforms, normals: boolean, style=false): void {
  Object.assign(shader.uniforms,{localWalkPosition:u.localPositions,localWalkNormal:u.worldNormals,localWalkWidth:u.width,localWalkFlat:u.flat,localWalkColor:u.flatColor});
  if(!shader.vertexShader.includes('#include <begin_vertex>'))throw Error('Local walker draw pass has no position replacement hook.');
  shader.vertexShader='attribute float agentVertex;\nuniform highp sampler2D localWalkPosition;\nuniform highp sampler2D localWalkNormal;\nuniform float localWalkWidth;\nivec2 localWalkTexel(){int id=int(agentVertex);int w=int(localWalkWidth);return ivec2(id%w,id/w);}\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed = texelFetch(localWalkPosition, localWalkTexel(), 0).xyz;');
  if(normals){
    if(!shader.vertexShader.includes('#include <defaultnormal_vertex>'))throw Error('Local walker normal pass has no normal transform hook.');
    // This target already contains proper world yaw. Only the view rotation is
    // still due. Applying normalMatrix here would yaw the actor twice.
    shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>',`vec3 transformedNormal = mat3(viewMatrix) * texelFetch(localWalkNormal, localWalkTexel(), 0).xyz;
      #ifdef FLIP_SIDED
        transformedNormal = -transformedNormal;
      #endif
      #ifdef USE_TANGENT
        vec3 transformedTangent = (modelViewMatrix * vec4(objectTangent,0.0)).xyz;
        #ifdef FLIP_SIDED
          transformedTangent = -transformedTangent;
        #endif
      #endif`);
  }
  if(style){shader.fragmentShader='uniform float localWalkFlat;\nuniform vec3 localWalkColor;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(localWalkFlat>0.5) diffuseColor.rgb=localWalkColor;');}
}
export function applyLocalDraw(material: Material,u: LocalDrawUniforms,normals: boolean,style=false): void {
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);patchLocalShader(shader,u,normals,style);};
  material.customProgramCacheKey=()=>previousKey+`|native253-local-position-world-normal:${normals}:${style}`;
}

