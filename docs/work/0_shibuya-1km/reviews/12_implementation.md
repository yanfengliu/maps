# Review 12: implementation

## Target

The narrow F9 wheel-support correspondence repair to the frozen Review 9 network increment. The target is `artifacts/network/f9-repair/review12-freeze.json`, SHA-256 `92e695740214338dde6b3a9668224f40476a312dfad6c8daf5d409647cfd6bdc`, containing 86 copied files and eight external actual-fleet/GLB bindings. Its source base is `279908488a29bd729e78656dade259638b98a669`; current main `d3699133aa9185543fdfc51997f76385be011285` adds only the four reviewed documentation reports. No source change is inherited from that documentation commit.

The exact delta from Review 9 contains only `src/agents/core/surfaces.ts`, `test/vehicle-contact.test.ts` and `test/fixtures/vehicle-wheel-pivots.json`. Their hashes are respectively `703c54449917f0dcc909eecb541e031583a5f7edb511c50e03a13c29d27ef876`, `ffe28381062a1f86944207bea7cdb08ee8460c6f60a3008e76e8bcff69dcc317` and `e809aeb36ffb96ca2b772638d4b69f8c85e551dd4f0b920bb98c329e288ac6fa`. The independent reviewer preserved this three-path repair in `artifacts/agents/network-review12/repair.patch`, SHA-256 `8719bc470a98c91300f942c6f6f6be7ec7c384078d76813b9a65cfd1347dfc68`. Review 9's source snapshot and committed rejection report remain unchanged and recover the preceding implementation.

## Reviewers and coverage

The asset worker (`/root/status_evidence`), who independently found F9, reviewed the network worker's repair read-only. The reviewer did not author the core correction or promoted tests. The reviewer previously authored the vehicle assets and wheel transform; the actual-mesh cross-check here is independent review of their integration with the repaired core, not an independent audit of the reviewer's own renderer.

The reviewer inspected the complete three-path delta, compared the remaining candidate files against Review 9, verified actual original and V4 GLB roots, reran all four candidate test files and both named source checkers, and repeated the old-code negative control in an isolated copy. Only ignored reviewer artifacts and this allocated report were written. No author target, live source, scene data, browser, server or Git state was changed by this round.

Root separately verified all 86 copied files and eight external inputs and independently passed the same 36 candidate tests. That owner check supplements the reviewer evidence; root's final read of this report remains pending at authoring.

## Reports

### Asset worker: independent focused F9 re-review

The production correction changes only the named-side sign and its explanatory comment in `fitVehicleSupport`. It maps `right` to negative local X and `left` to positive local X, matching all actual generated wheel roots. The result still follows `wheelObjects` order. The axles, rolling radii, body dimensions, fleet geometry, support basis, plane-fitting algorithm, tolerances and admission lifecycle are unchanged. There is no geometry swap or side-label rewrite concealing the defect.

The new 3,700-byte fixture retains all 12 selected-scene root XYZ values, source model digests and axle metadata. Its values agree exactly with independently loaded original GLBs. The accepted V4 GLBs also have precisely the same 12 root coordinates. The test obtains expected contacts from those observed coordinates and a fixed asymmetric ground formula; it does not duplicate the corrected right/left sign as its oracle.

The promoted gate exercises three classes at headings 0 and 90 degrees, with original and shuffled manifest order: 12 tests and 48 named wheel contacts. Its four ground quadrants alternate between +10 and −10 mm. Each actor has unequal, nonzero left/right residuals, which the previous plane-only fixtures lacked. The tests check the actual root's sampled XZ, its expected residual and the root/radius contact height. Replacing only the reviewer's isolated fitter with the exact old Review 9 bytes makes every one of the 12 tests fail. The repaired copy is restored in a finally path and its original hash is verified.

The reviewer additionally evaluated actual indexed wheel geometry through the frozen production wheel transform. This independent extension covers both original and accepted V4 models, three classes, both headings and both manifest orders: 24 synthetic actor poses and 96 wheel observations. Every root matches the source fixture exactly. Every actual drawn minimum agrees with its physical ground quadrant, with maximum absolute error `8.673617379884035e-18` m in this double-precision neutral-steering/spin computation. That arithmetic residual is not a claim of real-world or GPU precision. The control's tolerance remains 0.2 micrometres, and no threshold was widened.

