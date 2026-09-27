# 178 — Integrated traffic verification refused

Owner178, 2026-09-27. Primary `C:/Users/38909/Documents/github/maps`, base `6f8947789400260924345ec3088a50e2a1bf4600`. No source, test, product config or canonical document was edited. No commit or push. Root owns the subsequent repair assignment and canonical status.

The integrated173 candidate is **not accepted**. Build, types and audit pass. The complete normal unit selection fails two product cases and one temporary-directory premise. Correcting only the owned TEMP location makes the unchanged single instrument case pass. The visual run was canceled during appearance after the coordinator's pause arrived; no complete certificate exists and no final visual acceptance is claimed.

## Inputs and execution

`../integration.json` binds all10 reviewed files to candidate manifest `647953239c5f17513bfd961a1791187a0e3fda24d310702a6b4a46394aec6e47`, review174 report `d82537968f36648b31e3a789947381aa7f2e0cebeacd9ac7f5783b909f1de541` and seal `daeb43590643ebc6d93b552ec0e594be9eb9d9fbf4953155bcf0719c1671a3c1`. All integrated hashes matched before testing. Node was v24.12.0. GPU identity was NVIDIA GeForce RTX4090, driver616.64.

The coordinator approved a cache-isolated equivalent execution. This was not a literal unmodified `npm run visual`. The owned Vite and Vitest wrappers change only cache paths and disable Vitest cache. The owned Playwright wrappers preserve every worker, renderer argument, retry, repeat, assertion and timeout; testDir/outputDir are equivalent absolute paths, and preview uses the owned Vite config with runner loading. `effective-playwright-configs.json`, `effective-vite-vitest-configs.json` and `selection.json` retain actual comparisons. Canonical and owned Playwright lists matched exactly; the normal unit denominator was all91 `test/**/*.test.ts` files. PWTEST_CACHE_DIR, npm cache, TEMP and TMP were owned. No install, audit fix, shared data or dependency write occurred.

`nonvisual-gates.json`, `visual-ordered-commands.json` and `visual-phases.json` retain exact executable, argument, PID, time and status records. `run-nonvisual.ps1` and `visual-chain.mjs` are the actual executors. The external before/after harness manifest explicitly includes these wrappers; the canonical certificate alone does not claim to bind unlisted executors.

| Gate | Result and bound |
| --- | --- |
| Build | Pass, 1.978s wrapper wall time; Vite127 modules. Existing >500kB chunk warning retained. Same primary dist was built again during visual's ordered chain. |
| Types | Pass, 9.266s, normal `npm run typecheck`. |
| Unit | Fail, 66.016s command wall time /65.51s Vitest. 91 files:88 passed,3 failed. 794 tests:791 passed,3 failed. No full rerun. |
| Audit | Pass at high threshold, 8.964s. Two moderate reports remain for Vitest/@vitest/mocker; no fix/install attempted. |
| Visual | Canceled. Reset -> build -> begin succeeded; appearance started with3 workers and reported the hardware renderer. Lifecycle repeat3 and final end were not run. |

## R178-1 — Actual bus width exceeds its lane

The unchanged `test/vehicle-run.test.ts:631` requires `envelopeBeyondEdgeM.maximum <0`; actual rounded result is0.1428m. Its bound is60 vehicles,0 pedestrians,seed0x5b1b0a,1,200 ticks at1/60s, every active non-egressing pose except the first observed spawn.

The exact witness is tick686, bus#48, lane `lane:46770351:2:0:ground0:f:0:section0`, width3m. Published scale is1.0016956329345703; generated authority scale is1.001695679710784. Actual width is3.2855618007926286m. Source-centre lateral offset is only0.00002139135m, and measured beyond-edge value is0.14280221503573465m. It is a full-body width mismatch without an actual lateral lane shift. The complete route halt validator checks body clearance at obligations but does not check lane-width fit along the route. The source metric's old prose mentions bus-width limitations, but that does not satisfy the unchanged strict assertion or authorize shrinking the body or weakening the gate.

Minimum repair surface to investigate is actual complete-route body fit and consistent portal screening using the same validator. Preserve directed source geometry, scale, route budgets and seed order. Do not declare a legal whole route from safe halt positions alone.

## R178-2 — New small vehicle spawns inside an existing bus

