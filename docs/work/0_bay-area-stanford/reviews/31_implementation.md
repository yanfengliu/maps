# Implementation review 31

## Target

Exact 079891789e174ce6e9787a9cfa9b323313ead6cf against dc82fc9e82ab837a83e7e6452c1e968c171e3b5f: final broadleaf F47 repair.

## Reviewers and coverage

Independent surface_trees_review_30 (gpt-6-astra, xhigh) inspected six original native images against retained references and passed 24 focused tests. Full 302-test/type/build/audit evidence was read, not rerun. No browser/server or files created by reviewer.

## Reports

One unresolved material visual finding. Root accepts the independent exclusion recommendation.

## Findings and disposition

[P2] F47 remains open. Intersecting planes improve cluster depth and upper coverage but still reveal large flat patches and intersecting edges, especially opposite, steep, variant-zero-opposite and top views. This fails the fixed no-obvious-carrier criterion. Do not accept merely as an incremental improvement.

The regression measures depth/upward area, rejects prior sheets and weakens no gate, but cannot establish native appearance. No other correctness/resource issue; palm/conifer/surface/shader code unchanged. Outside-diff check: building-details.ts retains two-sided opaque depth rendering.

## Verification

Six close/opposite/steep/top captures cover all three broadleaf variants. Their geometric-depth regression passes, but pixels fail the delivery criterion.

## Round outcome

Rejected; preserve candidate and stop at attempt5. Root excludes broadleaf and defers conifers, restoring visible baseline geometry. Accepted work may proceed after gates, native checks and review of that exact composition. F47 remains open.
