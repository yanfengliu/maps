# Review 19: implementation

## Target

Context retirement and witness preparation. The nine-file context-retirement increment, source freeze `a8b4e520b8c74c989048ffdd0a34bce2c1f0c06eb3f51431a36997d3a65cf3e7`. Its original source base is `636bff7dca10f00dc3ada892ebb7005cfa815c92`, production tree `e927e99a0e72885b0851fe69af8458dfaa971e6f`; main was observed at `7f8aeac`. The actual renderer-identity cache is retained.

The exact target is `artifacts/graphics-lifecycle-rethink/context-retirement-20260913/handoff.json`, SHA-256 `3ff5fce9f45ac82b6118dc350b1cabd33c8957d0befdf5aadc7a08c778a50498`. Reviewed text sources are retained byte-for-byte under `artifacts/network/retirement-pose-checkpoint/candidate-01/recovery/source/`; the consolidated `recovery/reviewed-source.patch` has SHA-256 `dd2fe770ac1368dbf21ee7bf3bd3033f2564f03b8141f63633c94478fa0114d9` across 61 source files for this checkpoint. The additive patch uses LF transport; exact copies and normalized reconstruction records preserve the original bytes and line endings. Raw output, source assets and earlier counterevidence remain ignored at their pinned handoffs. No experimental code is promoted by this document.

## Reviewers and coverage

/root/assets_review authored the report below independently of the implementation. Root separately read its substantive findings and accepted only the dispositions stated here. The report is `artifacts/graphics-retirement-review/report.md`, SHA-256 `bef5aa1be8260255493049767163570311cb768bb1b0876369daf7344aa13887`; its handoff is `11627d1b2638eeadf38ecec1a184019f0813086e68f2e79f644182ac383607e4`, sealed at `2026-09-13T11:46:14.2388248+00:00`. The wrapper is authored by the network worker for root's review; it does not alter the reviewer's body or claim additional independent work.

Rounds 18–23 follow the six handoffs' recorded seal times on 2026-09-13, not completion of their underlying implementation work. The original ABBA review and focused re-review remain separate rounds. The full authored text is embedded with ATX heading depth increased by three; inverse transformation is checked byte-for-byte. Local finding labels and priorities are preserved verbatim; permanent IDs occur only in the wrapper dispositions.

## Reports

### /root/assets_review

<!-- authored-report-start sha256=bef5aa1be8260255493049767163570311cb768bb1b0876369daf7344aa13887 -->
#### Context retirement — independent CPU review

2026-09-13. Reviewer: `assets_review`; integration owner: root. This is a bounded read-only review of the frozen graphics context-retirement increment. No candidate source, main source, Git state, browser, server, GPU, build or benchmark was changed or launched. Review files live only in `artifacts/graphics-retirement-review/`.

The frozen implementation has no material source defect identified by this review. It is suitable for the next preparation step. The tiny real-extension witness is a sound bounded diagnostic design. The proposed city witness is not yet ready for a browser run: its navigation-trigger scheduling and deletion-race handling still need a concrete implementation and CPU review. Neither this conclusion nor the passing CPU tests establishes that context retirement fixes the unchanged city's 15-second navigation failure.

##### Exact target and verification

The target is `artifacts/graphics-lifecycle-rethink/context-retirement-20260913/worktree`, source freeze 2. Its original source base records `636bff7dca10f00dc3ada892ebb7005cfa815c92` and production tree `e927e99a0e72885b0851fe69af8458dfaa971e6f`. Main was observed at `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`; the concurrent dirty main tree is not the review target.

| Target | SHA-256 |
| --- | --- |
| `handoff.json` | `3ff5fce9f45ac82b6118dc350b1cabd33c8957d0befdf5aadc7a08c778a50498` |
| `source-freeze-2.json` | `a8b4e520b8c74c989048ffdd0a34bce2c1f0c06eb3f51431a36997d3a65cf3e7` |
| Author `report.md` | `058197fdd9eeb9b079ca9856a521da476646042f7bac9badd4b1a1831101af78` |
| Author `source.patch` | `f16dc0b3bb6e3b2ad53a8c625a34160fb78b99bf27d81c360060f6a2c5927357` |
| `src/app.ts` | `dcb614c00f778d70e9f406e1a7e44f650d5c5b40c393b6145cb322e656187ceb` |
| `src/main.ts` | `5d47d0e981baed0939952b3479dbd8daa111aca5cc2d5d816f96cf647c5f4ffb` |
| `src/render/finalize.ts` | `4ede488e6f1702a0cfd0d9fcd8b8641ea6d1d3a2d1f18c4f1dfe71740fd4e582` |
| `src/render/renderer.ts` | `3e8e6e10e72ef464b588080dd4a508534b6ab4d00fd2a39ce8f535ae3f6d7311` |
| `src/render/retire-renderer.ts` | `020dc829542d5d66ad672d7c25a5da58d7dc517663aff603b35798e4257a3a77` |
| Installed Three `build/three.module.js` | `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a` |

