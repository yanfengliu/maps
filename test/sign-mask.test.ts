/**
 * Bound: exact eight-bit RGB/alpha and ordered double statistics, not source
 * eligibility, rendered appearance or startup time. The oracle below freezes
 * the pre-564 public loop and thresholds; it shares no response helper or LUT.
 */
import { describe, expect, it } from "vitest";
import { PLATEAU_SIGN_MASK, writeSignMask, type SignMaskSettings } from "../src/scene/signage.js";

const BASELINE_SETTINGS: SignMaskSettings = Object.freeze({
  saturationLow: 0.16, saturationHigh: 0.34, valueLow: 0.3, valueHigh: 0.55,
  whiteLow: 0.76, whiteHigh: 0.94, whiteWeight: 0.3,
});

function baseline(pixels: Uint8ClampedArray | Uint8Array, settings = BASELINE_SETTINGS) {
  let maskSum = 0;
  let strong = 0;
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const r = pixels[offset]!;
    const g = pixels[offset + 1]!;
    const b = pixels[offset + 2]!;
    const max = r > g ? (r > b ? r : b) : g > b ? g : b;
    const min = r < g ? (r < b ? r : b) : g < b ? g : b;
    const value = max / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const coloured =
      baselineSmoothstep(settings.saturationLow, settings.saturationHigh, saturation) *
      baselineSmoothstep(settings.valueLow, settings.valueHigh, value);
    const white = baselineSmoothstep(settings.whiteLow, settings.whiteHigh, value) * settings.whiteWeight;
    const mask = coloured > white ? coloured : white;
    pixels[offset + 3] = Math.round(mask * 255);
    maskSum += mask;
    if (mask > 0.5) strong += 1;
    count += 1;
  }
  return {
    pixels: count,
    meanMask: count === 0 ? 0 : maskSum / count,
    coverage: count === 0 ? 0 : strong / count,
  };
}

function baselineSmoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function extremaFixture(): Uint8Array {
  const pairs = 32896;
  const pixels = new Uint8Array(pairs * 3 * 6 * 4);
  let at = 0;
  for (let high = 0; high <= 255; high += 1) {
    for (let low = 0; low <= high; low += 1) {
      for (const middle of [low, Math.floor((low + high) / 2), high]) {
        for (const rgb of [
          [high, middle, low], [high, low, middle], [middle, high, low],
          [middle, low, high], [low, high, middle], [low, middle, high],
        ]) {
          pixels.set([...rgb, (at / 4) % 256], at);
          at += 4;
        }
      }
    }
  }
  expect(at).toBe(pixels.length);
  return pixels;
}

describe("default sign mask exact response", () => {
  it("keeps frozen thresholds and literal threshold/tie responses through the public function", () => {
    expect(PLATEAU_SIGN_MASK).toEqual(BASELINE_SETTINGS);
    expect(Object.isFrozen(PLATEAU_SIGN_MASK)).toBe(true);
    for (const [rgb, alpha, meanMask, coverage] of [
      [[0, 0, 0], 0, 0, 0], [[76, 0, 0], 0, 0, 0],
      [[141, 0, 0], 255, 1, 1], [[150, 126, 130], 0, 0, 0],
      [[150, 99, 123], 255, 1, 1], [[193, 193, 193], 0, 0, 0],
      [[240, 240, 240], 77, 0.3, 0], [[255, 255, 255], 77, 0.3, 0],
    ] as const) {
      const pixel = new Uint8Array([...rgb, 42]);
      expect(writeSignMask(pixel)).toEqual({ pixels: 1, meanMask, coverage });
      expect(Array.from(pixel)).toEqual([...rgb, alpha]);
    }
  });

  it("retains every one of the 32,896 unquantized extrema responses", () => {
    let pairs = 0;
    for (let high = 0; high <= 255; high += 1) {
      for (let low = 0; low <= high; low += 1) {
        const actual = new Uint8Array([high, low, low, 23]);
        const expected = actual.slice();
        const stats = baseline(expected);
        expect(writeSignMask(actual)).toEqual(stats);
        expect(actual).toEqual(expected);
        pairs += 1;
      }
    }
    expect(pairs).toBe(32896);
  });

  for (const ArrayType of [Uint8Array, Uint8ClampedArray]) {
    it(`preserves RGB, overwritten alpha and ordered statistics for all channel/middle variants in ${ArrayType.name}`, () => {
      const actual = new ArrayType(extremaFixture());
      const expected = actual.slice();
      const expectedStats = baseline(expected);
      expect(writeSignMask(actual, PLATEAU_SIGN_MASK)).toEqual(expectedStats);
      expect(Buffer.compare(Buffer.from(actual), Buffer.from(expected))).toBe(0);
      // Rewriting the resulting alpha must still leave RGB and stats unchanged.
      expect(writeSignMask(actual)).toEqual(expectedStats);
      expect(Buffer.compare(Buffer.from(actual), Buffer.from(expected))).toBe(0);
    });
  }

  it("sums the original double responses in the same pixel order", () => {
    const fixture = extremaFixture();
    for (const input of [fixture, fixture.slice().reverse()]) {
      const expected = input.slice();
      expect(writeSignMask(input)).toEqual(baseline(expected));
      expect(Buffer.compare(Buffer.from(input), Buffer.from(expected))).toBe(0);
    }
  });
});

