# Review 50: implementation

## Target

Independent review by Codex `motion_review` in `artifacts/gait-v2-review/wt`, detached at `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`, which was main when this workspace was created. Two separately bound targets: ignored F27 ordered stationary-turn controller v2, and the earlier ignored launcher v2. Root owns disposition; no production code or primary data was changed.

F27 author directory: `artifacts/walking-path-v2/artifacts/gait-v2/`. Freeze SHA-256 `476c1ce163b1705b1a80aec01e2c68b398852805cdb8b5a1e98ef9af1dd97eb6`; controller `59d833ec8da1a8bbc89822ebd871b1a4b160d018dc9ab9b09b5cb46b8d1fc4e6`; patch `40de70895d9a95ef3a60b8f9b8ee7e510119e4c8ec1f27a15f9f500200b05ec4`. The exact handoff is [50_ordered-gait.md](../snapshots/50_ordered-gait.md), SHA-256 `d82bff262289b3c72dadad5ad241a2f53f75dbb420f2d006b02b05fd5f37d032`.

Launcher author directory: `artifacts/walking-path-v2/artifacts/launcher-v2/`, bound by the earlier repair freeze `51b30d2c0fd81215eb3f7750d66fa3c33d35d331237a333bea83f753ceba7061`. Capture SHA-256 `e730dc825b188f891fed42480e98cb0db96971ae2d38752cc24bdafa74c9a734`; process snapshot `265a3bddef722cba0ba6d8f5d290fee558250771e5aabc85b899bd75241a0ca3`; ownership classifier `bd66b368ee652aa722b5347e36fe301d0231c4accd5cb00a61daacf731d272b8`; date helper `631dce48b61f48a3a589830b639913e4a16446b303a2c0d46c8277e5b5f99908`. The exact authored context is [50_launcher-v2.md](../snapshots/50_launcher-v2.md), SHA-256 `dab9d2657bf24fc032e20fd27ebd2b45e21f6856699432bf26a01d385810b56f`.

All 41 gait files and ten launcher files were copied byte-for-byte under `artifacts/review50/`. Both old controller bytes and the author's first failed interval checker remain intact. Review46 and Review48 retain their original hashes and conclusions.

## Reviewers and coverage

Codex `motion_review` authored neither target. I inspected the actual controller and launcher source, their deltas, manifests, retained counterexamples, reference bindings, case denominators and control instruments. I reran the bounded CPU controls and added actual-API proposal/denial checks plus browser-free lifecycle controls. No additional CLI reviewer was invoked or counted.

The controller review uses the retained real source rig and drawable vertex selection on an explicit flat analytic support fixture. The launcher review uses actual `powershell.exe` for this review's own live Node identity and synthetic inventories for classification. Its deadline probes execute the exact frozen capture ESM body with in-memory resource factories. They never launch a browser, server or GPU, and never invoke a process-stop action.

## Reports

### Codex motion_review

**Accept the bounded F27 controller repair. Reject launcher v2 for material F28. These are separate verdicts.**

F27 now commits an admitted landing without starting another flight in that update. A subsequent update beginning planted may propose a departure from that committed position and zero derivatives. In the preserved cancellation case, v1 lands and redeparts at tick21 under an `advance` label. V2 lands at tick21 and proposes departure at tick22; event-based and label-based denial now agree and preserve the committed landing. Denying an advance preserves the prior airborne state. Admission occurs before adoption, and mutations of the callback's proposal/draft copies do not alter the committed foot geometry.

The emitted trajectory describes the actual selected flight, including retarget/freeze choice, p/v/a and yaw derivatives, origin/deadline, apex-split vertical pieces and any held remainder after the flight ends. Independent evaluation against the actual `advance` API at five interval fractions passed 14,520 component comparisons across twelve finite cases, maximum difference `5.551115123125783e-17`. Those cases cover both turn signs, ordinary 60 Hz and explicit end-crossing updates, plus departure/landing denial: 258 observed of 450 planned updates/initial poses, with the remaining tails ending at expected refusals. Twenty proposal intervals include an end hold and 44 include split vertical pieces; these counts include proposed full flights.

The retained six-schedule checker also reproduces 360 advances, 18 departures, 48 changed targets, 224 frozen updates and 18 apex-split updates. It checks 9,472 components with maximum error `7.022160630754115e-14`. The first checker incorrectly expected cancellation only when absence began. The existing controller freezes on every absent-request update; the corrected read-only checker models that inherited rule. Both versions and the original red stderr are preserved. This instrument correction did not change or rerun the author's controller candidate.

