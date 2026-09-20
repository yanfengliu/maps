# Review 45: implementation

## Target

Repository `maps`. This is the independent review of the Q4 scene-rebuild preservation guard, authored in `artifacts/rebuild-preservation/wt` from base `27c71865bef31a7c9dcc622db16e6721be839dc3`. The reviewer used a separate detached worktree at `artifacts/rebuild-preservation-review/wt`, based on delivered main `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`.

The frozen candidate is `artifacts/rebuild-preservation/wt/artifacts/rebuild-evidence/candidate.patch`, SHA-256 `cb5bfaff59c130e12550db9d8c7c95ac30bcb1a9059db5104b76ba177131069f`, with `freeze.json`, SHA-256 `4e9f44329c6b720ba138eaba878179b08df5073f8fcdf1561058e84124afa1b7`. All eight files were verified before byte-preserving transfer and checked again after verification in both author and reviewer trees. Copies of the patch, freeze and authored handoff remain under the reviewer's ignored `artifacts/review45/target/`.

The exact authored handoff is retained at [45_preservation-author.md](../snapshots/45_preservation-author.md), SHA-256 `e9b33d5321a8fb9ffb6034ab1c49ab14b8ed2847205e2a52f40cd734c9d19df9`. Its pending-review statements are historical claims for that frozen target.

| Non-document target | SHA-256 |
| --- | --- |
| `tools/scene/build.ts` | `e94a8e9bea1f567df6d10a03ccc66ad44b2e77a2d20d2337010e68336d9d24f5` |
| `tools/scene/rebuild-preservation.ts` | `6b01b2bb5ea70c8357c377e403eb10837b6b9611bf49eba64e3a166c2f97430a` |
| `test/scene-rebuild-preservation.test.ts` | `149ca2417991e718fa5178972f47e17996fad998a3b5afd749a26cc5507cc556` |

The shared document copies are the author's older-base review target. They are not a recommendation to replace newer main history. Integration must add only this candidate's new sections and devlog line while preserving the terminal/capture milestone and Reviews 39–44.

## Reviewers and coverage

`lease_retirement` is the independent reviewer. I did not author the preservation guard. I read the actual builder, helper, current markings producer, binary mesh decoder, cleanup function, tests and scoped documentation. I ran the focused tests, independent private fixtures, two restored-source red controls, typechecking and the real primary pair's read-only preflight. I did not run a data writer against primary, a source fetch, browser, GPU gate or city rebuild.

The first verification instrument was the shipped `runSceneRebuild`/`cleanSceneGeometry` boundary and its focused tests. The independent probe then used the actual `buildMarkings` producer and the shipped `data:scene` entrypoint on a private authored fixture. No new substitute algorithm was used to decide whether the guard worked.

A separate Claude CLI was attempted with its configured defaults and only Read/Glob/Grep tools. It exited 1 after about five seconds: `Failed to authenticate: OAuth session expired and could not be refreshed`. It produced no substantive review and is an abstention. Raw prompt/output/status remain under the reviewer's ignored `tmp/review-runs/review45-claude/`. All eight target hashes still matched afterward. This report does not claim two independent reviewer votes.

## Reports

### lease_retirement — admission and destructive order

I accept the frozen guard within its stated preflight scope. No material correctness defect was reproduced. `main` logs the destination and awaits `runSceneRebuild(SCENE_ROOT, buildScene)`. The wrapper awaits the read-only markings preflight before the existing cleanup and awaits cleanup before the existing generation body. A TypeScript AST comparison against the author base confirms that all 29 generation statements moved into `buildScene` without content changes; the normalized statement-list digest is `da5a7f67960338a7e4d157d50bdd093341e860eefef8d5825e69b1d7f5df5355`.

The two-file admission rule is coherent with the current producer. Neither file present permits bootstrap. A partial pair refuses. Existing non-file entries, malformed JSON, authored wrappers, unknown top-level provenance formats, invalid source/function/feature/count records, malformed mesh data, unrecognized producer notes and mismatched triangle counts refuse before cleanup. Errors identify the affected path and describe the preserved-pair or reviewed-regeneration remedy.

I inspected `buildMarkings` directly. Its note, codelist, five function codes, source records and feature/count fields agree with the recognized published-only shape. It throws rather than emitting a zero-triangle result, so the positive-count checks do not reject a successful empty product from this current producer. This validation recognizes the current format; it does not authenticate a coordinated invented provenance/mesh pair against original source data. That boundary is documented rather than presented as a source-authority guarantee.

