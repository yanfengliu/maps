# Review 1638: design

## Target

Repository maps, base commit `552f524cc15f8379b3cbcd0ce657fad70772fc87`; bounded report on the cached source-data fidelity route. Source: `artifacts/frontage1720-data/report.md` (SHA-256 `5440201aeeffdff6a80b9cc8bd0cfc82754b4195dca452ad49dddfe9e61e7dda`). Exact recoverable copy: `artifacts/docs1722/source/1638_raw.md`.

## Reviewers and coverage

`frontage1720_data` authored the complete report below and owns the stated lens. Root owns selection and integration. Coverage is limited to the investigation and evidence described in the report; it does not transfer any earlier visual or acceptance verdict beyond its named target. These are bounded STOP investigations; no product route is adopted. Four bounded PASS and ten OPEN of 14 acceptance criteria remain unchanged.

## Reports

### frontage1720_data

# Frontage1720 cached-data fidelity branch

2026-10-18. Independent read-only investigation at base `552f524cc15f8379b3cbcd0ce657fad70772fc87`. Root owns selection and acceptance. Result: **STOP for the selected curved crossing frontage.** No useful recovered same-face photographic detail was established from the accepted cached CityGML or archive. No product proposal or render is warranted by these findings.

## Pixel observation before source

I opened all four original 1280×720 PNGs in `artifacts/frontage1719/render/payload/` at original resolution before reading the source diagnosis. The crossing view's left curved advertising frontage has visibly soft photographic signs/windows across its broad face. The oblique shows the same broad softness but foreground trees limit visibility. The approach and aerial default give context without resolving that photographic detail. This is an appearance observation; it does not establish geometric depth or actual sampling behavior.

## Exact available source and face correspondence

The target is `bldg_6abf2261-478c-437a-93f4-8ba23d7b1cad`. Its accepted GML is `data/plateau/udx/bldg/53393595_bldg_6697_op.gml`, 86,969,338 bytes, SHA-256 `f510af46f1548f584f257a85796e3e0afcf504490974163757f12b06b3aa4ec9`. The local accepted archive is 649,322,807 bytes, SHA-256 `f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d`.

The building has 791 unique polygon IDs and 641 parameterized-texture face bindings to nine available JPEGs. Each cached JPEG is byte-identical to its exact archive member. `source-correspondence.json` records all nine byte counts/digests and explicit polygon/ring/UV/image bindings. This is a single-building binding inventory, not an AOI census.

The selected broad face is polygon `poly-4c9cedd6-fa78-4d26-9b46-ea05dce86087`, ring `linr-4c9cedd6-fa78-4d26-9b46-ea05dce86087`. Its original appearance image is `53393595_bldg_6697_appearance/WallSurfaceTexture_00012864_00012864.jpg`, **512×512**, 55,101 bytes, SHA-256 `6d823efa93c50feb6ef2cd3c938f60012caccb75ef8c48c16b12dde7f17becbe`. The ring UV range is U/V `0.000977`–`0.499023`, giving **254.999552×254.999552 photographic chart pixels**, not a 512×512 face.

I projected the literal GML ring coordinates through the fixed-base production `geographicToPlaneRectangular`, subtracting production `AOI_ORIGIN_EPSG6677`. Three corresponding source ring corners match the selected current tile triangle from the pinned1719 source diagnosis within **1.424, 1.415 and 3.097 mm**. `face-comparison.json` retains both coordinates and both UV arrays. This establishes the same source face rather than a larger canvas or a different view. It reuses the diagnosed CPU triangle as source geometry; it is not a new live renderer hit or sampler witness.

Current final leaf `data/scene/buildings/data/data518.b3dm` is 4,973,844 bytes, SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`. Its corresponding triangle spans **254.999512×254.999512** pixels in the native 4096×4096 WebP. The local upstream tile is 4,973,696 bytes, SHA-256 `26e32b079dce7119f2c1be285156ddc11dd2168c997bb16fb927df1056d02b8f`. Both contain exactly the same 2,966,552-byte WebP, SHA-256 `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb`. The repo's placement rewrite discarded no atlas bytes. The source chart density and current native chart density are effectively equal.

## Native image comparison and decision

I opened the original 512×512 JPEG and the original-size source/tile face crops separately. Source crop `[0,256,256,512]` and tile crop `[1448,3840,1704,4096]` show the same already-soft artwork, windows and foliage. Their RGB absolute-mean difference is approximately `[3.56,2.98,3.68]` on 0–255 channels. That metric is descriptive only: upstream JPEG-to-WebP reencoding changes values and could lose small details. Equal chart dimensions do not prove information-theoretic equality. Neither native crop inspection nor source density establishes a useful full-native scene improvement from swapping those lossy encodings.

**No concrete candidate.** The cheap production-path discriminator has already refused the higher-detail hypothesis for this face: the production B3dm/GLB reader extracts byte-identical upstream/runtime atlases, and exact source face UV correspondence exposes no additional samples. A replacement JPEG at the same chart density is not demonstrated to satisfy the frozen whole-view benefit criterion. No texture-cap increase, new source, generated imagery, upscale, geometric inference, parameter tuning or old prototype revival was used.

This STOP is finite. It does not prove every building or another independently identified face lacks recoverable detail. It does not establish the live renderer's per-pixel footprint, motion, depth, performance or any open whole-world acceptance criterion. Historical1454/1458 reports were not read or relied upon.

## Verification and resources

`inspect.py` reads only the cached accepted archive/GML/JPEGs and writes evidence here. `compare.mjs` imports exact-base production projection/metadata/B3dm readers and extracts the two atlas payloads. `pixels.py` creates unscaled diagnostic crops only. All probes exited successfully. No dependency installation, browser, GPU, localhost server, model CLI, network call, product edit or further delegation occurred. No code gate is applicable to this read-only branch.

Useful evidence and exact pins remain in this ignored directory. The duplicate upstream atlas extraction was removed after byte equality was recorded. The normal owned worktree/branch retirement and fresh nonfollowing census are recorded in `cleanup-preflight.json` and `cleanup.json`; no force or recursive worktree deletion was used.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The authored report’s bounded STOP finding: no supported implementation route satisfying its stated target and evidence bound. | Accepted as a route-selection record only; it neither changes product acceptance nor proves other routes impossible. | Root retains selection and any future scope decision. |

## Verification

The source report’s stated checks, evidence, and unrun work are preserved verbatim above. This preservation pass verified source byte count and SHA-256 before copying and verified the ignored raw copy afterward. No runtime, product, visual, unit, audit, build, or CI check was run here; those checks are not applicable to this documentation-only preservation change.

## Round outcome

The authored STOP conclusion is preserved for this bounded route. No implementation or acceptance criterion is added. Remaining checks and limitations are those explicitly marked unrun in the report.