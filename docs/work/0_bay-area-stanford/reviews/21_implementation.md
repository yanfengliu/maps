# Review 21: implementation

## Target

Repository maps, exact revision 2d4b5ca19ab2ed1638dd2f80f505a49f071839bf against 7cbddb24b9cea606640338d11055408d2fa0a613. Scope: worldwide navigation/search, removal of the persistent left panel, retained map context in church mode, global WASD and complete camera-aware cutaway walls.

## Reviewers and coverage

Independent global_church_review used gpt-6-astra at xhigh for a read-only code/image review and targeted callback probe. It inspected the committed changes, surrounding integration code and nine native images. It did not implement any part of this increment or launch browsers/servers. Root owns full gates and production controls.

## Reports

### global_church_review

Review 21 found one actionable issue in exact revision 2d4b5ca19ab2ed1638dd2f80f505a49f071839bf against 7cbddb24b9cea606640338d11055408d2fa0a613.

- F45 · P2 — Preserve IME composition in search. src/main.ts:298 processes composing Enter, Escape and arrow keys as application commands. Confirming Japanese/Chinese text with Enter can submit worldwide search prematurely. Executing the committed callback with key: 'Enter', isComposing: true produced one submission and one preventDefault. Return before handling keys when event.isComposing or event.keyCode === 229; test composition keys and subsequent ordinary Enter.

No other material findings. Inspected all nine requested native screenshots, changed runtime/tests, production evidence, and unchanged integration in src/input-handler.ts, src/quad-arcade-visibility.ts, and src/building-worker.ts. The evidence records no page/observer errors; diff whitespace checks pass.

Limits: independent read-only code/image review plus the targeted callback probe; no browser/server launch or duplicate full gates. F45 remains open pending repair verification.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F45 | P2: composing search keys run application commands. | Accepted; native text composition must finish before search commands run. | Guard and regression in aa5e0202a65942ee32ebcffd8909f79ca4dd91af; independent focused recheck follows. |

## Verification

Root's reviewed runtime passes build, typecheck, 131 tests, audit with zero vulnerabilities and the work-document checker. Production headless controls at 1600 x 1100 and 390 x 844 verify world/campus/church WASD, composition-free text entry, all four church presets, ceiling controls, rotated walls, native map context, worldwide search, dateline traversal, graphics recovery and search Retry. Nine native views were independently inspected. Model/source limits, bounded GPU measurements and artifact location are recorded in design.md. No physical-device or operating-system IME claim is made.

## Round outcome

One material finding requires repair verification; no other material issue found. The original report remains above. The next round records the repair outcome.
