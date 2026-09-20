# Review 44: integration

## Target

Repository `maps`, base `27c71865bef31a7c9dcc622db16e6721be839dc3`. The scope combines the separately accepted lease v2 and capture v2 components, reconciles their documentation with newer primary history, and retains Reviews 39–43 and their targets. It excludes Q4 preservation code, walking prototypes, prior solver/lateral candidates and final city acceptance.

The initial 35-file integration target is `artifacts/population-capture-integration/wt/artifacts/integration-evidence/combined.patch`, SHA-256 `0ad68eb7d857b3b65ef2fd9096398159a9eabd69821d5528fa4ac7ffaa059f5e`, and `freeze.json`, SHA-256 `9be56b16cfaa53f1e6ea96e9819af0fed40d91aee80478765865235854f7a84a`. F25 below rejected two documentation links in those bytes. The repaired target is `combined-links.patch`, SHA-256 `fdb7327e58345dcf7f8bd409f856089f77887b9b5013f58c5b70d232edb9f350`, and `freeze-links.json`, SHA-256 `960d8deb2c5b07442cbec8350785cfce687df504ae360cd58528f2119f89dce5`. Both patches and freezes are retained in the reviewer's ignored `artifacts/review44/`.

The exact initial F25 documents are retained at [defect-register target](../snapshots/44_initial-defect-register.md), SHA-256 `ac06a966cbc04a0c8ad98e2d206b9357db09ab69c730126f9ba3887a6d6c45bd`, and [gate-proofs target](../snapshots/44_initial-gate-proofs.md), SHA-256 `3c3f32eeb9a1a014d5f44531f71bda42908d1b7f7d002f007b05a8cdef924d18`. The [integration preparation report](../snapshots/44_integration-preparation.md), SHA-256 `46e62b049a65969a1867aabf7841a31262a76e111551ec3d60d742b4be1124e6`, and [reviewed canonical plan](../snapshots/44_integration-plan.md), SHA-256 `cbcafd622f625cb8ff1a66ea919ff64dae09ea8bf48fd0be32fbb7f1c1ec11a3`, preserve their pre-gate authored claims. Historical claims in those snapshots are not a new completion statement.

The final reviewed target adds only post-gate status prose in the canonical plan and summary: `combined-post-gates.patch`, SHA-256 `8f5e5950956d610191a8ef9522b6b491cd1bc2c36ae3b6d27cef6ed30b933f30`, and `freeze-post-gates.json`, SHA-256 `2d351afec92841a71b412ad88ed64400c91d1ca721d5972801cf79aa2e0b99c2`. Its 35 files match directly in primary. The [post-gate plan](../snapshots/44_post-gate-plan.md), SHA-256 `839e0223bd39947071dfc019f8735a8503efeeb79ade1c4d4e7cc709eea12970`, and [post-gate summary](../snapshots/44_post-gate-summary.md), SHA-256 `40d2ce949cecd5776ce20106ff9bebbd6939af429f7c9aaaf99f9b6b00c36da9`, preserve that exact document target before final acceptance wording.

## Reviewers and coverage

`motion_review` is the independent read-only integration reviewer in `artifacts/integration-review/wt`, detached at the base revision. I authored the preceding independent Reviews 41–43 and the mechanical wrapper preserving Review 39; I did not author either production component or integrate them. I separately authored the Q4 preservation candidate, which is explicitly outside this target.

This round independently checks byte transfer, component manifests, documentation reconciliation, reviewed-target recoverability, focused F25 repair and all 36 certified sweep PNGs individually at their native 1280×720 size. Root independently inspected the eight hero PNGs and supplied the attributed report below. Primary application and gates belong to the sole integrator, `lease_retirement`; root owns acceptance. This reviewer ran no product gate, application, browser or data writer during the integrated gate run. No additional CLI reviewer was run in this round.

## Reports

### motion_review — source transfer and documentation

All 35 combined files matched their frozen hashes in the preparation worktree and directly in primary, before and after the link repair. All 16 non-document files match exactly one of the two accepted component manifests; the component path sets do not overlap. Both component manifest hashes and every original author file in those manifests were checked again. The twelve retained review/snapshot files match their original sources, including the exact normalized Review 39 plus its original authored snapshot, the design-only Review 40 and its two targets, and Reviews 41–43 with the appropriate author targets. No source change was introduced during integration.

