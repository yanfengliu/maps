# 1008 — Commercial visual repair source review

Date: 2026-10-14. Reviewer: independent `commercial_1008_source_review`. Target: frozen repair 1007 in `artifacts/commercial-corner-20261014/worktree`, branch `codex/commercial-corner-20261014`, base `69a33ee`. Root owns integration and acceptance. This is a source and retained CPU-evidence review, not a runtime or appearance verdict.

**ADMIT FOR FRESH RUNTIME. No material source finding.** The changes structurally address 1006-V1 and 1006-V2 without changing the established placement, source-ownership or pass contracts. Both visual findings remain open until the eight fresh matched native views are judged. No final-gate, performance or main-adoption acceptance follows.

## Frozen target and integrity

All 11 entries of `data/commercial-work/handoff-pins.json` matched bytes and SHA-256 before and after review. Manifest SHA-256: `f38839d093db26dfb78a993698c1dc8b9436153598a864f94d167860164e3f19`. Report 1007 matched 10514 bytes / `658d7ea333fd33bdff87cc17977f277e17bdc312f9842ca7203bafedcf76a0ae`.

All 16 entries of `data/commercial-work/visual1007-evidence-pins.json` matched before and after review. Manifest SHA-256: `a60902d29d3208b7b15a9d36b0885d51577c58c515c1b6f015e13cdc7c287016`. All seven retained `pre-visual1007/pins.json` files matched. Exact byte comparisons show only the following three files changed from that recoverable candidate 2; the other four integration files and historical reports remain unchanged.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/scene/commercial-corner.ts` | 31727 | `5b54fd9fa7bd2427d4db155405dd4ea409bcceaf3975b25235b5073866d685ad` |
| `src/scene/commercial-corner-recipe.ts` | 15115 | `df89c2c9ed22c4d71331b9b66c2ddca97aee5a51258b48072bdbf95aaf5ccc88` |
| `test/commercial-corner.test.ts` | 33444 | `80f7cf559949a418a7506c7658a1e662f4afc559acbe8e478cde4c068f968b08` |

## Glazing and construction

`commercial-corner.ts:300` retains eight floor bands over the original height interval, each 4.9740836145 m. Upper bays now use four divisions per face. Upper stone end piers are 100 mm; each metal edge is 35 mm, making an internal pair 70 mm. Broad repeated stone piers have been removed from internal upper divisions. The upper opening starts 140 mm above its band bottom and ends 120 mm below its top; after both 35 mm edges its clear glass height is 4.6440836145 m. The geometry changes are substantive reductions in the opaque grid, not only material coefficients.

Upper glass is 350 mm behind the facade. Room fronts begin 400 mm behind it and backs reach 2.25 m behind it before footprint and corner-bisector clipping (`commercial-corner.ts:146`, `:325`). Rooms omit the front wall. Their floors, ceilings, returns, back walls and limited furniture provide actual depth behind the pane. Every added upper object is checked against all edges of its clipped convex room polygon before construction (`:208`). The installed-parser test checks every room/furnishing vertex against all three actual displayed foundation triangles (`commercial-corner.test.ts:112`).

The eighth material is `MeshPhysicalMaterial` with clearcoat, IOR 1.5, transparency, opacity 0.42 and `depthWrite=false`; transmission remains exactly 0 (`commercial-corner.ts:374`). The unchanged app assigns its baked sky to `scene.environment` at `src/app.ts:147`. Installed three.js `WebGLPrograms.js:53` supplies that environment to standard-derived materials, and `MeshPhysicalMaterial.js:31` inherits from the standard material. Installed `WebGLRenderLists.js:111` selects its transmission lane only for transmission greater than 0. This increment adds no transmission, environment-bake or fullscreen pass. These source facts do not prove convincing reflected detail or interior visibility in the scene.

**1008-N1, nonblocking documentation correction:** report 1007 and the comment at `commercial-corner.ts:216` say the blinds are a metre behind glass. Actual blind planes are 1.00–1.05 m behind the facade, therefore 0.65–0.70 m behind the 350 mm-recessed glass. The bottom rail spans 0.98–1.08 m behind the facade, or 0.63–0.73 m behind glass. Root has this correction; the frozen source and report 1007 were preserved.

## Source lettering and shader bounds

`mountSigns` still clips the original source triangles in UV space and linearly carries their actual world coordinates and UVs onto the mounted plaques (`commercial-corner.ts:227`). Source geometry is not rewritten. Both south crop rectangles are tighter, their metal backing prisms follow the new extents, and the sign material remains opaque/depth-writing. Source lettering mixes the sampled original colour with a dark linear-space backing after the map chunk and before emissive modulation (`:261`). It does not replace the font or allocate an atlas. East-sign UVs lie outside both south label guards and retain their original material result.

Read-only data checks independently found exactly 50/47 nonoverlapping rectangles covering 165/153 integer source pixels. Every rectangle is finite, positive-sized and inside its named crop. Both rectangle sets and bounds exactly equal `labels1007.json`. The recipe outside the two south sign records, including the east sign, equals candidate 2. The source atlas independently matched 2966552 bytes / `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb`.

The generated shader uses 97 finite box calls and literal coordinates below 4096, without packed integer decoding, dynamic arrays, texture lookups for the mask or runtime brightness classification. The installed renderer defaults to high precision (`WebGLCapabilities.js:84`), with its capability fallback still applying. Literal representability and the small finite expression count do not establish GPU compilation or output. The actual installed physical shader contains the map, emissive, project and clipping hooks used here. `roomRadiance`, `sourceLettering` and `presentation` retain each preceding hook and compose their cache keys; the source-mask key is fixed because there is one immutable recipe in this module.

I inspected all four retained raw/clean label previews individually at their original 324×48 size and verified their bytes against the inspection manifest: raw/clean STARBUCKS `003953645e0ab20c70e0fbc7e74b5b494b7b76ddfb45ea0d4f26c76c8892e138` / `4f52d4fd75cb2e24270d984cf19f6eb0b911e6c52ed0ea468891c091bac006ee`; raw/clean south TSUTAYA `7dcd2d64821ca32e6b9801d4d6159484cbc686f049f98b1b911be0328e80ae8c` / `b0b2037be5edaca7f1b093c912f41a47823d5d60b870a5c21dd850519aa414f0`. These are enlarged source annotations, not repaired scene images. They support removal of broad photographic structure; native glyph readability remains unaccepted.

**Derivative bound:** `fwidth(p)` is evaluated by the box helper under the per-label UV guard (`commercial-corner.ts:265`). The actual mounted primitives are clipped to those label bounds, but this review does not establish helper-lane behavior at crop edges. GLSL ES leaves derivatives in nonuniform control flow undefined; a portable stronger formulation would compute the width before crop-dependent branching. This is an unobserved perimeter caveat, not a demonstrated material artifact or a reason to withhold the fresh hardware qualification. The native review must include plaque edges and the source strokes touching them. [GLSL ES 3.00, sections 3.10.2 and 8.9](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf).

## Preserved contracts and resources

The strict original-channel comparisons, independently observed parser-placement matrix and 20 µm / 4e-6 world-position/normal tolerances remain unchanged (`commercial-corner.ts:47`). Suppression is still limited to the same seven original faces below the same cutoff. The recipe comparison preserves original local positions, normals, UVs, indices, footprint, threshold and limits. Source roof/upper advertisements and other source arrays therefore retain the prior source-contract coverage; no new rendered preservation claim is made.

The graded 1.60×0.22 m threshold and rear metal joint are unchanged. The real installed-parser test retains all four threshold corners and both rear-joint vertices against pavement facet 464606; the independent facet check retains indices 312294/312285/312288 and the minimum 0.0373 barycentric-weight bound (`commercial-corner.test.ts:123`, `:258`).

Inspected `preserve-ground1007.mjs` and its receipt. It imports old and current modules separately, constructs both against the same hash-checked decoded source, selects actual geometry buffers by height, and compares ordered Float32 values rather than model counters. It reports unchanged 312 cladding, 476 structural-metal, 18 ground-glass, 98 room, 4320 furnishing and 84 fitting triangles below the first-floor boundary. Its metal selector intentionally excludes all three sign backs; its separate final-prism comparison checks the east backing. The four east sign triangles and ground material fields also match. These comparisons do not cover the intentionally changed south backings or establish equal scene lighting.

The retained resource receipt sums 8 mesh geometries to 10244 triangles and 1475136 authored bytes, plus 186168 source-binding bytes: **8 beauty draws / 10244 triangles / 1661304 geometry bytes / 0 new atlases / 1 local light**. Those totals fit 8 / 12000 / 2 MiB / 0 / 2. The installed-parser test independently expects the same totals (`commercial-corner.test.ts:111`). The existing light is still limited to 4 m. No process-memory, fill-rate or frame-rate claim follows.

## Passes, lifetime and controls

The new upper glass carries the authored marker and explicit shadow exclusion (`commercial-corner.ts:385`). The unchanged real `load-model` handler preserves that policy only for authored meshes (`src/scene/buildings.ts:393`). The updated test dispatches the installed renderer event and checks both glasses, fittings, opaque cladding and source defaults (`commercial-corner.test.ts:310`).

Both glasses receive invisible, non-depth-writing GTAO normal materials. Opaque rooms, frames and source normals stay visible/depth-writing. `src/render/post.ts:194` supplies the commercial lookup to the actual normal adapter. Unchanged `src/render/normal-pass.ts:28` installs selected materials and its `finally` restores beauty; installed `WebGLRenderer.js:1801` excludes invisible materials from the draw list. Tests cover both styles and successful/throwing swaps, including restoration of the new physical material (`commercial-corner.test.ts:334`). The all-mesh pass loop also includes the eighth material and shared style uniform (`:284`). This is shader-source/control coverage, not a real dropdown interaction.

The existing unique-resource transaction captures the new mesh, beauty/depth/distance materials and shared atlas (`src/scene/tile-transaction.ts:14`); disposal of the cladding material releases all registered normals and the local light. The transfer/cancel/reject tests enumerate actual scene resources, including the eighth mesh, and require each disposal count to equal 1 (`commercial-corner.test.ts:365`).

The retained old-source control is a relevant red control, not a TypeError: V1 fails the explicit missing-upper-glazing assertion, and V2 fails because the actual emitted material hook lacks `mapsSourceLetterCoverage(vMapUv)`. The finite runner restores both exact repaired files in `finally`, and its restoration receipt matches their current pins. These first-failure controls establish discrimination against candidate 2; they do not independently prove every later assertion would reject every possible visual regression. The repaired log records 25/25 tests across the commercial and normal-pass files, and the type receipt explicitly records `tsc exit=0`.

## Review limits and release

Read 1006, 1007, 1004 and 993, relevant policies, exact old/new diffs, source/test code, retained helper implementations/results and installed three.js/loader paths. Ran only read-only hash, byte-comparison and constant-data checks. No test suite, build, audit, browser, server, GPU capture or code mutation ran in this review. The only authored write is this report in PRIMARY. No task-owned browser/GUI/server was created or remains; unrelated browser processes were left untouched.

The source/evidence manifests remain unchanged with 11/11 and 16/16 matches at release. Root separately reported integrating the exact pins and obtaining fresh build/types/41 related-test passes; those later results were not independently rerun or used to enlarge this verdict. Fresh shader/runtime qualification, eight matched native originals, actual controls/lifetime, final integrated gates and independent integrated acceptance remain root's work.
