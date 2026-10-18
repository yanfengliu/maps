# Review 1623: integration

## Target

2026-10-18. Road wearing-course review began at base 1f2377a289537b348e227e94851eff440666687d. Exact accepted code is f4960e2bf95b7813443b803eb15876215785ef59, merged and pushed on main. Candidate patch SHA-256 97cb5ef8be991c82df3e6c4b83d51cc50c85ee52ac3191bd2c8d2a08deb10fda; capture releases c2f3d8af16d99bf8f93e1982ac2f4b2773936721b93f9983c4aff8dfef4f53d3 and 1de08978b384c1c42ad09ca11d34f8f3f886cc00cb8c0965e2cfc8d1fd9ee76a. The four canonical LF blobs are:

| Path | SHA-256 |
| --- | --- |
| src/scene/surface-materials.ts | 19eb21c23fc07489701647bd90500cefc66c8f59527fae4072a1f3fe68d9f462 |
| src/scene/surface-structure.ts | 4db9ff1770ad7ab2bc4a69e9b10b4eb03b14649d98c245a12f06069676037447 |
| test/surface-relief.test.ts | 5603ab2126b509e7a622ee89e324dbd530a9ca55ce8077cad00e96f027ab0533 |
| test/surface-structure.test.ts | b5d4713c050adb77d169146bbe421681b827c1e398d2d4176633b462d6a38f1f |

## Reviewers and coverage

1673 independently inspected the constructor/material path, four staged files, source/build/protected pins, finite RED/GREEN checks and 19 native originals individually. Its EOL clarification distinguishes captured raw CRLF files from LF index content. Its final integrated review additionally binds all 44 certified frames, four build files and three lifecycle records, with individual native inspection of all 22 Satellite originals. Root separately inspected those 22 originals and both basic style-return originals. All authored reports below remain verbatim, including their historical pre-adoption statements.

## Reports

### 1673 independent reviewer

Original: artifacts/surface1673/report.md; 7487 B; SHA-256 62b85c971301afd04c1b6597e455193198820bea24cfd2a77237abbceab1e308. Exact authored bytes, including original line endings, follow.

````markdown
# 1673 — independent road wearing-course acceptance review

2026-10-18. Decision: **GO for integration and the five required code gates**. No material source or visible regression finding requires a retune. The candidate remains unadopted until root verifies the integrated revision and merges it to main.

I independently read the four staged files and actual createRoads path, the contract in quality1669, repository instructions/local rules/plan/lessons, and the retained capture and red/green evidence. Base is 1f2377a289537b348e227e94851eff440666687d. The exact patch is 97cb5ef8be991c82df3e6c4b83d51cc50c85ee52ac3191bd2c8d2a08deb10fda; candidate release is c2f3d8af16d99bf8f93e1982ac2f4b2773936721b93f9983c4aff8dfef4f53d3. All four raw source/test files and four build files independently match that release. Only the two production files and two existing tests are staged. All 17 protected primary pins independently matched their frozen bytes during review.

I opened every original individually at its native 1280x720 size: twelve surface1671 candidate frames, the three corresponding scene1667 baselines, and all four context1674 frames. receipt.json binds the actual inspected bytes by independently recomputed SHA-256. The additional context release is 1de08978b384c1c42ad09ca11d34f8f3f886cc00cb8c0965e2cfc8d1fd9ee76a. Its two randomized poses use the first six actual createRng(2718) draws, independently reproduced during this review. The observed cameras, rather than nominal recipe labels, bound coverage.

The matched 02 and 03 improve the whole exposed road between buildings: the repeated, disconnected rotated quadrilaterals no longer dominate its organization. Continuous wearing-course variation remains subordinate to the street and surrounding buildings. This is a structural replacement of the stamp family, not a quieter surviving rectangle, tint adjustment or added noise alone. Matched 01 retains readable crossing paint, its frontage contrast hierarchy and dusk identity. Its specular pattern changes, as expected from the roughness change, without obscuring the crossing.

Candidate 04 carries visible grain but remains an elevated block view at 110m camera distance. Candidate 05 is an authored aerial angle despite its seed label; it is not randomized evidence. Candidate 06 noon and the aerial roads remain comparatively uniform, which limits richness claims. The six middle-drag samples show no conspicuous new transition edge in their visible road portions; their 215.7–234.7ms gaps and increasing building occlusion cannot establish continuous shimmer or travel quality.