The shared summary, defect register and gate proofs retain the current base's original content in order. The lease author's additions from its older base also remain present in full. That independent prose check normalizes line endings and does not claim unchanged whole-file bytes for a reconciled document. Newer certificate history was not overwritten by an older lease document. The separate devlogs preserve each author's historical verification claims, while the canonical plan correctly distinguishes accepted component transfer from pending combined gates and still-open city criteria.

The code review coverage of Reviews 41 and 43 transfers to these exact source bytes. The lease change remains within terminal clearance, current edge viability, live footprint observation and occupied retirement. The capture change remains within adjacent canvas copies, capture-validity refusal, actual input dispatch and observer cleanup. The app bundle changes through the lease component, so the previous primary visual certificate is not a new-bundle verification. No combined runtime claim follows merely from non-overlapping paths.

The Q3 authored note is intentionally retained only at `snapshots/q3-motion-capture-review43.md`, with its exact authored hash. I found that two new canonical evidence links still pointed at the absent former top-level path: `defect-register.md:446` and `gate-proofs.md:1529`. The main plan, local policy and devlog links had already been mapped. These two omissions made the permanent evidence chain unresolvable from those canonical entries.

Root accepted F25 and assigned the sole integrator to repair it. Independent comparison proves that exactly one old target was replaced in each document and no other bytes changed in either file. The replacement target exists and has the accepted Q3 document hash. The repaired defect-register hash is `00c29b14834ca0644042d57e73821eeb9d7957f1be4db20238aab8109b098531`; the repaired gate-proofs hash is `773abefc748d16215c5daca82949866029b1a2460eca762303767214e617f6ad`. All 16 non-document hashes and twelve historical review/snapshot hashes remain fixed. F25 is resolved within this round's focused recheck; the rejected initial bytes remain recoverable.

No additional material integration code or documentation finding was reproduced. The pre-existing work-docs structural failure at top-level `handoff.md` is disclosed in the integration handoff; this round does not invent a structural pass or silently rewrite inherited documents. The plan continues to leave crowd stalls, AOI egress, natural supported walking, final population performance, source rebuild authority and temporal flicker acceptance open. Native still-image inspection cannot close those criteria.

The post-gate document delta changes only the plan and summary. I inspected the actual prose against the separate process exit records, unit output, visual certificate and cleanup receipt. The plan attributes the separate walking candidate as a frozen, unaccepted `productionReady: false` experiment; its refreshed 19-test count and disclosed support-refusal census agree with that author's handoff. No walking code is imported or accepted here. The new milestone prose accurately says all five gates passed while Review 44, native acceptance and commit were pending at the time it was authored.

### motion_review — 36 native sweep images

I opened every certified sweep image separately at its original 1280×720 size: six azimuths at plaza, block and overhead distance in both Satellite and Cartographic styles. I verified every certified image SHA-256 and native PNG dimensions before inspection and rechecked the hashes afterward. The table below binds the inspected bytes; no contact sheet, thumbnail or old-review transfer substitutes for these openings.

All 36 images contain a complete rendered view, a readable style control and attribution. Plaza views retain the crossing stripes, pavement, street furniture, billboards, trees and surrounding building faces. Block views retain the surrounding building mass and streets, and the overhead views retain the bounded city/terrain footprint with distinct camera azimuths. Satellite retains photographic surfaces and its dusk light pools; Cartographic retains its quieter palette and repeated window treatment. I observed no blank capture, missing whole scene, displaced crossing or new gross still-image regression from this integration.

The large foreground surface obscuring much of `block-az060` is present in both styles and remains an existing framing/scene limitation, not a newly attributed defect. I opened the preserved prior certificate's Satellite `block-az060`, Satellite `plaza-az120` and Cartographic `overhead-az300` at native size as scoped baseline comparisons. They show the carried obstruction, photographic softness/warping and existing light/pavement/terrain presentation. This comparison does not identify the obstructing surface's physical authority or accept all existing appearance limits. All 44 new PNG byte hashes differ from the preceding set, so this review relies on the fresh openings and named comparisons, not presumed byte identity.

These appearance fixtures disable agents. Still frames do not exercise terminal retirement, prove supported/natural walking, establish population performance or measure temporal stability. They do not supersede Q3's explicit `sceneVerdict: not-established`, its 22 residual failures or the motion-model counterexamples. The two style-return captures and stale root-level sweep filenames are outside the certified 44 and were not added to this review's claimed frame set.

