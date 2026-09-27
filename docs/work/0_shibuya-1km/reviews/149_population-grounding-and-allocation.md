# Review149 — displayed-pose grounding and one atomic allocation attempt

2026-09-27. Artifact-only owner: population_startup_review. Root owns architecture/integration. Workspace: `C:/Users/38909/.codex/worktrees/population-startup/maps`, detached base `0ec3dd03831b605235302212b7d140cb35297071`. Product files remain unchanged: Review139's two unwired files and full old freeze are preserved. Current primary A8 source is consumed read-only by exact hash. No default, demand, floor, route, seed, lease, signal, asset or current renderer code changed.

## Decision and concrete outcome

The coherent upright displayed-pose mechanism has a **bounded idle geometric positive**, with the original15mm contact criterion and disclosed submillimetre penetration. It is not anatomical sole, strict-zero-penetration, walking, GPU or runtime acceptance. The single authorized24-slot allocation attempt then **refused atomically**:16 tentative fits, zero published occupants, zero activated bodies. Prescribed slot16 exhausted277 original starts. The constructor took **671.0507ms** under its5000ms cap; asset-side compilation separately took209.2902ms.

This is failure of the stable greedy assignment in the prescribed order, not proof that no assignment of24 fits within the same277 starts. There was no backtracking, reroll, expanded census, smaller radius, reduced count or retry. The claim file preserves attempt1 and refuses another execution. No120-tick continuation was run because a complete24 batch was not admitted. The earlier positive geometry remains preserved independently of the packing refusal.

## One displayed-pose owner

The sealed `DESIGN.md` names the population core as sole owner of displayedY/support. Source routeXYZ, yaw, travel, occurrence, RNG and generation remain logical state. The core resolves separate displayedXYZ on the recipe-owned pavement, keeping humans upright. Construction writes identical previous/current displayed poses only as a complete transaction. Every ordinary fixed proposal must use the same resolver. Shared A8 entry bodies and current occupancy use the displayedY vertical interval with the existing measured upright cylinder and50mm clearance; nominal motion/admission footprints are unchanged.

The core owns a piecewise trace over the previous/currentXZ segment, partitioned at support-triangle boundaries. A renderer samples that read-only law at interpolation alpha and writes the existing instance transform. It does not query another floor, add another offset or interpolate raw sourceY. A generation change cannot blend across identities. `grounding.ts` is a pure artifact demonstration of that owner/query/trace boundary; its trace proves the contact origin only. Full moving-footprint/contact certification, state-buffer integration and walking/VAT blend behavior remain required before wiring it into `render/pose.ts`.

A hole, conflicting level, support discontinuity or exit from the owned hero scope refuses the proposed step. A bounded prototype hold is not permission to stall forever or retain a crossing lease indefinitely. Complete routes still need an owned support handoff after hero exit before runtime/crossing acceptance. No next patch is invented or silently taken from the underlying road. The first unowned location on each complete tentative route was not censused in this lane; full route identities are retained for that later bounded dependency.

## Current floor and actual geometric positive

Review144 report/freeze hashes were verified: `b5dc6b2a4e4120d428b2f01f3c3e151ee55ff7029c5eab6f82b2f66f5630b86f` / `b53af6375e5beeae5d11ad8a3915c227f4842a4c9596a25c52b35384769d3431`. The actual pavement, recipe, selection, roads and terrain bytes match its source-owned hero witness. Only pavement top triangle range[402706,460443) is used. Retained unclassified pavement, risers and hidden roads are excluded. Coverage and conflicting owners are checked independently from contact arithmetic.

The first preserved sample is the exact lower vertical envelope of the actual indexed commuter-male FAR shoe draw at idle frame32. On `walk:664871982:0:0:ground0:r`, slot1 scale0.95998615026474, unchanged logicalY15.487517356872559 becomes displayedY15.542043685913086 at the current owned anchor. The envelope covers0.0357280280513m² in worldXZ with no gap or competing floor. Normal residuals: minimum0.193095mm; p05/median/p95 3.448789/10.778453/19.375926mm; maximum39.726338mm. Its X-half minima are1.388570mm and0.193095mm. Observed area within15mm is0.0264505465547m², about74.03%.

