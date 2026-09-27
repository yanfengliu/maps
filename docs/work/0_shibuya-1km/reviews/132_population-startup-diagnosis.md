# Review 132 — population location diagnosis and startup options

Author: `population_visibility_diagnosis`, 2026-09-27. Bounded read-only diagnosis of main `e03f17da538f6fdd1b52326a9fe83f908c9a3a67`; root owns design admission and acceptance. Product/data/network/asset/Git bytes were not changed. This report is prepared for permanent promotion by root.

## Finding

The empty signature crossing is strongly explained by the population's actual startup distribution. The current default populated simulation starts pedestrians at the map boundary, roughly 500–698 m from the origin, and vehicles also enter from boundary portals. It does not initialize a city already in motion around the crossing. In one fresh replay covering the live observation's final tick, no pedestrian came within 407.94 m of the origin and no vehicle within 426.08 m. Changing LOD thresholds or camera framing at the crossing cannot put these bodies there.

This is a current CPU observation consistent with the exact live final counters and independently reviewed empty pixels; replay positions remain hypotheses for locating a future live camera. They are not a live actor observer or proof of visual placement, contact, naturalness or correct continuous authority.

## Instrument, binding and result

The repository already supplies `tools/populated/probe.ts`, explicitly an aiming aid using the real `createPopulation`, `JunctionAdmissions` and `RenderLoop` at 1/60 s (`probe.ts:1–29,61–70,129–166,261–263`). It answers actor distance and signal-window questions. It cannot judge pixels. `tools/agents/crowd-occupancy.ts:1–32` is the more specific diagonal-occupancy instrument; `population-route-mix.ts:1–16` observes assigned plans; `centre-route-census.ts:1–23` measures graph reachability only. None of those additional runs was needed or executed.

Executed once: `node tools/populated/probe.ts --ticks 5463 --dump-tick 5400 --dump-file artifacts/population-visibility-diagnosis-20260927/positions-tick5400.json --out artifacts/population-visibility-diagnosis-20260927/aiming.json`. Exit 0; Node 24.12.0; measured simulation-loop time 34.516 s. No browser, GPU capture, full gate or alternate population/seed ran. `summary.json` and its retained `summarize.mjs` reproduce the comparisons and locator calculations without running another simulation.

| Current result | Bound |
| --- | --- |
| 3,000 pedestrians, 200 requested vehicles, seed 5970698 | Same defaults as literal `/?agents=1`; 5,463 ticks / 91.05 simulated seconds |
| Closest pedestrian 407.94 m at tick 5,463 | Minimum over every replay tick, world XZ distance to the crossing origin |
| Closest vehicle 426.08 m at tick 1,318 | Same minimum; not an eventual-route claim |
| Zero pedestrian samples inside 25/60/150 m; zero vehicle samples inside 150/300 m | Every five simulated seconds through 90 s |
| Zero peak pedestrian occupancy in the probe's broad scramble radius | The probe uses `junction.radiusM + 4`; this is not an exact diagonal/contact test |
| Final active 3,000/42; queued 915/17; completed 107/93; conflict crossings 1/166 | Pedestrian/vehicle order; whole-city counters, not signature-crossing events |
| First scramble pedestrian stage starts tick 5,280 (88 s) | Four vehicle phases, amber and clearance precede it; crossing photographs ended around tick 2,763 |

All seven compared final fields match the live manifest's final after-bracket exactly: tick, full pedestrian and vehicle status objects, lifecycle, boundary spawns, retired-in-place and authority violations. This includes wait values and generations, not just totals. The CPU clock is printed rounded; the browser reports 91.04999999999612 s. Counter agreement supports using this replay for diagnosis but cannot prove that every intermediate live pose matched it.

Before/after hashing preserved all 211 checked source/input/probe files. All 253 files in the observation's source binding match current bytes. The repository's own read-only `sceneTreeDigest()` returns exactly the observed 117 served files, 301,782,754 B and `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`. The 117 are 116 files under `data/scene/` plus the served network. `before.json`, `after.json` and `summary.json` retain the checks and artifact hashes.

## Causes established in current source

1. **The ordinary opening is unpopulated.** `src/main.ts:56–62` reads the URL population setting. `src/agents/population/config.ts:198–232` returns zero pedestrians/vehicles when no `agents` or count override is present. `/?agents=1` requests 3,000/200; count overrides can also enable it. `main.ts:73–85` mounts the World style dropdown, and there is no population control in `src/ui/`. The grand deliverable cannot honestly describe literal `/` as an active city under this contract. No default was changed here.

2. **Even opted-in startup is a boundary influx.** `tick.ts:416–425` selects pedestrian portals; current input has 31 eligible portals, nearest 499.867 m and farthest 698.420 m before lateral placement. `tick.ts:626–657` chooses one, assigns a route, sets travelled metres to zero and materializes the pedestrian there. `config.ts:51–65` locks normal cadence to 1.1 m/s times scale 0.92–1.08; `tick.ts:1838–1889` limits forward progress by that cadence, gates and avoidance. Centre/diagonal preference already exists (`tick.ts:486–489`, `routes.ts:466–472`), so adding another central preference is not the demonstrated missing feature. Existing comments about historical route lengths are not treated as a new measurement.

