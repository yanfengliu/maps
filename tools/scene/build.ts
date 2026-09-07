/**
 * Build the derived scene from the fetched data. Plan items 10 to 13.
 *
 *   npm run data:scene
 *
 * Reads `data/plateau/` and `data/3dtiles/`, writes `data/scene/`. Everything it
 * writes is in the world frame already — metres, Y up, origin at the Scramble
 * Crossing — so the browser never sees a latitude, an EPSG:6677 northing or an
 * ECEF position. Deterministic: the same inputs give the same bytes, and the
 * inputs are pinned by hash.
 *
 * The step is not part of `npm run build`, because it takes about a minute and
 * reads 500 MB. It is what the plan's "rebuild from a clean checkout" criterion
 * runs: delete `data/scene/`, run this, render again.
 *
 * Three checks are run here rather than left to a test, because each one needs
 * the whole 500 MB of source and none of them can run in the unit suite:
 *
 * - the ground at the world origin against the elevation gate's measured 15.2 m,
 * - the named landmarks against their measured heights and positions, which is
 *   what says this is Shibuya and not a plausible city,
 * - the sentinel attributes against PLATEAU's own CityGML, which is the only
 *   thing that says the tiles' `null` and the CityGML's −9999 are the same
 *   buildings.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AOI_BOUNDS_WGS84, AOI_MESH_CODES, AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import {
  PLATEAU_SENTINELS,
  readMeasuredHeightM,
  type BuildingRecord,
} from "../../src/world/building-attributes.ts";
import {
  GROUND_AT_ORIGIN_M,
  GROUND_AT_ORIGIN_TOLERANCE_M,
  type SceneLandmark,
  type SceneManifest,
} from "../../src/world/scene-data.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { PLATEAU_3DTILES } from "../data/manifest.ts";
import { readCityGmlBuildings } from "../geo/citygml-buildings.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { buildBuildings } from "./build-buildings.ts";
import { buildRoads } from "./build-roads.ts";
import { buildTerrain } from "./build-terrain.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_ROOT = join(REPO_ROOT, "data");
const SCENE_ROOT = join(DATA_ROOT, "scene");

/**
 * The buildings this scene is checked against, and where they really are.
 *
 * The coordinate gate in `test/aoi.test.ts` catches a mirrored city. It cannot
 * catch a city translated by a block — and the tiles' own RTC centre sits 102.7 m
 * east of the world origin, which is exactly the size of offset that renders
 * convincingly and is wrong. These three are the answer to that: named buildings,
 * with heights measured from the CityGML in Phase 1, at positions taken from
 * their real-world coordinates.
 *
 * **How independent each of these actually is**, because it matters and it is easy
 * to overstate. The heights and storey counts are all independent: they come from
 * PLATEAU's CityGML by way of Phase 1, and the tiles are a separate conversion.
 * Of the positions, only **Shibuya Scramble Square's** is — 35.65831, 139.70221 is
 * the point `design.md` projected to EPSG:6677 by hand, and the building lands
 * 8.8 m from it, which rules out the 102.7 m RTC offset outright. The other two
 * positions were read off the tiles' own batch table, so they check that the
 * pipeline is consistent and nothing more.
 *
 * What covers the rest is `crossCheckAgainstCityGml` below, which compares every
 * one of the 1,740 buildings against the centroid of its own `lod0RoofEdge` in the
 * CityGML — a different file, a different geometry and a different derivation from
 * the batch table's bounding-box centre.
 */
const LANDMARKS: { name: string; heightM: number; storeys: number | null; latitude: number; longitude: number }[] = [
  { name: "Shibuya Scramble Square", heightM: 220.0, storeys: 45, latitude: 35.65831, longitude: 139.70221 },
  { name: "Shibuya Hikarie", heightM: 173.6, storeys: 34, latitude: 35.659084, longitude: 139.703663 },
  { name: "Shibuya Stream", heightM: 171.3, storeys: 35, latitude: 35.657213, longitude: 139.703170 },
];

/** How far a landmark may sit from its published position before the build fails. */
const LANDMARK_TOLERANCE_M = 25;

function log(line: string): void {
  console.log(line);
}

