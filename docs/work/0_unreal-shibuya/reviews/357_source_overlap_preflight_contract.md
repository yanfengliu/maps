# Whole-overlap instrument contract review — 2026-10-17

Independent reviewer: verification_contract_20261017. Read-only contract judgment, not a geometry candidate review. Canonical HEAD remained 73cf9de53cd70fae76624f0d5e2c4f0991c9105f; current inspected source bytes are pinned below. The current ShibuyaWorld.cpp differs from the earlier review and is bound by its own hash, not implied to be committed at that HEAD. No engine, full Surface index, full scene scan, external model, network, GPU, UBT or CIM operation ran. Only this ignored authored report was created.

## Decision

YES: global zero-positive-height occlusion can legitimately be replaced by exhaustive exact whole-overlap height/normal qualification as a SOURCE PREFLIGHT. The old requirement is stronger than the product's existing contact semantics. This is a contract correction using pre-existing limits, not an arbitrary numerical epsilon or a candidate exemption. Approve that instrument design subject to the controls below; approve no packet or restoration candidate. Genuine XY holes still fail, irrespective of their width or area.

The replacement must not claim that a road-relative 20cm height bound proves actual native contacts. Native PhysicsSnapshot compares the absolute first-hit height against each transformed shoe bottom, tilted vehicle body endpoint/corner and tyre contact. Those contact positions are not generally on the local road triangle plane. For example, 15cm above a road plane plus a contact 7cm below that plane produces a 22cm native gap and must still fail. The unchanged continuous fullbody/grade requirements and actual native contact predicates therefore remain necessary. The source preflight answers only whether the new upper terrain displacement exceeds the existing road-relative contact allowance anywhere over an overlap.

## Concrete replacement contract

1. Enumerate EVERY actual current changed-ground/current-terrain intersection, including newly restored parents and neighboring retained geometry. Use complete consumed packed geometry and its native float32-centimetre planes. Bind exact bytes, source lineage and declared edit regions. No selected-parent, boundary-route, area, width or distance exception is allowed.
2. Compute each complete XY intersection exactly. On a positive-area convex intersection, the difference between the two planar heights is affine; its extrema occur at polygon vertices. Record the complete polygon, signed minimum and maximum, positive-height extent, exact source identities and actual plane normals. Triangulated intersections must retain complete union coverage. Do not use a centroid or sparse rays to infer a whole-polygon maximum.
3. Reject any positive overlap whose terrain-above-reference-ground maximum exceeds the existing 0.2m contact_gap_m. Equality is admitted because existing source and native checks reject greater-than, not greater-than-or-equal. Reject a qualifying upper terrain plane whose physical support-facing unit normal Z is below the existing 0.7. Missing/degenerate/nonfinite planes, missing candidate operands, missing normal evidence or incomplete enumeration fail qualification. Preserve existing new-face winding requirements. Do not use the 0.45m walking limit to enlarge the 0.2m agent/source bound.
4. Do not obtain that normal by blindly reusing TriangleIndex.hits(). It flips geometric normals upward. Establish packed winding and axis handedness and the corresponding native collision-facing normal; retain native normal matching. Constant triangle normals and exact squared comparisons can avoid an invented normal epsilon.
5. Keep exact actual-current XY coverage, legality, original source/region/ancestry/readback, UVs, unchanged outside-region geometry, vehicle grade <=0.2 and pedestrian grade <=0.6, fullbody support and original 470-route reprofile. Source geometry preflight is distinct from native support acceptance.
6. Retain every observed unsupported native contact and actual first-hit geometry witness. Exact source-to-native collision agreement remains at its existing 0.1cm tolerance; it is NOT relaxed to 20cm. A newly accepted upper terrain face must be represented as the actual top consumed source surface in expected first-hit witnesses, never silently ignored or compared against the buried road as if it were still the first hit. Ordinary walking, reset/landing, capsule clearance and swept collision, lighting and original population/performance remain unchanged acceptance checks.

Two additional producer predicates still refuse centroid burial above 0.001m: changed_road_samples() and inferred changed-face ray generation in support_source3.py. Replacing only the global gap>0 loop may therefore still refuse a future candidate. If those expected-first-hit assumptions are updated under this contract, generate and verify the actual top-source hit and retain the geometric fidelity limit; do not omit the ray or weaken actor/triangle/position agreement. Any such implementation needs independent review and negative controls before rescoring.

## What whole-overlap bounds do not prove

