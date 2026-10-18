# Review 1636: design

## Target

Repository maps, base commit `552f524cc15f8379b3cbcd0ce657fad70772fc87`; bounded report on the material-response route. Source: `artifacts/frontage1720-response/report.md` (SHA-256 `a3ef2832414976d9e821e75743fb7735986dbd42d43495a2885639d071caab52`). Exact recoverable copy: `artifacts/docs1722/source/1636_raw.md`.

## Reviewers and coverage

`frontage1720_response` authored the complete report below and owns the stated lens. Root owns selection and integration. Coverage is limited to the investigation and evidence described in the report; it does not transfer any earlier visual or acceptance verdict beyond its named target. These are bounded STOP investigations; no product route is adopted. Four bounded PASS and ten OPEN of 14 acceptance criteria remain unchanged.

## Reports

### frontage1720_response

# Frontage1720 material-response branch — STOP

2026-10-18. Owner `/root/frontage1720_response`; root owns selection and acceptance. Exact source base `552f524cc15f8379b3cbcd0ce657fad70772fc87`. Read-only bounded investigation, independent of advertisement emission. No implementation or new rendering occurred.

**STOP: no distinct, source-supported production geometry or material-response error was demonstrated that is likely to make a prominent crossing frontage more convincing in ordinary full native context.** This is a finite negative, not proof that all physical-response corrections are impossible. No candidate should be implemented from this branch.

## Pixels inspected before product source

I opened all four originals separately with `view_image(detail: original)`, at their original 1280×720 dimensions: `01-ordinary-default.png`, `satellite-dusk-crossing.png`, `satellite-dusk-crossing-oblique.png`, and `satellite-dusk-approach.png` under `artifacts/frontage1719/render/payload/`. `pins.json` binds their actual bytes and verifies each against the retained native manifest.

The curved frontage at the left of the close crossing has soft advertising/window photography on a largely flat surface. The oblique still preserves that effect but the foreground trees and near building restrict the view. TSUTAYA has a coherent broad building form and a readable occupied base, but much of its glazing rhythm remains photographic. Approach and default establish wider context; neither isolates an erroneous local specular or normal response. These four dusk stills do not establish noon response or continuous motion.

## Exact existing source and program bindings

