# 530 — Rejected facade457 archive and restore

2026-10-01. Completed the scoped rollback in FRONTAGE at HEAD `79d0a03375943121c9f67529b61cb79dabc87ee2`. The 524 comparison was rejected by 517, 527 and root; this archive does not establish facade appearance acceptance.

`artifacts/facade457-rejected/snapshot/` preserves all four original paths and raw bytes. Their SHA-256 values are:

- `src/scene/facade-textures.ts`: 18338 B, `6c1ecd0c8cf0ab4aa93b33d45e8e4fb03d8abba498378fd53548ce63366d60cb`.
- `src/scene/tile-materials.ts`: 21471 B, `ed69778a6d4f1eb392387e7395760ef162a5b3008e92ab70fe73f0d474564165`.
- `src/scene/facade-pane-relief.ts`: 7972 B, `5b40d43ede13c84c79ce986eed6e8ce5629c37a3dc94cf1c8990ea973eb0c896`.
- `test/facade-pane-relief.test.ts`: 22891 B, `1d1855a6ac35a8ba0545ef80e600c6b6778e8a733df949bacb01f370b0d8b30d`.

Copies were verified before the exact two-path Git worktree restore. The initial default-sandbox attempt refused `index.lock` with permission denied/exit 128; the authorized narrow escalation exited 0. Both indices and PRIMARY AGENTS remain byte-identical. The untracked helper/test were moved only to `relocated/<original-path>` after verified copies; both source paths are absent.

Restored raw checkout hashes are `934a1b7a864eb9d8776c866f3a0c74bea7c6f08599b7eadbd316343dc199cc06` (18593 B textures) and `e1133d7950b6ed6b0d3e5cbb12f040308092522e8bd346039847fcbbacd1db7a` (20315 B materials). CRLF-to-LF bytes exactly match HEAD; clean-filter blobs are `8a515792b562df0a5dd6d5c29c0b9ab0b86b991c` and `3cd758966bd68da62ed14d874064c80ddbd75cc0`. Scoped worktree/index diffs exit 0. Read-only status retains two M markers; no index refresh was performed.

The nonfollowing census changed from 453 to 451 files: initially all 449 unrelated files matched; finally 448 match plus root's declared 519 comment-only time-of-day correction (`9efabf28…a917`→`81c5a1e0…c986`, 20:26:47.7819000Z). Road-tone 528 remains unchanged. Observer 450 and buildings/signage bytes are preserved. Enumeration errors/reparse points: 0. No shared-tree traversal, gate, runtime or commit ran.

Exact bindings: manifest 4337 B `9ec654e0cb09a417979744ea028382c5b97f72f7e18eebcf1f533743dbd36a28`; before census 100924 B `8572c1ea37bdc306b5933c6fbf84857ae5a2cd398ee6285f7275053fc6e23392`; after 100474 B `9d4679824c056507884a7430c7a95ef4171f7f4381e52630106bb45502ba06d7`; receipt 11795 B `82c14d755b194e156f541ee6b241b0e10e6f775429312c98782d522c377e591c`. The receipt preserves refusals, remaining source status, provenance and metadata pins. Earlier failed/capture evidence remains untouched.
