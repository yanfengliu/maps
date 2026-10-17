# Independent verification contract review — 2026-10-17

Read-only reviewer: verification_contract_20261017. Scope: actual Source3 coverage/occlusion requirements against the fixed product benchmark. No source, geometry, gates, routes, population, instruction files or main changes were made. The inspected canonical HEAD was 73cf9de53cd70fae76624f0d5e2c4f0991c9105f. This report binds inspected file bytes, not the earlier assigned base 8b11c718. Source3 v2 was 51669b971b2424b6778ed1eb25f7ff24a930c9c1b8d1bb8e29421ef2cb6fc8ac in both worktrees.

## Verdict

Do not pass v4b or introduce an epsilon. The two physical holes are genuine native-coordinate geometry differences. Their small size does not establish harmlessness: ordinary walking traces ground at each proposed XY position, so a narrow hole can block movement.

A material evidence limitation is that component-table.json computes its continuous 4.4x2m body union only from vehicle-boundary-flow-0 source_lane_segments and joins. It does not cover all 19 vehicle routes, 451 pedestrian routes or unrestricted walking. Its zero body-intersection result cannot establish general contact safety.

The complete-current-terrain correction in Source3 v2 is justified: 204 previously rejected cases have actual current coverage. The remaining 48 residual parent cases form two real physical holes. They remain blockers. Neither unused original terrain nor deleted/reference terrain can count as current coverage.

The global demand for zero positive height over every changed road is stronger than the existing contact requirements. Positive overlap alone does not prove an unacceptable native contact or visible defect. The 19 exact positive-area/positive-height overlap pairs are nevertheless unqualified: this packet does not prove their acceptability. Their pair-summed area is not a scene-union measurement. The component width field measures the maximum of convex-piece minimum widths, not a universal component clearance bound.

The smallest defensible correction is no numerical waiver: preserve exact global occlusion findings and judge their blocking significance through unchanged source grade/fullbody requirements and actual native support and appearance predicates. Before rescoring, establish the complete affected contact domain, including every route, turns/body overhang, pedestrian shoes and retained observed failure rays. Keep unrestricted walking and native lighting qualification explicit. This corrects the claimed requirement without silently accepting this candidate.

## Required whole-class controls and remaining checks

A genuine uncovered point-ray location must fail regardless of area. Deleted/reference geometry must never supply current coverage. A zero-area shared edge should pass while a positive-area overlap remains explicitly reported. An overlap moved into required contacts must exercise unchanged first-hit, grade, gap and normal predicates; missing native evidence cannot pass. Preserve source identity, declared regions, winding, packed readback and every observed unsupported contact. No candidate-fitted epsilon, query snapping, route change or population reduction is justified.

Remaining acceptance is the ordinary producer and readback, unchanged original 470-route reprofile and continuous body/grade checks, then final-source native import/collision, ordinary controls and lifecycle, original-six hardware appearance review and the unchanged 3000-pedestrian/200-vehicle performance benchmark. Microscopic widths do not rule out lighting artifacts. Source evidence does not establish native physics or appearance.

## Directly verified hash inventory

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| Fixed verification benchmark | 2222 | a4017153d8fa68c901abd23daecc621db4bdb7931aae57dd34c0f1a7bcf4979d |
| physical-hole-components-v4b/component-table.json | 70477 | 6e0eff7717ee3028cef9bb7612ea5fe33ad51b9380a0e2589c8812010961ccd2 |
| complete-terrain-coverage-v4b/complete-current-coverage-result.json | 810631 | db05b4c7d2e6c4001861371dc8b50094c3f2d78a3e0a65904aabc82baa513238 |
| complete-terrain-coverage-v4b/actual-current-candidate-operands.json | 539516 | b772cd25b486d20466dd2e36e03e40c5b7bd250a36886a5531d6b7d7f76dd755 |
| occlusion-exact-diagnosis-v1/result.json | 44770 | 3d44efc3a56d492018ac6ab74abe219d679615f27bf29836a4cff6c6acfcdc70 |
| known19-overlap-operands.json | 53956 | ffb56cc08aa413d6481fdb989ad5fa458cb918c98215c475996e7a0a34d7fe7c |
| Actual tools/data/support_source3.py in canonical and source-next worktrees | 59472 | 51669b971b2424b6778ed1eb25f7ff24a930c9c1b8d1bb8e29421ef2cb6fc8ac |
| Actual tools/data/surface_network.py | 124163 | a6b979b4776b5c82f1d887cf778c523bcf4beb1ddf89e7111bb0af0be4fbe22b |
| source-bank-stitches-v4b-6ef33ed9/edit-ledger.json | 4223624 | 3ab2764e010934d64bde6983c9f2a396dddfd65ffc44cc20c4c80dca8f6fad1d |
| data/source/movement/frozen-network.json | 1683767 | 0575c220ad42b889600cb47840d3d04300a454b884c4e2428dc84f664304cbfc |
| quantify_48_hole_components.py | 10074 | cd0bcfac8b65b251a2cd779ac0726eacab1dffd3f38564f31d9b5cbe3c421dda |
| Canonical AGENTS.md | 25775 | 20a0a9529ffad04a2fc72ffe4cef72cc65eb0b1b41b15c72dd33f0de89d73206 |
| Canonical CLAUDE.md | 11 | 336cc4fbf19beaada7ccf9986414fa91851a8d7a07dfb3ccbe800a69eed0ab49 |
| Canonical docs/policies/local-rules.md | 11758 | 42bbd20d975a8bd4e47e27071753684ff74cd58353a7e1b92aad892f305ec44c |

Inventory roots: canonical is maps/artifacts/shibuya-unreal-5.8/worktree; component and coverage packets are under maps/artifacts/unreal-road-slits-v1; occlusion result is under maps/artifacts/unreal-source-next/worktree/Artifacts/product-support-repair-v1; the ledger is under that source-next worktree's data/source/surface-edits. The benchmark is canonical Artifacts/documentation-milestone-20261015/verification-reassessment-20261017.md. JSON records of older b38233 producer bytes are historical evidence, not the current inspected writer.

## Ownership and verification bounds

All inspected task paths had fresh leaf and ancestor reparse checks before reads. This review used headless finite shell calls only. No engine, browser, server, external model, network request or persistent helper was launched. The actual game inventory lease/run 7eb85dbd belongs to the orchestrator, not this reviewer; it was neither started nor stopped here. System process enumeration was unavailable because CIM access was denied. Git CLI ownership validation refused, so HEAD was read directly from validated Git metadata. Every shell call completed. Only this ignored authored report was created after the read-only review, at the orchestrator's request. No additional review, gates or runtime acceptance ran for publication.
