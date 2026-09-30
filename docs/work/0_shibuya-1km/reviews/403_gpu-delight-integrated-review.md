# Integrated GPU facade de-light review

## Round 1: integrated source and CPU receipts

2026-09-30. Independent reviewer: motion380, reused reviewer. **ACCEPT SOURCE** on PRIMARY HEAD `b3b02a05a2766e73c8ded036067611259d82a162` with the following uncommitted nine-file candidate. This is not final product acceptance: audit, the canonical visual certificate, individual native image review and matched production readiness evidence remain pending. External CLI review is unavailable. This reviewer launches no browser, GPU, server or gate and writes only this authorized review.

All nine actual PRIMARY file lengths and raw SHA-256 values match the successful hardware397 attempt3 input records accepted in [401 Round6](401_gpu-delight-fixture-review.md). The index is empty. The six tracked source/test diffs and three new files contain the accepted candidate; other present changes belong to documentation and the externally owned AGENTS file.

| Integrated candidate path | SHA-256 |
| --- | --- |
| `src/render/atlas-delight.ts` | `a387dbcdee9baea7e34987f8a480a01bc11e7dfb726430ff2968d37ddc381396` |
| `src/scene/buildings.ts` | `cc8675eb865f00a5c3710a8b45dd367670ec2cbd1034f32c9ed913627991dd33` |
| `src/scene/facade-textures.ts` | `862fadec32c7d60bab01fb9f7fe708de25ea66f17d99f6e5d63140af7d8fa2ca` |
| `src/scene/tile-transaction.ts` | `cb8c136cfc9ce2ad8ccb7e24351572f87491ca06d7f01cc991a6485cda27c7ef` |
| `test/atlas-delight.test.ts` | `8e25c68f8d1d776d862626d7017a437340e30d9b7a1f72bd5eecd84a26f822b4` |
| `test/facade-gpu-owner.test.ts` | `830e9667bf5380298e29caf27584efd661b6d30174e679ba0e9a1e1130d05e2b` |
| `test/facade-emission.test.ts` | `b9ec9d96bc07536fded266c7686c18c1382003a5bc9586fabc7f01682f46daf0` |
| `test/crossing-corner-material.test.ts` | `edc9295bb70aa38357a35689ed0b55386885b75f2877d3c890d96790aa3f7a2c` |
| `test/rail-runtime.test.ts` | `75cd9e6ba7e2aeb2d485b776b2863ba2c7b2f657257c6322c5f5474d82f650b1` |

The actual four product files and direct caller/resource/readiness boundaries retain [396](396_gpu-delight-integration-contract.md)'s design and [400](400_gpu-delight-source-review.md)'s resolved source findings. `createBuildings` injects one owned processor borrowing the live renderer. The plugin masks original RGB before the synchronous GPU operation, retains CPU-readable output and approved DataTexture metadata, and has no default CPU oracle or fallback. The unchanged geographic cap policy and shared style uniforms retain atlas reuse. The normal and trial parser paths both stage and release unique original/replacement resources through the existing transaction boundary. Owner closure is checked after asynchronous bitmap resize and before GPU work; per-job GPU resources and borrowed renderer state are restored synchronously. GPU failure rejects before atlas adoption. The existing awaited model-hook accounting and all44 final-leaf display boundary remain intact.

Seven surrounding app/oracle/cap/material/cutout/renderer/post hashes match396. The 27 relevant candidate, cached source/decoder, support/API and resolved-module records match successful397 bytes in PRIMARY, with the recorded resolved paths correctly interpreted relative to FRONTAGE. This is a bounded integration/input comparison, not a fresh whole-scene source audit. The shader/context failure controls in the final atlas test are CPU-controlled fixtures; native healthy-state and numerical execution retain401's separate bound. Exact RGB equality is not claimed.

