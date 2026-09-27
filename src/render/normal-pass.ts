/** Keep one GTAO geometry pass while letting deforming agents draw their actual
 * VAT pose and cutout silhouette. The material swap is scoped to that draw.
 */
import { Color, Mesh, type Camera, type ColorRepresentation, type Material, type Plane, type Scene, type WebGLRenderer, type WebGLRenderTarget } from "three";
import { clipCityMaterial } from "../scene/aoi-cutout.js";
import type { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";

type NormalLookup = (mesh: Mesh) => Material | undefined;
type OverridePass = GTAOPass & {
  scene: Scene;
  camera: Camera;
  _renderOverride(renderer: WebGLRenderer, material: Material, target: WebGLRenderTarget | null, colour?: ColorRepresentation, alpha?: number): void;
  _restoreVisibility(): void;
};

export function withNormalMaterials(scene: Scene, ordinary: Material, lookup: NormalLookup, draw: () => void, retainedVariants?: Map<Plane[], Material>): void {
  const variants = retainedVariants ?? new Map<Plane[], Material>();
  const previousOverride = scene.overrideMaterial;
  const originals: { mesh: Mesh; material: Material | Material[] }[] = [];
  try {
    scene.traverseVisible((object) => {
      if (!(object instanceof Mesh)) return;
      const selected = lookup(object);
      if (object.geometry.hasAttribute("agentMotion") && !selected) throw new Error(`Animated agent ${object.name} has no registered GTAO normal material; register its VAT/cutout pass before adding it to the scene.`);
      originals.push({ mesh: object, material: object.material });
      const source = Array.isArray(object.material) ? object.material[0]! : object.material;
      const planes = source.clippingPlanes;
      if (selected) {
        if (planes?.length) clipCityMaterial(selected, planes);
        object.material = selected;
      } else if (planes?.length) {
        let clipped = variants.get(planes);
        if (!clipped) { clipped = ordinary.clone(); clipCityMaterial(clipped, planes); variants.set(planes, clipped); }
        object.material = clipped;
      } else object.material = ordinary;
    });
    scene.overrideMaterial = null;
    draw();
  } finally {
    for (const { mesh, material } of originals) mesh.material = material;
    scene.overrideMaterial = previousOverride;
    if (!retainedVariants) for (const material of variants.values()) material.dispose();
  }
}

export function installAgentNormals(pass: GTAOPass, lookup: NormalLookup): void {
  const upstream = pass as OverridePass;
  const variants = new Map<Plane[], Material>();
  const dispose = pass.dispose.bind(pass);
  pass.dispose = (): void => { for (const material of variants.values()) material.dispose(); variants.clear(); dispose(); };
  if (typeof upstream._renderOverride !== "function" || typeof upstream._restoreVisibility !== "function") throw new Error("This GTAOPass version has no expected normal-pass hooks; update the agent-aware normal adapter before rendering animated actors.");
  upstream._renderOverride = (renderer, material, target, colour = 0x7777ff, alpha = 1): void => {
    const oldColour = renderer.getClearColor(new Color()).clone();
    const oldAlpha = renderer.getClearAlpha(); const oldAutoClear = renderer.autoClear;
    const oldTarget = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(target); renderer.autoClear = false;
      renderer.setClearColor(colour, alpha); renderer.clear();
      withNormalMaterials(upstream.scene, material, lookup, () => renderer.render(upstream.scene, upstream.camera), variants);
    } finally {
      renderer.autoClear = oldAutoClear; renderer.setClearColor(oldColour, oldAlpha); renderer.setRenderTarget(oldTarget);
      upstream._restoreVisibility();
    }
  };
}
