# 1426 — One east frontage mounted dusk light

2026-10-17. Owner: lighting1426_implementation. Base: `b1e4dcf3eb77a79468b3adfe8cb42de94e70b61b`. Root accepted this one east pilot for integration after native close, nearby, roof/rear and block inspection. Uncommitted worker candidate only; main integration, the five primary gates and independent integrated review remain root-owned. West/south and all fourteen final criteria remain open.

## Visible result and bounds

One opaque wall fitting has a top hood, side returns and a recessed warm downward lens. Noon power is zero. At dusk a small warm patch appears on the real sidewalk below it, while the surrounding photographed wall stays dark blue. The predeclared untuned nearby view retains both lens and patch. Close views show the housing/recess; the close framing crops most of the receiver, so receiver judgment uses the ordinary front and held-out views. Rear/roof controls show no visible new warm response. At block distance only a tiny localized sidewalk patch is visible. This is a modest local improvement, not a powered corridor or distributed full-map lighting.

The large warm road pool at the left of the street images already exists in the matched baseline. It is not this fitting's effect. No exposure, environment, bloom, source geometry, geographic atlas cap, road, rail, agent or existing corner change is included. The photographic lower field is soft at the existing 1024-pixel cap; this pilot does not resolve broader facade depth or photography quality.

## Source selection and construction

The original [1424](1424_dusk-frontage-source-selection.md) east candidate, data502/GML `bldg_4ca4f012-f142-4892-90c3-c4615105e916`, failed two bounded visibility attempts before any fixture was built there. Normal east/oblique views were blocked by neighboring walls. The one authorized south-alley reassessment exposed a narrow slot, not a useful visible street edge. Root and the independent 1427 direction critic agreed to redirect. No further camera rescue or source union search followed.

The replacement was selected from a wall actually visible in the ordinary east-block app view and its existing read-only facade ray observations. Its complete native source field was inspected before construction: primary `artifacts/peripheral-lighting1426/front-wall-source.png`, SHA-256 `c6778cf857951929933ab7de7622c556a02920bcee09ffb486b2b057381649ce`. It contains blue glazing above a dark lower band with no readable sign at the mount. No occupancy or real-world lamp existence is claimed.

| Source | Exact binding and result |
| --- | --- |
| East replacement | `data/data498.b3dm`, SHA-256 `979ab194aa165391e058e1b3b0b3b37ea5c3d64dfc5f5353e61922f9c97ead55`; GML `bldg_07a23c05-99d6-439c-bd98-f0f873f8a470`, batch lookup 0, photographic face 10631/indices 31893–31895. One fitting placed. |
| Original east | `data/data502.b3dm`; no fixture constructed: ordinary views blocked; narrow alley visibility refused. |
| Proposed west/south | data519/GML `bldg_1c2fc97e…` and data513/GML `bldg_30a68e5a…`: not attempted in this candidate. Root froze east-only after the pilot checks. |

The mount centre is `(392.9611685,29.1802076,36.7992136)` metres, with outward normal approximately `(0.806486,0.000017,0.591254)`. Its full 0.60 × 0.18 m rectangular back contacts one actual source triangle. The opaque back is 0.04 m deep; the top hood reaches 0.22 m from the wall. Original position/normal/UV/index arrays remain byte-identical. The plugin verifies actual requested tile SHA-256, GML identity, source face indices/attributes, original UV0 map orientation and installed-loader world placement before construction. Four inside-triangle corner checks establish the whole convex back footprint, not just its centre. Authored faces carry the existing parent-building membership metadata required by downstream cutout processing.

The receiver is the centroid of actual cached pavement face 263078 at `(395.3310750,25.6900412,38.5518532)`, bound to `pavements.mesh` SHA-256 `841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6`. This places the fitting about 3.49 m above its nearby sidewalk. The original building base is 21.98 m and was not treated as local pavement authority: the initial proposed source-base-relative height would have put the lamp near sidewalk height, so placement was corrected before the first rendered candidate. The receiver triangle and centroid are checked from actual decoded cached pavement in the focused test. Runtime source validation is in the actual tile plugin; no new receiver loader or support framework was introduced. The final primary gate still owes served-data certification.

