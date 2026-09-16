/**
 * De-lighting PLATEAU's facade textures. Plan item 35.
 *
 * PLATEAU's photographic atlases contain surface colour, capture illumination,
 * shadows and camera processing. The source does not provide the per-pixel
 * reflectance or irradiance needed to separate those quantities. Applying scene
 * lighting to the photograph can deepen its baked shadows and colour cast.
 *
 * This operator is a bounded colour heuristic, not measured albedo recovery.
 * It subtracts an assumed airlight term, divides by an assumed illuminant,
 * compresses luminance around an authored pivot and clamps to an authored band.
 * Pixel brightness chooses the illuminant blend; it cannot establish whether a
 * pixel represents a dark surface or a shadow. A global contrast range does not
 * establish that either. Clamps and byte quantization discard information, so
 * the full operator is not invertible.
 *
 * Processing has no spatial neighbourhood. Atlas neighbours can belong to
 * unrelated buildings or faces; blurring across them would transfer colour
 * between surfaces. Consequently this treatment does not remove hard-shadow
 * shapes, recover lost texture detail or establish neutral reflectance. Dark
 * glass and dark paint can move with photographic shadows under the same curve.
 *
 * The pure byte-array tests check this operator's stated bounds. Native source
 * samples in the graphics diagnostics measure its actual colour changes; those
 * observations do not prove that the output is physically correct albedo.
 */

/** sRGB to linear, on the 0-255 byte scale in and 0-1 linear out. */
const SRGB_TO_LINEAR = new Float32Array(256);
for (let value = 0; value < 256; value += 1) {
  const normalised = value / 255;
  SRGB_TO_LINEAR[value] =
    normalised <= 0.04045 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
}

export function srgbByteToLinear(value: number): number {
  return SRGB_TO_LINEAR[value]!;
}

