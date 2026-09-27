# Review139 — pure pedestrian startup prototype

2026-09-27. Implementation owner: population_startup_review; integration owner: root. Base: `0ec3dd03831b605235302212b7d140cb35297071`, detached worktree `C:/Users/38909/.codex/worktrees/population-startup/maps`. Scope: two new owned source/test files and ignored evidence. This is a prepared prototype and a real-input refusal, not an independent acceptance review or a visible-city improvement.

## Result and boundary

`src/agents/population/initial-pedestrians.ts` implements a finite, atomic 24-slot constructor proposal. `test/initial-pedestrians.test.ts` has 20 passing focused controls. Full TypeScript checking passes. The final helper refuses the frozen real input in **91.3951 ms**, publishes **zero occupants**, and always declares `productionReady:false`. No production caller imports it. No runtime/default-entry/count, planner, admission, signal, simulation time, crowd behavior, source data or renderer changes were made. There is no initial-population capacity certificate and no 120-tick continuation, because 24 real occupants were never admitted.

The geometry helper deliberately handles **flat patches only**. That is a sufficient subset of Review133's complete current-support and actual-base 15 mm contact contract, not its full definition. Refusing a slope does not show that the original contract is impossible. Root requested this distinction explicitly and owns the next selected-floor/point-corresponding witness decision. Review134's traffic-route correction and Review138's safe crowd admission remain separate owners; Review137's visible crowd and contact limitations remain open. No old Q1 or Q5 acceptance is claimed and the accepted human-200-vehicle infeasibility exception is not reopened.

## What the helper actually does

It requires an unused tick-zero construction snapshot with all existing pedestrian slots inactive at generation zero and at least 24 requested slots. It attempts exactly slots 0–23, generation 1. Starts are the first at most 512 existing sidewalk edges, stable edge-ID order, null junction tag and start within 150 m. The sidewalk-only restriction is narrower than a generic null-junction walk census. Each slot retains the normal RNG draw positions, existing scale/variant selection and real `RouteLibrary.route` semantics, with centre destination, at most 120 edges and three walk attempts. A returned route must include an authored scramble diagonal. Route failure is retained; there is no fabricated route or new route planner.

The actual float32 initial position/yaw/scale is tested with the existing full pedestrian footprint. Any overlap with a physical junction area is refused, regardless of a null edge tag. Every tentative pair must satisfy nominal circle separation plus the existing 50 mm margin and nonoverlapping collision rectangles. Every collision-footprint point must be covered by the supplied flat road/pavement triangle union. The supplied rendered-base endpoint vertices must stay inside that covered rectangle and within 15 mm of its unchanged Y across every idle frame and LOD. Convexity and linear VAT interpolation give the endpoint bound on the flat subset. No source Y offset or terrain fallback exists.

Success returns all 24 chosen slots, ordinary actor IDs, generation, route/passages, scale, variant, cadence, identical previous/current poses, zero travel/speed/dwell, unqueued and uncommitted state, and boundary-only replenishment intent. It exposes the full chosen poses for future unified occupancy seeding. `boundaryCount=2976` designates remaining slots; it does not assert that they are active. Failure returns an empty occupant list, a tentative count and candidate refusal ledger. Results never fabricate leases, request ages or signal state. The monotonic 5,000 ms deadline is checked around candidate processing and before publication; it is a rejection budget, not preemption of a synchronous planner call. Runtime construction cost with 24 real admitted occupants remains unmeasured.

Input hashes, layer labels and base geometry are externally supplied evidence, not authenticated capabilities. The helper checks consistency/geometry but cannot verify that a caller's vertices came from the named bytes or that its named layer is legally selected. The production source adapter and all-variant/all-LOD base witness are deliberately absent. The current synthetic positive control is not an authoritative source witness. A pure function also cannot consume a constructor authorization; future lifecycle wiring must own the single-use state.

## Frozen real inputs and finite refusal