They do not prove all posed contacts satisfy 20cm, continuous support across all vehicle turns and pedestrian gait, selected-profile correctness, lateral capsule collision, motion over changing terrain, the native first-hit actor, or rendered appearance. Walking's 45cm/.65 checks compare the proposed ground to the current explorer pose and include a swept complex capsule move; they are not a universal 45cm road-occlusion allowance. A source boundary can still create a route grade failure or capsule obstacle. Actual native qualification, original fixed-six hardware image review and 3000/200 at 1920x1080 for the original warm performance interval remain mandatory. A preflight pass may not set native_support_verified or product accepted.

## Required whole-class controls before rescoring

Use independent synthetic planes with whole polygons: zero gap, an admissible positive gap, exactly20cm, and a representable value above20cm; the last must fail. Include an overlap whose centroid passes but an extremal vertex exceeds20cm. Include good height with a normal below0.7, exact0.7, reversed winding, and degenerate input. Include multi-triangle upper surfaces and a missing upper operand. Translate/scale an admissible overlap without changing the rule; no packet coordinates or micron thresholds appear in acceptance. Keep true narrow holes failing and shared zero-area edges distinct from positive-area overlap. Edge-only actual contacts and discontinuities remain covered by the unchanged route/native checks.

Include a composed contact counterexample such as road-relative15cm plus posed-contact minus7cm: source preflight can pass, but native contact must fail at22cm. Include a <=20cm overlap that creates an inadmissible source grade or blocks a capsule; its corresponding unchanged gate must go red. First-hit controls must reject an oracle that names the old buried road instead of the current upper terrain, and reject a wrong actual actor/position even when the pose-to-ground gap passes. Missing native receipts must remain did-not-run, never acceptance.

## Current evidence and qualification status

The new independent packet reports48 residual parents,164 exact positive-height blocker pairs, and zero safe restorations under the OLD zero-height rule. Their maximum-height values range from0.0619535735760801m to0.150281793746278m. It verifies all48 original faces and at least one literal-GLB blocker per parent, plus all19 old overlap pairs. Precisely64 blocker rows carry blocker_actual_patch_readback_verified=true;100 omit that flag. Do not describe all164 as separately independently readback-verified. No terrain normal qualification or new consumed candidate exists in this packet. It cannot establish a corrected preflight pass. The original two genuine holes and19 occlusions remain unchanged and unqualified. Earlier boundary-flow-only zero-body intersection is not reused as a general safety claim.

## Hash inventory

| Inspected input | Bytes | SHA-256 |
| --- | ---: | --- |
| Earlier independent review | 6741 | a3c87ad142bdabd4c38b7b70a8ae290c42913f4320153abf04d25083faa862c9 |
| geometry-repair-independent-20261017/result.json | 343813 | 4741a701c5e55cc1165b90201135ab3fe6bb4e05c1da74267ddc8ce8baf0b922 |
| Canonical tools/data/support_source3.py | 59472 | 51669b971b2424b6778ed1eb25f7ff24a930c9c1b8d1bb8e29421ef2cb6fc8ac |
| Canonical tools/data/surface_network.py | 124163 | a6b979b4776b5c82f1d887cf778c523bcf4beb1ddf89e7111bb0af0be4fbe22b |
| Canonical tools/data/support_surface.py | 24504 | 63cdfd9de93ff872b075836bdefe7a1ea13fe86670a358cc6c751880ee7fee52 |
| Canonical AgentGeometry.cpp | 20143 | 43da3fd6d7a3e65b877e7009c297d27f80ad7affaacc1d87ecfe9051f228568c |
| Current canonical ShibuyaWorld.cpp | 49240 | 4f6b3c87d6cca6ca5c2cb2b99e6fdcaebe48f03a3609633733000b182472239b |
| Canonical sources/surface_network.json | 3633 | 10a0daaad1d366b607db8b4a32b2a304d6ef1b41fb82e10279848d77ba211c29 |
| Canonical AGENTS.md | 25775 | 20a0a9529ffad04a2fc72ffe4cef72cc65eb0b1b41b15c72dd33f0de89d73206 |
| Canonical CLAUDE.md | 11 | 336cc4fbf19beaada7ccf9986414fa91851a8d7a07dfb3ccbe800a69eed0ab49 |
| Canonical local-rules.md | 11758 | 42bbd20d975a8bd4e47e27071753684ff74cd58353a7e1b92aad892f305ec44c |

The unchanged benchmark and original raw coverage/component/occlusion packet hashes remain pinned in the earlier review. Its benchmark hash is a4017153d8fa68c901abd23daecc621db4bdb7931aae57dd34c0f1a7bcf4979d. New packet input_records preserve the literal terrain, patch, ledger and prior operand identities; this bounded review read the result and relevant producer/runtime source, not the whole GLBs. No candidate rescoring or native acceptance occurred. All read/write paths received fresh ancestor and leaf reparse checks. All finite shell calls completed. No task-owned persistent process was created, and orchestrator-owned native runs were not touched.
