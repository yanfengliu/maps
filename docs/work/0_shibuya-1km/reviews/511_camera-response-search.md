# 511 — camera response search

Date: 2026-10-01. Owner: control_response511; root owns integration. Base: `c5722cb6f4277741c25f50816f77b7572989f607`. Scope: independent source/evidence reading and this authored report. I reused the supplied tree read-only because this assignment admits no new worktree and freezes the production candidates. I launched no browser, server, GPU work, gates or other task-owned process. I did not edit the canonical board, helper, recipe, drivers or product. Read AGENTS, local rules, lessons, current board and the510 contract. The first instrument was the frozen506 helper and its actual failure/log, not an inherited CPU test or blocker assertion.

## Result and remaining gap

**The real controls can reach the first target without relaxing the recipe. The existing immediate calibration does not establish that the helper's settled correction loop will converge.** The actual506 log supplies more than a generic damping hypothesis: its measured matrix differs substantially from the complete response proven by the exact bundled controls. At the intended first pose, that matrix produces a local correction recurrence with eigenvalue magnitude about1.029, rather than a contraction. This is a quantitative explanation worth testing, not a reconstructed actual final residual.506 retained neither the final camera nor its twelve step receipts. A transient pass remains possible, and the refusal does not disclose its exact distance from success.

The unchanged first target is `(-12.36048587423128,15.2,-72.9958004832977)`, radius89.0648623693917m, azimuth0.1182403756144717rad, polar1.022406169384996rad. It must retain targetXZ≤0.5m, targetY≤0.001m, both angles≤0.001rad and relative radius error≤0.001. The target is reachable through ground-plane pan; radius is inside25–about1994m and polar is inside the app's `PI*0.495` maximum. No source clamp prevents the requested X/Z destination. Native acceptance, the remaining views and appearance remain unproved.

## Exact response from the inspected controls

The frozen camera uses fov55°, damping0.08, `screenSpacePanning=false`, default panSpeed1 and right-button pan. The context has deviceScaleFactor1 and viewport1280×720; frozen `index.html:27–30` gives the canvas100vw×100vh. The baseline bundle's source map embeds the exact inspected r180 `OrbitControls.js` bytes, so this reasoning is bound to compiled506 input rather than an assumed current library implementation.

In `OrbitControls.js:865–910`, the camera-right vector is `r=(cos(theta),0,-sin(theta))`; ground pan-up is `up×r=(-sin(theta),0,-cos(theta))`. Both have unit length and neither depends on polar. A right-button drag `(dx,dy)` queues `K*(dx,dy)` metres of target translation in X/Z, where `k=2*radius*tan(fov/2)/clientHeight` and `K=k*[[-cos(theta),-sin(theta)],[sin(theta),-cos(theta)]]`. At the intended first pose, `k=0.12878953530953183m/px` and `K=[[-0.12789029422360365,-0.01519266430371039],[0.01519266430371039,-0.12789029422360365]]`. Its determinant is `k²>0`, so both horizontal dimensions are independently reachable. A200px vector has at most25.757907061906366m of complete travel; the original target lies74.03491405576477m from the source default target, so the finite12-step allowance is not intrinsically too small.

`update():597–708` adds0.08 of the queued pan to target, reconstructs camera position as the same offset plus that target, and multiplies the residual by0.92. It preserves targetY, radius, azimuth and polar for a pure pan, apart from floating-point error. Default target-radius limits are0 andInfinity. Pointer pan handlers call `this.update()` themselves (`1050–1060`), and rendered frames also call it (`src/app.ts:193`); the number of response updates before an immediate observation therefore depends on event/frame timing. The source comment that the app calls update once per frame does not remove those native pointer-handler calls.

`controls-rest.ts:157–182` eventually calls the native update with damping off while idle, applying the remaining pan and zeroing its residual. It does not throw away the remaining input. Consequently a fully settled gesture delivers the complete queued `K*p`, regardless of how much arrived before pointer release. The preservation wait requires fresh frames, three quiet intervals and at least12 advanced frames at an80µm path bound (`settling.ts:85–105`); waiting establishes quietness, not correctness of the requested target.

## What the actual calibration line establishes

`artifacts/facade506/run.log:21` records `pan map at 89 m: 0.080 m per pixel, x (-0.0630, 0.0075) z (-0.0566, -0.0572)`. Those columns are the immediate `M=[[-0.0630,-0.0566],[0.0075,-0.0572]]m/px`, from `measurePanMap():559–587`: observe;40px X drag; observe;40px Y drag; observe. There is no settling between probes. The printed second label `z` names the second screen-drag column, not a pure worldZ axis.