async function main(): Promise<void> {
  console.log(`Scene root: ${SCENE_ROOT} (gitignored, rebuilt by this command)\n`);
  await rm(SCENE_ROOT, { recursive: true, force: true });
  await mkdir(SCENE_ROOT, { recursive: true });

  log("terrain — PLATEAU dem:TINRelief");
  const terrain = await buildTerrain(
    join(DATA_ROOT, "plateau", "udx", "dem", `${AOI_MESH_CODES.level2}_dem_6697_op.gml`),
    log,
  );
  await writeFile(join(SCENE_ROOT, "terrain.mesh"), terrain.bytes);
  log(
    `      relief inside the box ${terrain.result.minimumHeightM.toFixed(2)} to ` +
      `${terrain.result.maximumHeightM.toFixed(2)} m; ground at the crossing ` +
      `${terrain.result.groundAtOriginM.toFixed(2)} m`,
  );

  if (
    Math.abs(terrain.result.groundAtOriginM - GROUND_AT_ORIGIN_M) > GROUND_AT_ORIGIN_TOLERANCE_M
  ) {
    throw new Error(
      `The terrain mesh puts the ground at the Scramble Crossing at ` +
        `${terrain.result.groundAtOriginM.toFixed(3)} m, but the elevation gate measured 15.2 m ` +
        "there against two independent surveys. GROUND_AT_ORIGIN_M in src/world/scene-data.ts is " +
        "what the camera aims at before any data loads, so a disagreement here would put the " +
        "street-level shot underground.",
    );
  }
  if (terrain.result.maximumHeightM - terrain.result.minimumHeightM < 10) {
    throw new Error(
      `The terrain inside the area of interest spans only ` +
        `${(terrain.result.maximumHeightM - terrain.result.minimumHeightM).toFixed(2)} m of ` +
        "relief. Shibuya is a valley with about 28 m across this box, so a flat result means the " +
        "heights were dropped somewhere between the file and the mesh — and flat ground renders " +
        "perfectly well.",
    );
  }

  log("roads — PLATEAU tran surfaces");
  const roads = await buildRoads(
    AOI_MESH_CODES.level3.map((mesh) =>
      join(DATA_ROOT, "plateau", "udx", "tran", `${mesh}_tran_6697_op.gml`),
    ),
    terrain.sampler,
    log,
  );
  await writeFile(join(SCENE_ROOT, "roads.mesh"), roads.bytes);

  // Nothing at sea level. PLATEAU's sub-LOD3 road polygons are flat at z = 0, so
  // a road that failed to drape does not disappear — it lies fifteen metres under
  // the valley floor, which from above looks like a road and from the side looks
  // like nothing at all.
  const lowestRoad = roads.result.lowestVertexM;
  if (lowestRoad < terrain.result.minimumHeightM - 5) {
    throw new Error(
      `The road surface has a vertex at ${lowestRoad.toFixed(2)} m above sea level, and the lowest ` +
        `ground in the area of interest is ${terrain.result.minimumHeightM.toFixed(2)} m. PLATEAU's ` +
        "LOD1 and LOD2 road polygons are flat at z = 0, so this is what one that was not draped " +
        "onto the terrain looks like.",
    );
  }

  log("buildings — MLIT 3D Tiles, placed into the world frame");
  const buildings = await buildBuildings(
    join(DATA_ROOT, PLATEAU_3DTILES.root),
    join(SCENE_ROOT, "buildings"),
    log,
  );
  log(
    `      ${buildings.tileCount} tiles, ${buildings.buildingCount} buildings ` +
      `(${buildings.insideAoiCount} inside the box: ${buildings.lod2Count} at LOD2, ` +
      `${buildings.lod1Count} at LOD1), ${buildings.triangleCount} triangles`,
  );
  log(
    `      ${buildings.textureMegapixels.toFixed(1)} Mpx of texture, largest atlas ` +
      `${buildings.largestTexture}; ${(buildings.outputBytes / 1e6).toFixed(1)} MB written`,
  );

  const index = JSON.parse(
    await readFile(join(SCENE_ROOT, "buildings", "buildings.json"), "utf8"),
  ) as { buildings: BuildingRecord[] };

  const landmarks = checkLandmarks(index.buildings);
  for (const landmark of landmarks) {
    log(
      `      ${landmark.name}: ${landmark.measuredHeightM.toFixed(1)} m, ` +
        `${landmark.storeysAboveGround ?? "?"} storeys, at ` +
        `(${landmark.x.toFixed(1)}, ${landmark.z.toFixed(1)}) m from the crossing, roof at ` +
        `${landmark.roofY.toFixed(1)} m`,
    );
  }

  log("cross-check — PLATEAU CityGML, the source of record");
  await crossCheckAgainstCityGml(index.buildings);

  const manifest: SceneManifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    terrain: {
      triangleCount: terrain.result.triangleCount,
      insideAoiTriangleCount: terrain.result.insideAoiTriangleCount,
      vertexCount: terrain.result.vertexCount,
      minimumHeightM: terrain.result.minimumHeightM,
      maximumHeightM: terrain.result.maximumHeightM,
      groundAtOriginM: terrain.result.groundAtOriginM,
    },
    roads: {
      lowestVertexM: roads.result.lowestVertexM,
      highestVertexM: roads.result.highestVertexM,
      offTerrainPolygonCount: roads.result.offTerrainPolygonCount,
      roadCount: roads.result.roadCount,
      lod3RoadCount: roads.result.lod3RoadCount,
      drapedRoadCount: roads.result.drapedRoadCount,
      triangleCount: roads.result.triangleCount,
    },
    buildings: {
      tileCount: buildings.tileCount,
      buildingCount: buildings.buildingCount,
      insideAoiCount: buildings.insideAoiCount,
      lod1Count: buildings.lod1Count,
      lod2Count: buildings.lod2Count,
      missingHeightCount: buildings.missingHeightCount,
      missingStoreysCount: buildings.missingStoreysCount,
      triangleCount: buildings.triangleCount,
      textureMegapixels: Number(buildings.textureMegapixels.toFixed(1)),
      largestTexture: buildings.largestTexture,
      geoidUndulationM: Number(buildings.geoidUndulationM.toFixed(3)),
    },
    landmarks,
  };
  await writeFile(join(SCENE_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `\nok    data/scene/ written: terrain ${(terrain.result.bytes / 1e6).toFixed(1)} MB, roads ` +
      `${(roads.result.bytes / 1e6).toFixed(1)} MB, buildings ` +
      `${(buildings.outputBytes / 1e6).toFixed(1)} MB`,
  );
  console.log(
    `      placement residuals: ${buildings.worstHorizontalResidualM.toFixed(3)} m horizontal, ` +
      `${buildings.worstVerticalResidualM.toFixed(3)} m vertical, ` +
      `${buildings.worstLinearisationErrorM.toExponential(2)} m linearisation`,
  );
}

