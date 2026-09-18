/**
 * The served scene's digest must be a content identity, not a build identity.
 *
 * `sceneTreeDigest` folds the bytes of every file the preview server serves as scene
 * data, and `data/scene/manifest.json` is one of them. If that manifest carries a
 * build timestamp then every `npm run data:scene` moves the digest with byte-identical
 * geometry, so a rebuilt scene can never re-derive the digest a certificate binds and
 * a reviewer cannot tell a rebuild from a real content change. That is exactly what
 * cost the 2026-09-17 incident its certificate binding, and it is why
 * `tools/scene/scene-manifest.ts` has no clock in it.
 *
 * Two cases, and they are the two halves of the claim:
 *
 * - two builds from the same facts produce the same bytes, so a rebuild re-derives
 *   the digest — this is the case that goes red if a timestamp (or anything else
 *   about *when* rather than *what*) comes back into the manifest;
 * - a content change still moves the digest, so the fix cannot have been to make the
 *   digest blind. A digest that ignores its input would pass the first case on its
 *   own, which is why both are here.
 *
 * **The bound.** The facts fed to `sceneManifest` below are a fixture, not a real
 * build, and the synthetic tree holds one manifest and one mesh file rather than the
 * 84 files the real payload serves. What this file proves is the property of the
 * manifest and of the digest function; that the real build produces those facts is
 * `npm run data:scene`'s own check.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sceneManifest, type SceneManifestInputs } from "../tools/scene/scene-manifest.js";
import type { ClosedTerrainRim } from "../src/world/scene-data.js";
import { sceneTreeDigest } from "../tools/visual/verify-output.js";

/**
 * The fourteen rims the real build closes, as the cap measures them.
 *
 * Real values, from the capped build of the pinned DEM: the rim counts and perimeters
 * are what `verifyTerrainIsWatertight` lists worst-first, the apex is the rim's own
 * vertex mean (which is the position the fan inserts), and the areas are the
 * projected rim areas. They are here so the manifest's record of the invention is
 * pinned against the census rather than against a synthetic shape.
 */
const CLOSED_RIMS: readonly ClosedTerrainRim[] = [
  { rimVertexCount: 54, rimPerimeterM: 369.4, apexX: 426.8, apexY: 11.83, apexZ: 391.3, rimAreaM2: 1325.0 },
  { rimVertexCount: 28, rimPerimeterM: 189.7, apexX: 533.1, apexY: 11.33, apexZ: 500.5, rimAreaM2: 650.0 },
  { rimVertexCount: 24, rimPerimeterM: 169.7, apexX: 329.3, apexY: 12.35, apexZ: 308.9, rimAreaM2: 550.0 },
  { rimVertexCount: 22, rimPerimeterM: 155.6, apexX: 276.8, apexY: 12.25, apexZ: 251.4, rimAreaM2: 500.0 },
  { rimVertexCount: 16, rimPerimeterM: 109.0, apexX: 586.5, apexY: 10.8, apexZ: 568.9, rimAreaM2: 350.0 },
  { rimVertexCount: 14, rimPerimeterM: 99.0, apexX: 656.8, apexY: 10.37, apexZ: 636.4, rimAreaM2: 300.0 },
  { rimVertexCount: 14, rimPerimeterM: 99.0, apexX: 621.8, apexY: 10.34, apexZ: 606.4, rimAreaM2: 300.0 },
  { rimVertexCount: 15, rimPerimeterM: 89.5, apexX: 579.0, apexY: 26.42, apexZ: -403.1, rimAreaM2: 512.5 },
  { rimVertexCount: 8, rimPerimeterM: 56.6, apexX: 694.3, apexY: 9.74, apexZ: 673.9, rimAreaM2: 150.0 },
  { rimVertexCount: 8, rimPerimeterM: 52.4, apexX: 707.4, apexY: 10.57, apexZ: 693.9, rimAreaM2: 150.0 },
  { rimVertexCount: 6, rimPerimeterM: 42.4, apexX: 496.8, apexY: 10.37, apexZ: 461.4, rimAreaM2: 100.0 },
  { rimVertexCount: 6, rimPerimeterM: 42.4, apexX: 566.8, apexY: 10.35, apexZ: 541.4, rimAreaM2: 100.0 },
  { rimVertexCount: 6, rimPerimeterM: 42.4, apexX: 681.8, apexY: 9.95, apexZ: 656.4, rimAreaM2: 100.0 },
  { rimVertexCount: 6, rimPerimeterM: 38.3, apexX: 714.3, apexY: 10.55, apexZ: 711.4, rimAreaM2: 100.0 },
];

function facts(): SceneManifestInputs {
  return {
    terrain: {
      triangleCount: 183415,
      insideAoiTriangleCount: 81052,
      vertexCount: 92283,
      minimumHeightM: 8.71,
      maximumHeightM: 36.35,
      groundAtOriginM: 15.2,
      closedHoleCount: 14,
      capTriangleCount: 227,
      closedRims: CLOSED_RIMS,
    },
    roads: {
      roadCount: 3248,
      lod3RoadCount: 1173,
      drapedRoadCount: 2075,
      triangleCount: 79367,
      lowestVertexM: 9.1,
      highestVertexM: 33.4,
      offTerrainPolygonCount: 338,
    },
    buildings: {
      tileCount: 67,
      buildingCount: 2686,
      insideAoiCount: 1740,
      lod1Count: 64,
      lod2Count: 1676,
      missingHeightCount: 62,
      missingStoreysCount: 297,
      triangleCount: 532315,
      textureMegapixels: 551.8719,
      largestTexture: "4096x4096",
      geoidUndulationM: 36.786123,
    },
    landmarks: [
      { name: "Shibuya Scramble Square", gmlId: "bldg_fixture", x: 157.6, z: 124.0, measuredHeightM: 220, storeysAboveGround: 45, roofY: 245.6 },
    ],
  };
}

