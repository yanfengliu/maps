/**
 * The surface shader patch, and the silent no-op it can be.
 *
 * `patchSurfaceShader` rewrites three's own `ShaderLib.standard` source with
 * `String.replace`. A `replace` whose anchor does not match returns the input
 * unchanged, so the material compiles, renders and reports nothing while the surface
 * stays flat — the failure class the 2026-09-18 re-inspection of the appearance batch's
 * frames recorded as its leading hypothesis for a detail tile that was in the bundle and
 * absent from the pixels.
 *
 * These cases hold three things, and each is a different way for that no-op to happen:
 *
 * - **the anchors exist in the shader three actually compiles.** The anchor literals
 *   below are restated here rather than imported, so that this file fails if the
 *   shipped code's anchor drifts away from three's chunk names. Importing them would
 *   only prove the code agrees with itself;
 * - **the marker lands after the call site**, not merely somewhere in the source: a
 *   declaration or a colour write before `void main()` would compile and do nothing;
 * - **every uniform the patch binds is one the patched source declares.** A bound but
 *   undeclared uniform is the same no-op wearing a different mask.
 *
 * **The bound.** These cases drive the patch against three's source text and against
 * the material's own `onBeforeCompile`. They do not compile a program, so they cannot
 * prove the GPU links it; they prove the text three is handed carries the detail term
 * where the surface's colour is decided. What the lit, tone-mapped pixels do is the
 * frame set's evidence.
 */
import { describe, expect, it } from "vitest";
import { ShaderLib } from "three";

import {
  createSurfaceMaterial,
  patchSurfaceShader,
  type PatchableShader,
  type SurfaceMaterialKind,
  type SurfaceShaderUniforms,
} from "../src/scene/surface-materials.js";
import { worldStyle } from "../src/world/styles.js";

/**
 * The anchors, restated. These are three r180's: `ShaderLib.standard` is what
 * `MeshStandardMaterial` compiles, and the two chunk names are the points the patch
 * needs — `project_vertex` has the world position available, `roughnessmap_fragment`
 * is after `diffuseColor` exists and before the lighting reads it.
 */
const ANCHORS = Object.freeze({
  vertexMain: "void main() {",
  vertexProject: "#include <project_vertex>",
  fragmentMain: "void main() {",
  fragmentRoughness: "#include <roughnessmap_fragment>",
});

const KINDS: readonly SurfaceMaterialKind[] = ["road", "sidewalk", "ground"];

function uniforms(): SurfaceShaderUniforms {
  return {
    wetness: { value: 0.72 },
    detailMap: { value: null },
    detailMetres: { value: 4 },
    detailStrength: { value: 0.45 },
  };
}

/** A shader as three hands it to `onBeforeCompile`, seeded from the real source. */
function shaderSource(): PatchableShader {
  return { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} };
}

function countOccurrences(source: string, anchor: string): number {
  return source.split(anchor).length - 1;
}

describe("the anchors the surface patch rewrites are in the shader three compiles", () => {
  it("finds each one exactly once in ShaderLib.standard", () => {
    const vertex = ShaderLib.standard.vertexShader;
    const fragment = ShaderLib.standard.fragmentShader;
    for (const [name, anchor, source] of [
      ["vertex main", ANCHORS.vertexMain, vertex],
      ["vertex project", ANCHORS.vertexProject, vertex],
      ["fragment main", ANCHORS.fragmentMain, fragment],
      ["fragment roughness", ANCHORS.fragmentRoughness, fragment],
    ] as const) {
      expect(countOccurrences(source, anchor), `${name}: anchor ${JSON.stringify(anchor)}`).toBe(1);
    }
  });
});

describe("the patch reaches the surface's own colour, for every kind", () => {
  it("puts the injected marker after the call site in both stages", () => {
    for (const kind of KINDS) {
      const shader = shaderSource();
      patchSurfaceShader(kind, uniforms(), shader);

      const mainAt = shader.fragmentShader.indexOf(ANCHORS.fragmentMain);
      const roughnessAt = shader.fragmentShader.indexOf(ANCHORS.fragmentRoughness);
      const marker = kind === "sidewalk"
        ? "diffuseColor.rgb *= mix(0.75, 1.0, grout);"
        : "diffuseColor.rgb *= 1.0 + (detail - 0.5) * mapsDetailStrength;";
      const markerAt = shader.fragmentShader.indexOf(marker);
      expect(markerAt, `${kind}: marker ${JSON.stringify(marker)} missing`).toBeGreaterThan(-1);
      expect(markerAt, `${kind}: the marker must be inside main`).toBeGreaterThan(mainAt);
      expect(markerAt, `${kind}: the marker must come after the roughness include`).toBeGreaterThan(roughnessAt);

      // The varying is declared in both stages and written in the vertex stage, or the
      // patch is a link error rather than a no-op — either way the surface gets nothing.
      // It is a global declaration, so it belongs before the entry point in both stages.
      const vertexMainAt = shader.vertexShader.indexOf(ANCHORS.vertexMain);
      const vertexVaryingAt = shader.vertexShader.indexOf("varying vec3 mapsSurfacePosition;");
      expect(vertexVaryingAt, `${kind}: the vertex stage must declare the varying`).toBeGreaterThan(-1);
      expect(vertexVaryingAt, `${kind}: the varying must be a global declaration`).toBeLessThan(vertexMainAt);
      const fragmentVaryingAt = shader.fragmentShader.indexOf("varying vec3 mapsSurfacePosition;");
      expect(fragmentVaryingAt, `${kind}: the fragment stage must declare the varying`).toBeGreaterThan(-1);
      expect(fragmentVaryingAt, `${kind}: the varying must be a global declaration`).toBeLessThan(mainAt);
      const writeAt = shader.vertexShader.indexOf("mapsSurfacePosition = (modelMatrix");
      expect(writeAt, `${kind}: the world position must be written`).toBeGreaterThan(-1);
      expect(writeAt).toBeGreaterThan(shader.vertexShader.indexOf(ANCHORS.vertexProject));
    }
  });

  it("binds only uniforms the patched source declares", () => {
    for (const kind of KINDS) {
      const shader = shaderSource();
      patchSurfaceShader(kind, uniforms(), shader);
      const bound = Object.keys(shader.uniforms);
      // The names are the ones the shader must declare; a patch that bound a different
      // name than it declared would leave the uniform undefined on the surface.
      expect(bound.sort()).toEqual(["mapsDetailMap", "mapsDetailMetres", "mapsDetailStrength", "mapsWetness"]);
      for (const name of bound) {
        expect(shader.fragmentShader, `${kind}: ${name} is bound but not declared`).toContain(`uniform `);
        expect(shader.fragmentShader, `${kind}: ${name} is bound but not declared`).toMatch(
          new RegExp(`uniform\\s+\\w+\\s+${name}\\s*;`),
        );
      }
    }
  });
});

