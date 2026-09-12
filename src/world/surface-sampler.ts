import type { MeshData } from "./mesh.ts";

/** Indexed barycentric query of the scene's existing triangles; no new terrain approximation. */
export function surfaceSampler(mesh: MeshData, chooseHighest = false): (x: number, z: number) => number | undefined {
  const cells = new Map<string, number[]>();
  const cellSize = 10;
  const p = mesh.positions, indices = mesh.indices;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3, b = indices[i + 1]! * 3, c = indices[i + 2]! * 3;
    const minX = Math.floor(Math.min(p[a]!, p[b]!, p[c]!) / cellSize);
    const maxX = Math.floor(Math.max(p[a]!, p[b]!, p[c]!) / cellSize);
    const minZ = Math.floor(Math.min(p[a + 2]!, p[b + 2]!, p[c + 2]!) / cellSize);
    const maxZ = Math.floor(Math.max(p[a + 2]!, p[b + 2]!, p[c + 2]!) / cellSize);
    for (let x = minX; x <= maxX; x += 1) for (let z = minZ; z <= maxZ; z += 1) {
      const key = `${x},${z}`;
      const bucket = cells.get(key);
      if (bucket) bucket.push(i); else cells.set(key, [i]);
    }
  }
  return (x, z) => {
    let height: number | undefined;
    for (const i of cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) ?? []) {
      const a = indices[i]! * 3, b = indices[i + 1]! * 3, c = indices[i + 2]! * 3;
      const ax = p[a]!, az = p[a + 2]!, bx = p[b]!, bz = p[b + 2]!, cx = p[c]!, cz = p[c + 2]!;
      const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(denominator) < 1e-12) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
      const w = 1 - u - v;
      if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
      const candidate = u * p[a + 1]! + v * p[b + 1]! + w * p[c + 1]!;
      if (!chooseHighest) return candidate;
      height = Math.max(height ?? -Infinity, candidate);
    }
    return height;
  };
}

