# Review54 — launcher v4 rejected for native admission

Review owner: launcher_alternative. Reviewed 2026-09-19 in isolated read-only worktree `artifacts/launcher-v4-review/wt`, at `82ee91772f9533ab3e8661f73af2eb4eb1e2bd3c`. No candidate or tracked file was changed. The complete author handoff is copied under `author-target/`; `target-verification.json` rehashes every one of its 127 frozen members. This review rejects the current cleanup mechanism within a documented, permitted exit-before-close schedule. It does not report an observed native Windows incident, prove its frequency, or reject every possible BrowserServer-based design.

**P1: retained BrowserServer ownership does not preserve the identity used by its Windows PID-tree kill after the original process exits.** Candidate `capture.mjs:60-71` calls public `kill()` after observation without gating that PID-based API on usable ownership authority. Lines 73-80 also start public `close()`, whose installed SDK implementation can reach the same kill through its own 30-second fallback. A retained JavaScript object is not proof that the original native process handle is still open. In the tested schedule, both routes address foreign replacement PID 222. The later joins and honest incomplete capture cannot undo that foreign stop. The original v3 is also unsafe through the SDK's hidden 30-second fallback; this is not claimed to be a wholly new v4 regression.

The result is supported by unchanged candidate execution, extracted exact SDK and installed Node bodies, and official native lifetime sources. Two independent adversarial controls reach the disqualifying action: `adversarial-results/v4-exit-before-close-public7s.json` and `adversarial-results/v3-exit-before-close-sdk30s.json`. Both assert one foreign-PID stop, zero raw child kills, and no final manifest before the original stdio and late acquisition settle. Their checked verdicts mean that the counterexample assertions passed, not that either launcher passed safety acceptance.

## Target and source pins

| Input | SHA-256 |
| --- | --- |
| Author `HANDOFF.md` | `fc21306993109cc98f25a74d991e821aac89847100cb2964f486eede40d20f52` |
| Author `freeze.json`, 127 members | `ac2503dd64a4d01db758f4ee9cdaa60e098bf6b267b68aa1e62073fd94101de9` |
| V4 `candidate/capture.mjs` | `feb9825c2ebbd8b10aa078ed4de172c2672077ed1351ae5ae21f47e6e2f2e06a` |
| Candidate freeze before scoring | `05488d763fc47c09121b3aeaca697cd0d6de015e3899bc452b410abd62476898` |
| Candidate patch | `36519af242cda3420fe7950a1ae0d226f3d10d9c941b703f34373e0ae6e01f04` |
| V3 capture | `71acc4f9f81a7de7ccaf10cb8ce673af3632c1dc8a08de02c30fe1810e4a78bb` |
| Admitted instrument freeze, 48 members | `154e9d833f36cdd21d713936f9f05e2325a0a3cd33da766b3851464fd538e12d` |
| Admitted public-kill factory | `796b75e01960a2da5f1127d1a8ea28acf707effd9df81346ed8e813b1442f914` |
| Installed Playwright 1.63.0 `coreBundle.js` | `549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171` |
| Exact `launchProcess` extracted body | `cb9833009cf4475cb15a70e216b4ea58727ed99c9dd4644f1f7a243ea48b7ebb` |
| Exact `closeOrKill` extracted body | `a4eee5dc00557a9d28d7a33ef03e53eb5953419a426184947e4351e6fed4cf3e` |
| Installed Node v24.12.0 internal/child_process | `6bf1a45face617fcbdb45741db5ba86f395d84a95164d596a92d837e30df5845` |

The installed SDK sets `processClosed` only in its `close` listener (`coreBundle.js:9361`). Its `killProcess` guard (`9393`) checks PID, `killed`, and that flag, then Windows invokes `taskkill /pid <pid> /T /F`. It does not check `exitCode`, creation identity, or a retained native handle. `killAndWait` (`9430`) joins profile cleanup. `closeOrKill` (`39831`) can invoke the same kill after its 30-second race; public BrowserServer mappings are at `57210-57214`. The exact source bodies are extracted at execution time with asserted anchors and whole-core digest, and preserved in `sdk-runtime-fragments.json`. `node-runtime-fragments.json` retains exact local Node onexit, maybeClose, and kill bodies and their individual hashes. No downloaded source was executed.

## The permitted lifetime schedule

The locally installed Node onexit body records exit, requests `_handle.close()`, clears `_handle`, emits `exit`, and counts one close contribution. Its `maybeClose` emits `close` only when all contributions arrive. Its ordinary `ChildProcess.kill()` uses the retained handle and returns false once that handle is absent. Node documents that `exit` may precede stdio closure, and that multiple processes can share stdio. Thus the ordinary ChildProcess handle guard must not be attributed to Playwright's separate taskkill command. [Node v24.12.0 child-process documentation](https://nodejs.org/download/release/v24.12.0/docs/api/child_process.html#event-close).

