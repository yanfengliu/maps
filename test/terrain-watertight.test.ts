/**
 * The ground's interior rims: the F1 terrain hole and its thirteen siblings.
 *
 * `npm run data:scene` closes them in `tools/scene/build-terrain.ts` and then reads
 * the mesh it just wrote back off disk and refuses to publish a scene whose ground
 * still carries one. These cases cover the census, the cap and the refusal:
 *
 * - a fixture this file builds — a 6x6 grid with one cell's two triangles removed —
 *   which proves the census can tell a hole from the mesh's edge, that the cap closes
 *   it, and that the gate refuses an uncapped mesh by naming the loop;
 * - the same fixture written through `encodeMesh`, read back and refused, which is
 *   the shape `data:scene` uses: a census over the written bytes rather than over the
 *   array the builder still holds;
 * - the real `data/scene/terrain.mesh`, which is the only case that speaks about
 *   Shibuya's own fourteen holes;
 * - the wiring in `tools/scene/build.ts`, as a source shape.
 *
 * **The bound.** The fixture is a square hole in a flat grid, so it proves nothing
 * about a rim that doubles back on itself — two of the real rims do, and the cap
 * reports 9 of its 227 triangles facing down because of it. The served-mesh case is
 * state-aware on purpose: before the scene is rebuilt with the cap it checks the gate
 * refuses that exact mesh by name and lists all fourteen rims; after the rebuild it
 * checks the ground carries no interior rim. Both branches assert something about
 * the artifact, so neither state is a free pass, but this file cannot say which state
 * the served scene *should* be in — that is the generation step's own evidence.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decodeMesh, encodeMesh, type MeshData } from "../src/world/mesh.js";
import { AOI_CENTRE_WGS84 } from "../src/world/aoi.js";
import {
  capTerrainHoles,
  censusBoundaries,
  describeLoopForFailure,
  type TerrainArrays,
} from "../tools/scene/terrain-watertight.js";
import { buildTerrain, verifyTerrainIsWatertight } from "../tools/scene/build-terrain.js";

const TRIANGLE_OPEN = "<gml:Triangle>";
const TRIANGLE_CLOSE = "</gml:Triangle>";

/**
 * A 6x6 grid of 1 m cells at y = 0 with the cell at (3,3) removed.
 *
 * Its triangles are wound so that `computeNormals`' own Y component comes out
 * positive, which is the convention the cap has to agree with. The mesh therefore
 * has one outer rim of 24 edges and one square hole of 4.
 */
