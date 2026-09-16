/**
 * Time of day: one place that turns an instant into every light in the scene.
 *
 * Plan item 19. The sun's direction comes from `src/world/sun.ts`, which is the
 * real NOAA solar position for the crossing's latitude and longitude, so shadows
 * fall where a photograph of Shibuya at that hour puts them. Everything else here
 * — the colour of the sun, the colour of the sky, how much light there is, and
 * what the post chain does with it — is derived from one number, the sun's
 * elevation, through the atmosphere model below.
 *
 * ## What is physical and what is tuned
 *
 * Being honest about the split matters, because the two are not equally
 * trustworthy.
 *
 * **Physical:** the sun's azimuth and elevation; the optical air mass; the
 * Rayleigh and aerosol extinction that reddens the sun as it sets; the resulting
 * direct-sun colour and how fast it dims.
 *
 * **Tuned by eye against the rendered frames:** the absolute radiance levels, the
 * sky gradient's shape, the twilight key light below the horizon, the exposure,
 * and the bloom settings. These are scene-referred numbers chosen so the ACES
 * curve lands them where they look right. A full sky-radiance model (Preetham,
 * Hosek-Wilkie) would replace the second list, and it is the obvious upgrade if
 * this ever needs to be right rather than plausible. It was not taken here for a
 * concrete reason: both are fitted for a sun **above** the horizon, and the hero
 * preset for this deliverable is twenty minutes after sunset.
 *
 * ## Why dusk is the hero
 *
 * The plan's reason, restated because it drives the numbers below: PLATEAU's
 * facades are daylight aerial photogrammetry at roughly a ninth of source
 * resolution after the texture cap, and daylight is the one condition that shows
 * every one of those weaknesses. Dusk hides them and lets the emissive signage of
 * item 16 carry the frame, which is what separates Shibuya from a generic
 * Japanese city.
 */

import { Color, Vector3 } from "three";

import { AOI_CENTRE_WGS84 } from "../world/aoi.js";
import { solarPosition, sunDirectionWorld, tokyoInstant, type SolarPosition } from "../world/sun.js";

/**
 * Rayleigh plus aerosol optical depth at zenith, per channel, dimensionless.
 *
 * Rayleigh from the standard 0.008569 x^-4 (1 + 0.0113 x^-2 + 0.00013 x^-4) fit
 * with x in micrometres, evaluated at 610, 550 and 470 nm: 0.0638, 0.0972,
 * 0.1850. Aerosol from an Angstrom law with turbidity 0.1 at 550 nm and exponent
 * 1.3, which is a clear-but-urban day: 0.0873, 0.1000, 0.1226.
 *
 * The sum is what makes a setting sun orange in this file rather than because
 * someone picked orange.
 */
const OPTICAL_DEPTH = Object.freeze({ r: 0.1511, g: 0.1972, b: 0.3076 });

/**
 * Optical air mass at a given elevation, Kasten and Young 1989.
 *
 * 1.0 at the zenith, 1.39 at 46 degrees, 10.8 at 5 degrees, 37.9 at the horizon.
 * The fit is for a sun above the horizon; below it the value is held at the
 * horizon's, because the direct beam is gone and what the model is describing
 * from there on is the sky, not the sun.
 */
export function opticalAirMass(elevationDegrees: number): number {
  const elevation = Math.max(elevationDegrees, 0);
  const denominator =
    Math.sin((elevation * Math.PI) / 180) + 0.50572 * (elevation + 6.07995) ** -1.6364;
  return 1 / denominator;
}

/** How much of the direct beam survives the atmosphere, per channel. */
export function sunTransmittance(elevationDegrees: number): Color {
  const mass = opticalAirMass(elevationDegrees);
  return new Color(
    Math.exp(-OPTICAL_DEPTH.r * mass),
    Math.exp(-OPTICAL_DEPTH.g * mass),
    Math.exp(-OPTICAL_DEPTH.b * mass),
  );
}

export interface SkyParameters {
  /** Linear radiance straight up. */
  zenith: Color;
  /** Linear radiance at the horizon away from the sun. */
  horizon: Color;
  /** Linear radiance of the glow around the sun's azimuth. */
  glow: Color;
  /** Linear radiance below the horizon, which stands in for haze and ground bounce. */
  ground: Color;
  /** How tight the sun glow is. Larger is tighter. */
  glowExponent: number;
  /** How tight the horizon band is. Larger keeps it near the horizon. */
  horizonExponent: number;
  /** Linear radiance of the sun's own disc; zero once it has set. */
  discRadiance: number;
}

