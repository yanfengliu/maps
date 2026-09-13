# Review 21: implementation

## Target

Tiny real-extension witness preparation. The frozen seven-route 64×64 tiny witness and owned runner preparation at declared main `7f8aeac`, using the exact retirement helpers reviewed in Review 19. B0 city preparation was excluded.

The exact target is `artifacts/graphics-lifecycle-rethink/retirement-witness-prep-20260913/tiny-handoff.json`, SHA-256 `c3ee4bd04b6d57b29dbde3cf62067c0a08bbda178dbdbfc454a57712c2c427df`. Reviewed text sources are retained byte-for-byte under `artifacts/network/retirement-pose-checkpoint/candidate-01/recovery/source/`; the consolidated `recovery/reviewed-source.patch` has SHA-256 `dd2fe770ac1368dbf21ee7bf3bd3033f2564f03b8141f63633c94478fa0114d9` across 61 source files for this checkpoint. The additive patch uses LF transport; exact copies and normalized reconstruction records preserve the original bytes and line endings. Raw output, source assets and earlier counterevidence remain ignored at their pinned handoffs. No experimental code is promoted by this document.

## Reviewers and coverage

/root/assets_review authored the report below independently of the implementation. Root separately read its substantive findings and accepted only the dispositions stated here. The report is `artifacts/graphics-tiny-witness-review/report.md`, SHA-256 `88daf1b13d97e73b260835d7a12b01428c37f1fd199e8998b028ade07fe1ba60`; its handoff is `1286fa36f2746d4dbb9b63ab4d8672ec1279f3082fd8d68e818f02a6fbcaf5fa`, sealed at `2026-09-13T12:34:58.6520866+00:00`. The wrapper is authored by the network worker for root's review; it does not alter the reviewer's body or claim additional independent work.

Rounds 18–23 follow the six handoffs' recorded seal times on 2026-09-13, not completion of their underlying implementation work. The original ABBA review and focused re-review remain separate rounds. The full authored text is embedded with ATX heading depth increased by three; inverse transformation is checked byte-for-byte. Local finding labels and priorities are preserved verbatim; permanent IDs occur only in the wrapper dispositions.

## Reports

### /root/assets_review

<!-- authored-report-start sha256=88daf1b13d97e73b260835d7a12b01428c37f1fd199e8998b028ade07fe1ba60 -->
#### Tiny retirement witness — independent preparation review

2026-09-13. Reviewer `/root/assets_review`; root owns integration and browser authorization. This is a read-only review of the frozen tiny subset at `artifacts/graphics-lifecycle-rethink/retirement-witness-prep-20260913`. It does not review or modify the concurrently prepared B0 city reader. All review writes are under the new ignored `artifacts/graphics-tiny-witness-review/`.

No material finding remains in the tiny proof logic or its declared source transformation. The subset is suitable for root's separately authorized tiny-run decision, subject to the run-admission and closure requirements below. CPU evidence is not real WebGL delivery evidence. No browser, server, GPU, production build, main/data change or Git mutation occurred in this review.

##### Exact target

| Artifact | SHA-256 |
| --- | --- |
| `tiny-report.md` | `30a75d74d8ae4d802200a9ee56cf5d6836441c9d2e4110b3166745b281cd15d7` |
| `tiny-handoff.json` | `c3ee4bd04b6d57b29dbde3cf62067c0a08bbda178dbdbfc454a57712c2c427df` |
| `tiny-inputs.json` | `3c672bf0442e5bc93fbba80231f953ccb0f9b8ef52c1e3ea9db5a82e93acf4e9` |
| `tiny-core.mjs` | `16aeeb88fe3bdf53f22a3dfb2456ae367b12fcf1482b66e53174c83554502666` |
| `run-tiny.mjs` | `78d85251c879146cee587d1b010831525a810248f1a979865250288f72009e50` |
| `run-tiny.ps1` | `a04113817ecb3a9d059ede2ec06d759ff9c2807f91b89e4b1d92889cabcaf0ea` |

All 25 handoff records, totaling 2,113,999 bytes, and all 6,162 input records, totaling 502,146,006 bytes, match their recorded length and SHA before and after the CPU checks. `results.json` records the checks. The input sets overlap; their totals are not a unique-file size claim.

The underlying retirement candidate remains source-freeze-2 `a8b4e520b8c74c989048ffdd0a34bce2c1f0c06eb3f51431a36997d3a65cf3e7`, against the declared maps base main `7f8aeac`. The earlier independent authority report remains exactly `bef5aa1be8260255493049767163570311cb768bb1b0876369daf7344aa13887` and its handoff `11627d1b2638eeadf38ecec1a184019f0813086e68f2e79f644182ac383607e4`; `prior-authority.json` verifies those anchors. This review does not replace that report or reopen product implementation.

