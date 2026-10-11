# 634 — Fresh Satellite review

## Source review — 2026-10-10

No blocking source finding in the frozen sign-mask startup change. Reviewed FRONTAGE base `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`, the actual 49-line addition to `src/scene/signage.ts` and the new `test/sign-mask.test.ts`. Inspected source SHA-256 is `e39d0d2e3334877e910a9a9fc81234773458610d056ba8721a89540ca4153318`; test SHA-256 is `f829e3f96308fe1f67efa8712242f5808f4714f900a64856dac67106aefa1e3e`. Other uncommitted product paths are outside this review and are not admitted by it.

The fast path requires identity with frozen `PLATEAU_SIGN_MASK` and an RGBA-complete byte buffer. Every reachable eight-bit RGB input has `0 <= min <= max <= 255`; the table covers all 32,896 such pairs. Each entry repeats the original value, saturation, smoothstep and maximum arithmetic in a Float64Array. Alpha rounding, strict `mask > 0.5`, summation order and empty statistics are unchanged. Intermediate-channel and channel-permutation changes cannot change either extreme. This establishes source-level output equivalence for the declared byte-array contract without relying on aggregate atlas statistics.

The retained original loop handles equivalent copied settings, custom settings, nonfinite or degenerate thresholds, settings getters and incomplete RGBA tails. The 256×256×8-byte allocation is exactly 512 KiB, created lazily on the first default complete-buffer call, including an empty call, and retained once per module instance. It adds no texture, renderer or GPU ownership. The production caller still writes the mask before de-lighting. No visual treatment, source eligibility, atlas cap or authored illumination changes here.

The test freezes the old public loop and literal thresholds independently of the production response helper. It checks every unquantized extrema response, both supported array types, channel/middle permutations, overwritten alpha, ordered statistics and fallback cases. Literal boundary checks and the frozen-settings assertion make a changed threshold visible. These are meaningful equivalence checks rather than a table inspecting itself. This reviewer ran no gate; [583](583_sign-mask-four-checks.md) is historical four-gate evidence and [580](580_mask-startup-comparison.md) is bounded warm-service timing evidence, not fresh integrated qualification or rendered equivalence.

Source reads are released. Canonical PRIMARY 44-frame/three-lifecycle qualification, native inspection of all 22 Satellite originals and final integrated revision binding remain pending. No browser, server, GPU process, gate, source edit, data write or index operation was launched by this review.

## Canonical native round — 2026-10-10 local

Accept the exact LUT candidate's bounded Satellite appearance qualification. All 22 Satellite originals were opened individually at their native 1280×720 size: four crossing/approach noon/dusk heroes, six 45 m plaza views, six 220 m block views and six 950 m overhead views. The six bearings are 0°, 60°, 120°, 180°, 240° and 300°; sweep polar angles are 1.5, 1.28 and 0.62 radians respectively. No contact sheet or thumbnail supplied this verdict. The frames show loaded photographic facades and signs, coherent crossing/roof/rail geometry and functioning noon/dusk presentation. No material visible failure attributable to the lookup change was found.

This is fresh rendered qualification of the source-equivalent change, not a paired pre-change/post-change pixel-equality proof or a visible quality gain. Soft photographic facades, sparse streets, isolated bright pavement/facade spots and a dominant foreground tower in `block-az060.png` remain visible. That view cannot establish an unobstructed block survey; its pixels alone do not establish camera penetration. Source-level LUT equivalence does not excuse these broader existing gaps. The full map, populated performance and temporal appearance remain unfinished. Detailed Cartographic review is deferred; root owns basic style/controls acceptance.

Inspected bytes were hashed before viewing and rehashed afterward. Every row below matched both its actual specification manifest and the final certificate. Evidence root is `C:/Users/38909/Documents/github/maps/artifacts/visual/`. Certificate `complete.json` has SHA-256 `5f7aea7474c798763c8cfdd28849a92954b26b218980f89ccf6b22de2b48ac69`, run ID `dc500f31f40a7746`, hardware RTX 4090, driver `616.64`, 44 frames and three completed error-free hardware lifecycle records. The inspected `hero/hero.json` and `sweep/satellite/manifest.json` hashes are `382e42bd168e4065c06e3b55a4e60b3f734b7451a91657a7aa44e34efaf77bc9` and `efb15f9f82c8bf321911c5357e758fe33397c7a641af981113e41d686a36e968`.