The affected named source trajectories still pass after the correspondence correction. The fresh run covers all nine class/path combinations and 9,351 support poses, with no contact, body or sweep failures and maximum wheel residual `0.010698254075431242` m. The separate six boundary traces also pass: three incoming prefixes reach the portal after 198 fixed ticks each, and three outgoing traces from explicitly precommitted interior seeds retain tail authority and retire with zero active slots or leases. Each permits at least three following signal cycles. The old straight/bend candidates and reversed/near-tangent retirement cases remain rejected controls.

No new material finding was identified in the narrow repair. It fixes the demonstrated physical wheel correspondence without broadening the accepted trajectory or support domain. The new tests deliberately bind the retained original fleet. The additional V4 root check establishes compatibility for its exact current bytes; a future asset convention or pivot change must be revalidated and cannot inherit this result.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F9 / P1 | Review 9 sampled the opposite physical wheel side and applied incorrect support residuals. | Independent reviewer considers the scoped repair verified. Actual-root contacts pass, shuffled order remains correct, and exact old-code reintroduction makes all 12 promoted cases fail. | Root inspects this report and immutable evidence before accepting the repair. Preserve the original rejection and its probe. |
| — | Actual integrated motion with the new standalone V4 raw manifest remains unverified. | Existing integration dependency, not a new F9 defect or an inherited pass. | Rebind surface/hardware inputs to the displayed raw manifest and complete motion, all-five-gate and main-integration requirements. |

## Verification

`node artifacts/agents/network-review12/prepare.mjs` freshly checked all 86 frozen files and eight external fleet/GLB references, with zero hash or size mismatches. Comparison with Review 9 found exactly the declared three-path delta. It created an independent replay copy before any report-writing checker ran. The frozen author target was not modified.

From that copy, `node C:/Users/38909/Documents/github/maps/node_modules/vitest/vitest.mjs run test/vehicle-trajectory.test.ts test/vehicle-ingress.test.ts test/vehicle-source.test.ts test/vehicle-contact.test.ts --configLoader native --no-cache --reporter=json --outputFile=../tests.json` passed 36/36 tests. `node artifacts/agents/network-review12/mutation.mjs` then ran the final 12 contact tests against the exact old fitter in the independent copy: exit 1, 12 failures, followed by exact restoration of the repaired source. The immutable author source and prior Review 9 evidence stayed unchanged.

`node artifacts/agents/network-review12/drawn-contact.mjs` performed the 96 actual indexed-geometry observations described above. It hash-checks both fleets' actual model bytes before loading them, checks the complete root denominator, uses the independent quadrant ground formula, and fails empty or incorrect drawn contact. `drawn-contact.json` retains every observation and input pin. The transform remains SHA-256 `e8b11f70bf93b0d030a714501740e21d6fb58e9d9052738a6ee063069108e1b6` from the immutable Review 9 reference copy.

The reviewer freshly ran `node tools/network/check-vehicle-trajectories.ts output` and `node tools/network/check-vehicle-ingress.ts output` from the independent candidate directory. Both exited 0 and wrote their results only into that copy. Their graph is `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`, and their raw fleet is the original `4cd6e59b891abec4c4ce48fa03e8f90edf746097f9e532c9f3557be1f20e4257`. The repaired source ordering does not change the support producer's geometry. The visible source check still binds 1,879 displayed subtriangles to 123 actual road triangles, under the existing 1e-6 m numerical inclusion bound.

The author's whole-tree typecheck and 108-test selection were inspected as frozen recorded results, not counted as fresh reviewer reruns. The independent commands used Node 24.12.0 and native Vitest config loading. All spawned CPU commands completed; no browser, GUI, server or GPU process was launched or left running.

The source traces still certify bounded continuous XZ sweep/dynamics and fixed-step vertical support, not continuous tire contact. Their actual incoming source prefix has no swept authority; mapped entry controls are covered by the retained synthetic canonical-AOI fixtures. The outgoing cases start from explicit interior seeds. No complete city trip, 200-vehicle traffic, multi-vehicle throughput, pedestrian integration, GPU motion, native frame, whole-population performance or full application gate is established here.

The separately checked V4 raw manifest is `5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01`. Its equal pivots do not make its raw bytes equal to the source traces' old manifest. Surface and hardware bindings must be regenerated or revalidated against those exact displayed bytes before integrated motion. This round does not silently promote the source data or renderer.

## Round outcome

The independent reviewer recommends accepting the exact F9 repair within its wheel-correspondence scope. The original defect is reproduced by a negative control and resolved for the pinned original/V4 geometry without changing dimensions, tolerances or authority. Root's final read remains the acceptance step. The larger vehicle milestone still requires its integrated data binding, visible motion, remaining code gates and main delivery; this report does not claim those outcomes.
