# 1429 — Repaired mounted-light integrated review: PASS within the east pilot bound

2026-10-17. Independent reviewer: native agent /root/review1428_integrated, continuing the focused repair review after the preserved fresh-context round 1428. Reviewed primary C:/Users/38909/Documents/github/maps at base b1e4dcf3eb77a79468b3adfe8cb42de94e70b61b plus the exact frozen repaired candidate. This is a read-only source and evidence review; root remains integration and acceptance owner.

## Verdict

**PASS for this finite east mounted-light pilot. No material finding remains open in the reviewed increment.** The repaired ownership path resolves 1428-F1. Actual repaired primary build, types, 128-file/1,158-test unit suite, hardware visual gate and audit all pass. I inspected all 44 newly certified original frames individually at native 1280×720, including all 22 Satellite and all 22 Cartographic frames, and the two style-return originals. I independently rehashed their bytes, all four built files, the served data tree and the harness tree against fresh run 1e16ff12e503f2d2. I read the three actual completed hardware lifecycle records and their matching build/renderer bindings.

The product acceptance is one source-supported opaque east housing, hood and recessed warm lens, zero noon power, and a small bounded dusk response on the actual sidewalk that remains legible from a nearby held-out angle. The local close view resolves the mount. There is no observed roof/rear leak in the retained visible coverage. This is a 60 cd ceiling, 6 m range, unshadowed light with no general occlusion guarantee. Distributed dusk lighting, whole-Shibuya quality, populated motion, actor contact and FPS remain unaccepted. All 14 final deliverable criteria remain OPEN.

Initial HOLD report 1428 is preserved unchanged at docs/work/0_shibuya-1km/reviews/1428_mounted-light-integrated-hold-review.md and its ignored original; both are 17,227 bytes with SHA-256 af51ab91c2b81ca852af6f34b450cba6b256b587c5a7af0f2cda4bce91b726c1. This report resolves that finding with new evidence rather than rewriting the failed round. Main commit/push and worker-tree retirement are root's remaining integration actions, not actions performed by this reviewer.

## Reviewer independence and scope

I read AGENTS.md, docs/policies/local-rules.md, the compact plan, lessons and the canonical ../fleet/docs/skills/multi-cli-review.md, then the actual changed source/tests, their production callers and the actual artifacts. The canonical runbook supplies the review requirements. Root confirmed its accepted native spawn controls: model gpt-6-astra, reasoning_effort xhigh, fork_turns none. This is a native subagent session, not a CLI review. There is no independent runtime-model telemetry, CLI version or modelUsage transcript to attest. I attest those configured spawn controls as confirmed by root, and my own source/evidence/image reads.

I launched no browser, server, GUI, GPU lane, network call, CLI reviewer or subagent. The primary code was frozen while I read it, so read-only primary access was the agreed safe exception to a separate worktree. I made no source/test/tracked-document changes. This authored ignored report is the only write in this follow-up round. Command-scoped Git safe.directory was used for read access after the ownership refusal; no global Git configuration changed. No reviewer-owned runtime process or temporary server exists to clean up. Protected test/facade-emission.test.ts retains its exact user-supplied raw digest; the old 991 snapshots were untouched.

## Exact final source and repair disposition

The repaired freeze at artifacts/peripheral-lighting1426/repair-freeze.json is 5,615 bytes, SHA-256 d9f7409b06ac47927b1fbf0ada21449b5c4aff28512389b5b57b671e068dd27f. The actual primary-repair-integration.json is SHA-256 77606aa9ccd8ebc268c89fe1b434a7b9329bf64f7e48bcddbdfa38d32c33ac64 and records exact integration at 2026-10-17T11:41:26.953Z. I independently read and hashed the actual final files, rather than treating that receipt or the implementation report as proof. Every row below matched at the end-of-review byte check, 2026-10-17T11:56:20.015Z.

