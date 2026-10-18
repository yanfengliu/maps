# Work-document recovery assessment 1588

Read-only investigation, 2026-10-18. Observed primary HEAD: `244ef9b81dbb834a322632dc33fc27e98e535cdf`. Existing unrelated working changes, branch/worktree ownership and permanent metadata remain untouched. This answers the remaining structural issue from reviews1575/1577; it does not repeat their corpus/navigation audit.

## Conclusion

No existing supported command repairs this state while preserving both reachable allocation histories. This is a real contradiction against the current contract, not evidence of a checker bug. Do not run `recover`, `create`, initial migration or a manual registry edit as a speculative fix.

## Observed authority and diagnostic

The primary registry and common `.git/work-docs-state.json` both contain exactly ID0/theme `shibuya-1km`. The common witness has `pending: null`; neither `work-docs.lock` nor `work-docs-recovery.lock` exists. There is no recorded interrupted reservation to replay.

Exactly one existing checker invocation ran on Node v24.12.0: `node ../fleet/scripts/work-docs.mjs check --repo .`, exit1. Its unmodified stderr is retained in `checker.stderr.txt` beside this report:

> work-docs: Git history af4403654cfa2917c17bc52caf838da61939770e contradicts registry.json: an ID was previously allocated, renamed or rolled back. Restore the permanent allocation before continuing.

`git log --all -- docs/work/registry.json` identifies two registry-changing commits: `00ff7e6f7f5cdee2e60b03132b72e6a452b473b9` stores ID0/`shibuya-1km`; `af4403654cfa2917c17bc52caf838da61939770e` stores ID0/`unreal-shibuya`. The latter remains reachable from several Unreal branches, including `codex/shibuya-unreal-5.8` and its origin tracking ref. All remain intact. Both incompatible records cannot be prefixes of any one linear allocation array, regardless of later appends.

The store's `historyCheck` explicitly reads `git log --all`, and `assertPrefix` compares permanent ID/theme identity. `recoverWorkDocs` with no pending reservation calls the same `checkState`; recovery would therefore repeat this rejection. With a pending reservation it still calls `historyCheck` before writing. `createWorkUnit` and `importWorkUnit` also call `checkState` before reserving; they cannot adopt an existing inconsistent tree. `applyWorkDocMigration` is expressly an initial-import path requiring zero existing allocations after a successful check. No supported adoption/reconciliation route was found. These are source findings, not attempted mutations.

## Further structural failures

The following are observed failures from direct, read-only calls to the existing exported validators, recorded in `structural-receipt.json`. They do not represent a successful full checker run past its first failure.

- `validateTree` with the unchanged registry refuses unregistered `docs/work/1_local-rules-refresh`.
- `validateUnitFiles` on existing allocation0 refuses `1457_visual-benchmark.md` because it is outside `plan.md`, `design.md`, `reviews/`, `snapshots/` or `historical/`.
- `validatePlan` on `1_local-rules-refresh/plan.md` refuses missing `Status:` metadata.

Additional static predictions, based on exact filenames and the unchanged validator source: allocation0 has24 auxiliary root files outside the permitted shape and1,739 review filenames outside `reviews/<round>_<plan|design|implementation|integration|legacy>.md`. Examples are `reviews/1575_documentation-cleanup.md`, `reviews/343a_archive-junction-incident.md` and `reviews/review657_fresh_delivery_direction.md`. The registry contains no `legacyFiles` exemptions. The four non-plan rules-refresh files also sit directly in the unit root. Merely adding ID1 would not make that unit conform. Filename enumeration establishes these structural mismatches; it does not establish which historical stage/chronology each file should have. No new provenance was invented.

This bounded check read structural filenames and invoked the existing validators. It did not re-audit all document prose, establish exhaustive downstream failures, check review truth or run product gates. The complete checker remains FAIL.

## Smallest reviewable decision and follow-up

The owner must decide how the preexisting duplicate ID0 histories can be represented while retaining both commits and their refs. The smallest preservation-oriented decision is an explicit, narrowly scoped historical-collision exception: current authority remains ID0/`shibuya-1km`, while the exact prior Unreal allocation at `af440365...` is preserved and acknowledged as a conflicting historical record. Current policy/tooling has no such exception, so this requires an approved fleet policy/recovery change, not a docs-only edit or a weakened assertion presented as a bug fix.

A supported recovery capability would need to consume an independently reviewed mapping, bind the exact conflicting registry revision and original bytes, preserve the common witness, keep both permanent histories recoverable, and refuse unrelated rollback/rename/conflict cases. It also needs an explicit adoption/migration path for existing ID1/`local-rules-refresh` and the existing nonconforming allocation0 documents; initial migration cannot do that. Preserve original authored records and link provenance, use truthful current wrappers, and obtain owner agreement on the historical mapping before movement or exemption. Do not blanket-exempt future files or infer review stages from names.

Until that decision and supported recovery exist, retain the current diagnostic and report this exact structural gap. Removing refs, moving foreign worktrees, resetting the witness, renaming permanent IDs, rerunning initial migration or hand-editing the registry are not authorized resolutions. A clone missing the conflicting refs would hide the contradiction rather than resolve it. No all-docs-green claim is justified after fixing only the first refusal.

## Evidence binding

`structural-receipt.json` binds the unchanged registry, common witness, policy and validator/store source digests. Raw checker stdout/stderr and this report stay under ignored `artifacts/docs1588/`. No browser, GUI, server, GPU, runtime gate, network operation or owned background process was created. No recovery/create/import or Git mutation ran.
