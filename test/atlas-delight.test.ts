import { afterEach, expect, it, vi } from "vitest";
import { Color, DataTexture, Vector4, WebGLRenderTarget, type WebGLRenderer } from "three";
import { AtlasDelightProcessor } from "../src/render/atlas-delight.js";
import { NO_DELIGHT } from "../src/scene/delight.js";

class FakeWebGL2Context {
  readonly DITHER = 0x0bd0;
  readonly SCISSOR_TEST = 0x0c11;
  readonly VIEWPORT = 0x0ba2;
  readonly SCISSOR_BOX = 0x0c10;
  readonly MAX_TEXTURE_SIZE = 0x0d33;
  readonly MAX_RENDERBUFFER_SIZE = 0x84e8;
  readonly NO_ERROR = 0;
  readonly errors: number[] = [];
  dithering = true;
  lost = false;
  state: { activeViewport: Vector4; activeScissor: Vector4; activeScissorTest: boolean } | null = null;
  isContextLost(): boolean { return this.lost; }
  isEnabled(capability: number): boolean {
    if (capability === this.DITHER) return this.dithering;
    if (capability === this.SCISSOR_TEST) return this.state?.activeScissorTest ?? false;
    return false;
  }
  enable(capability: number): void { if (capability === this.DITHER) this.dithering = true; if (capability === this.SCISSOR_TEST && this.state) this.state.activeScissorTest = true; }
  disable(capability: number): void { if (capability === this.DITHER) this.dithering = false; if (capability === this.SCISSOR_TEST && this.state) this.state.activeScissorTest = false; }
  getParameter(parameter: number): number | Int32Array | null {
    if (parameter === this.MAX_TEXTURE_SIZE || parameter === this.MAX_RENDERBUFFER_SIZE) return 8192;
    if (parameter === this.VIEWPORT) return Int32Array.from(this.state?.activeViewport.toArray() ?? []);
    if (parameter === this.SCISSOR_BOX) return Int32Array.from(this.state?.activeScissor.toArray() ?? []);
    return null;
  }
  getError(): number { return this.errors.shift() ?? this.NO_ERROR; }
}

