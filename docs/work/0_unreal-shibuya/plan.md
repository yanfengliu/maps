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

The initial clean-branch/static-crop/native-MCP milestone is verified. Final commit binding is the orchestrator's next integration step. This does not close the full visual, controls, motion, surveyed placement, or population/performance criteria below; the overall work unit remains active.

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
- Orchestrator: bind the frozen reviewed inventory and final evidence to the experimental commit and push it without merging main. [Review 1](reviews/1_implementation.md) preserves the initial findings and engine provenance gap; review 2 reads the final code completely and closes both findings.
- Future city worker: improve terrain, buildings, roads, and materials with geographic and rendered checks beyond the first real crop.
- Future motion worker: implement pedestrians and vehicles using agreed runtime invariants, then measure count and performance acceptance.
- Orchestrator and independent reviewers: run final build/runtime/MCP/source/visual checks on the exact experimental revision and record limitations.

## Outcome

The clean bootstrap is accepted and recoverable at `af4403654cfa2917c17bc52caf838da61939770e`, pushed to the tracked branch `origin/codex/shibuya-unreal-5.8` after the orchestrator verified repository ownership and push permission. It was not merged into main. The [independent review](reviews/0_plan.md) found no material bootstrap findings. It covers policy, plan, ignore rules, instruction preservation, branch/index identity, and the observed zero-reparse checkout census; it does not establish engine, source, city, runtime, performance, rendered appearance, final revision, or primary preservation acceptance. The two instruction files preserve the SHA-256 values recorded in local rules; the other 1,175 base-tracked paths were excluded from the new initial tree.

The fresh full import passed in `artifacts/unreal/build-20261011-002614/report.json`: 112 static mesh actors, 43 textures, 113 material assets, and saved map SHA-256 `4b6de737d9403d2f6f76e9ee21a8197a7af14d251d83d25ee31ca4ce6478b43d` (263,353 bytes), from manifest SHA-256 `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`. The D3D12 run used RTX 4090 driver 616.64 and exited gracefully with code 0.

The corrected probe in `artifacts/unreal/probe-20261011-003814/report.json` preserved the saved map digest and 112 mesh actors through two validation worlds and exited with code 0. Actual native APIs reported 112 Nanite-enabled meshes and 468,500 Nanite input triangles, matching the prepared total. The 769,872 native welded vertices measure a different population from 1,205,901 source accessor vertices; native LOD0 fallback contains 286,041 vertices and 127,099 triangles. These counters do not prove complete vertex correspondence or visual quality.

Final technical capture passed in `artifacts/unreal/render-20261011-004319/report.json` (receipt SHA-256 `544b15bdcfa95795577c2b4b02becc42d8b2175ef4298ab2cbbc0cef3dd6120d`) with the reviewed helper SHA-256 `ed2c53773c73a5ae62047e420323b14b8c7f46da6b067127982bae55b9476e5b`. The daylight map is 271,708 bytes, SHA-256 `6197141cdb38cbdf240f1c1e16e7c871d4fb83fdbf79993bb1584389e3cef1bc`, with unchanged 112 meshes, 43 textures, 113 materials, and 468,500 Nanite triangles. It used D3D12, RTX 4090 driver 616.64, and graceful exit code 0. Root and the engine worker opened all six 1280 by 720 images individually: whole-crop/block geometry is visible, but close crossing views remain dark and obstructed. Recognizable frontage and photoreal acceptance are not established. No more tuning was authorized in this milestone.

The final daylight-map probe passed in `artifacts/unreal/probe-20261011-004923/report.json`, receipt SHA-256 `7f7bb8ce07719a803783ac00e1835197e9855a302c52d2e1fe9baf3b9ebb7497`. It used the exact reviewed helper, preserved the daylight map digest above and all 116 actors/112 mesh actors through two isolated validation worlds, and verified the axis fixture. It exited gracefully with code 0, removed its two temporary map files, and left no owned editor, ShaderCompileWorker, or Zen process.

[Focused independent review 2](reviews/2_implementation.md) closed R1 and R2 for its exact frozen code inventory. The twenty final unit checks passed: fifteen source and five native contract checks. The final reviewer was the independent in-chat pinned Astra agent; approved external CLI lanes were smoked on public instructions, not used for a full Codex and Claude code review. Final commit binding remains the orchestrator's next step; no final implementation revision is claimed yet.

The initial clean-branch/static-crop/native-MCP milestone is verified; the full city remains active. Appearance, ground imagery, ordinary interactive runtime controls, motion, performance, and independent surveyed landmark/vertical accuracy remain open. Historical Node/browser gates are expressly superseded; no C++ compile is needed for this content-only project, and remote CI is not yet available or verified. The separate branch/worktree and needed ignored assets are intentionally retained. The completed engine gates closed their owned processes; no server was left running.
