# Shibuya in Unreal Engine 5.8

Archive checkpoint, 2026-10-18: this branch preserves the unfinished Unreal experiment at the owner's request. The [graphics comparison](docs/work/0_unreal-shibuya/matched-comparison-result.md) found no decisive overall visual or workflow advantage. Source, body support, controls and population/performance acceptance remain incomplete; results below are historical bounds. See the [checkpoint record](docs/work/0_unreal-shibuya/archive-checkpoint.md) and [mission board](docs/work/0_unreal-shibuya/current.md).

## Historical checkpoints

The normal Source3 support producer succeeds in83.593seconds within default150/110second budgets and publishes schema3 surface9ef164ef from independently reviewed literal-parent closure370. The identity-only serializer fix371 passes134 Source tests21.865seconds (22.715wall). Source publication is now complete; replacement route capacity/crossing coverage372, native fullbody contacts, final rendered appearance373 and3000/200performance remain open.

Shared Source2/3 support queries now match actual native coordinate packing and signed normals; all130 Source tests pass17.267seconds. The readiness-calibrated native probe confirms the corrected road hit and independently reproduces the remaining shoe/car failures. [Reviews360-365](docs/work/0_unreal-shibuya/reviews/361_native_source_query_contract.md) separate exact source conservation, lawful route capacity and real posed contacts. Final support, appearance coherence and3000/200 performance remain open.

The repaired ordinary game startup passes native inventory on the real map. Walking, look, flight, landing, pause, resume, reset and both animated populations work through viewport input at60/12. The overall controls check remains RED:22 posed contacts exceed20cm, maximum25.057cm. [Integrated review356](docs/work/0_unreal-shibuya/reviews/356_native_startup_actual.md) binds the exact code, both builds and observations; it does not accept final support or performance.

The current verification correction passes all125 Source tests in19.524seconds (20.304seconds wall). [Review351](docs/work/0_unreal-shibuya/reviews/351_complete_current_coverage.md) establishes that physical coverage must use complete current output geometry; [review352](docs/work/0_unreal-shibuya/reviews/352_source_exact_coverage.md) accepts the exact rational fallback after ordinary float refusals. Real gaps still refuse. The actual packet retains two physical holes and19 narrow occlusions; ordinary Source3 publication, native controls and3000/200performance remain open.

The numeric verification follow-up passes all 120 source tests in 20.942 seconds. [Review349](docs/work/0_unreal-shibuya/reviews/349_source_numeric_region.md) accepts the same-face native-plane grade fallback and exact declared-triangle containment proof; [diagnosis350](docs/work/0_unreal-shibuya/reviews/350_native_plane_grade_diagnosis.md) independently checks the actual lane53 geometry. The old functions reproduce both false refusals. Source3 publication still refuses a separate deleted-parent coverage residual; exact coverage diagnosis, final import, controls and full-population performance remain open.

This experimental branch builds a roughly 1 km Shibuya city crop from fresh public geometry, photographs and mapped movement routes. It uses Unreal Engine 5.8.3 and the engine's native MCP server. Only `AGENTS.md` and `CLAUDE.md` came from the previous project; all implementation, dependencies, configuration, source data and assets were prepared afresh.

The source milestone is reviewed, accepted and pushed at `e0d33fe` on `codex/shibuya-unreal-5.8`: 70 city GLBs, the 90-tile GSI aerial atlas, 25 road photo UV assets, 451 pedestrian routes, 18 legal vehicle cycles and one legal crop entry/exit vehicle path. All 47 canonical source tests passed in 18.440 seconds. Reviewed native Editor/Game targets also compile; compilation does not establish gameplay or appearance acceptance. The reach-only fixed-six hardware appearance trial and Source2 native collision installation now pass; final-source controls, boundary lifecycle, photorealism and the 3,000-pedestrian/200-vehicle 60 fps target at 1920 by 1080 remain pending. The [plan](docs/work/0_unreal-shibuya/plan.md) owns acceptance and the [branch rules](docs/policies/local-rules.md) define the exception to the historical browser project.

## Historical native verification

Both native targets compile and link with the reviewed Source3 consumer and persistent lighting configuration. Integrated checks pass148 Unreal helper tests,115 source tests and21 runner tests; the prior core result is reused only with identical four inputs and two fixtures. [Integrated review348](docs/work/0_unreal-shibuya/reviews/348_source3_integrated_code.md) binds all22 changed code files. The actual offscreen map has demonstrated walking, mouse look, flight, landing, pause/resume, reset and visible unsupported-walk refusal, with moving animated pedestrians and vehicles at60/12. That earlier controls run remains RED on30 support failures; Source3 data/import and final-source3000/200 performance remain pending.

