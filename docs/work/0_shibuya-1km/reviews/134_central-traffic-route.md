# Review 134 — central vehicle route refusal

Bound: current-source, finite CPU investigation on main `0ec3dd03831b605235302212b7d140cb35297071`, whose relevant product files match Review 133. This review reproduces that census, identifies its stopping condition, and proposes a bounded planner repair for independent approval. It does not implement the repair or establish a legal initialized, supported or moving vehicle. Root owns permanent promotion and integration. Only `artifacts/central-traffic-route-20260927/` was written. The primary checkout was used read-only by explicit assignment; no worktree was needed for concurrent product edits. No relevant maps memory entry was found or used.

## Decision

The current planner has no route witness for the declared 95 central starts and three class bounds. The immediate blocker is the edge-local body halt filter, before passage construction. It excludes short sections inside already-covered compound passages as though every such section required a new halt. The running tick explicitly skips those gates while the actor holds that compound's lease. A concrete route through the scramble demonstrates this mismatch using the unchanged real passage factory. This supports a narrow, shared, route- and lease-aware halt-feasibility design; it does not authorize deleting the filter or declaring the candidate drivable.

The accepted 200-vehicle infeasibility exception remains. No larger walk budget, new seed, resized vehicle, invented exit, passage relaxation, network change or interior activation is proposed as a way to make this result pass.

## Exact inherited red, now localized

The first probe called the real `RouteLibrary.planFrom` factory, the repository instrument directly relevant to this question. It used Review 133's unchanged vehicle arguments: every null-junction lane/turn start within 150 m, stable radius/ID ordering, cap 512 (actual 95), seed 5970698, 120 edges, `walkAttempts: 3`, all three classes at scale 1.04, and the same `junctionId === null || lengthM >= radius` viability predicate. It asserted each returned refusal against the preserved `static-census-full.json`; all 285 matched exactly. The source seed is a direct `planFrom` stream seed, not a claim that it equals every runtime slot's derived stream.

`diagnose.ts` wraps the existing instance's actual `walk` and `assemble` methods and observes calls through a graph proxy. It does not substitute a copied walk implementation. Path-edge reads, rejected viability checks and successor queries are retained in `diagnosis.json`. The wrappers run only in the diagnostic process; source files and network data are unchanged.

| Observed on the exact 285 requests | Count |
| --- | ---: |
| Same refusal as Review 133 | 285 |
| Actual walk calls | 285 |
| Walks ending without an unseen viable successor | 268 |
| Walks reaching an edge with no raw exit-distance value | 17 |
| Calls to route assembly / its real passage factory | 0 |
| 700 m or 120-edge limit endings | 0 |

Although the request says three attempts, `routes.ts:385` breaks when `walk` returns null. Thus each exact request made one walk, not three. This is a description of the actual control flow, not a recommended retry repair: the complete filtered graph is disconnected from every true exit for these starts.

A complete reverse traversal of the real directed graph, retaining the unchanged body viability filter, found zero exit-reachable central starts for each class. A forward traversal from the union of the same 95 starts independently records the finite cut:

| Class at census bound | Radius, m | Reachable edges from central starts | Forbidden frontier edges | Reachable true exits |
| --- | ---: | ---: | ---: | ---: |
| kei | 2.1092222199325388 | 334 | 73 | 0 |
| taxi | 2.625455695645676 | 317 | 76 | 0 |
| bus | 5.752469674126819 | 129 | 59 | 0 |

All reached IDs and all forbidden frontier IDs, lengths and owners are retained in `cut-witness.json`. The unfiltered graph has 92 exit-reachable starts; the other three remain disconnected. The cut establishes impossibility under this filter on this candidate set, independent of seed, route length or attempt count. It does not establish physical impossibility of central traffic.

One exact seeded red is the nearest start, `lane:23334685:0:0:ground0:r:1:section1`, with the kei radius above. The actual walk visits ten edges totaling 122.07375863941662 m and stops at `lane:37865064:0:0:ground0:r:0:section2`, which still has raw exit distance 68. Its forbidden continuation `turn:lane:37865064:0:0:ground0:r:0>lane:37865047:1:0:ground0:f:0` is 2.0688228338001595 m, shorter than the 2.1092222199325388 m threshold. The full trace also retains the earlier rejected 0.17722137336791427 m scramble turn and 1.0129751209143736 m turn at `priority:node:444302327`. This is the failed actual walk, separate from the diagnostic candidate below.

## Finite passage counterevidence

The second probe runs a fixed dynamic program over all 4,855 delivered edges and remaining-edge budgets 1 through 120. It chooses the minimum complete route length to an existing vehicle exit; ties use stable sorted successor IDs. It emits at most one raw candidate per original central start. It neither edits nor labels these candidates as accepted plans. This finite enumeration was declared in its source before execution and retained the 15-second backstop.

