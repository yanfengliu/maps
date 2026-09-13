# Review 15: implementation

## Target

This round records the actual independent R2 completion-verifier re-review at base main `7ec174246983d4122bd60ab1c46ada04d55709ac`. Its frozen target is `artifacts/network/app-motion-native/observer-v4-r2/r2-freeze.json`, SHA-256 `e6df061d6908de3694bd50985968f83cbd41de2f2b07da71228c7ccbdfd885d4`: 211 owned records and six external pins. The code remains an ignored diagnostic candidate; this documentation checkpoint neither ships the observer nor integrates vehicle motion.

The changed launcher `run-native.ps1` is `678770d52cfc20a7a5fdbc64fb6f4623012a30646ddfb6adf1642517177dd594`; `verify-output.mjs` is `ef55c06d8c7f845e0e47ca528316a797e5a057cb2912d3de9c7f5aa165f8ba5a`; new `verify-completion-evidence.mjs` is `5d20fd527f0ea8695f4109fff2b35e814c50475d91344b13f667eb9c59b77e64`. The response collector and retained process-owner logic are unchanged. Exact reviewed text-source copies are preserved under `artifacts/network/documentation-proposal-r2/source/`; recovery patch `reviewed-source.patch` has SHA-256 `73a1e8b61dc2c80d4b5a8a896e9842b34a2242a22e87857a6cf21fb833046333`. Its 45 complete files are normalized to LF only for patch transport; copies retain exact bytes. This is a recovery patch for ignored diagnostics, not a production patch to apply. Raw fixtures and run inputs remain at their sealed handoffs and must be retained until a later reviewed source target makes them recoverable.

## Reviewers and coverage

The network worker authored the repair. The realism worker independently copied the frozen target, read the writer and both evidence verifiers, and replayed the serializer and response/completion controls. It also authored the preceding F12 finding, but did not implement this repair. Root separately read the repair and full independent report, verified the reported source/copy closure, and reran the 44 response plus 110 completion controls. Root's disposition is distinct from the substantive authored review below.

The report is embedded in full from `artifacts/network/response-review-r2/review.md`, SHA-256 `f823345170d4a6f6130faede30b0f52127b082b008aff6f94d2532b9dc45baf1`. Only Markdown heading depth changes by three levels. A checked inverse transformation recovers the exact original text; its byte-exact copy remains in this checkpoint's ignored `originals/` tree. Independent handoff SHA-256 is `391b6ff5cdb115180b6678979fafc85220ee84e5862956731aaccdbbdc5adaae`. No browser capacity test, live cleanup verification or unseen native image review is attributed to this round.

## Reports

### Realism worker: independent R2 completion-verifier re-review

#### Independent R2 completion-verifier review

The realism worker independently reviewed `observer-v4-r2/r2-freeze.json`, SHA-256 `e6df061d6908de3694bd50985968f83cbd41de2f2b07da71228c7ccbdfd885d4`, at main `7ec174246983d4122bd60ab1c46ada04d55709ac`. This worker authored the preceding R1/P2 findings and did not implement the repair. Only new ignored review copies and outputs were written. The original R1 findings, R2 author target, app, source, data and graphics diagnostic freeze remain unchanged.

##### Decision

The P2 completion-prerequisite finding is resolved within the declared producer/result-consistency contract. I found no new material issue in the exact repaired writer and verifier. The response-evidence repair also continues to reject its original failure classes when complete cleanup and binding prerequisites are supplied. This is scoped CPU and source acceptance, not browser capacity, actual cleanup, native motion, graphics-gate or integration acceptance.

##### Exact change and source assessment

The launcher change wraps the existing `remainingKnown`, `port4319` and `newUnclassified` serialization values in arrays. The ownership/identity checks, retained-handle termination, nonzero-exit behavior, deadlines and launch command are unchanged. The raw old null/object outputs remain preserved. A legacy null inventory now explicitly fails the new result contract; it is not silently converted into successful cleanup.

