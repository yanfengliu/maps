# Worktree reclamation, 2026-09-16

## What was asked and what happened

A census taken at `f4e96f0` listed 45 worktrees under `artifacts/` besides the primary checkout, and asked for all of them and their scratch to be reclaimed with nothing unlanded lost. Forty-two worktree directories were removed in four batches. Three were removed before a do-not-touch order arrived and were restored from their captures. Four worktrees hold payloads another lane owns and were left in place.

The measurement moved from `{"totalMb":27015.1,"entries":99,"reparse":104,"copiesOverCeiling":0}` to `{"totalMb":22537.7,"entries":97,"reparse":39,"copiesOverCeiling":0}`, a net of 4,477.4 MB and 65 reparse points. The net is smaller than the gross because live lanes kept writing during the run — one background reading taken mid-run was 25,901.1 MB against a low of 25,375.4 MB earlier in the same session, 526 MB written back by other lanes.

Every batch ended with the primary checkout clean, `data/` holding its 14,519 real files, `node_modules/` present, and `npm run typecheck` exit 0. No junction was ever followed.

## The instrument was wrong, and the wrongness was invisible

The census that started this work measured each worktree with `git worktree list` plus `git status --porcelain`. The second is not a measurement of unlanded work in this checkout.

`core.autocrlf` is `true` here. When a worktree's files are written under a different line-ending setting, git's stat cache records them as modified; on the next content comparison git finds the bytes identical to HEAD and reports nothing. `artifacts/network/milestone-20260911` is the case that makes it plain: `git status --porcelain` named **78 modified files**, and `git diff HEAD` was empty for every one of them, because the branch was merely behind main. Read from `status`, that worktree is the largest piece of unlanded work in the repository. It holds none.

The direction of this error is what makes it dangerous. It invents work rather than hiding it, so nothing is lost by trusting it — a lane preserves files that do not differ. What it costs is the census itself: a reclaim that trusts `status` cannot tell which worktrees actually carry something, so it either preserves everything or deletes on a number that does not mean what it says. Over the 45 census worktrees, `status` named tracked changes in 33 and only 32 carried a real `git diff HEAD`; it named 139 files where 101 differed from main.

A second false positive showed up later and is the sharper illustration, because it survived the cleanup and then failed a check: `artifacts/crowd-stacking/wt` reported `tools/agents/spacing-metrics.ts` as modified. That line went into the capture's `status.txt`, was quoted in a report, and reappeared as the single line a restored worktree did not reproduce. There was never a diff behind it. A false positive is not reproducible on demand — any later content comparison refreshes the cache, and the same command returns nothing today — so the count is recorded when the census runs rather than re-derived afterwards.

This is written into `docs/policies/local-rules.md` beside the existing sentence that the size is checked rather than assumed, committed on main as `d69c361`. `artifacts/reclaim/RECORD.md` keeps each capture's `status.txt` next to its `unique-on-main.txt` so the discrepancy stays auditable.

## What was preserved, and how it was checked

Nothing was deleted until its content was located on main or captured. `artifacts/reclaim/preserved/<worktree-name>/` holds, per worktree, the HEAD sha and branch, the raw `status.txt`, a diffstat, `dirty.patch` (`git diff HEAD --binary`), `unique-on-main.txt` (the dirty files whose bytes are not on main), every untracked non-ignored file, and — only where HEAD is not reachable from main — a full `head.bundle`.

Totals: 45 captures, 565 files, 9.57 MB, covering 139 dirty files of which 101 differ from main, plus 346 untracked files. Four bundles, for `claim-repairs`, `deadlock`, `g1-verify` and `graphics-milestone`.

The check that makes this trustworthy is that **all 32 preserved patches were verified to `git apply --check` cleanly against their own captured HEAD**. A patch that will not apply is not a preserved worktree, and without that check the payload is an assertion rather than a recovery.

### Two capture defects that would each have lost work silently

Both were found by checking the instrument rather than the output, and both are recorded here because each one failed in the direction that looks like success.

**PowerShell `>` writes UTF-16LE.** The first patch files were UTF-16, `git apply` refused them with `No valid patches in input`, and the restore script printed `applied dirty.patch` anyway because it never checked the exit status. That is the canon's rule about a tool reporting a no-op identically to a refusal, met directly: the restore would have reported success while restoring only the untracked files and silently dropping every tracked modification. Fixed by writing through `[IO.File]::WriteAllText` with `UTF8Encoding $false`, and the 32 already-written patches were re-encoded from UTF-16 and then each verified against its own HEAD.

**`2>$null` on a native command discards its output.** In the first capture pass, `git diff HEAD --binary 2>$null` inside a pipeline produced nothing for some worktrees, so thirteen of them looked clean when they were not. The capture now reads the diff without touching stderr.

Both defects were caught by the same move: comparing the capture's own outputs against each other. The bundles that came out at exactly 1,469 KB while the dirty patches came out at zero bytes were the tell.

## The restorations

Three worktrees were removed in batches 1 and 2 before a message arrived placing them off-limits. Each was restored by recreating it detached at its captured HEAD, re-applying `dirty.patch`, copying the untracked files back, and re-creating the `data/` and `node_modules/` junctions. Verification was a line-for-line comparison of `git status --porcelain` against the capture's `status.txt`, which is what makes the restore trustworthy rather than approximate.

