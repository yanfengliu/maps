# Review 16 — R24 material resource repair

Independent Astra/xhigh focused read-only review, 2026-10-11. This review covers only the repaired material preparer and the installed UE 5.8.3 API paths it relies on. The runtime worker's base remains `33d386299ff7bd02d91bca38f655f41597ddb756`; the integration owner copied the exact preparer to the canonical Unreal branch. The owner branch exception and fresh Unreal local rules apply. Review 15 retains the original finding and earlier NullRHI evidence.

## Verdict and bound

**No new material code finding in this bounded revision. R24's implementation defect is addressed:** immediate compile errors now stop the operation, and saving/readiness requires positive representative vertex and pixel instruction counts obtained after finishing compilation on the material's own current-platform resource. The installed primary source supports this synchronization and identity chain; it does not select the engine default material for the statistics check.

At this static review handoff, the worker's actual D3D12/SM6 positive preparation and invalid-native-material negative control are pending. Thus this is a code-review disposition, not a declaration that the affected native gate passed. Final verification must bind those completed receipts to the exact preparer below. Instruction counts alone do not prove visible per-instance RGB values, runtime material assignments, every instanced shader permutation used by the Game, ordinary controls, physics or performance. Actual native Game images and later runtime gates retain those obligations.

## Exact target and retention

The complete 80-line `tools/runtime/prepare_assets.py` was read in both the worker handoff context and the canonical integration context. A direct diff between the retained old and new files was inspected. Both live copies initially matched the new hash. No C++, source data, config, shader graph settings or runtime runner changes are part of this revision.

Exact copies are retained under `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tmp/review-runs/material-round16/`. The worker source was `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/runtime-build/material-resource-repair-20261011/`.

| Retained file | Bytes | SHA-256 |
| --- | ---: | --- |
| `old.py` | 3791 | `6d0aad469bdf21a11f66e85f1a815bbdd2261184758d1cf4ecd662933dd9ea07` |
| `new.py` | 4691 | `9a739d4f166b00955c0b9d64b47fa263bba7d0c2fbb407a355741acbc0b7dca5` |
| Worker `report.json` | 429 | `70f8b5440b2e1c7d1979d22b50f54a538de2fc725171a95dd7b90e178dcc4809` |

The retained worker report correctly marks hardware positive and invalid-material controls pending. `review-inventory.json` records exact target copies plus the primary-source identities listed below. The reviewer wrote only this new authored report and ignored retention files; no implementation bytes, Git index, global configuration or other review report were changed.

## R24 repair and primary call path

[prepare_assets.py:10](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tools/runtime/prepare_assets.py:10) introduces `compile_and_save`. At lines 11–13 it captures `recompile_material`'s returned error array and raises with the material path and returned diagnostic text if nonempty. This prevents the specific ignored-error path reported in review 15.

At lines 16–20, `get_statistics(result)` runs before any save. The code requires both `num_vertex_shader_instructions > 0` and `num_pixel_shader_instructions > 0`; otherwise it raises with the affected asset path, measured values and a commandlet-rendering/D3D12 instruction. `save_loaded_asset` is reached only at lines 22–23, and its existing false-return failure remains checked. The helper returns an asset path only after these steps succeed.

This statistics operation is a completion check on the target resource, not simply a poll of compile work that might not have run. Installed `MaterialEditingLibrary.cpp:2116–2127` fetches `Material->GetMaterialResource(GMaxRHIShaderPlatform)`, submits high-priority compile jobs if that resource's game-thread map is incomplete, and calls `Resource->FinishCompilation()`. `MaterialShared.cpp:914–925` first finishes shader-cache work, collects unfinished shader-map IDs for that material, and blocks through `GShaderCompilingManager->FinishCompilation` when necessary.

Resource identity remains local to the provided `UMaterial`. `Material.cpp:2963–2969` searches that material's `MaterialResources` for the current shader platform and material quality. It does not fetch an unrelated default material. `MaterialStatsCommon.cpp:470–480` reads `Target->GetGameThreadShaderMap()` from the supplied resource, then lines 517–538 inspect the corresponding mesh shader maps and actual shader entries. There is no default-material substitution in this count path.

