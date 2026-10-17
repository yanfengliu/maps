# Review 1433: upper-floor windows, final integration

## Target and verdict

PASS for the finite 12-window increment in PRIMARY, based on `6552a7531089040e20b9ff798c855172905b4c7f`. No material finding remains. All 14 final Shibuya criteria remain OPEN; main commit/push and worktree retirement remain root's work.

Independent read-only reviewer: `review1433_upper_windows`; native dispatch requested `gpt-6-astra` / `xhigh`, without independent CLI/model telemetry. I reviewed integrated/frozen source, surrounding and installed code, raw logs and originals. No source edits, gates or browser/server launches.

Revision-2 freeze manifest SHA-256: `4f143192f00058caf852b9671fede66b580d8dcdb3c955db0e5fb4c0b40ee3ed`. Its five paths match PRIMARY and `freeze-v2/` literally:

| Path | SHA-256 |
| --- | --- |
| `src/scene/upper-windows.ts` | `14d5bc7bf0583aec9c05459d0353c65f1033ba6fe563391a632a54d1629b7c72` |
| `src/scene/upper-window-recipe.ts` | `8c86d68983d2cdcc887f53d709f4e9f27098b2099edcc5dd78396049f4eaafea` |
| `src/scene/facade-textures.ts` | `4e023d24c8ae220a04b8ee82c08b1d2f4b7a50ce127406f0de020b48d88e332c` |
| `src/render/post.ts` | `c3c3851e716de70df31862834f5f642c69854a52568d9d75b4f5418e5185aaed` |
| `test/upper-windows.test.ts` | `a5204f58781fa0c0871cb372b1e89fe7de97c1b62fce965603b6ea5ca554f123` |

## Source, geometry and integration

Target: data503/batch16, GML `bldg_b36b808a-74a2-4853-af2d-58b14db52194`, faces2012/2016/2017. Rehashed tile: `e543a9fdf48babf505cc196b9c76d610cfcd6a3efb6d24198d7c432d351ea54d`; CityGML: `88dab9e2cc41dc75b37a83ca3ad78dfa0eb1f081b918af56fc79851c80150724` (nine storeys, 31.7m, office). Source indices/vertices/normals/UVs/placement match the recipe. The native 104px-wide crop supports two modest columns on floors3–8; floors1–2, blue sign and ninth-floor setback remain photographic.

`upper-windows.ts:24` checks exact source identity, winding and finite triangle coverage. Face2017 deviates 0.757595mm, justifying its source-specific 1mm admission; the 2mm discard slab and returns 2mm behind the wall cover the fold. No generalized tolerance/private face union. Affine shear and shader inverse agree (`:19`, `:58`).

Closed jambs, sill, head, glass at -0.28m and backed room at -1.15m form physical depth (`upper-windows.ts:82`). Original geometry/indices/attributes stay intact. Beauty, depth, distance and GTAO normal paths share the aperture and style decisions (`:61`; `post.ts:196`). Authored finish and room contents remain approximations. Cost is four draws, 1,512 triangles, 181,440 geometry bytes, no new texture or light.

Ownership follows `ParsedResources.onRelease` (`upper-windows.ts:109`). Outside the diff, `src/scene/tile-transaction.ts:43`/`:91` own logical release; installed `node_modules/3d-tiles-renderer/src/three/plugins/UnloadTilesPlugin.js:160` disposes GPU resources while retaining the CPU scene. Tests cover two GPU unload/returns then logical disposal. Existing lower frontage, mounted lights and occupied corner remain visible.

## Findings and corrections retained

The oversized 10x14px prototype/full-height divider were rejected. Literal photo bounds constrain 9x10px boxes including antialiasing, one-pixel row shear, 1.220x1.580m outer size and 0.990x1.320m clear reveal. `old-photo-red.log`/`old-divider-red.log` fail before restoration. The 0.012px affine error was fixed without widening the oracle. CPU coverage is nine parallel rear sightlines per opening; misleading oblique wording was corrected. Native captures support true oblique appearance.

