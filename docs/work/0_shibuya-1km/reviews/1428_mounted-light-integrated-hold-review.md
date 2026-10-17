# 1428 — Initial integrated mounted-light review: HOLD

2026-10-17. Independent reviewer: native agent /root/review1428_integrated. Target: primary C:/Users/38909/Documents/github/maps at base b1e4dcf3eb77a79468b3adfe8cb42de94e70b61b plus the frozen four-file east-only candidate. This first report preserves the failed integrated round; it is not final acceptance and must not be overwritten by the repair review.

## Verdict and material finding

**HOLD — 1428-F1 is blocking.** The fitting passes the bounded static appearance judgment below, but the new disposal callback breaks the actual installed GPU-unload path. The canonical visual gate failed on that path. No new complete certificate exists, the hardware lifecycle lane was not reached, and audit was not run after failure. The candidate must not be adopted as verified.

**1428-F1 — Material disposal is not logical tile disposal, and removing children during GPU unload breaks traversal.** Location: src/scene/peripheral-mounted-light.ts:95–96. The callback bound to both authored materials synchronously removes the fitting group, light, and target and deletes its prepared/active state on every material dispose event. The actual caller outside the diff, node_modules/3d-tiles-renderer/src/three/plugins/UnloadTilesPlugin.js:160–192, traverses the retained scene and calls material.dispose() at line 171 to free GPU allocations for later reupload. It expressly retains the model. The active Object3D traversal is therefore shortened underneath its fixed child loop, producing undefined.traverse. Even postponing removal into a microtask alone would destroy the retained fitting and make it disappear when that cached tile becomes visible again.

This is observed production behavior, not a hypothetical callback concern. Canonical run d99c403d3c01bf82 failed the Satellite sweep with TypeError: Cannot read properties of undefined (reading 'traverse') at index-BncSi16V.js:1:76529. The full pageError in trace.zip entry 1-trace.trace has the next relevant frame cA.unloadTileFromGPU at index-BncSi16V.js:4515:11776, then the unload callback and unloadUnusedContent. The trace SHA-256 is afdfe8216aa2541bc97c27dfa3870bbfe3c5b282a240ad034b05eac313f5a244. The retained copy for later repair rounds is artifacts/peripheral-lighting1426/failed-canonical-d99c403d/trace.zip (292,600,252 bytes; same independently read failure digest); its retention.json records the copy from the original Playwright output. The wrapper log is artifacts/commercial-corner-20261014/canonical-gate/mounted1426-integrated/run.log.

Smallest justified repair: bind logical fitting/light cleanup to the true tile transaction release, cancellation, rejection, or tile disposal, while leaving meshes, group membership, source/prepared ownership, light, and power usable through GPU-only release/reupload. Add a regression exercising the installed UnloadTilesPlugin on the actual production fitting, verifying unload does not throw or remove it, then verifying return/use and final logical release. Preserve the existing cancellation/rejection/replacement checks. A queued detach alone is not sufficient. A fresh integrated review and fresh five-gate evidence are required after repair. Existing CPU lifetime checks exercised logical release, not the installed GPU unload that actually failed.

## Exact reviewed target and method

I read AGENTS.md, the local rules, compact plan, lessons, and canonical fleet multi-CLI runbook, then the actual changed source/test and production callers. Root confirms the accepted spawn controls were model gpt-6-astra, reasoning_effort xhigh, fork_turns none. This is a fresh native subagent session, not a CLI review; no CLI version/modelUsage transcript or independent runtime-model telemetry exists. I attest the configured spawn controls as reported by root and my actual native read access, not unobserved CLI metadata. I launched no browser, server, GPU lane, network operation, CLI reviewer, or subagent. I changed no source, test, plan, or tracked document. The only write is this authored report. Git reads used command-scoped safe.directory after ownership refusal; no global configuration changed.

Frozen manifest artifacts/peripheral-lighting1426/source-freeze.json has raw SHA-256 2042f81a88f0a240f5fd162b54c4daeaa38b33f3ac38063afed4d46617cf9879. All five whitelist entries still match at the end of source review:

