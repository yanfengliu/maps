# 1491 final integrated train/grid review — 2026-10-18 UTC

Reviewer: /root/train1491_integrated_review. Root owns integration. This is the native supported independent review lane assigned by root; no reviewer CLI is claimed. The reviewer launches no test, build, browser, server or GPU process and writes only this designated ignored report.

Final verdict: PASS within the bounded train/grid milestone; source, five-gate evidence and 24 assigned native originals are reconciled. The earlier HOLD checkpoints below are retained chronology; the final section records their closure.

## Source checkpoint

Source verdict: no material finding in the current integrated candidate. Overall verdict remains HOLD until the sealed final PRIMARY gates, matched-cost evidence and assigned native originals are inspected. No merge/adoption approval is given at this checkpoint.

Target: PRIMARY HEAD ea98b89f0ae8286ce6c8ffa003a2816e201019b1 plus exactly 11 staged paths, 673 additions and 89 deletions. Independently read the actual staged source/tests and adjacent production control flow. All 13 paths listed by candidate4-f1-freeze.json match their literal SHA-256 pins, including the two unchanged visual specifications. Freeze SHA-256 d9c8061d3f73be8e70361ebbaf0b9f62bea7fd8701e563b6e17db86d3a6f53e8; primary-grid-integration.json records the copy and preserved earlier primary files. The candidate is unadopted at this checkpoint; 59fbb1c remains the adopted executable milestone.

The train uses admitted source chain 146060273, the pinned authored recipe and upward rail-head triangles. train-path.ts:52-58 refuses an in-AOI wheel point without the matching rail surface instead of falling back to terrain; outside-AOI authored continuation is clipped. train-schedule.ts:9-35 uses a continuous authored acceleration/cruise/braking/dwell/return function. rail-trains.ts constructs four 19.6 m bodies, separate bogies and wheels, three gangways and end-dependent lights; movement changes actor transforms, not source mesh positions. Actual model/contact and source-preservation tests exercise the loaded pinned packet, independently raycast rail and wheel geometry at four sampled times, run the shared loop through a complete schedule and check lifetime release. Those are finite CPU/contact bounds, not railway fidelity or whole-path continuous collision proof.

app.ts:289/334 wires the train into the ordinary admitted rail load and style consumers. app.ts:244 includes train movement in the stillness predicate. The train readiness callback checks disposal, scene load, city visibility and display-ready buildings; fixed steps advance its time and the frame callback interpolates the pose. Harness train readings are detached observations and expose no mutation. Source review outside changed hunks: src/render/loop.ts:147-162 performs fixed steps, frame callbacks and then the render; src/app.ts:272-278 takes ownership of resolved resources and immediately disposes late arrivals after shutdown; src/app.ts:440-448 stops the loop before disposing owned resources. I verified those lines in the current files, not only diff headers.

post.ts:158-181 keeps two inherited SSAA draws while moving, resizes their sample target to twice each native physical dimension and leaves the colour destination native. Installed SSAARenderPass.js:186-213 derives the projection from the supplied dimensions and :233-246 draws into its sample target before copying to writeBuffer; therefore the alternate size argument does not turn downstream AO/bloom/output into 2x passes. Installed TAARenderPass retains its 32-sample still path and native hold. post.ts:219-230 floors CSS size times DPR once, sets composer DPR to 1 and uses the resulting integers consistently. Resize validates before mutation and propagates native dimensions through composer, bloom metadata and temporal hold. The target-limit check and initial construction fallback name their failure; no silent lower-resolution grid was added.

The current post test reads actual installed composer/TAA/SSAA submissions and copy destinations under a renderer spy, covers odd sizes at DPR 1/2/1.25/1.5, still convergence, motion/history reset, target limits, resize and disposal. AO/bloom/output render bodies remain stubbed and this is explicitly documented. The earlier 1488 source/native repair report closes the old fractional-DPR finding on these matching source hashes; I did not rerun its tests or reread its five images. Format estimates remain distinct from actual GPU allocation and complete-frame cost.

The canonical plan remains under its 12 KiB budget, preserves all 35 stable implementation identities and all 14 original acceptance criteria as OPEN, and keeps train passage as one bounded visible milestone. No scope weakening or new general proof framework is needed. Final acceptance still needs full-map, temporal, population and performance work beyond this milestone. Historical rejected AA variants remain rejected; prior passes do not substitute for final integrated evidence.

