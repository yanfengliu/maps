# Review 46 — ordinary Game camera candidate v1

Authored 2026-10-11 by the independent Codex camera reviewer. Outcome: changes requested. This is a read-only source review, not a compile, native run, screenshot inspection or city acceptance. The two input/view concerns supplied with the recovered assignment were independently checked against the actual candidate and installed Engine source; the callback-cache finding below was found during this review. No implementation file was changed.

## Exact review target

Candidate workspace: `C:/Users/38909/Documents/github/maps/artifacts/unreal-game-camera/worktree`, branch `codex/unreal-game-camera`, checked HEAD/base `f65cc0c484d880c7a79a6dc52c586e286e970946`. The four-file camera delta is uncommitted over the declared runtime dependency overlay. Retained candidate bytes are under `Artifacts/game-camera/candidate-v1/`. Live and retained candidate bytes, handoff metadata and all 18 unchanged dependencies matched the handoff hashes when read. The review does not promote an uncommitted candidate to an integrated revision.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| `Artifacts/game-camera/candidate-v1/handoff.json` | 8292 | `9ee9052e431877b1a6113c2abf2d90edcd214e3f3a764b2b78b182239e3dd6d6` |
| `Artifacts/game-camera/candidate-v1/camera-source.diff` | 44830 | `ee5c0b6cc751a8e65d299beadeb13be7e6c6650e94b485d04ffc99d39ef97800` |
| `Artifacts/game-camera/candidate-v1/dependency-overlay.diff` | 12034 | `5dad0194a78f735cbd6cdb9a4288610e56b551f164bc2d432116bdd61d875d95` |
| `Artifacts/game-camera/dependencies/manifest.json` | 13916 | `bb6ee1c17461c948d619fb108bc6a887bd9907ac13c8ec8c327062959cedc396` |
| `Source/ShibuyaRuntime/Private/GameCameraProbe.cpp` | 38618 | `d400da90487dbc2db708d6414063415e8fb6b79266751e4679120273c0008bea` |
| `Source/ShibuyaRuntime/Private/GameCameraProbe.h` | 2185 | `8832d89f86a5dd1c38d09efade047fb7be156a223b55896082ffe614cb56ad2b` |
| `Source/ShibuyaRuntime/Private/RuntimeProbe.cpp` | 32358 | `d09fae977603e4008b46105b3960adf0bdccc377629e9c6b3a153ad1f8100361` |
| `Source/ShibuyaRuntime/Public/ShibuyaWorld.h` | 6328 | `d5318df1a55bcb9e263e6eaefbdc0b61892d48b22bcb40b6cd4211c24cc4b82b` |
| `docs/work/0_unreal-shibuya/game-camera-candidate.md` | 9369 | `6ff0f4b4781dfc26ebe42272f88d2f9c4f4ae0169328bdf60324e4776f8b360b` |

The dependency declaration points to the runtime worker's `Artifacts/runtime-build/review42-role-rename/compiled-handoff.json`, SHA-256 `d31a7de1916c35b762797717b24d0ff02763f2d2839094fb7da74a6b07f45504`. This review checked the retained dependency identity; it did not rerun that earlier build. The unchanged Core is `956092133aaa4c4c4868894fe23a1ca9c0f1dc306aec745cf41b7ba4b06ed746`, World is `1d54d8f0cb2995e022e2a056ff6150cf50941eb0d7d7ed1b58609e6c3244fbca`, and ordinary `Config/DefaultInput.ini` is `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015`.

## Findings

### R46-CAM-01 — P1: valid ordinary axis input immediately aborts navigation

Locations: `GameCameraProbe.cpp:263-264`, `313-314`, `327-330`; return source at `RuntimeProbe.cpp:111-133`.

`Aim` and the movement-key chain treat a false viewport return as failed delivery and immediately finish the run. In this installed Engine, `UPlayerInput::InputKey` queues an analog sample in `Engine/Private/UserInterface/PlayerInput.cpp:326-332` and then returns false at line 399. MouseX/MouseY events sent here have one sample and take that branch. A digital first press queues its value at lines 442-443, but line 484 returns `IsKeyHandledByAction`; lines 2470-2484 search action mappings only. W/S/D/A/E/Q are axis mappings in the admitted config, not actions. `APlayerController::InputKey` forwards these results at `Engine/Private/PlayerController.cpp:2418-2430`, and `UGameViewportClient` forwards them at `Engine/Private/GameViewportClient.cpp:799/881`. These events can therefore reach the intended player correctly and still produce false. The camera aborts on its first needed look delta or movement-key press before the following tick can demonstrate the response. Short-circuit evaluation also prevents later movement directions in the expression from being submitted.

