# Review144 — selected startup floor and point-corresponding geometry

2026-09-27. Independent bounded review of primary `f078538b070b9cdb97cdd578b6bddfa1c386881b` and the uncommitted Review139 helper at detached base `0ec3dd03831b605235302212b7d140cb35297071`. Bound: the frozen 86 physically eligible, diagonal-route starts for slot 1, generation 1, variant 0, scale `0.95998615026474`; current displayed source triangles and delivered commuter-male shoe geometry. No route is regenerated and no population step runs. This is a finite CPU design/refusal review, not startup capacity, runtime admission, full sole acceptance or native appearance acceptance.

## Decision

Do not extend the helper by replacing its exact-flat test with all-layer projected coverage or nearest route-height selection. Those changes would admit geometry without selecting the surface that actually owns the location. The current reviewed hero pavement provides the smallest existing, explicit local floor interpretation. All **26** frozen starts with complete coverage from that hero top fail the original **15 mm** contact requirement at actual indexed shoe points, both at the actual tick-zero idle phase and among the idle endpoints. Aligning the body with the anchor triangle's slope does not repair those 26 without changing height or pose.

There is **no supported original candidate established by this review**. That is not proof that all 86 are impossible. Two starts in the older, explicitly unclassified pavement region survive a necessary geometric-minimum test under different orientations. Neither has a complete source-owned floor plus a complete rendered-base witness. Their concrete identities and remaining work are below. Twenty-four-person capacity is not tested; no allocation, partial batch or production approval is returned.

Review133 remains the governing contract (`reviews/133_population-startup-design.md:46–48`). Its 15 mm bound is unchanged. Review139's flat-only refusal is narrower and is not used as evidence against a slope. No height, floor, route, source, threshold, seed, asset or product code was changed here. Root requested sealing this bounded result after the existing controls; no wider search follows.

## What was checked

`inspect.ts` verified the supplied Review139 report SHA-256 `4185e1da4fb5c5b8c1ac88069b7214e124683126d31bded93b7beed2017abe4c`, freeze SHA-256 `8eb327959db7fee2ac3c51b9cfb79ad0c399f3df8c4bdbc05646f0c19655ef9e`, and every file the freeze names, including the helper and tests. Every retained clipped triangle was checked vertex-for-vertex against its current mesh index. The existing exact planar partition functions recomputed full collision-rectangle coverage separately by mesh and recipe ownership.

| Full projected footprint coverage | Starts |
| --- | ---: |
| Road/pavement union | 80 |
| Roads alone | 80 |
| Pavements alone | 46 |
| Reviewed hero top alone | 26 |
| Retained older pavement alone | 20 |
| No complete road/pavement union | 6 |

These counts concern this one slot's unchanged footprints. The six missing unions remain road/pavement support refusals; source-ground acceptance was not invented for them. A terrain fallback would need its own valid source-ground witness and contact check.

The canonical recipe explicitly classifies only the two hero ground parents and a separate lower bridge clip (`docs/reference/pavement-recipe.md:11–15`). Its older retained pavement is not given physical-layer acceptance. `composePavement` appends the hero after 402,706 retained triangles. `buildHeroPavement` writes 57,737 top triangles before its risers (`tools/scene/compose-pavement.ts:44–49`, `tools/scene/pavement-hero.ts:35–52`). `contact.ts` called that current pure producer on the exact cached selection, terrain and roads in memory, then compared all appended hero positions and indexing references with the displayed pavement. Every coordinate matched. The selected top range is `[402706,460443)`; risers are excluded. This binds the floor to actual geometry and the existing reviewed interpretation, rather than granting authority to a name supplied to the helper.

The canonical `createWalkingSurfaceQuery` was inspected (`src/agents/population/walking-surfaces.ts`). Its anchor and segment tracing do not prove complete footprint coverage. The paint sampler and its seam tolerance are not pedestrian support authority. No held F37 or historical source-reference machinery was used.

