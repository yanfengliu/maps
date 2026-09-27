# 195 — local execution budget for the activation-clearance regression

Bound: this candidate changes one test declaration at test/vehicle-clearance.test.ts:160, from the default5000ms execution deadline to an explicit20000ms deadline. It changes no production byte, test body, population setting, seed, observation cadence, assertion, fixture, global timeout or canonical worker setting. This is an execution-budget repair, not a simulation performance improvement. Independent exact-source review and the final integrated gates are pending.

## Evidence and approved design

The preserved193 canonical full unit gate failed1/802 tests across92 files. Its activation-clearance case took5509ms and was refused by the default5000ms timeout; no semantic failure was printed. The rest of its eight-case file passed.194's one authorized same-byte focused run at the unchanged default limit passed8/8; the same case took2132.654ms. Its commands, source/data bindings and timing limits are sealed in artifacts/vehicle-clearance-timeout-20260927/REPORT.md, SHA256c385d842e9e0368d3e8b546ab7b3cd54bad6c537571f65296df0fbf4cc96f070, and seal SHA256f4bb302a90f9d8d7c11ec5cd1d6fbe5c771a0df5babb284d67abbe18b4905f52.

194's unchanged1200-tick loop shows production update cost1725.496ms of1824.360ms total, with80.919ms overlap cost. The exact-source focused pass establishes isolation behavior, not a green full-suite result. Canonical file parallelism and the2.583times full/isolated case duration support a concurrency-sensitive wall-time explanation, but193 has no per-worker CPU/run-queue record to assign exact causes.179/184 focused configs had maxWorkers2 and testTimeout15000; their passes did not test canonical default-budget behavior.

Neighboring functional replay cases already have explicit longer limits: the same120-vehicle/1200-tick spacing run uses180000ms and took4978ms in193;60-vehicle/1200-tick vehicle-run cases use120000ms; lifecycle cases use120000ms; authority cases use60000/180000ms. The approved20000ms limit is3times the observed5509ms, rounded upward to the next5000ms step. This is a bounded execution allowance, not a proof of any future maximum or a new population performance requirement.

Root accepted this narrow design after reading194's timings and neighboring budgets. It explicitly retained all120 requested vehicles,0 pedestrians,seed5970698,1200 fixed updates, every-tick overlap observation, existing assertions and canonical workers. It excluded production caching, a global timeout increase, reduced denominators and other product changes.194 was sealed before this edit. The full193 failure remains preserved and must not be relabeled by the focused194 pass.

## Exact candidate

Before SHA2563c8ebe9bbde46aadb422d17375a944dde7975e79aaba20f443c0594d692e0790; after SHA256663a399a0183c062ab564a2408a795f86e31525cbe2a9dd14e937a1df579d96e. The only insertion is `, { timeout: 20_000 }` between the test name and callback at line160. change.diff and complete before.test.ts/after.test.ts retain the exact bytes. The edit script asserts that removing exactly that insertion restores the original byte content, preserving the existing line endings.

candidate.json binds all 14 final traffic candidate files;13 match 179 exactly. final-integrity.json checks all 668 files bound by 194 as source/test/tool/doc/root files, permitting only this one test change, while retaining primary's 14 original integrated179 files, both cached input pins,161 earlier 179/184/193 evidence files, all 30 files in the 194 manifest and its seal/manifest, the 133 older packet files and the shared cache. Primary remains unedited by this worker. No canonical document or Git record changed.

## Checks and handoff

`node --check test/vehicle-clearance.test.ts` exits0; this is syntax only. The literal uses the same Vitest per-case options form as the existing neighboring tests. `git diff --no-index --check before.test.ts after.test.ts` returned1 because the two files differ, with only inherited autocrlf warnings and no whitespace diagnostic; its actual log/status is retained. Exact single-insertion byte comparison is the decisive scope check. No mirror test was added for the timeout literal.

No focused test, full suite, build, typecheck, audit or visual gate ran on195 here. The worker obeyed188's native-capture CPU hold and did only source/diff/syntax work. No browser, GUI, server, daemon, cache, external temporary directory or long-running process was created by195; final cleanup found zero task-marker processes. Artifacts remain for review/integration, and the shared traffic-halts worktree remains intentionally in use by root's handoff.

An independent reviewer must inspect exactly this test and the preserved193/194 evidence, confirm the unchanged body/denominator/assertions and the local deadline scope, and report any focused check honestly. Root must integrate the exact admitted test and run a fresh unchanged canonical full unit selection along with the relevant final gates. A green syntax check is not a full gate. Bus delivery, support, populated appearance, full-population performance and native acceptance remain open as previously recorded.