The real primary authored pair is refused by `preflightSceneMarkings` with the named authored-wrapper diagnostic. Both files were hashed before the call, immediately afterward and again after all independent fixture checks. Their bytes remain unchanged:

| Primary file | Bytes | SHA-256 before and after |
| --- | ---: | --- |
| `data/scene/markings.mesh` | 388,992 | `efdba9cb4532db023f18455f858cdbeae8bc76f21d419888df9544b21c42ccf4` |
| `data/scene/markings-provenance.json` | 14,383 | `efad82e86d1cef79bfdb439aca7d43683fb7dcb2462471c540b511fe91bd1ea8` |

Only the read-only exported preflight received that primary path. Neither `runSceneRebuild` nor the builder entrypoint was invoked against primary data.

### lease_retirement — independent fixtures and public entrypoint

The independent probe generates a private GML fixture covering all five current function codes, calls the real `buildMarkings`, and obtains ten triangles. The resulting published-only pair is admitted. The real cleanup removes its seven owned output names before the counted writer callback runs, and a companion agent asset survives.

Ten additional independent refusal cases cover a valid producer record plus an unknown top-level field, authored and published wrapper markers added to otherwise valid fields, a duplicate function list missing one required function, an empty source roster, a fractional triangle count, a negative dropped count, reversed bounds, a nonfinite normal and trailing mesh bytes. Every case invokes the real wrapper and cleanup boundary; every refusal keeps all pre-existing bytes and calls the writer zero times.

I also invoked `node tools/scene/build.ts`, the actual `data:scene` entrypoint, with an authored fixture under this review worktree's own real `data/scene` directory. There was no data junction and no primary path in that invocation. The command exited 1 with the expected pre-cleanup authored-paint refusal, before its generation-body terrain log; every fixture file, including all cleanup-owned outputs and the companion asset, retained its hash. That private directory and all OS-temporary fixtures were removed after path checks. The primary authored pair was then checked again unchanged. This entrypoint check covers the real call wiring that helper-only tests would miss, without attempting the expensive city generation.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| None | No material finding reproduced in the frozen preservation-only target. | Scoped implementation acceptance. Actual primary authored data refuses without mutation, current producer output admits, and both destructive-order regressions go red. | Root must integrate additively into newer main and satisfy the repository's integration gate policy. Source authority and clean-city rebuild acceptance remain open. |

## Verification

Node `v24.12.0`. The focused suite passes 27 cases across `scene-rebuild-preservation` and `scene-cleanup`. The independent probe adds the actual primary read-only refusal, eleven private producer/refusal checks and one actual entrypoint fixture check. Typechecking passes. These finite counts are separate evidence populations, not a claim that the whole unit suite ran.

I independently replayed the author's two source mutations in the reviewer tree. Omitting preflight produces 23 failures and three passes; placing cleanup before preflight produces the same 23 failures and three passes. Both processes exit 1 normally, without timeout or startup failure. In the late-preflight mutation, cleanup erases the pair, causing the subsequent check to admit an absent pair; this reproduces why ordering matters. A finally block restores the exact helper bytes, then the focused suite passes all 27 again. All eight reviewer and author file hashes still match the original freeze.

Ignored evidence under `artifacts/rebuild-preservation-review/wt/artifacts/review45/` includes `independent.ts`, `independent.json`, the actual-entrypoint stdout/stderr, `build-body-proof.json`, focused output/result, typecheck output/result, `target-hashes-after.json`, frozen target copies and `order-controls/` with both red logs, restored-green logs and the restoring runner. The first focused-test wrapper's console printer encountered Windows encoding after the child had already exited zero; its saved child result and output remain, and the independent restored-green run exits zero normally. That wrapper issue is not a product failure or a hidden skipped test.

No build, full unit suite, audit, visual gate, real city rebuild or source-policy change was performed in this review. The guard does not make an admitted rebuild transactional, recover already-deleted paint, lock out concurrent external writers, regenerate authored paint, restore the missing reviewed OSM extract or establish a new network/source vintage. A refusal on the actual authored scene is the intended preservation result, not proof that a clean reconstruction now succeeds.

## Round outcome

The exact eight-file candidate is accepted for bounded Q4 preservation integration, with no new material finding. Only three files change executable behavior/tests. This review does not accept the broader Q4 source/rebuild criterion or the Shibuya deliverable. Root owns integration, required gates and final acceptance; the newer primary documentation must remain intact. No primary source edit or commit was made during this review. The detached review worktree and exact target/evidence are retained for root handoff and preservation before removal.
