# Review 1004 — commercial runtime transform repair

**ADMIT FOR FRESH RUNTIME.** No material finding in the focused transform repair. This admits fresh runtime qualification; it does not establish appearance, final-gate or integrated acceptance.

Reviewed the frozen candidate in `C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/worktree`. The repair keeps the **20 µm position and 4e−6 normal tolerances unchanged**. `src/scene/commercial-corner.ts:57` derives expectations from independently pinned original local attributes and the separately observed parser-placement matrix. It does not derive expectations from the runtime matrix being checked. The recipe diff adds only that placement pin; previous source measurements, footprint, threshold and limits remain intact.

The provenance is supported by the retained pre-repair probe, the exact cached GLB matrix, and unchanged installed integration code: `node_modules/three/examples/jsm/loaders/GLTFLoader.js:4430` applies the matrix through TRS; `node_modules/3d-tiles-renderer/src/three/renderer/tiles/TilesRenderer.js:788` applies tile placement before invoking model plugins. PRIMARY's actual tileset specifies Z-up and has no ancestor or tile transforms for data518. The inspected first native failure receipt retained SHA-256 `24d5cb457c25044b04f162240a5a6b85ae0a8799146064faa1b03d0dd7f5a7d3` and the same `face60 transformed plane/normal` startup failure.

The new installed-chain regression at `test/commercial-corner.test.ts:64` retains real node loading, TRS conversion, B3DM parsing, facade processing and tile transactions. Its supplied boundary is decoded primitives and images. The retained restored-old-guard log reproduces `face60 transformed plane/normal`; repaired evidence records 23 passing focused tests, including refusal of a 1 mm placement mutation before transfer.

The same case checks every room/furniture vertex against the **displayed foundation triangles**, all four corners of the **1.60 × 0.22 m graded threshold**, and both rear sill joints against pinned pavement facet464606. Source-array hashes and construction totals remain checked: seven draws, 11,248 triangles, 1,805,880 geometry bytes, zero new atlases and one local light. CC-1/CC-2 and transfer/cancellation/rejection disposal checks remain present and green. Legacy fixture changes preserve the original scalar-test bounds.

All **10 active, 13 evidence and seven retained pre-repair pins matched**. Active/evidence pins matched before and after review.

| Repair file | SHA-256 |
| --- | --- |
| `src/scene/commercial-corner.ts` | `9e623113330fa657bbc9de49cd238971250985d2bd45a272129adb35e4df40ce` |
| `src/scene/commercial-corner-recipe.ts` | `56e898de8368d0097d4f696ae55a27508e82c542dd7a62f92fa7b6a4f3b040b3` |
| `test/commercial-corner.test.ts` | `3abaec4504387aa87d19d78b8765c2dde60875ffdb80b4a9a8f218a3709fc3cc` |
| `test/crossing-corner-material.test.ts` | `b545b0127701572affb082c218b27ff8ff5b41cd629f60492c5f3d0046657661` |

Handoff manifest: `8d6a474f8de9b376bb4c418536629d078be7aa10a6668f2606f116b94650393c`. Evidence manifest: `cd9a3420a7ace00463ed36d5217ab921b93f620a7bdd575aa52a5285c69837ef`. Report1002 matched its assigned SHA-256 `98a81bc9e27465883e1bf8dbb55580ac3aafe8f45ecc829267475bb962875b5f`.

Inspected the retained `tsc exit=0` receipt. Legacy worker evidence is **15 passed, one filtered**, not a full-suite pass. No tests, gates, browsers or servers ran during this review; no files changed. Fresh native startup/appearance, integrated review, all five final gates and adoption remain pending. Frozen review released.

Root accepted this bounded verdict and authorized retaining this report. Root subsequently reported integrating the exact four repair files into PRIMARY and observing build, typecheck and 39 related tests pass, including all16 legacy cases. Those later PRIMARY checks were not independently run or inspected by this reviewer. Root plans fresh candidate2 capture under the separately reviewed1003 caller and one GPU lease. This report grants no appearance acceptance or automatic code-commit authority. This report is the only file written under the retention authorization.
