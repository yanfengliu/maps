# SM6 and whole-crop Lumen coverage investigation

Bound: actual fixed-camera native render resources, native actor bounds and current-view Lumen scene counters. This checkpoint does not accept photoreal appearance, complete per-surface illumination, ordinary game rendering, collision, motion or performance. Inputs are the saved112-mesh photo city map `4203bd6085a60b99570dc3cfb25c02a503f4642719166b9f07f1f9e20df52808`, source manifest `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`, surface manifest `8d1a4149c2e17627a9be15a151bd57e1108cff2d11be3e5ab6a4946b0aecf347` and road-photo manifest `5657bdbf446867762ae8c6831c02c05aaa905dfb5ef390279299ba774a2e2bcd`. Source geometry, photo bytes, original cameras, sun, exposure, display gamma and luma thresholds remain fixed.

## Measured mechanism

The fresh project's omitted Windows target settings allowed the installed engine's `BaseEngine.ini:3411` PCD3D_SM5 target. Native `gi-control-20261011-101848` selected SM5 despite RTX4090 capability. Processed skylight texture and all nine finite RGB SH coefficients were nonzero;112 meshes had valid SDF and654 offline cards. Nevertheless, the actual Lumen scene had zero mesh cards. Native resource existence and requested show flags did not establish executed GI.

