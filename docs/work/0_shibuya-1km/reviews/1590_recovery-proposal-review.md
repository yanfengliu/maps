# Recovery proposal review 1590

2026-10-18. Independent read-only review against maps main `244ef9b81dbb834a322632dc33fc27e98e535cdf`. Decision: **HOLD application of 1589; GO prepare the smaller in-place recovery.** This is not an all-docs-green verdict. No product source, registry, witness, refs, policy, active task, GPU or server was changed.

## Material findings and practical next step

1. The proposal is faithful evidence, but its approximately 1,800 relocations are unnecessary churn. Relocating exact authored bytes changes relative-link meaning, while the incomplete 68-file heading subset cannot establish the final review index.1589 discloses both limits correctly. Retain existing historical filenames/paths through an exact approved adoption record instead of manufacturing round indices or moving mixed contracts/assignments merely to fit the checker. This preserves authored reports, known labels/order, dissent, internal corrections and unknown roles without asserting that every file is a review. No renewed corpus semantic audit is needed to preserve those facts.

2. Correction to my preliminary message: legacyFiles does not exempt filenames or round sequencing. In-place retention is not supported by the current implementation. `work-docs-format.mjs` lines 37-44 restrict `legacyFiles` paths to reviews/ or historical/. Lines 115-124 still require every reviews/ filename and contiguous round even for exact legacy bytes; the exemption skips section validation only. Root auxiliary paths also refuse. Existing policy expressly permits unknown stage/chronology and deterministic import order (work-docs.md 146); unknown metadata is therefore no approval blocker. The smallest explicit format addition is a maps-only, finite path+SHA-256+recoverable-source historical-adoption population, excluded from new round sequencing only at those exact paths/bytes. New/changed/current records remain subject to their normal contract. Do not call active/current contracts historical to gain an exemption, do not exempt a directory/theme, and do not silently adopt untracked evidence. Keep the 8 protected untracked snapshots and active 1582-1585 targets in place under root ownership.

3. The registry collision is a genuine unsupported policy choice, not a failing-recovery retry. The exact proposed exception preserves both histories and rejects unrelated conflict/rollback/rename cases; it is a reasonable safe basis. Support it with one reviewed recovery operation that binds current registry/witness and the exact conflicting commit/blob, preserves original refs, adopts existing ID 1, and applies only the accepted finite mapping. Do not manually edit the registry/witness or rerun initial import. Prepare and independently review that concrete increment now; do not ask permission merely to develop it.

4. The 17 auxiliary-role choices and progress.md need root decisions, not a new blanket human-confirmation gate. Local-rules.md23 already says progress.md is only a compatibility pointer. Preserve that honest role through an explicitly narrow format allowance, or update its consumers and retire it; no second status. Root must distinguish lasting current contracts from retained authored history using current ownership/use. The unit1 wrapper has truthful legacy/unknown metadata and retains all 5 source records, but its proposed moves still owe link handling. Prefer the minimum unit1 wrapper/history change required by policy rather than extending the mass move.

## Authorization boundary

The literal constraints are work-docs.md 23: "The ID is permanent" and "do not ... renumber it, or reuse its ID"; work-docs.md 51: "Recovery does not authorize discarding another owner's files or resetting permanent IDs." AGENTS R8 requires human authorization for unapproved major architecture/product changes and consequential external actions. The migration section says "Agree an old-path to new-path mapping"; it does not require fresh human approval of every routine reversible mapping or unknown metadata decision. Existing user authorization covers ordinary docs repair, preparation, review, commit/merge/push and root's role/link decisions.

The smallest genuinely new owner decision is whether to recognize ONLY `af4403654cfa2917c17bc52caf838da61939770e` / blob `c897239b77911f8bb605b53e44a0368fe7c8b922` as a preserved noncanonical historical ID0 collision while canonical ID0 remains shibuya-1km. Current policy/tooling grants no reconciliation authority for that contradiction. Require this exception to be accepted before applying it; this is an interpretation of the permanent-ID boundary, not a quoted instruction that all migration requires human permission. Combine the decision with the concrete reviewed recovery increment, not a separate request to authorize development. Keep any historical-path extension finite and maps-specific; do not weaken fleet-wide future rules.

## Evidence checked and bounds

All 1,921 distinct mapping rows match current source lengths/SHA-256, with no currently present file omitted. Total source bytes checked: 14,374,110. Every recorded base blob agrees with the exact base Git tree. All 5 metadata pins match current registry, common witness, policy, store and format source. Current-plan capture preserves all 35 implementation rows and 14 acceptance criteria literally; no status/provenance is invented for modified/untracked sources. Known historical labels remain in source bytes; unknown stage/order and unresolved roles are disclosed. I read the proposal, collision text, unit1 wrapper, relevant validator/store implementation, rules and representative mixed/active records; I did not semantically reread every historical report or run a full checker/runtime gate. Structural check remains the reported FAIL.

Inspected strict UTF-8 artifact pins:

- 1589 proposal 8518 bytes: `a95c70b692c3efd7c155ca4ffb7889aa0c0a3ee986376dfe564eff62000c4359`.
- collision 2062 bytes: `a370a04aa9559515e6f4e16b793596d31e13023d6c2bb11e628ff2d86bb475bd`.
- mapping 2,000,636 bytes: `71bb4fa49b163cc3bce04a6b8da8b4a0e30afc7460b860b4803252cb7e33b083`.
- unit1 wrapper 1407 bytes: `35b73bd47d7f5c49eb5242cb7403f96216274cf38411843504701db079e1097c`.
- plan capture 12241 bytes: `b2b8f235bf689f874931c9541cd428ba387017bd0af7468f8bfe860bc2c1c06d`.
- 1588 source 6305 bytes: `3779f617c8c2b20b22cdc5e9d6cae8d59d4c9f78a016d4a5435bd3225303e191`.
- structural receipt: `4ec0e5e37540f47edf50afcc20e072ec83ad2e7f4ce1cd85deecf3cb45803eea`.

The 2MB provisional map stays ignored: R23 forbids promoting more than 1MiB of anything into ordinary Git. Use compact retained provenance rather than committing this census wholesale; promoted data over 256KiB still needs its stated reason.

## Orchestration judgment

The docs workflow is expanding beyond the useful fix. Stop producing proposal/proof rounds after this review. Delegate one bounded in-place recovery implementation and one exact integrated review, settle the 17 current-role choices within that same increment, and report the real residual failure until it is resolved. Mass relocation and a new historical-review taxonomy are not prerequisites for the user's authorized cleanup.
