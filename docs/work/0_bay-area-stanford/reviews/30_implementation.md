# Implementation review 30

## Target

Exact revision dc82fc9e82ab837a83e7e6452c1e968c171e3b5f against 18c5916a424c94b825b7b751778d3705bf9de4a9. Scope: complete road-material audit, bounded continuity inference and reusable botanical tree geometry/shaders.

## Reviewers and coverage

Independent surface_trees_review_30 (gpt-6-astra, xhigh) read source, relevant surrounding renderer/grounding/source-loading code, changed tests and retained evidence. It independently passed23 focused tests on Node24.12.0 and inspected all19 native captures at original resolution plus Palm Drive/oak/redwood photographs. No browser/server or extra agents were launched. Full gates and GPU timings were read from retained evidence, not rerun.

## Reports

One material finding; changes requested before integrated acceptance.

[P2] F47: Broadleaf crowns still reveal large foliage sheets. At src/tree-prototypes.ts:94, all eight sprays use nearly upright planes with only plus/minus0.27radians of tilt and one shallow fold. Native close/opposite/65-degree views show large lacy oval panels and narrow edge-on panels. This fails the fixed no-obvious-carrier criterion. The real oak photograph shows spatial foliage and branching; this objection does not demand exact individual species dimensions. Redistribute the existing foliage allocation into clusters with meaningful depth and varied elevation, preserving sources and budgets, and repeat close/opposite/steep/top views. Projected triangle area and isolated shader gaps can pass a crown that still lacks convincing assembled volume.

No additional material finding in road inference, source preservation, shader integration, resource handling or changed-file secret scan. Three asphalt inferences are separately labeled; eleven explicit stone corrections preserve subtype;2,084 materials remain unverified. Full-scene and local Quad limits pass unchanged. Replacing the closed-shell oracle was justified, but did not itself establish visual acceptance. Outside-diff checks include building-details.ts:581 for two-sided opaque rendering and cleanup, campus-road-layer.ts:140 for pinned source verification and quad-plantings.ts:89 for dimensions and anchors.

## Findings and disposition

Root accepts F47 and authorizes one final bounded repair, visual attempt5. Attempt4 source and native counterevidence remain under ignored output/fourth-tree-candidate. Accepted road/palm/conifer code remains fixed; only broadleaf volume and its regression may change. No budget or source constraint is relaxed.

## Verification

301 tests, types, Pages build and audit passed on the target. Nineteen actual-control captures and nine actual-GLSL samples showed no runtime failure, but those are not a pass for the broadleaf appearance requirement. Root's initial bounded visual acceptance is superseded by this finding.

## Round outcome

Changes requested. F47 remains open until the repaired assembled crown and fixed views are independently rechecked.
