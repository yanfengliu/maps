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
import { createStructureSeedTexture, STRUCTURE_GLSL } from "./surface-structure.js";
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
  structureSeeds?: { value: unknown };
  structureStrength?: { value: number };
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
const FRAGMENT_NORMAL = "#include <normal_fragment_maps>";

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
  structureSeeds: "uniform sampler2D mapsStructureSeeds;",
  structureStrength: "uniform float mapsStructureStrength;",
});

/** The marker each kind's injected body must leave behind, for the post-checks. */
function markerFor(kind: SurfaceMaterialKind): string {
  return kind === "sidewalk"
    ? "diffuseColor.rgb *= pavingTone;"
    : "diffuseColor.rgb *= 1.0 + (detail - 0.5) * mapsDetailStrength;";
}

/** Box-footprint coverage of the staggered pavers. This integrates both row
 * phases; the box approximates a skewed projected pixel, not its parallelogram.
 * Kept scalar so the bounded arithmetic tests can evaluate the emitted code.
 */
const PAVING_COVERAGE_GLSL = /* glsl */ `
float mapsPavingIntegral(float x, float low, float high) {
  return floor(x) * (high - low) + clamp(fract(x) - low, 0.0, high - low);
}
float mapsPavingInterval(float center, float width, float low, float high) {
  float local = fract(center);
  return clamp((mapsPavingIntegral(local + width * 0.5, low, high)
    - mapsPavingIntegral(local - width * 0.5, low, high)) / width, 0.0, 1.0);
}
float mapsPavingCoverage(float x, float y, float widthX, float widthY) {
  float evenRows = mapsPavingInterval(y * 0.5, widthY * 0.5, 0.006, 0.494);
  float oddRows = mapsPavingInterval(y * 0.5, widthY * 0.5, 0.506, 0.994);
  return mapsPavingInterval(x, widthX, 0.012, 0.988) * evenRows
    + mapsPavingInterval(x + 0.5, widthX, 0.012, 0.988) * oddRows;
}
`;

/** A six millimetre recessed joint with an eighteen millimetre rounded bevel.
 * The slope retires once its footprint cannot resolve the bevel. Joint colour
 * continues to use the area integral above, so distant paving keeps its mean.
 * These are shading dimensions, never geometry or actor-contact heights.
 */
