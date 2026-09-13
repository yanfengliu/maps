# Review 9: implementation

## Target

The bounded vehicle trajectory, source-bound support and opaque boundary-ingress increment in `maps`, based on main `279908488a29bd729e78656dade259638b98a669`. The exact target is `artifacts/network/review9-frozen/review9-freeze.json`, SHA-256 `4092790bb75a3c9a060b01a3c05f7e49ce56695b6e057e4ed6ebc0ce7997ead9`. Its 92 copied source, dependency, data and evidence files include 18 owned implementation/test paths. The reviewer preserved the owned delta from that base, including new files, in `artifacts/agents/network-review9/review-target.patch`, SHA-256 `3d91b1fff65aa2dfacf349fdf6f67e6ac5f125935d18868b9367685bb2b7b90a`. The target snapshot and ignored review evidence remain needed for this unresolved finding.

The owned scope comprises six `src/agents/core` modules, the additive admission/passage changes, `src/world/vehicle-surfaces.ts`, three source/surface producer modules, two named checkers, and four test/fixture files. The shared pose and asset types, support frame, vehicle renderer and prior network contracts are dependencies. This round does not accept a complete vehicle simulation, populated rendering, city journey or performance budget.

## Reviewers and coverage

The asset worker (`/root/status_evidence`) independently reviewed the network worker's frozen implementation read-only. The reviewer did not author the trajectory, support fitter, ingress lifecycle or source producer. The reviewer previously authored shared asset/render dependencies; inspection of those dependencies here is an integration cross-check, not an independent review of their own implementation.

The reviewer read the owned trajectory and sweep math, physical-layer selection, support fitting, byte/triangle provenance, source reconciliation, opaque-plan construction, admission mutations, named checkers and focused tests. The reviewer verified all 92 frozen hashes, reran the three copied test files and constructed the actual-GLB asymmetric-support counterexample below. Only isolated ignored review evidence and this allocated report were written. No live source, data, build or Git state was changed. No browser or server was launched.

Root separately confirmed the actual wheel-side convention and accepted F9 as a P1 finding. That disposition is recorded separately below. No additional CLI review was obtained in this round. Earlier Claude authentication and Codex transport/approval failures remain missing coverage, not approval.

## Reports

### Asset worker: independent trajectory, support and ingress review

**F9 / P1: support offsets are assigned to the opposite physical wheel.** In the frozen `src/agents/core/surfaces.ts:131`, `fitVehicleSupport` assigns positive local X to a wheel name ending in `right` and negative X to `left`. All three actual generated GLBs have the reverse naming convention: the `right` root is at negative X and `left` at positive X. The renderer applies each offset to the actual wheel root in the manifest's `wheelObjects` order. The fitter therefore queries the other side of each axle and applies its residual to the wrong tire on nonplanar ground.

The independent probe binds the old raw fleet manifest `4cd6e59b891abec4c4ce48fa03e8f90edf746097f9e532c9f3557be1f20e4257` and checks every original GLB against its advertised digest before loading the selected scene. The actual pivot magnitudes are X ±0.6850000023841858 m for kei, ±0.7950000166893005 m for taxi and ±1.1950000524520874 m for bus. Their front/rear Z positions are respectively ±1.0369999408721924 m, ±1.3420000076293945 m, and +3.2760000228881836 / −2.859999895095825 m. All 12 named root XYZ measurements are retained in `support-order-result.json`; no wheel dimensions or semantic labels were inferred from screenshots.

The fixed fixture has four broad, flat quadrants with heights `0.01 × sign(X) × sign(Z)` metres, all on one selected physical layer. Every wheel is well inside its quadrant. Both sides of each axle have unequal, nonzero residuals; the fitted body origin is Y = 0 with a vertical support normal. For each of the 12 wheels, the old fitter returns the opposite ±0.01 m residual. The error relative to the actual same-name wheel's support is ±0.02 m.

The probe also evaluates every actual indexed wheel vertex through the shipping `writeWheelTransform` at neutral steering/spin and an identity body frame. There are 14,004 drawn index references per wheel. The transformed minimum Y is +0.010000000000000009 or −0.010000000000000009 m, against the opposite ground height. Six wheel minima are 20 mm above their actual supporting plane and six are 20 mm below it. This is a CPU evaluation of actual drawn geometry and the production transform, not a GPU or whole-world contact claim.

The current planar support fixtures do not detect the mismatch because a plane fits all four contacts and leaves zero residual. Reported low maximum residuals on named source paths likewise do not establish correspondence between a residual and the wheel to which it is applied. Preserve their recorded numerical results, but do not use them as correct rendered four-wheel contact evidence until F9 is repaired.

The repair should retain the existing fleet geometry and manifest order, establish the actual root-side convention from pinned GLBs, and return offsets for those physical roots. The gate must cover all three classes, all 12 actual pivots, asymmetric nonplanar support, nonzero unequal left/right residuals and shuffled `wheelObjects` order. Its control must reproduce this frozen error. Changing model dimensions, swapping geometry or silently renaming the assets would obscure the integration defect.

