# Route continuity prototype: result and revised contract

Owner: route_continuity. Integration owner: root. Base `244632ca8d88dc464a162fad3782baa91f59f136`. Production code is unchanged. The root approved a bounded prototype, not production wiring. All commands below read junctioned data/dependencies and write only this ignored evidence directory.

## What passed

The 150 initial routes, seed 5970698, were recovered through 200 ordinary shipped population ticks. `path-prototype.ts` builds a continuous physical polyline and keeps its physical arc length distinct from the route's source station. It retains the current offset track inside each occurrence and tries trimmed cubic transitions at occurrence joins. First/last positions differ from the original sampler by at most 1.2711e-13 m. All 150 edge lists, source starts, gate records and seeded offsets remain unchanged.

There are 636,021 points in this deliberately simple representation. Independent sequential segment clipping checks 100 physical movement budgets on each route: 15,000 checks, maximum displacement over budget 8.7937e-14 m, maximum consumed-arc error 1.0051e-13 m, and maximum endpoint disagreement with binary sampling 8.0468e-14 m. This establishes bounded physical distance on the constructed polylines, not correct support, natural turns or the production integration.

The deliberately wrong source-distance control goes red without a discontinuity: slot 90 advances 0.017976414131908314 source metres but 0.12275813011199842 physical metres on one continuous candidate segment, a factor of 6.8288441293807045. Blending positions while continuing to spend source station as physical distance is therefore insufficient. `geometry-audit.json` records both endpoint points and distances.

## What the first refusal census actually means

`census.json` preserves the original prototype predicate: 0/150 routes pass both geometry and its provisional support test; 11 pass the geometry predicate and three pass the support predicate, with no intersection. This is **not** a source or strategy impossibility result.

Its constants are explicit: 0.25 m maximum physical chord, 2.5 mm midpoint approximation error, five-degree tangent change, recursion depth 12, 0.5 m support sample spacing, centre plus the four corners of the reservation square, provisional minimum turn radius `max(0.5 m, 2 * bodyRadius)`, and provisional 50 mm source-height residual. The last two are prototype choices, not canonical walking requirements. In particular, the canonical 50 mm model-space residual belongs to vehicle wheel support. Applying it to an upright walking body's source-height-versus-corner-height is not an established acceptance rule. Nor does a reservation square define the human's actual sole contacts. These support refusals cannot be called unsafe walking.

The construction reports 842 transitions below its chosen curvature bound. Of those, 285 use a trim below 0.5 m and 171 turn more than 150 degrees; the smallest trim is 0.2456976602 m. These are failures of the selected trim/cubic/radius algorithm, not measurements that no wider supported turn fits. No source turn was filtered.

The 2,150 adaptive incidents also overcount a narrower issue. The v1 derivative probe straddles known derivative cuts in the existing sampler and compares the full 3D tangent, including terrain slope. Subdividing cannot remove a true derivative kink, so it repeatedly reports the same cut. Independent one-sided samples at twelve exact cuts find both real horizontal direction kinks (0.708, 1.098 and 2.858 radians in named examples) and vertical-only kinks with effectively zero yaw change (3D changes 0.423 and 0.603 radians). `geometry-audit.json` preserves the exact source edge, coordinates, cut, epsilon and derivatives. The next construction should work from the source segment tracks and handle interior turns explicitly; preserving the old sampler's interior geometry also preserves its kinks. These observations do not justify widening geometry or relaxing a physical turn requirement.

The complete first census took 5.653 seconds after setup on one Node process during independent browser work. That is an observed elapsed time, not an uncontended performance result. No 3,000-body run or runtime update-cost claim was made.

## Support audit after correcting the instrument's interpretation

`support-audit.json` inventories every strict road/pavement triangle hit, without hiding a level beyond the hardware helper's 0.75 m search bound. It compares the source centreline, existing offset and candidate at the same 173,468 source stations, with five point probes per pose. It does not select final physical Y or approve a surface for walking.

| Reading | Source centreline | Existing offset | Prototype |
| --- | ---: | ---: | ---: |
| Centre points with no road/pavement XZ triangle | 14,081 | 16,228 | 16,203 |
| Centre points whose nearest road/pavement is more than 0.75 m from source Y | 103 | 173 | 173 |
| Equally near distinct levels | 0 | 0 | 0 |
| Poses with all five probes on some road/pavement triangle | 155,629 | 152,920 | 152,921 |
| Median absolute centre-height difference | 25.000 mm | 26.310 mm | 26.308 mm |
| 95th-percentile absolute centre-height difference | 39.046 mm | 57.036 mm | 57.109 mm |

The original candidate has 37,540 failed poses under the withdrawn 50 mm/square predicate. At the same source station, 37,430 also fail the original offset sampler; 110 are additional prototype failures, 108 on transitions. These counts distinguish inherited geometry from additions, but their predicate is not a walking-support standard. Full-footprint swept coverage was never proved by these finite samples.