One unshadowed warm SpotLight targets that receiver. Trial ceiling is 60 cd, range 6 m, cone half-angle 0.50 rad, penumbra 0.65 and decay 2. Shared signage/style uniforms give actual sampled dusk intensity about 52.20 cd and noon/Cartographic power zero. All cone directions point downward and outward from the mounting plane; its source wall and roof are behind or above the cone. The open exterior and native controls give bounded containment evidence. An unshadowed light is not a general occlusion guarantee for other views or future scene changes.

Actual owned cost is two beauty meshes, 62 triangles, 5,208 geometry bytes including parent membership, one light and zero new image textures. No per-frame geometry or callback is created. The existing tile transaction owns geometry/material release and, after the lifecycle repair below, logical light/target cleanup. GPU-only material disposal retains the fitting. Repeated construction is suppressed. These counts are not a frame-rate or whole-process GPU measurement.

## Actual attempts and verification

All browser work used the existing 1420 owned headless runner, hardware RTX 4090 through ANGLE D3D11, ordinary default population and `?time=noon`/`?time=dusk`. OrbitDriver and real pointer/wheel/keyboard inputs drove the camera. The harness was read only. The isolated cache was a literal 156-file/364,187,965-byte copy of the reviewed primary runtime inputs; no fetch, regeneration, linked cache or source atlas upgrade ran.

| Owned run under primary `artifacts/peripheral-lighting1426/runner/` | Actual result |
| --- | --- |
| `baseline1` | 12 stills; initial east approaches obstructed. |
| `baseline2-alley` | Four stills; second original-wall visibility attempt refused. |
| `baseline3-front` | Four stills; clear replacement wall plus sidewalk/road, accepted by root before construction. |
| `candidate1` | Zero frames; startup rejected because authored meshes lacked required parent batch IDs. Preserved as an integration failure. |
| `candidate2` | Six stills; corrected cutout membership, matched front noon/dusk and oblique. Root accepted for remaining pilot checks. |
| `candidate3-final` | Twelve stills; final source/build binding, front/close/rear-roof/block/held-out noon/dusk and two ordinary default views. Instrument and style-return checks pass; errors empty. |

Candidate2's recipe declared an unused depth of 0.16 m. Before final capture it was corrected to 0.22 m to describe the actual unchanged hood. Production construction never reads `mount.depth`; its explicit box dimensions, geometry/light code and plugin bytes did not change. `source-freeze.json` binds the candidate2/final hashes and exact inverse. Candidate3's actual source/build pins include the corrected metadata. No source edits followed that capture.

The focused source-dependent test passes five cases: installed B3DMLoader/GLTFLoader placement and complete production facade plugin, plus cancellation, post-construction rejection, transfer and replacement through the existing tile transaction. It hashes actual tile bytes, runs the shipped Draco decoder with only worker transport/image pixels mocked, checks wrong bytes/GML/indices/positions/normals/UV/transform and restoration, downstream cutout compatibility, complete back support, source-array preservation, actual receiver basis, zero noon power, style return and duplicate suppression. Each of the four owned geometry/material resources and the light is released once in each lifetime case; light/target are detached. These CPU tests do not prove visual quality. Earlier test-image and dispose-event assumptions were instrument mistakes corrected before the passing run.

TypeScript passes. Final capture builds the actual candidate through Vite's production build/config before opening it and retains exact dist pins; the existing large-chunk warning remains. Root explicitly scheduled the full suite/audit/canonical visual once on actual primary after exact-file integration, so those local full gates were not duplicated and no code commit occurred. All nine retained pedestrian packet files were checked and literally copied with source/copy hashes in `retained-fixtures.json` before handoff.

## Native evidence and handoff

Each listed original was opened at native 1280 × 720. `candidate3-final/payload/images.json` records all actual achieved poses and image hashes; `capture.json` binds source/dist/cache before and after, renderer, inputs, observations, errors and context/server closure. Initial small runs retain the 1420 runner's broad inherited bound text; their actual schedule/count/manifest rows above define their narrower evidence. No unsampled motion, continuous contact, performance or full-map acceptance is inferred.

| Native final original relative to `candidate3-final/payload/` | SHA-256 |
| --- | --- |
| `dusk-03-east-mount-close.png` | `ba421bbb53a8fed59da50a335ad16bd90c969b1cf8f89321452b01d40fdf4350` |
| `dusk-06-east-front-heldout-seed142617.png` | `1b6f6ccb0390ab0c74e1b0365bfd5a05cc53cc08cffde058561754f9a8cc0880` |
| `dusk-04-east-rear-roof.png` | `04b6d912b05db73bc1750f28b71463629f238cc1558646a2c753a2f7f6c020c6` |
| `dusk-05-east-block.png` | `a5a22a05dd9c869809179b00598a97af2cb5ca750bc88c56675e16592d459bf4` |

