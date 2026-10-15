# Independent E7 actual diagnostic review

Reviewer: `branch_review`. Date: 2026-10-15. RuntimeW base: `33d386299ff7bd02d91bca38f655f41597ddb756`.

Verdict: **ACCEPT the observed normal four-case/eight-arm NONSCORING diagnostic only. No material result finding.** This closes the specific E6-JOIN-1 deterministic diagnostic prerequisite for considering a separately leased E7 private18. It grants no execution lease, private18 result, full-reader correctness, or production acceptance.

This is a separate actual-result review, not a rewrite of the static E7 review. The full original stdout, empty stderr, saved result, all eight complete rows, Root caller/prelaunch/lease/closed packet, current selected source bindings, and current conservation were read. `result-basis.json` retains the complete original result/rows and stdout alongside exact pin comparisons; `current-conservation.json` retains all current protected-file and cache comparisons. The original packets, static review, and historical freeze records remain untouched.

## Actual result and evidence binding

| Original artifact | Bytes | SHA-256 |
| --- | --- | --- |
| Root closed packet | 6622 | `d72e0d775d7125fd489aad173e60f7721f63d66edfdffb690dc50e5508c93959` |
| Root caller receipt | 2935 | `975d2c5e7218e86fa4934f3a7decde479de61eef18a97ecb37ea8f7d45b89363` |
| Root prelaunch receipt | 12924 | `7ffb235d8f0a45aea6ff3f8089c32ce61aff968bd8bd1da653c04dd26adf5a90` |
| Root one-execution lease | 1976 | `5573e03928f9c22bc46005fa57f377fd785afa3ceaf541e73fafa19ab86c7b6c` |
| Complete stdout | 2444 | `d82f7af35e5a8205eb2629c76c1085605b112e36983656f40872ad4ecaa9c32d` |
| Complete stderr | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Saved `result.json` | 16570 | `7d400b0b9c2c926cd2e3ef60763bd81431dd2b9edd2aaf35c3b62a71716c7d31` |

The raw stdout contains exactly one complete STARTED record and one complete FINALLY record. Both, the saved result, and Root's closed packet identify PID37148 with full creation FILETIME `134365380540460491`. The caller records that same exact integer identity 0.0054499 seconds into the held run. Actual seven argv/cwd match the reviewed v2 recipe. STARTED and the saved result bind the reviewed 14350-byte C# source, SHA `45cfa81e9b2e71db4c12764ff07cccefe9d08135ad09d0fb95c8bd93b7cbf835`; the result binds the exact v2 authority. FINALLY's actual file pin equals the complete saved result's freshly recomputed length/hash and original path. FINALLY need not duplicate every input: the source/authority chain is checked through the pinned original result and STARTED, not inferred from its PASS text.

The saved result and FINALLY agree on state, complete rows, direct counters, derived totals, null primary, and empty secondary. The record explicitly grants neither private18 nor production credit. The actual admitted Utility binary module path/name and selected manifest/DLL pins match the reviewed v2 binding. With the unchanged driver assertions, successful output supports that the direct import, CmdletInfo implementing-assembly checks, JSON acquisitions, one Add-Type call, and actual result readback succeeded in this bounded diagnostic. This is no transitive loaded-byte or different Runtime18 consumer proof.

## All eight actual observations

| Case | Initial decision / cause | Old result | Repaired result |
| --- | --- | --- | --- |
| 1 | Already terminal / fault | Joined; zero close errors; original fault reference | Same |
| 2 | Pending snapshot then inline terminal / fault | Joined; exactly one AggregateException cleanup error; original fault reference | Joined; zero close errors; original fault reference |
| 3 | Already terminal / cancellation | Joined; zero close errors; canceled task and original token | Same |
| 4 | Pending snapshot then inline terminal / cancellation | Joined; exactly one AggregateException cleanup error; canceled task and original token | Joined; zero close errors; canceled task and original token |

