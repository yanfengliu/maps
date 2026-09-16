/**
 * Sky. Plan item 19.
 *
 * A dome carrying an authored analytic sky: a vertical gradient, a lobe around
 * the surveyed-location sun direction, a horizon band and a sun disc. The
 * colours use `time-of-day.ts` and solar elevation, but are not measurements of
 * Shibuya's atmosphere or facade irradiance.
 *
 * **It writes scene-referred linear radiance, not sRGB.** That is the change from
 * Phase 3's version, which authored the gradient in display colours and opted out
 * of tone mapping so it would survive Phase 5 unchanged. It does not survive:
 * once the frame goes through ACES the sky has to be in the same space as
 * everything else or the horizon shifts against the buildings in front of it.
 *
 * `toneMapped` is therefore **true**, and three.js does the right thing with it in
 * both paths without being told which one is running: `WebGLPrograms` only applies
 * the renderer's tone mapping when the destination is the canvas, so the dome
 * writes raw radiance into the composer's buffer and into the environment map's
 * cube camera, and tone maps itself only in the fallback that draws straight to
 * the screen.
 *
 * The dome also supplies the environment map. Its chroma is graded separately
 * while retaining linear luminance: mostly neutral in daylight, with some sky
 * colour at dusk. Native comparisons isolated excess blue from this term. This
 * is authored appearance grading and does not recover the photographic albedo.
 */

