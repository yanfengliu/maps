# Bounded A1 finding investigation

Revision supplied and frozen by root: `13ef7e83c56202a17aa56975ef5786825bfcff2f`. Product/source/build/data unchanged. The original A1 evidence is preserved. The two earlier audit image paths were corrected to `run-01/dusk/default-opening.png` and `run-01/dusk/dusk-satellite-plaza-mid.png` without changing its historical conclusions.

The approved six-image headless probe passed first attempt: one test, 37.8 seconds; CLI 39.9 seconds. Source/build/harness/all served inputs were equal before/after. All six captures have exactly zero reported before/after camera drift. Maximum displacement from a saved A1 witness was 0.000055642 m; default displacement was zero. This binds the new samples honestly; original A1 pose/screenshot timing remains non-atomic. `run-01/manifest.json` retains exact poses, deltas, rays and times. I inspected all six PNGs individually at native 1280×720. `evidence-ledger.json` binds these observations and the 21 source/render diagnostic crops subsequently inspected at their own dimensions.

## A1-01: choose an opening composition

The current default is reproduced: distance620 m, azimuthπ/4, polar1.0681415022, target(0,15.2,0), position(384.1782854,313.8872779,384.1782854). Close towers hide the crossing. The setting is authored at [camera.ts:23](C:/Users/38909/Documents/github/maps/src/render/camera.ts:23).

| Controls-driven candidate | Actual captured pose | Native result |
| --- | --- | --- |
| `run-01/opening-context.png` | distance1800.0001038, azimuth0.7853981634, polar0.4999997595 | Entire square footprint fits; crossing near centre, useful city context. Model is relatively small/dark against broad sky. |
| `run-01/opening-crossing.png` | distance110.0000062, azimuth0.7853981634, polar0.7800002554 | Full scramble is prominent with nearby landmark fronts, paving and connected streets; stronger first-view street anchor. Whole cutout is outside this close view. |

Both retain target(0,15.2,0) and use actual pointer/wheel controls. No camera or UI source was changed. Recommend the110 m candidate for A1-01; root should choose which first-view purpose takes priority before a small camera-setting change. This is a concrete composition choice, not a request to add new UI.

The1800 m preparation used actual PerspectiveCamera FOV55/aspect1280:720/near1/far8000. Actual terrain corners, cutout bottom and maximum terrain-height envelope fit with minimum66.269 px margin. The1400 m negative control puts the near terrain corner at y762.962 px, outside720. This checks footprint framing, not skyline occlusion or appearance. `context-projection.json` retains inputs and results; actual maximum control distance is2000 m at [camera.ts:67](C:/Users/38909/Documents/github/maps/src/render/camera.ts:67).

## A1-02: source fidelity and magnification, not atlas-cap loss at these samples

The existing read-only [facadeSamples:355](C:/Users/38909/Documents/github/maps/src/scene/buildings.ts:355) is the first live instrument. It returns nearest visible building geometry, tile and transformed UV, source/processed dimensions and processed RGBA. It does not inspect the whole scene or return original photography. Original b3dm/WebP extraction and source-triangle reconstruction reused existing repo/retained decoding instruments; no source acquisition or rebuild occurred.

| Sampled patch | Live tile and original → processed atlas | Original texel examples (floor UV×dimensions) | Classification |
| --- | --- | --- | --- |
| Right centre/lower/upper | `data503.b3dm`,2048²→2048²,cap2048 | (1209,1766),(1228,1789),(1601,1453) | Source atlas already has broad indistinct sign/colour areas. Local source density0.254–0.470 texel per screen pixel across principal axes: source texels are magnified about2.1–3.9 screen pixels. |
| Central left/centre/right/far-right | `data518.b3dm`,4096²→4096²,cap4096 | (478,3509),(332,3535),(303,4054),(14,2532) | Original atlas contains oblique/stretched lower-facade imagery. Local density0.817–2.608 texels per screen pixel; some axes minify, one slightly magnifies. No atlas-cap reduction occurs. |

The right source triangles belong to `bldg_d47d8aa9-e4f5-4599-9d9a-bc129a12d6a8`. Central first three samples belong to `bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27`; far-right belongs to `bldg_46f3cd1c-4dc8-4e7e-b30f-db8c8c31f776`. `live-facade-rays.json` retains original triangle/UV/material/GML identities and immutable atlas hashes. Tiny source-vs-live reconstruction offsets are not treated as pixel-perfect shader equivalence.

`source-patches.json` records exact original texels, native crops, adjacent-pixel UV derivatives and33×33 source patches at approximate effective screen scale. Those patches use a disclosed local affine UV approximation and bilinear sampling, preserving source colour without lighting. Their structures match the main blurry/stretch patterns in the native rendered crops. They do not reproduce perspective across triangle boundaries or isolate all material/post effects.

Source resolution is therefore a demonstrated limitation; cap downsampling is excluded at the sampled regions. Existing de-lighting/sign masking, mip filtering, anisotropy and post-processing remain distinct influences. Rebuild changes RGB/alpha and retains full dimensions at [facade-textures.ts:245](C:/Users/38909/Documents/github/maps/src/scene/facade-textures.ts:245); alpha stores the sign mask, not evidence of a transparent hole. Filter policy is at [facade-textures.ts:288](C:/Users/38909/Documents/github/maps/src/scene/facade-textures.ts:288). This probe does not apportion every bit of softness or prove UV distortion was introduced by the app.

