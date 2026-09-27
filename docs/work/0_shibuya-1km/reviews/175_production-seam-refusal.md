# Owner175: production seam refused at a zero-arc source transition

2026-09-27. The sole frozen invocation is **refused**. All three disclosed starts reached the same unhandled source-path case at tick4360: a positive-source-width, constant ideal-position piece has K=0 and total charge0, but the sampler attempts q/K while rebasing it. Neither actor completed its connector. This is an execution-path defect in this artifact prototype, not a certificate of finite-selector infeasibility. No candidate fix or second run followed.

The concrete result is `run/verdict.json`; complete-prefix traces, per-case refusal stacks and partial states are in `run/`. `failure-audit.json` records the exact zero-arc witness and a separate read-only audit. The small verdict and output seal are valid evidence of refusal; `qualifiedComplete:false` and `passed:false` remain authoritative. The final trace lacks the failing partial tick, so no complete-pair claim extends to it.

## Fixed implementation and run

Root admitted DESIGN.md SHA256 b6e2e7e322ba09429653f95980de51b337e4ea8299e95887f1b21e32d80e2a0d, with the explicit measured-motion ramp/dwell corrections and exact173/174 dependency. DESIGN-v2-rejected-before-execution.md remains a rejected, unexecuted source-speed-only path. No product source changed.

Pre-run freeze.json SHA256 c541ec9320cb0e5d1b1f6d22e574cdcc64d0be7bfd66ba859172d795c224e3a6 binds737 files, including614 prior source/evidence pins,95 artifact-owned immutable source copies, dependency manifests/reviews, exact historical inputs and this executor's code, controls and wrapper. Frozen prototype.mjs is bef4ea0fa0003133caba79c60ec6058e74413e052c1e297d6eb9bc219ea6d451. original-inputs.json is66c114f0bf6f98b43b3262d07300223fd3fa29b3a2b0f0c530482135195c4892.

The one command was `& ./artifacts/motion-production-seam-20260927/owned-run.ps1` from the crowd-admission worktree. It launched Node24.12.0 wrapper PID19552 and synchronous benchmark child54924. Child status1 returned in22169ms; the outer retained handle measured22239.4031ms. Neither the60s child nor75s outer timeout fired. Output verification succeeded, while movement/output-count qualification failed. The outer PowerShell command itself returned0 after recording the child's status1; no green claim is derived from that shell exit.

The executable uses the original source/offset sampler on ordinary pieces, an explicit untrimmed straight3D connector, analytic conservative charge bounds, charged numerical endpoint links and separate Float32 publication allowance. It retains production cadence,0.4s ramp duration, actual ORCA proposal/projection and fresh173 post-resolve halt caps. The explicitly authorized ramp input is previous actual published XZ speed; the original source-speed ramp is recorded beside it. Actual published displacement supplies velocity and the existing0.05m/s dwell criterion. The selector is166's finite65-by65 joint endpoint search, adapted only to exclude numerically over-budget endpoints. Its local per-step coordinate starts at0 to avoid accumulated-coordinate cancellation. These are artifact implementations, not integrated product behavior.

## Exact refusal and incomplete failing tick

At tick4360, slot1 transitions into an ordinary incoming-source piece immediately before the connector. In all three cases its recorded source endpoints are58.94083249293931 and58.94083249293932; the represented Float64 difference is1.4210854715202004e-14m. The ideal centre/probe slopes are exactly zero. The analytic result K=0 and total=0 is valid for that constant ideal path, but its inverse q/K is undefined. The stack is geometry.mjs sample -> rebaseError -> prototype.mjs after-publication state update. This constant tail arises where the sum of original segment-length constants has reached the endpoint before the stored source edge length.

Read-only native sampling at both endpoints, on original incoming occurrence0, returns exactly identical XYZ and heading. Both are Pin=(-452.3609441259016,20.215714219592314,-440.5845233191109), and the Float32 endpoint is(-452.3609313964844,20.215713500976562,-440.58453369140625). The held real173 passage is entered, entry occurrence1, lastConflictIndex5; its last completed core observation still names occurrence0. No new lease, source pose or endpoint was synthesized.

