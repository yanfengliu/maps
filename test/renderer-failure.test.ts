/** Bound: installed Three debug hook signature with CPU GL diagnostics and
 * persistent renderer state. Native linked-program controls are separate. */
import { describe, expect, it, vi } from "vitest";
import type { WebGLRenderer } from "three";
import { observeShaderFailures, rendererFailure } from "../src/render/renderer.js";

// Installed @types names Three's wrapper here; installed WebGLProgram.js passes
// the raw GL handle. The fixture uses the installed callback signature while
// retaining the runtime handle shape tested by the observer.
type ShaderProgramArgument = Parameters<NonNullable<WebGLRenderer["debug"]["onShaderError"]>>[1];

describe("renderer shader failure boundary", () => {
  it("preserves complete diagnostics, prior observer and first persistent failure", () => {
    const program = {}, vertex = {}, fragment = {}, prior = vi.fn(), log = vi.spyOn(console, "error").mockImplementation(() => {});
    const renderer = { debug: { checkShaderErrors: false, onShaderError: prior }, info: { programs: [{ program, id: 17, name: "roads:surface", type: "MeshStandardMaterial" }] } } as unknown as WebGLRenderer;
    const gl = { getProgramInfoLog: () => "program link refused", getShaderInfoLog: (shader: object) => shader === vertex ? "vertex diagnostic" : "ERROR:0:53: patch is a reserved word", getShaderSource: (shader: object) => shader === vertex ? "vertex source" : "fragment source: float patch;" } as unknown as WebGLRenderingContext;
    try {
      expect(rendererFailure(renderer)).toBeNull(); observeShaderFailures(renderer);
      expect(renderer.debug.checkShaderErrors).toBe(true);
      renderer.debug.onShaderError!(gl, program as ShaderProgramArgument, vertex as WebGLShader, fragment as WebGLShader);
      const failure = rendererFailure(renderer)!;
      expect(failure).toMatchObject({ materialName: "roads:surface", materialType: "MeshStandardMaterial", programId: 17, programLog: "program link refused", vertexLog: "vertex diagnostic", fragmentLog: "ERROR:0:53: patch is a reserved word", vertexSource: "vertex source", fragmentSource: "fragment source: float patch;" });
      expect(failure.message).toContain("roads:surface"); expect(failure.message).toContain("reserved word"); expect(Object.isFrozen(failure)).toBe(true);
      expect(prior).toHaveBeenCalledWith(gl, program, vertex, fragment); expect(log).toHaveBeenCalledWith(failure.message, failure);
      renderer.debug.onShaderError!(gl, {} as ShaderProgramArgument, vertex as WebGLShader, fragment as WebGLShader);
      expect(rendererFailure(renderer)).toBe(failure); expect(prior).toHaveBeenCalledTimes(2);
    } finally { log.mockRestore(); }
  });
  it("keeps a clean renderer clean and can name materials from shader definitions", () => {
    const renderer = { debug: { checkShaderErrors: false, onShaderError: null }, info: { programs: [] } } as unknown as WebGLRenderer;
    observeShaderFailures(renderer); expect(rendererFailure(renderer)).toBeNull();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const gl = { getProgramInfoLog: () => "malformed program", getShaderInfoLog: () => "", getShaderSource: () => "#define SHADER_NAME sidewalk\n#define SHADER_TYPE MeshStandardMaterial\n" } as unknown as WebGLRenderingContext;
      renderer.debug.onShaderError!(gl, {} as ShaderProgramArgument, {} as WebGLShader, {} as WebGLShader);
      expect(rendererFailure(renderer)).toMatchObject({ materialName: "sidewalk", materialType: "MeshStandardMaterial", programId: null });
    } finally { log.mockRestore(); }
  });
  it("does not consume adjacent shader directives when the generated name and type are empty", () => {
    const renderer = { debug: { checkShaderErrors: false, onShaderError: null }, info: { programs: [] } } as unknown as WebGLRenderer;
    observeShaderFailures(renderer);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const gl = { getProgramInfoLog: () => "malformed program", getShaderInfoLog: () => "", getShaderSource: () => "#define SHADER_NAME\r\n#define SHADER_TYPE \t\r\n#define NUM_CLIPPING_PLANES 0\r\n" } as unknown as WebGLRenderingContext;
      renderer.debug.onShaderError!(gl, {} as ShaderProgramArgument, {} as WebGLShader, {} as WebGLShader);
      expect(rendererFailure(renderer)).toMatchObject({ materialName: "unnamed material", materialType: "unknown material type" });
      expect(rendererFailure(renderer)!.message).not.toContain("#define");
    } finally { log.mockRestore(); }
  });
});