export interface TimeOfDayLighting {
  /** The preset's stable id, which is also what the `time` URL parameter takes. */
  id: string;
  /** What to call it in a log line. */
  label: string;
  /** The instant, as an absolute moment. */
  instant: Date;
  /** Japanese wall clock, for the log line and the manifest. */
  tokyoClock: string;
  solar: SolarPosition;
  /** Unit vector from the scene towards the sun, world frame. */
  sunDirection: Vector3;
  /** Colour of the key light, linear. */
  sunColour: Color;
  /** Irradiance multiplier on the key light, three.js physical units. */
  sunIntensity: number;
  /** True while the key light is standing in for twilight sky rather than the sun. */
  sunIsTwilightStandIn: boolean;
  sky: SkyParameters;
  /** Hemisphere fill, from the sky and from the ground. */
  hemisphereSky: Color;
  hemisphereGround: Color;
  hemisphereIntensity: number;
  /** How hard the sky's own image-based lighting drives the materials. */
  environmentIntensity: number;
  /** Exponential-squared fog, which is this scene's aerial perspective. */
  fogColour: Color;
  fogDensity: number;
  /** `toneMappingExposure` on the renderer. */
  exposure: number;
  /** How hard derived and authored signage glows, 0 at midday. */
  signageIntensity: number;
  bloom: { strength: number; threshold: number; radius: number };
}

/**
 * The named times the app can be in.
 *
 * All on the same date so that only the hour varies: 15 October is a fortnight
 * past the equinox, which puts the sun's setting azimuth at 263 degrees — just
 * south of due west, straight down Dogenzaka from the crossing. The date matters
 * to that azimuth and to nothing else here.
 */
export const TIME_PRESETS = Object.freeze({
  dawn: { label: "dawn", instant: tokyoInstant(2026, 10, 15, 5, 25) },
  morning: { label: "morning", instant: tokyoInstant(2026, 10, 15, 8, 30) },
  noon: { label: "solar noon", instant: tokyoInstant(2026, 10, 15, 11, 27) },
  afternoon: { label: "afternoon", instant: tokyoInstant(2026, 10, 15, 15, 0) },
  golden: { label: "golden hour", instant: tokyoInstant(2026, 10, 15, 16, 40) },
  /**
   * The hero.
   *
   * 17:20 JST on 15 October 2026 is twelve minutes after sunset at this latitude
   * — sun azimuth 262.2 degrees, elevation -3.9 degrees. That window is chosen
   * and not arbitrary: the sky still holds a west-facing orange band and an
   * east-facing deep blue, the towers still catch a little warm light on their
   * upper west faces, and the signage is already the brightest thing at street
   * level. Ten minutes earlier the sun washes the signs out; twenty minutes later
   * the sky is flat and the frame is signage over black.
   */
  dusk: { label: "dusk", instant: tokyoInstant(2026, 10, 15, 17, 20) },
  night: { label: "night", instant: tokyoInstant(2026, 10, 15, 20, 0) },
});

export type TimePresetId = keyof typeof TIME_PRESETS;

/** What the app renders when nothing asks for anything else. */
export const DEFAULT_TIME_PRESET: TimePresetId = "dusk";

export function isTimePresetId(value: string): value is TimePresetId {
  return Object.hasOwn(TIME_PRESETS, value);
}

/** Every preset id, for an error message that can name the alternatives. */
export const TIME_PRESET_IDS: readonly TimePresetId[] = Object.freeze(
  Object.keys(TIME_PRESETS) as TimePresetId[],
);

export function lightingForPreset(id: TimePresetId): TimeOfDayLighting {
  const preset = TIME_PRESETS[id];
  return lightingForInstant(id, preset.label, preset.instant);
}

/**
 * Everything the scene needs, for one instant.
 *
 * Exported separately from the presets so a test can walk the whole day and check
 * that nothing goes discontinuous at sunset, which is where every term in here
 * changes shape.
 */