function gridWithOneHole(): TerrainArrays {
  const positions: number[] = [];
  for (let iz = 0; iz <= 6; iz += 1) for (let ix = 0; ix <= 6; ix += 1) positions.push(ix, 0, iz);
  const index = (ix: number, iz: number): number => iz * 7 + ix;
  const indices: number[] = [];
  for (let iz = 0; iz < 6; iz += 1) {
    for (let ix = 0; ix < 6; ix += 1) {
      if (ix === 3 && iz === 3) continue;
      indices.push(index(ix, iz), index(ix, iz + 1), index(ix + 1, iz + 1));
      indices.push(index(ix, iz), index(ix + 1, iz + 1), index(ix + 1, iz));
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

/** The arrays as a file the build would write, so the case reads real mesh bytes. */
function asMeshFile(arrays: TerrainArrays, name: string): MeshData {
  return {
    header: {
      version: 1,
      name,
      vertexCount: arrays.positions.length / 3,
      triangleCount: arrays.indices.length / 3,
      bounds: { min: [0, 0, 0], max: [6, 0, 6] },
    },
    positions: arrays.positions,
    normals: new Float32Array(arrays.positions.length),
    indices: arrays.indices,
  };
}

/** Directed edges with no opposite: every rim edge the mesh has. */
function unpairedEdges(arrays: TerrainArrays): number {
  const vertexCount = arrays.positions.length / 3;
  const seen = new Set<number>();
  for (let corner = 0; corner < arrays.indices.length; corner += 3) {
    const a = arrays.indices[corner]!;
    const b = arrays.indices[corner + 1]!;
    const c = arrays.indices[corner + 2]!;
    for (const [from, to] of [[a, b], [b, c], [c, a]] as const) seen.add(from * vertexCount + to);
  }
  let unpaired = 0;
  for (const id of seen) {
    const from = Math.floor(id / vertexCount);
    const to = id - from * vertexCount;
    if (!seen.has(to * vertexCount + from)) unpaired += 1;
  }
  return unpaired;
}

let root = "";

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "maps-terrain-watertight-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/**
 * A `dem:TINRelief` document over the crossing with one grid cell missing.
 *
 * The grid is `cells` square cells of about `cellM` metres about `AOI_CENTRE_WGS84`,
 * which the world frame puts at (0, 0). The cell at (2, 2) is left out of the
 * triangle list, so the ground clipped out of this document carries exactly one
 * interior rim — the real TIN's defect, in a file `buildTerrain` can read inside a
 * unit test.
 */
function tinDocumentWithOneHole(cells = 8, cellM = 5): string {
  const metresPerDegreeLatitude = 111_320;
  const metresPerDegreeLongitude =
    111_320 * Math.cos((AOI_CENTRE_WGS84.latitude * Math.PI) / 180);
  const deltaLatitude = cellM / metresPerDegreeLatitude;
  const deltaLongitude = cellM / metresPerDegreeLongitude;
  const latitude = (iz: number): number => AOI_CENTRE_WGS84.latitude + (iz - cells / 2) * deltaLatitude;
  const longitude = (ix: number): number => AOI_CENTRE_WGS84.longitude + (ix - cells / 2) * deltaLongitude;
  const height = (ix: number, iz: number): number => 15 + 0.1 * ix + 0.05 * iz;
  const vertex = (ix: number, iz: number): string =>
    `${latitude(iz).toFixed(7)} ${longitude(ix).toFixed(7)} ${height(ix, iz).toFixed(2)}`;
  const triangle = (
    a: readonly [number, number],
    b: readonly [number, number],
    c: readonly [number, number],
  ): string =>
    `${TRIANGLE_OPEN}<gml:exterior><gml:LinearRing><gml:posList srsDimension="3">` +
    `${vertex(...a)} ${vertex(...b)} ${vertex(...c)} ${vertex(...a)}` +
    `</gml:posList></gml:LinearRing></gml:exterior>${TRIANGLE_CLOSE}\n`;

  let body = "";
  for (let iz = 0; iz < cells; iz += 1) {
    for (let ix = 0; ix < cells; ix += 1) {
      if (ix === 2 && iz === 2) continue;
      body += triangle([ix, iz], [ix, iz + 1], [ix + 1, iz + 1]);
      body += triangle([ix, iz], [ix + 1, iz + 1], [ix + 1, iz]);
    }
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<gml:FeatureCollection><gml:featureMember>' +
    `<gml:trianglePatches>\n${body}</gml:trianglePatches>` +
    "</gml:featureMember></gml:FeatureCollection>\n"
  );
}

describe("the ground's rims are told apart and closed", () => {
  it("names the mesh's edge as the outer rim and a missing cell as a hole", () => {
    const census = censusBoundaries(gridWithOneHole());
    expect(census.loops).toHaveLength(2);
    expect(census.interiorLoops).toHaveLength(1);
    expect(census.outerLoop.vertices.length).toBe(24);
    expect(census.interiorLoops[0]!.vertices.length).toBe(4);
    expect(census.boundaryEdgeCount).toBe(28);
  });

  it("closes the hole, leaving only the outer rim unpaired", () => {
    const open = gridWithOneHole();
    expect(unpairedEdges(open)).toBe(28);
    const cap = capTerrainHoles(open);
    const closed = { positions: cap.positions, indices: cap.indices };
    expect(cap.summary.addedTriangleCount).toBe(4);
    expect(cap.summary.addedVertexCount).toBe(1);
    expect(censusBoundaries(closed).interiorLoops).toHaveLength(0);
    // The hole's own four rim edges are gone and nothing else moved: the cap walks
    // each of them the opposite way to the ground, which is the whole of the fix.
    expect(unpairedEdges(closed)).toBe(24);
    // And it faces the way the ground does: the fixture is wound upward, so every
    // cap triangle must be too. A cap emitted the other way round is 0 of 4 here.
    expect(cap.summary.capTrianglesFacingUp).toBe(4);
    expect(cap.summary.capTrianglesFacingDown).toBe(0);
  });

  it("refuses an uncapped mesh by naming the loop's size and position", () => {
    const open = gridWithOneHole();
    expect(() => verifyTerrainIsWatertight(open, "the fixture"))
      .toThrow(/the fixture carries 1 hole in the ground/);
    // The message has to carry enough of the rim to find it: how many vertices, how
    // long it is, and where it is. The defect it exists for was reported as "the F1
    // terrain hole and its 13 siblings", so a bare count would send a reader back to
    // the census by hand.
    const loop = censusBoundaries(open).interiorLoops[0]!;
    expect(describeLoopForFailure(loop)).toMatch(/^4 rim vertices, 4\.0 m perimeter, centroid \(3\.5, 3\.5\)/);
    expect(() => verifyTerrainIsWatertight(open, "the fixture")).toThrow(/4 rim vertices, 4\.0 m perimeter, centroid \(3\.5, 3\.5\)/);
  });

  it("accepts the mesh it just closed", () => {
    const cap = capTerrainHoles(gridWithOneHole());
    expect(() => verifyTerrainIsWatertight({ positions: cap.positions, indices: cap.indices }, "the fixture")).not.toThrow();
  });
});

describe("the gate reads the mesh the build wrote", () => {
  it("refuses a written uncapped mesh by name, and passes the same mesh capped", async () => {
    const open = gridWithOneHole();
    const openPath = join(root, "open.mesh");
    await writeFile(openPath, encodeMesh(asMeshFile(open, "terrain")));
    const openOnDisk = decodeMesh(new Uint8Array(await readFile(openPath)));
    expect(() => verifyTerrainIsWatertight(openOnDisk, openPath)).toThrow(
      new RegExp(`${openPath.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&")} carries 1 hole in the ground`),
    );

    const cap = capTerrainHoles(open);
    const closedPath = join(root, "closed.mesh");
    await writeFile(
      closedPath,
      encodeMesh(asMeshFile({ positions: cap.positions, indices: cap.indices }, "terrain")),
    );
    const closedOnDisk = decodeMesh(new Uint8Array(await readFile(closedPath)));
    expect(censusBoundaries(closedOnDisk).interiorLoops).toHaveLength(0);
    expect(() => verifyTerrainIsWatertight(closedOnDisk, closedPath)).not.toThrow();
  });

  it("verifies the file on disk rather than the array the builder still holds", async () => {
    // A source shape, and it is bounded as one: it proves the call is written into
    // the pipeline, not that the pipeline ran. What it exists for is the specific
    // regression of verifying `terrain.bytes` — the array the builder just produced —
    // which is the builder agreeing with itself and can never fire on a mesh that
    // reached disk some other way.
    const source = await readFile("tools/scene/build.ts", "utf8");
    const needle = 'readFile(join(SCENE_ROOT, "terrain.mesh"))';
    const occurrences = source.split(needle).length - 1;
    expect(
      occurrences,
      "tools/scene/build.ts must read data/scene/terrain.mesh back before it verifies it",
    ).toBe(1);
    expect(
      source.includes("decodeMesh(terrain.bytes)"),
      "tools/scene/build.ts verifies the builder's own array again, which cannot fail on a mesh that " +
        "reached disk without the cap",
    ).toBe(false);
  });
});

describe("the pipeline's own build closes the rim it finds", () => {
  it("caps the ground it clipped, and refuses the same build with the cap off", async () => {
    const demPath = join(root, "fixture-dem.gml");
    await writeFile(demPath, tinDocumentWithOneHole(), "utf8");

    // The default arm is the pipeline: clip, cap, encode. What is asserted is the
    // bytes it hands back, so removing the cap turns this case red rather than
    // leaving it green over an untested `capTerrainHoles`.
    const capped = await buildTerrain(demPath);
    const cappedCensus = censusBoundaries(decodeMesh(capped.bytes));
    expect(
      cappedCensus.interiorLoops.length,
      `the pipeline's own build left ${cappedCensus.interiorLoops.length} interior rims in the ground it wrote`,
    ).toBe(0);
    expect(capped.result.capTriangleCount).toBe(4);
    expect(capped.result.clippedTriangleCount + capped.result.capTriangleCount).toBe(
      capped.result.triangleCount,
    );

    // The other arm is the same build with the cap skipped, which is the red control
    // for the case above: if this arm stopped carrying a hole, the assertion about
    // the capped arm would pass without the cap doing anything.
    const open = await buildTerrain(demPath, () => {}, { leaveHolesOpen: true });
    const openMesh = decodeMesh(open.bytes);
    const openCensus = censusBoundaries(openMesh);
    expect(
      openCensus.interiorLoops.length,
      "the uncapped arm of the build does not carry the fixture's hole, so the capped arm's " +
        "watertightness cannot be attributed to the cap",
    ).toBe(1);
    expect(openCensus.interiorLoops[0]!.vertices.length).toBe(4);
    expect(() => verifyTerrainIsWatertight(openMesh, "the uncapped fixture build")).toThrow(
      /the uncapped fixture build carries 1 hole in the ground/,
    );
  });
});

describe("the terrain the scene build wrote", () => {
  it("is either watertight or refused by name with every rim listed", async () => {
    const bytes = await readFile("data/scene/terrain.mesh").catch((cause: unknown) => {
      throw new Error(
        "The terrain watertightness gate needs cached data/scene/terrain.mesh; run npm run data:fetch and " +
          "npm run data:scene before npm test. This test does not build the scene implicitly and does not skip " +
          "a missing source.",
        { cause },
      );
    });
    const mesh = decodeMesh(new Uint8Array(bytes));
    const census = censusBoundaries(mesh);
    expect(census.triangleCount).toBeGreaterThan(100_000);

    if (census.interiorLoops.length === 0) {
      // One rim, and it is the ground's own edge: the fourteen holes the source TIN
      // carried are closed. The perimeter bound is what separates the two, since a
      // hole in this mesh is tens of metres and the clipped edge is kilometres.
      expect(census.loops).toHaveLength(1);
      expect(census.outerLoop.perimeterM).toBeGreaterThan(1000);
      return;
    }

    // The served ground is still the uncapped one. The census is the fourteen holes
    // the 2026-09-15 diagnosis measured, and the gate must name every one of them
    // rather than refuse with a count.
    expect(census.interiorLoops).toHaveLength(14);
    expect(census.boundaryEdgeCount).toBe(1441);
    const f1 = census.interiorLoops.find((loop) => Math.abs(loop.centroidX - 579.0) < 0.1 && Math.abs(loop.centroidZ + 403.1) < 0.1);
    expect(
      f1,
      "the F1 rim at (579.0, -403.1) is not among the served ground's interior rims",
    ).toBeDefined();
    expect(describeLoopForFailure(f1!)).toMatch(/^15 rim vertices, 89\.5 m perimeter, centroid \(579\.0, -403\.1\)/);

    let message = "";
    try {
      verifyTerrainIsWatertight(mesh, "data/scene/terrain.mesh");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message, "the gate passed a ground mesh every rim of which is a hole").not.toBe("");
    expect(message).toContain(`carries ${census.interiorLoops.length} holes in the ground`);
    for (const loop of census.interiorLoops) {
      expect(message, `the refusal does not name the rim ${describeLoopForFailure(loop)}`).toContain(
        describeLoopForFailure(loop),
      );
    }

    // And the cap this gate is paired with closes exactly this mesh: every rim gone,
    // one outer rim left, one vertex and one triangle per rim edge.
    const cap = capTerrainHoles(mesh);
    const capped = censusBoundaries({ positions: cap.positions, indices: cap.indices });
    expect(capped.interiorLoops).toHaveLength(0);
    expect(cap.summary.addedVertexCount).toBe(14);
    expect(cap.summary.addedTriangleCount).toBe(227);
    expect(capped.boundaryEdgeCount).toBe(census.outerLoop.vertices.length);
    expect(() => verifyTerrainIsWatertight({ positions: cap.positions, indices: cap.indices }, "the capped ground")).not.toThrow();
  });
});
