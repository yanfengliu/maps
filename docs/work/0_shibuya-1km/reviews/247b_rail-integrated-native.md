# R247 final integrated and native review — 2026-09-28

**ACCEPT the bounded default static rail activation milestone. No new material finding. R247-C1 remains closed.** This review does not close full A5, R205-C2, the remaining rail exterior views, moving actors, or temporal acceptance.

The reviewed primary working tree is the 32-file candidate on the coordinator's stated main base `3a508e9`, with exact source digest `b3b703edac309435fe27738822005def3ba67d0bb9c6b4be61f7393db71e6347`. Every primary candidate file matches the previously reviewed repaired freeze, byte for byte; the complete file records also match. Integration delivery/commit remains the coordinator's responsibility; this report makes no Git or landed-revision claim.

I inspected all 44 frozen certified images and both retained style-return originals individually at their native 1280×720 resolution. No contact sheet substituted for a view. The visible crossing, roads, markings, trees, buildings, exposed rail corridor and elevated spans remain coherent in both styles. The exposed rail strips, sleepers and support bed survive the real style return at noon and dusk. I found no new material blank-scene, missing-tile, rail-disappearance, geometry explosion, startup or style regression in these retained observations.

Several block views hide the rail behind buildings, so those images cannot accept the obscured exteriors. The particularly large facade blocking block azimuth 060 is present in the prior retained Cartographic frame inspected for that specific suspicion: `artifacts/authority-integration238-repair-20260927/native/sweep/cartographic/block-az060.png`, SHA-256 `7b8f49240e0610c18070fc8d94a4fb50981b3b9b8fbb6d7ee989aaddef3e578d`. It is inherited camera occlusion. Coarse source facades, repeated Cartographic windows and the broad simplified rail bed/shoulders remain declared limits; these views do not establish photoreal rail exteriors.

## Actual flow and its bound

The retained raw `hero.json` records were checked against the compact style evidence rather than accepting its summary alone. Both before/after pairs match exactly. At dusk, frame 960 advances to 982 with time origin 1790564802202.6; at noon, frame 957 advances to 979 with time origin 1790564837304.4. Each Satellite-to-Cartographic return has the identical camera object, unchanged time origin, ready true, error null, contextLost false, unchanged drawn building bounds/triangle count and only the intended style URL change. The after images above were inspected.

All four live records contain manifest `e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707`, 20 rail layers, the exact ten replacement building IDs from the admitted packet, 8,629 source triangles and 9,905 return triangles. This establishes the recorded live rail state before and after those two real control-driven returns. The stock hero gate asserts camera, document, rendering and building preservation; these specific rail fields were recorded by it and checked in this review, rather than being a separate stock gate assertion.

The inspected control path at `tools/visual/hero.spec.ts:322-379` opens the World style control with Enter, chooses Home, commits Enter and waits for advancing rendered frames. It does not set style state through the harness. The ordinary Vite configuration at `vite.config.ts:7-15` binds the installed packet unconditionally; `src/app.ts:204-206,269-278,314` loads it, shares it with buildings, awaits construction and mounts/style-registers its root before readiness. This remains the previously reviewed source, now verified unchanged in primary.

The gate uses ordinary application URLs with time/style/seed queries and no diagnostic rail override. It is not evidence of a literal bare-`/` navigation. The unconditional source binding plus these ordinary startup observations support this narrow default activation claim. No essential additional live observation is needed for that accepted contract, and no new capture was launched.

Three retained hardware lifecycle records independently match the certificate build hashes, report completed teardown and no console/page errors, and finish replacement startup in 19,440 / 19,825 / 19,293 ms after navigation steps of 120 / 129 / 129 ms. The lifecycle control path exercises both styles and camera distances before navigation away and replacement readiness. This is a generic successful teardown/replacement observation, not a direct measurement of every rail GPU allocation or rail-specific replacement-document count. CPU ownership tests and the prior source review remain separate supporting evidence.

