/** Bound: scalar bevel arithmetic emitted by the actual material, anchor
 * admission and Satellite-only activation. GPU linking, appearance and moving
 * filtering require native production captures; this is not a visual oracle. */
import { expect, it } from "vitest";
import { ShaderLib } from "three";
import { createSurfaceMaterial, type PatchableShader } from "../src/scene/surface-materials.js";
import { worldStyle } from "../src/world/styles.js";

function emitted(kind: "road" | "sidewalk" | "ground"): PatchableShader {
  const material = createSurfaceMaterial(kind, worldStyle("satellite"));
  const shader = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} };
  try { material.material.onBeforeCompile(shader as never, {} as never); return shader; }
  finally { material.dispose(); }
}

it("requires the actual normal hook for road/pavement, without changing terrain", () => {
  for (const kind of ["road", "sidewalk"] as const) {
    const material = createSurfaceMaterial(kind, worldStyle("satellite"));
    try {
      for (const replacement of ["", "#include <normal_fragment_maps>\n#include <normal_fragment_maps>"]) {
        const shader = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader.replace("#include <normal_fragment_maps>", replacement), uniforms: {} };
        expect(() => material.material.onBeforeCompile(shader as never, {} as never)).toThrow(/normal_fragment_maps.*exactly once/);
      }
      const shader = emitted(kind);
      expect(shader.fragmentShader.indexOf("normal = normalize(normal - mapsViewSlope")).toBeGreaterThan(shader.fragmentShader.indexOf("#include <normal_fragment_maps>"));
      const strength = shader.uniforms.mapsStructureStrength as { value: number };
      // Independently known registry contract: photographic=1, procedural=.24.
      // The relief's .9 threshold therefore excludes the procedural style.
      expect(strength.value).toBe(1);
      const live = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} };
      material.material.onBeforeCompile(live as never, {} as never);
      material.apply(worldStyle("cartographic"));
      expect((live.uniforms as Record<string, {value:number}>).mapsStructureStrength!.value).toBe(.24);
      material.apply(worldStyle("satellite"));
      expect((live.uniforms as Record<string, {value:number}>).mapsStructureStrength!.value).toBe(1);
    } finally { material.dispose(); }
  }
  expect(emitted("ground").fragmentShader).not.toContain("mapsGroundSlope");
  expect(emitted("ground").fragmentShader).not.toContain("mapsRelief");
});

it("emits a symmetric six millimetre joint bevel and retires it when unresolved", () => {
  const helper = emitted("sidewalk").fragmentShader.match(/float mapsPavingBevelSlope\([^]*?\n\}/)?.[0];
  if (!helper) throw Error("Actual pavement material did not emit its bevel slope");
  const js = helper.replace("float mapsPavingBevelSlope(", "function slope(").replace(/float (\w+)(?=\s*[,\)])/g, "$1").replace(/float (\w+)\s*=/g, "let $1 =");
  const smoothstep = (low:number, high:number, x:number) => { const t=Math.max(0,Math.min(1,(x-low)/(high-low)));return t*t*(3-2*t); };
  const slope = new Function("fract", "min", "clamp", "smoothstep", js+"return slope;")((x:number)=>x-Math.floor(x), Math.min, (x:number,a:number,b:number)=>Math.max(a,Math.min(b,x)),smoothstep) as (coordinate:number,period:number,footprint:number)=>number;
  for (const period of [.6,.4]) {
    expect(slope(.015/period,period,.001)).toBeCloseTo(.5,12);
    expect(slope(-.015/period,period,.001)).toBeCloseTo(-.5,12);
    expect(slope(.5,period,.001)).toBeCloseTo(0,12);
    expect(slope(.015/period,period,.1)).toBeCloseTo(0,12);
    expect(slope(.015/period,period,.05)).toBeLessThan(.5);
    // Integrate the emitted slope across the bevel: its rise is independently
    // specified as 6mm, rather than inferred from a shader constant/export.
    let rise=0; const step=.018/10000;
    for(let i=0;i<10000;i++) rise+=slope((.006+(i+.5)*step)/period,period,.001)*step;
    expect(rise).toBeCloseTo(.006,9);
    for(let i=-100;i<=100;i++) expect(Math.abs(slope(i/100,period,.001))).toBeLessThanOrEqual(.50000001);
  }
});
