/**
 * Turn MLIT's 3D Tiles into a tileset the scene can load. Plan items 10 and 12.
 *
 * Four things happen here, in this order, and each one is checked rather than
 * assumed.
 *
 * **1. Measure the vertical datum shift.** A tile's geometry is stated as offsets
 * in the ECEF frame, so its heights are metres above the ellipsoid — after the
 * glTF Y-up to Z-up turn that `GLTF_Y_UP_TO_Z_UP` handles. Everything else in this project —
 * PLATEAU's terrain TIN, the building attributes, the batch table's `_zmin` and
 * `_zmax` — is metres above Tokyo Bay mean sea level. The two differ by the geoid
 * undulation. Rather than take the published 36.877 m on trust, this measures it:
 * decode a tile, place it with a provisional undulation, and compare the world Y
 * of each building's lowest vertex against the orthometric `_zmin` its own batch
 * table states. The median residual is the correction. It is then checked against
 * the published value, and a disagreement of more than half a metre stops the
 * build — because terrain and buildings that are both uniformly wrong by 36.877 m
 * look exactly like terrain and buildings.
 *
 * **2. Place every tile.** `CESIUM_RTC` is replaced by an ordinary glTF root node
 * whose matrix carries the whole ECEF-to-world map, so no seven-million-metre
 * coordinate reaches the browser and the tiles become plain glTF 2.0 plus Draco.
 *
 * **3. Reconcile the geometry against the batch table, in all three axes.** Every
 * tile's Draco payload is decoded and each building's placed bounding box is
 * compared with the one its own batch table states in degrees and orthometric
 * metres. Vertically that checks the datum shift; horizontally it checks the
 * placement itself, building by building over the whole area of interest, which
 * is the thing that catches a city translated by a block or mirrored about its
 * diagonal. Phase 1's coordinate gate pins the projection; this pins the data.
 *
 * **4. Write the index.** One record per building, with the sentinel attributes
 * filtered through `src/world/building-attributes.ts` and the whole set run past
 * `assertNoSentinels` before anything is written.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { AOI_BOUNDS_WGS84, AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import {
  assertNoSentinels,
  readMeasuredHeightM,
  readStoreysAboveGround,
  type BuildingRecord,
} from "../../src/world/building-attributes.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { applyMatrix, multiplyMatrices, worldPlacement, type Matrix4Array } from "../geo/ecef.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import {
  applyPlacement,
  GLTF_Y_UP_TO_Z_UP,
  parseB3dm,
  parseGlb,
  readBatchColumn,
  readRtcCentre,
  serialiseB3dm,
  serialiseGlb,
  type Glb,
} from "../tiles/b3dm.ts";
import { decodePrimitive } from "../tiles/draco.ts";
import {
  clipTilesetToAoi,
  regionToWorldBox,
  selectAoiTiles,
  type SelectedTile,
  type Tileset,
} from "../tiles/tileset.ts";

/**
 * The geoid undulation the published GSIGEO model gives at the AOI centre, metres.
 *
 * Used as the provisional value in step 1 and then as the thing the measured
 * value is checked against. It is not what the pipeline ships: what ships is what
 * the data measured.
 */
export const PUBLISHED_GEOID_UNDULATION_M = 36.877;

/** How far the measured undulation may sit from the published one before this fails. */
const UNDULATION_TOLERANCE_M = 0.5;

/**
 * How far a building's decoded geometry may sit from where its batch table puts it.
 *
 * Two metres, and the reason it is not centimetres: the batch table states the
 * centre of a bounding box computed in **degrees**, while the decoded centre is
 * the middle of a bounding box in **metres**, and those are different points for
 * a building that is not square to the grid. Two metres is far tighter than any
 * real placement error — a mirrored city is out by hundreds of metres, a city
 * translated by the RTC offset by 102.7 m, glTF's Y-up convention left unapplied
 * by 68 m — and loose enough that the difference in how the two boxes are defined
 * does not fire it.
 *
 * **Bound.** This is checked on the *deepest* tile each building appears in, and
 * only there. The tileset is a five-level REPLACE hierarchy whose coarse levels
 * hold decimated stand-ins — a tower reduced to twenty-four vertices — so a
 * per-building bounding box measured at depth 0 disagrees with the full one by
 * hundreds of metres for reasons that have nothing to do with placement. Coarse
 * tiles are checked a different way, by `TILE_CENTRE_TOLERANCE_M` below, which is
 * the granularity their geometry actually supports.
 */
