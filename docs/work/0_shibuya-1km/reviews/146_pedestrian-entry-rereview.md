# Review 146 — focused pedestrian-entry re-review

Bound: R143-F1–F3 fixes in the frozen six-file candidate in `C:/Users/38909/.codex/worktrees/crowd-admission/maps`, based on `bb4532df4e4cfd7d2cc3c072a951d9dc6ada3f7c`, plus root's requested adjacent retirement-leak check. This is an independent source and focused CPU review. It is not native appearance, moving-spacing, 24-slot startup, final integrated revision or full-gate acceptance.

Reviewer: `crowd_entry_independent`, 2026-09-27. Product and input files remained read-only. The existing Review143 instructions, fleet review runbook and Review107 CLI abstentions still apply; neither CLI was retried. No browser, GPU, server or default-population 5717-tick replay ran.

## Verdict

**R143-F1, R143-F2 and R143-F3 are resolved. The bounded entry milestone is review-accepted for root integration and final verification.** I found no new blocking issue in this repair. Root must still run the normal final gates and inspect the actual native entry observation on the integrated revision. This verdict does not say the later crowd flow is fixed: Review141's 5,050 deep nominal pairs at tick 5717 remain material, and Review143's bounded motion-trace contract remains the next separate investigation.

Requested/default demand remains 3,000 pedestrians and 200 vehicles. Honest active/waiting counts and conservative entry bounds remain intact. No population reduction, solver change, route change or authority change was introduced by this fix.

## Exact target and change scope

The owner repair artifacts match the supplied SHA-256 values: `REPORT.md` `c2712680d0b7ad0088c37dd40e53fb40c4fdb9b82b3c507dbcb81bb48cdb3546`; `freeze.json` `ae5f8a145caf1a7715668cfd48b5ed9fb8ec9386a5c025ebe948ca4162e4d588`; complete `changes.patch` `adfecc2916bf74e9777b5c2a47dc2787a95e086df872a214346dccaeb21efca1`; `fix-vs141.patch` `c3af9553968431c85da436ebaee1dbfbb2439525779bb45eb0f499771aa8c116`.

I verified every file in the repair freeze, the ten preserved Review141 copies in `preservation.json`, all six current source/test hashes, and all 214 original frozen source/input/test paths against the old freeze plus the two reviewed replacements. Regenerating the complete candidate patch in memory produced the supplied digest. Only `src/agents/population/tick.ts` and `test/pedestrian-entry.test.ts` differ from the previously reviewed candidate. The former changes only a status getter and its helper; the latter strengthens the reuse case and adds the retry, runtime-vehicle and vehicle-parity cases. Every earlier test assertion remains. No tick/update/activation path changed.

## Finding dispositions

**R143-F1 — closed.** `src/agents/population/tick.ts:2214` now calls `reuses()`. The helper at lines 2316–2328 reads each pedestrian pose generation and sums `max(generation - 1, 0)`, including inactive slots. Successful activation is the sole ordinary pedestrian generation increment through `spawnSlot`; preparing a candidate or retiring a body does not increment that pose generation. Therefore a blocked second entry remains zero reuse, a successful second activation becomes one, and later retirement retains that history. The helper writes no state.

The vehicle contribution remains `max(vehicle spawns - registered vehicle routes, 0)`, as root expressly required. The repair does not claim that this legacy vehicle meaning is identical to the pedestrian definition. The new 12-vehicle/1200-tick parity case observes an actual retirement, checks the old vehicle formula and conservation every tick, and verifies repeated status reads preserve diagnostics. The pedestrian reuse case checks zero before and throughout 180 extra blocked ticks, then exactly one after generation 2 activation with spawned/retired/active/generations 2/1/1/2. Restoring the exact preserved Review141 tick source in memory fails that promoted case with reuse 1 versus required 0.

**R143-F2 — closed.** The promoted one-candidate test at `test/pedestrian-entry.test.ts:38–57` observes clearance calls at exactly `[1,61,121]` over 180 fixed ticks, stable body identity, zero spawn/retirement/generation/reuse counters and no live lease. Removing the real retry guard in memory now fails the submitted regression suite's named case, reporting calls on every tick instead. This repairs the former green mutation without changing the scheduler.