The new completion helper requires the successful numeric cleanup exit, timestamps, nonempty retained identity/action observations, a completed cleanup observation for each retained identity, and no named contradictory cleanup failure. All three final-inventory fields must be explicit empty arrays. Missing, null, singleton objects and nonempty arrays no longer establish closure. This validates the declared artifact structure; it does not independently observe the live operating system or establish resistance to a coherent rewrite of every artifact.

Input verification now requires the exact reviewed app-freeze digest, typed unique before/after source/runtime records and their required categories, and recorded file bindings for served inputs. It independently compares the full retained records and reconciles the actual changes with `after.changed`, `rawChanged`, `unclassified` and `outputs`; the summary flag must be literal true and is insufficient by itself. The only admitted changed record is an append to the exact preexisting Chromium log for the bound headless-shell revision. Its resolved path, complete before/after hashes, retained raw bytes, actual prefix and claimed append record must agree. Source/runtime changes or absent/malformed evidence fail. The scope is consistency of the authentic binder's declared inventory and retained files, not independently discovering an entirely omitted coherent input universe from these artifacts alone.

The response helper is unchanged from the accepted R1 response repair. It still requires the 11 ordinary responses exactly once, source identity, status/completion/encoding/length/SHA, finite observations, no retained issues, strict successful body/context cleanup, the exact requests alias and independent page/CDP HTTP multiset. The final verifier invokes both prerequisite checks before recording the native manifest/frame bytes.

##### Independent controls and their bounds

I ran the exact copied writer-expression script with synthetic objects at old/new cardinalities zero, one and two. It executes only the source-extracted serialization line, without any process inventory, launch or termination. All six outcomes passed: old zero/null and singleton/object were reproduced; new zero/one/two yielded arrays of the correct length. Result SHA-256 is `bf2824703e2eee67613546d81dbf7513fc3f31774a330319f8d5614b28082b56` at `replay/network/app-motion-native/observer-v4-r2/reviewer-serialization/results.json`.

The exact 44 response controls passed: 10 expected acceptances and 34 refusals. The fully consistent positive passes. Negative controls retain complete recorded runtime/source prerequisites and explicitly fail if an early `Completion evidence:` error substitutes for their intended response-validation path. This prevents the new stricter prerequisites from making the original response tests vacuous. Result SHA-256 is `ea9e0e46a0132f97672d6fb2d9c55087c9bca74c77bf90232a9d6277caf6697c` at `replay/network/app-motion-native/observer-v4-r2/reviewer-responses/results.json`.

The exact 110 completion controls passed: 33 expected acceptances and 77 refusals. They replay the previous 19 witnesses against old/new verifiers, then replay complete equivalents that isolate each prerequisite class, and test adjacent cleanup, runtime-record and actual log-prefix cases. The old minimal fixtures' broad refusal is not offered as proof of their individual classes. Their complete equivalents preserve the one ordinary positive and reject all 18 negative cases, including legacy null under the new array contract. Actual newly serialized zero is accepted; one and two remaining entries are rejected. Exact retained debug append is accepted while changed prefix, wrong metadata, missing raw bytes, wrong revision/path and contradictory classifications fail. Result SHA-256 is `7616e4ce50d3564a72e72aa552027b7421767049d9d90476954f9e1565827d46` at `replay/network/app-motion-native/observer-v4-r2/reviewer-completion/results.json`.

All runs were serialized owned CPU children with 120-second deadlines. Serialization took 0.615 seconds, response controls 9.302 seconds and completion controls 31.572 seconds. All exited 0. The exact three PIDs, 5700, 11968 and 3188, were absent at the fresh read-only lookup at 2026-09-13T07:03:18.1691428Z. No browser, server or GPU process was launched. Node was `v24.12.0` and the writer used the observed installed PowerShell 7 executable. `checks.json` SHA-256 is `ef250217c045cdaf6933db42c726e7bf11bd12bce39be2311809ef9640a69c21`.

##### Preservation and handoff

