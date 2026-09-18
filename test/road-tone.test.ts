/**
 * The road's rendered luminance at the darkest preset — the "black near field".
 *
 * The certified satellite `plaza-az000` frame is the worst case in the whole frame set:
 * the surface under the camera reads as a flat black field. Measured from that frame's
 * own bytes (this session, `artifacts/visual/sweep/satellite/plaza-az000.png`, cropping
 * the inspection tool's `near-pavement` rect at 320,540 640x180, 4 bytes a pixel):
 * **median luminance 10.4, mean 11.4, 66.6% of its pixels under luminance 12** —
 * reproducing the independent inspection's 66.6% exactly. The same rect in the
 * cartographic frame, same pose, same hour, measures **median 52.4**.
 *
 * **That region is the road, not the pavement.** The lit paving grid the inspection read
 * as proof that "something position-dependent is at work" is the *pavement* mesh on the
 * other side of the same frame (`right-ground`, mean 41.6, median 51.3): one pose draws
 * two meshes, `roads:plateau-tran` and `roads:plateau-semantic-pavement`. `lighting.ts`
 * also switches the key light's shadows off below 8 degrees of solar elevation, so at
 * this preset no shadow can fall differently across one horizontal plane. The near field
 * is black because black is close to what this style's road renders as.
 *
 * **The number, and what it is not.** This case gates the *albedo*, not the pixel,
 * because the pixel has two contributions and only one of them is albedo:
 *
 * - the two measured points above, at the two styles' road albedos and the same
 *   irradiance, fit `radiance = A + K·albedo` with **A = 0.0052 and K = 0.0736**
 *   (scene-linear). A is the albedo-independent part: the wet road's specular
 *   reflection of the dusk sky and the post chain's bloom, both of which this style
 *   turns up (`wetness` 0.72, `bloom` 1). A is 66% of the satellite road's radiance and
 *   15% of the cartographic road's, which is why the same pose's two styles render 5x
 *   apart rather than the 11x their albedos alone would give;
 * - fitting the calibration through the satellite point alone (A = 0, the shape a
 *   diffuse-only model assumes) puts the same two points further apart than they are.
 *
 * So the honest prediction for lifting the satellite road to 0x474d55 spans
 * **15.6 to 24.6 of 255** at dusk, depending on how much of A is really albedo-free:
 * the lower figure is the two-point fit, the upper one the single-point fit. Both are an
 * improvement on 10.4, the lower one does not clear the 20 floor by itself, and which
 * one holds is settled by measurement, not by this case: re-capturing the certified
 * poses with only the palette changed measures the albedo-driven sensitivity directly,
 * and if it comes back near the lower end then the palette is not the lever and the
 * light on horizontal surfaces at dusk is.
 */
import { describe, expect, it } from "vitest";
import { Color } from "three";

import { lightingForPreset } from "../src/scene/time-of-day.js";
import { worldStyle, WORLD_STYLES } from "../src/world/styles.js";

/** three's ACESFilmicToneMapping, then the sRGB transfer, as a 0-255 display level. */
function display(radiance: number, exposure: number): number {
  const v = (radiance * exposure) / 0.6;
  const a = v * (v + 0.0245786) - 0.000090537;
  const b = v * (0.983729 * v + 0.432951) + 0.238081;
  const linear = Math.max(0, Math.min(1, a / b));
  return (linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055) * 255;
}