| Path | Raw SHA-256 |
| --- | --- |
| src/scene/facade-textures.ts | a7c55504ab2e3caa2169c41f89bb96be4aae28d4c2ed70883246dc977b099742 |
| src/scene/peripheral-mounted-light.ts | 376ef61045b775e18883dedc5b945e1a1293f05e456e3292e37a98369a9646c6 |
| src/scene/peripheral-mounted-light-recipe.ts | 37f8e7346aa8035d6a8193eff5ec4794691360367a45389ee834939934c18db7 |
| test/peripheral-mounted-light.test.ts | 8a35e11452511fcfcb314cb65fea9023d1993264b6e001d20a2c380a23dff072 |
| docs/work/0_shibuya-1km/reviews/1426_peripheral-mounted-light-implementation.md | c23fadaf63301b1431a6fbaaac8afd24625de410115b94deecc05bfcf802597b |

The protected user test/facade-emission.test.ts remains raw SHA-256 48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a. Old 991 snapshots were untouched. I also read root's narrow AGENTS.md cached-source addition: its two source pins and restoration instructions agree with the actual test; it adds no acceptance claim. The current plan retains 35 implementation items and all 14 final criteria OPEN.

## Source and integration judgment, apart from F1

The implementation is a finite source-bound fitting, not a lighting framework. The actual fetch hook in facade-textures.ts:175–186 shares the ordinary request and retains only the digest for admitted tiles. Preparation precedes atlas rebuilding at line 217; addition follows existing material processing at line 278. There is no separate remote fetch or source-atlas mutation introduced by this candidate.

peripheral-mounted-light.ts:17–53 checks the actual data498 tile digest, batch/GML bldg_07a23c05-99d6-439c-bd98-f0f873f8a470, photographic primitive, UV0 orientation, source face 10631 and indices/position/normal/UV, installed parser placement, outward winding, and all four corners of the full rectangular back footprint. Since the rectangle and source triangle are convex, the inside-corner check establishes this whole planar back contact. This is not merely a center test. Added vertex arrays carry world-local coordinates and parent _batchid. The original source arrays remain unchanged in the source-dependent production-plugin test. No source windows/signs are cut out or replaced.

The two authored meshes implement an opaque back, top hood, side returns, front brow and recessed lens; 62 triangles and 5,208 geometry bytes include batch membership. One 6 m unshadowed SpotLight has a 60 cd ceiling and a downward/outward 0.50 rad cone. Actual sampled dusk signage input 1.8770707611978186 implies about 52.20 cd; noon input 0.05 gives exactly zero. This does not establish arbitrary-world occlusion or frame-rate performance.

The receiver is actual pavement triangle 263078, SHA-256 841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6, and its centroid is checked from decoded bytes in test/peripheral-mounted-light.test.ts:80–83. I independently hashed all 156 current primary scene/rail/network files against the final capture and found no mismatch. The actual receiving path outside the diff is src/scene/roads.ts:48,72–76: it loads SCENE_FILES.pavements, constructs its geometry and draws roads:plateau-semantic-pavement with the sidewalk material. This supplies a rendered receiver, not a detached recipe point.

Outside-hunk ownership review includes src/scene/buildings.ts:251 and 296–335, where the real facade hook runs in the existing transaction before clipCityRoot and buildingSections, and src/scene/tile-transaction.ts:60–96, which owns parsed resources through commit/cancel/release. src/scene/cutout-sections.ts:159–184 consumes the authored meshes' source batch membership. src/app.ts:159 and 427–436 supply and update the shared lighting/style objects; the fitting's getters therefore follow actual style changes without another frame callback. Duplicate addition on one live scene is suppressed. The cancellation/rejection/transfer/replacement tests pass for their tested path, but do not cover F1's distinct GPU-only release semantics.

## Native appearance observations and bounds

I opened all twelve final candidate3-final originals individually with view_image detail original at 1280×720, both matched baseline3-front originals, both candidate2 oblique originals, and the full 513×512 source field. No contact sheet or resized crop substituted for those inspections. The digest table below binds the actual bytes I inspected.

