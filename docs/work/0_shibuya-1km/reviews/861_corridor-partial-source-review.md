# 861 — exact partial corridor source review

**Product module and promoted fixture ADMIT; source-gate acceptance HOLD for one small coverage correction.** App integration and the runtime observer are still unreviewed. This round reads the three frozen new FRONTAGE files, corrected860 contract and retained focused evidence. PRIMARY integration base observed read-only is `32b2d189f73ec3ab7efc49eadd04de8a0b513fc1`. Existing FRONTAGE app/group state was not inspected or changed.

## Exact source and accepted behavior

| Frozen file | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/scene/corridor-lights.ts` | 4,303 | f443acabd8123c10b6c41a9a6e7c4b762ec4319a09017311679461b4064875fb |
| `test/corridor-lights.test.ts` | 10,883 | 9e3839af7ccfd1d0d9109615bfb1c9738f8433fb15a1f077953c11a5283b967c |
| `test/fixtures/corridor-lights.json` | 6,672 | 93c92c3fb798f1ab55bb4cc8ef06ddd062c0a2fd7e85f5dd4e1184bf204b04cc |
| `reviews/860_corridor-response-plan.md` | 11,962 | 868faa8b1c819980023f0c05230a1a1208cd73071b9b9ee68080bd4df830baff |

The module uses the four full-precision856 mount bases and shared 0.5×0.15 m geometry, with a front-facing opaque MeshBasicMaterial. Its body colour multiplier is now frozen at `0.18 + 0.72 * darkness`. Exactly two 32 cd /24 m/decay2 PointLights occupy fixtures0/2, have no shadows and use the original unscaled continuous darkness factor ([corridor-lights.ts:53](C:/Users/38909/.codex/worktrees/crossing-frontage/maps/src/scene/corridor-lights.ts:53)). Noon produces zero, invisible point lights. Cartographic hides the entire owned group; Satellite returns reuse the same bodies, material, geometry and lights ([corridor-lights.ts:79](C:/Users/38909/.codex/worktrees/crossing-frontage/maps/src/scene/corridor-lights.ts:79)). Disposal is guarded, detaches/clears the group, and disposes each point light plus the two shared resources once ([corridor-lights.ts:85](C:/Users/38909/.codex/worktrees/crossing-frontage/maps/src/scene/corridor-lights.ts:85)). There is no timer, listener, texture, render target, borrowed-resource mutation or render call in this module.

The promoted fixture contains the two exact qualified PRIMARY tile pins and four authored placements, with FY2025 processed-source attribution and an explicit no-survey/no-occupancy/no-appearance bound. All72 selected field comparisons across18 retained identity/geometry/transform fields per fixture match856's independently prepared fixture receipt. No tile decoding was repeated for this review. The actual source test verifies raw tile length/SHA, GML identities, selected primitive/index data, transformed decoded vertices, front normal, wall offset and all geometry corners ([corridor-lights.test.ts:124](C:/Users/38909/.codex/worktrees/crossing-frontage/maps/test/corridor-lights.test.ts:124)). Its explicit alternate source root qualifies only the two selected tiles; it grants no FRONTAGE or whole-checkout cache claim.

## Required correction — source population can be skipped

**[P2] The actual-source test needs a completed-case population witness.** At [corridor-lights.test.ts:117](C:/Users/38909/.codex/worktrees/crossing-frontage/maps/test/corridor-lights.test.ts:117), every cached-source assertion sits inside `fixture.provenance.tilePins`. An empty list therefore performs zero source checks and returns successfully. At [corridor-lights.test.ts:129](C:/Users/38909/.codex/worktrees/crossing-frontage/maps/test/corridor-lights.test.ts:129), a fixture whose tile is absent from that list is silently skipped. The separate ownership test checks stored triangles, so it does not establish that every fitting reached independent cached-source decoding.

The current reviewed fixture has two valid pins and four matching cases; this is a gate robustness finding, not evidence that these current placements are detached. Minimal fix: assert the fixture/body population agrees, record four unique fixture IDs after their independent decoded attachment assertions, require every selected pin to have contributed a case, and require the checked ID set to equal the complete fixture ID set. An omitted-pin control must fail with the unchecked fixture/input named. Do not add another geometry investigation or runtime round. This refusal has been identified by source inspection; I did not execute a new mutation under this read-only lease.

## Existing checks and remaining acceptance

All18 handoff file/evidence/tile pins match physically. The actual final Vitest artifact contains seven passed cases, zero failures and no skipped cases, including the decoded-source case. Each actual product mutation ran only that source case and returned one failure: displaced offset0.02989177900998996 versus0.025 m, and reversed front dot−1 versus the required positive normal. The other six tests were intentionally skipped in those targeted red controls; they are not seven failed tests. The final module differs from the pre-control module only in three comment lines, corroborating860's retained identical emitted-code bridge. Focused type success is the raw exit claim in the frozen handoff, not a separately retained type stdout artifact.

The corrected860 plan carries the prior review's first-clear query boundary, two genuine colour groups, elapsed submission-envelope bound, declared overhead control, render-return startup endpoint and nearest-rank p95. Those contract repairs are acceptable. Actual observer/recipe/device support, app style/disposal/clipping wiring and integrated tests remain pending. Neither the partial module nor CPU support evidence establishes visible improvement, light spill, native cost or whole-map qualification.

Fix the narrow source coverage guard before final source-gate acceptance; app wiring can proceed in its separately leased PRIMARY scope. Re-review only changed test/app/observer bytes. All35 delivery criteria remain open.

Only this authored round and ignored `artifacts/review861/partial-source-receipt.json` were written. No product/Git/index/ref/data mutation, test/gate, browser/GPU/server, fetch or producer ran. The prior861 review remains unchanged. Retained cleanup receipts name an empty owned temp directory removed and an absent owned Vite cache; both are currently absent. No owned runtime process was launched.
