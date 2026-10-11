# Fresh Shibuya city in Unreal Engine 5.8 through MCP

Status: active
Owner: Orchestrator in the current Codex chat
Created: 2026-10-11
Updated: 2026-10-11

## Problem and outcome

The owner wants a fresh Unreal Engine 5.8 MCP branch that builds the same Shibuya city crop. The previous project setup is excluded except for exact copies of `AGENTS.md` and `CLAUDE.md`. The intended city is approximately 1 km square, photoreal leaning, with moving pedestrians and vehicles.

## Scope

The branch is `codex/shibuya-unreal-5.8`. Its isolated checkout is `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`. It starts from Git revision `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca` for history only; the replacement file tree carries no old project implementation.

The geographic origin is 35.6595 N, 139.7005 E. The crop bounds are latitude 35.6550-35.6640 N and longitude 139.6950-139.7060 E. The retained instructions describe approximately 997.1 by 997.3 metres. A fresh transform must verify those bounds in Unreal's chosen frame.

The orchestrator owns scope, contracts, canonical status, integration, and final acceptance. The clean-branch worker owns current documentation and ignore rules. The engine/MCP worker owns `tools/unreal/`, `Config/`, `ShibuyaUnreal.uproject`, and `Content/Python/`. The city-source worker owns `tools/data/`, `sources/`, and `tests/data/`. Motion and rendered appearance remain future assignments. Each worker reports actual commands and evidence before its status advances.

Do not change the primary checkout's files or index, another chat's unfinished work, or any old experimental worktree. Do not import old assets, data, scene output, tests, tooling, package setup, CI, or documentation. Do not merge the experimental replacement tree into main. A second location, product surface, routing product, and shipping target remain outside scope.

## Approach

Create a new worktree without checking out the old file tree, empty only its index, and copy the current instruction files byte for byte. Author the new policy and plan from the owner's requirements. The branch-local work registry starts at 0 because allocating through the primary would mutate or import the excluded setup.

Unreal Engine 5.8.3, changelist 58210709, uses its precompiled native MCP and Editor Toolset plugins on loopback port 18758. The observed handshake negotiated protocol 2025-11-25 and discovered the actual tools and project inspector. Native serverInfo fields were empty, so engine/project identity came from the loaded inspector rather than those fields. A corrected NullRHI probe now preserves the city through two validation-world runs; NullRHI does not establish rendered appearance.