| Path | Raw SHA-256 |
| --- | --- |
| src/scene/facade-textures.ts | df36fc2e3d1d1decf68151df861637720f129b54bd2b1ff8360347e7f84d86d4 |
| src/scene/tile-transaction.ts | 749a4adc3044fa53fa9ea36d35a28ccf470e9bd871262a148cac22d786a2c06f |
| src/scene/peripheral-mounted-light.ts | aef4dd8ccdeba3b2fac12f346e2ce39654d183d5672f0737a7031d40a3d39135 |
| test/peripheral-mounted-light.test.ts | ed1a6cd7a895784d20b69b62d1cc17cd328b3f5535d90173d54b16f103c312dd |
| docs/work/0_shibuya-1km/reviews/1426_peripheral-mounted-light-implementation.md | 886b9cb8644e13156cd53eb5f45f2a6b24b4429f5eee68d95d7b41c4c1bae147 |
| src/scene/peripheral-mounted-light-recipe.ts | 37f8e7346aa8035d6a8193eff5ec4794691360367a45389ee834939934c18db7 |
| test/facade-emission.test.ts | 48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a |

**1428-F1 resolved: GPU-only release now retains the fitting, while true logical release owns removal.** The actual outside-hunk caller remains node_modules/3d-tiles-renderer/src/three/plugins/UnloadTilesPlugin.js:160–192. It traverses the retained scene and calls material.dispose() at line 171, followed by texture and geometry GPU disposal, for later reupload. Original fitting listeners synchronously shortened the traversed child array and also discarded retained-model state. That caused the observed undefined.traverse error. Deferring the old detach into a microtask would still have lost the fitting on return; the current fix does not do that.

Current src/scene/peripheral-mounted-light.ts:57–61 requires the logical lifetime owner before allocating the fitting. Lines 97–100 register an idempotent detach with that owner and attach the group. The two material-dispose listeners are gone. The actual plugin passes its lifetime at src/scene/facade-textures.ts:280; the optional interface hook is at line 97. src/scene/tile-transaction.ts:14–15 stores cleanup callbacks, and line 44 deletes each callback before calling it at true release. Thus GPU-only dispose has no authored child-removal effect, and final release removes the group/light/target, disposes the light once, and clears prepared/active ownership.

I inspected the actual asynchronous transaction, not only the new callback. src/scene/tile-transaction.ts:63–89 stages each parse privately, awaits parse/work, captures the completed resource union before successful transfer, and captures again in the finally path before rejection/cancellation release. The semantic release occurs after that work has settled. Lines 91–99 release the transferred owner before delegating visibility/metadata cleanup to the installed renderer and clear its resource arrays to avoid repeating owned disposal. This ordering means the authored meshes are already in the owned resource union when detach removes them. Current registration cannot arrive after its owner was released along this awaited production path. Old and replacement parses retain separate owners. The change adds no scheduler or new framework.

The new test at test/peripheral-mounted-light.test.ts:123–160 invokes the installed UnloadTilesPlugin.unloadTileFromGPU, uses actual installed TilesRenderer.setTileVisible for two hide/unload/return cycles, and checks retained group children, source arrays, light/target identity, no premature light disposal, 60→0→60 power, and exactly-once final logical light cleanup. Four mesh resources have three disposal events each: two GPU releases and one logical release. Existing cancellation, rejection, transfer and replacement cases at lines 89–121 retain their once-per-logical-owner resource checks. They cover actual decoded source through the production facade plugin; mocked image pixels/worker transport and the test transaction adapter bound this CPU regression. It is not a hardware upload measurement.

The actual negative receipt artifacts/peripheral-lighting1426/gpu-unload-old-red.log has SHA-256 8b9ca4714e7475d5112e97c23ba04afc79885181486c00aac019bfeeb436ccb5 and reproduces the exact old undefined.traverse error through the installed method. It reports one filtered failing test and five intentionally skipped by the filter. The final repaired focused log gpu-unload-fixed-green-final.log has SHA-256 23488eafe6f629a882585416feb305085593f66293cbd69f76ebeb10edadd673 and reports all six cases green in 1.09 s. The repaired full unit suite also includes all six. The fresh canonical sweep now finishes the same camera-driven lane that previously failed, and all three hardware replacement/navigation lifecycles finish without errors. Together these resolve the concrete failure class. The canonical record does not separately instrument this fitting's GPU reupload pixels, so I do not claim that narrower hardware measurement exists.

