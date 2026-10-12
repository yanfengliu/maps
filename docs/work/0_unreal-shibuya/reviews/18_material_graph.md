# Review 18 — repeatable material graph replacement

Independent Astra/xhigh focused read-only review, 2026-10-11. The target is the exact 5132-byte `tools/runtime/prepare_assets.py`, SHA-256 `6cc8e8d629172d221c2aed1fca99976397858d0fc36108543dbe5cb6a9bfe9d8`, in the runtime worker and canonical Unreal checkout. The worker base remains `33d386299ff7bd02d91bca38f655f41597ddb756`. This review covers the small graph-clearing delta from review 16, its installed UE 5.8.3 APIs, and the completed positive/negative native material evidence supplied during review. The owner branch exception and fresh Unreal rules apply.

## Verdict

**No material finding in this revision.** The explicit expression snapshot and zero-old-node guard address the observed repeat-preparation defect. The actual repaired native run saved all three materials and read back exactly eight expressions, enabled instanced usage and positive completed own-resource vertex/pixel instruction counts. The separate actual invalid-HLSL control called the production compilation/save function, received the native undeclared-identifier compilation error and produced no saved invalid package. Together with review 16's primary-source analysis, this closes R24 for the bounded material-preparation/error-rejection milestone.

This is not approval of rendered per-instance colours or final Game material bindings. Expression counts and representative instruction counts do not prove those pixels, every runtime shader permutation, ordinary input, simulation, collision or performance. The integration owner retains final native Game acceptance. No engine, build, test, compiler, network or browser was launched by this reviewer.

## Exact target and retention

The full 85-line preparer and direct old/new diff were read. The only changed code replaces `delete_all_material_expressions` with copied-expression deletion and a zero-count assertion at lines 34–39. The complete `compile_and_save` function is unchanged from review 16, as are the graph construction, settings, usage check, save policy and callers outside this deletion block.

Worker handoff: `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/runtime-build/material-graph-repair-20261011/`. Exact copies are retained under `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tmp/review-runs/material-round18/`, alongside declared native evidence. The snapshots were hashed against their originals after copying.

| Retained target | Bytes | SHA-256 |
| --- | ---: | --- |
| `old.py` | 4691 | `9a739d4f166b00955c0b9d64b47fa263bba7d0c2fbb407a355741acbc0b7dca5` |
| `new.py` | 5132 | `6cc8e8d629172d221c2aed1fca99976397858d0fc36108543dbe5cb6a9bfe9d8` |
| Worker `report.json` | 392 | `6078b64281ed55fcfe9d1114720525d8773e956f6d589c57239df4a9b8c4196e` |

The worker report's original pending-native statement is retained intact. The later native receipts below add the completed evidence rather than rewriting that history. `review-inventory.json` binds the target and old native evidence; `native-repair-inventory.json` binds the two completed repair runs, their scripts, logs, native JSON/process records and measured package hashes. Only ignored review retention and this new authored report were written by the reviewer.

## Deletion correctness and scope

At [prepare_assets.py:36](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tools/runtime/prepare_assets.py:36), `list(get_material_expressions(result))` captures the expressions before any deletion. Each captured expression is passed to the engine's single-expression deletion API. At lines 38–39 the actual material expression count must then be zero, otherwise an error names the material path before any replacement nodes are created or the material is saved.

The installed API confirms both the defect mechanism and the repair. `Material.h:1479` declares `GetExpressions()` as a `TConstArrayView`. The original bulk helper in `MaterialEditingLibrary.cpp:559–567` iterates that live view while calling `DeleteMaterialExpression`. The deletion implementation at lines 590–615 disconnects graph and material-property inputs, removes the expression from the live collection at line 609, marks it as garbage and marks the material dirty. Removing entries during that live iteration can leave later original entries unvisited, matching the observed dangling-node state.

The replacement API at `MaterialEditingLibrary.cpp:539–546` returns a new `TArray<UMaterialExpression*>` copied from the material's expressions. The additional Python `list(...)` completes the snapshot before the loop runs. Deleting an entry therefore cannot shorten the iterable being traversed. The single-expression API remains responsible for disconnecting links and material inputs; the Python code does not edit collection internals or leave those links intentionally dangling. The count API at lines 549–556 reads the actual current collection. If a captured entry cannot be removed, the zero-count guard fails rather than silently appending the new graph.

