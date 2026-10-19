import { Box3, Mesh, Raycaster, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BuildingWalkCollision } from "../scene/buildings.js";
import { AOI_CORNERS_WORLD } from "../world/aoi.js";

export const WALK_EYE_HEIGHT_M = 1.7;
const WALK_SPEED_MPS = 1.4;
const BODY_RADIUS_M = 0.28;
const MAX_STEP_M = 0.35;
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]);

export interface WalkGround {
  heightAt(x: number, z: number, previousY?: number): number | undefined;
  blocked(from: Vector3, to: Vector3): boolean;
}

/** Street support and short body sweeps use the same native geometry that draws.
 * This is a walking boundary, not collision against actors or street furniture. */
export function createWalkGround(options: {
  terrainAt(x: number, z: number): number | undefined;
  streetAt(x: number, z: number): number | undefined;
  buildings: BuildingWalkCollision;
}): WalkGround {
  const ray = new Raycaster();
  const origin = new Vector3(), direction = new Vector3(), sweep = new Box3();
  let revision = Number.NaN;
  let meshes: { mesh: Mesh; bounds: Box3 }[] = [];
  const refresh = (): void => {
    const next = options.buildings.revision;
    if (next === revision) return;
    revision = next;
    meshes = [];
    options.buildings.forEachModel(model => {
      // PLATEAU model root transforms are already in the local world frame.
      // Retained off-view models may be detached, so update them explicitly.
      model.updateWorldMatrix(true, true);
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        if (object.geometry.boundingBox) meshes.push({ mesh: object, bounds: object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld) });
      });
    });
  };
  return {
    heightAt(x, z, previousY) {
      // The projected geographic quadrilateral, inset by the body radius.
      for (let i = 0; i < AOI_CORNERS_WORLD.length; i++) {
        const a = AOI_CORNERS_WORLD[i]!, b = AOI_CORNERS_WORLD[(i + 1) % AOI_CORNERS_WORLD.length]!;
        const dx = b[0] - a[0], dz = b[1] - a[1];
        if ((dx * (z - a[1]) - dz * (x - a[0])) / Math.hypot(dx, dz) < BODY_RADIUS_M) return undefined;
      }
      const terrain = options.terrainAt(x, z), street = options.streetAt(x, z);
      if (terrain === undefined || street === undefined || !Number.isFinite(terrain) || !Number.isFinite(street)) return undefined;
      const support = Math.max(terrain, street);
      // A highest-surface sampler must not lift a walker onto a road bridge.
      if (Math.abs(street - terrain) > 1 || (previousY !== undefined && Math.abs(support - previousY) > MAX_STEP_M)) return undefined;
      return support;
    },
    blocked(from, to) {
      refresh();
      sweep.setFromPoints([from, to]);
      sweep.min.add(new Vector3(-BODY_RADIUS_M, 0.2, -BODY_RADIUS_M));
      sweep.max.add(new Vector3(BODY_RADIUS_M, WALK_EYE_HEIGHT_M, BODY_RADIUS_M));
      const nearby = meshes.filter(item => item.bounds.intersectsBox(sweep)).map(item => item.mesh);
      if (!nearby.length) return false;
      direction.set(to.x - from.x, 0, to.z - from.z);
      const distance = direction.length();
      // Check the body radius in four directions even when initially stationary.
      const angles = distance > 0 ? [Math.atan2(direction.x, direction.z), 0, Math.PI / 2, Math.PI, -Math.PI / 2] : [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      for (const height of [0.35, 1, 1.6]) for (let i = 0; i < angles.length; i++) {
        const angle = angles[i]!;
        origin.set(i === 0 && distance > 0 ? from.x : to.x, Math.max(from.y, to.y) + height, i === 0 && distance > 0 ? from.z : to.z);
        direction.set(Math.sin(angle), 0, Math.cos(angle));
        ray.set(origin, direction); ray.near = 0; ray.far = BODY_RADIUS_M + (i === 0 ? distance : 0);
        if (ray.intersectObjects(nearby, false).length) return true;
      }
      return false;
    },
  };
}

export interface FirstPersonStatus { active: boolean; yaw: number; pitch: number; eyeHeightM: number; supportY: number | null }
export interface FirstPersonWalk {
  readonly active: boolean;
  status(): FirstPersonStatus;
  update(delta: number): void;
  dispose(): void;
}

