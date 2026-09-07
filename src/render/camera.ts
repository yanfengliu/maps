import { PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { AOI_HALF_EXTENT_M } from "../world/frame.js";

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
    // A 0.5 m near plane keeps street level usable; 8 km of far plane covers the
    // whole area of interest plus the sky dome around it.
    0.5,
    8000,
  );

  // The starting pose is set here, once, before the controls exist. After this
  // line the controls own the camera.
  const sinPolar = Math.sin(INITIAL_VIEW.polar);
  camera.position.set(
    INITIAL_VIEW.distance * sinPolar * Math.sin(INITIAL_VIEW.azimuth),
    INITIAL_VIEW.distance * Math.cos(INITIAL_VIEW.polar),
    INITIAL_VIEW.distance * sinPolar * Math.cos(INITIAL_VIEW.azimuth),
  );

  const controls = new OrbitControls(camera, canvas);
  // The target is the crossing, which is the world origin.
  controls.target.set(0, 0, 0);
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
