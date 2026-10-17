# Review 1423: integration

## Target

Maps primary checkout, 2026-10-17, base c42c526aa0c69f3b5c508d7ab4a0edc09937273b plus the frozen four-file tactile candidate. The recoverable ignored patch is artifacts/square1420-critique/candidate1422.patch, SHA-256 013b5427dd13cd30c3665770c0199bd0fe9ecf0697d5a94e8c58de804368ef2b. An independent read-only reverse-apply check passed against the actual primary working files. No source, test, configuration or dependency content was changed by this reviewer, and no staging or commit command ran.

| File | Actual working-byte SHA-256 | SHA-256 after CRLF-to-LF normalization |
| --- | --- | --- |
| src/scene/street-details.ts | 29300c618ac8efe9242b241c5f16719f65b18b849bef23cf21797fb29b074d7e | 2539b001fe35b0ead7430f3859aad0e21654c5914b627054f65815e048c4bb4f |
| src/scene/tactile-paving.ts | 50024bbc4d824f84026e374e829beed55d8643f1cfcc4becd5e25811e5f571f8 | 50024bbc4d824f84026e374e829beed55d8643f1cfcc4becd5e25811e5f571f8 |
| test/paint-support.test.ts | a6995f443fd8b95d30b459b743f04d605b2c525963afb987ee5542a3dbbc596a | a61ee9bb11ce2c3e6c4b72558d0027e278817668a3be4bd0abd78630aea030b1 |
| test/tactile-paving.test.ts | 5abe80c3152b3a125b88b957e1925fc7e584a6f1b1ffba4002df081bd9a01ec7 | 5abe80c3152b3a125b88b957e1925fc7e584a6f1b1ffba4002df081bd9a01ec7 |

The two existing TypeScript files have CRLF working bytes; the two new files already have LF. Normalized code equality is distinct from raw-byte identity. Root owns binding the staged/committed code to the normalized column, retaining these working-byte identities, and committing the authored documentation without transformation. The excluded user-owned test/facade-emission.test.ts remained SHA-256 48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a at inspection.

## Reviewers and coverage

Independent reviewer: review1423_integrated, configured by root as gpt-6-astra/xhigh through direct collaboration spawn, following the canonical fleet multi-CLI review runbook's Codex pin. This is one direct independent review, not a claimed second CLI review. No subagents were needed. Source and native evidence were actually accessible. The initial sandbox Git ownership refusal was handled with a command-local safe.directory setting for this exact user-designated repository; no global configuration changed.

Read the actual four source/test files, their diff, the primary plan, local rules, relevant lessons, the authored 1420 critique, 1422 implementation record and prepared 1424 proposal. Read surrounding production ownership/support code outside the changed hunks: src/app.ts:335 supplies roads.paintHeightAt to actual street construction, src/app.ts:352–353 registers style/disposal, src/app.ts:427–436 applies style without replacing geometry, src/scene/paint-support.ts:65–100 selects bounded nearby road/pavement support, and src/scene/surface-materials.ts:289 sets the sidewalk's depth bias. These reads establish the import/lifetime relationship and support authority beyond the diff.

Opened 45 distinct originals individually at native 1280×720: eight matched baseline/candidate crossing images, four untuned candidate images, two failed-prototype controls, 22 final certified Satellite images, four final Cartographic heroes, two style-return images, and three existing peripheral dusk images for the requested next-direction judgment. The digest table below binds every inspected file. Detailed Cartographic review and its 18 sweep originals were deferred under the local Satellite priority; all 44 certificate frame hashes were nevertheless independently checked. No new capture, browser, server, expensive gate, mutation control or scene regeneration ran in this review. No reviewer-owned resident process or temporary artifact was created.

## Reports

### Independent integrated source and native review

**PASS within this tactile milestone's source, static appearance and lifecycle bounds. No material finding.** The modest visible improvement is real: the former uniform yellow ribbons now show individual tile joints and longitudinal response in the south close views, the final crossing heroes and plaza-240. The finish remains restrained farther away. The restored depth ordering keeps the source runs visible at shallow angles without the first prototype's large buried sections. I found no new floating underside, dense static alias pattern, invented warning-dot region or material regression in surrounding white paint, paving and the adopted frontage in the inspected matched views.

