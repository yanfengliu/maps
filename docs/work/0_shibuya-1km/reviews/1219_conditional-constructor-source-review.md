# 1219 — Conditional constructor source review

Final verdict: HOLD the frozen 1218 revision and its final preparation tuple. Two instrument findings must be resolved in a separately reviewed revision before a constructor lease. This is a source review, not constructor execution, geometry/1157 union qualification, performance, public-gate or main/full35 acceptance. Root's separate 1216 functional intake is not re-performed here. No subject, Node parser, registry, constructor or control ran here; no corpus census or large-input rehash was performed.

| Finding | Actual source and consequence | Minimum correction |
| --- | --- | --- |
| F1 — The probe does not bind the selected runtime authority | run.ps1:16–24 checks RuntimeAuthorityPath, but line36 passes no selected-authority identity to Node. probe.mjs:18–20 reads only input-manifest and imports the fixture/candidate. The probe neither reads nor validates the selected release before construction, so the required common-authority premise is absent. | Pass the exact selected authority path and pin to the probe; validate its concrete release, manifest/source/argv/cwd and selected bound before fixture import. Preserve the original authority pin through final checks. Keep the mandatory root release and real constructor. |
| F2 — Terminal reporting can mask the retained first error | run.ps1:46 records a failed result-file write, but line47 calls Console.Out.WriteLine outside a catch. If that write also fails, the terminal reporting exception escapes and no stderr fallback attempts to preserve the earlier first/later facts. | Guard final stdout and stderr with the existing chronological error recorder. Preserve the earlier first error, retain later reporting errors and HOLD, and attempt the bounded fallback without changing child lifecycle behavior. |

Both findings are static reachable-path conclusions, not observed runtime failures. The source is not eligible merely because the launcher has an unevaluated AST with zero errors.

The construction/provenance changes are otherwise confined. I checked every early source byte pin: 15 files, 185,260 bytes. All eight pure predicates are byte-exact 1214, including the reviewed cross-only facet source. Provenance and surface-interiors are byte-exact 1171. Fixture and candidate restore exact 1171 bytes by reversing only the joint 1218 namespace relocation. Their absolute candidate import and fixture path resolve the same provenance module/P identity; the actual observer asserts that identity during construction. No 1213 projection optimization or domain/material/normal/refusal policy change is present.

The old missing own/run.ps1 premises now point to the actual new launcher. Retained roof diagnosis, lower witnesses and prior diagnosis use explicit original 1132 paths; recipe, tile and decoder roots remain the parked commercial worktree. The old 1108 invalid-source discriminator and source-mutation/refusal/restoration statements remain. The probe calls real f.add(), requires the shared trace and six meshes, captures actual typed buffer bytes/materials/source binding, and maps emitted provenance to actual Float32 geometry. None of these future assertions is reported as observed PASS.

The internal physicalFlush predicate, final-loop omission/restoration, irrelevant subdivision and finite face-interior controls remain byte-exact and reachable inside construction. Separate post-construction encoded/interface/coverage bodies are preserved as unimported prepared-post-checks.mjs: its 1,505-byte helper block and 3,638-byte body match the original probe exactly. Their status is DID_NOT_RUN; constructor completion would not qualify them or the independent 1157 union obligation.

The new launcher requires a TRUE single-attempt root authority and admitted 237/finalizer/source prerequisites, pins its proposal/manifest/self and runtime inputs, rejects NODE_OPTIONS/stale run output, and uses the unchanged 1203 lifecycle helper by absolute reference. Its parameter maximum is 60,000 ms with the helper's existing single 5,000 ms cleanup grace. Root's separately retained outer watchdog/closure remains required. Probe finalization retains first/finalization errors, snapshots provenance, disposes resources, verifies loaded/declared input pins and writes a constructor-only result.

The final immutable tuple retains the same 15 source pins and explicitly records F1/F2 as open. Its false proposal has no selected deadline; it binds the actual Node executable, two-item unprofiled argv, parked 1218 cwd and fresh run/ outputs. I read the delta, import and input manifests: 41 runtime descriptors and two prepared-only descriptors distinguish actual source/data readers, retained package-loader closure and excluded type-only imports. All five extracted statement blocks independently match the old probe. Future loaded-module checks fail on undeclared modules; actual imports remain unexecuted. Root separately verified all declared input bytes. This review identifies no additional material source change and makes no independent large-corpus hash claim. The selected 1220 repair is outside this exact-revision verdict.

One reviewer metadata pin-list command refused at PowerShell parsing (an empty pipeline element after foreach) before executing. The corrected reader succeeded; no source or output bytes changed. This is separate from F1/F2.

All unprefixed archive paths below use `C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/recovery/constructor1218-early/`. FINAL means the sibling `constructor1218/packet/`; PRIMARY means `C:/Users/38909/Documents/github/maps/docs/work/0_shibuya-1km/reviews/`. The early pin index binds every inspected source; key entry points and final metadata are also listed.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| PRIMARY/1218_conditional-constructor-preparation.md | 3234 | 9509d94fee4731b65dfb8bbf711416106b9f9aa38617c7bf056d15d946b25c88 |
| PRIMARY/1205_conditional-constructor-readiness.md | 2530 | 274bf732f8b7e8be07eb2e44497f84fc4573e8f238ba684b53c4c867a21e56ea |
| early-source-pins.json | 4118 | abe2e0b40ea6c776331e9cf35f8a27735671f06db1fb51ea4c3cb2a70921d727 |
| run.ps1 | 5813 | fe06aaaa715c4e727d2ae680f33682c18d7aecaee24cb1ed1fad4ac75f264478 |
| probe.mjs | 10614 | 00c1965f6ee8f7c0e85fb0809c65640bef77e748c11a8b6cb6e64738e5700181 |
| fixture.mjs | 5868 | ae48291f628fc84a8762cf0c31c5906dedda702ef542f8cc2e5a3247babca8f8 |
| candidate.ts | 34246 | 7a0d98507fff0145b49e10922110fa98b58eb653825930d2a9124565e717ef17 |
| prepared-post-checks.mjs | 5702 | 5a7e9df4b7d101386ed6aa33c9d18b25e0b67dd88941ee89e83cea1a6ce4f235 |
| FINAL/source-delta.json | 14714 | f403e605fe392a20a8205a9399bbc11e11eacb4ec67c3a27d870a7ff412cc9f3 |
| FINAL/input-manifest.json | 14376 | 8f9cad128b737bfb94115987ee08777af5012aca8c780cf94cf634bccbb7f124 |
| FINAL/import-manifest.json | 4478 | 34ac00c71918caacae2866ef96df8d299dfbced336c1272452f452e7292955ac |
| FINAL/authority-proposal.json | 4621 | 57501281b910d87e997fb53c7019208098e9ff8492321389a0015fb9d33d6c3a |
| FINAL/preparation-index.json | 6544 | 1ab94e42c99c4bd498d0a4b79d69f6e1a3cb95a59e6c0b754b28814ddd8e2f51 |
