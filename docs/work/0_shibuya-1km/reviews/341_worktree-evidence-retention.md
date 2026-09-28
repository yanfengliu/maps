# 341 — Verified worktree evidence retention

READY for root's review and a separately admitted retirement step. No archive, removal, Git commit, source/data edit or gate run occurred.

All owned ignored regular evidence was copied with its relative paths and raw bytes under C:/Users/38909/Documents/github/maps/artifacts/worktree341-retention-20260928/<name>/. Every destination was read and SHA-256 checked against its source immediately after copying, then all 394 source/destination pairs were freshly rehashed in a final pass. All counts agree with audit 340; no additional ignored regular file or discrepancy was found.

| Name | Original checkout | Retained files | Bytes |
| --- | --- | ---: | ---: |
| motion-smoothing | C:/Users/38909/.codex/worktrees/motion-smoothing/maps | 335 | 34,609,389 |
| contact-contract-design | C:/Users/38909/Documents/github/maps/artifacts/contact-contract-design/wt | 9 | 181,674 |
| launcher-handle-design | C:/Users/38909/Documents/github/maps/artifacts/launcher-handle-design/wt | 25 | 260,280 |
| stacked-support-review | C:/Users/38909/Documents/github/maps/artifacts/stacked-support-review/wt | 25 | 264,156 |
| Total | | 394 | 35,315,499 |

The exact source/destination/length/SHA manifest is manifest.json in this directory, SHA-256 3c837012a4bce97601d4da1746713e61fba5939c9bed4130515230effe4c7be0. Each copied file records its immediate fresh-source and destination hashes. No reparse point was followed while enumerating or copying, and no new link was created.

Three junction mappings are recorded in the manifest. motion-smoothing/maps/data points to primary maps/data; motion-smoothing/maps/node_modules points to primary maps/node_modules; motion-smoothing/maps/artifacts/pavement277-20260928/stage/data originally points to motion-smoothing/maps/data and resolves to primary maps/data. Those shared targets were not copied or changed. Retained historical scripts/manifests still contain their original paths and bytes; resolving an old execution environment is separate from preserving evidence.

Fresh Git checks found all four HEADs ancestral to primary b01096dd15e436fecc50a899d92e183a7e5802fb, with zero commits outside it. HEADs: motion-smoothing 8659433152ba9592b551cbd5d1121c763180a944; contact-contract-design 927250018e86db4c89c9063a8f5f166ee15eb391; launcher-handle-design and stacked-support-review 82ee91772f9533ab3e8661f73af2eb4eb1e2bd3c. Status before and after copying is unchanged. The three unmanaged checkouts are clean apart from ignored evidence.

Motion-smoothing retains two nonignored local states for the managed archive snapshot: src/render/post.ts (14,878 bytes, SHA-256 926073d14f47cf78e37ca814bf96a56e2e9e606f292b1ef251b2c9421afceb35) and untracked test/post-motion-sampling.test.ts (4,114 bytes, SHA-256 61e489dc3b957c480e9bd11f63dedce55c2dc1361d3609123e21c1137e988dee). Their raw hashes are recorded and freshly verified; they were not copied because this assignment admits only ignored evidence retention. Audit 340 established their text matches primary. The archive tool must retain these states.

Fresh scoped ownership checks before preservation and before READY found no candidate-path process dependency. The accessible task list returned only the active primary “Build the Shibuya 3D model” Codex task; root owns these historical candidates. Process checks inspect command-line paths and exclude audit PowerShell/git commands; they are not a universal open-handle guarantee. Root must review this manifest before archival or exact-target unmanaged removal. Primary, crossing-frontage, walking-scene and prepared 338 evidence are untouched.
