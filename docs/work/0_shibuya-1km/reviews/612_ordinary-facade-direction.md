# 612 — ordinary facade direction

Proposal only, against product 39ba. I inspected both requested 600 baseline originals separately at native 1280×720. The left street-facing window wall occupies hundreds of pixels at dusk and remains visible beside the roof at noon. Its softened grid and flat lighting make it the strongest candidate. The left image includes multiple buildings.

The nearby ordinary building `bldg_46f3cd1c-4dc8-4e7e-b30f-db8c8c31f776`, tile 518, has eight published storeys and 31.6 m occupied height: approximately 3.95 m/storey. Cached 451 geometry and native 132×260 source pixels establish upper glazing on its north face. That face points north; 600 views look north from the south. Its UVs cannot identify the visible street face. The candidate association remains provisional.

Use the existing read-only `facadeSamples` instrument for three visible-wall rays at a settled 600 pose, then resolve that single source face and its photographic divisions. 600 contains no such rays. This finite identification is required before implementation.

Recommend one authored metal frame/reveal shell over one contiguous upper window region, retaining photographic pane colors and layout. Use real 0.15 m depth, maximum 0.20 m, with widths following observed divisions. Follow photographed floor bands; the eight-storey count is a scale check. Verified pane interiors receive restrained roughness/specular variation from existing lighting. No emission, tint replacement, opaque pane layer, extra environment, or normal-only detail pass. The oblique close view gives physical profiles a useful visibility test.

Bind support to that face’s plane, normal, GML and UV region. End profiles at photographed structural boundaries; exclude signs, equipment, corners and QFRONT’s central display. Preserve original source geometry, collision, atlas bytes/caps and labels. Satellite only; Cartographic return restores equivalent state. Own and dispose added geometry without disposing shared textures.

Cap one batch at +1 draw, +1,000 triangles, +128 KiB buffers, +0 textures. Shader/startup/frame cost remains unmeasured; ≤0.2 ms frame cost is a later gate. First native close/block and oblique comparison rejects drawn-grid appearance, doubled photographic bars, clipping, washed labels, or absent depth/specular improvement at either distance. No tuning or expansion follows rejection. Receipt: ignored `artifacts/facade612/receipt.json`.