The implementation keeps the original complete eligible class. At src/scene/street-details.ts:167–175, only extent=path features are admitted, every source segment still passes through the same all-or-nothing support builder, width remains 0.3 m, and cumulative X/Z distance advances even when a segment is refused. The unchanged support admission at lines 64–95 runs before vertices or UVs are appended. The UV mapping at lines 97–100 carries a four-tile, 1.2 m run through subdivisions; bends preserve centreline phase and rotate the directional texture with the source segment. Separate paths reset intentionally. The short/long/bent synthetic test checks actual emitted UVs; rejection retains zero geometry. Phase across a rejected middle segment is established by the unconditional distance increment in source, not claimed as a separately executed targeted UV test.

The pinned source test covers 16 eligible features, all 267 source segments, their actual identity/order/endpoints, 260 placed and seven refused segments, and 18,144 vertices/6,048 triangles. Nineteen unspecified and three endpoint-only features remain outside the eligible class. These paths lie around the crossing and approaches; this is not a claim of peripheral tactile coverage across the AOI. Ten barycentric probes per accepted triangle exercise 60,480 finite positions with actual support and 4–35 mm clearance limits. This verifies a finite sampling bound, not continuous contact, actor clearance or surveyed tactile construction. The existing paint-support test changes only its independent expected tactile lift from 70 to 20 mm; its source pins and adjacent crossing/support assertions remain intact.

The finish owns three seeded 128×512 textures, with deterministic colour, bump and roughness data, explicit colour-space handling, mipmaps and anisotropy. The material reuses the existing SurfaceMaterial contract. Style application changes tint on the same resources; disposal removes the material from the generic disposal set and releases its three maps exactly once. The production-path ownership test covers actual street construction and style return. There is no new per-frame generator, additional mesh or draw, source-data writer, dependency or adjacent facade/lighting/paving change. The 145,152 added UV bytes and approximately 1,048,596 texture bytes including mips are storage arithmetic, not measured whole-process GPU allocation or FPS.

The actual negative log at artifacts/square1420-critique/worktree/artifacts/local1422-checks/depth-bias-red.log fails test/tactile-paving.test.ts:46 with expected false to be true when the material bias is removed. It ran one selected test and skipped the other three by test-name selection; that is not a full-suite failure. The restored full-suite log and final primary suite pass. The two failed native originals inspected here visibly lose middle/far route sections, while the corresponding final candidate originals restore them. The test at lines 46–48 proves the declared material relationship to the actual sidewalk material; the native controls supply the observed raster evidence on this GPU. It is not a general proof that every slope or renderer will order identically.

The final Satellite street views retain a coherent yellow path cue; near joints and relief are clearest in the two crossing heroes and plaza-240. Block/aerial views show no conspicuous new texture dominance, but many tactile surfaces are hidden or too small to judge their finish. Satellite plaza-180 is inside the existing storefront, and block-060 is substantially occluded by a tower. They were inspected, but supply no useful tactile-ground or camera-clearance acceptance. Existing facade softness, broad sparse pedestrian surfaces and concentrated dusk illumination remain visible broader quality limits, not newly introduced tactile defects.

The prototype's four matched pairs have maximum recorded camera-position difference 2.93e-14 m and zero target difference. Its untuned camera seed is 142217. The west exploratory pair has no near tactile surface; only the south pair supplies close relief evidence. Prototype still gaps are 4.423–21.059 s. The final Satellite sweep's recorded adjacent capture gaps are 2.122–3.270 s; the hero/style-return lane has 1.395–22.190 s gaps, including the noon reload. No continuous motion sequence was inspected. Temporal crawl/flicker, continuous clearance, full-map appearance, population behavior and the 3,000-pedestrian/200-vehicle 60 fps target remain open. These observations do not close any of the fourteen full-deliverable criteria.

The final Cartographic heroes and two return images show the same route geometry and functioning shared rendering. The recorded actual pointer/keyboard prototype style changes preserve camera position while walker ticks/travel advance. Canonical style-return records and images provide additional basic style continuity. Detailed Cartographic quality remains deferred.

### Next visible direction

**Continue with the prepared 1424 east-first mounted-light prototype after this milestone lands.** The three existing dusk block originals show dark corridors outside the concentrated crossing treatment, so a source-bound physical fitting and visible local receiver response address an observed issue. The proposal's east-first discriminator is appropriate: establish the actual mount, nearby receiver and useful street/block visibility before expanding to west and south. These roof-level originals do not prove that any proposed exact face is visible or suitable. The prototype must earn that evidence through the ordinary controls. Tiny bright lens pixels alone, broader exposure changes or source counts would not establish the intended improvement. This recommendation accepts a bounded next direction only; 1424 remains prepared source selection, with no implemented or accepted lighting. The existing evidence does not justify redirecting to a larger facade intervention before this finite pilot.

