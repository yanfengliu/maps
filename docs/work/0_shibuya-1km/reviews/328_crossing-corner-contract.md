# Review 328 - crossing corner implementation contract

Date: 2026-09-28. Read-only research in C:/Users/38909/.codex/worktrees/crossing-frontage/maps, base 5c1a4a772cd57cb4abda14e1c227db530553d05b. Frontage324 source remains frozen. Primary retained evidence was read where the worktree had no copy. No code, geometry, data, plan, build or gate was changed or run.

## Decision

Recommend one material-coherence increment after the walking commit and acceptance of the 324 geometry successor. Its visible outcome is a paved crossing foreground with readable surface response and existing curb depth, continuing into a grounded, restrained TSUTAYA lower frontage. It can improve the composition without inventing a storefront. It cannot turn the available lower-frontage photograph into a detailed reconstruction.

Do not start by increasing texture size, sharpening the atlas, adding a window grid to Satellite or changing global illumination. The current source contains some useful facade structure, but the missing street-level detail is a real limitation.

## What exists in the source

I inspected two additional existing images, both unscaled native source crops. central-glass.png is 132x516 pixels from atlas rectangle [264,3070,396,3586]; central-side.png is 132x514 from [264,3582,396,4096]. The retained patches record ties them to GML bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27, front triangles 494/495 and side 481/482. Rectangles include two pixels of context that may belong to neighbouring atlas content.

The front contains vertical mullions, broad horizontal bands, a top advertisement and recognizable lower lettering. Its lowest storefront portion is dark and indistinct; individual entrances, door recesses and interior depth cannot be recovered confidently. The side is pale/translucent-looking with large vertical lettering and coarse lower structures. That does not establish its material or true transparency.

The raw embedded atlas is already 4096x4096. The entire front crop occupies only 132 source columns, including context. That is the useful resolution distinction: a large atlas is shared among many surfaces. Earlier source investigation 119 independently attributed the same building's sampled lower-frontage stretching to original imagery, with no atlas-cap reduction. I rechecked the actual retained atlas and primary tile hashes; I did not rerun 119's live density measurement.

The older qfront-south-glazing proposal classifies only UV/source pixels x272-389, y3182-3460, world Y27.697310-56.059032. It explicitly excludes the lower Starbucks/TSUTAYA lettering. It is retained proposal evidence, not permission to classify the lower facade as glass. The source depicts curvature on a locally planar mesh; no material treatment restores that shape.

## Existing ownership and limits

| Concern | Existing owner | Consequence for this increment |
| --- | --- | --- |
| Pavement and road geometry/support | tools/scene/pavement-recipe.ts, pavement-frontage.ts and compose-pavement.ts; src/scene/roads.ts | 324 is the sole authored floor change. roads.ts uses the same pavement MeshData for drawing and its sampler. No second runtime floor. |
| Visible paving | src/scene/surface-materials.ts:177-195,257-294 | Sidewalks have a filtered 0.6x0.4 m grid, uniform roughness 0.82, no detail texture and style strengths 0.12/0.08. One treatment currently covers both tops and vertical closures. |
| Asphalt/terrain detail | src/scene/surface-detail.ts and surface-materials.ts | Existing seeded mipmapped detail and asphalt variation already exist. Preserve them; this is not another road-noise redesign. |
| Facade load and source identity | src/scene/facade-textures.ts:164-177,198-242 | The ordinary 518 request is already SHA-verified for emission; reuse those verified bytes and original batch/GML/UV validation before texture replacement. No second fetch or source modification. |
| Facade response | src/scene/tile-materials.ts:259-287 | Satellite uses luminance/chroma glass inference and added world-space floor/frame terms. These are authored guesses, not recovered source detail. Cartographic has a separate authored facade branch. |
| Scene contact/shadows | src/render/post.ts:76-85,194-198; src/scene/lighting.ts:34,86-94 | GTAO already uses blend 0.62/radius 1.4 m. The 2048 sun map spans roughly 1.4 km with 0.6 m normal bias; it is not a fine shoe/contact solution. Do not claim that adding AO or enabling shadows is the missing feature. |
| Local walker contact | Primary src/agents/render/local-walk-contact.ts | Already shades exact retained support triangles, with authored 0.28/0.23 strength and clearance/distance fades. Preserve this accepted actor path; do not extend it into a citywide contact overlay. |

## One bounded implementation contract

One owner implements one candidate with two connected material changes, consuming the accepted 324 floor.

First, improve the existing sidewalk material. Add restrained seeded paver-to-paver/within-paver colour and roughness variation with a resolved-to-minified transition, keeping the existing metre scale and coverage-filtered joints. Reuse the current seeded texture machinery if a texture is necessary. Distinguish existing vertical closure faces from top faces using their existing geometry normals, giving closures a quiet solid finish instead of collapsing the X/Z paving grid onto them. This lets the existing approximately 8 cm outer curb and 324 end faces read as depth without moving or thickening them. Satellite can carry more material variation; Cartographic stays quieter. This is a shared sidewalk-material change, so its effects elsewhere are intentional and require the normal final 44-view review; do not mislabel it as geographically isolated.