let root = "";

/** A served scene tree: one manifest and one mesh, written the way the build writes them. */
async function sceneTree(directory: string, mesh: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "manifest.json"), `${JSON.stringify(sceneManifest(facts()), null, 2)}\n`, "utf8");
  await writeFile(join(directory, "terrain.mesh"), mesh, "utf8");
}

describe("the scene manifest is a function of its facts", () => {
  it("carries no clock, so two builds of the same facts are the same bytes", () => {
    const first = JSON.stringify(sceneManifest(facts()), null, 2);
    const second = JSON.stringify(sceneManifest(facts()), null, 2);
    expect(second).toBe(first);
    // A timestamp is the specific thing that must not come back, so it is named
    // rather than left to the equality above: an ISO instant anywhere in the
    // manifest's values would move the digest on every rebuild.
    expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(Object.keys(JSON.parse(first) as object)).not.toContain("builtAt");
  });

  it("publishes the rounded numbers it records", () => {
    const manifest = sceneManifest(facts());
    expect(manifest.buildings.textureMegapixels).toBe(551.9);
    expect(manifest.buildings.geoidUndulationM).toBe(36.786);
    // The rounding happens on the published value rather than beside it, so a fact
    // that is already published cannot be recorded unrounded and drift.
    expect(JSON.stringify(manifest.buildings)).toContain("\"textureMegapixels\":551.9");
  });

  it("records the invented ground rim by rim, so a reviewer can find it", () => {
    const manifest = sceneManifest(facts());
    expect(manifest.terrain.closedHoleCount).toBe(14);
    expect(manifest.terrain.capTriangleCount).toBe(227);
    expect(manifest.terrain.closedRims).toHaveLength(14);
    expect(
      manifest.terrain.closedRims.reduce((total, rim) => total + rim.rimVertexCount, 0),
      "the closed rims' own vertex counts must add up to the cap's triangle count",
    ).toBe(227);
    // The F1 rim — 15 rim vertices, 89.5 m, (579.0, -403.1) at 26.42 m — is the one
    // the defect was reported from, and it is the reason the apex height is recorded
    // at all: the fan puts a vertex 26 m above sea level in the ground there.
    const f1 = manifest.terrain.closedRims.find((rim) => rim.rimVertexCount === 15);
    expect(f1).toEqual({
      rimVertexCount: 15,
      rimPerimeterM: 89.5,
      apexX: 579,
      apexY: 26.42,
      apexZ: -403.1,
      rimAreaM2: 512.5,
    });
    // The records are rounded the way the other measured facts are, so a rebuild
    // from the same mesh writes the same bytes.
    const unrounded = sceneManifest({
      ...facts(),
      terrain: {
        ...facts().terrain,
        closedRims: [{ ...CLOSED_RIMS[0]!, apexX: 426.80001, rimAreaM2: 1325.04 }],
        closedHoleCount: 1,
        capTriangleCount: 54,
      },
    });
    expect(unrounded.terrain.closedRims[0]!.apexX).toBe(426.8);
    expect(unrounded.terrain.closedRims[0]!.rimAreaM2).toBe(1325.0);
  });

  it("refuses to publish cap facts that disagree with each other", () => {
    // The count, the triangle total and the per-rim records are the same fact told
    // three ways. A file where they disagree looks complete and is not.
    expect(() =>
      sceneManifest({ ...facts(), terrain: { ...facts().terrain, closedHoleCount: 13 } }),
    ).toThrow(/13 as their count/);
    expect(() =>
      sceneManifest({ ...facts(), terrain: { ...facts().terrain, capTriangleCount: 226 } }),
    ).toThrow(/cap triangles/);
  });
});

describe("sceneTreeDigest over a rebuilt tree", () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "maps-scene-digest-"));
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("agrees across two builds of the same content and moves when content moves", async () => {
    const first = join(root, "first");
    const rebuilt = join(root, "rebuilt");
    const changed = join(root, "changed");
    await sceneTree(first, "terrain-fixture");
    await sceneTree(rebuilt, "terrain-fixture");
    await sceneTree(changed, "terrain-fixturf");
    const mounts = (directory: string): { route: string; directory: string }[] => [{ route: "/scene", directory }];

    const a = await sceneTreeDigest(mounts(first));
    // Sleep is not the mechanism — there is no clock in the manifest — but the two
    // trees are written in sequence and a rebuild that took even a millisecond would
    // have differed under the old manifest, which is the regression this holds.
    await new Promise((resolve) => setTimeout(resolve, 25));
    const b = await sceneTreeDigest(mounts(rebuilt));
    const c = await sceneTreeDigest(mounts(changed));

    expect(b.digest).toBe(a.digest);
    expect(b.bytes).toBe(a.bytes);
    expect(b.files).toBe(a.files);
    expect(c.digest).not.toBe(a.digest);
  });
});