Advancing frame counters prove render-loop progress. They do not prove simulation movement with a default population of 0 pedestrians and 0 vehicles. No actor movement, collision clearance, full exterior coverage, whole-process GPU allocation or long-duration temporal claim is accepted here.

## Bindings and gate receipts

A small read-only calculation rehashed the actual primary files and retained evidence. It checked all 32 candidate files against the repaired freeze; all 293 broader source records, 41 executor records and four build records against equal before/after snapshots; all 34 installed rail files (52,950,963 bytes); all 46 image bytes and their PNG dimensions; all 12 delivery receipt hashes; both raw return records; and all three lifecycle records. The current served tree and harness digests were recomputed with the repository's existing exported digest functions.

| Bound | Verified identity |
| --- | --- |
| Repaired candidate freeze | `eecdb9cb80edae8679388fe0beda05890e10c865bc2df8e126e701a448e5682e` |
| Delivery record | `e69dcf328f57eec7088edaab7d8d56d2ab0a72f0579a86712bee1ef82304c7e9` |
| Native frame manifest | `da8f80624b07b9eb53f216999219a455eee4586efc807086c886b639caea8c8d` |
| Certificate | `5e840cb606f614b0068fbac08b9db61822ad7695340f922d3da54ed6f2d2f3b7` |
| Raw hero evidence | `e721ced3060d5850aa1120355fadb1ca37eb95304b6539a691c3da1b7d72ec4f` |
| Compact style evidence | `d52759d171726c861dbd028f2f317856215ea1ae54e4b024b1bd3bc84057ffb7` |
| Served /scene/, /network/, /rail-trial/: 151 files, 354,733,717 bytes | `51ba80aac99fee427229571aa33ffc5d05dceee613330712f3f5637ed344aaa0` |
| Certificate harness: 24 files | `0e6fe08b850829403b5f076e171e10d52a1a313faa3a2e39a829ccb68ed46701` |
| Broader source snapshot: 293 files | `552cf647ec0df290533a6386bab5ea6dac5f2f2e98e99c9561edae8dcdeb596b` |
| Executor snapshot: 41 files | `8fe95e25a0be8c6db2960eee553e5928b029ce7b0dc148b5588e777d44d8620a` |
| Build including source map: 4 files | `8d84246b92ce98a7f36494b02e40ff62e24dcfd918f17699f834a66a3f27bcfe` |
| Reviewer calculation receipt | `682d32e74c36d72b79e513522a3d9ef1b003ba4dc7f68154ba92824dde03bb2d` |

The certificate is run `376a2e4227612ab8`, NVIDIA GeForce RTX 4090, driver 616.64, ANGLE Direct3D11. It contains all 44 certified frames and three hardware lifecycle records. The two extra return images are outside the formal 44-frame certificate but are byte-bound to the raw hero record.

Retained literal gate logs/receipts show build and types exit 0 in 236h, 102 unit files / 908 tests passed and audit exit 0 in 236i, and the complete visual certificate above. Audit retains two moderate Vitest/mocker advisories beneath its high-severity threshold; the build retains its chunk-size warning. The earlier 236h unit result of 907/908 was an owned-TEMP placement failure and remains preserved; corrected external TEMP, unchanged source, focused verification and the complete 908/908 successor replace that failed run. No skipped required final gate is being represented as passed. No gate was rerun by this reviewer.

The snapshots and current recomputation establish matching bytes at their observed instants. They are not continuous mutation exclusion. Receipt `owned-run-receipt.json` reports completion and no retained/scoped/unadmitted live process or port listeners; the exact four-root temporary cleanup receipt reports no links and unchanged protected scene/network/rail identities and counts. These are retained observations, not a new reviewer process census. The reviewer launched no browser, server, GPU process or other persistent resource.

## Native image digest roster

Every row was individually opened at original 1280×720. Paths are relative to `artifacts/rail-integrated-gates236i-20260928/native/`. Rows 1–44 are the certified set; 45–46 are the separately raw-bound real style returns.