The actual `artifacts/gpu-delight397-final/cpu-gates.json` (3,295 bytes; SHA-256 `15780fb2f436a1921377b888a43eca86973828506e3c3e8f4111018863500b40`) and all four named logs match their recorded digests. Build and typecheck exit0; the complete primary-root, cache-owned unit suite reports116 files and1040 tests passed. Its selected config includes every `test/**/*.test.ts`. Audit exits1 with a failed registry advisory request, so this round does not count audit as green. The audit transport retry and canonical visual/lifecycle lane are owned by388/root. No additional checks ran in this source review.

No material integrated-source finding remains within these inspected boundaries. Final visual and readiness acceptance must bind the certified production build and actual source/data/harness/adapter records. Native image inspection will begin only after root releases the complete frame certificate, with all22 Satellite originals inspected individually and meaningful retained-baseline comparisons recorded. Cartographic receives a basic shared-rendering regression check, not a second polish claim.

## Round 2: canonical fixed native appearance and final gates

2026-09-30. **ACCEPT FIXED NATIVE APPEARANCE** within the397 regression scope. The canonical production certificate `artifacts/visual/complete.json` is SHA-256 `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce`, run `9174dee71f86ed7d`, certified11:54:19.028Z. All44 certified PNGs were independently rehashed with zero mismatch. The22 Satellite originals and22 corresponding retained baseline originals were each opened individually at their native1280×720 resolution. Two noon Cartographic crossing/approach pairs received the basic shared-rendering check. No contact sheet, resized image or new capture substituted for these inspections.

