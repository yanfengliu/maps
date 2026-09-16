/**
 * Lighting. Plan item 19.
 *
 * One key light standing in for the sun, one hemisphere fill standing in for the
 * rest of the sky, and — the part that does most of the work — the sky dome baked
 * into an environment map, which `app.ts` hangs on the scene. Every number comes
 * from `time-of-day.ts`.
 *
 * Two decisions here are worth knowing before changing anything.
 *
 * **The key light is not always the sun.** Below the horizon there is no direct
 * beam at all, and a directional light that keeps casting from under the ground
 * lights every building from beneath. What replaces it is a weak light from the
 * sun's own azimuth, held a few degrees above the horizon: it stands in for the
 * bright patch of western sky that is the brightest thing in a twilight scene.
 * `TimeOfDayLighting.sunIsTwilightStandIn` says when that has happened.
 *
 * **Shadows switch off at dusk, on purpose.** A directional shadow from a sun 4
 * degrees up is fourteen times the height of whatever casts it, which does not
 * fit the shadow frustum and does not look like anything real; at civil twilight
 * the sky is a hemisphere-sized source and there is no sharp shadow to cast. What
 * separates a wall from the ground in those frames is the ambient occlusion in
 * the post chain, which is item 20's job and is why the two items were built
 * together.
 */

import { Color, DirectionalLight, Group, HemisphereLight, Vector3 } from "three";

import { AOI_HALF_EXTENT_M } from "../world/frame.js";
import { GROUND_AT_ORIGIN_M } from "../world/scene-data.js";
import type { TimeOfDayLighting } from "./time-of-day.js";

/** Shadow map resolution. 2048 across a 1.4 km frustum is about 0.7 m a texel. */
const SHADOW_MAP_SIZE = 2048;

/** How far along its own direction the key light is placed, metres. */
const KEY_LIGHT_DISTANCE_M = 1400;

/**
 * Below this solar elevation, in degrees, the key light stops casting shadows.
 *
 * At 8 degrees a shadow already runs seven times the height of what casts it,
 * which is 1.2 km for Scramble Square and past the edge of the shadow frustum.
 * Lower than that the map resolves nothing and the result is a stripe of acne
 * across the whole area of interest.
 */
const SHADOW_ELEVATION_FLOOR_DEGREES = 8;

/**
 * The lowest the key light is ever placed, in degrees above the horizon.
 *
 * Only reached when the sun itself is below the horizon and the light has become
 * the twilight stand-in described at the top of this file.
 */
const KEY_LIGHT_ELEVATION_FLOOR_DEGREES = 6;

export interface Lighting {
  root: Group;
  apply(lighting: TimeOfDayLighting): void;
  /** What the key light is doing right now, for the harness and the log line. */
  state(): LightingState;
}

export interface LightingState {
  sunAzimuthDegrees: number;
  sunElevationDegrees: number;
  keyElevationDegrees: number;
  keyIntensity: number;
  keyColour: [number, number, number];
  shadowsEnabled: boolean;
  twilightStandIn: boolean;
  hemisphereIntensity: number;
}

export function createLighting(initial: TimeOfDayLighting): Lighting {
  const group = new Group();
  group.name = "lighting";

  const sun = new DirectionalLight(0xffffff, 1);
  sun.name = "lighting:sun";
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);

  // The shadow camera covers the area of interest and no more. Widening it to
  // the whole ground plane would spend the same texels over twice the area and
  // halve the shadow resolution where anyone is looking.
  const reach = AOI_HALF_EXTENT_M * 1.4;
  sun.shadow.camera.left = -reach;
  sun.shadow.camera.right = reach;
  sun.shadow.camera.top = reach;
  sun.shadow.camera.bottom = -reach;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 2 * KEY_LIGHT_DISTANCE_M + 400;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  sun.target.position.set(0, GROUND_AT_ORIGIN_M, 0);
  group.add(sun);
  group.add(sun.target);

  const hemisphere = new HemisphereLight(0xffffff, 0xffffff, 1);
  hemisphere.name = "lighting:hemisphere";
  group.add(hemisphere);

  let state: LightingState = {
    sunAzimuthDegrees: 0,
    sunElevationDegrees: 0,
    keyElevationDegrees: 0,
    keyIntensity: 0,
    keyColour: [0, 0, 0],
    shadowsEnabled: false,
    twilightStandIn: false,
    hemisphereIntensity: 0,
  };

  const apply = (lighting: TimeOfDayLighting): void => {
    const elevation = lighting.solar.elevationDegrees;
    const keyElevation = Math.max(elevation, KEY_LIGHT_ELEVATION_FLOOR_DEGREES);
    const direction = keyDirection(lighting.sunDirection, keyElevation);

    sun.position
      .copy(direction)
      .multiplyScalar(KEY_LIGHT_DISTANCE_M)
      .add(new Vector3(0, GROUND_AT_ORIGIN_M, 0));
    sun.color.copy(lighting.sunColour);
    sun.intensity = lighting.sunIntensity;
    sun.castShadow = elevation >= SHADOW_ELEVATION_FLOOR_DEGREES;
    sun.shadow.camera.updateProjectionMatrix();

    hemisphere.color.copy(lighting.hemisphereSky);
    hemisphere.groundColor.copy(lighting.hemisphereGround);
    hemisphere.intensity = lighting.hemisphereIntensity;

    state = {
      sunAzimuthDegrees: round(lighting.solar.azimuthDegrees, 2),
      sunElevationDegrees: round(elevation, 2),
      keyElevationDegrees: round(keyElevation, 2),
      keyIntensity: round(sun.intensity, 3),
      keyColour: channels(sun.color),
      shadowsEnabled: sun.castShadow,
      twilightStandIn: lighting.sunIsTwilightStandIn,
      hemisphereIntensity: round(hemisphere.intensity, 3),
    };
  };
  apply(initial);

  return { root: group, apply, state: () => state };
}

/**
 * The direction the key light comes from, with its elevation held at a floor.
 *
 * The azimuth is kept exactly — that is the part the viewer checks against where
 * the shadows fall — and only the elevation is lifted.
 */
function keyDirection(sunDirection: Vector3, elevationDegrees: number): Vector3 {
  const horizontal = Math.hypot(sunDirection.x, sunDirection.z);
  if (horizontal < 1e-6) return sunDirection.clone().normalize();
  const elevation = (elevationDegrees * Math.PI) / 180;
  const scale = Math.cos(elevation) / horizontal;
  return new Vector3(sunDirection.x * scale, Math.sin(elevation), sunDirection.z * scale).normalize();
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function channels(colour: Color): [number, number, number] {
  return [round(colour.r, 4), round(colour.g, 4), round(colour.b, 4)];
}