| # | Image | SHA-256 |
| --- | --- | --- |
| 1 | hero/hero-satellite-dusk-crossing.png | `ab6ae057b1c06ddf68d59baad7ffbc4dcbf6bdf1fadd6208054f5a6509cec305` |
| 2 | hero/hero-satellite-dusk-approach.png | `189538be1ed7c401529c5a2d4b61a6dcb5e7e0ad80a99058fbb61da80870af0d` |
| 3 | hero/hero-satellite-noon-crossing.png | `1f2a296f11ea27d63510a1bc52264b054e44ff48380557174a75c66555330bbb` |
| 4 | hero/hero-satellite-noon-approach.png | `9c0fb899cc147f6f47d818e97c5f65b09a1c2c9e8d890ab78a3a7244fe802b04` |
| 5 | hero/hero-cartographic-dusk-crossing.png | `266b67a437b2564988975d8359835fbc5d91c31235b736b67c8ebea171cf3546` |
| 6 | hero/hero-cartographic-dusk-approach.png | `b75406f596a35fefe27dcfab732135041550f6ed15d219ca771708016204f954` |
| 7 | hero/hero-cartographic-noon-crossing.png | `da991d65279e748dcbdae1c1acbfd6f925e1c925bff8bc30312bc1b719daee1f` |
| 8 | hero/hero-cartographic-noon-approach.png | `77c4aead81c8ad01feb49b2d6789f00aaef6f33b52a263ec5e7d10f8db2341a6` |
| 9 | sweep/satellite/plaza-az000.png | `9fb39755af1a59b69b5d6670df2c0e8660ab140a91d3a1712b4f4420a9cb1f24` |
| 10 | sweep/satellite/plaza-az060.png | `082890017b57b356fb3cacdddc6f34a93c6dbca2e0cdd3a81c1c808856dde0f5` |
| 11 | sweep/satellite/plaza-az120.png | `890d0da11ec9ae4c798fe62025ea97fcd3f2aaa56411968768abb5895bdd66ae` |
| 12 | sweep/satellite/plaza-az180.png | `bf9359603e1508f5c7271958266ca69ae37dbbc30ad416a3820f736f69d8ebd1` |
| 13 | sweep/satellite/plaza-az240.png | `3a50902156cca34392da73ab02a35eed9c53029184b65e9ba536011165615cd4` |
| 14 | sweep/satellite/plaza-az300.png | `3e2e8556a5af10da782878aacd14d165b4d2902726f7ff57a083f8ba70487fcf` |
| 15 | sweep/satellite/block-az000.png | `339ff9f8b6785419506282ff0cfa005b237bd5c5b4f6b0249cf25d9bd848f8c2` |
| 16 | sweep/satellite/block-az060.png | `ee1290c801bbd7ffc625fc97b1cd3d0c4524c9f1a88c1b6f42bc288063ab9315` |
| 17 | sweep/satellite/block-az120.png | `c1fda55f4ec3299a36c658c87d58f02efed0d66bf9af70dbfdabde3421542786` |
| 18 | sweep/satellite/block-az180.png | `536794a4ffe23981b416fa79e8fa3807adbf71f1372b901f84b9517926b8bd44` |
| 19 | sweep/satellite/block-az240.png | `5f46c249c8b0205bbd39d7e166b703bd064857c3ea857f992c0bdd7d44836153` |
| 20 | sweep/satellite/block-az300.png | `be17ce12ddf547633bb32e9a12d08cf4a7f397c16b797bc324d953f0fe594f8c` |
| 21 | sweep/satellite/overhead-az000.png | `692dcc19482c7cdf14efaffd6cc57fc87fc0412afae977c604f4ee89b3380291` |
| 22 | sweep/satellite/overhead-az060.png | `15e7897da65f2a34c02a8f1e21ecdb2b46af1e64032a850f12acfafce70b1648` |
| 23 | sweep/satellite/overhead-az120.png | `202fcfbf6492a61c0723f24e731b8a7e308d8571f660c307d64f237756c9c31c` |
| 24 | sweep/satellite/overhead-az180.png | `ada70d78f4d6a626df523fa17d47d549a61dc7a4a58f834bd22329450cee2f24` |
| 25 | sweep/satellite/overhead-az240.png | `425830c58b9ba65407c8c2070eeaea10ecde3b7518bb7562d903d86cea19855f` |
| 26 | sweep/satellite/overhead-az300.png | `dd6f659a7f8e68020edb6d1ec925644de6712bb4e8821ac51ff969fc0e8c1a84` |
| 27 | sweep/cartographic/plaza-az000.png | `70290846dad6a2921826f3a5b6f5c807d9df113971a0be69a205351411b9549f` |
| 28 | sweep/cartographic/plaza-az060.png | `335919c2ae0858d0b9cee50c604115d702744246467c9b64b88d60f0202a91bb` |
| 29 | sweep/cartographic/plaza-az120.png | `2c71c97ce3ba97cfa33904f1fe7107a0a89a71aa14689434569e1c29e6f7eb52` |
| 30 | sweep/cartographic/plaza-az180.png | `d777cf25a44c7123d0bcbefc81e7cfd9ddf190a87a8cd2e8c0a78b6a36b4218c` |
| 31 | sweep/cartographic/plaza-az240.png | `c6ed36a444ba39446b1fa6b820953bb035a702c7b88431096cc91865d2acd383` |
| 32 | sweep/cartographic/plaza-az300.png | `13d2f166d709d7b5317e3d57f7571d53f9ba2723dc04fb38e368059d547efeb1` |
| 33 | sweep/cartographic/block-az000.png | `591915f725bf49d6491365b483443988c9e4ce4f4a11b74ce48f31703ad03110` |
| 34 | sweep/cartographic/block-az060.png | `28b5eb9f365d7ee3cceec21009e37ca0ad3f5eb628f67a05ddc7be82522a9c4a` |
| 35 | sweep/cartographic/block-az120.png | `a983a9fa5cc350f1b01add664b829515529ffa44349db690e48328b9e4441395` |
| 36 | sweep/cartographic/block-az180.png | `8acadafaefbeeae5a8fdb3aaf05b8f611562275c3f557aa18309b3469df46dd9` |
| 37 | sweep/cartographic/block-az240.png | `0d045b0f0a5b56fa2f7da6a1f24f96180763a06e0e1eb4bc30c8d092c7e34c92` |
| 38 | sweep/cartographic/block-az300.png | `83f58c21fdc4037778932b5d16b2b6d4286871db6cea6a134decdd43b4a88e3b` |
| 39 | sweep/cartographic/overhead-az000.png | `a2e1a6ecdac7274c62651a7d3076a5975722254c634f8f9d8e7ad1c125c9234b` |
| 40 | sweep/cartographic/overhead-az060.png | `de4252e25f212c5ac07ad3831a617021f56f165228ddfb2a22fcabea7b2da41b` |
| 41 | sweep/cartographic/overhead-az120.png | `eb3535a611317718f26c7b856da7371bd0458c9d06141c8c19abd213707cfd03` |
| 42 | sweep/cartographic/overhead-az180.png | `abecdae148faeb303305ef94a57b7bc081a0b05250a91e4d6590bf63557a2686` |
| 43 | sweep/cartographic/overhead-az240.png | `4671f5e712b5ff907c6cf69febb8c2f3ccfdc1e3940f44bc88f72e2894774e49` |
| 44 | sweep/cartographic/overhead-az300.png | `06465e954a94cf6bad7ce2198a68d47c9071088ec97f121eed95ddc2e280c6ef` |
| 45 | style-return/return-cartographic-dusk.png | `c1f232d7ab5a2f2d71fa7f76ac5ca589e26463bc750d8040bb7749a755746e49` |
| 46 | style-return/return-cartographic-noon.png | `6eba41136918ac09d5254daa07c243e3ecc31db9f9342fd530e565514841ff85` |

The report and small calculation evidence are intentionally retained only in the review-owned ignored folder. Product source, canonical docs, frozen evidence, Git and other workers' resources were untouched. The review slot is released.
