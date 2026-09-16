/** Street paint and hardware consume OSM physical source features. Movement
 * routes never become sidewalk surfaces or inferred poles. Fixture dimensions
 * and unsurveyed hardware positions come from the separate validated recipe.
 */
import { BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import type { SignalSnapshot } from "../network/signals.js";
import type { NetworkData, WorldPoint } from "../world/network-data.js";
import type { WorldStyle } from "../world/styles.js";
import type { ControlHardwarePlacement } from "../world/control-hardware.js";
import { PAINT_SUPPORT_BOUNDS, type PaintSupport } from "./paint-support.js";

export interface PaintPlacement {
  sourceId: string;
  kind: "crossing" | "tactile";
  pathIndex: number;
  partIndex: number;
  start: WorldPoint;
  end: WorldPoint;
  status: "placed" | "unplaced";
  reason: string;
  vertexStart: number;
  vertexCount: number;
}

export interface StreetDetails {
  root: Group;
  setStyle(style: WorldStyle): void;
  updateSignals(signals: readonly SignalSnapshot[]): void;
  paintPlacements: readonly PaintPlacement[];
  counts: { crossings: number; stripes: number; unplacedStripes: number; unplacedPaintFeatures: number; signalHeads: number; guardrailPosts: number; placedControls: number; unplacedControls: number };
  dispose(): void;
}

export function pointAlong(points: readonly WorldPoint[], distance: number): { point: WorldPoint; direction: WorldPoint } {
  let remaining = Math.max(0, distance);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!; const b = points[index]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length <= 1e-6) continue;
    if (remaining <= length || index === points.length - 1) {
      const t = Math.min(1, remaining / length);
      return { point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, direction: { x: (b.x - a.x) / length, y: 0, z: (b.z - a.z) / length } };
    }
    remaining -= length;
  }
  throw new Error("A street detail path has no nonzero segment; provide at least two distinct ground points.");
}

class SurfaceBuilder {
  vertices: number[] = [];
  constructor(private readonly heightAt?: PaintSupport) {}
  /** Finite support check: <=0.25m grid, triangle vertices, edge midpoints and
   * centroids. A passing stripe does not establish support at every interior XY.
   * No partial stripe is emitted when one sampled point or edge is unsuitable.
   */
  rectangle(a: WorldPoint, b: WorldPoint, width: number, lift: number): string | null {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 0.0001) return "degenerate source segment";
    if (!this.heightAt) return "no road/pavement support query supplied";
    const nx = -(b.z - a.z) / length; const nz = (b.x - a.x) / length;
    type Sample = { x: number; y: number; z: number; expected: number };
    const sample = (x: number, z: number, expected: number): Sample | undefined => {
      const y = this.heightAt!(x, z, expected);
      return y !== undefined && Number.isFinite(y) && Math.abs(y - expected) <= PAINT_SUPPORT_BOUNDS.sourceDeviationM ? { x, y, z, expected } : undefined;
    };
    const point = (p: WorldPoint, side: number): Sample | undefined => sample(p.x + nx * side, p.z + nz * side, p.y);
    const pending: number[] = [];
    const triangle = (points: readonly Sample[]): string | null => {
      for (let i = 0; i < 3; i++) {
        const p = points[i]!, q = points[(i + 1) % 3]!;
        if (Math.abs(p.y - q.y) > PAINT_SUPPORT_BOUNDS.edgeRiseRun * Math.hypot(p.x - q.x, p.z - q.z) + 1e-6) return "sampled triangle edge exceeds 0.5 rise/run";
      }
      for (const weights of [[.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3]]) {
        const blend = (key: keyof Sample): number => points.reduce((sum, p, i) => sum + p[key] * weights[i]!, 0);
        const actual = sample(blend("x"), blend("z"), blend("expected"));
        if (!actual) return "edge/interior sample lacks finite support within 0.5m of source elevation";
        if (Math.abs(actual.y - blend("y")) > PAINT_SUPPORT_BOUNDS.sampledResidualM) return "edge/interior support differs from sampled triangle plane by more than 0.04m";
      }
      for (const p of points) pending.push(p.x, p.y + lift, p.z);
      return null;
    };
    const across = Math.ceil(width / PAINT_SUPPORT_BOUNDS.spacingM); const along = Math.ceil(length / PAINT_SUPPORT_BOUNDS.spacingM);
    for (let step = 0; step < along; step++) {
      const at = (t: number): WorldPoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
      const start = at(step / along); const end = at((step + 1) / along);
      for (let column = 0; column < across; column++) {
        const left = -width / 2 + column * width / across; const right = -width / 2 + (column + 1) * width / across;
        const p0 = point(start, left); const p1 = point(start, right); const p2 = point(end, right); const p3 = point(end, left);
        if (!p0 || !p1 || !p2 || !p3) return "vertex lacks finite support within 0.5m of source elevation";
        const failed = triangle([p0, p1, p2]) ?? triangle([p0, p2, p3]);
        if (failed) return failed;
      }
    }
    this.vertices.push(...pending);
    return null;
  }
  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.vertices, 3));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    return geometry;
  }
}

