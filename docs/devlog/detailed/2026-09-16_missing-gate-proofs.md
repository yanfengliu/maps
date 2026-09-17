# Devlog — 2026-09-16

The second unit of the same session, on the same branch: a gate whose header and whose commit message both named a proof in `docs/learning/gate-proofs.md` that was never landed there.

## A gate claimed a recorded proof that only existed in an unlanded worktree

**Timestamp:** 2026-09-16 17:05–17:45

**Action:** `test/vehicle-spacing.test.ts:24-27` says "Made to go red by restoring the origin-to-origin separation the car-following law used before this change (`delta` instead of `delta - halfLengths` in `buildVehicleFrame`'s clearance). The mutation and the message it produced are recorded in `docs/learning/gate-proofs.md`", and `5e8c266`'s message repeats it. On `f4e96f0` that file contains no such entry — no `halfLengths`, no `origin-to-origin`, no vehicle-spacing section at all. The entry existed as 42 uncommitted lines in the worktree `artifacts/spacing/wt`, off base `ff64d17`. Rather than copy it, the mutation was reproduced here on the current revision: the two `- halfLengths` terms dropped from `buildVehicleFrame`'s `clearance` in `src/agents/population/vehicles.ts`, nothing else changed. The entry was then landed in `gate-proofs.md` with this revision's numbers, and the defect register gained the interpenetration defect, which it had never recorded.

**Result:** under the mutation `npx vitest run test/vehicle-spacing.test.ts` exits 1 in 2.96 s:

```
AssertionError: expected [ …(5) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "tick 475: kei#15 into taxi#17, 0.120 m of oriented-box overlap at a -4.009 m origin gap, headings 0.0 deg apart",
+   "tick 480: kei#15 into taxi#17, 0.303 m of oriented-box overlap at a -3.825 m origin gap, headings 0.0 deg apart",
+   "tick 485: kei#15 into taxi#17, 0.479 m of oriented-box overlap at a -3.649 m origin gap, headings 0.0 deg apart",
+   "tick 490: kei#15 into taxi#17, 0.648 m of oriented-box overlap at a -3.480 m origin gap, headings 0.0 deg apart",
+   "tick 495: kei#15 into taxi#17, 0.809 m of oriented-box overlap at a -3.319 m origin gap, headings 0.0 deg apart",
+ ]
```

Restoring the two terms: `1 passed`, in 2.56 s. The same mutation through the run-level instrument, `node tools/agents/vehicle-spacing.ts --vehicles 200 --pedestrians 0 --ticks 3600`, exits 1 with `31 overlapping oriented-box pairs between bodies travelling the same direction at tick 2925` and `deepest same-direction oriented-box penetration 2.224 m (taxi#27 into taxi#98)`, against `"maxOverlapPairs": 0`, `"maxPenetrationM": 0`, `"verdict": "pass"` on the fixed revision. The unlanded entry records different numbers for the same mutation — first overlap at tick 470 with 0.044 m — because it was measured on a different base with that lane's own source changes in the tree; the current revision's numbers are the ones that landed.

**Reasoning:** the numbers could not be lifted from the unlanded entry even though the entry is substantially correct, and not only because the base differs. The mutation is minimal on this revision: the rest of `5e8c266` — the lateral filter that stops a body braking for the one beside it, the spawn clearance and `HALT_CAPTURE_M` — is still in place, so dropping the two half-length terms reproduces the defect class at reduced magnitude (31 pairs, 2.224 m) rather than the review's original 120 pairs and 4.147 m. An entry quoting the review's numbers next to a red control that produces 31 would have been two claims pretending to be one, which is the exact shape this unit exists to remove.

**Validation:** the source is restored byte-for-byte (`node probe/reinstate-spacing-defect.mjs restore`, `git status --porcelain` empty). The entry landed in `docs/learning/gate-proofs.md` in the file's shape — gate, landed, mutation, failure, bound — and the test file's header was left unedited, because the claim it makes is true once the entry is where it says it is. The class, not the instance: every claim of the form "recorded in `docs/…`" in `test/**` and `src/**` was checked against the file it names. Four refer to `gate-proofs.md`; three hold — `test/visual-instrument.test.ts:444` (the `p1-stale-certificate` behavioural control in entry (1)), `src/ui/attribution.ts:22` (the "frame that did not render" entry and its re-measured 2.20 floor), `src/world/building-attributes.ts:36` (the sentinel entry) — and the vehicle-spacing one did not, which is the finding. The other doc-path claims in those trees name `docs/work/0_shibuya-1km/design.md`, `docs/reference/facade-emission.md` and `docs/policies/local-rules.md`, all present, or an ignored `artifacts/` report; two of those artefact paths, `artifacts/populated-capture/REPORT.md` and `artifacts/population-cost/report.md`, still exist, while `artifacts/gate-integrity/` has been reclaimed and now holds only `commit-message.txt`.

**Code reviewer comments:** the coordinator found this one, from the commit message, not from the test suite. Nothing local could have: the suite is green either way, since the missing artefact was prose in a header. The check that would have caught it is the one run here — a grep for the claim and a read of the file it names — and it is cheap enough to be worth repeating whenever a gate's header cites a record.

**Notes:** two adjacent status claims were found false while doing this and are reported rather than edited, because both are status. `docs/learning/gate-proofs.md:270` says of the five instrument findings "**Not merged.**" while the section, the code and the chain are all on `main` at `f4e96f0`, landed by `966930e`; the worktree it names, `artifacts/gate-integrity/wt`, was reclaimed during this session, so `gate-proofs.md:270`'s `mutation-logs/` path and `src/harness/teardown.ts:11`'s `probe/pagehide-visibility.mjs` path no longer resolve. Missing scratch is the documented cost of the reclamation rule; a "Not merged" line left standing on `main` is the same defect as the one this entry is about.
