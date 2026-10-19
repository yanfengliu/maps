# Independent source repair review — 2026-10-18

Reviewer: independent_review, GPT-6 Astra, xhigh. Target: final staged source against c3dde03. Original report follows.

**GO for source integration.** F1 and F2 are resolved; no open source findings.

`src/render/walk-collision.ts:26–27` now sends absent materials and overridden `_computeIntersections` through the original raycaster. The new fixture at `test/walk-collision.test.ts:130` verifies both original outcomes, custom-method invocation and restoration.

The production regression at `test/first-person-walk.test.ts:195` checks actual wall contact through `createWalkGround` while bounding Three.js triangle tests. Its contact expectation follows the independently specified wall and sweep geometry. The reported original-caller RED/restored GREEN supports the intended integration coverage.

Outside-diff references remain `node_modules/three/src/objects/Mesh.js:232` and `:268`, plus `src/app.ts:360`.

Final reviewed raw SHA-256:

| File | SHA-256 |
| --- | --- |
| `src/render/first-person-walk.ts` | `cbc2113683423e5d387a102d0841227d806b2eabc633002af3621f824e7e5659` |
| `src/render/walk-collision.ts` | `cd740a0644023523ecc2bcd295780f855bc4777204e9d7c0078e22e6fe386137` |
| `test/first-person-walk.test.ts` | `73c09b35289e9fa0fdbffbfc6e28fb027d09504b1a1ebe71518bec4729122886` |
| `test/walk-collision.test.ts` | `68bb28fcc3bc911a6df457df5ae45e27cd4a3a8c7e20095e1ff864631c14bdd3` |
| `docs/reference/setup.md` | `ac27342c13023a4e669895ae6986d0e7c591fe992c66198d8ed269e858966290` |

This is read-only source approval. Full gates, native appearance and final FPS acceptance remain pending. Preserve round 1’s HOLD and its findings alongside this resolution.
