# Q4 scene rebuild preservation candidate

Implemented in `artifacts/rebuild-preservation/wt`, branch `codex/rebuild-preservation`, from `27c71865bef31a7c9dcc622db16e6721be839dc3`. This is the parent-approved preservation-only increment. Independent review and integration remain pending. No primary edit, commit, source fetch, real city data writer, browser or GPU run was performed.

- Patch: `candidate.patch`, SHA-256 `cb5bfaff59c130e12550db9d8c7c95ac30bcb1a9059db5104b76ba177131069f`.
- Freeze: `freeze.json`, SHA-256 `4e9f44329c6b720ba138eaba878179b08df5073f8fcdf1561058e84124afa1b7`.
- Eight files are frozen. Only three are non-document files: `tools/scene/build.ts` (`e94a8e9bea1f567df6d10a03ccc66ad44b2e77a2d20d2337010e68336d9d24f5`), new `tools/scene/rebuild-preservation.ts` (`6b01b2bb5ea70c8357c377e403eb10837b6b9611bf49eba64e3a166c2f97430a`) and new `test/scene-rebuild-preservation.test.ts` (`149ca2417991e718fa5178972f47e17996fad998a3b5afd749a26cc5507cc556`).

## Behavior

The real builder now passes its unchanged generation body to `runSceneRebuild`. That boundary first reads and validates the existing markings pair, then calls the existing cleanup, then the body. A pair with neither file present admits markings bootstrap. A structurally valid mesh and consistent provenance in the existing published-only format admit replacement. Authored wrappers or notes, unknown formats, a missing partner, malformed JSON/mesh/source records and inconsistent counts refuse before any cleanup or writer. Existing non-file entries refuse rather than masquerading as absence. Each error names the path, explains the mismatch and calls for restoration of a known pair or a reviewed authored regeneration path.

The preflight checks the producer's current note, codelist, five-function list and provenance shape. These are existing format markers, not a new data-source policy. It checks mesh decoding, finite geometry/header bounds, index range, count fields and matching mesh/provenance triangle counts. It does not authenticate source hashes against original GML or prove that a coordinated forged pair is honest. The original producer, cleanup, paint recipe, hero-paint guard, source files and network bytes are unchanged.

This guarantee ends at admission. It does not make the whole rebuild transactional, recover already-deleted history, prevent concurrent external replacement, regenerate authored paint or settle the missing reviewed OSM extract. No source-vintage policy change is proposed. The actual city rebuild remains unverified and intentionally was not run.

## Verification

Node `v24.12.0`. `npm test -- test/scene-rebuild-preservation.test.ts test/scene-cleanup.test.ts` passes 27 cases: 26 preservation cases and one existing cleanup case. Three admitted cases cover absent scene, existing scene without markings and valid published-only output. The 23 refusal cases cover authored/partial/unknown/malformed/inconsistent combinations and an existing directory at a markings path. Every refusal compares all pre-existing file bytes and asserts zero writer calls. All seven cleanup-owned names and three companion files/subtrees are represented.

The test calls the same orchestration boundary used by `build.ts` and the real filesystem cleanup; only the expensive generation body is replaced by a counted fixture callback. Temporary roots are uniquely named under the OS temporary directory and removed by a path-checked cleanup. No shared `data` junction exists in this worktree; only `node_modules` is linked for read-only dependencies.

`order-control.mjs` removes preflight to reproduce the old destructive sequence, then separately moves cleanup before preflight. Both runs exit 1 normally with 23 failures and three passes; the refusal promises resolve instead of rejecting. The runner restores the exact helper bytes in finally and re-runs the green focused suite. `order-control.json`, `old-no-preflight.*.log`, `cleanup-before-preflight.*.log` and `restored-green.*.log` preserve the actual results. The source restoration digest matches the freeze.

Typechecking passes. `git diff --check` passes; the patch contains exactly the eight frozen paths, all below 256 KiB, and the named private-key/token-pattern scan finds no matches. No build, full test suite, audit, visual gate or `data:scene` was run. Those checks are integration work if this increment is accepted.

## Integration requirements

Review the exact byte manifest, the actual `build.ts` call order and both red controls. Use byte copies when materializing the target: a successful patch application on this Windows checkout does not establish the reviewed file hashes. A reviewer should preserve this authored handoff as a document snapshot before a later revision replaces it. No permanent implementation-review round has been claimed by this author.

This candidate is separate from the lease/capture milestone and Review 44. Its shared docs are based on `27c7186`; merge only the new sections/summary line into the newer primary history, preserving the accepted lease/capture records. Do not replace those shared documents wholesale. The local policy describes the new lasting preflight contract; the defect register, gate proof and devlog preserve the observed failure and verification bounds. The integration owner retains canonical plan ownership.

The worktree and ignored evidence are intentionally retained for independent review and parent handoff. No owned browser, server or watcher was launched. Do not remove frozen targets while an active review cites them; cleanup follows preserved accepted integration or an explicit disposition.