Keep the ordinary event route and record its actual consumption return. Separate route validity from consumption; determine successful input from bounded observed pawn/look/mode response, using the existing route diagnostics and progress deadlines. Do not manufacture `handled=true`, add artificial action bindings merely to make the return true, or set movement/camera state. A focused control must exercise an axis-only movement key and mouse delta through this native route with false consumption but real response, and show that missing or suppressed delivery still fails within the deadline. Neither control was run in this review.

### R46-CAM-02 — P2: main-view identity compares different player-ID domains

Location: `GameCameraProbe.cpp:344`.

The code requires `View.PlayerIndex == Local->GetLocalPlayerIndex()`. The installed `Engine/Private/LocalPlayer.cpp:874-877` sets the view's player index to `GetControllerId()`; its comment explicitly says changing it to `GetLocalPlayerIndex()` is future work. `GetLocalPlayerIndex()` returns the GameInstance index at lines 1730-1732. One local player fixes its array index at zero but does not establish that its legacy controller ID must also be zero. A valid registered player with a nonzero controller ID is consequently refused as an unknown view, even though the pawn, viewport and persistent state are correct.

Compare the view field with the exact identity domain populated by this Engine version and record both the legacy controller ID and local-player index separately. Retain the existing actual player/view-target/device checks. A focused control should cover unequal legacy controller ID and local-player index and reject an actual wrong view owner. This is a conditional compatibility failure; the current native launch's IDs were not observed here.

### R46-CAM-03 — P2: cache eviction can erase one callback for the capture frame

Locations: `GameCameraProbe.cpp:109-116`, with the resulting rejection at `418-423`.

`Record` runs for both pre-postprocess and post-render callbacks and clears the entire map whenever its current size exceeds 256. If a new frame starts with 256 retained entries, its pre-postprocess callback does not clear the map, inserts entry 257 and sets `PostProcess=true`. Its post-render callback then sees 257 entries, clears the map and recreates that same frame with only `PostRender=true`. The screenshot check rejects the frame for a missing postprocess callback even though both callbacks actually ran. Transit can last many hundreds of frames, so a warm60/final80 request can land on this boundary; the failure depends on the total rendered frame count rather than image correctness.

Evict only when inserting a new frame, preserving every observation of the active frame, or use a bounded structure whose insertion cannot discard an earlier callback for that same frame. Keep both real callback requirements. Verify a sequence longer than 256 distinct frames with both callbacks per frame and a requested capture at the eviction boundary; also verify that genuinely missing callbacks remain a failure. The boundary failure follows directly from the source state transitions; no executable control was run here.

## Checked source behavior and limits