export function createStreetDetails(network: NetworkData, style: WorldStyle, heightAt?: PaintSupport, hardware: readonly ControlHardwarePlacement[] = []): StreetDetails {
  const root = new Group(); root.name = "streets:network-detail";
  const paint = new SurfaceBuilder(heightAt); const tactile = new SurfaceBuilder(heightAt);
  let stripes = 0; let crossings = 0;
  const paintPlacements: PaintPlacement[] = [];
  const placePaint = (builder: SurfaceBuilder, sourceId: string, kind: PaintPlacement["kind"], pathIndex: number, partIndex: number, start: WorldPoint, end: WorldPoint, width: number, lift: number): boolean => {
    const vertexStart = builder.vertices.length / 3, failure = builder.rectangle(start, end, width, lift);
    paintPlacements.push({ sourceId, kind, pathIndex, partIndex, start: { ...start }, end: { ...end }, status: failure ? "unplaced" : "placed", reason: failure ?? "Bounded source-level support at vertices, edge midpoints and centroids; finite sampling only.", vertexStart, vertexCount: builder.vertices.length / 3 - vertexStart });
    return failure === null;
  };
  const postMatrices: Matrix4[] = []; const headMatrices: Matrix4[] = []; const stopMatrices: Matrix4[] = [];
  const lenses: { matrix: Matrix4; group: string; colour: "red" | "amber" | "green" }[] = [];
  const placedPosts = new Set<string>();
  const dummy = new Object3D();
  const matrix = (point: WorldPoint, scale: [number, number, number], angle = 0): Matrix4 => {
    dummy.position.set(point.x, point.y, point.z); dummy.rotation.set(0, angle, 0); dummy.scale.set(...scale); dummy.updateMatrix(); return dummy.matrix.clone();
  };
  const post = (point: WorldPoint, height = 0.9): void => {
    const key = `${point.x.toFixed(3)}:${point.z.toFixed(3)}:${height.toFixed(3)}`;
    if (placedPosts.has(key)) return;
    placedPosts.add(key);
    postMatrices.push(matrix({ ...point, y: point.y + height / 2 }, [0.065, height, 0.065]));
  };
  const head = (base: WorldPoint, point: WorldPoint, direction: WorldPoint, group: string, pedestrian: boolean): void => {
    const armY = point.y + .25;
    post(base, armY - base.y);
    const delta = new Vector3(point.x - base.x, 0, point.z - base.z);
    if (delta.length() > .01) {
      dummy.position.set((base.x + point.x) / 2, armY, (base.z + point.z) / 2);
      dummy.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize()); dummy.scale.set(.065, delta.length(), .065); dummy.updateMatrix(); postMatrices.push(dummy.matrix.clone());
    }
    const angle = Math.atan2(-direction.x, -direction.z);
    headMatrices.push(matrix(point, pedestrian ? [0.34, 0.8, 0.24] : [1.05, 0.35, 0.3], angle));
    const right = { x: Math.cos(angle), z: -Math.sin(angle) };
    for (const [index, colour] of (pedestrian ? ["red", "green"] : ["green", "amber", "red"]).entries()) {
      const side = pedestrian ? 0 : (index - 1) * 0.30;
      const centre = { x: point.x + right.x * side - direction.x * 0.18, y: point.y + (pedestrian ? 0.19 - index * 0.38 : 0), z: point.z + right.z * side - direction.z * 0.18 };
      lenses.push({ matrix: matrix(centre, [0.12, 0.12, 0.045], angle), group, colour: colour as "red" | "amber" | "green" });
    }
  };

  if (!network.physical) throw new Error("The movement network has no physical source features. Re-run npm run data:network before drawing crossing paint or traffic hardware.");
  const lengthOf = (points: readonly WorldPoint[]): number => points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index]!.x, point.z - points[index]!.z), 0);
  for (const crossing of network.physical.crossings) {
    if (crossing.markings !== "zebra") continue;
    crossings++;
    for (const [pathIndex, points] of crossing.paths.entries()) {
      const length = lengthOf(points);
      let partIndex = 0;
      for (let distance = 0.4; distance + 0.5 < length; distance += 1.05) {
        if (placePaint(paint, crossing.id, "crossing", pathIndex, partIndex++, pointAlong(points, distance).point, pointAlong(points, distance + 0.5).point, Math.max(2.4, Math.min(7.5, crossing.widthM)), 0.06)) stripes++;
      }
    }
  }
  for (const path of network.physical.tactilePaths) {
    if (path.extent !== "path") continue;
    for (const [pathIndex, points] of path.paths.entries()) for (let index = 1; index < points.length; index++) placePaint(tactile, path.id, "tactile", pathIndex, index - 1, points[index - 1]!, points[index]!, 0.3, 0.07);
  }
  const lanes = new Map(network.lanes.map((edge) => [edge.id, edge]));
  const placements = new Map(hardware.map(record => [record.sourceId, record]));
  if (placements.size !== network.physical.trafficControls.length) throw new Error("Street hardware has incomplete source accounting; load the validated control-hardware.json generated by npm run data:hardware before drawing poles.");
  for (const control of network.physical.trafficControls) {
    const placement = placements.get(control.id);
    if (!placement) throw new Error(`Street hardware is missing ${control.id}; rebuild npm run data:hardware against this network.`);
    if (placement.status === "unplaced") continue;
    const base = placement.base!, point = placement.head!, travel = placement.direction!;
    const entry = control.entryEdgeIds.map((id) => lanes.get(id)).find((edge) => edge?.signalGroupId);
    if (control.kind === "stop") {
      post(base, point.y - base.y + .15);
      stopMatrices.push(matrix(point, [0.76, 0.76, 1], Math.atan2(-travel.x, -travel.z)));
      continue;
    }
    if (control.kind !== "traffic_signals") continue;
    const pedestrian = control.sourceTags["traffic_signals"] === "pedestrian";
    const junction = network.junctions.find((item) => item.id === control.controllerId);
    const group = pedestrian ? junction?.pedestrianGroup : entry?.signalGroupId;
    head(base, point, travel, group ?? `unconnected:${control.id}`, pedestrian);
  }

  const paintMaterial = new MeshStandardMaterial({ color: new Color(style.palette.sidewalk).lerp(new Color(0xffffff), 0.88), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const tactileMaterial = new MeshStandardMaterial({ color: 0xcabd75, roughness: 0.9 });
  const metal = new MeshStandardMaterial({ color: 0x636c69, roughness: 0.53, metalness: 0.35 });
  const headMaterial = new MeshStandardMaterial({ color: 0x343b3e, roughness: 0.72 });
  for (const [builder, material, name] of [[paint, paintMaterial, "paint"], [tactile, tactileMaterial, "tactile-paving"]] as const) {
    const mesh = new Mesh(builder.geometry(), material); mesh.name = `streets:${name}`; mesh.receiveShadow = true; root.add(mesh);
  }
  const instances = (geometry: BufferGeometry, material: MeshStandardMaterial | MeshBasicMaterial, matrices: Matrix4[], name: string): InstancedMesh => {
    const mesh = new InstancedMesh(geometry, material, matrices.length); matrices.forEach((entry, index) => mesh.setMatrixAt(index, entry));
    mesh.name = name; mesh.computeBoundingSphere(); root.add(mesh); return mesh;
  };
  instances(new CylinderGeometry(1, 1, 1, 6), metal, postMatrices, "streets:posts");
  instances(new BoxGeometry(1, 1, 1), headMaterial, headMatrices, "streets:signal-heads");
  let stopTexture: CanvasTexture | null = null;
  if (stopMatrices.length > 0) {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The canvas needed for mapped stop signs was unavailable; a 2D context is required to label their Japanese stop indication.");
    context.beginPath(); context.moveTo(14, 22); context.lineTo(242, 22); context.lineTo(128, 242); context.closePath();
    context.fillStyle = "#b73438"; context.fill(); context.strokeStyle = "#f8f7ed"; context.lineWidth = 9; context.stroke();
    context.fillStyle = "#fffdf5"; context.font = "bold 45px sans-serif"; context.textAlign = "center"; context.fillText("止まれ", 128, 103);
    stopTexture = new CanvasTexture(canvas); stopTexture.colorSpace = SRGBColorSpace;
    instances(new PlaneGeometry(1, 1), new MeshStandardMaterial({ map: stopTexture, alphaTest: 0.5, roughness: 0.8 }), stopMatrices, "streets:mapped-stop-signs");
  }
  const lensMesh = instances(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: 0xffffff }), lenses.map((entry) => entry.matrix), "streets:signal-lenses");
  const colour = new Color(); let signature = "";
  const updateSignals = (states: readonly SignalSnapshot[]): void => {
    const key = states.map((entry) => `${entry.activeGroup}:${entry.amberGroup}:${entry.stage}`).join("|");
    if (key === signature && signature !== "") return; signature = key;
    const active = new Set(states.map((state) => state.activeGroup));
    const amber = new Set(states.map((state) => state.amberGroup));
    for (let index = 0; index < lenses.length; index += 1) {
      const lens = lenses[index]!;
      const green = active.has(lens.group);
      const isAmber = amber.has(lens.group);
      const on = lens.colour === "green" ? green : lens.colour === "amber" ? isAmber : !green && !isAmber;
      colour.setHex(lens.colour === "red" ? 0xff3828 : lens.colour === "amber" ? 0xffac31 : 0x45efa8).multiplyScalar(on ? 1.5 : 0.025);
      lensMesh.setColorAt(index, colour);
    }
    if (lensMesh.instanceColor) lensMesh.instanceColor.needsUpdate = true;
  };
  updateSignals([]);
  return { root, paintPlacements, counts: { crossings, stripes, unplacedStripes: paintPlacements.filter(p => p.kind === "crossing" && p.status === "unplaced").length, unplacedPaintFeatures: new Set(paintPlacements.filter(p => p.status === "unplaced").map(p => p.sourceId)).size, signalHeads: headMatrices.length, guardrailPosts: 0, placedControls: hardware.filter(r => r.status === "placed").length, unplacedControls: hardware.filter(r => r.status === "unplaced").length }, updateSignals,
    setStyle(next): void { paintMaterial.color.setHex(next.palette.sidewalk).lerp(new Color(0xffffff), 0.88); },
    dispose(): void {
      const materials = new Set<MeshStandardMaterial | MeshBasicMaterial>();
      root.traverse((object) => { if (object instanceof Mesh) { object.geometry.dispose(); const list = Array.isArray(object.material) ? object.material : [object.material]; list.forEach((m) => materials.add(m)); } });
      materials.forEach((material) => material.dispose()); root.clear();
      stopTexture?.dispose();
    },
  };
}