For contact, the current `selectedHumanParts` contract selected actual indexed shoe VAT IDs from every commuter-male LOD: 1,614 near, 186 medium and 35 far. GLB and VAT bytes match their manifest digests. The probe decoded actual half-float positions and used the shared `writeSupportBasis`, float32 instance basis and current idle phase formula (`src/agents/render/humans.ts:172–181`, `src/agents/render/vat.ts:31–44`). It evaluated the real slot-1 tick-zero phase and all 16 idle endpoints, unchanged position/yaw/scale, under both the helper's upright transform and the anchor triangle's upward normal. Each residual is evaluated at that vertex's own world X/Z against the containing triangle, along that triangle's normal. All-layer extrema are never substituted for this correspondence.

The point minima are taken over entire selected shoe draws, split by initial X sign only to retain two geometric halves. They are **not an anatomical sole definition** and no height band is promoted. A selected shoe point more than 15 mm under an owned pavement suffices to refuse this initial geometry. Conversely, minima inside the bound do not establish a complete contact patch, every triangle interior, every interpolation interval, anatomical correspondence, all variants or all slots. The probe therefore labels survivors `notRefutedByVertexMinimum`, not supported. The source-bound hero failures need none of those missing positive claims.

## Concrete refusals and survivors

Across the 26 completely covered hero starts, the worst measured shoe-point residual per candidate ranges from **−61.395291 to −17.117588 mm** upright, or **−56.715063 to −15.830302 mm** slope-aligned. Every hero candidate has an actual tick-zero failure as well as an endpoint failure.

The least severe hero refusal is `walk:1335178881:0:0:ground0:f`, 65.479 m from the origin, unchanged position `(38.96105194091797,15.68726634979248,52.626834869384766)`. Its selected pavement anchor is Y `15.703078572954807`. With the selected slope normal, near-LOD shoe VAT ID **17418** at idle frame **34** is at `(38.84739602598265,15.687774380873162,52.74950404104595)`. Actual pavement triangle **442862** is Y `15.703605315595842` at that same X/Z. Normal residual is **−15.830301582 mm**. Tick-zero near-LOD minima are **−15.813015/−15.813066 mm**, so the refusal does not depend on waiting for frame 34.

The nearest projected-complete candidate, `walk:664871982:0:0:ground0:r`, remains 35.581 m from the crossing. Its hero anchor is **54.526498 mm** above route Y; its slope-aligned worst shoe point is **54.545105 mm** below the actual pavement. Calling the underlying road the floor would discard the explicit pavement owner.

Two retained-pavement cases survive only the necessary endpoint/minimum test:

| Frozen start | Distance | Transform | Range of frame/half minima |
| --- | ---: | --- | ---: |
| `walk:1066171780:0:0:ground0:r` | 93.650 m | Upright | −14.732839 to −12.408205 mm |
| `walk:522821274:0:0:ground0:r` | 93.753 m | Anchor normal | −13.640539 to −11.953761 mm |

The first fails when slope-aligned (worst **−30.065030 mm**). The second fails upright (worst **−15.071985 mm**). This is direct counterevidence to choosing a slope normal generically as an automatic fix. Both footprints intersect the same current published-LOD3 source polygon, `poly_7d4dd29c-71ff-466c-ae5d-8a03e11e8938`, TrafficArea function 2000, parent `tran_0c0f6741-adbf-4ee5-b51e-b0e4e5bcefbf`, area `traf_786cdb92-aa91-481e-aa55-027b5896b463`. The source intersection covers each 0.230393352175 m² footprint; its source Y range is 15.62–15.90 m. These facts identify a bounded future ownership investigation. They do not connect each retained displayed triangle to that source or classify the overlapping adaptive surfaces. `controls.json` preserves the identities. No parent or layer was silently added to the reviewed hero scope.

The diagnostic road-only test also finds no start that survives all frame/half minima, but road-only results are not a selected-floor census. Partial pavement, distinct layers and source-ground possibilities prevent promoting that number into whole-86 impossibility.

## Minimal actionable contract and root's choice

