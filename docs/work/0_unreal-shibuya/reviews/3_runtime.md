# Runtime implementation review 3

Reviewer: independent Codex subagent, canonical Astra/xhigh review pin, no delegated reviewers.

Date: 2026-10-11. Outcome: four material findings, R3-R6. This is a read-only implementation review, not runtime or visual acceptance.

## Target and preservation

The target is the frozen 16-file runtime increment in `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, branch `codex/unreal-runtime-next`, based on `33d386299ff7bd02d91bca38f655f41597ddb756`. The user's branch-only exception applies; this review requests no merge onto main. All code citations below are relative to that exact checkout.

Every authored file matched `Artifacts/runtime-build/frozen-handoff.json` before reading and after review. No authored target file changed during this review. `AGENTS.md` and `CLAUDE.md` matched their preserved instruction hashes. The tracked semantic diff changes the project module declaration, default game mode and input configuration; the other 13 authored files are new. Windows line endings are not a finding.

At the integration owner's request, exact bytes of all 16 authored files were copied without modification to the canonical experiment's ignored `tmp/review-runs/runtime-round3/target/`. Each retained file was checked against the frozen inventory. The retained `tmp/review-runs/runtime-round3/frozen-handoff.json` has SHA-256 `a2aaec93b55486d7c29c7111dd02bc72f2430ba3a7ebbc6741a9ca6dd45e375f`. Keep that snapshot until the reviewed revision and authored report are recoverable from Git and no unresolved finding needs it.

## Findings

### R3 [P2] Reverse pedestrians do not wrap closed routes

`Source/ShibuyaRuntime/Public/CitySimulation.h:189-192` handles only `nextDistance >= route.length` for a closed route. Initial placement at line 259 assigns negative direction to pedestrians on closed routes as well as open ones. A negative-direction pedestrian that crosses distance zero stores a negative route distance; `Route::At` at line 78 clamps the position to the first point. Later steps keep decreasing the stored distance while line 218 keeps increasing `travelled`. The pedestrian is therefore stranded at the seam while movement telemetry can continue rising. This affects any admitted closed pedestrian loop whose reverse agents reach its start.

Wrap closed distances in both directions and keep the stored value within the route domain. Add actual-core checks for both directions across a closed pedestrian seam, asserting physical position continuity, continuing displacement and consistent travelled distance. The current seam case at `tests/runtime/test_simulation.cpp:85-86` exercises only a forward vehicle.

Acceptance impact: closed pedestrian route motion and truthful population-motion evidence remain unverified until this is fixed.

### R4 [P2] Switching elevated flight to walking leaves the pawn suspended

`Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp:280` flips the flight flag and stops movement without a landing, falling or supported-transition decision. Walking at lines 304-306 requires ground within its short trace and a height correction within 45 centimetres; otherwise it returns without moving. From an ordinary flight position ten metres above ground, pressing Tab enters walking but all walking movement remains blocked. The only escape is switching back to flight and manually descending close enough to a supported surface. The selected `UFloatingPawnMovement` provides no gravity, as documented in the installed native `Engine/Source/Runtime/Engine/Classes/GameFramework/FloatingPawnMovement.h:15-19`.

Define a supported transition: land/fall through appropriate collision handling, or visibly refuse walking while unsupported and retain flight control. Exercise fly upward, press Tab and recover supported walking through ordinary viewport input. The current probe switches only walking to flight at `Source/ShibuyaRuntime/Private/RuntimeProbe.cpp:80-86`.

Acceptance impact: the advertised bidirectional walk/fly control does not behave correctly for normal elevated flight.

### R5 [P2] Lateral pedestrian offsets jump at route corners

`Source/ShibuyaRuntime/Public/CitySimulation.h:76-85` computes a lateral offset from the current segment's perpendicular. That offset changes discontinuously when the selected segment changes at a sharp corner. A valid metre-sampled route through `(0,0)`, `(1,0)`, `(2,0)`, `(2,1)` with a one-metre lateral offset gives `At(1.999)` approximately `(1.999,1)` and `At(2.001)` approximately `(1,0.001)`: about 1.41 metres of physical movement for 0.002 metres of route progress. The same problem can affect a closed seam whose adjacent tangents differ.

`FixedStep` at lines 197-218 accepts this candidate after checking only destination occupancy. It neither limits actual displacement to the simulated movement nor sweeps the transition through the supported corridor. Pedestrians can jump across a corner or outside its supported surface while reported travel remains small. Initial placement permits nonzero lateral offsets at line 260. The existing pedestrian fixture is straight; vehicle loop tests have zero lateral offset.

Use a continuous, source-supported offset path or a bounded corner transition whose support is checked. Add nonzero-offset right-angle and seam cases that compare actual point-to-point displacement with movement and verify corridor support; changing only the telemetry would not fix the motion.

Acceptance impact: the no-teleport and source-supported movement requirements are not established by the current point spacing and slope checks.

### R6 [P2] Vehicle collision discs prevent traffic from passing in adjacent opposing lanes

`Source/ShibuyaRuntime/Public/CitySimulation.h:134` gives every vehicle a 2.25-metre circular collision radius. Lines 199-208 stop a moving vehicle whenever another vehicle's centre is within 4.5 metres, regardless of direction or which lane it occupies. Two opposite-direction lanes whose centres are 3-3.5 metres apart therefore cannot pass vehicles alongside one another, even though the rendered car body is only 1.75 metres wide at `Source/ShibuyaRuntime/Private/AgentGeometry.cpp:101`. Approaching cars stop before they reach one another and remain blocked because vehicle agents have no lateral or route change and do not reverse. This affects ordinary adjacent opposing lanes within the admitted route schema.

Use vehicle clearance that respects heading and actual footprint, while retaining following gaps for vehicles in the same lane. Add an actual-core test with two supported, opposite-direction adjacent lane segments and assert that vehicles pass without overlap or a permanent stop. The existing fixture at `tests/runtime/test_simulation.cpp:22-32` uses one one-way loop and cannot expose this class.

Acceptance impact: source-grounded Japanese left-hand lane placement alone cannot provide sustained bidirectional vehicle movement with this collision rule.

## Evidence and bounds

I directly read all 16 authored files, their relevant tracked diff, the successful game-build receipt at `Artifacts/runtime-build/20261011-085814/report.json`, the core receipt and stdout at `Artifacts/runtime-core/20261011-085304/`, and the frozen inventory. The game receipt binds the compiled C++ source to this target and explicitly proves compilation/linking only. The core stdout reports 2,437 assertions on the actual header implementation; 2,415 are pairwise separation assertions for the 70-agent synthetic fixture. The remaining checks exercise deterministic time stepping, movement, pause/reset, admission and selected signal/seam cases. These checks do not cover the four conditions above or the full source population.

Primary-source reads outside any project diff included installed Unreal headers `Engine/Source/Runtime/Engine/Public/InputKeyEventArgs.h:136-143`, `Engine/Source/Runtime/Engine/Classes/Engine/GameViewportClient.h:177-178`, `Engine/Source/Runtime/Engine/Classes/GameFramework/FloatingPawnMovement.h:15-19`, and `Engine/Source/Runtime/Engine/Classes/Components/InstancedStaticMeshComponent.h:385-388` and `:433-447`. The probe uses the real viewport InputKey/InputAxis entry points rather than direct pawn mutation. That is appropriate static structure; neither the positive input run nor suppressed-input red control has been established by this review.

The runtime editor DLL and actual city runtime have not been verified here. Compilation does not establish native collision support, render/material correctness, physical keyboard capture, movement, gait or wheel animation. The separate source/parser and visual reviews retain their own scope; this reviewer did not inspect mutable source-worker output or duplicate image review.

The loader records the network digest and checks the prepared-manifest digest. Its support receipt fields are admitted claims, not a recomputation of the referenced source samples. Data/report path checks are lexical and do not themselves establish freedom from existing reparse points. Those trust and asset-binding limits were sent to the integration owner for the separate parser/source lane; this report does not supply broader confinement or current native-asset correspondence acceptance.

The probe's population fields are configured counts and cumulative simulated travel. `moving_pedestrians` and `moving_vehicles` at `Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp:224-236` mean travelled more than 0.1 metres since reset, not currently moving or sustained physical displacement. The probe accepts movement by more than ten percent of each requested population at `Source/ShibuyaRuntime/Private/RuntimeProbe.cpp:143`; it does not count actual native instances or validate their uploaded transforms. Its support/separation sample occurs after reset. Its frame samples include pause and reset stages, with no GPU-time or process-memory measurement and no 60-fps threshold. These are inspection statistics, not acceptance of 3,000 animated pedestrians and 200 vehicles at 1920x1080 and 60 fps. Future final acceptance must name the actual rendered population, active measurement interval, renderer, asset/source bytes and observed limits.

Material preparation changes only the named generated `/Game/Runtime` materials in this implementation; it does not clear the city. The build/test helpers have bounded waits and owned-process cleanup paths. Their receipts do not establish a complete descendant-process census after a successful parent exit or bind every input before and after compilation. No engine, compiler, test gate, browser, server, installer or external review CLI was launched by this reviewer. Only this authored report and the explicitly requested target-retention copies were written. No task-owned persistent process needs cleanup from this review.

## Exact authored inventory

```text
1212d0fcb3d1b636a0a667e343c1ab71be1f2e9b106a36321ad6969b8170ae04  ShibuyaUnreal.uproject
05b98074db37680b799cf5f5be180c90d397ea154c7c22e5af163ba3c98ad417  Config/DefaultEngine.ini
994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015  Config/DefaultInput.ini
a9910fe0eb039dac47a3542f4fc92d4830c11b3b18dd5b34a0d31c3fb7cd1a40  Source/ShibuyaRuntime/Private/AgentGeometry.cpp
8d9387f438a94401620ae502861ca129437703c67efb0799da9c910122c7f3a1  Source/ShibuyaRuntime/Private/RuntimeProbe.cpp
77b565024ebf1379d8125b36a90ec87fb497e737c6a336254cb2b13d711661d2  Source/ShibuyaRuntime/Private/ShibuyaRuntime.cpp
de33c695c5b2de063d5c44a437d47dc92b7af9f109eec90b64822ff5a15014dc  Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp
689044885b9aed6ff2446458a764dd4d9ab56cfffe9d156a4767952ed799b1aa  Source/ShibuyaRuntime/Public/CitySimulation.h
9a7d7fd5c23762a1934daede79821e1981f41b51a0d78e691ded21ac945a4370  Source/ShibuyaRuntime/Public/ShibuyaWorld.h
6bae2877d5c62e62e0961f420b1c7ea040d8d8f116c6cdaffad1e203757055be  Source/ShibuyaRuntime/ShibuyaRuntime.Build.cs
15d8f100b917028603c38c7a2a30936c56394fbe4853114889e1c3c5d0f655cc  Source/ShibuyaUnreal.Target.cs
09cc25db48b7476683610ff4dc67f6ad567a3801138ce2ed1235708c7602441c  Source/ShibuyaUnrealEditor.Target.cs
77c3c2d1b36a283ad0a87285b181a728dffec1a0451e24b356294678d5deb944  tests/runtime/test_simulation.cpp
0db1370637df9b6da868ff9b5b22e30d6b302534c4da0fc859b8a8ad1d0f81bd  tools/runtime/build_native.py
d8377d9f1fb4eff15e3ed0e4d8c10aa9e0b76b41133652f4782547e71481e1a4  tools/runtime/prepare_assets.py
82f9d17d0351921ec7752bad6854199dab8099b80000d6ef7999b17de7474b25  tools/runtime/test_core.ps1
```

Integration-owner finding dispositions and later fixes should be recorded separately from this authored report. No implementation acceptance or final-revision approval is implied while R3-R6 remain open.