The retained baseline certificate is SHA-256 `c8c24e831a7834f4667ec66304a1e024bccc8cc03dfe6cc58d090f2b1a62c3da`, run `322e0ae20988845e`. Candidate and baseline retain the same scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`, harness digest `8f22bf47a0fe20f9c040010e11de6010834a33505feee07848f064da52e9c3c8`, RTX4090/ANGLE/D3D11 renderer and driver616.64. The candidate Satellite manifest is `4aa9c5b30955c6e19198f4af183c8f4567aae50d77de50b567a9ed7cf80c34a6`; hero manifest is `99aaceff6fa1fb934f0c13753c03dfeee11c6e8e86222f3563bc48fb357d35e0`. All24 selected recorded camera poses equal their baseline counterparts.

The six sweep azimuths are0°,60°,120°,180°,240°,300° at each of45m/polar1.5,220m/polar1.28 and950m/polar0.62. Satellite heroes use azimuth0.7853981633974482 radians, target(0,15.2,0): crossing distance44.999998466858926/polar1.4999999450937784; approach distance219.99999744436732/polar1.2799999358678593. Noon and dusk are both inspected. The actual camera positions are respectively(31.740094910264844,18.383176431187064,31.74009491026485) and(149.03228789316617,78.27735890300491,149.0322878931662). This is fixed sampling, not continuous camera or animation coverage.

No material new hue/gamma, atlas flip/channel, missing facade, mask/emission, roof or cutout appearance regression was visible. Crossing signs retain their noon/dusk response; glass/facade tones and the broader roof palette retain the baseline. The two Cartographic images preserve the intended palette change and shared geometry. Existing smeared photographic detail and empty streets remain in both arms. A large foreground tower obscures much of `block-az060`; several overhead views crop the near AOI extent. Those baseline limitations bound what these particular views show and do not establish complete map quality.

### Exact inspected image pairs

Candidate paths below are relative to `artifacts/visual/`; baseline paths have the same suffix under `artifacts/gpu-delight397-baseline/artifacts/visual/`. Both members of every pair were inspected and matched their recorded raw digest.

| Original image | Candidate SHA-256 | Retained baseline SHA-256 |
| --- | --- | --- |
| `hero/hero-satellite-dusk-crossing.png` | `8a59d83605e519cf39e8425510abfbcbbbf1b4a81c86e58833afb30009e0b5dd` | `1f89f96bdb98188656c9653f0537468e6b1e7f3d1fcb82bbb5df0898dd6b43bd` |
| `hero/hero-satellite-dusk-approach.png` | `167bec9497466862635312c7c1af1804da6467b883d35d895dbb968390131251` | `93dd7018653ffaf01d2ba1de9f13290764bec7268224ae98a68dbbec48d8dfd7` |
| `hero/hero-satellite-noon-crossing.png` | `99b8cf101d75992d0438dba1340ec4d7dfb51e3296e8c976c855da3d8556aaa1` | `a93832e5833d375489d1567dd44bf2d82166e5cc9841678e92bafff71f526282` |
| `hero/hero-satellite-noon-approach.png` | `e5a9ac0dc4ef69c947f28620598105e2ad9a521e6a79e13959eb9861f9fb9cba` | `1e97020c0c372b14a7d108d5f019ce7d4104193b7a007b63092674511890d7f8` |
| `hero/hero-cartographic-noon-crossing.png` | `13dc923b6a407bbc789469eecb25eb5af8cb39ec8202058892f7cf833cd916cb` | `f1ce6f91f23ca5e06868bb2e2b8fcffe92ab4b9842971a82bd1dbce2a68ef56d` |
| `hero/hero-cartographic-noon-approach.png` | `e756eef4a813396b57f2c7159a1a17f7c42d7ff96e9e2ceb74ed477aeb88c989` | `d5a176d47c1b99ead329e3f59177e9925737ee936291bfe33c7efd6a3a3b86aa` |
| `sweep/satellite/plaza-az000.png` | `c4baaa8c9e688603cd84c0eb303faa4b18a9e5473ccc893de9a36c183e7d7e98` | `b0cb49673892ea46906f62b444bf250ca7a5c8a3fd5c6a1578a6f8429bd0962f` |
| `sweep/satellite/plaza-az060.png` | `4336b54531e864dec636394f7a8560f0155510fc066aaddbf14f142c7ab28ad8` | `7f9cfc92e6623fdc93b3505e35160a312f7ad7d99f2db318b50e1f554044ca6c` |
| `sweep/satellite/plaza-az120.png` | `e254c9554cb3caf50e2fa1e9681489d91c4961f9c6010aaf9f55b950d179cd37` | `86cb792ac7910d4396e0d5c1e193a4a35af67ba43a4f5f842c6f6c9145c31ad4` |
| `sweep/satellite/plaza-az180.png` | `22839395a38eac8a8c50543a0fdf925b7393150223b0cb7eec334f2708db75ff` | `2523ddac7dd78ecda97952e868971a72ef74188d22fc247e661a5be5e7bff44a` |
| `sweep/satellite/plaza-az240.png` | `8abc9c6d0996a124c2f901ae009a436206adcbae75ab8165ffc9debd0da7c697` | `d8d4b1a6ad0e2a806078aaf33eda91ed2c3817539e6ae303975efcddff46e572` |
| `sweep/satellite/plaza-az300.png` | `10bad268b84f5c39f736274481c42e5951713788797dc4efa361ccbfc4021359` | `3d6b1cc23f93911ae1234261d9c39819554a6c4b49f19324c911dba2683d63f4` |
| `sweep/satellite/block-az000.png` | `110d4e650d16d2ecc1929a23f118adcad94c3969772bec2202a710492ebc58f8` | `74385a04a83123a1a75f27290567a118254e50c338b9237831835cd3d7d829aa` |
| `sweep/satellite/block-az060.png` | `307ddb62be567fb5be842bcfb1d23b5533bfba6dc784482390bbd27b13b89d05` | `212b123bd9a262dd98b976bc5291af6d75af8de43051ec50488173a634ec7cff` |
| `sweep/satellite/block-az120.png` | `3afb38e7fda634e770d3c26e0cd4cb5ab60801e9d700a837f0f09fe836f54407` | `efd01e56d112de112c516fa442a62eaa967a43c7347ada45d5177406ae15ecfe` |
| `sweep/satellite/block-az180.png` | `fad85928452f32e7b1530963032896a0cf7dc58eccc1e14319f1e7bf7796537c` | `3d11bdfe64c312c3ca26f6bddc22d2e64c221de825aee967d04972efbf6c7d10` |
| `sweep/satellite/block-az240.png` | `563796e97102753a6106bb56b54008d0667e834335741238d1983014e59a60d0` | `635454187e6f881d6f7ac8ebb0bb2a4d342413d4346134fe6f2aee0609b379ed` |
| `sweep/satellite/block-az300.png` | `b14e3a51963d4b7920689e2137fc8068ea494532b8ac5487229f8a6b777c8485` | `cac63d9746b1a09d10c7c9b41a56c21a7cfc95ff6ed3e28ca459a79b760a8f01` |
| `sweep/satellite/overhead-az000.png` | `67ae288510913f8653a3e254b5ac04ee470c4cfa72cc3bc848593fe4e2ee181e` | `890af8e253ace8a5645761dcb9ffc2637f865e8cc586241fdfbd2df11b568674` |
| `sweep/satellite/overhead-az060.png` | `058bb481a2bb6e314d9924af88d4b8ee53611f8e39cfdaa9528c504dddb669ca` | `2c4388fa2ad75134ef6db05d20347c401155013bbfd12fdb1a51f2514b429ac0` |
| `sweep/satellite/overhead-az120.png` | `f7fc9a612c75ca1c01ee928ab57c0a229577c5a047be4d7fd0034e1626220512` | `ef813d89a976f17ee4884c0570ea0817841346d430f5c6721a8847b03da0520f` |
| `sweep/satellite/overhead-az180.png` | `13e08d86d13274a44c9d586621752cf8f3d534144a78456131eee1abf8b88120` | `f3089f79bdca6f2091b131c0ab27fd246c7ecdfb63d25848019dd2563c183019` |
| `sweep/satellite/overhead-az240.png` | `edc716739c98904c81fdd8e59739ea77bafbef8f77b1d575d268bbc7634a04e5` | `410af6d0c06991e14b6c6d374f6a5c87f2b1dd47229b1b04658e904bf099bee9` |
| `sweep/satellite/overhead-az300.png` | `f564f5809f63ad330a5e13d1de46b00601b8da95c1224dc650ac5c0343d910bf` | `cff9e51393855ca2ab25e391e9422a00e414fee3d48343d9b7c70ef8dafca2a9` |

### Gate and resource evidence

The admitted audit rerun receipt `artifacts/gpu-delight397-final/audit-rerun.json` is SHA-256 `0260708cce0c415d43e6a7a39fe01f340b1cbc5238c3e9c8b9b77c95ed4259db`; its actual log matches the recorded digest and exits0 at the unchanged high threshold. It reports two moderate vulnerabilities. The earlier transport failure remains recorded in Round1; no dependency repair or threshold reduction was made. Together with the verified build/types/full1040-test receipts and canonical visual certificate, all five required gates are green on the frozen candidate.

The three actual canonical lifecycle records report completed teardown with no console/page errors: preparation24,374/27,143/27,137ms, bound respectively to SHA-256 `ef26387efa9b11f150160ebf017aa6bc611666bb911997e52e0474bda52b89d2`, `3747b406c5df15c82c67a93bbfcd773c8e0e6b91ab8c1896cf1eb9182cc8b6eb`, and `db61524c2cdd3f7f2a031e58e013902147abef71bd316dbd081d6570ea422a10`. These lane measurements are not substituted for398's matched production readiness experiment. The native absence receipt is SHA-256 `cd0dc7e12e3f5af47761b37030d3fb5702b44b21f13739ea2140f7c9c95738d5`: its actual queries completed for48 retained/omitted process identities, with no exact survivor, reused PID observation or4319 listener and no termination attempt. This reviewer launched no process or resource.

The numerical tolerance and fixed native appearance verdicts remain distinct: the one-byte RGB qualification does not claim exact RGB bytes, and an image comparison does not prove native shader/context failure behavior. The candidate's final committed revision,398B matched readiness result and separately admitted405 seeded views remain pending before this report's final integrated verdict. No full Shibuya, full animated population or60fps target acceptance is claimed.

## Round 3: matched production readiness, with the original wrapper red retained

2026-09-30. **ACCEPT MEASUREMENT** within the three-context matched-production bound. Actual A/run SHA-256 is `662c3189c7cf32e3f074c2d41817fc7de8c073d453c4a659444901bf293ada53`; B/run is `5501179ea3d8b6701da1d61db2c5fdb72b90cde42a603a69b7120f034aea15a9`. B records one dispatch, three completed fresh contexts and no browser errors or warnings. Each final sample reports67 loaded models,44 prepared/required leaves with exact loaded/required URI equality, hidden loading UI and ready status. Each navigation has67 distinct successful uncached b3dm requests. Its final Node observations are10,988.706/9,449.1496/9,365.3182ms, below the90s bound, with18/18/17 samples.

| Context | A visible-ready interval ms | B visible-ready interval ms |
| --- | --- | --- |
| 1 | (16968.2,20234.7] | (7787.3,10982.3] |
| 2 | (16487.2,18220.9] | (7762.8,9443.8] |
| 3 | (16605.3,18329.3] | (7733.8,9361.7] |

The largest B upper bound10,982.3ms is below the smallest A exclusive lower bound16,487.2ms. This supports faster visible whole-city readiness in the measured configuration despite delayed polling. It is not an exact percentage, a machine-cold benchmark, CPU/GPU phase attribution or simulation frame-rate measurement. [398](398_gpu-delight-startup-comparison.md) preserves the sampling policy and clock-origin limits.

Actual A/B configuration, cache policy, sample policy, viewport, adapter/driver and browser executable/registry/Node match; browser launch arguments differ only in the owned arm marker. B's292 before/after records agree exactly. The changed source records are only the admitted four product paths; expected HTML/bundle/source-map differences account for the build changes. Other records match A. The concrete normalized embedded harness digest remains identical. The separate final source receipt's nine candidate files were rehashed again with zero mismatch.

The original B wrapper remains **RED**, exit1 and `cleanupVerified=false`, SHA-256 `18e03e5ccb74cfe0a90ba5ce2124ca1e4532aa6849ece21f8886e00b47f30ff5`. Its transient PID51560 handle race is not retroactively qualified. All individual page/context and six runner close flags are true. The separately admitted supplementary closure is SHA-256 `8d11816eddb8ab46c6e5e671e6a10a4358a30fcdad2834efd6c37bc63caf8c17`, binding the unchanged run and original cleanup. Its available actual census shows no remaining exact identity, reused PID, marker, owned-temp reference or4324 listener;51560 is currently absent. The non-following census records zero reparses and removal of only the owned temporary tree, absent afterward, with no termination. This resolves current resource absence and does not restore the missing historical51560 ownership evidence or make the original wrapper green.

No runtime, capture or gate ran in this review. Numerical, fixed native appearance, required gates and bounded production readiness are accepted separately. Seeded405 inspection and the final committed source identity remain pending for the final integrated verdict.

## Round 4: four seeded native views and final integrated acceptance

2026-09-30. **ACCEPT** the nine-file GPU de-light increment on the frozen integrated candidate based on the separately qualified numerical/state instrument, all five required gates, matched fixed native appearance, bounded production readiness and these four exploratory originals. The inspected candidate was on primary `b3b02a05a2766e73c8ded036067611259d82a162`; the final committed identity remains a mechanical check for the integration owner and this reviewer. No runtime, capture, gate, source, dependency or Git mutation ran in this review.

Actual405 exploration SHA-256 is `8bd25a641049b6be2e769e8889519c743e30aeed107c336c6ea4976bc2bc5d7f`, started12:46:12.003Z and ended12:46:43.718Z, seed405, URL `http://127.0.0.1:4325/?style=satellite&time=noon&agents=0`, passed true with no errors. Its corrected source is `196364fb083b0e57f7ad1c543e94905541a2135ba0c452c85872b2240c0d69c3` and wrapper `341b2ef6408b3a72274ffb02b5979290dcd0e35fddbbdf7ba276d24bd8b277db`. The earlier pre-browser failure remains preserved; this is the second attempt, not a retroactive pass for the first.

