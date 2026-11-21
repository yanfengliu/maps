# Implementation review 39

## Target

38b7bbd relative to fef22c3. Conifer branch volumes, all 14 aerial-supported roof corrections, 300 Pasteur, the photograph register, generated roof atlas and wrapped phone gallery control.

## Reviewers and coverage

Independent Codex gpt-6-astra, xhigh, read-only exact checkout. The secondary CLI reviewer had exhausted its weekly quota.

## Reports

**Request changes for `38b7bbd` over `fef22c3`: one new P2 finding.**

**P2 — Conifer depth reconstruction ignores MapLibre’s framebuffer depth range.** [conifer-material.ts:113](/private/tmp/maps-review39-20261121/src/conifer-material.ts:113) treats `gl_FragCoord.z` as depth mapped into `[0,1]`. MapLibre 6.15 instead supplies custom 3D layers with `[0, 1 − (layerCount + 2) × 14 / 65536]`. The shader consequently writes incorrect foliage depth, affecting occlusion against trunks, buildings and other crown faces.

Reproducible arithmetic: with 100 layers, the range ends at `0.97821044921875`. For one foliage hit at clip `(z,w)=(0.9,1.1)`, proxy faces at `(0.8,1)` and `(1,1.2)` produce depths `0.891263095` and `0.887301358`; both should produce `0.889282227`. This demonstrates disagreement for the same physical surface. Unmap and remap using `gl_DepthRange`, and test the production shader against an occluder with a compressed depth range. The [current browser probe](/private/tmp/maps-review39-20261121/test/conifer-material.browser.mjs:21) exercises intersections but omits the production depth-writing fragment. This finding is source/arithmetic verified; I did not reproduce browser pixels.

The previously assigned ghost-selection finding above the other three hospitals remains open; it is not duplicated here.

Checks completed:

- **48/48 focused tests passed** on pinned Node 24.12.0, covering tree geometry, hospitals, picking, flat shells, budgets, atlas and framebuffer/texture restoration.
- **Atlas integrity passes:** all 648 saved mesh panels match this revision, the model digest matches, and all 15 imagery hashes and export URLs match. The earlier stale-atlas finding is resolved.
- **Budgets pass:** 189,652 triangles and 25,034,064 GPU bytes. Conifers retain 24 crown triangles each, float32 dimensions/UVs and existing anchors, with no added textures or buffers.
- Inspected conifer fixed/opposite/random/top/phone images, nine roof references, 300 Pasteur views and the wrapped mobile gallery. The hospital log records **7/7 expected picks**; recovery/LOD logs pass. The gallery label wraps without clipping.
- Saved motion evidence shows p95 increasing **20.0 → 27.7 ms** at 1280×800, zoom approximately 21, on Apple M3. The close-view performance regression remains relevant.

Saved browser evidence comes from feature/integration revisions, not a fresh runtime check of exact `38b7bbd`. No files changed, network used or browser launched. Full build/typecheck/audit were not run.

## Findings and disposition

R39-1 accepted. The conifer fragment must reconstruct depth using the active depth range. The tree owner is correcting the shader and adding a real compressed-range occluder test. R38-3 is closed by the all-panel consistency check on this revision.

## Verification

Forty-eight focused tests passed, along with the independent 648-panel, 15-image and resource checks. The reviewer inspected the camera and phone captures listed above. The root ran the complete integrated gates and exercised the roof corrections, gallery, hospital links and selection through the map controls.

## Round outcome

Changes requested. The conifer depth correction and exact-revision verification are required, alongside the separately tracked hospital picking correction.
