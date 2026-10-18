# 1539 — A1 full-AOI rendering acceptance

2026-10-18 UTC. Recommendation to root: **PASS A1 on current main 0bae7fe46db75acd02b79efba805e6dbf952df99**, whose executable source remains e1097edd. No source/harness difference exists between those revisions. No runtime, capture or gate was launched for this review.

A1 remains exactly: “Terrain, buildings and roads render end to end across the full AOI, inspected from several angles/zooms at native resolution.” This accepts that rendering outcome, not the other 13 criteria or all 35 implementation items.

The authoritative footprint is src/world/aoi.ts: the four projected corners span approximately 997.3 × 997.1 m. Current Satellite manifest records six azimuths, 0/60/120/180/240/300°, at 45/220/950 m and polar angles 1.5/1.28/0.62. These are observed poses, not just requested shot names. The six overhead frames record 67 tiles loaded, zero unloaded, 42–44 visible and 461039–476607 building triangles drawn.

Coverage is collective across the sweep. Using those recorded overhead poses, the unchanged 55° vertical field of view, 1280×720 aspect, 1–8000 m clipping range and crossing target y=15.2 (src/render/camera.ts), a static projection of the AOI's four center-to-side triangles covers the entire terrain/road height range 8.71–45.112 m: north/east/south/west triangles fit views 0/240/180/60°, with maximum absolute normalized screen coordinate below 0.832. This establishes footprint/frustum coverage, not visibility through buildings.

I already inspected all 18 sweep and four Satellite hero originals individually at native resolution in [1531](1531_walk-history-final-review.md), which binds every inspected digest. Terrain, road corridors and building fabric render throughout the square in the overhead views, with complementary block/street views. Rehashing all 18 sweep originals now found zero changes. Close facade softness and occlusion remain quality/inspection limits, not a missing AOI sector.

The current scene manifest records 183350 terrain triangles, 79367 road triangles and 1740 buildings inside the AOI; these counts corroborate loaded data rather than independently prove its pixels. src/app.ts loads/adds terrain and roads before sceneLoaded; the sweep waits for readiness and settled tile refinement. Actual native pixels supply the rendering witness.

Authoritative evidence is artifacts/visual/complete.json, run 7f403f3841a95a62, SHA-256 9ac73ddecd91e219310aa0da16d37bf621c936b5bec74102bfb600fe93d13547: 44 current images, three hardware lifecycles and 156 served files. Satellite manifest SHA-256: 21b3590cf96905a6c3c6439ac05b8bf66cd4e7d8da7a3db68c7a49cfebb41ae0. The failed peripheral 1534 instrument contributes no A1 proof. Root owns acceptance; no remaining A1 capture gap is identified for this unchanged input set.
