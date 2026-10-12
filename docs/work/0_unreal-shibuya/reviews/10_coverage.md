# Coverage implementation review, round 10

Independent authored review on 2026-10-11 by the assigned Astra/xhigh reviewer. Integration owner: root. Workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, branch `codex/shibuya-unreal-5.8`, HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec`. This review covers the frozen opt-in capture coverage implementation, its offline controls and the prepared native diagnostic driver. Runtime implementation, ordinary Play controls/population, source import and final visual acceptance are excluded.

## Verdict

Two material findings remain: R20, a final-export validation failure bypasses coverage cleanup; and R21, shutdown-time input or asset drift does not invalidate the diagnostic driver's success. The range experiment is supported by the installed engine source and is reasonable to test. This is not an approval of the complete instrument or native appearance. No native run of this coverage freeze was available during review.

Root acknowledged both findings and assigned repairs. Root may use the current freeze for a bounded diagnostic with the known valid output paths and an independent comparison of post-shutdown hashes. That observation cannot close R20/R21 or establish appearance acceptance. Both repairs require their own preserved target and focused review.

## Target and evidence

Exact copies are retained under `tmp/review-runs/coverage-round10/target/`. Initial inventory SHA-256 is `c34f15d836205741e629ceb600f9bc845422ea401a3bdeae681d947ac62b19e0`; final inventory SHA-256 is `1ad8ddbf66d68028dd9f848d453dfec41d76e75a6ae1b99d06fa5b8fdab286fb`. Every live target digest still matched its retained copy at review completion.

| Target | SHA-256 |
| --- | --- |
| `Content/Python/shibuya_tools.py` | `528b7c679d28edf69c4de86ce705e4f4b01833c1d868a6dae9080bb00e737796` |
| `tools/unreal/mcp_run.py` | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |
| `tools/unreal/test_mcp_run.py` | `d00e97da4d7100c7d20a3bd6918f00870900398e50cfb3f95ec68142815ffdff` |
| `tools/unreal/test_visual_controls.py` | `96205f4954f9b62c12cfe60979dda15b093deb8ebae269cefc012bf527ecd43e` |
| `tools/unreal/test_coverage.py` | `be160b41388cfec9ae0abe8d16c27f9fe7f9ee671663fc43b24dbcedb64d230a` |
| `Config/DefaultEngine.ini` | `4d35e4b5e1c405951a8a187590bd654fe2eec73cc7ee4f0001020c4343421948` |
| `artifacts/unreal/visual-review-repairs/run_native_coverage.py` | `de5f4c7c841c769396885568ba87bf2b5085ec7c62825fbd2f46bfe89fd69ae2` |

The retained coverage document has SHA-256 `5848b6139acad6b86b62f1c24da6e4f364165ee7ae9a0e6e72e4f675713cce8f`; the retained coverage analysis receipt is `8625fdaeb8d82f4544dd4e9134df93bf027902abeb3ca705d458bf6fb42d2ac8`. The driver dependency `native_diagnostic_tools.py` was also read and retained, SHA-256 `bbb7bcc5c42e828a9524bf7e864174323af8efecd864e052f757d231b57eccb7`.

The offline receipt at `artifacts/unreal/visual-review-repairs/coverage-offline-20261011-110059/report.json` has the independently verified SHA-256 `13d324edab5e44bfcd051ae5ce8f22961ee64144d6a5ddeec337614346570720`. Its six implementation hashes match this target. The actual unit log records 28 tests passing in 16.431 seconds; the process receipt records 16.562 seconds and both owned Python subprocesses stopped. The unit log SHA-256 `fe544e12399ee19a12e65e1673f4d848acf05b17e2dd3ca6fd5d9e1cd93f6c86` and empty successful syntax log digest match the receipt. These are retained worker executions with mocked native APIs and synthetic image fixtures. This reviewer did not rerun tests or launch an engine, compiler, browser, GUI or network request.

I compared the six-file target with the round-8 retained baseline, read the complete changed helper functions, the runner including its callers and teardown, the new coverage tests and current witness/runner controls. Unchanged interfaces read include `shibuya_tools.py:147` physical exposure, `mcp_run.py:293` PNG scoring, and `native_diagnostic_tools.py:26` actual cvar readback. Installed primary-source reads outside the authored diff included `Engine/Source/Runtime/Renderer/Private/GlobalDistanceField.cpp:425`, `Lumen/LumenScene.cpp:77` and `:261`, `Lumen/LumenSceneGPUDrivenUpdate.cpp:69`, and `Engine/Classes/Engine/Scene.h:1790`, under the installed UE 5.8 directory.

## R20 — P2: final-export path errors retain the process coverage override

At [Content/Python/shibuya_tools.py:701](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/Content/Python/shibuya_tools.py:701), output resolution and path/suffix validation occur before the `try` whose `finally` calls `_finish_capture()`. With an active full-crop capture, `export_capture("artifacts/unreal/final.txt", finish=True)` raises at the validation branch and never restores the prior clipmap extent or destroys the capture actor. The process therefore retains 7500 cm and `_capture`, although the caller asked to finish. Resolution errors have the same structural bypass. This contradicts the promised cleanup on every failed finished export; it is independent of whether the ordinary driver currently constructs valid paths.

Move all final-export operations that can fail, including path resolution and validation, under the finish cleanup boundary once an active capture has been established. Preserve the rule that `finish=False` keeps a valid active capture. Add invalid-suffix and outside-directory final-export controls against the actual helper body, requiring the observed prior extent, released actor and cleared active state after refusal. The existing test at `tools/unreal/test_coverage.py:172` exercises failure inside native export, after this gap, and therefore passes despite it. This finding is based on direct control-flow inspection; no new test execution is claimed.

## R21 — P2: shutdown-time byte drift can keep a successful diagnostic receipt

At [artifacts/unreal/visual-review-repairs/run_native_coverage.py:192](C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/visual-review-repairs/run_native_coverage.py:192), final input and saved-asset hashes are recorded after native shutdown but are never compared with the initial dictionaries. The earlier comparison runs before shutdown, and `passed=True` has already been assigned. A Config or asset change made during shutdown therefore appears in the receipt while leaving success intact. Startup/shutdown-generated configuration has already been an observed integration concern in this task, so this is a relevant acceptance gap.

Make final inventory comparison a required acceptance condition after cleanup, including missing/unreadable files, and report the changed paths. Preserve a failure receipt if a hash cannot be read. Exercise the actual driver boundary with a mock shutdown that changes an input and a saved asset; both must invalidate success, while unchanged bytes retain the bounded successful-diagnostic result. Root's independent final hash comparison can bound a one-off diagnostic, but does not repair this driver.

## Coverage mechanism and admission checks

The helper reads coverage policy from the native component after assigning its existing exposure/Lumen baseline and before applying the candidate. `_lumen_capture_policy` reads current properties and cvars, rather than echoing requested values. The opt-in then sets explicit scene/trace distances of 240000 cm, scene detail 2, surface-cache resolution 1 and process first-clipmap extent 7500 cm. It verifies the immediate cvar readback. The original baseline is retained separately, and start/warm/final observations read the current component again.

The runner binds the independently requested opt-in mode, all four PP overrides, extent 7500 and base clipmap count 4 to actual observations. It requires finite original settings, one consistent original policy across captures, and an observed restoration to that exact original extent before scoring. The tests cover 18 invalid policy mutations, missing/failed restoration, changed original settings, live property changes, restoration to a nondefault 3125 cm prior, startup failure after a capture at 7500 cm and native export failure. `_finish_capture` releases active state and attempts actor destruction even if restoration raises. R20 is the missing boundary around validation before that mechanism is entered.

Installed `GetNumGlobalDistanceFieldClipmaps` starts from the configured base count and can add two for Lumen according to final PP view distance. `GetGlobalDFClipmapExtent` doubles the first extent by index; six clipmaps at 7500 cm give a last extent of 240000 cm. The ordinary software `GetCardMaxDistance` uses that extent; hardware tracing can select a different limit. The retained actual SM6 log independently says ray tracing was disabled by `r.RayTracing=0` at `editor.log:1035`, rather than merely reporting hardware capability. The next run still needs its own actual selection evidence. This source reading supports the bounded software experiment; component observations alone do not establish resolved render-thread PP, adequate SDF precision or pixel coverage.

The analysis receipt distinguishes complete actor AABB distances from visible triangles or illuminated pixels. It reports 31/26/8/2 AABBs within 200 m for the previously populated views and none within 800 m for the southeast crop. The preceding native receipt SHA-256 `5c80169ae14fb20ed492d56d3fda3a53a7eb80ab5eaacf0cbce141fde792538e` and real SM5/SM6 log digests match the analysis references. Its observed crop refusal and dark crossing remain failures, not coverage acceptance.

No change to fixed cameras, photos, geometry, sun, exposure, gamma or darkness thresholds appears in this coverage delta. Current-view positive SDF/mesh-card/card counts remain prerequisites. The native driver commands and reads back its GI-on/off cvar through `control_cvar`; each production arm requests the same full-crop policy and passes the same current-state and exact-image checks. It records the separate fixed-six darkness result and always leaves appearance acceptance false. Positive cards alone cannot pass visual acceptance.

## Integration and remaining work

The cleaned engine INI preserves GameMode and actual SM6 target selection and removes the generated Android block present in round 8. The later two-line `Config/DefaultEditor.ini` EnhancedInput startup guard and the runtime/project integration are explicitly outside this six-file review; root retains their ownership and must bind them in the native run. No claim about the new runtime DLL or ordinary Play behavior is made here.

The next native evidence must establish actual settings, fresh resources and pixels at every fixed view, original-byte conservation through shutdown, successful owned-process cleanup and individual image review. Scene detail and the coarser expanded SDF can alter coverage or shadow detail; the hypothesis is not accepted until native results resolve those limits. R20/R21 remain open on this exact target.

Only this authored report and authorized ignored target copies/inventories were written. No implementation or project setting was edited. No persistent process was launched, so no reviewer-owned engine/browser/GUI process remains. The retained copies are needed for open findings and the next focused review.
