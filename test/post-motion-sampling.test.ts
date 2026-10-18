/** Bound: actual installed composer/TAA/SSAA scene submissions, projection sizes,
 * copy destinations, history, physical resize and disposal under a renderer spy.
 * AO/bloom/output GPU work is stubbed. No WebGL pixels, actual MSAA coverage,
 * driver allocation, ghosting or complete-frame GPU cost is proved here.
 */
import { expect, it, vi } from "vitest";
import { Color, HalfFloatType, LinearFilter, Mesh, PerspectiveCamera, Scene, type ColorRepresentation, type ShaderMaterial, type Vector2, type WebGLRenderer, type WebGLRenderTarget } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { TAARenderPass } from "three/examples/jsm/postprocessing/TAARenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createPostChain, estimateBufferBytes } from "../src/render/post.js";
import { lightingForPreset } from "../src/scene/time-of-day.js";

type ActualTaa = TAARenderPass & { _sampleRenderTarget: WebGLRenderTarget; _holdRenderTarget: WebGLRenderTarget; _copyMaterial: ShaderMaterial };
type Draw = { pose: number; x: number; y: number; fullWidth: number; fullHeight: number; target: WebGLRenderTarget | null; width: number; height: number };
type Copy = { target: WebGLRenderTarget | null; width: number; height: number; source: unknown; sourceWidth: number; sourceHeight: number; weight: number };

function fixture(pixelRatio: number, limit = 16384, width = 1280, height = 720) {
  const scene = new Scene(), camera = new PerspectiveCamera(50, width / height, .1, 2000), colour = new Color();
  const draws: Draw[] = [], copies: Copy[] = [];
  let pose = 0, alpha = 1, target: WebGLRenderTarget | null = null, composer: EffectComposer | undefined;
  const gl = { MAX_RENDERBUFFER_SIZE: 0x84e8, getParameter: () => limit };
  const renderer = {
    autoClear: true, capabilities: { maxTextureSize: limit }, getContext: () => gl,
    getPixelRatio: () => pixelRatio, getSize: (size: Vector2) => size.set(width, height),
    getClearColor: (next: Color) => next.copy(colour), getClearAlpha: () => alpha,
    setClearColor: (next: ColorRepresentation, nextAlpha = 1) => { colour.set(next); alpha = nextAlpha; },
    getRenderTarget: () => target, setRenderTarget: (next: WebGLRenderTarget | null) => { target = next; }, clear: () => {},
    render: (object: unknown) => {
      if (object === scene) draws.push({ pose, x: camera.view?.offsetX ?? 0, y: camera.view?.offsetY ?? 0,
        fullWidth: camera.view?.fullWidth ?? 0, fullHeight: camera.view?.fullHeight ?? 0,
        target, width: target?.width ?? 0, height: target?.height ?? 0 });
      else if (object instanceof Mesh) {
        const uniforms = (object.material as ShaderMaterial).uniforms;
        const source = uniforms["tDiffuse"]?.value;
        copies.push({ target, width: target?.width ?? 0, height: target?.height ?? 0,
          source, sourceWidth: source?.image?.width ?? 0, sourceHeight: source?.image?.height ?? 0, weight: uniforms["opacity"]?.value });
      }
    },
  } as unknown as WebGLRenderer;
  const skipped = [vi.spyOn(GTAOPass.prototype, "render").mockImplementation(() => {}),
    vi.spyOn(UnrealBloomPass.prototype, "render").mockImplementation(() => {}),
    vi.spyOn(OutputPass.prototype, "render").mockImplementation(() => {})];
  const actualRender = EffectComposer.prototype.render;
  const render = vi.spyOn(EffectComposer.prototype, "render").mockImplementation(function (this: EffectComposer) {
    composer = this; actualRender.call(this, 0);
  });
  const chain = createPostChain({ renderer, scene, camera, lighting: lightingForPreset("noon"), width, height });
  return { chain, camera, draws, copies, composer: () => composer!, setPose: (next: number) => { pose = next; },
    reset: () => { draws.length = 0; copies.length = 0; },
    close: (dispose = true) => { if (dispose) chain.dispose(); render.mockRestore(); for (const spy of skipped) spy.mockRestore(); } };
}

