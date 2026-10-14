# 1002 — commercial runtime transform repair

2026-10-14. **The startup source-binding defect is repaired and CPU checked. Native startup and appearance remain unqualified.** Work stays uncommitted in the isolated `codex/commercial-corner-20261014` worktree. Root's failed capture and PRIMARY were not changed. This repairs the implementation and its fixture boundary; it does not select another design.

## Failure and first instrument

The first instrument was the existing commercial source-binding guard together with the installed GLTF/B3DM/tile parser boundary. Root's actual failed capture is `artifacts/commercial-corner-20261014/capture/candidate/payload/capture.json`, SHA-256 `24d5cb457c25044b04f162240a5a6b85ae0a8799146064faa1b03d0dd7f5a7d3`. It records data518 failing `face60 transformed plane/normal` before the first frame; there are no candidate images from that attempt.

Before edits, the seven frozen product/test files were copied byte-for-byte to ignored `data/commercial-work/pre-runtime-repair/<original path>`. Its `pins.json` binds all146,871 bytes against the prior active handoff. The original989/991/992/993 reports and permanent991 pre-fix snapshot remain unchanged.

## Root cause and independent placement provenance

The old fixture assigned the published affine root matrix directly and froze `matrixAutoUpdate=false`. Installed GLTFLoader.js:4426–4430 instead calls `node.applyMatrix4(matrix)`. That decomposes and later recomposes translation/quaternion/scale. The published matrix is slightly non-orthogonal, so this changes placement by millimetres. B3DMLoader then applies the tileset's up-axis adjustment; current `gltfUpAxis=z` and the tile transform are identity. TilesRenderer invokes the facade plugin after that chain. The old20µm world-position guard compared the actual TRS result to the offline raw-affine coordinates, so it correctly detected a mismatch against the wrong expected frame. Original attribute checks had already passed.

The bounded CPU probe used the actual installed GLTFExtensionsPlugin→GLTFLoader→B3DMLoader→TilesRenderer.parseTile chain. Only decoded primitives/material images were supplied from the exact cached source, avoiding a browser worker/image decoder. Node construction, source matrices, TRS conversion, up-axis/tile adjustment and process hook were unmodified. `data/commercial-work/runtime-transform-probe.json`,2733 bytes, SHA-256 `e5a047441f68e7f38038fac2174a542a90c6493bc2eb01628fcd444de0d61fc3`, retains both matrices, parent chain and the same original failure. It remains the pre-repair refusal receipt.

Published raw matrix, column-major, from the pinned GLB node1:

```text
[-0.646119582369256,-0.6196603882405907,-0.4454399988273508,0,
 0.0011056033977274637,0.5829681007983163,-0.8124060911556444,0,
 0.7630932189992472,-0.5255180268594996,-0.3759819898673231,0,
 -83.24758567357458,29.07728939665791,-8.430956746298762,1]
```

Separately observed installed parser placement, column-major:

```text
[-0.6461536208265518,-0.6196312496885866,-0.44542608282959806,0,
 0.0010764649858723853,0.5829112474684904,-0.8124462192635781,0,
 0.7631071348342304,-0.5254778990279229,-0.376004804746445,0,
 -83.24758567357458,29.07728939665791,-8.430956746298762,1]
```

Foundation vertex180 moves from raw-world(-15.563147818075606,15.098983817735704,−28.30105565962874) to parser-world(-15.56156518428402,15.100428335558366,−28.303261261848508), a3.075067903mm separation. Maximum matrix-entry difference is0.00005685332982585667. This is the observed affine/TRS difference, not a reason to increase a tolerance.

## Repair and complete changed-file list

The recipe adds the independently observed `parserPlacement` as a separate source pin. All previous local positions/normals/UVs, indices, raw world measurements, footprint, sign crops, threshold and limits compare deeply equal to the retained pre-repair recipe. The guard now transforms those pinned original local attributes through the parser-placement pin for its actual-world expectation. Position tolerance remains20µm; normal tolerance remains4e−6, with original local tolerances, source digest, GML, UV, categorical selection and winding checks retained. No renderer transform, source array, model basis or source/cache byte was rewritten.