/** Owns the camera only between the user's Start walking and Overview actions. */
export function createFirstPersonWalk(options: {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  ground: WalkGround;
  ready(): boolean;
  invalidate(): void;
}): FirstPersonWalk {
  const { canvas, camera, controls, ground } = options;
  const document = canvas.ownerDocument, view = document.defaultView!;
  const panel = document.createElement("div"); panel.id = "first-person-walk";
  Object.assign(panel.style, { position: "fixed", left: "16px", top: "70px", zIndex: "30", maxWidth: "min(430px, calc(100vw - 32px))", font: "14px/1.4 system-ui", color: "#fff" });
  const button = document.createElement("button"); button.type = "button"; button.id = "walk-toggle"; button.textContent = "Start walking"; button.disabled = true;
  Object.assign(button.style, { minHeight: "44px", padding: "10px 16px", cursor: "pointer" });
  const help = document.createElement("div"); help.id = "walk-help"; help.hidden = true; help.textContent = "WASD or arrows to walk · Drag to look · Esc for overview";
  Object.assign(help.style, { marginTop: "8px", padding: "8px 10px", borderRadius: "6px", background: "#17202be8" });
  help.setAttribute("role", "status"); button.setAttribute("aria-describedby", help.id);
  panel.append(button, help); document.body.append(panel);
  const held = new Set<string>(), feet = new Vector3(), candidate = new Vector3();
  let active = false, disposed = false, yaw = -Math.PI / 4, pitch = 0;
  let pointer: { id: number; x: number; y: number } | null = null;
  let overview: { position: Vector3; target: Vector3; near: number; enabled: boolean } | null = null;
  const focusAllowsWalk = (): boolean => document.activeElement === canvas;
  const releasePointer = (): void => {
    const id = pointer?.id; pointer = null;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  const clear = (): void => { held.clear(); releasePointer(); };
  const pose = (): void => {
    camera.position.set(feet.x, feet.y + WALK_EYE_HEIGHT_M, feet.z);
    camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.updateMatrixWorld();
  };
  const exit = (): void => {
    if (!active || !overview) return;
    clear(); active = false;
    camera.position.copy(overview.position); controls.target.copy(overview.target);
    camera.near = overview.near; camera.updateProjectionMatrix();
    controls.enabled = overview.enabled;
    controls.update(0); camera.updateMatrixWorld();
    overview = null; button.textContent = "Start walking"; help.hidden = true; options.invalidate();
  };
  const enter = (): void => {
    if (disposed || !options.ready() || active) return;
    // The crossing is the world origin. Refuse entry if its actual support or
    // surrounding native frontage is unavailable rather than inventing a floor.
    const y = ground.heightAt(0, 0);
    if (y === undefined || ground.blocked(candidate.set(0, y, 0), candidate)) {
      help.hidden = false; help.textContent = "The crossing has no clear street support. Restore the reviewed scene data before walking."; return;
    }
    const enabled = controls.enabled, damping = controls.enableDamping;
    controls.enabled = false; controls.enableDamping = false; controls.update(0); controls.enableDamping = damping;
    overview = { position: camera.position.clone(), target: controls.target.clone(), near: camera.near, enabled };
    feet.set(0, y, 0); yaw = -Math.PI / 4; pitch = 0;
    active = true; camera.near = 0.08; camera.updateProjectionMatrix(); pose();
    button.textContent = "Overview"; help.hidden = false; help.textContent = "WASD or arrows to walk · Drag to look · Esc for overview";
    canvas.focus({ preventScroll: true }); options.invalidate();
  };
  const toggle = (): void => { if (active) exit(); else enter(); };
  const keydown = (event: KeyboardEvent): void => {
    if (!active) return;
    if (event.code === "Escape") { event.preventDefault(); exit(); return; }
    if (!MOVE_KEYS.has(event.code) || event.defaultPrevented) return;
    if (!focusAllowsWalk() || document.hidden || event.altKey || event.ctrlKey || event.metaKey) { clear(); return; }
    held.add(event.code); event.preventDefault();
  };
  const keyup = (event: KeyboardEvent): void => { if (held.delete(event.code)) event.preventDefault(); };
  const focus = (): void => { if (!focusAllowsWalk()) clear(); };
  const visibility = (): void => { if (document.hidden) clear(); };
  const down = (event: PointerEvent): void => {
    if (!active || pointer || (event.button !== 0 && event.button !== 1)) return;
    canvas.focus({ preventScroll: true }); pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId); event.preventDefault();
  };
  const move = (event: PointerEvent): void => {
    if (!active || pointer?.id !== event.pointerId) return;
    yaw -= (event.clientX - pointer.x) * 0.003;
    pitch = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, pitch - (event.clientY - pointer.y) * 0.003));
    pointer.x = event.clientX; pointer.y = event.clientY; pose(); event.preventDefault();
  };
  const up = (event: PointerEvent): void => { if (pointer?.id === event.pointerId) releasePointer(); };
  button.addEventListener("click", toggle);
  view.addEventListener("keydown", keydown); view.addEventListener("keyup", keyup); view.addEventListener("blur", clear);
  document.addEventListener("focusin", focus); document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("lostpointercapture", up);
  return {
    get active() { return active; },
    status: () => ({ active, yaw, pitch, eyeHeightM: WALK_EYE_HEIGHT_M, supportY: active ? feet.y : null }),
    update(delta) {
      if (disposed) return;
      button.disabled = !active && !options.ready();
      if (!active) return;
      if (!options.ready() || !focusAllowsWalk() || document.hidden) { clear(); return; }
      if (!Number.isFinite(delta) || delta <= 0) return;
      const forward = Number(held.has("KeyW") || held.has("ArrowUp")) - Number(held.has("KeyS") || held.has("ArrowDown"));
      const right = Number(held.has("KeyD") || held.has("ArrowRight")) - Number(held.has("KeyA") || held.has("ArrowLeft"));
      const length = Math.hypot(forward, right);
      if (!length) return;
      const distance = WALK_SPEED_MPS * Math.min(delta, 0.1), steps = Math.ceil(distance / 0.12);
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * distance / length / steps;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * distance / length / steps;
      for (let i = 0; i < steps; i++) {
        const x = feet.x + dx, z = feet.z + dz, y = ground.heightAt(x, z, feet.y);
        if (y === undefined) break;
        candidate.set(x, y, z);
        if (ground.blocked(feet, candidate)) break;
        feet.copy(candidate);
      }
      pose();
    },
    dispose() {
      if (disposed) return;
      exit(); clear(); disposed = true;
      button.removeEventListener("click", toggle);
      view.removeEventListener("keydown", keydown); view.removeEventListener("keyup", keyup); view.removeEventListener("blur", clear);
      document.removeEventListener("focusin", focus); document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("lostpointercapture", up);
      panel.remove();
    },
  };
}
