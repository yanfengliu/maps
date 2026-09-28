/** Bound: contact presentation geometry, sampled inputs and lifecycle in Node.
 * No shader compilation, rendered contact quality or physical-support claim. */
import { describe, expect, it, vi } from 'vitest';
import { Group, Vector3, Mesh, BoxGeometry, MeshBasicMaterial, type ShaderMaterial } from 'three';
import { contactFade, LocalWalkContact } from '../src/agents/render/local-walk-contact.js';
import { getAgentNormalMaterial } from '../src/agents/render/pass-materials.js';
import { withNormalMaterials } from '../src/render/normal-pass.js';
import { Scene, MeshNormalMaterial, LessEqualDepth } from 'three';
import type { LocalContext, Triangle } from '../src/agents/population/local-walk-support.js';
import type { LocalRig } from '../src/agents/render/local-walk-rig.js';
import type { LocalGaitSample } from '../src/agents/population/local-walk-gait.js';
import { WORLD_STYLES } from '../src/world/styles.js';
import { createSurfaceMaterial } from '../src/scene/surface-materials.js';

const triangle = (index: number, x: number): Triangle => {
  const a = { x, y: 1 + x * .1, z: 0 }, b = { x: x + 1, y: 1 + (x + 1) * .1, z: 0 }, c = { x, y: 1 + x * .1, z: 1 };
  return { index, a, b, c, vertices: [a, b, c], det: 1, dx: .1, dz: 0, ny: 1 / Math.hypot(1, .1) };
};
function fixture() {
  const context = { origin: { x: 0, y: 1, z: 0 }, scale: 2,
    legs: [{ from: { x: 0, y: 1, z: 0 }, to: { x: 1, y: 1.1, z: 1 } }],
    triangles: [triangle(1, 0), triangle(2, 2), triangle(3, 20)] } as LocalContext;
  const rig = { packet: { soles: [[1, 2], [3, 4]] }, byId: new Map([
    [1, { idle: [-.02, .01, -.03] }], [2, { idle: [.02, .01, .09] }],
    [3, { idle: [-.02, .01, -.03] }], [4, { idle: [.02, .01, .09] }],
  ]) } as unknown as LocalRig;
  const foot = { p: [.1, .06, .1], home: [0, .05, 0], ground: .05, yaw: 0, mode: 'plant' };
  const sample = { gait: { feet: [structuredClone(foot), structuredClone(foot)] }, root: { x: 999, y: 999, z: 999 } } as LocalGaitSample;
  const cue = new LocalWalkContact(context, rig), root = new Group();
  root.position.set(37, 5, -21); root.rotation.y = .8; root.scale.setScalar(2); root.add(cue.mesh); root.updateMatrixWorld(true);
  return { cue, context, sample, root };
}
const uniforms = (mesh: Mesh) => (mesh.material as ShaderMaterial).uniforms;