Using the intended first pose and the rounded log values gives `G=K^-1*M≈[[0.4926243100,0.3840156995],[-0.0001229509,0.4928772898]]`. The near-zero lower-left term is compatible with printed rounding. Each diagonal is about49.3% of the corresponding complete response. The second column contains about38.4% of a complete first-axis response. This matches first-probe residual continuing during the second probe. A settled, uncontaminated orthogonal map would instead have `G≈I`.

For an unclamped correction, the helper inverts M to request `p=M^-1*e`, where e is the target error, then waits for preservation settling. The complete response is Kp, so `e_next=(I-K*M^-1)*e`. In pan-basis coordinates the same recurrence is `T=I-G^-1≈[[-1.0295498198,1.5812840433],[-0.0005062823,-1.0285081101]]`, with determinant1.0597009155 and complex eigenvalue magnitude1.0294177556. This nominal map therefore cannot give an asymptotic local contraction. The200px clamp affects earlier, larger corrections, and does not repair the near-target response ratio. Changing correction count alone is not a source-supported repair for this map.

These numbers are arithmetic from source and a four-decimal log, **not measured native gain or native final pose**. The actual settled radius/azimuth, canvas box, delivered subpixel deltas and step timing were not retained. Radius/angle tolerances imply a small change in the nominal K if the supported path behaved as written, but the next run must record that rather than infer it. The source and log support a mismatched response measurement; they do not prove that this was the only cause of refusal.

## Separate source defect in the first correction

`panTo():612–641` reads camera, errorX/errorZ and errorBefore before checking whether the map exists. Its first call then runs the two calibration drags and sizes its correction from the earlier error without observing the displaced target. At the nominal first pose the complete probes translate target by `K*(40,40)=(-5.7233183411,-4.5079051968)m`; their displacement is real input. The first correction therefore uses a stale error even with a perfect settled map. This is a source-proved ordering error, not evidence of the final506 residual. Subsequent steps re-read their errors, so it alone does not establish an inevitable twelve-step failure.

The axes are already combined by `step():714–720`; splitting the destination is unsupported and a one-axis destination with null fallback omits the pan. The first driver is fresh and its map starts null, so stale calibration from another view cannot explain the first refusal. Pure ground pan preserves the camera-target offset, so the driver's bearing-drift term should be zero here; a material bearing change would falsify that simple response model and needs its own observed explanation.

## Minimal native evidence and falsifiers

Keep513 as the unchanged-input measurement: separately labeled first-ready PNG before aiming; requested pose; coherent epoch/frame/camera/status before orbit, after orbit, after zoom and before every pan; returned `step()` receipt including asked pan and immediate residual; immediate and preservation-settled full pose; final numeric X/Z/Y/angle/radius residual before throwing; actual renderer/error state and owned cleanup. Preserve failures before assertions can lose them. Do not substitute the default PNG for any qualification view. This observes the failed mechanism and leaves the recipe, source, pan limit, correction count and tolerances intact.

For each unclamped pan, compare `deltaTarget_settled` against `K(actual radius,actual azimuth,actual clientHeight)*askedPx` and compare immediate against settled travel. A settled response near the predicted full K, with immediate gains near the logged M and nonshrinking settled residuals, supports this explanation. Settled travel near M instead rejects the complete-response assumption for that actual run. A changed relative camera offset, targetY, radius, angle, canvas dimensions, document epoch or renderer rejects the simple pure-pan model before a gain diagnosis. Native receipts showing shrinking residuals through all12 steps with a final error only marginally above0.5m would require another account; no final residual is inferable now.

## Source-supported correction, proposed only

If the unchanged native observations confirm the mismatch, measure the response that the correction will consume: settle the initial pose;40px X probe through real right drag; preservation settle and read;40px Y probe; preservation settle and read; build both columns from those settled differences; then re-read the target error after the probes. Keep the original target, angle/radius constraints,12 correction attempts and200px limit. Do not merely settle after the pair while retaining the two immediate column observations, and do not reuse the pre-probe error.

This can be implemented in a later scoped helper using the frozen driver's existing public raw-input path, `driver.step({panX:40,panY:0},null)` and `driver.step({panX:0,panY:40},null)`, with `orbit.settle('preservation')` and read-only observations after each. That path (`step():714–724`) does not invoke private auto-calibration when destination is null. Compute the measured2×2 inverse in the helper, cap the combined vector at200px, and dispatch each correction as one `step({panX,panY},null)`; read the next error only after settling. Thus no frozen production, driver, bridge or render bytes need change, no pose setter is introduced, and both pan axes remain real input. This is a proposed helper correction, not a performed or accepted native result, and should follow root's513 evidence/review decision.