`pins-before.json` and `pins-after.json` independently verify byte lengths and hashes, rather than accepting manifest summaries. Both checks cover all 225 frozen source records (2,197,246 bytes), all 379 handoff records (15,074,606 bytes), all 16,719 current source/data/runtime records (2,003,701,960 bytes), and all 10,565 original copy inputs (1,501,590,518 bytes). The closing check additionally reads and verifies every one of the prior ablation's 16,724 records (2,011,631,617 bytes), whose manifest hash is `232bf763e1273c6486f4c881fe38c442f6e96080ef4d3586032d6eb4e38d3883`. All match. These overlapping denominators are separate verification sets, not a unique-file total.

Comparing original source pins with the frozen target confirms exactly nine changed paths: the five implementation files above and `test/app-lifetime.test.ts`, `test/main-lifetime.test.ts`, `test/renderer-acquisition.test.ts`, and `test/renderer-retirement.test.ts`. All other frozen source records match the original candidate, including the bridge, ordinary lifecycle spec, Playwright recording configuration, rendering/style source and data recipes. The original bridge hash remains `c8fd7eabc13ab0869bf6b2b9a7d02550753808735c7bf00dddcad0233cf3a66d`; lifecycle spec remains `4be1bec2a6833841852b435604e04ad067320a4d9fd7219de88e5c960b874561`; Playwright configuration remains `54151e8f19b1778e6fbf8e1aee189d165fc7ca909b6480629461c39508e6ba69`.

##### Behavior reviewed

I read all five implementation files, their surrounding acquisition/use/disposal routes, all four new test files, the retained runner and mutation instruments, and the installed Three implementation. Acquired finalizers are registered before later fallible work. App/main disposal is idempotent. App cleanup continues through independently failing owners and still attempts renderer retirement. Renderer configuration and app/main setup failures retain the original thrown object or place it first in an aggregate with cleanup failures. Late async owners are released once after disposal; a prior loading rejection stays the loading error while late cleanup errors remain explicit. This is ownership of returned resources, not access to a factory's private allocations before it returns.

The revised app first latches `contextLost=true` on an observed event, then distinguishes an intentional retirement request from an unexpected loss. `onLossObserved` also latches the flag synchronously from `gl.isContextLost()` before the queued event may arrive. Disposal keeps readiness false independently of whether loss is supported. An unexpected event before the force request, including an event during earlier owner cleanup, remains an error. Intentional retirement does not restore the context. Unsupported, already-lost, successful loss and supported no-op failure remain different outcomes. The previously false terminal loss flag is fixed in this exact freeze.

Installed Three's `dispose()` removes its canvas context listeners, disposes its internal managers and stops its animation loop. It does not itself request context loss, erase the extension cache, or invalidate the `getContext` closure. `WebGLExtensions.has()` and `.get()` share the cached extension object. Installed `forceContextLoss()` calls that object's `loseContext()` method. The post-dispose call therefore has a source-backed route to the same extension. Internal Three disposal is itself sequential and can fail partway; the helper's `finalizeAll` still attempts the extension afterward, but cannot claim that every private Three sub-disposer completed.

One native-event qualification matters: while a renderer is active, Three's own installed context-loss listener calls `event.preventDefault()`. The app's mock-event tests establish that the app does not add that action and continues reporting active loss; they do not establish that a real active canvas event has `defaultPrevented=false`. A normally completed Three `dispose()` removes that internal listener before intentional loss. The candidate adds no `forceContextRestore` call or active-loss suppression. This upstream behavior does not invalidate the scoped repair, but a real-extension witness should report the event it actually receives.

##### Checks and limits

