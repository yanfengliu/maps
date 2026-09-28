# 340 — Worktree lifecycle audit

Read-only inventory, 2026-09-28. No worktree was archived, removed or changed. No source, data, prepared 338 evidence, gate, browser or server was touched.

There are **70 registered checkouts: primary + 11 managed + 58 historical unmanaged checkouts**. Keep primary, crossing-frontage and walking-scene for the current milestone. The other 67 are historical checkouts with no current owner identified in the scoped task/process evidence. That does not make their contents disposable. All 70 HEADs are ancestors of main b01096dd15e436fecc50a899d92e183a7e5802fb, with zero commits outside main. **39 checkouts are dirty**, including primary and all 11 managed roots; the remaining 31 are clean historical checkouts. An ancestral HEAD says nothing about those uncommitted experimental states.

The exact 70-row inventory is artifacts/worktree340-audit-20260928/inventory.json. It records each absolute path, HEAD, branch/detached state, full nonignored status, ignored roots, and shallow data/dependency reparse mappings. Primary's large ignored tree was deliberately not traversed.

## Concrete first retirement batch

One managed candidate: **C:/Users/38909/.codex/worktrees/motion-smoothing/maps**. HEAD 8659433152ba9592b551cbd5d1121c763180a944 is already ancestral. Its only two changed paths, src/render/post.ts and test/post-motion-sampling.test.ts, equal current primary text after BOM/CRLF normalization. There is no unique commit or current source behavior to integrate from this checkout.

Before managed archival, preserve these ignored trees outside the checkout and verify the retained regular-file hashes:

| Path below motion-smoothing/maps | Regular files | Bytes |
| --- | ---: | ---: |
| artifacts/motion-aa269-20260928 | 187 | 20,723,731 |
| artifacts/pavement277-20260928 | 148 | 13,885,658 |
| Total | 335 | 34,609,389 |

These bytes are retained evidence, not proven redundant copies. The archive snapshot does not save ignored files. Preserve a link manifest without traversing the reparse targets: data → C:/Users/38909/Documents/github/maps/data; node_modules → C:/Users/38909/Documents/github/maps/node_modules; artifacts/pavement277-20260928/stage/data → motion-smoothing/maps/data → primary data. Never delete or recursively copy the shared targets as part of retirement. After preservation and a fresh idle check, use the managed archive tool so the two local source states remain recoverable. No preservation or archival has occurred yet.

There is **no established immediately removable historical unmanaged checkout with no unique ignored evidence**. All 31 clean historical checkouts still have ignored entries. Three small examples were fully counted without following links: contact-contract-design/wt has artifacts/design (9 files, 181,674 bytes); launcher-handle-design/wt has artifacts/study (25 files, 260,280 bytes); stacked-support-review/wt has artifacts/study-review (25 files, 264,156 bytes). Each is clean, ancestral, and has no reparse point or embedded repository found, but its ignored evidence still needs retention before checkout removal. They are later candidates, not part of this first one-worktree batch.

## Ownership and preservation limits

The accessible 50-task list returned only one Codex task, “Build the Shibuya 3D model,” active at primary; other returned chats were idle and unrelated. Root confirms all 11 managed roots belong to this chat and no older active owner is known. Root-tree workers reported 261/337 completed at the initial snapshot, with primary 338 gate work due next. An elevated process command-line scan found 33 Node/esbuild processes referencing primary and no non-primary checkout match. Audit PowerShell/git commands were excluded. This is a scoped dependency check, not proof about every open handle or inaccessible chat. The initial sandbox CIM read was denied; the authorized elevated read succeeded.

Current 338/332 top-level execution/binding files reference crossing-frontage and no older managed root. Crossing-frontage contains the frozen candidate and its own data/evidence; walking-scene is retained by root as an inherited dependency. Most other managed data/node_modules paths are junctions to primary, not independent data copies. Rail-integration and vehicle-integration use data/network and data/scene child junctions. Do not mistake these links for storage that can be deleted from primary.

The other eight historical managed roots are recoverable-snapshot candidates after individual evidence retention, not proven empty duplicates. In particular, traffic-turns and vehicle-integration have untracked source/fixture files absent from current primary; preserve those experimental states through a managed snapshot. No decision to discard them follows from this audit. This report deliberately stops at the first practical batch instead of deduplicating all historical evidence.
