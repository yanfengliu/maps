/**
 * Turn PLATEAU's road surfaces into scene geometry. Plan item 13.
 *
 * This is the road **surface** — the asphalt you can see — and nothing else. The
 * lane graph is Phase 6's and the markings are Phase 4's; `src/scene/roads.ts`
 * says which is which and why they must not be confused.
 *
 * The trap this file exists to avoid is in `docs/work/0_shibuya-1km/design.md`:
 * **PLATEAU's `tran` LOD1 and LOD2 polygons are flat at z = 0**. Measured here on
 * mesh 53393596, every LOD1 and LOD2 vertex is exactly 0.0 and every LOD3 vertex
 * is between 14.363 m and 33.86 m. Drawing the lower levels as they come gives a
 * sheet of asphalt at sea level, fifteen metres under the valley floor, which
 * from above looks like no roads at all rather than like a bug.
 *
 * So the rule is: use LOD3 where a road has it, and drape everything else onto
 * the terrain. About 43% of roads carry LOD3 — the arterials — and the back
 * streets of Center Gai and Dōgenzaka do not.
 *
 * Even LOD3 is draped upward where it needs to be. Its heights come from the same
 * survey as the TIN and sit within a few tenths of a metre of it, sometimes
 * under: design.md measured road vertices near the crossing at 15.01 m against
 * the terrain's 15.2 m. A surface a fifth of a metre inside the ground is a
 * surface you cannot see, so each vertex takes whichever of the two is higher and
 * is then lifted clear.
 */

import { ShapeUtils, Vector2 } from "three";