The official Node v24.12.0 libuv Windows source distinguishes exit callback, process-handle closure, and stdio lifetime: `uv__process_proc_exit` at lines 770-803 calls the exit callback; `uv__process_close` at 807-823 schedules endgame; `uv__process_endgame` at 826-835 closes the native process handle. This supports scheduling handle release while a separate inherited pipe remains open. The VM explicitly models this native endgame; it does not run libuv C. [Version-pinned libuv Windows source](https://raw.githubusercontent.com/nodejs/node/v24.12.0/deps/uv/src/win/process.c).

Windows keeps the process object and its PID while the process runs or any process handle remains. After exit and closure of the final such handle, that identity may be reused. The model expressly requires all original process handles to have closed before replacing PID 222. It does not assume that the exit event itself guarantees PID reuse, that reuse must occur, or that an open native handle can change identity. [Microsoft process-ID lifetime explanation](https://devblogs.microsoft.com/oldnewthing/20110107-00/?p=11803), [Microsoft CloseHandle contract](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-closehandle).

The schedule retains late context acquisition, lets original parent 222 exit, advances native handle release, assigns a foreign process PID 222, and keeps the original stdio close pending. At the 120-second work deadline, v4 starts public close; its seven-second escalation reaches the unchanged SDK guard and addresses the replacement PID. In v3, the raw-parent escalation is skipped because `exitCode` is already 0, but the pending SDK close reaches its 30-second fallback and addresses the same replacement. Taskkill's `/pid` selects the current numeric PID and `/T` extends the action to its children. [Microsoft taskkill contract](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill).

**Original descendant 333 then exits on an independent scheduled event and releases the inherited stdio. Its exit is not caused by the foreign taskkill.** The fixture's taskkill effect removes only foreign replacement 222 and records that unsafe action. The separately triggered `drainOriginalStdio()` removes original descendant 333 and emits `close`, allowing SDK profile cleanup and late context disposal to finish. Final empty owned rows and the v4 clean-within-contract receipt therefore do not establish that taskkill disposed the original child. Foreign sentinel 444 survives in both arms. The counterexample is complete before that independent drain event.

The fresh v4 observations are present, but observation after parent exit bypasses parent-row validation and uses previously admitted ancestry. The adversarial case returns an empty known subset, so no identity-safe PowerShell stop is invoked. Separately, the author controls for CIM refusal and timestamp mismatch do correctly mark observation unknown and capture incomplete while continuing public cleanup. Their shifted timestamp is an observer mismatch with the original process still alive; it does not test real replacement. The public cleanup's numeric PID authority is the failed boundary in both cases. A failed observation alone is not proof that the original retained native handle became unsafe.

## Independent bounded checks

All replay inputs were copied before execution into `replay/`; result destinations were initially absent. Commands used `node --experimental-vm-modules` with no actual process effects in the VM. Five admitted suites and the independent adversarial suite exited 0:

| Entry under `replay/` unless stated | Result and bound |
| --- | --- |
| `controls/baseline/launcher-v3/control-final.mjs` | 22/22 control verdicts, including eight expected old-v2 reds |
| `controls/v4/control.mjs` | 11/11 control verdicts; original 22 plus these 11 remains the fixed 33 denominator |
| `controls/descendant/control.mjs` | Six separate schedules: two delayed descendants and four observation outcomes |
| `instrument/descendant-control.mjs` | Both old-v3 red schedules reproduced, preserving surviving child 333 and foreign 444 |
| `instrument/factory-check.mjs` | Three installed-SDK mechanism checks, including tree route and profile join |
| Own `adversarial-control.mjs` | Two asserted foreign-PID counterexamples, old 30-second and candidate 7-second routes |

Within the admitted schedules, v4 removes raw parent kill, inventories before close/escalation, waits public kill and profile cleanup, retains late handles, waits delayed HTTP listen, drains closure promises, and denies complete capture after failed observation. All 36 synthetic shots occur only in appropriate full-work arms. The prior Review50 identity evidence is separately transferred through exact frozen bytes: 11 classifier cases and the earlier 13-invalid/3-valid timestamp exercise were not rerun as native controls here. None of those passing bounds covers the new exit-before-close replacement schedule.

Four helpers and the 36-shot controller block remain byte-identical; the shot-block digest is `0740096d5e2a9d31168d5baf1d884b8cc3118398b3d58b27dbcb58bddfafa56b`. Author checks retain the exact helper digests and original freezes. The intended future 44-frame gait adapter is a separate input adaptation, not an accidental denominator defect and not accepted by this review.

Private control preparation initially failed on CRLF-sensitive extraction anchors, before target scoring. The derivative harness was normalized to LF, then the Node kill-body end anchor was corrected; neither target body nor admitted instrument was modified. One attempted command consequently encountered the then-missing derivative module. Those preparation failures are not counted as product failures or passing controls. Official-source fetch attempts for two additional Node C++ wrappers failed; the conclusion uses available version-pinned libuv, the local exact runtime fragments, and the official documentation above. All referenced web sources were read on 2026-09-19; no remote-content hash or downloaded executable is claimed.

## Mechanism constraints and disposition

Any successor must address both explicit seven-second escalation and the SDK's implicit 30-second, rejection, and repeated-close routes, preserve late acquisitions and cleanup joins, and keep unknown observation incomplete. Merely skipping the explicit kill leaves the hidden route. Merely setting a `killed` flag suppresses behavior without proving disposal. A fresh CIM row also cannot by itself hold identity across a later numeric-PID operation. This review does not prescribe an incremental candidate repair.

Two distinct routes remain worth bounded design work: hold independently owned native process identity handles through all PID-dependent operations, or establish a kernel-owned job/group before descendants can escape. The first must prove handle acquisition has no identity race, retain all required authority until cleanup ends, and account for descendants; retaining a root handle alone does not prove their disposal. The second must prove assignment before child creation, behavior under assignment failure and nesting/breakaway, complete group disposal, and joined profile/API completion. These are plausible investigation routes, not accepted designs. Reusing a runner that eventually invokes the same SDK body does not by itself remove this boundary.

No browser, localhost server, GPU session, native stop, dependency change, or full repository gate ran. Real Chromium handle retention, pipe inheritance, PID reuse timing, and native cleanup remain unmeasured. The evidence rejects the current PID routes under the stated possible schedule; it neither asserts a native incident nor proves all BrowserServer strategies impossible. All tool-owned CPU commands ended; no native task resource was created or left running. The read-only worktree has no tracked change. Its ignored report, copied handoff, scripts and raw evidence are intentionally retained for root disposition because the finding is unresolved. No commit, merge or push is claimed.
