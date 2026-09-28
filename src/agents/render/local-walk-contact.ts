/** Authored contact shading for the private local walker, not support evidence. */
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, ShaderMaterial, Vector3, Vector4, type Object3D } from 'three';
import type { WorldStyle } from '../../world/styles.js';
import type { LocalGaitSample } from '../population/local-walk-gait.js';
import { createLocalFloor, type LocalContext, type Triangle } from '../population/local-walk-support.js';
import type { LocalRig } from './local-walk-rig.js';
import { setAgentNormalMaterial, deleteAgentNormalMaterial } from './pass-materials.js';

const vertexShader = `
  varying vec3 supportPosition;
  #include <clipping_planes_pars_vertex>
  void main() {
    supportPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }`;
const fragmentShader = `
  uniform vec4 contactFrame[2];
  uniform vec3 contactSize[2];
  uniform vec3 supportPlane[2];
  varying vec3 supportPosition;
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    float shade = 0.0;
    for (int side = 0; side < 2; side++) {
      vec2 delta = supportPosition.xz - contactFrame[side].xy;
      float c = contactFrame[side].z, s = contactFrame[side].w;
      vec2 local = vec2(c * delta.x - s * delta.y, s * delta.x + c * delta.y);
      vec2 scaled = local / contactSize[side].xy;
      float radius2 = dot(scaled, scaled);
      float planeY = dot(supportPlane[side], vec3(supportPosition.xz, 1.0));
      float layer = 1.0 - smoothstep(0.001, 0.004, abs(supportPosition.y - planeY));
      float opacity = contactSize[side].z * (1.0 - smoothstep(0.0, 1.0, radius2)) * layer;
      shade = max(shade, opacity);
    }
    if (shade < 0.001) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, shade);
  }`;

/** Zero at 3 cm clearance or 18 m distance; no extra animation clock. */
export function contactFade(clearanceM: number, distanceM: number): number {
  const smooth = (a: number, b: number, value: number): number => {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return (1 - smooth(.002, .03, Math.max(0, clearanceM))) * (1 - smooth(12, 18, distanceM));
}

/** Original triangles only; neither fills gaps nor changes support heights. */
function receiverTriangles(context: LocalContext): Triangle[] {
  const points = context.legs.flatMap(leg => [leg.from, leg.to]);
  const minX = Math.min(...points.map(p => p.x)) - 1, maxX = Math.max(...points.map(p => p.x)) + 1;
  const minZ = Math.min(...points.map(p => p.z)) - 1, maxZ = Math.max(...points.map(p => p.z)) + 1;
  return context.triangles.filter(t => Math.max(t.a.x, t.b.x, t.c.x) >= minX && Math.min(t.a.x, t.b.x, t.c.x) <= maxX
    && Math.max(t.a.z, t.b.z, t.c.z) >= minZ && Math.min(t.a.z, t.b.z, t.c.z) <= maxZ);
}

export class LocalWalkContact {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  readonly triangleCount: number;
  private readonly floor;
  private readonly triangles;
  private readonly soles;
  private readonly frames = [new Vector4(), new Vector4()];
  private readonly sizes = [new Vector3(1, 1, 0), new Vector3(1, 1, 0)];
  private readonly planes = [new Vector3(), new Vector3()];
  private readonly normalMaterial = new ShaderMaterial({ vertexShader, fragmentShader: 'void main() { discard; }', visible: false, depthWrite: false, side: DoubleSide });
  private strength = .28;
  private disposed = false;

  constructor(private readonly context: LocalContext, rig: LocalRig) {
    this.floor = createLocalFloor(context);
    this.triangles = new Map(context.triangles.map(t => [t.index, t]));
    this.soles = rig.packet.soles.map(ids => {
      const points = ids.map(id => rig.byId.get(id)!.idle);
      const minX = Math.min(...points.map(p => p[0]!)), maxX = Math.max(...points.map(p => p[0]!));
      const minZ = Math.min(...points.map(p => p[2]!)), maxZ = Math.max(...points.map(p => p[2]!));
      return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2,
        radiusX: (maxX - minX) * context.scale / 2 + .035, radiusZ: (maxZ - minZ) * context.scale / 2 + .035 };
    });
    const receivers = receiverTriangles(context);
    this.triangleCount = receivers.length;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(receivers.flatMap(t => [t.a, t.b, t.c].flatMap(p => [p.x, p.y, p.z])), 3));
    const material = new ShaderMaterial({ vertexShader, fragmentShader,
      uniforms: { contactFrame: { value: this.frames }, contactSize: { value: this.sizes }, supportPlane: { value: this.planes } },
      transparent: true, depthTest: true, depthWrite: false, side: DoubleSide, forceSinglePass: true,
      // Match sidewalk slope offset and precede its depth by one constant unit.
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5, clipping: true, toneMapped: false });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'local-walk-contact-presentation';
    this.mesh.matrixAutoUpdate = false;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // The helper must never introduce an AO/depth occluder or a cast shadow.
    setAgentNormalMaterial(this.mesh, this.normalMaterial);
  }

  update(sample: LocalGaitSample, actorRoot: Object3D, distanceM: number): void {
    if (this.disposed) return;
    // Receiver positions are world coordinates, independent of the actor root.
    this.mesh.matrix.copy(actorRoot.matrixWorld).invert();
    this.mesh.matrixWorldNeedsUpdate = true;
    const context = this.context;
    for (let side = 0; side < 2; side++) {
      const size = this.sizes[side]!, foot = sample.gait.feet[side], sole = this.soles[side]!;
      size.z = 0;
      const x = context.origin.x + foot.p[0] * context.scale, z = context.origin.z + foot.p[2] * context.scale;
      let support: ReturnType<typeof this.floor.floorAt>;
      try { support = this.floor.floorAt(x, z); } catch { continue; }
      const triangle = this.triangles.get(support.patch.triangles[0]!);
      if (!triangle) continue;
      const clearance = context.origin.y + (foot.p[1] - foot.ground) * context.scale - support.y;
      const c = Math.cos(foot.yaw), s = Math.sin(foot.yaw);
      const dx = (sole.x - foot.home[0]) * context.scale, dz = (sole.z - foot.home[2]) * context.scale;
      this.frames[side]!.set(x + c * dx + s * dz, z - s * dx + c * dz, c, s);
      this.planes[side]!.set(triangle.dx, triangle.dz, triangle.a.y - triangle.dx * triangle.a.x - triangle.dz * triangle.a.z);
      size.set(sole.radiusX, sole.radiusZ, this.strength * contactFade(clearance, distanceM));
    }
    this.mesh.visible = this.sizes.some(size => size.z > .001);
  }

  setStyle(style: WorldStyle): void { this.strength = style.facade === 'photographic' ? .28 : .23; }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    deleteAgentNormalMaterial(this.mesh);
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.normalMaterial.dispose();
  }
}
