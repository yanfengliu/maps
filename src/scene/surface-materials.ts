/** Metre-scaled surface detail stays fixed in the world when the camera moves. */
import { MeshStandardMaterial } from "three";
import type { WorldStyle } from "../world/styles.js";
import {
  createSurfaceDetailTexture,
  SURFACE_DETAIL_METRES,
  SURFACE_DETAIL_STRENGTH,
  type SurfaceDetailKind,
} from "./surface-detail.js";

export interface SurfaceMaterial {
  material: MeshStandardMaterial;
  apply(style: WorldStyle): void;
  /** Disposes the material and the detail texture it owns. */
  dispose(): void;
}

export function createSurfaceMaterial(
  kind: "road" | "sidewalk" | "ground",
  style: WorldStyle,
): SurfaceMaterial {
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0, polygonOffset: kind !== "ground", polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const wetness = { value: style.wetness };

  // `ground` and `road` are tiled with a seeded detail texture; `sidewalk` keeps its
  // own metre-scale seam pattern, which is a shape rather than a tone and is not
  // something a tile can carry. The texture is owned by this material and disposed
  // with it, so rebuilding the scene does not strand one on the GPU.
  const detail: SurfaceDetailKind | undefined = kind === "sidewalk" ? undefined : kind;
  const texture = detail === undefined ? undefined : createSurfaceDetailTexture(detail);
  const detailMetres = { value: detail === undefined ? 1 : SURFACE_DETAIL_METRES[detail] };
  const detailStrength = { value: detail === undefined ? 0 : SURFACE_DETAIL_STRENGTH[detail] };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.mapsWetness = wetness;
    shader.uniforms.mapsDetailMap = { value: texture };
    shader.uniforms.mapsDetailMetres = detailMetres;
    shader.uniforms.mapsDetailStrength = detailStrength;
    shader.vertexShader = shader.vertexShader.replace("void main() {", "varying vec3 mapsSurfacePosition; void main() {")
      .replace("#include <project_vertex>", "#include <project_vertex>\n mapsSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "varying vec3 mapsSurfacePosition;\n" +
          "uniform float mapsWetness;\n" +
          "uniform sampler2D mapsDetailMap;\n" +
          "uniform float mapsDetailMetres;\n" +
          "uniform float mapsDetailStrength;\n" +
          "void main() {",
      )
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
        ` : `
        // The detail tile, sampled in world metres. The distance fade is the mip
        // chain the hardware selects from these coordinates' own derivatives, and
        // not a smoothstep toward 1.0: the road used to fade its grain out above
        // 0.015-0.08 m/px, which is why these surfaces were flat exactly where the
        // mid and far frames look at them. Minification now averages the finest
        // octave away first and leaves the coarse ones, so the surface keeps
        // structure at every distance the gate photographs.
        float detail = texture2D(mapsDetailMap, metres / mapsDetailMetres).r;
        diffuseColor.rgb *= 1.0 + (detail - 0.5) * mapsDetailStrength;
        ${kind === "road" ? `
        // Under the tile: the very low frequency band no 4 m tile can carry, so the
        // asphalt is not one patch repeated across the ward.
        float asphaltVariation = 0.5 + 0.5 * sin(metres.x * 0.18 + sin(metres.y * 0.25)) * sin(metres.y * 0.22);
        diffuseColor.rgb *= 0.94 + asphaltVariation * 0.07;
        roughnessFactor = mix(0.92, 0.28 + 0.23 * asphaltVariation, mapsWetness) + (detail - 0.5) * 0.08;
        ` : `
        // And the same band on the ground, whose period is about 20 m: relief the
        // 8 m tile cannot supply on its own.
        float variation = sin(metres.x * 0.31) * sin(metres.y * 0.37);
        diffuseColor.rgb *= 0.98 + variation * 0.045;
        roughnessFactor = 0.96 + (detail - 0.5) * 0.05;
        `}
        `}
      `);
  };
  material.customProgramCacheKey = () => `maps-surface-${kind}-v2`;
  const apply = (next: WorldStyle): void => {
    material.color.setHex(next.palette[kind === "ground" ? "ground" : kind]);
    material.envMapIntensity = kind === "road" ? 0.7 : 0.45;
    wetness.value = next.wetness;
  };
  apply(style);
  return {
    material,
    apply,
    dispose(): void {
      material.dispose();
      texture?.dispose();
    },
  };
}
