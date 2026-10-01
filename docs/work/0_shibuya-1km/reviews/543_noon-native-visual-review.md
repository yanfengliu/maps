# 543 — Noon fill native visual review

2026-10-01. **REJECT adoption.** The named-noon hemisphere increase from 0.58 to 0.78 is too weak a visible improvement to qualify as the next product increment. Root owns integrated acceptance. Accepted product `39ba67b84d6c099a887921e8466e92e12550094c` remains unchanged; this review covers the frozen main79d baseline and candidate source SHA `81c5a1e02fc67b9fed03d70481384ad22f1ed0eef1673b9c7310c48e4fffc986`, not adopted source.

I read AGENTS, local rules, lessons, the progress queue and preparation531/539. I opened all twelve intended PNGs separately through `view_image` with `detail: original`, each at its actual 1280×720 resolution. Every PNG length and SHA-256 matched the actual receipt before and after inspection. Receipt `artifacts/noon539/native-inspection.json` remained 3,881,604 bytes, SHA `2df51144317626f4b51ce073ea7537039cfcb89709f890adb8983bf9b8980ba2`. No contact sheet, thumbnail, crop or brightness threshold supplied the verdict. This shared-tree review had only this disjoint authored output; no additional worktree was admitted.

The noon pairs show a slight lift, most readily on shaded small buildings around the NW/seeded foreground, but the towers remain dark blue photographic planes and neighboring buildings retain much the same low-contrast separation. The SE foreground's broad shaded glass face still reads as a soft dark plane. Existing window bands remain readable where already visible; the candidate adds no convincing rhythm or depth. Green/cyan glass, pale concrete and occasional warm facade colors survive, with no material whitening or hue loss seen. Pale roofs, darker walls, roof equipment, hard shadow shapes and road/paint hierarchy remain coherent, but that preservation alone does not establish a worthwhile gain.

Both dusk pairs retain the same visible warm/cool lighting, roof/wall hierarchy and road stripes. Both Satellite-return images retain their corresponding noon appearance, including the visible crossing stripes; the focus outline is expected after keyboard return. No large crossing-marking disappearance was observed. These aerial views do not repeat529's close pixel boxes or establish source-to-pixel paint identity. Horizon appearance remains unchanged. Cartographic polish is outside this review.

The receipt reports `instrumentPassed: true`, unchanged inputs, no errors and all six cleanup flags true, with RTX4090/616.64. Its run spans 21:08:24.971–21:10:25.682Z, 120.711s. Root's broader source/instrument/owned-process acceptance is not rerun here. The receipt explicitly lacks canonical, visibility, temporal and main acceptance. Failed531's decoder abort remains unattributed; successful539 does not repair or explain it.

Convincing facade glazing/depth, readable shaded windows and building variation across close/block/aerial views remain open. Whole-AOI road support/markings, distributed mounted dusk lighting and representative peripheral coverage remain open. These agents0 static images establish neither population/progress preservation, 3,000/200 performance, continuous motion/flicker, nor full-square acceptance. Reject this scalar increment without expanding its capture machinery.

## Exact pixel ledger

Paths below are under `artifacts/noon539/originals/`. Each row is a separately inspected original. N = noon, `2026-10-15 11:27 JST`; D = dusk, `2026-10-15 17:20 JST`. Frame spans are the receipt's before→after observations around capture, not footage or performance measurements. Actual capture poses below are equal before/after for every original and exactly paired across arms.

