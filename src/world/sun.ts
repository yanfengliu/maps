/**
 * Where the sun actually is, for a place and an instant.
 *
 * Plan item 19 asks for a time-of-day sun whose angle is physically plausible for
 * Tokyo at 35.66 N. Getting the real azimuth is cheap — this file is the NOAA
 * solar position algorithm, about eighty lines — and it buys the thing a viewer
 * checks without knowing they are checking it: shadows falling the way they fall
 * in the photographs. A sun placed by eye puts the October evening light in the
 * north-west, and Tokyo's is in the west-south-west.
 *
 * Two conventions meet here and both are stated rather than implied.
 *
 * **Solar azimuth** is degrees clockwise from true north: 0 north, 90 east, 180
 * south, 270 west. **Elevation** is degrees above the horizon and goes negative
 * after sunset.
 *
 * **The world frame** is Phase 0's: metres, Y up, +X east, +Z south. So a unit
 * vector pointing at the sun is `(cos(el) sin(az), sin(el), -cos(el) cos(az))`,
 * and the minus sign on Z is the whole of the conversion.
 *
 * The algorithm is NOAA's, which is Jean Meeus's low-precision solar position
 * (Astronomical Algorithms, chapter 25) as published in NOAA's solar calculator
 * spreadsheet. It is good to about 0.01 degrees over 1900-2100, which is two
 * orders of magnitude finer than anything a rendered frame can show.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Milliseconds in a day, for the Julian date. */
const MS_PER_DAY = 86_400_000;

/** The Julian date of the Unix epoch, 1970-01-01T00:00:00Z. */
const UNIX_EPOCH_JD = 2_440_587.5;

/** The Julian date of J2000.0, the epoch the series below are expanded about. */
const J2000_JD = 2_451_545;

export interface SolarPosition {
  /** Degrees clockwise from true north. */
  azimuthDegrees: number;
  /**
   * Degrees above the horizon, refraction included. Negative after sunset.
   *
   * Refraction is what makes the sun visible when it is geometrically already
   * below the horizon — about 0.57 degrees of lift at the horizon itself — so a
   * dusk preset tuned against the geometric elevation is tuned against a sun in
   * the wrong place by more than its own diameter.
   */
  elevationDegrees: number;
  /** Elevation before the refraction correction, for anything that needs it raw. */
  geometricElevationDegrees: number;
  /** Declination of the sun, degrees. North positive. */
  declinationDegrees: number;
  /**
   * Apparent solar time minus mean solar time, minutes.
   *
   * Published as part of the answer because it is the reason solar noon in Tokyo
   * is not at noon: the equation of time runs to about +14 minutes in early
   * November and -14 in February.
   */
  equationOfTimeMinutes: number;
  /** Degrees; 0 at solar noon, negative before it, positive after. */
  hourAngleDegrees: number;
}

export interface Observer {
  /** Degrees north. */
  latitude: number;
  /** Degrees east. */
  longitude: number;
}

/**
 * The sun's position for an instant, as seen from a point on the ground.
 *
 * `instant` is an absolute moment. The caller decides what wall clock produced
 * it; nothing here knows about time zones, and `tokyoInstant` below is the one
 * place that conversion happens.
 */
