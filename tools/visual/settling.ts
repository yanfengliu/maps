/**
 * harness: OrbitDriver. A quiet interval needs two coherent observations from
 * different rendered frames. Polls of one frame are not stability evidence.
 *
 * The strict baseline is only for dropdown preservation checks. With the pinned
 * 0.08 OrbitControls damping and no input, an 80 micrometre one-frame path bound
 * leaves at most 0.92 mm of angular/pan travel. This is not a general camera
 * theorem; the post-switch 5 mm assertions remain independent measurements.
 */
import type { CameraSnapshot, RenderStatus } from "../../src/harness/bridge.js";

export interface CameraObservation {
  epoch: number;
  status: RenderStatus;
  camera: CameraSnapshot;
}

export type SettleMode = "capture" | "preservation";

export function shortestAngle(radians: number): number {
  const wrapped = ((radians % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI);
  return wrapped - Math.PI;
}

const vectorDistance = (a: CameraSnapshot["position"], b: CameraSnapshot["position"]): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function cameraMovement(a: CameraSnapshot, b: CameraSnapshot) {
  const positionM = vectorDistance(a.position, b.position);
  const targetM = vectorDistance(a.target, b.target);
  const radiusM = Math.abs(a.distance - b.distance);
  const azimuth = Math.abs(shortestAngle(b.azimuth - a.azimuth));
  const polar = Math.abs(b.polar - a.polar);
  const radius = Math.max(a.distance, b.distance);
  return {
    worldM: targetM + radiusM + radius * (azimuth + polar),
    positionM,
    targetM,
    normalized: Math.max(azimuth, polar, radiusM / Math.max(radius, 1),
      positionM / Math.max(radius, 1), targetM / Math.max(radius, 1)),
  };
}

function validate(observation: CameraObservation): void {
  const { epoch, status, camera } = observation;
  if (status.contextLost) throw new Error("The WebGL context was lost while waiting for the camera to settle.");
  if (status.error !== null) throw new Error(`The renderer failed while waiting for the camera: ${status.error}`);
  if (!Number.isFinite(epoch) || !Number.isSafeInteger(status.frameCount) || status.frameCount < 0 ||
    ![camera.distance, camera.azimuth, camera.polar, ...Object.values(camera.position),
      ...Object.values(camera.target)].every(Number.isFinite) || camera.distance <= 0) {
    throw new Error("The camera observation contains an invalid frame, epoch or pose; inspect the read-only harness before capturing.");
  }
}

export class CameraSettling {
  private previous: CameraObservation;
  private readonly firstFrame: number;
  private quietIntervals = 0;

  constructor(initial: CameraObservation, private readonly mode: SettleMode) {
    validate(initial);
    this.previous = initial;
    this.firstFrame = initial.status.frameCount;
  }

  observe(current: CameraObservation) {
    validate(current);
    if (current.epoch !== this.previous.epoch) throw new Error("The document was replaced while waiting for the camera to settle.");
    if (current.status.frameCount < this.previous.status.frameCount) throw new Error("The render frame counter decreased while waiting for the camera to settle.");
    const movement = cameraMovement(this.previous.camera, current.camera);
    const fresh = current.status.frameCount > this.previous.status.frameCount;
    if (fresh) {
      const quiet = this.mode === "preservation"
        ? Math.max(movement.worldM, movement.positionM, movement.targetM) <= 0.00008
        : movement.normalized < 0.0002;
      this.quietIntervals = quiet ? this.quietIntervals + 1 : 0;
    } else if (movement.worldM !== 0 || movement.positionM !== 0 || movement.targetM !== 0) {
      this.quietIntervals = 0;
    }
    this.previous = current;
    const advancedFrames = current.status.frameCount - this.firstFrame;
    return {
      ...movement, fresh, advancedFrames, quietIntervals: this.quietIntervals,
      done: fresh && this.quietIntervals >= 3 && advancedFrames >= 12,
    };
  }
}