The failed original run d99c403d3c01bf82 remains historical evidence. Its durable retained trace artifacts/peripheral-lighting1426/failed-canonical-d99c403d/trace.zip is 292,600,252 bytes, SHA-256 afdfe8216aa2541bc97c27dfa3870bbfe3c5b282a240ad034b05eac313f5a244. The report and installed-plugin stack in 1428 identify the exact production call path. I did not accept that failed run or old run59b500b75a1abf60 as current evidence.

## Source, receiver and integration acceptance

The finite fetch integration in facade-textures.ts:176–188 shares the ordinary tile request and retains only admitted digests; it does not launch another data acquisition path. Source preparation occurs before atlas rebuilding at line 219; addition follows the established material processing at line 280. The reviewed source is data/data498.b3dm, SHA-256 979ab194aa165391e058e1b3b0b3b37ea5c3d64dfc5f5353e61922f9c97ead55, GML bldg_07a23c05-99d6-439c-bd98-f0f873f8a470, batch 0, source face 10631 with indices 31893–31895. The move from the earlier invisible data502 trial to this actual visible data498 face is intentional and remains explicit.

peripheral-mounted-light.ts:18–54 validates source digest/GML, original UV0 orientation, photographic primitive, source position/normal/index/UV, the installed parser transform and outward winding. The four 0.60×0.18 m back-contact corners are constrained inside one source triangle; because both shapes are convex, this establishes the complete planar back footprint rather than only the center. The source position/normal/UV arrays are not modified by the fitting. Added geometry carries the source batch ID for downstream cutout membership.

The receiver is actual served pavement face 263078, SHA-256 841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6. Its checked centroid is approximately (395.3310750,25.6900412,38.5518532), about 3.49 m below the mount at (392.9611685,29.1802076,36.7992136). The outside-hunk receiving path is src/scene/roads.ts:48 and 72–76, which loads SCENE_FILES.pavements and constructs roads:plateau-semantic-pavement with the sidewalk material. This is rendered receiving geometry, not an unattached target point.

Additional outside-hunk production review includes src/scene/buildings.ts:251 and 296–335: the actual transaction wraps the awaited facade hook before clipCityRoot and buildingSections. src/scene/cutout-sections.ts:159–184 uses the authored positions and batch membership. src/app.ts:159 and 427–436 supplies and updates the shared signage/style uniforms; the getters in the fitting follow those objects without a new frame callback. Duplicate attachment to one active scene is suppressed. Release clears the weak-map state, so later replacement is a new owned fitting.

The geometry is 62 triangles and 5,208 bytes, two beauty meshes, no new image texture. It includes an opaque back, 0.22 m hood, side returns, front brow and recessed lens. One unshadowed SpotLight has range 6 m, cone half-angle 0.50 rad, penumbra 0.65, decay 2 and a 60 cd ceiling. The existing dusk input 1.8770707611978186 yields about 52.20 cd. Noon input 0.05 and Cartographic style each give exactly zero. The source photographic wall, glazing and signs remain in place. There is no exposure/bloom change, no population/rail/source/LOD disable switch and no hidden camera-specific render branch in this change.

The AGENTS.md cached-source paragraph names exactly the new data498 and pavement pins, preparation/restoration requirement, and fail-without-fetch-or-skip behavior. It agrees with the tests and does not add a product acceptance claim. The current defect-register entry records the observed crash, actual installed-path cause, old red/new green check and fresh hardware bounds. The compact plan continues to leave all 14 final criteria open. Root's progress edits are documentation state; they do not alter the frozen product bytes.

## Appearance evidence and its transfer through the repair

