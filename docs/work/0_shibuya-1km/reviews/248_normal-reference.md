# Family A — normal reference audit

**Decision: redirect to independent review of the normal reference before another GPU arithmetic attempt.** The existing reference faithfully measures a particular CPU world-Float32 mesh. It does not faithfully isolate the intended geometric shading of a rigidly translated pedestrian. Both existing GPU attempts remain rejected. No candidate was rescored against a changed reference.

## Bound and evidence

Two small CPU probes ran once each on Node 24.12.0, using every selected vertex and incident triangle in near `turn-landing` (tick 311, 17,748 vertices) and medium `startup` (tick 0, 2,086 vertices). Startup is an ordinary case, not an inherited worst event. The probes read retained hardware readbacks and original source-double geometry only. No browser, GPU, server, test suite, Git operation, source edit or new capture ran. Output is confined to this directory.

The fixed failed manifest was checked against `ee4ffd56b4b03e2c52d252e2dc2e8989275f11ba0096f28e6517af83119a5883`. Its prepared manifest was independently checked as `86e413164630c6e273db7793cd0a577ef8edf5619db725a311e55278882b6f3c`. Every probe input has its size and SHA-256 checked against those manifests and recorded in the JSON outputs.

The first instrument is the repository's retained geometric-normal law, independently expressed in `probe1.mjs` and checked against its frozen output. The second reconstructs the original full-weight geometry from the source sidecars and frozen 53-joint palette, using the installed three.js matrix/quaternion operations. It first checks that rounding the reconstructed world positions reproduces the original CPU buffers exactly. Neither probe changes the source geometry, selected set, asset scale, weights, palette, triangle membership or event.

## What the two probes establish

All values below are maximum Euclidean normal-vector differences over the complete selected mesh. The existing client actually uses Euclidean distance (`gpu-client.mjs:24`), despite the search contract's phrase "component error". The correction should retain that stricter existing measure explicitly.

| Measurement | Near turn landing | Medium startup |
| --- | ---: | ---: |
| Replayed CPU normal law versus frozen CPU normals | 0 | 0 |
| GPU normals versus CPU normal law on actual GPU positions | 1.7947241e-7 | 2.1900145e-7 |
| Actual GPU normals versus frozen CPU normals | 0.0095923728 | 0.0030171863 |
| Frozen CPU normals versus original unrounded geometric normals | 0.0052548097 | 0.0021056929 |
| Local Float32 geometric normals versus local-double reference | 0.0000438993 | 0.00000115794 |

The hardware normal pass agrees with the law of its own retained positions within 2.2e-7 across both complete meshes. This identifies position conditioning rather than an independently wrong normal summation in these cases. It does not identify the cause of the GPU position rounding differences.

`probe1.json` contains a direct translation counterexample. Add exactly 2^-19 metres (1.9073486328125 micrometres) to every x coordinate of the frozen CPU mesh. With double coordinates, normals remain exactly unchanged. Round the translated coordinates back to Float32, as the current reference does, and normals change by **0.0098236647** near and **0.0006938525** medium. Maximum position-rounding error is only 1.9073486328125 micrometres. Respectively 15,399 and 434 vertices exceed the unchanged 1e-5 normal bound. Full incident neighborhoods are retained for the new maxima: near VAT 13736, one triangle of 0.31353984 mm², and medium VAT 1539, two triangles of 26.0882363 and 22.2068390 mm². This is a geometric counterexample, not a new gait/contact event.

`probe2.json` independently reconstructs the original double deformation and exactly reproduces **every component** of both frozen world-Float32 position buffers. Normalizing its joined face sums before world rounding yields the original unrounded geometric normal. The equivalent calculation on unrounded world coordinates differs by only 8.22e-12 near and 2.99e-12 medium. A rigid one-metre translation changes the old medium oracle by 0.0007204386 at VAT 1400 while both unrounded references remain unchanged. The near one-metre control remains unchanged, as expected when this particular translation preserves its Float32 differences; it is retained rather than hidden.

The original CPU oracle is already 0.0052548097 and 0.0021056929 away from the normals of the intended unrounded geometry. It therefore demands replication of rounding-dependent shading, not simply fidelity to that geometry. No visible defect magnitude is claimed: no images were inspected in this scope.

## Why the coordinate law matters

