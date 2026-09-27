/** One presentation boundary for every city draw, including shadow and normal passes. */
import { Mesh, Plane, Vector3, type Material, type Object3D } from "three";
import { AOI_CORNERS_WORLD } from "../world/aoi.js";

export interface CutoutSide { name: string; x: number; z: number; dx: number; dz: number; length: number }
export const CUTOUT_SIDES: readonly CutoutSide[] = AOI_CORNERS_WORLD.map((a, index) => {
  const b = AOI_CORNERS_WORLD[(index + 1) % 4]!;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return Object.freeze({ name: ["north", "east", "south", "west"][index]!, x: a[0], z: a[1], dx: (b[0] - a[0]) / length, dz: (b[1] - a[1]) / length, length });
});
export const CITY_CLIP_PLANES = CUTOUT_SIDES.map(side => new Plane(new Vector3(-side.dz, 0, side.dx), side.dz * side.x - side.dx * side.z));
export const SECTION_CLIP_PLANES = CUTOUT_SIDES.map((_, side) => CITY_CLIP_PLANES.filter((_, index) => index !== side));

export function clipCityMaterial(material: Material, planes = CITY_CLIP_PLANES): void {
  if (material.clippingPlanes === planes && material.clipShadows) return;
  material.clippingPlanes = planes;
  material.clipShadows = true;
  material.clipIntersection = false;
  material.needsUpdate = true;
}

export function clipCityRoot(root: Object3D): void {
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    // A section on its own plane must not clip itself through float roundoff.
    const planes = object.userData.cutoutSectionSide === undefined ? CITY_CLIP_PLANES : SECTION_CLIP_PLANES[Number(object.userData.cutoutSectionSide)]!;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) clipCityMaterial(material, planes);
    if (object.customDepthMaterial) clipCityMaterial(object.customDepthMaterial, planes);
    if (object.customDistanceMaterial) clipCityMaterial(object.customDistanceMaterial, planes);
  });
}

export interface FinalLeafNode { children?: FinalLeafNode[]; content?: { uri?: string } }
/** Preparation is independent of camera visibility. Coarse ancestors are never
 * accepted as display substitutes, including after an eviction or failed load.
 */
export class FinalLeafReadiness {
  readonly expected = new Set<FinalLeafNode>();
  readonly prepared = new Set<FinalLeafNode>();
  error: string | null = null;
  register(root: FinalLeafNode, expectedCount = 44): void {
    const visit = (node: FinalLeafNode): void => { if (node.children?.length) node.children.forEach(visit); else if (node.content?.uri) this.expected.add(node); };
    visit(root);
    if (this.expected.size !== expectedCount) this.fail(`Building tileset contains ${this.expected.size} final leaves; the reviewed Shibuya scene requires ${expectedCount}. Restore the reviewed data/scene/buildings/tileset.json before displaying the cutout.`);
  }
  loaded(tile: FinalLeafNode): void { if (this.expected.has(tile)) this.prepared.add(tile); }
  removed(tile: FinalLeafNode): void { this.prepared.delete(tile); }
  fail(message: string): void { this.error ??= message; }
  get warming(): boolean { return this.expected.size === 0 || this.prepared.size !== this.expected.size; }
  canDisplay(visible: Iterable<FinalLeafNode>): boolean { return this.error === null && !this.warming && [...visible].every(tile => this.expected.has(tile) && this.prepared.has(tile)); }
  message(): string { return this.error ?? `Loading Shibuya buildings: ${this.prepared.size} of ${this.expected.size || 44} ready…`; }
}
