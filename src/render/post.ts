/**
 * The post chain. Plan item 20: ACES tone mapping, bloom, SSAO, TAA.
 *
 * ## Which library, and the numbers behind the choice
 *
 * Measured on 2026-09-07, on this repository, at three 0.180 and `postprocessing`
 * 6.39.4. Two minimal bundles were built with esbuild against a shared three.js
 * baseline of 481,566 bytes minified, each importing exactly the classes its
 * chain needs and nothing else:
 *
 * | chain | minified | over the baseline |
 * |---|---|---|
 * | three.js `EffectComposer` + TAA + GTAO + UnrealBloom + Output | 535,174 B | **+52.4 KiB** |
 * | pmndrs `postprocessing` composer + Bloom + SSAO + ToneMapping + SMAA + NormalPass | 664,865 B | **+179.0 KiB** |
 *
 * **three.js's own composer wins, and the deciding reason is not the bundle.**
 * `postprocessing` 6.39.4 ships **no temporal anti-aliasing of any kind** — its
 * anti-aliasing is SMAA and FXAA, both spatial. Its TAA lives in a separate
 * `realism-effects` package, and that one is a real reprojection TAA, which is
 * precisely the kind that smears and ghosts behind a moving camera.
 *
 * three.js's `TAARenderPass` accumulates jittered samples only while the app
 * reports a static scene. The app must include camera, tiles and animated actors
 * in that decision; a camera-only test would freeze or smear moving crowds.
 * Moving geometry uses a multisampled sample target. Motion quality still needs
 * actual time-sequence inspection; this implementation choice is not its proof.
 *
 * What is given up by not taking `postprocessing` is its merged effect pass. That
 * is a real advantage and it is smaller than it sounds here: the two expensive
 * passes in this scene are the ambient occlusion's depth-and-normal prepass and
 * the bloom mip chain, and neither library can merge either of those.
 *
 * ## The chain, in order
 *
 * 1. **`TAARenderPass`** draws the scene. While the camera or the tileset is
 *    moving it is one ordinary render; once both are still it accumulates 32
 *    jittered samples one per frame and then stops rendering the scene at all,
 *    which makes a settled frame cheaper than a moving one rather than dearer.
 * 2. **`GTAOPass`** — ground-truth ambient occlusion. It is what separates a wall
 *    from the pavement at dusk, when the sun is under the horizon and there is no
 *    directional shadow to do it. It costs one extra geometry pass for its
 *    normals and depth, which is the single most expensive thing in this file.
 * 3. **`UnrealBloomPass`** — the bloom that carries the neon, and the reason item
 *    16 reads at all. Its threshold is in scene-referred linear radiance, above
 *    the brightest facade and below the signage.
 * 4. **`OutputPass`** — ACES filmic tone mapping and the sRGB encode, taken from
 *    the renderer's own `toneMapping` and `toneMappingExposure`.
 *
 * ## What happens if any of it cannot be built
 *
 * The frame still draws. `createPostChain` reports the failure by name and falls
 * back to `renderer.render`, with the renderer's own ACES tone mapping still on,
 * so a machine with no half-float render targets gets a duller frame rather than
 * a black one — and the harness sees `post.active === false`, so a gate can tell
 * the two apart instead of quietly reviewing the fallback.
 */