Missing and failed resource behavior supports the guard. `FMaterialStatistics` initializes vertex and pixel counts to zero at `MaterialEditingLibrary.h:20–31`. If the material resource is absent, `GetStatistics` returns those defaults; if its game-thread shader map is absent, representative instruction enumeration adds nothing. For asynchronous compilation failures, `ShaderCompiler.cpp:2277–2283` records compile errors and adds the material with a null shader map; lines 2396–2402 apply those updates before notifying completion. The helper's post-completion positive-count requirement therefore refuses that failure path even when the immediate error array was empty before compilation finished.

This also addresses review 15's NullRHI did-not-run case: an empty immediate error array no longer suffices. A command that did not obtain a usable material resource fails the instruction-count requirement before save/readiness. The new usage text at lines 3–5 requests `-AllowCommandletRendering -RenderOffscreen -d3d12` instead of `-nullrhi`, consistently with that requirement. The script does not itself certify adapter identity or SM6; the native gate must verify the RHI and platform actually selected.

The final `Editor.AsyncAssetCompilationFinishAll` command remains at line 75, but this revision no longer relies on it to retroactively validate already-saved material resources. Each material passes its own synchronous statistics check first. The list construction at line 74 stops on any exception; the aggregate `SHIBUYA_RUNTIME_MATERIALS_READY` log at line 76 is reachable only after all three calls return successfully. The per-material shader log at line 21 records a compiled-resource measurement before saving; the later save check still controls final readiness.

## Complete-file and regression coverage

The only executable restructuring extracts recompilation/save into the new helper and routes `material()` through it at line 70. The original scalar property fix (`const_default_value`), three RGB data indices, append nodes, vertex interpolator, roughness/metallic constants, explicit instanced usage and usage readback remain unchanged from review 15. The reflected APIs and vertex-interpolator rationale therefore retain that review's installed-header support.

The script still targets only the three owned `/Game/Runtime/M_AgentMatte`, `M_AgentPaint` and `M_AgentGlass` packages. Existing assets of another class are refused. Existing material graphs are rebuilt intentionally and saved only after the new checks; unrelated city materials, photographs, geometry and lighting are not selected. A failure on a later material can leave earlier successfully saved owned packages, as before. The preparer does not promise an atomic multi-package transaction or byte-identical repeated saves.

No executable test, mocked check, shader compile or native engine was run by this reviewer. Prior native NullRHI receipt `e44982dbb7b25898541c8d94fdd9d80e1fe37bdf8fc90bec3f123bf6d85b86fc` belongs to the old `6d0aad…` preparer and is not evidence that this repaired gate passed. In particular, the previous positive graph/usage result cannot substitute for the new positive-resource and real-invalid-material controls.

## Primary source identities

These direct reads outside the authored diff are relative to `C:/Program Files/Epic Games/UE_5.8/Engine/Source`. Exact hashes were measured during this review.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `Editor/MaterialEditor/Public/MaterialEditingLibrary.h` | 34869 | `5201a2be4ed754246bca79d115626dd3b59471989366f87cd7110a206047375f` |
| `Editor/MaterialEditor/Private/MaterialEditingLibrary.cpp` | 71759 | `96051980458dad86719f195072da4bd34eebd07a80d647ebb50bbbb0626e5565` |
| `Editor/MaterialEditor/Private/MaterialStatsCommon.cpp` | 29266 | `186572ebd07f50138dbf591295e764a3c904f693ae69aa14990ba6756ff1f598` |
| `Runtime/Engine/Private/Materials/Material.cpp` | 319800 | `2448ace7a84345b03727539a8d1506c7e1689f8be75e64c1c6d52b652fdaa210` |
| `Runtime/Engine/Private/Materials/MaterialShared.cpp` | 269236 | `31c43df402ef7efc73514b12ae265f03b0955d1dacedfac9867763ffd0143656` |
| `Runtime/Engine/Private/ShaderCompiler/ShaderCompiler.cpp` | 244256 | `01cf29f3e0f8894f50d63dbd5ffebcc8216702ea2f08f1c46787037782d0056f` |

## Required native follow-up

Inspect the completed positive receipt for actual intended adapter/D3D12/SM6, per-material positive resource counts, saved package hashes, unchanged preparer/config inputs and owned-process cleanup. Inspect the negative control to ensure it invokes this production `compile_and_save` function on an actual invalid native material and is refused before save/readiness, with its exact error and process result retained. Missing resource or failed compilation must remain a failed operation, not a skipped pass. Bind subsequent runtime asset inventories to the newly saved package bytes. Actual per-instance colour and rendering of the intended materials remain an observation in the Game, outside this source-only review.