3. **Vehicles have no signature-crossing destination contract.** `tick.ts:430–435,514–557` filters legal boundary entries by class footprint and halt capacity, then requests an exit route and starts it at zero progress. `routes.ts:557–600` plans a bounded walk toward a true exit; the vehicle graph has no pedestrian-crossing field (`graph.ts:75–78`). The fresh run shows only peripheral traffic during this window. It does not prove vehicles can never reach the centre. Live refusals name bus footprint infeasibility, undrivable routes and blocked entry portals; these explain requested counts differing from drawn counts and do not justify weakening admission or reopening the accepted 200-vehicle exception.

4. **The renderer's counts are not visible-body counts.** `humans.ts:140` disables whole-mesh frustum culling; `humans.ts:161–186` traverses every active slot, chooses its distance LOD, demotes when a budget fills, and increments the count. It does not measure whether that instance survives projection, depth occlusion or clipping. Thresholds are 18/60 m (`config.ts:35–43`); all-far live samples fit the measured distant population. `render/pose.ts:14–34` translates from core world poses without a separate global origin. These facts do not establish that all actor rendering is correct; they reject counts as proof of visibility and give no current reason to change LOD.

5. **Asset loading deliberately does not warm the simulation.** `app.ts:185–196,278–300` holds fixed steps until the agent renderer mounts, then releases the same loop. Removing that hold would merely make the starting simulation age depend on asset-load latency. It would not produce a deterministic established city and would again hide boundary lifecycle events during loading.

Review 131 independently reports five empty native crossing images and no identifiable group at the opening/overview. Its full before/after bracket range is 18–64 vehicles, correcting the handoff's after-only maximum of 63. Its report is `artifacts/populated-visual-review-20260927/REPORT.md`, SHA-256 `9f9269fc2f8168230fe412b5e210fdc4d78d2a9895b253c7655e6542f5d91237`. This diagnosis does not repeat or replace that visual review.

## Smallest honest startup options

**Preferred first prototype: explicit deterministic pre-roll through the existing simulation.** Advance the same fixed-step callbacks, route state, admission owner, signal clock, lifecycle, poses and generations before presenting an established population. Keep progress visible and distinguish preparing the population from a ready active city. The application must own this startup state; neither a harness setter nor simply setting the simulated clock is acceptable. Handoff must preserve the same live objects and accumulator/previous-current pose semantics, without resetting signals or re-planning. Preserve a cold-start diagnostic mode for entry/lifecycle checks. Do not silently remove the current asset hold or let fetch timing choose the pre-roll duration.

This has the smallest authority change, but it is only a candidate. Existing Q1 stall, overlap and contact findings remain recorded open; advancing the same core does not repair them. This first 91 s already cost 34.5 s of CPU loop time, so long startup pre-roll could be an unacceptable wait. No extrapolated timing is a measured startup budget. There is also no proof that warmup alone brings a legal vehicle route through the signature streets. A bounded pilot must stop on its fixed cap or a named material constraint failure, not extend until a flattering state appears. Preserve ordinary structural refusals such as the accepted bus limitation. Choose and freeze the cap, stopping conditions and visible-entry criteria before running it. A warmup success requires actual native visible activity and preserved constraints, not just a higher tick/count.

**Alternative requiring separate contract review: legal interior initialization.** Initialize route-bound pedestrians on reviewed supported sidewalk approaches outside physical conflict areas, with full body clearance and non-overlapping spacing; use real route suffixes and ordinary admissions for every subsequent crossing. Vehicles require an independently demonstrated legal lane route, body support and boundary/lifecycle semantics. This could avoid minutes of empty travel, but is a new initial-state authority and support problem. Current Q1 work does not authorize it. Arbitrary scattering, endpoint relocation, seeding directly on crossings, manufactured grants or dropping actors cannot substitute. Do not implement this option without settling its exact initial-state, support, spacing and lifecycle contracts.

Whichever solution proves acceptable, the final product entry needs one deliberate contract: ordinary entry enables the established city by default, or exposes a clear real control that enters it. A URL query known only to developers is insufficient. Keep the explicit population-free gate entry available. This report does not authorize changing defaults or building a wider UI.

## Finite next observation and limits

Root may authorize one headless, actual-controls live observation aimed at these fresh replay hypotheses at tick 5,400 / 90 simulated seconds. The dump rounds coordinates/speed to centimetres; counts below use a 15 m XZ radius and are not camera-frustum predictions.

| Candidate camera target, world X/Y/Z m | Fresh replay contents | Purpose |
| --- | --- | --- |
| `(-104.9, 29.55, -412.8)` | 99 pedestrians; all recorded speeds above 0.2 m/s, range 0.22–1.13 | Determine whether a real resolved group draws correctly and expose possible crowd/contact defects |
| `(435.8, 27.7, 31.0)` | Three vehicles, two above 0.2 m/s, range 0–6.41 | Determine whether traffic bodies and wheels are visible on the eastern route |

These coordinates are proposed camera targets, never assertions about live actor positions. Drive controls, read actual camera/ticks, inspect native pixels, and report a miss if no group is visible. Do not move actors or reuse a historical anchor. A successful peripheral view cannot close the signature-crossing criterion; it separates actor rendering quality from startup distribution so the startup prototype addresses the right cause.

No more replay is needed for this diagnosis. No browser or server was launched; the single owned CPU process exited. No gate was run or claimed green. Q1's recorded diagonal/completion/overlap/contact requirements, Q5's visible signal-governed events and Q6's final performance remain open and were not retested here. Retain these compact artifacts while root reviews the startup decision; no task-owned process remains.
