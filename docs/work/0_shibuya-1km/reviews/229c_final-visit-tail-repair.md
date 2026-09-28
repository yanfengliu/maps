# 229c: final vehicle visit tail release

Bound: the reproduced integration 238 clean authority regression and the final vehicle factory visit on existing directed source routes. This is a CPU authority and receiving-space repair, not road support, obstacle clearance, visible population, overtaking or performance acceptance. The default opening and the 3,000-pedestrian/200-vehicle, 60-fps-at-1080p target remain unresolved and unchanged.

Primary 238 passed build, types and audit on successor 235 but its full unit gate passed 819/820. The final clean 80-second assertion in `test/population-authority.test.ts` reported 91 authority violations for 60 pedestrians and 12 vehicles at seed 0x5b1b0a. The rejected 20-file code digest is `5caf4d7369b7612003726f1d4aa8d819e7c9072e0a67630589d0bf24f1069e7a`; its manifest and all earlier witnesses remain retained.

## First cause and existing exit

Existing population trace, diagnostics and admissions snapshots identify vehicle 11, generation 1, taxi scale 0.9836058837920427, owner `junction:walk:1033547236:0:0:ground0`. Its unchanged 12-edge route begins at `lane:1336649818:0:0:ground0:f:0:section0` and ends at `lane:404515763:0:0:ground0:f:0:section1`. The factory has one visit, entry 1 through lastConflict 10. The ungoverned terminal edge starts at 104.401763259 m, is 8.277189594 m long, and ends at the true AOI boundary.

At tick 1921 the body was clear at 107.053471490 m and the old admission observer released its lease. At tick 1955 the same body reached another disk of the same owner at 111.474478803 m, with no later source gate. All 91 violations are the consecutive ticks 1955–2045 from that one re-entry, followed by an in-place retirement. Lateral drift and lease expiry were not the cause.

At the 112.678952853 m endpoint the actual unchanged body still overlaps its owner. On the existing outward line, at the same final source heading, offset 2.0 m clears the whole body from both the AOI and all junction disks, within the existing 7.5 m retirement envelope. The repaired real population retires it at offset 2.081629159 m. No route point, source gate, owner disk, body dimension, scale or signal was edited.

## Repair

The existing analytic segment/disk helper now also computes one immutable `vehicleFinalRelease` record for the final factory visit, or its exact retained boundary prefix. Reversing each terminal-tail segment obtains its last possible contact with the same owner union expanded by the actual origin-enclosing body radius, validated lane offset and existing float32 rounding margin. The bound is conservative and finite on the existing source route. It is not a new physical-surface authority.

Route assembly retains the exact source passage object and `lastConflictIndex`. Admissions releases an entered lease only after the source window, the final-tail bound and actual whole-body clearance all pass. A route whose tail clears earlier can release before its endpoint. Receiving clearance uses that same final-tail bound, plus its existing receiving margin and outward-envelope segment when the bound reaches the endpoint. Earlier factory visits, mapped controls, never-entered expiry, unqualified callers and route budgets retain their existing behavior. No eligibility filter or demand selection changed.

Global scope: every newly body-validated vehicle route gets the final-visit bound where it has a final visit. This can conservatively retain its final lease and receiving space longer than the first clear sample. It does not merge future visits or change earlier visit release. It does not claim to solve unrelated physical contacts outside the represented visits.

## Checks and impact

The exact formerly failing named gate is green after repair. Eight affected suites pass 59/59, covering population authority, final tails, approach halts, body clearance, route halts, pre-entry controls, corridor refusal and vehicle runs. Types pass. The initial type run caught an exact-optional-property mismatch, corrected by omitting absent metadata; no runtime rule changed for that correction. A patch script also stopped on a text-decoding error before completing the first edit; its partial run retained the original 91-event failure, and the edit was then completed with UTF-8 handling.

Four new cases bind the exact released-gap-re-entry witness, exercise the real fixed-step producer through outward completion, reject an active or pending body on the previously omitted receiving tail, and prove an earlier-clear terminal releases before the terminus while earlier visits stay separate. Reintroducing premature release makes both actual-gap and real-producer checks fail. Omitting the receiving extension makes the contention check fail. Both mutations restore exact bytes in finally. Existing paired entered/never-entered expiry and mapped stop/yield regressions remain green.

The six-vehicle 600-tick ordinary workload has identical status and route IDs to 235repair: 4 active, 2 waiting, 0 violations. Portal identities remain 65 kei and 65 taxi out of 78, with 0 bus portals. In the exact 60-pedestrian/12-vehicle 4800-tick control, active/waiting remains 59/1 pedestrians and 5/7 vehicles. Vehicle completions change 9 to 10, in-place retirements 1 to 0, and violations 91 to 0. The real crossed counter remains 21 in both versions; total retired/reused remains 12. This corrects a broken retirement, not a throughput or population-completeness claim.

A retained diagnostic counterfactual that skipped observations produced crossed 20. That was probe behavior; it is not the repaired product result. The real implementation continues all observations and reports crossed 21. The counterfactual and old 91-event trace remain separate evidence.

Evidence is retained under `artifacts/supported-opening229-20260927/integration238-repair/`; the exact successor files, input hashes, repair diff and evidence hashes are sealed separately. Network, fleet and 80,890-byte vegetation inputs remain at their reviewed hashes. No fetch, source regeneration, dependency change, browser, GPU or server ran. Independent re-review and all final primary gates remain pending. Work is uncommitted in the assigned traffic-turns worktree.