const HORIZONTAL_RESIDUAL_TOLERANCE_M = 2;

/**
 * How far a whole tile's decoded geometry may sit from the tile's own declared bounds.
 *
 * Every tile at every level states a `region` bounding volume, and the middle of
 * the geometry it holds should land in the middle of that region. This is the
 * check that covers the coarse levels, where the per-building comparison above is
 * meaningless. Ten metres against tiles whose half-extents run from 90 m to 3 km,
 * so it catches a tile placed with the wrong matrix while tolerating the fact
 * that decimated geometry does not fill its region evenly.
 */
const TILE_CENTRE_TOLERANCE_M = 10;

export interface BuildingsBuildResult {
  geoidUndulationM: number;
  /** Spread of the middle 98% of the per-building vertical residuals, metres. */
  undulationSpreadM: number;
  tileCount: number;
  /** Buildings with a distinct `gml_id` across every tile kept. */
  buildingCount: number;
  /** Of those, the ones whose centre falls inside the AOI box. */
  insideAoiCount: number;
  lod1Count: number;
  lod2Count: number;
  missingHeightCount: number;
  missingStoreysCount: number;
  triangleCount: number;
  vertexCount: number;
  textureMegapixels: number;
  /** Largest decoded texture, as width x height. */
  largestTexture: string;
  /** Worst per-building vertical disagreement after the correction, metres. */
  worstVerticalResidualM: number;
  /** Worst per-building horizontal disagreement, metres. */
  worstHorizontalResidualM: number;
  /** Worst linearisation error over any tile's placement matrix, metres. */
  worstLinearisationErrorM: number;
  sourceBytes: number;
  outputBytes: number;
}

interface TileWork {
  uri: string;
  depth: number;
  /** Whether the tile has no children, so its geometry is the survey and not a stand-in. */
  isLeaf: boolean;
  /** The tile's own content bounding region, radians and ellipsoidal metres. */
  region: number[];
  bytes: Uint8Array;
  batchLength: number;
  columns: Record<ColumnName, (number | string | null)[]>;
  /** Per-batch decoded world bounds, computed at the provisional undulation. */
  decoded: { minX: Float64Array; maxX: Float64Array; minY: Float64Array; maxY: Float64Array; minZ: Float64Array; maxZ: Float64Array };
  triangles: number;
  vertices: number;
  texturePixels: number;
  largestTexture: { width: number; height: number } | undefined;
}

type ColumnName =
  | "gmlId"
  | "lod"
  | "height"
  | "storeys"
  | "name"
  | "usage"
  | "x"
  | "y"
  | "zmin"
  | "zmax";

const COLUMN_KEYS: Record<ColumnName, string> = {
  gmlId: "gml_id",
  lod: "_lod",
  height: "bldg:measuredHeight",
  storeys: "bldg:storeysAboveGround",
  name: "gml:name",
  usage: "bldg:usage",
  x: "_x",
  y: "_y",
  zmin: "_zmin",
  zmax: "_zmax",
};

