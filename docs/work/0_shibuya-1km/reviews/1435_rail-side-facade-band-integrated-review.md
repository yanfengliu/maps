# 1435 — integrated rail-side facade band review

2026-10-17. Independent read-only review of PRIMARY against committed base `7e104ed84316debb1c2ac034b6076e605d22516c`. **PASS for this finite band; no open material finding.** Root owns commit, push and retirement. No reviewer browser, GPU, gate, source edit or CLI review was launched. Instructions, compact plan, local rules and review runbook were read; no unverifiable model telemetry is asserted.

## Exact target

Freshly read PRIMARY and frozen source; all five raw files match worktree and freeze copies. `artifacts/office-band1434/code-freeze.json` SHA-256 `f444b4991d8a16252f95a93563ba0412934ecae91dd77de232591e8c3e530013` binds these five staged files. Git LF normalization is separate. Protected facade-emission and old twelve-window sources remain unchanged.

| Path | Bytes | Raw SHA-256 |
| --- | ---: | --- |
| src/scene/rail-facade-recipes.ts | 55865 | ff0bda5fde64c3da0e311a053927785d8ae4f050424134ad7e02aaf39cf1bfc4 |
| src/scene/rail-facades.ts | 17961 | 43f92c20df1e7de92e8e29b499690907a97a33de20c04baf695060dd9765fb79 |
| src/scene/facade-textures.ts | 20360 | 17ad03a771e4059d5547ad39ecc45911c71f90309e5bfef87c5c07c2fb5af161 |
| src/render/post.ts | 15502 | ae2435d754c5bb934e46c68e0e53fbc8b76c9674acb26763195dda1b4825eb59 |
| test/rail-facades.test.ts | 18379 | 279d250d8f187532cd7f3d83eb22aafc6ccec2c4859c1e24c025c49c5e818436 |

## Source, geometry and lifetime

Native hotel, office15-front and office24-front source crops support eight selected photo rows each: data503/batch4 has 80 narrow windows; data473/batch15 eight broad strips; batch24 eight dark bands. Batch4 is lodging, 13 metadata floors/42m; offices are 10/34.6m and 11/33.4m. Photo rows differ from metadata floors. Blank preliminary office crop excluded. Signs, shops, roofs and white balcony/spandrel photography remain intact.

`rail-facades.ts:32–73` checks tile digest, metadata, parser placement, attributes, winding and finite coverage. Lines 49–55 require each ordered original triple exactly once in the surviving index, accommodating earlier production rail face removal. Missing, mutated, reversed or duplicate triples refuse. The combined production test snapshots all original attribute/index references, types, shapes and bytes after rail replacement.

Local folds/admission limits are hotel 1.180989/1.206mm, office15 0.287238/0.313mm, office24 0.000264096/0.026mm. The finite mask uses local limit plus 0.020mm; outer returns reach its negative (`rail-facades.ts:76–78,110–128`). Float32 geometry supplies opaque jamb/head/sill/sides/ceiling/floor/back, glazing at −0.30m and rear at −1.25m. No apparent slit in useful front/oblique captures. This local admission does not establish surveyed interiors. Eight batches add 8,544 triangles/1,025,280 geometry bytes; zero new textures/lights.

Four-pass hooks compose finite masks. Offices share one mask; data503 reuses old-twelve depth/distance/GTAO materials (`rail-facades.ts:80–95,144–150`). Cleanup restores only its own current hook, preventing resurrection after earlier forward cleanup. Registration uses logical release (`:153`). Production tests use actual rail adaptation, installed loader/plugin, two GPU unload/returns and exact original beauty/key/depth/distance/normal restoration. Independent photo bounds (`test/rail-facades.test.ts:29–34`) supply the 96-window oracle. Original data503 rail SHA/error ordering remains covered.

Outside-diff spot checks included `buildings.ts:263,278–316` (rail plugin and replacement precede facade preparation), `rail-trial.ts:120–139,165` (kept ordered triples and index replacement), `tile-transaction.ts:41` (forward cleanup before resources), `upper-windows.ts:112–121` (earlier hook release), `normal-pass.ts:22–40` (material selection/restoration), and `aoi-cutout.ts:14–29` (later clipping does not replace hooks). Installed `3d-tiles-renderer` 0.5.2 `UnloadTilesPlugin.js:160–192` disposes GPU resources while retaining the CPU scene. These production contracts agree with the final tests.

