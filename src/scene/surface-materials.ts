/** Metre-scaled surface detail stays fixed in the world when the camera moves. */
import { MeshStandardMaterial } from "three";
import type { WorldStyle } from "../world/styles.js";

export function createSurfaceMaterial(kind: "road" | "sidewalk" | "ground", style: WorldStyle): { material: MeshStandardMaterial; apply(style: WorldStyle): void } {
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0, polygonOffset: kind !== "ground", polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const wetness = { value: style.wetness };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.mapsWetness = wetness;
    shader.vertexShader = shader.vertexShader.replace("void main() {", "varying vec3 mapsSurfacePosition; void main() {")
      .replace("#include <project_vertex>", "#include <project_vertex>\n mapsSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "varying vec3 mapsSurfacePosition; uniform float mapsWetness; void main() {")
      .replace("#include <roughnessmap_fragment>", `
        #include <roughnessmap_fragment>
        vec2 metres = mapsSurfacePosition.xz;
        ${kind === "sidewalk" ? `
        vec2 cell = metres / vec2(0.6, 0.4);
        cell.x += mod(floor(cell.y), 2.0) * 0.5;
        vec2 seam = min(fract(cell), 1.0 - fract(cell));
        vec2 aa = max(fwidth(cell), vec2(0.001));
        vec2 gap = smoothstep(vec2(0.012) - aa, vec2(0.012) + aa, seam);
        float grout = gap.x * gap.y;
        diffuseColor.rgb *= mix(0.75, 1.0, grout);
        roughnessFactor = 0.82;
        ` : kind === "road" ? `
        float asphaltVariation = 0.5 + 0.5 * sin(metres.x * 0.18 + sin(metres.y * 0.25)) * sin(metres.y * 0.22);
        float grainVisible = 1.0 - smoothstep(0.015, 0.08, max(fwidth(metres.x), fwidth(metres.y)));
        float grain = sin(metres.x * 180.0) * sin(metres.y * 161.0) * grainVisible;
        diffuseColor.rgb *= 0.93 + asphaltVariation * 0.09 + grain * 0.025;
        roughnessFactor = mix(0.92, 0.28 + 0.23 * asphaltVariation, mapsWetness);
        ` : `
        float variation = sin(metres.x * 0.31) * sin(metres.y * 0.37);
        diffuseColor.rgb *= 0.97 + variation * 0.03;
        roughnessFactor = 0.96;
        `}
      `);
  };
  material.customProgramCacheKey = () => `maps-surface-${kind}-v1`;
  const apply = (next: WorldStyle): void => {
    material.color.setHex(next.palette[kind === "ground" ? "ground" : kind]);
    material.envMapIntensity = kind === "road" ? 0.7 : 0.45;
    wetness.value = next.wetness;
  };
  apply(style);
  return { material, apply };
}