`final-constructor.json` binds the final helper SHA and network bytes. Of 277 slot-0 starts examined, 89 refuse missing support, 143 physically overlap a conflict area, and 45 have no acceptable real diagonal route. Tentative count is zero. This proves exact real refusal and bounded cost, not that all 24 lack legal capacity under the complete Review133 contract.

`real-input-probe.ts` additionally exhausts the same finite 277 starts for the first prescribed commuter-male slot, slot 1 at scale `0.95998615026474`. It uses actual float32 route poses and full footprints. There are 86 physically eligible diagonal-route starts, 146 physical conflicts and 45 route failures. Current road/pavement meshes have zero complete horizontal flat patches over those 86 footprints. The entire diagnostic took 409.8805 ms, including the initial helper run and mesh/network reads.

The follow-up `slope-extraction.ts` does not reroll or change those candidates. In 325.661 ms it finds **80 complete projected XZ unions and six projected coverage gaps**. All 80 complete unions require nonhorizontal triangles. Thus sloped geometry, rather than absent projected geometry, explains most of the flat-subset refusal. The union includes every overlapping road/pavement layer and does not establish a legitimate selected floor. Route Y mismatch was not the flat-only discriminator, because no complete horizontal patch reached its contact test.

The nearest five projected-complete candidates are below. `slope-extraction.json` retains their exact float32 positions, every clipped triangle's mesh/index/vertices, clipped area, height range and horizontal classification. The conservative residual combines the measured geometric base-band height envelope with all intersecting floor heights. It is **not** a point-corresponding contact error and includes overlapping levels.

| Edge start | Distance m | Floor Y envelope m | Route minus floor mm | Base-band residual envelope mm |
| --- | ---: | --- | --- | --- |
| `walk:664871982:0:0:ground0:r` | 35.581 | 15.461416–15.542672 | −55.154 to +26.102 | −55.173 to +41.065 |
| `walk:664532523:1:0:ground0:f` | 35.828 | 15.462081–15.543218 | −55.700 to +25.436 | −55.719 to +40.399 |
| `walk:664532523:0:0:ground0:r` | 35.878 | 15.461817–15.542953 | −55.436 to +25.700 | −55.455 to +40.663 |
| `walk:1335178865:0:0:ground0:f` | 36.110 | 15.462581–15.543517 | −55.999 to +24.937 | −56.018 to +39.900 |
| `walk:664871982:0:0:ground0:f` | 38.990 | 15.431135–15.529663 | −59.316 to +39.212 | −59.335 to +54.175 |

These envelopes identify the next finite source/contact decision; they neither authorize a source-floor change nor prove that every point fails 15 mm. The six projected gaps remain failures. Neither supported-start count nor 24-person spatial capacity is established by the 80 projected unions.

## Delivered idle evidence

`idle-base-probe.ts` verifies the commuter-male manifest, selected near-LOD GLB draw and VAT hashes. It reads the actual 1,614 unique shoe VAT IDs selected by the real part-admission helper. Initial-X halves each contain 807 IDs; these labels are geometric, not anatomical. It evaluates all 16 idle frames 32–47 plus a conservative bound over every adjacent linear interpolation interval, including wrap. Current phase is `fract(elapsedSeconds/2.5 + slot*0.61803398875)` at speed zero. No phase is locked and no asset-latency phase assumption is made.

At slot-1 scale, the two halves' continuous minimum heights are bounded by approximately **−0.018711 mm to +0.000744 mm** relative to route Y. A fixed band of the vertices within 15 mm of each half's frame-32 minimum contains 177 IDs per half and stays between **−0.018711 mm and +14.963163 mm** across all idle frames. Extremes occur at frame 34 (IDs 17418/16701) and frame 39 (IDs 17230/16513). The measurement took 28.1564 ms.

This demonstrates that the current near-LOD idle animation is compatible with an ideal flat floor at route Y for this geometric band. It does not establish anatomical soles, complete base identity, the other variants/LODs, actual current pavement contact, initial sloped contact, walking contact or F37 mixed-reference acceptance. The diagnostic's band was defined from geometry and must not become a production sole authority by relabeling it.

