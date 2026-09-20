# F28 launcher v3 handoff

The separate ignored v3 candidate passes the bounded browser-free lifecycle controls. Independent Review 51 is required before any GPU capture. Worktree base is `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`; no production, four-file pure path, F27 controller, source data, dependency, model or policy changed. No real browser, HTTP socket, GPU or stop action ran.

## Exact review target

- `capture.mjs`: SHA-256 `71acc4f9f81a7de7ccaf10cb8ce673af3632c1dc8a08de02c30fe1810e4a78bb`.
- `capture.patch` against frozen v2 `e730dc825b188f891fed42480e98cb0db96971ae2d38752cc24bdafa74c9a734`: SHA-256 `ecd165d0a0097c8b88f9a14d8e3b57c68e45c3eb25ca083cb6de4cceb53db18f`.
- Approved `PLAN.md`: SHA-256 `c1fefddba4ffdd215778e0e12f8cb5fa171ac06885985e78897f00b87530e2b0`. Root approved a 120-second work/capture deadline with joined drainage, not a hard process-return ceiling; no cancellable-build helper is in scope.
- `gpu-identity.ts`, `process-time.mjs`, `process-ownership.ps1` and `process-snapshot.ps1` are byte-identical to v2. Their exact hashes are in `integrity.json`.
- The 27 files bound by repair freeze `51b30d2c…`, all five earlier experiment freezes, and all 41 files bound by F27 freeze `476c1ce1…` were rehashed unchanged. No old evidence was replaced.

## Mechanism

There is one awaited `run()` continuation. An absolute monotonic deadline and cancellation flag reject new phases, acquisitions and frame recording before/after awaited work. The timer requests cancellation; it does not detach `run()` with a race. Acquisition results are retained before the cancellation checkpoint. Cleanup begins its final inventory only after work has settled.

Cancellation can start closure of an already retained browser and a settled/listening HTTP server; every close task is retained and joined. An HTTP listen still in flight is never cached as permanently disposed by a pre-listening no-op. Its callback must settle; if it starts listening after cancellation, the subsequent cleanup closes that actual server. Browser handles delivered after cancellation are retained with their child PID/profile, then undergo the existing read-only exact identity/descendant binding before cleanup. No following browser protocol or capture phase resumes.

The seven-second close timer requests scoped escalation; it does not announce completion or discard the close promise. Browser escalation uses only the retained child handle and awaits its exit, registering the listener before kill. HTTP escalation closes only that owned server's connections. Required close tasks and escalation are joined before final inventory/manifest. Failure status remains set after successful drainage. Pending receipts explicitly carry `nonFinal: true` and `complete: false`.

## Controls and denominators

`control-final.mjs` evaluates the exact v2 and final v3 ESM bodies through synthetic imports. It manually fires their actual timer callbacks. `final/result.json` records 22/22 executed and passing control verdicts: eleven scenarios on each target. Eight v2 arms reproduce red behavior; the corresponding v3 arms pass. The other three arms test two ordinary acquisition rejections and a complete normal flow.

| Scenario per version | v2 observation | v3 observation |
| --- | --- | --- |
| Delayed build | Final manifest precedes later server/browser acquisition | Pending-build receipt remains non-final; after build settles no server/browser starts |
| Delayed HTTP listen | Pre-listening cleanup completes; late listen/browser work escapes | No pre-listening disposal claim; late listen settles, actual server closes, then failed manifest writes |
| Delayed browser launch | Browser arrives after final cleanup and remains open | Late handle/PID/profile retained; identity bound; browser closes before failed manifest, with zero remaining fixture identities |
| Delayed context / page | Late protocol handles arrive after manifest | Each returned handle is retained and closed; no following protocol phase starts |
| Delayed browser close, resolve / reject | Close budget permits manifest before close settles | Escalation is joined; manifest remains absent until late close settlement and owned disposal |
| Delayed HTTP close | Manifest precedes callback settlement | Owned connections are closed on escalation; callback settlement still precedes manifest |
| Build / launch reject normally | Failure and ordinary cleanup | Failure preserved and ordinary cleanup |
| Normal synthetic 36-frame flow | Complete with closed fixture resources | Complete with closed fixture resources |

At every delayed-acquisition deadline snapshot, v3 has not returned and has no final manifest. The retained pending-build snapshot specifically has no server/browser. The delayed-listen snapshot has a retained non-listening server, no cached close and no browser. All late-resource controls finish with zero live synthetic browser/context/page/server/connections. Timed runs remain failed attempts. The normal arm is necessary evidence that this instrument can distinguish completion from refusal; its screenshot buffers are synthetic and provide no pixel acceptance.

The original first control run used a 300-microtask observation allowance: 21/22 control verdicts passed, while the normal v3 arm had not finished within that harness observation bound. No launcher failure was established by that miss. `control-confirmed.mjs` increased only the allowance to 3,000 and passed 22/22 against the same initial candidate. The original output is retained. The initial candidate is preserved as `capture-initial.mjs`, SHA-256 `1fd92a8c0046929b8d288bba452716d1ecacc5572f6cc49840d3e35b03e41d55`.

Before freezing, one further launcher-only correction bound late-returned browser PID/profile and exact identity during cleanup; otherwise the cancellation checkpoint could skip those records. `late-identity.patch` (`cd9e7f593c98ccc12f6f26f26aa7ae2ff26dbbb4235babd48f07390ee220c2ed`) records that change. The final control adds explicit late identity/profile/remaining checks and passes all 22 cases on final `71acc4f9…`. No candidate edit occurred after that final run. Initial and confirmed raw outputs are preserved separately from `final/`.

The unchanged finite-date helper passes the same 13 invalid and three valid timestamp fixtures from Review 50. Exact classifier/transport byte transfer is verified. This author run does not repeat Review 50's actual PowerShell/CIM and eleven classifier cases; its original bounded evidence remains associated with those unchanged four helper files. The synthetic lifecycle controls never execute real PowerShell or a stop command.

## Honest phase bounds and remaining limits

The 120-second budget is enforced for starting/continuing work, with explicit remaining-budget options on launch/connect/navigation/readiness/screenshot APIs. Synchronous observation keeps its existing ten-second subprocess timeout and is followed by an absolute-time checkpoint. These option values and phase ordering are checked in the finite synthetic controls; they are not a measurement of real browser timing.

Vite build and HTTP listen have no hard settlement guarantee in this scope. If either never settles, v3 remains in its named non-final drain state; it does not fabricate completion, start a later phase or return through final cleanup. Browser protocol/closure settlement and process exit can likewise extend wall time; exact cleanup must finish rather than be inferred from a timer. Seven seconds is a close-escalation point, not a promise of final return. The controls observe finite delayed resolution/rejection and a pending snapshot; they do not prove all OS failure modes.

No new image export or capture was prepared. The copied launcher's old recorded-pose input contract is still merely an input prerequisite; any later F27 visual diagnostic needs its own frozen export, updated event-frame selection, precheck, GPU lease and approved launcher. Current results grant no native appearance, motion, city, source-policy or performance acceptance. All evidence remains ignored and intentionally retained. No browser/server/GPU resource was created to clean up, and no commit was made.