The reviewer copied and hash-verified all 225 frozen source records to its own directory. The native Vitest config loader and an isolated cache were the only runner changes; source and test bytes were unchanged. The retained cleanup body came from the author's bounded runner. `worktree/artifacts/cpu-focused-strict/run.log` records **90/90 tests in five files passing**: 46 app lifetime, 20 bridge identity, nine renderer retirement, nine main lifetime and six renderer acquisition. The closing pin check confirms all 225 reviewer-copy source records still match the frozen source. No source restoration was necessary because the reviewer did not mutate source.

`extension-probe.mjs` adds five CPU checks using installed `WebGLExtensions`, the installed `forceContextLoss` method body, and the exact frozen helper through Node's TypeScript loader. It checks shared extension identity across `has/get`, one correctly bound delegate call after disposal, preservation of two independent thrown error objects, rejection of a supported delegate that leaves the context live, and separate already-lost/unsupported observations. All five pass; outputs and actual console outcomes are in `extension-probe.json`. These controlled contexts cannot measure a GPU or native destruction timing.

I checked the author's raw process exits and test/file denominators for all 22 indexed CPU runs. The final retained typecheck exits zero and the full retained unit run is 341 tests in 38 files; I did not repeat that broader suite. The 14 accepted mutation classes each have an assertion failure in raw stderr, a nonzero exit, a frozen before-hash and a restoration record. The source now matches those restoration claims. The first omit-force control remains separately `unavailable` with 48 failures over its earlier 86-test denominator; it was not counted among the 14. Its later admitted rerun has 49 failures over 90 tests. This is an evidence/instrument review, not a new execution of all 14 mutations.

No build or real browser was run. No claim is made about native GPU teardown completion, the ordinary city's 15-second navigation, replacement readiness, visual appearance, resource peaks, process memory, or performance. The cached-identity and screenshot-disabled ablation failures remain counterevidence; neither is converted into success by this CPU review. Private allocations inside factories that fail before returning and private operations skipped inside a throwing leaf disposer remain outside the outer ownership mechanism's guarantee.

##### B0 — city witness trigger is unfinished preparation

**P2 preparation requirement, not an implementation defect.** The author's report proposes a witness child with at most 120 seconds of life "around the navigation step," but the cited `read-active.mjs` is a one-shot read of complete records, not an owner that detects the step and schedules that child. Starting it with the lifecycle run would finish long before the observed navigation. Guessing a delay would turn a missing marker into an ambiguous scheduling race.

The retained screenshot-ablation trace provides concrete trigger records. I read `worktree/artifacts/playwright/lifecycle-navigates-away-f-0b768-thout-blocking-page-cleanup-chromium/trace.zip` under `artifacts/graphics-lifecycle-rethink/screenshot-ablation-20260913`, SHA-256 `bfe38eb460337416b2dc1ec54d7d3696e928879bdf87c86c3cce3e7567ae51fd`. In `test.trace`, `test.step@9944` starts the exact title `ordinary navigation completes cleanup within 15s` at monotonic time `878511.258`. In `1-trace.trace`, `call@11` is initial `Frame.goto` to `/?time=dusk` at `1768.499`, and `call@19813` is `Frame.goto` to `/?time=noon`, with `timeout:15000`, at `878511.867`. The interval is about 14.6 minutes. These retained complete records establish a source for a trigger; they do not prove that live flushing and deletion will always make it observable in time. The existing reader hash is `b815eb3a71c7f9ef17cd6a88b8f2e0e61d6de95663fd31259202d2cc525c650c`.

Before a city run, prepare and review a concrete owned trigger. One bounded design is for the already long-lived, owned lifecycle supervisor to tail only this run's active trace files during setup, identify the complete navigation-step/`Frame.goto` record for the first city's known context, and start the at-most-120-second witness child with that file identity, header, call ID and byte offset. The supervisor must retain a small pre-trigger/backfill window so a loss record appended between detection and child admission can still be read. This is an option to implement and review, not an implemented reader or permission to run one.

The preparation must establish all of the following through CPU controls before root accepts it: it can distinguish initial and replacement navigation; long setup cannot exhaust the short child's clock; a marker already appended at spawn is recovered; split/truncated lines do not become JSON records; multiple contexts and stale traces cannot supply the marker; buffers and wait duration stay bounded; and marker deletion, missing files, unsupported loss, failed cleanup or failed admission remain explicit unavailable/failed results. Reads must permit concurrent writers and deletion; holding a Windows file open without delete sharing would alter the default retention behavior being tested. A supervisor must not spawn a series of unowned or overlapping readers.