`MaterialEditingLibrary.h:139–154` exposes all three used operations through the reflected API: material expressions, expression count and specific-expression deletion. The accessor excludes nested expressions; these owned graphs contain the explicit eight top-level nodes created by this preparer and no nested material-function graph, so this bound is appropriate to the affected outputs. The existing non-material-class refusal remains at preparer lines 30–32.

The graph is rebuilt as three PerInstanceCustomData nodes, two AppendVector nodes, one VertexInterpolator and two constants. No parameter values, RGB channel indices, interpolation path, usage flag, scene exposure, photograph or geometry changed. The generated packages remain limited to `/Game/Runtime/M_AgentMatte`, `M_AgentPaint` and `M_AgentGlass`. The preparer still permits earlier owned materials to have been saved if a later one fails; it does not promise a three-package transaction or byte-identical serialization across repetitions.

## Old evidence remains distinct

The old `9a739d…` positive attempt `2104da53abbc495cbdaef5c52faf016b` remains a failed attempt. Its report SHA-256 is `6e62f1bc7c4f5545415218df9ed84fb7bb9945e4c62d1d99ad42f46ee505b81d`; it records `passed=false`, actual numeric exit `4294967295` (signed minus one), no native JSON and the missing-file verdict. Its stdout records the exact-eight-expression readback refusal for `M_AgentMatte` at lines 2020–2024. A preparer readiness log earlier in that run does not turn the failed external gate into a pass.

The subsequent diagnostic `c60c677caa774f8f808cb4aea9f7f54e`, report SHA-256 `75d32c123e3d006a48013cebf1f51ee42240a852771463cf3a3bdef7b9358de3`, explicitly uses mode `readback`. It records 11 expressions for each material, true instanced usage, vertex count 174 and pixel counts 332/333/333, plus actual expression classes and wiring showing the three extra old entries. Its script takes the readback branch at lines 5–11; it does not take its positive-preparation or invalid-HLSL branch. Its diagnostic `passed=true` is not accepted material readiness or a passed negative control. Both old receipts, scripts, logs and native data where present are preserved in the round-18 retention directory.

## Completed repaired native evidence

The reviewer read both actual new report/native JSON files, both generated scripts, process/cleanup data and relevant engine log lines. Both receipts bind the exact `6cc8e8…` preparer. Their logs show D3D12 adapter 0 selected, NVIDIA GeForce RTX 4090, and actual D3D12 with feature level SM6 selected/created at lines 883–910; these are observed engine selections, not merely command-line requests. The commands are unattended offscreen commandlet rendering rather than NullRHI.

| Run and role | Report bytes | Report SHA-256 | Actual process result |
| --- | ---: | --- | --- |
| `572965741729439f8aa0158ef087acc8`, positive preparation | 104198 | `d853b35569162f62fa184a30df0326a9ccab2b6967d7486a2e1ce19a4ab9aad8` | PID 69760, exit 0, 15.9860 s |
| `8bb33ec64922415791215b6563bcc54d`, invalid-HLSL control | 104544 | `e82067b8f8a42cabf848190526f7186d41c9c846c8edd5813aab5fda4c13f6a8` | PID 55380, exit 0, 17.7591 s |

Each original run directory is under canonical `Artifacts/runtime-materials/`; exact copies are retained under the same run IDs in `tmp/review-runs/material-round18/`.

The positive wrapper imports the production module, invokes its real `main()`, and then obtains the named material objects, actual resource statistics, expression count and usage flag. Its predicate still requires exactly eight expressions; it was not weakened after the old eleven-node failure. The three completed readbacks are:

| Material | Expressions | Instanced usage | Vertex instructions | Pixel instructions |
| --- | ---: | --- | ---: | ---: |
| `M_AgentMatte` | 8 | true | 174 | 332 |
| `M_AgentPaint` | 8 | true | 174 | 333 |
| `M_AgentGlass` | 8 | true | 174 | 333 |

Positive stdout logs each production shader measurement at lines 1776, 1797 and 1814, followed by aggregate readiness at line 1821. Inspection found no material compile-failure/default-fallback warning in this positive log. These checks are post-save live-object readbacks in the same process; this report does not convert them into an independent fresh-process deserialization check or a rendered-colour observation.

