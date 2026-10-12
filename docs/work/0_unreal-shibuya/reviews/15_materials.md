# Review 15 — native material API repair

Independent Astra/xhigh read-only review, 2026-10-11. The integration owner requested the six-line API/usage repair in `tools/runtime/prepare_assets.py`, its installed UE 5.8.3 primary definitions, and actual material-preparation evidence. This review covers the frozen preparer SHA-256 `6d0aad469bdf21a11f66e85f1a815bbdd2261184758d1cf4ecd662933dd9ea07`. It does not approve the subsequent R24 repair or reopen the unchanged runtime module/runner reviewed in rounds 12–13. The branch-only owner instruction and fresh Unreal local rules apply; no old Vite setup, gates or source were used.

## Verdict

The scalar-property repair and explicit instanced-static-mesh usage are supported by the installed reflected API and by the completed native NullRHI retry. One material finding remains against the frozen target: **R24, P2 — compiler errors are discarded and final shader status is not checked before readiness is reported.** The parent accepted this finding and dispatched a separate repair. Review 15 remains a finding-bearing review of the original frozen bytes.

The successful retry proves that the actual engine created/saved the three packages, and that its live materials had eight expressions and the instanced usage flag. It does not prove compiled hardware shaders, actual per-instance RGB rendering, absence of default-material fallback, ordinary Game controls, simulation, collision or performance. A compile-error array being empty under NullRHI is not a hardware shader readiness witness.

## Target and preservation

