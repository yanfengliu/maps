/**
 * Sky. Owned by Phase 5, which replaces this with a time-of-day model and makes
 * dusk the hero preset.
 *
 * This is a gradient on the inside of a large sphere. It is enough to keep the
 * horizon from being a hard edge against a flat clear colour, and enough for a
 * street-level frame to have something above the rooftops.
 */

import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from "three";

/** Radius of the sky dome in metres. Inside the camera's far plane, on purpose. */
const SKY_RADIUS_M = 6000;

export interface SkyColours {
  horizon: Color;
  zenith: Color;
}

export const DAYLIGHT_SKY: SkyColours = {
  horizon: new Color("#bcd2e6"),
  zenith: new Color("#4a7ec0"),
};

export function createSky(colours: SkyColours = DAYLIGHT_SKY): Mesh {
  const geometry = new SphereGeometry(SKY_RADIUS_M, 32, 16);
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    // The gradient is authored in sRGB, so it must not be tone mapped alongside
    // the lit scene or the horizon shifts when Phase 5 turns tone mapping on.
    toneMapped: false,
    fog: false,
    uniforms: {
      horizonColour: { value: colours.horizon.clone() },
      zenithColour: { value: colours.zenith.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDirection;
      void main() {
        vWorldDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 horizonColour;
      uniform vec3 zenithColour;
      varying vec3 vWorldDirection;
      void main() {
        // 0 at the horizon, 1 straight up. The curve keeps the band near the
        // horizon narrow instead of washing halfway up the dome.
        float height = clamp(vWorldDirection.y, 0.0, 1.0);
        float blend = pow(height, 0.55);
        gl_FragColor = vec4(mix(horizonColour, zenithColour, blend), 1.0);
      }
    `,
  });

  const sky = new Mesh(geometry, material);
  sky.name = "sky";
  // The dome surrounds the camera, so frustum culling would be wrong about it
  // exactly when it matters.
  sky.frustumCulled = false;
  return sky;
}
