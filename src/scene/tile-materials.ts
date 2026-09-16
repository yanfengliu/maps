/**
 * What the building tiles' own materials are changed into. Plan items 15 and 16.
 *
 * Two changes, both made by patching `MeshStandardMaterial` rather than replacing
 * it, so everything glTF set up — the atlas, its UVs, its sampler state — is kept.
 *
 * **The authored source-panel term.** `facade-emission.ts` binds selected sign
 * polygons to exact tile bytes, GML identity, UV0, plane and outward normal. The
 * colour candidate in the atlas alpha channel only modulates those admitted
 * regions. Photographic emission is zero elsewhere. Two additional terms apply:
 *
 * - **Verticality.** The mask is in texture space and an atlas holds roofs as
 *   well as walls. Rooftop plant, green decking and painted machinery all read as
 *   bright and saturated, and without this the whole skyline glows from above.
 *   The world normal is recovered in the fragment shader and the term is faded
 *   out on anything more than about 30 degrees off vertical.
 * - **Time of day.** One shared uniform, driven by `time-of-day.ts`. At noon it
 *   is near zero, because a lit sign in daylight is not what anybody notices.
 *
 * **Roughness and metalness.** PLATEAU ships neither. glTF's default is a fully
 * rough dielectric, which makes every tower a matte grey block with no reflection
 * of the sky at all — the single biggest reason the Phase 3 frames read as flat.
 * What is applied instead is a cheap proxy off the albedo's own luminance and
 * saturation: dark, unsaturated, and therefore probably glass gets low roughness
 * and a little reflectance; pale and saturated, and therefore probably render or
 * tile, stays rough. This remains a material proxy, not surveyed glass. Buildings
 * without a photographic atlas use floor-aware procedural facades, as does the
 * cartographic style for every building. Both share the loaded source geometry.
 */

import type { Material, Object3D, Texture } from "three";
import { Color, MeshStandardMaterial } from "three";
import type { WorldStyle } from "../world/styles.js";
import { FACADE_EMISSION_GLSL } from "./facade-emission.js";

export interface FacadeStyleUniforms {
  procedural: { value: number };
  building: { value: Color };
  roof: { value: Color };
  window: { value: Color };
}

export function createFacadeStyle(style: WorldStyle): FacadeStyleUniforms {
  const uniforms = { procedural: { value: 0 }, building: { value: new Color() }, roof: { value: new Color() }, window: { value: new Color() } };
  applyFacadeStyle(uniforms, style);
  return uniforms;
}

export function applyFacadeStyle(uniforms: FacadeStyleUniforms, style: WorldStyle): void {
  uniforms.procedural.value = style.facade === "procedural" ? 1 : 0;
  uniforms.building.value.setHex(style.palette.building);
  uniforms.roof.value.setHex(style.palette.roof);
  uniforms.window.value.setHex(style.palette.window);
}

/** The shared uniform every patched material reads its signage level from. */
export interface SignageUniform {
  value: number;
}

/**
 * How far off vertical a face may be and still glow, as `1 - |worldNormal.y|`.
 *
 * 1.0 is a wall, 0.0 is a flat roof. The band runs from a 40-degree slope to a
 * 25-degree one, so a pitched roof is out and a slightly leaning facade is in.
 */
const VERTICAL_BAND = Object.freeze({ low: 0.64, high: 0.9 });

export interface TileMaterialOptions {
  signageIntensity: SignageUniform;
  style: FacadeStyleUniforms;
  /** Set false to leave the tile materials exactly as glTF delivered them. */
  enabled: boolean;
}

/**
 * Patch every material under a loaded tile.
 *
 * Called from the tiles plugin, once per tile, before the model is handed to the
 * scene. Materials are shared within a tile, so the same object can arrive twice
 * and the patch has to be idempotent — `userData.mapsPatched` is that guard, and
 * without it a second `onBeforeCompile` would replace the first and the material
 * would silently lose the term applied earlier.
 */
export function patchTileMaterials(scene: Object3D, options: TileMaterialOptions): number {
  if (!options.enabled) return 0;
  const seen = new Set<Material>();
  let patched = 0;

  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (material === undefined) return;
    for (const entry of Array.isArray(material) ? material : [material]) {
      if (entry === undefined || entry === null || seen.has(entry)) continue;
      seen.add(entry);
      if (patchOne(entry, options)) patched += 1;
    }
  });

  return patched;
}

