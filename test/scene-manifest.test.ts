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
import { sceneTreeDigest } from "../tools/visual/verify-output.js";

function facts(): SceneManifestInputs {
  return {
    terrain: {
      triangleCount: 183415,
      insideAoiTriangleCount: 81052,
      vertexCount: 92283,
      minimumHeightM: 8.71,
      maximumHeightM: 36.35,
      groundAtOriginM: 15.2,
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