Context1674 closes the missing near-ground and true-RNG context bound for this increment. Its close dusk and noon cameras are about 3.195m above terrain at 45m orbit distance. The dusk asphalt shows granular near/left regions blending into smoother subdued surface across the crossing, with grazing light response and intact paint/frontage hierarchy. Noon remains believable as a still. The two seeded views expose no new visible road-material regression; the peripheral one is partly occluded by buildings. These unpaired context views establish compatibility, not a measured before/after close-view or performance gain.

The actual createRoads constructor installs createSurfaceMaterial("road") on the unchanged source-road geometry. The road-specific shader now uses one continuous, finite, domain-warped 18m/32m material state for fixed 2.8m/5.2m aggregate samplings, 6–18mm shading height and wet/dry roughness. Transition shading height is bounded at 3mm, the derivative inversion has a finite denominator, transition slope is capped, and footprint filtering retires unresolved normal detail. These are authored shading dimensions, not geometry or contact heights. The road branch excludes mapsStructurePanel; shared paving/ground calculations retain their prior behavior. Physical buffers, paint/support, graph, photographic source, lighting, exposure and post-processing have no changed production path in this patch.

Cache identity advances only for road. Live uniform ownership, style return, anchor refusal and texture/material disposal remain coherent. The extended existing tests exercise emitted scalar limits and the actual constructor/import path, with literal road/pavement pins and decoded buffer digests. The old production path actually went RED at the missing continuous-road marker and the restored candidate went GREEN with 33 affected tests. These finite checks do not certify appearance or the complete spatial field. I inspected the retained PASS49/typecheck/build records; I did not rerun runtime tests or any gate during this read-only review.

Both retained captures report the hardware NVIDIA renderer, empty errors/failed requests and unchanged frozen inputs. The instrument checks actual per-capture renderer identity, source/build/runtime/harness pins and served files; native pixels confirm the changed road is rendered. Capture cleanup reports closure of page/context/browser/server/esbuild and an absent profile. This review launched no browser, GUI, server or GPU process and changed no source, index, runtime cache, build, gallery or canonical documentation. Its only outputs are this report and receipt.json.

Root still owes all five integrated gates, native review of the required integrated Satellite originals, final integrated source acceptance and merge to main. This increment may advance item18. A5, A6, full A13, whole-AOI quality, continuous contact/travel, population and target FPS remain open.

## Authored line-ending clarification — 2026-10-18

Root's port preflight correctly distinguished raw bytes from Git-normalized content before changing primary files or index. Independent raw git cat-file reads confirm that each of the four working files still has its original candidate-release SHA-256, while its staged blob has the distinct canonical LF SHA-256 recorded in receipt.json. Raw working/index equality is false for every file. Replacing CRLF with LF in each working file produces byte-for-byte index equality; the files contain no lone CR, and the index blobs contain no CR. The only differences are 356/58/61/88 removed CR bytes, respectively, for material/structure/relief-test/structure-test.

The original candidate release and its inspected pixels remain genuine evidence for the frozen working-file bytes. The worker's workingEqualsIndex statement supports Git-normalized equality; it must not be reported as raw equality. This clarification preserves the original authored review body and its evidence pins.

Static semantic review supports porting the exact canonical index bytes. TypeScript/JavaScript treat these CRLF and LF sequences as source line terminators; cooked template literal values normalize CRLF to LF. The affected GLSL is carried by those cooked templates, with no String.raw path or application behavior derived from the raw source bytes. Comments, expressions, imports, string escapes and shader logic are otherwise byte-identical after normalization. No code retune or separate normalization gate is required. This is a source-semantic judgment, not a fresh build/pixel result.

The GO for integration and required gates stands for the exact four LF index blobs. Root's port receipt and final five gates must bind the actual primary LF bytes and resulting build. Final integrated source/native review and merge remain owed; the original review's acceptance bounds are unchanged.

````

### 1673 final integrated reviewer

Original: artifacts/surface1673/final-integrated-review.md; 5606 B; SHA-256 fb2e6d5001609071c673452f315b360d0a029a36630ef83fac9d74951423ddae. Exact authored bytes follow.

