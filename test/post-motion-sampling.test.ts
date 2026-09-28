/** Bound: actual Three TAA/SSAA draw counts and history transitions under a
 * renderer spy. No WebGL pixels, actor ghosting or GPU cost are proved here.
 */
import { expect, it, vi } from "vitest";
import { Color, PerspectiveCamera, Scene, type ColorRepresentation, type Vector2, type WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { TAARenderPass } from "three/examples/jsm/postprocessing/TAARenderPass.js";
import { createPostChain } from "../src/render/post.js";
import { lightingForPreset } from "../src/scene/time-of-day.js";

it("draws two fresh spatial samples while moving and restarts the still history at one sample", () => {
  const scene = new Scene(), camera = new PerspectiveCamera(50, 1280 / 720, 0.1, 2000);
  const draws: { pose: number; x: number; y: number }[] = [];
  const clearColour = new Color();
  let pose = 0, clearAlpha = 1, composer: EffectComposer | undefined;
  const renderer = {
    autoClear: true,
    getPixelRatio: () => 1,
    getSize: (size: Vector2) => size.set(1280, 720),
    getClearColor: (color: Color) => color.copy(clearColour),
    getClearAlpha: () => clearAlpha,
    setClearColor: (color: ColorRepresentation, alpha = 1) => { clearColour.set(color); clearAlpha = alpha; },
    setRenderTarget: () => {},
    clear: () => {},
    render: (object: unknown) => {
      if (object === scene) draws.push({ pose, x: camera.view?.offsetX ?? 0, y: camera.view?.offsetY ?? 0 });
    },
  } as unknown as WebGLRenderer;
  // Keep the actual pass and targets. Only skip unrelated AO/bloom/output GPU
  // work; calling the real TAA render exercises its inherited spatial loop.
  const render = vi.spyOn(EffectComposer.prototype, "render").mockImplementation(function (this: EffectComposer) {
    composer = this;
    this.passes[0]!.render(renderer, this.writeBuffer, this.readBuffer, 0, false);
  });
  const chain = createPostChain({ renderer, scene, camera, lighting: lightingForPreset("noon"), width: 1280, height: 720 });
  let passDispose: ReturnType<typeof vi.spyOn> | undefined;
  let composerDispose: ReturnType<typeof vi.spyOn> | undefined;
  try {
    expect(chain.status().active).toBe(true);
    const moving = (nextPose: number) => {
      pose = nextPose; draws.length = 0; chain.render();
      expect(draws).toEqual([{ pose, x: 0.25, y: 0.25 }, { pose, x: -0.25, y: -0.25 }]);
      expect(camera.view?.enabled).toBe(false);
      expect(chain.status()).toMatchObject({ taaAccumulating: false, taaSamples: 0, taaSampleLevel: 1 });
    };
    moving(1); // Initial moving state must also take two samples.
    const taa = composer!.passes[0]! as TAARenderPass;
    expect(taa).toBeInstanceOf(TAARenderPass);
    passDispose = vi.spyOn(taa, "dispose"); composerDispose = vi.spyOn(composer!, "dispose");
    moving(2); // A later pose cannot reuse the previous moving frame.

    chain.setStill(true); draws.length = 0; chain.render();
    expect(draws).toHaveLength(2); // Fresh hold image plus one temporal sample.
    expect(chain.status()).toMatchObject({ taaAccumulating: true, taaSamples: 1, taaSampleLevel: 0 });
    for (let frame = 1; frame < 32; frame += 1) chain.render();
    expect(chain.status().taaSamples).toBe(32);
    draws.length = 0; chain.setStill(true); chain.render();
    expect(draws).toHaveLength(0); // Settled still history remains reusable.

    chain.setStill(false); moving(3);
    chain.setStill(true); pose = 4; draws.length = 0; chain.render();
    expect(draws).toHaveLength(2);
    expect(draws.every(draw => draw.pose === 4)).toBe(true);
    expect(chain.status()).toMatchObject({ taaAccumulating: true, taaSamples: 1, taaSampleLevel: 0 });
    draws.length = 0; chain.render();
    expect(draws).toHaveLength(1);
    expect(chain.status().taaSamples).toBe(2);
  } finally {
    chain.dispose();
    try { if (passDispose) expect(passDispose).toHaveBeenCalledOnce(); if (composerDispose) expect(composerDispose).toHaveBeenCalledOnce(); }
    finally { render.mockRestore(); passDispose?.mockRestore(); composerDispose?.mockRestore(); }
  }
});