export function lightingForInstant(id: string, label: string, instant: Date): TimeOfDayLighting {
  const solar = solarPosition(instant, {
    latitude: AOI_CENTRE_WGS84.latitude,
    longitude: AOI_CENTRE_WGS84.longitude,
  });
  const elevation = solar.elevationDegrees;
  const direction = sunDirectionWorld(solar);
  const sunDirection = new Vector3(direction.x, direction.y, direction.z);

  // 1 while the sun is well up, 0 once it is 6 degrees under — civil twilight,
  // which is exactly the window the hero preset sits in.
  const daylight = smoothstep(-6, 3, elevation);
  // 1 at solar noon in summer, 0 at the horizon. Drives how blue the sky is.
  const high = smoothstep(0, 50, elevation);
  // 1 in the half hour either side of sunset, 0 away from it. Drives the warm band.
  const twilight = 1 - Math.min(1, Math.abs(elevation + 2) / 10);
  // How far the signs are turned up. It reaches 0.86 at the hero preset's -3.9
  // degrees, which is right: the signage of this ward is on and is the brightest
  // thing at street level well before the sky has finished going out.
  const dark = 1 - smoothstep(-8, 12, elevation);

  const transmittance = sunTransmittance(elevation);
  const beamColour = normaliseToBrightest(transmittance);

  // Direct sun. Its brightness follows the transmittance's own luminance, so a
  // low sun is dim as well as orange, and it is gone under the horizon.
  //
  // The scale is set from the tone curve rather than by eye. ACES with exposure e
  // maps a scene-referred radiance L through x = L e / 0.6, and a Lambertian
  // surface of albedo a under total irradiance E has L = a E / pi. A mid facade
  // at a = 0.2 should land around display byte 180 in full sun, which is x = 0.37
  // and therefore E = 3.9. The three terms below are built to sum to about that:
  // roughly 2.4 from the beam at a typical incidence, 0.5 from the hemisphere and
  // 1.0 from the sky's own image-based lighting.
  //
  // The first version of this file guessed the numbers instead, and the frames
  // came back at a mean luminance of 221 out of 255 — every facade white, every
  // window blown, and the sky blooming over the whole image. That is what a
  // factor of ten in total irradiance looks like.
  const aboveHorizon = smoothstep(-0.9, 1.5, elevation);
  const directIntensity = 3.1 * luminance(transmittance) * aboveHorizon;

  // Under the horizon the key light stops being the sun. What is left is a broad,
  // bright patch of western sky, and modelling it as a weak directional light
  // from the same azimuth is a cheap way to keep some shape on the towers. It is
  // named rather than hidden, because a "sun" below the horizon that still casts
  // shadows is a lie the code should tell out loud.
  const twilightKey = 0.46 * (1 - aboveHorizon) * smoothstep(-11, -1, elevation);
  const sunIntensity = directIntensity + twilightKey;
  const sunIsTwilightStandIn = twilightKey > directIntensity;
  const sunColour = beamColour
    .clone()
    // A pure-transmittance colour at the horizon is (1, 0.17, 0.003), which is a
    // laser and not a light. The stand-in key is pulled back towards the warm
    // white of the sky it actually represents.
    .lerp(new Color(1, 0.72, 0.5), sunIsTwilightStandIn ? 0.7 : 0.12 * (1 - aboveHorizon));

  const sky = skyParameters({ elevation, daylight, high, twilight, beamColour });

  // Hemisphere fill approximates the parts of the sky the environment map's
  // diffuse term under-serves. It is deliberately modest: with a real environment
  // map in the scene this light is a second copy of the same sky, and turning
  // both up is how the first version reached ten times the irradiance it wanted.
  // The division renormalises the sky's own radiance out, so this term is a
  // colour and an intensity rather than a second copy of the sky's brightness.
  const hemisphereSky = sky.zenith
    .clone()
    .lerp(sky.horizon, 0.45)
    .multiplyScalar(1 / Math.max(0.02, 0.02 + 0.33 * daylight));
  const hemisphereGround = new Color(0.1, 0.09, 0.085).multiplyScalar(0.35 + 1.5 * daylight);
  const hemisphereIntensity = 0.16 + 0.42 * daylight;

  // Haze. Enough to separate the far side of a square kilometre from the near
  // side; not enough to fog a street.
  const fogColour = sky.horizon.clone().lerp(sky.glow, 0.35 * twilight);
  const fogDensity = 0.00016 + 0.00012 * daylight;

  return {
    id,
    label,
    instant,
    tokyoClock: tokyoClockOf(instant),
    solar,
    sunDirection,
    sunColour,
    sunIntensity,
    sunIsTwilightStandIn,
    sky,
    hemisphereSky,
    hemisphereGround,
    hemisphereIntensity,
    // The sky dome is drawn at photographic radiance — dark enough that a blue
    // noon sky reads blue and not white — and that is dimmer than the real sky is
    // relative to the ground. This multiplier is where the two are reconciled,
    // and it is a camera's choice rather than a physical constant. It rises after
    // dark because by then the environment is nearly all there is: the key light
    // is a stand-in and the hemisphere is small, so a facade turned away from the
    // west would otherwise be black rather than dim.
    environmentIntensity: 1.5 + 1.5 * dark,
    fogColour,
    fogDensity,
    // Daylight is a much brighter world than dusk, so exposure falls as the sun
    // rises. This is the camera, not the scene.
    exposure: 1.6 - 0.7 * daylight,
    // Signs are on well before it is dark and are washed out well before noon.
    // 2.1 puts a masked sign pixel of albedo 0.35 at about 0.5 of scene-referred
    // radiance at dusk, which is above the bloom threshold and lands near display
    // byte 215 — bright, blooming at its edges, and short of clipping. At 3.2 the
    // whole face of a signed building clipped and the bloom swallowed the street.
    signageIntensity: 0.05 + 2.1 * dark,
    bloom: {
      // Bloom is what carries the neon, so it is strongest when the neon is.
      strength: 0.18 + 0.26 * dark,
      // In scene-referred linear radiance, and the number that matters most in
      // this file. A daylight facade sits near 0.25 and the daylight sky near
      // 0.33, so 0.55 keeps both out of the bloom and lets the sun's disc and a
      // specular highlight through. At dusk everything drops by about ten, so the
      // threshold drops with it and the signage is what is left above it.
      threshold: 0.55 - 0.2 * dark,
      radius: 0.42,
    },
  };
}

