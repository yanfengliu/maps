# 1422 — Mapped tactile paving finish

Date: 2026-10-17. Owner: square1420_critique; root owns integrated acceptance. Base: `c42c526aa0c69f3b5c508d7ab4a0edc09937273b`. Uncommitted candidate in `artifacts/square1420-critique/worktree`; no code commit or push. Root selected this bounded outcome from [1420](1420_fresh-square-critique.md). Final whole-square criteria remain open.

The candidate changes smooth yellow ribbons into path-aligned tactile tiles with longitudinal light-responsive relief, narrow bevelled joints, restrained wear and roughness variation. All source routes, 0.3 m widths, support selection and placement/refusal decisions remain. No warning dots, new routes, source download, scene regeneration, dependency, facade, lighting or adjacent paving change was made. The finish is authored presentation; it claims neither surveyed construction nor standard conformance. Relief uses a 5 mm bump scale, rather than adding geometric ribs or altering actor contact.

## Source and cost

The reviewed cached class has 16 continuous-path features, 267 source segments and about 367.49 m of mapped centreline. All 267 receive the same production treatment: 260 placed, seven unplaced, matching the existing support outcome. Nineteen unspecified and three endpoint-only features remain excluded. These eligible paths are around the crossing/approaches; this does not invent a peripheral-square tactile route for coverage.

`SurfaceBuilder` retains its original accepted triangles and adds metre-aligned UVs. Cumulative distance carries the tile phase through source subdivisions and bends, including across an unplaced segment. The shared material owns three deterministic 128×512 textures: albedo, bump and roughness, containing a four-tile run with four longitudinal ribs per tile. Mips and anisotropy integrate detail when it becomes small. Style changes reuse the same mesh/material/textures; disposal releases their resources.

Tactile geometry remains 6,048 triangles / 18,144 vertices / one mesh and draw. UVs add 145,152 buffer bytes. Three base textures total 786,432 bytes, about 1,048,596 bytes including the complete mip chains. These are storage calculations, not measured whole-process allocation or FPS. There is no new per-frame generator, render callback or geometry cost.

Presentation height changes from 70 mm to 20 mm above the existing sampled support. Ten barycentric probes on each of the 6,048 original accepted triangles found interpolation residuals of −15.527…+14.432 mm, with no missing sample. The resulting geometric top clearance is 4.47…34.43 mm at those 60,480 probes. This finite mesh result does not establish continuous contact or rendered visibility. The sidewalk material also applies slope-dependent GPU depth bias (`-2,-4`). The tactile material now uses the existing crossing-paint bias (`-3,-6`) to preserve correct rendered ordering at grazing angles.

## Visual evidence and controls

Ignored evidence root: primary `artifacts/square1420-critique/`. `evidence1422.json` contains exact source byte hashes, matched image pairs/digests/full actual poses, exploratory images, style observations and cost bounds. Final product source matches the bytes in candidate run2. Its capture record is `prototype1422/run2/payload/capture.json`, SHA-256 `68cd33e0a30cb94716fbcb1ba66a8b95d13aeffa732f7470c5a917df83a39ffc`.

Four fixed before/after pairs reuse 1420's fresh noon/dusk crossing originals and run2's actual matched pointer/wheel poses. Maximum camera-position difference is `2.93e-14 m`; target difference is zero. Each original was opened separately at native 1280×720. The unchanged geographic source and adjacent buildings/paint provide surrounding controls.

| Views | Result |
| --- | --- |
| Both crossing directions, noon/dusk | Yellow paths remain readable; near sections show tile joints and restrained directional response rather than a single flat fill. Detail quiets toward the opposite side. Nearby white crossings, road/pavement appearance and adopted glazed frontage remain visually consistent. |
| Untuned south ground view, noon/dusk | Foreground shows tile modules, joints and longitudinal rib response; the connected runs remain visible without the first candidate's burial. This is the clearest relief view. |
| Untuned west ground view, noon/dusk | Surrounding scene and distant route are visible, but there is no near tactile surface to judge relief. Keep that visibility gap explicit. |

The two untuned ground poses were fixed before prototype viewing with camera seed 142217, then reused for the justified depth-order correction. Seed changes only the camera recipe; scene/default population remain unchanged. Time uses the public noon/dusk entry options because there is no time UI. No population, rail, scene or LOD override was used; harness reads never set camera/control/render state.