It found 92 raw directed paths inside 120 edges, of which 91 also fit the unchanged 700 m cap. Calling the unchanged `createRoutePassage` at every governed occurrence accepted all occurrences of all 92 candidates. Calling the real current `assemble` accepted none: kei rejected 86 for a short governed section and six for a negative first halt; taxi rejected 85 and seven; bus rejected 78 and 14. The path over 700 m is counterevidence only and is not eligible for any proposed prototype. These counts are not route permits: the ordinary planner's body filter and its assembly backstop both remain red.

The useful candidate through the crossing is:

| Property | Exact observation |
| --- | --- |
| Start | `lane:1071930093:0:0:ground0:r:1:section0` |
| Start radius | 85.37048856724684 m |
| Route | 70 real directed edges, 636.9142742286133 m |
| Closest existing route sample | 2.5331833407762314 m from origin; not a continuous closest-point claim |
| True exit | `lane:31856144:1:0:ground0:r:0:section2` |
| Real passage results | 56 governed occurrences accepted, including a real boundary-exit profile |
| First passage | `scramble`, entry occurrence 1 through last conflict occurrence 30 |
| First approach length | 26.51084991280503 m |
| First refused short occurrence | Index 2, `turn:lane:1071930093:0:0:ground0:r:1>lane:1071930092:0:0:ground0:r:1` |
| Its length and route position | 0.09699370255350923 m long, starts at 31.802991429164138 m |
| Why it is internal | The real passage beginning at occurrence 1 already covers occurrence 2 through 30 |

For the kei at unchanged scale 1.04, all 15 short governed occurrences in this candidate are covered by an earlier real passage; for the taxi, all 16 are. These complete candidates have no mapped stop/yield controls; that makes them bounded counterexamples to the universal short-section rule, not tests of the mapped-control case. Both actual flat projected initial hulls touch no physical authority when evaluated with the real `projectVehicleFootprint` and `footprintOccupies`. The initial kei origin is approximately `(85.091558534, 15.050787359, 6.895432149)` m. The upward frame is the current placement convention; no terrain, wheel, displayed-road or contact-support evidence was derived from it.

A second, shorter counterexample starts at `lane:260252968:1:0:ground0:r:0:section0`, 61.33109429215233 m from the origin. Its 35-edge, 466.57066415820884 m path ends at `lane:375809332:0:0:ground0:r:0:section1`. The real factory accepts 29 governed occurrences. Its first short turn is 0.2892075691825291 m at occurrence 2, covered by occurrence 1's passage through occurrence 17. All nine short sections are internal for both kei and taxi, and their initial hulls touch no physical authority. This path moves away from the centre; the preceding 70-edge path is the stronger crossing candidate.

Eighteen kei/taxi candidate pairs within 700 m have a physically clear initial flat hull and all short sections covered by earlier real passages. These are diagnostic candidates, not eighteen legal spawns or a capacity estimate.

## Root cause and proposed narrow repair contract

`tick.ts:370–373` decides halt viability from a single governed edge's own length. `routes.ts:580` applies that predicate to every prospective successor; `routes.ts:653–665` repeats the rule on every governed occurrence during assembly. Neither asks whether the actor would already hold the passage covering that occurrence. A 9.7 cm internal turn is therefore treated as needing a new outside stopping position.

By contrast, the actual tick's `gateBeyond` at `tick.ts:941–950` excludes gates whose owner equals the currently held lease's owner, and `gateStop` consumes that result. The authority retains the same real passage through its internal occurrences and gaps until route progress and full-footprint clearance permit release. The counterexample is inside the explicit occurrence window, so it does not rely on equating a later re-entry with the earlier visit.

Recommend a separately reviewed planner increment with one shared definition of a halt obligation, used by the planner, runtime and any diagnostic. Do not merely erase `viable`, remove the assembly check, merge graph sections, or widen the authority. Route construction must consider occurrence and passage context; its complete candidate must still pass the unchanged passage factory and all body/exit checks before it can be returned.

1. Preserve first-entry refusal. At route distance zero there is no lease. A first authority still needs a nonnegative, full-body clear approach halt. A null-junction start does not establish that clearance, as the nearest-start hull already demonstrates. No grant, signal offset, fabricated dwell or initial commitment may be inferred from the candidate path.
2. Treat a short governed occurrence as covered only when the actual complete route's retained real passage covers that occurrence, the same authority still owns the lease, and no release/re-entry boundary has intervened. Use passage identity and occurrence bounds, not just the previous edge's owner or a matching string somewhere earlier in the path. Internal null gaps stay covered according to the unchanged factory.
3. Preserve a separate halt before another authority, with full old-hull release required before new admission. Do not carry a lease into an unrelated authority, across a completed visit or into a later lap. The runtime's current owner-based skip must be covered by focused tests against these transitions; the planner must not quietly implement a different skip rule.
4. Keep mapped stop/yield obligations independent from admission gates. A held lease does not authorize skipping a mapped control. The current `controlStop` has its own occurrence/progress filter at `tick.ts:990–1004`; do not infer its correctness from the gate skip or from the control-free candidate here. Freeze a real mapped-control negative case before any repair claim, exercise the actual helper/authority path, and preserve fresh dwell on re-entry.
5. Keep actual class dimensions, scale and projected envelope. Measure required stopping clearance over the route prefix and current body pose; the upcoming short section's length alone neither establishes nor disproves approach clearance. Do not substitute a smaller body or a nominal-size rectangle. Preserve true AOI exit identity and `bindBoundaryActor`'s slot/generation/route binding; the candidate's factory boundary profile is not evidence that binding, supported egress or retirement was exercised.
6. Keep the route search finite: the same 95 starts, body classes after the explicit instrument correction below, no additional seed, no more than 120 edges and no more than 700 m. A predeclared deterministic passage-state search may replace the unsuitable edge-only predicate. Candidate generation must remain separate from admission, and a refused complete candidate cannot become a permit through fallback. Freeze the search and tie-breaking policy before running it.

