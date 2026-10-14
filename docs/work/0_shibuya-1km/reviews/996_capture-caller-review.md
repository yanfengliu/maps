# 996 — Capture caller review

2026-10-14. **FIX BEFORE DISPATCH. Root accepts all four findings below and the build-label correction.** This focused independent review examines the implementation of [994](994_capture-contract-review.md) in the eight files pinned by `artifacts/commercial-corner-20261014/capture/prepared-freeze.json`. The implementation follows 994's narrower capture contract, but four bounded corrections remain. The frozen target was released for the worker to amend after the review. The worker will first preserve all eight reviewed raw files and the manifest under the ignored `capture/frozen-pre996-runner/` directory. Preservation, fixes and focused re-review are required next steps, not outcomes established by this report.

## Required fixes

**P1 — Retained output can still be overwritten.** `capture.mjs:134` rejects an existing `capture.json` inside the `try`, but the `finally` block unconditionally writes that same path at line193. Selecting a retained baseline therefore replaces its record despite the refusal. Move admission before the write-owning `try` and protect record creation against an existing destination. Add an offline control showing that refusal leaves existing sentinel bytes unchanged and launches no resources.

**P1 — The final started page has no teardown witness.** After real Start and the style round trip, `capture.mjs:185` closes the page without reading its disposal outcome. Earlier measured navigations cover pages before Start. A final disposer exception can be swallowed by the actual `recordTeardown()` at `src/harness/teardown.ts:63`, while browser closure and process absence succeed. The app's disposal chain includes the loaded walker and renderer (`src/app.ts:438`; the walker is admitted through `loadOwned` at line323). Witness the started page's teardown before closing: clear its marker, navigate to a pinned, owned, app-free same-origin terminal document, require fresh completion, then close that terminal document. Root has accepted this correction; exact implementation remains the worker's choice.

**P2 — The stale-marker control does not exercise the corrected navigation code.** `canonical-controls.mjs:16` manually deletes fixture storage before invoking the acceptance helper. Removing the real `sessionStorage.removeItem` from `measuredNavigation()` at `capture.mjs:38` would leave this control green. Extract and exercise the actual shared navigation helper with controlled page/storage behavior and the canonical teardown writer. Omitting its real clear operation must fail against a pre-existing completion marker and omitted current handler. Root has accepted this correction.

**P2 — The private receipt uses the reserved canonical certificate name.** `run-owned.ps1:144` writes `complete.json`. `docs/policies/local-rules.md:85` reserves that name for the complete verdict gate; `tools/visual/lane.ts:12` states the same boundary. Rename this bounded receipt, for example `capture-completion.json`, and update its references.

Also correct the record's `build` description at `capture.mjs:29`: this dispatch uses the current candidate production build, so “unchanged accepted production dist” would misstate its acceptance status. Root accepts this correction as well.

## Inspected implementation and evidence bounds

The remaining implementation is coherent within its declared bounds:

- `acceptance.mjs:3` checks application/context/tile errors, settled detail, required/loaded leaf identities, geometry presence and hardware rendering. The underlying cutout status at `src/scene/buildings.ts:459` checks actual live tile content, rather than only matching counters.
- Every image is captured through existing pointer/wheel controls, measured at 1280×720, hashed from its PNG bytes and checked against recipe, epoch, time/style and actual GPU identity. `OrbitDriver.settle()` at `tools/visual/orbit.ts:387` supplies fresh-frame settling. Current image hashes are taken immediately after capture; native inspection must bind the retained bytes it actually opens.
- Before/after pins at `capture.mjs:102` include source, production build, current scene/network/rail/walker inputs, Draco, executed visual/Vite helpers and the private caller/helper/recipe. Source-map checks at line113 connect the build's runtime sources to the checkout. Two filesystem snapshots retain their declared inability to detect a change and restoration between snapshots.
- Canonical console/pageerror listeners attach before initial navigation at `capture.mjs:144` and remain attached through closure. Measured navigations at line38 correctly clear and inspect their marker, require a changed document epoch, and bound navigation/replacement startup. This positive source inspection does not remove the separate final-page and control-wiring findings above.
- Actual Start at `capture.mjs:175` requires tick and physical travel to advance. Subsequent real style changes preserve document/camera, actor identity, Start frame and nondecreasing progress.
- Network failures remain recorded diagnostics. The caller explicitly reports `customHttpCertification: "not-established"` and executes no delivered-body certification.
- The child seals its record after closures and after-pins. The wrapper checks retained process identities after closure at `run-owned.ps1:130`. Its disclosed bound correctly leaves omitted identities for root's final ownership review. The reviewed control fixture does not establish actual browser/process closure or the wrapper's timeout path.