The failure happens after both chosen poses have been written but before either after-publication observation and the completed row. For local-2345,2015 complete rows imply4030 publications/8060 observations/2015 resolves. The recorded counters instead show4032 publications/8062 observations/2016 resolves: the extra two observations are the partial tick's before-plan observations. `countsMatch:false` correctly prevents qualification. The other starts have the same two-publication/two-observation/one-resolve surplus. Saved final actor states contain partially updated bookkeeping and cannot reconstruct the complete actual pair for that missing tick. The omission is explicit recorder counterevidence, not a passed observation check. A successor must retain an attempted-pair record or finish all fallible mapping preparation before publication.

## What the completed prefixes establish

| Start | Complete steps | Complete publications | Complete observations, before+after | First actual grant | Last complete tick | Minimum published clearance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|2345|2015|4030|8060|4320|4359|0.0010304809678012283m|
|2400|1960|3920|7840|4320|4359|0.000012320385034292336m|
|2500|1860|3720|7440|4320|4359|0.000012320385034292336m|

The independent arithmetic audit of retained JSONL recomputed5835 complete rows and11670 published actor endpoints, with no completed-prefix errors. It checked strict nominal separation, source monotonicity, exact Float32 sampling, actual displacement-derived velocity and dwell, actual footprint coordinates, cadence/selected ceilings, source entry requiring an actual held passage, trace continuity and output digests. Maximum charged-budget excess was0. Maximum physical-budget excess including the unchanged measured rounding allowance was negative in every case: -1.3172820494461641e-8m, -1.4748231850455665e-7m and -4.573465784615127e-8m. These are prefix observations only, not a full-run or continuous swept-body claim.

Each prefix includes one positive-charge Float32-stationary publication. No prefix contains a moving connector at constant source S, because connector traversal never begins. The source-zero moving behavior is qualified only by its disclosed synthetic bookkeeping control. Ordinary K bounds were analytically prepared over38–45 pieces per actor, maximum about1.00000000000004; this did not qualify zero-K inversion. The original untrimmed connector lengths remain0.45840804948327507m and0.1985484725477985m. Trim0.5 was never imported.

## Controls and authority boundary

25/25 frozen checks passed: seven retained151/152/154 counterevidence references; fifteen newly executed prelude controls, including disclosed171 tangent-parallel progress, zero/unobstructed moves, stale selector generation, actual publication budget/charge negatives, old source-only overwrite, real173 denied plateau entry, four actual-publisher motion/dwell negatives and the actual imported reused-versus-fresh reset; then three actual held-reset/stale-core-view checks, one per failed case. The reset comparison executed eight steps in generation1, eight after reusing that factory in generation2, and eight with a separate fresh generation2 factory. The observed generation2 rows matched exactly. Held reset was refused without cancelling authority. None of these controls exercised a zero-K source transition before the run; that coverage gap explains why controls could pass and the candidate still refuse.

The traffic dependency is exact173 candidate647953239c5f17513bfd961a1791187a0e3fda24d310702a6b4a46394aec6e47, admissionsb322f2affd38555a5ec434066c8186a808e0c179697c531960b2a6331a64b1a7,173 REPORT146a30962c244c28032dad80a6088b03bd1f50b8595f3bd7537de346afe48ae8/seal d18281b1980f19db5eff70921bdbaf1846cea94955fe2610e4f42e4783bc3bb9 and174 REPORT d82537968f36648b31e3a789947381aa7f2e0cebeacd9ac7f5783b909f1de541/seal daeb43590643ebc6d93b552ec0e594be9eb9d9fbf4953155bcf0719c1671a3c1.173 overall full-gate acceptance remains unresolved after vehicle lane-fit and spacing failures. Its exact reviewed snapshots remain admitted only for this historical pedestrian prototype. No live primary/future traffic repair was imported.

