# 992 — commercial corner pass repair

2026-10-14. **CC-1 and CC-2 are repaired and CPU checked; focused independent re-review and native qualification remain pending.** The candidate is uncommitted on `codex/commercial-corner-20261014` in its isolated worktree. PRIMARY and root's baseline capture were untouched. The original [989 handoff](989_commercial-corner-implementation.md) remains byte-identical, SHA-256 `87925b325f05e6b80eef6d877d28946558c52a5c08f9f6eebca87da1e16373e2`.

## Target and coverage

Before any repair edit, all seven frozen989 files were copied into the permanent [991 before-fixes snapshot](../snapshots/991_commercial-corner-before-fixes/manifest.json), retaining their original relative paths. All120,665 raw source/document bytes matched the existing frozen `handoff-pins.json` before copying and again after reading each saved copy. The manifest names the exact seven pins and source base `69a33eef4a7825497cdd332208c29e7dcab56d27`. This promoted text preserves the actual uncommitted target reviewed in991; it contains no screenshot, raw runtime log or binary. The unchanged base version of `buildings.ts` remains recoverable from that commit.

The repairs address only the two P2 findings from root's independent991 source review. The source identity, recipe, geometry, threshold, resource ceilings, signs, time uniforms and tile lifetime described in989 remain unchanged.

## Findings and changes

**CC-1 — loader overwrote authored shadow exclusions.** The actual `createBuildings` load-model handler now enables ordinary/source mesh shadows while preserving the existing `authoredFrontage.source === false` constructor policy. Commercial glazing and luminous fittings retain `castShadow=false` after the event; cladding and original source meshes retain shadows. The regression creates the actual buildings instance and installed TilesRenderer, dispatches its actual load-model event with the complete pinned commercial assembly, observes the loaded counter and checks both excluded and opaque/source meshes. It does not test a copied handler or a parallel shadow classifier.

**CC-2 — transparent glazing sealed GTAO room depth.** The commercial glazing's registered normal material now has `visible=false` and `depthWrite=false`, matching the repository's existing contact-material exclusion policy. `withNormalMaterials` still installs that registered material for the draw; Three's material visibility policy prevents submission of the transparent pane before depth/normal writing. Opaque room/frame and source normal materials remain visible and write depth. Source suppression still compiles with the shared live style uniform. The tests enter the real normal-material swap, inspect the actual substituted materials in its draw callback for both Satellite and Cartographic, and verify restoration after successful and throwing draws. No global transparent-material policy or normal adapter changed. Pixel effects remain unmeasured.

| Repaired input | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/scene/buildings.ts` | 29,624 | `f7675e72b9e24dbd0d5d6d8579d82bbf42ccabc887126496cd65436f1e93495d` |
| `src/scene/commercial-corner.ts` | 27,069 | `4151274f6fd9768c4efda836cbb514d081f1099e637c4ee62e71ddfb44ea9bf9` |
| `test/commercial-corner.test.ts` | 21,354 | `e0b01b3651ed60bfd68c22469429f071e59443d2fbcc890b62c20e4d3d030e42` |

## Checks and controls

- Typecheck: PASS, direct `tsc --noEmit` with its exit status checked explicitly. Focused checks used the real independent worktree installation on Node24.12.0.
- Focused unit suite: **21/21 PASS**, comprising19 complete commercial/source tests and the two existing normal-pass tests. Native config loading, disabled Vitest cache, owned Vite cache and owned TEMP/TMP remained in use. Runtime/browser tests and the full repository suite were not run by this worker.
- The three new cases failed against the actual unrepaired target before the fix. After a green run, both old implementations were deliberately restored from their retained bytes. The CC-1 case failed with `loaded transparent glazing must not become a solid shadow caster: expected true to be false`; both CC-2 draw cases failed on `transparent glazing must be excluded before normal/depth submission`. Exit1 and both finding-specific messages were required by the control runner. Fixed source bytes were restored in `finally` and their SHA-256 equality checked, then21/21 passed. Ignored receipts are `data/commercial-work/pass-repair-restored-old-red.log`, `pass-repair-green.log` and `pass-repair-typecheck.log`.
- Fresh CPU construction still reports seven beauty draws,11,248 triangles,1,805,880 added geometry bytes, zero new atlases and one4m shadowless local light. These are bounded construction counts, not GPU allocation or frame-performance measurements.

## Disposition

The repaired candidate is frozen for root's focused independent re-review. Active candidate pins are refreshed only after these repairs/checks and this authored report are complete; the permanent991 manifest retains the old target separately. No full gate, browser, server, GPU process, commit, dependency change, data change, PRIMARY edit or main/ref/index write was performed. Finite type/test/control processes completed; process census remains subject to root's available ownership tooling.

Real noon/dusk captures, style/time controls, tile lifetime in the browser, full five gates, independent integrated review, main merge/push and cleanup remain root's acceptance work. These CPU repairs establish pass policy and its regression controls; they do not establish convincing frontage appearance, lighting or whole-map completion.