The minimal Windows target change selects DX12, removes the SM5 target and adds PCD3D_SM6. [Epic's hardware requirements](https://dev.epicgames.com/documentation/unreal-engine/hardware-and-software-specifications-for-unreal-engine) require SM6 for current Lumen/Nanite/VSM features. The renderer gate checks actual native feature-level and shader-platform metadata, plus the selected highest D3D12 feature level. It refuses the real retained SM5 log. Hardware capability alone cannot pass.

`artifacts/unreal/gi-control-20261011-103544/report.json`, SHA `5c80169ae14fb20ed492d56d3fda3a53a7eb80ab5eaacf0cbce141fde792538e`, now observes actualSM6/PCD3D_SM6. The native crossing GI-on/off images differ with unchanged physical inputs. GI-on median encoded luma16.953 and black fraction0.375615 improve over GI-off11.953/0.500181, but both fail the fixed shadow criterion. Nonzero native scene cards and a controlled pixel response establish an executed GI effect within this view; they do not prove adequate irradiance or coverage of every facade. The source skylight still has an initialized128×128 RHI texture and SH maximum9360.

| Fixed view | Native mesh cards/cards | Actor AABBs within200m | Distance to target | Nearest actor AABB |
| --- | --- | --- | --- | --- |
| Crossing |31/163 |31 |60.415m |0m |
| Crossing west |26/132 |26 |88.318m |0m |
| Southeast block |8/56 |8 |483.451m |84.857m |
| Northwest block |2/14 |2 |483.451m |194.331m |
| Southeast crop |0/0 |0 |1383.555m |804.825m |
| Northwest crop |did-not-run |0 |1383.555m |783.249m |

The complete112 actor AABBs, not visibility-selected triangles, supply these distances. Their200m counts exactly match all four observed populated-view mesh-card counts. For the southeast crop, every actor AABB is farther than800m; no visibility subset can improve that minimum. Northwest crop has only three AABBs within800m. The farthest AABB distance over the fixed crop views is1961.987m. The analysis does not estimate per-pixel visibility, irradiance or adequate mesh-card orientation. Its ignored receipt `artifacts/unreal/visual-review-repairs/coverage-analysis.json` has SHA `8625fdaeb8d82f4544dd4e9134df93bf027902abeb3ca705d458bf6fb42d2ac8` and binds the exact native receipt and real renderer logs.

## Installed policy and remaining measurements

Installed5.8.3 primary source defines `FPostProcessSettings.LumenSceneViewDistance=20000cm` and `LumenMaxTraceDistance=20000cm` in `Engine/Source/Runtime/Engine/Private/Scene.cpp:592`. The current capture does not override either. These are source-supported expected defaults; the actual resolved capture settings and distance cvars were not observed in this run and must be read before a candidate changes them.

`Renderer/Private/GlobalDistanceField.cpp:425` begins with four clipmaps and adds at most two based on the requested Lumen view distance. `Renderer/Public/GlobalDistanceFieldConstants.h:10` caps the count at six. `Renderer/Private/Lumen/LumenScene.cpp:77` starts the global SDF extent at2500cm and doubles it by clipmap index; normal maximum coverage is therefore80000cm. `LumenSceneGPUDrivenUpdate.cpp:69` limits ordinary software mesh-card capture to the last clipmap extent. `LumenSceneRendering.cpp:480` culls by squared AABB distance to that range, then by projected card size. `LumenSceneDetail` influences the latter size threshold, not the distant-range limit. [Epic's technical details](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine) also describe200m software coverage, extendable to800m, and warn that complex meshes can lack surface-cache coverage.

The112 distinct meshes contain86 building meshes/626 offline cards,25 road meshes/25 cards and one terrain/3 cards. Forty-two building meshes have12 cards; this is the ordinary per-mesh cap. Combined multi-building meshes may therefore leave surfaces uncovered even when they are admitted by distance. Raising the cap or splitting source meshes cannot be justified by the total card count alone; inspect actual surface-cache coverage and preserve source geometry/material identity if a later mesh-build repair is needed.

Before another renderer candidate, inspect current capture PP values/override bits for scene distance, maximum trace distance, scene detail, lighting quality and surface-cache scale, plus `r.LumenScene.GlobalSDF.ClipmapExtent`, `r.AOGlobalDistanceField.NumClipmaps`, `r.LumenScene.SurfaceCache.CardMinResolution`, `r.LumenScene.SurfaceCache.CardTexelDensityScale` and actual hardware-Lumen selection. Read them while the existing persistent capture is alive. Record them independently of the requested candidate, alongside fresh native scene counters. Do not allocate a diagnostic view state or recapture to manufacture readiness.

## Prepared candidates, not dispatched changes

The ordinary PP800m extension cannot solve the fixed southeast crop's coverage. A bounded software candidate can use the installed render-thread-safe first-clipmap-extent cvar7500cm, with observed PP scene/max-trace distance240000cm. Six clipmaps then span2400m, enclosing every admitted native AABB from the fixed cameras. Scene detail/cache resolution may need a separately measured supported quality policy for projected card size. This changes global SDF precision: a three-times larger initial extent at fixed resolution makes its voxels three times coarser. It must be tested for shadow detail, surface-cache holes, physical photo retention and actual render cost. Positive cards alone cannot accept it. A cosmetic card-capture margin without matching trace coverage is disqualified.

A distinct hardware-Lumen candidate uses actual hardware-ray-tracing support, compute skin cache and source-matched culling/trace distances. `RayTracingInstanceCulling.cpp:38` defaults culling radius30000cm; `GetCardMaxDistance` uses that radius when hardware tracing and culling are active. RTX4090 capability is insufficient without actual native RT activation. This route requires a reviewed Config change, shader restart and observation of actual RT selection/geometry coverage; fallback meshes differ from full Nanite input, so do not claim source triangle fidelity merely from a hardware flag. World Partition/HLOD Far Field adds unnecessary architecture for this bounded112-instance scene and remains outside this proposal.

The software candidate is now implemented offline as an explicit `--full-crop-coverage` opt-in for `diagnose` or `render`; default captures retain the prior policy. `capture_view(full_crop_coverage=True)` observes the native component settings after assigning the existing exposure/Lumen baseline, before changing its coverage values. Current observed component PP and process cvars are included at start, warm and final. These are component observations, not a claim that native resolved render-thread settings were sampled. Explicit weight1 overrides provide the requested distance/detail/cache values; actual fresh scene counters and rendered pixels remain decisive.

The process-local clipmap is restored to its observed prior value at finished export, failed capture startup, failed finished export and editor shutdown. The helper checks the observed restored cvar before returning success. Actor cleanup runs even if restoration fails. The host binds the requested opt-in mode and all four coverage overrides to current native values, requires the planned clipmap/count, and refuses scoring without a consistent original policy and observed final restoration. It retains the strict per-view positive-card and unchanged darkness thresholds. A false opt-in flag alone cannot admit a view.

The immutable offline freeze is `artifacts/unreal/visual-review-repairs/coverage-offline-20261011-110059/`, including all six source targets. Receipt SHA is `13d324edab5e44bfcd051ae5ce8f22961ee64144d6a5ddeec337614346570720`;28 tests passed16.431s, syntax compilation passed, input bytes stayed fixed and both owned Python subprocesses stopped. Seven new tests include18 invalid policy-envelope subcases, missing/failed restoration, changed original settings, native current-property reads, restoration to a nondefault prior3125cm, actual helper startup failure after its first7500cm capture, and actual helper export failure. Native APIs and pixels are mocked; no native lighting or shader/resource success is claimed. The earlier prepared28-case receipt `coverage-offline-20261011-105803` is retained separately but is superseded because the final helper observes the assigned native component's pre-mutation PP instead of an unattached constructed struct.

| Initial 28-case coverage target | SHA-256 |
| --- | --- |
| `Content/Python/shibuya_tools.py` | `528b7c679d28edf69c4de86ce705e4f4b01833c1d868a6dae9080bb00e737796` |
| `tools/unreal/mcp_run.py` | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |
| `tools/unreal/test_mcp_run.py` | `d00e97da4d7100c7d20a3bd6918f00870900398e50cfb3f95ec68142815ffdff` |
| `tools/unreal/test_visual_controls.py` | `96205f4954f9b62c12cfe60979dda15b093deb8ebae269cefc012bf527ecd43e` |
| `tools/unreal/test_coverage.py` | `be160b41388cfec9ae0abe8d16c27f9fe7f9ee671663fc43b24dbcedb64d230a` |
| `Config/DefaultEngine.ini` | `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948` |

The reproducible opt-in command is `& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\ThirdParty\Python3\Win64\python.exe' tools/unreal/mcp_run.py diagnose --full-crop-coverage`, from the fresh canonical worktree. A separate ignored `run_native_coverage.py` uses the same original six viewpoints plus a fixed crossing GI-off control and compiled resource/terrain-road persistence observations. The first 28-case freeze had not run natively; its review10 found R20/R21 cleanup and final-identity defects, repaired below. The prior SM6 driver and19/21-case receipts remain immutable separately. Main game rendering remains an independent required path. Neither changing cameras nor relaxing readiness/pixel thresholds closes this defect.

## Native gate outcome and cleanup

The SM6 run truthfully failed at the southeast crop's zero-card readiness check, before its brightness scoring. The opposite crop did not run. Crossing and southeast block failed admitted brightness; west and north passed the limited pixel check. All six generated final native1280×720 PNGs, including the refused crop and GI-off control, were inspected individually. Photos and genuine geometric detail are visible, but shadow frontages remain too dark. This is a partial render set and no appearance acceptance.

Owned editor PID68288 exited gracefully0; its measured conhost, shader workers, zenserver and crash handler descendants were removed and the final census was empty. The run preserved exact map/source/code/Config and Surface asset bytes. Review8 accepted the original R10/R11/SM6 instrument target, including ConfigSHA `f85fb346c0aef3668c7cc102487c1edf48917efc508f45fa353200635ffff993`. After review completed, only its regenerated irrelevant AndroidFileServer section was removed; all other Config bytes, runtime GameMode and SM6 target settings were preserved. Current clean ConfigSHA is `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948`. The runtime owner disables the unused plugin before the next editor so the block cannot regenerate. No generated token belongs in Git or this note.

## Coverage boundary repairs and native result

Review10 R20 found that a finished export with an invalid path failed before the cleanup boundary, retaining its capture and process-local7500cm extent. Admission now runs inside the finish cleanup boundary. Four actual-helper negative controls cover invalid suffix, outside path, path resolution and validation failure; they restore a nondefault prior3125cm and destroy only the owned capture. The retained original helper fails these controls. An unfinished export intentionally retains its active capture for a retry.

Review10 R21 found that the ignored native driver recorded post-shutdown digests without comparing them or clearing success. The actual driver finally boundary now refuses changed admitted input/asset bytes and hash-read failures, writes a truthful failed receipt, and distinguishes hash measurement failure from a measured mismatch. Retained-original controls fail for native shutdown changing DefaultInput, changing the map and deleting an admitted file; current controls pass. A native nonzero exit independently fails overall readiness even when identity and process cleanup pass. The RED receipt `coverage-r20-r21-20261011-111318/red-report.json` has SHA `a8ac21cf1d7635373029c2312e576b07b3345e3541032ae12d9b196ddd681180`.

Review11 R22 found a fabricated abbreviated ray-tracing log predicate. Installed `RenderCore/Private/RenderUtils.cpp:1072`, SHA `5d989227390d59eaa4aa6949d36bd7bbb74b3e253b480630fa4c45b3b5e17f0b`, emits the full disabled-through-project-setting reason. The corrected predicate admits both actual retained103544 and112339 native logs; the original refuses both. This source/log control is separate from a synthetic expected-string unit case. Its ignored `r22-real-control.json` has SHA `c637dbf83e709bd3c7086e8ab3e09f9d52b506b676f34f23e612e1aa35a02cb9` and pins both log digests.

The first native coverage attempt112339 stopped before frames at the wrong predicate. Native input startup opt-out was observed0/false with legacy CDO classes and unchanged authored DefaultInput. Identity and owned-process cleanup passed, but the editor exited3221225477 (`C0000005`). The crash handler independently recorded signed-1073741819; no stack or dump was found in the bounded evidence search. Its root cause remains unknown. The raw receipt `coverage-gi-control-20261011-112339/report.json`, SHA `638484e68fa17d5ddb97984dde459fa5e1cbfa00e4043ddb2e22d4713cb7dab9`, and failed driver/startup bytes remain retained. It is not a clean shutdown or a lighting RED.

The installed `EditorPythonExecuter.cpp` supports ending its persistent script host through a next-tick deferred `QUIT_EDITOR`, after the Python callback returns. The diagnostic shutdown now finishes its owned capture and releases the verified keep-alive flag; it does not directly quit the editor within that MCP callback. This is a source-supported alternative sequence, not an attribution for the previous crash. An actual-startup-function offline control verifies flag transition and cleanup ordering. Native clean exit is still measured independently.

The final offline freeze `coverage-offline-20261011-113338/report.json`, SHA `26198774d912b428eea7d145e6252e257bb16bb920e9e04fafd69ec315473083`, passed37 tests23.331s and syntax compilation. Its target copies and before/after hashes are immutable. Owned Python PIDs34076 and73968 stopped0. It includes the current driver/startup as well as authored helper, runner, tests and unchanged clean Config. The earlier35-case receipts remain historical targets; they do not bind the following37-case result.

| Final coverage target | SHA-256 |
| --- | --- |
| `Content/Python/shibuya_tools.py` | `fd3a1d944c22be556d523335bfb369e5837774a990cb30d59158d8268446b78f` |
| `tools/unreal/mcp_run.py` | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |
| `tools/unreal/test_mcp_run.py` | `d00e97da4d7100c7d20a3bd6918f00870900398e50cfb3f95ec68142815ffdff` |
| `tools/unreal/test_visual_controls.py` | `96205f4954f9b62c12cfe60979dda15b093deb8ebae269cefc012bf527ecd43e` |
| `tools/unreal/test_coverage.py` | `031c693cbfefa7db00108d123ba2158d33b410bfa4464b2c298340edd49bdb24` |
| `tools/unreal/test_coverage_driver.py` | `dc0040fe2b6c6f1974484274f36806832857af6c4afaf0ed296852e3b9c4f2d9` |
| Ignored native driver | `718900a284dcd87b87b99c3fb521443925a76bb42aabcbb78ba031026b55e6a2` |
| Ignored diagnostic startup | `c2b8e3789fef548acffec4042326960c1a36fbc52344e433d99aefd56464e405` |
| `Config/DefaultEngine.ini` | `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948` |

The actual native command was `& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\ThirdParty\Python3\Win64\python.exe' artifacts/unreal/visual-review-repairs/run_native_coverage.py`. Native receipt `coverage-gi-control-20261011-113725/report.json`, SHA `ca54a6b9e2076788c6790364cecbe5f71192a8c54dab00d9a8bcab69da518482`, binds current provisional integration receipt `artifacts/runtime-integration/boundary-provisional-20261011/prepared.json`, SHA `e821ab00a6e117beacea79241d53dc0eb366d0688f4f595e86baee5e1c3c1803`, current DLL213840f5 and clean Config. Actual native SM6/PCD3D_SM6, project-disabled ray tracing and live persistent capture GI/Lumen/SkyLighting/Lighting flags passed. Processed skylight remains initialized128×128 RHI with finite SH maximum9360. Source geometry, material bindings,112 actors, sun/exposure and all admitted code/config/source/map/Surface asset bytes stayed fixed. All25 roads and terrain reopened the shared admitted atlas. DefaultInput994b196f remained identical before, after and after shutdown; native startup cvar0/false and legacy default classes were observed twice. There was no game viewport or player input execution.

| View | Current-view mesh cards/cards | Mean/median luma | Black fraction | Fixed darkness predicate |
| --- | --- | --- | --- | --- |
| Crossing GI-on |111/653 |43.926/13.374 |0.4541 |failed |
| Crossing GI-off |not required |50.369/11.953 |0.5002 |failed control |
| Crossing west |111/653 |87.914/79.430 |0.0893 |passed |
| Southeast block |111/653 |28.158/10.017 |0.5699 |failed |
| Northwest block |111/653 |67.946/56.869 |0.0289 |passed |
| Southeast crop |109/648 |24.612/11.166 |0.5273 |failed |
| Northwest crop |107/640 |55.721/52.239 |0.2091 |passed |

All seven frames have112 SDF objects in current-view logs; GI-on counters now admit both distant crop views. This establishes a coverage mechanism effect, not complete component or per-surface card coverage. The maximum111 mesh cards is still below112 source meshes. All60/80-frame convergence predicates passed and the7500cm extent restored to observed2500cm after each final export. The whole fixed-six darkness gate fails. Crossing GI-on improves median/black fraction over GI-off but reduces mean and visibly introduces grainy, broad shadow edges. The coarser-SDF experiment has not improved the required appearance enough to adopt it as an unconditional default.

Every final image below was inspected separately at its native1280×720 size. Photo ground and source geometry are retained. Shadow-facing crossing frontages and the southeast block tower remain nearly black. Crop background outside the finite scene remains dark. Brighter west/north/opposite images do not close the original crossing criterion.

| PNG under `artifacts/unreal/coverage-gi-control-20261011-113725/` | SHA-256 |
| --- | --- |
| `crossing-gi-on.png` | `ee3d34667787ff00bef58f9269633af61ebf1d9fc8f2b2c6ded2b9a79bd48251` |
| `crossing-gi-off.png` | `519078689f1862c98fbf591d52f0055c0b45c8276ea53cccab5220f8184efafc` |
| `crossing-west.png` | `178d4973b3ac6752fc593f02c372c5310c4c35f3db9499b0af17c87ddc0ac019` |
| `block.png` | `e4398b7d947c01bad9528886c1298b84275fb7274a471cb88743e24f56c5aa0f` |
| `block-north.png` | `63dc248ac42e0514dcec019fab10207a9373c8d189ee2f9f3f66ef2492d671e6` |
| `crop.png` | `b049a1a215ed63fe3ab03f29fa8bad06b0d406a226d20d14a891aec16bf70ae4` |
| `crop-opposite.png` | `071e91b827921644f69424a9fa76a8c0a42a5c72e0ee603d72fc241c380c38bb` |

Owned editor PID73892 completed the deferred shutdown route with exit0. Its measured descendants conhost66416, zenserver68980 and crashpad75588 were cleaned; remaining census was empty and cleanup verified true. No engine/server was left running. This one clean run does not identify the earlier C0000005 root cause. The next bounded physical diagnosis should observe atmosphere sun flag/index, SkyAtmosphere configuration and actual Atmosphere/Sky drawing before changing camera exposure or ambient intensity. Ordinary game-view appearance and the original darkness/photorealism criterion remain open. Focused review of the final37-case freeze is pending.