function makeRenderer(options: { failRender?: boolean; readError?: number; shaderError?: boolean; loseContextDuringRender?: boolean; nullTarget?: boolean; nullViewportRounded?: boolean; nullScissorRounded?: boolean; pixelRatio?: number } = {}) {
  const gl = new FakeWebGL2Context();
  const pixelRatio = options.pixelRatio ?? 2;
  const originalViewport = options.nullTarget ? new Vector4(1, 2, 101, 67) : new Vector4(4, 5, 640, 480);
  const originalScissor = options.nullTarget ? new Vector4(3, 5, 47, 33) : new Vector4(6, 7, 320, 240);
  const originalTarget = {
    label: "host-target",
    viewport: new Vector4(8, 9, 500, 300),
    scissor: new Vector4(10, 11, 400, 250),
    scissorTest: true,
  };
  const scaleRect = (rect: Vector4, mode: "floor" | "round") => new Vector4(...rect.toArray().map(value => mode === "floor" ? Math.floor(value * pixelRatio) : Math.round(value * pixelRatio)) as [number, number, number, number]);
  const originalActiveViewport = options.nullTarget ? scaleRect(originalViewport, options.nullViewportRounded ? "round" : "floor") : new Vector4(21, 23, 27, 29);
  const originalActiveScissor = options.nullTarget ? scaleRect(originalScissor, options.nullScissorRounded ? "round" : "floor") : new Vector4(31, 33, 35, 37);
  const originalColor = new Color(0x345678);
  const state = {
    target: options.nullTarget ? null as unknown : originalTarget as unknown,
    cubeFace: options.nullTarget ? 0 : 2,
    mipLevel: options.nullTarget ? 0 : 3,
    logicalViewport: originalViewport.clone(),
    logicalScissor: originalScissor.clone(),
    activeViewport: originalActiveViewport.clone(),
    activeScissor: originalActiveScissor.clone(),
    scissorTest: options.nullTarget ? true : false,
    activeScissorTest: options.nullTarget ? true : true,
    clearColor: originalColor.clone(),
    clearAlpha: 0.37,
  };
  gl.state = state;
  const priorShaderError = vi.fn();
  const debug = { checkShaderErrors: false, onShaderError: priorShaderError };
  const renderer = {
    debug,
    autoClear: true,
    getContext: () => gl,
    getRenderTarget: () => state.target,
    getActiveCubeFace: () => state.cubeFace,
    getActiveMipmapLevel: () => state.mipLevel,
    getPixelRatio: () => pixelRatio,
    getViewport: (target: Vector4) => target.copy(state.logicalViewport),
    getScissor: (target: Vector4) => target.copy(state.logicalScissor),
    getScissorTest: () => state.scissorTest,
    getClearColor: (target: Color) => target.copy(state.clearColor),
    getClearAlpha: () => state.clearAlpha,
    setRenderTarget: (target: unknown, cubeFace = 0, mipLevel = 0) => {
      state.target = target; state.cubeFace = cubeFace; state.mipLevel = mipLevel;
      if (target === null) {
        state.activeViewport = scaleRect(state.logicalViewport, "floor");
        state.activeScissor = scaleRect(state.logicalScissor, "floor");
        state.activeScissorTest = state.scissorTest;
      } else {
        const targetState = target as { viewport: Vector4; scissor: Vector4; scissorTest: boolean };
        state.activeViewport.copy(targetState.viewport);
        state.activeScissor.copy(targetState.scissor);
        state.activeScissorTest = targetState.scissorTest;
      }
    },
    setViewport: (value: Vector4 | number, y?: number, width?: number, height?: number) => {
      state.logicalViewport = value instanceof Vector4 ? value.clone() : new Vector4(value, y!, width!, height!);
      state.activeViewport = scaleRect(state.logicalViewport, "round");
    },
    setScissor: (value: Vector4 | number, y?: number, width?: number, height?: number) => {
      state.logicalScissor = value instanceof Vector4 ? value.clone() : new Vector4(value, y!, width!, height!);
      state.activeScissor = scaleRect(state.logicalScissor, "round");
    },
    setScissorTest: (value: boolean) => { state.scissorTest = value; state.activeScissorTest = value; },
    setClearColor: (value: Color, alpha: number) => { state.clearColor.copy(value); state.clearAlpha = alpha; },
    initTexture: vi.fn(),
    render: vi.fn(() => {
      const target = state.target as { width?: number; height?: number };
      expect(state.activeViewport.z).toBe(target.width);
      expect(state.activeViewport.w).toBe(target.height);
      if (options.shaderError) {
        const callback = (debug as unknown as { onShaderError?: (...args: unknown[]) => void }).onShaderError;
        callback?.(gl, null, null, null);
      }
      if (options.loseContextDuringRender) gl.lost = true;
      if (options.failRender) throw new Error("controlled render failure");
    }),
    readRenderTargetPixels: vi.fn((_target: unknown, _x: number, _y: number, _width: number, _height: number, output: Uint8Array) => {
      output.fill(17);
      if (options.readError !== undefined) gl.errors.push(options.readError);
    }),
  } as unknown as WebGLRenderer;
  return { renderer, gl, state, debug, priorShaderError, originalTarget, originalViewport, originalScissor, originalActiveViewport, originalActiveScissor, originalColor };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("runs one synchronous pass and restores borrowed renderer state, callback and dithering", () => {
  vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2Context);
  const fixture = makeRenderer();
  const processor = new AtlasDelightProcessor(fixture.renderer);
  const pixels = new Uint8ClampedArray([10, 20, 30, 40]);
  try {
    const fullscreen = (processor as unknown as { quad: { frustumCulled: boolean }; geometry: { getAttribute(name: string): { itemSize: number; count: number } } });
    expect(fullscreen.geometry.getAttribute("position")).toMatchObject({ itemSize: 3, count: 3 });
    expect(fullscreen.quad.frustumCulled).toBe(false);
    processor.apply(pixels, 1, 1, NO_DELIGHT);
    expect(Array.from(pixels)).toEqual([17, 17, 17, 17]);
    expect(fixture.renderer.render).toHaveBeenCalledOnce();
    expect(fixture.state.target).toBe(fixture.originalTarget);
    expect(fixture.state.cubeFace).toBe(2);
    expect(fixture.state.mipLevel).toBe(3);
    expect(fixture.state.logicalViewport.equals(fixture.originalViewport)).toBe(true);
    expect(fixture.state.logicalScissor.equals(fixture.originalScissor)).toBe(true);
    expect(fixture.state.activeViewport.equals(fixture.originalActiveViewport)).toBe(true);
    expect(fixture.state.activeScissor.equals(fixture.originalActiveScissor)).toBe(true);
    expect(fixture.state.scissorTest).toBe(false);
    expect(fixture.state.activeScissorTest).toBe(true);
    expect(fixture.originalTarget.viewport.equals(new Vector4(8, 9, 500, 300))).toBe(true);
    expect(fixture.originalTarget.scissor.equals(new Vector4(10, 11, 400, 250))).toBe(true);
    expect(fixture.originalTarget.scissorTest).toBe(true);
    expect(fixture.state.clearColor.equals(fixture.originalColor)).toBe(true);
    expect(fixture.state.clearAlpha).toBe(0.37);
    expect(fixture.renderer.autoClear).toBe(true);
    expect(fixture.gl.dithering).toBe(true);
    expect(fixture.debug.checkShaderErrors).toBe(false);
    expect(fixture.debug.onShaderError).toBe(fixture.priorShaderError);
  } finally {
    processor.dispose();
  }
});

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])("restores a null target with viewport rounded=%s and scissor rounded=%s at fractional DPR", (viewportRounded, scissorRounded) => {
  vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2Context);
  const fixture = makeRenderer({ nullTarget: true, nullViewportRounded: viewportRounded, nullScissorRounded: scissorRounded, pixelRatio: 1.5 });
  const processor = new AtlasDelightProcessor(fixture.renderer);
  const pixels = new Uint8ClampedArray([10, 20, 30, 40]);
  try {
    processor.apply(pixels, 1, 1, NO_DELIGHT);
    expect(fixture.state.target).toBeNull();
    expect(fixture.state.logicalViewport.equals(fixture.originalViewport)).toBe(true);
    expect(fixture.state.logicalScissor.equals(fixture.originalScissor)).toBe(true);
    expect(fixture.state.activeViewport.equals(fixture.originalActiveViewport)).toBe(true);
    expect(fixture.state.activeScissor.equals(fixture.originalActiveScissor)).toBe(true);
    expect(fixture.state.scissorTest).toBe(true);
    expect(fixture.state.activeScissorTest).toBe(true);
  } finally {
    processor.dispose();
  }
});