## Final evidence and native review

PENDING. Assigned inspection: all 22 final Satellite originals (18 sweep, four hero) plus two actual Cartographic style-return originals, each at native 1280x720 and hash-bound. Another reviewer owns the 22 Cartographic originals. Required final cost/gates, actual real-control evidence, sparse motion limits and unavailable checks will be recorded here after receipt. No images have yet been accepted by this review.
## Matched-cost evidence checkpoint

Read the retained cost.json, run1/analysis.json summaries, protocol and post-cleanup.json. cost.json independently matches SHA-256 0a52ce3a87d33a94ceaef0a02bfc8766def4b43f678d49731607d2fd48596f02. The actual run used A-B-B-A, each with 30 s warmup and 20 s measurement, at 1920x1080/DPR1 on RTX 4090 ANGLE/D3D11, ordinary dusk Satellite seed 9137 with zero pedestrians and vehicles. The A build is the retained two-native-draw candidate and B is the repaired 2x grid. Cameras remain matched/stationary, B reports 3840x2160 sample targets and actual submitted viewport groups include that size; downstream groups stay native or below.

The four measured windows contain 4,806 advanced frames/fixed steps, all moving and nonaccumulating, with zero step-cap frames. Their mean RAF interval is about 16.666 ms, p95 at most 16.8 ms and maximum 16.8 ms. Median advance CPU time is A 3.6/2.6 ms and B 3.0/2.6 ms. These instrumented short-window observations support no material ordinary train pacing regression; they do not establish a speedup, GPU time or headroom. Each warmup also retained its 1,801 frames through moving, converging, cached and transition modes; root's accepted analysis includes the mode-change allocations rather than silently excluding warmup transitions.

GPU milliseconds, whole-process GPU allocation and headroom are UNAVAILABLE. Observer overhead is included and uncalibrated. The moving post format estimate rises from 470,691,000 to 819,055,800 bytes: +348,364,800 bytes, approximately 332.23 MiB. Resolved-depth/driver overhead and unrelated scene allocations remain outside that estimate. The full target of 3,000 pedestrians and 200 vehicles at 60 fps is unmeasured and remains OPEN.

The first composite post-cleanup check refused before TEMP deletion and did not persist its individual cause; those component facts remain UNKNOWN. The later separate fresh census reports no owned survivors or marked processes, port 4319 clear, and removal of the exact nonlinked external TEMP. A later positive cleanup does not reconstruct the first refusal. No run was repeated by this reviewer.


## Completed native appearance inspection; final certificate pending

Inspected all 24 assigned originals at native 1280x720 with original-detail image reads, at most three per call: the six azimuths at plaza 45 m, block 220 m and overhead 950 m, four dusk/noon crossing/approach heroes, and both actual Cartographic style-return originals. Every file's PNG header and SHA-256 were read before inspection. All 18 Satellite sweep hashes match their current manifest; the four hero and two return hashes match hero.json. A first read-only PNG-size query used an unsupported PowerShell/.NET Span argument and failed; the corrected explicit PNG-header read established all 24 dimensions. No product/gate was rerun for that readback correction.

Native verdict: no material appearance finding for this integrated increment in the assigned originals. Crossing stripes remain distinct through oblique views, paving joints and tactile bands remain visible, sign lettering and the storefront shelves retain detail, and foreground tree silhouettes remain readable. Block and overhead views preserve identifiable roofs, railway lines and building silhouettes without blank swathes, obvious resolve ringing or a broad blur across the scene. Dusk/noon lighting remains distinct. This is a present-frame assessment, not a fresh quantitative A/B claim against uninspected historical images.

The image set has explicit visibility limits: block-az060 is substantially occluded by a nearby blue facade; plaza-az180 looks from inside/through the authored frontage. These frames establish only their visible areas, not unobstructed coverage. Some underlying facades remain soft/textured surfaces and the broad city remains sparsely populated; full-map finish and population acceptance remain OPEN. No new camera rescue or scene alteration is requested by this milestone review.

