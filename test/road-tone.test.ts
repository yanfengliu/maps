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
 *
 * **The measurement came back near the lower end.** The re-capture with the palette
 * lifted and nothing else changed (certificate runId `14cdadbafba82120`,
 * `sweep/satellite/plaza-az000.png`) measures the same rect at **mean 17.8, 0.3% of
 * its pixels under 12, 86.7% of neighbouring pixel pairs identical** — between the two
 * fits' predictions and short of the 20 floor. So the palette is not the lever that
 * remains and the light on horizontal surfaces at dusk is: the second describe block
 * below gates that, and the albedo cases above keep their meaning as the calibration
 * both fits are built from.
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

/**
 * The other half of the same defect: the light, not the albedo.
 *
 * **What this block gates, and its bound.** These cases check the *lighting numbers*
 * against the certified pixel, through the same tone curve the renderer uses. They do
 * not check a pixel, and they cannot: whether the delivered frame clears the floor is
 * the appearance lane's measurement (`npm run visual`), and the numbers it returned are
 * recorded where this change's own record lives. Two assumptions are named here rather
 * than hidden, because the cases are only as good as they are:
 *
 * 1. The road's rendered radiance rises with the ambient. It does so only as far as the
 *    ambient is what its radiance follows: the albedo-free part A (the wet road's
 *    specular reflection of the dusk sky, plus the post chain's bloom) may be partly
 *    bloom, which the ambient does not move. The first case assumes all of it rises, the
 *    second holds A fixed and is the pessimistic split, so the pair brackets the answer
 *    instead of asserting one.
 * 2. The certified rect's mean is the quantity in question. It is a region mean over
 *    the road at one pose and hour, and the streak of pavement or marking inside it
 *    would move a mean that the median does not.
 *
 * Both cases were watched red against the pre-change lighting (hemisphere 0.218,
 * environment 2.837 at dusk), where the pessimistic one reads below the floor; the
 * mutation and its message are in `docs/learning/gate-proofs.md`.
 */
describe("the dusk ambient is what lifts the dark near field", () => {
  /** The satellite road rect's own mean at `plaza-az000`, runId `14cdadbafba82120`. */
  const CERTIFIED_ROAD_MEAN = 17.8;

  /**
   * The two ambient terms this change lifts, at dusk, as the certified frame was drawn.
   *
   * Written out rather than recomputed from the daylight ramp on purpose: this is the
   * measured starting point the lift is a delta on, and a test that derives it from the
   * same expression it is checking would agree with the code by construction. The preset
   * is 17:20 JST on 15 October, which solves to a solar elevation of -3.48 degrees, so
   * `daylight` is 0.191 and `dark` is 0.870 and the pre-change formulas give these two.
   */
  const CERTIFIED_DUSK_AMBIENT = Object.freeze({ hemisphereIntensity: 0.2403, environmentIntensity: 2.8048 });

  /** How far the shipped dusk ambient rises over the certified one. */
  const ambientLift = DUSK.environmentIntensity / CERTIFIED_DUSK_AMBIENT.environmentIntensity;

  it("raises both dusk ambient terms, within a bounded factor", () => {
    expect(
      ambientLift,
      `the dusk environment is ${DUSK.environmentIntensity.toFixed(3)} against the certified ` +
        `${CERTIFIED_DUSK_AMBIENT.environmentIntensity}: a lift of ${ambientLift.toFixed(2)}x. The certified ` +
        `satellite near-field road is ${CERTIFIED_ROAD_MEAN} of 255 at this preset with ${(
          (0.0052 / (0.0052 + 0.0736 * linearAlbedo(worldStyle("satellite").palette.road))) *
          100
        ).toFixed(0)}% of its radiance albedo-free, so a lift that does not move the ambient does not move the rect.`,
    ).toBeGreaterThan(1.5);
    const hemisphereLift = DUSK.hemisphereIntensity / CERTIFIED_DUSK_AMBIENT.hemisphereIntensity;
    expect(hemisphereLift, `hemisphere ${DUSK.hemisphereIntensity.toFixed(3)} vs ${CERTIFIED_DUSK_AMBIENT.hemisphereIntensity}`).toBeGreaterThan(1.5);
    // Bounded: a two-stop lift would take the pavement and the facades with it, and the
    // tone review on the captured frames is what would have to accept that.
    expect(ambientLift, "the dusk ambient lift is bounded at 2x").toBeLessThanOrEqual(2);
    expect(hemisphereLift, "the dusk hemisphere lift is bounded at 2x").toBeLessThanOrEqual(2);
  });

  it("puts the road over the floor with its whole radiance following the ambient", () => {
    const predicted = display(radianceFor(CERTIFIED_ROAD_MEAN, DUSK.exposure) * ambientLift, DUSK.exposure);
    expect(
      predicted,
      `the certified satellite near-field road is ${CERTIFIED_ROAD_MEAN} of 255 at dusk; the shipped ambient's ` +
        `${ambientLift.toFixed(2)}x lift puts it at ${predicted.toFixed(1)} against a floor of ${BLACK_FLOOR}`,
    ).toBeGreaterThanOrEqual(BLACK_FLOOR);
  });

  it("still clears the floor when only the illumination-driven share of that radiance rises", () => {
    // The pessimistic split: A is fixed, because if it is bloom the ambient does not move
    // it. This is the case that has to hold for the change to be worth its tone risk.
    const road = worldStyle("satellite").palette.road;
    const albedo = linearAlbedo(road);
    const albedoFree = 0.0052 / (0.0052 + 0.0736 * albedo);
    const predicted = display(radianceFor(CERTIFIED_ROAD_MEAN, DUSK.exposure) * (albedoFree + (1 - albedoFree) * ambientLift), DUSK.exposure);
    expect(
      predicted,
      `with ${(albedoFree * 100).toFixed(0)}% of the certified ${CERTIFIED_ROAD_MEAN} of 255 held fixed as ` +
        `albedo-free and the rest lifted ${ambientLift.toFixed(2)}x, the road lands at ${predicted.toFixed(1)} ` +
        `against a floor of ${BLACK_FLOOR}`,
    ).toBeGreaterThanOrEqual(BLACK_FLOOR);
  });

  it("leaves the noon ambient exactly where it was, so the daylight tone cannot move", () => {
    // The tone review's binding number: the cartographic noon crossing band measured
    // 169.80 of 255 in the superseded capture, and a daylight term here would move it.
    // `dark` is 0 with the sun up, so the fill contributes nothing and these two are the
    // values the pre-change formula produced.
    const noon = lightingForPreset("noon");
    expect(noon.hemisphereIntensity, "noon hemisphere intensity").toBeCloseTo(0.58, 9);
    expect(noon.environmentIntensity, "noon environment intensity").toBeCloseTo(1.5, 9);
  });
});
