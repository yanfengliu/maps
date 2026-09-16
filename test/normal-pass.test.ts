/** Bounds: the actual material-swap path with normal and forced-throw draws.
 * VAT shader compilation and moving shadow/AO pixels require the browser gate.
 */
import { expect, it } from "vitest";
import { BoxGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, MeshNormalMaterial, Scene } from "three";
import { withNormalMaterials } from "../src/render/normal-pass.js";

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
