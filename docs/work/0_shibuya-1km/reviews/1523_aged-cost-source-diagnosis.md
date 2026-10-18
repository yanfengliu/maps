# 1523 — Age-growing production cost: source diagnosis

2026-10-18 02:58 UTC. Read-only traffic1499 source comparison against accepted PRIMARY; no runtime or source changes.

## Finding

The started ordinary local walker retains a monotonically growing event history and repeatedly copies and traverses that complete history in production fixed-step and rendered-frame callbacks. This is a verified source mechanism and the strongest specific hypothesis for the observed age-related decline. Its share of runtime and causality are not measured here.

`src/agents/population/local-ordered/controller.mjs:178` initializes `events: []`; line 99 appends each liftoff and line 222 appends each landing. The complete file has no trimming, replacement or clearing of this history after initialization. Repeated four-leg walking therefore increases the retained history across cycles.

`src/agents/population/local-walk-gait.ts:56` clones the complete gait in `current()` and recursively freezes it using the traversal at line 36. `advance()` invokes `current()` at line 59, clones the gait again at line 65, freezes the next gait at line 66 and clones the committed draft at line 70. The walking controller independently clones the whole state at controller lines 302 and 308; its turn branch does the same at lines 316 and 343. These operations include every historical event rather than only the current feet and motion interval.

Rendered frames also pay growing work: gait line 42 clones the previous whole gait in `sampleFeet`, and line 66 freezes the interpolated sample. `src/agents/local-walk-prototype.ts:60` requests an interpolated midpoint during interval admission; line 69 samples again for each rendered frame. Thus historical data is copied even when the harness makes no repeated reads. Per-callback history copying and traversal scale with retained event count; accumulated work over a continuously walking session can therefore grow faster than elapsed simulation time.

This is inherited production behavior. The gait, loop and post files are literal-identical between candidate and PRIMARY; controller, local-walk draw and rail-train files are identical after CRLF normalization. These six comparisons establish shared code, not a new traffic-only history regression. The candidate's coexistence change makes the inherited started walker relevant to ordinary traffic qualification.

## Discriminator and limits

Root supplied fresh roughly 40 returned renders per wall second versus an aged no-repeated-observer interval of 10.728, with local-walk events growing from 997 to 1091 during the aged interval. These are parent observations, not measurements reproduced by this source investigation. Existing endpoint snapshots can compare render/frame and fixed-tick deltas against event count while checking pose, tile idleness, post mode and active population. That is the cheapest immediate consistency check; correlation alone cannot isolate the history cost.

A later bounded matched run can leave the walker unstarted through the same wall age while retaining ordinary traffic and the same actual post mode, then compare the existing loop, localWalk, population and post counters. The published post mode must match: candidate app line 246 (PRIMARY line 244) includes walker, traffic and train motion in the still predicate. An unstarted walker that changes the render branch is a confounded control. No such run is authorized or launched by this report. A source-only equivalence fixture could later distinguish complete-history storage from the current motion state without claiming native frame-rate improvement.

Train render work creates a replacement bounded cars/wheels snapshot each frame (`src/scene/rail-trains.ts:92–124`), with train objects created once at lines 137–153. Vehicle rendering resets counts then traverses bounded pose slots, model parts and occurrences (`src/agents/render/vehicles.ts:103–149`). Local differential targets are created during loading and reused by render. No monotone age-growing collection was found in those inspected paths. Bounded allocation churn and position-dependent visibility can still contribute; this inspection does not exonerate GPU work, scene complexity or traffic simulation.

This is one source hypothesis, not native causality, full-fleet acceptance or a full-source audit.

## Ownership and possible repair contract

The exact runtime files are `C:/Users/38909/Documents/github/maps/src/agents/population/local-ordered/controller.mjs` and `C:/Users/38909/Documents/github/maps/src/agents/population/local-walk-gait.ts`; their candidate copies are under `C:/Users/38909/Documents/github/maps/artifacts/traffic1499/worktree/` with the same relative names. Both are tracked source. `src/agents/local-walk-prototype.ts:10,44` directly imports and constructs this controller; `controller.d.mts` supplies its declaration. No controller generator was identified in the searched tools/package references. Historical `tools/agents/local-walk/input-contract.mjs:153` and `profile.mjs:92` pin controller bytes; a repair must preserve those historical experiment bounds rather than silently repinning them as new proof.

Suggested narrow contract, not an implementation: separate the complete ordered event history from cloneable current motion state so unchanged historical event payloads are not recopied or recursively frozen on fixed-step/interpolation hot paths. Preserve every event and its order, all public diagnostic history, exact current/interpolated poses, admission/rollback behavior, historical sample immutability and caller-owned input isolation. Use a monotonic event sequence/count for the existing new-event decision; materialize an independently owned full diagnostic history when requested. Demonstrate unchanged motion/admission/event outputs and absence of caller/history alias mutation before comparing native pace. No event clipping, caps, omitted public history, changed gait arithmetic or unreviewed source-binding relaxation is part of this suggestion.