That last fraction is a measured geometric contact band, not an anatomical-base definition. Raised arch/toe underside is not required to touch. The initial all-nine topology census showed why downward face normals alone are insufficient: downward-facing geometry reaches94–127mm above the base, including upper/interior surfaces. `lower-envelope.json` and `contact-distribution.json` preserve the real projected polygons, floor planes and point-corresponding witnesses, rather than promoting a convenient height band into soles.

Root then authorized exactly9 delivered draws×16 adjacent idle intervals, wrap included, on the same fixed edge. Actual prescribed representative slots/scales are:

| Variant | Slot | Scale | Placement |
| --- | ---: | ---: | --- |
| commuter-male | 1 | 0.95998615026474 | Existing slot1 lateral route placement |
| office-male | 5 | 0.97953814268112 | Existing slot5 lateral route placement |
| commuter-female | 0 | 1.03912580013275 | Existing slot0 lateral route placement |

All9 cases complete in **2521.5134ms** under the fixed45000ms offline cap. Actual selected GLB primitives and half-float VAT positions are hash-bound. Each vertex trajectory is partitioned at its containing owned floor-triangle boundaries. Every interpolating indexed triangle lies inside the convex hull of its six endpoint vertices, yielding a conservative entire-triangle lower residual bound against the floor planes it can meet. Full collision-footprint, vertex-trajectory and triangle-sweep coverage is complete for all9. Each geometric X-half has an actual indexed-point witness within15mm through each interval. All geometry stays above−15mm within this CPU bound.

Strict nonpenetration fails in8/9 cases. The worst actual point is **−0.520480mm**, female/far frame42 VAT409, world(-31.551902745603,15.540877278775035,15.509375628593261), owned hero triangle410883. The far commuter-male minimum is+0.174441mm. Root accepts this distinction under the unchanged15mm contract. No extra lift or phase lock was applied. These are geometric-half contact-existence witnesses; all-phase contact area and anatomical attribution are not established. CPU arithmetic uses decoded half floats and float32 instance coefficients; a GPU arithmetic certificate and native observation remain absent.

## Reusable cost design and single attempt

`asset-cache.ts` compiles all selected idle endpoint geometry across the three LODs per variant into conservative convex support vertices, with actual indexed per-draw/per-half contact trajectories. Every rendered triangle and its idle interpolation lies inside that convex superset. Endpoint counts29360/29328/28832 reduce to268/260/266 hull vertices. Maximum hull-face containment residual is at most1.11e−16m. Compilation took209.2902ms, once. No underside reconstruction is repeated per candidate/tick. Three cache-preflight cases agree with the previously measured representative poses and pass in124.4354ms including floor setup and input checks.

Candidate testing transforms the cached hull into the actual displayed pose, proves owned shoe-projection coverage, bounds lower residual against each intersected floor plane, and traces real contact-point trajectories. The cache is deliberately conservative: plane extrapolation may refuse a pose without proving its actual geometry penetrates. A0.1mm numerical margin tightens, rather than increases, the15mm acceptance bound; it is not claimed as a GPU error certificate. This asset cache covers idle only, not moving walk/idle blends. The cost design is not a measured60fps runtime.

The attempt used the original first at most512 sidewalk starts within150m, in unchanged stable edge order;277 exist. It retains slots0..23, generation1, normal RNG positions/scales/variants, real centre routes including the authored diagonal,120-edge/three-attempt bounds and actual nominal physical-conflict checks. `PedestrianEntrySpace`, `pedestrianEntryBody` and its overlap predicate were imported from the exact reviewed primary A8 source, SHA `826b3bd2a365b05b1ae777c5d1c1284f2175ae6b448632685d8872261edcedc6`. No duplicate clearance algorithm was substituted.

