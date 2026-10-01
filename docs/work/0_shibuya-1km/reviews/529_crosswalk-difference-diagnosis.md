# 529 — Crosswalk discrepancy correction

2026-10-01. **Withdraw the claimed large disappearance.** Root/527 initially reported that524's north-close dusk baseline showed white crosshatch around X260–320/Y625–680 which the pilot largely lacked. I opened the four exact north-close noon/dusk originals separately at native1280×720. The crosshatch remains visible in both dusk arms and both noon arms. Rehashed files match the receipt before and after inspection. This corrects the observation; it does not accept the rejected facade pilot or resolve the underlying crossed-paint geometry.

A read-only Node calculation used524's frozen PNG decoder, comparing RGB bytes at each identical pixel. Coordinates below are inclusive. “Bright” means minimum RGB≥120; this is a diagnostic threshold, not paint identity or a lighting acceptance gate.

| Region / time | Pixels | Changed pixels | Maximum channel delta | Bright baseline / pilot | Bright-mask differences |
| --- | ---: | ---: | ---: | ---: | ---: |
| X260–320/Y625–680; dusk |3416|37|1|1632/1631|1|
| Same; noon |3416|77|1|2165/2165|0|
| X180–460/Y460–719; dusk |73060|4508|13|9440/9436|6|
| Same; noon |73060|5931|11|16412/16424|112|
| X150–530/Y450–719; dusk |102870|9218|20|12010/12006|34|
| Same; noon |102870|10718|12|18294/18298|184|

The last box conservatively includes all visible junction stripes plus neighboring walls and foreground roof, addressing a potentially mistaken initial coordinate estimate. These larger boxes are not byte-identical or exclusively one-level differences. The dusk peak20 is at(164,517), on the neighboring left building edge; requested-box peak13 is at(180,480). The reported central crosshatch has only one-level differences. There is no measured large stripe loss; weaker surrounding differences remain unattributed. Bright-count agreement alone would not establish matching shapes, so the native inspection remains part of this verdict.

Camera objects match exactly across arms. Each capture's camera is unchanged before/after. Both arms are ready, tiles idle,44/44 prepared,67 loaded, pending0, revision67, same five visible tile URIs; populations are absent. All four before/after post records report accumulating TAA,32 samples, sampleLevel0. Dusk frames are1502–1520 baseline/1504–1522 pilot; noon1520–1539/1516–1535. Equal summaries do not prove identical accumulation history or draw ordering. No depth/timing explanation follows.

Targeted frozen sources are identical across arms: roads, street-details, paint-support, app, post and decoder. Roads display PLATEAU source markings; street-details separately generates OSM zebra stripes with0.06m lift and bounded road/pavement support. Both paint materials use polygon offset factor−3/units−6. Installed Three defaults are opaque, depth-test/write enabled, LessEqualDepth, renderOrder0; opaque sorting considers group/render order, material ID, depth, then object ID. These mechanisms are source facts, not evidence of z-fighting, duplicate paint or this crosshatch's source-to-pixel membership. No all-road reconstruction or cached geometry mutation ran.

**Implication:** this alleged paired disappearance does not block528's noon comparison. Preserve the mistaken claim and correction. Inspect the known crossing during its existing dusk/style-return checks; do not score a changed illumination with this arbitrary brightness threshold. If a true shape loss appears, the smallest discriminator is a same-input baseline repeat at the bound pose through the existing capture workflow before assigning a cause. The32 untreated objects,235 unobserved source parents and actual layer/LOD/boundary reconciliation remain open. No native runtime, GPU, server, gate, product, shared-data or Git write ran; only this report was authored.

## Targeted SHA-256 provenance

Receipt `artifacts/facade524/native-inspection.json`: `8e7dfcba09499082fff39d2106313f054ceea25f9163c447f9ff4ecbdb2c4393`. I selectively read the four captures; root's broader942-binding/cleanup verification is not repeated here.

| Input | SHA-256 |
| --- | --- |
| baseline/dusk north close | `b52b86ce7dd8de7651731d540752a0569c68746d0df3b0cdc6e4a3aab3922e60` |
| pilot/dusk north close | `8b35776f6fd319a24d8d11bd0720433e30c743163a14b038c6c8a977cc6bd80f` |
| baseline/noon north close | `2fbf8f207d9936830268465eb0d4003f9f7cb16b4b1ba390f95311af11d0fb58` |
| pilot/noon north close | `26c78137f303aac7f4716e0716e8aaf996fb127504c82eff61b6f833291cc780` |
| both frozen arms: src/scene/roads.ts | `f32d15a13f6829bc2a7c9f4e2a5418016ac5e0e36547267e09a495a9117c191f` |
| src/scene/street-details.ts | `ed17fafe4a15139d92a06b829cae412dd6b65ac41fc67224b6a1a6ec033e86fc` |
| src/scene/paint-support.ts | `a85d61a307dbbd8282503f3a6f222e13d6cbb324d9d9091b0d6704526073fbb3` |
| src/app.ts | `08868340833371b695af0f3c6349b9e6ec9106bbda59f4a27de1ee43293d06cb` |
| src/render/post.ts | `89ce5ea79cfb023d77b6cfe464fd50359d0c00d63861985d5d2eeb173cc53817` |
| tools/visual/png.ts | `7109cd6f965b331988d9fa7f87f6b83cae2f4a7d69adb796b7c046b13fe34acc` |
| installed Three Material.js | `d977355f1b5b1ebd37877a56b1de72e2ecbf97fe7ad0ee982bb2ba4df88bbeb7` |
| WebGLRenderLists.js | `60355cfaded59c50e2a846eb30702b80bf1b84ae201300685a0889411b032f73` |
| Object3D.js | `cfed8e6018386737493550ffc71df046538d687843c0ff5a3206eaa5994b07f1` |

The six frozen-source hashes were independently checked in both arms against524's input receipt. Installed-source hashes bind the queried defaults/sort implementation only; they are not captured runtime material/object IDs.
