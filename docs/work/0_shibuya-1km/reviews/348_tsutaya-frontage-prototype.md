# 348 — Lower TSUTAYA frontage prototype

2026-09-28. Worker handoff; first visual prototype frozen for independent review. Base product is 2146b2b5972b40ea615cce8dcfb4542e191d480c in the retained crossing-frontage checkout. Root owns integration and final acceptance. No code commit or second visual candidate.

## Outcome and limits

Four jambs and one continuous header define three open lower glazing bays beneath the original TSUTAYA lettering. Five boxes add 60 triangles and one shared neutral MeshStandardMaterial, with 0.22 m jamb width, 0.28 m header height, and 0.34 m physical depth beginning 0.01 m in front of the source wall. The mapped total span is about 13.37 m including jambs. Header top is about Y18.90; feet follow the accepted pavement around Y15.4–15.6, making the total height about 3.3–3.5 m. The initial approximate 3.1 m brief height was refined by the source UV mapping and footing.

The source wall, photograph, sign text, lighting, post chain, camera, agents and served data remain intact. This adds shallow relief, not an interior, wall opening or surveyed reconstruction. The local helper runs after the photographic material pass and before cache admission; the existing tile transaction and ordinary tile disposal own all added resources. Each authored mesh retains parent-building batch membership, with explicit source:false metadata, so the existing city section pass can process it without exemption. Both styles keep the same geometry; Cartographic received only a basic real-control roundtrip regression check.

## Provenance and assumptions

The existing CROSSING_CORNER pin binds data/data518.b3dm SHA-256 5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b, GML bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27, original front triangles 494/495, world plane/outward normal, and photographic UV0. The helper interpolates original source UVs rather than the unrelated 2.9 m shader grid. The original lower polygon eligibility and source SHA check run first; helper checks retain the front plane, normal, GML attribute and lower source face bounds.

Inspected the embedded 4096 atlas and the native, unscaled extraction source-frontage-native.png (atlas rectangle x255–404, y3380–3594; SHA-256 6c14b22f717dd9e10230a68bba76df937ba78069832e23a4a2fd28dfe6ad8aaf). The photo visibly supports a continuous lowest-storey glass band and pale vertical divisions below the lettering. Atlas x281,314,347,379 and header y3549 are approximate feature selections at this limited source resolution; exact frame spacing, metal dimensions and projection depth are authored presentation assumptions. The original photographic backing is unchanged. End columns were moved inward one source pixel after the actual pavement guard detected their full width crossing the infill ends.

## Focused verification

26/26 tests pass across crossing-corner-material.test.ts and unchanged rail-runtime.test.ts; typecheck and both production builds pass. The actual pinned tile is decoded in the focused test, and original position/normal/UV/index bytes stay unchanged. Every jamb foot matches the preserved pavement mesh within 2 mm, with no ground penetration. A conservative rectangle covering the entire surround clears all preserved walking polyline segments expanded by a 0.4 m body envelope; this is a static local clearance bound, not route/crowd qualification. New geometry/material resources dispose exactly once through the existing transaction on successful transfer, cancellation, and rejection. The actual buildingSections pass is exercised after the plugin.

The first browser startup failed before producing any candidate image because new relief initially lacked the parent batch ID required by buildingSections. Its error and owned process closure remain in candidate1-startup-failed. The fix added verified parent membership and the actual section-pass regression; it did not bypass the section guard. No source asset or shared dependency installation occurred.

## Native comparison

Evidence root: C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/frontage348-20260928. All six originals were inspected separately at native 1280×720. Both successful captures use the same existing poses and input controls. All position, target, angle and distance deltas are exactly zero. Lighting, active post state, style and zero-actor default state match across arms; environment intensity is nonzero. The served scene digest remains dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce. Source, build, data and runner bindings are unchanged within each arm. Successful capture times were 77.755 s and 76.461 s, not FPS measurements.

| Original view | Baseline SHA-256 | Candidate 1 SHA-256 |
| --- | --- | --- |
| hero-satellite-noon-crossing.png | 4ac1299d2a9cf7350e6dc695bc4464cf93112a420310e96efe79bcbcc584c11a | 676c0c15cb3653017c71f94eaf6cae345177ddba01fbd746e658e027bd91633b |
| near-satellite-noon-frontage.png | 424a435f4fefed53ef6c84b53491b08c1cc3122858c8f4680971e20297ec86db | be672b1768d1b33b83c65a8c7e138b88416dec22420a672cad79e1cdaaddcf75 |
| hero-satellite-dusk-crossing.png | 40357415d40aa728115ff891265c3a8c724332da39d818e5dde83983df186485 | efc2c47697dec3c25c52bef070e7cba9da3da3943d5e030c2b1ed2cfbf2a4001 |

Each image path is evidence-root/baseline/<view> or evidence-root/candidate1/<view>. Comparison JSON SHA-256: d87e52ae3e1bfbc547c151e408ad9abe21aacb447d264b89ea8af3f321f36e63. Worker visual finding: bay divisions and shallow return edges are recognizable in the near and noon-crossing views, with the original lettering still visible; dusk relief is restrained. This is a bounded physical-detail change, not a full-scene photorealism claim. Root/independent review decides whether the visible gain clears acceptance.

## Handoff and cleanup

- src/scene/crossing-frontage.ts: 2444b17cedf2be61623291f9cee9b17895a8a3c34a18ec10969e1bdcb56f4376
- src/scene/facade-textures.ts: 487688cf38d61c54db1dd861b0210e96dc08174c133bf6a1e0400c32b64ab911
- test/crossing-corner-material.test.ts: d56a4c429be61ef68416521702b0b58891d41ac2ed0fb1d1aa831ceafc108f39

Candidate files and six originals are frozen. Each successful run closed context, browser, browser server and preview in finally, and exact-identity/port-4324 observations show no survivors. Final observation covers the failed startup too. Private task TEMP and cache directories were removed after all three run identities were absent; retained source/reference/native evidence stays ignored. Config loading uses the existing Vite API with configFile:false and the Vitest runner loader with private cache paths; no shared-dependency immutability claim is made from an unperformed full inventory. Manual historical-worktree cleanup was not touched. All-five final gates and integrated review are deferred to root after visible acceptance.