The retained 19-control report is useful helper-level evidence: it uses actual baseline2 observations/PNG hashes, the actual acceptance helper, canonical error callbacks and canonical teardown writer. Its 15 refusals do not prove all caller wiring or process cleanup. The stale-clear case above demonstrates that distinction. The reviewer did not rerun these controls. The reported helper/collector/writer hashes match the inspected bytes, including canonical collector `c41a83bf4367c09c02f336a0c81092ba0c4b7d314f1901af302d059a4fb2887d` and teardown writer `4b8aeeb4315a1f046244385ec9ebd516f3c375f1bf836e7ef00837c6f7393864`.

## Frozen targets

All capture paths in the findings are relative to `artifacts/commercial-corner-20261014/capture/`. All eight files below matched their declared size/hash both before and after the review. The manifest itself has SHA-256 `bf5f78af53438c9e9c748ffa6b32c771f7fcebb3dcf6fdf2d5a446044c59b04e`.

| Reviewed file | Bytes | SHA-256 |
| --- | ---: | --- |
| `capture.mjs` | 25,028 | `58a4e7db70a289154fea25700f1664f6b6d8f6ed8bfe54d579b44f6bf7376673` |
| `run-owned.ps1` | 11,156 | `9a4cd5e4103277f277f4498a88f1f0fbe44757ed591a78d4bc6275fab72c4049` |
| `poses.json` | 3,831 | `c411d4639fce759dee1587b12b13a333b59e61fe44cf14acfeba4388381f0fb3` |
| `acceptance.mjs` | 3,788 | `cf4062c2861f43c378618db761550a17204006b7a604494577023212d3e461f3` |
| `canonical-controls.mjs` | 5,035 | `a9df2988b5732e3e772b0f9b06b952614abe0db4a0ccf2cf9e2eb8a9fbf64b21` |
| `canonical-controls.json` | 6,740 | `8033ee261b7eaf69fce233e60998ef032e5332cf6c204d146bbe95c381988b77` |
| `HANDOFF.md` | 4,480 | `dc8f44290e5af8dae7d99bff36d8865880ef60df8d0040b891c4e0a327307fdb` |
| `contract-change.md` | 1,609 | `71d90e0a575b329d63747408cfaa29c80a428e1a23ea850929a3d56600ff753b` |

Both failed records remain unchanged: `baseline/capture.json` has SHA-256 `13c31bbf20b810290978d81b5dc61db351a7f7d5f348cbfadf0899d0cad5a24c`, and `baseline2/capture.json` has SHA-256 `324fc124a37b16624dfafb1faac49941ddace814b6091fd73dfdc50e6371fb9d`.

Review 994's scope remains intact. Request218 remains RED/unclassified within the optional audit; no harmlessness or delivered-body/request-completion claim follows. After the bounded fixes and focused re-review, a fresh runtime trial must establish actual behavior, native appearance and cleanup. The full 44-frame/three-lifecycle gate remains mandatory. Root reported that the candidate source was applied and build/typecheck passed while the unit gate was running; this focused instrument review neither reran nor grants those product checks acceptance.

The review itself created no files, tests, browser sessions, servers or mutations. This report was written afterward under root's narrow report-retention authorization. No code or other document was changed, no browser was launched, and no test or Git operation was run by the reviewer. Actual fixes, control execution, fresh runtime evidence and final integrated acceptance remain with their assigned owners.