````markdown
# 1673 — final integrated road-material review

2026-10-18. Decision: **GO for commit and main integration of the bounded road increment**. No material source or visual regression finding remains. This review binds the four canonical LF files in artifacts/surface1675/primary-transfer.json at base HEAD 1f2377a289537b348e227e94851eff440666687d; it does not claim that a commit or merge has already happened.

I re-read the actual primary createRoads -> createSurfaceMaterial -> road-specific shader path and independently rehashed all four primary files. Every file exactly matches the transfer hash and the normalized previously reviewed candidate. The earlier raw-CRLF capture identities and authored normalization clarification remain intact. The primary build's four certified output hashes also equal the reviewed candidate build hashes. The continuous state, aggregate scales/heights, filtered transition normals and wet/dry roughness coupling remain the reviewed implementation. No integration fix changed production behavior. The unchanged mesh/paint/support, pavement/ground, photographic source, lighting/exposure/post, cache, live-uniform/style and disposal bounds from the original review still apply.

I independently hashed the 22 current Satellite originals before viewing, then opened every image individually at original 1280x720: six plaza, six block, six overhead and four dusk/noon hero views. After the final certificate existed, all 22 hashes were unchanged and matched its unique frame entries. All 44 certified frame files and all four current build files independently match the certificate. Certificate SHA-256 is 93bbfba1707fdc1e0dc0e7289b30d37228c0a495d52c8d2acd37e8f08761f82c, run bb081deed726da61. I read all three actual lifecycle records: each matches the certified build and NVIDIA RTX4090 D3D11 renderer/616.64 driver, has empty console/page errors and completed teardown.

The integrated close/plaza views retain visible asphalt grain and light response, coherent broad road organization and clear crossing paint. Dusk signage and lit frontage retain their hierarchy; noon remains believable. Block/aerial surroundings and source photography show no new regression attributable to this patch. This confirms compatibility of the adopted material with the production build; the earlier paired 02/03 originals remain the direct before/after evidence for removing the repeated rotated repair motif.

Coverage remains finite. Block az060 is substantially tower-occluded; plaza az180 is inside the authored frontage with the road largely obscured. Other block angles expose only partial streets, aerial roads remain subdued, and these static images cannot certify continuous shimmer, travel/contact, whole-AOI detail, population or FPS. Detailed Cartographic appearance is deferred. I inspected the basic dusk/noon style-return records: Satellite-to-Cartographic changes preserve the exact camera, advance frames, retain the hardware renderer and have no error/context loss. Root separately inspected both return originals. This supports basic style continuity, not detailed Cartographic acceptance or populated progression.

The authoritative completed-bundle records all five code gates PASS on the unchanged port: build 2.820s, types 4.725s, unit 64.496s (137 files/1,193 tests, zero skipped, empty stderr), visual 259.612s and audit 7.830s. The first unit attempt was interrupted by an ignored task monitor's accumulator-scope failure and has no unit verdict. The retained exact no-process control and one-site script-scope repair explain why only unfinished gates were resumed; no product source changed. Build/visual retain the large-chunk advisory and visual color-environment warnings. Audit passes its high threshold with zero high/critical and two moderate Vitest advisories; dependencies were unchanged. Pre-commit remote queries expose no configured workflows/check runs; they are availability evidence at base HEAD, not remote verification of an uncommitted candidate.

The certificate's runtime digest is the unchanged 156-file/364,187,965-byte reviewed scene (288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62); primary harness digest is 78b2c9bffa0ee72da64e0ff5f407467e952687d54d52882b53b8732afe662467. I independently rehashed all 17 protected primary files and found no change. The final worker resource receipt reports zero known/marker/late survivors and port listeners, removed owned TEMP/profiles and restored environment. This review launched no browser, GUI, server, GPU work, test or verification CLI; it only read evidence and wrote its two ignored review artifacts.

Affected A1/A4/A12 rendering, crossing identity and attribution are preserved in the inspected images. This is bounded road/item18 acceptance; the other eleven criteria, full A13, A5/A6, full-map quality and performance remain open. Root owns the actual commit, main merge/push, any available remote follow-through and worktree retirement.

