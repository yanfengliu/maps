# Independent runtime review 9 — boundary lifecycle and native gate

Authored 2026-10-11 by the independent Astra/xhigh reviewer. Verdict: changes required. Five P2 findings, R15–R19, block acceptance of this native runner as the milestone gate. R12–R14 are repaired in the reviewed source, within the evidence bounds below. No native gameplay, source-ground physics, input, appearance or performance acceptance is issued by this review.

## Exact scope and retained revision

The reviewed target is the first frozen 27-file runtime handoff from `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, based on `33d386299ff7bd02d91bca38f655f41597ddb756`. The orchestrator identified canonical integration base `e0d33fe`; this report does not approve arbitrary later canonical changes. Original inventory: `Artifacts/runtime-build/boundary-repair-prepared-20261011-105528/inventory.json`, SHA-256 `359590a080e7a9ce0fb58b01f5b1e3b50a800779960d277e3d7e37060a4e316f`. I preserved and independently rehashed all 27 exact authored files under canonical `tmp/review-runs/runtime-round9/target/`, with the original inventory beside them. All citations below refer to these frozen bytes even if the worker subsequently edits its live checkout.

Compared with the retained round-6 target, four files are added, eleven changed, and twelve byte-identical. I read the full added files, all changed functions and their callers/interfaces, the full new runner and its tests, the complete changed core tests and mutation driver, and relevant unchanged input, movement and native-instance code. Earlier review coverage carries forward only for files verified byte-identical. Native `XmlFile.h:20,49` and `InstancedStaticMeshComponent.h:338,388–397` were read outside any project diff: XML admission explicitly uses `ConstructFromBuffer`, instance samples request world transforms, and batch updates use the documented transform API. No old main implementation/cache was used.

The retained canonical `DefaultEngine.ini` is a separate integration input, SHA-256 `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948`, copied to `tmp/review-runs/runtime-round9/canonical-DefaultEngine.ini`. It preserves the SM6/DX12 selection, local MCP bind and renderer settings, adds the exact runtime GameMode, and omits the generated Android settings section. The isolated 1,254-byte DefaultEngine file is older and must not replace canonical wholesale. The frozen `.uproject` disables AndroidFileServer. The later admitted input auto-upgrade configuration is bound separately below; no further plugin disable is part of this verdict.

This was a read-only implementation review, with narrowly authorized snapshot/report writes. No engine, compiler, UBT, browser, network download, native gate, product unit test, or external review CLI was launched. Lightweight standard-library file hashing, JSON parsing and arithmetic were used. No implementation, index, existing review, plan or global configuration was changed. The branch-only owner override applies; old Vite gates and a main merge are not requirements of this assignment.

## Findings

### R15 — P2: the native runner does not confine its project root to the authorized real tree

Evidence: `tools/runtime/run_native.py:171–175` accepts `Path.absolute()` followed by lexical `is_relative_to(workspace / 'artifacts')`. `confined()` at lines 26–41 inspects the supplied root and its descendants, but never the root's ancestors. Rehash at line 231 also bypasses `confined()`, and the temporary deletion at lines 224–225 reuses paths without rechecking their boundary.

A concrete lexical witness is `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/../../outside`: its unnormalized Windows path reports that it is relative to the artifacts directory, yet filesystem traversal reaches `maps/outside`. `Path.absolute()` does not remove `..` from an already absolute path. Independently, a junction above the supplied root is invisible when `lstat()` is applied only to the final root and children. If that location contains a project, the runner can create evidence or an oversized probe and launch the engine outside the promised authorized directory. These are root-admission defects, not hypothetical concurrent file replacement.

Require a normalized, real authorized project root before any output or launch; inspect every existing ancestor for reparse points and fail on inspection errors. Use the same guarded boundary for subsequent file admission, rehash and temporary cleanup. Retain actual red controls for a parent junction and root traversal, plus a normal isolated-project green control. The existing relative-path unit cases do not cover either root case. The C++ helper likewise starts checking at `RuntimeFiles.cpp:29`; it must not be presented as protection against a pre-existing reparse ancestor above the project root.

Acceptance impact: blocks the runner's claimed project/output confinement. It does not invalidate the already reviewed source pipeline's separate R9 guard.

### R16 — P2: performance mode can certify ten seconds against the required thirty-second bound

Evidence: `tools/runtime/run_native.py:164` defaults `--benchmark-seconds` to 10; lines 173 and 195 accept and forward ten seconds for every phase. Lines 194 and 101–102 switch the population and require the performance field, but never require a thirty-second interval. `RuntimeProbe.cpp:276–282` scales its step/sample denominators to the supplied interval and likewise has no thirty-second minimum.

The ordinary `--phase performance` invocation can therefore pass with ten seconds of active rendering. This is a direct mismatch with the approved dedicated warm, unpaused 30-second 3,000-pedestrian/200-vehicle 1080p gate. A short functional arm is useful, but its duration must not define the performance acceptance bound.

Enforce at least 30 seconds for the performance phase and independently validate the recorded benchmark duration and actual step/frame interval. Keep shorter functional arms explicitly separate. An under-duration receipt or argument must go red before performance can be accepted.

Acceptance impact: blocks a performance certificate from this runner; it does not imply that the target has failed or passed a real thirty-second benchmark.

### R17 — P2: cross-arm identity omits the actual native scene and runtime assets

Evidence: the `before` inventory in `tools/runtime/run_native.py:180–182` includes source/config/project files, the runtime DLL and the runner. Prerequisite equality at lines 183–193 compares that inventory and runtime data input hashes. Final checks at lines 231–237 repeat implementation/data checks. None includes `Content/Maps/Shibuya.umap`, imported native static meshes/materials/textures, or the `/Game/Runtime/M_Agent*` assets actually loaded at `AgentGeometry.cpp:40–46`.

Changing the native city map, collision mesh, photo material or runtime material between a successful controls arm and the performance arm leaves the compared inventory identical. Rehashing source GLBs/manifests is insufficient because the native imported asset can change independently. A positive benchmark can consequently be attached to controls/support results from different native scene bytes.

Bind the actual loaded map and required native package set, including imported geometry/materials/photos and runtime materials, to each run with finite guarded pre/post digests. Record the native loaded/referenced set so equality is not merely an inventory of unrelated files. Require the same accepted set across prerequisite arms and the final run. Missing or changed native dependencies must fail, and the bounded evidence needs a real changed-native-asset red control.

Acceptance impact: blocks claims that controls, support, appearance provenance and performance concern the same native asset revision. The runtime source-input digest graph remains useful and is not itself rejected.

### R18 — P2: ownership begins after the engine has already started executing

Evidence: `tools/runtime/run_native.py:208` launches the engine without suspension; the Job assignment occurs at line 210. Job cleanup at lines 141–154 can enumerate and terminate only processes assigned to that Job. The assignment-failure fallback at line 212 also has no finite subprocess timeout.

A child created between process startup and `AssignProcessToJobObject` is not retroactively enrolled with its parent. That task-owned child can survive an otherwise empty Job, particularly after the engine root exits. The existing ownership receipt proves cleanup of its observed assigned process family; it does not close this launch gap. Thus `job_empty_verified` is not sufficient proof that every task-owned child was owned from birth.

Create the root suspended, assign it to the kill-on-close Job before it can execute, then resume it. Keep bounded cleanup for failure before assignment/resume as well as normal exit and timeout. Exercise an immediate-child/root-exit control and verify that the Job/cleanup owns the whole created family. Do not broadly terminate shared processes.

Acceptance impact: blocks the runner's all-owned-process cleanup claim. Its normal Job cleanup implementation and observed assigned-family proof remain valid within their narrower bounds.

### R19 — P2: the suppressed-input negative arm accepts startup failure as an input-control pass

Evidence: `tools/runtime/run_native.py:81–84` accepts a nonzero exit with `passed=false`, `negative_input_control=true`, and absent/false movement fields, then returns before checking stages, loaded population or source identity. `tests/runtime/test_runner.py:38–39` explicitly treats a report containing only run ID and those two booleans as sufficient. In the native probe, `RuntimeProbe.cpp:94` immediately finishes if the city exists but `Ready` is false; lines 155, 176, 195 and 283–304 produce precisely the required negative fields and nonzero exit.

A missing/invalid movement input or failed native geometry/material load can therefore make the disabled-input control green without reaching ordinary viewport input at all. Freshness and a unique run ID do not distinguish this did-not-run case from successful isolation of suppressed input.

Require the independent preconditions that should stay green when only injection is suppressed: successful ready-world/source admission, the complete intended stage sequence, actual population/simulation progress, and unchanged bound inputs/assets. Keep the expected input movement predicates red. A fresh real startup/source-failure receipt must be rejected by this arm, while a ready simulation with deliberately disabled injection must satisfy it. Do not derive success from absent fields.

Acceptance impact: blocks use of this negative arm as evidence that the native input instrument detects disabled controls.

## Prior finding dispositions

R12, report persistence: repaired in source. `RuntimeProbe.cpp:44–64` confines/prepares the destination and removes a prior receipt before the run; lines 288–304 check serialization/save, force failure on persistence error, remove a partial output where possible, print FAIL and exit nonzero. The runner's report-write arm demands nonzero exit, no remaining receipt and no PASS marker. The five runner units include the relevant false-success cases. An actual native injected-write-failure receipt on the new compiled revision is still required; a unit test of the verdict function is not that receipt.

R13, allocation/read bound: repaired in source. `RuntimeFiles.cpp:34–48` checks stat size before opening/allocating, validates the opened size against the admitted size, allocates at most 32 MiB, reads that fixed amount and rejects errors/size changes. `RuntimeReadLimit.h:8–13` supplies the finite whole-file bound. `ShibuyaWorld.cpp:137–145` checks a manifest's declared size before reading, and `InputsUnchanged():289–301` uses the same guarded reader with the previously recorded size before rehashing. The actual-core oversize mutation goes red. Its native sparse-file arm remains pending. This does not claim resistance to adversarial concurrent component swaps or repair the root-ancestor issue in R15.

R14, noncoincident closed seam: repaired. Both `ShibuyaWorld.cpp:220–221` and `CitySimulation.h:109–110` reject gaps greater than 1e-6 metres; no implicit 5 cm connector is invented. The fixture tests the former 4 cm defect in both point-order directions (`test_simulation.cpp:117–122`), and reintroducing the old tolerance actually fails it. The reviewed source's closed routes are exactly coincident; the new single open route uses explicit boundary lifecycle instead of closed wrapping.

Earlier R3/R5/R6 motion repairs still have actual-core mutation evidence; R4 has a real viewport-injection path prepared, including elevated walk refusal, descent and horizontally displaced recovered walking. They are not native gameplay approvals.

## Boundary admission and lifecycle coverage

`BoundaryAdmission.h:36–142` is fully read. Open boundary flow must be a vehicle route, carry the actual bound source-manifest digest, match the base crop and coordinate frame, and have unit horizontal endpoint headings aligned to its directed end segments. ENU/WGS84 endpoints are cross-checked; each lies within the approved 20 m boundary neighborhood, points inward/outward as appropriate and declares its lifecycle direction. Original OSM XML is parsed from already admitted bytes, never by following a path from inside XML. Its way and ordered node chain, actual coordinates, consistent adjacency, one-way direction, inside/outside crop membership and segment/crop-plane intersection are checked. Duplicate boundary support records fail.

The two endpoint support files are bound to the movement receipt, with exact size/digest admission and four longitudinal by three lateral PLATEAU samples checked for point, orientation, width, height and barycentric plausibility. This runtime helper does not itself decode the GLB triangle and recompute its barycentric height. That source-ground witness was independently verified in source review 7; accepting it here relies on the exact bound source/support bytes, not on `verified=true` alone. Whole-route legal-turn/access/conditional admission likewise belongs to the reviewed source pipeline; runtime XML revalidation is specifically of the endpoint continuation, not a second general road-routing engine.

`CitySimulation.h:265–275` gives an open route's last car no wrapped leader. Ordinary motion clamps at the actual exit. Lines 355–378 then retain the outgoing generation at that supported endpoint while the entry is occupied by a vehicle or pedestrian; only a free admitted entry starts the replacement generation. Generation increments, event storage, zero replacement travel, stopped entry speed and seeded replacement parameters are explicit. Population slots remain constant, and pause/reset clear or preserve lifecycle state as specified. The retained core fixtures cover occupied vehicle entry, pedestrian occupancy, eventual restart, real displacement versus travel, determinism, pause and reset; their ENTRY and TRAVEL mutations went red.

Native snapshots record before/after actual body transforms and generation identities (`ShibuyaWorld.cpp:308–338`), plus bounded core/native event records. The displacement predicate excludes vehicles whose generation differs across the benchmark (`RuntimeProbe.cpp:210–220`), preventing a source-boundary lifecycle replacement from counting as motion. Native event enforcement is optional when `--minimum-boundary-events` is zero; a lifecycle acceptance run must deliberately demand events and inspect the recorded actual positions against the bound source entry/exit and per-frame movement allowance. No actual native boundary event is approved by this static review.

The final accepted source identities rehashed for this review are movement network `0575c220ad42b889600cb47840d3d04300a454b884c4e2428dc84f664304cbfc` and movement manifest `7c24389ecf95278d0e9ae521a0a0d01285d64adf764b23b66ef4cf3eff5c49ea`; source manifest `c33926aa35a3a6d08b764cac8bd935a060dfbd0830a94f7d7c6ad854f7c82ee8` is the accepted source-review binding. There are 18 legal closed car routes and one reviewed open boundary flow; the prior no-central-cycle graph proof is not evidence for a fabricated loop. Actual runtime consumption of these exact final bytes remains a native-gate requirement.

## Rendering, input, physics and measurement bounds

The vehicle pose consumes route grade and measured cross-slope; wheels/spokes share that pose. Actual ISMC counts and transforms are read back, and the native mesh bounding boxes are inspected, including a conservative all-wheel-angle envelope (`AgentGeometry.cpp:133–200`). This envelope is measured in the pitched/rolled body frame, not a universal horizontal 4.4-by-1.8 m projection. A lightweight independent read of all 9,175 vehicle support sections, with their receipt digests checked, found maximum cross-slope 0.1280941763 at vehicle-loop-11 sample 49. The corresponding body-only horizontal half-width is about 1.00513 m, below the core's 1.05 m clearance. This arithmetic is a useful bound, not a native rendered collision test or a proof for arbitrary admissible future support data.

Gait/wheel checks compare actual part rotations relative to the actual body rotation, so whole-body heading/grade changes alone do not satisfy animation. They sample the first three native instances per part; they do not prove every pedestrian's gait or every car's wheels. Counts and world transforms cover the whole population. Motion requires more than ten percent of each population to show over 10 cm endpoint displacement; this is explicitly not proof that every agent remains live.

`PhysicsSnapshot():203–239` traces the actual rendered shoe bounds, pitched/rolled car front/back/corners, and tyre contacts. It requires every expected trace and a <=20 cm gap with normal Z>=0.7, records failures, samples through the functional motion interval and checks final contacts. The benchmark deliberately excludes these heavy repeated traces. These are discrete native visibility-query checks, not swept continuous vehicle support, full collision dynamics, or an analytical proof of lateral surface interpolation. Native scene support is still unverified until those real checks run and are read.

The input harness calls `UGameViewportClient::InputKey/InputAxis` using normal simulated viewport events (`RuntimeProbe.cpp:66–79`). It does not call pawn movement/toggle handlers or set camera state to satisfy the flow. The normal pawn binds configured axes/actions (`ShibuyaWorld.cpp:409–422`); walking queries actual imported scene collision; flight uses the pawn movement component. Unsupported flight-to-walk remains visibly refused, and recovery now additionally demands horizontal motion after descent. R19 explains the remaining independence flaw in the external negative verdict.

The native performance calculation checks hardware D3D rather than software renderer, actual 1920x1080 viewport, actual 3000/200 counts, unpaused fixed-step progress, frame/GPU sample denominators and p95 thresholds. Memory is whole-process physical/peak memory, not GPU allocation. The renderer-resource inspector is unchanged from round 6; it is read-only diagnostic evidence, not a city/controls/performance pass. R16 and R17 prevent the current runner from certifying the required duration and same native assets.

The parent independently observed that UE's enabled EnhancedInput editor plugin upgraded and rewrote canonical input defaults. The frozen authored DefaultInput remains `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015`. This review does not label the rewritten defaults equivalent, does not assume the later configuration has taken effect natively, and does not claim native input-source identity until the final gate verifies the actual class and unchanged input configuration. The parent owns native verification of that separately bound repair.

## Existing evidence actually inspected

The core receipt `Artifacts/runtime-core/20261011-104629/report.json` is 464 bytes, SHA `e12a73df7201f90b96c193f340f165ad70e1a269c8c544580c2ae98034c93dd4`; its stdout is 301 bytes, SHA `3cc683e3e1e996e33ee2e528aea8a069f28c2862187b0f698b09d4b8439a53d8`, and says `PASS: 5741 actual-core assertions`. Receipt test/core hashes match the frozen inventory. This is compiled actual core on synthetic routes, not native gameplay or real-source support.

The actual seven-case mutation receipt `Artifacts/runtime-mutations/20261011-104834/report.json` is 2,838 bytes, SHA `73a92b4dd0bcccf3243bc38bb1f035b6dfd6e28e87222aff3817a40869b01df6`. I read each retained gate log and its specific FAIL assertion. The driver changes exactly one selected production mechanism in ignored copies, runs the same core tests, requires a nonzero exit and the named assertion, and rehashes unchanged production source. The red evidence is:

| Mutation | Actual red assertion | Gate-log SHA-256 |
| --- | --- | --- |
| R3 | both directions remain in closed route domain | `babfb65a31b55b8884f32dfb93b97e91691330e5ef7ce3d8af3339e78a27c155` |
| R5 | nonzero lateral right-angle trajectory is continuous | `ac64c83332760f4c9812f82088e0fa776e1226bc20ee93d52e746adf986b688d` |
| R6 | vehicles actually pass in adjacent opposing lanes | `e309548fb634eca57a4f72ce415cf87dc74ea6165f2ca8243256208ede90073d` |
| R14 | nonzero closed seam rejects former 0.04m gap in both directions | `0150b6582a2265ed44882e4b253d3ee283f4cefc9ee01baf1dab176ec84d1fde` |
| BOUNDARY_ENTRY | occupied entry keeps terminal generation at supported exit | `ecb2ecf19cd641c95ce506363a581ca183d538aada74ea86d3d6b264687c193d` |
| BOUNDARY_TRAVEL | boundary lifecycle jump contributes no travel | `dfc4c4f4a5fc424644fdb8fb7d67c6deacf722cc5b542a78bb938ddddbb4a641` |
| R13 | bounded input size rejects oversize before allocation | `ea128664280c7bb02f1c81f0cacd56ba8002f34dc4173134232fee8042469494` |

The five runner-unit log is 758 bytes, SHA `0434dd7033ba73f7df18a35c7388936e7c24d7fd43aa973c6c347b3600604c0d`, from 0.049 seconds of verdict/path/sparse-file checks. It proves no engine ran. Its sparse receipt file genuinely exceeds 32 MiB and is rejected before reading. Its relative-path class is useful but omits R15; its negative-input expectation contains R19.

The actual hidden Python ownership receipt `Artifacts/runtime-runner-ownership/20261011-104215/report.json` is 358 bytes, SHA `badb5309b05b226a7520444e068f0e7ca8e2db548a162d7dac93c37f564df8e7`. It observed and terminated owned PIDs 65660, 68748 and 8188 in the Job, with root exit 1. This is meaningful assigned-family cleanup evidence, not a native engine run and not the suspended-launch control required by R18.

No new native compile receipt or native gameplay receipt is accepted in this report. A successful Editor/Game build alone will prove compilation/linking, not controls, supported motion, retained population, continuous physics or performance. The final integrated revision still needs the positive ordinary-input flow, an independent suppressed-input red, actual report-write and oversized-input negatives, required boundary lifecycle events, same map/assets/data/config/module identities, and the separate thirty-second full-population native benchmark. Failed or unavailable checks must remain explicit.

## Frozen authored inventory

All paths in the following table are relative to the isolated runtime project and retained exactly under canonical `tmp/review-runs/runtime-round9/target/`. Standard Windows CRLF bytes are intentional and included in each digest.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `Config/DefaultEngine.ini` | 1254 | `05b98074db37680b799cf5f5be180c90d397ea154c7c22e5af163ba3c98ad417` |
| `Config/DefaultInput.ini` | 1273 | `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015` |
| `ShibuyaUnreal.uproject` | 706 | `f6eb752942dab805d542f9c7df06ab8ab44be44f76106ebea9f6115e9b36129d` |
| `Source/ShibuyaRuntime/Private/AgentGeometry.cpp` | 18482 | `0f97a8528b7e2f2320180c20d2f498d80df205e6d82dae00968b9971a55c2440` |
| `Source/ShibuyaRuntime/Private/BoundaryAdmission.h` | 14273 | `93dd5a0b54d9cadf46933ced449f20e1711da8035d3d2e4f1f7ae8af1d1512fe` |
| `Source/ShibuyaRuntime/Private/RuntimeFiles.cpp` | 2814 | `9583c0df4b1ee42eb031c35ee4b84435fa484b1248bed144b314261b7cc61160` |
| `Source/ShibuyaRuntime/Private/RuntimeProbe.cpp` | 23770 | `9421df862d563f31bb44f3879fabd97c019c39dab14f2f58d95eb66163c5870d` |
| `Source/ShibuyaRuntime/Private/ShibuyaRendererLibrary.cpp` | 7310 | `c7af870a333d3bbb7a1e7fbbcef8fbe583b2598e129a73685e5d31c67f41f6ff` |
| `Source/ShibuyaRuntime/Private/ShibuyaRuntime.cpp` | 125 | `77b565024ebf1379d8125b36a90ec87fb497e737c6a336254cb2b13d711661d2` |
| `Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp` | 35701 | `519e87dda255ce0c1ed35cada662ba333b5828be0949cbd2ba7d098653bdd0fd` |
| `Source/ShibuyaRuntime/Public/CitySimulation.h` | 25363 | `911aa43773ff897f5c365a8638b841bcc89972e912cc774268da1a29f1b04359` |
| `Source/ShibuyaRuntime/Public/RuntimeFiles.h` | 607 | `21f189cf0d298ce7010d634439e20ff6ac83ba958d1adc117f9ef8c6acc0b409` |
| `Source/ShibuyaRuntime/Public/RuntimePath.h` | 1279 | `94649128bf8f305498eeae5e60eafa7868b920492a0c9f2a0e9f65c51a6ecd2c` |
| `Source/ShibuyaRuntime/Public/RuntimeReadLimit.h` | 533 | `8b41ff12f62c3e754889e59a2103ee963854ee3074f2cc5c6037ef8cf5dcd007` |
| `Source/ShibuyaRuntime/Public/ShibuyaRendererLibrary.h` | 476 | `4ade754d4f15c0bb4ee4e3363e99bb38da8e56bb3eb14e1e1889f209af5957ee` |
| `Source/ShibuyaRuntime/Public/ShibuyaWorld.h` | 4637 | `fffa42ef3c4ac5cf5b234d2dfa6f8eb08686c6b17a753fdc6d7ad57e9b9e3c3c` |
| `Source/ShibuyaRuntime/ShibuyaRuntime.Build.cs` | 414 | `65a962e873ec7305f91296ee5777c2f7ee8255319ec4d8a4018c51054ec8d4e3` |
| `Source/ShibuyaUnreal.Target.cs` | 355 | `15d8f100b917028603c38c7a2a30936c56394fbe4853114889e1c3c5d0f655cc` |
| `Source/ShibuyaUnrealEditor.Target.cs` | 369 | `09cc25db48b7476683610ff4dc67f6ad567a3801138ce2ed1235708c7602441c` |
| `tests/runtime/test_runner.py` | 3163 | `ac9b8c31a875e8811f9e426628bfc2f9be70bdb3be0b2ee2ed6c1ecd1c7d9dc1` |
| `tests/runtime/test_simulation.cpp` | 19447 | `b3db515db6de92c95464b7bf3cf80a78d897bbb2fe540d05756fd6ca8b876d0e` |
| `tools/runtime/build_native.py` | 5943 | `69fc775869afa498483651df75e3ba9691229a17e346ddcf7f5b1cc03f93de04` |
| `tools/runtime/prepare_assets.py` | 3424 | `d8377d9f1fb4eff15e3ed0e4d8c10aa9e0b76b41133652f4782547e71481e1a4` |
| `tools/runtime/prove_core_regressions.py` | 4789 | `7f6f684bf8eb2a17c3a7f694ab25614301f4aff41c522a58c24c2e69a53f92c9` |
| `tools/runtime/prove_sdk.py` | 4470 | `f1aadff3062638e0346727662e2e278d474ae35d684df0be3129788bda877dd1` |
| `tools/runtime/run_native.py` | 18166 | `d60ca450d0cc39dd5762cf702d5c06c8c0e3e4b8016165b2d8068ece081ee8f7` |
| `tools/runtime/test_core.ps1` | 3700 | `c31dcb19b6ab44cf64115af2d150f83a648a03e154ea2155be73775bfa3ce381` |

Final retention check at 2026-10-11T18:10:07.7500183Z verified all 27 retained files against the original inventory. At that check all 27 live worker files still matched the reviewed first freeze. The source/config integration and the late input configuration below must be bound separately. Reviewer commands all exited; no reviewer-owned engine, GUI, browser, server or persistent process was launched or left running. The snapshot and this authored report are intentionally retained evidence.


## Late admitted input configuration delta

After the first 27-file review was complete, the parent authorized the narrow `Config/DefaultEditor.ini` addition containing `[ConsoleVariables]` and `EnhancedInput.bEnableAutoUpgrade=False`. I read the actual 58-byte CRLF file and hashed it as `9141f6ae31db1b130a37273eef06cffe335fbf79409aa411519df55674489b7d`. It is additional to the original inventory, not silently substituted for any reviewed file. There is no new EnhancedInput plugin disable: the parent identified native plugin dependency requirements and selected the CVar opt-out instead.

Independent primary-source reads support this placement: installed `Engine/Source/Runtime/Core/Private/Misc/ConfigCacheIni.cpp:6973–6975` applies `[ConsoleVariables]` from `GEditorIni`; `Engine/Source/Runtime/Launch/Private/LaunchEngineLoop.cpp:2876–2879` calls this load during initialization; `Engine/Source/Runtime/Core/Private/HAL/ConsoleManager.cpp:3328–3338` carries an INI-created non-cheat variable's value into later registration. Installed `Engine/Plugins/EnhancedInput/Source/InputEditor/Private/EnhancedInputEditorModule.cpp:49–54` registers the named opt-out with `ECVF_Default`; its MainFrame callback calls the upgrade at line 309 and the method returns when the value is false at lines 333–337. That module file SHA is `2c48b653f5fef9d1cb52f4dd8e21160a2e55044fabd23a936fa0f8c95259f83b`.

No material static issue found in this exact two-line delta. It still requires a fresh native startup observation of the actual CVar value, legacy input classes and unchanged authored DefaultInput digest, as the parent specified. These reads are not proof of runtime initialization order on the final launch. R15–R19 and all pending native gates remain open.