## Findings and disposition

No material code or native-appearance finding was raised, so no new finding ID or repair is invented. The previously rejected bias-free prototype remains rejected history. Root retains authority over acceptance, committed normalization, main/push, remote checks and worktree cleanup. The prepared lighting proposal is not an acceptance dependency for tactile paving.

The AGENTS.md retained-packet prerequisite adds actionable literal-fixture setup without changing the fleet canon, fetching implicitly or weakening the tests. The plan preserves all 35 stable items, all 14 open criteria, full-map/population/performance requirements and the private-union exclusion. The initial stale docs-only Outcome wording was reported to root and its focused update now distinguishes the completed candidate/five gates from pending review/main/cleanup. A final status-only readback belongs below once root completes that update; no general documentation-review chain is required.

## Verification

Inspected actual primary logs and artifacts, not just worker summaries. Build and types passed. The primary full suite passed 127 files/1,152 tests in Vitest's 84.05 s (84.95 s outer command time). The earlier sandboxed primary unit invocation failed before tests loaded; its zero-test startup refusal remains retained. The worker's earlier missing-packet full run and literal nine-file restoration are disclosed in 1422, and are not recast as code regressions or skipped prerequisites. Audit passed at the unchanged high threshold with two existing moderate advisories; no dependency fix or threshold change is part of this increment. Build retains its existing large-chunk advisory.

The actual final certificate artifacts/visual/complete.json is 9,808 bytes, SHA-256 683b045dc8b98124928253df61effd07bccfcfb8892993c1bb9b45376e4eeb3e, run 59b500b75a1abf60, started 2026-10-17T10:26:06.730Z and certified 10:30:40.602Z. It names 44 frames, hardware RTX 4090/driver 616.64, ANGLE D3D11 in both appearance and lifecycle, the four current built files, the unchanged 156-file/364,187,965-byte runtime scene digest 288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62 and 25-file harness digest 78b2c9bffa0ee72da64e0ff5f407467e952687d54d52882b53b8732afe662467. Independently rehashed every certified frame and all four built files; all match. Read each of the three named actual lifecycle records: each has the same renderer/build, no console/page errors and completed outgoing teardown. The certificate's input digest assertions were inspected; this reviewer did not rerun the canonical 364 MB served-input certification or full gate.

Primary gate receipts live at artifacts/commercial-corner-20261014/canonical-gate/tactile1422-integrated and artifacts/square1420-critique/integrated-gates. The run-result explicitly leaves appearance to review. The owned wrapper's finally record reports no remaining known/omitted identities or unclassified final edges, no listener on 4319 and removed TEMP after a zero-reparse census. Its retained fresh 10:32:05Z census checks 45 recorded identities, 4319 and TEMP and passes. These are exact task-owned cleanup bounds, not broad absence of every browser process. No reviewer-owned browser/GUI process exists to clean.

No fresh remote-data rebuild, target-population performance run, continuous motion/contact check, or detailed Cartographic sweep review was performed. They are outside this local finish milestone and remain open rather than being inferred from green static gates.

## Round outcome

Independent integrated review passes for the frozen four-file tactile increment, with no material open finding in its accepted scope. Actual primary five-gate evidence and the stated native inspection support landing this bounded visible improvement. At authoring, main commit/push, final status readback and task worktree retirement remain root-owned actions; this report does not claim they have occurred. Full Shibuya completion remains open.

## Inspected native-byte identities

Every row below was opened individually with original detail. Final paths are relative to artifacts/visual; critique/prototype paths are relative to artifacts/square1420-critique. Tables bind inspected image bytes, not unobserved temporal intervals or occluded surfaces.

