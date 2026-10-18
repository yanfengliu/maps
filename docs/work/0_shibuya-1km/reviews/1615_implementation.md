# Review 1615: implementation — controlled static execution and candidate stop

## Target

Actual curb1637 baseline and two separately authorized candidate attempts, on maps documentation base `67abb9734a0e0da67382603658880d3c7cde35ff`. Baseline used launcher `231a13a414cb64a73a06bdf37cfc7c9711784e4d84760c373f5f0994d1e6c8d3` and release `5fd3fee83f4f2391dc049000c663a0fa2f0818681b6b42541c16c2937e15b187`; initial candidate used that launcher and release `a114de85bfa42113b9f784ae427d27d6ddc04d3192e57d2a0ea0b1ccb14947e3`. Corrected candidate used launcher `0c6a9b60e6c1bce447cde0109e803f3a919beb025dc59043d017af3430abc3b1` and release `9b97234a0a8dde784282c3532df0cea845e9c2f1929b4578c3abcfd42c8dac5b`. Author geometry/failure freeze remains `5e82b1bc99c6c41d20935c0cfdbe1994db0139e98e2c62b73e0a4098c96896fd`. Exact raw evidence identities are retained by `artifacts/curb1637/execution-result-receipt.json`:5,654 B, SHA-256 `6b1f7a1564c4b2dd8d054848b28c82fa07500c3e796efa4c1bf83710921de446`; raw outputs remain ignored. The uncommitted geometry and setup repair are [1611](1611_implementation.md), [1613](1613_implementation.md) and [1614](1614_integration.md).

## Reviewers and coverage

Executor `/root/curb1637_capture_prep` owns the actual controlled-static runs and resource reconciliation. Root independently inspected all four exact baseline native originals, with retained `artifacts/curb1637/root-baseline-native-review.json`:1,170 B, SHA-256 `b5b32c3d786ba177893dc9580b4ab47ee0eb674fc773030bd79050fdb16f245b`. No candidate pixels exist, so neither executor nor root can supply a paired candidate appearance verdict. Root read this execution report and accepts the stop; the later fresh whole-effort direction review is [1616](1616_integration.md). Documentation preservation does not reproduce capture, resource census or native review.

## Reports

### 1637 controlled-static executor

Original authored report: `artifacts/curb1637/execution-report.md`;5,440 B, SHA-256 `023fffd423f85c6c94dad7adfb8b15bcfabee51068ccbd0bd7cc9ecf9fb82afe`. Exact authored bytes retained below.

