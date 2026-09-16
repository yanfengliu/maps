import {
  MeshNormalMaterial, MeshStandardMaterial,
  type DataTexture, type MeshDepthMaterial, type MeshDistanceMaterial,
} from "three";
import type { AgentAssetLod, AgentAssetManifest } from "../../world/agent-assets.js";

type VatMaterial = MeshStandardMaterial | MeshDepthMaterial | MeshDistanceMaterial | MeshNormalMaterial;

/** One deformation for color, directional/spot depth, point distance and AO normals. */
export function applyAgentVat(material: VatMaterial, manifest: AgentAssetManifest, lod: AgentAssetLod, positions: DataTexture, normals: DataTexture, flatUniform = { value: 0 }): void {
  const walk = manifest.clips.find((clip) => clip.id === "walk")!;
  const idle = manifest.clips.find((clip) => clip.id === "idle")!;
  const previousCompile = material.onBeforeCompile;
  const baseProgramKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(material, shader, renderer);
    shader.uniforms["agentPositions"] = { value: positions };
    shader.uniforms["agentNormals"] = { value: normals };
    shader.uniforms["agentTextureSize"] = { value: [lod.textureWidth, lod.textureHeight] };
    shader.uniforms["agentRows"] = { value: lod.rowsPerFrame };
    shader.uniforms["agentFlatStyle"] = flatUniform;
    if (material instanceof MeshStandardMaterial) {
      shader.fragmentShader = "uniform float agentFlatStyle;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\nif (agentFlatStyle > 0.5) diffuseColor.rgb = diffuse;");
    }
    shader.vertexShader = `
      attribute float agentVertex;
      attribute vec3 agentMotion;
      uniform sampler2D agentPositions;
      uniform sampler2D agentNormals;
      uniform vec2 agentTextureSize;
      uniform float agentRows;
      vec3 agentFrame(sampler2D data, float frame) {
        vec2 pixel = vec2(mod(agentVertex, agentTextureSize.x), floor(agentVertex / agentTextureSize.x) + frame * agentRows);
        return texture2D(data, (pixel + 0.5) / agentTextureSize).xyz;
      }
      vec3 agentClip(sampler2D data, float first, float count, float phase) {
        float frame = fract(phase) * count;
        float a = floor(frame);
        return mix(agentFrame(data, first + a), agentFrame(data, first + mod(a + 1.0, count)), fract(frame));
      }
      vec3 agentPose(sampler2D data) {
        return mix(agentClip(data, ${idle.firstFrame}.0, ${idle.frameCount}.0, agentMotion.y),
                   agentClip(data, ${walk.firstFrame}.0, ${walk.frameCount}.0, agentMotion.x), agentMotion.z);
      }
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = agentPose(agentPositions);");
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nobjectNormal = normalize(agentPose(agentNormals));");
  };
  material.customProgramCacheKey = () => `maps-agent-vat-v2:${baseProgramKey}:${idle.firstFrame}:${idle.frameCount}:${walk.firstFrame}:${walk.frameCount}`;
}

/** MeshNormalMaterial omits alpha tests upstream. Match the generated UV0 cutouts. */
export function createAgentNormalMaterial(source: MeshStandardMaterial): MeshNormalMaterial {
  const material = new MeshNormalMaterial({ side: source.side, opacity: source.opacity, depthTest: source.depthTest, depthWrite: source.depthWrite });
  const maps = [source.map, source.alphaMap];
  material.customProgramCacheKey = () => `maps-agent-cutout-normal-v1:${Number(!!source.map)}:${Number(!!source.alphaMap)}`;
  if (maps.some((map) => map && map.channel !== 0)) {
    throw new Error(`Agent material ${source.name} uses a cutout texture outside UV0; export the agent recipe with UV0 textures.`);
  }
  material.onBeforeCompile = (shader) => {
    let declarations = "varying vec2 agentCutoutUv;\n";
    let sample = "float agentAlpha = opacity;\n";
    for (const [index, map] of maps.entries()) {
      if (!map) continue;
      map.updateMatrix();
      shader.uniforms[`agentCutoutMap${index}`] = { value: map };
      shader.uniforms[`agentCutoutTransform${index}`] = { value: map.matrix };
      declarations += `uniform sampler2D agentCutoutMap${index};\nuniform mat3 agentCutoutTransform${index};\n`;
      sample += `agentAlpha *= texture2D(agentCutoutMap${index}, (agentCutoutTransform${index} * vec3(agentCutoutUv, 1.0)).xy).${index === 0 ? "a" : "g"};\n`;
    }
    shader.uniforms["agentCutoutThreshold"] = { value: source.alphaTest };
    shader.vertexShader = "varying vec2 agentCutoutUv;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nagentCutoutUv = uv;");
    shader.fragmentShader = declarations + "uniform float agentCutoutThreshold;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${sample}if (agentAlpha < agentCutoutThreshold) discard;`);
  };
  return material;
}