Round 1428 individually inspected 17 originals: all 12 candidate3-final app stills, two matched baseline3-front stills, two supplemental candidate2 oblique stills and the source photograph field. Their complete native hash index remains in the immutable 1428 report. I rehashed all 17 at final review and found zero mismatch. They remain the local product evidence.

I independently checked the repair's appearance-preservation claim. Reversing only its documented lifetime type/argument/guard/callback/comment changes reproduces the entire original module byte-for-byte, raw SHA-256 376ef61045b775e18883dedc5b945e1a1293f05e456e3292e37a98369a9646c6. The complete construction block from group creation through metadata before detach is byte-identical, SHA-256 f327a8163b82a08b266f93c8efef6723e3ec59aa7e64f87bb3e70a21a9c436db. The recipe is also byte-identical. Facade integration changes only the lifetime argument/interface for this repair; the three-line transaction callback addition changes release semantics. Thus the original local static appearance judgment transfers to this repair. Original local capture runtime hashes are not falsely represented as hashes of the repaired runtime: the new build is bound separately below.

Matched noon front shows a small dark physical fitting without added emission or sidewalk power. Close noon resolves the body/hood and narrow recessed lens. Close dusk resolves that lens inside the opaque housing, while most pavement is outside the close frame. The matched dusk front shows the new narrow warm response on the actual far sidewalk below the fitting. The larger warm pool at the left already exists in the baseline and is not attributed to this lamp. The nearby held-out seed142617 view retains the fitting and its small receiver response. The block view gives only a tiny localized patch. These support a modest local mounted source, not an illuminated corridor.

The rear/roof pair shows no new warm spill in visible surfaces, but the fitting/contact are occluded; it does not establish mount support. Default aerial views do not resolve the fitting and show only contextual continuity. The supplemental oblique pair is less decisive for receiver separation because of perspective and the pre-existing road pool. Source glazing and the photographic dark lower band survive. The broader wall remains photographically soft and flat at close range; that is an existing product limitation, not solved by the lamp.

The retained candidate3-final capture.json is SHA-256 b17af6ad2ab2cad1ff846239ff850b0608fc8ee5c53f9277285d6247bc70fe93. Its actual source/build/cache before/after lists, real OrbitDriver mouse/wheel/keyboard input, ordinary noon/dusk URLs, renderer/style inputs, errors and closure records were read in 1428. No source edit occurred during its capture. Baseline and candidate front dusk poses are identical; noon differs by only 1.35e-13 m, with matched lighting inputs. Front position is approximately (415.4586568,29.4354430,53.4223425), target (365,15.2,15), azimuth 0.92, polar 1.35, distance 65. Held-out position is (414.7866701,30.0905336,55.7929237), target (370.0305260,15.2,18.7097771), azimuth 0.8788817756, polar 1.3199998945, distance 60.0000015651. The close view is reached by ordinary controls. All 156 current served data files still match that capture's data, independently confirmed by the fresh tree digest.

The two candidate2 oblique views transfer only within their documented unused mount.depth metadata correction 0.16→0.22; candidate3 captured the corrected recipe. Local style input exercised Satellite→Cartographic by pointer and back by keyboard End without moving the camera. Its page errors are empty and page/context/browser/server/esbuild closure flags true. Default population state is unchanged and makes no crowd claim.

## Fresh canonical appearance judgment

I opened every one of the 44 certified originals at its own 1280×720 resolution with view_image detail original, then the two style-return originals. No contact sheet, thumbnail or certificate-only inference substituted for the visual review. The 46 newly inspected hashes are listed below; this session has inspected 63 distinct originals across the preserved initial local review and this repaired canonical review.

The Satellite heroes retain crossing signs, the occupied corner and the ordinary noon/dusk distinction. The full 18 Satellite sweep frames keep the crossing, streets, neighboring buildings and rail corridor rendered. No new missing-scene defect or visible light spill appeared. The Cartographic heroes and all 18 Cartographic sweep frames retain their procedural facade style, streets, buildings and rail; I saw no new shared rendering regression. All six overhead directions in each style preserve the dense urban cutout and rail corridor. These wide views do not resolve the remote fitting.