## Native and gate evidence

All 22 local final PNG originals were individually viewed at 1280×720 and rehashed against `runner/final/payload/capture.json`, SHA `b6cdd16f23890893a5f286c9ea92853bbcf3cfd2914ed8b938d6dabcb5f98f1d`. Noon/dusk block, full-front, all three front/oblique pairs, held-out seed143417 and old-twelve-window views support a coherent physical band. Close hotel and some office views crop the group; full-front03 and held-out10 provide group coverage. Block02 crops the hotel's bottom and is not whole-group evidence. No contact sheet or prototype is substituted for these originals.

`review1435/native22-inspection.json` SHA `8d3e0d7c3c63a538e56ff21eb42b6f48944b6ee2da72ea7a2102a31c22751490` records all raw image hashes, poses and timestamps. Within-lighting gaps are 6.469–8.249s; the lighting reload gap is 28.868s. Basic pointer Satellite→Cartographic and keyboard return preserve camera and the same started actor; ticks advance 110→152 and 219→261, travel 1.867→2.667m and 3.943→4.744m, with no refusal. This establishes sampled control/progress behavior, not continuous motion.

The actual PRIMARY all-five logs and canonical completion were read: build 2.407s, types 5.721s, unit 131 files/1,170 tests passing (Vitest 84.81s), visual 320.265s, audit 1.871s. Build retains its large-chunk warning; audit reports two moderate Vitest-related advisories and passes the high threshold. The earlier empty focused types log alone was not counted as a result. Focused six-file/42-test output is green. Prototype1's zero-image refusal from shifted face offsets and the initial production-test setup failures are retained history, not successful render evidence.

PRIMARY certificate `artifacts/visual/complete.json` SHA `3140a425e335d99bd9440cfc8ea8b04ee00838a6b636a405d1193432c0bb2617`, run `dec17d5d577ae981`, binds RTX 4090/driver616.64. Independently rehashed all 44 certified PNGs and read all three actual lifecycle records: navigation 242/237/239ms, replacement 19831/19549/19535ms, errors empty and teardown completed. Individually viewed all 22 canonical Satellite originals plus both Cartographic return originals at native size. Their surroundings show no material regression; wide views do not establish every facade detail. The other 22 certified Cartographic images were hash-checked, not visually reviewed here. The two extra return images bind to hero.json and preserve their full before/after camera.

`review1435/canonical-inspection.json` SHA `f8ae69dfce3ba90f9183bc76bc06e18aab322713c48915ec6b990ba887dfa1bc` retains the 44 hashes, inspected subset, poses/timing, three raw-record hashes and build/source comparison. All four runtime outputs exactly match local capture pins and preserved WT dist; the two debug source maps differ, so no whole-dist equality is claimed. Scene cache remains 156 files/364,187,965B, digest `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`. Local capture reports six closures/owned identities absent; PRIMARY final-resources records 44 owned identities absent. No reviewer process requires cleanup.

## Finding disposition and limits

1435-F1, preserved in authored round 1435a, is closed. `extract-gml.py:6–7` wrote CRLF on Windows after hashing LF text, so the old receipt did not name raw disk bytes. The worker preserved that receipt/XML and added `source-gml-raw.json`, SHA `a5d44281f7a318e3fa53d03e9a40a9245062e9de099da09ed044cf78bdc0c366`. Independently checked all three actual raw hashes/counts and their LF equivalence to the original full-GML spans; CRLF deltas are 1854/1145/657 bytes. Whole GML remains SHA `88dab9e2cc41dc75b37a83ca3ad78dfa0eb1f081b918af56fc79851c80150724`. This evidence-only correction changes no frozen source or rendered output.

Acceptance is bounded to these 96 source-bound apertures, composition with the existing twelve, the observed views and actual cached production lifecycle. All fourteen full-deliverable criteria remain open; population, target FPS, continuous motion, fresh data rebuild and detailed Cartographic polish remain unqualified. No remote-gate or final-commit claim is made by this pre-commit review. Any later product-byte change needs affected re-review and evidence.
