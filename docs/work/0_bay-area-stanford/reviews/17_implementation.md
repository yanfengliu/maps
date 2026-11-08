# Review 17: implementation

## Target

Quad roof continuity and facade correction against base `acbdece4313e64050cc253b981587c93ff2cd276`. Fifteen source/test/tool files were frozen before review in ignored `artifacts/quad-roofs-20261107/output/review-17/`, with exact copies and manifest SHA256 `fa104b0bbdb5c56dee290fd860be0b2513f929930ece8b9d1e80a1580cb69755`. This is the pre-F42 candidate, not the final repaired revision. Documentation was root-authored after code review.

## Reviewers and coverage

Independent GPT-6 Astra at xhigh inspected all fifteen manifest files, implementation outside the diff, native-resolution reference and application captures, the offline wheel bytes/license and targeted regressions. The reviewer performed no writes and launched no browser or server. Root retained both competing mechanisms and owns browser controls, full gates and delivery.

## Reports

F42 [P2]: collapsing all eight wings' native extrusions removes their only event-bearing elevated hit volume. The candidate's `quad-arcade-visibility.ts` lowers them to base + 0.1 while `main.ts` binds only that layer. MapLibre's `fill_extrusion_style_layer.ts:59–67` computes intersections using current height. Visible elevated facade/roof pixels outside the ground projection lose selection. Preserve an independent full-height query surface and verify actual oblique clicks.

No other P1/P2 implementation findings within reviewed bounds. The three instrument corrections are legitimate: four normals encoded the discarded bounding-box approximation, the six photographed north-wing identities replace an incorrect edge-count guess, and 10 micrometre bins affect only the source guard while exact source SHA, input coordinates and 1 mm change rejection remain strict. All existing coverage and empty-hole assertions remain.

The reviewer independently ran 1,100 deterministic random ±8 nm profile perturbations: zero errors or signature mismatches, maximum ridge displacement 2.451e-7 m, minimum pinned signature-boundary margin 1.29455e-8 m. Wheel SHA256 and BSD-3 provenance match; the used Python compute path needs only standard-library modules. Source data and package manifests are unchanged. All fifteen live source hashes and retained copies matched the manifest before repair.

Outside the diff, `building-details.ts:355–381` exposes readiness only after full upload, context/failure paths clear readiness, and the renderer retains two custom draws. Short-wall coverage and the 160k-triangle guard remain. The retained browser observation reports 159,747 triangles / 24,920,532 bytes. Native survey pages 113/115/116 and fixed/inner/north views show clean roof bands and preserved courtyard voids. Physical columns/passages are visible. The selected orange floor strip is a separate root-observed cap-ordering issue; lowering the native cap below the 0.09 m custom floor is an appropriate isolated repair.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F42 | Elevated wing picking disappears with lowered native walls. | Material; root accepted. | Query-only opacity-zero full-height extrusion and actual silhouette picking, reviewed in round 18. |

## Verification

Thirteen focused roof/frontage/elevation/visibility tests pass independently. Root's initial full suite had 81 passing tests, build, types and audit. No full gates were repeated by the reviewer. Local MapLibre source confirms opacity zero skips drawing but retains query indexing; normal layer visibility and composed holes must remain.

## Round outcome

One material issue requires the round 18 repair. Roof geometry, numerical guards, reference-grounded facade classification and the inspected images otherwise satisfy the reviewed criteria.