I opened each original individually at native1280×720 and verified its raw SHA-256, length and PNG dimensions. Requested and actual settled camera values are radians/metres; actual before and after poses are exactly equal for each frame. Every target is `(0,15.199999999999998,0)`. Ready is true before/after and renderer errors are null.

| Original | SHA-256 | Requested azimuth / polar / distance | Actual before=after azimuth / polar / distance | Actual position x / y / z |
| --- | --- | --- | --- | --- |
| seed-405-pose-00.png | `34df9f7ea5718b943d0f731f880a7f65cbb3e74bf5fe9a6b7342eb39e4be41e7` | 5.690881255955543 / 0.8343667306378484 / 81.39161493396387 | -0.5923040706645991 / 0.8343667990782809 / 81.39161299116265 | -33.664327409273916 / 69.8664276208602 / 50.02888582166964 |
| seed-405-pose-01.png | `a4ca6611c3c7e82eb18701e30baaa04dfcc29afa28ebca47527886134665aa9a` | 2.5790111083588565 / 0.6439589001610875 / 239.20068704523146 | 2.5790113249032394 / 0.6439587706208819 / 239.200684383335 | 76.59639616077334 / 206.49484365488541 / -121.47527442113743 |
| seed-405-pose-02.png | `63c3e057f297b2441cced720657339960a3ab4bfbc96d0e32bd04c057a894623` | 5.722064842602809 / 0.8479564384929836 / 689.789160026703 | -0.5611205848286469 / 0.847956377488733 / 689.7891647158933 | -275.2702009375143 / 471.5073279856869 / 437.97149526177276 |
| seed-405-pose-03.png | `3e9c349dd7502d7eb1864bdf58da8211aa857f6462d0f102532030699fd653ad` | 2.396299799779468 / 0.6373212509788573 / 113.53436845820397 | 2.396299565680064 / 0.6373211079199701 / 113.53437109317777 | 45.816980378254804 / 106.44674524729389 / -49.6476506021933 |

