# 850 — frozen four-member capture helper review

2026-10-12, round 1. **HOLD_SOURCE_GUARDS** for the frozen private 849 helper. Two material guard gaps must close before bounded source admission. Final source, per-member windows, producer/profile/packet, build, five gates, certificate and runtime lease remain explicitly pending. This review admits no final seal or runtime dispatch.

Scope: the frozen 849 handoff, native/observer/owner/recipe and retained private CPU/projection evidence, against base `6e4e04c62c992e8d9c8590f170443582da380550`. I read only immutable committed product code where needed to interpret draw timing; I did not inspect 848's changing product modules. No tests, build, producer, browser, server, GPU, port or process query ran. Original 820 files are preserved.

## Material findings

1. **[P1] Four source-window entries do not establish four-member coverage.** `artifacts/group849/native.mjs:20` checks only that each `memberWindows` array has length four. `memberWindow` at line 115 loops whatever entries it receives, never requiring distinct complete indices `[0,1,2,3]`, and treats occurrence/cycle/edge/local predicates as optional. Four copies of the member 0 window therefore check member 0 four times; four `{member:0}` entries perform no root predicate at all. Members 1–3 can have wrong source windows without that path refusing. The retained CPU check at `check-private.mjs:24` changes one supplied `edgeId`; it does not cover duplicate, missing or empty windows. Require complete unique membership and the final reviewed required predicate shape before launch and scoring, with literal old-helper red controls for these omissions.

2. **[P1] Advanced controller ticks can conceal stale member draws.** `native.mjs:109` requires each draw's positive serial, finite sampled time and one attached actor. `postStartCompletedRender` at lines 126–142 then requires every member's tick to advance, but does not require its draw serial or sampled pose time to advance. Event and noon lateness at lines 165 and 176 score only the lead `w.draw.sampledSeconds`; `memberWindow` does not score each member's sample time. A member can retain its held positive serial and finite time while its tick/root advance and satisfy those predicates. The retained “one unadvanced member” control changes tick, so it does not distinguish this class. Require fresh serial and sampled-time receipts for every member against the held/pre-Start input, every member inside the final shared source-time window, and a source-derived draw-to-fixed-root lag bound. Preserve a literal stale-draw control that the old predicates admit.

The committed base separates these observations: `LocalWalkDraw.update` increments the draw serial and stores the rendered sample's `root.elapsedSeconds`, while the walker status root uses the current fixed-step frame. `LocalWalkGait.sample` interpolates within one `dt`; `RenderLoop` defaults to `1/60` seconds and supplies its accumulator fraction. Exact draw/fixed time equality would reject valid interpolation. A one-step lag bound is supported only after the final pinned source affirms the configured step and sample boundary; that final dependency is still pending.

## Accepted preparation bounds

The retained 15 private checks exercise actual extracted helper predicates and distinguish singleton counts, duplicate observed member indices, changed original actor identity, tick divergence, unsafe gap, failed contact, group refusal and lead aggregate draw from their positive fixtures. Their old lead-only completed-render predicate accepts the preserved unadvanced-member case. These results establish those literal guards, not complete independent rendered-member qualification.

The recipe adds correctly counted 20 stills: 15 dusk and five noon, fixed and fresh seed 849 views, a visible common Start click, pointer Cartographic/keyboard Satellite return and outgoing `pagehide`. The incumbent lead and each member retain `drawnActors:1`; group counts require four and source models require three. All four intentionally share the original actor identity. No clone-body variety is claimed. The observer retains complete group/member metadata in same-task native copies, and refusal attempts retain their source observations before failing.

I independently compared the owner text after reversing only the session names: it equals the qualified 820 owner. Its retained-handle closure and finite 220/240/300-second cutoffs are reused. This is source comparison, not newly observed cleanup. The noon entry uses the existing `?time=noon` URL and verifies the preset and outgoing teardown. Control and closure source paths reveal no additional material change.

The projection report binds the revised recipe and records agreement between closed-form and Three projection. Its near initial AABBs have minimum depth 3.275253 m and bottom margin 33.826769 px; all six initial views fit the tested planes/viewport. This establishes initial projection only. Moving fit, obstruction and recognition remain for inspection of each actual original at native resolution.

## Exact inspected inputs

