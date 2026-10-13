# 885 — photographic sign native appearance review

2026-10-12. Independent read-only critic. **ADMIT for later qualification.** B1 has a clear, worthwhile local dusk gain at both the 45 m plaza and 220 m block views. This is appearance triage for the frozen two-panel pilot, not product adoption or whole-square acceptance.

I read AGENTS.md, local rules, lessons and the progress board. I opened each of the four original 1280×720 PNGs separately with `view_image(detail: original)`, in the order A1 plaza, B1 plaza, A1 block, B1 block. I inspected the original frames, without thumbnails, a contact sheet, crops, image editing or a numerical image-difference verdict. Actual length and SHA-256 matched the assignment before viewing and matched again after all four views. The ignored receipt is `artifacts/sign885-critic/receipt.json`.

All paths below are relative to `artifacts/sign869-preparation/run-stack-probe-a2e57b64bd344f2294eee0b05148c7b1/originals/`.

| Original | Bytes | SHA-256 |
| --- | ---: | --- |
| A1/plaza-dusk.png | 1,342,738 | `005e794ee85957656b2ca2bdbf7d368fec6cd0b4a27f48c8fd10ca29885b629f` |
| A1/source-block-dusk.png | 1,323,861 | `7138b4b64878aa198a610563df752c10151e565d025e59d3f86864fd0906cb79` |
| B1/plaza-dusk.png | 1,345,957 | `69fd5854b513fbd490dc9375e7b6505b074cbd7268fc8d1078ec8d9969e9eca9` |
| B1/source-block-dusk.png | 1,324,612 | `5783c5f01bd8722d8f0bde1fd9f4642e5351743366e0e7e6d6d4b17650b0c998` |

**A1 plaza:** The upper purple photographic face is a dark magenta patch on the building left of the central curved frontage. Its colour and outline are present, but it reads as unlit surface texture. The lower KIRIN face remains dim behind the red authored TOKYO board. The other authored boards, dark road, crossing paint, trees and right-side mounted light provide the surrounding baseline.

**B1 plaza:** Both admitted photographic faces now read as lit signs. The upper face retains a pale cyan top, a pink interior with soft photographic tonal variation, its sloped perspective edges and the surrounding dark strip. The exposed lower face becomes pale warm white within its pink/red boundary. The TOKYO board still covers its middle, with the same visible layering. The faces are bright, but I see no objectionable flare, detached halo or luminous rectangle extending onto the neighbouring wall or windows. The crossing, road, adjacent facades and other mounted signs remain visually coherent with A1. This is a substantial local light cue; it does not restore detailed photographic readability or add visible facade depth.

**A1 block:** At 220 m the two target faces are small and dim beside the authored TOKYO board. They blend into the dark vertical frontage. The existing cyan signs higher on the block and the red boards provide more readable dusk accents.

**B1 block:** The two pale pink/white faces form a clearly visible vertical pair beside and behind TOKYO. I can identify the gain in the full original frame without enlarging a crop or relying on changed hashes. Their small footprint keeps it a local improvement, but the illuminated stack gives this frontage a stronger dusk presence at the wide distance as well. The surrounding station roofs, elevated tracks, buildings and streets do not show a material visual change. The gain clears the stipulated wide-view threshold.

Artwork preservation has a limited visible bound. The upper photographic variation remains visible, while both source faces are soft. The lower exposed area is nearly white and most of KIRIN remains occluded by the existing TOKYO board. These views cannot establish readable KIRIN lettering or preservation of every hidden artwork detail. The visible angled boundaries and frame strips stay attached to their original surfaces, and I do not find a new pasted-patch failure in the four inspected frames. No change to the existing occluding board is called for by this review.

The actual capture report `run.json` is 557,478 bytes, SHA-256 `4973899ea33bb100b18ce2be8716dee5ce3cb5a1057671edbf71149eea9e54fc`, unchanged before/after viewing. It records `appearanceCaptured: true`, no raw errors, unchanged source/scene/GPU witnesses and all six caller cleanup flags true, with NVIDIA GeForce RTX 4090 driver 616.64 before and after. It also retains `instrumentPassed: false`; this appearance-first run is not the complete qualification instrument. I did not independently rerun the body, source, GPU or closure instruments. The two previous decoder-abort runs remain RED; obtaining these four originals proves neither their cause nor a decoder repair.

The verdict covers exactly these two static Satellite dusk poses and these PNG bytes. It makes no noon, Cartographic return, motion, actor contact, startup, cost, FPS, draw/pass, whole-map or integration claim. The pilot merits the already-required later qualification because its visible gain is worthwhile at both angles. No browser, server, GPU task, build, runtime gate, product edit or Git operation was launched by this critic; only this review and its ignored receipt were authored.
