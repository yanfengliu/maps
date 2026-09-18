/**
 * The manifest the scene build publishes, and the one thing it must never carry.
 *
 * `data/scene/manifest.json` is served, so it is one of the files
 * `sceneTreeDigest` folds into the certificate's scene binding. That digest is a
 * **content** identity and has to stay one: a rebuild from identical inputs must
 * re-derive the digest a certificate binds, and only a real change of content may
 * move it. A build timestamp in this file breaks exactly that — every
 * `npm run data:scene` would move the digest with byte-identical geometry, so a
 * reviewer could not tell a rebuild from a content change and no certificate's
 * scene binding could ever be re-derived after one.
 *
 * So the manifest is a function of the measured facts and of nothing else. There is
 * no clock in this file and there must not be one: when a build happened is a fact
 * about the run, and it belongs in the devlog or the commit, not in a payload the
 * certificate hashes. `test/scene-manifest.test.ts` holds that line by building the
 * manifest twice from the same facts and requiring the bytes to agree.
 *
 * The rounding lives here rather than at the call site so that the published number
 * and the number the manifest records are the same value, which is what makes the
 * two builds agree byte for byte. The cap's per-rim records are rounded the same way.
 */

import type { ClosedTerrainRim, SceneLandmark, SceneManifest } from "../../src/world/scene-data.ts";

export interface SceneManifestInputs {
  terrain: {
    triangleCount: number;
    insideAoiTriangleCount: number;
    vertexCount: number;
    minimumHeightM: number;
    maximumHeightM: number;
    groundAtOriginM: number;
    closedHoleCount: number;
    capTriangleCount: number;
    closedRims: readonly ClosedTerrainRim[];
  };
  roads: {
    roadCount: number;
    lod3RoadCount: number;
    drapedRoadCount: number;
    triangleCount: number;
    lowestVertexM: number;
    highestVertexM: number;
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
  landmarks: readonly SceneLandmark[];
}

/** The manifest for these facts. Same facts in, same bytes out. */
export function sceneManifest(inputs: SceneManifestInputs): SceneManifest {
  // The three cap facts have to agree with each other in the file a reviewer reads:
  // one record per closed rim, and one cap triangle per rim edge. A `map` that
  // dropped a record, or a wiring slip between them, would otherwise publish a
  // payload that contradicts itself and looks complete.
  const rimTriangles = inputs.terrain.closedRims.reduce(
    (total, rim) => total + rim.rimVertexCount,
    0,
  );
  if (inputs.terrain.closedRims.length !== inputs.terrain.closedHoleCount) {
    throw new Error(
      `The scene manifest was given ${inputs.terrain.closedRims.length} closed terrain rims but ` +
        `${inputs.terrain.closedHoleCount} as their count, so the payload would disagree with itself ` +
        "about how much ground the cap invented. Both come from the same cap summary.",
    );
  }
  if (rimTriangles !== inputs.terrain.capTriangleCount) {
    throw new Error(
      `The scene manifest's closed rims carry ${rimTriangles} rim edges between them and ` +
        `${inputs.terrain.capTriangleCount} cap triangles. The fan adds one triangle per rim edge, so ` +
        "these two numbers are the same fact and a disagreement means one of them is not the cap's.",
    );
  }

  return {
    version: 1,
    terrain: {
      ...inputs.terrain,
      closedRims: inputs.terrain.closedRims.map((rim) => ({
        rimVertexCount: rim.rimVertexCount,
        rimPerimeterM: Number(rim.rimPerimeterM.toFixed(1)),
        apexX: Number(rim.apexX.toFixed(2)),
        apexY: Number(rim.apexY.toFixed(2)),
        apexZ: Number(rim.apexZ.toFixed(2)),
        rimAreaM2: Number(rim.rimAreaM2.toFixed(1)),
      })),
    },
    roads: { ...inputs.roads },
    buildings: {
      ...inputs.buildings,
      textureMegapixels: Number(inputs.buildings.textureMegapixels.toFixed(1)),
      geoidUndulationM: Number(inputs.buildings.geoidUndulationM.toFixed(3)),
    },
    landmarks: inputs.landmarks.map((landmark) => ({ ...landmark })),
  };
}