### Root — eight native hero images, supplied report

Root reports opening all eight certified hero PNGs individually at original 1280×720, then independently recomputing all eight SHA-256 values against certificate `7f68c3883cc3f1ce`; all matched. Crossing and approach views were complete, both styles and dusk/noon were distinct, and facades, crossings, pavement, trees, billboards and UI were visible. Root observed no blank/missing scene or new gross still-image regression. Root explicitly retained the existing Satellite texture softness/warped low-detail surfaces and drew no population, naturalness, temporal or flicker conclusion because agents were disabled. This is root's attributed inspection, not a claim that this reviewer opened those eight images again.

### Native image byte bindings

Paths are relative to primary `artifacts/visual/`. `motion_review` opened the 36 sweep rows; root opened the eight hero rows. Every row is a native 1280×720 certified PNG.

| Frame | SHA-256 | Inspector |
|---|---|---|
| `hero/hero-satellite-dusk-crossing.png` | `f56f04d37bf7b93c7383702801bed1bbe3729b3c9712b6cadc64c6948842619a` | root |
| `hero/hero-satellite-dusk-approach.png` | `04490d861572db0cb51c52ab090f33880b977ddbd9e49707af666d241cb68a37` | root |
| `hero/hero-satellite-noon-crossing.png` | `3c229ea28b1899d1394b12fd0483dbde077b258260084437be248451c4ef4674` | root |
| `hero/hero-satellite-noon-approach.png` | `c75e4302f259b88f5e60ccecbbdb35dbd9dbac9ad6e9d39e3f7cec078f5135f7` | root |
| `hero/hero-cartographic-dusk-crossing.png` | `f7deca54fdc8b0eee75c832f29d64f23cfcaaf10cd98b82e82e16faaddcf102a` | root |
| `hero/hero-cartographic-dusk-approach.png` | `5b5f8e8f4c41db8de755d08dba81449125d66c702541ad6509906209a1a2e49f` | root |
| `hero/hero-cartographic-noon-crossing.png` | `bf32adeac0ce924e570fdbcf4ac553e51aca8e608918a7b3c6c4210af6ae1b12` | root |
| `hero/hero-cartographic-noon-approach.png` | `4e7f2b7313c5369b1a8c2b6ae7913ab0a572123c26f2a8149576b0b206df003d` | root |
| `sweep/satellite/plaza-az000.png` | `6e0c519de52ca28e3c9216c9587fc5fdae867404a3a1fb92f1dcf9f343ed4d3a` | motion_review |
| `sweep/satellite/plaza-az060.png` | `09cecded45f1b5477cfcbe216777e72e5cb2cc8555ef5dd1393de4132b7e8750` | motion_review |
| `sweep/satellite/plaza-az120.png` | `72b2d7288cac49ce9a97a1107d9d5889af2a6c2a962cb885a534d97bc605c318` | motion_review |
| `sweep/satellite/plaza-az180.png` | `bcf6b24b0e1a66260283293058d66377496f20f21b38598f72291e290ca83296` | motion_review |
| `sweep/satellite/plaza-az240.png` | `c130e0b5d566db145b0e76a6fdadad5aa3074d8b36d4c241cc7031414745bc15` | motion_review |
| `sweep/satellite/plaza-az300.png` | `d52daa95a6cbdd9d27170256e4f5af8ea88296fa58096d0597aa6ee9e2cdde86` | motion_review |
| `sweep/satellite/block-az000.png` | `88b5a99ee9683d0884302452f46ceb41aa031bd93ee69f0295d86696516d7c13` | motion_review |
| `sweep/satellite/block-az060.png` | `0cb313e2a6a24ff0866fd41f15674be443154424cabb3152672a304ef4afd075` | motion_review |
| `sweep/satellite/block-az120.png` | `174b0f788eb57d40d09d0b4cae949684af5be25e75106db7cd5b398a0e4b2649` | motion_review |
| `sweep/satellite/block-az180.png` | `d72ee0efd6866bdd48e4dd269d1cbebe3df11256fbc6e903164137381ee97898` | motion_review |
| `sweep/satellite/block-az240.png` | `36bec545539b70baf6dfefbc4fec6fb942ec78b36074ea8fd6086081f5ba96a2` | motion_review |
| `sweep/satellite/block-az300.png` | `fe0917ac79465c7aeb427575410b9f14016dea24c4e23f3651e9794a915acc57` | motion_review |
| `sweep/satellite/overhead-az000.png` | `498233f60d3ce2f4273b3387f49405eff5a16c335085b553917b9b01e914a80d` | motion_review |
| `sweep/satellite/overhead-az060.png` | `29f8b12be0922736a450efd5f6fcb899b545bcae89108e3919e90a1c13126363` | motion_review |
| `sweep/satellite/overhead-az120.png` | `9879de63433ef233a077566c1d44f890c2f5c30eeab2375208011894f0715b94` | motion_review |
| `sweep/satellite/overhead-az180.png` | `87d422957f2f2c806481f972fa4e0f6dff981b3c90c8b1329c210a3b6798451b` | motion_review |
| `sweep/satellite/overhead-az240.png` | `58427a6ec259a9c295c66be960c2244d3b76587a3611cc7fc9bdc6fd719b01c2` | motion_review |
| `sweep/satellite/overhead-az300.png` | `3e9e4bc2d131e7287e8086a75a74a765e0f491a4589047fb4b3570e32cf88c6b` | motion_review |
| `sweep/cartographic/plaza-az000.png` | `1ced2eed624ce5fd5ca5d65c4d678c8261bcefbb2144af630d6a7f88dec46cf5` | motion_review |
| `sweep/cartographic/plaza-az060.png` | `9ef2d3aa00cdc4b791bf816bfa784f4e23fcbd1d9efbb584b304cc55e3be7232` | motion_review |
| `sweep/cartographic/plaza-az120.png` | `f7301bfa9247196a164d3f9a590d35768f62410111d512e8e00c0682ae6f6ac9` | motion_review |
| `sweep/cartographic/plaza-az180.png` | `eeb51c4461a2e18e1640492bcc4b840ab05527a61a7cf138ac4976b9b0a04269` | motion_review |
| `sweep/cartographic/plaza-az240.png` | `498301620544ad7527c419dfad56b741bf3a0ddddf6639c510ab22de8581fe8c` | motion_review |
| `sweep/cartographic/plaza-az300.png` | `eb9271b24b13e1d8759f8fd61cc93056b937c55b4f8a47769f7ffbc55289df91` | motion_review |
| `sweep/cartographic/block-az000.png` | `c011bd7713930f62c4ccacb83121717729e874e3a8c49de4f1c8d1520cd4119c` | motion_review |
| `sweep/cartographic/block-az060.png` | `86b346261021ef6783b63de3c54f91b081d30924fc313fe1910bf36a19e27270` | motion_review |
| `sweep/cartographic/block-az120.png` | `b26cc3181c52162aefe83df29cd3a24ef7110289f6413fd7f76aa0132cd2157f` | motion_review |
| `sweep/cartographic/block-az180.png` | `894b66be3c0ca78a0fb7cf9e53351f8a876106b0ffa7e82af77812991878097a` | motion_review |
| `sweep/cartographic/block-az240.png` | `f29d416a68fb30012160fee0619d71c728c14bd188b06e85ce58ac7ca3ec1226` | motion_review |
| `sweep/cartographic/block-az300.png` | `b6093e0ed133f0daf42e812b2862344f3b1e6ec34d478b00f17655015a96ea55` | motion_review |
| `sweep/cartographic/overhead-az000.png` | `7d17c5a09c1e2b7b74cfbf8b612c0e5cd080f72f2cd29d9a62cb60a40828f637` | motion_review |
| `sweep/cartographic/overhead-az060.png` | `ac36b528b3e4fe8e6c9b6c5e2c117b8d142a8bb487adb2e324125ca5e5508909` | motion_review |
| `sweep/cartographic/overhead-az120.png` | `1995a1e4e6c072e6f7ad80564e40e404de649e758a5623131f6554ae83ef25f7` | motion_review |
| `sweep/cartographic/overhead-az180.png` | `56b5372e8ead118d697f295aaae3bf1755761341cb5f9fb2f43e2498a60fb3fb` | motion_review |
| `sweep/cartographic/overhead-az240.png` | `7c34a3174077873c7499205091c92d305ba4da3a16753cc37380bedf7a597865` | motion_review |
| `sweep/cartographic/overhead-az300.png` | `15a2654643dbb522e72e034c033ae3dcd827d02cdb9aa26b2a58fd176e665539` | motion_review |