import { ACESFilmicToneMapping, HalfFloatType, WebGLRenderTarget, Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { TAARenderPass } from "three/examples/jsm/postprocessing/TAARenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import type { TimeOfDayLighting } from "../scene/time-of-day.js";
import { getAgentNormalMaterial } from "../agents/render/pass-materials.js";
import { installAgentNormals } from "./normal-pass.js";

/**
 * How much ambient occlusion is blended in.
 *
 * 1.0 is the pass's own full strength and reads as dirt in every corner. 0.62
 * darkens a wall-to-ground junction and a window reveal without turning the
 * facades grey.
 */
const AO_BLEND = 0.62;

/**
 * The world-space radius the occlusion is gathered over, metres.
 *
 * Scene units are metres, so this is a real distance and not a tuning number: 1.4
 * m is about the depth of a shop awning and the width of a window reveal, which
 * is the scale of the contact darkening this scene is missing.
 */
const AO_RADIUS_M = 1.4;

/** Resolution the bloom mip chain starts at, before its own halving. */
const BLOOM_RESOLUTION = new Vector2(1280, 720);

export interface PostStatus {
  /** False when the chain could not be built and the renderer is drawing direct. */
  active: boolean;
  /** Why, if it is false. */
  error: string | null;
  /** The passes in order, for the manifest and for a reviewer. */
  passes: string[];
  toneMapping: "ACESFilmic";
  exposure: number;
  bloom: { strength: number; threshold: number; radius: number };
  ambientOcclusion: { blendIntensity: number; radiusM: number };
  /** True while temporal accumulation is running; false while anything moves. */
  taaAccumulating: boolean;
  /** How many of the 32 jittered samples are in the current frame. */
  taaSamples: number;
  /** Render targets the chain holds, and roughly what they weigh. */
  bufferBytes: number;
}

export interface PostChain {
  /** Draw one frame. Falls back to a direct render if the chain is not active. */
  render(): void;
  setSize(width: number, height: number): void;
  apply(lighting: TimeOfDayLighting): void;
  /**
   * Tell the chain whether the picture is holding still.
   *
   * "Still" has to mean the *scene* and not only the camera. A tileset refining
   * in the background changes the image with the camera bolted down, and a
   * temporal accumulation that does not know that averages the city as it arrives
   * — which is a smear produced by exactly the pass that is supposed to prevent
   * them.
   */
  setStill(still: boolean): void;
  invalidate(): void;
  status(): PostStatus;
  dispose(): void;
}

/**
 * `TAARenderPass` with the field its own types leave out.
 *
 * `accumulateIndex` is real, is public, and is how the pass says how many of its
 * 32 jittered samples are in the current frame; three.js's shipped `.d.ts` for
 * the addon does not declare it. Setting it back to -1 is the documented way to
 * throw the accumulation away, and the alternative — toggling `accumulate` off
 * and on across two frames — loses a frame every time the camera twitches.
 */
type Accumulating = TAARenderPass & { accumulateIndex: number; _sampleRenderTarget: WebGLRenderTarget | null; _holdRenderTarget: WebGLRenderTarget | null };

export interface PostOptions {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  lighting: TimeOfDayLighting;
  width: number;
  height: number;
  /** Set false to draw without the chain, which is the item 20 gate proof. */
  enabled?: boolean;
}

export function createPostChain(options: PostOptions): PostChain {
  const { renderer, scene, camera, lighting } = options;

  // ACES lives on the renderer whether or not the chain builds: `OutputPass`
  // reads it from there, and the fallback path needs it too.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure;

  if (options.enabled === false) {
    return fallbackChain(renderer, scene, camera, lighting, "the post chain is switched off");
  }

  let composer: EffectComposer;
  let taa: Accumulating;
  let gtao: GTAOPass;
  let bloom: UnrealBloomPass;
  const partialDisposers: (() => void)[] = [];
  try {
    composer = new EffectComposer(renderer);
    partialDisposers.push(() => composer.dispose());
    // TAA draws moving geometry into its own sample target and accumulating
    // geometry into the composer. Both paths need multisampling.
    composer.renderTarget1.samples = 4;
    composer.renderTarget2.samples = 4;
    composer.setSize(options.width, options.height);

    taa = new TAARenderPass(scene, camera) as Accumulating;
    partialDisposers.push(() => taa.dispose());
    taa._sampleRenderTarget = new WebGLRenderTarget(options.width, options.height, { type: HalfFloatType, samples: 4 });
    taa._sampleRenderTarget.texture.name = "maps:TAA-multisampled-scene";
    // One extra jittered sample a frame. Higher converges sooner and costs that
    // many scene renders on every frame until it does, on a rasteriser that is
    // already the slowest thing in the gate.
    taa.sampleLevel = 0;
    taa.accumulate = false;
    composer.addPass(taa);

    gtao = new GTAOPass(scene, camera, options.width, options.height);
    partialDisposers.push(() => gtao.dispose());
    installAgentNormals(gtao, getAgentNormalMaterial);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = AO_BLEND;
    gtao.updateGtaoMaterial({
      radius: AO_RADIUS_M,
      distanceExponent: 1,
      thickness: 1,
      scale: 1,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: false,
    });
    composer.addPass(gtao);

    bloom = new UnrealBloomPass(
      BLOOM_RESOLUTION,
      lighting.bloom.strength,
      lighting.bloom.radius,
      lighting.bloom.threshold,
    );
    partialDisposers.push(() => bloom.dispose());
    composer.addPass(bloom);

    composer.addPass(new OutputPass());
  } catch (cause) {
    for (const dispose of partialDisposers.reverse()) dispose();
    return fallbackChain(
      renderer,
      scene,
      camera,
      lighting,
      `the post chain could not be built, so the frame is drawn without bloom, ambient ` +
        `occlusion or temporal anti-aliasing. Half-float render targets are the usual ` +
        `missing piece. Underlying failure: ${String(cause)}`,
    );
  }

  let width = options.width;
  let height = options.height;
  let still = false;
  let current = lighting;

  const apply = (next: TimeOfDayLighting): void => {
    current = next;
    renderer.toneMappingExposure = next.exposure;
    bloom.strength = next.bloom.strength;
    bloom.threshold = next.bloom.threshold;
    bloom.radius = next.bloom.radius;
    // Bloom's threshold is baked into a material uniform on construction and
    // again on every render, so writing the property is enough.
    taa.accumulateIndex = -1;
  };
  apply(lighting);

  return {
    render(): void {
      if (taa.accumulate !== still) {
        taa.accumulate = still;
        if (!still) taa.accumulateIndex = -1;
      }
      composer.render();
    },
    setSize(nextWidth: number, nextHeight: number): void {
      width = nextWidth;
      height = nextHeight;
      composer.setSize(nextWidth, nextHeight);
      gtao.setSize(nextWidth, nextHeight);
      taa.accumulateIndex = -1;
      // Upstream TAA inherits SSAA.setSize, which only resizes its sample
      // target. Its hold image otherwise keeps the old viewport dimensions.
      taa._holdRenderTarget?.setSize(nextWidth * renderer.getPixelRatio(), nextHeight * renderer.getPixelRatio());
    },
    apply,
    setStill(value: boolean): void {
      if (value === still) return;
      still = value;
      if (!value) taa.accumulateIndex = -1;
    },
    invalidate(): void { taa.accumulateIndex = -1; },
    status(): PostStatus {
      return {
        active: true,
        error: null,
        passes: ["TAARenderPass", "GTAOPass", "UnrealBloomPass", "OutputPass"],
        toneMapping: "ACESFilmic",
        exposure: renderer.toneMappingExposure,
        bloom: {
          strength: current.bloom.strength,
          threshold: current.bloom.threshold,
          radius: current.bloom.radius,
        },
        ambientOcclusion: { blendIntensity: AO_BLEND, radiusM: AO_RADIUS_M },
        taaAccumulating: taa.accumulate,
        taaSamples: Math.max(0, taa.accumulateIndex),
        bufferBytes: estimateBufferBytes(width, height, renderer.getPixelRatio()),
      };
    },
    dispose(): void {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
    },
  };
}

function fallbackChain(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  lighting: TimeOfDayLighting,
  error: string,
): PostChain {
  let current = lighting;
  return {
    render(): void {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    setSize(): void {},
    apply(next: TimeOfDayLighting): void {
      current = next;
      renderer.toneMappingExposure = next.exposure;
    },
    setStill(): void {},
    invalidate(): void {},
    status(): PostStatus {
      return {
        active: false,
        error,
        passes: [],
        toneMapping: "ACESFilmic",
        exposure: renderer.toneMappingExposure,
        bloom: { strength: 0, threshold: 0, radius: 0 },
        ambientOcclusion: { blendIntensity: 0, radiusM: 0 },
        taaAccumulating: false,
        taaSamples: 0,
        bufferBytes: 0,
      };
    },
    dispose(): void {
      void current;
    },
  };
}

/**
 * Roughly what the chain's render targets weigh, bytes.
 *
 * Format-based estimate, not observed GPU allocation. Includes resolved RGBA16F
 * textures, 4x color/depth renderbuffers for the two composer targets and shared
 * SSAA/TAA sample target, the unsampled hold target, three AO targets and bloom.
 * Driver alignment and allocation overhead remain outside this estimate.
 */
export function estimateBufferBytes(width: number, height: number, pixelRatio: number): number {
  const pixels = width * pixelRatio * height * pixelRatio;
  const halfFloatRgba = pixels * 8;
  const depth = pixels * 4;
  const multisampled = halfFloatRgba + 4 * (halfFloatRgba + depth);
  const composerPingPong = 2 * multisampled;
  const temporal = multisampled + halfFloatRgba + depth;
  const occlusion = 3 * (halfFloatRgba + depth);

  let bloom = 0;
  for (let level = 0; level < 5; level += 1) {
    bloom += 2 * (pixels / 4 ** (level + 1)) * 12;
  }
  bloom += (pixels / 4) * 12;

  return Math.round(composerPingPong + temporal + occlusion + bloom);
}