it.each([1, 2, 1.25, 1.5])("uses the actual 2x physical grid and native copy destinations at DPR%s, without retaining moving poses", (dpr) => {
  const f = fixture(dpr, 16384, 1281, 721), { chain } = f;
  let disposed = false;
  const spies: ReturnType<typeof vi.spyOn>[] = [];
  try {
    expect(chain.status().active).toBe(true);
    let nativeWidth = Math.floor(1281 * dpr), nativeHeight = Math.floor(721 * dpr);
    const moving = (pose: number) => {
      f.setPose(pose); f.reset(); chain.render();
      const taa = f.composer().passes[0] as ActualTaa;
      expect(taa).toBeInstanceOf(TAARenderPass);
      expect(f.draws).toEqual([[.25, .25], [-.25, -.25]].map(([x, y]) => ({ pose, x, y,
        fullWidth: nativeWidth * 2, fullHeight: nativeHeight * 2, target: taa._sampleRenderTarget, width: nativeWidth * 2, height: nativeHeight * 2 })));
      expect(f.copies).toHaveLength(2);
      expect(f.copies.map(c => c.weight)).toEqual([.4921875, .5078125]);
      for (const copy of f.copies) {
        expect([copy.width, copy.height, copy.sourceWidth, copy.sourceHeight]).toEqual([nativeWidth, nativeHeight, nativeWidth * 2, nativeHeight * 2]);
        expect(copy.source).toBe(taa._sampleRenderTarget.texture);
        expect([f.composer().renderTarget1, f.composer().renderTarget2]).toContain(copy.target);
      }
      const sample = taa._sampleRenderTarget;
      expect(sample.texture.type).toBe(HalfFloatType); expect(sample.texture.minFilter).toBe(LinearFilter);
      expect(sample.texture.magFilter).toBe(LinearFilter); expect(sample.texture.generateMipmaps).toBe(false);
      expect(sample.samples).toBe(4); expect(sample.depthBuffer).toBe(true);
      expect(f.camera.view?.enabled).toBe(false);
      expect(chain.status()).toMatchObject({ taaAccumulating: false, taaSamples: 0, taaSampleLevel: 1,
        sceneSampleTarget: { width: nativeWidth * 2, height: nativeHeight * 2, requestedSamples: 4, halfFloat: true, depthBuffer: true } });
      expect(chain.status().bufferBytes).toBe(estimateBufferBytes(nativeWidth, nativeHeight, 1, 2));
      const gtao = f.composer().passes[1] as GTAOPass & { normalRenderTarget: WebGLRenderTarget };
      expect([gtao.width, gtao.height]).toEqual([nativeWidth, nativeHeight]);
      for (const target of [gtao.gtaoRenderTarget, gtao.pdRenderTarget, gtao.normalRenderTarget]) expect([target.width, target.height]).toEqual([nativeWidth, nativeHeight]);
      for (const material of [gtao.gtaoMaterial, gtao.pdMaterial]) expect(material.uniforms["resolution"]!.value.toArray()).toEqual([nativeWidth, nativeHeight]);
      const bloom = f.composer().passes[2] as UnrealBloomPass;
      expect(bloom.resolution.toArray()).toEqual([nativeWidth, nativeHeight]);
      let mipWidth = Math.round(nativeWidth / 2), mipHeight = Math.round(nativeHeight / 2);
      expect([bloom.renderTargetBright.width, bloom.renderTargetBright.height]).toEqual([mipWidth, mipHeight]);
      for (let mip = 0; mip < bloom.nMips; mip++) {
        for (const target of [bloom.renderTargetsHorizontal[mip]!, bloom.renderTargetsVertical[mip]!]) expect([target.width, target.height]).toEqual([mipWidth, mipHeight]);
        mipWidth = Math.round(mipWidth / 2); mipHeight = Math.round(mipHeight / 2);
      }
      return taa;
    };
    const taa = moving(1); moving(2);
    chain.setStill(true); f.setPose(3); f.reset(); chain.render();
    expect(f.draws).toHaveLength(2); expect(f.draws.every(d => d.pose === 3 && d.width === nativeWidth && d.height === nativeHeight)).toBe(true);
    expect(chain.status()).toMatchObject({ taaAccumulating: true, taaSamples: 1, taaSampleLevel: 0,
      sceneSampleTarget: { width: nativeWidth, height: nativeHeight } });
    for (let frame = 1; frame < 32; frame++) chain.render();
    expect(chain.status().taaSamples).toBe(32); f.reset(); chain.render(); expect(f.draws).toHaveLength(0);
    chain.setStill(false); moving(4);
    chain.setStill(true); f.setPose(5); f.reset(); chain.render();
    expect(f.draws).toHaveLength(2); expect(f.draws.every(d => d.pose === 5)).toBe(true); expect(chain.status().taaSamples).toBe(1);
    chain.setSize(321, 181); nativeWidth = Math.floor(321 * dpr); nativeHeight = Math.floor(181 * dpr);
    expect([taa._holdRenderTarget.width, taa._holdRenderTarget.height]).toEqual([nativeWidth, nativeHeight]);
    f.reset(); chain.render(); expect(f.draws).toHaveLength(2); expect(chain.status().taaSamples).toBe(1);
    chain.setStill(false); moving(6);
    const targets = [taa._sampleRenderTarget, taa._holdRenderTarget, f.composer().renderTarget1, f.composer().renderTarget2];
    const released = targets.map(() => 0);
    targets.forEach((resource, index) => resource.addEventListener("dispose", () => { released[index]!++; }));
    spies.push(vi.spyOn(taa, "dispose"), vi.spyOn(taa._copyMaterial, "dispose"), vi.spyOn(f.composer(), "dispose"));
    chain.dispose(); disposed = true;
    for (const spy of spies) expect(spy).toHaveBeenCalledOnce(); expect(released).toEqual([1, 1, 1, 1]);
  } finally { f.close(!disposed); for (const spy of spies) spy.mockRestore(); }
});

it("refuses an oversized physical grid before composer resize or any scene draw", () => {
  const f = fixture(1, 3000);
  try {
    f.chain.render(); f.reset(); const composer = f.composer();
    const sizes = [composer.renderTarget1, composer.renderTarget2].map(t => [t.width, t.height]);
    expect(() => f.chain.setSize(1600, 900)).toThrow(/3200x1800.*3000px/);
    expect([composer.renderTarget1, composer.renderTarget2].map(t => [t.width, t.height])).toEqual(sizes);
    expect(f.draws).toHaveLength(0);
  } finally { f.close(); }
  const initial = fixture(2, 3000);
  try { expect(initial.chain.status()).toMatchObject({ active: false }); expect(initial.chain.status().error).toMatch(/5120x2880.*3000px/); expect(initial.draws).toHaveLength(0); }
  finally { initial.close(); }
});
