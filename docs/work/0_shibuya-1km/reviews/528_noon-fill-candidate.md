# 528 — Noon fill candidate

2026-10-01. Root assigned this bounded implementation after rejecting facade457 appearance. Base frontage HEAD remains `79d0a03375943121c9f67529b61cb79dabc87ee2`; this is an uncommitted, unaccepted candidate. The shared tree was used because root admitted no additional worktree and reserved disjoint source writes. No browser, server, GPU, build, audit, full five-gate chain, main integration or push ran.

Only `src/scene/time-of-day.ts` and `test/road-tone.test.ts` changed. The starting raw SHA-256 values matched 523 and the assignment before writing. `lightingForPreset` still calls the unchanged instant model, then sets exactly `hemisphereIntensity = 0.78` when `id === "noon"`. All other preset returns and fields follow their existing computation; the shared `0.42 * daylight` coefficient was not changed. Noon's previous hemisphere value was 0.58; environment remains 1.5. This follows 519's one proposed comparison and 523's two-path contract, without an observer dependency.

Exact production diff at `time-of-day.ts:179` is one return replaced by:

```ts
  const lighting = lightingForInstant(id, preset.label, preset.instant);
  // Tune only the named noon preset; keep the shared instant model unchanged.
  if (id === "noon") lighting.hemisphereIntensity = 0.78;
  return lighting;
```

The existing noon contract case was renamed to describe the preset fill, its comment now names the override, and its hemisphere assertion changed 0.58→0.78. Its environment assertion remains 1.5 and all dusk cases remain unchanged. No redundant test was added. Git's exact diff reports 4 added/1 removed production lines and 4 added/4 removed test lines. CRLF line endings were preserved. Replacing only the new factory block with the original return reconstructs the exact starting source SHA, proving the rest of the source, including `lightingForInstant`, unchanged.

Actual focused verification passed on Node 24.12.0 and Vitest 3.2.7: 19/19 existing cases, zero failed/pending, across `road-tone.test.ts` (10), `realism.test.ts` (8) and `post-motion-sampling.test.ts` (1). Direct `tsc --noEmit` also exited 0 over the current shared `src`, `test`, `tools` and configs. The focused process took 2.518 s; types took 4.657 s. These checks cover existing CPU lighting contracts, solar geometry, pure surface/facade checks and renderer-spy history behavior. They prove no changed pixels, GPU material result, controls, frame rate or full-square appearance.

Ignored `artifacts/noon528/focused.config.mjs` sets `cache: false`, an owned Vite cache path, one thread worker and runner config loading. `run-cpu.ps1` assigns owned TEMP/TMP/TMPDIR, uses hidden retained process handles with 90-second command bounds, restores environment, and cleans cache/TEMP in `finally` after a nonfollowing zero-reparse census. Actual retained processes 64516/57196 exited; both temporary trees are absent, and the final exact-PID census found zero survivors. Eight recorded direct verification inputs remained unchanged during checks. Sixteen protected facade/observer/buildings/signage paths matched before/after hashes, with zero mismatches. Existing partial work, data, dependencies and Git were preserved; only this new authored record and ignored run evidence accompany the two allowed edits.

Root owns source and native acceptance. Before any adoption, prepare actual main plus this exact two-path allowlist and obtain the preregistered matched default northwest and held-out southeast noon views, dusk views, real style return and surrounding-field regressions. Keep geometry, materials, source texture/pane bytes, sky, key, environment, exposure, post and controls frozen. Reject washing out roofs/shadows, lost window/hue separation or worse ground/marking readability. Powered-city, temporal filtering and full-AOI criteria remain open; this implementation proves no visual improvement.

## SHA-256 bindings

| Input | Before | Candidate |
| --- | --- | --- |
| `src/scene/time-of-day.ts` | `50a7e6f9ea2fdb9bf59c9f26302bd7c97d3a2021167c3ea537a380211ff88e7a` | `9efabf287680e510bce6484b356d1b6f4c5386cef736ecb452dff20570eba917` |
| `test/road-tone.test.ts` | `5f6921f35e71ed09ac8776c86b3333d2336bea0928efa353af415d5f71755a60` | `4672a34f09ba26a76674574a301b0264f0761acf4b6f0679f3320dde610b24d5` |

Evidence relative to `artifacts/noon528/`: `checks.json` SHA `1e9ea3296115beff5a0e8fa25d4ae47179ed6caeea123950587cae706e1abb8f`; actual `focused-results.json` SHA `a9ab3eeb94bc3f98422e126a9fb7868bc839ce2fa1dde04f6655ab8a1bf6b02f`; `preservation.json` SHA `2b3cf67e6ca25d8bc6d60ca3d6bdc684a5d12714c578168bc995f96d3704d533`. Launcher SHA `24d456e08056790159c8efa1f4f6b6ead64fa5c2f87898821b188bcf2847872a`; config SHA `770bdf39cace35c092e182c9955774fe5c004e7cff96f5d15654db7f4df943bf`. Logs and their digests, exact command arguments, PID/start identities, input pins and cleanup counts are retained in the receipt for root's review.

2026-10-01 20:26:47 UTC: root authorized533's comment-only correction before531 freeze. The DUSK_HEMISPHERE_FILL explanation now distinguishes the unchanged shared instant-model daylight baseline (hemisphere0.58/environment1.5) from the named noon override0.78, and calls the old crossing-band measurement historical evidence rather than an invariant of the override. Only these five comment lines changed; CRLF count and all1,607 non-trivia TypeScript tokens are identical to the candidate checked above (token SHA `1cf788e629edbb07a19a85375b76fad92b9f08ea2e83765d45f56a0d1ec10f7e`). Corrected source SHA `81c5a1e02fc67b9fed03d70481384ad22f1ed0eef1673b9c7310c48e4fffc986`; test SHA remains `4672a34f09ba26a76674574a301b0264f0761acf4b6f0679f3320dde610b24d5`. Receipt `artifacts/noon528/comment-correction.json` SHA `3d08905086cf0c80ac86ec5461f8387ff06708b016b74e712226bb08d49d2fbd` retains the exact before/after comments and source hashes. No repeated CPU gate, bundle build or runtime ran for this correction. Token equality establishes unchanged code, not emitted bundle-byte identity or pixels; final gates remain pending. The original run hashes above remain the bindings of the checks that actually ran.