describe("a missing anchor is refused rather than silently ignored", () => {
  it("throws for each anchor the patch needs, and the mutation really removed it", () => {
    const mutations: readonly (readonly [string, (shader: PatchableShader) => void])[] = [
      ["vertex main", (shader) => { shader.vertexShader = shader.vertexShader.replace(ANCHORS.vertexMain, "void entry() {"); }],
      ["vertex project", (shader) => { shader.vertexShader = shader.vertexShader.replace(ANCHORS.vertexProject, "#include <project_vertex_v2>"); }],
      ["fragment main", (shader) => { shader.fragmentShader = shader.fragmentShader.replace(ANCHORS.fragmentMain, "void entry() {"); }],
      ["fragment roughness", (shader) => { shader.fragmentShader = shader.fragmentShader.replace(ANCHORS.fragmentRoughness, "#include <roughness_fragment>"); }],
    ];
    for (const [name, mutate] of mutations) {
      const shader = shaderSource();
      // The control is the mutation itself: without this the case could pass on a
      // source whose anchor was never removed.
      const before = `${shader.vertexShader}\u0000${shader.fragmentShader}`;
      mutate(shader);
      expect(`${shader.vertexShader}\u0000${shader.fragmentShader}`, name).not.toBe(before);
      expect(() => patchSurfaceShader("road", uniforms(), shader), name).toThrow(/did not apply|wrong place/);
    }
  });

  it("names the anchor and the stage in the message it throws", () => {
    const shader = shaderSource();
    shader.fragmentShader = shader.fragmentShader.replace(ANCHORS.fragmentRoughness, "#include <roughness_fragment>");
    expect(() => patchSurfaceShader("road", uniforms(), shader)).toThrow(/include <roughnessmap_fragment>/);
    expect(() => patchSurfaceShader("road", uniforms(), shader)).toThrow(/road's fragment stage/);
  });

  it("refuses a source carrying the anchor twice, where only the first would be patched", () => {
    const doubled = shaderSource();
    doubled.fragmentShader = `${doubled.fragmentShader}\n${ANCHORS.fragmentRoughness}`;
    expect(countOccurrences(doubled.fragmentShader, ANCHORS.fragmentRoughness)).toBe(2);
    expect(() => patchSurfaceShader("road", uniforms(), doubled)).toThrow(/exactly once/);
  });
});

describe("the material wires the patch to the shader three compiles", () => {
  it("rewrites the shader it is handed, for each kind", () => {
    for (const kind of KINDS) {
      const treatment = createSurfaceMaterial(kind, worldStyle("satellite"));
      const shader = shaderSource();
      treatment.material.onBeforeCompile(shader as never, {} as never);
      expect(shader.fragmentShader, `${kind} was handed an unpatched shader`).not.toBe(ShaderLib.standard.fragmentShader);
      expect(shader.fragmentShader).toContain("mapsSurfacePosition");
      expect(shader.vertexShader).not.toBe(ShaderLib.standard.vertexShader);
      treatment.dispose();
    }
  });

  it("gives the road and the ground a detail texture and the pavement none", () => {
    for (const [kind, expected] of [["road", true], ["ground", true], ["sidewalk", false]] as const) {
      const treatment = createSurfaceMaterial(kind, worldStyle("satellite"));
      const shader = shaderSource();
      treatment.material.onBeforeCompile(shader as never, {} as never);
      const bound = shader.uniforms as Record<string, { value: unknown }>;
      const hasTexture = bound.mapsDetailMap!.value !== null && bound.mapsDetailMap!.value !== undefined;
      expect(hasTexture, `${kind}`).toBe(expected);
      expect((bound.mapsDetailStrength as { value: number }).value > 0, `${kind}`).toBe(expected);
      treatment.dispose();
    }
  });
});