export function solarPosition(instant: Date, observer: Observer): SolarPosition {
  const julianDay = instant.getTime() / MS_PER_DAY + UNIX_EPOCH_JD;
  const century = (julianDay - J2000_JD) / 36_525;

  // Mean longitude and mean anomaly of the sun, degrees.
  const meanLongitude = wrap360(280.46646 + century * (36_000.76983 + century * 0.0003032));
  const meanAnomaly = 357.52911 + century * (35_999.05029 - 0.0001537 * century);
  const eccentricity = 0.016708634 - century * (0.000042037 + 0.0000001267 * century);

  // Equation of the centre: the correction from a circular orbit to the real one.
  const centre =
    Math.sin(meanAnomaly * DEG) * (1.914602 - century * (0.004817 + 0.000014 * century)) +
    Math.sin(2 * meanAnomaly * DEG) * (0.019993 - 0.000101 * century) +
    Math.sin(3 * meanAnomaly * DEG) * 0.000289;

  const trueLongitude = meanLongitude + centre;
  // Aberration and the leading nutation term, which together move the sun by up
  // to about 0.02 degrees.
  const apparentLongitude =
    trueLongitude - 0.00569 - 0.00478 * Math.sin((125.04 - 1_934.136 * century) * DEG);

  const meanObliquity =
    23 +
    (26 + (21.448 - century * (46.815 + century * (0.00059 - century * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos((125.04 - 1_934.136 * century) * DEG);

  const declination =
    Math.asin(Math.sin(obliquity * DEG) * Math.sin(apparentLongitude * DEG)) * RAD;

  // Equation of time, minutes. This is NOAA's closed form rather than a table.
  const varY = Math.tan((obliquity / 2) * DEG) ** 2;
  const equationOfTime =
    4 *
    RAD *
    (varY * Math.sin(2 * meanLongitude * DEG) -
      2 * eccentricity * Math.sin(meanAnomaly * DEG) +
      4 * eccentricity * varY * Math.sin(meanAnomaly * DEG) * Math.cos(2 * meanLongitude * DEG) -
      0.5 * varY * varY * Math.sin(4 * meanLongitude * DEG) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * DEG));

  // Minutes past midnight UTC. The observer's longitude is what turns that into
  // local apparent time, at four minutes a degree.
  const utcMinutes =
    instant.getUTCHours() * 60 +
    instant.getUTCMinutes() +
    instant.getUTCSeconds() / 60 +
    instant.getUTCMilliseconds() / 60_000;
  const trueSolarTime = mod(utcMinutes + equationOfTime + 4 * observer.longitude, 1_440);
  const hourAngle = trueSolarTime / 4 - 180;

  const latitudeRad = observer.latitude * DEG;
  const declinationRad = declination * DEG;
  const hourAngleRad = hourAngle * DEG;

  const cosZenith =
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
    Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const zenith = Math.acos(clamp(cosZenith, -1, 1)) * RAD;
  const geometricElevation = 90 - zenith;

  // Azimuth from the spherical law of cosines, then folded onto 0-360 by the
  // sign of the hour angle: before solar noon the sun is east of south.
  const sinZenith = Math.sin(zenith * DEG);
  let azimuth: number;
  if (Math.abs(sinZenith) < 1e-9) {
    // The sun is straight overhead, so azimuth is undefined. It never happens at
    // 35.66 N, and returning 180 is better than returning NaN into a light.
    azimuth = 180;
  } else {
    const cosAzimuth =
      (Math.sin(latitudeRad) * Math.cos(zenith * DEG) - Math.sin(declinationRad)) /
      (Math.cos(latitudeRad) * sinZenith);
    const base = Math.acos(clamp(cosAzimuth, -1, 1)) * RAD;
    azimuth = hourAngle > 0 ? wrap360(base + 180) : wrap360(540 - base);
  }

  return {
    azimuthDegrees: azimuth,
    elevationDegrees: geometricElevation + atmosphericRefractionDegrees(geometricElevation),
    geometricElevationDegrees: geometricElevation,
    declinationDegrees: declination,
    equationOfTimeMinutes: equationOfTime,
    hourAngleDegrees: hourAngle,
  };
}

/**
 * How much the atmosphere lifts the sun, degrees, from NOAA's piecewise fit.
 *
 * Zero above 85 degrees, about 0.0167 near 85, and 0.57 at the horizon. Below
 * about -0.575 degrees the fit is not meaningful and returns zero, which is the
 * right answer for a sun that is genuinely set.
 */
export function atmosphericRefractionDegrees(elevationDegrees: number): number {
  if (elevationDegrees > 85) return 0;
  const tan = Math.tan(elevationDegrees * DEG);
  if (elevationDegrees > 5) {
    return (58.1 / tan - 0.07 / tan ** 3 + 0.000086 / tan ** 5) / 3_600;
  }
  if (elevationDegrees > -0.575) {
    return (
      (1_735 +
        elevationDegrees *
          (-518.2 + elevationDegrees * (103.4 + elevationDegrees * (-12.79 + elevationDegrees * 0.711)))) /
      3_600
    );
  }
  return -20.772 / tan / 3_600;
}

export interface SunDirection {
  x: number;
  y: number;
  z: number;
}

/**
 * A unit vector from the scene towards the sun, in the world frame.
 *
 * +X east, +Z south, Y up. Points below the horizon when the sun is set, which is
 * what the dusk preset needs: the direction is still where the afterglow is.
 */
export function sunDirectionWorld(position: SolarPosition): SunDirection {
  const elevation = position.elevationDegrees * DEG;
  const azimuth = position.azimuthDegrees * DEG;
  const horizontal = Math.cos(elevation);
  return {
    x: horizontal * Math.sin(azimuth),
    y: Math.sin(elevation),
    // North is -Z in this frame, so a sun due north points at -Z.
    z: -horizontal * Math.cos(azimuth),
  };
}

/** Japan keeps UTC+9 all year and has had no summer time since 1951. */
export const JAPAN_UTC_OFFSET_HOURS = 9;

/**
 * An instant from a Japanese wall clock.
 *
 * Written out rather than parsed from a string with a `Z` on it, because a
 * mistake there is a nine-hour error in the sun's azimuth and every frame still
 * renders.
 */
export function tokyoInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - JAPAN_UTC_OFFSET_HOURS, minute));
}

function wrap360(degrees: number): number {
  return mod(degrees, 360);
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
