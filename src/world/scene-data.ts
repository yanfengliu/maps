/**
 * What the offline pipeline produces, and where the scene finds it.
 *
 * `npm run data:scene` writes everything below into a gitignored `data/scene/`,
 * and a small Vite middleware serves that directory at `/scene/` in both the dev
 * server and `vite preview` — see `vite.config.ts`. Nothing derived is committed
 * and nothing derived is copied into `dist/`: the repository holds the recipe,
 * the checksums and the code, and 137 MB of tiles stay where they were built.
 *
 * Every coordinate in every one of these files is already in the world frame:
 * metres, Y up, origin at the Shibuya Scramble Crossing, +X east, +Z south. The
 * projection and the origin subtraction happen offline, so nothing here carries a
 * latitude, an EPSG:6677 northing or an ECEF position into the browser.
 */

/** Where the derived scene data is served from. */
export const SCENE_DATA_BASE = "/scene";

export const SCENE_FILES = Object.freeze({
  manifest: `${SCENE_DATA_BASE}/manifest.json`,
  terrain: `${SCENE_DATA_BASE}/terrain.mesh`,
  roads: `${SCENE_DATA_BASE}/roads.mesh`,
  buildingsTileset: `${SCENE_DATA_BASE}/buildings/tileset.json`,
  buildingIndex: `${SCENE_DATA_BASE}/buildings/buildings.json`,
});

export interface SceneManifest {
  /** Bumped when the shape of anything under `data/scene/` changes. */
  version: 1;
  builtAt: string;
  terrain: {
    triangleCount: number;
    insideAoiTriangleCount: number;
    vertexCount: number;
    minimumHeightM: number;
    maximumHeightM: number;
    groundAtOriginM: number;
  };
  roads: {
    roadCount: number;
    lod3RoadCount: number;
    drapedRoadCount: number;
    triangleCount: number;
    /** Lowest and highest road vertex, metres above sea level. */
    lowestVertexM: number;
    highestVertexM: number;
    /** Polygons dropped for reaching past the edge of the terrain. */
    offTerrainPolygonCount: number;
  };
  buildings: {
    tileCount: number;
    buildingCount: number;
    insideAoiCount: number;
    lod1Count: number;
    lod2Count: number;
    missingHeightCount: number;
    missingStoreysCount: number;
    triangleCount: number;
    textureMegapixels: number;
    largestTexture: string;
    geoidUndulationM: number;
  };
  /** Named buildings whose position and height are checked on every build. */
  landmarks: SceneLandmark[];
}

export interface SceneLandmark {
  name: string;
  gmlId: string;
  /** Metres east of the crossing. */
  x: number;
  /** Metres south of the crossing. */
  z: number;
  measuredHeightM: number;
  storeysAboveGround: number | null;
  roofY: number;
}

/**
 * Ground level at the crossing, metres above Tokyo Bay mean sea level.
 *
 * The camera rig needs this before any data has loaded — a target at y = 0 puts
 * the street-level shot four metres underground — so it is a constant here rather
 * than something read from the manifest. It is not a guess: `test/scene-data.test.ts`
 * checks it against the elevation gate's measured 15.2 m, and `npm run data:scene`
 * refuses to write a terrain mesh whose height at the origin disagrees with it.
 */
export const GROUND_AT_ORIGIN_M = 15.2;

/** How far the pipeline's measured ground at the origin may sit from the constant above. */
export const GROUND_AT_ORIGIN_TOLERANCE_M = 0.5;
