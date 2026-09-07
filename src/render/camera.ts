import { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { AOI_HALF_EXTENT_M } from "../world/frame.js";
import { GROUND_AT_ORIGIN_M } from "../world/scene-data.js";

/**
 * The camera and the controls the user actually drives.
 *
 * Everything that moves this camera goes through `OrbitControls`. Nothing else
 * in the app writes `camera.position`, and neither does the visual harness — it
 * synthesises pointer and wheel events on the canvas, the same input path a
 * person uses. A harness that assigns the pose instead skips that path entirely
 * and is blind to every defect living in it.
 */
export interface CameraRig {
  camera: PerspectiveCamera;
  controls: OrbitControls;
}

/** Where the camera starts: a low three-quarter view over the crossing. */
export const INITIAL_VIEW = Object.freeze({
  /** Metres from the target. */
  distance: 620,
  /** Radians clockwise from north, matching OrbitControls' azimuthal angle. */
  azimuth: Math.PI * 0.25,
  /** Radians down from straight up, matching OrbitControls' polar angle. */
  polar: Math.PI * 0.34,
});

export function createCameraRig(canvas: HTMLCanvasElement): CameraRig {
  const camera = new PerspectiveCamera(
    55,
    canvas.clientWidth / Math.max(canvas.clientHeight, 1),
    // 1 m of near plane and 8 km of far. The far plane covers the area of
    // interest plus the sky dome around it; the near plane was 0.5 m and was
    // raised when the road surface arrived. Depth resolution goes as the square
    // of the distance over the near plane, so at the 950 m the overhead sweep
    // sits at, 0.5 m of near resolved about 11 cm and the road surface — which
    // is a coplanar sheet 20 cm above the ground — flickered against the terrain.
    // At 1 m it resolves about 5 cm. `minDistance` is 25 m, so nothing is ever
    // close enough for 1 m of near plane to clip.
    1,
    8000,
  );

  // The starting pose is set here, once, before the controls exist. After this
  // line the controls own the camera.
  //
  // The target is the crossing at ground level, not at y = 0. Scene Y is metres
  // above Tokyo Bay mean sea level and the ground at the crossing is 15.2 m, so
  // a target at zero would put the street-level sweep — 11.6 m above its target —
  // nearly four metres underground, looking up at the inside of the terrain.
  const sinPolar = Math.sin(INITIAL_VIEW.polar);
  camera.position.set(
    INITIAL_VIEW.distance * sinPolar * Math.sin(INITIAL_VIEW.azimuth),
    GROUND_AT_ORIGIN_M + INITIAL_VIEW.distance * Math.cos(INITIAL_VIEW.polar),
    INITIAL_VIEW.distance * sinPolar * Math.cos(INITIAL_VIEW.azimuth),
  );

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, GROUND_AT_ORIGIN_M, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 25;
  controls.maxDistance = AOI_HALF_EXTENT_M * 4;
  // Stop just short of the horizon so the camera cannot end up underground.
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.screenSpacePanning = false;
  controls.update();

  return { camera, controls };
}
