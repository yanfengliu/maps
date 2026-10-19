# Initial independent source review — 2026-10-18

Reviewer: independent_review, GPT-6 Astra, xhigh. Target: staged implementation against c3dde03. Original report follows; its HOLD is retained separately from the later repair review.

HOLD for two compatibility gaps; both have been sent to the integration owner.

- **F1 — P2:** `src/render/walk-collision.ts:24` admits a mesh whose material is `undefined`, then accesses `material.side` at line 88. The original raycast explicitly returns without contact for this case (`node_modules/three/src/objects/Mesh.js:232`). Fall back to the original path and add an oracle fixture.
- **F2 — P2:** The same predicate does not detect an overridden `_computeIntersections`. The installed `Mesh.raycast` dispatches that method at `node_modules/three/src/objects/Mesh.js:268`; acceleration bypasses its custom behavior. Require the default method or fall back, with a fixture demonstrating different custom contact behavior.

Otherwise, the inspected implementation preserves normalized movement, 2.8/8.4 m/s speeds, time clamping, bounded collision steps, focus clearing, material winding, grouped draw ranges, transforms and layers. No further material source or lifetime finding.

Outside-diff inspection included `src/app.ts:360` and retained-leaf enumeration at `src/scene/buildings.ts:188–189`. Existing tests independently pin speeds and contacts and compare acceleration with installed Three.js. The forthcoming production-caller regression remains pending.

Reviewed raw SHA-256:

| File | SHA-256 |
| --- | --- |
| `src/render/first-person-walk.ts` | `cbc2113683423e5d387a102d0841227d806b2eabc633002af3621f824e7e5659` |
| `src/render/walk-collision.ts` | `6de914fe41999eed8dcda92fb16b313c4648cd2631c1b2111f0f348f13fd821a` |
| `test/first-person-walk.test.ts` | `4c281165cf6d69fd5646447827b58609ff153cbbdc5a10d89604699930d89f4e` |
| `test/walk-collision.test.ts` | `c2a2b760b6e5741712ed8bc258da8099683ebecb7b0dd11d2122b3eada17e917` |
| `docs/reference/setup.md` | `ac27342c13023a4e669895ae6986d0e7c591fe992c66198d8ed269e858966290` |

Read-only source review only: no files changed, processes launched, gates run, or visual/FPS acceptance issued.