With settled, independent columns M≈K, an unclamped correction has `I-K*M^-1≈0`, so the source proves the missing relationship that the current calibration does not satisfy. Actual screenshots, pose/GPU/error checks, matching and native review still decide the paired comparison. No additional test framework, gate or whole-map work is warranted by this bounded finding.

## Inspected byte identities

SHA-256, lowercase; paths are relative to this report's supplied workspace. All frozen506 sources and raw artifacts below were read, never changed. Package lock pins three0.180.0. Embedded OrbitControls source equality was checked against installed source; its UTF-8 bytes total38,703. The baseline source-map digest below matches506's recorded build digest.

| Input | SHA-256 |
| --- | --- |
| `artifacts/facade506/native-inspection.json` | `db42b8f5be5a25c6c02f2120211a0a171ecae52bcd8df8ebabafb14be7960b52` |
| `artifacts/facade506/run.log` | `d5617b67d83ed43630ec82f6837eafb59e57c44333907e7de3ebcd3619230e48` |
| `artifacts/facade506/native.mjs` | `c5ceb1bd771759aec2f5d85dd725b88730f876a814be6c4f84fa5c2d216b1a1e` |
| `artifacts/facade506/recipe.json` | `bfcabfb2cbb8edd024587c57cc5374b5fefe3502fdbc282f5747d3aebea8b4ad` |
| `arms/pilot/tools/flythrough/driver.ts` under506 | `d97c1951d26b494a01a0a7669565899d6658672a2c462e531611cdb7b21a4b4d` |
| `arms/pilot/tools/visual/orbit.ts` under506 | `65c321bc88098b2bc9e181bddce66d950f5657e006ea1b6e8911595aca10abaa` |
| `arms/pilot/tools/visual/settling.ts` under506 | `ff984f9fa64cfba3da4e3ea18182f5e1fc955f7c9c1e0da65d8919330184050b` |
| `arms/pilot/src/render/camera.ts` under506 | `2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc` |
| `arms/pilot/src/render/controls-rest.ts` under506 | `df3eb0ce3c6e3a4cc00640c0ced01e8037c6cf8cc9fc224f6cc830be799e9db3` |
| `arms/pilot/src/render/camera-keyboard.ts` under506 | `cf5bccc2f483f5135b68164c88096f9c68dc0be1d78cbb30617dcbe82845aecd` |
| `arms/pilot/src/app.ts` under506 | `fb7d3be15e020d3b440f00e46272c831eee7857f4d512983e0cf344a25a5da75` |
| `arms/pilot/index.html` under506 | `a8e6bd55009887207236731662dec7d95fa11a1d5aaf88433e19e20626123899` |
| `arms/pilot/package-lock.json` under506 | `32c54d3389169a5021bd4105ca1e3f321ca8db7d6e32d758e73421c61b9b9640` |
| `arms/baseline/dist/assets/index-CzlExvas.js.map` under506 | `18f706c1f8bb996484a8c9e06cc3acab1f8a150863526a5c50bff6374bfa2640` |
| Embedded and installed `OrbitControls.js` | `b97879c748170baadeb3fb84cea1ffdf4674e283dc06042f34e2acb95a76042c` |
| `docs/work/0_shibuya-1km/reviews/510_capture-search-contract.md` | `0ca2ed1bae815d6968f866e2d5ceb9f59ced1edbaea5d1b55fd76cd7c524f372` |
| `AGENTS.md` | `d8c1cc2bd02d07a00471977deb168c3cd8dd660c5ec28807a9d8bf0278a7893e` |
| `docs/policies/local-rules.md` | `d29f873faa1b6b569b0221fb97dc2edd853afc493b49d373c29e795c07863631` |

## Focused independent513 review addendum

Root subsequently assigned a read-only review of513's new measurement/default-capture order and owner identity changes. **Accept the inspected513 source for its unchanged-control diagnostic dispatch; no blocking finding in this focused diff.** This is source admission, not runtime, appearance, cleanup or paired acceptance. I compared the actual506/513 native helpers and owner scripts; inspected513 native37–60,80–85 and unchanged paired-count/matching code; verified the hashes below and actual pilot driver/orbit/recipe bytes. I did not run513 or syntax checks; the separate preparer's parse receipt is not my executed evidence.

