# 426 — Archived real-frame source prerequisite restored

Bound: exact historical fixture restoration for the real-frame case in `test/flicker-judge.test.ts`, not current visual appearance, flicker acceptance, GPU qualification, or a unit-suite result. No application, test, package, gate, scene, or build bytes were changed. No runtime was launched.

On 2026-09-30, the preliminary 423 unit run reported 1,060 of 1,061 cases passing. Its remaining case could not find the historical post-chain archive through its existing four-ancestor search from the managed frontage checkout. This restoration leaves that reader unchanged and puts its existing source prerequisite at the reader's first candidate.

Source: `C:/Users/38909/Documents/github/maps/artifacts/post-chain/motion`. Destination: `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/post-chain/motion`. The source contained exactly the four files below. The destination was absent before restoration. Each source SHA-256 was checked before copying and again after copying; each destination SHA-256 equals that source hash. The primary source was read only.

| File | Bytes | SHA-256 | Capture frame |
| --- | ---: | --- | ---: |
| motion.json | 289501 | 423d1ed9c794a538842097df5d268d5ab4b1a463216391ed63b58666477b5f0f | record |
| rest-a.png | 787347 | 955d3260f68f4776cabef86e79101d7544dd07066e66ae5a936e58f1ef823a07 | 384 |
| motion-07.png | 665886 | 7731e184728f388fc9ce213af4273fb166c49b5ce2245d09d2ebf68bd43119f2 | 604 |
| stop-00.png | 542734 | b35eefe2b81c0066d4fbe8a4b3e4374f8b7bd1d4ff26c7d856e1c030fea8e196 | 725 |

All three PNG signatures and IHDR dimensions were checked: each is 1280×720. Each has exactly one matching capture entry in the actual motion.json, with its SHA-256, positive render frame count, and explicit camera pose. The observed render-count gaps for the three test-named frames are 220 and 121. This mechanical inspection checks headers and record binding; it does not decode or visually inspect the pixels.

The primary `artifacts/post-chain/REPORT.md` names the original production capture on 2026-09-16, before revision f4e96f0 and after revision 657bb83, with RTX 4090 D3D11 and native 1280×720 frames. Its authored native-review table independently lists the same three PNG digests. `402_gpu-delight-final-gates.md` records a later complete primary unit pass of 1,040 tests, but does not independently enumerate this fixture, so that pass is background evidence only.

Actual available population is three PNGs plus the original JSON. The record also names rest-b.png and other motion/stop frames that are absent from this retained archive. None were invented, substituted, fetched, or regenerated. The test's availableStills reader names only rest-a.png, motion-07.png, and stop-00.png; all three are now present. Historical rest-b absence is expressly described in that test's source comment.

Safety checks inspected every existing ancestor of source and destination for reparse points without following one, enumerated the source's immediate descendants, and refused any directory, reparse descendant, unexpected file, or existing destination. Copy outputs used FileMode.CreateNew. Source and destination paths were fixed absolute paths; no recursive deletion, move, broad search, overwrite, or outside-workspace write occurred. The evidence records the checked paths and original capture entries in ignored `artifacts/verify426/receipt.json`; `artifacts/verify426/restore.ps1` is the bounded restoration script. These are retained for root's active acceptance and can be removed when no active task needs them.

The worker ran no unit, build, audit, browser, server, or GPU command. Root owns the subsequent frozen unit rerun and final integrated acceptance. No task-owned processes require cleanup.
