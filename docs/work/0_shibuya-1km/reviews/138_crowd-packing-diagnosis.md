# Review 138 — displayed crowd packing diagnosis

Bound: one unchanged-source CPU reproduction of the requested 3,000 pedestrians / 200 vehicles / seed 5970698 through tick 5717, decoded delivered human geometry, and Review 137's native observations. This establishes a first-entry packing defect and a bounded repair contract. It is not live actor identity, triangle-contact, full simulation, startup, performance or visual acceptance. No product, asset, data, default or browser state changed.

## Finding

The principal demonstrated cause is simultaneous pedestrian entry without occupancy clearance. At tick 1, 2,998 active pedestrians already create 107,625 overlapping nominal-circle pairs at the same level. Those initial neighbours persist into both locator cohorts: every nominal overlapping pair in each cohort at ticks 5405 and 5717 was also overlapping at tick 1 in the same generation. These are predominantly moving, uncommitted sidewalk walkers, not crowds first compressed by a later crossing queue. Rendered bodies extend substantially beyond the nominal collision radius, and projection increases apparent overlap, but neither explains away the initial packing.

Review 137 inspected all 12 native frames; its report SHA-256 is `76c410c23b11281a044b23f733509c3f7cb3d000708e2fa76e5410a8b23498d2`. This diagnosis additionally opened the native `human-cartographic-5700.png` and `vehicle-satellite-5400.png`, which show merged silhouettes alongside distinguishable leaders. Images alone do not establish physical penetration.

## Instrument and source freeze

The existing `tools/populated/probe.ts` was used in Review 132. It answers location and lifecycle questions but its retained tick-5400 dump cannot establish initial pair ancestry or the actual displayed body envelope. This assignment therefore ran one bounded wrapper around the same exported `createPopulation`, `RenderLoop`, `JunctionAdmissions` and existing `tools/agents/spacing-metrics.ts:246,361`. Checkpoints were 0, 1, 60, 5405 and 5717. The replay exited 0 in 37.705 seconds, including measurements. No second replay ran.