All 211 owned R2 freeze records and six external pins matched before copying. The wider review copy manifest contains 3,708 exact source/fixture records and 975,232,819 logical bytes, including the retained earlier witnesses. Its SHA-256 is `1ab86d33d78b3b08463717c66baeed57c99cbedf141f8ced74aafcfbb7fb1b15`. Duplicate PNG files link only to review-owned image copies. The replay's recursive preservation census includes those additional holding files: 672 response fixture records includes 72 new review-owned image holders, and 3,226 completion fixture records includes 342 holders. The original populations remain 600 and 2,884; their bytes were not changed. These reused images validate artifact handling and do not depict 18 real executions.

Exact source pins: `verify-completion-evidence.mjs` is `5d20fd527f0ea8695f4109fff2b35e814c50475d91344b13f667eb9c59b77e64`; `verify-output.mjs` is `ef55c06d8c7f845e0e47ca528316a797e5a057cb2912d3de9c7f5aa165f8ba5a`; the launcher is `678770d52cfc20a7a5fdbc64fb6f4623012a30646ddfb6adf1642517177dd594`. The result handoff binds this report, exact source/input manifest, commands, logs and returned evidence. Capacity experiments, ordinary native motion runs, the unresolved graphics lifecycle, all five code gates and final main integration remain separate requirements. No commit or source promotion occurred in this review.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F11 | The old v4 result checker trusted aggregate response flags and could accept missing or contradictory response records. | Prior scoped context: the R1 response repair validates actual record identity, bytes and independent page/CDP coverage. This round replays its controls with complete prerequisites; it does not invent another review of the earlier target. | Retain the original four false-completion witnesses and the later complete equivalents. Live collector capacity and all required native vehicle cases remain separate. |
| F12 | The R1 result checker could declare completion from missing or malformed cleanup inventories, absent digests, contradictory classifications or changed runtime records. | Root accepts the independent R2 repair within authentic producer/result consistency. Stable array serialization and independent record/prefix comparisons replace the missing prerequisites. No material finding remains in this exact scope. | Preserve the original null/object writer outputs and old false acceptances. The actual wrapper already returned nonzero for known remaining processes; these witnesses do not prove it reported a live leftover as clean. |

## Verification

Root freshly ran 154 controls: 44 response checks and 110 completion checks, all passing their expected outcomes. Root result digests are `61087343ad5cbaae69625a5d8b75774570788f7fb543710da72aee11478c5103` and `94db930140604685bab1dcb04f15f5e802bd1006d63e91075476c896c7ffc026`. Independently, the reviewer ran the same 154 controls plus six source-extracted old/new PowerShell serialization controls. Response negatives reject through their intended response path after complete prerequisites; the stricter completion check does not turn them into vacuous early failures. The fully consistent positive and exact retained Chromium debug-log append pass. Missing, wrongly shaped or contradictory evidence fails. The report records source preservation, Node 24.12.0, finite CPU deadlines and fresh absence of the owned CPU PIDs.

These synthetic records reuse retained images and do not depict eighteen actual executions. The original v3 run produced seven frames for one incoming-kei case, then failed response-body evidence collection; that is an observer failure, not a demonstrated failure of the vehicle flow. Root inspected those seven native frames within their finite bounds. The remaining seventeen executions were not completed. No inspector-buffer cause is established before the separately reviewed and authorized live capacity comparison.

The repository work-document checker remains nonzero on the preexisting round gap: it reports "expected round 11, found 12." Round 11 is the active, unfinished graphics review. This checkpoint neither fills it with a placeholder nor renumbers any authored report. The six required sections and exact authored-text import in this new round are checked separately; a green whole-repository documentation check is not claimed.

## Round outcome

F12 is resolved for the exact R2 writer and result-verification contract. Root accepts this actual re-review as a documentation checkpoint. The bounded response-record checks remain accepted as prior context. No code, app, capacity measurement, whole-vehicle run or population acceptance follows from this round. Graphics Review 11 remains open: the complete default 44-view gate and native inspection are unfinished. Subsequent capacity/native instrument repairs require their own source review and live verification before the vehicle checkpoint can pass its remaining gates and land on main.