##### Served closure and actual call route

I read the complete tiny core, page, HTML, source loader, runner, post-check, CPU tests, seal, wrapper generator and generated wrapper. The seven in-memory HTTP routes form a complete module closure: HTML, page, core, installed Three module/core, and the two frozen helper modules. An independent `es-module-lexer` parse confirms that every import resolves within those seven routes. There is no scene endpoint or product data replacement. The server returns only an exact GET route from this map.

Regenerating the served bytes with the pinned Node 24.12.0 strip-only TypeScript transform reproduces every frozen served hash. The actual `disposeRenderer` source is `020dc829542d5d66ad672d7c25a5da58d7dc517663aff603b35798e4257a3a77`; finalization source is `4ede488e6f1702a0cfd0d9fcd8b8641ea6d1d3a2d1f18c4f1dfe71740fd4e582`. The installed Three module remains `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a`. The review executes the emitted helper bytes, including their resolved relative finalizer import, rather than a handwritten helper substitute.

The real tiny page constructs a 64×64 Three renderer, renders one red triangle against black, requires a nonzero draw count, then checks a red opaque center pixel and black opaque corner pixel. Empty or failed reads cannot satisfy those checks from newly zeroed pixel arrays. This is an appropriate bounded render proof for this triangle, not visual inspection of the city or a measurement of native allocation.

The wrapper around the actual cached extension calls `Reflect.apply(originalLose, this, args)`. The installed `renderer.forceContextLoss` remains the route to it. It records receiver identity, delegate count, return/throw outcome and whether exactly one renderer disposal returned first. Geometry and material release precede that helper call. A failure from either release, renderer disposal, extension invocation or descriptor restoration prevents an observed result even if the context becomes lost. Acquisitions that fail before a factory returns remain outside caller access, with whole-browser closure providing the later process-level boundary.

##### Observation semantics and controls

Immediate `gl.isContextLost()` confirmation and the queued canvas event are separate observations. The observer reads `defaultPrevented` in a microtask after event dispatch, so a later listener's action is included. The witness adds no preventDefault or restore call. Installed Three's active listener can prevent an event; normal renderer disposal removes that listener. Reporting the actual defaultPrevented value is correct, and neither value alone establishes resource reclamation.

Unsupported extension capability is unavailable. Initially lost is distinct and still cleans up. An available no-op or throwing delegate fails. Synchronous loss with a missing queued event is unavailable. An event that observes a live context fails. A lost state after an earlier disposal error remains failed. Method/property descriptors are restored in finally, including deleting a temporary own property when the original extension method was inherited.

The reviewer ran 19 fresh CPU controls on the exact tiny core and served helper, using the installed Three forceContextLoss method body with controlled contexts. They cover normal and inherited extension methods, late-listener default prevention, unsupported/initially-lost/no-op/missing-event/live-at-event states, all five falsy renderer-disposal throws, a falsy delegate throw, configuration/render/material release failures, restoration failure and blank pixels. All pass. Successful cases restore descriptors and remove the witness listener; every acquired renderer in these cases is disposed exactly once. These are instrument controls, not simulated evidence of an actual browser run.

The author's 14-control record is also hash-verified and reports all controls passed, including its wrong-receiver and double-delegation mutations. The earlier 12-control result and its logs remain retained. No test, threshold or candidate source changed. `review.mjs`, `results.json` and the CPU stdout/stderr preserve the independent evidence, including the expected failure console messages.

##### Launch and cleanup mechanics

The declared wrapper replacements reconstruct `run-tiny.ps1` byte for byte from accepted wrapper `1f755954ccf7745bb9d43bb637ddda2504c033893cdf11f897ba015db5d9440a`; independent PowerShell parsing reports no errors. The changes are limited to explicit authorization/worktree guards, the 120-second tiny cap, fresh empty capture admission, tiny Node entrypoint and scope header. The exact-path allowlist, live-parent/creation identity checks, retained handles, strict CIM admission, omission records and finally cleanup remain copied. No broad kill or basename-only cleanup was introduced.