The user requires visually excellent, naturally moving pedestrians and GPU execution where applicable. Reproducing a particular CPU rounding sequence is a replaceable implementation choice. The joined-triangle geometry and full source correspondence remain requirements of this bounded candidate.

Let `q_i = idle_i + fullCurrentSkin_i - fullReferenceSkin_i`, in the existing rig frame. Let `R` be the current yaw rotation, `s > 0` the unchanged uniform scale, `b` the body translation and `o` the world origin. The intended position is `p_i = s (R q_i + b) + o`. For a triangle, `(p_b-p_a) cross (p_c-p_a) = s² R ((q_b-q_a) cross (q_c-q_a))`. The joined normalized normal is thus independent of `b`, `o` and positive uniform `s`. Rounding world positions *before subtraction* destroys that invariance, with the observed tiny triangle areas magnifying the effect.

The installed `three/src/core/BufferGeometry.js:975` implements area-weighted face sums from geometry attributes; it does not require those attributes to be in world coordinates. `Vector3.js` supplies the matrix homogeneous division and quaternion rotation used by the original deformation. Their inspected SHA-256 values are `42cbedbe2b0cf90439570a7e924aed519e4b7302a94a26d5949e36d5bed55f77` and `1bed22d35a17a240ecfdc2682f36b458db30d04b99041699868eb58e47b2b5ca` respectively.

## Smallest correction proposed for review

Keep the same complete source deformation and same incident-triangle joining. Define the independent normal reference as `N_i = R normalize(sum_incident ((q_b-q_a) cross (q_c-q_a)))`, evaluated from original source doubles with double face sums, before body/origin translation and world-Float32 storage. Continue requiring `||N_gpu - N_reference||₂ <= 1e-5` for every selected vertex. Keep the 10 micrometre world-position bound, 15 mm penetration bound, 5 mm planted-drift bound, every event/LOD/influence, permutation positive, material omission and wrong-frame negatives, timing/readback completeness and all failed predecessors unchanged.

This is an explicit reference-law change requiring independent review, not a relaxed bound. It should receive its own frozen reference identity and translation/rotation controls before any candidate is scored. Preserve the old reference outputs and rejection reports as counterevidence. Computing a CPU normal from the candidate's own GPU positions is useful diagnosis, but cannot replace the independent reference: it would accept a self-consistent wrong mesh.

## Remaining gap and failure modes

Plain local Float32 is **not** a proved implementation: in the near case it differs from the source-double reference by 4.3899268e-5, with 118 selected vertices over 1e-5, even using double cross products and sums afterward. Merely moving the existing position texture into local coordinates does not establish the unchanged bound. A production GPU mechanism still needs to preserve sufficient local edge precision and survive compiled hardware measurement; this branch has not chosen or tested one.

The next authorized decision is independent review of the proposed reference and both counterexamples. After a reviewed correction, all 17 events and three LODs must be rerun against a newly frozen oracle and all dependent controls must run successfully. No inheritance of old normal acceptance, compiler-cause claim, single-event acceptance, dropped triangle, reduced source precision, CPU-deformed upload, omitted influence or threshold adjustment follows from this report. Natural motion at sparse 30 fps review, appearance, default/native integration and population performance remain separate outstanding acceptance.

No task-owned GUI/browser/server was created. Both synchronous Node probes exited. A final exact-directory process scan through `Get-CimInstance Win32_Process` was attempted and returned access denied; this is an unavailable process census, not a claim that the shared machine has no processes. The four probe files and this report are intentionally retained evidence for the pending reference review.

## Reproduction and output hashes

Run `node artifacts/fresh-normal248-20260928/probe1.mjs` and `node artifacts/fresh-normal248-20260928/probe2.mjs` from the primary checkout. They only write their own JSON beside the scripts. Input hashes are embedded in each output.

- `probe1.mjs`: `2bb637f636cdfe4ecbe84a618a746c102914934e6ff9c3053c3e704a35c82c4b`
- `probe1.json`: `82c7db500bf903a70c9429004b729a8db10abc1f6c95e3ca8f9ef53e8a3a5ff5`
- `probe2.mjs`: `0416b7b6ae8f85f48d1c3052126a42393aa092a86bced48f153460a0b3d7a3a6`
- `probe2.json`: `601aa778ec150aee823945923fd24589162b8b6fd0334c12b096e2f099753e0e`
