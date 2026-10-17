# 1438 — Shared ground material integrated review

2026-10-17. Fresh independent read-only review. **PASS for the bounded 1437 material increment. No material finding remains open.** The reviewed candidate is the actual staged PRIMARY change on `aaf93d95eea7d25cade7719183ee6490f97439f7`, whose product base is `fc1c97a16069afbd938efc7d466af7ac993d112f`. Commit, push and worktree retirement remain root-owned; this report does not claim they occurred. All 14 final Shibuya criteria remain OPEN.

Root confirms native dispatch requested `gpt-6-astra`, `xhigh`, fresh context, per the central runbook. No independent model telemetry is exposed here. The reviewer launched no CLI reviewer, subagent, gate, browser, server or GPU process.

## Exact source and surrounding paths

I read the frozen worker files and actual PRIMARY diff, then rehashed both raw files after integration and final gates. The staged change contains only these two paths: material +48/-3 lines and new test +61. Their unstaged diff is empty.

| Path | Raw bytes | SHA-256 |
| --- | ---: | --- |
| `src/scene/surface-materials.ts` | 19,683 | `1c9c95cfdec3848890acb557449cef3bf401f38acaaa24a5a50eaa0c16e4803c` |
| `test/surface-relief.test.ts` | 4,328 | `de64e697f61618817d1d331233e98d19d9eccb12e77ec2db5017443fdbb6f721` |

Under `artifacts/ground1437/`, prototype manifest SHA-256 is `a77383cd8401454afc0b07509c66dab7dc43ae055fdcf12c03a691eb52c2a380`; final `code-freeze.json` is `f00f88547c7164c9b8dfbc9539ab229b4293e193fab48ccfee10b6f549195207`. Phase metadata differs; source pins agree. `primary-source-binding.json` distinguishes raw CRLF source from LF index hash `9a631421dd107022d323671f52d597b108747b6ff4e840bd584d1b4e20e84e2e`. Root records cached whitespace PASS and protected-user-test preservation.

The slope lands after normal-map handling and before lighting. Its world-to-view transform, tangent projection and 0.5 length cap bound extra normal angle to 26.57 degrees. Continuous derivatives precede row phasing; the bevel fades with footprint and its row transition is masked. Asphalt adds four reads of the existing seeded mip-filtered texture. Ground code/cache key remain unchanged; Cartographic strength gives zero relief and old roughness weighting. Road/pavement keys change; resource ownership/disposal remain coherent. Extra road reads execute in Cartographic too; isolated cost is unmeasured.

Outside-hunk source reads substantiate these bounds: `src/scene/roads.ts:55` and `:71` apply the treatments to the existing road and semantic pavement meshes; `:77` keeps source paint separate; `:90` and `:97` retain style propagation and disposal. `src/scene/surface-detail.ts:281` explicitly sets repeat, linear mip filtering and anisotropy. Installed `node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js:177` places roughness before normal handling and lighting. `src/render/post.ts:197` has no ground normal lookup; `src/render/normal-pass.ts:23` through `:35` uses the ordinary normal material for these meshes. Thus the treatment changes lit color/TAA response, while GTAO normals, depth, silhouettes, shadows and contact stay geometric. No AO microrelief or physical recess is established.

Tests call the production hook and evaluate its emitted scalar helper against independent literal 0.5 peak slope, symmetry, 6 mm rise and footprint-retirement expectations. Missing/duplicate normal anchors refuse. These are not GLSL compilation or visual tests; no existing test was weakened.

## Native appearance and inspected bytes

I opened each image individually at original 1280 x 720: 10 final local stills, 12 local orbit frames, 22 canonical Satellite originals, two canonical returns and two matched dusk baselines.

