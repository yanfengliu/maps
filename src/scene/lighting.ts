/**
 * Lighting. Owned by Phase 5, which replaces this with a time-of-day sun and
 * sky and makes dusk the hero preset.
 *
 * A sun plus a hemisphere fill. It is deliberately plain: the point is to cast
 * real shadows so the placeholder blocks have depth from every angle the visual
 * sweep looks from, not to be a lighting model anyone keeps.
 */

import { AmbientLight, DirectionalLight, Group, HemisphereLight } from "three";

import { AOI_HALF_EXTENT_M } from "../world/frame.js";

/** Shadow map resolution. 2048 across a 1.4 km frustum is about 0.7 m a texel. */
const SHADOW_MAP_SIZE = 2048;

export function createLighting(): Group {
  const group = new Group();
  group.name = "lighting";

  // Mid-afternoon sun, high and to the south-west.
  const sun = new DirectionalLight(0xfff2e0, 2.6);
  sun.name = "lighting:sun";
  sun.position.set(-620, 900, 480);
  sun.castShadow = true;
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
  sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.6;
  group.add(sun);
  group.add(sun.target);

  const sky = new HemisphereLight(0xbcd2e6, 0x4a4640, 1.1);
  sky.name = "lighting:hemisphere";
  group.add(sky);

  // A little flat fill so the shadowed side of a tower is dark but not solid
  // black at this stage.
  const ambient = new AmbientLight(0xffffff, 0.25);
  ambient.name = "lighting:ambient";
  group.add(ambient);

  return group;
}