Source2 installation passes the full terrain and all25 road triangle comparisons,282 support rays and18 wall/Pawn-capsule/open-road witnesses, then saves the map. The86 imported multi-building meshes use their existing detailed triangles for both collision query modes, preserving wall blocking and component responses. This corrects coarse convex hulls that previously covered streets; independent [collision review343](docs/work/0_unreal-shibuya/reviews/343_city_collision_review.md) covers that repair. These actual Source2 results do not substitute for the pending Source3 installation.

The f/8 reach-only Lumen trial passes allsix original fixed views,18 physical/coverage witnesses and six restoration checks in117.078seconds. Individual full-size review confirms the rounded pavement-shadow patch is absent. It retains local trace/detail defaults while extending scene reach; [review342](docs/work/0_unreal-shibuya/reviews/342_reach_only_lumen_review.md) records the code bound. Ground imagery remains coarse. Saved/runtime coverage coherence, final-source motion/support and full-population performance remain open in the [plan](docs/work/0_unreal-shibuya/plan.md).

## Install and select the toolchain

Install Unreal Engine 5.8.3 through the [Epic Games Launcher](https://dev.epicgames.com/documentation/unreal-engine/install-unreal-engine). The exercised installation is `C:\Program Files\Epic Games\UE_5.8`, changelist 58210709. The runner checks the exact 5.8.3 `Build.version`. The project enables the bundled ModelContextProtocol, EditorToolset, PythonScriptPlugin, EditorScriptingUtilities and Interchange plugins; it needs no third-party MCP server or global MCP configuration.

The source pipeline requires CPython 3.13 on Windows x64; the exercised interpreter is 3.13.9. Its NumPy, Pillow and DracoPy wheels are hash-pinned in `tools/data/requirements.txt` and installed only into ignored `data/runtime`. The engine's bundled Python runs the MCP driver. Native C++ compilation additionally needs the Microsoft C++/Windows toolchain described by [Epic's development setup](https://dev.epicgames.com/documentation/unreal-engine/setting-up-your-development-environment-for-cplusplus-in-unreal-engine); the current wrappers use Visual Studio 18 Build Tools at `C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools`.

Run the commands below in PowerShell from the isolated experimental project worktree. These variables name the exercised installation; select the matching installed paths on another machine.

```powershell
$ProjectRoot = (Get-Location).Path
$Python = 'C:\Users\38909\miniconda3\python.exe'
$Engine = 'C:\Program Files\Epic Games\UE_5.8'
$UnrealPython = Join-Path $Engine 'Engine/Binaries/ThirdParty/Python3/Win64/python.exe'
$EditorCmd = Join-Path $Engine 'Engine/Binaries/Win64/UnrealEditor-Cmd.exe'
```

The genuine Microsoft .NET Framework 4.6.2 SDK is available on this machine as an ignored, manifest-bound portable AutoSDK cache at `artifacts/toolchain/portable-netfx/sdk-files-manifest.json`. `build_native.py --sdk-manifest` verifies all 152 extracted files and sets `UE_SDKS_ROOT` only in the child build environment. It neither installs the SDK nor edits the registry, global environment or engine. The cache was extracted from signed original SDK payloads; a new machine needs a genuine installed SDK or a separately admitted portable cache with correct local paths. The flag is not a downloader or a substitute SDK implementation. `tools/runtime/prove_sdk.py --sdk-manifest <manifest>` checks actual header/import-library compilation and linkage separately from UBT discovery.

## Prepare or restore the reviewed source

The crop is latitude 35.6550–35.6640 N and longitude 139.6950–139.7060 E, with origin 35.6595 N, 139.7005 E. Prepared GLBs use X east/Y up/Z north in metres; movement JSON uses X east/Y north/Z up in metres, converted by native code to Unreal centimetres. The original vertical calibration is approximate and does not establish surveyed accuracy.

Restore the exact reviewed project-local cache using the source handoff manifests when reproducing acceptance. Sources and generated data are ignored, so a Git checkout alone cannot render the city. For a new acquisition, the explicit base pipeline is:

```powershell
& $Python -m pip install --only-binary=:all: --require-hashes --no-deps --target (Join-Path $ProjectRoot 'data/runtime') -r (Join-Path $ProjectRoot 'tools/data/requirements.txt')
& $Python (Join-Path $ProjectRoot 'tools/data/build_city.py') --inspect
& $Python (Join-Path $ProjectRoot 'tools/data/build_city.py') --sample
& $Python (Join-Path $ProjectRoot 'tools/data/build_city.py') --build
```

The base manifest records build time, so a newly rebuilt manifest has a new digest even when its geometry is unchanged. `sources/surface_network.json` pins the reviewed base manifest and OSM snapshot. Restore those admitted bytes or review the new snapshot before preparing surfaces; current remote OSM responses can differ from the pinned XML and are refused until admitted. Required DEM failures stop preparation. PLATEAU selected-member CRC/SHA checks do not claim a measured hash of the entire remote ZIP.

Once the base/source pins are admitted, prepare the photograph and movement files in separate modes:

```powershell
& $Python (Join-Path $ProjectRoot 'tools/data/surface_network.py') --fetch --photo-only
& $Python (Join-Path $ProjectRoot 'tools/data/surface_network.py') --roads-only
& $Python (Join-Path $ProjectRoot 'tools/data/surface_network.py') --network-only
& $Python -m unittest discover -s (Join-Path $ProjectRoot 'tests/data') -p 'test_*.py' -v
& $Python (Join-Path $ProjectRoot 'tools/data/check_dependencies.py')
```

`--fetch` is the explicit certificate-checked source acquisition step. The three mode flags are mutually exclusive. `--network-only` preserves frozen photo outputs. The admitted atlas covers all 90 z18 XYZ tiles; road UVs share it without duplicating embedded image bytes. Source tests require the actual pinned inputs and fail when they are absent or changed. The dependency check queries known OSV records for the exact pins at its query time.

Movement files live under `data/prepared/surface/`. Their manifests bind route profiles, original OSM turn restrictions and two full vehicle-body endpoint profiles. The one open vehicle path has supported entry/exit centres within 20 m of the real crop boundary and original OSM continuation outside it; it has no invented closing segment. Static supported length does not establish moving crowd or queue capacity. Signals use a declared simulated 70-second phase, with pedestrian green from 50 to 70 seconds; those timings are not Tokyo source facts. [Source details and limits](docs/work/0_unreal-shibuya/source-next.md) retain the rejected candidates and review proofs.

## Build the native module and import the city

The project now contains the `ShibuyaRuntime` C++ module. Build both Editor and Game targets before using the inspector or gameplay. Close owned engine runs before compiling, and serialize native builds/rendered gates with the orchestrator's engine lease.

```powershell
pwsh -NoProfile -File (Join-Path $ProjectRoot 'tools/runtime/test_core.ps1')
& $Python -m unittest discover -s (Join-Path $ProjectRoot 'tests/runtime') -p 'test_runner.py' -v
& $Python (Join-Path $ProjectRoot 'tools/runtime/build_native.py') --target both --timeout 600 --sdk-manifest (Join-Path $ProjectRoot 'artifacts/toolchain/portable-netfx/sdk-files-manifest.json')
& $UnrealPython (Join-Path $ProjectRoot 'tools/unreal/mcp_run.py') probe --manifest data/prepared/manifest.json --startup-timeout 360
& $UnrealPython (Join-Path $ProjectRoot 'tools/unreal/mcp_run.py') build --manifest data/prepared/manifest.json --startup-timeout 360
& $UnrealPython (Join-Path $ProjectRoot 'tools/unreal/mcp_run.py') surface --surface-manifest data/prepared/surface/surface-manifest.json --road-manifest data/prepared/surface/road-photo-manifest.json --startup-timeout 360
& $EditorCmd (Join-Path $ProjectRoot 'ShibuyaUnreal.uproject') -run=pythonscript "-script=$ProjectRoot/tools/runtime/prepare_assets.py" -AllowCommandletRendering -RenderOffscreen -d3d12 -sm6 -unattended -nosplash -DDC=Shibuya
```

The core test compiles actual simulation code against synthetic supported routes; it proves neither city collision nor native input. The build wrapper compiles and links with four parallel actions and UBA disabled; it launches no game. Native MCP `probe` performs a nondestructive live handshake/tool/action check with NullRHI. `build` creates `/Game/Maps/Shibuya`; `surface` replaces only the source terrain/road surfaces with the admitted aerial material and checks geometry/actor preservation. Material preparation creates `/Game/Runtime/M_Agent*` packages using real commandlet rendering. Each material must finish its own shader resource with positive vertex/pixel instruction counts before a checked save; NullRHI does not satisfy this shader gate. City and runtime packages, native binaries and receipts stay ignored.

After publishing and reprofiling Source3, select its schema3 support manifest explicitly for the combined import and fixed-six capture:

```powershell
& $UnrealPython (Join-Path $ProjectRoot 'tools/unreal/mcp_run.py') surface --surface-manifest data/prepared/surface/support-surface-manifest.json --road-manifest data/prepared/surface/road-photo-manifest.json --startup-timeout 360
```

The earlier photo-manifest command selects legacy photo-only terrain. The Source3 operation needs the published support manifest; omit `--surface-only` to include lighting captures.

## Explore and run headless checks

For interactive exploration after the native module, source and generated map are ready:

```powershell
& (Join-Path $Engine 'Engine/Binaries/Win64/UnrealEditor.exe') (Join-Path $ProjectRoot 'ShibuyaUnreal.uproject') -game -windowed -ResX=1920 -ResY=1080 -DDC=Shibuya
```

| Input | Implemented behavior |
| --- | --- |
| W/A/S/D and mouse | Move and look in walking or flight mode. |
| Left Shift | Move faster while held. |
| Tab | Toggle walking/flight; walking requires reachable native ground. |
| Q/E | Descend/ascend in flight. Descend before requesting walking from height. |
| P | Pause/resume simulation. |
| R | Reset the seeded population and crossing-side camera. |

The HUD shows counts, simulation/movement state, source attribution and a visible notice when walking cannot be entered. These controls are implemented; ordinary native viewport input, collision and motion still require their final gate. Close the interactive window when exploration ends.

Offline native-helper checks and rendered MCP diagnostics use:

```powershell
& $UnrealPython -m unittest discover -s (Join-Path $ProjectRoot 'tools/unreal') -p 'test_*.py' -v
& $UnrealPython (Join-Path $ProjectRoot 'tools/unreal/mcp_run.py') diagnose --explore --startup-timeout 360
& $UnrealPython (Join-Path $ProjectRoot 'tools/unreal/mcp_run.py') render --startup-timeout 360
```

Rendered diagnostics require the compiled inspector, actual SM6/D3D12 and current-view Lumen card/resource witnesses. Reports and fixed-view images go under `artifacts/unreal/`; inspect each native image and bind its review to its digest. The accepted fixed-six trial uses f/8, SceneViewDistance 240,000 cm and first-clipmap extent 7,500 cm, while preserving the original local trace/detail defaults. The earlier combined scene-reach/trace/detail experiment passed numeric checks but was visually rejected for a pavement-shadow patch. `--full-crop-coverage` now selects the accepted reach-only trial; saved-map and ordinary-game coverage still require final-source verification.

The runtime runner owns an offscreen 1920×1080 game and closes its process tree. First prepare an actual loaded-package and source inventory:

```powershell
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase inventory
```

Set `$AssetReceipt` to the `report.json` path printed by that successful preparation. Every subsequent arm requires `--asset-receipt`; the runner checks the actual loaded map/package set, package hashes, implementation hashes and admitted source input hashes. Reprepare after those inputs change. Run all five functional/negative prerequisites against that same inventory; each prints its own receipt path:

```powershell
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase controls --asset-receipt $AssetReceipt
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase negative-input --asset-receipt $AssetReceipt
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase report-write-negative --asset-receipt $AssetReceipt
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase oversize-negative --asset-receipt $AssetReceipt
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase suppressed-source-failure --asset-receipt $AssetReceipt
```

The default functional population is 60 pedestrians/12 vehicles with a 10-second measured benchmark interval. Boundary lifecycle acceptance additionally needs `--minimum-boundary-events 1` and enough population/time to observe an actual exit and available entry; the default small run does not promise this. Negative arms pass only by observing the intended input/report/allocation failure. `suppressed-source-failure` combines disabled input with an invalid oversized source and must report the source failure independently of input suppression. The viewport harness uses ordinary keyboard/mouse events, not camera setters. Reports are under `Artifacts/runtime-game/<run-id>/`.

Then supply the inventory and all five actual same-implementation/source/assets prerequisite receipt paths to the separate full-population phase:

```powershell
& $Python (Join-Path $ProjectRoot 'tools/runtime/run_native.py') --phase performance --benchmark-seconds 30 --asset-receipt $AssetReceipt --controls-receipt $ControlsReceipt --negative-input-receipt $NegativeInputReceipt --report-failure-receipt $ReportFailureReceipt --oversize-receipt $OversizeReceipt --source-failure-receipt $SourceFailureReceipt
```

Set the five prerequisite variables to the corresponding `report.json` paths printed by the five arms. The performance phase forces 3,000/200, measures at least 30 warm unpaused seconds, requires unchanged implementation, admitted source inputs and actual loaded assets, and accepts only its independent required performance field. Passing compilation, synthetic core tests, reduced population checks or NullRHI cannot close that target. Final native results are pending; no CI workflow is configured on this branch.

## Sources, persistence and branch ownership

Preserve the processed-source notices and licence links for [PLATEAU](https://www.mlit.go.jp/plateau/site-policy/), [GSI elevation/aerial data](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html) and [OpenStreetMap contributors/ODbL](https://www.openstreetmap.org/copyright). The source manifests and runtime HUD carry attribution. Aerial shadows/capture dates and approximate heights remain reconstruction limits. The scene is project-local data and generated assets, not a self-contained Git checkout or packaged release; user session persistence/save compatibility has not been accepted.

The orchestrator owns shared contracts and final acceptance. This replacement tree stays on `codex/shibuya-unreal-5.8` under the owner's explicit branch exception; it is not merged onto main. Keep reviewed caches and active evidence for reproduction, and remove only owned obsolete outputs/processes. Large assets require a separate owner-approved storage decision before distribution or ordinary Git promotion.