No material new hue, channel, gamma, orientation, atlas, mask or missing-facade regression is visible. View00 exposes crossing paint and frontage,01 includes the station/rail roof and adjoining blocks,02 adds an oblique skyline/cutout view and03 shows another crossing/station angle with a large foreground building. These four angles have no matching retained baseline, so they extend exploratory coverage without proving pixel equivalence. Blurry/smeared façades, empty streets, foreground occlusion and whole-AOI quality remain open. The four static Satellite/noon frames with agents disabled cannot qualify animated inhabitants, contact, traffic safety, population scale or60fps.

All135 actual before-code records were independently rehashed by their stored absolute path, byte length and SHA-256 with zero mismatch; the after-code records are identical. That list includes the four product paths. All nine frozen product/test files were separately rehashed against this report's accepted source bindings with zero mismatch. The four build files also match the unchanged canonical certificate `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce`, run9174dee71f86ed7d. Before/after scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`, harness digest `8f22bf47a0fe20f9c040010e11de6010834a33505feee07848f064da52e9c3c8` and RTX4090/D3D11 driver616.64 records are unchanged. This checks recorded aggregate scene/harness continuity; it does not invent a new HTTP body audit or new complete scene rehash.

Actual cleanup SHA-256 is `b904ec53b7f36cf790ba4f82a96c856e068737727244b4e2d74f527e7108b019`; closure census is `4b76cfbf03c61aec923bb9bd86739f2f083d8165a4ab9478932a10d4a4991862`. Six JavaScript close flags are true. The available final census records no admitted or omitted live identity, descendant, unavailable ownership query, marker process or4325 listener; only the owned temporary path was removed. No reviewer-owned process was launched. This acceptance closes the GPU texture-preparation increment, not the Shibuya map goal.