it("does not adopt output if the GPU pass fails and still restores host state", () => {
  vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2Context);
  const fixture = makeRenderer({ failRender: true });
  const processor = new AtlasDelightProcessor(fixture.renderer);
  const pixels = new Uint8ClampedArray([10, 20, 30, 40]);
  try {
    expect(() => processor.apply(pixels, 1, 1, NO_DELIGHT)).toThrow(/GPU facade de-light failed.*controlled render failure/);
    expect(Array.from(pixels)).toEqual([10, 20, 30, 40]);
    expect(fixture.state.target).toBe(fixture.originalTarget);
    expect(fixture.state.logicalViewport.equals(fixture.originalViewport)).toBe(true);
    expect(fixture.state.activeViewport.equals(fixture.originalActiveViewport)).toBe(true);
    expect(fixture.state.logicalScissor.equals(fixture.originalScissor)).toBe(true);
    expect(fixture.state.activeScissor.equals(fixture.originalActiveScissor)).toBe(true);
    expect(fixture.state.scissorTest).toBe(false);
    expect(fixture.state.activeScissorTest).toBe(true);
    expect(fixture.gl.dithering).toBe(true);
    expect(fixture.debug.onShaderError).toBe(fixture.priorShaderError);
  } finally {
    processor.dispose();
  }
});