export async function buildBuildings(
  sourceRoot: string,
  outputRoot: string,
  log: (line: string) => void = () => {},
): Promise<BuildingsBuildResult> {
  const tileset = JSON.parse(await readFile(join(sourceRoot, "tileset.json"), "utf8")) as Tileset;
  const selected = selectAoiTiles(tileset);

  // Placing a tile shifts scene Y by exactly minus the undulation and leaves X
  // and Z alone. Everything below depends on that, so it is measured rather than
  // reasoned about.
  assertUndulationIsAPureVerticalShift();

  const work: TileWork[] = [];
  let sourceBytes = 0;
  for (const tile of selected) {
    const bytes = new Uint8Array(await readFile(join(sourceRoot, tile.uri)));
    sourceBytes += bytes.byteLength;
    work.push(await measureTile(tile, bytes));
    if (work.length % 10 === 0) log(`      decoded ${work.length}/${selected.length} tiles`);
  }

  const solved = solveResiduals(work);
  log(
    `      geoid undulation measured at ${solved.undulation.toFixed(3)} m from ` +
      `${solved.sampleCount} buildings (published ${PUBLISHED_GEOID_UNDULATION_M} m); ` +
      `middle-98% spread ${solved.spread.toFixed(3)} m`,
  );
  if (Math.abs(solved.undulation - PUBLISHED_GEOID_UNDULATION_M) > UNDULATION_TOLERANCE_M) {
    throw new Error(
      `The vertical offset between the tiles' ellipsoidal geometry and their own orthometric ` +
        `_zmin measures ${solved.undulation.toFixed(3)} m, but GSIGEO puts the geoid undulation at ` +
        `${PUBLISHED_GEOID_UNDULATION_M} m here. More than ${UNDULATION_TOLERANCE_M} m apart means ` +
        "one of the two is not the quantity it is being read as, and a scene built on it would " +
        "sit uniformly above or below the terrain while looking entirely normal.",
    );
  }
  if (solved.worstHorizontal > HORIZONTAL_RESIDUAL_TOLERANCE_M) {
    throw new Error(
      `Building ${solved.worstHorizontalId} lands ${solved.worstHorizontal.toFixed(2)} m from ` +
        "where its own batch table puts it, and the tolerance is " +
        `${HORIZONTAL_RESIDUAL_TOLERANCE_M} m. The decoded geometry and the stated position ` +
        "disagree, which is what a wrong placement matrix looks like: the city still renders, in " +
        "the wrong place.",
    );
  }
  if (solved.worstTileCentre > TILE_CENTRE_TOLERANCE_M) {
    throw new Error(
      `Tile ${solved.worstTileCentreId} decoded to geometry whose middle is ` +
        `${solved.worstTileCentre.toFixed(2)} m from the middle of the region the tileset declares ` +
        `for it, and the tolerance is ${TILE_CENTRE_TOLERANCE_M} m. This is the check that covers ` +
        "the coarse levels of the hierarchy, where the per-building comparison measures the " +
        "decimation instead of the placement.",
    );
  }
  log(
    `      worst residual against the batch table: ${solved.worstHorizontal.toFixed(3)} m ` +
      `horizontally, ${solved.worstVertical.toFixed(3)} m vertically; worst tile centre against ` +
      `its declared region ${solved.worstTileCentre.toFixed(2)} m`,
  );

  const clipped = clipTilesetToAoi(tileset, solved.undulation);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(join(outputRoot, "data"), { recursive: true });
  await writeFile(
    join(outputRoot, "tileset.json"),
    `${JSON.stringify(clipped.tileset, null, 1)}\n`,
    "utf8",
  );

  const buildings = new Map<string, { record: BuildingRecord; depth: number }>();
  let outputBytes = 0;
  let triangleCount = 0;
  let vertexCount = 0;
  let texturePixels = 0;
  let worstLinearisation = 0;
  let largestTexture = { width: 0, height: 0 };

  for (const tile of work) {
    const placement = placementFor(readRtcOf(tile.bytes), solved.undulation);
    worstLinearisation = Math.max(worstLinearisation, placement.linearisationErrorM);

    const parsed = parseB3dm(tile.bytes);
    const glb = parseGlb(parsed.glb);
    const out = serialiseB3dm(parsed, serialiseGlb(applyPlacement(glb.json, placement.matrix), glb.binary));
    const destination = join(outputRoot, tile.uri);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, out);
    outputBytes += out.byteLength;

    triangleCount += tile.triangles;
    vertexCount += tile.vertices;
    texturePixels += tile.texturePixels;
    if (
      tile.largestTexture !== undefined &&
      tile.largestTexture.width * tile.largestTexture.height >
        largestTexture.width * largestTexture.height
    ) {
      largestTexture = tile.largestTexture;
    }

    for (let batch = 0; batch < tile.batchLength; batch += 1) {
      const gmlId = String(tile.columns.gmlId[batch]);
      const longitude = Number(tile.columns.x[batch]);
      const latitude = Number(tile.columns.y[batch]);
      const groundY = Number(tile.columns.zmin[batch]);
      const heightM = readMeasuredHeightM(tile.columns.height[batch] as number | string | null);
      const centre = degreesToWorld(latitude, longitude);

      const record: BuildingRecord = {
        gmlId,
        x: round(centre.x, 3),
        z: round(centre.z, 3),
        groundY: round(groundY, 3),
        roofY: round(Number(tile.columns.zmax[batch]), 3),
        eavesY: heightM === undefined ? null : round(groundY + heightM, 3),
        measuredHeightM: heightM ?? null,
        storeysAboveGround:
          readStoreysAboveGround(tile.columns.storeys[batch] as number | string | null) ?? null,
        lod: Number(tile.columns.lod[batch]),
        insideAoi:
          latitude >= AOI_BOUNDS_WGS84.south &&
          latitude <= AOI_BOUNDS_WGS84.north &&
          longitude >= AOI_BOUNDS_WGS84.west &&
          longitude <= AOI_BOUNDS_WGS84.east,
        tile: tile.uri,
      };
      const name = tile.columns.name[batch];
      if (typeof name === "string" && name !== "") record.name = name;

      // The same building appears at several levels of a REPLACE hierarchy. Keep
      // the deepest, which is the one whose geometry the scene actually shows at
      // full detail.
      const existing = buildings.get(gmlId);
      if (existing === undefined || tile.depth > existing.depth) {
        buildings.set(gmlId, { record, depth: tile.depth });
      }
    }
  }

  const index = [...buildings.values()].map(({ record }) => record);
  // Before anything is written, and over the whole set rather than a sample: a
  // sentinel that reached a placed height would put a building 9,999 m under the
  // crossing, and nothing downstream looks under the crossing.
  assertNoSentinels(index);
  index.sort((a, b) => b.roofY - a.roofY);

  await writeFile(
    join(outputRoot, "buildings.json"),
    `${JSON.stringify({ count: index.length, buildings: index })}\n`,
    "utf8",
  );

  const inside = index.filter((building) => building.insideAoi);
  return {
    geoidUndulationM: solved.undulation,
    undulationSpreadM: solved.spread,
    tileCount: work.length,
    buildingCount: index.length,
    insideAoiCount: inside.length,
    lod1Count: inside.filter((building) => building.lod === 1).length,
    lod2Count: inside.filter((building) => building.lod === 2).length,
    missingHeightCount: inside.filter((building) => building.measuredHeightM === null).length,
    missingStoreysCount: inside.filter((building) => building.storeysAboveGround === null).length,
    triangleCount,
    vertexCount,
    textureMegapixels: texturePixels / 1e6,
    largestTexture: `${largestTexture.width}x${largestTexture.height}`,
    worstVerticalResidualM: solved.worstVertical,
    worstHorizontalResidualM: solved.worstHorizontal,
    worstLinearisationErrorM: worstLinearisation,
    sourceBytes,
    outputBytes,
  };
}

