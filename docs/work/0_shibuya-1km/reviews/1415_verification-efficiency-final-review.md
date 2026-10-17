# 1415 — Independent review of verification efficiency

2026-10-17 UTC. Verdict: **PASS for the selected source and saved focused execution; the full normal suite with the cap remains pending root acceptance.** No material finding remains in this increment. This is one combined source-and-actual review, dispatched with the canonical reviewer configuration, gpt-6-astra/xhigh. It does not establish product correctness, visual acceptance or an optimal worker count.

The reviewed selection is the four-file 1415 handoff in `ground1098/search1109/1111-worktree`, base `0ab58a1a83e19db312bb18a2ffa8a90742029835`. I read the before/after test and configuration, current source, raw Vitest results, installed pool/default implementation and authored diagnosis. All 18 handoff pins remain current. The complete vegetation/configuration forward and inverse comparisons reproduce the frozen files exactly. Removing only the new 1415 defect-register entry reproduces its prior 1414 pin. The other two tests match PRIMARY after accounting for checkout CRLF differences; their workloads were not changed. The three prepared data inputs match their pinned bytes in both trees.

The vegetation reduction preserves the original predicate. For each canopy mesh separately, minimum/maximum Y bounds are equivalent to applying the same lower/upper inequalities to every vertex; maximum radius and leaf width preserve their upper inequalities. Both loops retain every original index and the same leaf endpoints `index+2` and `index+8`, stride 12, and Vector3 distance. The four literals remain −0.97399, 1.100135, 1.244998 and 0.072. Accumulators reset inside the mesh loop. Full position/normal finite checks still precede canopy filtering; triangle ceiling, three distinct crown hashes, bounding sphere and finally-disposal checks remain unchanged.

NaN is not dropped by the reductions: Math.min/max propagate it and the relational assertion fails. Nonfinite stored positions/normals still fail the existing finite checks; infinite derived radius/distance fails the upper bound. Empty loops retain their previous vacuous acceptance: +Infinity/minimum, −Infinity/maximum and zero/nonnegative maxima satisfy these literals when no values exist. This change introduces no new nonempty-geometry guarantee. Out-of-range leaf endpoints producing NaN still fail. This equivalence concerns the actual numeric BufferAttributes, not hypothetical stateful getters.

The only normal configuration change adds Node's availableParallelism and `maxWorkers = Math.max(1, Math.min(8, availableParallelism() - 1))`. It keeps at least one worker, caps at eight and uses one fewer available processor below that cap. Test selection, environment and deadlines remain unchanged. The installed Vitest 3.2.7 default pool is forks; its pool code chooses maxForks, then config.maxWorkers, then its CPU-derived default. The ordinary `npm test` script is `vitest run`, with no overriding CLI worker count. Installed resolution retains the 5000 ms Node test default. The saved actual configuration import reads eight on 32 available/logical CPUs. This establishes selection/consumption of the setting, not a measured eight-process full-suite run.

The raw baseline contains 18 passed cases across the three complete files, with zero failures, pending or todo cases and empty failure-message arrays. The optimized report contains all five matching vegetation case names, likewise passed without skips. The affected crown case changes from 1753.9773 ms to 36.3614 ms; the unchanged pedestrian/vehicle baseline cases take 956.2199 ms and 1219.2665 ms. Both focused runs use the retained sequential configuration. These observations support the bounded diagnosis and reduced matcher overhead; they cannot prove the full-suite cap cures all contention or that eight is optimal. The root-reported initial 125-file/1147-case run and its three timeouts were not independently rerun here. The saved scoped-type log is empty and the worker handoff reports PASS.

Exact evidence pins (bytes / SHA-256):

| Item | Pin |
| --- | --- |
| 1415 handoff | 10752 / `eef18ad32afed16b196cde6dbcc7e731928c205d1244e4e85613eecfbbfbff39` |
| Current vegetation test | 13319 / `9e5b3748496cd8c0e21da677e19e4b3e5898a9b41b8d5455cc7bb3aa453dd917` |
| Current Vitest config | 560 / `e3b6b0542be82a0539d2fcef07d07e18812af0ece01178f3d2cc39ea3fb5d20e` |
| Sequential original result | 7424 / `0209cb5554e1778543b5fde06ba0ebaccc40f99ec7da27b03777331a231d2216` |
| Optimized vegetation result | 2424 / `5fae99b891c744ff2523eee2489bbb7e8f0a144b4513369c1bc1e7c44359ed5d` |
| Actual configuration readback | 209 / `868b40c8fe49524b0debc7c03d5091461a674e1c0431b39a06111153dd6e9e45` |
| Reviewer inspection | 3011 / `98e7c10a4d974b582c4be4c23850a8a5a850329d47f912a06783a031b4a024c4` |

Worker evidence remains under ignored `1111-worktree/data/commercial-work/1415/`; this review's small readback is under ORIGINAL `data/commercial-work/1415-final-review/inspection.json`. An initial reviewer byte-equality check stopped on the two untouched tests' checkout line endings; explicit LF-content comparison resolved that reader error without source changes or subject execution. I ran no test, gate, Git command, browser, server, GPU or native process census. Root owns exact integration, the normal full gates and the focused final integrated 1414+1415 review before commit.
