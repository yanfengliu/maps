**D1 row-selector focused re-review — source repair accepted**

Reviewer: satellite_review, independent read-only review on 2026-09-27 under the inherited fleet Astra/xhigh pin. Workspace: C:/Users/38909/.codex/worktrees/shibuya-quality/maps. Base: ab0bde6aa69c13b3a3eea4ed3d075c07b6512100.

**ACCEPT the exact source repair; the prior P2 row-variety finding is resolved. No new actionable source finding.** This accepts stable per-tree selection and the preserved CPU contracts. It does not accept the rendered appearance, frame cost, post-S1 integration or complete D1 milestone.

The reviewed source SHA-256 is c9c1526f07bd7bebc3bc4edbc041b75a60a2a50c7b4d34ec3210682564f21aac; the test SHA-256 is 80e4e2e62f926957d7de77e4bad2a64cef5d6d430bfcc14fa41d23cb12d702cb. Both match before and after the review. The former source-review.md and evidence.json remain byte-identical at d1623b306ea6b0c016140bb9e4ca579bd828aa455bc4ac774e20051a9a827e49 and f4188773c28d0ca5854dc0dcc6e0fd1831dc4b0014c5a39bf724568fdc324350. This is a new authored round; the original HOLD remains preserved history.

At [vegetation.ts:33](C:/Users/38909/.codex/worktrees/shibuya-quality/maps/src/scene/vegetation.ts:33), the selector combines the source ID with centimetre-quantized mapped X/Z coordinates through integer mixing. It affects only the crown-variant stream. The existing per-source rotation stream at line 49 and colour stream at line 71 remain separate. Source position, height, radius, order and palette application are not rewritten. I compared the actual source strings: all code outside the selector/comment block is identical to the preserved first candidate. The actual test changes are limited to the fs import and new source-backed case; the four previous cases are unchanged.

Independent execution of the actual repaired TypeScript source confirms all three forms occur in every cached row:

| Row source ID | Trees | Variant 0 | Variant 1 | Variant 2 |
| --- | ---: | ---: | ---: | ---: |
| 1154063726 | 17 | 6 | 8 | 3 |
| 1154063727 | 17 | 5 | 7 | 5 |
| 1450416330 | 5 | 1 | 3 | 1 |
| 1513091301 | 5 | 1 | 3 | 1 |

Whole-scene crown pools contain 22, 32 and 18 trees. I matched every one of the 72 roots uniquely, including all 44 row members, and checked the exact retained row-memberships.json and both 72-record location-comparison files against independently produced records. The source input is still SHA-256 f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918. Reversing all records preserves each location's form, matrix and colour. Raising only terrain Y by three metres preserves each form and geometry. These checks establish identity independence from order and Y, not guaranteed variation for every possible future source dataset or collision-free identity.

In both Satellite and Cartographic, all 72 trunk/crown transforms and instance colours remain equal to the accepted ab0bde6 source and the initial D1 candidate. Branch matrices match the corresponding crowns. Every corresponding tree geometry attribute/index hash equals the first candidate. Unchanged trunk, grass and barrier geometry/transforms were compared as well. Instantiated triangles remain 1,022,976, below the main baseline of 1,089,792. The retained repaired .mjs output matches the independently loaded source for all mesh geometry, matrices, instance colours and counts in both styles. No geometry, palette, size or root preservation regression was found.

The added test at [vegetation.test.ts:102](C:/Users/38909/.codex/worktrees/shibuya-quality/maps/test/vegetation.test.ts:102) addresses the actual failure instead of repeating the selector arithmetic. It reads the pinned source, checks the four row populations, inspects the geometry actually instanced at mapped roots and requires more than one shape in each row. It rejects duplicate crown roots and checks the complete crown state against reversed input. It does not call a selector helper or hard-code expected mixed seeds. Its bound is at least two forms per row; the independent measurements above establish that this candidate actually has all three. It cannot establish that adjacent silhouettes look sufficiently different from a particular camera.