Second, give only the identified lower crossing-facing source plane a restrained nonmetal material response while retaining its photograph, UVs, source lettering and existing colour transform. Bind this small exception to exact 518 digest, GML, original front plane/normal and UV coverage. Restrict it below the existing upper-glazing study's Y27.697310 boundary, with any transition wholly inside the admitted source face. Reuse the retained decoded front triangles to establish the exact lower UV polygon before coding; the whole contextual crop is not an applicability mask. Suppress the generic invented Satellite photo-floor/frame overlay and luminance-as-glass classification in that admitted region. Use an explicitly authored, moderately rough response; this is deliberately unclassified photographic frontage, not a declaration that the real facade is opaque or a calibrated reflectance estimate. Do not alter the Cartographic facade branch in this increment.

Ground contact is evaluated through the actual 324 closed join, existing geometry normals and existing GTAO. Add no dark contact stripe, pavement decal, false extrusion, replacement door, emissive window or new prop. Keep actor shading, global shadow bias/resolution, post/AO settings, exposure, palettes, sky and lights fixed. If this composition still does not read as grounded, report that result instead of expanding into lighting or storefront reconstruction.

Allowed production files: src/scene/surface-materials.ts; src/scene/surface-detail.ts only if needed for the sidewalk detail; src/scene/tile-materials.ts; src/scene/facade-textures.ts only for a narrow eligibility hook; and at most one small src/scene/crossing-corner-material.ts containing this single source binding/predicate. Keep emission eligibility separate and unchanged. Reuse its identity-check pattern without making an appearance registry or general framework. Add focused cases to existing surface tests plus one source-backed corner-binding test if required. No new dependency or asset pipeline is needed.

Source positions, normals, indices and UVs remain exact. An eligibility attribute is presentation metadata, with its actual memory accounted through the existing tile path. The applicability test must include wrong tile bytes/GML/plane/UV, the upper panel, the opposite side and an unbound LOD. Sidewalk tests should exercise filtered/minified behavior and top-versus-side selection; they cannot prove appearance.

## 324 shared interface and preservation

Use 324 pavement SHA 841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6 only after its independent re-review, raw-source producer replay, paint checks and deliberate successor rebinding pass. Those obligations remain with the existing frontage lane; this contract does not accept or modify 324. Its footprint stays X[-13.8711509705,-0.2767351866], Z[-30.1100502014,-27.7294998169],13.63 m frontage/about 8.2 m2.

Do not move the outer curb, repaint guidance/crossings, change roads/terrain/buildings/network, enlarge the contour, or refit the walker. All 1577 retained actor-support faces, rig/route/phase behavior and the current support authority remain unchanged. The successor walking manifest/config and paint pins must bind the accepted new pavement; historical packets/captures remain untouched. Material changes need no further physical-support claim. No new default/startup/history/installer/public-push authority follows from this contract.

## Minimal meaningful verification

Use the existing 326 compositions: 319 near street in Satellite and Cartographic, plus 295 noon hero crossing in both styles for the proposed increment. Capture matched before/after on the accepted walking-plus324 baseline; 295 is the composition reference, not interchangeable new-baseline bytes. Use real controls, unchanged lighting and native 1280x720 images. That is four images per arm. Add one short 30 fps controls-driven move spanning the same street/corner in each style only to check shimmer, abrupt material boundaries and progress preservation, with sparse keyframes. Do not search for a flattering replacement camera.

Accept only if the full frame visibly improves across the foreground/edge/frontage composition, the closure sides read cleanly, and the original photograph/signs remain recognizable without a rectangular finish patch, new crawl, washed-out markings or dark halo. Source-blurred retail detail remains a disclosed limit. A static roughness change that is imperceptible, or a paving-only gain with a worse frontage, does not meet this contract. Use one candidate and a focused correction if justified; an ineffective material arm should return to root for direction rather than become a parameter sweep. Required all-five gates, 44 certified images plus style returns and independent integrated review still follow acceptance.

## Evidence and research boundary

Review 326's three native scene images remain the scene basis and retain its recorded hashes. Only these two additional source images were opened:

| Actual inspected image | SHA-256 |
| --- | --- |
| Primary artifacts/graphics-facade-source-study/central-glass.png | 8bfeb09c1b071f0f4667e7a89b7671db823f8512921c9e4dd054349fbb4cb475 |
| Primary artifacts/graphics-facade-source-study/central-side.png | 1257207ed22e027702382a8e39053eca197c0ca31fe2ee0ff64b9ee96c1b578d |

Actual primary data518 SHA is 5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b; embedded retained atlas SHA is eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb. patches.json SHA is b8aac4ef3ebe9a62f75f4c2485e6f3d37c049d879c0a1d0d8fe0ecdcc1a60fa2; profile-contract.json SHA is 100dd1c65c85838a70a693c045ffee93ce31517450b2f34745b455a031c6fb57. Those historical extraction/coverage conclusions were read, not newly regenerated.

Read source ownership was at the named worktree base with frozen 324 edits. No browser, server, GPU process, capture, temporary evidence or subagent was created. This report is the only new file and remains uncommitted for root's acceptance/promotion. The recommendation is a bounded implementation proposal, not a prediction or certificate of visual improvement.