function readRtcOf(bytes: Uint8Array): [number, number, number] {
  return readRtcCentre(parseGlb(parseB3dm(bytes).glb).json);
}

/**
 * The whole map from a tile's own glTF vertices to the world frame.
 *
 * Two steps, and the first one is the one that is easy to miss: the vertices are
 * Y-up in the glTF convention and the RTC centre translates in a Z-up ECEF frame,
 * so they are rotated before they are placed. `GLTF_Y_UP_TO_Z_UP` in
 * `tools/tiles/b3dm.ts` records what leaving that out measured.
 */
function placementFor(rtc: [number, number, number], undulation: number): {
  matrix: Matrix4Array;
  linearisationErrorM: number;
} {
  const placement = worldPlacement(rtc, undulation);
  return {
    matrix: multiplyMatrices(placement.matrix, GLTF_Y_UP_TO_Z_UP),
    linearisationErrorM: placement.linearisationErrorM,
  };
}

const round = (value: number, places: number): number =>
  Number(value.toFixed(places));

/** Read one tile: its tables, its texture sizes, and its decoded per-building bounds. */
async function measureTile(tile: SelectedTile, bytes: Uint8Array): Promise<TileWork> {
  const uri = tile.uri;
  const parsed = parseB3dm(bytes);
  const glb = parseGlb(parsed.glb);
  const batchLength = Number(parsed.featureTableJson.BATCH_LENGTH);
  if (!Number.isInteger(batchLength) || batchLength <= 0) {
    throw new Error(
      `${uri} declares BATCH_LENGTH ${JSON.stringify(parsed.featureTableJson.BATCH_LENGTH)}. ` +
        "Without it the batch table cannot be read and no building in the tile can be identified.",
    );
  }
  if (glb.binary === undefined) {
    throw new Error(`${uri} has no binary chunk, so it holds no geometry at all.`);
  }

  const columns = {} as Record<ColumnName, (number | string | null)[]>;
  for (const [name, key] of Object.entries(COLUMN_KEYS) as [ColumnName, string][]) {
    columns[name] = readBatchColumn(parsed.batchTableJson, parsed.batchTableBinary, key, batchLength);
  }

  const placement = placementFor(readRtcCentre(glb.json), PUBLISHED_GEOID_UNDULATION_M);
  const decoded = {
    minX: new Float64Array(batchLength).fill(Infinity),
    maxX: new Float64Array(batchLength).fill(-Infinity),
    minY: new Float64Array(batchLength).fill(Infinity),
    maxY: new Float64Array(batchLength).fill(-Infinity),
    minZ: new Float64Array(batchLength).fill(Infinity),
    maxZ: new Float64Array(batchLength).fill(-Infinity),
  };
  let triangles = 0;
  let vertices = 0;

  for (const mesh of glb.json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const payload = await decodePrimitive(glb.json, glb.binary, primitive);
      triangles += payload.triangleCount;
      vertices += payload.vertexCount;
      if (payload.batchIds === undefined) {
        throw new Error(
          `${uri} has a primitive with no _BATCHID attribute, so its triangles cannot be told ` +
            "apart by building and nothing about it can be reconciled against the batch table.",
        );
      }
      for (let vertex = 0; vertex < payload.vertexCount; vertex += 1) {
        const batch = payload.batchIds[vertex]!;
        const world = applyMatrix(placement.matrix, {
          x: payload.positions[vertex * 3]!,
          y: payload.positions[vertex * 3 + 1]!,
          z: payload.positions[vertex * 3 + 2]!,
        });
        if (world.x < decoded.minX[batch]!) decoded.minX[batch] = world.x;
        if (world.x > decoded.maxX[batch]!) decoded.maxX[batch] = world.x;
        if (world.y < decoded.minY[batch]!) decoded.minY[batch] = world.y;
        if (world.y > decoded.maxY[batch]!) decoded.maxY[batch] = world.y;
        if (world.z < decoded.minZ[batch]!) decoded.minZ[batch] = world.z;
        if (world.z > decoded.maxZ[batch]!) decoded.maxZ[batch] = world.z;
      }
    }
  }

  const textures = texturesOf(glb);
  return {
    uri,
    depth: tile.depth,
    isLeaf: tile.isLeaf,
    region: tile.region,
    bytes,
    batchLength,
    columns,
    decoded,
    triangles,
    vertices,
    texturePixels: textures.pixels,
    largestTexture: textures.largest,
  };
}