The retained source-id-only-control.log genuinely reports the new row assertion failing on row 1154063726, with one form where more than one was required; four other tests were intentionally unselected. I also independently executed the exact added test body against both preserved old and repaired source, using an in-memory Node harness with minimal node:assert-backed matchers. The old source fails that same assertion, and the repaired source passes. This is independent CPU evidence, not an additional Vitest run. Imports and the test file URL were bound to their actual dependencies; the assertion body was not rewritten.

The new input requirement is explicit and suitable for integration. Lines 103–107 pin the reviewed data/scene/decorations.json SHA-256. A missing read names the path and expected hash and instructs restoration of that scene cache. Changed bytes fail before JSON parsing and vegetation construction, with a message requiring source review before changing the pin. I exercised both branches through an injected read failure and an appended byte in the in-memory test harness, without changing the real cache. Neither path fetches data or treats absence as a skip. Root must document this reviewed-cache prerequisite for the integrated unit gate; fresh remote regeneration is not interchangeable with restoring the pinned bytes.

I read the actual worker logs: the repaired focused suite passes all five tests; build and typecheck pass; the existing Vite chunk warning remains. The retained measurement script's first run failed due to local variable shadowing, as recorded in probe-variable-error.log. That failure is not concealed or counted as a pass. The corrected script, current evidence and my separate actual-source checks succeed. No full unit suite, audit, browser, GPU, native capture or final integrated gate was run by this reviewer. git diff --check passes.

Outside the repair hunk, I reread the schema at [decorations.ts:7](C:/Users/38909/.codex/worktrees/shibuya-quality/maps/src/world/decorations.ts:7) and the integer RNG at [rng.ts:17](C:/Users/38909/.codex/worktrees/shibuya-quality/maps/src/world/rng.ts:17). Their bytes, and those of app.ts, styles.ts and tools/scene/build-decorations.ts, remain identical to the base after line-ending normalization. The already-reviewed producer still assigns one source ID to all trees inferred along a row. The repair now distinguishes those mapped roots while preserving the original streams. There is no new source schema or persistent format.

The previous visual limits remain. Geometry is unchanged by this repair, so normalized crown radii are still 12.8–20.0% smaller than the main baseline. Dusk body, branch appearance, near-camera leaf scale and natural-looking row variety need matched post-S1 native views and the short real-controls orbit. Seven tree draws remain versus three on main; lower instantiated triangles do not establish frame time or GPU cost. No whole-scene motion improvement is claimed.

All 19 repair-manifest entries and all 24 initial-retention entries match their current bytes. Exact review bindings are below; paths are relative to the source worktree unless otherwise noted:

| Evidence | SHA-256 |
| --- | --- |
| artifacts/street-detail/row-repair/file-hashes.json | 9cba4132474f88545ee7c657728a299d830a5e339f5b95ea90b510fa11fc46c1 |
| artifacts/street-detail/row-repair/initial-retention-manifest.json | 7421a468812e702e0c089e112dc967e7234970803e617083320759130c8aa2a5 |
| artifacts/street-detail/row-repair/evidence.json | 4c8710e97c2ab8d14439d47b3fbaa55c03f797db70d98f0c3d9ea49c58e62c9c |
| artifacts/street-detail/row-repair/row-memberships.json | 9d248b9e721e884a76be31ab6e4420301c169ce9c113cc14370eb179f7371568 |
| artifacts/street-detail/row-repair/location-comparison-satellite.json | 90727663f3d587d9f6885b0cb6f5f0d9a0713c89c2f2d78aabea98e5c59bb930 |
| artifacts/street-detail/row-repair/location-comparison-cartographic.json | 6ffd233725dbf6294da72e50129b054875ca87620e0773f8a6b75eb0a8df2a61 |
| artifacts/street-detail/row-repair/source-id-only-control.log | 942945903ae1ead62e262b6a98a4d3ef264e73b28892a3c8969b0a1905b09ad8 |
| artifacts/street-detail/row-repair/focused-tests.log | c94a7aeed8ca19ad92aee3fa579e83d15ae11397b14a8753662ba5ca38e2e223 |

The independent check receipt follows. No product/data bytes were written. Only this new primary ignored review file was created, and no browser, GPU or server resource was launched.