function patchOne(material: Material, options: TileMaterialOptions): boolean {
  if (material.userData.mapsPatched === true) return false;
  if (!(material instanceof MeshStandardMaterial)) return false;
  material.userData.mapsPatched = true;

  // Roughness and metalness, from nothing but the albedo. See the note at the
  // top: this is a proxy, not a measurement.
  material.roughness = 0.72;
  material.metalness = 0.12;
  // glTF's default `envMapIntensity` is 1 and the sky is bright; this pulls the
  // reflection back to where a facade looks lit rather than chromed.
  material.envMapIntensity = 0.85;

  const map = material.map as Texture | null;
  const hasMask = map !== null;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.mapsSignageIntensity = options.signageIntensity;
    shader.uniforms.mapsVerticalBand = { value: [VERTICAL_BAND.low, VERTICAL_BAND.high] };
    shader.uniforms.mapsProcedural = options.style.procedural;
    shader.uniforms.mapsBuilding = options.style.building;
    shader.uniforms.mapsRoof = options.style.roof;
    shader.uniforms.mapsWindow = options.style.window;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", `attribute vec3 mapsFloorParams; attribute float mapsEmitterGroup; varying float mapsSignGroup; varying vec2 mapsSourceUv; varying vec3 mapsFloor; varying vec3 mapsWorld; void main() { mapsFloor = mapsFloorParams; mapsSignGroup = mapsEmitterGroup; mapsSourceUv = uv;`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n mapsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        /* glsl */ `
        uniform float mapsSignageIntensity;
        uniform vec2 mapsVerticalBand;
        uniform float mapsProcedural;
        uniform vec3 mapsBuilding;
        uniform vec3 mapsRoof;
        uniform vec3 mapsWindow;
        varying vec3 mapsFloor;
        varying vec3 mapsWorld;
        varying float mapsSignGroup;
        varying vec2 mapsSourceUv;
        ${FACADE_EMISSION_GLSL}
        void main() {
        `,
      )
      .replace("#include <normal_fragment_maps>", `
        #include <normal_fragment_maps>
        vec3 mapsNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
        float mapsWall = smoothstep(0.65, 0.9, 1.0 - abs(mapsNormal.y));
        float mapsGrid = ${hasMask ? "mapsProcedural" : "1.0"};
        float mapsWindowMask = 0.0;
        if (mapsGrid > 0.5) {
          float horizontal = abs(mapsNormal.x) > abs(mapsNormal.z) ? mapsWorld.z : mapsWorld.x;
          float curtain = step(0.88, mapsFloor.z);
          vec2 cell = vec2(horizontal / mix(2.4, 3.25, mapsFloor.z), (mapsWorld.y - mapsFloor.x) / max(mapsFloor.y, 0.1));
          vec2 f = fract(cell);
          vec2 aa = max(fwidth(cell), vec2(0.001));
          vec2 inset = mix(vec2(0.19 + mapsFloor.z * 0.05, 0.23 + mapsFloor.z * 0.04), vec2(0.07, 0.10), curtain);
          vec2 windowStart = smoothstep(inset - aa, inset + aa, f);
          vec2 windowEnd = 1.0 - smoothstep(vec2(1.0) - inset - aa, vec2(1.0) - inset + aa, f);
          mapsWindowMask = windowStart.x * windowStart.y * windowEnd.x * windowEnd.y * mapsWall;
          vec2 paneStart = smoothstep(inset + vec2(0.025) - aa, inset + vec2(0.025) + aa, f);
          vec2 paneEnd = 1.0 - smoothstep(vec2(1.0) - inset - vec2(0.025) - aa, vec2(1.0) - inset - vec2(0.025) + aa, f);
          float pane = paneStart.x * paneStart.y * paneEnd.x * paneEnd.y * mapsWall;
          float mullion = 1.0 - smoothstep(0.009 - aa.x, 0.009 + aa.x, abs(f.x - 0.5));
          pane *= 1.0 - mullion;
          float floorBand = 1.0 - smoothstep(0.018 - aa.y, 0.018 + aa.y, min(f.y, 1.0 - f.y));
          vec3 wall = mapsBuilding * (0.84 + mapsFloor.z * 0.28) * (1.0 - floorBand * mapsWall * 0.12);
          wall *= mix(vec3(1.02, 1.0, 0.96), vec3(0.96, 1.0, 1.03), mapsFloor.z);
          vec2 roofCell = abs(fract(mapsWorld.xz / 1.4) - 0.5);
          vec2 roofAa = max(fwidth(mapsWorld.xz / 1.4), vec2(0.001));
          float roofSeam = max(smoothstep(0.49 - roofAa.x, 0.49 + roofAa.x, roofCell.x), smoothstep(0.49 - roofAa.y, 0.49 + roofAa.y, roofCell.y));
          vec3 roof = mapsRoof * (0.86 + mapsFloor.z * 0.23) * (1.0 - roofSeam * 0.08);
          vec3 windowColour = mix(mapsWindow, wall, smoothstep(250.0, 850.0, distance(cameraPosition, mapsWorld)) * 0.55);
          windowColour *= mix(vec3(1.025, 1.01, 0.98), vec3(0.98, 1.01, 1.025), mapsFloor.z);
          diffuseColor.rgb = mix(mix(roof, wall, mapsWall), windowColour, mapsWindowMask);
          diffuseColor.rgb = mix(diffuseColor.rgb, wall * 0.82, max(0.0, mapsWindowMask - pane));
          mapsWindowMask = pane;
          roughnessFactor = mix(0.77, 0.31, pane);
        } else {
          float lightness = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float chroma = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b) - min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);
          float glass = (1.0 - smoothstep(0.06, 0.21, lightness)) * (1.0 - smoothstep(0.02, 0.12, chroma)) * mapsWall;
          // Local response compensates dark photographic albedo under a fresh
          // lighting rig; bright/saturated printed signs keep their source hues.
          float unlitWall = (1.0 - smoothstep(0.16, 0.38, lightness)) * mapsWall;
          diffuseColor.rgb *= mix(1.20, 1.62, unlitWall);
          float horizontal = abs(mapsNormal.x) > abs(mapsNormal.z) ? mapsWorld.z : mapsWorld.x;
          vec2 photoCell = vec2(horizontal / 2.9, (mapsWorld.y - mapsFloor.x) / max(mapsFloor.y, 0.1));
          vec2 photoFraction = fract(photoCell); vec2 photoAa = max(fwidth(photoCell), vec2(0.001));
          float photoFloor = 1.0 - smoothstep(0.014 - photoAa.y, 0.014 + photoAa.y, min(photoFraction.y, 1.0 - photoFraction.y));
          float photoFrame = 1.0 - smoothstep(0.010 - photoAa.x, 0.010 + photoAa.x, abs(photoFraction.x - 0.5));
          float nearDetail = 1.0 - smoothstep(90.0, 190.0, distance(cameraPosition, mapsWorld));
          float detail = nearDetail * mapsWall * (1.0 - smoothstep(0.035, 0.15, chroma));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.76 + vec3(0.065), detail * max(photoFloor * 0.40, photoFrame * glass * 0.50));
          roughnessFactor = mix(0.84, 0.36, glass) + detail * photoFrame * 0.10;
        }
      `)
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `
        #include <emissivemap_fragment>
        ${
          hasMask
            ? /* glsl */ `
        #ifdef USE_MAP
          // The sign mask rides in the albedo's alpha channel; see signage.ts.
          // Source pixels modulate a selected panel; they cannot select a wall.
          float mapsSignMask = max(0.2, sampledDiffuseColor.a);
          // View-space normal back to world space. The view matrix is rigid, so
          // its inverse is its transpose, and v * M is transpose(M) * v in GLSL.
          vec3 mapsWorldNormal = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
          float mapsVertical = smoothstep(
            mapsVerticalBand.x, mapsVerticalBand.y, 1.0 - abs(mapsWorldNormal.y));
          float mapsPanel = mapsPanelEmission(mapsWorld, mapsWorldNormal, mapsSourceUv, mapsSignGroup);
          totalEmissiveRadiance +=
            diffuseColor.rgb * mapsSignMask * mapsVertical * mapsPanel * mapsSignageIntensity * (1.0 - mapsProcedural);
        #endif
        `
            : ""
        }
        // Every material in these tiles is alphaMode OPAQUE, and the mask above
        // has just been multiplied into diffuseColor.a by <map_fragment>. Putting
        // it back to 1 keeps the composer's own alpha channel clean.
        diffuseColor.a = 1.0;
        // Even rows are occupied offices; deterministic and stable at every distance.
        float mapsLitFloor = step(4.5, mod(floor((mapsWorld.y - mapsFloor.x) / max(mapsFloor.y, 0.1)) * 3.0 + floor(mapsWorld.x / 5.8) + floor(mapsFloor.z * 17.0), 6.0));
        totalEmissiveRadiance += vec3(0.065, 0.055, 0.035) * mapsWindowMask * mapsLitFloor * mapsSignageIntensity * mapsGrid;
        `,
      );
  };
  material.customProgramCacheKey = () => `maps-facade-v4-source-panels-${hasMask ? "photo" : "plain"}`;

  material.needsUpdate = true;
  return true;
}
