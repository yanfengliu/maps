/**
 * The three surface treatments — road, sidewalk and ground — and the shader patch
 * that gives each of them its metre-scaled structure.
 *
 * **Why the patch verifies its own anchors.** It is applied by rewriting three's own
 * shader source with `String.replace`, and a `replace` whose anchor does not match
 * returns the source unchanged: the material then compiles, renders, and reports
 * nothing, and the only visible symptom is a surface that is flat where it should be
 * textured. The eight-frame re-inspection of the appearance batch's frames
 * (`artifacts/inspection-gpu2/`, 2026-09-18) recorded exactly that symptom class as its
 * leading hypothesis for why the new detail tile did not show. `patchSurfaceShader`
 * therefore refuses a source that does not carry its anchors, by name, instead of
 * silently no-opping, and `test/surface-material-shader.test.ts` holds the refusal with
 * a red control.
 *
 * The anchors are three's own chunk names and the `void main() {` of
 * `ShaderLib.standard`, which is what `MeshStandardMaterial` compiles.
 */
import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from "three";
import type { WorldStyle } from "../world/styles.js";
import {
  createSurfaceDetailTexture,
  SURFACE_DETAIL_METRES,
  SURFACE_DETAIL_STRENGTH,
  type SurfaceDetailKind,
} from "./surface-detail.js";

/** The three surfaces this module dresses. */
export type SurfaceMaterialKind = "road" | "sidewalk" | "ground";

export interface SurfaceMaterial {
  material: MeshStandardMaterial;
  apply(style: WorldStyle): void;
  /** Disposes the material and the detail texture it owns. */
  dispose(): void;
}

/** The per-material uniform objects the patch binds; owned by the material. */
export interface SurfaceShaderUniforms {
  wetness: { value: number };
  detailMap: { value: unknown };
  detailMetres: { value: number };
  detailStrength: { value: number };
}

/** The part of three's program parameters this patch reads and rewrites. */
export interface PatchableShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, unknown>;
}

/** Anchors, named so a failure can say which one moved. */
const VERTEX_MAIN = "void main() {";
const VERTEX_PROJECT = "#include <project_vertex>";
const FRAGMENT_MAIN = "void main() {";
const FRAGMENT_ROUGHNESS = "#include <roughnessmap_fragment>";

/**
 * The uniform each material declares, and the stage that declares it.
 *
 * Used both to write the declarations and to check, after patching, that every name
 * bound in `shader.uniforms` is one the shader actually declares: a name that is bound
 * but not declared is the other silent failure in this class, and it looks the same
 * from the frame — a uniform that never reaches the surface.
 */
const UNIFORM_DECLARATIONS: Readonly<Record<keyof SurfaceShaderUniforms, string>> = Object.freeze({
  wetness: "uniform float mapsWetness;",
  detailMap: "uniform sampler2D mapsDetailMap;",
  detailMetres: "uniform float mapsDetailMetres;",
  detailStrength: "uniform float mapsDetailStrength;",
});

/** The marker each kind's injected body must leave behind, for the post-checks. */
function markerFor(kind: SurfaceMaterialKind): string {
  return kind === "sidewalk"
    ? "diffuseColor.rgb *= mix(0.75, 1.0, grout);"
    : "diffuseColor.rgb *= 1.0 + (detail - 0.5) * mapsDetailStrength;";
}

/**
 * Replace `anchor` exactly once, or throw naming the anchor.
 *
 * A `String.replace` with no match returns the input unchanged, which is the silent
 * no-op this function exists to refuse; a *second* occurrence would mean three added a
 * chunk and only the first was patched, which is a partial no-op and just as invisible.
 */
function replaceOnce(source: string, anchor: string, replacement: string, where: string): string {
  const occurrences = source.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `The surface shader patch did not apply to ${where}: the anchor ${JSON.stringify(anchor)} ` +
        `appears ${occurrences} times in three's shader source and must appear exactly once. Without ` +
        "this replacement the surface renders with no detail and reports no error, so it refuses " +
        "instead. Check the anchor against `ShaderLib.standard` in the installed three revision and " +
        "update it here if the chunk was renamed.",
    );
  }
  return source.replace(anchor, replacement);
}

