import type { Material, Mesh } from "three";

// The post chain owns the normal/depth pass. Agents only register the material
// that draws their current deformed shape and cutouts into that pass.
const normalMaterials = new WeakMap<Mesh, Material>();

export function setAgentNormalMaterial(mesh: Mesh, material: Material): void {
  normalMaterials.set(mesh, material);
}

export function getAgentNormalMaterial(mesh: Mesh): Material | undefined {
  return normalMaterials.get(mesh);
}

export function deleteAgentNormalMaterial(mesh: Mesh): void {
  normalMaterials.delete(mesh);
}
