# Independent geometry investigation

Author: `/root/unreal_capability/view_geometry_diagnosis`. Read-only investigation, 2026-10-11. Inputs: native `render-20261011-083645` receipt and all six individually inspected1280×720 PNGs; fresh source manifest SHA`edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e`; frozen candidate helper SHA`664488404e6fc22328f651c125d40730bcd1c878b20569dbf14490c221e9d881` and runner SHA`b5f998faaba851a7203e1d5c80606bbc1cf4a86a0233ac978c316491e2ac2a18`. Authored findings follow.

No source evidence supports a close-view centre obstruction. The first close camera looks too high to centre the crossing ground, and dark facades dominate its edges. The native import’s coordinate signs agree with the admitted source.

- Independently decoded and SHA-verified all70 prepared GLBs. Their468,500 triangles have no transformed nodes. Every prepared face normal agrees with its vertex normals; there are zero inverted or degenerate faces. Lowest per-primitive median agreement is0.999892.
- Compared actual source POSITION minima/maxima with each corresponding native actor group’s signed bounds. All groups match the conversion `(GLB X, Z, Y) ×100`, with maximum endpoint error0.001953125cm. Northeast `data458`, southwest `data535`, crossing tile `data488`, and terrain all agree. This establishes signed placement, although it does not prove native triangle-by-triangle correspondence.
- Installed `GLTFCore/Private/GLTF/ConversionUtilities.h` independently confirms `ConvertVec3 = {X, Z, Y}`.
- All six recorded native actor forward vectors agree with requested target rays within approximately10⁻¹⁵. Camera locations in the capture receipts are echoed inputs, not independently recorded actor/component world locations.

Full source rays, unlike the existing finite camera→target checks:

| View | First centre-ray surface | Distance | Crossing origin ground projection |
|---|---|---:|---|
| crossing | Terrain at ENU(−26.162,33.637,0.050)m |105.574m |(640,599.98) |
| crossing-west | Terrain at(21.259,−6.074,−0.185)m |115.140m |(640,501.58) |
| block | Road at(−13.153,15.784,0.006)m |508.887m |(640,387.28) |
| block-north | Terrain at(13.286,−15.943,−0.145)m |509.143m |(640,387.28) |
| crop | Building `data505` at(158.650,−158.650,142.853)m |1125.318m |(640,370.39), occluded |
| crop-opposite | Terrain at(18.768,−18.768,−0.125)m |1414.104m |(640,370.39) |

The close centre and direct crossing-ground rays reach ground without a preceding source building. Close-view upper/side rays do hit expected real buildings, principally `data518` and `data503`. Native images visually agree with this broad arrangement.

The60° horizontal FOV yields35.9834° vertical FOV. Target height15m puts the first view’s crossing ground at83.33% image height—outside the darkness check’s20–80% height rectangle. That camera frames frontage above the crossing, rather than centring crossing ground. Keep it fixed for baseline comparison; moving it alone would not repair the lighting failure.

Every fixed view’s topmost ray also points below the horizon:−1.34° crossing,−16.49° west,−18.13° block views,−11.68° crop views. These captures cannot establish an above-horizon sky defect. Crop black background is outside the finite terrain while looking downward.

The pinned terrain additionally has zero textures and `imagery_zoom:null` because acquisition failed. Its neutral ground cannot supply photo detail or crossing markings.

Suggested bounded native probe, retaining the geometry and cameras:

1. Record actual actor and capture-component location, rotation, forward/right/up vectors, FOV, target dimensions, projection type and custom projection flags.
2. At the same transforms, temporarily capture `SCS_SCENE_DEPTH`, `SCS_NORMAL`, and `SCS_BASE_COLOR` into `RTF_RGBA32f`.
3. Read a small fixed pixel set through `RenderingLibrary.read_render_target_raw_pixel(world,target,x,y,False)`. Centre depth should be approximately10,557cm and11,514cm in the two close views. Ground normals should face up. Base color separates native texture correctness from lighting.
4. Preserve raw diagnostic values and restore/destroy the temporary capture in `finally`. A temporary above-horizon diagnostic can separately test sky readiness.

The installed shader emits linear axial scene depth in R, signed world normals in RGB, and material base color in RGB. Do not use `RTF_R32f` with this Python readback: installed `KismetRenderingLibrary.cpp` supports RGBA float formats here, but rejects single-channel float and returns the red sentinel.

I inspected all six final PNGs individually at native resolution and verified each digest against its capture receipt. No files, engine state, configuration, or processes were changed.