interface SkyInputs {
  elevation: number;
  daylight: number;
  high: number;
  twilight: number;
  beamColour: Color;
}

function skyParameters(inputs: SkyInputs): SkyParameters {
  const { daylight, high, twilight, beamColour } = inputs;

  // Every radiance below is scene-referred and is set from where ACES lands it,
  // not from a sky-radiance model. A noon zenith of 0.10 comes out as a blue near
  // display byte 110 at this file's exposure and a horizon of 0.34 near byte 205.
  // Raise them and the sky goes white and takes the bloom with it, which is what
  // the first version of this file did.

  // Zenith: a deep blue that brightens and desaturates as the sun climbs.
  const zenith = new Color(0.19, 0.4, 1.0)
    .lerp(new Color(0.34, 0.56, 1.0), high)
    .multiplyScalar(0.0055 + 0.098 * daylight);

  // Horizon away from the sun: paler, and never as dark as the zenith, because
  // that is where the sky's own scattered light piles up.
  const horizon = new Color(0.34, 0.46, 0.78)
    .lerp(new Color(0.46, 0.66, 1.0), high)
    .multiplyScalar(0.012 + 0.33 * daylight);

  // The glow around the sun's azimuth. This is the band that says "sunset", and
  // it takes its hue from the same extinction that colours the beam.
  const glow = beamColour
    .clone()
    .lerp(new Color(1.0, 0.55, 0.28), 0.45)
    .multiplyScalar(0.006 + 0.13 * daylight + 0.45 * twilight);

  const ground = horizon.clone().multiplyScalar(0.35).lerp(new Color(0.02, 0.02, 0.025), 0.5);

  return {
    zenith,
    horizon,
    glow,
    ground,
    // Wide near sunset, tight when the sun is high. Not as wide as it was: at an
    // exponent of 2.2 the lobe covers half the dome, and half a dome of sunset
    // colour is a wash rather than a sunset.
    glowExponent: 5.0 + 30 * high,
    horizonExponent: 0.42 + 0.02 * daylight,
    discRadiance: 26 * smoothstep(-0.5, 2, inputs.elevation) * (0.25 + 0.75 * high),
  };
}

/** Rec. 709 luminance of a linear colour. */
export function luminance(colour: Color): number {
  return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
}

/** Scale a colour so its largest channel is 1, leaving hue and saturation alone. */
function normaliseToBrightest(colour: Color): Color {
  const peak = Math.max(colour.r, colour.g, colour.b, 1e-6);
  return colour.clone().multiplyScalar(1 / peak);
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 === edge0) return value < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function tokyoClockOf(instant: Date): string {
  const shifted = new Date(instant.getTime() + 9 * 3_600_000);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())} JST`
  );
}
