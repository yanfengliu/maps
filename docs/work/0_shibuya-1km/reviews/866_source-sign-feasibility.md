# 866 — existing photographic sign feasibility

**FEASIBLE for two substantial colored vertical panels on one existing crossing-facing facade.** Freeze the purple advertisement and KIRIN advertisement below. No product implementation, browser, GPU, server, producer, build or gate ran. Root still owns the product-write lease after the corridor closing checkpoint.

I opened all four successful862 originals individually at native1280×720, then the1200×600 surrounding frontage,300×320 commercial-stack crop and individual53×109/46×125 panel crops. The full4096×4096 atlas was displayed at1600×1600 by the tool; the selected crops were displayed at their own size. Purple is a framed violet/pink advertisement. KIRIN is a separate orange advertisement with photographed brand lettering. Their artwork, panel edges and advertisement stack establish eligibility; brightness or attachment metadata alone does not.

## Frozen source and footprints

Both panels use placed `data/data518.b3dm`,4,973,844B/SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`, GML `bldg_e6e4de58-1a37-4345-8795-6b759771ade6`. The native embedded image0 is4096×4096 WebP,2,966,552B/SHA-256 `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb`. Mesh0/primitive1/material1 binds texture0 through `EXT_texture_webp` to image0 and UV0; glTF declares OPAQUE by default, float32 UVs and unsigned-byte `_BATCHID` values. The source sampler uses clamp-to-edge. Runtime must retain the existing identity UV transform and `flipY=false` guard before texture rebuilding.

| Panel | Native atlas artwork quad, top-left origin | Source faces | Approximate world extent |
| --- | --- | --- | --- |
| Purple advertisement | `(1010,2585),(1043,2585),(1043,2660),(1010,2670)` |2747,2752,2754|4.07×9.33m|
| KIRIN advertisement | `(978,2664),(1007,2664),(1006,2773),(974,2773)` |2742,2744,2747,2756|4.07×11.96m|

UV0 is each listed pixel coordinate divided by4096. The disjoint quads trace the whole artwork inside its housing with small border insets. Exhaustive clipping over all15,514 textured triangles gives100% coverage, up to rounding, and only the named GML/material. Maximum clipped-vertex plane residuals are1.164254mm/4.532890mm; minimum normalized-normal dots are0.99999909/0.99999754. Keep the existing30mm slab and0.995 normal bound. The same decoder/placement reconstruction reproduces all four existing positive fixture observations on their expected GMLs within3.808mm. This is offline source correspondence, not fresh runtime-ray evidence.

Purple's origin is `(-38.12540381767941,35.134338613765216,-24.68015124004172)` and normal `(0.11019672767125029,-0.0000021687127281519913,0.9939097953063171)`. KIRIN's origin is `(-42.44541664330815,24.876287517940817,-24.200212574592598)` and normal `(0.1103564294381739,0.0000028214603142561506,0.9938920758682488)`.

Actual862 cameras and unchanged55° FOV project purple to47×97px at45m/13×27px at220m; KIRIN to42×122px/12×34px, before occlusion. Current originals show purple clearly; the TOKYO board covers part of KIRIN. Leave that board intact. These dimensions justify a trial, not an appearance verdict.

## Smallest implementation contract

Add exactly these two regions to `src/scene/facade-emission-regions.ts`, using the already verified data518 source and existing building group2. Keep all three legacy records and their radiance0.65/alpha-modulated behavior unchanged. Introduce an explicit whole-panel authored mode for the two new regions, also with fixed radiance0.65. Their emission uses the retained photographic RGB throughout the admitted artwork; atlas brightness/alpha cannot choose an extra surface. Use the existing shared signage uniform, removing its0.05 daylight floor only for the new whole-panel branch so noon adds exactly zero. Satellite remains the only photographic target; the procedural-style factor suppresses this term in Cartographic.

`src/scene/facade-emission.ts` needs consistent shared-group validation for disjoint panels and generation of the two modes. A group still maps to one tile/hash/GML tuple; changed hashes, conflicting groups, malformed or overlapping same-plane regions refuse. Existing vertex assignment can stay because these regions all use group2. `src/scene/tile-materials.ts` adds the whole-panel term while preserving the legacy term. No new texture, geometry, material instance, uniform owner, draw, light, target, pass or decode is needed. Existing caps, ImageBitmap release, transactions, LRU/disposal and style reuse remain authoritative.

Intended implementation paths are those three source files, `test/facade-emission.test.ts`, its fixture and `docs/reference/facade-emission.md`. Tests retain all nine current observations and all existing UV/hash/LOD failures, add actual selected-source positive and adjacent-wall/other-atlas/roof/back/plane negatives, use the declared unsigned-byte categorical accessor, reject conflicting shared groups and overlap, and check actual noon/dusk/style behavior of the whole-panel branch. Do not change app wiring, time-of-day coefficients, source data, geometry, texture caps or global material response.

After source implementation/review, the next product decision remains exactly four native matched45m/220m dusk originals through the existing finite real-control caller. Weak220m gain closes the pilot. A worthwhile result then earns paired noon/style checks and the usual scoped qualification, five gates and independent adoption review. No cost observer or new capture framework precedes those four pixels.

## Evidence and bounds

The frozen packet is ignored `artifacts/source866/`: `selected-two-panels.json` records exact corners/UVs/source hits; `whole-footprint.json` records every clipped triangle and projected bound; `instrument-correspondence.json` records the existing-fixture reconstruction; `source-feasibility-receipt.json` binds37 source/image/inspection inputs. Native purple crop is8,569B/`80939ccea1e8d01f81a29d1292a2756df65070858d6b131997e17d2dc8078bb1`; KIRIN crop is8,492B/`bf249e6f2d74283168fccb44d712efc57d8304d9e676ce1e8af98b3068b7b11d`. Both cached tiles still match their extraction hashes. PRIMARY source base is main `32b2d189f73ec3ab7efc49eadd04de8a0b513fc1`; corridor closing docs are separately owned pending changes.

Exclude the Japanese sign with96.41% rectangular source coverage and the curved Coca-Cola sign needing different segmentation. Neither exclusion widens the task. This choice reuses the repo's self-improvement workflow and recorded weak-grid, blank-pane and oversized-glow rejections. Existing PLATEAU FY2025 attribution and processed/edited disclosure remain authoritative.

All finite Node/Python inspection commands completed. Their inspected scripts launch no child process. No browser/GUI/GPU/server resource was created. The final Win32_Process census was unavailable with Access denied; no available-empty process census is claimed. Ignored source evidence remains for the active implementation/review handoff. Source feasibility is established; runtime binding, visual gain, cost and adoption remain unverified.
