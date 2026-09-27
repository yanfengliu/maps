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
  // A mapped row shares one source ID. Mix its centimetre-quantized X/Z root
  // into the crown-only seed; terrain height and record order cannot reshuffle
  // forms. The separate rotation and colour RNG streams stay unchanged.
  const treeGroups = Array.from({ length: 3 }, () => [] as number[]);
  data.trees.forEach((tree, index) => {
    const rootSeed = Math.imul(Math.round(tree.position.x * 100), 73856093) ^ Math.imul(Math.round(tree.position.z * 100), 19349663);
    const random = createRng(tree.sourceId ^ rootSeed); random(); random();
    treeGroups[Math.floor(random() * treeGroups.length)]!.push(index);
  });
  const pools = treeGroups.flatMap((indices, variant) => {
    if (indices.length === 0) return [];
    const bough = createLeafyBough(variant);
    const crowns = new InstancedMesh(bough.leaves, leafMaterial, indices.length);
    const branches = new InstancedMesh(bough.branches, trunkMaterial, indices.length);
    crowns.name = `vegetation:canopies:${variant}`; branches.name = `vegetation:branches:${variant}`;
    crowns.castShadow = true; crowns.receiveShadow = true; branches.castShadow = true;
    return [{ indices, crowns, branches }];
  });
  const dummy = new Object3D();
  for (const { indices, crowns, branches } of pools) {
    indices.forEach((index, slot) => {
      const tree = data.trees[index]!; const random = createRng(tree.sourceId);
      const trunkHeight = tree.heightM * 0.63;
      dummy.position.set(tree.position.x, tree.position.y + trunkHeight / 2, tree.position.z);
      dummy.scale.set(1, trunkHeight, 1); dummy.rotation.set(0, random() * Math.PI, 0); dummy.updateMatrix(); trunks.setMatrixAt(index, dummy.matrix);
      dummy.position.set(tree.position.x, tree.position.y + tree.heightM * 0.70, tree.position.z);
      dummy.scale.set(tree.crownRadiusM, tree.heightM * 0.30, tree.crownRadiusM);
      dummy.rotation.set(0, random() * Math.PI * 2, 0); dummy.updateMatrix();
      crowns.setMatrixAt(slot, dummy.matrix); branches.setMatrixAt(slot, dummy.matrix);
    });
    crowns.computeBoundingSphere(); branches.computeBoundingSphere(); root.add(branches, crowns);
  }
  trunks.name = "vegetation:trunks"; trunks.castShadow = true;
  if (data.trees.length > 0) { trunks.computeBoundingSphere(); root.add(trunks); }
  const grassGeometry = new BufferGeometry();
  const vertices: number[] = [];
  for (const green of data.greens) for (const point of green.triangles) vertices.push(point.x, point.y + 0.018, point.z);
  grassGeometry.setAttribute("position", new Float32BufferAttribute(vertices, 3)); grassGeometry.computeVertexNormals();
  const grass = new Mesh(grassGeometry, grassMaterial); grass.name = "vegetation:ground-cover"; grass.receiveShadow = true; root.add(grass);
  const setStyle = (next: WorldStyle): void => {
    const base = new Color(next.palette.vegetation).multiplyScalar(1.28);
    for (const { indices, crowns } of pools) {
      indices.forEach((index, slot) => {
        const random = createRng(data.trees[index]!.sourceId);
        crowns.setColorAt(slot, base.clone().multiplyScalar(0.90 + random() * 0.20));
      });
      if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    }
    grassMaterial.color.copy(base).lerp(new Color(next.palette.ground), 0.25);
  };
  setStyle(style);
  return { root, setStyle, counts: { trees: data.trees.length, greenAreas: data.greens.length }, dispose(): void {
    trunks.dispose(); trunks.geometry.dispose();
    pools.forEach(({ crowns, branches }) => { crowns.dispose(); branches.dispose(); crowns.geometry.dispose(); branches.geometry.dispose(); });
    grassGeometry.dispose(); trunkMaterial.dispose(); leafMaterial.dispose(); grassMaterial.dispose(); barriers.dispose(); root.clear();
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

/** Three authored crown forms, not surveyed species. The branches and narrower
 * folded leaves stay inside the previous crown envelope at the same source size.
 */
function createLeafyBough(variant: number): { leaves: BufferGeometry; branches: BufferGeometry } {
  const random = createRng(8143 + variant * 7919);
  const vertices: number[] = []; const colours: number[] = [];
  const branchParts: BufferGeometry[] = [];
  const up = new Vector3(0, 1, 0);
  // Balanced, upright and spreading; their asymmetry also survives rotation.
  const width = [0.98, 0.87, 1.04][variant]!;
  const height = [1.00, 1.06, 0.92][variant]!;
  const branch = (a: Vector3, b: Vector3, radius: number): void => {
    const direction = b.clone().sub(a);
    const part = new CylinderGeometry(radius * 0.45, radius, direction.length(), 5);
    const transform = new Object3D(); transform.position.copy(a).add(b).multiplyScalar(0.5);
    transform.quaternion.setFromUnitVectors(up, direction.normalize()); transform.updateMatrix(); part.applyMatrix4(transform.matrix);
    branchParts.push(part);
  };
  branch(new Vector3(0, -0.95, 0), new Vector3(0.025, 0.36, -0.018), 0.055);
  for (let fork = 0; fork < 3; fork += 1) {
    const bearing = fork * Math.PI * 2 / 3 + random() * 0.32;
    const reach = (0.48 + random() * 0.12) * width;
    const start = new Vector3(0, -0.62 + fork * 0.11, 0);
    const joint = new Vector3(Math.cos(bearing) * reach * 0.50, -0.10 + fork * 0.06, Math.sin(bearing) * reach * 0.50);
    const tip = new Vector3(Math.cos(bearing) * reach, (0.60 + random() * 0.12) * height, Math.sin(bearing) * reach);
    branch(start, joint, 0.043); branch(joint, tip, 0.026);
    for (let cluster = 0; cluster < 18; cluster += 1) {
      const level = Math.floor(cluster / 3) / 5;
      const angle = bearing + (cluster % 3 - 1) * 0.38 + (random() - 0.5) * 0.22;
      const spread = (0.36 + Math.sin(level * Math.PI) * 0.30 + random() * 0.065) * width;
      const centre = new Vector3(Math.cos(angle) * spread, (-0.57 + level * 1.22 + random() * 0.065) * height, Math.sin(angle) * spread);
      const attachment = level < 0.35
        ? start.clone().lerp(joint, level / 0.35)
        : joint.clone().lerp(tip, (level - 0.35) / 0.65);
      branch(attachment, centre, 0.009 + (1 - level) * 0.003);
      const clusterTint = 0.84 + random() * 0.16;
      for (let leaf = 0; leaf < 60; leaf += 1) {
        const theta = random() * Math.PI * 2; const y = random() * 2 - 1;
        const radius = 0.10 + Math.cbrt(random()) * 0.23; const horizontal = Math.sqrt(1 - y * y);
        const point = centre.clone().add(new Vector3(Math.cos(theta) * horizontal, y * 0.75, Math.sin(theta) * horizontal).multiplyScalar(radius));
        const normalAngle = random() * Math.PI * 2;
        const normalHeight = 0.15 + random() * 0.80;
        const leafNormal = new Vector3(Math.cos(normalAngle) * Math.sqrt(1 - normalHeight * normalHeight), normalHeight, Math.sin(normalAngle) * Math.sqrt(1 - normalHeight * normalHeight));
        const direction = new Vector3().crossVectors(up, leafNormal).normalize().applyAxisAngle(leafNormal, random() * Math.PI * 2);
        const side = new Vector3().crossVectors(leafNormal, direction).normalize();
        const length = 0.070 + random() * 0.026;
        const halfWidth = length * (0.30 + random() * 0.07);
        const ridge = point.clone().addScaledVector(leafNormal, halfWidth * 0.28);
        const rim = [point.clone().addScaledVector(direction, length), point.clone().addScaledVector(side, halfWidth), point.clone().addScaledVector(direction, -length), point.clone().addScaledVector(side, -halfWidth)];
        const tint = clusterTint + (random() - 0.5) * 0.055;
        // Four small folded triangles replace the broad six-triangle plates.
        for (let segment = 0; segment < rim.length; segment++) for (const corner of [ridge, rim[segment]!, rim[(segment + 1) % rim.length]!]) {
          vertices.push(corner.x, corner.y, corner.z); colours.push(tint, tint, tint * 0.93);
        }
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