`verified-surfaces.json` independently scans every triangle for representative cases and records full source edges, exact XYZ, all surface hits, triangle IDs/vertices and nearest real edges. It includes terrain as evidence, never as an automatic fallback. All recorded terrain hits are source triangles, not the later authored hole caps.

- Authored scramble diagonal near the origin: centreline `(-1.4343700871, 15.4169944035, 1.0871732373)` has no strict road hit, but its nearest road edge is only 0.113251 mm away. Existing offset `(0.2884236468, 15.4192458517, 0.2636782264)` misses road by 0.521753 mm. Terrain is around 15.197–15.198 m. Dropping the body 0.22 m to terrain at these narrow road seams would be a new defect.
- Source way 1391515612, roughly 45 m north: centreline gaps are 8.585 and 21.330 mm from road/pavement edges; one current offset misses by 172.336 mm. Terrain is 15.55–15.58 m and source Y is about 15.81 m. The prototype's largest of these retained example misses is 465.401 mm. That connector is not approved merely because terrain exists below it.
- Source way 1086844872 at an AOI entrance: centreline road/pavement coverage begins about 76 mm away. Terrain triangle 60037 exists at 14.8456487665 m; route Y is 15.0656487665 m. This is a different case from a hole in a crossing.
- Source way 1464521728: at existing offset `(-176.0474002988, 29.5018370881, 442.3442736328)`, road triangle 9792 is at 31.2439612372 m, whereas terrain triangle 30205 is at 29.4152447393 m. Choosing the road merely because it is highest would move the actor to a different physical surface.

The graph's height recipe explains why source Y is not final foot contact: `tools/network/generate.ts` uses the greater of terrain plus 0.22 m and an eligible road plus 0.025 m. The human asset contract says feet at zero. The `groundN` ID suffix is only the generator's drapable-piece index, not an elevation class. The source filter excludes bridges, tunnels and nonzero level/layer ways, but that does not by itself establish a particular displayed triangle as correct support for every offset. The road mesh hash differs from the network's historical provenance pin, a known lineage issue; this prototype did not regenerate either file.

## Smallest next contract for independent review

Keep the physical polyline/source-station distinction and distance-budget oracle. Replace the one-off cubic predicate with a bounded construction that handles **all** source-segment joins, including interior sampler kinks and reversals, preserves seeded lane positions away from joins, and reports an actual construction refusal without changing route choices. Refine only against named failing cases, not a global corridor framework. A piecewise path may need explicit bounded turning state at a sharp join; a minimum radius invented from the body reservation radius is not a reason to drop the route.

For vertical support, use a required, level-aware query of accepted pavement, roads **and source-ground terrain**, with source-occurrence context and the previously selected local surface. Return the chosen physical Y and surface identity rather than judging whether the old padded route Y is within 50 mm. The review must define source-ground eligibility, same-level selection and an actual foot-contact bound. No production missing-query bypass is proposed.

Preserve the local surface through a small same-level road/pavement seam when actual adjoining geometry and the delivered foot contacts establish support; do not borrow the paint-only seam allowance or silently drop to terrain. Conversely, an eligible ground-level path may use visible source terrain where that is the actual local ground, after independent review establishes the policy. Keep a higher unrelated road, authored terrain cap, unsupported extension and ambiguous level explicit. The measured examples above are the minimum test fixtures for that policy. A collision reservation square and foot support have different jobs and must not silently share a predicate.

Production should receive this query explicitly through population startup and every real tool, while synthetic tests explicitly supply their analytic surface. The source edge list, occurrence identity, passage objects, gate stations and seeded offset fractions remain authoritative. Physical movement spends physical arc; authority receives source station plus the actual post-step pose. Before a grant, stop at the earlier of the mapped source hold and actual footprint contact with its governed primitive. This keeps a smoothed corner from entering a compound early. The lease worker owns final physical clearance and retirement; the agreed terminal pose remains the current source endpoint plus its seeded terminal offset, with no outgoing transition.

No production component is ready to integrate from this prototype. The reusable verified piece is the physical-distance representation and its independent budget check; the next bounded implementation should combine it with a reviewed support selection and turning policy. The prototype does not establish crowd progress, appearance, vehicle behavior, full runtime performance, independent review or the five gates.

## Reproduction and cleanup

Run `node artifacts/route-evidence/census.ts`, `node artifacts/route-evidence/support-audit.ts`, `node artifacts/route-evidence/verify-surfaces.ts`, and `node artifacts/route-evidence/check-geometry.ts` from this worktree. All use the actual read-only source data. `freeze.json` binds retained scripts/reports to their hashes. Raw output remains ignored while root review is active. No browser or server was launched; privileged final process inspection found no owned Node/browser process. The worktree and read-only junctions remain intentionally available for root disposition, with no commit or merge claimed.