The three independently opened prior-certificate baseline images are bound separately:

| Prior frame | SHA-256 |
|---|---|
| `sweep/satellite/plaza-az120.png` | `5c159c2166e429a4d974896bc660bcb2df148b3aa4cb351bb5c4f06edee8f070` |
| `sweep/satellite/block-az060.png` | `dc619073177aa5e156628f46686b8f6167d900b56f967f757b304d05b30b2f75` |
| `sweep/cartographic/overhead-az300.png` | `4c5aae76ecf1c3a63303c2977f46a4bbbaf5f8cbbce52c9f9e28674d5a6cd447` |

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F25 | Two newly introduced canonical evidence links target the omitted top-level Q3 note after its integration path mapping. | Accepted by root. Resolved by the sole integrator's exact two-link repair and independent byte comparison; initial target snapshots remain. | Use repaired patch `fdb7327e…` and freeze `960d8deb…`; preserve the exact Q3 snapshot and historical reviews. |

## Verification

Read-only scripts under `artifacts/integration-review/wt/artifacts/review44/` retain `initial-transfer.json`, `links-transfer.json`, `post-gates-transfer.json`, `doc-preservation.json`, `f25-recheck.json` and `frame-binding.json`. They verify all combined and original component files, compare direct primary bytes, preserve base and lease prose, establish the exact link-only delta and bind certified image bytes. Component tests and old-red controls are the independently recorded evidence of Reviews 41 and 43; they were not repeated during this integrated gate run.