No additional material finding was identified within the reviewed scope. The trajectory factory restricts forward straight/quintic spans and checks position, bearing and curvature continuity. Sweep certification uses complete Bézier control hulls and derivative cones with the body's supported 3D extent; it does not infer clearance from selected corners alone. The explicit uncovered-area numerical allowance is 1e-8 m². The inverse support-yaw parameter is distinct from horizontal motion bearing, and the unchanged shared support basis is used for projection.

Surface queries select an assigned corridor and physical layer, reject missing or inconsistent support, and solve residuals along the fitted normal, including its XZ displacement. The source producer preserves holes and mapped pavement exclusions, restricts its narrow reconciliation policies to named source evidence, and emits the same Float32 overlay geometry used for support. This is a bounded source interpretation, not a survey or citywide pavement claim.

The motion context copies loaded bytes before asynchronous hashing and binds the raw fleet, network, road, pavement, overlay and hardware inputs. Displayed support faces must lie on and inside their referenced actual road triangle; authored faces must match visible overlay vertices and upward winding. Recomputing a JSON digest cannot substitute for the displayed raw fleet bytes. Runtime bindings do not independently validate the original source-area assignment, which remains the offline producer's responsibility.

Opaque ingress plans bind their own sweep and complete legal route, require a fully outside initial body, preserve the portal join, and admit at most one intersected authority. Activation checks the stable slot, generation, class, scale, pose, support and steering before synchronous active/lease writes. Committed ingress retains authority through physical gaps; queued outside requests cannot clear mapped stop/yield obligations. Observation checks monotonic bounded progress once per fixed tick and requires ingress completion before ordinary route observation or retirement. The reviewed implementation deliberately remains scale 1 and samples vertical support at fixed-step spacing; its continuous XZ sweep is not a continuous vertical-contact proof.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F9 / P1 | Frozen support fitting maps named wheels to the opposite axle side, causing ±20 mm drawn contact errors on the independent asymmetric fixture. | Root accepted the finding after independently checking the generated side convention. The reviewer rejects this target for four-wheel contact acceptance. | Network owner repairs semantic mapping after this review is frozen, preserves dimensions and geometry, and adds actual-pivot/asymmetric/order controls. Rerun affected source traces and obtain focused re-review. |

## Verification

`node artifacts/agents/network-review9/check-freeze.mjs` verified all 92 target file digests with zero mismatches. The independent patch records all 18 owned paths against the declared base. It was generated from the exact frozen copies, not the concurrently changing live tree.

From `artifacts/network/review9-frozen/source`, `node C:/Users/38909/Documents/github/maps/node_modules/vitest/vitest.mjs run test/vehicle-trajectory.test.ts test/vehicle-ingress.test.ts test/vehicle-source.test.ts --configLoader native --no-cache` passed 24/24 tests: ten trajectory, ten ingress and four source tests. Duration was 877 ms on Node 24.12.0. The saved log is `artifacts/agents/network-review9/focused-tests.log`. These passing tests and the independently reproduced F9 failure coexist; the test selection does not cover the missing physical-wheel correspondence.

`node artifacts/agents/network-review9/support-order-probe.mjs` freshly reproduced the 12 incorrect offsets and actual drawn minima. Its harness is the frozen production support fitter, original pinned selected-scene GLBs, and production wheel transform. The fixed quadrant fixture, all root positions, contacts, offset errors and drawn-vertex counts are serialized in `support-order-result.json`. The transform dependency is SHA-256 `e8b11f70bf93b0d030a714501740e21d6fb58e9d9052738a6ee063069108e1b6`. The probe's expected heights come independently from the fixed quadrant formula at actual GLB roots.

The author's frozen evidence records nine class/path combinations, 9,351 support poses and a maximum residual of 10.699 mm; 3,267 support triangles including 1,388 authored overlay faces; three west ingress prefixes reaching the portal in 198 ticks each; and three outgoing traces initialized from an explicitly precommitted interior seed. The named earlier approach/bend failures and two unsupported retirement directions remain preserved. The real incoming prefix has no swept authority, while mapped entry controls are exercised by synthetic canonical-AOI fixtures. The author's 96-test log includes adjacent live network tests beyond the three copied test files. These source traces, the larger selection and the author's typecheck are inspected recorded evidence, not fresh independent reruns in this round.

Root's pre-freeze inactive-control, displayed-road binding and overlay-winding controls were inspected in the retained evidence and their repaired paths exercised by the fresh 24-test selection. They are prior repaired findings, not additional new F9 findings. No full application build, dependency audit, browser controls, native motion, 44-frame visual gate, population throughput or complete city journey was run here. All directly invoked CPU commands finished; no task-owned browser, GUI or server resource was created or left running.

## Round outcome

The reviewer rejects the frozen increment pending repair and focused re-review of F9. No other new material finding was identified in the bounded trajectory, admission-state and source-provenance review. This preserves useful scoped evidence without accepting incorrect wheel contact. The repaired target will need fresh bindings and affected checks; neither this report nor the author's CPU passes establish integrated vehicle motion, Shibuya completion or permission to inherit acceptance after source or fleet changes.
