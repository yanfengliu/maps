# Independent source review of the CPU closure supplement

Reviewer: `/root/audit_candidate_review`
Reviewed: 2026-10-11
Decision: admit one dispatch of the frozen revised supplement; runtime closure and cleanup are not yet accepted by this review.

The original CPU records remain red. The pinned command record contains four zero exits, while the original cleanup reports exit 1 and retained TEMP because `GetProcessById` reported no running process for PID 60804. Its available census has 62 admitted and 33 omitted observations, no live rows, and one ownership-unavailable observation for that PID. A later absence cannot establish its unrecorded historical creation identity or turn that old receipt green. The supplement must produce separate present-time evidence without rerunning CPU commands or replacing those records.

Initial source admission was refused as `647-C1`. Helper `0a3b1332a49e7f7b1ae016a56660a7a05f6f02fc2b6df6be5985db5010c376c4`, with contract `5ead9ec813a579e81f58e1ac78b98a50ab6baf7ae1cef1dc994292941eadcac4`, checked current PID 60804 directly but seeded descendant traversal only from admitted/omitted PIDs. I inspected the actual pinned census and confirmed 60804 is in neither list. A surviving child chain rooted at that PID could therefore escape refusal after the parent exited. Both rejected files are preserved exactly under `artifacts/mask632/live/cpu-closure-supplement/rejected-source-1/`.

Focused re-review resolves `647-C1`. The sole source change adds PID 60804 as a conservative traversal seed before scanning descendants. Revised helper SHA-256 is `a64e4dedcb2f71c9e79f40c46d097c2ed3fa8e7dcb05a98e6c7789a562019211`; contract SHA-256 is `5232e72d78cfea6d75c3dacda3a29af0ec66f16d587543932850b8c05fcc0906`. Fresh CIM and listener queries must succeed. Any present original observed PID, PID 60804, descendant chain, CPU marker or listener on 4319/4335 refuses before cleanup. Reused PIDs are conservatively refused, without assigning ownership or killing them. The original uncertainty is retained in the new records. There is no launch or termination mechanism in this helper.

Cleanup is restricted to literal `C:/Users/38909/AppData/Local/Temp/maps-mask632-cpu-ebec46576d7e4418a2cd15d7c2a17541` and `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/mask632/live/cache`. The original cleanup must name that exact TEMP. Full-path equality, existing ancestor checks, complete nonfollowing traversal and error/reparse refusal precede removal. I compared the walker/remover with frozen owner `run-cpu-observed.ps1`, SHA-256 `562fa54d259f31ecf37909179c128bbd0d1d9d99af6b7b3d462601e9846086ad`: the safety body is retained, with cooperative deadline checks and separate target census destinations. Files are removed literally, then empty directories in depth order; there is no broad recursive delete. A failure or elapsed 90-second budget may leave partial owned cleanup, with no completion record claiming success. This cooperative budget does not cancel an already blocking native query.

The helper binds the exact original receipts, command record, after-CPU record and preparation, then checks raw HEAD/index, the unrelated primary AGENTS change, source, scene data, installed inputs and prepared helpers before and after. Outputs live only in the supplement directory, refuse prior expected output files and remain distinct from the failed owner records. Completion requires a fresh second zero census and exact target absence. Reader leases must remain closed during dispatch: the two inventories are snapshots, not an external process lock.

| Preserved input | SHA-256 |
| --- | --- |
| `live/cpu-owned/process-cleanup.json` | `74a3ad43a5fdfb6502080351ebe5b9e9eabc6051d5ba6ea9f1394ee25b40136d` |
| `live/cpu-owned/process-closure-census.json` | `fecae1c83ac1d872fcdc33d3e9b4fe368ae61d22642ced0f444d8fa5e6b5f0b3` |
| `live/cpu-gates.json` | `61800f3b1c7b5bd21744980e23d2d6c65627e1f4108061cb2f104387285bd2b5` |
| `live/after-cpu.json` | `a2e6fc0fa05b38f3b4cf2fd59532ace5a40d386a75e8fbd7fa9f92a66efe3752` |

This was source review and inspection of existing actual records only. No supplement, synthetic control campaign, cleanup or gate was executed by the reviewer. Source admission has no remaining blocking finding, but root must read actual new closures, target censuses and completion/input-preservation evidence before admitting the unchanged visual gate. The original red closure remains part of the history. All reviewer reads and leases are released; no reviewer-owned resource remains. Only this new LF review file was written, and review 638 was not modified.
