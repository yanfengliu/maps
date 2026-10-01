# 547 — Rejected noon index preservation

2026-10-01. Read-only review on FRONTAGE. **Indexed-content preservation is supported; the raw-index guard remains FAILED.** No source, index, Git metadata, board or process was changed. Root owns disposition of the unmet byte-preservation criterion.

Actual HEAD remains `81903e41bc722e30ed4a9d575087f9d0f3902e20`. All 1,108 current index entries are stage 0 and exactly match that HEAD tree's paths, modes and blobs; no conflicts, added/deleted entries or staged content differ. All 453 nonempty indexed relationships in537's FRONTAGE postflight exclusions also match. Its staged list was empty at this same HEAD. The 20 committed documents remain indexed as HEAD; later authored work is not silently staged. No lost staged content is evidenced.

The rejected source snapshots and both restored worktree files independently match545's four stated hashes. I did not repeat its 451-file census. PRIMARY index and AGENTS hashes independently remain `0939767b318f0b3b3dce828314e1464c3fed793607eb8c9db9cac11d68bf4835` and `20a0a9529ffad04a2fc72ffe4cef72cc65eb0b1b41b15c72dd33f0de89d73206`.

Current `ls-files -v` reports H for all 1,108 entries; the restored two entries' debug flags are 0. However,537 records mode/blob/stage, not entry flags. Reviewed545 preservation records copy only the two source files; metadata-before records index digests, not raw bytes. No before-index byte copy or prior flag witness is available in those assigned records. Therefore flag equality, changed offsets, stat-cache fields or extension changes cannot be established. A stat-cache/metadata rewrite is plausible, not a proven cause.

The recorded raw transition `ed9c1899132e657b891cfda5e80f63f6a029c228d3133307e028f3abb6fc3a5a`→`96c29494fddd35557d4b462297f7d8a959284381aba223e12bdf52e552d4ebf0` remains a real unmet guard. The latter hash was unchanged before/after my stage/tree/flag reads. Logical content evidence does not turn byte preservation green or authorize index repair.

Checked provenance SHA-256:545 report `64d116700d1248d0e9027dadf65a19e4fb3b12b72e52b81ff2e9c3510cb1a13d`;545 receipt `5767b6836701c1d5428b78f100155829882c65104ad3a6878eac085cc5d779cc`;537 postflight `2c4aa5d12c640f9a37f8b46af1c1b9a813fab51e56eb4f1bb3ff08f36e58d9fc`. This conclusion concerns preservation, not renderer/product acceptance or a fresh full-resource census.