/**
 * Find the named landmarks in the built index and check where they landed.
 *
 * This is the check that separates "it renders" from "it renders the right
 * place". A city built with the RTC centre's 102.7 m eastward offset left in
 * would pass every other check in this pipeline: the tiles would load, the
 * buildings would sit on the terrain, the relief would be right, and Shibuya
 * would be one block east of where it belongs.
 */
function checkLandmarks(buildings: readonly BuildingRecord[]): SceneLandmark[] {
  const found: SceneLandmark[] = [];

  for (const landmark of LANDMARKS) {
    const expected = worldOf(landmark.latitude, landmark.longitude);
    const candidates = buildings
      .filter((building) => building.measuredHeightM !== null)
      .map((building) => ({
        building,
        distance: Math.hypot(building.x - expected.x, building.z - expected.z),
      }))
      .filter(({ building }) => Math.abs(building.measuredHeightM! - landmark.heightM) < 0.6)
      .sort((a, b) => a.distance - b.distance);

    const best = candidates[0];
    if (best === undefined) {
      throw new Error(
        `No building in the scene is ${landmark.heightM} m tall, so ${landmark.name} is not in it. ` +
          "Either the tiles that cover it were not fetched or the batch table is not being read.",
      );
    }
    if (best.distance > LANDMARK_TOLERANCE_M) {
      throw new Error(
        `${landmark.name} is ${landmark.heightM} m tall and should stand at ` +
          `(${expected.x.toFixed(1)}, ${expected.z.toFixed(1)}) metres from the Scramble Crossing. ` +
          `The nearest building of that height in the scene is at ` +
          `(${best.building.x.toFixed(1)}, ${best.building.z.toFixed(1)}), which is ` +
          `${best.distance.toFixed(1)} m away. An offset of about 100 m is what leaving the tiles' ` +
          "own RTC centre in place would produce; the whole city would be one block out and would " +
          "look entirely convincing.",
      );
    }

    found.push({
      name: landmark.name,
      gmlId: best.building.gmlId,
      x: best.building.x,
      z: best.building.z,
      measuredHeightM: best.building.measuredHeightM!,
      storeysAboveGround: best.building.storeysAboveGround,
      roofY: best.building.roofY,
    });
  }

  // Relative heights as well as absolute ones. Scramble Square is the tallest
  // thing in the box, Hikarie next, Shibuya Stream just under it; a scene where
  // that order is wrong is not this place whatever the numbers say.
  for (let index = 1; index < found.length; index += 1) {
    if (found[index]!.measuredHeightM >= found[index - 1]!.measuredHeightM) {
      throw new Error(
        `${found[index]!.name} came out at least as tall as ${found[index - 1]!.name}, which is ` +
          "not the order these buildings stand in.",
      );
    }
  }

  return found;
}