- Read all four candidate C++ files and the candidate contract. Inspected unchanged ordinary input configuration, pawn bindings/movement, runtime event routing, asset inventory and path helpers. Outside-diff evidence includes `ShibuyaWorld.cpp:543-561` for actual bindings and look scaling, `588-614` for native movement, and `RuntimeFiles.cpp:10-39` for project-relative ancestor/reparse admission. The camera hook preserves the functional probe path when the camera flag is absent; camera mode is selected after `Super::PlayerTick`, and `EndPlay` releases its observer/delegate.
- The new probe contains no teleport, ResetView call, pose setter, source-readiness setter, scene capture, asset save or Core change. Its movement amounts are explicitly synthetic ordinary input. Arrival checks the actual produced view, fixed position/angle/speed bounds and ten confirming views. The next eighty observed frames are retained, with requests at 60 and 80. These are source observations, not proof that native navigation converges.
- Checked public Engine signatures used by the observer, clocks, native screenshot request, HDR refusal, PNG encoder and no-replace file helpers. No additional API-signature blocker was identified in those checks. Editor/Game compile and link remain unrun, so this is not a compile verdict.
- Verified screenshot ordering in the installed source: `Renderer/Private/SceneRendering.cpp:5421-5450` assigns family frame IDs before `CreateLinkedSceneRenderers` at line 5496; `Renderer/Private/SceneRenderBuilder.cpp:524-526` then invokes `PostCreateSceneRenderer`. `Engine/Public/SceneViewExtension.h:167-170` specifies the game thread. `Engine/Private/UnrealClient.cpp:1866-1872` draws and flushes the canvas before processing screenshots. `Engine/Private/GameViewportClient.cpp:2535-2552` reads the viewport and then invokes the FColor delegate. The readback at `Engine/Private/UnrealClient.cpp:61-78` enqueues surface reading and flushes rendering commands before returning. This supports the planned request/render/readback association in source; it does not prove that callbacks or pixels occur in a native run.
- Render callbacks use the mutex-protected observation map and immutable viewport/actor identity, while the weak probe is used only by the game-thread observer. View families retain thread-safe shared extension references; `Stop` removes the screenshot delegate and resets the weak probe and owner reference. The render-state pointer is compared as an identity and is not dereferenced by the probe. No new concrete lifetime race was identified in the reviewed paths; runtime teardown remains untested.
- CLI arm/run/exact-output validation and fresh output admission precede the light/PP/input mutations. PNG/JSON paths pass through the reviewed project confinement helper and use `FILEWRITE_NoReplaceExisting`. The six known PNG paths are checked at preparation and again at write time. This does not replace the external launcher's required output membership, hashes, before/final input/package/engine-parent checks or finite process cleanup.
- Requested camera PP and actual final blended CPU PP are distinguished. GPU exposure/EV100/uniforms and main-view indirect resource-use attribution are explicitly unavailable. The transient sunny/overcast parameters, three fixed poses, unchanged ROI thresholds and separation from final 1920×1080 performance/appearance acceptance remain in the contract. Neither successful compilation nor `capture_sequence_complete` can admit Source, appearance, traffic, collision or performance.

## Primary Engine identities

These are the actual installed source files inspected under `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/`; they were not modified.

| File | SHA-256 |
| --- | --- |
| `Engine/Private/UserInterface/PlayerInput.cpp` | `ffea97690caf6feba2f3d08ea81fdb9e3d43e8bd05b64faea382eed38e4de9ca` |
| `Engine/Private/PlayerController.cpp` | `d2946876bc3c3bad60e3eb833c1cfd034a55574e420841e60b72298a8e5a5ead` |
| `Engine/Private/LocalPlayer.cpp` | `dc08d693590ac7bcedb5554f2a68a51c1d2df0261b6fccbeb103b94ceb751068` |
| `Engine/Private/GameViewportClient.cpp` | `ca334450efebbaacb459b1eafe9342a02a83b94c532619dd187d426101cc0996` |
| `Engine/Private/UnrealClient.cpp` | `f5ca882721c6be8cee8671b80b07a9b1db3fb46d5705021e9d6b1b5353666bcb` |
| `Engine/Public/SceneViewExtension.h` | `4433fc76c60f8bf403816cc8fd24e12450c15dbee36fd7b890bf9ade398835ae` |
| `Renderer/Private/SceneRendering.cpp` | `299e6510392477d201e1a3ef14a0e5c02f36d05751067198ddb0aa0f2ad357a1` |
| `Renderer/Private/SceneRenderBuilder.cpp` | `8e5733eba794220758fa576a56267a93de755d030179e295027828861e3058ac` |

## Unrun and handoff

No CPU gate, Editor/Game UBT compile, Engine/MCP process, hardware render, negative arm, real navigation, image/ROI analysis or performance run was started. The candidate has no new executable or native acceptance evidence from this review. All three findings remain open and require a new frozen revision plus focused review after repair; native execution belongs to the root's exclusive lease. No browser, GUI, Engine, compiler, server or persistent helper was created by this reviewer, and all read commands returned without a surviving session. Only this authored review document was written, in the assigned canonical review path after checking its existing ancestors for reparse points and confirming the file did not already exist.

## Addendum — focused review of frozen candidate v2, 2026-10-12

Authored by the same independent Codex reviewer. Verdict: all three R46 defects are addressed in the reviewed source; no new material finding in the repair. The candidate is suitable to advance to the proposed compile and controls when the root grants the corresponding exclusive lease. This is not a compile or runtime approval. The required executable, mutation and native controls below remain unrun. The original report above is retained, with its original 12,883-byte content identified by SHA-256 `831d8c45f9ada346d0c0b73091c74ec7988dd5c9de70bc161be1a881d6986da9`.

### Frozen v2 identity

