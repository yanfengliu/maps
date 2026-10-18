# 1560 — Sampling-mode edge lifecycle correction

2026-10-18 UTC. Owner1554; root accepts. Start05:40:28UTC. Exact freeze/time/source pins and commands: ignored artifacts/taa1554/round1560-freeze.json. Before edits, all12 literal1556 files were copied to round1556-source/ and checked against immutable round1556-freeze.json; receipt round1556-source-receipt.json.1554/1556/1555/1557 history is preserved.

Only production change: src/render/post.ts invalidates reprojected history inside the actual taa.accumulate!==still edge, in both directions. Repeated setStill(false) calls retain moving history. The source mode changes only during render; toggles without a rendered source change do not reset it. Upstream still sampling/detail, moving2x/MSAA, actor/receiver authority, fractional DPR and effect order are unchanged. No new draw/target cost.

New actual-createPostChain CPU control uses registered contact plus a dynamic caster, renders3stillframes, moves the actor/contact away from receiver P, then checks firstmoving historyReady0 and subsequent/repeatedmoving1. It also checks moving→still0, repeatedstill1 and a second cycle. The independent equal-depth current.4/prior.3/range[.2,.8] receiver arithmetic requires current.4; eligible stale history would yield.3125. CPU spies/dataflow establish no GPU receiver pixel or later background blend.

Literal old post SHAe308be97ae08f16b59206250142b29c4b833cfd912ba3e1f7e80e33d6e44e5e4 went RED at firstmoving: expected0,received1. Unchanged test SHAafc4d9a9ae32a7afb3094d80e000ca04d87c2830d5ada47d45eb2cd3d334eb75 went GREEN554ms after correction. Final post SHA35a05b17b12b527eb0de57c1937dc8675d1a5f7bf5bf2628872eee67e317b0e9. Raw old/green stdout: round1560-old-red.txt and round1560-restored-green.txt.

Affected25/25CPU PASS1.36s; scoped TypeScript and whitespace PASS. Existing resize/apply(style/lighting)/explicit invalidate/teardown/restoration controls remain green. No helper-only mutation, authority redesign, browser/GPU/server/build/fullsuite/data/cache/index/commit.

Frozen pending1561 focused review.1559 independently adds the actual receiver transition GPU case and later-moving eligible-background check. GPU contribution/rejection/native S0/S1/held-out appearance/effect stability/cost and A6/all35/all14/population/FPS remain unaccepted.