interface SolvedResiduals {
  undulation: number;
  spread: number;
  sampleCount: number;
  worstVertical: number;
  worstHorizontal: number;
  worstHorizontalId: string;
  worstTileCentre: number;
  worstTileCentreId: string;
}

/**
 * Compare the decoded geometry with what the tileset and the batch tables state.
 *
 * Two comparisons, at two granularities, because the tileset holds two kinds of
 * geometry.
 *
 * **Per building, at the deepest tile it appears in.** That tile holds the real
 * survey geometry, so its bounding box and the one the batch table states in
 * degrees are the same box measured two ways. Vertically the residuals share a
 * constant offset — the amount the provisional geoid undulation is out — and the
 * median recovers it; the median rather than the mean, because a few buildings
 * straddle a tile boundary and carry only part of their geometry. Horizontally
 * there is nothing to solve for and the residual is the placement error.
 *
 * **Per tile, at every level.** Coarse levels of a REPLACE hierarchy hold
 * decimated stand-ins, so a per-building box there is not the building's box and
 * comparing them measures the decimation rather than the placement. What is still
 * true of a coarse tile is that its geometry belongs inside the region it
 * declares, so those are checked by where the whole tile's geometry landed.
 */
function solveResiduals(work: readonly TileWork[]): SolvedResiduals {
  const vertical: number[] = [];
  let worstHorizontal = 0;
  let worstHorizontalId = "";
  let worstTileCentre = 0;
  let worstTileCentreId = "";

  // Which tile holds each building at full detail. Leaves only, and the deepest
  // of them: a tile with children holds a decimated stand-in, so comparing its
  // boxes against the batch table measures the decimation. Buildings whose own
  // leaf lies outside the area of interest were never fetched, and their deepest
  // *fetched* tile is a coarse one — those are skipped rather than measured
  // against geometry that is not theirs.
  const deepest = new Map<string, TileWork>();
  for (const tile of work) {
    if (!tile.isLeaf) continue;
    for (let batch = 0; batch < tile.batchLength; batch += 1) {
      const id = String(tile.columns.gmlId[batch]);
      const held = deepest.get(id);
      if (held === undefined || tile.depth > held.depth) deepest.set(id, tile);
    }
  }

  for (const tile of work) {
    // The whole tile against its own declared region, at every level.
    const declared = worldBoxCentre(tile.region);
    const bounds = decodedBounds(tile);
    if (bounds !== undefined) {
      const offBy = Math.hypot(bounds.x - declared.x, bounds.z - declared.z);
      if (offBy > worstTileCentre) {
        worstTileCentre = offBy;
        worstTileCentreId = tile.uri;
      }
    }

    for (let batch = 0; batch < tile.batchLength; batch += 1) {
      const minY = tile.decoded.minY[batch]!;
      if (!Number.isFinite(minY)) continue;
      if (deepest.get(String(tile.columns.gmlId[batch])) !== tile) continue;
      vertical.push(minY - Number(tile.columns.zmin[batch]));

      const stated = degreesToWorld(Number(tile.columns.y[batch]), Number(tile.columns.x[batch]));
      const centreX = (tile.decoded.minX[batch]! + tile.decoded.maxX[batch]!) / 2;
      const centreZ = (tile.decoded.minZ[batch]! + tile.decoded.maxZ[batch]!) / 2;
      const distance = Math.hypot(centreX - stated.x, centreZ - stated.z);
      if (distance > worstHorizontal) {
        worstHorizontal = distance;
        worstHorizontalId = `${String(tile.columns.gmlId[batch])} in ${tile.uri}`;
      }
    }
  }

  if (vertical.length === 0) {
    throw new Error(
      "Not one building's geometry could be compared against its own batch table, so there is " +
        "nothing to measure the vertical datum shift from.",
    );
  }

  vertical.sort((a, b) => a - b);
  const offset = vertical[Math.floor(vertical.length / 2)]!;
  const low = vertical[Math.floor(vertical.length * 0.01)]!;
  const high = vertical[Math.floor(vertical.length * 0.99)]!;

  return {
    undulation: PUBLISHED_GEOID_UNDULATION_M + offset,
    spread: high - low,
    sampleCount: vertical.length,
    worstVertical: Math.max(Math.abs(high - offset), Math.abs(low - offset)),
    worstHorizontal,
    worstHorizontalId,
    worstTileCentre,
    worstTileCentreId,
  };
}