The fresh source is the [official PLATEAU FY2025 Shibuya CKAN record](https://www.geospatial.jp/ckan/api/3/action/package_show?id=plateau-13113-shibuya-ku-2025). HTTP 206 range reads admitted selected members with CRC and SHA-256 checks: 78,340,265 compressed bytes and 127,738,827 uncompressed bytes. The ZIP is reported as 637,073,925 bytes; published MD5/ETag `0c2b675c68e9a9f495d92b56118e16f0` is metadata, not a measured complete-ZIP digest. Fresh CPython 3.13 Windows x64 runtime wheels are hash-pinned DracoPy 2.1.0, NumPy 2.4.2, and Pillow 12.3.0 under `data/runtime/`. The three-pin OSV audit passed; Pillow 12.2.0 was rejected by its preserved red control.

The GLB frame is X east, Y up, Z north in metres. A native asymmetric fixture measured Unreal bounds origin and extent of `[50,150,100]` centimetres, verifying the imported axis swap and metre-to-centimetre scale. Source vertical registration is approximate: 258 nearby road samples gave a median PLATEAU-minus-GSI offset of 36.741738926 m, with p10/p90 36.536029313/36.928117921 m. The manifest records origin ellipsoidal height 52.003579010 m and GSI ground height 15.261840084 m. These measurements do not establish independent surveyed landmark or vertical accuracy.

Prepared data contains 70 GLBs: 44 building tiles, 25 road tiles, and one 201 by 201 GSI terrain grid, with 43 PNG building photos and 649,940,156 output bytes. Whole-triangle clipping preserved 388,500 source triangles and omitted 120,099 not wholly inside the crop; two road members became empty. The terrain adds 80,000 triangles, bringing the total to 468,500 with 1,205,901 accessor vertices. Ground is neutral because aerial imagery retrieval failed. No aerial photo-ground claim or survey-grade completeness follows.

Continue from the verified static crop with independently checked placement, ground imagery, materials, ordinary controls, and population motion before claiming full-city acceptance. Preserve the eventual 3,000-pedestrian and 200-vehicle, 60 fps at 1920 by 1080 requirement without claiming it is measured. Use the [README commands](../../../README.md) for the exercised fresh source and native checks.

The [local branch rules](../../policies/local-rules.md) document the owner's overrides of the retained browser stack and gates. Unreal checks must be implemented and exercised before acceptance; inherited gate names are not substitutes.

## Acceptance criteria

The initial clean-branch/static-crop/native-MCP milestone is verified and pushed at `9df42139ef1747bedc435cb60ecd226cfb69a60a`. The orchestrator verified that all 17 reviewed file hashes match the committed blobs. This does not close the full visual, controls, motion, surveyed placement, or population/performance criteria below; the overall work unit remains active.

- The isolated branch/worktree exists and leaves main, its index, other worktrees, and active work unchanged.
- `AGENTS.md` and `CLAUDE.md` remain byte-identical to the primary files copied at branch creation; verify their SHA-256 values and preserve bytes in Git.
- No previous project setup or local assets are present outside those instruction files; inspect the full new file tree and Git diff, including reparse points.
- The fresh project identifies the installed engine and opens under Unreal Engine 5.8 with explicit load/build results.
- MCP connects to the intended project, lists actual tools, performs a bounded reversible action, and verifies the resulting state and cleanup.
- A fresh coordinate contract and independently admitted real-world data cover the stated Shibuya crop with checked landmarks, terrain, buildings, roads, and attribution.
- The city visibly meets the photoreal leaning direction through native images across close, block, and whole-crop views, with independent review bound to exact bytes.
- Pedestrians and vehicles visibly move through ordinary runtime controls and obey the agreed motion and support invariants; population counts and measured performance retain their stated bounds.
- Appropriate Unreal automation and integration checks pass on the actual final revision; unavailable, failed, and skipped checks remain disclosed.
- The branch retains reviewed work and truthful status separately from main; no city, MCP, rendering, or performance acceptance is inferred from bootstrap documentation.

## Implementation steps

- Clean-branch worker: create and inspect the isolated checkout, preserve instructions, remove inherited tracked content, and author fresh policy and plan. Accepted by the orchestrator after [bootstrap review 0](reviews/0_plan.md); exact reviewed files committed as `af4403654cfa2917c17bc52caf838da61939770e`.
- Engine/MCP worker: fresh project, native import, nondestructive probe, five offline contract checks, and final static capture passed. [Focused review 2](reviews/2_implementation.md) closes R1 for the frozen code; the final current-daylight-map probe passed with the exact reviewed helper.
- City-source worker: built fresh data, exact-pin audit, fifteen source tests, actual ZIP writer-boundary red/green controls, and syntax checks passed. Root reran the fifteen tests in 1.493 seconds. The unusable DEM fallback was removed. Focused review 2 closes R2 for the frozen code.
- Orchestrator: integrated and pushed the frozen reviewed inventory and final evidence as `9df42139ef1747bedc435cb60ecd226cfb69a60a` without merging main. [Review 1](reviews/1_implementation.md) preserves the initial findings and engine provenance gap; review 2 reads the final code completely and closes both findings.
- Future city worker: improve terrain, buildings, roads, and materials with geographic and rendered checks beyond the first real crop.
- Future motion worker: implement pedestrians and vehicles using agreed runtime invariants, then measure count and performance acceptance.
- Orchestrator and independent reviewers: run final build/runtime/MCP/source/visual checks on the exact experimental revision and record limitations.

## Outcome

The clean bootstrap is accepted and recoverable at `af4403654cfa2917c17bc52caf838da61939770e`, pushed to the tracked branch `origin/codex/shibuya-unreal-5.8` after the orchestrator verified repository ownership and push permission. It was not merged into main. The [independent review](reviews/0_plan.md) found no material bootstrap findings. It covers policy, plan, ignore rules, instruction preservation, branch/index identity, and the observed zero-reparse checkout census; it does not establish engine, source, city, runtime, performance, rendered appearance, final revision, or primary preservation acceptance. The two instruction files preserve the SHA-256 values recorded in local rules; the other 1,175 base-tracked paths were excluded from the new initial tree.

The fresh full import passed in `artifacts/unreal/build-20261011-002614/report.json`: 112 static mesh actors, 43 textures, 113 material assets, and saved map SHA-256 `4b6de737d9403d2f6f76e9ee21a8197a7af14d251d83d25ee31ca4ce6478b43d` (263,353 bytes), from manifest SHA-256 `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`. The D3D12 run used RTX 4090 driver 616.64 and exited gracefully with code 0.

The corrected probe in `artifacts/unreal/probe-20261011-003814/report.json` preserved the saved map digest and 112 mesh actors through two validation worlds and exited with code 0. Actual native APIs reported 112 Nanite-enabled meshes and 468,500 Nanite input triangles, matching the prepared total. The 769,872 native welded vertices measure a different population from 1,205,901 source accessor vertices; native LOD0 fallback contains 286,041 vertices and 127,099 triangles. These counters do not prove complete vertex correspondence or visual quality.

Final technical capture passed in `artifacts/unreal/render-20261011-004319/report.json` (receipt SHA-256 `544b15bdcfa95795577c2b4b02becc42d8b2175ef4298ab2cbbc0cef3dd6120d`) with the reviewed helper SHA-256 `ed2c53773c73a5ae62047e420323b14b8c7f46da6b067127982bae55b9476e5b`. The daylight map is 271,708 bytes, SHA-256 `6197141cdb38cbdf240f1c1e16e7c871d4fb83fdbf79993bb1584389e3cef1bc`, with unchanged 112 meshes, 43 textures, 113 materials, and 468,500 Nanite triangles. It used D3D12, RTX 4090 driver 616.64, and graceful exit code 0. Root and the engine worker opened all six 1280 by 720 images individually: whole-crop/block geometry is visible, but close crossing views remain dark and obstructed. Recognizable frontage and photoreal acceptance are not established. No more tuning was authorized in this milestone.

The final daylight-map probe passed in `artifacts/unreal/probe-20261011-004923/report.json`, receipt SHA-256 `7f7bb8ce07719a803783ac00e1835197e9855a302c52d2e1fe9baf3b9ebb7497`. It used the exact reviewed helper, preserved the daylight map digest above and all 116 actors/112 mesh actors through two isolated validation worlds, and verified the axis fixture. It exited gracefully with code 0, removed its two temporary map files, and left no owned editor, ShaderCompileWorker, or Zen process.

[Focused independent review 2](reviews/2_implementation.md) closed R1 and R2 for its exact frozen code inventory. The twenty final unit checks passed: fifteen source and five native contract checks. The final reviewer was the independent in-chat pinned Astra agent; approved external CLI lanes were smoked on public instructions, not used for a full Codex and Claude code review. Final implementation binding is `9df42139ef1747bedc435cb60ecd226cfb69a60a`; all 17 reviewed hashes and both preserved instruction hashes match its blobs.

The initial clean-branch/static-crop/native-MCP milestone is verified; the full city remains active. Appearance, ground imagery, ordinary interactive runtime controls, motion, performance, and independent surveyed landmark/vertical accuracy remain open. Historical Node/browser gates are expressly superseded; no C++ compile is needed for this content-only project, and no CI workflow is configured on this branch, and the exact implementation commit has zero GitHub Actions runs. The separate branch/worktree and needed ignored assets are intentionally retained. The completed engine gates closed their owned processes; no server was left running. Root also checked the exact worktree process census and found no task-owned leftovers. Git whitespace checking with CRLF recognized reports only final blank lines in the two engine-generated INI files; those nonsemantic warnings are retained to preserve the verified bytes.

## Continuation: visual and runtime completion, 2026-10-11

The owner requested fixes for dark crossing views, improved photorealism, ordinary runtime controls, pedestrians and vehicles, and explicitly set an active goal to continue until done. Deliver reviewed, pushed milestone commits on the Unreal branch. The explicit persistence instruction overrides the default five-attempt stop for this scope; two repeated failures still trigger a changed approach and the hard-problem workflow. No completion claim is allowed while required criteria remain open.

Baseline: pushed `33d386299ff7bd02d91bca38f655f41597ddb756`, a clean tracked tree with the fresh static city and ignored source/asset cache retained. The main branch and unrelated worktrees belong to other work and remain outside this task.

| Owner | Workspace and exclusive scope | First outcome | Dependencies/status |
| --- | --- | --- | --- |
| unreal_capability | Existing Unreal worktree; visual helper/runner, lighting config and visual defect record | Diagnose rendered darkness and occlusion, then corrected photoreal native captures and a red/green gate | Terrain and 25 roads share the verified GSI atlas with source geometry conserved; crossing/block/crop appearance remains red; native irradiance/resources diagnosis pending |
| city_surface | Isolated `artifacts/unreal-source-next/worktree`; new surface/network pipeline and source tests | Fresh admitted ground imagery and real supported movement routes, provenance and schema | Review 7 closed R7-R9; four source files integrated, all 2,441 declared files hash-checked, and 47 canonical source tests passed; native lifecycle remains separate |
| city_runtime | Isolated `artifacts/unreal-runtime-next/worktree`; new native runtime module and runtime checks | Build feasibility and agreed controls/simulation contracts, then native play runtime | R3-R6 reviewed; repairing R12-R14 and adding supported boundary lifecycle before focused review and native control/motion gates |
| Orchestrator | Canonical integration worktree; plan, interfaces, integration and acceptance | Agree contracts, serialize expensive gates, independent exact-revision review, push milestones and clean worker worktrees | Active goal; completion needs all requested outcomes |

Milestones are visual correction with source surfaces, ordinary runtime controls with real input-path checks, supported seeded fixed-step crowd and traffic, and integrated appearance/control/motion/performance acceptance. Worker investigation may adjust dependency order with evidence. Review and commits bind actual integrated file bytes and run artifacts. Native engine/process resources remain owned and headless by default.

Shared runtime source contract: movement-network schema 1 declares local east/north/up metres, origin, seed, source-manifest digest, validated pedestrian/vehicle routes with points/closure/speed/width/support digests, source-grounded default spawn/yaw, signal stops/timing, and default 3,000/200 population. The native consumer converts metre coordinates to centimetres. Segment support is sampled at no more than 2 m, including declared corridors; closed endpoints coincide within 1e-6 m and closures are real connected edges. Vehicle paths use Japanese left-hand lane centres. Directional entry stops explicitly declare +1 or -1; pedestrians already inside a crossing may finish after its phase changes.

The visual first probe is `mcp_run.py`/`capture_view`, with baseline receipt `artifacts/unreal/render-20261011-004319/report.json`. Native diagnostics found an 8-lux sun, positional rotation arguments, and one-shot captures lacking persistent state/explicit Lumen configuration. The visual owner will separate corrected measurement readiness from scene changes and verify the same baseline cameras before valid source-grounded viewpoint changes. Fresh source retrieval admitted an aerial tile and OSM response; remaining acquisition and route/corridor verification remain active.

The orchestrator inspected all eight final 1280 by 720 images from `artifacts/unreal/surface-20261011-091720/report.json`, receipt SHA-256 `1b62f010bd8a685929d36ae7a9dabb1e6a14b18caa52f8a3953ede08347afc69`. Photo ground is visible, but original crossing, block and crop shadows remain too dark. The saved map is `4203bd6085a60b99570dc3cfb25c02a503f4642719166b9f07f1f9e20df52808`. Engine PID 67928 exited gracefully with code 0. Alternate bright cameras do not close the original defect.

[Runtime review 3](reviews/3_runtime.md) found reverse-loop sticking, an elevated walk-mode freeze, discontinuous lateral corners and opposing-lane deadlock. [Source review 4](reviews/4_source.md) found conflicting CLI modes, ignored OSM turn restrictions and missing path admission. Their frozen targets are retained under ignored review-run paths; repairs require focused review and final integrated gates.

The genuine Microsoft .NET Framework 4.6.2 SDK was extracted from signed original SDK payloads into a process-local Unreal AutoSDK layout. The orchestrator rehashed all 152 files (20,943,905 bytes) and checked their ancestry for reparse points. No installer, registry edit, global environment edit or engine patch was used. Actual UBT discovery and compiler use remain the runtime build's responsibility.

The repaired native Editor module and Game executable compiled successfully, with actual SDK header/include-library witnesses and 4,761 core assertions. Their provisional exact-byte integration enables read-only lighting diagnostics; focused review and real city gates remain pending. Reviewer findings about report-save failure, pre-allocation input bounds and noncoincident seams are assigned for repair before native runtime acceptance.

Applying admitted OSM turn restrictions leaves 18 supported closed vehicle loops but no cyclic directed state within 30 m of the crossing under this measured graph. Independent SCC and bounded cost searches distinguish this from missed cycle selection. The approved schema-1 optional `boundary_flow` contract adds one unique legal central path, with source-bound entry/exit continuations outside the crop, inward/outward headings and full 4.4 by 1.8 m endpoint footprint support. Entry and exit centres remain within 20 m of the crop boundary. Runtime boundary replacement must use a new generation, admit a free supported entry and preserve occupancy; interior wrapping and invented turn permission are disallowed. This is crop traffic flow, not a new navigation product.

[Source review 7](reviews/7_source.md) accepted the frozen four-file source implementation, including CLI, OSM restriction and path-boundary repairs. Root integrated its exact file hashes and verified all 2,441 declared input/output/evidence files, copied 139 changed or missing files, and preserved four retired old support profiles. All 47 canonical source tests passed in 18.440 seconds, covering the 15 initial city checks and 32 new source checks. The final network is `0575c220ad42b889600cb47840d3d04300a454b884c4e2428dc84f664304cbfc`, movement manifest `7c24389ecf95278d0e9ae521a0a0d01285d64adf764b23b66ef4cf3eff5c49ea`. It contains 451 pedestrian routes, 18 vehicle cycles and one boundary path passing 0.944673 m from the crossing. This accepts source preparation; native lifecycle, continuous support, appearance and performance still require their own gates.