Occlusion is material to what these images establish: the plaza-az180 view is within the occupied corner/bay, block-az060 has a nearby tower occupying much of the view, and block-az120/180 are substantially screened by roofs/buildings. They are not proof of the east mount's support or a clear exterior line of sight. This is not a camera-clearance acceptance. The dedicated local front/close/held-out evidence above supplies the lamp judgment.

Both return-cartographic images remain rendered after the real style return, at the same approach pose as their pre-switch Satellite snapshots. The before/after camera objects compare exactly at each time: about (149.032274,78.277396,149.032274), target (0,15.2,0), distance 219.999989 m. Fresh hero metadata names hardware rendering and the same expected common exposure per time/style. Neither it nor the source diff introduces a global exposure/bloom workaround. These static images do not establish temporal stability, crowd quality, 60 fps or arbitrary camera behavior.

## Actual final gates and certified bytes

I read the actual repaired logs under artifacts/peripheral-lighting1426/integrated-gates/repaired/ and actual wrapper receipts under artifacts/commercial-corner-20261014/canonical-gate/mounted1426-repaired/. No required final local gate is skipped or unavailable.

| Gate | Actual result and bound |
| --- | --- |
| Build | PASS; wrapper elapsed 2.405 s, Vite build 1.87 s. Existing >500 kB chunk warning remains. |
| Types | PASS; tsc --noEmit, elapsed 5.143 s. |
| Unit | PASS, 128 files / 1,158 tests, Vitest 82.31 s, command 83.154 s. Includes six fitting cases and existing retained-fixture/source checks. |
| Visual | PASS, command 287.676 s; four appearance/picker tests and three hardware lifecycle repetitions. Fresh 44-frame certificate, independently inspected here. |
| Audit | PASS at the existing high threshold, elapsed 2.013 s; two moderate advisories remain in @vitest/mocker/vitest. No dependency change or forced audit fix is included. |

The exact build.log/typecheck.log/unit.log/audit.log SHA-256 values are respectively 439db44205436d5b50dcf13f691325336c2087c70789c5ed4d321832b73e208a, 574b2f9210f83ac061111bf950243610b0796763c946914ead368d160605c90c, 1ad26d80aa79e7a207c891ff16b3f5695a19ac94753f9c481e2fabe60fc9869b and 7077929bbb1d70f0ab3cdfc28fbed024cd295e26d05e8b3a3868cfbcec119dbc. The canonical run.log is SHA-256 bde054c5240a5b9d5e32f1dd881d67dd97d12e45fb8ca6e2b3a0a41aa9f1d145. run-result.json is SHA-256 59287a34dfea7a4dbc174ce4dee50a438e1ae0dfa7b6fb78600fda56a40e7174, exit 0 with certificate and no failure. These actual logs replace the failed round's incomplete gate result.

Fresh artifacts/visual/complete.json is 9,808 bytes, SHA-256 83e062c48a8ae2e8b11243fcf7018bcb696b6700b83b86612d0fd79dd5db2cc5. Run 1e16ff12e503f2d2 began 2026-10-17T11:44:19.416Z, completed 11:49:01.752Z and certified 11:49:01.821Z. Hardware is NVIDIA GeForce RTX 4090, driver 616.64 from nvidia-smi. Pixel and lifecycle renderer strings both equal ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11).

I independently recomputed the current served scene digest over all 156 files / 364,187,965 bytes under /scene/, /network/ and /rail-trial/: 288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62. I independently recomputed the harness digest over all 25 files / 224,465 bytes: 78b2c9bffa0ee72da64e0ff5f407467e952687d54d52882b53b8732afe662467. Both exactly match the fresh certificate. Recomputed image SHA-256, PNG dimensions and file timestamps match all 44 unique expected frames; every image timestamp lies inside this run. Both additional return images match their fresh hero metadata. All four current built files match:

| Built file | SHA-256 |
| --- | --- |
| dist/index.html | 94c8d4c734b060cc054ececb733b316c93b0850e49c72f56848dfdce956f290b |
| dist/assets/index-dvQKBZaf.css | 11dd032c51b536a500e2265a9acdcdda9070f73e6c0a8f31e75b6ad5ab7ba929 |
| dist/assets/index-tcr6CDpd.js | 0da87a3219ee69c39472d063d8c2c3c10c216e28b1fb7eb862f9f7178e9d3c77 |
| dist/assets/local-walk-prototype-DUwxPc14.js | f37d3d594698806132700ae546d48d01df81241c422bc5a20b1906b04abe97da |

I read the three actual lifecycle JSON files listed below, not only their summary in complete.json. All have /?time=noon, the same four build hashes and renderer, times within this run, empty consoleAndPageErrors and teardownRecord completed. Navigation is below 15 s and replacement below 60 s in every record. Preparation times are 32,582 / 30,764 / 31,933 ms. These records establish the tested navigation/replacement cleanup on this hardware, not general driver coverage or a population performance budget.

| Actual lifecycle record | Navigation ms | Replacement ms | SHA-256 |
| --- | --- | --- | --- |
| artifacts/visual/lifecycle/lifecycle-2026-10-17T11-46-30-661Z.json | 210 | 16561 | 1db6b03173d747504a9db1d6a6ed366e3009a3a3f7b1935034480ccdda8d1dc9 |
| artifacts/visual/lifecycle/lifecycle-2026-10-17T11-47-21-461Z.json | 235 | 17089 | e062d9f1ff44d9f1cb13775bb92db5729b64ef6177b51aea476808163e25dcbe |
| artifacts/visual/lifecycle/lifecycle-2026-10-17T11-48-10-923Z.json | 220 | 15643 | 07faffa0ae1c46a5b23922a7603d5b9e2b583b147444bd0bc297e5e749dd43f5 |

Actual process-cleanup.json is SHA-256 7f050c8d0763641c54b7241c84a57a2210b37db1054bd1e376e5b6b4ecab2472. It reports 45 retained identities, a clear final census, no remaining known/omitted/unclassified edges, no port4319 listener, removed owned TEMP, no timeout and exit 0. The later targeted final-resources.json at 11:49:47.595Z is SHA-256 a4f60b423e677cfef662435082aa55e85c2ead8fbf81a4c4e9aac20573f2ab98; it confirms no remaining exact identities, no recorded ports4319/4324/5319 and no owned TEMP. I accept its stated identity/census bound, not an unobserved claim about every process on the machine. This reviewer launched none.

## Product direction

**CONTINUE.** Adopt this finite supported east pilot once root completes its normal main integration. The one next useful product outcome is one source-bound peripheral storefront bay whose frame, recess and glazing depth read at street and block distance. The overall native scene still shows flat photographic peripheral facades; that visible weakness is a stronger next product target than additional reporting, profiling or proof machinery. This does not enlarge the current increment into distributed dusk or close any full-Shibuya final criterion.

## Native inspected-byte index for the fresh run

Paths are relative to artifacts/visual/. Every row was individually opened at native resolution, then independently hashed from its actual bytes. Rows 1–44 are exactly the certified set; rows 45–46 are the actual style-return originals. The prior 17-byte index and observations remain in the unchanged 1428 report and were rehashed without re-opening unchanged images merely to duplicate coverage.