The workspace, branch and base remain `C:/Users/38909/Documents/github/maps/artifacts/unreal-game-camera/worktree`, `codex/unreal-game-camera`, and `f65cc0c484d880c7a79a6dc52c586e286e970946`. Retained v2 source inputs are under `Artifacts/game-camera/candidate-v2/source-inputs/`; the retained candidate contract is under that candidate's `docs/` directory. The original v1 remains retained.

| Reviewed v2 input | Bytes | SHA-256 |
| --- | ---: | --- |
| `Artifacts/game-camera/candidate-v2/handoff.json` | 12921 | `94f3ca9c3b29948b3fbfd7e35766c4fefa95d9cb1d3eb519d0a3e0f09534722d` |
| `Source/ShibuyaRuntime/Private/GameCameraProbe.cpp` | 46892 | `8ad91d36171aee15b7ba7c5fb43f3b992af414b814ee5712edb66b16cb5bec60` |
| `Source/ShibuyaRuntime/Private/GameCameraProbe.h` | 2501 | `52b6db684d223e6bb5317b12832eb9c8335943e305d3016d3a20e1f4e6b1ac9d` |
| `Source/ShibuyaRuntime/Private/RuntimeProbe.cpp` | 32748 | `e4d01d12109bfc309d9c3fa5b8ec48905a84a36af59b5f6332f7443890cde98d` |
| `Source/ShibuyaRuntime/Public/ShibuyaWorld.h` | 6348 | `7013e1e809711d7802af78fd170b50497dda67366b7eb57d122fcbff28e47660` |
| `docs/work/0_unreal-shibuya/game-camera-candidate.md` | 13064 | `801d4444c1373fbd9b8d1c4e7bfbac0d0b992d6c5c2ecc1bab24c90bce3615c7` |
| `Artifacts/game-camera/candidate-v2/repair-v1-to-v2.diff` | 44490 | `a532b51d5a14d442cef797ffdc3b752ff61c8a8311bf2c8b41910066ffe4060b` |
| `Artifacts/game-camera/candidate-v2/camera-source.diff` | 56394 | `bef9c74874f8a650b92aa783b5397af87209d96902433d2aa7faddd8dae9585b` |
| `Artifacts/game-camera/candidate-v2/controls.json` | 1953 | `37a671fc3da999828cc12a5d77b2a28f39dbdfede10f4adfe421e759197c14f0` |
| `Artifacts/game-camera/candidate-v2/compile-proposal.json` | 18237 | `722d84438eb9133bd31dfce6b52d542f53ccb76dd14caec7fe1106871df0cea6` |

Checked live and retained file sizes/hashes for the declared artifacts and metadata and all 18 unchanged dependencies. Separately checked all 22 compile inputs, live and retained, plus the three declared Engine inputs: 47 paths. The source/uproj population matches exactly the 22 declared files. Artifact and compile-input ancestor/leaf checks found no reparse points. The input config, dependency manifest and dependency overlay retain the hashes in the first review. The actual installed `PlayerInput.cpp` and `LocalPlayer.cpp` retain the primary-source hashes recorded above.

### Finding dispositions

**R46-CAM-01: addressed in source; native verification open.** `GameCameraProbe.cpp:339-346` retains the exact `InjectEvent` behavior while no longer treating its consumption return as successful or failed delivery. Both required look axes are submitted independently at lines 363-364; all six movement directions are submitted independently at lines 438-440. `RuntimeProbe.cpp:114-137` adds explicit submission telemetry and returns the actual viewport `Handled` value without changing it. The camera refuses missing/suppressed routing at lines 385-388, requires an observed transition into flight under a ten-second deadline at lines 403-411, requires actual look progress under a ten-second deadline at lines 352-364, and retains the original measured navigation/pose deadlines at lines 427-432. Completion additionally requires observed flight, camera movement and controller rotation at lines 593-594. The response counters have the appropriately stated observational bound; a consumption count alone cannot certify the run. The existing actor, view, arrival and screenshot checks remain necessary. No direct pose, velocity, readiness or rotation setter was added.

**R46-CAM-02: addressed in source; control execution open.** `FCameraViewOwner::Matches` at `GameCameraProbe.cpp:47-52` compares the view's player field with `LegacyControllerId`. The actual main-view call constructs that owner from `Local->GetControllerId()`, separately records `GetLocalPlayerIndex()`, and retains the pawn/scene-capture checks at lines 450-457 and 489-491. This matches the installed `LocalPlayer.cpp:874-877` assignment, whose source hash was rechecked. The installed public `LocalPlayer.h:522` supplies the const accessor used here. The distinct ID domains are also present in initial and route telemetry.