```json
{
  "bound": "Independent Node in-memory source and exact added-test-body execution; minimal node:assert-backed matcher harness, injected fs only for missing/changed controls; not a Vitest or GPU/full-gate run.",
  "base": "ab0bde6aa69c13b3a3eea4ed3d075c07b6512100",
  "before": {
    "source": "c9c1526f07bd7bebc3bc4edbc041b75a60a2a50c7b4d34ec3210682564f21aac",
    "test": "80e4e2e62f926957d7de77e4bad2a64cef5d6d430bfcc14fa41d23cb12d702cb"
  },
  "after": {
    "source": "c9c1526f07bd7bebc3bc4edbc041b75a60a2a50c7b4d34ec3210682564f21aac",
    "test": "80e4e2e62f926957d7de77e4bad2a64cef5d6d430bfcc14fa41d23cb12d702cb"
  },
  "repairHashesVerified": 19,
  "retainedHashesVerified": 24,
  "sourceChangeOnlySeedBlock": true,
  "checks": [
    {
      "style": "satellite",
      "matches": 72,
      "pools": [
        {
          "variant": "vegetation:canopies:0",
          "count": 22
        },
        {
          "variant": "vegetation:canopies:1",
          "count": 32
        },
        {
          "variant": "vegetation:canopies:2",
          "count": 18
        }
      ],
      "reverseStable": true,
      "terrainYIndependent": true,
      "geometryHashesUnchanged": true,
      "triangles": 1022976,
      "recordArtifactSha256": "90727663f3d587d9f6885b0cb6f5f0d9a0713c89c2f2d78aabea98e5c59bb930"
    },
    {
      "style": "cartographic",
      "matches": 72,
      "pools": [
        {
          "variant": "vegetation:canopies:0",
          "count": 22
        },
        {
          "variant": "vegetation:canopies:1",
          "count": 32
        },
        {
          "variant": "vegetation:canopies:2",
          "count": 18
        }
      ],
      "reverseStable": true,
      "terrainYIndependent": true,
      "geometryHashesUnchanged": true,
      "triangles": 1022976,
      "recordArtifactSha256": "6ffd233725dbf6294da72e50129b054875ca87620e0773f8a6b75eb0a8df2a61"
    }
  ],
  "rows": [
    {
      "sourceId": 1154063726,
      "count": 17,
      "counts": [
        6,
        8,
        3
      ],
      "oldVariants": [
        0
      ]
    },
    {
      "sourceId": 1154063727,
      "count": 17,
      "counts": [
        5,
        7,
        5
      ],
      "oldVariants": [
        1
      ]
    },
    {
      "sourceId": 1450416330,
      "count": 5,
      "counts": [
        1,
        3,
        1
      ],
      "oldVariants": [
        1
      ]
    },
    {
      "sourceId": 1513091301,
      "count": 5,
      "counts": [
        1,
        3,
        1
      ],
      "oldVariants": [
        0
      ]
    }
  ],
  "testCases": [
    {
      "case": "exact added test body against preserved old selector",
      "outcome": "failed as required",
      "message": "Mapped row 1154063726 must contain more than one crown form; observed 1 expected > 1"
    },
    {
      "case": "exact added test body against repair",
      "outcome": "passed"
    },
    {
      "case": "exact added test body with injected missing read",
      "outcome": "failed with path, expected hash and restoration instruction",
      "message": "Tree row regression requires the reviewed cached data/scene/decorations.json (SHA-256 f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918); restore that scene cache before this test. It never downloads source data."
    },
    {
      "case": "exact added test body with injected changed bytes",
      "outcome": "failed before scene construction",
      "message": "Tree row regression requires the reviewed decorations bytes; changed source needs review before changing this pin."
    }
  ],
  "priorReviewUnchanged": true,
  "sourceHashManifest": "9cba4132474f88545ee7c657728a299d830a5e339f5b95ea90b510fa11fc46c1",
  "retentionManifestSha256": "7421a468812e702e0c089e112dc967e7234970803e617083320759130c8aa2a5",
  "rowMembershipSha256": "9d248b9e721e884a76be31ab6e4420301c169ce9c113cc14370eb179f7371568",
  "workerEvidenceSha256": "4c8710e97c2ab8d14439d47b3fbaa55c03f797db70d98f0c3d9ea49c58e62c9c"
}
```