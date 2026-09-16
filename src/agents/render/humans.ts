import {
  Box3, Camera, Color, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh,
  Matrix4, Mesh, MeshDepthMaterial, MeshDistanceMaterial, MeshStandardMaterial, RGBADepthPacking, Texture, Vector3,
  type BufferGeometry, type DataTexture, type Material,
} from "three";
import { HUMAN_ASSET_URLS, type AgentAssetLod, type AgentAssetManifest } from "../../world/agent-assets.js";
import type { AgentPoseBuffers } from "../../world/agent-poses.js";
import type { WorldStyle } from "../../world/styles.js";
import { disposeTextures, loadManifest, loadModel, loadVat } from "./assets.js";
import { writePoseMatrix } from "./pose.js";
import { deleteAgentNormalMaterial, setAgentNormalMaterial } from "./pass-materials.js";
import { applyAgentVat, createAgentNormalMaterial } from "./vat.js";
import { admitHumanDraws } from "./human-admission.js";


interface Part {
  mesh: InstancedMesh;
  material: MeshStandardMaterial;
  originalColor: Color;
  originalMap: Texture | null;
  flatColor: Color;
  flatUniform: { value: number };
}
interface HumanLod {
  manifest: AgentAssetManifest;
  lod: AgentAssetLod;
  parts: Part[];
  motion: InstancedBufferAttribute;
  textures: DataTexture[];
  strideMetres: number;
  idleDuration: number;
  count: number;
}

function flatColor(name: string, variant: number): Color {
  if (/eye|brow|hair|short|bob/i.test(name)) return new Color(0x45403a);
  if (/shoes/i.test(name)) return new Color(0x6a5141);
  if (/casual|suit/i.test(name)) return new Color([0x788da0, 0x585b60, 0x819bb1][variant]!);
  return new Color(0xcba68d);
}

export class HumanRenderer {
  readonly group = new Group();
  readonly lods: HumanLod[][] = [];
  private readonly matrix = new Matrix4();
  private readonly cameraPosition = new Vector3();
  private readonly retainedTextures = new Set<Texture>();
  private readonly materials = new Set<Material>();
  private readonly geometries = new Set<BufferGeometry>();
  private disposed = false;
  renderedCount = 0;

  constructor(private readonly poses: AgentPoseBuffers) { this.group.name = "animated-pedestrians"; }