Front noon shows the housing as a small dark physical fitting with no emission or new pavement response. The close noon image resolves its dark hood/body and recessed narrow lens. Dusk close resolves the warm lens inside that housing; most pavement is cropped there, so it is not the principal receiver proof. The matched dusk front shows a new narrow warm patch on the actual far sidewalk directly below the fitting. The larger warm road pool at the left is already present in baseline and is not attributed to this change. The held-out seed142617 front preserves both fitting and local sidewalk response from a slightly different actual pose. The block dusk image shows only a tiny localized patch; this is a modest pilot, not a substantially illuminated corridor.

The rear/roof pair has no observed new warm leak, but the fitting and contact itself are occluded there. Those views constrain visible unintended spill; they do not prove mount support. The default aerial pair does not resolve the fitting; it supplies only contextual continuity. The candidate2 oblique pair retains the fixture, while perspective and the pre-existing warm pool make receiver separation less useful than the final matched front. Neither those occluded/distant images nor counts alone establish local success. The native source field contains blue glazing above a dark lower photographic band and no readable sign at the small mount location. That source photograph is retained; this pilot does not solve its close softness or wider facade depth.

Final capture.json SHA-256 b17af6ad2ab2cad1ff846239ff850b0608fc8ee5c53f9277285d6247bc70fe93 binds 12 frames, seed142617, ordinary noon/dusk URL choices, real mouse/wheel/keyboard movement, shared style-return inputs and RTX 4090 ANGLE D3D11 renderer. I read the runner source: it uses OrbitDriver and real pointer input, never camera setters. Static captures use the ordinary default population state, not a new disable flag; they make no populated-flow claim. Rail/cache/source/atlas policies are unchanged.

The final front camera is (415.4586568,29.4354430,53.4223425), target approximately (365,15.2,15), azimuth 0.92, polar 1.35, distance 65. Matched baseline dusk camera is exactly equal; noon position differs only by 1.35e-13 m. Baseline and candidate lighting inputs are equal at each matched time. Held-out achieved position is (414.7866701,30.0905336,55.7929237), target (370.0305260,15.2,18.7097771), azimuth 0.8788817756, polar 1.3199998945, distance 60.0000015651. The close camera moves through normal controls to about (398.9586551,29.4354430,41.0223457); it is not an alternate hidden rendering mode.

Candidate3 source/dist/scene/rail/network before and after lists are equal. All 131 retained worker source files still match their capture hashes. Primary has 91 raw source differences relative to that worker snapshot; comparing both actual texts confirms every one is a line-ending-only difference. Executable JS, CSS and index.html bytes match the primary build; only the two source maps differ. All four frozen changed code files match raw bytes directly. Candidate2's only recipe change is the unused mount.depth metadata correction 0.16→0.22; source-freeze binds its exact inverse, and candidate3 captures final corrected code. That transfer is limited to the two supplemental oblique views.

The final local capture has an empty page-error list and records all page/context/browser/server/esbuild closure flags true, source/cache unchanged after closure. Its real style switch goes Satellite→Cartographic by pointer and back by keyboard End with zero camera-position change; local walker ticks advance 107→153 and 154→191. These are bounded static/control observations. They do not establish motion stability, actor contact, crowd quality, FPS, distributed lighting, or any of the 14 final criteria.

## Actual primary checks and missing evidence

I read the actual integrated-gates build/typecheck/unit logs and canonical wrapper failure artifacts. Build and typecheck pass. Unit reports 128 files / 1,157 tests passed in 87.14 s, including the five new focused cases. Build retains the pre-existing large-chunk warning. The wrapper's visual lane failed after about 103 s: one failed, one interrupted, one did not run, one passed. Its run-result.json is refused-or-failed with exitCode 1 and certificate null. The three hardware lifecycle records were never reached. Audit did not run after this blocking failure.

There is no fresh complete.json to validate or appearance-certify. I did not substitute old run59b500b75a1abf60, incomplete new images, or worker stills for the required 44 certified native images. All 44 final canonical inspections, final GPU/driver/three-lifecycle validation and audit remain owed after repair. Gate worker reports exact owned process/port/TEMP cleanup; this review launched none. A failed source-map lookup using an unavailable local trace-mapping package was not evidence; the full retained browser stack and installed plugin source establish F1 directly.

## Direction