The Node runner binds its own server to loopback port 0 and records the actual bound port before navigating. It uses that owned address directly, so it does not attach to a pre-existing preview server. Browser launch and initial navigation have 15-second limits; the witness event window is five seconds; the owned outer wrapper bounds an unresponsive render/evaluation/close route at 120 seconds. Context, browser and server close in finally; remaining admitted processes are handled through retained identities. The browser's normal close also owns Playwright's automatic temporary resources, but native closure is unexecuted here.

The precheck output directory and initially empty capture directory must remain separate. `check-tiny before` writes a record, while the wrapper correctly rejects a nonempty capture directory. `check-tiny after` verifies input/served bytes and the runner cleanup-error array; it is an input check, not an independent native acceptance verdict. In particular, its zero exit does not convert an unsupported or missing-event witness into observed delivery. Root must inspect the child/wrapper exits, nested witness conditions, console/page errors, cleanup actions and omitted identities.

##### Conditions for a later authorized run

Root requires a fresh sole browser lease and separately owned precheck/capture directories. No command or `-Authorized` flag in this report grants that lease. Any unavailable process inventory, refused identity, unresolved omission, missing result or failed cleanup leaves native acceptance incomplete.

The actual ephemeral server port recorded in `tiny-result.json` must be checked after owned process closure. Checking ordinary port 4319 does not prove the tiny listener closed. A missing actual port is incomplete server evidence. Profile/temp paths must also be identified as task-owned, recorded and checked/cleaned after their process owners close. The current tiny result does not itself emit those paths; recording and post-closure accounting are therefore explicit run-admission requirements for root's later execution preparation. Never infer that an unrecorded temporary directory disappeared, and never remove a shared browser profile.

The tiny binder excludes generated Chromium `debug.log`. Root requires an owned precheck backup if that shared file exists, followed by exact append-versus-other-change accounting. This exclusion does not establish that older runtime manifests remain unchanged after a browser launch. Their before/after closure claims remain separate and must be reported honestly. The operating system, driver and complete PowerShell runtime are also outside the declared hash set.

Even positive real tiny evidence would establish delivery and an event on one small context using these exact sources. It would not prove native destruction timing, whole-city resource reclamation, the unchanged 15-second city navigation, the B0 reader, full44 visuals or the performance target. Those decisions remain separate.

##### Reviewer closure

The single reviewer Node child, PID 6952, finished with exit zero in about five seconds. Its wrapper retained the launch handle, imposed a 120-second cap and confirmed exit in finally. The review script has a 110-second cooperative limit and no child-process calls. Strict read-only CIM inspection at `2026-09-13T12:32:06.9448100+00:00` found that identity absent, no current descendants of it and no remaining process with this review path; `closure.json` records the boundary. No tiny listener was launched, so there is no invented ephemeral-port closure claim.

No unneeded cache or temporary build output was created. All review files remain intentionally retained for root's active handoff. The finite preparation review is complete and clean; root owns the separate native-run authorization and acceptance.

<!-- authored-report-end -->

## Findings and disposition

No material finding remained in the tiny proof logic or declared source transformation. Root accepts that finite preparation, including its explicit run-admission and resource-accounting conditions. It was not a native run verdict.

## Verification

The reviewer reproduced the seven served routes, passed 19 CPU controls and parsed the mechanically derived PowerShell runner. After this review, root accepted one separately authorized tiny runtime observation: a red triangle, exact extension delegation after disposal, observed lost state and queued event. The added outer reporter failed and did not write its historical closure ledger; fresh observed process/profile/port closure is separate evidence and does not repair that missing ledger. The owner report is `artifacts/graphics-lifecycle-rethink/retirement-witness-prep-20260913/tiny-native-20260913-1252/report.md`, SHA-256 `3e0d9fc2124e1b767d48a2c91e670b40bce65286b3e046f157f5d7951015ae01`, handoff `dab06da9aacfb9e9b1aeb10e6bb362ea73c0a792bc3346e196ab47157632bbb3`. This later owner observation is not an invented independent native review.

Preparation of this documentation checkpoint checks the exact authored/source pins, reversible imports, scoped document headings and links, blob/secret/diff limits, and separate HEAD/WIP preservation. It runs no browser, benchmark, code build, five-gate sequence or source repair. Review 11 remains open. Primary WIP also retains rounds 2, 4 and 12 that are absent from HEAD. This checkpoint neither invents those missing committed rounds nor claims a whole work-docs continuity pass.

## Round outcome

The finite tiny preparation is accepted. The subsequent small-context delivery and current closure evidence remain bounded by the failed outer reporting record. Neither establishes native memory reclamation, city disposal, B0 correctness or the 15-second/60-second city gates. Current delivery status remains in [the plan](../plan.md).
