import { BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Shape, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RenderLoop } from "../render/loop.js";
import type { MeshData } from "../world/mesh.js";
import type { WorldStyle } from "../world/styles.js";
import { clipCityRoot } from "./aoi-cutout.js";
import { createTrainPath, type TrainSource, TRAIN_TRACK } from "./train-path.js";
import { createTrainSchedule, TRAIN_CAR_COUNT, TRAIN_CAR_LENGTH, TRAIN_CAR_PITCH } from "./train-schedule.js";

const WHEEL_RADIUS = 0.43, BOGIE_OFFSET = 6.8, AXLE_OFFSET = 1.05;
const up = new Vector3(0, 1, 0);
export interface TrainStatus {
  track: number; simulatedSeconds: number; station: number; speed: number; direction: 1 | -1; dwelling: boolean;
  cars: { centre: number[]; front: number[]; rear: number[] }[];
  wheels: { x: number; y: number; z: number; railY: number; supported: boolean }[];
}
export interface RailTrains { root: Group; moving(): boolean; status(): TrainStatus; setStyle(style: WorldStyle): void; dispose(): void }

/** One representative four-car commuter train. Dimensions, northern turnback and
 * timing are authored presentation, not a claim about the actual service. */
export function createRailTrains(source: TrainSource, rails: MeshData, loop: RenderLoop, style: WorldStyle, ready: () => boolean): RailTrains {
  const path = createTrainPath(source, rails);
  const schedule = createTrainSchedule(path.stationAtZ(-625), path.stationAtZ(-215));
  const phase = schedule.initialPhase(path.stationAtZ(-385), 1);
  const root = new Group(); root.name = "rail:representative-four-car-train";
  const materials = {
    silver: new MeshStandardMaterial({ color: 0xb9c0c2, roughness: 0.36, metalness: 0.65 }),
    roof: new MeshStandardMaterial({ color: 0xb4b9b8, roughness: 0.72, metalness: 0.25 }),
    band: new MeshStandardMaterial({ color: 0x75b733, roughness: 0.48, metalness: 0.2 }),
    glass: new MeshStandardMaterial({ color: 0x182d37, roughness: 0.19, metalness: 0.5, emissive: 0x253d37, emissiveIntensity: 0.2 }),
    dark: new MeshStandardMaterial({ color: 0x252c30, roughness: 0.72, metalness: 0.3 }),
    wheel: new MeshStandardMaterial({ color: 0x333b3e, roughness: 0.3, metalness: 0.8 }),
    head: new MeshStandardMaterial({ color: 0xfff2c5, emissive: 0xffe3a0, emissiveIntensity: 1.4, roughness: 0.35 }),
    tail: new MeshStandardMaterial({ color: 0x8c1514, emissive: 0xff1d12, emissiveIntensity: 1.2, roughness: 0.4 }),
  };
  type Finish = keyof typeof materials;
  const resources = new Set<BufferGeometry>();
  const finishParts = new Map<Finish, BufferGeometry[]>();
  const box = (finish: Finish, x: number, y: number, z: number, w: number, h: number, l: number): void => {
    const g = new BoxGeometry(w, h, l).translate(x, y, z), list = finishParts.get(finish) ?? [];
    list.push(g); finishParts.set(finish, list);
  };
  // True panel openings, recessed glazing, and paired sliding doors. Units are metres.
  box("dark", 0, 2.1, 0, 2.77, 2.0, TRAIN_CAR_LENGTH - 0.2);
  box("silver", 0, 1.14, 0, 2.9, 0.35, TRAIN_CAR_LENGTH);
  for (const side of [-1, 1]) {
    const x = side * 1.45;
    box("silver", x, 1.5, 0, 0.06, 0.42, TRAIN_CAR_LENGTH);
    box("band", x + side * 0.035, 1.81, 0, 0.025, 0.22, TRAIN_CAR_LENGTH - 0.06);
    box("silver", x, 3.15, 0, 0.06, 0.38, TRAIN_CAR_LENGTH);
    for (const z of [-7.25, -2.42, 2.42, 7.25]) {
      box("dark", x, 2.31, z, 0.07, 2.02, 1.42);
      for (const half of [-1, 1]) {
        box("silver", x + side * 0.012, 2.31, z + half * 0.355, 0.065, 1.94, 0.69);
        box("glass", x + side * 0.05, 2.56, z + half * 0.355, 0.018, 0.88, 0.46);
      }
    }
    for (const [z, width] of [[-9.2, 0.7], [-4.84, 2.65], [0, 2.65], [4.84, 2.65], [9.2, 0.7]]) {
      box("glass", x - side * 0.025, 2.45, z!, 0.035, 1.03, width!);
      for (const edge of [-1, 1]) box("silver", x, 2.45, z! + edge * (width! / 2 + 0.055), 0.06, 1.09, 0.11);
      if (width! > 1) box("silver", x, 2.45, z!, 0.06, 1.09, 0.07);
    }
  }
  for (const end of [-1, 1]) {
    box("silver", 0, 2.18, end * 9.72, 2.9, 2.08, 0.16);
    box("band", 0, 1.81, end * 9.81, 2.86, 0.22, 0.025);
    box("glass", 0, 2.58, end * 9.817, 2.4, 0.92, 0.025);
    box("dark", 0, 0.72, end * 8.6, 1.8, 0.24, 0.7);
  }
  const roofShape = new Shape();
  roofShape.moveTo(-1.45, 3.32); roofShape.lineTo(-1.27, 3.57); roofShape.lineTo(-0.85, 3.7);
  roofShape.lineTo(0.85, 3.7); roofShape.lineTo(1.27, 3.57); roofShape.lineTo(1.45, 3.32); roofShape.closePath();
  const roofGeometry = new ExtrudeGeometry(roofShape, { depth: TRAIN_CAR_LENGTH, bevelEnabled: false }).translate(0, 0, -TRAIN_CAR_LENGTH / 2);
  // BoxGeometry and ExtrudeGeometry both carry position/normal/uv for this local merge.
  finishParts.set("roof", [roofGeometry]);
  for (const z of [-5.5, 0, 5.5]) { box("roof", 0, 3.84, z, 1.65, 0.28, 2.4); box("dark", 0, 3.99, z, 1.43, 0.025, 1.96); }
  box("dark", 0, 0.8, 0, 1.9, 0.5, 6.6);
  const bodyGeometry = new Map<Finish, BufferGeometry>();
  const wheelGeometry = new CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.14, 64).rotateZ(Math.PI / 2); resources.add(wheelGeometry);
  const bogieGeometry = new BoxGeometry(1.55, 0.34, 2.7); resources.add(bogieGeometry);
  const gangwayGeometry = new BoxGeometry(1.25, 2.22, 1); resources.add(gangwayGeometry);
  const lampGeometry = new BoxGeometry(0.32, 0.18, 0.045); resources.add(lampGeometry);
  const cars: { body: Group; bogies: Group[]; wheels: Mesh[]; front: Vector3; rear: Vector3 }[] = [];
  const gangways: Mesh[] = [], heads: Mesh[] = [], tails: Mesh[] = [];
  let disposed = false, seconds = 0, previousSeconds = 0;
  let snapshot: TrainStatus = { track: TRAIN_TRACK, simulatedSeconds: 0, ...schedule.sample(phase), cars: [], wheels: [] };
  const stops: (() => void)[] = [];
  const pose = (object: Group | Mesh, a: Vector3, b: Vector3, lift = 0): void => {
    const z = b.clone().sub(a).normalize(), x = new Vector3().crossVectors(up, z).normalize(), y = new Vector3().crossVectors(z, x);
    object.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(y, lift);
    object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  };
  const render = (time: number): void => {
    const state = schedule.sample(phase + time), wheelStatus: TrainStatus["wheels"] = [];
    for (let carIndex = 0; carIndex < cars.length; carIndex++) {
      const car = cars[carIndex]!, station = state.station + (carIndex - (TRAIN_CAR_COUNT - 1) / 2) * TRAIN_CAR_PITCH;
      const bogieCentres: Vector3[] = [];
      for (let b = 0; b < 2; b++) {
        const centre = station + (b ? 1 : -1) * BOGIE_OFFSET, axles: Vector3[] = [];
        for (let a = 0; a < 2; a++) {
          const axle = centre + (a ? 1 : -1) * AXLE_OFFSET, contacts = [-1, 1].map(side => path.head(axle, side as -1 | 1));
          axles.push(new Vector3((contacts[0]!.x + contacts[1]!.x) / 2, (contacts[0]!.y + contacts[1]!.y) / 2, (contacts[0]!.z + contacts[1]!.z) / 2));
          const direction = path.sample(axle + 0.05), behind = path.sample(axle - 0.05);
          const tangent = new Vector3(direction.x - behind.x, direction.y - behind.y, direction.z - behind.z).normalize();
          const axis = new Vector3().crossVectors(up, tangent).normalize();
          for (let side = 0; side < 2; side++) {
            const contact = contacts[side]!, wheel = car.wheels[b * 4 + a * 2 + side]!;
            wheel.position.set(contact.x, contact.y + WHEEL_RADIUS, contact.z);
            wheel.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), axis);
            wheel.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), state.station / WHEEL_RADIUS));
            wheelStatus.push({ x: contact.x, y: wheel.position.y, z: contact.z, railY: contact.y, supported: contact.supported });
          }
        }
        pose(car.bogies[b]!, axles[0]!, axles[1]!, 0.5); bogieCentres.push(axles[0]!.clone().add(axles[1]!).multiplyScalar(0.5));
      }
      pose(car.body, bogieCentres[0]!, bogieCentres[1]!);
      car.body.updateMatrixWorld(true);
      car.front.set(0, 2.12, TRAIN_CAR_LENGTH / 2).applyMatrix4(car.body.matrixWorld);
      car.rear.set(0, 2.12, -TRAIN_CAR_LENGTH / 2).applyMatrix4(car.body.matrixWorld);
    }
    for (let i = 0; i < gangways.length; i++) { const a = cars[i]!.front, b = cars[i + 1]!.rear, g = gangways[i]!; pose(g, a, b); g.scale.z = a.distanceTo(b); }
    // The same physical cabs remain at each end through a stop and reversal.
    for (let i = 0; i < heads.length; i++) { heads[i]!.visible = (i < 2) === (state.direction === -1); tails[i]!.visible = !heads[i]!.visible; }
    snapshot = { track: TRAIN_TRACK, simulatedSeconds: time, ...state, cars: cars.map(c => ({ centre: c.body.position.toArray(), front: c.front.toArray(), rear: c.rear.toArray() })), wheels: wheelStatus };
  };
  const setStyle = (next: WorldStyle): void => { materials.glass.emissiveIntensity = next.id === "satellite" ? 0.2 : 0.04; };
  const dispose = (): void => {
    if (disposed) return; disposed = true; stops.splice(0).forEach(stop => stop()); root.removeFromParent(); root.clear();
    for (const geometry of resources) geometry.dispose(); for (const material of Object.values(materials)) material.dispose();
  };
  try {
    for (const [finish, parts] of finishParts) {
      const nonIndexed = parts.map(g => g.index ? g.toNonIndexed() : g);
      try { const merged = mergeGeometries(nonIndexed, false); if (!merged) throw Error(`Train ${finish} geometry needs matching attributes.`); bodyGeometry.set(finish, merged); resources.add(merged); }
      finally { for (const g of new Set([...parts, ...nonIndexed])) g.dispose(); }
    }
    finishParts.clear();
    for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
      const body = new Group(); body.name = `train:car:${i}`; root.add(body);
      for (const [finish, geometry] of bodyGeometry) { const mesh = new Mesh(geometry, materials[finish]); mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh); }
      const bogies = [new Group(), new Group()];
      for (const bogie of bogies) { const mesh = new Mesh(bogieGeometry, materials.dark); bogie.add(mesh); root.add(bogie); }
      const wheels = Array.from({ length: 8 }, () => { const mesh = new Mesh(wheelGeometry, materials.wheel); mesh.name = "train:wheel"; root.add(mesh); return mesh; });
      cars.push({ body, bogies, wheels, front: new Vector3(), rear: new Vector3() });
      if (i < TRAIN_CAR_COUNT - 1) { const mesh = new Mesh(gangwayGeometry, materials.dark); mesh.name = "train:gangway"; gangways.push(mesh); root.add(mesh); }
      if (i === 0 || i === TRAIN_CAR_COUNT - 1) {
        const end = i === 0 ? -1 : 1;
        for (const x of [-1, 1]) {
          const head = new Mesh(lampGeometry, materials.head), tail = new Mesh(lampGeometry, materials.tail);
          head.position.set(x, 1.48, end * 9.855); tail.position.copy(head.position); body.add(head, tail); heads.push(head); tails.push(tail);
        }
      }
    }
    setStyle(style); render(0); clipCityRoot(root);
    stops.push(loop.onFixedStep(step => { previousSeconds = seconds; if (ready()) seconds += step; }));
    stops.push(loop.onFrame((_delta, _elapsed, alpha) => { render(previousSeconds + (seconds - previousSeconds) * alpha); }));
    return { root, setStyle, dispose, moving: () => !disposed && ready() && snapshot.speed > 1e-4, status: () => structuredClone(snapshot) };
  } catch (cause) { for (const parts of finishParts.values()) for (const g of parts) g.dispose(); dispose(); throw cause; }
}