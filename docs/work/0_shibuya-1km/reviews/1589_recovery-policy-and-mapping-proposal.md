# Proposed documentation recovery and mapping 1589

Proposal only, 2026-10-18. Base main: `244ef9b81dbb834a322632dc33fc27e98e535cdf`. Nothing here approves a migration, allocation exception, historical rewrite or executable change. Assessment1588 remains closed and unchanged.

## Decision made concrete

`1589-collision-policy.proposed.md` contains the proposed owner decision. It acknowledges only registry commit `af4403654cfa2917c17bc52caf838da61939770e`, blob `c897239b77911f8bb605b53e44a0368fe7c8b922`, SHA-256 `adb57cba53ab441b84e4747e71cfb4773c01b32fd8943f7858f1fcf4a5b2972d`, as a historical ID0/`unreal-shibuya` collision. Canonical ID0 remains `shibuya-1km`, established at `00ff7e6f7f5cdee2e60b03132b72e6a452b473b9`. Both original commits and captured existing refs remain recoverable. Other or later conflicting commits, altered bytes, rollbacks and renamed IDs still refuse. The policy permits development/review of a bounded recovery, not a manual metadata edit or automatic adoption of this mapping.

## Mapping and its bounds

`1589-document-path-mapping.proposed.json` covers all1,921 currently present files in the two existing units. Every row names current byte length/SHA-256, exact base Git blob and SHA-256 where available, proposed destination or explicit undecided disposition. Modified/untracked sources have no invented source revision. The proposed current-plan source capture is `1589-current-plan.source.md`, SHA-256 `b2b8f235bf689f874931c9541cd428ba387017bd0af7468f8bfe860bc2c1c06d`; its literal35 implementation rows and14 criteria are retained individually in the machine mapping. Root's working plan was never edited.

| Group | Files | Proposal |
| --- | ---: | --- |
| Current plan and design | 2 | Keep canonical paths and source bytes. |
| Tracked reviewed snapshots | 66 | Keep paths and exact bytes. |
| Protected untracked snapshots | 8 | Preserve in place; do not silently import or alter root-owned targets. |
| Explicitly headed authored review records | 68 | Candidate `reviews/<import-ordinal>_<explicit-stage>.md`, preserving exact original source, authored review number and stage. Ordinals are provisional deterministic import order, not a rewritten historical chronology. |
| Other records currently under `reviews/` | 1,748 | Deterministic byte-exact preservation target `historical/retained-reviews/<original-name>`. This says neither that every record is a review nor that none is; final review-role indexing remains unqualified. |
| Explicitly historical auxiliary records plus all5 old rules-refresh records | 11 | Deterministic `historical/retained-root/<name>` in unit0 or `historical/<name>` in unit1. Preserve originals; proposed separate unit1 wrapper in `1589-unit1-plan.proposed.md`. |
| Remaining auxiliary documents | 17 | Destination deliberately undecided until current binding role/active-owner use is checked. |
| `progress.md` compatibility pointer | 1 | Keep its current role; resolve the schema incompatibility explicitly. |

Correction to the earlier caution: unknown stage or cross-file chronology does not prevent migration. Existing policy permits deterministic import order, explicit unknown chronology and exact `legacyFiles` provenance. The proposal uses that permission. A mixed original record can be retained under `historical/` without inventing a review. Exact imported exceptions must bind approved bytes and recoverable source. The current format validator already permits those historical paths; its existing allocator/recovery cannot adopt this inconsistent populated tree, as1588 establishes.

The68-record review subset is identified conservatively by an authored `# Review <number>: <stage>` heading, with no duplicate explicit labels. It is not a complete semantic classification: substantive independent reports, implementation reports, assignments, fixed-search contracts and run outcomes also occur in the other1,748 files. Examples include `1577_documentation-cleanup-review.md` in the explicit subset, and `1582_moving-aa-second-search-contract.md`, `1583_moving-aa-family-a.md`, `1585_moving-aa-search-review.md` and `review657_fresh_delivery_direction.md` in the mixed subset. Unknown stage/order alone can use legacy treatment. Actual authored review identification is still needed before claiming every review round has its proper canonical index; that work may be delegated, and does not by itself require a new owner policy decision. The mixed preservation mapping is faithful retention, not a completed final review index.

Known review labels retain relative order. Original dates, internal follow-ups, reviewer identities and dissent remain literal in each source. Unit1 retains the original2026-09-30 refresh and2026-10-01 cleanup/review records; appended follow-ups prevent inferring a total file-level chronology. No import ordinal asserts undocumented timing. Existing active1582–1585 work and root's uncommitted1588 report require a safe owner handoff before actual movement. Newly found reviews or owner-directed role changes would refresh provisional ordinals and the mapping before acceptance, never silently change an approved map.

## Exact decisions still needed

The owner decision is the exact collision policy and the treatment of the legitimate compatibility pointer. Existing schema forbids `0_shibuya-1km/progress.md`; options are a narrowly specified pointer allowance with no second status, or explicit retirement after current consumers move. Do not call this current pointer historical merely to pass.

Root must settle whether the following17 auxiliary sources remain binding current contracts or become retained history: the two1457 benchmark/disqualifier files;879 and909 search protocols; `crowd-motion-search.md`, `facade-search.md`, `facade-temporal-search.md`, `local-walk-foot-design.md`, `pedestrian-normal-search.md`, `populated-crossing-search.md`, `rail-endpoint-search.md`, `rail-finish-design.md`, `rail-integration-design.md`, `square-cutout-design.md`, `square-cutout-independent-experiment.md`, `square-cutout-search.md` and `traffic-native-capture-design.md`. Exact paths/digests are in the mapping. A current lasting contract belongs in canonical policy/reference documentation with a link from the plan; an authored old target remains exact history. Source owner handoff is required before moving active documents. The bounded opening read does not settle all those binding roles.

## Links and immutable targets

No original historical or reviewed snapshot bytes are rewritten by this proposal. The committed source revision/path/digest remains the recovery authority; the machine map records each old/proposed path. Current navigation, including README/current plan, can later receive reviewed local-link target updates after the map is final; literal35/14 must remain unchanged. Preserve fragments/queries and repair reference-style as well as inline links. Update current code/path consumers in the same accepted increment. Existing unavailable historical links remain named exceptions, never invented recovered evidence.

A byte-exact historical move can change the meaning of its relative links. The existing `rewriteMarkdownLinks` helper is available for read-only link-delta preparation, but running it over originals would produce different historical bytes. Therefore this mapping is not ready to apply: final review must choose per affected immutable record either retention at its original recoverable path under an expressly approved exact legacy-path capability, or a separately identified navigation derivative while the original remains recoverable. Do not silently modify a frozen target, add thousands of duplicate wrappers, or claim source-provenance links make relocated historical local links work. Link-delta/consumer coverage has not been run for this proposal; the earlier1575 exception population does not automatically transfer across relocation.

## Verification and handoff

This is a source-hash census and bounded proposal, not another checker or a renewed corpus semantic audit. No create/import/recover, registry/witness/source/policy/Git mutation, new work-folder allocation, runtime gate, browser/server/GPU/network work or background process ran. Primary registry, common witness and fleet policy/store/format source hashes matched before/after generation. Proposal artifacts are strict UTF-8 under ignored `artifacts/docs1588/`. Existing structural check remains FAIL; no supported complete recovery or all-docs-green claim is made.