  async load(style: WorldStyle): Promise<void> {
    try {
      for (const [variant, url] of HUMAN_ASSET_URLS.entries()) {
        const manifest = await loadManifest<AgentAssetManifest>(url);
        const levels: HumanLod[] = [];
        this.lods.push(levels);
        for (const id of ["near", "medium", "far"] as const) {
          const lod = manifest.lods.find((value) => value.id === id);
          if (!lod) throw new Error(`Human ${manifest.id} has no ${id} LOD. Rebuild its idle/walk assets.`);
          const base = url.slice(0, url.lastIndexOf("/") + 1);
          const positions = await loadVat(base + lod.positions, lod.positionSha256, lod.textureWidth, lod.textureHeight);
          this.retainedTextures.add(positions);
          const normals = await loadVat(base + lod.normals, lod.normalSha256, lod.textureWidth, lod.textureHeight);
          this.retainedTextures.add(normals);
          const gltf = await loadModel(base + lod.model, lod.modelSha256);
          // Retain ownership before admission, so a rejected selected scene
          // releases every resource its loader already created.
          gltf.scene.traverse(object => {
            if (!(object instanceof Mesh)) return;
            this.geometries.add(object.geometry);
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              this.materials.add(material);
              for (const value of Object.values(material)) if (value instanceof Texture) this.retainedTextures.add(value);
            }
          });
          const draws = admitHumanDraws(gltf, lod, `${manifest.id}/${id}`);
          const motion = new InstancedBufferAttribute(new Float32Array(this.poses.count * 3), 3).setUsage(DynamicDrawUsage);
          const level: HumanLod = { manifest, lod, motion, textures: [positions, normals], parts: [], count: 0,
            strideMetres: manifest.clips.find((clip) => clip.id === "walk")!.strideMetres,
            idleDuration: manifest.clips.find((clip) => clip.id === "idle")!.durationSeconds };
          levels.push(level);
          for (const object of draws) {
            const source = object.material;
            if (!(source instanceof MeshStandardMaterial)) throw new Error(`Human ${manifest.id}/${id} requires one standard material per GLB primitive.`);
            this.materials.add(source);
            for (const value of Object.values(source)) if (value instanceof Texture) this.retainedTextures.add(value);
            const geometry = object.geometry;
            const vatId = geometry.getAttribute("_vat_id");
            if (!vatId) throw new Error(`Human ${manifest.id}/${id}/${object.name} is missing _VAT_ID; rebuild it before rendering.`);
            geometry.setAttribute("agentVertex", vatId);
            geometry.setAttribute("agentMotion", motion);
            geometry.boundingBox = new Box3(new Vector3(...lod.bounds.min as [number, number, number]), new Vector3(...lod.bounds.max as [number, number, number]));
            geometry.computeBoundingSphere();
            const material = source.clone();
            // MPFB exports every layer as BLEND. An instanced crowd cannot
            // depth-sort each person's clothing and hair as separate objects.
            // Cutouts retain the alpha masks while writing the real surfaces.
            material.transparent = false;
            material.depthWrite = true;
            material.alphaTest = 0.45;
            material.forceSinglePass = true;
            const flatUniform = { value: 0 };
            applyAgentVat(material, manifest, lod, positions, normals, flatUniform);
            this.materials.add(material);
            const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: material.map, alphaMap: material.alphaMap, alphaTest: material.alphaTest });
            applyAgentVat(depth, manifest, lod, positions, normals);
            this.materials.add(depth);
            const distance = new MeshDistanceMaterial({ map: material.map, alphaMap: material.alphaMap, alphaTest: material.alphaTest });
            applyAgentVat(distance, manifest, lod, positions, normals);
            this.materials.add(distance);
            const normal = createAgentNormalMaterial(material);
            applyAgentVat(normal, manifest, lod, positions, normals);
            this.materials.add(normal);
            const mesh = new InstancedMesh(geometry, material, this.poses.count);
            mesh.name = `${manifest.id}-${id}-${object.name}`;
            mesh.instanceMatrix.setUsage(DynamicDrawUsage);
            mesh.count = 0;
            mesh.frustumCulled = false;
            mesh.castShadow = id === "near";
            mesh.receiveShadow = true;
            mesh.customDepthMaterial = depth;
            mesh.customDistanceMaterial = distance;
            setAgentNormalMaterial(mesh, normal);
            this.group.add(mesh);
            level.parts.push({ mesh, material, originalColor: material.color.clone(), originalMap: material.map, flatColor: flatColor(source.name, variant), flatUniform });
          }
        }
      }
      this.setStyle(style);
    } catch (error) { this.dispose(); throw error; }
  }

  update(alpha: number, camera: Camera, elapsedSeconds: number): void {
    if (this.disposed) return;
    camera.getWorldPosition(this.cameraPosition);
    for (const levels of this.lods) for (const level of levels) level.count = 0;
    this.renderedCount = 0;
    for (let slot = 0; slot < this.poses.count; slot++) {
      if (!this.poses.active[slot]) continue;
      const variant = this.poses.variant[slot]!;
      const levels = this.lods[variant];
      if (!levels) throw new Error(`Pedestrian slot ${slot} uses variant ${variant}; the loaded human registry has ${this.lods.length}.`);
      const travelled = writePoseMatrix(this.poses, slot, alpha, this.matrix);
      const elements = this.matrix.elements;
      const distanceSquared = (elements[12]! - this.cameraPosition.x) ** 2 + (elements[13]! - this.cameraPosition.y) ** 2 + (elements[14]! - this.cameraPosition.z) ** 2;
      const level = levels[distanceSquared < 18 ** 2 ? 0 : distanceSquared < 60 ** 2 ? 1 : 2]!;
      if (level.parts.length !== level.lod.drawParts.length || level.parts.length === 0) throw new Error(`Pedestrian slot ${slot} cannot render ${level.manifest.id}/${level.lod.id}: its required drawable parts are missing.`);
      const instance = level.count++;
      const stride = level.strideMetres * this.poses.scale[slot]!;
      level.motion.setXYZ(instance, (travelled / stride) % 1, (elapsedSeconds / level.idleDuration + slot * 0.61803398875) % 1, Math.min(1, this.poses.speedMps[slot]! / 0.2));
      for (const part of level.parts) part.mesh.setMatrixAt(instance, this.matrix);
      this.renderedCount++;
    }
    for (const levels of this.lods) for (const level of levels) {
      level.motion.needsUpdate = true;
      for (const part of level.parts) {
        part.mesh.count = level.count;
        part.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  setStyle(style: WorldStyle): void {
    for (const levels of this.lods) for (const level of levels) for (const part of level.parts) {
      const photographic = style.facade === "photographic";
      // Preserve the same texture alpha cutouts in both styles; the fragment
      // shader replaces only RGB for the quiet Cartographic material.
      part.material.map = part.originalMap;
      part.flatUniform.value = photographic ? 0 : 1;
      part.material.color.copy(photographic ? part.originalColor : part.flatColor);
      part.material.roughness = photographic ? 0.8 : 0.95;
      part.material.needsUpdate = true;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const levels of this.lods) for (const level of levels) for (const part of level.parts) {
      deleteAgentNormalMaterial(part.mesh);
      part.mesh.dispose();
    }
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    disposeTextures(this.retainedTextures);
    this.group.clear();
    this.group.removeFromParent();
  }
}