The source/input list contains 211 files, unchanged from Review 132 before and after this run. The 117 served files remain 301,782,754 bytes with digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`. The replay began at docs revision `0ec3dd03831b605235302212b7d140cb35297071`; root's later docs revision `bb4532df4e4cfd7d2cc3c072a951d9dc6ada3f7c` retains the same product source. Final live/replay comparison matches ticks, vehicles, lifecycle, boundary spawns, retired-in-place and authority violations exactly. Pedestrian status differs only in queued count: 997 replay versus 996 live. Accordingly, camera-cohort correspondence is a reproduction hypothesis, not an identity mapping to live pixels.

`assets.mjs` validates the delivered manifest hashes, selects actual GLB scene draw parts through `selectedHumanParts`, follows their indexed VAT vertex IDs, and decodes the half-float position texture for all 48 frames of all nine LOD assets. Each asset has six selected draw parts. Bounds come from these drawn vertices, not a restated nominal radius or an unchecked manifest box. Interpolated animation stays inside the union because the shader linearly interpolates frames/clips (`src/agents/render/vat.ts:37–47`). Coincident and 10-metre-separated envelope controls respectively detect and reject overlap. No population was altered for those controls.

## Measurements

“Same level” below means absolute origin-height difference below 0.15 m. Nominal pairs use the existing 0.25-metre radius multiplied by actor scale. Initial inheritance requires the same pair and generation, not merely the same portal.

| Tick | Active pedestrians | Same-level nominal pairs | Pairs already overlapping at tick 1 | Largest 1-cm position stack |
| --- | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 | 0 |
| 1 | 2,998 | 107,625 | 107,625 | 5 |
| 60 | 3,000 | 90,949 | 90,827 | 5 |
| 5405 | 3,000 | 39,113 | 36,023 | 3 |
| 5717 | 3,000 | 41,735 | 37,299 | 3 |

The human-camera cohort selects origins within 18 m of the recorded camera; the vehicle-camera pedestrian cohort uses 60 m. These selections yield 100 and 105 pedestrians respectively, matching the observed near/medium totals, but are not visibility tests. Conservative screen rectangles do not model occlusion or alpha silhouettes.

| Tick / cohort | Pedestrians moving above 0.2 m/s | Nominal pairs / inherited pairs | Displayed envelope pairs | Median nearest XZ distance |
| --- | ---: | ---: | ---: | ---: |
| 5405 / human | 100 of 100 | 1,603 / 1,603 | 1,884 | 0.0170 m |
| 5717 / human | 98 of 100 | 1,276 / 1,276 | 1,765 | 0.0247 m |
| 5405 / vehicle view | 88 of 105 | 719 / 719 | 996 | 0.0421 m |
| 5717 / vehicle view | 84 of 105 | 721 / 721 | 967 | 0.0479 m |

All 100 human-cohort actors originated at `walk:1387457151:0:0:ground0:f`; all 105 vehicle-view pedestrians at `walk:660800906:0:0:ground0:f`. None is committed at either sampled tick. At tick 5405, human-cohort slots 2631 and 2661 have centres 2.32 mm apart, both moving about 1.012 m/s. Their current conservative envelopes overlap by 0.467 m; their initial centres were already about 1.56 mm apart at zero route progress. Detailed initial/current rows and pair ancestry remain in the JSON evidence.

Near-LOD full-animation dimensions before actor scaling are:

| Variant | Width × height × depth | Maximum drawn XZ radius across all LODs/clips |
| --- | --- | ---: |
| commuter-male | 0.4796 × 1.6270 × 0.8027 m | 0.508657 m |
| office-male | 0.5366 × 1.8311 × 0.8525 m | 0.531677 m |
| commuter-female | 0.4260 × 1.5088 × 0.7734 m | 0.494072 m |

These conservative animated extents exceed the nominal 0.25-metre circle, especially along the walk swing. They are suitable for preventing materialization through another displayed body. They do not establish anatomical surface penetration or require a blanket replacement of every routing/authority footprint with a swing envelope.

Projection contributes: at tick 5405 there are 729 human-view and 915 vehicle-view screen-rectangle pairs whose world envelopes do not overlap. It is therefore an amplifier, not the sole cause. The human cohort's variants are 39/29/32; the other cohort's are 40/39/26. Same-variant nearest neighbours are 35/100 and 44/105 at tick 5405. There are only three delivered variants (`src/world/agent-assets.ts:4–8`), with a fixed Cartographic clothing palette (`src/agents/render/humans.ts:47–51`). Repetition is real, but these counts do not establish a separate biased variant-placement defect. Correct spacing before deciding whether further visual variety is needed.

## Causal source path

`src/agents/population/tick.ts:626–657` selects a seeded portal, variant and scale, plans a route, places the pedestrian at zero route progress, then activates it. It does not check pedestrian occupancy. The declared `spawnClearanceM` at `src/agents/population/config.ts:85–91` describes the missing protection but does not enforce it here. `src/agents/population/routes.ts:747–755,778–799` supplies a seeded lateral position, not allocation of free space. Many actors therefore occupy the same narrow entry cross-section on the first tick.

Later avoidance cannot be credited with repairing that invalid initial condition. ORCA examines at most eight neighbours (`config.ts:41,63–64`; `pedestrians.ts:494–535`), while the initial median has 98 neighbours within 2 m. The tick projects the avoidance result onto a nonnegative forward route speed (`tick.ts:1876–1889`) and integrates scalar progress on the fixed lateral route (`tick.ts:1467–1482`). That architecture offers no lateral or reverse displacement to untangle an already coincident cohort. This is evidence of limited recovery freedom, not a proof that one particular solver branch creates every later pair.

The retry path also matters to the repair: inactive null-route pedestrians enter `planQueue` at `tick.ts:730–746`, whose dispatch lacks the `retryTick` checks used by the later startup sweep at lines 751–770. A pending-entry implementation must not bypass its own retry schedule through this queue.

The existing `test/pedestrian-overlap.test.ts:1–64,74–80` covers 150 pedestrians, no vehicles, nominal circles and samples once per second over 60,000 ticks. It explicitly cannot establish the 3,000-body case or displayed geometry. It was not rerun or represented as passing here. Its preserved regression evidence should remain; the new first-entry class needs its own short, default-load check.

## Bounded repair contract for root approval

1. Gate every pedestrian activation, including first entry, later generation reuse, and the separately designed 24 initial slots, against current live occupants and pedestrians accepted earlier in the same fixed tick. Keep requested/default demand at 3,000. The 24 initial slots belong to that demand, not an additional crowd. Preserve their legal route/support/signal requirements; this review does not design their positions.
2. Use a conservative displayed-body entry envelope derived from the actual selected, decoded assets across all LODs and animation frames, transformed by actor scale. The simplest sufficient envelope is the measured maximum XZ radius about the actor origin plus its vertical interval. Require the sum of candidate and occupant radii plus an explicit **0.05 m entry air gap**; this is a proposed local placement margin, not a claim about human comfort or a change to signal clearance. An equivalent tighter oriented envelope may be used only if independently shown to contain the same displayed bounds. Keep this entry envelope separate from the existing motion/route authority radius in the first repair; changing that broader contract needs its own demonstrated failure and review.
3. A blocked slot remains pending and inactive, with its route, variant, scale and next generation stable across retries. It does not count as rendered or active, increment spawned/generation counters repeatedly, consume a live lease, disappear from requested demand, or move an existing actor. Expose truthful requested/active/waiting counts with `requested = active + waiting` for pedestrian demand, and preserve cumulative spawned/completed/reuse accounting. Honest temporarily fewer active pedestrians while space clears is authorized; count reduction or cosmetic suppression is not.
4. Retry deterministically and fairly, at most once per eligible slot per tick, with a bounded cursor/budget and no queue route that bypasses retry eligibility. A blocked first candidate must not starve a later feasible candidate. Reuse a generation only after the prior body's authority and occupancy have been retired; perform the same clearance before activating it again. Do not scatter, reseed, teleport, push or lower support/contact requirements.
5. Stop at safe entry and the evidence below. Do not redesign the whole avoidance system pre-emptively. If safely admitted bodies later form a materially penetrating pair under a focused control, retain that failure and resolve only the demonstrated motion-spacing boundary before claiming the affected flow fixed. Entry correctness alone must not be relabelled all-time contact correctness.

## Required verification and negative controls

- Decode selected drawn vertices independently in the regression check and prove the entry envelope contains every delivered LOD/frame at admitted scales. Mutating back to radius 0.25 must fail on actual asset points. Cover animation/LOD transitions, rotation, vertical separation and an asymmetric body extent; no test that only compares a constant to itself.
- Run the pinned default 3,000/200/5970698 first-entry case. Read active poses and decoded envelopes independently. Require zero newly admitted overlaps including the margin; requested/active/waiting conservation must hold even when most demand waits. Bypassing clearance must reproduce the original packing and fail. Empty-output success must fail an admission-progress control.
- Exercise occupied entry, clearance after the occupant leaves, same-tick competing entrants, later generation reuse, a blocked-first/free-later fairness case, and repeated identical runs. A retry bypass, dropped waiting slot, duplicate activation, or newly overlapping reuse must go red. Verify waiting slots acquire no live authority and no displayed pose.
- Integrate the 24-slot startup fixture through the same admission path without exceeding 3,000 requested pedestrians or duplicating generations. Keep its legal route and signal checks. Native observation must honestly show any lower active count and the waiting demand.
- After the short gate, run a bounded current-default follow-up through the existing locator window and inspect newly formed overlap ancestry, routes, signals/contact and meaningful movement. Use actual-control native views to judge spacing and repeated silhouettes after admission; passing counters alone is insufficient. Preserve the old Review 137/138 evidence. The normal five repository code gates and independent exact-revision review remain the integration owner's responsibility, not checks performed by this diagnosis.

## Handoff and limitations

This is sufficient to assign the isolated first repair. Detailed evidence remains in `replay-summary.json`, `snapshots.json`, the five `tick-*-pairs.json` files, `displayed-asset-bounds.json` and `analysis.json`; scripts and logs are retained for reproduction. `freeze.json` binds their exact bytes and this report. All subprocesses completed; no browser, GPU, server or watcher was launched. No full gate ran. Physical surface contact, exact live slot correspondence, post-repair throughput and all-time avoidance remain unproved. Root owns promotion of this authored Review 138 and acceptance of the proposed margin/contract.
