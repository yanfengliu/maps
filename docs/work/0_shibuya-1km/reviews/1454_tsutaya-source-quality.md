# 1454 - Local TSUTAYA source-quality inventory

2026-10-17. READ-ONLY source investigation at PRIMARY; no product edits, downloads, cache writes, browser/server, gates or prototype replay. The ignored files in this folder are retained evidence for the coordinator's current decision.

**Verdict: materially higher-detail front photography is NOT AVAILABLE in the inspected local source bound. Exact source-to-front correspondence IS AVAILABLE. Other vintages, raw survey photography and other providers remain UNKNOWN and were not searched.**

The reviewed FY2025 archive is 649,322,807 B, SHA-256 f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d. Its mesh53393596 CityGML is 102,300,141 B, SHA-256 88dab9e2cc41dc75b37a83ca3ad78dfa0eb1f081b918af56fc79851c80150724. The extracted GML and all five exact target JPEGs are byte-identical to their archive members. The archive directory has exactly those same five names containing source building number14226; no broader image search was performed.

The exact target is bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27, batch63, placed data518 SHA-256 5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b. The retained source1452 JSON is 380,851 B, SHA-256 33afd4d250f416512b47efa3a609ef7e1579f46f5bc88c9f44c077c32f3901d2. No dependency on the retired1452 worktree was used.

| Referenced CityGML image basename, all ending _00014226_00014226_13113.jpg | Pixels | Bytes | Target polygons |
| --- | --- | --- | --- |
| WallSurfaceTexture | 1024x512 | 80,274 | 14 |
| RoofSurfaceTexture | 512x256 | 35,687 | 11 |
| BuildingInstallation_1041Texture | 128x128 | 5,749 | 84 |
| BuildingInstallation_1031Texture | 64x64 | 1,578 | 13 |
| BuildingInstallation_1070Texture | 96x96 | 3,534 | 30 |

All152 referenced targets belong to this exact GML building. Each image's complete path, SHA-256, archive identity and dimensions are retained in inventory.json. The front polygon is poly-635601dc-536d-409f-a3e4-ee67efb501b7, ring of the same name plus _0. Its four corners project through the existing repository EPSG6677/world functions to the four unique corners of source1452 faces494/495, with maximum residual0.0055720816m. This is source/conversion correspondence, not survey accuracy or whole-building geometry acceptance.

That polygon uses the original wall image's x512..640/y0..512 chart: **128x512** pixels. The 4096x4096 packed atlas uses x266..394/y3072..3584: **128x512** pixels. Exact GML UV endpoints address pixel centers approximately(512.499712,0.500224)..(639.500288,511.499776). Original wall JPEG SHA-256 is f97833c3b7b6a29dca3b6ed2f3c220bfd5b16f7601ea5251c3b7d4653f6f00d2. Packed atlas SHA-256 is eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb.

The complete1024x512 wall image and both128x512 native crops were inspected individually without resampling. They show the same facade photograph and source softness. Direct decoded-RGB crop comparison gives mean absolute differences2.81094/2.64523/2.89000 of255 and RMS3.75204/3.54389/3.85407. These small pixel differences are consistent with packing/recompression and do not add spatial samples; switching to the CityGML JPEG does not recover finer frontage photography. It can be mapped back by the explicit polygon/ring UVs, but no richer front image was found.

**Finite search bound:** the one pinned FY2025 archive's directory, exact mesh53393596 building and its complete five-image appearance reference set, the five archive names containing14226, source1452 JSON/atlas and native front crops. No download, alternate vintage/provider, unreferenced-photo classification or global-absence claim. The three small installation textures and roof image were inspected as metadata only; no appearance claim is made for them.

**Smallest next option:** source replacement is not justified by this cache. A single authored curved-glazing/depth shell aligned to the existing front photograph was proposed to the coordinator, with original artwork/base excluded and no new source or reflection cube. This is UNAPPROVED, not surveyed geometry, an implementation requirement or an appearance result. The coordinator has instead selected a separate read-only ground/roof scope investigation;1454 does not launch either option.

No code changed and no gate ran. The two initial metadata diagnostics stopped on a console encoding issue and a polygon without an id; later bounded reads completed and the retained facts above come from successful outputs. No browser, GUI, localhost server or background helper was launched. All synchronous diagnostic commands returned. No persistent task-owned process remains. Protected source/AGENTS/index/991 inputs were not edited; the protected facade test read back SHA-256 48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a at intake.

Retained artifacts: inventory.json, citygml-front-native.png and packed-front-native.png. Only this report and those small evidence files were created under artifacts/source1454. Inventory retains the native crop digests. This source inventory closes without implementation or further source work.