The negative wrapper creates a uniquely named native material and connects a Custom expression containing `SHIBUYA_INTENTIONAL_UNDECLARED_HLSL_IDENTIFIER` to Base Color. It calls the actual exported `compile_and_save` helper. The retained result reports a production `RuntimeError` from the compile-error branch, including the engine shader path, `TBasePassPSFNoLightMapPolicy`, `FLocalVertexFactory` and the actual undeclared-identifier diagnostic. Thus the failure is the intended native shader error, not merely an arbitrary caught exception. The invalid material is not saved; both the wrapper's disk check and the reviewer's current explicit file check find no package at its unique expected path. Expected compile-failure/default-material warnings for this intentionally invalid object appear in the negative log and are not relabeled as a successful material.

The negative process exits 0 because the control observed its expected production rejection. It does not claim that the invalid material compiled successfully. The wrapper leaves the uniquely named unsaved UObject for owned process teardown, avoiding an in-use asset deletion dialog; it still rejects any unexpected saved invalid package. The completed process records report empty owned Jobs. Positive cleanup lists remaining owned PIDs 70308, 33400, 68192 and 17868 terminated; negative cleanup lists 26416, 76412, 33480 and 49376. The reviewer inspected these records and did not launch, attach to or terminate another worker's active engine.

## Asset conservation and byte binding

The reviewer independently compared the report's before/after dictionaries, not just its top-level verdict. Each has 326 declared content entries. The positive run changed exactly the three intended Runtime material packages and no other entry; the negative run changed none and added/removed none. This is the bound of those declared dictionaries, not proof about files outside their inventories.

Current package hashes were independently measured against the positive receipt and agree with the negative run's unchanged package inventory:

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `Content/Runtime/M_AgentMatte.uasset` | 7456 | `6e8241c8d3bcb5e79ee463d52d9adaa8a7d3e1aa9078b65403b89886b886b9e5` |
| `Content/Runtime/M_AgentPaint.uasset` | 7485 | `168acf527533271c1d63484d1b7862af47786e1988fbcde3aa135e6e66f13a11` |
| `Content/Runtime/M_AgentGlass.uasset` | 7485 | `a192d12d6f64da59e1a896e28592ebddd9d3c35ccce445fa64259e0bbb9df59c` |

The retained `native-repair-inventory.json` also binds positive script SHA-256 `b7c3adbafe110b3cba0a8bf4b27eb081200604df5b733f4252c705b2f570ce3d`, positive native JSON `6a8b5076aa7544961a8eb723f1ea0402bef4af14200b0d9dd00d7d74fc1f17a9`, positive stdout `20840ae1c78a96e5be239c5a87ccb3424a780b0018254c6066696510bddbf623`, negative script `49d8d524648b43491430f49e42bcbf817302722acc95e0b69b4ac42e87438737`, negative native JSON `ba5f59e29865588c74ca799221ec169fde6e85539d8fe4f6b7d6a2dc9a5f9d13` and negative stdout `c00ab9d2b363482039a460c0b3afde086bd7d60867c85330517f83def3aff429`.

## Primary source and remaining bounds

Direct installed-source reads outside the authored diff, relative to `C:/Program Files/Epic Games/UE_5.8/Engine/Source`, were independently hashed:

| Source | Bytes | SHA-256 |
| --- | ---: | --- |
| `Editor/MaterialEditor/Public/MaterialEditingLibrary.h` | 34869 | `5201a2be4ed754246bca79d115626dd3b59471989366f87cd7110a206047375f` |
| `Editor/MaterialEditor/Private/MaterialEditingLibrary.cpp` | 71759 | `96051980458dad86719f195072da4bd34eebd07a80d647ebb50bbbb0626e5565` |
| `Runtime/Engine/Public/Materials/Material.h` | 106018 | `e5c457d568a54dd1139cf938a4f4018dab2293971d3b08892a2d73fb96c92d74` |

The unchanged resource-completion implementation retains review 16's exact primary-source analysis. The new invalid-HLSL control observes the immediate-error branch; it is not a separate executed mutation of every possible absent-resource or late-compilation path. The positive run observes the completed resource path under the intended RHI. Actual per-instance colour and runtime material assignment still require the Game's native observations and source/package-bound asset inventory. No full-city appearance, gameplay or performance acceptance is inferred here.