/** The middle of a tile's declared region, in world metres at the provisional undulation. */
function worldBoxCentre(region: readonly number[]): { x: number; z: number } {
  const box = regionToWorldBox(region, PUBLISHED_GEOID_UNDULATION_M);
  return { x: box[0]!, z: box[2]! };
}

/** The middle of everything a tile decoded to, in world metres, or undefined if empty. */
function decodedBounds(tile: TileWork): { x: number; z: number } | undefined {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let batch = 0; batch < tile.batchLength; batch += 1) {
    if (!Number.isFinite(tile.decoded.minX[batch]!)) continue;
    minX = Math.min(minX, tile.decoded.minX[batch]!);
    maxX = Math.max(maxX, tile.decoded.maxX[batch]!);
    minZ = Math.min(minZ, tile.decoded.minZ[batch]!);
    maxZ = Math.max(maxZ, tile.decoded.maxZ[batch]!);
  }
  if (!Number.isFinite(minX)) return undefined;
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
}

/**
 * Check that the undulation only moves the scene vertically.
 *
 * `solveResiduals` turns one median residual into a correction, which is only
 * valid if changing the undulation shifts scene Y by exactly minus that amount
 * and leaves X and Z untouched. That is true of this projection, and it is
 * asserted rather than assumed because the whole correction rests on it.
 */