Real173 accepted requests using all23 historical151 factory passages, frozen original plan identity and actual network edge identity. The current constructor's nine grouped visit entries are recorded separately in run/plans.json; no stripping, deduplication or replan was used. The label remains **173 core with historical151 plan**. The empty two-actor prestepped authority clock is separate from original population occupancy. receivingSpace=true and yieldSatisfied=true are existing pedestrian assumptions, not measured full-population eligibility. The real held compound remains open at failure; later traversal/release and lifecycle reset remain unproved.

## Smallest proposed successor, not implemented

Represent a positive-source-width/zero-ideal-arc piece as an explicit source transition rather than invert q/K. Before publication, prove its ideal position is constant and evaluate both actual incoming sampler endpoints. If the actual endpoints are identical, retain the exact Float32 position; still check the entire proposed source interval against the fresh173 halt/controls and exact held passage, including the occurrence0-to1 convention at S. Zero physical length cannot skip an admission, mapped control or held-source obligation. If the endpoints differ numerically, charge the actual numerical links and require the remaining production budget and final pair check, or refuse; never call the displacement free. Bound chains of such transitions by the already prepared finite piece count and refuse an unresolved transition.

Stage the resulting cursor/source/numerical-radius state before the final pair publication, so an undefined mapping cannot publish a half-processed tick. Retain a compact attempted-pair record if a later actual authority observation can still throw. The connector then remains exactly the admitted Pin-to-Pout path with source S, actual held identity and the same final Float32 pair check.

Required successor controls: the exact disclosed zero-K interval and identical actual endpoints; a denied halt/control inside a zero-arc source interval; both endpoint conventions at S with an actual held view; deliberately unequal numerical endpoints showing charge/refusal; a chain of zero-arc pieces proving finite transition work; and a forced post-selection mapping failure proving no unrecorded partial publication or false completion. Keep all existing controls and three exact starts. This is a proposal for a separately authorized successor, not a new threshold, executed fix, or proof that the remaining connector will pass.

## Named hard-problem failure-mode audit

- Assertion relaxation: none. Strict published separation, original budgets/deadline and exact authority conditions remain; the run is red.
- One-input success: none claimed. All three starts fail at the same zero-arc mechanism. Completed prefixes do not settle the connector class.
- Masking by ordering/cache/retry/timeout: no retry; both timeouts remain fixed and did not fire. Actual imported reset passed, but the partial publication order exposes a real defect.
- Less work measured: all three starts were invoked, but they stopped on the recorded exception. Incomplete counts are not a successful full run.
- Tuning/heldout: inputs and171 tangent control were disclosed. No heldout claim or post-result candidate change.
- Quiet error: the stack, states, incomplete counts and status1 are preserved; no swallowed success.
- Reproduction-only scope: two actors, one clock, historical plans, endpoint point-body checks. No original population occupancy, fresh constructor lifecycle, full compound release, braking/jerk/heading, swept/articulated/anatomical bodies, support/floor, native appearance,3000/200 or60fps proof.
- Relocated hard part: final pose writing and zero-arc transition ordering remain concretely broken here. Connector feasibility and production lifecycle are open, not described as routine integration.

## Preservation and cleanup

Read-only failure-audit.json verified all737 frozen pins and every original output-seal member unchanged. The six pre-existing delivered599 entry files remain untouched, as do151/152/154/157/160/162/163/166/167/168/171 and173/174 evidence. Only this new ignored artifact directory was written. No product/Git/install/cache/browser/GPU/server/full-gate work ran.

resources.json confirms owned Node PIDs54924 and19552 are absent after finally cleanup. Retained output is unresolved diagnostic/review evidence and is intentionally preserved. A first post-run audit script hit a local const-assignment reporting error; its draft is preserved and the read-only audit was corrected, without any candidate reset/step or trajectory rerun. Root owns further review, authorization of a successor and eventual integration.175 has no product admission and no connector-success claim.