| # | Original | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| 1 | hero/hero-satellite-dusk-crossing.png | 1280×720 | 412eb28515a69e4b762532d78b5ac114fcc762c16856231661d7f26641d036b3 |
| 2 | hero/hero-satellite-dusk-approach.png | 1280×720 | 033984001123c9932367692d2ca9e8037ca99096ddb6fa8fd3398dd3427f257c |
| 3 | hero/hero-satellite-noon-crossing.png | 1280×720 | 35fb41a7dc5c3c42c8d70b1789a671d454289776f2cc4392f6bac68d415b9c28 |
| 4 | hero/hero-satellite-noon-approach.png | 1280×720 | 0a6a1c9da8d25922c90799975f21ba707519ee5398d0bf66fff5274935b879fe |
| 5 | hero/hero-cartographic-dusk-crossing.png | 1280×720 | fa2128d4f34586da10e57626dd848c4e3dac55c996cb0b20bfdcd53e93ed3407 |
| 6 | hero/hero-cartographic-dusk-approach.png | 1280×720 | a8b7faab46cd0686b8c1268e6dc6b3c093e6af9105c6a4f7853f94f0eefe4243 |
| 7 | hero/hero-cartographic-noon-crossing.png | 1280×720 | f436cd63be1607dc485b8fc926c423a85e19a7d0ae7460e92dbf90707b80c47c |
| 8 | hero/hero-cartographic-noon-approach.png | 1280×720 | 12b902d0c0bef51696b6be837720ad41d2f6ebaac9b7499b8392b5ab85b68e6f |
| 9 | sweep/satellite/plaza-az000.png | 1280×720 | 911093a108c7762cc403c8831680e0bb548e894c01e9383eb4eb6cf5ca75dbe8 |
| 10 | sweep/satellite/plaza-az060.png | 1280×720 | 15bae0611fc377c5135fef073987b10486a7747d3eb00c2b23b123b117719580 |
| 11 | sweep/satellite/plaza-az120.png | 1280×720 | a41d400e581bef0ed569cdb1614060e5057fdea46fddd3300a690e4e0614fb61 |
| 12 | sweep/satellite/plaza-az180.png | 1280×720 | a8352a9d237389d42a90673345629c42d95b43c466e5b46174cfc5b75250b6e0 |
| 13 | sweep/satellite/plaza-az240.png | 1280×720 | 229aefa5146e9ec3578f72ce23550c02cedc728431a216ec98878dea4460074e |
| 14 | sweep/satellite/plaza-az300.png | 1280×720 | 97139ff46d5603ba1d59bd50dc6a2657e2fa258fc93188bb26f0a05b6360c889 |
| 15 | sweep/satellite/block-az000.png | 1280×720 | b0414bb8f4c9144a345a8f705cd7d4623d4b50e631cb4b28ec1161840f2e6a8b |
| 16 | sweep/satellite/block-az060.png | 1280×720 | f743b211e40ff67479ee58ba7c7d1a98a99ca83dfad30f33beade587daac67b1 |
| 17 | sweep/satellite/block-az120.png | 1280×720 | 7e5f3de5726075c9df6d8d6e0cee7ec707deaf97cf376f8b77c649273d015bed |
| 18 | sweep/satellite/block-az180.png | 1280×720 | ea8d740374e9498d5f7cb1d334766a3bbb19934d2064e9f1df785847b9dfc842 |
| 19 | sweep/satellite/block-az240.png | 1280×720 | b3865c8fe55d0143bddaffef69ebf3320ec098521295c7b2f33a29996ac38b7a |
| 20 | sweep/satellite/block-az300.png | 1280×720 | 87504d4730fa9f94faae4b99c738c734361850ffe8a2fe108dc6acd1d0399514 |
| 21 | sweep/satellite/overhead-az000.png | 1280×720 | 969fd19112087d7001868cb6cc36d912ede9d8bd49e224b5f67c8290146da4a0 |
| 22 | sweep/satellite/overhead-az060.png | 1280×720 | ab053837cdca03686027f7e4eb85c6e0d26acc121b18f0948bf3dfeaac79004a |
| 23 | sweep/satellite/overhead-az120.png | 1280×720 | e5c875a6a33afa1a28143453b9c82d44a2ca88fb161bed4046aa3735e0cce950 |
| 24 | sweep/satellite/overhead-az180.png | 1280×720 | b18b1e35ce2109b9be14973b49a1e32ef5908ccde8d496bf5c89c3189e0fe954 |
| 25 | sweep/satellite/overhead-az240.png | 1280×720 | 53b462455a0aa25783916e20c34ecd4e30a8f2572846b67c28c221f7ce6a8ec6 |
| 26 | sweep/satellite/overhead-az300.png | 1280×720 | 4c391c2ce7ba9153ba27c018142867018aed26c0ad2c4a32e241ffcf55fee33f |
| 27 | sweep/cartographic/plaza-az000.png | 1280×720 | 2ab1ec465ebccb2141ff688fed932f76dc43ab9fe803850fc248c9f6bdd86ae6 |
| 28 | sweep/cartographic/plaza-az060.png | 1280×720 | c4f44c5bc849b10c0ba4618f921278fc7b56587434582eaef8ba7c250d7b14be |
| 29 | sweep/cartographic/plaza-az120.png | 1280×720 | cef11167bb05c415ce89c5803387c645f7d67adbd14c04c260b189c909a52042 |
| 30 | sweep/cartographic/plaza-az180.png | 1280×720 | 0e6b8cde294a8c683c8ee9c6f03544836b8aa26a0ba63fcb6e223fd65d00413f |
| 31 | sweep/cartographic/plaza-az240.png | 1280×720 | fc0d73dab3fe530548ce52ef74c0ded0b19000ade3cd8e4e5875c07734364ecc |
| 32 | sweep/cartographic/plaza-az300.png | 1280×720 | 482f6d0834c6f469808ed9597fdacb859e22e936a56842151aa21e03620e8f80 |
| 33 | sweep/cartographic/block-az000.png | 1280×720 | 00466f4c06794d9bfdc5c69a1f0f0f9f189b2d4c273e6a9419aa41cbec474474 |
| 34 | sweep/cartographic/block-az060.png | 1280×720 | dbdcfde4b64c3ffd194acd3a31131978677cef16c7b084635034c6067491ecfc |
| 35 | sweep/cartographic/block-az120.png | 1280×720 | 512f387226f3befcdd72ca240b22bd4de913a7c83b492ec2b8698f773a2da840 |
| 36 | sweep/cartographic/block-az180.png | 1280×720 | 5aa01eb57b6bf0682b1e5f1dfc2ea0fbb3d943aaf969196261f73d6edaecf77f |
| 37 | sweep/cartographic/block-az240.png | 1280×720 | 2d75a8b6ac2eacf891b7d52944306764f835b17349820f244ce47b4c9ec934e9 |
| 38 | sweep/cartographic/block-az300.png | 1280×720 | 783b5ad298eac81967f94aa2b738d50938e674da850ad04931ec4e4319b22510 |
| 39 | sweep/cartographic/overhead-az000.png | 1280×720 | aef7beb3c8ff9d1d4b9ea70187d8f2181ec0316c5cbfeccdafa4341ed9c7b9e3 |
| 40 | sweep/cartographic/overhead-az060.png | 1280×720 | 4ab472318cb688be28ed7da68198a6d9e7f62b5e5a3d114e0d61dd99d2449dcc |
| 41 | sweep/cartographic/overhead-az120.png | 1280×720 | 71692c5a7ef850cd301dd8577bd98c7bb44b162e0f11946a976441367e5e7411 |
| 42 | sweep/cartographic/overhead-az180.png | 1280×720 | 15107abb06900957e83e9bda6d36fc2b098c10e94e0c10dc33230a6f2f601804 |
| 43 | sweep/cartographic/overhead-az240.png | 1280×720 | 6453bb916877836b0ed07c385b2ec3cf1f1dfddf385998d79a107eb5e0405dfd |
| 44 | sweep/cartographic/overhead-az300.png | 1280×720 | ff8447493268fb3a3194c6caa7ae9cff543b4d803d74b62668e42b900b883408 |
| 45 | style-return/return-cartographic-dusk.png | 1280×720 | 30620b0e4a0d32c80cf7a28f100890f85b0fa1fbc67ab0f1a2463e5033b8100b |
| 46 | style-return/return-cartographic-noon.png | 1280×720 | a72ff24febac999f500143c626a16c5a0b2eadd8c3c166ac42aac31fce0c4d0d |