import {
  BackSide,
  Color,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from "three";

import type { SkyParameters, TimeOfDayLighting } from "./time-of-day.js";

/**
 * Radius of the sky dome in metres, inside the camera's 8 km far plane.
 *
 * It also has to be inside the far plane of the cube camera the environment map
 * is baked with, which is why `bakeEnvironment` states one rather than taking
 * `PMREMGenerator`'s default of 100 m — a default that renders an empty cubemap
 * here and produces a scene lit by nothing at all.
 */
const SKY_RADIUS_M = 6000;

export interface Sky {
  mesh: Mesh;
  /** Point the dome at a new time of day. Cheap: it writes uniforms. */
  apply(lighting: TimeOfDayLighting): void;
}

export function createSky(lighting: TimeOfDayLighting): Sky {
  const geometry = new SphereGeometry(SKY_RADIUS_M, 48, 24);
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    toneMapped: true,
    fog: false,
    uniforms: {
      zenithColour: { value: new Color() },
      horizonColour: { value: new Color() },
      glowColour: { value: new Color() },
      groundColour: { value: new Color() },
      discColour: { value: new Color() },
      sunDirection: { value: new Vector3(0, 1, 0) },
      glowExponent: { value: 8 },
      horizonExponent: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDirection;
      void main() {
        vWorldDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 zenithColour;
      uniform vec3 horizonColour;
      uniform vec3 glowColour;
      uniform vec3 groundColour;
      uniform vec3 discColour;
      uniform vec3 sunDirection;
      uniform float glowExponent;
      uniform float horizonExponent;
      varying vec3 vWorldDirection;

      void main() {
        vec3 direction = normalize(vWorldDirection);
        float up = direction.y;

        // Horizon to zenith. The exponent keeps the pale band near the horizon
        // instead of washing halfway up the dome.
        vec3 radiance = mix(horizonColour, zenithColour, pow(clamp(up, 0.0, 1.0), horizonExponent));
        // Below the horizon the dome is not sky. It stands in for haze and for
        // whatever the ground is bouncing, and it exists so a street-level frame
        // looking slightly down past a rooftop does not see a hard edge.
        radiance = mix(radiance, groundColour, clamp(-up * 6.0, 0.0, 1.0));

        // Forward scattering about the sun. Tight when the sun is high, wide and
        // orange when it is on the horizon.
        float towardsSun = clamp(dot(direction, sunDirection), 0.0, 1.0);
        radiance += glowColour * pow(towardsSun, glowExponent);

        // The band that reads as sunset once the sun itself has gone: aligned
        // with the sun's azimuth, hugging the horizon, indifferent to whether the
        // sun is above it.
        vec2 horizontal = normalize(vec2(direction.x, direction.z) + vec2(1e-6));
        vec2 sunHorizontal = normalize(vec2(sunDirection.x, sunDirection.z) + vec2(1e-6));
        float azimuthAlign = clamp(dot(horizontal, sunHorizontal), 0.0, 1.0);
        radiance += glowColour * pow(azimuthAlign, 3.0) * exp(-abs(up) * 7.0) * 0.55;

        // The sun's disc, 0.53 degrees across.
        radiance += discColour * smoothstep(0.999975, 0.999995, towardsSun);

        gl_FragColor = vec4(radiance, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new Mesh(geometry, material);
  mesh.name = "sky";
  // The dome surrounds the camera, so frustum culling would be wrong about it
  // exactly when it matters.
  mesh.frustumCulled = false;
  // Drawn first, so the depth buffer is not fighting a 6 km sphere.
  mesh.renderOrder = -1000;

  const apply = (next: TimeOfDayLighting): void => {
    writeUniforms(material, next.sky, next.sunDirection, next.sunColour);
  };
  apply(lighting);

  return { mesh, apply };
}

function writeUniforms(
  material: ShaderMaterial,
  sky: SkyParameters,
  sunDirection: Vector3,
  sunColour: Color,
): void {
  (material.uniforms.zenithColour!.value as Color).copy(sky.zenith);
  (material.uniforms.horizonColour!.value as Color).copy(sky.horizon);
  (material.uniforms.glowColour!.value as Color).copy(sky.glow);
  (material.uniforms.groundColour!.value as Color).copy(sky.ground);
  (material.uniforms.discColour!.value as Color).copy(sunColour).multiplyScalar(sky.discRadiance);
  (material.uniforms.sunDirection!.value as Vector3).copy(sunDirection).normalize();
  material.uniforms.glowExponent!.value = sky.glowExponent;
  material.uniforms.horizonExponent!.value = sky.horizonExponent;
}

/**
 * Bake the dome into a prefiltered environment map.
 *
 * `PMREMGenerator.fromScene` renders the scene it is given from the origin with a
 * cube camera and prefilters the result for roughness. Two arguments have to be
 * stated rather than defaulted: the far plane, because the default of 100 m is
 * well inside a 6 km dome and produces an empty map, and the near plane for the
 * same reason at the other end.
 *
 * The dome is rendered on its own rather than with the city in it. Including the
 * buildings would give better bounce and would also bake whatever tiles happened
 * to be loaded at that moment into every reflective surface for the rest of the
 * session.
 */
export function bakeEnvironment(renderer: WebGLRenderer, sky: Sky): WebGLRenderTarget {
  const generator = new PMREMGenerator(renderer);
  const scene = new Scene();
  const dome = sky.mesh.clone();
  const environmentMaterial = (sky.mesh.material as ShaderMaterial).clone();
  const direction = environmentMaterial.uniforms.sunDirection!.value as Vector3;
  const elevation = Math.asin(Math.max(-1, Math.min(1, direction.y))) * 180 / Math.PI;
  const retention = environmentChromaRetention(elevation);
  environmentMaterial.uniforms.environmentChromaRetention = { value: retention };
  environmentMaterial.fragmentShader = 'uniform float environmentChromaRetention;\n' + environmentMaterial.fragmentShader.replace(
    'gl_FragColor = vec4(radiance, 1.0);',
    'gl_FragColor = vec4(mix(vec3(dot(radiance, vec3(0.2126, 0.7152, 0.0722))), radiance, environmentChromaRetention), 1.0);',
  );
  dome.material = environmentMaterial;
  scene.add(dome);
  try {
    return generator.fromScene(scene, 0, 1, SKY_RADIUS_M * 2);
  } finally {
    generator.dispose();
    // Geometry remains shared with the visible sky; only the separate bake
    // material is disposed here.
    scene.remove(dome);
    environmentMaterial.dispose();
  }
}

/** Authored environment grading, not inferred physical albedo. */
export function environmentChromaRetention(elevationDegrees: number): number {
  if (!Number.isFinite(elevationDegrees)) throw new Error('Environment grading needs a finite solar elevation.');
  const t = Math.max(0, Math.min(1, (elevationDegrees + 3) / 13));
  return .45 - .35 * t * t * (3 - 2 * t);
}