it("rejects a CPU-controlled shader callback and disposes both per-job resources", () => {
  vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2Context);
  const targetDispose = vi.spyOn(WebGLRenderTarget.prototype, "dispose");
  const textureDispose = vi.spyOn(DataTexture.prototype, "dispose");
  const fixture = makeRenderer({ shaderError: true });
  const processor = new AtlasDelightProcessor(fixture.renderer);
  const pixels = new Uint8ClampedArray([10, 20, 30, 40]);
  try {
    expect(() => processor.apply(pixels, 1, 1, NO_DELIGHT)).toThrow(/shader compile or link failure/);
    expect(Array.from(pixels)).toEqual([10, 20, 30, 40]);
    expect(fixture.priorShaderError).toHaveBeenCalledOnce();
    expect(fixture.debug.onShaderError).toBe(fixture.priorShaderError);
    expect(fixture.state.target).toBe(fixture.originalTarget);
    expect(fixture.state.logicalViewport.equals(fixture.originalViewport)).toBe(true);
    expect(fixture.state.logicalScissor.equals(fixture.originalScissor)).toBe(true);
    expect(targetDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  } finally {
    processor.dispose();
  }
});

it("rejects CPU-controlled context loss without claiming native healthy-context restoration", () => {
  vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2Context);
  const targetDispose = vi.spyOn(WebGLRenderTarget.prototype, "dispose");
  const textureDispose = vi.spyOn(DataTexture.prototype, "dispose");
  const fixture = makeRenderer({ loseContextDuringRender: true });
  const processor = new AtlasDelightProcessor(fixture.renderer);
  const pixels = new Uint8ClampedArray([10, 20, 30, 40]);
  try {
    expect(() => processor.apply(pixels, 1, 1, NO_DELIGHT)).toThrow(/context was lost during the facade de-light pass/);
    expect(Array.from(pixels)).toEqual([10, 20, 30, 40]);
    expect(fixture.state.target).toBe(fixture.originalTarget);
    expect(fixture.state.logicalViewport.equals(fixture.originalViewport)).toBe(true);
    expect(fixture.state.logicalScissor.equals(fixture.originalScissor)).toBe(true);
    expect(fixture.debug.onShaderError).toBe(fixture.priorShaderError);
    expect(targetDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  } finally {
    processor.dispose();
  }
});

it("refuses a failed readback instead of adopting an allocated output buffer", () => {
  vi.stubGlobal("WebGL2RenderingContext", FakeWebGL2Context);
  const fixture = makeRenderer({ readError: 0x0502 });
  const processor = new AtlasDelightProcessor(fixture.renderer);
  const pixels = new Uint8ClampedArray([10, 20, 30, 40]);
  try {
    expect(() => processor.apply(pixels, 1, 1, NO_DELIGHT)).toThrow(/WebGL returned error 0x502/);
    expect(Array.from(pixels)).toEqual([10, 20, 30, 40]);
    expect(fixture.state.target).toBe(fixture.originalTarget);
    expect(fixture.gl.dithering).toBe(true);
  } finally {
    processor.dispose();
  }
});

it("rejects malformed atlas bytes before touching the borrowed renderer", () => {
  const fixture = makeRenderer();
  const processor = new AtlasDelightProcessor(fixture.renderer);
  try {
    expect(() => processor.apply(new Uint8ClampedArray(3), 1, 1, NO_DELIGHT)).toThrow(/invalid RGBA input/);
    expect(fixture.renderer.render).not.toHaveBeenCalled();
    expect(fixture.renderer.initTexture).not.toHaveBeenCalled();
  } finally {
    processor.dispose();
  }
});