All 16 handoff/recipe/helper/CPU/original pins matched their recorded raw bytes. The complete pin inventory is retained at ignored `artifacts/group850/review-inputs.json`, SHA-256 `b828afed1d81ddf7f325016f18ef1284f3b0f092b3fc47fd1a5b03344e08cbec`.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/group849/preparation-handoff.json` | 6,611 | `5a12387211161741991bf74d08f89d2bdbe1a3fa35f9d5b2e87764a818bdfd09` |
| `artifacts/group849/helper.diff` | 63,835 | `165cb304a4551b9e8714c37b8f666fef58f4b8b0da908ee1b9b4f1b24d5378a7` |
| `artifacts/group849/native.mjs` | 47,562 | `f14a08336d1363d48757796e58d896ff7f38cb115fd537d08f67332207581511` |
| `artifacts/group849/check-private.mjs` | 5,804 | `382b7ac44f767e9ce81efbcb96c97d2f2a0e0e309fd5af186dfeb65f653a750b` |
| `artifacts/group849/private-cpu-checks.json` | 3,728 | `5e8db14e8d9d5e95e08a3b1ef0b4c180b7696991d5cd829c149ef040c6c63ca5` |
| `artifacts/group849/recipe.json` | 7,953 | `f4098f1bc453cb5d0c149919965355fcffb74b81d2a4114c1f747df191b99d43` |

Root accepted both findings and assigned the narrow repair to 849. A focused rereview must bind the revised helper and its actual old-red/new-green predicates. It must keep final source windows and seals pending while 848 remains active. No broad helper loop or runtime qualification follows this first review.

## 2026-10-12 — round 2, focused source repair

**ADMIT_REPAIRED_SOURCE_ONLY.** Both round 1 P1 findings are closed in the frozen revision below. No further material finding arose within this repair scope. Final configured step, six actual sampling source pins and all six per-member source windows remain null and unfrozen; `prepared.json` remains absent. This is helper preparation admission only. It supplies no final seal, runtime lease, actual render, appearance, producer, gate or main acceptance.

The launch now calls `validateCaptureRecipe`; the same `validateMemberWindow` runs at admission and observation. It requires exactly one member each from `[0,1,2,3]`, exact fields `member/occurrence/cycle/edgeId/localM`, safe nonnegative integer identities, a nonempty edge and an explicit `zero` or `positive` local predicate. Duplicate, omitted, partial and unsupported windows therefore refuse. Every member is then scored against its own occurrence/cycle/edge/local predicate and the shared draw-time interval; a correct lead cannot qualify a late or early non-lead sample.

The actual `postStartCompletedRender` now calls `memberRenderAdvance` against both the immediate input receipt and pre-Start receipt. Every member needs a newer draw serial, newer sampled pose time and accepted fixed-step advancement. Held frames need newer serials with held pose time unchanged. The helper checks serial/time advancement between native captures, nondecreasing cumulative member event counts and a separate draw-to-fixed-root lag of `0..final dt`, with `1e-10` seconds numerical allowance. Event time uses its distinct `1e-8` allowance. Advancing interpolation within an unchanged fixed tick is accepted outside the explicit post-Start fixed-advance requirement.

I read the exact current/retained-old helper extraction in `check-private.mjs`, including the actual asynchronous completed-render function under CPU stubs, and matched all 51 reported checks to the retained raw JSON: 43 current green checks and eight controls where the preserved old helper accepts the invalid input. These include duplicate/partial windows, one stale member's serial or pose time despite advanced roots, held stale serials, non-lead lateness, event-count regression and interpolation boundaries. The current wait signal keeps stale draws pending; the actual completed-render helper has a positive and stale-member refusal case. This is reviewed retained execution evidence; I did not rerun it, and browser RPC/deadline behavior remains outside its bound.

All 21 revised and preserved input pins matched. The old native, CPU receipt and handoff remain byte-identical under `artifacts/group849/prior850/`; static views are unchanged, so only their earlier initial-projection result transfers. Owner, observer, camera-range and source-control paths are unchanged by this repair. Complete pins are retained at ignored `artifacts/group850/repair-inputs.json` (6,331 bytes), SHA-256 `6f2ebb6a8658b703d95cb190913d54c8d1095ee6ff4d3d4b526d887aa0c96bbe`.

| Revised input | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/group849/preparation-handoff.json` | 8,937 | `c7d2987182f1c971b7bca80e7cc899220003efefe5f3a7e71128343ac489f4ae` |
| `artifacts/group849/native.mjs` | 52,276 | `daaa6af2b0db49684a4f1df63ddaf79ff3840448dcef5d649c5d3faabc3dbdef` |
| `artifacts/group849/recipe.json` | 8,874 | `a6e558bd731b57db86bdbfe9a28b3fdfe63e92f7fb4a9a38fe4e533b2358c670` |
| `artifacts/group849/check-private.mjs` | 12,868 | `2611164b054d71a5baff2362db27acb153dd2a956f258c964ff4381b28361a5f` |
| `artifacts/group849/private-cpu-checks.json` | 9,437 | `c9289aa4e34d4703783f62128ec24a1f157361258f3e5cc8ef14c9d2c37182a3` |
| `artifacts/group849/repair-cpu-raw.log` | 9,757 | `3508392a3fee456fce979fe97d01b7bacfba24fd625e4804f1012ce1e55d06b7` |

No runtime or process-query resources were launched in either review round. Root remains acceptance owner. The separately reported 848 CPU performance HOLD remains outside this helper review and blocks the next producer/gate/runtime stage until its measured repair is accepted.
