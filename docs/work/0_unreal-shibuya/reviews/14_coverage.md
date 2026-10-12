# Coverage diagnostic review, round 14

Independent authored review on 2026-10-11 by the assigned Astra/xhigh reviewer. Integration owner: root. Workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, branch `codex/shibuya-unreal-5.8`, base HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec`. Scope: R22's actual-native-log repair, the diagnostic's deferred startup-host shutdown, their offline controls and the completed coverage diagnostic. This reviewer launched no engine, build, tests, network, browser or GUI process.

## Verdict

R22 is resolved. No new material finding in this focused code delta. R20/R21 remain closed through the unchanged helper/runner and preserved final-integrity behavior. The completed native run establishes bounded capture readiness, actual software-Lumen scene resources at all six fixed production views, input/configuration conservation and a clean deferred exit in this one run. It does not accept the expanded coverage policy as an appearance fix: crossing, southeast block and southeast crop still fail the original darkness thresholds.

The previous `0xC0000005` shutdown remains a recorded failure with unknown cause. The new successful shutdown does not establish a general crash fix. Ordinary game rendering, real control input, pedestrians, vehicles, collision, runtime lifecycle and performance remain outside this verdict. Root owns individual visual inspection of the seven final PNGs; this reviewer checked image identity and receipt consistency, not appearance.

## Recoverable target and evidence

The exact nine-file target, offline receipt/logs, actual-log red/green proof, completed native receipt/log and provisional integration receipt are retained below `tmp/review-runs/coverage-round14/target/`. Initial inventory SHA-256: `d3d32220bc0c09cd97060f5c70250fd0a5a41e64db848619d8fa9511fbb23e0a`. Final inventory SHA-256: `0dc5d8647bc4b74b19205501b100281e9b84da6a39c8bc5f4e17f983475a1ee2`. Every inventoried live target matched its initial and retained digest at completion.

| Target | SHA-256 |
| --- | --- |
| `Content/Python/shibuya_tools.py` | `fd3a1d944c22be556d523335bfb369e5837774a990cb30d59158d8268446b78f` |
| `tools/unreal/mcp_run.py` | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |
| `tools/unreal/test_mcp_run.py` | `d00e97da4d7100c7d20a3bd6918f00870900398e50cfb3f95ec68142815ffdff` |
| `tools/unreal/test_visual_controls.py` | `96205f4954f9b62c12cfe60979dda15b093deb8ebae269cefc012bf527ecd43e` |
| `tools/unreal/test_coverage.py` | `031c693cbfefa7db00108d123ba2158d33b410bfa4464b2c298340edd49bdb24` |
| `tools/unreal/test_coverage_driver.py` | `dc0040fe2b6c6f1974484274f36806832857af6c4afaf0ed296852e3b9c4f2d9` |
| `Config/DefaultEngine.ini` | `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948` |
| `artifacts/unreal/visual-review-repairs/run_native_coverage.py` | `718900a284dcd87b87b99c3fb521443925a76bb42aabcbb78ba031026b55e6a2` |
| `artifacts/unreal/visual-review-repairs/native_diagnostic_tools.py` | `c2b8e3789fef548acffec4042326960c1a36fbc52344e433d99aefd56464e405` |

The offline receipt `artifacts/unreal/visual-review-repairs/coverage-offline-20261011-113338/report.json` independently hashes to `26198774d912b428eea7d145e6252e257bb16bb920e9e04fafd69ec315473083` and names all nine target hashes before and after its executions. Its unit log has SHA-256 `0224038193aff643ee41e715cabe52f6c6216db1873a3047296c787d6c27c89e` and records 37 passing tests in 23.331 seconds; the child-process duration is 23.5 seconds. Syntax compilation passed with an empty log. Both owned Python processes stopped. These are retained worker executions with mocked native boundaries; no tests were rerun by this reviewer.

The completed native receipt is `artifacts/unreal/coverage-gi-control-20261011-113725/report.json`, 1,469,616 bytes, SHA-256 `ca54a6b9e2076788c6790364cecbe5f71192a8c54dab00d9a8bcab69da518482`. The independently hashed and retained native log is `9edef2cd342372d127614e534c7e2e51233c0b7c0319c1b3c1bf9de07673c5b6`. The ignored large receipt is evidence, not an ordinary-Git artifact.

I compared the changed files against round 11's retained target and read each changed function with its callers and tests, the complete diagnostic teardown, and the completed native receipt's capture/readiness/conservation/cleanup fields. Unchanged source read outside this delta includes `shibuya_tools.py:55` coverage restoration and `mcp_run.py:140` image admission. Primary installed engine reads include `RenderCore/Private/RenderUtils.cpp:1072` and `PythonScriptPlugin/Private/EditorUtilities/EditorPythonExecuter.cpp:58–125`. The existing round-11 report carries the unchanged helper/runner findings; its coverage is carried only for matching bytes.

## R22 resolved against real native evidence

[artifacts/unreal/visual-review-repairs/run_native_coverage.py:45](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/visual-review-repairs/run_native_coverage.py:45) now recognizes the installed engine's exact `disabled through project setting (r.RayTracing=0)` message. The prior unsupported literal is gone. The unit control retains absent, capability-only, enabled-RT and unrelated disable-reason negatives.

The stronger retained proof, `coverage-r20-r21-20261011-111318/r22-real-control.json`, has independently checked SHA-256 `c637dbf83e709bd3c7086e8ab3e09f9d52b506b676f34f23e612e1aa35a02cb9`. Its script extracts the actual old and current predicates and feeds both actual retained native logs: `gi-control-20261011-103544/editor.log` SHA-256 `6cf0ae39c0bbb6a1addb0288d08d25ee9f9f80e756cf46da6aca543261084c98`, and `coverage-gi-control-20261011-112339/editor.log` SHA-256 `410fcbddc3ca9c412c03745b627f523528ff9fe560aa7646b249a0a9d2a0b274`. Both logs are refused by the original predicate and admitted by the repair. The installed source digest `5d989227390d59eaa4aa6949d36bd7bbb74b3e253b480630fa4c45b3b5e17f0b` also matches the proof. This is an actual-source compatibility control rather than a positive fixture invented from the predicate.

The completed new native log independently records actual SM6/PCD3D_SM6 at lines 887 and 972–973 and the correct software-RT-disabled message at line 1028. R22 therefore has both offline real-log proof and a completed native path through the repaired admission condition.

## Deferred shutdown: source-supported and observed once

[artifacts/unreal/visual-review-repairs/native_diagnostic_tools.py:41](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/visual-review-repairs/native_diagnostic_tools.py:41) calls the existing capture cleanup, requires the startup host's observed keep-alive flag to be true, releases it, and returns the observed false value. It does not directly quit the editor inside that tool call. The driver uses this route when its diagnostic host registered, retaining the bounded direct fallback for a host that never became available.

Installed `EditorPythonExecuter.cpp:73` observes a released keep-alive during the running script host's next tick. `RequestExit` at line 125 queues native `QUIT_EDITOR` through `HandleDeferCommand`; the source explicitly warns against closing on the same frame as executing the script. The new helper's sequence is consistent with that ownership contract. Its offline control executes the actual function and checks capture cleanup precedes release, with no direct quit API supplied by the native stub.

The driver now records native shutdown status separately from process-tree cleanup. A nonzero editor exit clears overall success and readiness, even when input/asset hashes match; its offline boundary test supplies `3221225477` and requires this failure. That control is part of the 37-test green receipt. No separate original-code red execution for this additional nonzero-exit check is claimed.

The completed native receipt observes keep-alive `true` to `false`, no active capture remaining, editor PID 73892 exiting 0, and `graceful_editor_exit`. Native log lines 4968 and 4998 record editor shutdown and exit. The owned descendant records name conhost 66416, zenserver 68980 and crashpad handler 75588, with creation times; the cleanup uses those identities and finishes with no remaining owned descendants. No quit-request or restoration error is recorded. This establishes the route in this run, while the earlier access-violation cause stays unknown.

## Native coverage succeeded within its bound; darkness did not

All seven arms use the same fixed camera set and physical/photo inputs, with one explicit crossing GI-off diagnostic control. All 21 start/warm/final observations have the expected component-bound candidate settings; frames are 1/60/80 and each arm preserves its native start frame and component identity. Final native elapsed frames are 1029–1061, with sufficient native advancement between exports. Every arm observes restoration from 7500 cm to its original 2500 cm. This proves the bounded capture protocol, not simulation frame rate or whole-scene performance.

I independently hashed all fourteen warmup/final PNG files against their receipt digests; all match. Each reported scored image has 1280×720 dimensions, exactly 387,072 central pixels and no retained allocation tail. All seven reported warmup/final luma convergence checks pass. Pixel metrics were not recomputed by this reviewer, and no visual inspection is implied by a digest match.

| Fixed production view | Actual SDF / mesh cards / cards | Median luma | Black fraction | Fixed pixel criterion |
| --- | --- | ---: | ---: | --- |
| Crossing GI on | 112 / 111 / 653 | 13.3742 | 0.454135 | Failed |
| Crossing west | 112 / 111 / 653 | 79.4304 | 0.089312 | Passed |
| Southeast block | 112 / 111 / 653 | 10.0172 | 0.569884 | Failed |
| Northwest block | 112 / 111 / 653 | 56.8688 | 0.028938 | Passed |
| Southeast crop | 112 / 109 / 648 | 11.1656 | 0.527251 | Failed |
| Northwest crop | 112 / 107 / 640 | 52.2390 | 0.209098 | Passed |

I checked the corresponding actual native scene-stat blocks in serial capture order. The separate GI-off block has zero mesh cards/cards and is deliberately excluded from the production readiness criterion. Its crossing median is 11.953 and black fraction 0.500173, also failing darkness. Positive far-view cards resolve the earlier empty-resource prerequisite for this experimental capture policy. They do not prove all surfaces are represented or illuminated well. The combined expanded range/detail policy changes SDF precision and capture policy, so this diagnostic cannot isolate which part caused any per-pixel difference.

The receipt correctly reports `readiness_gate: passed`, `fixed_six_darkness_gate: failed`, and `appearance_acceptance: false`. Its `passed: true` describes completion of the bounded diagnostic, not successful appearance. Root must retain that distinction in final acceptance and any next policy decision. The dark crossing is still an open product defect.

## Conservation, editor input and integration limits

Independent dictionary comparisons found zero differences across the 16 pinned input entries between start and final cleanup, and zero differences across all 54 saved map/surface asset entries before, after and final. Map identity stays `4203bd6085a60b99570dc3cfb25c02a503f4642719166b9f07f1f9e20df52808`. Before/after native scene and physical-lighting records are identical; the fresh editor readback records terrain and 25 roads sharing the admitted photo material/atlas. Both diagnostic controls restore their initial native values.

The current native input observations show auto-upgrade integer 0/string `false`, `/Script/Engine.PlayerInput` and `/Script/Engine.InputComponent` before and after the capture loop. `DefaultInput.ini` remains SHA-256 `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015`; `DefaultEditor.ini` remains `9141f6ae31db1b130a37273eef06cffe335fbf79409aa411519df55674489b7d` through final shutdown. This is actual editor CDO/configuration evidence. Gameplay input is explicitly `did-not-run`, and no game viewport or player-instance claim follows.

The native input inventory now explicitly includes `artifacts/runtime-integration/boundary-provisional-20261011/prepared.json`, SHA-256 `e821ab00a6e117beacea79241d53dc0eb366d0688f4f595e86baee5e1c3c1803`, alongside the separate historical preparation report. The observed DLL is `213840f5c613e0432d935240e4d7b9638abf1a615b45b5faf0275db0a80d5bc8`. This pins the renderer diagnostic used by this run; it is not acceptance of runtime code currently being revised under another lease.

No implementation, project configuration or native evidence was changed by this reviewer. Only this authored report and authorized ignored retention were written. No task-owned native process was started or remains. The nine-file target and failed/successful evidence stay retained for root's integration and unresolved visual defect.