The Cartographic return originals restore their designed palette and window geometry with the same framing as the preceding Satellite approach. hero.json records identical camera vectors and target before/after each return, frames advancing 1042 to 1072 at dusk and 1112 to 1153 at noon, ready true, error null and no context loss. tools/visual/hero.spec.ts:193-205 exercises actual pointer and keyboard dropdown paths; :345-365 checks document/camera/geometry preservation. These fresh records do not contain train-time observations; independent targeted report1474 retains actual style-switch train-progress evidence on the unchanged nine train paths, and the current app/component tests exercise style continuity.

The current run is cd4c31e67246bd8f, started 2026-10-18T00:23:57.717Z, on RTX4090/616.64. run.json binds scene digest 288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62 (156 files / 364,187,965 bytes), harness digest 78b2c9bffa0ee72da64e0ff5f407467e952687d54d52882b53b8732afe662467, and runtime index JS 0caa847d583c102953e641067325b1920b032f08aa46bad5dd44fa581a0c2da6. Final certificate equality and all five gate results remain pending at this checkpoint.

This static sweep does not prove continuous train motion, absence of flicker/crawl, wheel contact in pixels or continuous clearance. Historical train review1474 inspected 29 native train originals with east gaps 1.896–2.085 s and oblique gaps 1.436–1.513 s; state brackets span 0.3666–0.6000 simulated seconds. It found a recognizable connected train and sampled deceleration/dwell/reversal, while preserving occlusion and contact limits. That record is retained evidence, not a claim that this reviewer watched continuous motion. Current CPU tread/rail checks remain samples at 0/2/4/6 seconds; the complete schedule check adds no continuous collision proof.

| Inspected native original | SHA-256 |
| --- | --- |
| hero/hero-satellite-dusk-approach.png | 7143353642dd2bb87c34bcb3c999b3721e35e7feb19025e8acd5522fc92aa55a |
| hero/hero-satellite-dusk-crossing.png | da1fa8753b554a366f8430ba8bdb006348125dcc105dca9df57ccc7c0ba6d927 |
| hero/hero-satellite-noon-approach.png | 14b1bf51d9dfff2a34638ca97f755f114d00636dd6147b0e33ff825f1f8163b0 |
| hero/hero-satellite-noon-crossing.png | d8f85b784f2f521745a9f6ffbc28203593085f027be567bc37691f7568326d89 |
| sweep/satellite/block-az000.png | e2de4bf3c46cf53662cf039fb9e8b9fb404ac080a013797dfe5d19b1188de6d4 |
| sweep/satellite/block-az060.png | 5013c716c594cdffe4859f7b1cd7bf0407353532e9dd3600a992f656b8d04e8b |
| sweep/satellite/block-az120.png | 1a5d07dc92b4d0f31db12d5c1c1d2b2039b9ebda03a6a9683a9173b2b9f69768 |
| sweep/satellite/block-az180.png | 0e94d3091ea97ca3f8f59b354b6f939ed4499d086eecc77511762000125dc374 |
| sweep/satellite/block-az240.png | f280bab5dc2cd038369842c1b16af68171f78dcc9fafef0200bd2825586bf150 |
| sweep/satellite/block-az300.png | 247f8ba2b4e22a6466d4b14681aebb68c2b06b0212498752b23d93c5cab8eda8 |
| sweep/satellite/overhead-az000.png | d548a76d80b3d2c54ac0e26d09da45ccf0d0dbb9b5d2d8c88d9d88d7b094a9b6 |
| sweep/satellite/overhead-az060.png | 14fd1782757ab84efae8c639e94fc0001f5a013b7094d0ebc67730c32616baab |
| sweep/satellite/overhead-az120.png | 569c834138fd86c5de45ee9a413f4246f3cf6e8dd66fb37b082e72fc14648d6e |
| sweep/satellite/overhead-az180.png | 62c5ecaf6d811116c4e2c54f2ab169f452427a783a8bd0830e1d0627f05d9db8 |
| sweep/satellite/overhead-az240.png | 5c4de17f506a11bb71e146bea06b127377b51da3464468479b8e43c8e688dd58 |
| sweep/satellite/overhead-az300.png | 54c400a528cf0e3ae6a13d17b1ace69076a36a38e161feb0c5ac1e565e9d1657 |
| sweep/satellite/plaza-az000.png | 7bc5243cc947167a26f2ef2266a34dd70ff129034170c736a35f40eda452a2b9 |
| sweep/satellite/plaza-az060.png | 758285167b6965edf46f8f24af54cbd99d1bb56bd45883b0274e393ad7122469 |
| sweep/satellite/plaza-az120.png | baa10290204890c9d9a9ffe080ec6a8a062b556255ffb5261eb0f16c5bc7a9de |
| sweep/satellite/plaza-az180.png | b7c5770af09e24d1bb9a243037ceae71f271162492b6d73e88751e8317ae4d69 |
| sweep/satellite/plaza-az240.png | a74f0587080727c7dfec5b18a024c7a99f316e489862789954f8d0bff53d3b44 |
| sweep/satellite/plaza-az300.png | 79874cf92012e0e4ae99243c1548240b9f8f2631027c71342f7c5269dd7396d9 |
| style-return/return-cartographic-dusk.png | 57b1681d992a839b229629b1cb12b3c3ccd355c786a2a338cb3e467e3981fc1f |
| style-return/return-cartographic-noon.png | e1f0e8f03fbc1b0f8283155560ff954aa1ac030f58bff16390add4aa9b3ead38 |