CONTINUE this finite pilot through the concrete GPU-unload lifetime correction, regression, and fresh primary verification; do not scale lighting from a broken lifetime path. After adoption, the one next useful product outcome is a source-bound peripheral storefront bay whose frame/recess/glazing depth reads at street and block distances. The overall scene and this pilot's close photographic wall still read as flat imagery, while further proof/reporting machinery would not improve that product weakness. This recommendation does not expand this repair's scope or close distributed dusk/full-Shibuya acceptance.

## Native inspected-byte index

Paths below are relative to artifacts/peripheral-lighting1426/. Each row is an individually opened original, and the SHA-256 was recomputed from the actual file after inspection.

| Original | Dimensions | SHA-256 |
| --- | --- | --- |
| runner/candidate3-final/payload/noon-01-default.png | 1280×720 | b14b03d8fd3b1a2f2b575617f9758e06d359018f66403a6d2300a29f46fde19c |
| runner/candidate3-final/payload/noon-02-east-front.png | 1280×720 | 59dad45a362efd18000051ea3399bdeae59e58a3fe992a513c1fdb2468443789 |
| runner/candidate3-final/payload/noon-03-east-mount-close.png | 1280×720 | 2ad87007a9654749f83c7d854d98261448cfc561110e72fefac8c3801f375295 |
| runner/candidate3-final/payload/noon-04-east-rear-roof.png | 1280×720 | 3178f170e88f6a3aaa306a1115d72a54c04945b7590bea976955f5cf100ed356 |
| runner/candidate3-final/payload/noon-05-east-block.png | 1280×720 | 3992fffdc9f0339f51d1ca303abb43bb609ace13a6af7c7f161041530460050d |
| runner/candidate3-final/payload/noon-06-east-front-heldout-seed142617.png | 1280×720 | f23d587580f4b4f2d652cbc9e8400c2115e76f3ed815c6df08bdebef33a5e50d |
| runner/candidate3-final/payload/dusk-01-default.png | 1280×720 | 9df2e334d539b96f476b75b798a0716d1ec09359ee3db859829ec8cc7d1d11e3 |
| runner/candidate3-final/payload/dusk-02-east-front.png | 1280×720 | 4ddb845e3efd13e2f343bf40e43353469f25ffa3487571377e015e522cb760bb |
| runner/candidate3-final/payload/dusk-03-east-mount-close.png | 1280×720 | ba421bbb53a8fed59da50a335ad16bd90c969b1cf8f89321452b01d40fdf4350 |
| runner/candidate3-final/payload/dusk-04-east-rear-roof.png | 1280×720 | 04b6d912b05db73bc1750f28b71463629f238cc1558646a2c753a2f7f6c020c6 |
| runner/candidate3-final/payload/dusk-05-east-block.png | 1280×720 | a5a22a05dd9c869809179b00598a97af2cb5ca750bc88c56675e16592d459bf4 |
| runner/candidate3-final/payload/dusk-06-east-front-heldout-seed142617.png | 1280×720 | 1b6f6ccb0390ab0c74e1b0365bfd5a05cc53cc08cffde058561754f9a8cc0880 |
| runner/baseline3-front/payload/noon-02-east-front.png | 1280×720 | 271c11cacd2c3a443124b5d223da1fc9c744724b6e4285dbe6ff0f5a797a1272 |
| runner/baseline3-front/payload/dusk-02-east-front.png | 1280×720 | 3a23fba623b1783a013dd87ac06f74d53ecd1b6cd32bbc8edcecbbcddddcec53 |
| runner/candidate2/payload/noon-03-east-front-oblique.png | 1280×720 | fbe5d82eaca3b24db53f0d8f60aa5c4d8a28e90e6f77467dd58fba31c562907e |
| runner/candidate2/payload/dusk-03-east-front-oblique.png | 1280×720 | beb18b8fb167e8b7166c13476c0f46313e32b67b05c5466bac5fa18e77efc050 |
| front-wall-source.png | 513×512 | c6778cf857951929933ab7de7622c556a02920bcee09ffb486b2b057381649ce |

17 originals inspected: 16 app stills and one source field. No full-gate image acceptance is claimed.