The current 109 frontage diagnosis is bound by `artifacts/frontage1719/source-question.json`: GML `bldg_6abf2261-478c-437a-93f4-8ba23d7b1cad`, final-detail `data/data518.b3dm`, batch 26. I freshly hashed the literal cached tile: 4,973,844 bytes, SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`. The retained decode reports 986 target triangles, 605 vertical; the selected broad wall triangle spans Y15.2386–46.5986m, world normal approximately `(0.98064,-0.000008,0.19584)`, and UV0 spans approximately 255×255 texels of the already native 4096² atlas. The recorded original atlas hash is `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb`; this branch did not decode or independently rehash its embedded WebP payload. Two retained CPU source rays bind that wall in crossing/oblique, not live renderer occlusion or sampling.

`src/scene/facade-textures.ts:213` is the production `processTileModel` entry. Its call at line 279 reaches `patchTileMaterials`. The atlas preparation applies the buildings-owned delighter, constructs the replacement `DataTexture`, tags it `SRGBColorSpace` at line 353, preserves source wrapping, and uses mipmaps with anisotropy at least 8. This leaf is already the single native-cap exception; a cap increase supplies no new source pixels.

`src/render/atlas-delight.ts` reads raw sRGB bytes through a `NoColorSpace` input, explicitly decodes to linear, applies the bounded heuristic, explicitly re-encodes sRGB bytes, and writes through a `NoColorSpace` target. The replacement texture's sRGB tag is consistent with that encoding. I found no demonstrated double-decoding mistake. `src/scene/delight.ts` explicitly states that the photograph does not supply the reflectance/irradiance data necessary for physical albedo recovery; changing its compression or color scalars would be unqualified tuning.

`src/scene/tile-materials.ts:104` patches actual `MeshStandardMaterial` objects. Lines 111–115 set roughness 0.72, metalness 0.12 and environment intensity 0.85. The `onBeforeCompile` patch after `<normal_fragment_maps>` recovers the world normal using row-vector multiplication by the rigid view matrix. The photographic branch at lines 266–292 selects roughness from source-pixel luminance/chroma, applies local albedo lifting, and adds a near-field world-space floor/frame heuristic. Its final shader key is `maps-facade-v8-crossing-photo-ordinary` or `maps-facade-v8-crossing-photo-corner`, according to the actual material eligibility; this branch did not sample the live submitted target program and does not assert which key the target draws.

The installed Three shader at `node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js` puts roughness/metalness map chunks at lines 177–178, the patched normal chunk at 180 and physical lighting at 186. Therefore these local roughness edits are upstream of the physical-light calculation, not obviously overwritten before use. This is static source order, not GPU compilation evidence. `pins.json` records the exact source and installed shader bytes inspected.

The retained tile glTF shared scalars include roughness 0.3/metallic 0.5, while production overrides them with heuristics. Those shared scalar values are not an authoritative per-window material specification. The retained exact CityGML target block has no modeled opening or LOD3/4; absence of modeled openings cannot justify inventing recesses, mullions or depth.

## Why no proposal

The current albedo glass classifier and photo-grid are authored approximations. Their existence is not evidence that either causes the prominent full-frame defect or that removing/changing one will produce a useful improvement. The reviewed pixels chiefly demonstrate limited photographic detail and planar source geometry. Replacing roughness, metalness, tint or de-light constants without a measured target response would merely exchange one unsupported proxy for another.

Historical 1452 supplies a concrete negative for TSUTAYA local city reflection: broad moving pale stripes, dusk still largely flat. Historical 1458 and independent 1461 supply a concrete negative for source-photo recesses: sharp repeated frames around soft photographs, insufficient useful physical depth. They remain parked. Their reports were read only after the current originals; none was rescored or tuned here.

The precise remaining gap is an independently supported local physical property or an actual production-path discrepancy, bound to a visible frontage, that predicts a coherent change before parameter choice. Neither the current source photograph, coarse geometry, shared PBR scalars nor these four stills supplies that evidence. The existing near-field photo-grid is a possible nuisance, but the native views do not establish visible grid harm or useful benefit from its removal; it is not nominated as a new product route.

A cheap discriminator, **not run and not a proposal**, would be a source-pinned production-material trace establishing which actual submitted material/program and source UV are active on a selected visible surface, paired with an independent source-backed normal/material expectation. A mismatch could authorize a small correction. Matching source/program behavior would reject that bug hypothesis before any candidate capture. A CPU ray or rewritten shader formula alone would not answer it. This branch identifies no such independent expectation, so no render or new probe framework is warranted from its findings.

## Bounds, attempts and cleanup

No browser, GPU lane, server, GUI, dependency installation, download, model CLI, subagent, chat/goal operation, product edit or runtime gate was used. Source reads occurred in the branch's exact-base isolated worktree; the literal primary cached tile was only hashed. No test pass, material reconstruction, full-world quality, A3/A13/A14, actor motion, population or performance acceptance is claimed. The four images are inherited evidence, not a new comparison.

`attempt.json` records the investigation and command-ownership refusals. `pins.json` binds the inspected originals, source context, input contract and historical reports. `retirement-preflight.json` records the clean worktree and nonfollowing zero-reparse census. `cleanup.json` records actual ordinary worktree/branch retirement and final process-marker check. Only this ignored evidence directory remains for root's selection decision.


## Root disposition

The commercial name '109' is unverified shorthand. The authoritative target is GML 'bldg_6abf2261-478c-437a-93f4-8ba23d7b1cad'; no business identity is established.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The authored report’s bounded STOP finding: no supported implementation route satisfying its stated target and evidence bound. | Accepted as a route-selection record only; it neither changes product acceptance nor proves other routes impossible. | Root retains selection and any future scope decision. |

## Verification

The source report’s stated checks, evidence, and unrun work are preserved verbatim above. This preservation pass verified source byte count and SHA-256 before copying and verified the ignored raw copy afterward. No runtime, product, visual, unit, audit, build, or CI check was run here; those checks are not applicable to this documentation-only preservation change.

## Round outcome

The authored STOP conclusion is preserved for this bounded route. No implementation or acceptance criterion is added. Remaining checks and limitations are those explicitly marked unrun in the report.