Every row has one actual constructor, TCS, Run, first-decision call, and terminal-set attempt/completion; actual task identity is unchanged. Late rows begin `WaitingForActivation` with a false captured decision, perform one inline hook, and finish with the required real Faulted/Canceled status. Precompleted controls capture true and perform no hook. Fault rows retain the exact original IOException object, including the declared case message; cancellation rows observe TaskCanceledException with the original canceled token. Unexpected method error fields are null in all eight rows. Both required old late RED witnesses are present; no repaired row has a close error.

The result records one compiler attempt/completion for the two reviewed probe classes, eight constructor/Run completions, two fault objects, two created/canceled cancellation sources, and two completed CTS disposals. TCS totals are eight creations/terminal sets, four fault sets, four cancellation sets, and four inline hooks. Four Wait and Remaining counts are exact-source branch deductions; eight GetAwaiter observations derive from actual retained causes. They remain labeled deductions rather than independent instrumentation. Row shared-clock values are monotonic10–49ms, with the final shared clock64ms, and all eight report the same clock identity. No result field substitutes for the observed old RED controls.

## Normal physical observations and limits

Root's caller receipt records exit0 and complete real-zero-EOF capture after1.4630576 seconds, with stdout total=retained2444 and stderr total=retained0, no stream error or sticky overflow. It records successful reap, both streams and the process handle closed, null primary, no secondary, and no recovery. The one cleanup interval is0.0001057 seconds; the caller receipt records1.4916163 seconds before writing its own record. These normal observations are within30 held including startup/preflight/cold compilation, TOTAL15 cleanup, and outer60. The result16570 and raw streams are below their65536/1MiB refusal caps. Root's later known-PID observation records OpenProcess error87/ABSENT; this reviewer performed no process query and does not extend that recorded observation to unrelated or opaque processes.

The physical caller implementation was not frozen as a selected artifact. This review accepts the supplied normal completion observations and their consistent complete bytes, not a general correctness certificate for that caller. Timeout enforcement, interruption, tree kill, held-handle fallback, overflow/fault recovery, and exceptional cleanup were unexercised. No recovery claim, opaque detached-child proof, runtime/OS thread census, or transitive startup/compiler/implicit-I/O closure follows from the small elapsed time or empty recovery array. The inline seam also does not exercise a genuinely blocked Wait, every scheduler interleaving, or full reader disposal.

## Conservation and next phase

The independent current probe rehashed all1577 protected files plus the ten frozen author/static-review occurrences,1587 checks total, and all38 cache memberships match. All fourteen current Runtime source roles match, including the13957-byte full helper, the31595-byte pack, the3294-byte Runtime invocation and its6357-byte authority. Their pins, the43 production ranges and candidate1027/1026/83989869 preservation basis remain unchanged. Only the declared diagnostic attempt directory and its single original result.json are present. The private18 inner and outer attempts and real candidate/runs remain absent.

The old E7 freeze's diagnostic-output-absent statement is retained as historical evidence. Its now-consumed diagnostic namespace is not a fresh-output requirement for private18 and was not repinned or rewritten. Private18 uses its own exact current Runtime14 invocation/authority and fresh inner/outer output paths. The diagnostic source was compiled, but the13957-byte full reader was not. Full reader/ownership/API behavior, private18's18/21/max20 population, normalarm5000ms, coldcompile/pack30/TOTAL15/outer60 fit, FIFO/report bounds, and actual control outcomes remain unrun.

Root may consider a new serialized one-pack private18 lease after reading this review and freshly verifying that phase's current host/script/cwd/input pins, output absence, and owned bounded capture/cleanup mechanism. The closed4/8 lease grants none of that execution by itself. E5's unbuffered production-pipe throughput RED remains unresolved; the private read-ahead timing model and this terminal-task diagnostic do not prove production timing fixed. Wire/FIRST, product, Source/Native and Unreal acceptance remain closed.

Only own guarded static data/hash/metadata checks ran during this review. No retry, selected helper/import/binder/compiler/clone/control/checker, process query, gate, GUI/browser, or external CLI review ran. No old/canonical/main file or cache was written. Direct utility streams close in finally; no worker, reader thread, or helper process was launched. Authored output is confined to this fresh ignored actual-review namespace and retained for the next review boundary.