describe('local foot contact presentation', () => {
  it('retains source heights and holes, and excludes remote triangles', () => {
    const { cue, context } = fixture();
    expect(cue.triangleCount).toBe(2);
    const position = cue.mesh.geometry.getAttribute('position');
    expect(position.count).toBe(6);
    context.triangles.slice(0, 2).flatMap(t => [t.a, t.b, t.c]).forEach((p, i) => {
      expect(position.getX(i)).toBeCloseTo(p.x, 6); expect(position.getY(i)).toBeCloseTo(p.y, 6); expect(position.getZ(i)).toBeCloseTo(p.z, 6);
    });
    cue.dispose();
  });
  it('uses the sampled foot and sole frame while cancelling the moving actor transform', () => {
    const { cue, sample, root } = fixture();
    sample.gait.feet[0].yaw = Math.PI / 2;
    cue.update(sample, root, 8); root.updateMatrixWorld(true);
    const frame = uniforms(cue.mesh).contactFrame!.value[0];
    expect(frame.x).toBeCloseTo(.26); expect(frame.y).toBeCloseTo(.2); expect(frame.z).toBeCloseTo(0); expect(frame.w).toBeCloseTo(1);
    const position = new Vector3(.2, 1.02, .2).applyMatrix4(cue.mesh.matrixWorld);
    expect(position.distanceTo(new Vector3(.2, 1.02, .2))).toBeLessThan(1e-12);
    expect(uniforms(cue.mesh).contactSize!.value[0].z).toBeCloseTo(.28);
    expect(uniforms(cue.mesh).supportPlane!.value[0].toArray()).toEqual([.1, 0, 1]);
    cue.dispose();
  });
  it('fades with actual lift and distance, including a foot still labelled plant', () => {
    const { cue, sample, root } = fixture();
    sample.gait.feet[0].p[1] += .02;
    cue.update(sample, root, 8);
    expect(uniforms(cue.mesh).contactSize!.value[0].z).toBe(0);
    expect(uniforms(cue.mesh).contactSize!.value[1].z).toBeCloseTo(.28);
    cue.update(sample, root, 18); expect(cue.mesh.visible).toBe(false);
    expect(contactFade(.002, 12)).toBe(1); expect(contactFade(.03, 8)).toBe(0);
    expect(contactFade(.015, 8)).toBeGreaterThan(contactFade(.02, 8));
    expect(contactFade(0, 15)).toBeCloseTo(.5);
    cue.dispose();
  });
  it('shows no cue where the sampled feet have no retained support', () => {
    const { cue, sample, root } = fixture();
    sample.gait.feet.forEach((foot: { p: number[] }) => { foot.p[0] = .75; });
    cue.update(sample, root, 8); expect(cue.mesh.visible).toBe(false);
    cue.dispose();
  });
  it('uses current style strength and never casts or writes depth', () => {
    const { cue, sample, root } = fixture();
    const style = WORLD_STYLES.find(s => s.facade !== 'photographic')!;
    cue.setStyle(style); cue.update(sample, root, 8);
    expect(uniforms(cue.mesh).contactSize!.value[0].z).toBeCloseTo(.23);
    expect(cue.mesh.castShadow).toBe(false); expect(cue.mesh.material.depthWrite).toBe(false); expect(cue.mesh.material.depthTest).toBe(true);
    cue.dispose();
  });
  it.each(WORLD_STYLES)('stays in front of the actual $id pavement depth through style changes', style => {
    const { cue } = fixture(), pavement = createSurfaceMaterial('sidewalk', style);
    try {
      for (const currentStyle of [style, ...WORLD_STYLES.filter(other => other !== style)]) {
        pavement.apply(currentStyle); cue.setStyle(currentStyle);
        const receiver = pavement.material, contact = cue.mesh.material;
        expect(receiver.depthWrite).toBe(true); expect(receiver.depthTest).toBe(true);
        expect(receiver.polygonOffset).toBe(true); expect(contact.polygonOffset).toBe(true);
        expect(receiver.depthFunc).toBe(LessEqualDepth); expect(contact.depthFunc).toBe(LessEqualDepth);
        // For every nonnegative depth slope m and positive resolution r,
        // offset = factor*m + units*r must place contact before its receiver.
        expect(contact.polygonOffsetFactor, 'contact slope offset must not trail actual pavement').toBeLessThanOrEqual(receiver.polygonOffsetFactor);
        expect(contact.polygonOffsetUnits, 'contact constant offset must precede actual pavement').toBeLessThan(receiver.polygonOffsetUnits);
        expect(contact.depthTest).toBe(true); expect(contact.depthWrite).toBe(false);
      }
    } finally { cue.dispose(); pavement.dispose(); }
  });
  it.each([false, true])('omits only contact from the real normal adapter and restores beauty (throw=%s)', throws => {
    const { cue, sample, root } = fixture(); cue.update(sample, root, 8);
    const scene = new Scene(); scene.add(root);
    const receiver = new Mesh(new BoxGeometry(), new MeshBasicMaterial()); scene.add(receiver);
    const original = cue.mesh.material, receiverBeauty = receiver.material;
    const normal = getAgentNormalMaterial(cue.mesh) as ShaderMaterial, ordinary = new MeshNormalMaterial();
    const visibility = cue.mesh.visible, failure = new Error('injected normal draw failure');
    const draw = () => {
      expect(cue.mesh.visible).toBe(true); expect(cue.mesh.material).toBe(normal);
      expect(cue.mesh.material.visible, 'contact must be excluded before GPU draw submission').toBe(false);
      expect(receiver.visible).toBe(true); expect(receiver.material).toBe(ordinary);
      expect(receiver.material.visible).toBe(true);
      if (throws) throw failure;
    };
    try {
      expect(original.visible).toBe(true); expect(visibility).toBe(true);
      if (throws) expect(() => withNormalMaterials(scene, ordinary, getAgentNormalMaterial, draw)).toThrow(failure);
      else withNormalMaterials(scene, ordinary, getAgentNormalMaterial, draw);
      expect(cue.mesh.material).toBe(original); expect(cue.mesh.visible).toBe(visibility);
      expect(receiver.material).toBe(receiverBeauty); expect(receiver.visible).toBe(true);
      const geometryDispose = vi.fn(), materialDispose = vi.fn(), normalDispose = vi.fn();
      cue.mesh.geometry.addEventListener('dispose', geometryDispose); original.addEventListener('dispose', materialDispose); normal.addEventListener('dispose', normalDispose);
      cue.dispose(); cue.dispose();
      expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1); expect(normalDispose).toHaveBeenCalledTimes(1);
      expect(cue.mesh.parent).toBeNull(); expect(getAgentNormalMaterial(cue.mesh)).toBeUndefined();
    } finally { cue.dispose(); ordinary.dispose(); receiver.geometry.dispose(); receiverBeauty.dispose(); }
  });});
