import {
  BufferGeometry,
  Camera,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  Float32BufferAttribute,
  GLSL3,
  LinearFilter,
  Mesh,
  NoBlending,
  NoColorSpace,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { srgbByteToLinear, type DelightSettings } from "../scene/delight.js";

/** Synchronous, borrowed-renderer GPU implementation of the bounded byte operator. */
export interface FacadeDelighter {
  apply(pixels: Uint8ClampedArray, width: number, height: number, settings: DelightSettings): void;
}

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D uInput;
uniform float uSrgbToLinear[256];
uniform vec3 uAirlight;
uniform float uTransmittance;
uniform vec3 uSun;
uniform vec3 uSky;
uniform float uShadowLuminance;
uniform float uSunSpan;
uniform float uPivot;
uniform float uCompression;
uniform float uChromaGain;
uniform float uFloor;
uniform float uCeiling;
out vec4 outColor;

float toLinear(float encoded) {
  int index = int(floor(encoded * 255.0 + 0.5));
  return uSrgbToLinear[index];
}

float toSrgbByte(float linearValue) {
  float value = clamp(linearValue, 0.0, 1.0);
  float encoded = value <= 0.0031308
    ? value * 12.92
    : 1.055 * pow(value, 1.0 / 2.4) - 0.055;
  return floor(clamp(encoded, 0.0, 1.0) * 255.0 + 0.5) / 255.0;
}

float luminance(vec3 value) {
  return dot(value, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  vec4 source = texelFetch(uInput, pixel, 0);
  vec3 rgb = vec3(toLinear(source.r), toLinear(source.g), toLinear(source.b));
  rgb = max((rgb - uAirlight) / uTransmittance, vec3(0.0));

  float weight = clamp((luminance(rgb) - uShadowLuminance) / uSunSpan, 0.0, 1.0);
  weight = weight * weight * (3.0 - 2.0 * weight);
  vec3 illuminant = mix(uSky, uSun, weight);
  rgb /= illuminant;

  float unlit = luminance(rgb);
  if (unlit <= 1e-6) {
    outColor = vec4(vec3(toSrgbByte(uFloor)), source.a);
    return;
  }

  float compressed = uPivot * pow(unlit / uPivot, uCompression);
  float scale = compressed / unlit;
  rgb = vec3(compressed) + (rgb * scale - vec3(compressed)) * uChromaGain;
  rgb = clamp(rgb, vec3(uFloor), vec3(uCeiling));
  outColor = vec4(toSrgbByte(rgb.r), toSrgbByte(rgb.g), toSrgbByte(rgb.b), source.a);
}
`;

function floatTable(): Float32Array {
  const table = new Float32Array(256);
  for (let value = 0; value < table.length; value += 1) table[value] = srgbByteToLinear(value);
  return table;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class AtlasDelightProcessor implements FacadeDelighter {
  private readonly scene = new Scene();
  private readonly camera = new Camera();
  private readonly geometry = new BufferGeometry();
  private readonly material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: /* glsl */ `in vec3 position; void main() { gl_Position = vec4(position, 1.0); }`,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uInput: { value: null },
      uSrgbToLinear: { value: floatTable() },
      uAirlight: { value: new Vector3() },
      uTransmittance: { value: 1 },
      uSun: { value: new Vector3() },
      uSky: { value: new Vector3() },
      uShadowLuminance: { value: 0 },
      uSunSpan: { value: 1 },
      uPivot: { value: 0.18 },
      uCompression: { value: 1 },
      uChromaGain: { value: 1 },
      uFloor: { value: 0 },
      uCeiling: { value: 1 },
    },
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly quad = new Mesh(this.geometry, this.material);
  private disposed = false;

  constructor(private readonly renderer: WebGLRenderer) {
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    // The triangle is expressed in clip space. A local-space frustum test is
    // both unnecessary and misleading for a fullscreen pass.
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  apply(pixels: Uint8ClampedArray, width: number, height: number, settings: DelightSettings): void {
    if (this.disposed) throw new Error("Facade de-light processor is disposed.");
    if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 || pixels.length !== width * height * 4) {
      throw new Error(`Facade de-light received invalid RGBA input: ${width}x${height}, ${pixels.length} bytes.`);
    }

    const stage = { value: "prepare" };
    let input: DataTexture | undefined;
    let target: WebGLRenderTarget | undefined;
    let gl: WebGL2RenderingContext | undefined;
    let previousDither = false;
    let ditherCaptured = false;
    let shaderError: unknown;
    const debug = this.renderer.debug;
    const previousCheckShaderErrors = debug.checkShaderErrors;
    const previousOnShaderError = debug.onShaderError;
    const previousTarget = this.renderer.getRenderTarget();
    const previousCubeFace = this.renderer.getActiveCubeFace();
    const previousMipLevel = this.renderer.getActiveMipmapLevel();
    const previousScissorTest = this.renderer.getScissorTest();
    const previousClearColor = this.renderer.getClearColor(new Color());
    const previousClearAlpha = this.renderer.getClearAlpha();
    const previousAutoClear = this.renderer.autoClear;
    const previousViewport = this.renderer.getViewport(new Vector4()).clone();
    const previousScissor = this.renderer.getScissor(new Vector4()).clone();
    const previousTargetState = previousTarget as (WebGLRenderTarget & { viewport: Vector4; scissor: Vector4; scissorTest: boolean }) | null;
    const previousTargetViewport = previousTargetState?.viewport?.clone();
    const previousTargetScissor = previousTargetState?.scissor?.clone();
    const previousTargetScissorTest = previousTargetState?.scissorTest;
    let previousActiveViewport: Vector4 | undefined;
    let previousActiveScissor: Vector4 | undefined;
    let previousActiveScissorTest: boolean | undefined;

    try {
      stage.value = "validate WebGL2 context";
      gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (!(gl instanceof WebGL2RenderingContext) || gl.isContextLost()) throw new Error("the borrowed renderer has no live WebGL2 context");
      previousActiveViewport = new Vector4().fromArray(Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array));
      previousActiveScissor = new Vector4().fromArray(Array.from(gl.getParameter(gl.SCISSOR_BOX) as Int32Array));
      previousActiveScissorTest = gl.isEnabled(gl.SCISSOR_TEST);
      const priorErrors = collectGlErrors(gl);
      if (priorErrors.length > 0) throw new Error(`the borrowed renderer had pending WebGL errors before the atlas pass: ${priorErrors.map(value => `0x${value.toString(16)}`).join(", ")}`);
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      if (width > maxTextureSize || height > maxTextureSize || width > maxRenderbufferSize || height > maxRenderbufferSize) {
        throw new Error(`atlas ${width}x${height} exceeds renderer limits (texture ${maxTextureSize}, renderbuffer ${maxRenderbufferSize})`);
      }

      const inputBytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      input = new DataTexture(inputBytes, width, height, RGBAFormat, UnsignedByteType);
      input.colorSpace = NoColorSpace;
      input.wrapS = input.wrapT = ClampToEdgeWrapping;
      input.minFilter = input.magFilter = LinearFilter;
      input.generateMipmaps = false;
      input.flipY = false;
      input.premultiplyAlpha = false;
      input.needsUpdate = true;
      target = new WebGLRenderTarget(width, height, {
        format: RGBAFormat,
        type: UnsignedByteType,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
        samples: 0,
      });
      target.texture.colorSpace = NoColorSpace;
      target.texture.generateMipmaps = false;

      this.material.uniforms.uInput!.value = input;
      this.material.uniforms.uAirlight!.value.set(...settings.airlight);
      this.material.uniforms.uTransmittance!.value = Math.max(settings.hazeTransmittance, 1e-3);
      this.material.uniforms.uSun!.value.set(...settings.sunIlluminant);
      this.material.uniforms.uSky!.value.set(...settings.skyIlluminant);
      this.material.uniforms.uShadowLuminance!.value = settings.shadowLuminance;
      this.material.uniforms.uSunSpan!.value = Math.max(settings.sunLuminance - settings.shadowLuminance, 1e-6);
      this.material.uniforms.uPivot!.value = settings.pivotLuminance;
      this.material.uniforms.uCompression!.value = settings.compression;
      this.material.uniforms.uChromaGain!.value = settings.chromaGain;
      this.material.uniforms.uFloor!.value = settings.albedoFloor;
      this.material.uniforms.uCeiling!.value = settings.albedoCeiling;

      stage.value = "upload source atlas";
      this.renderer.initTexture(input);
      if (gl.isContextLost()) throw new Error("WebGL context was lost while uploading the atlas");
      const uploadErrors = collectGlErrors(gl);
      if (uploadErrors.length > 0) throw new Error(`WebGL failed to upload the source atlas: ${uploadErrors.map(value => `0x${value.toString(16)}`).join(", ")}`);

      stage.value = "install checked shader diagnostics";
      debug.checkShaderErrors = true;
      debug.onShaderError = (context, program, vertexShader, fragmentShader) => {
        shaderError = new Error("Three.js reported a facade de-light shader compile or link failure.");
        previousOnShaderError?.(context, program, vertexShader, fragmentShader);
      };
      previousDither = gl.isEnabled(gl.DITHER);
      ditherCaptured = true;

      stage.value = "render and read back atlas";
      gl.disable(gl.DITHER);
      this.renderer.setRenderTarget(target);
      this.renderer.setScissorTest(false);
      this.renderer.autoClear = false;
      this.renderer.render(this.scene, this.camera);
      if (shaderError) throw shaderError;
      if (gl.isContextLost()) throw new Error("WebGL context was lost during the facade de-light pass");
      const output = new Uint8Array(pixels.byteLength);
      this.renderer.readRenderTargetPixels(target, 0, 0, width, height, output);
      const glError = gl.getError();
      if (glError !== gl.NO_ERROR) throw new Error(`WebGL returned error 0x${glError.toString(16)} during atlas readback`);
      if (gl.isContextLost()) throw new Error("WebGL context was lost during atlas readback");
      pixels.set(output);
    } catch (cause) {
      throw new Error(`GPU facade de-light failed for ${width}x${height} atlas during ${stage.value}: ${errorText(cause)}`, { cause });
    } finally {
      const restorationErrors: unknown[] = [];
      const restore = (action: () => void): void => { try { action(); } catch (error) { restorationErrors.push(error); } };
      restore(() => { debug.checkShaderErrors = previousCheckShaderErrors; });
      restore(() => { debug.onShaderError = previousOnShaderError; });
      if (gl && ditherCaptured && !gl.isContextLost()) {
        restore(() => { if (previousDither) gl!.enable(gl!.DITHER); else gl!.disable(gl!.DITHER); });
      }
      restore(() => {
        if (previousTarget === null) {
          // For the default framebuffer Three scales logical rectangles with
          // floor() when binding null, but rounds them in setViewport/setScissor.
          // Rebinding first restores the floor form and its cache; only invoke
          // the public setters when the captured active form was rounded.
          this.renderer.setScissorTest(previousScissorTest);
          this.renderer.setRenderTarget(null, previousCubeFace, previousMipLevel);
          if (gl && previousActiveViewport && !gl.isContextLost() && !sameRect(previousActiveViewport, readGlRect(gl, gl.VIEWPORT))) {
            this.renderer.setViewport(previousViewport);
          }
          if (gl && previousActiveScissor && !gl.isContextLost() && !sameRect(previousActiveScissor, readGlRect(gl, gl.SCISSOR_BOX))) {
            this.renderer.setScissor(previousScissor);
          }
        } else {
          this.renderer.setRenderTarget(previousTarget, previousCubeFace, previousMipLevel);
          this.renderer.setViewport(previousViewport);
          this.renderer.setScissor(previousScissor);
          this.renderer.setScissorTest(previousScissorTest);
        }
        if (gl && previousActiveViewport && previousActiveScissor && previousActiveScissorTest !== undefined && previousTargetState && previousTargetViewport && previousTargetScissor && previousTargetScissorTest !== undefined && !gl.isContextLost()) {
          // Three tracks logical viewport/scissor separately from the currently
          // bound target. A target can also have an active override that differs
          // from its stored rectangles, so restore that state by rebinding with
          // temporary target values and putting the borrowed object back before
          // this synchronous call returns.
          previousTargetState.viewport.copy(previousActiveViewport);
          previousTargetState.scissor.copy(previousActiveScissor);
          previousTargetState.scissorTest = previousActiveScissorTest;
          try {
            this.renderer.setRenderTarget(previousTarget, previousCubeFace, previousMipLevel);
          } finally {
            previousTargetState.viewport.copy(previousTargetViewport);
            previousTargetState.scissor.copy(previousTargetScissor);
            previousTargetState.scissorTest = previousTargetScissorTest;
          }
        }
        if (gl && previousActiveViewport && previousActiveScissor && previousActiveScissorTest !== undefined && !gl.isContextLost()) {
          const viewport = Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array);
          const scissor = Array.from(gl.getParameter(gl.SCISSOR_BOX) as Int32Array);
          const activeScissorTest = gl.isEnabled(gl.SCISSOR_TEST);
          if (!previousActiveViewport.toArray().every((value, index) => value === viewport[index]) ||
              !previousActiveScissor.toArray().every((value, index) => value === scissor[index]) ||
              activeScissorTest !== previousActiveScissorTest ||
              !this.renderer.getViewport(new Vector4()).equals(previousViewport) ||
              !this.renderer.getScissor(new Vector4()).equals(previousScissor) ||
              this.renderer.getScissorTest() !== previousScissorTest) {
            throw new Error("borrowed renderer viewport/scissor state did not return to its captured logical and active values");
          }
        }
      });
      restore(() => this.renderer.setClearColor(previousClearColor, previousClearAlpha));
      restore(() => { this.renderer.autoClear = previousAutoClear; });
      restore(() => { this.material.uniforms.uInput!.value = null; });
      restore(() => input?.dispose());
      restore(() => target?.dispose());
      if (restorationErrors.length > 0) throw new Error(`GPU facade de-light could not restore ${restorationErrors.length} borrowed renderer state/resource operation(s): ${restorationErrors.map(errorText).join("; ")}`);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.quad);
    this.geometry.dispose();
    this.material.dispose();
  }
}

function readGlRect(gl: WebGL2RenderingContext, parameter: number): number[] {
  return Array.from(gl.getParameter(parameter) as Int32Array);
}

function sameRect(rect: Vector4, actual: number[]): boolean {
  return rect.toArray().every((value, index) => value === actual[index]);
}

function collectGlErrors(gl: WebGL2RenderingContext): number[] {
  const errors: number[] = [];
  for (let i = 0; i < 16; i += 1) {
    const error = gl.getError();
    if (error === gl.NO_ERROR) return errors;
    errors.push(error);
  }
  errors.push(-1);
  return errors;
}