describe("general sign mask contract", () => {
  const sample = [0, 0, 0, 7, 100, 80, 20, 123, 255, 255, 255, 0, 255, 0, 80, 255];
  const settingsCases: SignMaskSettings[] = [
    { ...BASELINE_SETTINGS },
    { ...BASELINE_SETTINGS, saturationLow: 0.1, saturationHigh: 0.8, whiteWeight: 0.71 },
    { ...BASELINE_SETTINGS, valueLow: 0.5, valueHigh: 0.5, whiteLow: 0.9, whiteHigh: 0.2 },
    { ...BASELINE_SETTINGS, saturationLow: 0.7, saturationHigh: 0.1, whiteWeight: -2 },
    { ...BASELINE_SETTINGS, saturationLow: NaN },
    { ...BASELINE_SETTINGS, valueHigh: Infinity },
    { ...BASELINE_SETTINGS, whiteLow: -Infinity },
    { ...BASELINE_SETTINGS, whiteWeight: NaN },
    { ...BASELINE_SETTINGS, whiteWeight: Infinity },
    { ...BASELINE_SETTINGS, saturationLow: NaN, whiteWeight: -2 },
    ...(Object.keys(BASELINE_SETTINGS) as (keyof SignMaskSettings)[]).flatMap((key) =>
      [NaN, Infinity, -Infinity].map((value) => ({ ...BASELINE_SETTINGS, [key]: value })),
    ),
  ];

  for (const ArrayType of [Uint8Array, Uint8ClampedArray]) {
    it(`preserves custom/nonfinite/degenerate settings in ${ArrayType.name}`, () => {
      for (const settings of settingsCases) {
        const actual = new ArrayType(sample);
        const expected = actual.slice();
        expect(writeSignMask(actual, settings)).toEqual(baseline(expected, settings));
        expect(actual).toEqual(expected);
      }
    });

    it(`preserves empty and incomplete buffers, including their pixel counts, in ${ArrayType.name}`, () => {
      for (let length = 0; length <= sample.length; length += 1) {
        for (const settings of [PLATEAU_SIGN_MASK, settingsCases[1]!]) {
          const actual = new ArrayType(sample.slice(0, length));
          const expected = actual.slice();
          expect(writeSignMask(actual, settings)).toEqual(baseline(expected, settings));
          expect(actual).toEqual(expected);
        }
      }
    });
  }

  it("continues to read custom settings per pixel rather than caching them", () => {
    const changing = () => {
      let reads = 0;
      return { ...BASELINE_SETTINGS, get whiteWeight() { return reads++ % 2 ? 0.7 : 0.3; } };
    };
    const actual = new Uint8Array([255, 255, 255, 0, 255, 255, 255, 0]);
    const expected = actual.slice();
    expect(writeSignMask(actual, changing())).toEqual(baseline(expected, changing()));
    expect(actual).toEqual(expected);
    expect(actual[3]).toBe(77);
    expect(actual[7]).toBe(179);
  });
});