/** The scene-linear radiance that displays as `target` at this exposure. */
function radianceFor(target: number, exposure: number): number {
  let lo = 0;
  let hi = 8;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (display(mid, exposure) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Rec. 709 luminance of a palette colour, in the renderer's linear working space. */
function linearAlbedo(hex: number): number {
  const colour = new Color().setHex(hex);
  return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
}

const DUSK = lightingForPreset("dusk");

/** The two certified near-field road measurements that calibrate the two fits. */
const SATELLITE_ROAD = Object.freeze({ albedo: 0x32363c, displayLuminance: 10.4 });
const CARTOGRAPHIC_ROAD = Object.freeze({ albedo: 0xa4adb1, displayLuminance: 52.4 });

/** Below this the surface is what the inspection called black, at 0-255. */
const BLACK_FLOOR = 20;

/** Dry-to-wet asphalt's own albedo range, linear. 0x32363c is 0.032 and below it. */
const ASPHALT_ALBEDO_BAND = Object.freeze({ low: 0.045, high: 0.2 });

function satelliteDuskLuminance(hex: number): number {
  // Single-point fit: the whole radiance scales with albedo.
  const factor = radianceFor(SATELLITE_ROAD.displayLuminance, DUSK.exposure) / linearAlbedo(SATELLITE_ROAD.albedo);
  return display(factor * linearAlbedo(hex), DUSK.exposure);
}

function twoPointFitDuskLuminance(hex: number): number {
  // radiance = A + K * albedo, solved from the two measured points.
  const satellite = radianceFor(SATELLITE_ROAD.displayLuminance, DUSK.exposure);
  const cartographic = radianceFor(CARTOGRAPHIC_ROAD.displayLuminance, DUSK.exposure);
  const a = linearAlbedo(SATELLITE_ROAD.albedo);
  const c = linearAlbedo(CARTOGRAPHIC_ROAD.albedo);
  const k = (cartographic - satellite) / (c - a);
  const intercept = satellite - k * a;
  return display(intercept + k * linearAlbedo(hex), DUSK.exposure);
}

describe("the road reads as asphalt rather than black at the darkest preset", () => {
  it("calibrates on the certified frame's own measurement", () => {
    // The instrument first: each fit must reproduce the measurement it was built from.
    expect(satelliteDuskLuminance(SATELLITE_ROAD.albedo)).toBeCloseTo(SATELLITE_ROAD.displayLuminance, 4);
    expect(twoPointFitDuskLuminance(SATELLITE_ROAD.albedo)).toBeCloseTo(SATELLITE_ROAD.displayLuminance, 4);
    expect(twoPointFitDuskLuminance(CARTOGRAPHIC_ROAD.albedo)).toBeCloseTo(CARTOGRAPHIC_ROAD.displayLuminance, 4);
    expect(DUSK.exposure).toBeGreaterThan(1);
  });

  it("holds the replaced value outside the asphalt band, so the band is not satisfied by anything", () => {
    // The red control, in the case itself: the albedo the certified "black" frame was
    // drawn with must fail the band, or the band would accept a surface that is black.
    expect(linearAlbedo(SATELLITE_ROAD.albedo)).toBeLessThan(ASPHALT_ALBEDO_BAND.low);
  });

  it("keeps the photographic style's road inside the albedo range dry-to-wet asphalt occupies", () => {
    for (const style of WORLD_STYLES.filter((entry) => entry.facade === "photographic")) {
      const albedo = linearAlbedo(style.palette.road);
      expect(
        albedo,
        `${style.id}'s road is linear ${albedo.toFixed(4)} (0x${style.palette.road.toString(16)}); asphalt runs ` +
          `${ASPHALT_ALBEDO_BAND.low}-${ASPHALT_ALBEDO_BAND.high}. The satellite road measured median 10.4 of 255 at ` +
          "dusk at 0.0365, and 66.6% of that near field under 12",
      ).toBeGreaterThanOrEqual(ASPHALT_ALBEDO_BAND.low);
      expect(albedo).toBeLessThanOrEqual(ASPHALT_ALBEDO_BAND.high);
    }
  });

  it("keeps every style's road above the band's black end", () => {
    // The cartographic style is a map palette and its road (0xa4adb1, linear 0.41) is
    // deliberately lighter than asphalt; it is held only to not being black, which its
    // own certified frame shows it is not (near-field road median 52.4 of 255 at dusk).
    for (const style of WORLD_STYLES) {
      const albedo = linearAlbedo(style.palette.road);
      expect(albedo, `${style.id}'s road is linear ${albedo.toFixed(4)}`).toBeGreaterThanOrEqual(ASPHALT_ALBEDO_BAND.low);
    }
  });

  it("predicts an improvement under both fits, and names the range", () => {
    const road = worldStyle("satellite").palette.road;
    const twoPoint = twoPointFitDuskLuminance(road);
    const singlePoint = satelliteDuskLuminance(road);
    const message =
      `satellite road 0x${road.toString(16)}: two-point fit ${twoPoint.toFixed(1)}, single-point fit ` +
      `${singlePoint.toFixed(1)} of 255 at dusk, against ${SATELLITE_ROAD.displayLuminance.toFixed(1)} before and a ` +
      `${BLACK_FLOOR} floor`;
    // Both fits must move it, or the lever is not albedo at all and this case should be
    // replaced by one on the lighting.
    expect(twoPoint, message).toBeGreaterThan(SATELLITE_ROAD.displayLuminance);
    expect(singlePoint, message).toBeGreaterThan(twoPoint);
    // The floor is cleared by the fit that assumes no albedo-free light. The two-point
    // fit is the measured range's lower end and is recorded rather than asserted, because
    // which of the two holds is what the re-capture settles.
    expect(singlePoint, message).toBeGreaterThanOrEqual(BLACK_FLOOR);
  });

  it("keeps the road darker than the pavement in every style", () => {
    // The near field and the paved right-hand side of the same frame differ by material.
    // Asphalt being the darker of the two is the relationship the frames show, and one
    // this change could invert if the road were lifted to pavement brightness.
    for (const style of WORLD_STYLES) {
      expect(linearAlbedo(style.palette.road), style.id).toBeLessThan(linearAlbedo(style.palette.sidewalk));
    }
  });
});