Run2 exercised actual pointer Satellite→Cartographic and keyboard End→Satellite. Both measured zero camera-position travel. Walker ticks/travel advanced 110→153 / 1.867→2.686 m, then 154→196 / 2.705→3.505 m. Detailed Cartographic appearance is deferred. Hardware was RTX 4090 through ANGLE D3D11; console/page error list is empty. Run2 build/capture elapsed 83.510 s. Still gaps are 4.423–21.059 s, including a time reload. No motion sequence was inspected, so temporal crawl/flicker and continuous clearance are not accepted from these stills; full-AOI quality, 1080p population performance and all final criteria remain open.

Candidate1 is retained and rejected: its 20 mm mesh finish had no depth bias and disappeared behind the biased sidewalk at grazing angles. Every one of its eight originals was inspected. `prototype1422/run1/` retains that failure. One source-directed repeat adding the existing paint bias resolved it in run2; no further aesthetic iteration followed. Geometry-only support measurements are insufficient when the supporting material changes GPU depth. A controlled removal of the new bias made the production-material regression fail with `expected false to be true`; exact candidate bytes were then restored before the green suite. That check bounds the declared material relationship, while the native failed/restored images establish the observed raster result on this GPU.

## Checks, prerequisites and handoff

| Local check | Result and bound |
| --- | --- |
| Build | PASS on final product bytes through the existing capture build, Node 24.12.0; existing large-chunk advisory only. |
| Types | PASS after final tests were added. |
| Focused production/material/source support | 10 tests PASS. Tests exercise actual street construction, every eligible source segment, phase/width/finite support, deterministic texture content/cost, depth-bias relationship, shared style resources and disposal. |
| Full unit suite | PASS: 127 files / 1,152 tests in 84.00 s after literal retained test-fixture restoration. No test/workload/threshold was weakened. |
| Audit | PASS at unchanged high-severity threshold; two existing moderate advisories remain. Dependencies unchanged. |
| Patch/content | `git apply --check --stat` against primary PASS; four code/test files only. |
| Canonical visual / independent integrated review | Not run here: primary-only gate and independent review belong to root after integration. No certification or final acceptance claim. |

The first full local run failed for missing fresh-worktree prerequisites: phase/support collection needed `artifacts/pedestrian-native253-20260928/packet/{context,rig-near,rig-medium,rig-far}.json`; asset checks needed `artifacts/pedestrian-corner331-20260928/packet/{manifest,context,rig-near,rig-medium,rig-far}.json`. Nine literal files, 18,868,758 bytes, were copied from the retained primary packets into this owned worktree. `test-fixture-restoration.json` records exact names and source/copy SHA-256. No regeneration or linked cache was used. The first failure (79.02 s) remains in `worktree/artifacts/local1422-checks/unit.log`; the green repeat is `unit-restored.log`. The initial sandboxed focused test could not load esbuild's config path; the same unchanged command passed with escalation. Audit/type/red-control logs are beside the suite logs.

Code patch: primary `artifacts/square1420-critique/candidate1422.patch`, SHA-256 `013b5427dd13cd30c3665770c0199bd0fe9ecf0697d5a94e8c58de804368ef2b`. Whitelist and final raw byte hashes:

| File | SHA-256 |
| --- | --- |
| `src/scene/street-details.ts` | `29300c618ac8efe9242b241c5f16719f65b18b849bef23cf21797fb29b074d7e` |
| `src/scene/tactile-paving.ts` | `50024bbc4d824f84026e374e829beed55d8643f1cfcc4becd5e25811e5f571f8` |
| `test/paint-support.test.ts` | `a6995f443fd8b95d30b459b743f04d605b2c525963afb987ee5542a3dbbc596a` |
| `test/tactile-paving.test.ts` | `5abe80c3152b3a125b88b957e1925fc7e584a6f1b1ffba4002df081bd9a01ec7` |

Only these four code/test paths and authored reports 1420/1422 are intended changes. Root's plan/policy, primary protected facade test, historical packets/worktrees and old snapshots were not edited. The primary facade test still has SHA-256 `48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a`.

All page/context/browser/browser-server/preview/esbuild resources closed in finally. Existing wrappers' final censuses passed for both prototypes. A fresh aggregate census at 10:22:23.6011398Z found none of the 18 recorded identities from critique/prototypes and no task-marked node/browser; ports 4319, 5319 and 4324 were clear. Exact owned empty TEMP directories passed zero-reparse nonfollowing checks and were removed; unrelated processes were untouched. `final1422-cleanup.json` records the bound. Worktree, literal caches/test prerequisites, failed/successful native evidence and raw logs remain for this active handoff. Root owns final primary gates, independent integrated review, commit/push and exact worktree retirement.