The existing ordinary spec remains unchanged: real dropdown and camera input through both styles and all hero distances, 15-second `page.goto`, then 60-second replacement-frame readiness. Keep the original tracing, screenshot, snapshot, source, retry and reporter policies. The retirement marker must be bound to the first page's actual context and that navigation, and nearby cleanup failures must remain visible. A marker alone cannot prove all prior finalizers succeeded: `finalizeAll` deliberately permits the force operation after an earlier failure. A lost marker and the ordinary lifecycle outcome are separate observations. If the marker races away, record unavailable; do not rescue it by changing retention or calling into the browser.

##### Minimal real-extension witness

The proposed tiny owned headless page is appropriate once its exact preparation is reviewed. It should load the installed Three and candidate helper bytes, render the stated small triangle and verify its pixel result, observe the actual extension and a live context, then delegate through the real extension object. The actual installed `forceContextLoss` route must be used, with an observable single `loseContext` delegation after `renderer.dispose`. Test `false` to `true` lost-state transition separately from the queued event, with a finite observation deadline. Unsupported capability is unavailable; an available no-op or throwing delegate is a failure; already-lost is not delivery. Do not call restore or prevent default to obtain a preferred result. Keep any observation wrapper scoped and restored, and close the context, browser, server and owned process handles in finally cleanup.

That witness can establish the JavaScript/API route and real extension response for a tiny context. It cannot establish native resource destruction timing or successful retirement of the full city. The unchanged city lifecycle remains a later independent gate. No browser authorization is implied by this review.

##### Resource closure and handoff

The first reviewer Vitest launch encountered denied CIM access in the sandbox. Its direct Node process, PID 46116, was terminated and its exit confirmed using the retained launch handle. The failed attempt and empty logs remain retained. The approved strict-inventory rerun passed; its held Node and esbuild processes exited. An unadmitted conhost and one exited-before-admission transient were not assumed closed from an empty or denied query.

`closure.json` records a fresh successful CIM and listener inspection at `2026-09-13T11:43:10.0712616+00:00`: all nine recorded review execution IDs, including the omitted conhost/transient, are absent; no current child of those recorded IDs or process with the review path is reported; port 4319 is closed. Every direct single-process probe has a retained-handle finally record and a 120-second cap. The fresh snapshot cannot reconstruct a historical child that was never observed during the first denied inventory, and the report does not claim otherwise. No browser, GUI application, server or GPU process was launched by this review.

The unneeded isolated Vitest cache was removed after checking its resolved absolute path stayed within the owned review directory. `cache-cleanup.json` records that action. All frozen-copy inputs, probes, raw run logs, failed-attempt evidence and authored conclusions remain intentionally retained for root's handoff. No candidate, original evidence, dependencies or unrelated outputs were changed or deleted. Root owns the decision to prepare the tiny witness and concrete city trigger, then authorize and inspect any subsequent build/browser run.

<!-- authored-report-end -->

## Findings and disposition

No material implementation defect was reported. Root accepts the bounded CPU retirement result. The local B0 note is an unfinished city-witness preparation requirement, not a newly assigned production defect. Later B0 findings are preserved separately in Review 23.

## Verification

The independent reviewer passed 90 focused tests and five installed-extension checks, inspected the retained 341-test and mutation results, and verified the named source/runtime inventories. It launched no browser. The source-backed dispose/force-loss route does not prove native resource reclamation or the unchanged city navigation outcome.

Preparation of this documentation checkpoint checks the exact authored/source pins, reversible imports, scoped document headings and links, blob/secret/diff limits, and separate HEAD/WIP preservation. It runs no browser, benchmark, code build, five-gate sequence or source repair. Review 11 remains open. Primary WIP also retains rounds 2, 4 and 12 that are absent from HEAD. This checkpoint neither invents those missing committed rounds nor claims a whole work-docs continuity pass.

## Round outcome

The CPU retirement increment is accepted for its finite ownership and API-call contract. A tiny delivery witness and concrete city reader require separate preparation and verification. No graphics code or city gate is accepted by this round. Current delivery status remains in [the plan](../plan.md).
