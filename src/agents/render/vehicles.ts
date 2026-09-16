import { Camera, Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Texture, Vector3, type BufferGeometry } from "three";
import { VEHICLE_ASSET_URL, VEHICLE_CLASSES, type VehicleAssetManifest, type VehicleAsset } from "../../world/agent-assets.js";
import { VEHICLE_FRONT_STEERING_LIMIT_RADIANS, VEHICLE_WHEEL_OFFSET_LIMIT_METRES, type VehiclePoseBuffers } from "../../world/agent-poses.js";
import type { WorldStyle } from "../../world/styles.js";
import { disposeTextures, loadManifest, loadModel } from "./assets.js";
import { poseBlend, writePoseMatrix } from "./pose.js";
import { writeWheelTransform } from "./wheel-transform.js";

interface Occurrence { transform: Matrix4; wheel: boolean; wheelIndex: number; pivot: Vector3 | undefined; front: boolean }
interface Part {
  mesh: InstancedMesh;
  occurrences: Occurrence[];
  material: MeshStandardMaterial;
  originalColor: Color;
  originalMetalness: number;
  originalRoughness: number;
  paint: boolean;
  count: number;
}
interface VehicleModel { asset: VehicleAsset; parts: Part[] }
const PHOTOGRAPHIC_TINTS = [0xe9eeee, 0xc0d3d2, 0xacbbc7, 0xbfa9a6] as const;
const CARTOGRAPHIC_TINTS = [0xf2eee3, 0xb7cad1, 0xc8cfbd, 0xc7b9ac] as const;

export class VehicleRenderer {
  readonly group = new Group();
  readonly models: VehicleModel[] = [];
  private readonly matrix = new Matrix4();
  private readonly partMatrix = new Matrix4();
  private readonly localMatrix = new Matrix4();
  private readonly tint = new Color();
  private readonly textures = new Set<Texture>();
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<MeshStandardMaterial>();
  private disposed = false;
  private photographic = true;
  renderedCount = 0;
  manifest: VehicleAssetManifest | undefined;

  constructor(private readonly poses: VehiclePoseBuffers) { this.group.name = "vehicle-fleet"; }

