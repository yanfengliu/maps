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
  it("is watertight, and its manifest records the fourteen rims the cap closed", async () => {
    const read = async (path: string): Promise<Uint8Array> =>
      new Uint8Array(
        await readFile(path).catch((cause: unknown) => {
          throw new Error(
            `The terrain watertightness gate needs cached ${path}; run npm run data:fetch and ` +
              "npm run data:scene before npm test. This test does not build the scene implicitly and does " +
              "not skip a missing source.",
            { cause },
          );
        }),
      );

    const mesh = decodeMesh(await read("data/scene/terrain.mesh"));
    const census = censusBoundaries(mesh);
    expect(census.triangleCount).toBeGreaterThan(100_000);

    // One rim, and it is the ground's own edge. This is the state the cap landed in:
    // the fourteen holes the source TIN carried are closed, and the perimeter bound
    // separates the two because a hole here is tens of metres and the edge is
    // kilometres. Before the batch this case asserted the opposite state on purpose;
    // it now asserts this one, and it is the only thing standing between a future
    // `data:scene` run and an uncapped ground reaching the payload.
    expect(census.interiorLoops).toHaveLength(0);
    expect(census.loops).toHaveLength(1);
    expect(census.outerLoop.perimeterM).toBeGreaterThan(1000);
    expect(census.boundaryEdgeCount).toBe(census.outerLoop.vertices.length);
    expect(() => verifyTerrainIsWatertight(mesh, "data/scene/terrain.mesh")).not.toThrow();

    // The manifest is where a reader of the served payload meets the invention, so it
    // has to agree with the mesh. The cap is additive — one apex per rim appended after
    // the source vertices, one triangle per rim edge — so the uncapped ground can be
    // reconstructed from the served one by dropping the apexes, and the rims recovered
    // from it are the census the manifest's records must match.
    const manifest = JSON.parse(new TextDecoder().decode(await read("data/scene/manifest.json"))) as {
      terrain: {
        closedHoleCount: number;
        capTriangleCount: number;
        closedRims: readonly {
          rimVertexCount: number;
          rimPerimeterM: number;
          apexX: number;
          apexY: number;
          apexZ: number;
          rimAreaM2: number;
        }[];
      };
    };
    expect(manifest.terrain.closedHoleCount).toBe(14);
    expect(manifest.terrain.capTriangleCount).toBe(227);
    expect(manifest.terrain.closedRims).toHaveLength(14);

    const apexes = manifest.terrain.closedHoleCount;
    const sourceVertices = mesh.positions.length / 3 - apexes;
    const uncappedIndices: number[] = [];
    for (let corner = 0; corner < mesh.indices.length; corner += 3) {
      const triangle = [mesh.indices[corner]!, mesh.indices[corner + 1]!, mesh.indices[corner + 2]!];
      if (triangle.some((index) => index >= sourceVertices)) continue;
      uncappedIndices.push(...triangle);
    }
    const uncapped = censusBoundaries({
      positions: mesh.positions.slice(0, sourceVertices * 3),
      indices: new Uint32Array(uncappedIndices),
    });
    expect(
      uncapped.interiorLoops.length,
      "the served ground is not the cap's own output: dropping the manifest's apexes did not leave the " +
        `${uncapped.interiorLoops.length} interior rims it records`,
    ).toBe(14);
    expect(manifest.terrain.closedRims.reduce((total, rim) => total + rim.rimVertexCount, 0)).toBe(227);

    const unmatched = [...uncapped.interiorLoops];
    for (const record of manifest.terrain.closedRims) {
      const at = unmatched.findIndex(
        (loop) =>
          Math.abs(loop.centroidX - record.apexX) < 0.5 && Math.abs(loop.centroidZ - record.apexZ) < 0.5,
      );
      expect(
        at,
        `the manifest records a rim at (${record.apexX}, ${record.apexZ}) that the re-derived census does not have`,
      ).toBeGreaterThanOrEqual(0);
      const loop = unmatched.splice(at, 1)[0]!;
      expect(record.rimVertexCount).toBe(loop.vertices.length);
      expect(record.rimPerimeterM).toBeCloseTo(loop.perimeterM, 1);
      expect(record.apexY).toBeCloseTo(loop.centroidY, 2);
      expect(record.rimAreaM2).toBeCloseTo(Math.abs(loop.signedAreaXZ), 1);
    }
    expect(unmatched, "a rim the cap closed is missing from the manifest").toHaveLength(0);

    // The rim the defect was reported from, at the digits the diagnosis measured. The
    // manifest rounds the apex to centimetres, so the world point reads 578.98 /
    // -403.06 here where the refusal message prints the rim's own 1 dp centroid.
    const f1 = manifest.terrain.closedRims.find((rim) => rim.rimVertexCount === 15);
    expect(f1).toBeDefined();
    expect(f1!.rimPerimeterM).toBeCloseTo(89.5, 1);
    expect(f1!.apexX).toBeCloseTo(579.0, 1);
    expect(f1!.apexY).toBeCloseTo(26.42, 2);
    expect(f1!.apexZ).toBeCloseTo(-403.1, 1);
  });
});
