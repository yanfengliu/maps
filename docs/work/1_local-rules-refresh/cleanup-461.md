# Rules cleanup 461 — candidate handoff

Date: 2026-10-01. Owner: rules_cleanup461; root owns independent review, focused verification and integration. Base HEAD: `4100853b33435c2ef67048d223ddad457298c40d`. Scope: only `docs/policies/local-rules.md` and this handoff in the existing FRONTAGE checkout. No code, tests, source data, progress board, primary checkout or existing history changed.

This is a further cleanup of the already-landed 1ee8cf1 rules refresh, not a repeat of its earlier 67% reduction. The candidate removes 3,836 bytes (17.2%): 22,270 bytes/125 CRLF lines become 18,434 bytes/103 CRLF lines.

| Input or candidate | SHA-256 |
| --- | --- |
| Exact policy before, available at base HEAD | `c50beb7f5444125e87bb71a4f0758888b10388462a717863dfa605e0c76f65e3` |
| Frozen policy candidate | `d29f873faa1b6b569b0221fb97dc2edd853afc493b49d373c29e795c07863631` |
| Exact read-only policy diff, UTF-8 stdout normalized to LF with final LF | `bea46eec613ffc0445bc0e5a64495692f26478fd51adff8826592e1a9338e8ce` |

The diff is `git diff --no-ext-diff -- docs/policies/local-rules.md` against the supplied HEAD: 50 additions/72 removals, 40,258 normalized bytes. CRLF-aware default whitespace checks pass. The policy retains CRLF throughout, zero bare LF and no BOM; this is content consolidation, not line-ending churn.

Repeated Satellite, orchestration/progress, world/stack, gate/certificate and harness prose is consolidated or linked to AGENTS. Date-labelled headings and historical packet length/run IDs are removed. Unique owner directions, safety and acceptance constraints remain, including visual quality, verified/reversible main increments, todo ownership, goal override, whole-city roads/lights/trains, population target, controls, fixed/seeded/native/sparse review and fresh critics.

Rail recovery now names its authoritative code contract and links the permanent 344 retention record instead of duplicating its long scratch path/hash. I read that record and rehashed the actual retained primary manifest: 7,562 bytes, admitted SHA-256 `e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707`. The requirement to preserve the recovery source remains. Texture byte estimates point to AGENTS; geographic limits, cache bounds and final-detail obligations remain explicit.

Unique markings/paint/hardware/source bounds, licences, primary-only hardware gate, runtime/settle deadlines, evidence-transfer eligibility, provisional flicker-model limits, shared-input/cache ownership, nonfollowing census/archive refusal, evidence retention and line-ending/citation rules remain. Unfinished gates are not grounds for deleting their rules.

Static checks: all 18 Markdown file targets and 29 distinct literal code/test paths exist; linked headings were inspected. Both actual deadline predicates in `test/visual-budget.test.ts:95–109` match, including `wrapper's deadline is 38,700 seconds`. The direct-reader census finds that test as the sole code consumer; verify-output's mention is a comment. The existing focused check is that file's eight tests, not a new framework. Actual execution and independent acceptance remain pending.

No runtime/import, test, browser, server, GPU, install/cache/data writer, Git mutation or resource cleanup ran. Rebind direct policy input pins before the focused consumer or any later facade CPU dispatch. Existing map candidates and unrelated working changes remain uncommitted and outside this task.

## Focused verification — 2026-10-01

Independent review462 accepts the exact frozen policy with no material finding (review SHA-256 `3c2d59ca7317f75e5fc0b2ec1f2090cba3cdd62d31542f68e27c31fd4de64e4e`). The actual focused run passed all eight `test/visual-budget.test.ts` tests on Node 24.12.0 in 223 ms, with all 19 bound inputs unchanged. The first sandbox attempt failed CIM preflight before starting tests; the authorized rerun succeeded. No other gate or browser/server/GPU work ran.

Root confirmed final owned closure: zero process survivors, both exact TEMP directories and the owned cache absent, receipts retained. Final receipt SHA-256 is `75521d3789f3a1a1d23b580703a68c11e720a70feb9bba75845201549ffb5a1a`; resource-cleanup SHA-256 is `6a9485cf2771ded513080d647f8f962509fb7528450e4ec1304d9fe98c5fc04c`.

Pre-integration checks found both HEADs at the supplied base, both indexes empty and primary policy at its prior hash. All ten observer450 paths match across roots; excluded FRONTAGE457, byte-ghost and primary AGENTS hashes match their preserved state. Root authorized only the three-document commit and main fast-forward. Product/full-city acceptance and all unrelated uncommitted work remain separate.