The shared temporary entry space starts empty because this pure attempt activates nothing. The16 tentative proposals seed it locally in order. This establishes spacing among those proposals, not live-vehicle compatibility in an integrated constructor. Future activation must use the unified existing occupancy owner and preserve honest waiting/active counts. Full chosen slots, logical/displayed poses, source routes/passages, body radii, support/contact evidence and all refusal records are retained in `allocation-attempt.json`.

Across2915 candidate checks the ledger contains644 missing complete owned-footprint patches,1560 physical conflicts,543 route failures,146 A8 clearance refusals, five conservative idle-penetration refusals and one competing-owned-level refusal. The16 fits remain diagnostic only. Demand stays3000 and requested initial count stays24; failure publishes an empty occupant array.

## Exact slot16 failure and diagnostic limit

Slot16's277 starts divide into46 route failures,142 physical conflicts,63 missing complete owned footprints,25 A8 clearance refusals and one conservative idle refusal. Thus **26** pass route/physical/owned-footprint checks. The sole A8-clear start is `walk:522821276:1:0:ground0:r`, displayed(-0.19711177051067352,16.02627182006836,66.87662506103516). Its cached lower bound is−296.652524mm against hero plane420751, so it refuses. The retained worst world point is a conservative hull/plane-extrapolation witness, not a measured point-on-triangle penetration claim.

**Idle checking follows A8 clearance in the executed attempt. Therefore the25 A8-blocked starts have no slot16 idle verdict.** They cannot be called otherwise fully valid, and no later probe filled that missing compatibility data. `slot16-summary.json` is derived solely from recorded results. It includes every proposed body and the blocking earlier body's exact pose/radius. The recorded blockers are:

| Slot16 start | Blocking earlier slots |
| --- | --- |
| `walk:1335178865:0:0:ground0:f` | 0,9 |
| `walk:1335178865:0:0:ground0:r` | 2 |
| `walk:1335178877:0:0:ground0:f` | 1 |
| `walk:1335178877:0:0:ground0:r` | 3 |
| `walk:1335178878:1:0:ground0:r` | 4 |
| `walk:1335178879:0:0:ground0:r` | 5 |
| `walk:1335178880:2:0:ground0:r` | 6 |
| `walk:1335178881:0:0:ground0:f` | 7 |
| `walk:1335178881:0:0:ground0:r` | 8 |
| `walk:664532523:0:0:ground0:r` | 9 |
| `walk:664532523:1:0:ground0:f` | 0,9 |
| `walk:664532523:2:0:ground0:r` | 10 |
| `walk:664532525:0:0:ground0:r` | 11 |
| `walk:664532525:1:0:ground0:f` | 11 |
| `walk:664532525:1:0:ground0:r` | 5 |
| `walk:664869088:0:0:ground0:f` | 11 |
| `walk:664869088:0:0:ground0:r` | 8 |
| `walk:664869088:1:0:ground0:f` | 8 |
| `walk:664869088:1:0:ground0:r` | 4 |
| `walk:664869088:2:0:ground0:r` | 6 |
| `walk:664871981:0:0:ground0:f` | 12 |
| `walk:664871981:0:0:ground0:r` | 13 |
| `walk:664871982:0:0:ground0:r` | 9 |
| `walk:664871985:0:0:ground0:r` | 2 |
| `walk:664871985:1:0:ground0:f` | 2 |

The independent next decision is between a bounded assignment search inside this same277-start census (with the missing slot-specific geometry compatibility explicitly evaluated) and a separately designed source-route sampling policy. Neither is authorized or attempted by this result. Sixteen is the stable greedy prefix found, not a certified maximum packing number.

## Controls, preservation and handoff