First PRIMARY failed `test/rail-runtime.test.ts:53`: data503 corruption was rejected, but facade's sign-only message violated the existing different-bytes contract. Outside the diff, `buildings.ts:284` calls facade fetch before rail validation at `:293`. Revision2 fixes truthful common error/recovery wording and adds four literal HTTP/hash cases488/498/503/518. Pins/order/geometry/rail assertion stay unchanged. `focused-revision2.log`: four files/36 tests plus types green. The full suite resolves the interaction. V1 freeze/captures/failed logs remain historical evidence.

## Final verification and native inspection

Actual `integrated-gates-v2/` logs and canonical receipts pass all five gates: build, types, 130 unit files/1,166 tests, visual, and high-severity audit. Audit still reports two moderate Vitest advisories; build retains the large-chunk warning. Canonical run `c340ed23de338cce` took 295.876s internally (301.835s wrapper). Certificate SHA-256 is `90a9ace6d7edeaadbf7acc643ef281c2fa1b0bd72a6b19cc421c99f087814b76`.

I rehashed all 44 frames and read three raw lifecycle records: RTX4090/driver616.64, matching build, no errors, completed teardown; navigation 235/234/329ms, replacement 17233/17502/17531ms. All 22 Satellite and two basic Cartographic-return originals were inspected individually at 1280x720. Return cameras match and frames advance. Detailed Cartographic quality stays deferred. Occluded poses and plaza180's existing corner intersection do not establish clearance.

All 20 fresh revision2 originals were individually inspected: nine noon/nine dusk/two style returns, including seed142617 held-out front/oblique. Near-front03 covers all 12; front02 the wall/sign/setback; near-oblique06 depth. Near-lower04 crops the upper pair. Reveals/sashes/glass/backing read coherently without obvious seams, photo residue or oversizing. Source crop/two original-source fronts support comparison only. Capture SHA: `36ef1bf872b97c4e8b8b569dd6bd5a2456e8e39f08ed53b20990e8def3001575`; errors empty, closure/unchanged/sealed pass.

Four runtime HTML/JS/CSS files match exactly across actual PRIMARY dist, retained worktree dist, local-v2 capture pins and canonical certificate. The two debug maps differ and are excluded from that equivalence. Scene digest is `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`; harness digest is `78b2c9bffa0ee72da64e0ff5f407467e952687d54d52882b53b8732afe662467`.

Byte ledgers under `artifacts/upper-windows1432/review1433/` bind each original: `native-inspection-local-v2.json` SHA `3186479325c9e425b0e878def92ffa3ca74eae13c3ee9ffad84f6abb7bf1f8f9`; `native-inspection-canonical.json` SHA `2e2ab40bdc7bd960eb4ef689da5f55992597c7120b926d6e4ff87860b842c58c`. Source/comparison and V1 inspection remain separate. No contact-sheet review.

Closure receipts show six local and 44 canonical identities absent, no retained ports/TEMP. I launched no persistent resource. Limits remain: whole-city quality, surveyed interiors, continuous temporal stability, population performance and all 14 final criteria.

## One next product outcome

Canonical `sweep/satellite/block-az120.png` and local noon07 show broad pale office facades across the lower centre still reading as flat, blurred photos. Next: improve one coherent neighboring office-facade band across this visible rail-side block, after source admission. Accept when glazing/reveal depth reads across the band at this block pose and close front/oblique noon/dusk views, preserving floor rhythm, signs and roof silhouettes. Recommendation only; this PASS stays finite.

## EOF-format disposition

Commit preflight reported only surplus EOF blank lines at `upper-windows.ts:124` and `upper-windows.test.ts:109` when CRLF is recognized. These are nonmaterial format warnings; repository policy does not require `git diff --check` as a sixth gate. Root chose to retain exact reviewed V2 PRIMARY/index bytes. No normalization or evidence transfer is adopted; the same V2 five-gate/native PASS stands. Original report bytes are retained separately.
