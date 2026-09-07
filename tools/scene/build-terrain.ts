/**
 * Turn PLATEAU's 2.5 m terrain TIN into the scene's ground. Plan item 11.
 *
 * Shibuya is a valley and Dōgenzaka means slope. Flat ground reads as wrong the
 * moment you look at it, and — worse — a scene whose ground is uniformly a few
 * metres off still looks entirely plausible while every building floats or sinks.
 * So this does two things: it builds the mesh, and it measures what it built.
 *
 * The source is `udx/dem/533935_dem_6697_op.gml`, one 378 MB `dem:TINRelief`
 * covering the whole 10 km cell in about 1.1 million triangles. Nothing is
 * decimated or resampled: the triangles inside the area of interest are kept as
 * they are, projected through the same chain as everything else, and written as
 * an indexed mesh with smooth normals.
 *
 * Heights pass straight through. The TIN declares EPSG:6697, whose vertical half
 * is orthometric metres above Tokyo Bay mean sea level, which is the same
 * quantity the buildings' `_zmin` carries and the same quantity GSI's tiles
 * carry. There is no geoid term anywhere in this file, and `test/elevation.test.ts`
 * is what says that is right.
 */

import { AOI_BOUNDS_WGS84, AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { encodeMesh, type MeshData } from "../../src/world/mesh.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { streamTinTriangles } from "../geo/plateau-tin.ts";

/**
 * How far past the area of interest the ground is kept, in degrees of latitude.
 *
 * The camera can pull back to 2 km from the crossing, and ground that stops at
 * the box edge puts a hard horizon a few hundred metres away in every overhead
 * frame. 0.0025 degrees is about 275 m, which covers the widest shot the visual
 * gate takes without doubling the triangle count.
 */
const MARGIN_DEGREES = 0.0025;

export interface TerrainBuildResult {
  /** Triangles in the whole 10 km cell, as read. */
  sourceTriangleCount: number;
  /** Triangles kept, including the margin outside the box. */
  triangleCount: number;
  /** Triangles whose centroid is inside the area of interest box itself. */
  insideAoiTriangleCount: number;
  vertexCount: number;
  /** Lowest and highest ground inside the box, metres above sea level. */
  minimumHeightM: number;
  maximumHeightM: number;
  /** Ground at the world origin — the Scramble Crossing — metres above sea level. */
  groundAtOriginM: number;
  bytes: number;
}

export interface TerrainSampler {
  /** Ground height at a point in world metres, or undefined outside the mesh. */
  heightAt(x: number, z: number): number | undefined;
}

export interface TerrainBuild {
  result: TerrainBuildResult;
  bytes: Uint8Array;
  sampler: TerrainSampler;
}

export async function buildTerrain(
  demPath: string,
  log: (line: string) => void = () => {},
): Promise<TerrainBuild> {
  const keep = {
    south: AOI_BOUNDS_WGS84.south - MARGIN_DEGREES,
    north: AOI_BOUNDS_WGS84.north + MARGIN_DEGREES,
    west: AOI_BOUNDS_WGS84.west - MARGIN_DEGREES,
    east: AOI_BOUNDS_WGS84.east + MARGIN_DEGREES,
  };

  // Vertices are shared between neighbouring triangles and the TIN repeats them
  // literally, so they are pooled on their source coordinates. The key is the
  // text PLATEAU wrote, not a rounded number: the file is quantised to 0.01 m and
  // rounding again would weld vertices that are genuinely distinct.
  const pool = new Map<string, number>();
  const positions: number[] = [];
  const indices: number[] = [];
  let insideAoi = 0;
  let minimumHeight = Infinity;
  let maximumHeight = -Infinity;

  const sourceTriangleCount = await streamTinTriangles(demPath, (triangle) => {
    const [a, b, c] = triangle.vertices;
    // Clip on the whole triangle, not on each vertex: dropping a triangle that
    // has one vertex outside would leave a ragged fringe of holes along the edge.
    const latitudes = [a[0], b[0], c[0]];
    const longitudes = [a[1], b[1], c[1]];
    if (
      Math.max(...latitudes) < keep.south ||
      Math.min(...latitudes) > keep.north ||
      Math.max(...longitudes) < keep.west ||
      Math.min(...longitudes) > keep.east
    ) {
      return;
    }

    for (const vertex of triangle.vertices) {
      const key = `${vertex[0]} ${vertex[1]} ${vertex[2]}`;
      let index = pool.get(key);
      if (index === undefined) {
        const world = planeRectangularToWorld(
          geographicToPlaneRectangular(vertex[0], vertex[1], vertex[2]),
          AOI_ORIGIN_EPSG6677,
        );
        index = positions.length / 3;
        positions.push(world.x, world.y, world.z);
        pool.set(key, index);
      }
      indices.push(index);
    }

    const centroidLatitude = (a[0] + b[0] + c[0]) / 3;
    const centroidLongitude = (a[1] + b[1] + c[1]) / 3;
    if (
      centroidLatitude >= AOI_BOUNDS_WGS84.south &&
      centroidLatitude <= AOI_BOUNDS_WGS84.north &&
      centroidLongitude >= AOI_BOUNDS_WGS84.west &&
      centroidLongitude <= AOI_BOUNDS_WGS84.east
    ) {
      insideAoi += 1;
      for (const vertex of triangle.vertices) {
        if (vertex[2] < minimumHeight) minimumHeight = vertex[2];
        if (vertex[2] > maximumHeight) maximumHeight = vertex[2];
      }
    }
  });

  if (indices.length === 0) {
    throw new Error(
      `${demPath} holds triangles, but none of them fall inside the area of interest. The TIN ` +
        "covers a different 10 km cell from the one src/world/aoi.ts names.",
    );
  }

  log(
    `      terrain: ${sourceTriangleCount} triangles in the cell, ${indices.length / 3} kept, ` +
      `${insideAoi} of those inside the box`,
  );

  const positionArray = new Float32Array(positions);
  const indexArray = new Uint32Array(indices);
  const normals = computeNormals(positionArray, indexArray);
  const sampler = buildSampler(positionArray, indexArray);

  const groundAtOrigin = sampler.heightAt(0, 0);
  if (groundAtOrigin === undefined) {
    throw new Error(
      "The terrain mesh has no triangle over the world origin, which is the Scramble Crossing. " +
        "Either the clip above dropped the middle of the area of interest or the projection is " +
        "putting the crossing somewhere other than (0, 0).",
    );
  }

  const bounds = boundsOf(positionArray);
  const mesh: MeshData = {
    header: {
      version: 1,
      name: "terrain",
      vertexCount: positionArray.length / 3,
      triangleCount: indexArray.length / 3,
      bounds,
      note:
        "PLATEAU dem:TINRelief 533935, 2.5 m triangles, EPSG:6697 to the world frame. Heights are " +
        "orthometric metres above Tokyo Bay mean sea level and pass through untouched.",
    },
    positions: positionArray,
    normals,
    indices: indexArray,
  };

  const bytes = encodeMesh(mesh);
  return {
    bytes,
    sampler,
    result: {
      sourceTriangleCount,
      triangleCount: indexArray.length / 3,
      insideAoiTriangleCount: insideAoi,
      vertexCount: positionArray.length / 3,
      minimumHeightM: minimumHeight,
      maximumHeightM: maximumHeight,
      groundAtOriginM: groundAtOrigin,
      bytes: bytes.byteLength,
    },
  };
}

/** Area-weighted vertex normals, so the 2.5 m facets read as a slope and not as scales. */
function computeNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const ia = indices[triangle]! * 3;
    const ib = indices[triangle + 1]! * 3;
    const ic = indices[triangle + 2]! * 3;

    const abx = positions[ib]! - positions[ia]!;
    const aby = positions[ib + 1]! - positions[ia + 1]!;
    const abz = positions[ib + 2]! - positions[ia + 2]!;
    const acx = positions[ic]! - positions[ia]!;
    const acy = positions[ic + 1]! - positions[ia + 1]!;
    const acz = positions[ic + 2]! - positions[ia + 2]!;

    // Not normalised: the cross product's length is twice the triangle's area, so
    // leaving it alone weights each face by its size, which is what stops a fan of
    // slivers dominating the normal at a vertex.
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    for (const index of [ia, ib, ic]) {
      normals[index] = normals[index]! + nx;
      normals[index + 1] = normals[index + 1]! + ny;
      normals[index + 2] = normals[index + 2]! + nz;
    }
  }

  for (let index = 0; index < normals.length; index += 3) {
    const length = Math.hypot(normals[index]!, normals[index + 1]!, normals[index + 2]!);
    if (length === 0) {
      normals[index + 1] = 1;
      continue;
    }
    normals[index] = normals[index]! / length;
    normals[index + 1] = normals[index + 1]! / length;
    normals[index + 2] = normals[index + 2]! / length;
  }
  return normals;
}