**R46-CAM-03: addressed in source; control execution open.** `FCameraRenderedFrames::Record` at `GameCameraProbe.cpp:66-75` evicts only when the frame is new, then preserves both prior callback bits when updating the same frame. The cache remains bounded to 256 distinct entries. Production render callbacks use that cache under the existing mutex at lines 146-152, and native screenshot validation uses its actual `HasBothCallbacks` predicate at lines 530-536. The old mid-frame whole-map reset is absent. Neither a missing callback nor an unobserved frame is converted into a complete observation.

### Prepared controls and compile proposal

The two development automation controls are meaningful within their stated source-level bounds. `Shibuya.Camera.CallbackBoundary` at `GameCameraProbe.cpp:159-189` executes the production cache, checks frame 257 before and after its second callback, keeps the population bounded, continues through frame 600 in reversed callback order, and rejects each single-callback case and an unobserved frame. The expectations use fixed frame counts and explicit incomplete states; they would detect the original reset failure. `Shibuya.Camera.PlayerIdentity` at lines 191-202 executes the production owner predicate with independently chosen legacy controller 7, local index 0 and pawn 123. It accepts the Engine's legacy-ID domain and rejects the array-index substitution, wrong pawn, wrong controller and scene capture. These tests do not synthesize a native delivery, callback or successful screenshot. The production call sites, not only the helpers, were inspected to confirm the helpers are actually used.

The `WITH_DEV_AUTOMATION_TESTS` guard, automation macro, Editor-context/filter flags, and assertion signatures were inspected against the installed `Core/Public/Misc/AutomationTest.h`. No new API-signature or declaration mismatch was identified in the repair. That finding does not substitute for Editor and Game compilation. The added runtime telemetry preserves the existing functional probe's event return and mode-selection behavior.

The compile proposal binds both Win64 Development targets, all 22 source/uproj inputs and metadata, the installed Engine build/launcher, and the portable SDK manifest. The retained SDK manifest is 89,318 bytes, SHA-256 `1594b360c1058cd75ba0579e052a959ccdbdd44803794d9ec33d41f6443ec240`; this review verified the manifest identity, not its 152 payload files. The proposal correctly requires current nonreparse/byte admission of those payloads before execution, keeps `UE_SDKS_ROOT` child-local, bounds each target to 600 seconds and the build to 1,230 seconds, and specifies an owned hidden job/process tree with 15-second cleanup. It requires source checks before/after and actual diagnostics/receipt/output hashes. No process was launched to exercise that proposal, and its cleanup behavior has not been demonstrated by this review.

The native false-consumption/real-response and missing-delivery controls in `controls.json` remain explicitly pending a scoped root launcher contract. They are requirements, not executable or completed evidence. In particular, the existing rejection of `ShibuyaDisableProbeInput` cannot serve as proof that an otherwise valid routed camera run detects a missing response. An eventual negative must reach the intended route/response path and demonstrate finite refusal without state injection or false successful receipts. This gap is disclosed by the candidate and does not invalidate the source repair; it prevents claiming native acceptance now.

### Required verification still unrun

1. Compile/link the exact frozen inputs for both targets under the root's exclusive lease, after current SDK admission; retain diagnostics, target identities and output digests.
2. Run both named automation controls against the compiled production helpers and retain explicit test discovery/results. Reintroduce the respective original defect under a separate declared mutation input, observe the expected red assertion, restore the reviewed bytes and rerun green. Until that occurs, they are prepared controls, not proven gates.
3. Freeze and exercise the native input control contract. Retain actual false consumption together with registered submission and subsequent ordinary mode/look/movement response; demonstrate finite refusal for missing route and for missing or suppressed response on an admitted route. The source tests cannot establish this.
4. Exercise the unchanged three-pose main-view sequence, real clocks, callback/readback association, native dimensions, fresh files and final input/package bindings. Inspect actual images and unchanged ROI thresholds. Preserve unavailable GPU exposure/uniform/private-resource claims as unavailable. Source2, contact/collision, traffic, final appearance and 1920×1080 performance remain separate acceptance gates.

No tests, mutation controls, UBT compile, native Engine/MCP process, renderer, image analysis or heavy CPU operation ran during this addendum. No persistent process was created. Candidate implementation and retained artifacts were left unchanged; only this append-only authored review was written. The root owns leases, execution, integration and final acceptance.