The unchanged `test/vehicle-spacing.test.ts:113` fails. Its bound is120 vehicles,0 pedestrians,seed0x5b1b0a,1,200 ticks at1/60s, sampling every5 ticks. The test prints only its first5 failures. The retained replay finds19 sampled same-direction overlaps across4 distinct pairs.

Three pairs first overlap on the smaller body's activation tick. At181, bus#2/kei#16 overlap0.8587374809m, and bus#28/kei#104 overlap0.9445075592m. At301, bus#9/kei#78 overlap0.9648844278m. Kei#16 and#78 remain at route distance0, speed0; kei#104 captures its existing halt at0.4177462245m. Their preceding tick records show inactive incoming keis. Complete actor, generation, route edge IDs/starts, source distance, source pose, published float32 pose/yaw/scale, actual authority footprint and commitment records are retained.

`tick.ts`'s existing `spawnClearance` computes `2 * incomingRadius + stopGap + HALT_CAPTURE_M` for every other body. It ignores the other body's size. This source is unchanged from the pinned baseline. A kei can therefore clear that origin-distance test while intersecting the longer bus already present. The subsequent car-following path cannot undo an invalid materialization; it keeps the new kei stationary while the bus moves away. No observed ±1 lane shift is needed for these witnesses.

Minimum repair surface is the entrance/body-clearance contract for heterogeneous actual bodies, including pending bodies and the bounded same-tick halt capture. Do not alter IDM or body definitions to conceal invalid placement. This handoff does not prescribe an unreviewed broad collision solver.

## R178-3 — Turning body reaches a physical neighbour on another edge

At tick653 bus#49 and stationary kei#0 have no box overlap. At654 the bus advances from20.3802203307m to20.4422763095m at3.7233586m/s and turns into the kei; overlap is0.5159478757m with headings15.62578 degrees apart. At655 overlap is1.2582316532m. Bus edge is `turn:lane:520446644:1:0:ground0:r:0>lane:520446643:0:0:ground0:r:0`, occurrence5; kei edge is `lane:520446643:0:0:ground0:f:0:section0`, occurrence0 at7.7706038960m, speed0. Bus holds `priority:node:5072661379`; kei occupies none of that owner throughout retained648–656 samples. Both are already active. Inferred source lateral indices remain near0.

`vehicles.ts:buildVehicleFrame` gathers leaders by the same edge, then a next occurrence only for the same route object. These physical neighbours are on different edges/routes and are absent from that relation. The owner's permission does not cover collision with a body outside its junction. `diagnostic/fourth-pair.json` retains the exact transition. Minimum repair investigation is cross-edge physical body clearance during actual turning, together with actual route body fit. The trace establishes the missing physical neighbour; it does not prove a general safe correction, nor justify a new global pair solver. Review169's hypothetical lateral-shift issue remains separate.

The expanded every-tick diagnostic additionally retains brief pairs bus#9/kei#110 at781 and bus#14/kei#28 at1092 missed by the gate's every5tick cadence. These are disclosed counterevidence, not added acceptance demands or a claim of comprehensive collision coverage. Bus#9 is egressing in the former; its inferred centreline index is therefore not evidence of a lane change.

## Baseline differential and diagnostic bounds

`diagnostic/witness.mjs` reuses real population/authority, delivered network/fleet and existing independent pose-envelope metric helpers. It observes only; no simulation state or invariant is assigned. Current integrated windows were measured once, then repeated once with expanded activation/prior-frame/every-tick records needed to explain the failures. Both reproduce the gate's exact maximum and19 sampled overlaps. It is a focused diagnostic, not a substitute full gate.

Root approved one pinned baseline run of the same two20s CPU windows. `diagnostic/baseline-src` is a copy of primary src with only the5 integrated product paths replaced by exact Git bytes from6f8947789; the new halts file is absent there. Every replaced source was checked against preserved `../before-source` after LF normalization, and that preserved source's raw digest matches the integration receipt. Other copied source, all paths/resolutions, and hashes are in `diagnostic/baseline-source.json`. Current data and helper bytes are unchanged. The prior baseline yields max lane excess -0.38992709889417343m and zero sampled overlaps. These are newly exposed trajectories under the corrected planner, with an existing heterogeneous-spawn assumption; neither the source defect nor the baseline result permits dismissing the integrated failures.