import { AOI_BOUNDS_WGS84, AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { encodeMesh, type MeshData } from "../../src/world/mesh.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import type { TerrainSampler } from "./build-terrain.ts";

import { readFile } from "node:fs/promises";

/**
 * How far the road surface is lifted above the ground, in metres.
 *
 * Two coplanar surfaces flicker against each other, and how badly depends on how
 * far away the camera is: with a 1 m near plane and an 8 km far plane the depth
 * buffer resolves about 5 cm at the 950 m the visual gate's overhead shot sits
 * at. 20 cm clears that by four times and is still under the kerb height nobody
 * would notice it against. The road material also sets `polygonOffset`, so this
 * is the first of two defences rather than the only one.
 */
const ROAD_LIFT_M = 0.2;

/** How far past the box roads are kept, in degrees — matched to the terrain's margin. */
const MARGIN_DEGREES = 0.0025;

const ROAD_OPEN = "<tran:Road ";
const ROAD_CLOSE = "</tran:Road>";
const POLYGON = /<gml:Polygon\b[^>]*>([\s\S]*?)<\/gml:Polygon>/g;
const EXTERIOR = /<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/;

export interface RoadsBuildResult {
  roadCount: number;
  /** Roads that carried LOD3 geometry and were used as published. */
  lod3RoadCount: number;
  /** Roads with no LOD3, whose flat outline was draped onto the terrain. */
  drapedRoadCount: number;
  polygonCount: number;
  triangleCount: number;
  vertexCount: number;
  /** Polygons dropped because part of them reached past the edge of the terrain. */
  offTerrainPolygonCount: number;
  /** Lowest and highest road vertex, metres above sea level. */
  lowestVertexM: number;
  highestVertexM: number;
  bytes: number;
}

export interface RoadsBuild {
  result: RoadsBuildResult;
  bytes: Uint8Array;
}

export async function buildRoads(
  paths: readonly string[],
  terrain: TerrainSampler,
  log: (line: string) => void = () => {},
): Promise<RoadsBuild> {
  const keep = {
    south: AOI_BOUNDS_WGS84.south - MARGIN_DEGREES,
    north: AOI_BOUNDS_WGS84.north + MARGIN_DEGREES,
    west: AOI_BOUNDS_WGS84.west - MARGIN_DEGREES,
    east: AOI_BOUNDS_WGS84.east + MARGIN_DEGREES,
  };

  const positions: number[] = [];
  const indices: number[] = [];
  let roadCount = 0;
  let lod3RoadCount = 0;
  let drapedRoadCount = 0;
  let polygonCount = 0;
  let offTerrain = 0;

  for (const path of paths) {
    const xml = await readFile(path, "utf8");
    let searchFrom = 0;
    for (;;) {
      const open = xml.indexOf(ROAD_OPEN, searchFrom);
      if (open === -1) break;
      const close = xml.indexOf(ROAD_CLOSE, open);
      if (close === -1) break;
      const block = xml.slice(open, close + ROAD_CLOSE.length);
      searchFrom = close + ROAD_CLOSE.length;
      roadCount += 1;

      // One level per road, never two: a road drawn at LOD3 and again from its
      // LOD1 outline is the same asphalt twice, flickering against itself.
      const surfaces =
        surfacesOf(block, "lod3MultiSurface") ??
        surfacesOf(block, "lod2MultiSurface") ??
        surfacesOf(block, "lod1MultiSurface");
      if (surfaces === undefined) continue;
      if (surfaces.level === 3) lod3RoadCount += 1;
      else drapedRoadCount += 1;

      for (const ring of surfaces.rings) {
        if (ring.length < 3) continue;
        if (
          Math.max(...ring.map((vertex) => vertex[0])) < keep.south ||
          Math.min(...ring.map((vertex) => vertex[0])) > keep.north ||
          Math.max(...ring.map((vertex) => vertex[1])) < keep.west ||
          Math.min(...ring.map((vertex) => vertex[1])) > keep.east
        ) {
          continue;
        }

        // Projected first and checked against the terrain before anything is
        // kept. A road ring that reaches past the ground has nowhere to be
        // draped to, and PLATEAU's LOD1 and LOD2 outlines are flat at z = 0 — so
        // the vertex that falls off the edge does not vanish, it lands at sea
        // level and drags a sheet of asphalt fifteen metres under the valley out
        // past the edge of the world. Measured before this check: the road mesh
        // reached 874 m east where the terrain stops at 729 m, with its lowest
        // vertex at 0.2 m.
        const projected: { x: number; y: number; z: number }[] = [];
        let offEdge = false;
        for (const [latitude, longitude, height] of ring) {
          const world = planeRectangularToWorld(
            geographicToPlaneRectangular(latitude, longitude, height),
            AOI_ORIGIN_EPSG6677,
          );
          const ground = terrain.heightAt(world.x, world.z);
          if (ground === undefined) {
            offEdge = true;
            break;
          }
          projected.push({ x: world.x, y: Math.max(world.y, ground) + ROAD_LIFT_M, z: world.z });
        }
        if (offEdge) {
          offTerrain += 1;
          continue;
        }

        const base = positions.length / 3;
        const flat: Vector2[] = [];
        for (const world of projected) {
          positions.push(world.x, world.y, world.z);
          flat.push(new Vector2(world.x, world.z));
        }

        // Triangulated in plan, on X and Z, because the polygon is a road surface
        // and its vertical relief is small next to its extent. Doing it in 3D
        // would need a best-fit plane per polygon for no visible gain.
        for (const face of ShapeUtils.triangulateShape(flat, [])) {
          // Wound the other way round: the projection puts north at -Z, which
          // mirrors the plan view, so a ring that is counter-clockwise on the
          // ground comes out clockwise here and the surface would face down.
          indices.push(base + face[2]!, base + face[1]!, base + face[0]!);
        }
        polygonCount += 1;
      }
    }
  }

  if (indices.length === 0) {
    throw new Error(
      `None of the ${paths.length} tran files produced a single road polygon inside the area of ` +
        "interest. Either the files cover a different mesh or their shape has changed.",
    );
  }

  log(
    `      roads: ${roadCount} tran:Road, ${lod3RoadCount} used at LOD3, ${drapedRoadCount} draped ` +
      `from a flat outline, ${indices.length / 3} triangles; ${offTerrain} polygons dropped for ` +
      "reaching past the terrain",
  );

  const positionArray = new Float32Array(positions);
  const indexArray = new Uint32Array(indices);
  const mesh: MeshData = {
    header: {
      version: 1,
      name: "roads",
      vertexCount: positionArray.length / 3,
      triangleCount: indexArray.length / 3,
      bounds: boundsOf(positionArray),
      note:
        "PLATEAU tran road surfaces. LOD3 where published, LOD1 or LOD2 outlines draped onto the " +
        `terrain otherwise, every vertex lifted ${ROAD_LIFT_M} m clear of the ground.`,
    },
    positions: positionArray,
    // Flat up: a road surface is horizontal to within a few degrees and Phase 4
    // owns what it looks like. A normal per vertex from the draped heights would
    // be noise from the terrain sampler, not shading.
    normals: upNormals(positionArray.length),
    indices: indexArray,
  };

  const bytes = encodeMesh(mesh);
  return {
    bytes,
    result: {
      roadCount,
      lod3RoadCount,
      drapedRoadCount,
      polygonCount,
      triangleCount: indexArray.length / 3,
      vertexCount: positionArray.length / 3,
      offTerrainPolygonCount: offTerrain,
      lowestVertexM: mesh.header.bounds.min[1],
      highestVertexM: mesh.header.bounds.max[1],
      bytes: bytes.byteLength,
    },
  };
}

interface Surfaces {
  level: 1 | 2 | 3;
  /** Exterior rings, latitude-first as PLATEAU writes them, closing vertex dropped. */
  rings: [number, number, number][][];
}

function surfacesOf(block: string, tag: string): Surfaces | undefined {
  const level = Number(tag.slice(3, 4)) as 1 | 2 | 3;
  const rings: [number, number, number][][] = [];
  const open = `<tran:${tag}>`;
  const shut = `</tran:${tag}>`;

  let searchFrom = 0;
  for (;;) {
    const start = block.indexOf(open, searchFrom);
    if (start === -1) break;
    const end = block.indexOf(shut, start);
    if (end === -1) break;
    const surface = block.slice(start, end);
    searchFrom = end + shut.length;

    POLYGON.lastIndex = 0;
    for (const polygon of surface.matchAll(POLYGON)) {
      const exterior = EXTERIOR.exec(polygon[1]!);
      if (exterior === null) continue;
      const ring = parseRing(exterior[1]!);
      if (ring !== undefined) rings.push(ring);
    }
  }

  return rings.length === 0 ? undefined : { level, rings };
}

/**
 * A `gml:posList` as latitude-first vertices, with the ring's closing vertex dropped.
 *
 * PLATEAU writes latitude, longitude, height — the opposite of the order most
 * things use, and one of the two independent chances this project has to render a
 * mirrored Shibuya. The other is EPSG:6677's northing-first axis definition, and
 * `test/aoi.test.ts` gates both.
 */
function parseRing(posList: string): [number, number, number][] | undefined {
  const numbers = posList.trim().split(/\s+/).map(Number);
  if (numbers.length < 12 || numbers.length % 3 !== 0) return undefined;
  if (numbers.some(Number.isNaN)) return undefined;
  const vertices: [number, number, number][] = [];
  for (let index = 0; index < numbers.length / 3 - 1; index += 1) {
    vertices.push([numbers[index * 3]!, numbers[index * 3 + 1]!, numbers[index * 3 + 2]!]);
  }
  return vertices;
}

function upNormals(length: number): Float32Array {
  const normals = new Float32Array(length);
  for (let index = 1; index < length; index += 3) normals[index] = 1;
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