Nine literal controls pass: actual owned pose; hidden-road refusal; retained-pavement refusal; complete-footprint gap refusal; persistent next-pose grounding; rejection of a one-frame offset reverting to logicalY; point-corresponding core trace; generation isolation; and hero-exit refusal. The trace-control next point is20mm along the real route, not a simulation tick. The wrong next logicalY misses the required displayedY by over54mm. The controls take192.3894ms and do not manufacture an admission.

The mechanism stage was sealed before the allocation: `DESIGN.md` SHA `7f0be0ea39c4f16ec36d11b0ea30c6acc54434b1342663ec271f419b54b1f22b`; `mechanism-freeze.json` SHA `1a02d30f0ca40273b8bf95afece91ba6f0ce873d6a078ffdf779e8b5572f73a2`. It remains unchanged. The final `freeze.json` binds this report, every artifact and the old Review139 preservation check. All outputs are intentionally retained under the ignored artifact directory, including the one-attempt claim. No primary staging or cache writes occurred in this resumed task. No browser, GUI, server or background watcher was started; task Node commands exited. No full tests, build, audit, GPU/native gate, commit, integration or independent code review ran in this lane.

Unmet: complete atomic24 allocation; slot16 idle results behind early A8 refusals; full-route owned support/exit handoff; integrated single-owner pose buffers and render-alpha sampling; walking/clip blending through120 actual ticks; live-vehicle/shared lifecycle integration; native appearance and final gates. Actual activation and default population remain unchanged. Root owns the next bounded choice and permanent docs. This lane stops at the preserved one-attempt refusal.

## Exact witness locations and schema for the next reviewer

All paths below are relative to this ignored evidence directory. `allocation-attempt.json` is the single outcome: `occupants=[]`, `actualActivated=0`, `tentativeCount=16`. `tentative[]` retains each slot/actorId/generation/variant/scale, edgeId, logical/displayed position, yaw, supportNormal, identical previous/current poses, state flags, A8 `body{x,z,radiusM,minimumY,maximumY}`, anchorTriangle, `contact{lowerBoundM,upperContactBoundM,numericalGuardM,worst,witnesses,shoeProjection,ownedTriangles}`, and `route{edgeIds,starts,totalLengthM,passages,gates}`. `refusals[]` always has slot/edgeId/reason; physical conflicts carry junction IDs, floor failures carry logical position and available missing area, A8 failures carry logical/displayed positions/body/blockingSlots, and idle failures carry the conservative bounds and available worst hull/plane point. The one competing-level ledger row does not retain the pair of conflicting triangle IDs; that diagnostic detail is unavailable without a new geometry query.

`slot16-summary.json` adds no evaluation. Its `blocked[]` rows include `blockers[]` with the earlier chosen slot, edge, displayed position and complete A8 body; `idleRefusals[]` copies the sole recorded slot16 idle refusal. It explicitly marks `idleTestNotRunForBlockedStarts:true`. `allocation-attempt-claim.json` is the pre-execution bound and prevents reuse of the allocation script.

`idle-intervals.json.results[]` identifies actual representative slot/scale/variant/LOD, source/displayed pose, phase and anchor triangle. `worst` names frame pair, VAT ID, geometric half, exact floor span and world point. `intervals[].witnesses[].spans[]` retains triangle IDs, parameter ranges and normal residual bounds for the real contact-point paths. `conservativeTriangleWitness` is labeled as a bound, not an observed point-on-plane event. `contact-distribution.json.pieces[]` retains the first exact underside's clipped rings, areas and point-corresponding floor samples; `lower-envelope.json.patches[]` retains its local lower-envelope rings/planes. `asset-cache.json.variants[]` retains the reusable convex vertices and actual LOD/half/VAT contact trajectories, bound by its `inputs[]` hashes. `controls.json.checks[]` retains all nine observed control outcomes. `mechanism-freeze.json` preserves the pre-allocation stage; `freeze.json` binds the final complete handoff. No selected/rejected witness was replaced by a later attempt.