| Changed product/test file in this repair | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/scene/commercial-corner.ts` | 27,627 | `9e623113330fa657bbc9de49cd238971250985d2bd45a272129adb35e4df40ce` |
| `src/scene/commercial-corner-recipe.ts` | 13,149 | `56e898de8368d0097d4f696ae55a27508e82c542dd7a62f92fa7b6a4f3b040b3` |
| `test/commercial-corner.test.ts` | 28,673 | `3abaec4504387aa87d19d78b8765c2dde60875ffdb80b4a9a8f218a3709fc3cc` |
| `test/crossing-corner-material.test.ts` | 22,394 | `b545b0127701572affb082c218b27ff8ff5b41cd629f60492c5f3d0046657661` |

The complete plugin cases in the legacy test now use loader TRS. Its direct scalar/old-surround facing cases retain their original raw-affine unit bound. An initial global fixture conversion exposed the old raw half-space test's3.72mm mismatch; that was corrected by separating the two fixture bounds, without changing its predicate, expected precision or old product treatment. The commercial fixture uses parser placement throughout. No tracked tool/helper, `buildings.ts`, `facade-textures.ts`, `post.ts` or normal adapter changed in this repair. The full active candidate still comprises the seven product/test paths in the refreshed handoff pins; the table above identifies this increment's four edits.

## Checks, red controls and support bounds

- Direct `tsc --noEmit`: PASS with checked exit0 and a nonempty `data/commercial-work/runtime-transform-typecheck.log`. The initial new test callback lacked its required Promise return; the callback was made async before the final check.
- **23/23 focused tests PASS:**21 commercial cases plus the two existing normal-pass cases. The new integration case instantiates actual `createBuildings`, uses its installed GLTF loader, parses the exact b3dm through the real facade plugin and tile transaction, then observes the published source vertex's known parser-world coordinate. It does not feed a pretransformed scene to a copied handler. A second case changes actual loader placement by1mm and still refuses the source before model transfer.
- The actual installed-chain case failed before the fix with the same `face60 transformed plane/normal` error. After green, the exact old guard module was restored from `pre-runtime-repair` and failed again with exit1; the changed-placement refusal case still passed. Fixed bytes were restored in `finally` and their SHA-256 equality checked before23/23 passed again. Logs: `runtime-transform-old-red.log`, `runtime-transform-restored-old-red.log` and `runtime-transform-green.log` under ignored `data/commercial-work/`.
- The same installed-chain success case independently checks every room/furniture vertex against the actual displayed foundation triangles60–62. It checks all four corners of the whole1.60×0.22m threshold and both rear metal-sill joints against the real pavement facet464606, using independently decoded raw source anchors and its actual affine grade. Positive barycentric containment remains above0.0373 and joint positions agree within25µm. No clipping or support geometry change was required. The separate complete-threshold/source/disposal/CC-1/CC-2 checks remain green.
- The integration case observes unchanged construction totals: seven beauty draws,11,248 triangles,1,805,880 added geometry bytes, zero atlases and one4m local light. It also verifies original source-array digests before/after plugin processing. This establishes construction/source bounds, not GPU allocation or speed.
- **15/15 legacy source/pass cases PASS**, with the unrelated whole walking-body/frontage test filtered out because this isolated checkout lacks its network input. Root's complete unit gate remains required; no source-dependent case is reported as a pass without its inputs.

Source data518 remains4,973,844 bytes/SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`; current pavement remains13,071,300 bytes/`841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6`. `data/commercial-work/runtime-repair-evidence-pins.json` binds the source, probe, support/type/test logs and pre-repair manifest. Dependencies, source-input bytes, PRIMARY, captures and Git/index/refs were not changed. No browser, GPU/server or full gate was launched.

## Disposition

Candidate frozen for root's exact integration and independent1004 source review, then fresh native startup/appearance qualification. The failed native receipt and old seven-file target remain retained. No image or performance acceptance follows from this CPU repair; actual startup, noon/dusk originals, controls, browser lifetime, all final gates and main integration remain pending.
