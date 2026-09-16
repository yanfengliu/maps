/** Actual mapped tree locations and green areas, with authored crown geometry.
 * Sizes are source values when available and seeded estimates otherwise.
 */
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DECORATIONS_FILE, type DecorationData } from "../world/decorations.js";
import { createRng } from "../world/rng.js";
import type { WorldStyle } from "../world/styles.js";

export interface Vegetation { root: Group; setStyle(style: WorldStyle): void; counts: { trees: number; greenAreas: number }; dispose(): void }

export async function createVegetation(style: WorldStyle): Promise<Vegetation> {
  const response = await fetch(DECORATIONS_FILE);
  if (!response.ok) throw new Error(`${DECORATIONS_FILE} returned HTTP ${response.status}; run node tools/data/fetch-decorations.ts then node tools/scene/build-decorations.ts to prepare mapped vegetation.`);
  const data = await response.json() as DecorationData;
  if (data.version !== 1 || !Array.isArray(data.trees) || !Array.isArray(data.greens) || !Array.isArray(data.barriers)) throw new Error(`${DECORATIONS_FILE} has an unsupported vegetation or barrier format; rebuild decorations from the cached source.`);
  return vegetationFromData(data, style);
}

export function vegetationFromData(data: DecorationData, style: WorldStyle): Vegetation {
  const root = new Group(); root.name = "vegetation:osm";
  const barriers = mappedBarriers(data.barriers);
  root.add(barriers.root);
  const trunkMaterial = new MeshStandardMaterial({ color: 0x65584b, roughness: 0.96 });
  const leafMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.87, side: DoubleSide, vertexColors: true });
  const grassMaterial = new MeshStandardMaterial({ roughness: 0.98, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const trunks = new InstancedMesh(new CylinderGeometry(0.14, 0.22, 1, 7), trunkMaterial, data.trees.length);
  const bough = createLeafyBough();
  const crowns = new InstancedMesh(bough.leaves, leafMaterial, data.trees.length);
  const branches = new InstancedMesh(bough.branches, trunkMaterial, data.trees.length);
  const dummy = new Object3D();
  for (let index = 0; index < data.trees.length; index += 1) {
    const tree = data.trees[index]!; const random = createRng(tree.sourceId);
    const trunkHeight = tree.heightM * 0.63;
    dummy.position.set(tree.position.x, tree.position.y + trunkHeight / 2, tree.position.z);
    dummy.scale.set(1, trunkHeight, 1); dummy.rotation.set(0, random() * Math.PI, 0); dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix);
    dummy.position.set(tree.position.x, tree.position.y + tree.heightM * 0.70, tree.position.z);
    dummy.scale.set(tree.crownRadiusM, tree.heightM * 0.30, tree.crownRadiusM);
    dummy.rotation.set(0, random() * Math.PI * 2, 0); dummy.updateMatrix();
    crowns.setMatrixAt(index, dummy.matrix); branches.setMatrixAt(index, dummy.matrix);
  }
  trunks.name = "vegetation:trunks"; crowns.name = "vegetation:canopies";
  trunks.castShadow = true; crowns.castShadow = true; crowns.receiveShadow = true;
  branches.name = "vegetation:branches"; branches.castShadow = true;
  trunks.computeBoundingSphere(); crowns.computeBoundingSphere(); branches.computeBoundingSphere(); root.add(trunks, branches, crowns);
  const grassGeometry = new BufferGeometry();
  const vertices: number[] = [];
  for (const green of data.greens) for (const point of green.triangles) vertices.push(point.x, point.y + 0.018, point.z);
  grassGeometry.setAttribute("position", new Float32BufferAttribute(vertices, 3)); grassGeometry.computeVertexNormals();
  const grass = new Mesh(grassGeometry, grassMaterial); grass.name = "vegetation:ground-cover"; grass.receiveShadow = true; root.add(grass);
  const setStyle = (next: WorldStyle): void => {
    const base = new Color(next.palette.vegetation).multiplyScalar(1.28);
    for (let index = 0; index < data.trees.length; index += 1) {
      const random = createRng(data.trees[index]!.sourceId);
      crowns.setColorAt(index, base.clone().multiplyScalar(0.90 + random() * 0.20));
    }
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    grassMaterial.color.copy(base).lerp(new Color(next.palette.ground), 0.25);
  };
  setStyle(style);
  return { root, setStyle, counts: { trees: data.trees.length, greenAreas: data.greens.length }, dispose(): void {
    trunks.geometry.dispose(); crowns.geometry.dispose(); branches.geometry.dispose(); grassGeometry.dispose(); trunkMaterial.dispose(); leafMaterial.dispose(); grassMaterial.dispose(); barriers.dispose(); root.clear();
  } };
}

