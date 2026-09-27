# 173: R169-1 pre-entry mapped-stop repair candidate

Bound: one admission control-selector repair, pinned all-class source regressions and the existing finite authority/lifecycle checks. This is an uncommitted candidate awaiting independent re-review 174 and root integration. It does not establish continuous driving, support, crowd safety, capacity, lane-change safety or visual/native acceptance.

Owner 173 resumed the existing traffic-halts worktree at base `17476b4e7e2f0b537f2d6780ce2b24e83d860a7c`. Root returned the source write lease and authorized this narrow repair. AGENTS/local rules/lessons and the full independent 169 report were inspected. No source or data in another worktree was edited; no commit or push was made.

## Rejected source and review preserved

Before editing, all eight candidate 165 source/test/fixture files were copied byte-for-byte to `rejected165-source/` and checked against the original candidate manifest SHA-256 `a8692e6451324ae092f2736ede9e9a7a634fd6467a24dd53cce30a28aa412691`. `rejected165-manifest.json` binds that recoverable snapshot. Candidate 165 remains rejected, not retroactively approved.

Independent 169 REPORT remains `49b4a9f8e7a0dd98e7354ff93ed10c339f84923ea1f7711f0c3f116c331ea525`, seal `0347d2623688e3281d9d469e806225f6ac4f411070662238f9a03ce549fde6a2`. All 42 sealed worker 165 artifacts, 23 review 169 artifacts and 10 review 161 artifacts were verified before the repair and again at final freeze. Shared network/fleet inputs and passage/footprint source files also remain exact. The rejected eight-file snapshot remains independently reproducible without reconstructing edits from prose.

`candidate.json` binds ten final files and both snapshots. `repaired173-source/` contains their exact final bytes. `repair.diff` is the complete delta from rejected 165: only `src/network/admissions.ts` changes in product code; the other seven original files are unchanged. New permanent files are `test/traffic-preentry-controls.test.ts` and the 2172-byte source fixture `test/fixtures/traffic-preentry-stop.json` (the manifest records exact size).

## Mechanism and change

Candidate 165 selected a positive-distance mapped control only after its holder was marked entered. Review169 found a valid route whose mapped stop is 0.03592769347705581 m inside occurrence 10, while the required envelope halt lies before both logical and physical entry. The shared query correctly retained the stop and prevented entry, so the selector could never see the control whose dwell would permit entry.

The selector now includes an uncleared control at the requested occurrence when `Boolean(held?.routeIdentity)` is true, as well as its existing entered/zero-distance cases. This is selection for eligibility, not clearance. The complete batch has already validated the exact immutable route, generation, retained passage, source network and boundary binding where present; a held actor cannot swap these identities. A new grant with no holder does not acquire this qualification.

The existing observed progress/front test, stopped duration, yield and receiving-space eligibility still decide whether the selected control clears. `progressM` begins at negative infinity for a new commitment, so a request or grant without an actual observation cannot clear this pre-entry stop. Clearing never sets entered=true. Actual observe/query refusal for a crossed uncleared line is unchanged. No tolerance, body envelope, stop position, source route, query rule, population tick or motion solver changes were made.

Legacy holders retain `routeIdentity:null`; the new branch is false for them. Their unentered positive-distance behavior is unchanged, and they still cannot obtain an identity-qualified halt-view exemption. Three real-class legacy tests preserve this distinction. Changing the qualification to accept every holder makes those exact tests fail.

## Source regression and repaired result

The permanent fixture is drawn from independent 169's sealed witness, not generated from the selector. It pins the network/fleet digests, the accepted 17-edge route, source node 13302752096, entry occurrence 10, entry distance 169.04619514198893 m, control record, supported maximum bodies and the preceding completed-through value 8. The actual planner still accepts boundary start `lane:520446648:0:0:ground0:f:0:section0` with seed 1923715327 under unchanged 120-edge/700-m/three-attempt limits.

| Class | Scale | Authority radius m | Required stop m |
| --- | ---: | ---: | ---: |
| kei | 1.04 | 2.35283512002753 | 166.72928771543846 |
| taxi | 1.04 | 2.820123027873044 | 166.26199980759293 |
| bus | 1.001695679710784 | 5.8 | 163.28212283546597 |

Each permanent positive test grants and serves preceding actual controls, observes full-body releases, retains the exact target passage/plan/generation, observes its actual projected footprint at the required stop, and submits 0.25/0.5/0.75/1.0-second dwell. The target control remains uncleared before one second and clears at one second while entered=false and physical occupancy=false. The query then exposes the next obligation; further observed progress and release succeed. No control set or authority state is modified by the fixture.

