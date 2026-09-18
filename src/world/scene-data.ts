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
  pavements: `${SCENE_DATA_BASE}/pavements.mesh`,
  markings: `${SCENE_DATA_BASE}/markings.mesh`,
  buildingsTileset: `${SCENE_DATA_BASE}/buildings/tileset.json`,
  buildingIndex: `${SCENE_DATA_BASE}/buildings/buildings.json`,
});

/**
 * One interior rim the terrain cap closed, as it was measured before the fan.
 *
 * The fan adds exactly one vertex per rim — the rim's own vertex mean — and one
 * triangle per rim edge. That apex is **invented**: no survey measured it, and the
 * triangles between it and the rim do not have to lie on the source TIN. The record
 * exists so the invention is nameable in the shipped payload, where the cap vertices
 * are otherwise just appended after the source vertices and cannot be told apart
 * from surveyed ground.
 */
export interface ClosedTerrainRim {
  /** Rim vertices the fan walked, and therefore triangles it added. */
  rimVertexCount: number;
  /** Closed length of the rim in metres. */
  rimPerimeterM: number;
  /** The invented apex: the rim vertices' mean position, world metres. */
  apexX: number;
  apexY: number;
  apexZ: number;
  /** Magnitude of the rim's projected area, m². */
  rimAreaM2: number;
}

export interface SceneManifest {
  /** Bumped when the shape of anything under `data/scene/` changes. */
  version: 1;
  /*
    No build timestamp here, on purpose. This file is served, so `sceneTreeDigest`
    folds its bytes into the certificate's scene binding; a `builtAt` would make
    that digest a *build* identity, so that every rebuild moved it with
    byte-identical geometry and no certificate's scene binding could be re-derived
    after one. When a build happened belongs in the devlog, not in a payload the
    certificate hashes. `tools/scene/scene-manifest.ts` carries the rule and
    `test/scene-manifest.test.ts` holds it.
  */
  terrain: {
    triangleCount: number;
    insideAoiTriangleCount: number;
    vertexCount: number;
    minimumHeightM: number;
    maximumHeightM: number;
    groundAtOriginM: number;
    /**
     * Interior rims of the source TIN's relief that the build closed with a fan.
     *
     * These count **invented** surface, not recovered ground. The gate that
     * measures them (`verifyTerrainIsWatertight`) is topological: it counts rim
     * edges and identifies the mesh's outer rim, so it says the ground is closed.
     * It does not claim the added triangles resemble the source survey, does not
     * check that the projection is covered, and cannot see a hole whose rim was
     * welded into a seam. The mesh's outer silhouette is outside its scope.
     */
    closedHoleCount: number;
    /** Triangles that fan cost. Zero for a source whose relief is already closed. */
    capTriangleCount: number;
    /**
     * Where that invention is, rim by rim, so a reviewer can find it without
     * re-running the census. Each record is measured on the rim *before* the fan
     * was added: the apex is the rim's own vertex mean, and it is a new vertex that
     * no survey measured.
     */
    closedRims: readonly ClosedTerrainRim[];
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
