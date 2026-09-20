# Visual evidence survives candidate worktree removal

## The certificate's location was outside its existing checks

**Timestamp:** 2026-09-19 16:31–16:46 America/Los_Angeles.

**Action:** Added a Git checkout check before every visual wrapper CLI step. Linked worktrees and subdirectories are refused with the primary path and `npm run visual` as the next command after integration. Every pre-existing certificate check is retained. The wrapper header and local rules now state that the two style-return approach frames are lane evidence outside the 44 certified frames.

**Result:** Seven focused tests pass. Removing only the CLI guard makes all three linked-worktree cases fail; restoring its exact bytes returns them to green. The real primary certificate was checked read-only before implementation: run `aa2e07e9902a5dc9`, certificate SHA-256 `6368d5e683c5ad4c1e3bbbfcc4e992e19234ca0ad91ea9c6242ef3e5b1812731`, 44 matching frame hashes, three matching build hashes, matching scene and harness digests, and three accepted lifecycle records. No reset or re-certification was used for that check.

**Reasoning:** Refusing certification in a disposable checkout is enough to prevent this evidence-loss path. Copying certificates elsewhere would also need to retain all referred frame, lifecycle and build bytes and keep their paths meaningful. The refusal keeps those existing contracts intact and places final verification after integration into the primary.

**Validation:** `test/visual-checkout.test.ts`, `test/visual-instrument.test.ts` and `test/visual-evidence.test.ts` pass 51 tests together; `tsc --noEmit` passes. The first scoped run of the existing suites failed because this isolated checkout lacked `data/scene`, so a temporary data junction supplied the unchanged primary inputs for the rerun and was removed in `finally`. No data-writing command, browser or server ran in this worker. The sandboxed Vitest startup hit an ancestor-directory ACL in esbuild; the approved run outside that sandbox passed.

**Code reviewer comments:** Independent review found F21, a false linked-worktree refusal when Windows received the same primary path in alternate case. `realpathSync` preserved the caller's spelling; `realpathSync.native` returns the stored path. All compared paths now use the native resolver. A new Windows-only regression fails when the old resolver is restored. The repaired source passes eight focused cases, 52 tests across the three visual unit files, and TypeScript.

**Notes:** The new tests cover the CLI boundary and retained sentinel bytes, not successful rendering or protection from a later explicit deletion of primary artifacts. No full visual gate or code commit belongs to this worker's validation; final gates and independent review are the integration owner's acceptance steps.

## Primary integration verification

**Timestamp:** 2026-09-19 16:51–16:59 America/Los_Angeles.

**Action and result:** Integrated the frozen repair `57023afe681a4a985f378a9cd52e86eb6bf11a7a0597ba7afee8a468af27bc11` into the primary at `244632ca8d88dc464a162fad3782baa91f59f136`, without changing simulation, rendering or served data. All eight candidate file hashes matched the freeze before and after the gates. These later documentation updates record their results. Build, typecheck, unit, visual and audit each exited 0. The unit gate passed 75 files / 543 tests; the high-severity audit threshold passed with two moderate advisories. No dependency was changed.

**Visual evidence:** Certificate `d11360e0649ffb15`, SHA-256 `fdf02dfdc0fca9e06024bfd356ab4484d8067269f6d850281b1259d8db75bd3b`, binds all 44 freshly hashed frames on the RTX 4090 / driver 616.64. The appearance lane passed four tests; the three lifecycle repeats completed teardown, with navigation 99 / 126 / 112 ms and replacement 4864 / 4301 / 5548 ms. The served scene digest stayed `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`; the updated harness digest is `45aeaf15464fbc2a34e0252f3c06b6e8bd44969103aeb65bdd7d21dab53d0593`. Review 38 records independent native inspection of all 36 sweep frames and root inspection of the eight hero frames, with exact hashes and no blocking still-image finding for this increment. Root accepted the visual review and the final staged code after reading the guard, wrapper, tests and both authored reviews. The previous 96 visual evidence files remain hash-verified under `artifacts/certificate-primary/previous-visual`; no data was copied or rebuilt.

**Cleanup and limits:** The reviewed headless runner recorded 46 retained identities already exited, 34 admission omissions and one child that exited before its handle could be retained. Fresh process inventory found no retained or omitted identities alive, no browser/server runtime candidate and no listener on port 4319. No fallback termination was needed. The first runner invocation refused an absolute output argument before launching a child; the corrected workspace-relative argument ran successfully. Gate logs, exact integration hashes and cleanup ledgers remain under `artifacts/certificate-primary/gates/`. This unit does not establish the unresolved population, moving-camera or source-rebuild acceptance criteria.