| Individually inspected original | SHA-256 |
| --- | --- |
| `hero/hero-satellite-dusk-crossing.png` | `5392d20b77caea6dc71f9d367790b63a1a39895f7f810479940b5f2daf7b1b5a` |
| `hero/hero-satellite-dusk-approach.png` | `dfe3cfc3ecec3023b9cc15f2e5414a06f08b1ca67348f15755036aa9fe963d83` |
| `hero/hero-satellite-noon-crossing.png` | `d883343ad226355acf47073801365995c9b93f3216e6114175f82290b0696fb4` |
| `hero/hero-satellite-noon-approach.png` | `0cae47789388f233b444e53b93741f1abcefcd58fc5f20931e3044b12cf1abf4` |
| `sweep/satellite/plaza-az000.png` | `4ad6549ecb5bcc64d9a7dc1caf916fdc21a3de6c54eaf8398ef7c5e87d5d9076` |
| `sweep/satellite/plaza-az060.png` | `dff5767ef3de6b42c31269d3700b64cb64c03dd35c78e4a87b30869823579f89` |
| `sweep/satellite/plaza-az120.png` | `9a253b66fa987964ea8c55564e39862a674af7ce283dd416baa37e412bcaafc3` |
| `sweep/satellite/plaza-az180.png` | `cadbfec0eb2c87eed8a69126feb6c189a94c51151eee94f27f1c68d54f9ea835` |
| `sweep/satellite/plaza-az240.png` | `c827b0c05c43a8c25e6169ecb33823e3a9cd176be8975d194061ccb8ecf2c083` |
| `sweep/satellite/plaza-az300.png` | `39d9bb2334f3bc8a4a56fa5bfc5c25bfdef2d4cca81f7b7f3ca56c95c0f4828c` |
| `sweep/satellite/block-az000.png` | `0e8432bdc8df67a8e85decd8dd4959a47eb1d95eeabfaa81a7f072d80c137d49` |
| `sweep/satellite/block-az060.png` | `b314afa27a74ca01dce4bf1b7d613c776df8655ce4801669e3e0f440d1072a1d` |
| `sweep/satellite/block-az120.png` | `d16ee326d3e7221e0cce5bc8e87498a1533d58e580a2b9d80ab85f99913004c4` |
| `sweep/satellite/block-az180.png` | `78cd110af241e2d7ed13f9528cd39aa946cde9581d8188f35d1642fa20279af1` |
| `sweep/satellite/block-az240.png` | `422030dc2982f144427db54277080b123815ffcde060cb2f6247219f288d59b5` |
| `sweep/satellite/block-az300.png` | `b1176d135bd35952c8b8045f4caf892bb157bbb196e4f07afa3d81ea081c8a3b` |
| `sweep/satellite/overhead-az000.png` | `b4ba8e0aa952bf6647f9e22bb219e63668136f54893d5b25c66b2537c7dcd3d4` |
| `sweep/satellite/overhead-az060.png` | `58159de3c0c358d2cd8582585fd34ad4f0e6b45284295642c88be28475597033` |
| `sweep/satellite/overhead-az120.png` | `76f962fa3f967b47d1d5582371685653b1c2362335ef812cef5884ab439ebeeb` |
| `sweep/satellite/overhead-az180.png` | `c3b458a844e01bb339c2f418bed7038be71cbc385f169814188bb31535d25194` |
| `sweep/satellite/overhead-az240.png` | `051ca3fd62ff4c625f2d3d4ebf7d71306a7b8eb571d6174c778d179d9e5f9c5d` |
| `sweep/satellite/overhead-az300.png` | `db8ef40aee0175b283b2fa667480986b266a5674b90dffbb9edc61ed89d262d2` |

The actual after-visual receipt records PRIMARY HEAD `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`, empty staging, index `610c2cd31f6bc168304220e63ee17234d86440476694d5e8e09ec51dc5408dd0`, 452 source rows, unchanged installed/data inputs and the exact reviewed `e39d0d2e…`/`f829e3f…` candidate hashes. Its SHA-256 is `36dea62cd43fda2cd8b2cd0cb551d3ab11d9e7d928846b933a6c0d3d3170ee93`. The certificate binds 151 served input files and scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`. This reviewer checked those bounded records and the 22 actual image hashes, without independently repeating the entire source/data census.

Owner cleanup exits 0, with 44 already-exited retained identities and 25 not-admitted identities. The available closure census records zero admitted/omitted live identities, descendants, uncertain ownership, marker processes or port 4319 listeners. Owned TEMP and the zero-reparse cache are removed. Inspected cleanup/census/cache receipt hashes are `1fc5e9fd643fc8dfa2123ca09107c3d0a73159cfa82e8b03ee61291ee1e9906c`, `085ff44faf2f07e38eb78580a479fe587bc4d0f35cd387bf9ae37b7e120b50d5` and `c653f64d8ebb70e6a9313898b49fd3b76c317e677f16c02882eafeab8264e753`. The review itself created no runtime process or temporary artifact.

The standalone LUT code checkpoint is unmerged `883288994343eb4fc8533d3e0e439f11355fcbfc`; no main integration is claimed here. Root reports current build/types/1,065 tests passed and the audit failed on unchanged development dependencies. This native round closes the Satellite visual-review requirement for the exact candidate, not the red audit or all-five/main acceptance.

## One visible priority after the existing commits

Replace the conspicuous crossing trees' pole-like form with a believable branching tree model. The nearest tree in both crossing heroes occupies approximately x=1120–1279, y=174–485; its exposed trunk is a smooth straight cylinder with an abrupt crown join. `plaza-az060.png` gives an independent close view at approximately x=607–811, y=156–506. Smaller trees in `plaza-az000/240/300.png` repeat the same visual problem. These shapes are sharply visible against the soft facades, so improving their silhouette and trunk structure can deliver a concrete close-view gain without unsupported facade reconstruction.

Keep the mapped positions, support, scale and existing seeded crown variation. Scope the change to the existing vegetation model builder: tapered trunks, visible branching and irregular connected crown form, with bark structure that reads at the inspected distance. Use the current noon/dusk crossing heroes and plaza 060/240/300 as fixed before/after acceptance views, then a held-out close bearing through real controls. Accept only a clearly recognizable shape/detail improvement with sound base contact, no added density or road encroachment, and stable block/overhead surroundings. Source and resource feasibility still need the implementation owner's normal inspection; no pilot is authorized or implemented by this review.

The dominant facade/road/lighting gaps remain more substantial whole-map work. Repeating 457's weak linework, 528's fill, 557's teal facade response, 589's glow or 600's ground relief would change coefficients while leaving the pictured tree form untouched. This next increment should change an obvious object, then pass independent native review and land before expanding it.