No global texture cap or UV/filter repair is justified by these samples. A1-02 remains a visible quality limitation. Root must either accept this explicitly bounded source fidelity for this milestone, or assign one targeted facade-treatment design for the identified fronts with same-pose native comparison; do not describe unchanged source photography as a completed repair. The110 m opening reduces the large right-facade prominence but does not repair the plaza source.

## A1-03: supported terrain classification; real-world class unresolved

The settled live building observer reports no building intersection for all three corridor interiors and their +1px X/Y neighbours in both styles. The CPU source mesh ray instrument and independent Three Raycaster agree on terrain as nearest among terrain, road, pavement, marking and mapped-green layers. Native images show continuous opaque ground, not a transparent gap. This combination supports plain-terrain ownership at these interiors; street props are excluded from the CPU comparison, so it is not a universal scene-picking API.

| Satellite pixel | World point, metres | Terrain triangle |
| --- | --- | --- |
| Middle(889,318) | (66.9618,20.1286,-72.3452) |131306|
| Near(876,372) | (70.3330,17.1209,-12.2560) |135699|
| Far(944,271) | (80.1442,20.0833,-195.2035) |136607|

The road control(904,398) instead hits road triangle55501. Cartographic interiors also hit terrain, confirming that the strip is not specific to Satellite photography. Exact results and reprojection checks are in `live-surface-rays.json`. The terrain deliberately receives a generic ground material at [terrain.ts:51](C:/Users/38909/Documents/github/maps/src/scene/terrain.ts:51), with low-frequency ground variation at [surface-materials.ts:194](C:/Users/38909/Documents/github/maps/src/scene/surface-materials.ts:194); Satellite and Cartographic ground palettes differ at [styles.ts:49](C:/Users/38909/Documents/github/maps/src/world/styles.ts:49) and [styles.ts:19](C:/Users/38909/Documents/github/maps/src/world/styles.ts:19).

Nothing here establishes road, rail, pavement, park or another real-world class. Current derived scene data has geometric and selected pavement provenance, not complete semantics for an uncovered terrain point. The raw OSM path and all four PLATEAU transport paths named by `pavement-source.json` are absent from this workspace; the known retained worktree's OSM and relevant transport paths are absent too. `evidence-ledger.json` records the exact checked paths. A road/rail omission or a semantic repair cannot be responsibly specified from this evidence.

Next step is a bounded source-authority lookup at the three listed coordinates: locate the prior pinned raw source cache or provide an explicitly reviewed source extract; compare the source class with the ground-rendering policy. This needs no further GPU probe. Preserve A1-03 as provisional until that lookup or an explicit source-scope acceptance settles it. Do not paint a speculative road/rail feature.

## Optional roof sample

(876,541) hits `data505.b3dm`, upward roof normal≈(0,1,0), point(84.2676,30.8875,107.2469), original4096²→processed2048². Original source reconstruction maps it to `bldg_d7fb4726-719f-47a1-a94f-4d0a1e89a2e0`,triangle545. This identifies the sampled roof, not necessarily one of the narrow bright slivers itself. No defect or separate task is warranted from the sample.

## Finite next actions and completion boundary

1. A1-01: root selects one of the two native compositions; implement only the chosen initial pose, then default-entry/real-controls visual acceptance on the integrated revision with required gates/review.
2. A1-02: record the demonstrated source-fidelity limit and settle whether it satisfies this visual milestone; if not, authorize a treatment for these specific fronts and compare the same plaza pose. No global atlas increase or speculative filter fix.
3. A1-03: obtain source classification only for the listed corridor points, then decide whether a local supported repair is needed. No scene-hole claim.

These findings prevent an unconditional “supreme visual quality complete” claim now. This investigation does not settle the separate encoded-motion issue, continuous motion acceptance, or the larger animated-map deliverable; root already owns those boundaries. No simulation/populated probe, second-location work, boundary expansion or unrelated cleanup is proposed here.

## Binding and cleanup

`run-01/bound-complete.json`: `65c8a2da58d6a3d2bde79392b7287fd7ef19903101f3507dd6efc33a5c30ac48`. Manifest: `c1800ad10cecc7f82f340d4305b09b1696fdf027b070044cbaf6de402bf9b8d5`. Owner cleanup receipt: `564c286c94084b8d978774aaab5fbe12cdd70d73e74dd3785b3c611d160bcd26`. Independent post-run retained-identity/task-marker/port4323 check: `83d352497a8f23fb87cc849bb05409c1809f02f336a7b44261e893224a1e3e41`. All survivor/listener arrays are empty. GPU/browser/port lease explicitly released to root. No failed live run or tolerance change occurred. Existing A1 evidence and all task artifacts are intentionally retained for this unresolved handoff. No tracked file, source cache, build or Git state was changed; full gates were not duplicated because this assignment changed no product code.
