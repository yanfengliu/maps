# Round 29 — independent review of the integrated revision

Reviewer: an independent, read-only lane. Revision reviewed: `0ba56fe861dca81970a538ece57668b09fb2b1c5`, working tree clean at the time and left clean.

Evidence: `artifacts/independent-review/REPORT.md`, SHA-256 `98731fc6cbac6c4def0cfb0254dce1c6a838044635ecee556bcc5841b596233a`. The reviewer is not the author of the code it reviewed.

## Verdict per acceptance criterion

| Criterion | Verdict |
| --- | --- |
| `plan.md:149` vehicles hold lanes, obey signals, turn, spawn and despawn, watched over a run | **Not met** |
| `plan.md:150` pedestrians avoid each other and surge diagonally across the crossing | **Not met** |
| `plan.md:151` one clock, and no frame shows traffic in the scramble while pedestrians are on it | **Model verified, visual part not established** |
| `plan.md:152` 60 fps at 1920x1080 with 3,000 pedestrians and 200 vehicles | **Not met** |
| The gates | Pass, but two of them are weaker than their headers say |
| The verdict artifact | 44 frame digests verified on disk, but nothing binds to the integrated revision |

## Blocking findings

**B1 — vehicles interpenetrate, and nothing measures spacing.** On the shipped simulation at 200 vehicles and 3,600 ticks: **120 oriented-box overlapping pairs among 71 active bodies, with a deepest longitudinal overlap of 4.147 m at a 0.500 m origin gap** (two taxis). The cause is structural rather than a bug: IDM's gap is **origin-to-origin** and its standstill floor is 0.5 m (`src/agents/population/vehicles.ts:101`, `:227-231`, `config.ts:78-80`), so a queue at rest is a stack of overlapping bodies. **No test and no tool measures spacing at all.** This is the criterion "vehicles hold their lanes … watched over a run" failing on the thing it names, and a previous lane had recorded the origin-to-origin gap as a minor note rather than as the blocker it is.

**B2 — the signature shot is unreachable, and the crowd interpenetrates.** Every one of the **48 crossing-kind walking sections within 60 m of the origin is governed by the scramble compound**, so no route may terminate there; the nearest ungoverned central section is 13.503 m and the nearest walker at the judged window is 176.768 m. Separately the crowd overlaps: **46,683 overlapping pedestrian pairs**, a mean of **65.2 neighbours within 2 m against an 8-neighbour ORCA cap**, and `src/agents/population/pedestrians.ts:335-338` returns no constraint at all for a pair that already overlaps. So "pedestrians avoid each other" fails on overlap and "surge diagonally across the crossing" fails on reachability, and both are this one criterion.

**B3 — the performance criterion is not met, and the vehicle half is structural.** 3,000 pedestrians drawn holds, and the fenced render-pass cost meets the interval (the reviewer re-reduced the raw 3,883-frame record itself: p50 0.900 / p95 3.600 ms). But the running build delivers **10 to 18 fps** (interval p50 54.4 ms, p95 96.1 ms, simulation 32.5 to 67.7 ms, five fixed steps at p95), and **60 of 200 vehicles are drawn** because the bus class is structurally refused. Both halves of the population count and the frame rate fail.

**B4 — nothing binds to the integrated revision.** The certificate at `artifacts/visual/complete.json` (`45f7519…`) has all 44 digests verified on disk, but its build is **`index-Wbd7IHvh.js` from a tree at `7c6bd95`**, and `63ee4fc`, `7c441d5` and `e23c29f` landed source changes during its four-hour capture. The native inspection binds to a different capture again (`629786…`, `BP1Vm0F-`). So **no sweep and no native inspection binds to `0ba56fe`**, and the acceptance criterion that requires one is not met.

## Material findings, and three of them are corrections to this coordinator's own record

- **`docs/learning/gate-proofs.md:318` and `docs/learning/defect-register.md:11` say the lifecycle gate repair is not merged and the defect is unfixed on main. Both are false at `0ba56fe`**: the third case is present, all guards are present, and the gate passes. A landed fix is recorded as open, which is the opposite failure to the one that register exists to catch.
- **`plan.md` is a day stale and contradicts the landings.** Line 100 says the visual re-run is "still completing" (it completed at 2026-09-16T13:08:43Z); line 168 says the population "does not yet complete a route" (309 completions at 360 s); the `Updated` field still reads 2026-09-15.
- **`plan.md:96` says the instrument review's five material findings were "taken into the hardening unit", and all five are unfixed** (`tools/visual/verify-output.ts:21-22`, the `complete.json` keys, the `package.json` ordering).
- **The centre routes are admitted by a new 1,000 m cap, not the 700 m cap the devlog and commit framing imply.** The framing says "513-933 m against the 700 m cap"; `routes.ts:88` carries a new 1,000 m cap. The claim is not false in isolation — the routes do fit 700 m of walking — but a reader is left with the wrong number, and the commit message I wrote repeats it.
- **The delivered route shape leans on `src/network/passages.ts:43-45`, the guard round 28 showed does not check what it says.** The 282.7 s re-entrant lease defect is open and appears in no blocker list.
- **Two cited instruments are not in the tree**: `src/agents/population/tick.ts:403` cites `tools/agents/centre-route-census.ts`, which exists on no commit or ref, and the lane tools named in the reviewer's brief exist only in an unmerged worktree.
- **Two prose numbers in my own commit messages did not hold.** "3,906 of 3,906 resolved queries" reads a different arm of the record (4,382 resolved, 1,286 lost); "2,859 bus spawns refused" reads 2,806 and 2,208.

## Gate weaknesses the review found

- **The tick-order gate's red case is refused by a guard that compares the phase list to its own constant before any phase runs**, so the mutation is caught by the gate's own bookkeeping rather than by the behaviour it is supposed to protect.
- **The spatial-hash gate's second block tests a local copy of the packing**, so it cannot fail if the shipped class diverges from it.

Both are the class the fleet calls "a check built from the same symbol as the thing it checks", and both need the same treatment the lifecycle gate got.

## What held exactly, spot-checked by the reviewer itself

The centre-route counters (1,703 / 309 pedestrians, 311 / 203 vehicles, `authorityViolations 0`), the acceptance digest `8e0623c8…` byte-identical to the recorded run, the nearest walker 176.768 m with 28 actors inside 200 m at t = 360 s, the frame percentiles re-reduced from raw, 18 of 33 portals reaching a central terminus, the quoted instrument-review digest, and 14 tests across 4 population files with typecheck 0.

## Disposition

**The deliverable is not complete, and this round says so with the criteria named rather than the work described.** Three of the four remaining acceptance criteria fail, two of them on the criteria's own subject rather than on a technicality: nobody is on the crossing, and the vehicles are overlapping. The coordinator's own records carry three false statements and two wrong numbers, which this round corrects. Work continues on B1 and B2, which are the substance.