/**
 * Check the tiles' attributes against the CityGML they were converted from.
 *
 * The tiles state a missing `bldg:measuredHeight` as `null` and the CityGML
 * states it as −9999. Nothing inside either file says those are the same
 * buildings; reading both and matching on `gml_id` is what says it. This is also
 * where the AOI's building count is confirmed against the source of record rather
 * than against the converted copy.
 */
async function crossCheckAgainstCityGml(buildings: readonly BuildingRecord[]): Promise<void> {
  const fromTiles = new Map(buildings.map((building) => [building.gmlId, building]));
  let inBox = 0;
  let sentinelHeights = 0;
  let sentinelStoreys = 0;
  let matched = 0;
  let disagreed = 0;
  let missingFromTiles = 0;
  let worstHeightDifference = 0;
  let sourceLod2 = 0;
  let lodDisagreed = 0;
  const positionResiduals: number[] = [];
  let worstPosition = 0;
  let worstPositionId = "";

  for (const mesh of AOI_MESH_CODES.level3) {
    const path = join(DATA_ROOT, "plateau", "udx", "bldg", `${mesh}_bldg_6697_op.gml`);
    for (const source of await readCityGmlBuildings(path)) {
      const inside =
        source.latitude !== undefined &&
        source.longitude !== undefined &&
        source.latitude >= AOI_BOUNDS_WGS84.south &&
        source.latitude <= AOI_BOUNDS_WGS84.north &&
        source.longitude >= AOI_BOUNDS_WGS84.west &&
        source.longitude <= AOI_BOUNDS_WGS84.east;
      if (!inside) continue;
      inBox += 1;

      if (source.measuredHeightRaw === PLATEAU_SENTINELS.measuredHeight) sentinelHeights += 1;
      if (source.storeysAboveGroundRaw === PLATEAU_SENTINELS.storeysAboveGround) sentinelStoreys += 1;

      const tiled = fromTiles.get(source.gmlId);
      if (tiled === undefined) {
        missingFromTiles += 1;
        continue;
      }
      matched += 1;
      if (source.hasLod2) sourceLod2 += 1;

      // Where the CityGML's own roof-edge centroid puts this building against
      // where the pipeline placed it. The two are different points by definition
      // — a ring centroid and a bounding-box centre — so this is loose, and it is
      // the only whole-population horizontal check that is not the pipeline
      // agreeing with itself.
      const expected = worldOf(source.latitude!, source.longitude!);
      const offBy = Math.hypot(expected.x - tiled.x, expected.z - tiled.z);
      positionResiduals.push(offBy);
      if (offBy > worstPosition) {
        worstPosition = offBy;
        worstPositionId = source.gmlId;
      }
      // The 3D Tiles set is published as "LOD2 with texture", and design.md read
      // that as meaning the ward's LOD1 buildings live in a separate tileset that
      // has to be merged in. It does not: they are in this one, in untextured
      // tiles of their own, and `_lod` says which is which. This is what proves
      // that, building by building against the CityGML.
      if (source.hasLod2 !== (tiled.lod === 2)) lodDisagreed += 1;

      const fromSource = readMeasuredHeightM(source.measuredHeightRaw ?? null);
      if ((fromSource === undefined) !== (tiled.measuredHeightM === null)) {
        disagreed += 1;
        throw new Error(
          `Building ${source.gmlId} has a height in one source and not the other: the CityGML says ` +
            `${String(source.measuredHeightRaw)} and the tiles say ${String(tiled.measuredHeightM)}. ` +
            "PLATEAU writes a missing height as −9999 in the CityGML and as null in the tiles, and " +
            "this check exists to prove those are the same buildings.",
        );
      }
      if (fromSource !== undefined && tiled.measuredHeightM !== null) {
        worstHeightDifference = Math.max(
          worstHeightDifference,
          Math.abs(fromSource - tiled.measuredHeightM),
        );
      }
    }
  }

  log(
    `      CityGML: ${inBox} buildings in the box, ${sentinelHeights} with measuredHeight −9999, ` +
      `${sentinelStoreys} with storeysAboveGround 9999`,
  );
  log(
    `      matched ${matched} of them to the tiles by gml_id; ${missingFromTiles} not in the ` +
      `fetched tiles; ${disagreed} disagreed about whether a height exists; worst height ` +
      `difference ${worstHeightDifference.toFixed(3)} m`,
  );
  log(
    `      ${sourceLod2} of them carry LOD2 geometry in the CityGML and ${inBox - sourceLod2} do ` +
      `not; ${lodDisagreed} disagree with the tiles' own _lod`,
  );

  positionResiduals.sort((a, b) => a - b);
  const medianPosition = positionResiduals[Math.floor(positionResiduals.length / 2)] ?? 0;
  const p99Position = positionResiduals[Math.floor(positionResiduals.length * 0.99)] ?? 0;
  log(
    `      placed against the CityGML's own roof-edge centroids: median ` +
      `${medianPosition.toFixed(2)} m, 99th percentile ${p99Position.toFixed(2)} m, worst ` +
      `${worstPosition.toFixed(2)} m (${worstPositionId})`,
  );
  if (medianPosition > 10) {
    throw new Error(
      `Half the buildings in the area of interest are more than ${medianPosition.toFixed(1)} m ` +
        "from where the CityGML's own roof-edge centroid puts them. These are two derivations of " +
        "the same survey and they differ only by how a centre is defined, so a median this large " +
        "is a placement error and not a definition difference. A city out by about 100 m is what " +
        "leaving the tiles' RTC centre in place would produce.",
    );
  }

  if (lodDisagreed > 0) {
    throw new Error(
      `${lodDisagreed} buildings say LOD2 in the CityGML and LOD1 in the tiles, or the other way ` +
        "round. The tiles are the geometry the scene draws and the CityGML is the source of " +
        "record, so a disagreement means one of the two is not being read correctly — and the " +
        "untextured LOD1 buildings are exactly the ones a reviewer would not notice missing.",
    );
  }

  if (worstHeightDifference > 0.05) {
    throw new Error(
      `The largest disagreement between a building's height in the CityGML and in the tiles is ` +
        `${worstHeightDifference.toFixed(3)} m. They are the same survey, so anything above a ` +
        "centimetre means the batch table is being read wrong.",
    );
  }
  if (matched < inBox * 0.97) {
    throw new Error(
      `Only ${matched} of the ${inBox} buildings the CityGML puts inside the area of interest were ` +
        "found in the tiles. The 67 fetched tiles should carry all of them; a shortfall this size " +
        "means the clip dropped a tile the box needs.",
    );
  }
}

function worldOf(latitude: number, longitude: number): { x: number; z: number } {
  const world = planeRectangularToWorld(
    geographicToPlaneRectangular(latitude, longitude, 0),
    AOI_ORIGIN_EPSG6677,
  );
  return { x: world.x, z: world.z };
}

await main();