Focused documentation check: all three prior authored report bodies are byte-exact at the recorded offsets in docs1676. The wrapper and monitor-defect accounts truthfully distinguish preparation, interrupted unit evidence, synthetic control and resumed unit success, while keeping source1672 HOLD and historical full-structure RED unwaived. Before committing the prepared docs, update their final status/devlog with the completed gates, this final review and actual accepted code SHA; retain the dated preparation history and authored review bodies. This is the required pending finalization, not a material product finding.

````

## Findings and disposition

No material source or visual regression finding remains for this bounded road change. Root accepts the final GO. Matched approach/peripheral images establish structural improvement in the whole exposed road; the crossing remains readable. Near-ground/noon/seeded context and final certificate views confirm compatibility. Aerial uniformity, building occlusion and sparse temporal sampling remain limits. The source 1672 HOLD is separate and retained in [1622](1622_implementation.md).

The original release pins retain their raw captured-source identities. Primary and the accepted commit use the four LF blobs above. No raw working/index equality is asserted for the removed original candidate checkout; its exact source, build and harness witnesses remain retained outside that checkout.

## Verification

### Preparation and interrupted first bundle

Primary 1675 build passed in 2.820 s and types in 4.725 s on the frozen port. The initial unit observer failed after 11.899 s with a duplicate pid key; finally cleanup terminated its owned tree. This attempt has no unit assertion verdict, and later IPC-close stderr is consequential cleanup output. Visual and audit did not run in that interrupted bundle.

SampleOwned's unscoped cleanup accumulator reproduces dictionary addition failure in a no-process synthetic race. Changing only that catch to script-scoped accumulation retains both independent records. This proves the narrow monitor correction, not a product gate. The original catch retained no stack, so the reconstructed stack is not presented as the original. At documentation preparation, resumed unit had passed and visual/audit, final review and main adoption were still pending. That historical preparation state is superseded by the following actual outcome.

### Final integrated result

All five gates PASS on the unchanged LF port: build 2.820136 s; types 4.7246212 s; unit 64.4961454 s, 137 files/1,193 tests with zero skipped and empty stderr; visual 259.6123749 s; audit 7.8295704 s. Their successful command durations sum to 339.4828479 s; this is not elapsed session time and excludes the interrupted observer attempt. Valid build/types were reused; only unfinished gates resumed. Build/visual retain the large-chunk and color-environment warnings. Audit reports zero high/critical and two moderate Vitest advisories, with no dependency change.

Certificate run bb081deed726da61, SHA-256 93bbfba1707fdc1e0dc0e7289b30d37228c0a495d52c8d2acd37e8f08761f82c, binds 44 frames and three hardware lifecycle records on NVIDIA RTX 4090 D3D11, driver 616.64. The reviewed runtime remains 156 files/364,187,965 B, digest 288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62. Root and 1673 individually inspected all 22 Satellite originals by their certified hashes. Basic real-input style-return evidence passes; detailed Cartographic acceptance is deferred. Static views do not prove continuous travel/contact/shimmer, population or target FPS.

The completed bundle reports zero owned/marker/late process survivors or port 4319 listeners, removed owned TEMP/profiles and restored environment. After push, remote-after-push.json names f4960e2bf95b7813443b803eb15876215785ef59 and reports zero workflows/checks/status records/runs: CI is unavailable, not passed. Normal retirement removed the merged road worktree and branch without force; 35 source/build/harness witnesses and all 16 candidate/context originals remain outside the checkout, unchanged.

This documentation worker ran content/version/whitespace/local-link checks only. The final receipt binds four authored bodies, five staged documents including the literal root-authored plan, and 17 unchanged protected primary pins. Prior devlog/defect text is preserved around the one updated milestone entry. Historical full-structure RED af440365 is NOT_RERUN/NOT_WAIVED; three approval boundaries remain pending.

## Round outcome

Accepted and pushed on main as f4960e2bf95b7813443b803eb15876215785ef59. Independent final source/native review has no material finding; all five local gates pass, CI is unavailable, and the merged road checkout/branch are retired. A1/A4/A12 retain bounded PASS. The other eleven criteria, A5/A6/full A11/full A13, whole-AOI quality, continuous contact/travel, population and 60 fps remain OPEN. The Shibuya goal continues.
