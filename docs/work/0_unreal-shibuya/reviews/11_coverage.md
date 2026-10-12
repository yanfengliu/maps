# Coverage repair review, round 11

Independent authored review on 2026-10-11 by the assigned Astra/xhigh reviewer. Integration owner: root. Target workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, branch `codex/shibuya-unreal-5.8`, base HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec`. This is a focused review of the R20/R21 repairs and the new diagnostic startup observations. No engine, build, test, browser, GUI or network operation was launched by this reviewer. Root owns the concurrent native engine lease.

## Verdict

R20 and R21 are resolved in the frozen implementation and scoped offline evidence. One new material finding, R22, remains: the new software-Lumen log predicate expects text different from the installed engine's actual message and rejects the supported native software path before capture. This target is not accepted as a working native diagnostic. No new native capture, appearance, gameplay-input, population or runtime-lifecycle acceptance is claimed.

## Exact target and retained evidence

All nine reviewed targets, the green receipt/logs, red receipt/driver/logs and the small integration configuration files are retained under `tmp/review-runs/coverage-round11/target/`. Initial inventory SHA-256 is `5c181644ac1bbbae57132cc2f5cfa7df2f7294296fe708eb780d3ae25d2eb5a6`; final inventory SHA-256 is `29ec054626ed98a4ea41e2e88115f79cc99d3323cb738695c906961673ef3195`. Every live inventoried path matched its initial and retained digest at completion. Round 10's original target and findings remain intact.

| Target | SHA-256 |
| --- | --- |
| `Content/Python/shibuya_tools.py` | `fd3a1d944c22be556d523335bfb369e5837774a990cb30d59158d8268446b78f` |
| `tools/unreal/mcp_run.py` | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |
| `tools/unreal/test_mcp_run.py` | `d00e97da4d7100c7d20a3bd6918f00870900398e50cfb3f95ec68142815ffdff` |
| `tools/unreal/test_visual_controls.py` | `96205f4954f9b62c12cfe60979dda15b093deb8ebae269cefc012bf527ecd43e` |
| `tools/unreal/test_coverage.py` | `031c693cbfefa7db00108d123ba2158d33b410bfa4464b2c298340edd49bdb24` |
| `tools/unreal/test_coverage_driver.py` | `f3d2fc716779d9a1a73c76c059f5e02331baf8847ce714eafe40b77bc668c877` |
| `Config/DefaultEngine.ini` | `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948` |
| `artifacts/unreal/visual-review-repairs/run_native_coverage.py` | `92e0bf6c5d903ae4553fc8eba91056faef86898b18325147a80edebf331793c0` |
| `artifacts/unreal/visual-review-repairs/native_diagnostic_tools.py` | `b685e48f64ea31806e89942635a024cdd5ecdf4ba0450413d7fa74f7a45fb636` |

The green receipt `artifacts/unreal/visual-review-repairs/coverage-offline-20261011-112140/report.json` independently hashes to `78c6352baa5ce8a21686d84b9e8ceef98e19618c90dc204dfd539e98d112f498` and binds these nine files before and after execution. Its actual unit log records 35 passing tests in 17.612 seconds, SHA-256 `fb71faa2e91968e04d4239803766b2c1960e571ba91b1515eb6d7fee934ae74b`. The process receipt measures 17.75 seconds. Syntax compilation exited zero with an empty log; both owned Python processes stopped. These are the worker's retained offline executions, not new executions by this reviewer.

The retained red receipt is `artifacts/unreal/visual-review-repairs/coverage-r20-r21-20261011-111318/red-report.json`, SHA-256 `a8ac21cf1d7635373029c2312e576b07b3345e3541032ae12d9b196ddd681180`. I checked the actual failure logs and the original helper/driver digests against the round-10 target. The subprocesses used the actual retained authored functions through the control-path environment variables; the tests did not rewrite an imitation of the faulty boundary.

## R20 resolved: every final-export admission error enters cleanup

[Content/Python/shibuya_tools.py:701](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/Content/Python/shibuya_tools.py:701) now begins the cleanup-protected `try` before output resolution and path/suffix validation. With an active capture and `finish=True`, resolution, validation, existing-file, export and witness failures all flow through `_finish_capture`. The existing restore-readback and finally-based actor release remain unchanged. A call with no active capture still refuses before touching anything.

The added actual-helper test at `tools/unreal/test_coverage.py:191` covers wrong suffix, outside-directory path, resolution error and validation error with a nondefault prior extent of 3125 cm. All four failed against the original helper with the meaningful assertion `7500 != 3125`, rather than an unrelated import or setup error. The repaired green execution checks restoration, cleared active state and exactly the owned actor released. The adjacent `finish=False` control keeps the active capture and candidate extent available for retry, then explicitly cleans up its stub state. R20 is closed within this mocked-native boundary.

## R21 resolved: final byte drift and missing files invalidate success

[artifacts/unreal/visual-review-repairs/run_native_coverage.py:219](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/visual-review-repairs/run_native_coverage.py:219) now compares final input and asset inventories after editor/process cleanup. Changed paths clear overall success, fail readiness and record an integrity error. Unreadable or deleted pinned files clear success and report final integrity as `did-not-run`. The report is written before the function raises the integrity failure. Reading the native log also has a failure-reporting guard.

`test_coverage_driver.py:20` extracts and executes the actual driver's top-level `finally` with a mock shutdown that modifies temporary input/map bytes or deletes the input. It checks the saved receipt when present. Both original modification controls failed with `True is not false`; the original deletion control failed the same way because the old boundary did not persist a failed result. The current source writes the failure receipt after catching that hash error, and the green tests require failed status and the named missing input. An unchanged-shutdown control retains bounded success with empty changed-path lists. This closes R21 for the pinned inventory; it is not a promise to inventory arbitrary new files outside that set.

The surrounding cleanup and capture flow was reread in full. It retains native cvar restoration, shutdown request, finite process wait, owned-tree termination, descendant identity checks, and finally-based evidence generation. A failure in the unchanged outer cleanup operations can still abort normal completion and must be reported as a failed run; this review makes no claim that every operating-system failure can produce a receipt.

## R22 — P1: the software renderer check rejects Unreal's real disabled-RT message

[artifacts/unreal/visual-review-repairs/run_native_coverage.py:45](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/visual-review-repairs/run_native_coverage.py:45) accepts only `Ray tracing is disabled. Reason: r.RayTracing=0.`. The installed engine actually writes `Ray tracing is disabled. Reason: disabled through project setting (r.RayTracing=0).`, from `C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/RenderCore/Private/RenderUtils.cpp:1072`. The same real message is present at line 1035 of the retained `artifacts/unreal/gi-control-20261011-103544/editor.log`, whose SHA-256 was independently checked in round 10 as `6cf0ae39c0bbb6a1addb0288d08d25ee9f9f80e756cf46da6aca543261084c98`.

The predicate is called unconditionally at driver line 131 before the first capture. Consequently the intended software-Lumen run fails even when the actual renderer selected exactly the required path. The new positive test at `tools/unreal/test_coverage_driver.py:95` uses the same invented sentence, so its passing result cannot establish compatibility with the engine. This blocks every valid native run through this target; it does not create a false lighting pass.

Use the installed engine's observed message and add a positive control from the retained real native log, keeping capability-only, enabled-RT, absent and unrelated-disable-reason inputs negative. Run that real-log control against this frozen faulty predicate to demonstrate the regression, then rerun it against the repair. Root was notified promptly with the exact source/log citations. R22 remains open on this frozen target and needs a new bound review after repair.

## Startup input observations and remaining bounds

The diagnostic reads the current input CDO's default input classes, the auto-upgrade cvar through numeric and string APIs, and the actual `DefaultInput.ini` bytes. The host requires integer zero, a matching zero/false string, the two reviewed legacy classes and exact input digest. It repeats that observation after the seven-arm loop and binds the input bytes again in final integrity. It explicitly records gameplay input validation as `did-not-run`; these observations do not exercise a player instance, viewport controls or movement.

The 58-byte `Config/DefaultEditor.ini` is SHA-256 `9141f6ae31db1b130a37273eef06cffe335fbf79409aa411519df55674489b7d`; it contains `[ConsoleVariables]` and `EnhancedInput.bEnableAutoUpgrade=False`. Primary installed source outside the diff confirms that `ConfigCacheIni.cpp:6975` loads the editor ConsoleVariables section, `LaunchEngineLoop.cpp:2878` invokes that loading, and `EnhancedInputEditorModule.cpp:333` returns from automatic class replacement when the flag is false. Actual initialization timing and current native observations still belong to root's native run.

Observed integration identities, outside runtime-code acceptance, are `DefaultInput.ini` SHA-256 `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015`, `.uproject` `f6eb752942dab805d542f9c7df06ab8ab44be44f76106ebea9f6115e9b36129d`, and the current DLL `213840f5c613e0432d935240e4d7b9638abf1a615b45b5faf0275db0a80d5bc8`. The explicit current provisional integration report is `artifacts/runtime-integration/boundary-provisional-20261011/prepared.json`, independently verified SHA-256 `e821ab00a6e117beacea79241d53dc0eb366d0688f4f595e86baee5e1c3c1803`. The older `artifacts/runtime-integration/prepared.json`, which the diagnostic driver also inventories, remains `1e16fba45b20fce489258bd7ea968f51685a7198aab68a13f4848d0aca73fa75`. They are different paths and historical records, not a same-path integrity mismatch. No runtime conclusion is inferred from either report identity.

The source-supported coverage hypothesis, strict current-view positive-card prerequisite, exact image validation, fixed darkness thresholds and appearance exclusion remain as reviewed in round 10. R20/R21 repair does not resolve the dark crossing or far-view lighting. Root must inspect actual complete native captures and their final conserved inputs. Only this report and authorized ignored retention were written; no native process was owned or left running by this reviewer.