The full-rig evidence is bounded and reproducible: seventeen arms plan 2,057 poses and observe 1,879. Only two expected swept-foot refusals end early, each observing 32/121; their 178 tail poses are unobserved. The remaining fifteen arms observe 121/121. Completed ordinary turns now align at tick63 instead of v1 tick61; delayed references align at65 instead of63. The extra two updates implement the ordered separation and are not disguised as physical/source travel.

The rerun retains 1,191,286 sole observations, 3,032,706 whole-shoe observations, maximum planted drift 0.115307 mm, zero measured minimum-Y error and penetration. The 2,546,324 full-body comparisons have maximum packed error `1.527920298187881e-7` m. No-turn baselines match 242 states and 232,320 matrix values exactly. Wrong-reference, calf perturbation, injected slip/penetration, suppressed departure and ignored-withdrawal controls retain their expected results. These finite measurements do not establish naturalness or arbitrary-body/world collision safety.

**F28 — The capture deadline can finish cleanup before its resource acquisition finishes.** `Promise.race([run(), deadline])` rejects without cancelling or joining `run()`. In the delayed-build control, the 120-second callback fires, `finally` completes and writes a final manifest, then the build resolves and creates a server and browser. Neither receives cleanup. In the delayed-launch control, `finally` closes the already acquired server and writes the manifest; the pending launch then returns a browser which receives neither close nor retained-handle kill. This is resource creation after cleanup, not harmless outstanding calculation. The exact source body executes in both controls; only I/O, time and resource factories are doubled. No real leak was created.

The UTC ISO repair itself passes: actual Windows PowerShell emits seven fractional digits; the observed live identity survives `owned` and `remaining` round trips. A different final fractional digit is rejected by the PowerShell identity comparison even when JavaScript parses both to the same millisecond. Thirteen malformed dates are refused, three valid dates pass, and eleven synthetic cases cover live ancestry, exited/recycled parents, known surviving children, creation order and exact executable selection. This does not repair the asynchronous lifetime defect or establish complete real-browser cleanup.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F27 | Same-update landing/redeparture could disguise a new flight as an advance. | Reproduced on exact v1; v2 passes the bounded independent controls. Recommend scoped controller acceptance. | Retain ordered commit, actual trajectory and denial controls; production and visual acceptance remain separate. |
| F28 | Deadline/finally can precede a late server/browser acquisition, leaving it unclosed. | Material launcher rejection; root accepted both reproduced cases. | A separately frozen launcher v3 needs independent re-review before GPU capture. No v3 acceptance is included here. |

## Verification

- All 41 gait and 27 earlier repair-freeze entries rechecked unchanged; all 28 reference/local executable pins matched before and after the CPU replay.
- Ordered v1/v2 control: sixteen arms, 528/1,056 observed poses; old counterexamples reproduced and all eight v2 arms pass. Full seventeen-arm replay and corrected recorded-interval check pass. All nineteen emitted JSON result files match the author's retained files byte-for-byte; only two local import paths were adapted for the deeper review output folder.
- Independent actual-API twelve-case probe passes; actual PowerShell identity/selection controls pass. Both unchanged-source deadline controls reproduce F28. Raw probes/results are under `artifacts/review50/` and bound by this round's evidence freeze.
- Original Review46 remains `a131349800e63f7a2878b0afb3ef95a270077614862cf45e1495e650d2d1360e`; Review48 remains `a1c34b373cb3b4351e15b95f2227398d1b96b07fbc34414b5f9a6204cac90657`. No implementation fix was made during review.
- No full gate, install, HTTP, shared data write, process-stop action, renderer or native visual inspection ran. Commands exited. No task-owned browser/server/GUI was launched. The review tree and ignored evidence remain intentionally retained for handoff.

## Round outcome

F27 is accepted within the ignored stationary-turn component's finite analytic CPU contract. Launcher v2 is rejected for unresolved F28, so this round grants no capture approval. No production wiring, source-policy approval, accepted walking support, slope/step/sole generalization, turn-to-walk handback, city naturalness, appearance or performance conclusion follows. Root retains integration ownership; launcher v3 requires its own round.
