/** Bounds: the actual material-swap path with normal and forced-throw draws.
 * VAT shader compilation and moving shadow/AO pixels require the browser gate.
 */
import { expect, it } from "vitest";
import { BoxGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, MeshNormalMaterial, Scene } from "three";
import { withNormalMaterials } from "../src/render/normal-pass.js";
import { CITY_CLIP_PLANES, SECTION_CLIP_PLANES, clipCityRoot } from "../src/scene/aoi-cutout.js";

it("uses registered agent normals and restores material arrays/scene override even on a render error", () => {
  const scene = new Scene(); const ordinary = new MeshNormalMaterial(); const agentNormal = new MeshNormalMaterial();
  const first = new MeshBasicMaterial(); const second = new MeshBasicMaterial(); const initialOverride = new MeshBasicMaterial();
  const materials = [first, second]; const geometry = new BoxGeometry(); const agent = new Mesh(geometry, materials); const building = new Mesh(geometry, first);
  scene.add(agent, building); scene.overrideMaterial = initialOverride;
  try {
    for (const fail of [false, true]) {
      const draw = () => withNormalMaterials(scene, ordinary, (mesh) => mesh === agent ? agentNormal : undefined, () => {
        expect(agent.material).toBe(agentNormal); expect(building.material).toBe(ordinary); expect(scene.overrideMaterial).toBeNull();
        if (fail) throw new Error("forced draw failure");
      });
      if (fail) expect(draw).toThrow("forced draw failure"); else draw();
      expect(agent.material).toBe(materials); expect(building.material).toBe(first); expect(scene.overrideMaterial).toBe(initialOverride);
    }
    geometry.setAttribute("agentMotion", new Float32BufferAttribute([0, 0, 0, 0], 4));
    expect(() => withNormalMaterials(scene, ordinary, () => undefined, () => {})).toThrow(/no registered GTAO normal material/);
    expect(agent.material).toBe(materials); expect(scene.overrideMaterial).toBe(initialOverride);
  } finally { geometry.dispose(); for (const m of [ordinary, agentNormal, first, second, initialOverride]) m.dispose(); }
});

it("keeps city, section and agent clipping in the normal/depth pass while leaving the sky policy alone", () => {
  const scene = new Scene(), geometry = new BoxGeometry(), ordinary = new MeshNormalMaterial();
  const city = new Mesh(geometry, new MeshBasicMaterial()), cap = new Mesh(geometry, new MeshBasicMaterial()), sky = new Mesh(geometry, new MeshBasicMaterial());
  const agent = new Mesh(geometry, new MeshBasicMaterial()), agentNormal = new MeshNormalMaterial();
  const depth = new MeshBasicMaterial(), distance = new MeshBasicMaterial(); agent.customDepthMaterial = depth; agent.customDistanceMaterial = distance;
  cap.userData.cutoutSectionSide = 1;
  clipCityRoot(city); clipCityRoot(cap); clipCityRoot(agent); scene.add(city, cap, agent, sky);
  const originals = [city.material, cap.material, agent.material, sky.material];
  try {
    expect(city.material.clippingPlanes).toBe(CITY_CLIP_PLANES); expect(city.material.clipShadows).toBe(true);
    expect(depth.clippingPlanes).toBe(CITY_CLIP_PLANES); expect(distance.clipShadows).toBe(true);
    expect(() => withNormalMaterials(scene, ordinary, mesh => mesh === agent ? agentNormal : undefined, () => {
      expect(city.material.clippingPlanes).toBe(CITY_CLIP_PLANES);
      expect(cap.material.clippingPlanes).toBe(SECTION_CLIP_PLANES[1]);
      expect(agentNormal.clippingPlanes).toBe(CITY_CLIP_PLANES); expect(sky.material).toBe(ordinary); expect(ordinary.clippingPlanes).toBeNull();
      throw new Error("forced clipped draw failure");
    })).toThrow("forced clipped draw failure");
    expect([city.material, cap.material, agent.material, sky.material]).toEqual(originals);
  } finally { geometry.dispose(); for (const material of [...originals, ordinary, agentNormal, depth, distance]) material.dispose(); }
});