| Original | Bytes | SHA-256 | Pose/time; frames | Native finding |
| --- | ---: | --- | --- | --- |
| baseline/noon-default-nw.png | 1364367 | `3b4cf6cdc8d1e8e750c026d50e519e300a3f47dfe063b7260b6b9a8c3806c867` | NW/N; 404→423 | Pale roof equipment separates from subdued blue-gray walls; central crossing stripes remain visible. |
| pilot/noon-default-nw.png | 1378843 | `5f805efcf23b45f85742162ce963f2ccb8393de0919eacfcbf6e2a91b2d068b1` | NW/N; 399→417 | Slight shade lift; tower windows and block separation do not become materially clearer; roofs/paint hold. |
| baseline/noon-heldout-se.png | 1196328 | `b59aae35fa8454be91ffd3be4f1ffe161699d29f68c5d74204b03f68cbc6169f` | SE/N; 779→797 | Central green glass bands read; foreground-left shaded glass stays soft/dark; right road stripes distinct. |
| pilot/noon-heldout-se.png | 1205713 | `b044a214c3fc95359102cb16e2bb2a60cd7b9be5792e8ef484159355ceae1d53` | SE/N; 772→789 | Green/cyan hues and banding preserved; shaded plane remains soft; no worthwhile separation gain or paint loss. |
| baseline/seed531-noon-oblique.png | 1329751 | `16769fec02903e2434bbd5fcad65aaa993236ffb50a2e33f8cd396e46fae484c` | S531/N; 1173→1191 | Towers subdued; dense foreground roofs distinguish forms better than their dark walls. |
| pilot/seed531-noon-oblique.png | 1343714 | `d04afe8c11ce0a9bd77279026690e2698b10bf36a6f940c69acfdce71b012ada` | S531/N; 1159→1177 | Minor wall lift preserves shadows/hues; tower planes and dense blocks remain much the same. |
| baseline/noon-default-nw-style-return.png | 1361234 | `cf4737f630cc51013cd0eee1e449e48539a5824e543a1630fbff81cd5dcabc35` | R/N; 1648→1667 | Satellite textures/roof detail and crossing stripes match baseline noon appearance; focused selector visible. |
| pilot/noon-default-nw-style-return.png | 1376309 | `3f5dac28456bac28f0222d42596d00f2960dff37f59181edd28044e2f4c37c6f` | R/N; 1635→1653 | Candidate's slight lift survives return; no visible surface or marking regression. |
| baseline/dusk-default-nw.png | 1396472 | `0ecd35d47c15a0fc69d3e5f45635545f2d59efc7fd28b6d169ee6212518a872f` | NW/D; 396→414 | Warm left-facing walls and cooler right blocks; crossing stripes and roof equipment remain distinct. |
| pilot/dusk-default-nw.png | 1395828 | `ec876684ae00d1275619b697ffde4aae125413c232701e26ab8afeb1f929fc0f` | NW/D; 401→419 | Same visible dusk hierarchy and crossing stripes; no material change identified. |
| baseline/dusk-heldout-se.png | 1082534 | `66e8bc2f61436abba69c67a26b115a54ba614394b51c877c49332938deebdf9d` | SE/D; 775→792 | Warm left horizon, cool glass and sharply legible right road stripes; shaded foreground remains dark. |
| pilot/dusk-heldout-se.png | 1082148 | `7c28a15f9ac789a88dd2c1a73b2010e684b9bd99289427405484026a2ad3a02a` | SE/D; 774→791 | Horizon/glass/stripe appearance retained; no material dusk difference identified. |

## Actual pose bindings

The tuples below are `[x,y,z]` in metres; angles are radians. They retain the exact receipt values rather than rounded requested aims.

| Pose | Position | Target | Azimuth | Polar | Distance |
| --- | --- | --- | ---: | ---: | ---: |
| NW | `[-241.57208013071488,259.5068975748311,-241.57208013071482]` | `[-1.2212453270876722e-15,15.200000000000001,-1.1211387374032715e-14]` | -2.356194490192345 | 0.9500000000000001 | 420.00000000000006 |
| SE | `[241.57208013071465,259.5068975748311,241.57208013071505]` | `[1.2878587085651816e-14,15.20000000000002,1.3758771899574726e-15]` | 0.7853981633974475 | 0.9500000000000001 | 420.00000000000006 |
| S531 | `[-127.54581256774419,247.29442125091373,-338.1425484645514]` | `[1.865174681370263e-14,15.200000000000001,7.16093850883226e-15]` | -2.7808986429233133 | 0.9999145630469178 | 429.5068541495749 |
| R | `[-241.5720157961696,259.5068975748323,-241.57214446524208]` | `[2.9976021664879223e-15,15.20000000000002,-6.609375376354407e-15]` | -2.356194756508453 | 0.9499999999999968 | 420.0000000000002 |

Document epochs: baseline N `1790888909557.5`, baseline D `1790888946033.6`, pilot N `1790888968588.6`, pilot D `1790889003493.7`. These identify documents, not per-PNG UTC capture timestamps. Noon hemisphere values are 0.58/0.78; both dusk values are 0.414.

No browser, server, GUI, GPU capture, source/helper/data/index/Git write or gate was launched by this review. There are no review-owned processes or temporary artifacts to clean up; the retained PNGs are active root-owned evidence.