The isolated runtime checkout is `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, based on `33d386299ff7bd02d91bca38f655f41597ddb756`. The same preparer was copied by the integration owner to `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`. Both live copies matched the frozen new hash when inspected, including the late read before this report was authored. Exact old/new bytes and evidence are retained under canonical `tmp/review-runs/material-round15/`; later working-file repairs do not change this target.

The closing hash check found canonical and retained `new.py` still at `6d0aad469bdf21a11f66e85f1a815bbdd2261184758d1cf4ecd662933dd9ea07`, while the authorized worker repair had changed its live preparer to 4691 bytes, SHA-256 `9a739d4f166b00955c0b9d64b47fa263bba7d0c2fbb407a355741acbc0b7dca5`. Those later bytes were not substituted into or approved by this review.

| Retained file | Bytes | SHA-256 |
| --- | ---: | --- |
| `old.py` | 3424 | `d8377d9f1fb4eff15e3ed0e4d8c10aa9e0b76b41133652f4782547e71481e1a4` |
| `new.py` | 3791 | `6d0aad469bdf21a11f66e85f1a815bbdd2261184758d1cf4ecd662933dd9ea07` |
| Original API repair `report.json` | 931 | `37ad343344cf7b090c8b4620169f8089f8d07b2ab36f3439e303ae9101f94fab` |
| `old-native-stdout.log` | 236892 | `f275d73ab1f3604677e5c37cc497d52ac0498b74116e77880806255cd4997713` |
| `native-success/report.json` | 5108 | `e44982dbb7b25898541c8d94fdd9d80e1fe37bdf8fc90bec3f123bf6d85b86fc` |
| `native-success/native-readback.json` | 458 | `cf48b9d47d93c4ca34f16b1f86ac6340569751926e0f1e49e678f910f71ed54f` |
| `native-success/prepare_and_readback.py` | 1155 | `cddba010a4f8d5a20757abf1bed56fe232d8c736dbf00ecde30615d86e8846c4` |
| `native-success/process.json` | 954 | `4ff29f96c7f1daf73930215973773ec8b912127d81b6792348d77ef4032989a4` |
| `native-success/stdout.log` | 240892 | `255fdb265d902367cac43966f103052a05b0a3fb9a300ab39d24c455ff6e6028` |

The original worker receipt is `Artifacts/runtime-build/material-api-repair-20261011-115715/report.json`. Its statement that native retry was pending was accurate at creation; the separately identified completed receipt above supplies the later result. Neither evidence file was rewritten. The reviewer copied only declared evidence and wrote this new report and its ignored retention inventory.

## R24 — P2: preserve compiler failure and check completed shader state

**Location:** [prepare_assets.py:52](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tools/runtime/prepare_assets.py:52), with the subsequent save at lines 53–54 and completion/readiness at lines 60–61. These line references identify the retained `new.py` target; live repair bytes may later differ.

`unreal.MaterialEditingLibrary.recompile_material(result)` returns compile errors, but the result is discarded. The material is then saved and, once all three calls finish, `SHIBUYA_RUNTIME_MATERIALS_READY` is logged. Consequently a material compilation that reports errors can still reach successful saving/readiness. Saving an editable graph does not establish that its shader compiled. This is a concrete ignored-error path in authored code; no claim is made that the completed retry actually produced a shader error.

The installed `MaterialEditingLibrary.h:263–267` declares the Blueprint-callable return value as `TArray<FString>` and describes compilation errors. `MaterialEditingLibrary.cpp:1035–1059` calls its internal recompile path and returns the current material resource's `GetCompileErrors()`. The current preparer does not inspect that return value. A minimal error-propagation repair must reject a nonempty error array with the `/Game/Runtime/...` asset path and actual diagnostics, before saving or announcing readiness, and must have a negative control that exercises the actual rejected result rather than merely checking source text.

**Readiness bound:** Checking the immediate return is necessary but not sufficient to certify final hardware compilation. `RecompileMaterialInternal` at `MaterialEditingLibrary.cpp:984–1033` calls `PreEditChange`/`PostEditChange`, updates material instances and marks the package dirty; the immediate public call contains no explicit shader `FinishAllCompilation`. The preparer's completion command occurs after all per-material return values and saves, and there is no final per-material resource/error readback. An error that appears when queued compilation completes must also prevent a shader-ready verdict.

There is an additional explicit did-not-run case: `MaterialEditingLibrary.cpp:1054–1059` returns an empty array when `GetMaterialResource(GMaxRHIShaderPlatform)` is null. `Material.cpp:2606–2625` creates and caches the rendering resources only inside `FApp::CanEverRender()`. `App.h:400–406` makes that false for `-nullrhi`. Therefore the command used by this preparer can successfully save graph/usage declarations without running the rendering-resource compilation whose success the runtime eventually needs. Neither an empty immediate array nor an asset compilation completion command changes that bound.

The final console command itself is not rejected merely because its world argument is `None`: installed `KismetSystemLibrary.cpp:571–588` routes to `IConsoleManager::ProcessUserConsoleInput` before player/world fallbacks. `AssetCompilingManager.cpp:46–54,674–682` routes the asset completion delegate through registered compilation managers. `ShaderCompiler.cpp:2843–2856` shows the shader manager blocking and finalizing queued shader maps. This can finish work that exists; it does not prove a required resource was generated, and the preparer does not read final status afterward.

**Acceptance impact:** Do not use this target's readiness marker, exit 0 or the NullRHI receipt as compiled hardware material acceptance. Keep graph preparation and actual hardware shader readiness distinct. The latter needs an actual intended-RHI material resource, completed compilation and checked errors/valid shader state, with the runtime's intended instanced material binding and no silent default fallback. The parent is repairing R24 separately; this report does not prejudge that repair.

## API and graph checks

The full 65-line preparer was read, including unchanged graph construction and callers, rather than reviewing only the diff. The six changed lines comprise the `default_value` to `const_default_value` correction and explicit usage-setting/readback at lines 48–51.

`MaterialExpressionPerInstanceCustomData.h:18–25` distinguishes the `FExpressionInput DefaultValue` from editable scalar `ConstDefaultValue` and editable `DataIndex`. Setting Python `const_default_value` to `0.5` is the appropriate reflected scalar operation; the original native exception identified `default_value` as unavailable. The graph still assigns indices 0, 1 and 2, combines R/G/B through two append nodes, then feeds a vertex interpolator into Base Color. `HLSLMaterialTranslator.cpp:14641–14650` specifically documents the non-vertex limitation of direct custom instance reads outside Nanite, supporting the retained vertex-interpolator path for ordinary raster BasicShapes. Actual RGB pixels remain unobserved by this review.

`MaterialEditingLibrary.h:183–188` exposes `SetMaterialUsage` as a callable UE 5.8 API. It is deprecated in favor of the newer base-material API but remains present and functional in this installed version. The implementation at `MaterialEditingLibrary.cpp:814–821` delegates to the material usage setter. The new code reads the actual `used_with_instanced_static_meshes` field instead of assuming the Python return tuple means the flag is set. `Material.h:790–795` retains that reflected usage field, and `Material.cpp:1796–1798` updates it for the instanced-static-mesh usage. Native readback confirmed it was true for all three generated materials. Deprecation alone is not a material finding against the pinned engine.

Creation remains confined to the three explicitly named `/Game/Runtime/M_AgentMatte`, `M_AgentPaint` and `M_AgentGlass` packages. Existing non-material assets at those paths are rejected. Existing material graphs at those owned paths are rebuilt and saved deliberately; unrelated city/source/photo assets are not selected by this script. Repeated execution reconstructs the same declared graph and settings, but this review does not claim byte-identical package serialization. The existing `save_loaded_asset(result, False)` boolean is checked and errors name the affected asset path. A later failure can leave earlier owned material packages saved; this tool does not claim an atomic three-package transaction.

The graph wiring checks for append/interpolator connections remain intact. Base Color/roughness/metallic property calls use the corresponding fixed enum values on created material objects. This small revision does not change those connections, roughness/metallic values, scene lighting, photos, exposure or geometry. No new dependency is introduced.

## Actual native evidence

The original commandlet failed before the first package save. Retained old log lines 1684–1687 identify `MaterialExpressionPerInstanceCustomData` failing to find `default_value` at preparer line 27. This is an actual engine exception, not a mocked failure or a guessed API mismatch. The original API repair receipt and exact old preparer bytes are retained together.

The completed retry is canonical `Artifacts/runtime-materials/8beac0fb9024444e9a56070bd7bd8383/report.json`, hash `e44982dbb7b25898541c8d94fdd9d80e1fe37bdf8fc90bec3f123bf6d85b86fc`. Its command used the intended project, `UnrealEditor-Cmd`, Python commandlet and `-unattended -nullrhi`; it exited 0 after 11.8605 seconds. The receipt binds the reviewed preparer hash and the source/config inventory. The wrapper runs the preparer, loads each named material, checks exactly eight expressions and reads the true instanced usage flag. These are live object checks in the same process, not a separate fresh-process reload of the serialized expression graph.

The reviewer read the actual wrapper, readback JSON, process record and relevant native stdout, and independently hashed all three current native package files against the completed receipt:

| Native package | Bytes | SHA-256 |
| --- | ---: | --- |
| `Content/Runtime/M_AgentMatte.uasset` | 7456 | `fe168d54c5f5f7a4c2d8508d91e7e2915f30dad0da615ebf7bf4a37828480079` |
| `Content/Runtime/M_AgentPaint.uasset` | 7485 | `5e22692f5bfdda76bb0e58f90a4dd59d0905c827cd7ef5ba83847267f5c62e26` |
| `Content/Runtime/M_AgentGlass.uasset` | 7485 | `cb76a0b5d10ca55ad7cea938d77f73edf9e1bc96edd33542aa7d1c5645906bbe` |

The native stdout records all three saves at lines 1685, 1699 and 1709, then readiness and the separate graph/usage readback at 1714–1715. Shader-worker startup or shader-autogen log lines do not establish that these particular materials acquired valid hardware shaders. The receipt itself correctly says hardware Game/colour/input/performance are outside its bound.

The process record identifies owned root PID 69228, exit 0, completed cleanup and remaining owned child PIDs 71672, 54972, 34144 and 67620 terminated by its owner. This review inspected that recorded cleanup; it did not launch or manage that engine process or independently rerun a native lifecycle gate. The reviewer launched no engine, browser, server, build, test, compiler or persistent helper.

## Installed primary-source identities

All paths below are relative to `C:/Program Files/Epic Games/UE_5.8/Engine/Source`. These are direct source reads outside the authored diff. `additional-evidence-inventory.json` in the ignored retention directory records the measured byte counts and hashes for the first nine files and the completed native evidence; the separately listed Kismet hash was measured in the final synchronization check.

| Primary source | SHA-256 |
| --- | --- |
| `Runtime/Engine/Public/Materials/MaterialExpressionPerInstanceCustomData.h` | `858ab3d96843b4472896fae8068d8cd38bf8a484961bffbc3fe3084eada7a459` |
| `Editor/MaterialEditor/Public/MaterialEditingLibrary.h` | `5201a2be4ed754246bca79d115626dd3b59471989366f87cd7110a206047375f` |
| `Runtime/Engine/Public/Materials/Material.h` | `e5c457d568a54dd1139cf938a4f4018dab2293971d3b08892a2d73fb96c92d74` |
| `Editor/MaterialEditor/Private/MaterialEditingLibrary.cpp` | `96051980458dad86719f195072da4bd34eebd07a80d647ebb50bbbb0626e5565` |
| `Runtime/Engine/Private/Materials/Material.cpp` | `2448ace7a84345b03727539a8d1506c7e1689f8be75e64c1c6d52b652fdaa210` |
| `Runtime/Engine/Private/Materials/HLSLMaterialTranslator.cpp` | `b498e70f32b6bba08f19a934ef5d8233a000f4c1edd312b50dc9e07a5c3a26e9` |
| `Runtime/Core/Public/Misc/App.h` | `7f7b91bf7c3fd469a981c262bdefc3297fa3d5f25f35d7a9e4cd624decbbed43` |
| `Runtime/Engine/Private/AssetCompilingManager.cpp` | `f51a492689fa834df98a0e803fcb9e3408301b3f9babfa84ad886b66ceeb7c30` |
| `Runtime/Engine/Private/ShaderCompiler/ShaderCompiler.cpp` | `01cf29f3e0f8894f50d63dbd5ffebcc8216702ea2f08f1c46787037782d0056f` |
| `Runtime/Engine/Private/KismetSystemLibrary.cpp` | `73bdebccdeff448e4f2330123f66ee516767b3af66050d6bdfeca9ed893eeab6` |

## Remaining verification

Obtain a focused review of the R24 repair and the affected negative control. Bind actual RHI material completion/validity and instanced colour observations to the repaired preparer and exact saved native packages before accepting runtime materials. The actual native Game inventory, ordinary controls, motion/physics and dedicated performance phases remain separate required gates. This report does not certify full city appearance or gameplay.