```markdown
# 1637 controlled static execution report

Final result: baseline captured4/4 and root inspected its exact native originals; candidate captured0/4 in two separately authorized attempts, first failing launcher preflight and then failing application startup. No paired candidate appearance judgment is possible. No product/cache/dependency/source edits or further retries were made by the executor.

Baseline ran under old launcher231a13a414cb64a73a06bdf37cfc7c9711784e4d84760c373f5f0994d1e6c8d3 and release5fd3fee83f4f2391dc049000c663a0fa2f0818681b6b42541c16c2937e15b187. Capture47.607s, controller48.6712156s, external49.975967s; all exits0, no timeout, errors0, failed requests0. Dusk/noon agents0/Satellite queries, no walker, generic requested/active0/0/unattached, frozen bridge, tiles-idle and RTX4090 D3D11 were observed. All four1280x720 PNG hashes match retained baseline-result-receipt.json. Full selected runtime/build/harness/input checks before/after passed. Root native review is root-baseline-native-review.json, SHAb5b32c3d786ba177893dc9580b4ab47ee0eb674fc773030bd79050fdb16f245b. All handles/profile/port/known and omitted identities closed; baseline is finite static evidence only.

Original candidate attempt used that same old launcher and releasea114de85bfa42113b9f784ae427d27d6ddc04d3192e57d2a0ea0b1ccb14947e3. It failed at run-owned.ps1:29 because candidate node_modules/playwright-core/browsers.json was absent. External451.1615ms/exit1/no timeout; no Node/browser/profile/capture was entered and output stayed empty. The old1638 readiness review missed the explicit launcher dependency path. All16 original files and their exact hashes remain under preflight1/archive-receipt.json; the failure is not rescored.

Author changed only three executable-line sites plus a comment: primary dependencyRoot, primary Playwright registry and primary esbuild allow-list. New launcher0c6a9b60e6c1bce447cde0109e803f3a919beb025dc59043d017af3430abc3b1; capture844611a8988e6087612c60eaa0ce629906b107846a62be23d8b591541cd9a862, externalc1976e4ef65992b42dbe2364d48f4272b12a185d9868d30b44c666d1b9fb5ad9 and safety89ca170a755dba4498a419548e6212ae83c12c97a3cc32e0b69f011b96d88085 stayed unchanged. Independent1640 reviewf60a361f9d5d4e665462aa22d1a21bbd2ea05078628e0d008c9cabfe2053b83a verified actual ESM providers, real non-QualifyOnly dependency block, registry1243, four executable pins, environment, exact inverse and preservation. It established setup readiness only.

Root's first release renewal correctly refused overwriting an immutable retained release. Root preserved the exact old release at preflight1/candidate-release.original.json (SHAa114de85...) before generating new candidate release9b97234a0a8dde784282c3532df0cea845e9c2f1929b4578c3abcfd42c8dac5b and a matching fresh exclusive lease. The lease records that guard/history. Author source freeze5e82b1bc99c6c41d20935c0cfdbe1994db0139e98e2c62b73e0a4098c96896fd remained unchanged. Baseline history still names its actual old instrument.

Corrected candidate was invoked once with the exact renewed lease command. Capture2.275s, controller3.7588683s, external5.0729911s; exit1/no timeout. It served all seven checked selected-workspace build/terrain/pavement/hardware routes with matching bytes; before/after release/runtime/harness/input/GPU identity checks passed unchanged. Candidate scene156files/364229220bytes/digest5162c09e6233e858219400fe72b64ffc1ba55fd212e13f34e49e112111a2be07; GPU identity4090/driver616.64. The controlled dusk URL was navigated, but startup refused before pose/ready/population/local-walk or pixel renderer qualification. No camera inputs or frames were produced.

Actual startup refusal: Corridor edge paint pavements input has digest d402430dd2437e99562f24ebf17f9a620b8ada11e5f04fb86fadb95863d83f55, expected841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6; restore the reviewed scene cache or review the authored recipe against the changed physical surface. OrbitDriver.waitForFirstFrame reported it at candidate tools/visual/orbit.ts:162. One application console error repeats that cause; failed requests0. Node stderr contains the experimental transform-types warning; controller stdout contains existing ConvertTo-Json depth warnings. None is hidden or treated as a successful capture.

Corrected candidate finally reports page/context/browser/browserServer/preview/esbuild closure true and profileABSENT. Controller final census passed with2known/4omitted identities, no remaining/late identities, marker0 and portCLOSED; no termination fallback occurred. candidate-corrected-final-resources.json records a separate fresh census over all known/omitted/late identities, exact outer controller birth, marker, both known profiles and port4319. Its actual result and digest are in execution-result-receipt.json. Original failure resources remain separately preserved.

Bounds: each dispatched arm used150s work+30s cleanup, external180s and exact retained-controller kill wait5s; no deadline was reached. Native inspection cannot be inferred from hashes or initial framing. Known strict-profile support FAIL at three seam points and stale ordinary Start/walking dependencies remain OPEN; this new corridor-edge paint dependency blocks even controlled static startup. Candidate images, paired appearance, adoption, full gates, continuous motion, population and FPS remain unestablished. No further retry is authorized here.
```

## Findings and disposition

Baseline PASS is finite static evidence: four matched recipes,47.607s capture/49.976s external, native originals inspected and actual closure recorded. Removing live per-image human waits resolves that observed short-set handoff bottleneck within this run; it does not retire a public gate. Baseline does not qualify the candidate or ordinary Start flow.

Initial candidate FAILED_PREFLIGHT before Node/browser/pixels. The narrow actual-provider correction and independently reviewed setup readiness did not erase that failure. Corrected candidate FAILED_APPLICATION_STARTUP after matching served bytes: the existing corridor-edge-paint digest guard correctly refused changed pavement against its reviewed receiver input. This is an incomplete candidate scene rebuild, not evidence that a heavier verifier is needed. Three strict seam failures and stale Start dependencies were already OPEN; corridor-edge-paint dependencies are now a third separate unresolved class.

Root STOP: curb1635 PARKED, UNADOPTED and unmerged. Preserve its worktree, full patch/freeze and both failed attempts as active evidence. Candidate0/4 images means visible benefit NOT_ESTABLISHED and paired native review unavailable. No pin relaxation, further seam repair/capture, infrastructure chain or five-gate run follows automatically. The accepted product executable remains e1097edd.

## Verification

Original report and named receipts/release/source-freeze provenance verified; authored bytes retained verbatim. Documentation checks cover exact scope, sections, links, literal plan identities/criteria, size and staged whitespace. Actual executor records distinguish initial setup refusal, corrected boot refusal, unchanged release checks and fresh final closure; their observations remain attributed. This preparation does not rehash the complete runtime or rerun either attempt, process census or image review. Corrected finally/profile/process/port closure PASS does not make its failed capture PASS. Five candidate final gates DID_NOT_RUN; candidate appearance, ordinary walking, motion, population, FPS and adoption remain unestablished. No browser, GUI or server was created by the documentation task.

## Round outcome

Baseline finite static PASS; candidate FAILED_PREFLIGHT then FAILED_APPLICATION_STARTUP, with0 pixels and no appearance verdict. Root parks the prototype and accepts fresh direction review1616. No product change was adopted and no criterion closes; all35 identities and14 criteria remain intact.