Suggested bounded acceptance for that increment: reproduce the exact old red; preserve the named 70-edge source candidate and bytes; obtain a real factory plan with the full unchanged body and first/transition halt checks; and make controls go red for a short unleased entry, negative first halt, physical initial overlap, different authority, completed visit/later lap, internal mapped stop, wrong directed edge, false terminal and stale lifecycle binding. A retained internal passage may remove a redundant admission halt, but a whole-body clearance or control failure must remain a refusal. The plan and all these checks need independent review before any interior activation work.

## Interaction with Review 133's cold-path promise

Review 133 proposed that the existing cold path remain bit-identical at equal ticks. A shared planner repair can change boundary portal eligibility, route selection, refusal counts and subsequent simulation even when the constructor policy is unchanged. It therefore conflicts with that blanket promise if applied to ordinary boundary planning. Root must explicitly approve the revised comparison contract before implementation; do not claim unchanged cold simulation after changing its planner.

The preferred design is one corrected planner for both initial and boundary traffic, with a frozen before/after boundary census and affected cold simulation checks that disclose intentional route changes. Preserve the earlier cold result as baseline evidence. Do not add a permanent duplicate legacy planner merely to retain the old bytes. If root instead requires cold bit identity for the first constructor milestone, the shared vehicle repair must remain a separate blocked dependency until that policy changes; the pedestrian prototype does not authorize an implicit vehicle exception.

## Separate instrument correction: bus scale

Review 133 correctly recorded the parameters it passed, but its phrase “maximum normal vehicle scale 1.04” is not true for the bus's displayed runtime scale. `vehicleScale` at `routes.ts:716–727` clamps the actual class envelope. Calling that current helper with the maximum draw gives a bus upper bound of 1.001695679710784. The real `vehicleEnvelope(bus, 1.04)` rejects a 12.04357794922625 m supported diameter against the unchanged 11.6 m network bound. Kei and taxi accept 1.04.

The 285 old refusals and their hashes are preserved unchanged. This review has not rerun a corrected bus census or used a corrected green. Propose that an independently accepted census use the same actual scale helper per class before route planning, validate the generated envelope before counting a route request, and label graph-only conservative class screening separately from displayed-body admissibility. Do not silently shrink the old bus to get a route; correct the instrument's runtime claim explicitly and retain the red control that rejects its former unsupported bound. The ordinary population's precomputed portal-screening loop at `tick.ts:431–434` also uses 1.04 for all classes; that conservative screen is a distinct production decision and should be disclosed if the shared planner increment revisits it.

## Verification, retained evidence and remaining boundary

Both finite scripts completed on Node `v24.12.0`, satisfying the pinned Node 24 major. `diagnose.ts` measured 80.2013 ms internally; `cut-witness.ts` recorded 218.8426 ms before writing its JSON (about 228 ms through its final console output). These are diagnostic times under current machine load, not startup or performance acceptance. Their exits were 0 and their generated JSON was inspected. Exact final input/source, script and artifact hashes are in `freeze.json`, including the unchanged inherited report, freeze and census bytes.

No production code, data, cache, asset, build or Git mutation; no browser, GPU, server, network, population update, full replay, full gate or activation. Parent-owned documentation changes appeared during the investigation and were left untouched. No browser, GUI, server, background helper or child-process launcher was used. Both synchronous Node probes exited. A final task-path-scoped CIM process inventory was attempted but Windows denied access, so an OS process inventory is unavailable; no process was terminated. Retain both scripts and both JSON outputs while this route dependency and independent review remain open; the full finite records explain the verdict and are not promoted repository inputs.

Still unproved: a plan returned by a corrected current factory; actual first and transition halts; support and steering along the crossing candidate; real receiving capacity and mapped-control behavior; an initial lifecycle operation; continuous supported egress and retirement; visible traffic in both styles; and affected cold-path behavior. Existing Q1, Q5 and Q6 requirements are neither retested nor waived. Graph and passage counterevidence identifies a narrow repair target; it does not itself satisfy the vehicle route dependency.