The smallest valid extension is a **selected current patch plus point-corresponding rendered geometry**. Keep source ownership separate from the numerical contact test. On the current accepted hero scope, identify the exact mesh digest and triangle range by the recipe replay above, require complete footprint coverage on that owned physical level, and reject holes or competing levels. For every admitted base/contact point, keep its draw/LOD/VAT frame and index, exact displayed pose, containing floor triangle, X/Z correspondence and normal residual together. A positive constructor witness must additionally establish the real base/contact portion, its coverage through idle interpolation and all prescribed variants/LODs. The present minimum tests cannot provide that positive. A mathematical segment against changing support triangles must be partitioned where triangle ownership changes; flat-floor endpoint convexity cannot be carried over blindly to slopes.

**If height and pose must remain exactly as today**, the reviewed hero scope has no positive for these 26. The narrow unchanged-Y branch is the named retained-source region above; it needs explicit local floor ownership and a full base witness before it can be considered, and still says nothing about 24-person packing. This review does not recommend rerolling or expanding the source search.

**If root wants to use the already owned hero pavement**, it must explicitly authorize a change to the original no-height-adjustment contract or a separately supported pose adaptation. The least severe candidate's slope-aligned worst point would require at least **+0.830335 mm** of vertical actor shift merely to reach the 15 mm boundary for that measured point; upright needs at least **+2.117672 mm**. Putting its origin on the selected anchor instead requires **+15.812223 mm**. The near-crossing 35.581 m candidate needs at least **+39.545180 mm** for its worst slope-aligned point, or **+54.526498 mm** to put its origin on the anchor. These are measured lower bounds or anchor deltas, **not sufficient accepted translations**. A supported displayed-pose height could be distinct from unchanged logical source Y, but that is a cross-contract design change needing coherent constructor and subsequent pose ownership; a one-frame render offset would not be a valid repair. No such change is approved or implemented here. Raising the floor, selecting a hidden lower road, changing the tolerance or changing the route seed is not proposed.

## Controls, execution and remaining bounds

`controls.ts` binds the least-severe refusal's actual triangle and unchanged shoe point. Its selected-geometry positive places an instrument point on the actual plane and reports effectively zero residual; it does not move or admit an actor. The actual unchanged shoe point refuses `contact-15mm-exceeded`. Substituting its overlapping road refuses `wrong-level-or-owner`; removing the selected patch refuses `missing-complete-footprint-patch`; shifting the claimed X by 0.1 m while retaining the original shoe point refuses `incorrect-point-correspondence`. All five observed outcomes are in `controls.json`. They validate this finite instrument, not production tests or caller-authentication guarantees.

Reproduction: `node --experimental-transform-types artifacts/startup-support-review-20260927/inspect.ts`, then `contact.ts`, then `controls.ts`. The local runtime is Node **24.12.0**. Inspection and controls exit 0; the contact result records **13,746.1339 ms**, below its fixed 45-second offline cap. Its launch returned a running shell session whose identifier was not retained; its final exit status was therefore not captured. The completed result was read and all its input hashes were checked again by the succeeding controls process, which exited 0. The initial attempt to use `--import tsx` failed because that package is absent; no dependency was installed. No constructor timing or browser timing is inferred from these CPU measurements.

Cached data and every Review139 frozen file were rehashed before and after the probes. The final seal records all evidence and consulted implementation hashes. Root-owned edits to `plan.md` and new Reviews141/142 appeared during the review and were preserved; this lane made no tracked edits. No browser, GPU, GUI, server, replay, data build/write, full gate, audit, commit or CLI retry ran. The multi-cli-review runbook was read; this is the independent in-app lane, with the previously unavailable CLI lanes not counted as reviews. Task Node PIDs 15728, 49516 and 11944 are no longer running; no background resource remains. Retain these artifacts while root decides A6, then promote this authored review to the permanent work folder before any resulting milestone.

Open: all-variant/full-base positive contact, local ownership of the retained-source survivors, any authorized pose-height contract, atomic 24-person capacity, A8 unified initial-slot clearance, first-frame lifecycle and continuation, ordinary-entry integration, and native visual acceptance. Review139 stays unwired and `productionReady:false`. This work establishes a concrete refusal and bounded choices; it does not reopen the deferred moving-contact or whole-city research programme.
