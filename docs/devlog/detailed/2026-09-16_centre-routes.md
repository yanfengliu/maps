# 2026-09-16 — routes that end at the middle

The deliverable's subject is a 1 km box centred on Shibuya Scramble Crossing, and until this change nobody in the simulation went anywhere near it: the nearest pedestrian came within 336.278 m and the nearest vehicle within 426.085 m, with zero actors inside 200 m at any of 21,600 ticks. The cause was arithmetic. All 33 pedestrian portals sit on the AOI boundary, the nearest is 511.4 m of walking from the nearest central crossing, and the cheapest exit from the centre is a further 660.7 m, so a portal-centre-exit route is at least 1,172 m against `MAXIMUM_ROUTE_LENGTH_M = 700`. Two earlier lanes built that shape and reverted it twice.

## The route that fits is the one that stops

The contract's rule is a disjunction: a route must "include an outside exit section after that occurrence, or end at a true AOI portal with explicit boundary retirement" (`docs/reference/network-contract.md:21`). A portal-to-centre route satisfies the first disjunct literally — its last conflict occurrence is the scramble or a peripheral crossing, and the section after it is an ungoverned sidewalk of the origin's block. Portal to centre is 513 to 933 m and fits inside the cap. The contract is unedited and `MAXIMUM_ROUTE_LENGTH_M` stays at 700.

The passage factory, not a preference, settled the design: it refused all 18 of the first attempts that ended *on* a central crossing, for exactly the reason the clause gives. The scramble is a single compound, so a route cannot terminate inside it.

## What it moved

At the judged 360 s window with 3,000 pedestrians and 200 vehicles: pedestrians `crossed` **0 to 1703** and `completed` **0 to 309**; vehicles `crossed` **118 to 311** and `completed` **66 to 203**; `authorityViolations` 0, conservation exact, `retiredInPlace` 0. The nearest walker moved 336.278 m to **176.768 m**, and 28 actors were inside 200 m at t = 360 s where before there were none in the whole run. Over 2,700 s the nearest walker reaches **31.228 m**, 120 to 464 actors are inside 200 m at every sampled instant from t = 480 s, and up to 81 are inside 50 m.

A 60 s window shows zero pedestrian completions on this change and that is not a regression: a centre route is 513 to 933 m at 1.1 m/s, so the first arrival is at t = 302.5 s.

## The floor is the graph, not a knob

Actors are on and around the crossing's **block**, not on the crossing. All 18 reachable portals' optimum termini end on four legal central sections 43.85 to 57.78 m out, and none of the nearest legal termini (13.50 to 31.23 m) lies on any portal's shortest walk; 4 of the 17 planned routes walk the scramble compound and the rest reach the block without it. Reaching closer means changing where a route may legally stop, which is a contract question — the signature shot's framing will have to come from a camera on the crossing looking at the block, or from the contract changing, and that is worth saying plainly rather than tuning.

## What it cost

The lane measured all four percentiles improving. On the integrated tree under a concurrent software capture the numbers were p05 7.474 / median 12.844 / **p95 18.884** ms against the 16.667 ms interval, where a quieter reading before the change was p95 16.461 ms. So the change is inside budget on the median and p05 and outside it at p95 under load: the tail is the open number. The named lever for the tail is the allocation inside `orcaHalfPlane` and `linearProgram`, one `Line` object per neighbour per call at roughly 24,000 a tick, which no unit has touched.