The front view matches the earlier baseline exactly to floating-point input settling bounds; noon/dusk candidate2 camera was `(415.4586568,29.4354430,53.4223425)`. The final held-out pose was declared from LCG32 seed 142617 before viewing and was not tuned. Close and contextual views have distinct jobs; no crop substitutes for receiver visibility. The inherited photograph/signage and distant surroundings remain recognizable within these views.

`source-freeze.json` preserves the original five-file handoff and static capture binding. The subsequent `repair-freeze.json` supersedes its changed code/report hashes for integration and adds the existing tile-transaction file. The original source recipe, geometry and light constants remain unchanged. `final-resources.json` records the fresh targeted process/creation-time, port 4319 and owned TEMP census after all six worker capture runs; owned temporary browser files are removed only after closure. No shared browser process is killed. Raw necessary evidence and the detached worktree remain intentionally retained until root integrates, pushes and authorizes exact retirement. The primary user-owned facade test and old 991 snapshots were neither changed nor staged. This candidate has no commit and does not claim main adoption.

## Canonical gate lifecycle failure and repair

Root's first integrated primary build/types and full 128-file/1,157-test suite passed. Canonical visual run `d99c403d3c01bf82` then failed the Satellite sweep with `TypeError: Cannot read properties of undefined (reading 'traverse')`. The hero was interrupted, another sweep did not run, the style-picker test passed, lifecycle was unreached and no completion certificate was issued. Raw gate log is `artifacts/commercial-corner-20261014/canonical-gate/mounted1426-integrated/run.log`; the Satellite `artifacts/playwright/sweep-visual-sweep-satelli-88656-rols-and-writes-every-frame-chromium/trace.zip` retains the full pageError stack. Gateworker cleanup separately closed its 22 exact identities, ports and TEMP before this repair. Independent reviewer 1428 confirmed the same cause.

The trace calls installed `UnloadTilesPlugin.unloadTileFromGPU`, which invokes `scene.traverse` and disposes each material/geometry while retaining the CPU scene for later GPU reupload. The source map resolves the failing asset's line 1/column 76529 to three.js child traversal (`children[i].traverse(callback)`). The first fitting implementation treated a material `dispose` event as logical tile destruction, synchronously removing its group, light and target from that active fixed-length traversal. This both invalidated iteration and would have lost the fitting on a later cached return. The original five focused ownership cases did not exercise GPU-only unload, so their pass did not cover this path.

The repair adds one optional logical `onRelease` registration to the existing facade lifetime interface and implements it in `ParsedResources`. The fitting requires that true tile owner and registers its idempotent light/target detach there. The existing transaction invokes registered cleanup only on real cancellation, rejected parse or tile disposal. GPU material disposal no longer mutates the fitting's scene graph. No queued-removal workaround, appearance parameter, source recipe, geometry, exposure or new ownership framework is included.

The new regression uses the actual installed unload method and the installed `TilesRenderer.setTileVisible` hide/show path on the exact parsed source/production plugin fixture. With the old product source it went RED with the canonical `undefined.traverse` error; `gpu-unload-old-red.log` preserves that result. The corrected implementation passes two GPU-unload/cached-visibility-return cycles with the same fitting/group/light/target and source arrays, retained dusk/noon power behavior and final logical release. Light cleanup occurs exactly once at logical release; geometry/material disposal occurs in the two GPU cycles and final release as expected. All six focused tests, including cancellation/rejection/transfer/replacement, pass in 1.09 s; `gpu-unload-fixed-green-final.log` and `repair-types-final.log` preserve final focused/type receipts. A prior type-only failure for optional narrowing and undeclared installed internal methods was corrected without changing test behavior.

The regression establishes the installed CPU retention/visibility and true-release path; it does not perform a hardware GPU upload. Root explicitly reserved fresh hardware verification for the rerun of all five primary gates after exact repair integration. No worker browser or production runtime was launched during repair. The earlier native packet continues to bound unchanged appearance, not the repaired lifecycle's final integrated acceptance. Retirement preparation was stopped when the canonical failure arrived; its prior inventory is not current retirement authorization.