export function linearToSrgbByte(value: number): number {
  const clamped = value <= 0 ? 0 : value >= 1 ? 1 : value;
  const encoded = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

/** Rec. 709 luminance of a linear triple. */
export function linearLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface DelightSettings {
  /**
   * Airlight, linear, per channel: the scattered light the atmosphere adds
   * between the camera and the facade. Bluer than the scene, which is why it
   * washes colour out.
   */
  airlight: readonly [number, number, number];
  /** How much of the facade survived the same kilometre of air, 0-1. */
  hazeTransmittance: number;
  /** Colour of direct sun, normalised to luminance 1. */
  sunIlluminant: readonly [number, number, number];
  /** Colour of blue skylight, normalised to luminance 1. Divides out shadow blue. */
  skyIlluminant: readonly [number, number, number];
  /** Linear luminance below which a pixel counts as fully shadowed. */
  shadowLuminance: number;
  /** Linear luminance above which a pixel counts as fully sunlit. */
  sunLuminance: number;
  /**
   * The linear luminance the compression leaves alone.
   *
   * 0.18 is the classic mid-grey, and it is also close to the reflectance of the
   * pale rendered concrete that most of this ward's mid-rise is faced with.
   */
  pivotLuminance: number;
  /**
   * Compression exponent, 0-1. 1 is no compression at all.
   *
   * 0.6 takes a 100:1 photographic range to about 16:1. Lower flattens the
   * facades towards a single grey; higher leaves the baked sun in.
   */
  compression: number;
  /** How much saturation survives. Above 1 restores what the haze took out. */
  chromaGain: number;
  /** Plausible reflectance band, linear. */
  albedoFloor: number;
  albedoCeiling: number;
}

/**
 * The settings this project ships.
 *
 * Chosen against the measured statistics in `docs/work/0_shibuya-1km/design.md`
 * and against the rendered frames, in that order: the numbers say the range
 * collapsed, the frames say whether it looks like a city.
 */
export const PLATEAU_DELIGHT: DelightSettings = Object.freeze({
  airlight: [0.012, 0.016, 0.028] as const,
  hazeTransmittance: 0.88,
  sunIlluminant: [1.03, 1.0, 0.94] as const,
  skyIlluminant: [0.86, 0.998, 1.434] as const,
  shadowLuminance: 0.02,
  sunLuminance: 0.25,
  pivotLuminance: 0.18,
  compression: 0.6,
  chromaGain: 1.22,
  albedoFloor: 0.02,
  albedoCeiling: 0.88,
});

/** The identity: every stage neutral. Used by the gate proof and by the tests. */
export const NO_DELIGHT: DelightSettings = Object.freeze({
  airlight: [0, 0, 0] as const,
  hazeTransmittance: 1,
  sunIlluminant: [1, 1, 1] as const,
  skyIlluminant: [1, 1, 1] as const,
  shadowLuminance: 0,
  sunLuminance: 1,
  pivotLuminance: 0.18,
  compression: 1,
  chromaGain: 1,
  albedoFloor: 0,
  albedoCeiling: 1,
});

export interface AlbedoStats {
  /** How many pixels the statistics were taken over. */
  samples: number;
  /** Mean linear luminance. This is the albedo level, and the double-darkening number. */
  meanLinearLuminance: number;
  /** Mean luminance as displayed, 0-255, which is what the frame looks like. */
  meanSrgbLuminance: number;
  /** Mean HSV saturation, 0-1. */
  meanSaturation: number;
  /** Linear luminance at the 5th, 50th and 95th percentiles. */
  p05LinearLuminance: number;
  p50LinearLuminance: number;
  p95LinearLuminance: number;
  /**
   * p95 over p05.
   *
   * The single number that says whether the light is still in the albedo. A
   * photograph of a lit facade runs about 100:1; real albedo runs about 10:1.
   */
  dynamicRange: number;
}

/**
 * Measure an RGBA byte buffer.
 *
 * `stride` samples every nth pixel. The statistics are over a hundred thousand
 * samples either way, and stepping by a prime avoids landing on the same column
 * of an atlas every time.
 */
export function measureAlbedo(pixels: Uint8ClampedArray | Uint8Array, stride = 7): AlbedoStats {
  const pixelCount = Math.floor(pixels.length / 4);
  const luminances: number[] = [];
  let linearSum = 0;
  let srgbSum = 0;
  let saturationSum = 0;
  let samples = 0;

  for (let index = 0; index < pixelCount; index += stride) {
    const offset = index * 4;
    const r = SRGB_TO_LINEAR[pixels[offset]!]!;
    const g = SRGB_TO_LINEAR[pixels[offset + 1]!]!;
    const b = SRGB_TO_LINEAR[pixels[offset + 2]!]!;
    const linear = linearLuminance(r, g, b);
    luminances.push(linear);
    linearSum += linear;
    srgbSum +=
      0.2126 * pixels[offset]! + 0.7152 * pixels[offset + 1]! + 0.0722 * pixels[offset + 2]!;
    const max = Math.max(pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!);
    const min = Math.min(pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!);
    saturationSum += max === 0 ? 0 : (max - min) / max;
    samples += 1;
  }

  if (samples === 0) return emptyStats();

  luminances.sort((a, b) => a - b);
  const at = (fraction: number): number =>
    luminances[Math.min(luminances.length - 1, Math.floor(fraction * luminances.length))]!;
  const p05 = at(0.05);
  const p95 = at(0.95);

  return {
    samples,
    meanLinearLuminance: linearSum / samples,
    meanSrgbLuminance: srgbSum / samples,
    meanSaturation: saturationSum / samples,
    p05LinearLuminance: p05,
    p50LinearLuminance: at(0.5),
    p95LinearLuminance: p95,
    dynamicRange: p95 / Math.max(p05, 1e-5),
  };
}

/**
 * Corpus statistics across many textures, without holding their pixels.
 *
 * Percentiles need a distribution, and the distribution over 63 megapixels does
 * not fit in an array of doubles. A 256-bin histogram over the sRGB byte
 * luminance does, it is exact for a byte-quantised source, and its bin centres
 * convert back to linear luminance the same way any other byte does.
 */
export class AlbedoAccumulator {
  private readonly histogram = new Uint32Array(256);
  private linearSum = 0;
  private srgbSum = 0;
  private saturationSum = 0;
  private samples = 0;

  /** Add a texture's pixels, sampling every `stride`th one. */
  add(pixels: Uint8ClampedArray | Uint8Array, stride = 7): void {
    const pixelCount = Math.floor(pixels.length / 4);
    for (let index = 0; index < pixelCount; index += stride) {
      const offset = index * 4;
      const r = pixels[offset]!;
      const g = pixels[offset + 1]!;
      const b = pixels[offset + 2]!;
      const srgbLuminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      this.histogram[Math.min(255, Math.round(srgbLuminance))]! += 1;
      this.linearSum += linearLuminance(
        SRGB_TO_LINEAR[r]!,
        SRGB_TO_LINEAR[g]!,
        SRGB_TO_LINEAR[b]!,
      );
      this.srgbSum += srgbLuminance;
      const max = r > g ? (r > b ? r : b) : g > b ? g : b;
      const min = r < g ? (r < b ? r : b) : g < b ? g : b;
      this.saturationSum += max === 0 ? 0 : (max - min) / max;
      this.samples += 1;
    }
  }

  stats(): AlbedoStats {
    if (this.samples === 0) return emptyStats();
    const percentile = (fraction: number): number => {
      const target = fraction * this.samples;
      let seen = 0;
      for (let bin = 0; bin < 256; bin += 1) {
        seen += this.histogram[bin]!;
        if (seen >= target) return SRGB_TO_LINEAR[bin]!;
      }
      return SRGB_TO_LINEAR[255]!;
    };
    const p05 = percentile(0.05);
    const p95 = percentile(0.95);
    return {
      samples: this.samples,
      meanLinearLuminance: this.linearSum / this.samples,
      meanSrgbLuminance: this.srgbSum / this.samples,
      meanSaturation: this.saturationSum / this.samples,
      p05LinearLuminance: p05,
      p50LinearLuminance: percentile(0.5),
      p95LinearLuminance: p95,
      dynamicRange: p95 / Math.max(p05, 1e-5),
    };
  }
}

function emptyStats(): AlbedoStats {
  return {
    samples: 0,
    meanLinearLuminance: 0,
    meanSrgbLuminance: 0,
    meanSaturation: 0,
    p05LinearLuminance: 0,
    p50LinearLuminance: 0,
    p95LinearLuminance: 0,
    dynamicRange: 1,
  };
}

/**
 * Apply the operator to an RGBA byte buffer, in place.
 *
 * The alpha channel is left alone. `DelightPlugin` writes the derived sign mask
 * into it afterwards, from the pixels as they were before this ran.
 */
export function delightInPlace(
  pixels: Uint8ClampedArray | Uint8Array,
  settings: DelightSettings = PLATEAU_DELIGHT,
): void {
  const [airR, airG, airB] = settings.airlight;
  const [sunR, sunG, sunB] = settings.sunIlluminant;
  const [skyR, skyG, skyB] = settings.skyIlluminant;
  const transmittance = Math.max(settings.hazeTransmittance, 1e-3);
  const shadowLuminance = settings.shadowLuminance;
  const sunSpan = Math.max(settings.sunLuminance - settings.shadowLuminance, 1e-6);
  const pivot = settings.pivotLuminance;
  const compression = settings.compression;
  const chromaGain = settings.chromaGain;

  for (let offset = 0; offset < pixels.length; offset += 4) {
    // Stage 1 — de-haze.
    let r = (SRGB_TO_LINEAR[pixels[offset]!]! - airR) / transmittance;
    let g = (SRGB_TO_LINEAR[pixels[offset + 1]!]! - airG) / transmittance;
    let b = (SRGB_TO_LINEAR[pixels[offset + 2]!]! - airB) / transmittance;
    if (r < 0) r = 0;
    if (g < 0) g = 0;
    if (b < 0) b = 0;

    // Stage 2 — de-illuminate. The blend is on the pixel's own luminance: dark
    // pixels were lit by the sky, bright ones by the sun.
    const lit = linearLuminance(r, g, b);
    let weight = (lit - shadowLuminance) / sunSpan;
    weight = weight <= 0 ? 0 : weight >= 1 ? 1 : weight * weight * (3 - 2 * weight);
    const illuminantR = skyR + (sunR - skyR) * weight;
    const illuminantG = skyG + (sunG - skyG) * weight;
    const illuminantB = skyB + (sunB - skyB) * weight;
    r /= illuminantR;
    g /= illuminantG;
    b /= illuminantB;

    // Stage 3 — compress towards the pivot, and restore the chroma the haze took.
    const unlit = linearLuminance(r, g, b);
    if (unlit <= 1e-6) {
      pixels[offset] = linearToSrgbByte(settings.albedoFloor);
      pixels[offset + 1] = linearToSrgbByte(settings.albedoFloor);
      pixels[offset + 2] = linearToSrgbByte(settings.albedoFloor);
      continue;
    }
    const compressed = pivot * (unlit / pivot) ** compression;
    const scale = compressed / unlit;
    const grey = compressed;
    r = grey + (r * scale - grey) * chromaGain;
    g = grey + (g * scale - grey) * chromaGain;
    b = grey + (b * scale - grey) * chromaGain;

    // Stage 4 — clamp to a reflectance a real surface could have.
    pixels[offset] = linearToSrgbByte(clamp(r, settings.albedoFloor, settings.albedoCeiling));
    pixels[offset + 1] = linearToSrgbByte(clamp(g, settings.albedoFloor, settings.albedoCeiling));
    pixels[offset + 2] = linearToSrgbByte(clamp(b, settings.albedoFloor, settings.albedoCeiling));
  }
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}