function assertUndulationIsAPureVerticalShift(): void {
  // A point over the crossing, at a plausible ellipsoidal height: the RTC centre
  // design.md records for the tile covering the Scramble.
  const probe = [-3956953.773, 3355546.821, 3697608.127] as const;
  const a = worldPlacement(probe, PUBLISHED_GEOID_UNDULATION_M).position;
  const b = worldPlacement(probe, PUBLISHED_GEOID_UNDULATION_M + 1).position;
  const horizontal = Math.hypot(a.x - b.x, a.z - b.z);
  const vertical = b.y - a.y;
  if (horizontal > 1e-6 || Math.abs(vertical + 1) > 1e-6) {
    throw new Error(
      "Changing the geoid undulation by one metre moved the scene by " +
        `${horizontal.toExponential(2)} m horizontally and ${vertical.toFixed(6)} m vertically, ` +
        "where it should move exactly −1 m vertically and nothing sideways. The correction the " +
        "build derives from a single median residual is not valid unless that holds.",
    );
  }
}

/** A latitude and longitude in world metres, at sea level. */
function degreesToWorld(latitude: number, longitude: number): { x: number; z: number } {
  const world = planeRectangularToWorld(
    geographicToPlaneRectangular(latitude, longitude, 0),
    AOI_ORIGIN_EPSG6677,
  );
  return { x: world.x, z: world.z };
}

/**
 * Decoded pixels of every texture in a tile, which is what graphics memory follows.
 *
 * Read from the WebP headers rather than assumed, because it is the number that
 * decides whether this scene fits in memory. PLATEAU's atlases run from 128x128
 * to 4096x4096, and one 4096x4096 RGBA texture with mipmaps is 89 MB resident —
 * so "one 2048x2048 atlas per tile" and the truth are very different budgets.
 */
function texturesOf(glb: Glb): { pixels: number; largest: { width: number; height: number } | undefined } {
  let pixels = 0;
  let largest: { width: number; height: number } | undefined;
  for (const image of glb.json.images ?? []) {
    if (image.bufferView === undefined || glb.binary === undefined) continue;
    const view = glb.json.bufferViews?.[image.bufferView];
    if (view === undefined) continue;
    const start = view.byteOffset ?? 0;
    const size = webpSize(glb.binary.subarray(start, start + view.byteLength));
    if (size === undefined) continue;
    pixels += size.width * size.height;
    if (largest === undefined || size.width * size.height > largest.width * largest.height) {
      largest = size;
    }
  }
  return { pixels, largest };
}

/** Width and height out of a WebP header, whichever of the three forms it takes. */
function webpSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.byteLength < 30) return undefined;
  const fourcc = new TextDecoder().decode(bytes.subarray(12, 16));
  if (fourcc === "VP8X") {
    return {
      width: 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)),
      height: 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)),
    };
  }
  if (fourcc === "VP8 ") {
    return {
      width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
      height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
    };
  }
  if (fourcc === "VP8L") {
    const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return undefined;
}