  async load(style: WorldStyle): Promise<void> {
    try {
      const manifest = await loadManifest<VehicleAssetManifest>(VEHICLE_ASSET_URL);
      this.manifest = manifest;
      for (const [index, id] of VEHICLE_CLASSES.entries()) {
        const asset = manifest.vehicles[index];
        if (asset?.id !== id) throw new Error(`Fleet class ${index} must be ${id}; rebuild ${VEHICLE_ASSET_URL} in the shared class order.`);
        const base = VEHICLE_ASSET_URL.slice(0, VEHICLE_ASSET_URL.lastIndexOf("/") + 1);
        const gltf = await loadModel(base + asset.model, asset.sha256);
        gltf.scene.updateMatrixWorld(true);
        if (asset.wheelObjects.length !== 4) throw new Error(`Vehicle ${id} requires four wheel roots in manifest order; rebuild the current fleet.`);
        const wheels = asset.wheelObjects.map(name => {
          const object = gltf.scene.getObjectByName(name);
          if (!object) throw new Error(`Vehicle ${id} wheel root ${name} is absent from the selected GLB scene; rebuild the fleet.`);
          const pivot = object.getWorldPosition(new Vector3());
          const front = Math.abs(pivot.z - asset.axles.frontZ) < 1e-4;
          if ((!front && Math.abs(pivot.z - asset.axles.rearZ) >= 1e-4) || Math.abs(Math.abs(pivot.x) - asset.axles.trackMetres / 2) >= 1e-4 || Math.abs(pivot.y - asset.wheelRadius) >= 1e-4) {
            throw new Error(`Vehicle ${id}/${name} pivot [${pivot.toArray()}] does not match its manifest axles, track and wheel radius; rebuild the fleet before steering.`);
          }
          return { pivot, front };
        });
        const groups = new Map<string, { geometry: BufferGeometry; source: MeshStandardMaterial; occurrences: Occurrence[] }>();
        gltf.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const source = object.material;
          if (!(source instanceof MeshStandardMaterial)) throw new Error(`Vehicle ${id}/${object.name} requires one standard material per GLB primitive.`);
          let parent = object.parent;
          let wheelIndex = asset.wheelObjects.indexOf(object.name);
          while (parent && wheelIndex < 0) { wheelIndex = asset.wheelObjects.indexOf(parent.name); parent = parent.parent; }
          const wheel = wheelIndex >= 0;
          const key = `${object.geometry.uuid}/${source.uuid}`;
          let group = groups.get(key);
          if (!group) {
            group = { geometry: object.geometry, source, occurrences: [] };
            groups.set(key, group);
          }
          group.occurrences.push({ transform: object.matrixWorld.clone(), wheel, wheelIndex, pivot: wheels[wheelIndex]?.pivot, front: wheels[wheelIndex]?.front ?? false });
          this.materials.add(source);
          this.geometries.add(object.geometry);
          for (const value of Object.values(source)) if (value instanceof Texture) this.textures.add(value);
        });
        const model: VehicleModel = { asset, parts: [] };
        this.models.push(model);
        for (const { geometry, source, occurrences } of groups.values()) {
          const material = source.clone();
          this.materials.add(material);
          const mesh = new InstancedMesh(geometry, material, this.poses.count * occurrences.length);
          mesh.instanceMatrix.setUsage(DynamicDrawUsage);
          mesh.name = `${id}-${source.name}`;
          mesh.count = 0;
          mesh.frustumCulled = false;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.group.add(mesh);
          model.parts.push({ mesh, occurrences, material, originalColor: source.color.clone(),
            originalMetalness: source.metalness, originalRoughness: source.roughness, paint: source.name === "paint", count: 0 });
        }
      }
      this.setStyle(style);
    } catch (error) { this.dispose(); throw error; }
  }

  update(alpha: number, _camera: Camera): void {
    if (this.disposed) return;
    for (const model of this.models) for (const part of model.parts) part.count = 0;
    this.renderedCount = 0;
    for (let slot = 0; slot < this.poses.count; slot++) {
      if (!this.poses.active[slot]) continue;
      const variant = this.poses.variant[slot]!;
      const model = this.models[variant];
      if (!model) throw new Error(`Vehicle slot ${slot} uses class ${variant}; the loaded fleet has ${this.models.length}.`);
      const travelled = writePoseMatrix(this.poses, slot, alpha, this.matrix);
      const blend = poseBlend(this.poses, slot, alpha);
      const beforeSteering = this.poses.previous.frontSteeringRadians[slot]!;
      const afterSteering = this.poses.current.frontSteeringRadians[slot]!;
      const steering = beforeSteering + (afterSteering - beforeSteering) * blend;
      if (!Number.isFinite(steering) || Math.abs(steering) > Math.fround(VEHICLE_FRONT_STEERING_LIMIT_RADIANS)) throw new Error(`Vehicle slot ${slot} steering ${steering} must be within ±35 degrees bicycle-equivalent; the core must supply a supported turn.`);
      const spin = (travelled / (model.asset.wheelRadius * this.poses.scale[slot]!)) % (Math.PI * 2);
      for (const part of model.parts) {
        for (const occurrence of part.occurrences) {
          this.localMatrix.copy(occurrence.transform);
          if (occurrence.wheel) {
            const index = slot * 4 + occurrence.wheelIndex;
            const before = this.poses.previous.wheelOffsets[index]!;
            const after = this.poses.current.wheelOffsets[index]!;
            const offset = before + (after - before) * blend;
            if (!Number.isFinite(offset) || Math.abs(offset) > Math.fround(VEHICLE_WHEEL_OFFSET_LIMIT_METRES)) throw new Error(`Vehicle slot ${slot} wheel ${occurrence.wheelIndex} support offset ${offset} exceeds ±${VEHICLE_WHEEL_OFFSET_LIMIT_METRES}m; the core must supply a supported surface.`);
            // Parallel front steering is a visual approximation of the core bicycle angle.
            // Its entire wheel envelope fits the current fleet bounds; Ackermann is not implied.
            writeWheelTransform(occurrence.transform, occurrence.pivot!, occurrence.front ? steering : 0, spin, offset, this.localMatrix);
          }
          this.partMatrix.copy(this.matrix).multiply(this.localMatrix);
          const instance = part.count++;
          part.mesh.setMatrixAt(instance, this.partMatrix);
          if (part.paint) {
            // Fixed slot palette: colour never reshuffles when the camera or LOD moves.
            const colors = this.photographic ? PHOTOGRAPHIC_TINTS : CARTOGRAPHIC_TINTS;
            this.tint.setHex(variant === 0 ? colors[slot % colors.length]! : 0xffffff);
            part.mesh.setColorAt(instance, this.tint);
          }
        }
      }
      this.renderedCount++;
    }
    for (const model of this.models) for (const part of model.parts) {
      part.mesh.count = part.count;
      part.mesh.instanceMatrix.needsUpdate = true;
      if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
    }
  }

  setStyle(style: WorldStyle): void {
    this.photographic = style.facade === "photographic";
    for (const [index, model] of this.models.entries()) for (const part of model.parts) {
      part.material.color.copy(part.originalColor);
      if (!this.photographic && part.paint) part.material.color.setHex([0xa3b3ad, 0x555f6b, 0xd1d1bc][index]!);
      part.material.metalness = this.photographic ? part.originalMetalness : 0.05;
      part.material.roughness = this.photographic ? part.originalRoughness : 0.8;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const model of this.models) for (const part of model.parts) part.mesh.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    disposeTextures(this.textures);
    this.group.clear();
    this.group.removeFromParent();
  }
}
