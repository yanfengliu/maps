# Implementation review 32

## Target

Exact a238ac35e8cadf22fad513515236524c94d4cdff against 079891789e174ce6e9787a9cfa9b323313ead6cf, overall baseline 18c5916a424c94b825b7b751778d3705bf9de4a9. Scope: accepted palm variants and road materials; rejected broadleaf and deferred conifer implementations excluded.

## Reviewers and coverage

Independent surface_trees_review_30 (gpt-6-astra, xhigh) inspected the exact code, tests and source restoration, all 19 current native images at original resolution, three production-GLSL samples and their solid-fill negative control. It passed 20 focused tests and independently executed baseline/current comparisons across 389 non-palm trees and 80 lamps. No files, browsers or servers created.

## Reports

No material finding in the narrowed delivery. F47 remains open for future broadleaf realism and is not waived or labeled repaired.

## Findings and disposition

The excluded geometry and experimental tests are removed together. Existing source identities, geometry budgets and constraints are unchanged. Visible baseline face coordinates, normals, colors, material kinds, UVs and anchors match exactly for restored non-palm trees and lamps. Minor documentation correction: the shared helper omits 7,088 collapsed faces (5,808 tree and 1,280 lamp-globe), not only the tree count; root corrected the record without runtime edits.

Outside-diff inspection confirms building-details.ts retains two-sided opaque depth rendering. Source assets, dependencies and budget constants remain unchanged. No further visual repair is requested or made.

## Verification

Root: 298 tests, typecheck, Pages-base build, zero-vulnerability audit, realism inventory, 19 actual-control captures including random/opposite/top/steep views, graphics recovery and desktop/phone church controls. Reviewer inspected full-gate logs, did not rerun them. Final scene: 187,331 triangles /24,727,692 packed bytes; Quad: 8,200 triangles. No app/GL errors. Single local RTX4090 motion sample: 353 frames, p95 8.2ms / maximum12.2ms; no mobile performance claim.

## Round outcome

Accepted for narrowed delivery. Broadleaf F47, deferred conifer refinement and broader photographic completeness remain unfinished. Root owns main integration, authorized publication, live checks and scoped cleanup.