/** Throw unless `marker` is present and comes after `after` in the patched source. */
function requireAfter(source: string, marker: string, after: string, where: string): void {
  const at = source.indexOf(marker);
  const floor = source.indexOf(after);
  if (at === -1) {
    throw new Error(
      `The surface shader patch did not apply to ${where}: the injected marker ` +
        `${JSON.stringify(marker)} is not in the patched source. A replacement ran but its result is ` +
        "not in the shader, so the surface would render with no detail and no error.",
    );
  }
  if (floor !== -1 && at < floor) {
    throw new Error(
      `The surface shader patch landed in the wrong place in ${where}: the injected marker ` +
        `${JSON.stringify(marker)} appears before ${JSON.stringify(after)}, so it sits outside the ` +
        "shader's entry point and would not reach the surface's colour at all.",
    );
  }
}

/**
 * Rewrite three's standard shader for one surface kind and bind its uniforms.
 *
 * Pure with respect to everything but `shader` and the uniform objects it is handed: the
 * same inputs give the same two sources, which is what lets the unit cases drive it
 * against `ShaderLib.standard` without a renderer.
 */
export function patchSurfaceShader(kind: SurfaceMaterialKind, uniforms: SurfaceShaderUniforms, shader: PatchableShader): void {
  shader.uniforms.mapsWetness = uniforms.wetness;
  shader.uniforms.mapsDetailMap = uniforms.detailMap;
  shader.uniforms.mapsDetailMetres = uniforms.detailMetres;
  shader.uniforms.mapsDetailStrength = uniforms.detailStrength;

  const declarations = Object.values(UNIFORM_DECLARATIONS).join("\n");

  shader.vertexShader = replaceOnce(
    shader.vertexShader,
    VERTEX_MAIN,
    `varying vec3 mapsSurfacePosition;\n${VERTEX_MAIN}`,
    `${kind}'s vertex stage, entry point`,
  );
  shader.vertexShader = replaceOnce(
    shader.vertexShader,
    VERTEX_PROJECT,
    `${VERTEX_PROJECT}\n  mapsSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    `${kind}'s vertex stage, world position`,
  );

  let fragment = replaceOnce(
    shader.fragmentShader,
    FRAGMENT_MAIN,
    `varying vec3 mapsSurfacePosition;\n${declarations}\n${FRAGMENT_MAIN}`,
    `${kind}'s fragment stage, entry point`,
  );
  fragment = replaceOnce(
    fragment,
    FRAGMENT_ROUGHNESS,
    `
        ${FRAGMENT_ROUGHNESS}
        vec2 metres = mapsSurfacePosition.xz;
        ${
          kind === "sidewalk"
            ? `
        vec2 cell = metres / vec2(0.6, 0.4);
        cell.x += mod(floor(cell.y), 2.0) * 0.5;
        vec2 seam = min(fract(cell), 1.0 - fract(cell));
        vec2 aa = max(fwidth(cell), vec2(0.001));
        vec2 gap = smoothstep(vec2(0.012) - aa, vec2(0.012) + aa, seam);
        float grout = gap.x * gap.y;
        diffuseColor.rgb *= mix(0.75, 1.0, grout);
        roughnessFactor = 0.82;
        `
            : `
        // The detail tile, sampled in world metres. The distance fade is the mip chain
        // the hardware selects from these coordinates' own derivatives, and not a
        // smoothstep toward 1.0: the road used to fade its grain out above
        // 0.015-0.08 m/px, which is why these surfaces were flat exactly where the mid
        // and far frames look at them. Minification now averages the finest octave away
        // first and leaves the coarse ones, so the surface keeps structure at every
        // distance the gate photographs.
        float detail = texture2D(mapsDetailMap, metres / mapsDetailMetres).r;
        diffuseColor.rgb *= 1.0 + (detail - 0.5) * mapsDetailStrength;
        ${
          kind === "road"
            ? `
        // Under the tile: the very low frequency band no 4 m tile can carry, so the
        // asphalt is not one patch repeated across the ward.
        float asphaltVariation = 0.5 + 0.5 * sin(metres.x * 0.18 + sin(metres.y * 0.25)) * sin(metres.y * 0.22);
        diffuseColor.rgb *= 0.94 + asphaltVariation * 0.07;
        roughnessFactor = mix(0.92, 0.28 + 0.23 * asphaltVariation, mapsWetness) + (detail - 0.5) * 0.08;
        `
            : `
        // And the same band on the ground, whose period is about 20 m: relief the 8 m
        // tile cannot supply on its own.
        float variation = sin(metres.x * 0.31) * sin(metres.y * 0.37);
        diffuseColor.rgb *= 0.98 + variation * 0.045;
        roughnessFactor = 0.96 + (detail - 0.5) * 0.05;
        `
        }
        `
        }
      `,
    `${kind}'s fragment stage, surface colour`,
  );

  const marker = markerFor(kind);
  // A varying is a global declaration, so it belongs *before* the entry point; the
  // colour write belongs inside it, after the include whose variables it reads.
  const varyingAt = fragment.indexOf("varying vec3 mapsSurfacePosition;");
  const entryAt = fragment.indexOf(FRAGMENT_MAIN);
  if (varyingAt === -1 || (entryAt !== -1 && varyingAt > entryAt)) {
    throw new Error(
      `The surface shader patch put ${kind}'s varying in the wrong place: "varying vec3 ` +
        "mapsSurfacePosition;\" must be declared at global scope, before the shader's entry point, and " +
        "it is not. The varying carries the world position the tile is sampled at, so without it the " +
        "surface renders with no detail and no error.",
    );
  }
  requireAfter(fragment, marker, FRAGMENT_MAIN, `${kind}'s fragment stage, colour`);
  requireAfter(fragment, marker, FRAGMENT_ROUGHNESS, `${kind}'s fragment stage, order`);
  for (const declaration of Object.values(UNIFORM_DECLARATIONS)) {
    if (!fragment.includes(declaration)) {
      throw new Error(
        `The surface shader patch bound a uniform that ${kind}'s fragment stage does not declare: ` +
          `${JSON.stringify(declaration)} is missing from the patched source, so the uniform would never ` +
          "reach the surface and the material would render untextured with no error.",
      );
    }
  }
  shader.fragmentShader = fragment;
}

export function createSurfaceMaterial(kind: SurfaceMaterialKind, style: WorldStyle): SurfaceMaterial {
  const material = new MeshStandardMaterial({ roughness: 0.85, metalness: 0, polygonOffset: kind !== "ground", polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const wetness = { value: style.wetness };

  // `ground` and `road` are tiled with a seeded detail texture; `sidewalk` keeps its own
  // metre-scale seam pattern, which is a shape rather than a tone and is not something a
  // tile can carry. The texture is owned by this material and disposed with it, so
  // rebuilding the scene does not strand one on the GPU.
  const detail: SurfaceDetailKind | undefined = kind === "sidewalk" ? undefined : kind;
  const texture = detail === undefined ? undefined : createSurfaceDetailTexture(detail);
  const uniforms: SurfaceShaderUniforms = {
    wetness,
    detailMap: { value: texture },
    detailMetres: { value: detail === undefined ? 1 : SURFACE_DETAIL_METRES[detail] },
    detailStrength: { value: detail === undefined ? 0 : SURFACE_DETAIL_STRENGTH[detail] },
  };

  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    patchSurfaceShader(kind, uniforms, shader as unknown as PatchableShader);
  };
  material.customProgramCacheKey = () => `maps-surface-${kind}-v3`;
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