Preparation attempts1 and2 refused before any baseline runtime: Git LF bytes differed from saved working-tree CRLF, then routes.ts proved to use mixed CRLF/LF. After two refusals, direct comparison established exactly730 CRLF among800 newline occurrences and LF-normalized byte equality. All failed logs/scripts/copies remain. The final copy uses exact Git bytes, without semantic alteration. A read-only Git lookup initially refused dubious ownership and was retried with only the per-command safe.directory setting; a non-escalated CIM read was denied and rerun with the authorized read scope. Neither changed product state.

## Instrument setup and partial visual evidence

The third full-suite failure was `test/visual-checkout.test.ts:85`. Its `mkdtemp(tmpdir())` fixture expected to live outside every Git checkout, while the owned TEMP was under primary artifacts. The wrong-premise output is retained in test.log. Root authorized only changing the execution TEMP/TMP to `C:/Users/38909/AppData/Local/Temp/maps-traffic-integration-178-20260927`; a Git probe confirmed no checkout. The exact unchanged case passed:1 selected,7 unselected; no other unit was rerun. `visual-checkout-corrected-temp.json` records the command and result. This correction is separate from the product failures and does not turn the full suite green.

Visual run `d03872268567082b` began before the coordinator's pause message arrived. Reset had deleted complete.json. The exact owned rootPID37896/creation09:50:45.323235-07:00 was terminated through a verified pinned handle, then the wrapper's finally cleanup completed. Appearance had begun and its renderer was hardwareRTX4090; the run is canceled, not passed or timed out. `visual-cancellation.json`, process-owner/cleanup, run logs, visual-phases and owned-run-receipt preserve the sequence. The phase record intentionally lacks a completed appearance exit because its parent chain was canceled. Lifecycle/end did not run and there is no fresh3-lifecycle or44-frame certificate.

Before any overwrite, `baseline-1db7c07cfccd9906` preserved the entire previous visual+dist:133 files,66,951,522bytes. `paused-visual` preserves the post-cancel mixture of old and fresh files. `paused-visual-roster.json` lists absolute native paths, hashes, dimensions and timestamps for119 files,57 PNGs,of which21 have timestamps at/after this run began. This is not a complete fresh44-frame set; no native visual critic is asked to accept it. `integrated-dist` retains the canceled run's4 build files. Neither old certificates nor stale frames certify this candidate.

## Final integrity and cleanup

Before/after bindings agree on source262 files, canonical+owned harness45 files, all117 served files, GPU/runtime and shared cache inventory. Source digest `122893a564bcd0134d58182084936882628bff2e692d9757d79840fe8fa4f74c`; harness digest `9683fd1f2d1acd3060a21f43a9f278a569ade279a2d1af889ffa43c7da9f7dda`; served digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c` for301,782,754bytes; integrated build digest `207c09715d137b4b04c187056c9e203b2ec803ffacf512c09290a0a9e8e84616`. File-level SHA256 records are retained.

Final independent process observation found zero retained survivors, zero unadmitted live children, zero scoped4319 processes and zero4319 listeners. Its completed:false and generic exception text arise from canceled exit-1, not a populated resource array. Foreign EdgePID29932 with creation2026-09-26T20:40:54.268535-07:00 remained unchanged. GPU lease was returned immediately after cleanup. Owned caches/TEMP were then removed after path validation;53 cachefiles and1,109 internal TEMPfiles plus the empty external TEMP directory are recorded in temporary-cleanup.json. Retained evidence/counterevidence is intentional and needed for repair handoff.

No supplemental browser was launched. Proposed later bounded traffic review, subject to root admission after repairs: reuse the existing read-only population/Orbit drivers with actual UI mouse/wheel/style controls, a fixed predeclared CPU-located portal/turn pose, `agents=1&pedestrians=0&vehicles=6&seed=5970698`,120 simulated seconds and fixed before/hold/release/egress native captures. Bind source/build/harness/served data and frame times and keep process ownership/finally cleanup. Standard agents0 appearance frames cannot establish traffic motion, and this small capture cannot establish full population capacity, floor contact or arbitrary crowd safety.

Required next step is a fresh repair owner for the three concrete exposure classes, exact-source independent review, then fresh integrated gates and final native review. Primary173 remains frozen. No acceptance, supported-driving, full-capacity or whole-crowd safety claim is made.