**R143-F3 — closed.** The promoted runtime integration case at `test/pedestrian-entry.test.ts:60–82` inspects the actual population entry space and checks live vehicle collision centres that are independently clear of all pedestrians. Current source refuses those hypothetical bodies. Omitting the runtime vehicle insertion in memory now fails the submitted named case on vehicle slot 0. The query does not spawn a pedestrian and does not pretend to be an observed collision. The original tilted-hull helper test remains alongside it.

## Adjacent retirement-leak check requested by root

`retirePedestrian` still leaves `active=1` under `populationInvariants.leakRetiredBody` at `tick.ts:1574`, while nulling the route and counting retirement. The new cursor skips active slots at `tick.ts:801`, so it cannot replan or overwrite that leaked body. The planning phase at `tick.ts:1861–1866` then reports the missing live route instead of healing it.

The existing `population-lifecycle.test.ts` passed 3/3. An additional bounded one-slot short-route probe, `leak-observability.test.ts`, passed 1/1 by observing the precise error `Population lifecycle conservation failed: pedestrian slot 0 is present in the pose buffers with no planned route. A body was retired without clearing its slot.` It verified active 1, generation 1, route null and a separately throwing status read. No candidate source mutation was needed; the existing deliberate fault switch was reset in `finally`.

One existing assertion deserves a precise limit: `test/population-lifecycle.test.ts:51` still adds `status.pedestrians.pending` to the conservation equation. The final 4800-tick fixture has no such pending candidates, so that assertion is green; it does not validate the new waiting state. The correct general equation is `spawned = retired + active + prepared-bound-vehicles`. Prepared pedestrian candidates are not spawned. The new default-load 180-tick case already checks this correct identity while pedestrian demand waits. No red failure of the existing lifecycle fixture was observed, and no test was weakened or removed during this review.

## Independent verification

On Node v24.12.0, the four focused/adjacent files passed 31/31 in 6.154 seconds. The three fixes' targeted controls each produced exactly one named failing test: preserved old reuse source, removed retry eligibility, and omitted runtime live vehicles. These are in-memory Vite transforms with receipts; candidate source was never rewritten. Typecheck and `git diff --check` both exited 0. The later requested lifecycle file passed 3/3 in 2.304 seconds, and the independent pedestrian-leak probe passed 1/1 in 1.080 seconds.

The owner recorded eight exact-restored failing controls in the repair freeze. This re-review independently repeated the three fixes' controls. Review143 independently reproduced the original five controls; their relevant entry implementation and assertions remain unchanged. I do not label all eight as freshly rerun by this reviewer in Review146.

All runs used reviewer-owned configs/output/cache paths, `cache:false`, `configLoader:runner`, one Vitest worker and bounded child execution. The existing shared Vitest result-cache digest was unchanged before/after. The owner's earlier shared-cache write is a disclosed constraint violation, not erased history; this reviewer neither deleted nor guessed a restoration of shared bytes. Final hashes confirm all 214 target files remained unchanged.

The source change is read-only status accounting, so the previously frozen entry/motion observations remain scoped behavioral evidence; no new replay or timing/appearance measurement is inferred. The full unit suite, build, audit, visual gate and native observation were not run here. The final integrated revision has not yet been reviewed or merged by this reviewer.

## Handoff and resources

The report, exact hashes, raw JSON results, read-only mutation receipts and leak witness remain under primary `artifacts/crowd-entry-rereview-20260927/`. `verification.json` and `lifecycle-results.json` name the seven owned child processes; final process inspection finds them absent. No browser, GUI, server or watcher was launched, and no review cache directory requires cleanup. Retain these small artifacts while root's integration/handoff is active.

Root may integrate this entry milestone, then complete its independent native review and normal final gates. The moving-spacing repair and the separate 24-slot initializer remain distinct work. This focused re-review supplies no license to lower demand, conceal waiting or call the whole crowd complete.

## Exact primary integration check

After this focused review, root copied the six reviewed files into primary without integration edits. I independently hashed all six primary paths and confirmed each equals both the frozen candidate hash and the still-frozen worktree file. `integrated-source-check.json` binds those six comparisons and the root integration receipt. This transfers the source review to those exact integrated bytes; final gates and native observation remain pending.