const PAVING_RELIEF_GLSL = /* glsl */ `
float mapsPavingBevelSlope(float coordinate, float period, float footprint) {
  float phase = fract(coordinate);
  float edge = min(phase, 1.0 - phase) * period;
  float t = clamp((edge - 0.006) / 0.018, 0.0, 1.0);
  float slope = 0.006 * 6.0 * t * (1.0 - t) / 0.018;
  float resolved = 1.0 - smoothstep(0.012, 0.10, footprint);
  return (phase < 0.5 ? 1.0 : -1.0) * slope * resolved;
}
`;

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
  shader.uniforms.mapsStructureSeeds = uniforms.structureSeeds ?? { value: null };
  shader.uniforms.mapsStructureStrength = uniforms.structureStrength ?? { value: 0 };

  const declarations = Object.entries(UNIFORM_DECLARATIONS).filter(([key]) => !key.startsWith("structure")).map(([, declaration]) => declaration).join("\n") + STRUCTURE_GLSL + (kind === "sidewalk" ? PAVING_COVERAGE_GLSL + PAVING_RELIEF_GLSL : "");

  shader.vertexShader = replaceOnce(
    shader.vertexShader,
    VERTEX_MAIN,
    `varying vec3 mapsSurfacePosition;\n${kind === "sidewalk" ? "varying vec3 mapsSurfaceNormal;" : ""}\n${VERTEX_MAIN}`,
    `${kind}'s vertex stage, entry point`,
  );
  shader.vertexShader = replaceOnce(
    shader.vertexShader,
    VERTEX_PROJECT,
    `${VERTEX_PROJECT}\n  mapsSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  ${kind === "sidewalk" ? "mapsSurfaceNormal = inverseTransformDirection(transformedNormal, viewMatrix);" : ""}`,
    `${kind}'s vertex stage, world position`,
  );

  let fragment = replaceOnce(
    shader.fragmentShader,
    FRAGMENT_MAIN,
    `varying vec3 mapsSurfacePosition;\n${kind === "sidewalk" ? "varying vec3 mapsSurfaceNormal;" : ""}\n${declarations}\n${FRAGMENT_MAIN}`,
    `${kind}'s fragment stage, entry point`,
  );
  fragment = replaceOnce(
    fragment,
    FRAGMENT_ROUGHNESS,
    `
        ${FRAGMENT_ROUGHNESS}
        vec2 metres = mapsSurfacePosition.xz;
        float region = mapsStructureRegion(metres);
        vec2 panel = mapsStructurePanel(metres);
        ${
          kind === "sidewalk"
            ? `
        vec2 cell = metres / vec2(0.6, 0.4);
        // Differentiate the continuous coordinates before applying row phase.
        vec2 aa = max(fwidth(cell), vec2(0.001));
        float grout = mapsPavingCoverage(cell.x, cell.y, aa.x, aa.y);
        // Preserve the old resolved-cell mean while reducing joint contrast.
        float meanGrout = 1.0 - 0.976 * 0.976;
        float pavingTone = (1.0 - mapsDetailStrength * (1.0 - grout))
          * (1.0 - 0.25 * meanGrout) / (1.0 - mapsDetailStrength * meanGrout);
        diffuseColor.rgb *= pavingTone;
        // Seeded texture values vary whole pavers; continuous coordinates retain
        // derivatives for both reads. Retire cell steps before they are subpixel.
        vec2 paverCell = vec2(cell.x + 0.5 * mod(floor(cell.y), 2.0), cell.y);
        vec2 paverUv = (floor(paverCell) + 0.5) / 16.0;
        float paverValue = texture2DGradEXT(mapsDetailMap, paverUv, dFdx(cell) / 16.0, dFdy(cell) / 16.0).r - 0.5;
        float grainValue = texture2D(mapsDetailMap, metres / mapsDetailMetres).r - 0.5;
        float resolvedPaver = 1.0 - smoothstep(0.18, 0.65, max(aa.x, aa.y));
        float topFace = smoothstep(0.65, 0.92, normalize(mapsSurfaceNormal).y);
        float paverVariation = mapsDetailStrength * (2.4 * paverValue * resolvedPaver + 0.65 * grainValue);
        // The side response is solid: no collapsed X/Z joints or painted halo.
        diffuseColor.rgb *= mix(0.97 / pavingTone, 1.0 + paverVariation, topFace);
        roughnessFactor = mix(0.9, 0.82 + paverVariation * 0.35, topFace);
        vec2 mapsGroundSlope = vec2(
          mapsPavingBevelSlope(paverCell.x, 0.6, aa.x * 0.6),
          mapsPavingBevelSlope(cell.y, 0.4, aa.y * 0.4));
        // Suppress the vertical-joint bevel where the stagger changes row.
        float rowEdge = min(fract(cell.y), 1.0 - fract(cell.y)) * 0.4;
        mapsGroundSlope.x *= smoothstep(0.006, 0.024, rowEdge);
        // Authored paving regions sit only on the semantic top surface.
        float pavingRegion = 1.0 + (region - 0.5) * 0.32 + panel.x * 0.10 - panel.y * 0.20;
        diffuseColor.rgb *= mix(1.0, pavingRegion, topFace * mapsStructureStrength);
        roughnessFactor = clamp(roughnessFactor + topFace * mapsStructureStrength * (0.04 * panel.x - 0.02 * panel.y), 0.3, 1.0);
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
        // The existing 3.125 cm aggregate texels now alter light response as
        // well as colour. Central differences share the albedo's mip footprint;
        // opposing samples cancel once the grain is below a pixel.
        vec2 aggregateUv = metres / mapsDetailMetres;
        vec2 aggregateTexel = vec2(1.0 / 128.0, 0.0);
        vec2 mapsGroundSlope = vec2(
          texture2D(mapsDetailMap, aggregateUv + aggregateTexel.xy).r - texture2D(mapsDetailMap, aggregateUv - aggregateTexel.xy).r,
          texture2D(mapsDetailMap, aggregateUv + aggregateTexel.yx).r - texture2D(mapsDetailMap, aggregateUv - aggregateTexel.yx).r
        ) * (0.018 / (2.0 * mapsDetailMetres / 128.0));
        diffuseColor.rgb *= 0.94 + asphaltVariation * 0.07;
        roughnessFactor = mix(0.92, 0.28 + 0.23 * asphaltVariation, mapsWetness) + (detail - 0.5) * mix(0.08, 0.28, smoothstep(0.9, 1.0, mapsStructureStrength));
        // Disclosed resurfacing variation, not a claim of surveyed repair patches.
        float asphaltRegion = 1.0 + (region - 0.5) * 0.34 - panel.x * 0.18 - panel.y * 0.15;
        diffuseColor.rgb *= mix(1.0, asphaltRegion, mapsStructureStrength);
        roughnessFactor = clamp(roughnessFactor + mapsStructureStrength * (0.07 * panel.x + (region - 0.5) * 0.10), 0.25, 1.0);
        `
            : `
        // And the same band on the ground, whose period is about 20 m: relief the 8 m
        // tile cannot supply on its own.
        float variation = sin(metres.x * 0.31) * sin(metres.y * 0.37);
        diffuseColor.rgb *= 0.98 + variation * 0.045;
        roughnessFactor = 0.96 + (detail - 0.5) * 0.05;
        // Unknown terrain is weathered substrate; no road/yard/paving inference.
        diffuseColor.rgb *= 1.0 + (region - 0.5) * 0.18 * mapsStructureStrength;
        roughnessFactor = clamp(roughnessFactor + (region - 0.5) * 0.06 * mapsStructureStrength, 0.85, 1.0);
        `
        }
        `
        }
      `,
    `${kind}'s fragment stage, surface colour`,
  );

  if (kind !== "ground") {
    fragment = replaceOnce(fragment, FRAGMENT_NORMAL, `${FRAGMENT_NORMAL}
        // Apply only to Satellite top faces. Closure faces and Cartographic
        // retain their existing response, as does unclassified terrain.
        float mapsRelief = smoothstep(0.9, 1.0, mapsStructureStrength);
        float mapsTopFace = smoothstep(0.65, 0.92, inverseTransformDirection(normal, viewMatrix).y);
        vec3 mapsViewSlope = mat3(viewMatrix) * vec3(mapsGroundSlope.x, 0.0, mapsGroundSlope.y);
        mapsViewSlope -= normal * dot(mapsViewSlope, normal);
        mapsViewSlope /= max(1.0, length(mapsViewSlope) / 0.5);
        normal = normalize(normal - mapsViewSlope * mapsRelief * mapsTopFace);
      `, `${kind}'s fragment stage, surface relief`);
  }

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
  material.name = `Shibuya:${kind}`;
  const wetness = { value: style.wetness };

  // Sidewalks reuse the seeded ground texture for restrained material variation;
  // their metre-scaled joints remain coverage-filtered shader geometry. Each
  // material owns and disposes its texture, including through style changes.
  const detail: SurfaceDetailKind = kind === "sidewalk" ? "ground" : kind;
  const texture = createSurfaceDetailTexture(detail);
  const structure = createStructureSeedTexture(kind);
  const uniforms: SurfaceShaderUniforms = {
    wetness,
    detailMap: { value: texture },
    detailMetres: { value: kind === "sidewalk" ? 2 : SURFACE_DETAIL_METRES[detail] },
    detailStrength: { value: SURFACE_DETAIL_STRENGTH[detail] },
    structureSeeds: { value: structure },
    structureStrength: { value: 1 },
  };

  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    patchSurfaceShader(kind, uniforms, shader as unknown as PatchableShader);
  };
  material.customProgramCacheKey = () => `maps-surface-${kind}-${kind === "ground" ? "v6-regional-structure" : "v7-joint-aggregate-relief"}`;
  const apply = (next: WorldStyle): void => {
    material.color.setHex(next.palette[kind === "ground" ? "ground" : kind]);
    material.envMapIntensity = kind === "road" ? 0.7 : 0.45;
    wetness.value = next.wetness;
    uniforms.structureStrength!.value = next.facade === "photographic" ? 1 : 0.24;
    if (kind === "sidewalk") uniforms.detailStrength.value = next.facade === "photographic" ? 0.12 : 0.08;
  };
  apply(style);
  return {
    material,
    apply,
    dispose(): void {
      material.dispose();
      texture?.dispose();
      structure.dispose();
    },
  };
}