function mappedBarriers(barriers: DecorationData["barriers"]): { root: Group; dispose(): void } {
  const root = new Group(); root.name = "streets:mapped-barriers";
  const postMatrices: Matrix4[] = []; const railMatrices: Matrix4[] = [];
  const dummy = new Object3D(); const forward = new Vector3(0, 0, 1);
  for (const barrier of barriers) {
    for (const point of barrier.points) {
      dummy.position.set(point.x, point.y + barrier.heightM / 2, point.z);
      dummy.scale.set(barrier.kind === "bollard" ? 0.09 : 0.045, barrier.heightM, barrier.kind === "bollard" ? 0.09 : 0.045);
      dummy.quaternion.identity(); dummy.updateMatrix(); postMatrices.push(dummy.matrix.clone());
    }
    for (let index = 1; index < barrier.points.length; index++) {
      const a = barrier.points[index - 1]!; const b = barrier.points[index]!;
      const direction = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z); const length = direction.length();
      if (length < 0.001) continue;
      for (const height of [0.45, 0.9]) {
        dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + barrier.heightM * height, (a.z + b.z) / 2);
        dummy.quaternion.setFromUnitVectors(forward, direction.clone().normalize()); dummy.scale.set(0.055, 0.055, length); dummy.updateMatrix(); railMatrices.push(dummy.matrix.clone());
      }
    }
  }
  const material = new MeshStandardMaterial({ color: 0x919b95, roughness: 0.55, metalness: 0.3 });
  const posts = new InstancedMesh(new CylinderGeometry(1, 1, 1, 8), material, postMatrices.length);
  const rails = new InstancedMesh(new BoxGeometry(1, 1, 1), material, railMatrices.length);
  for (const [mesh, matrices] of [[posts, postMatrices], [rails, railMatrices]] as const) {
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix)); mesh.computeBoundingSphere(); mesh.castShadow = true; root.add(mesh);
  }
  return { root, dispose(): void { posts.geometry.dispose(); rails.geometry.dispose(); material.dispose(); root.clear(); } };
}

/** Shared branched crown with individual folded leaves. A tree's silhouette has
 * gaps and twigs; it is never an opaque sphere, in either world style.
 */
function createLeafyBough(): { leaves: BufferGeometry; branches: BufferGeometry } {
  const random = createRng(8143);
  const vertices: number[] = []; const colours: number[] = [];
  const branchParts: BufferGeometry[] = [];
  const up = new Vector3(0, 1, 0);
  const branch = (a: Vector3, b: Vector3, radius: number): void => {
    const direction = b.clone().sub(a);
    const part = new CylinderGeometry(radius * 0.45, radius, direction.length(), 5);
    const transform = new Object3D(); transform.position.copy(a).add(b).multiplyScalar(0.5);
    transform.quaternion.setFromUnitVectors(up, direction.normalize()); transform.updateMatrix(); part.applyMatrix4(transform.matrix);
    branchParts.push(part);
  };
  branch(new Vector3(0, -0.95, 0), new Vector3(0, 0.68, 0), 0.055);
  for (let cluster = 0; cluster < 46; cluster += 1) {
    const angle = cluster * 2.399963;
    const height = -0.65 + random() * 1.40;
    const spread = Math.sqrt(Math.max(0.1, 1 - height * height)) * (0.48 + random() * 0.30);
    const centre = new Vector3(Math.cos(angle) * spread, height, Math.sin(angle) * spread);
    const joint = new Vector3(centre.x * 0.42, centre.y - 0.18, centre.z * 0.42);
    branch(new Vector3(0, centre.y - 0.32, 0), joint, 0.018);
    branch(joint, centre, 0.008);
    for (let leaf = 0; leaf < 48; leaf += 1) {
      const theta = random() * Math.PI * 2; const y = random() * 2 - 1;
      const radius = 0.12 + random() * 0.34; const horizontal = Math.sqrt(1 - y * y);
      const point = centre.clone().add(new Vector3(Math.cos(theta) * horizontal, y * 0.75, Math.sin(theta) * horizontal).multiplyScalar(radius));
      // Leaf planes span a hemisphere instead of all lying nearly horizontal.
      // Their slight dome supplies curved surface normals inside each cluster.
      const normalAngle = random() * Math.PI * 2;
      const normalHeight = 0.15 + random() * 0.80;
      const leafNormal = new Vector3(Math.cos(normalAngle) * Math.sqrt(1 - normalHeight * normalHeight), normalHeight, Math.sin(normalAngle) * Math.sqrt(1 - normalHeight * normalHeight));
      const direction = new Vector3().crossVectors(up, leafNormal).normalize().applyAxisAngle(leafNormal, random() * Math.PI * 2);
      const side = new Vector3().crossVectors(leafNormal, direction).normalize();
      const size = 0.082 + random() * 0.028;
      const centrePoint = point.clone().addScaledVector(leafNormal, size * 0.12);
      const rim = Array.from({ length: 6 }, (_, segment) => {
        const angle = segment / 6 * Math.PI * 2;
        return point.clone().addScaledVector(direction, Math.cos(angle) * size).addScaledVector(side, Math.sin(angle) * size * 0.72);
      });
      const tint = 0.73 + random() * 0.38;
      for (let segment = 0; segment < rim.length; segment++) for (const corner of [centrePoint, rim[segment]!, rim[(segment + 1) % rim.length]!]) {
        vertices.push(corner.x, corner.y, corner.z); colours.push(tint, tint, tint * 0.93);
      }
    }
  }
  const leaves = new BufferGeometry();
  leaves.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  leaves.setAttribute("color", new Float32BufferAttribute(colours, 3)); leaves.computeVertexNormals();
  const branches = mergeGeometries(branchParts);
  branchParts.forEach((part) => part.dispose());
  return { leaves, branches };
}