| Final original | SHA-256 | Coverage |
| --- | --- | --- |
| hero/hero-satellite-dusk-crossing.png | e6dfdad94fdce59042f780db154a0df48f5c291b5602f90a203950aa0228c638 | Satellite appearance |
| hero/hero-satellite-dusk-approach.png | 1532d96a1f8134f9b2b861ca843b57e123c50e01c0890ba3ee9982dbfe05d088 | Satellite appearance |
| hero/hero-satellite-noon-crossing.png | cd495b3f0c5cb5e7dcf5b3d7a329be925dc12dea65db27bde41545fcef7294cb | Satellite appearance |
| hero/hero-satellite-noon-approach.png | cc639a75c1901a51c860542a048a2e4d613916d0d9be65dc4e21e0673ae9f1f5 | Satellite appearance |
| hero/hero-cartographic-dusk-crossing.png | d02ec70ca05cceadcd797a9c98ec73b6bd2c5ce239b96111fa8de7a3dba91334 | Basic shared style |
| hero/hero-cartographic-dusk-approach.png | dd2688daf98811951529117cfadeb6fb9135ff13fb5c3676a04baa08cf9b3e78 | Basic shared style |
| hero/hero-cartographic-noon-crossing.png | 45b0977dd3553edbb14b0d7f27972fe06699ff3caeddf75686701037ca004dad | Basic shared style |
| hero/hero-cartographic-noon-approach.png | c51db5935044924f2c6c31201f9783950ed47304fcfd650263a0a139ffb24018 | Basic shared style |
| sweep/satellite/plaza-az000.png | f7f31b4b0d43c45c9e425254170f3a6f041d268834eb0e36717ef4776474307b | Satellite appearance |
| sweep/satellite/plaza-az060.png | a4c647850f2002ad4f60bb78dd13de36ab12cb94814e9666ab61bae5213653ad | Satellite appearance |
| sweep/satellite/plaza-az120.png | bfa0361f5c2143c59d617658a25a147517629965be65ceca22bd9645e5d96c60 | Satellite appearance |
| sweep/satellite/plaza-az180.png | 1953c2a0d460f7998e680a95901766c290b68bb1bd582265a087e102d2523342 | Satellite appearance |
| sweep/satellite/plaza-az240.png | bb78132ff082c60483213eb196c9366fb306174ccf15525f4dd5ceb9a1bdc117 | Satellite appearance |
| sweep/satellite/plaza-az300.png | e0cd544928bd806cb2b7052d929541a4e4bc10d6b87b3398d6601a18696e0062 | Satellite appearance |
| sweep/satellite/block-az000.png | 58564b8e20301170c4ca487f3f72027906955ffb4048ea667afa6fe625b3e6b8 | Satellite appearance |
| sweep/satellite/block-az060.png | 8117ec881797292462df94402161890192271372abb5829d784f73d537119810 | Satellite appearance |
| sweep/satellite/block-az120.png | dca9e215344b9264c03c5bb569c982e8a0d369dbbcfebef3913fcd0f594e1f4c | Satellite appearance |
| sweep/satellite/block-az180.png | 1cb20b89f1727348de1dc68cd4ad62a206d2879692983ca7887b23f43771bb6d | Satellite appearance |
| sweep/satellite/block-az240.png | 03f1a147242e431cf914239fbcddd802d36d87f3549689f9ab6ca221de13894a | Satellite appearance |
| sweep/satellite/block-az300.png | 276faa21ce459a2b63291387436a18caa55d5ffbe311472d20078e1f9b380f88 | Satellite appearance |
| sweep/satellite/overhead-az000.png | dcade10e193033ab2ce8e97b1de17e0bbd140e141ab346cd75f1de0226cdc104 | Satellite appearance |
| sweep/satellite/overhead-az060.png | 263985063ef88d49b8a9d0a2f47c31832b318c117452c2fe15151483a252a840 | Satellite appearance |
| sweep/satellite/overhead-az120.png | 62af7168448a40eaec4f5dcece6427112e5af8d8fe0f228bc88ffecc8fd6d602 | Satellite appearance |
| sweep/satellite/overhead-az180.png | ba5f51b69826c1644b87f754a19ba1afc1b17a8260553329a0236698df3f5d3e | Satellite appearance |
| sweep/satellite/overhead-az240.png | 3a93ffcb1a51de2d139ac12fedf281b8dc0e094ff68026f89c88938fe754ce2f | Satellite appearance |
| sweep/satellite/overhead-az300.png | b3b67b280af6609848b8877cc7ce2543f6a7a5d192df2e0deb0c1a7e16be4c96 | Satellite appearance |
| style-return/return-cartographic-noon.png | 3f82cbe5b2d67c2fd6c72286ce647f9eec94f0d00c3e98dd9fdb7bbe55abdd29 | Basic style return; outside certified 44 |
| style-return/return-cartographic-dusk.png | d987f4e6ca98524d251a58cc5c0cde62f5c8bab54bdf676d312818422ab99ea4 | Basic style return; outside certified 44 |