Adjacent negative tests cover a request with no observation, observed standstill 0.5 m short of the line, insufficient dwell, false yield, false receiving-space, mismatched generation/route identity, observed crossing of the uncleared line and an overdue query. Legacy unqualified requests are separately tested. These are discrete direct admission/query inputs; they do not claim that the test physically drives the route between observations.

`preentry-on165.log/.json` records the exact newly added gate on untouched rejected product source: three intended clearance assertion failures, one per class, and six passing negative/legacy cases. `preentry-repaired.log` is the same gate and fixture, unchanged, passing 9/9 after the selector repair. The test/fixture hashes in the red record match the final manifest.

The original independent 169 reproduction was also replayed with only its artifact output directory changed. Its three cases pass (`preentry-review-replay.log`) and `preentry-control.json` retains every observe/resolve/fresh-query dwell row. Comparison verifies unchanged route IDs, body/scale/radius, projected footprint, source control, entry/stop positions and physical occupancy. All three controls clear at 1.0 s with entered=false; the query advances to stops 223.0393749450082/222.57208703716267/219.59221006503572 m respectively. This directly exercises the changed authority input and shared-query output. The real population request assembly is unchanged and is additionally covered by the existing tick-order and bounded runtime checks below.

## Checks and red controls

- The combined focused run passes 88/88: all 75 prior focused tests, nine new source tests and four independently authored 169 lifecycle cases (`focused-final.log`). Existing four mapped-stop cases, 70-edge negative holds 35/69, pedestrian real-tick cases, entry/prefix identity and release/reset controls remain intact.
- Five additional mutations fail semantic assertions and are restored in finally (`negative-controls.py/.json` and separate logs): accept an unqualified legacy holder, skip actual observed position, skip stop dwell, skip yield and skip receiving space. The dwell mutation fails six tests; each other mutation fails three. All exact source hashes are restored before final checks.
- Types pass (`typecheck.log`). Owned Vite production build passes 127 modules in 1.54 s (`build.log`); the existing >500 kB chunk warning remains. Build bytes are retained and sealed.
- The original six-vehicle actual population witness was rerun for 7,200 ticks/120 simulated seconds, zero pedestrians, seed 5970698, with its 15-second wall backstop (`runtime.mjs`, `runtime-final.json`, `runtime.log`). Every event/status/lease/control record matches 165 exactly: 33 releases, 17 boundary activations, 14 retirements, zero authority violations/retired-in-place, mapped node 13302752098 clearance after 1.0000000000000013 s. The run took 1009.9284 ms and ends with three active slots, three waiting, one pending and 59.85 s longest wait. Grant returns remain 7,342 and include repeated holder answers. This run does not visit node 13302752096; the new all-class source fixtures establish that repaired case.
- Diff whitespace, changed-file size and high-confidence credential-pattern checks pass. Frozen source and snapshot digests, prior packets, shared inputs and exact runtime comparison are in `candidate.json`.

One instrumentation issue is retained in `attempts.json`: after the expected red Vitest run had saved its log and JSON, printing its Unicode output through Python's cp1252 stdout failed. The saved artifacts were inspected and their three semantic failures independently verified; no rerun or product conclusion relied on that print failure. There was one product repair attempt, which passed its first test run. Expected red baseline/mutation runs are preserved, not concealed.

## Limits, cleanup and handoff

The hypothetical laneIndex +/-1 overlaps from 169 have no established actual lane-change witness and remain outside this repair. No body/source/route adjustment, lane-change logic, solver, support/floor, renderer, routing budget, population defaults or activation change is included. Existing candidate 165 bounds continue to apply, including the unresolved relation between pedestrian post-solve halt shortening and pair safety.

All Vitest commands used the new repair-owned config with cache:false, owned cacheDir, --configLoader runner, at most two workers and owned TEMP/TMP. No shared dependency/data write, install, browser, server, GPU, full unit suite, audit or visual gate ran. Full integrated gates and independent re-review 174 remain root-owned; this report is not self-approval.

Before sealing, task-path processes are checked and only validated repair-owned scratch cache/TEMP paths are removed. Review evidence, both exact source snapshots and the owned build remain for re-review/root integration. The managed worktree remains uncommitted and intentionally retained; no broad cleanup, commit, merge or push was performed. Root should preserve this repair record beside 169's refusal, obtain exact-source re-review, and then perform final integration acceptance.
