# Runtime focused review, round 6

Independent authored review, 2026-10-11, by the assigned Astra/xhigh reviewer. Target: `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, branch `codex/unreal-runtime-next`, base `33d386299ff7bd02d91bca38f655f41597ddb756`. The full authored target consists of the 23 files below, not the provisional canonical integration. The instruction and branch exception keep this experiment off main. This review does not invoke the inherited Vite gates.

## Verdict

The original R3–R6 mechanisms have been repaired in the reviewed implementation, with the exact bounds below. Three material P2 findings remain: R12 can report a successful native check after its report failed to save; R13 enforces its input size limit only after loading the whole file and omits that limit on revalidation; R14 accepts a noncoincident closed seam that the new physical movement limiter cannot traverse. Root accepted all three findings and their scoped repairs during this review. They remain open in this frozen target. No runtime milestone acceptance is granted until the repairs are checked and reviewed.

The actual receipts establish native Editor/Game compilation and a standalone deterministic core test, including three controlled regression failures. They establish no native city controls, collision, animation appearance, GI execution, or 60 fps result. Those checks have not run for this target. The forthcoming source movement revision and an approved entry/exit flow contract are outside this frozen closed-loop implementation and need their own integration checks. The old source movement digests are not acceptance inputs for the next milestone.

## Review target, retention and evidence

The live and retained `Artifacts/runtime-build/repaired-handoff.json` both hash to `b517e0d0faab12f22be78fa2eff57e21079a9c75d6d43cfbaaadbecc7787d98c`. I copied all 23 authored files without changing their bytes into `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tmp/review-runs/runtime-round6/target/`, and copied the handoff beside that directory. Every live file and retained copy matched its declared SHA-256 and byte count at initial retention and again at `2026-10-11T17:06:58.9808938Z`. No reviewed implementation file changed while I read it. CRLF bytes were preserved. The original 16-file target and round 3 inventory remain under `tmp/review-runs/runtime-round3/`.

I read the complete authored C++ module, public headers, targets, input configuration, project file, runtime asset preparation, build/core/mutation/SDK tools, tests and the relevant prior review. The unchanged engine configuration was hash-bound; this review does not reproduce generated Android configuration values. I reviewed the loader, input path, simulation, native instance instrumentation, probe and render inspector in full rather than only their patch hunks. The seven added files and nine changed files relative to round 3 are identified in the inventory; seven files are unchanged.

Primary installed-engine source read outside any authored diff included `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Engine/Classes/Components/SkyLightComponent.h:308` (processed cubemap getter) and `:309` (irradiance getter), `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Engine/Public/UnrealClient.h:321` (raw GPU timing array), and `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Engine/Public/DistanceFieldAtlas.h:251` and `:287` (asynchronous build state and validity). These reads checked the read-only renderer observation and timing APIs against the installed UE 5.8 implementation, rather than treating a successful C++ compile as behavioral proof.

| Receipt, relative to the isolated target | SHA-256 | Observed bound |
| --- | --- | --- |
| Artifacts/runtime-build/20261011-094517/report.json | `3514d309fa10a6babe18e2a4dfdcca2519178484f1e564a26026e151f3057517` | Actual Editor and Game Win64 Development build/link exit 0; declared source hashes match this inventory; source unchanged during build. |
| Artifacts/runtime-core/20261011-095255/report.json | `eb46e8e1d2cfb291695db23a772df606ddc0edec1e8c416fb0c28a1ab36994b1` | Actual standalone core stdout reports 4,761 assertions; core and test hashes match this target. |
| Artifacts/runtime-mutations/20261011-094721/report.json | `901b333d33e7b83241514855211fbda23a90a19b673203d4424c26eddb12866e` | Restoring the old negative wrap, constant lateral corner offset and vehicle disc each produced exit 1 at its expected substantive assertion. |
| Artifacts/runtime-sdk-witness/20261011-094933/report.json | `a1e7611c53dd9e57d54d1e1b8ed51fd546a3a7748a2f8e5f6dc5d92b2cef207f` | Actual reviewed portable SDK header inclusion and AMD64 import library linkage; no installer, CLR function call or Unreal launch. |

I read the actual receipt files, including the core stdout and mutation failures. The Editor DLL hashes to `35b0de6a622c7373a64e18336707a3d76980c22ae0b2c052e63e9d11b82f1497`; the Game executable hashes to `2bfba36fc0932813f32445599f16bffd2368106f48f0b1b5cb4febf4af4fa616`. These were independently checked against the build receipt. The portable SDK witness uses manifest `1594b360c1058cd75ba0579e052a959ccdbdd44803794d9ec33d41f6443ec240`, actual `mscoree.h` hash `f4412abb1067c53f1061f7dd7177b4e91247ed60172ee1cd2f29b93e0c2bfd09` and AMD64 `mscoree.lib` hash `88b25db9921d88be9682d144ebc9a340680ffca03c01a2b70ec6d3f0529f56ca`. The correctly labeled witness concerns Microsoft 4.6.2 payload bytes; it is not an assertion that a 4.8 SDK was installed globally.

## Original finding dispositions

| Finding | Disposition for this target | Evidence and remaining bound |
| --- | --- | --- |
| R3: reverse closed-route pedestrians stop at the seam while travelled grows | Original mechanism repaired. | `Source/ShibuyaRuntime/Public/CitySimulation.h:263` normalizes both signs into the route domain; actual displacement is accumulated at `:315`. `tests/runtime/test_simulation.cpp:62–77` exercises both directions and two lateral offsets, checking position, actual displacement, route domain and travelled distance. The negative-wrap mutation went red. General acceptance of a noncoincident seam remains blocked by R14. |
| R4: fly elevated, then walk, leaves the pawn permanently suspended and unable to move | Original state transition repaired in code; native input behavior remains unverified. | `Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp:367–387` checks real ground before allowing the mode change, retains flight when unsupported, and records a descent instruction displayed by the HUD at `:448–450`. The ordinary Tab handler invokes this path. The planned native probe uses Tab, E/Q and W through the viewport input APIs. It has not run. |
| R5: lateral route offsets teleport across corners/seams | Original corner discontinuity repaired for coincident closures. | `Source/ShibuyaRuntime/Public/CitySimulation.h:129–156` tapers lateral offsets continuously into turns and interpolates supported lateral heights; `:279–287` limits actual spatial motion. Tests at `tests/runtime/test_simulation.cpp:135–148` check corner position continuity, slope, collinear behavior, physical step limits and actual traversal. Restoring constant offsets went red. R14 identifies the residual accepted nonzero closure gap. |
| R6: opposing vehicles on adjacent lanes deadlock because 2.25 m discs overlap | Original geometry mismatch repaired within tested layouts. | `Source/ShibuyaRuntime/Public/CitySimulation.h:28–56` uses heading-aware padded vehicle rectangles and pedestrian circles. The independent render-dimension checks and 3 m/3.5 m opposing-lane runs at `tests/runtime/test_simulation.cpp:149–157` require both vehicles to pass after real steps. Reintroducing the old 4.5 m disc rule went red. This does not establish global liveness on the future full source network. |

## R12 — P2: report persistence failure still exits successfully

Location: [RuntimeProbe.cpp:230](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Private/RuntimeProbe.cpp:230), specifically lines 230–234.

The probe serializes its result and calls `FFileHelper::SaveStringToFile`. A false return only logs an error at line 232. The code then logs `SHIBUYA_RUNTIME_CHECK PASS` and requests exit status 0 whenever the previously calculated checks passed. A confined, ordinary report file that is read-only, or a full destination volume, therefore allows a successful process result with no new valid receipt. An existing report can also remain available to a consumer. Directory creation and JSON serialization results are not incorporated into the final result either.

This is material to the gate's passed-versus-did-not-run boundary. A bounded native test is not successful when its required evidence could not be persisted. Make directory preparation, serialization and the final write checked operations; on failure force a failed terminal status, and prevent any prior report from being treated as this run's artifact. A finite read-only-output or controlled write-failure negative case should establish the failure path. This finding is from direct static control-flow inspection; I did not run the native process or mutate its destination during this review.

## R13 — P2: input size admission happens after allocation

Locations: [ShibuyaWorld.cpp:32](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp:32), lines 32–40, and [ShibuyaWorld.cpp:271](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp:271), lines 271–275.

`ReadBoundInput` first calls `FFileHelper::LoadFileToArray` and only then checks `Bytes.Num() > 32*1024*1024`. A wrong or oversized but lexically confined ordinary input can therefore allocate and read hundreds of megabytes or more before the stated 32 MiB rejection occurs. `InputsUnchanged` loads every bound file again with no size guard at all, so replacing a file between initial admission and end-of-probe verification also bypasses the intended finite read boundary. SHA mismatch after the read does not protect the allocation.

Check file size before allocating, then perform a bounded read that cannot grow beyond the admitted limit if bytes change after the size check. Apply the same guard to final revalidation. Keep the existing confinement and digest checks. This affects malformed/mistaken or replaced local inputs, not a claim that the current small source JSON files already exceed the limit. No large allocation or oversized-file test was run during the lease.

## R14 — P2: an admitted noncoincident closure can strand agents

Locations: [CitySimulation.h:102](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Public/CitySimulation.h:102), [CitySimulation.h:263](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Public/CitySimulation.h:263), and [CitySimulation.h:279](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Source/ShibuyaRuntime/Public/CitySimulation.h:279).

Preparation permits a closed route whose last point is up to 5 cm from its first point. Wrapping jumps directly from the last position to the first, while the repaired movement integrator rejects any candidate whose spatial displacement exceeds the agent's allowed fixed step. For a pedestrian route at 1.35 m/s, even the largest 1.15 speed scale only permits 2.5875 cm per 1/60 s step. An admitted 4 cm seam gap cannot be crossed. The binary search approaches the seam and repeatedly refuses to traverse it, recreating a liveness failure while the exact-closure tests pass.

A concrete static witness is the existing densely sampled radius-100 m circle centered at (0, 150), with 400 segments and first point (100, 150, 0), changed only so its last point is (100.04, 150, 0). Its final segment remains about 1.57 m, within the 2.05 m segment limit; its closure gap is 0.04 m, within the accepted 0.05 m. With zero lateral offset, positions on opposite sides of this seam retain about 4 cm separation. A pedestrian allowed at most 2.5875 cm cannot cross in either direction. This is a code/mathematical witness, not a newly executed test result.

Reject noncoincident endpoints within an appropriately tight numeric tolerance unless the source explicitly supplies a supported closing segment. Root accepted a `1e-6` metre closure admission threshold, which does not invent support or alter the current exactly closed source loops. Add a regression with a nonzero gap inside the old 5 cm tolerance, covering rejection or genuinely continuous supported traversal for both signs. The current frozen source vehicle cycles were exactly closed, so this finding does not claim that those particular source bytes exhibit the defect.

## Reviewed behavior and evidence limits

### Source, support and path admission

`ShibuyaWorld.cpp:125–168` binds the actual movement JSON to the manifest's path, length and SHA-256, validates the version/frame/origin contract, and loads the source manifest and its declared source files through the same confinement and hash path. Per-route support files are actually read and SHA-checked. `:181–225` checks sample counts, route point/centre agreement, incoming tangent cross sections, offsets and supported providers. This repairs the earlier acceptance of unverified support booleans and hash-shaped strings. It does not turn discrete three-point cross sections into an analytic proof of the continuous surface or every lateral corner trajectory. The source review and native support checks retain their separate bounds.

`RuntimePath.h` rejects absolute paths, separators inconsistent with the schema, colons, empty/dot segments, Windows device names, trailing dot/space and invalid/control characters. `RuntimeFiles.cpp` uses `GetFileAttributesW` on the project root and each admitted component and rejects reparse points, directory leaves and unsuitable intermediate components. Report paths are checked before and after making directories. This is materially stronger than lexical confinement; existing project-root trust and check/read race limits remain. The current tests establish the lexical cases; this review did not execute a fresh junction mutation. R13 remains the finite-size defect.

The loader converts declared local east/north/up metres into native centimetres at the engine boundary, with the pinned crossing origin. Native report inputs are rehashed at finish, subject to R13. Final integration must bind the new source movement and manifests; the revised runtime cannot inherit approval from obsolete route receipts.

### Signals, fixed-step motion and collision scope

The fixed-step accumulator advances deterministic seeded state. Direction-specific stop lines are checked against agent travel direction at `CitySimulation.h:206–218`. Open pedestrian endpoints hold re-entry for the matching red direction while permitting an agent already inside to finish clearing; the explicit tests at `tests/runtime/test_simulation.cpp:162–179` cover both signs and inside clearance. Optional source stop direction defaults to +1, and the loader accepts only ±1. A bidirectional crossing therefore needs the relevant direction-specific entry records in the actual source data; a default +1 record alone does not prove the reverse entry is signaled.

Heading-aware rectangles, actual displacement accounting, lateral taper and height interpolation resolve the reported local failures. Neither the tests nor a compile prove no congestion/deadlock anywhere with 3,200 agents on the final network. The existing runtime still requires closed vehicle routes at `CitySimulation.h:104–105`; the newly approved source boundary entry/exit lifecycle has not been implemented in this target and is not implicitly reviewed here.

### Ordinary controls and native probe independence

The ordinary configured keyboard/mouse bindings reach the controller and pawn handlers; walking checks the native scene surface and uses swept movement, while flight uses normal pawn movement. Unsupported flight-to-walk mode changes visibly refuse and retain the usable flight controls. This avoids the former permanent frozen walk mode without pretending `UFloatingPawnMovement` supplies gravity.

`RuntimeProbe.cpp:47–60` injects through `UGameViewportClient::InputKey` and `InputAxis`; it does not assign pawn transforms to simulate the tested actions. Its suppressed-input control disables those injections rather than repairing state. The stages exercise walking, look, fly/up, unsupported Tab refusal, descend, Tab/walk, pause/resume and reset. The suppressed-input run must actually go red before native controls are accepted. The recovery predicate at `:164` checks recovered walking mode and descent but does not independently require new post-descent horizontal movement; the native flow should inspect that movement explicitly when accepting R4. Initial walking displacement alone is not proof of successful recovered walking.

The final support check at `:199–213` traces all agent positions at the end of the run and checks footprint separation then. Its generous ground-height tolerance and end-only sampling do not prove continuous native collision/support over every intermediate step. The simulation's source-based movement and collision checks are distinct from native physics. No native controls/collision result exists in the evidence reviewed here.

### Native instances, animation and performance instrument

`AgentGeometry.cpp:125–158` reads actual `UInstancedStaticMeshComponent` counts and transforms, checks finite transforms, and reports full pedestrian/vehicle body positions plus sampled part transforms. The benchmark compares start/end native body positions in `RuntimeProbe.cpp:178–196`; it no longer uses simulated travelled counters as its sole movement measurement. Expected totals cover ten parts per pedestrian and fourteen per vehicle. Gait rotates visible arms/legs using travelled distance and speed; wheels now include asymmetric face bars so spin can be observed. These facts are code behavior, not inspected animation pixels.

The movement pass threshold is greater than 10% of each population moving more than 10 cm during the interval. It proves that threshold, not movement of every individual. The current probe does not require changed limb/wheel rotations for a declared population; sampled transforms are evidence for further inspection. Actual counts do not prove visible geometry, material compilation or acceptable animation appearance. The unchanged asset preparation tool checks its saved material result and edits only its named runtime assets; no destructive city rebuild was introduced in that tool.

The benchmark follows control exercises and a further warm interval, takes samples only during its active unpaused phase, defaults to 30 seconds, checks simulation-step growth, and gates the dedicated performance field on actual 3,000/200 populations, actual native counts, 1920x1080 viewport, hardware D3D, adequate frame/GPU sample coverage and p95 frame/GPU time at most 16.667 ms (`RuntimeProbe.cpp:220–227`). `performance_target_passed` is intentionally separate from overall `passed` at line 228; consumers must check both when claiming the 60 fps milestone. Process physical and peak physical memory are recorded, not whole-GPU allocation. Neither field has an observed green native receipt yet. Timing is a headless game-render throughput bound, not display presentation latency or broad hardware portability.

### Read-only rendering inspector and owned processes

`ShibuyaRendererLibrary.cpp:18–93` reads existing sky processed cubemap/RHI state and nine irradiance coefficients, source-tagged mesh distance-field/card state, existing scene capture show flags and main viewport flags when that viewport exists. It does not change materials, light exposure, CVars, camera placement, assets, capture persistence, or allocate a view state through `GetViewState`. `FlushRenderingCommands` synchronizes observation; it is not a GI rendering proof. The inspector distinguishes missing state from present false state where appropriate. SDF/cards/SH data being available is not proof that Lumen or every intended capture consumed them. Observing shader/build readiness and persistence belongs to the native gate, separately from this code review. The parent's current use of this helper in a visual diagnostic does not establish game input or performance acceptance.

The reviewed build, core, mutation and SDK helpers use finite operation deadlines, identify owned child processes, and clean their own process trees in `finally` paths; they do not broadly kill shared editors/browsers or run an installer. The child build environment alone receives the portable SDK root. Their post-timeout cleanup depends on OS process termination completing; some cleanup waits themselves are not separately bounded. The retained worker process census reported no owned native process remaining. I launched only short read/hash/report-writing commands, no persistent engine, browser, server or compiler process. The intentionally retained snapshots and receipts remain needed for repairs and integration, so they were not deleted.

## Exact authored inventory and diff from round 3

The inventory below is the reviewed isolated target. Seven files were added, nine changed and seven unchanged relative to the retained round 3 target. The canonical integration has a different engine INI by design: root copied the single `GlobalDefaultGameMode` setting into its already cleaned INI instead of copying generated Android settings. Root reported canonical INI SHA-256 `856f465491cdd342a89fa9f3cc0291b3eb8f764a443a77b7948e08543a0dbbb1`. That integration and its eventual fixed runtime must be bound by a later review; the provisional canonical copy is not substituted for the target below.

| Path relative to isolated target | Round 3 comparison | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Config/DefaultEngine.ini | unchanged | 1254 | `05b98074db37680b799cf5f5be180c90d397ea154c7c22e5af163ba3c98ad417` |
| Config/DefaultInput.ini | unchanged | 1273 | `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015` |
| ShibuyaUnreal.uproject | unchanged | 650 | `1212d0fcb3d1b636a0a667e343c1ab71be1f2e9b106a36321ad6969b8170ae04` |
| Source/ShibuyaRuntime/Private/AgentGeometry.cpp | changed | 11210 | `8fdeb6b48a647d8204a83d47e2dc44267dbfd13af139507ce588b8641d717761` |
| Source/ShibuyaRuntime/Private/RuntimeFiles.cpp | added | 1639 | `71f103b3a19bbd9dce627a132a55015c27f4ea3ced98940464d6c6da19d585c2` |
| Source/ShibuyaRuntime/Private/RuntimeProbe.cpp | changed | 17755 | `04196e2b505f2ae3d528d8928a3611e5b5dd3191ef8796470b9aa1867cb50bf8` |
| Source/ShibuyaRuntime/Private/ShibuyaRendererLibrary.cpp | added | 7310 | `c7af870a333d3bbb7a1e7fbbcef8fbe583b2598e129a73685e5d31c67f41f6ff` |
| Source/ShibuyaRuntime/Private/ShibuyaRuntime.cpp | unchanged | 125 | `77b565024ebf1379d8125b36a90ec87fb497e737c6a336254cb2b13d711661d2` |
| Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp | changed | 29208 | `786dcf4feef085350e952ec40245ddafee8f990b0ff2e12d808a954fda9890e9` |
| Source/ShibuyaRuntime/Public/CitySimulation.h | changed | 20941 | `ad1798f9ca59b2b009ec24c1668386a472546850db6b6a00e823abe6b9f157aa` |
| Source/ShibuyaRuntime/Public/RuntimeFiles.h | added | 282 | `44f12640fcba66fa7a451d16a4a8dbc01f38ac2c1e98a62c91db0c1b7368fd8f` |
| Source/ShibuyaRuntime/Public/RuntimePath.h | added | 1279 | `94649128bf8f305498eeae5e60eafa7868b920492a0c9f2a0e9f65c51a6ecd2c` |
| Source/ShibuyaRuntime/Public/ShibuyaRendererLibrary.h | added | 476 | `4ade754d4f15c0bb4ee4e3363e99bb38da8e56bb3eb14e1e1889f209af5957ee` |
| Source/ShibuyaRuntime/Public/ShibuyaWorld.h | changed | 4307 | `41e6cb53d3f9cc0c255ef43a9c77ef793673c86490b1a20c5476f29f33042d88` |
| Source/ShibuyaRuntime/ShibuyaRuntime.Build.cs | changed | 390 | `1745fa0ee1e674007234265158e25c1dbd969947c0d9ba71b21259390e8bf5d1` |
| Source/ShibuyaUnreal.Target.cs | unchanged | 355 | `15d8f100b917028603c38c7a2a30936c56394fbe4853114889e1c3c5d0f655cc` |
| Source/ShibuyaUnrealEditor.Target.cs | unchanged | 369 | `09cc25db48b7476683610ff4dc67f6ad567a3801138ce2ed1235708c7602441c` |
| tests/runtime/test_simulation.cpp | changed | 13939 | `e604c8893aa4ee9c0bc2a0fee4528c8304c1f99c105a1425788f95d92c73c9af` |
| tools/runtime/build_native.py | changed | 5943 | `69fc775869afa498483651df75e3ba9691229a17e346ddcf7f5b1cc03f93de04` |
| tools/runtime/prepare_assets.py | unchanged | 3424 | `d8377d9f1fb4eff15e3ed0e4d8c10aa9e0b76b41133652f4782547e71481e1a4` |
| tools/runtime/prove_core_regressions.py | added | 3493 | `7a1d90eb9fcccebad79b09a9e0916279563a48fcca8541c6ac3f3b070792cf0b` |
| tools/runtime/prove_sdk.py | added | 4470 | `f1aadff3062638e0346727662e2e278d474ae35d684df0be3129788bda877dd1` |
| tools/runtime/test_core.ps1 | changed | 3700 | `c31dcb19b6ab44cf64115af2d150f83a648a03e154ea2155be73775bfa3ce381` |

## Required follow-through for this milestone

Repair R12, R13 and R14, run the affected bounded negative/regression checks with retained red witnesses, then obtain focused review of those changed bytes. Carry the final source network contract and new entry/exit lifecycle through an explicit source/runtime integration review. Native acceptance must exercise the actual ordinary input sequence and suppressed-input negative control, walking recovery, source-bound moving native instances, supported motion, visible gait/wheel animation and the dedicated full-population warm performance phase. Preserve the existing visual failures as failures. Compilation, this review, and a read-only GI diagnostic cannot replace those results.

This review ran no engine, compiler, native gate, browser, download, unit test, network operation or implementation mutation. Only this authored report and the explicitly authorized ignored target copies were written. Root retains integration and final acceptance ownership.
