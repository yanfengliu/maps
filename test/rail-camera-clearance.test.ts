/** CPU observer controls. No browser input, image or moving-body claim. */
import { describe, expect, it } from "vitest";
import { Box3, BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, InterleavedBuffer, InterleavedBufferAttribute, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Plane, PlaneGeometry, ShaderMaterial, SkinnedMesh, Vector3 } from "three";
import { createRailCameraObserver } from "../src/harness/rail-camera-clearance.js";
import { emptyPopulationStatus } from "../src/agents/population/status.js";
import { createSurfaceMaterial } from "../src/scene/surface-materials.js";
import { worldStyle } from "../src/world/styles.js";

function fixture() {
  const root = new Group(); root.name = "city";
  const camera = new PerspectiveCamera(55, 1280 / 720, 1, 8000); camera.position.set(0, 25, 5); camera.lookAt(0, 25, 0); camera.updateMatrixWorld();
  const state = { frame: 123, revision: 456, ready: true, population: emptyPopulationStatus() };
  const observe = createRailCameraObserver(root, camera, () => state);
  const cleanup = (): void => { root.traverse(o => { if (o instanceof Mesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); } }); root.clear(); };
  return { root, camera, state, observe, cleanup };
}
describe("complete live rail camera observation", () => {
  it.each([false, true])("excludes a rotated loose box using referenced draw vertices (indexed=%s)", indexed => {
    const f = fixture();
    try {
      const rotation = new Matrix4().makeRotationY(Math.PI / 4), inverse = rotation.clone().invert();
      // The first triangle crosses the near rectangle but is initially outside
      // the draw range. Every drawn vertex is strictly to the right of it.
      const world = [[-2, 24.8, 3.5], [2, 24.8, 4.5], [0, 25.2, 4], [5, 24, -5], [5, 26, 15], [6, 25, 5]];
      const local = world.flatMap(p => new Vector3(...p).applyMatrix4(inverse).toArray());
      const geometry = new BufferGeometry(); geometry.setAttribute("position", new Float32BufferAttribute(local, 3));
      if (indexed) geometry.setIndex([0, 1, 2, 3, 4, 5]);
      geometry.addGroup(0, 3, 0); geometry.addGroup(3, 3, 1); geometry.setDrawRange(3, 3);
      const mesh = new Mesh(geometry, [new MeshBasicMaterial(), new MeshBasicMaterial()]); mesh.matrixAutoUpdate = false; mesh.matrix.copy(rotation); f.root.add(mesh); f.root.updateMatrixWorld(true);
      const loose = new Box3().setFromPoints([3, 4, 5].map(i => new Vector3().fromBufferAttribute(geometry.getAttribute("position"), i))).applyMatrix4(mesh.matrixWorld);
      expect(loose.containsPoint(f.camera.position)).toBe(true);
      expect([3, 4, 5].every(i => new Vector3().fromBufferAttribute(geometry.getAttribute("position"), i).applyMatrix4(mesh.matrixWorld).x > 4.99)).toBe(true);
      const separated = f.observe(); expect(separated.counts.broadphase).toBe(0); expect(separated.unknown).toEqual([]); expect(separated.eligible).toBe(true);
      // Enlarging the referenced range must restore the actual contact, even
      // though it belongs to a different material fragment of the same group.
      geometry.setDrawRange(0, 6);
      const contact = f.observe(); expect(contact.intersections.some(w => w.reason.includes("complete near rectangle"))).toBe(true); expect(contact.eligible).toBe(false);
    } finally { f.cleanup(); }
  });
  it.each(["zoom", "film", "view", "matrix"])("refuses unsupported %s projection before broadphase", mode => {
    const f=fixture();try {
      if(mode==="zoom")f.camera.zoom=.5;
      if(mode==="film")f.camera.filmOffset=2;
      if(mode==="view")f.camera.setViewOffset(1280,720,100,0,1280,720);
      f.camera.updateProjectionMatrix();if(mode==="matrix")f.camera.projectionMatrix.elements[8]!+=.1;
      const r=f.observe();expect(r.eligible).toBe(false);expect(r.unknown.some(w=>w.reason.includes("projection"))).toBe(true);expect(r.counts.broadphase).toBe(0);
    } finally {f.cleanup();}
  });
  it("refuses interleaved backing storage before stale cached bounds could clear it",()=>{
    const f=fixture();try {
      const p=new InterleavedBufferAttribute(new InterleavedBuffer(new Float32Array([99,24,4,101,24,4,100,26,4]),3),3,0),g=new BufferGeometry();g.setAttribute("position",p);f.root.add(new Mesh(g,new MeshBasicMaterial()));f.root.updateMatrixWorld(true);
      expect(f.observe().unknown.some(w=>w.reason.includes("interleaved"))).toBe(true);
      for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)-100);p.needsUpdate=true;
      expect(f.observe().unknown.some(w=>w.reason.includes("interleaved"))).toBe(true);
    }finally{f.cleanup();}
  });
  it.each(["offset", "gap", "overlap"])("refuses %s material-array draw groups rather than reassembling triangles",mode=>{
    const f=fixture();try {
      const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute([10,35,4,10,15,4,.5,15,4,.5,35,4,11,30,4,10,30,4],3));
      if(mode==="offset")g.addGroup(1,3,0);else if(mode==="gap")g.addGroup(3,3,0);else{g.addGroup(0,6,0);g.addGroup(0,6,0);}
      f.root.add(new Mesh(g,[new MeshBasicMaterial()]));f.root.updateMatrixWorld(true);
      expect(f.observe().unknown.some(w=>w.reason.includes("material groups"))).toBe(true);
    }finally{f.cleanup();}
  });
  it("refuses after-render mutation even when the unmodified box is far away",()=>{
    const f=fixture();try {
      const mesh=new Mesh(new BoxGeometry(),new MeshBasicMaterial());mesh.position.set(100,25,5);let invoked=false;mesh.onAfterRender=()=>{invoked=true;mesh.position.x=0;};f.root.add(mesh);f.root.updateMatrixWorld(true);
      expect(f.observe().unknown.some(w=>w.reason.includes("render callback"))).toBe(true);expect(invoked).toBe(false);expect(mesh.position.x).toBe(100);
    }finally{f.cleanup();}
  });
  it("binds immutable plain output to the exact frame/revision/matrices without changing source state", () => {
    const f = fixture();
    try {
      const geometry = new BoxGeometry(1, 1, 1), mesh = new Mesh(geometry, new MeshBasicMaterial()); mesh.position.set(10, 25, 0); f.root.add(mesh); f.root.updateMatrixWorld(true);
      const original = { matrix: f.camera.matrixWorld.toArray(), root: f.root.matrixWorld.toArray(), position: Array.from(geometry.getAttribute("position").array) };
      const r = f.observe(); expect(r.eligible).toBe(true); expect(r.frame).toBe(123); expect(r.revision).toBe(456); expect(r.cameraWorld).toEqual(original.matrix);
      expect(Object.isFrozen(r)).toBe(true); expect(Object.isFrozen(r.eye)).toBe(true); expect(JSON.parse(JSON.stringify(r))).toEqual(r);
      expect(f.camera.matrixWorld.toArray()).toEqual(original.matrix); expect(f.root.matrixWorld.toArray()).toEqual(original.root); expect(Array.from(geometry.getAttribute("position").array)).toEqual(original.position);
    } finally { f.cleanup(); }
  });
  it("finds a plane across the rectangle interior even when all its vertices lie outside the rectangle", () => {
    const f = fixture();
    try {
      const mesh = new Mesh(new PlaneGeometry(20, 20), new MeshBasicMaterial()); mesh.position.set(0, 25, 4); f.root.add(mesh); f.root.updateMatrixWorld(true);
      const r = f.observe(); expect(r.eligible).toBe(false); expect(r.intersections.length).toBeGreaterThan(0);
      mesh.visible = false; expect(f.observe().eligible).toBe(true);
    } finally { f.cleanup(); }
  });
  it("uses whole-object containment and both instance and parent transforms", () => {
    const f = fixture();
    try {
      const mesh = new InstancedMesh(new BoxGeometry(4, 4, 4), new MeshBasicMaterial(), 1); mesh.name = "mapped-tree-control";
      mesh.position.set(10, 25, 5); mesh.setMatrixAt(0, new Matrix4().makeTranslation(-10, 0, 0)); f.root.add(mesh); f.root.updateMatrixWorld(true);
      const r = f.observe(); expect(r.eligible).toBe(false); expect(r.containment.some(w => w.instance === 0)).toBe(true);
      mesh.setMatrixAt(0, new Matrix4().makeTranslation(10, 0, 0)); expect(f.observe().eligible).toBe(true);
    } finally { f.cleanup(); }
  });
  it("respects clipping and draw ranges, and refreshes changed source buffers", () => {
    const f = fixture();
    try {
      const material = new MeshBasicMaterial(), mesh = new Mesh(new PlaneGeometry(20, 20), material); mesh.position.set(0, 25, 4); f.root.add(mesh); f.root.updateMatrixWorld(true);
      expect(f.observe().intersections.length).toBeGreaterThan(0);
      material.clippingPlanes = [new Plane(new Vector3(1, 0, 0), -50)]; expect(f.observe().eligible).toBe(true);
      material.clippingPlanes = []; mesh.geometry.setDrawRange(0, 0); expect(f.observe().eligible).toBe(true);
      mesh.geometry.setDrawRange(0, Infinity); expect(f.observe().intersections.length).toBeGreaterThan(0);
      const p = mesh.geometry.getAttribute("position"); for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + 100); p.needsUpdate = true;
      expect(f.observe().eligible).toBe(true);
    } finally { f.cleanup(); }
  });
  it("identifies unsupported/skinned/displaced or spoofed hooks and nonzero actor demand as unknown", () => {
    const f = fixture();
    try {
      const surface = createSurfaceMaterial("road", worldStyle("satellite")); const mesh = new Mesh(new BoxGeometry(), surface.material); mesh.position.set(50, 25, 0); f.root.add(mesh); f.root.updateMatrixWorld(true);
      expect(f.observe().eligible).toBe(true);
      surface.material.onBeforeCompile = shader => { shader.vertexShader += "\n transformed.x += 5.0;"; };
      expect(f.observe().unknown.some(r => r.reason.includes("vertex hook"))).toBe(true);
      // Its undisplaced bounds are far away. Unsupported transform paths must
      // still refuse eligibility before any world-box broadphase can drop them.
      surface.material.onBeforeCompile = MeshBasicMaterial.prototype.onBeforeCompile;
      mesh.onBeforeRender = () => { /* a future callback could move vertices */ };
      expect(f.observe().unknown.some(r => r.reason.includes("render callback"))).toBe(true);
      f.root.remove(mesh); mesh.geometry.dispose(); surface.dispose();
      const skinned = new SkinnedMesh(new BoxGeometry(), new MeshBasicMaterial()); f.root.add(skinned); f.root.updateMatrixWorld(true); expect(f.observe().unknown.some(r => r.reason.includes("skinned"))).toBe(true);
      skinned.visible = false; const shader = new Mesh(new BoxGeometry(), new ShaderMaterial()); f.root.add(shader); f.root.updateMatrixWorld(true); expect(f.observe().unknown.some(r => r.reason.includes("shader"))).toBe(true);
      shader.visible = false; f.state.population.pedestrians.requested = 1; expect(f.observe().unknown.some(r => r.reason.includes("agents=0"))).toBe(true);
    } finally { f.cleanup(); }
  });
});
