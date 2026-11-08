# Review 18: implementation

## Target

F42 repair and native-floor ordering on the same base `acbdece4313e64050cc253b981587c93ff2cd276`. The exact final source/test/tool target is the eighteen-file manifest in ignored `artifacts/quad-roofs-20261107/output/review-18/`, SHA256 `88286da9fe3ebf92416e1b46a545a9e7f7a9ec00bbbb898590afe8395c0530f1`. Copies of every reviewed file are retained there. The first implementation commit containing this record binds these bytes; ordinary Git line-ending conversion is not a code change. Documentation written after review is root-authored.

## Reviewers and coverage

The same independent GPT-6 Astra reviewer inspected the five changed/added files, checked all eighteen live/snapshot hashes, reran focused picking and visibility tests, inspected native images and read the graphics-loss/restoration observations. No writes or persistent processes were created. Review 17's roof, provenance and instrument-correction judgments remain binding.

## Reports

F42 is closed. No remaining P1/P2 findings within the review scope. `building-picking.ts:10–13` adds a zero-opacity query envelope for exactly the parent and eight wings, retaining the composed source and courtyard holes. `main.ts:334–344` registers one delegated handler across original and query layers. MapLibre performs one query/callback and sorts extrusion hits by intersection depth; array order does not override nearer buildings. The standard query layer survives serialized context restoration while the existing path recreates custom geometry; Retry reconstructs both.

The native cap is base + 0.02 m, below the custom arcade floor at base + 0.09 m. Native fallback remains intact. The floor-fixed image no longer has the selected orange strip. Retained loss/restoration observations show readiness clearing and then all 648 buildings, 159,747 triangles, 24,920,532 bytes and two custom draws returning with no error. Root drove real high-roof clicks before and after restoration; the retained screenshot confirms History Corner selection. The reviewer inspected that evidence but did not independently drive the clicks.

All eighteen live/snapshot hashes matched on the final recheck. Thirteen retain review 17 hashes. The five new hashes are:

| File | SHA256 |
|---|---|
| src/main.ts | 6c52a39e008775bdccbcdd054a3cc9dc2b36b9d999d947c62eca6473f79eff1d |
| src/building-picking.ts | 0bd0c6d378e5ae09c39601150ef368d72b0000b3122cb053b47ee2ded8733f2e |
| test/building-picking.test.mjs | 6214c11a0eff9305ff4b79031e64758998e99c30c945e9a4384bf95f2b3f1dff |
| src/quad-arcade-visibility.ts | c35d035b4afb126817cf446395825ea486cb69c9b1b5b742136dcdf19976744d |
| test/quad-arcade-visibility.test.mjs | 5b131ed6f8b51679d90f648786a8faa0fb726a88cd4e5c2e7f87ce280897b5e4 |

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F42 | Elevated wing picking disappears when native walls are lowered. | Resolved. | Independent full-height query volume, scoped to the composed Quad family, with readiness/recovery regressions and actual oblique selection. |

## Verification

Two focused tests pass independently. Root's full gates report 82 passing tests, successful typecheck/build and zero audit vulnerabilities. Source data and package manifests are unchanged from base. The reviewer did not repeat full gates. Final production/mobile, performance and resource cleanup remain root's acceptance checks and are recorded in the design.

## Round outcome

The frozen implementation repair is accepted; no remaining material finding. Root owns final delivery and cleanup.