function boundsOf(positions: Float32Array): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[index + axis]!;
      if (value < min[axis]!) min[axis] = value;
      if (value > max[axis]!) max[axis] = value;
    }
  }
  return { min, max };
}

/**
 * A grid index over the terrain triangles, for draping road surfaces onto it.
 *
 * PLATEAU's road polygons below LOD3 are flat at z = 0, so 57% of the roads in
 * this area of interest arrive as outlines at sea level and have to be put on the
 * ground. A linear scan of 160,000 triangles per road vertex is minutes of work;
 * a 10 m bucket grid makes it a handful of candidates each.
 */
function buildSampler(positions: Float32Array, indices: Uint32Array): TerrainSampler {
  const cellSize = 10;
  const bounds = boundsOf(positions);
  const originX = bounds.min[0];
  const originZ = bounds.min[2];
  const columns = Math.ceil((bounds.max[0] - originX) / cellSize) + 1;
  const rows = Math.ceil((bounds.max[2] - originZ) / cellSize) + 1;
  const buckets = new Map<number, number[]>();

  const cellOf = (x: number, z: number): number =>
    Math.floor((z - originZ) / cellSize) * columns + Math.floor((x - originX) / cellSize);

  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const xs: number[] = [];
    const zs: number[] = [];
    for (let corner = 0; corner < 3; corner += 1) {
      const base = indices[triangle + corner]! * 3;
      xs.push(positions[base]!);
      zs.push(positions[base + 2]!);
    }
    const minColumn = Math.floor((Math.min(...xs) - originX) / cellSize);
    const maxColumn = Math.floor((Math.max(...xs) - originX) / cellSize);
    const minRow = Math.floor((Math.min(...zs) - originZ) / cellSize);
    const maxRow = Math.floor((Math.max(...zs) - originZ) / cellSize);
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        if (row < 0 || column < 0 || row >= rows || column >= columns) continue;
        const key = row * columns + column;
        const bucket = buckets.get(key);
        if (bucket === undefined) buckets.set(key, [triangle]);
        else bucket.push(triangle);
      }
    }
  }

  return {
    heightAt(x: number, z: number): number | undefined {
      const bucket = buckets.get(cellOf(x, z));
      if (bucket === undefined) return undefined;
      for (const triangle of bucket) {
        const ia = indices[triangle]! * 3;
        const ib = indices[triangle + 1]! * 3;
        const ic = indices[triangle + 2]! * 3;
        const ax = positions[ia]!;
        const az = positions[ia + 2]!;
        const bx = positions[ib]!;
        const bz = positions[ib + 2]!;
        const cx = positions[ic]!;
        const cz = positions[ic + 2]!;

        const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (denominator === 0) continue;
        const w0 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator;
        const w1 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
        const w2 = 1 - w0 - w1;
        if (w0 >= -1e-9 && w1 >= -1e-9 && w2 >= -1e-9) {
          return w0 * positions[ia + 1]! + w1 * positions[ib + 1]! + w2 * positions[ic + 1]!;
        }
      }
      return undefined;
    },
  };
}