## Verification and retained counterevidence

Focused command: `node node_modules/vitest/vitest.mjs run test/initial-pedestrians.test.ts --maxWorkers=1 --no-file-parallelism` — **20/20 pass**, 59 ms test time, 468 ms runner time. Controls cover real route construction on analytic geometry; exact slots/identical pose halves; unchanged input; repeated output independent of wall date; constructor reuse/tick/generation/active refusal; count/capacity atomicity; actual physical occupancy with a null tag; world-space overlap between distinct route IDs; missing/mismatched/gapped/sloped support; missing/out-of-footprint/high base geometry; malformed directed graph; and deadline refusal. The wall-date control does not emulate the renderer or prove asset-load behavior.

`budget-red.log` and `budget-red-source.ts` preserve a real prototype defect: a final rejected candidate could exceed the deadline yet return capacity rather than budget refusal. The added regression first failed (19 pass, one fail), then passed after the end-of-slot budget check. `focused-tests.log` retains the repaired run. `typecheck.log` records `node node_modules/typescript/bin/tsc --noEmit`, exit 0. No full unit suite, build, GPU/browser, visual gate, audit, independent review, runtime integration or commit ran in this lane. All Node commands exited. A task-path-filtered process census, rerun with authorized read permission after sandbox CIM denial, found no owned Node/browser processes. No server or background resource was launched.

## Required integration and remaining criteria

1. Independent review must decide a minimal legitimate selected-floor and point-corresponding rendered-base witness over the already frozen starts, retaining complete support and the 15 mm bound. Source ownership, wrong-level refusal, holes, idle interpolation, all prescribed variants and relevant LODs must be established. Do not substitute route Y, an origin label, this geometric band or a held F37 reference for that witness.
2. Only after a real 24-body all-or-nothing positive result may a lifecycle owner apply slots 0–23 exactly once at tick zero, atomically seed both pose buffers, generation/route/motion arrays and the unified occupancy structure, account initial activation honestly, and leave other requested slots pending for safe ordinary boundary entry. A failed attempt must not mutate those structures or silently reduce requested count.
3. No lease/request/signal/time backfill is allowed. First real fixed steps use existing passage/dwell/admission decisions. Normal completion, tail clearance, retirement, ID/generation discipline and future boundary-only replenishment remain authoritative. Style changes cannot reinitialize. Then run the predeclared 120-tick frozen continuation and actual ordinary-entry visual acceptance; do not infer visible acceptance from these CPU outputs.
4. Default populated entry, explicit empty mode and cold diagnostic mode are root-owned product decisions. No UI widening was made. Future Review134 planner changes preclude a promise of old cold-run bit identity. Traffic startup remains dependent on its real legal route/witness work. No warm-up fallback, cosmetic actor, reduced reported population or silent partial24 fallback is implemented.

The root owns source review, remaining gates, permanent docs, integration and worktree disposition. The two new files remain uncommitted in the managed worktree; they must not be treated as landed or production-ready.

## Reproduction and exact diff

The ignored directory contains scripts, outputs, failure evidence and `helper.diff` / `tests.diff` (new-file diffs against the base). `freeze.json` binds their exact bytes and this report. Final product source SHA-256: `7ec9195de746c45b9d39acddf338e7ce686d0b33f348017ea02c678643999329` (14,179 bytes). Test SHA-256: `4fb9ead3815a0ad9393ce3d9ad086ac0e10738aa413a3dc80500a49efc737bd8` (10,428 bytes). Base tracked files are unchanged; only the two approved untracked product files appear in Git status.

Pinned network: `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`; roads: `0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc`; pavements: `3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62`. The first real probe checks those input hashes again after its run. Human hashes are in `idle-base.json`. Data and node_modules junctions were read only. Primary staging copies remain as retained handoff evidence; sealed Review133 evidence is preserved.
