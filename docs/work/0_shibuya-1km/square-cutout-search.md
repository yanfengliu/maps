# Square cutout geometry search

Root owns this fixed protocol; source baseline is `fc6dab3`, with restored scene digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`.

Required outcome: the canonical AOI ends in coherent, solid authored model sections across terrain and buildings, with no exterior apron, open shells, floating details, shadow residue or normal-pass silhouette; interior source geometry and simulation remain intact.

Baseline reproduction: run `node artifacts/square-cutout/eligibility.mjs` in the managed `shibuya-cutout/maps` worktree. Preserve its initial `eligibility.json`: all four terrain sides have complete coverage, but 35 of 184 building/edge sections across 17 tiles contain odd/open intervals. This proves the proposed closed-input assumption fails; it does not by itself prove that the user's presentation requirement is impossible.

The final comparison keeps all 67 source tiles, four canonical edges, batch identity, transforms and source hashes. Each candidate must account explicitly for every cut section, pass independent synthetic closed/open/multiple-component controls, and survive native edge and whole-footprint inspection in both styles and noon/dusk. The ordinary 44-frame gate remains required.

Disqualifiers: omit failing tiles or batches; remove whole straddling buildings; move the AOI; change source data; hide holes with exposure, camera crop or an opaque raised rim; invent terrain inside the AOI; count a swallowed error as a closed section; inspect only tuned sides; fix beauty while leaving shadow/normal passes uncut; claim source-derived closure from invented geometry.

An authored closure rule may be considered only when its geometry, source limits and failure behavior are explicit and independently reviewed. Any correction to the eligibility instrument preserves the old raw result and needs independent scrutiny before rescoring.

Route A owner `square_boundary`: inspect source topology and test the narrowest construction supported by actual source. Route B is an independent fresh owner with only this protocol and raw evidence, to test the assumptions and a distinct mechanism. Compare artifacts and remaining gaps before combining routes; do not deepen an unproved general mesh-healing problem.

Acceptance belongs to root after independent code/visual review and all required gates on the integrated revision. Neither a successful eligibility probe nor this design closes the broader Shibuya deliverable.