| Worktree | HEAD | Result |
| --- | --- | --- |
| `artifacts/flythrough/wt` | `acfbba8` | exact match, first attempt |
| `artifacts/flythrough-crowd/wt` | `5e8c266` | exact match, first attempt |
| `artifacts/crowd-stacking/wt` | `5e8c266` | match except the `spacing-metrics.ts` stale-cache line, which was never a real modification |

This is the argument for capturing before deleting even when the delete is believed safe. The three restores cost nothing but the capture, and without it the flythrough prototype required by Phase 10 would have existed only as a patch.

## Retained evidence: a decision recorded rather than a directory quietly kept

`artifacts/network/` was 20.7 GB and 77,678 files before this session and is the whole remaining target. Triaging every top-level entry by size, newest file, and whether any tracked document cites its name found three cited by nothing: `response-review-r1` (2,877.6 MB), `v4-rebind` (129.7 MB) and `capacity-review-r1` (42.7 MB). Those were deleted.

Five were deliberately retained, and the reason is written here so the next session does not rediscover it from a chat message:

| Retained | Size | Why, and what would have to change |
| --- | --- | --- |
| `app-motion-native` | 9,068 MB | `docs/work/0_shibuya-1km/plan.md:62` and `:72` pin two handoffs inside it by SHA-256, and `reviews/15_implementation.md` pins `observer-v4-r2/r2-freeze.json` and three `results.json`. Review 15 says the raw fixtures and run inputs "must be retained until a later reviewed source target makes them recoverable". A reviewed round must supersede that sentence and the pinned files must be shown recoverable. |
| `response-review-r2` | 7,766.9 MB | Same retention sentence; Review 15 pins three `results.json` in its `replay/` tree. Its report is already embedded verbatim in `reviews/15_implementation.md`, so the prose is safe and only the pinned raw files are not. |
| `app-motion` | 283.1 MB | Cited in `plan.md` and Review 15. |
| `response-review` | 188.3 MB | Cited in the storage-cleanup devlog and Review 15. |
| `review9-frozen` | 136.3 MB | `reviews/9_implementation.md:5` says the target snapshot and review evidence "remain needed for this unresolved finding"; F9 was accepted only within its source/support bounds and raw-V4 motion is still unverified. |
| `f9-repair` | 129.1 MB | Cited by `reviews/12_implementation.md:5` at base `2799084`. |
| `vehicle-increment` | 17.6 MB | Not evidence: it is the default output directory of three tracked tools — `tools/network/check-vehicle-ingress.ts:19`, `tools/network/check-vehicle-trajectories.ts:16` and `tools/scene/build-vehicle-surfaces.ts:117`. |

The 16.8 GB in the first two rows is the honest answer to why a 21 GB directory survived a reclamation task. It is retained evidence for a deliverable whose plan is still active, pinned by hash in tracked documents, and the retention condition is a reviewed round rather than a disk reading. A future session that wants that space has to retire the sentence in Review 15 first.

## Branches

Six branches sat outside main. `worker/deadlock` (`dfc6d8e`) is the one that matters: the halt-capture guard it adds is on main at `src/agents/population/tick.ts:1313`–`:1319`, but nine diagnostic tools it also carries — `reachability.ts`, `wait-graph.ts`, `vehicle-trace.ts`, `stuck-route.ts`, `stack-read.ts`, `trace-read.ts`, `portal-census.ts`, `freeze-census.ts`, `_worktree.ts` — exist on no commit reachable from main and are referenced by no tracked document. An early check of this branch compared it against main's *commit* for the guard and generalised that to the whole branch; the toolset was found only by asking `git ls-files` for each name on main directly. The branch and its bundle are kept.

`worker/claim-repairs` (`6a5a931`), `codex/graphics-style-milestone` (`729c16e`) and `codex/network-milestone` (`1ca4552`) were content-verified on main and deleted, with their bundles kept. For the two `codex` branches every tracked file present on the branch is present on main, none absent, so their content is on main as older revisions main has advanced past. `worker/population` (`bb39720`) was an ancestor of main and deleted. `worker/scene-digest` (`40c873c`) is an ancestor of main but **could not be deleted**: it is checked out by the live `artifacts/scene-digest2` worktree, and git refuses. It stays until that lane releases it.

`refs/tags/g1-candidate-670bf79` is a lightweight tag on commit `670bf79` ("graphics: bring the reviewed two-style Shibuya appearance candidate onto main"), the detached HEAD the `artifacts/g1-verify` worktree sat on. It is covered: the `g1-verify` bundle was written with `--all` and carries `670bf79 refs/tags/g1-candidate-670bf79` along with all 33 branch refs, 85 worktree HEADs and `origin/main`.

## Integration

Nothing from this task needs merging to reach its outcome: the rule text is on main as `d69c361`, and this devlog entry is the only change on `worker/reclaim`. The reclaim itself is filesystem work, and it is recorded in `artifacts/reclaim/RECORD.md`, `removal.log` and `preserve-summary.csv`, all under an ignored path.

The one open item is the retained set above. It is a decision the coordinator recorded, not a blocker: 16.8 GB stays until a reviewed round supersedes Review 15's retention sentence.