I inspected the actual primary gate exit records and relevant stdout/stderr under `artifacts/population-capture-milestone-20260919/gates/`. Build, typecheck, full unit suite, audit and visual each exit zero. Unit output records 80 files and 592 tests passing. Audit meets the required high threshold but reports two moderate Vitest advisories; this is not a zero-advisory result. The build retains its bundle-size warning. Visual stdout records four appearance tests and three lifecycle repeats passing, each with completed teardown. Its owned launcher hash is `900522c109029f6e30551d7bdaabb56e4adc6ad410eb0b3e7c5d389f10326ad0`.

The fresh primary certificate `artifacts/visual/complete.json` has run ID `7f68c3883cc3f1ce` and SHA-256 `940fa211efaa3b9f8d6d3e09108d23a3e5ec97ed7bc7e0b37f51a1e848e3292a`. It binds 44 frames, the new app build, served scene digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c` over 117 files/301,782,754 bytes, and visual harness digest `45aeaf15464fbc2a34e0252f3c06b6e8bd44969103aeb65bdd7d21dab53d0593`. The appearance and lifecycle records name the same RTX 4090 D3D11 renderer, with NVIDIA driver 616.64. All three lifecycle records have empty console/page-error arrays and completed teardown; navigation took 104/100/94 ms and replacement 4,842/3,755/5,452 ms. This is the normal visual gate, not a new Q3 motion capture.

The inspected retained-handle cleanup receipt and final process inventory record all 46 owned identities already exited, no matching live unadmitted candidate and zero listeners on port 4319. The strict listener recheck succeeded at `2026-09-20T01:27:53.5944650Z`. No broad process-name termination was used or requested by this reviewer. The prior certificate `d11360e0649ffb15`, its 99 visual files and four bound build files remain in the milestone's preserved directory; I independently rechecked all 44 prior certified PNG hashes before the three selected baseline openings. Raw preservation and cleanup records stay ignored and are separate from authored review prose.

No fresh 150-body or 3000/200 city run, populated flythrough, authored-source rebuild, walking naturalness check or temporal-flicker acceptance was performed in this round. The inherited work-docs structure issue and moderate advisories remain disclosed. No reviewer-owned browser, server, watcher or data writer was launched.

## Round outcome

The exact lease/capture integration and F25's two-link repair are accepted within this round's scope. The five primary gates, inspected cleanup evidence and combined 36-sweep/eight-hero native review support this bounded increment; no unresolved material integration finding remains. Root retains final acceptance, commit, delivery and worktree cleanup ownership. Q1 stalls/naturalness/AOI egress, Q3 scene flicker and the remaining deliverable criteria stay open. This reviewer made no primary edit or commit; `artifacts/integration-review/wt` and its exact retained targets remain for handoff and removal after preservation. Acceptance does not transfer to later code changes merely because this report exists.