Native37–52 appends the aim trace before input and appends each correction before `step()` can throw. It preserves the combined `panToX/panToZ` call,12 attempts,200px driver limit and original settling/assertions. The returned receipt, immediate observation and post-settle observation are retained in sequence. A final coherent observation and numeric X/Y/Z, angle and distance residual are stored before `poseRefusals()`. Nested failures are recorded and rethrown; a thrown/unfinished operation cannot manufacture a receipt or a settled snapshot. FinalResidual is guaranteed before the intended-target assertion, not after an earlier settling/RPC failure.

Native55–60 creates a distinct diagnostic record, captures the native1280×720 canvas, records actual bytes/SHA and bracketed camera/status/epoch, and checks live hardware/error state and nonblank dimensions. Native85 calls it after first successful ready and before the first aim. `diagnosticOriginals` remains separate from `originals`; the nine fixed/seed originals, six motion frames and paired checks are unchanged. Default diagnostic pixels therefore cannot satisfy qualification counts or pose acceptance. The owner diff changes506→513 IDs/paths/messages only, preserving owned launch, limits and cleanup mechanism.

The new observations are extra browser RPCs; their execution consumes time and can change how many native response updates precede a later observation. Preserve the claim that input commands and settling policy are unchanged, but do not call actual response cadence identical.513 also does not record the internal40px probe snapshots, a separate after-orbit/after-zoom observation or canvas box. Its first pre-step full pose, returned asked pan, immediate and settled snapshots plus retained calibration log can test the response model at the step boundary. Internal calibration attribution and actual cleanup remain bounded by the observations root obtains from the run.

Independently verified513 SHA-256: `native.mjs` `92401db092daa23770aacd73d90050bf5e6a8370c253183f5fd040ed3e7247d9`; `prepared.json` `da724cb724f5e09e14cdc51cbb68ef6f2bc8cd11d595c5a2f4d1150d3610cba9`; `run-owned.ps1` `29d2fcddedb368d0249ed0dff2ba6e522536e3c590542c8817ca5afc34d3911d`; recipe identical to506 `bfcabfb2cbb8edd024587c57cc5374b5fefe3502fdbc282f5747d3aebea8b4ad`; pilot FlythroughDriver identical `d97c1951d26b494a01a0a7669565899d6658672a2c462e531611cdb7b21a4b4d`; pilot OrbitDriver identical `65c321bc88098b2bc9e181bddce66d950f5657e006ea1b6e8911595aca10abaa`. Root owns dispatch and acceptance.

## Actual513 response evidence

Read-only arithmetic over all twelve retained `panMeasurements[0].corrections` confirms the full-response model for this run. Every settled X/Z displacement matches `K(actual pre-step radius/azimuth)*receipt.pan` within7.870µm, after including `K*(40,40)` for first-step calibration. That step's extra displacement is `(-5.7233149255,-4.5079077612)m`, matching the two probes within4.251µm. The post-probe stale-error distinction is therefore real; internal probe snapshots remain absent.

The first four200px corrections leave settled errors49.9162,35.3847,19.3936 and6.3643m. Corrections4–11 then alternate direction, with asked magnitudes101.098→137.607px. Their immediate receipt errors are0.0498049→0.0612355m, while settled errors grow6.6560→9.053148794174115m. Thus these inputs briefly reach the0.5m target bound and overshoot when their remaining response lands. The final target offset is `(-8.9800454099,+1.1481670290)m`; targetY error8.88e-15m, azimuth error−1.80e-8rad, polar error−1.46e-7rad and relative radius error4.79e-8 reject a material pose/axis drift explanation.513's calibration log equals506's rounded line, but extra observation RPCs mean timing equivalence is not claimed.

This supports the proposed finite helper correction: use existing raw `panX/panY` inputs, measure independent settled40px columns at each changed pose, then compute each correction from the fresh post-probe target. Preserve the original12/200px limits, recipe and frozen sources. A corrected native run still must demonstrate target convergence and paired qualification; source arithmetic is no substitute. Preserve every failed run and its search cost.

Raw513 receipt SHA-256 `22175078bc4b1138c87cd4df581df8e0ae21d8d456f7180c8ae9355ad6657092`; log `b1b12f37172135bae751b9d59d7ceb3f116e935ec609dee07e87c18747f7be2d`. Native/recipe/prepared/owner hashes still match the addendum. The receipt reports unchanged pins, six successful native cleanup items, one separated diagnostic PNG and failed qualification. I did not independently inspect the PNG, audit process closure or dispatch runtime.