## Final integrated verdict — PASS within this milestone

No material source or assigned native-appearance finding remains. The 11 staged changes are suitable for root integration on main as the bounded ordinary four-car train plus current-pose grid increment. This is review approval of the exact uncommitted PRIMARY candidate over ea98b89f0ae8286ce6c8ffa003a2816e201019b1, not a claim that it has already been committed, merged or pushed. Root still owns that integration, remote-gate readback and isolated-worktree retirement. Full Shibuya acceptance remains OPEN.

I read final-seal.json and 1490's authored gate report. Final-seal SHA-256 independently matches e9820692c53b408982b12d80fe8e7a5575f14d573aa3495e55216ba410eaa7f7. complete.json independently matches 5df98f855fb1532382fe58a5944e7dfc5386a293fe11255f2fa1955239804135 and run cd4c31e67246bd8f. Reconciliation of the 22 assigned certified frame entries plus the two hero.json style-return entries is bijective and exactly equal to all 24 pre-inspection file/hash pairs above. All 13 candidate source/tool pins still match; the staged diff remains exactly 11 paths, 673 additions/89 deletions. The final worker's 679-input freeze reports zero changed rows. Protected user-owned inputs remain matched.

The actual PRIMARY five-gate result is PASS: build 5.498 s, types 8.794 s, unit 87.396 s (136 files / 1,187 tests, inner Vitest 84.53 s), visual 323.173 s and audit 4.150 s; total 429.011 s. No final public gate failed or was skipped. Audit passes its high-severity threshold with two existing moderate advisories and no dependency change. I did not independently rerun those gates; their actual sealed records, current output bytes and source binding were read.

The final certificate binds all 44 certified frames, the same four dist runtime artifact hashes, the 156-file runtime cache and the 25-file harness named above. I independently hash-matched all four current PRIMARY runtime artifacts to the certified build and to the cost B dist. The certificate contains three completed RTX4090/616.64 hardware lifecycle records with no console/page errors; navigation 355/223/208 ms and replacement 22,293/19,173/17,957 ms stay within the published bounds. These lifecycle records establish the exercised teardown path, not every possible allocation or failure path.

Final-process-census.json reports 99 recorded process identities checked, zero exact survivors, zero task markers, zero port4319 listeners and all five external TEMP paths absent. I launched no browser, server, GUI or runtime process and own no such remaining resource. Only this report was written. Existing supervisors retain their known sampling bound for never-observed descendants; no historical PID authorizes a kill.

Unavailable or unperformed acceptance remains explicit: remote CI NOT RUN before root's code commit; no GPU-millisecond, headroom or actual whole-process GPU-memory measurement; no continuous-motion/flicker, complete train clearance or populated 3,000/200 performance acceptance; no new detailed Cartographic acceptance. The separate fresh reviewer owns the 22 Cartographic certified originals. All 35 implementation identities and 14 original criteria remain in the canonical plan; this review closes none of them as full-deliverable acceptance. The cost cleanup's first unresolved composite-refusal cause and later successful cleanup remain recorded above; no failure was relabeled as a historical pass.