| Critique/prototype original | SHA-256 | Coverage |
| --- | --- | --- |
| runner/run1/payload/noon-02-crossing-nw-street.png | d4ff2b3b37f97618e71f191d2cd7fd14b23d5ebb1d581a95cee2336e03482184 | Matched before |
| prototype1422/run2/payload/noon-02-crossing-nw-street.png | f41af93eb45fa110d07cf5bf5a872c200e8ce8f165b930ca5b7889a0b014723e | Matched after |
| runner/run1/payload/noon-03-crossing-se-street.png | cf3a63be5949d0002148c0b99f661fb82f4b13f9636d70cf80addb74bea8b6c3 | Matched before |
| prototype1422/run2/payload/noon-03-crossing-se-street.png | 3066929e75157bce8e698d6cd1134b6d3e0686e79316cfe335fe90c84ad87d80 | Matched after |
| runner/run1/payload/dusk-02-crossing-nw-street.png | 296925f4ac20ba30bb967a15a6455324efa1441296f2c1c4f8308acd5cf75116 | Matched before |
| prototype1422/run2/payload/dusk-02-crossing-nw-street.png | 0e48bd8739e46ec558c32e475ab1959a18bbd7351309dabaf79da498378c6c7c | Matched after |
| runner/run1/payload/dusk-03-crossing-se-street.png | 73bf23ee496fb8776cdd18be37a2319021e85a95700a286d42995da4675dc491 | Matched before |
| prototype1422/run2/payload/dusk-03-crossing-se-street.png | 2f4b6f9cd0d2b69cfedaf03f3872d6a6a27c531649c9cf63653d084496998bd1 | Matched after |
| prototype1422/run2/payload/noon-04-untuned-tactile-west.png | b5411888e0c266115423520449a98cad8757c48d9871bbc7bc977ccc65b6dd15 | Untuned Near tactile relief not visible; surrounding scene only |
| prototype1422/run2/payload/noon-05-untuned-tactile-south.png | 4f11a510b1725b3d5d5e3075bad79f0e22f62cd182931be6c780183ea86f7819 | Untuned Near foreground relief and joints visible |
| prototype1422/run2/payload/dusk-04-untuned-tactile-west.png | b5bf670270138b8f180d1dcc05f06c6403b1d4cd7ebec0a3cb2cdd1a18b521f3 | Untuned Near tactile relief not visible; surrounding scene only |
| prototype1422/run2/payload/dusk-05-untuned-tactile-south.png | d30f6786915544fe1333a1e3a11a3eda130d6331df616820d08a995c9bd7daca | Untuned Near foreground relief and joints visible |
| prototype1422/run1/payload/noon-03-crossing-se-street.png | baa9d5df3478a7b4a6e5a77fd3f422f612c5014606256e981836bd3fbaf31d2a | Rejected depth-order control |
| prototype1422/run1/payload/noon-05-untuned-tactile-south.png | a2e46087a9f41b0bd405c387204ffa48e5b971abf731d373343a11b784548c9b | Rejected depth-order control |
| runner/run1/payload/dusk-05-west-block.png | e276e293f6094eed60138c6a0e4f9e41268b9f834deaba01ca809c1f48145daa | Next-direction evidence only |
| runner/run1/payload/dusk-08-east-block.png | c7d533c6095c561355f63d582e14509427cc90e7f6ec2750f766df76d3b320f2 | Next-direction evidence only |
| runner/run1/payload/dusk-10-south-block.png | d68cad4eea6359eed86b16b059b4691cde10609bf9d80e744035c41e2367ba09 | Next-direction evidence only |

## Focused final status readback

Read root's final pre-commit plan and new devlog entry after the review verdict. Plan SHA-256 2d536f3f3c8e6b928600ae99f01069db7d1fef56d997d9bebb3d3ed7f705f3b2, 12,191 bytes; devlog SHA-256 0bf010d7661efdac30ab42560d68992610cbbb49b98a0aeee0ff67c53d6992f0. They correctly report the five primary gates and bounded independent source/native PASS, leave commit/push and fresh worktree retirement pending, retain the prior adopted revision until the new commit actually lands, and keep 1424 as prepared selection only. All 35 stable implementation identities and all 14 open final criteria remain. The new devlog entry states the static/lifecycle bound and leaves full-map/population/FPS open. No substantive claim mismatch was found. The older clause referring to the context repair is historical wording; the current row and Outcome clearly state this product milestone's actual status.

Re-read all four raw source hashes and the excluded facade-test hash after this status update; each still equals the Target values above. This closes the requested focused readback. Root's subsequent factual commit/cleanup-status update does not imply another product-code review. This report is frozen for staging; no further reviewer writes are planned.