Local final evidence is `artifacts/ground1437/runner/final2-default/payload/capture.json`, SHA-256 `0a92d38a59f443382c3b3b6f3b59fab8f6d90294c35ec910a9500b105927292f`. I independently rehashed all 22 listed PNGs against it. The population is noon/dusk crossing, plaza, block and Hachiko approach; the two style returns; and `motion-orbit-01.png` through `12`. The baseline dusk crossing/plaza originals are respectively `57963eaa58b7edf51d5277fec6c05bb1467689b2f83b1d3b68abd11a7cc6f120` and `f3815abe326238c597346c639e04c05a7dee327b6422b94dd73c15880dcc40ac`.

Paver edges have visible paired highlights and shade at noon/dusk instead of only a flat joint-color grid. Asphalt breaks up dusk light pools into an aggregate response, improving separation from paving and paint. Tactile paths and crossing stripes remain legible. Hachiko supplies useful additional close context despite the foreground pole/right wall. It was selected after real KeyS exploration, not by a predeclared pose seed. Building-dominated block and overhead views establish preservation and sensible minification, not useful millimetre detail at those distances. Existing photographic facade blur and obstructed canonical views remain limits; canonical plaza-180 is inside the frontage and block-060 is heavily occluded. No new material seam, distant patterning or obvious static moire was found in the exposed surfaces.

The twelve orbit copies are consecutive rendered frames 1486–1497. Every before/after pair retains its frame; TAA is nonaccumulating. Gaps are 5.3–31.3 ms, first-before to last-before is 180.7 ms, and first-before to last-after is 181.5 ms. I see no abrupt material flash or crawl across this small orbit. This is a short manual shimmer screen, not a Q3 metric pass or continuous temporal acceptance. Actual pointer and keyboard style returns preserve identical cameras while local-walk ticks advance 109→152 and 205→248. The ordinary actor seed is 5,970,698 and Start walking exists in both lighting DOM records.

Canonical native coverage is all `sweep/satellite/{plaza,block,overhead}-az{000,060,120,180,240,300}.png`, four `hero/hero-satellite-{dusk,noon}-{crossing,approach}.png`, and `style-return/return-cartographic-{dusk,noon}.png`. I independently rehashed all 44 certified PNGs, including the uninspected detailed Cartographic set, with zero mismatches. Both extra return hashes match `hero.json`: dusk `4ddd166e2d033e1139a0bc581a6caa0938a7b386dda1ba7e8538370008121cf2`, noon `eff92a127d44ae24d2bcdcb48f3c8e5542a0581a53d395ceb450ca0df13df8ee`. Detailed Cartographic appearance is deferred.

## Integrated verification and limits

I read `integrated-gates/index.json`, the actual build/type/unit/audit logs, canonical `run-result.json`/log, certificate and all three raw lifecycle records. Build and types pass; unit results are 132 files/1,172 tests in 75.20 s; visual elapsed is 311.782 s. Audit passes its high-severity threshold with the two existing moderate advisories. Build retains its chunk-size warning. The canonical command's recorded exit is 0.

Certificate `artifacts/visual/complete.json` is SHA-256 `35d79d43619d6ff12ed50e6769df59670c97b979a3d51589712e2ea7c5817d1e`, run `4eb529d3e8b3e8d6`, RTX 4090/D3D11, driver 616.64. Its 156-file/364,187,965-byte scene digest is `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`. All three raw lifecycle records have empty errors and completed teardown; navigation is 208/215/323 ms and replacement 20,083/18,927/20,247 ms. Their build hashes agree. All four certified runtime files independently match current PRIMARY, local final capture pins and preserved worker build bytes. Debug maps remain separate from runtime identity.

The failed seed-42 final capture omitted walking and both returns; it and its original cleanup HOLD remain excluded. Final2 supplies complete evidence. 1437 retains focused-test extraction/signed-zero corrections and the obstructed approach attempt. No review finding required repair.

Local closure/input seals pass. Final resource records show 36 local and 45 canonical identities absent, clear markers/ports and no canonical temporary path. I created only this report and own no persistent process. Root owns cleanup/adoption; remote CI and commit/push are not claimed. Full-AOI quality, contact, continuous stability, population/FPS and isolated shader cost remain unqualified. This bounded improvement is ready for main adoption.
