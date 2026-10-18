# A2 terrain and building-contact source assessment

2026-10-17. Read-only source/data assessment for root. **Recommend A2 OPEN.** Current main supplied as b1c2f93a8c8eabd25a1f52bc6a27cee2bb18a335; executable e1097edd4f0d65f41e6d6c157def4d51fa877318. No fix is qualified. Native appearance belongs to independent1541.

The first instrument was the existing scene manifest/data:scene pipeline. Current retained manifest records183350 terrain triangles,81023 inside AOI,92283 vertices,8.71–36.35m relief,15.198633777936339m at origin,14 capped rims/227 cap triangles,67 tiles/2686 buildings/1740 AOI buildings and36.786m geoid undulation. The manifest is retained facts, not a fresh pipeline pass.

`tools/scene/build.ts:131` checks crossing elevation and at141 requires at least10m relief. `test/elevation.test.ts:16` expressly bounds independent GSI agreement to one crossing point. `build-terrain.ts:250` bounds watertightness to topology: cap shape, projection coverage and welded seams are outside its claim. These checks cannot establish that Dōgenzaka and the valley read in the rendered scene.

`build-buildings.ts` compares deepest-leaf decoded bounds with batch-table bounds; coarse tiles use whole-tile centers. Horizontal tolerance is2m; solved geoid must be within0.5m of published36.877m. `groundY` at292 is `_zmin`, not terrain contact. The reported worstVertical at566 uses only the1st/99th percentiles, and no separate vertical-residual rejection is applied. `build.ts:352` checks CityGML roof-edge centers/attributes, not GroundSurface/terrain agreement. Runtime drawn-bounds assertions reject gross displacement; they do not inspect complete footprint contact. A full A2 pass cannot transfer from these checks.

One bounded read-only diagnostic sampled current terrain barycentrically at all1740 unique AOI index centers; three literal interpolation/outside/edge controls passed. All1740 had support and none had terrain-layer spread>0.01m. Difference is whole-building `_zmin` minus terrain at center: median−0.265879m,p01−3.901936m,p99+0.005501m;269 below−1m and3 above+1m. **These are candidate rankings, not sinking/floating measurements:** a minimum and a center are different locations, particularly on a slope or rooftop structure.

| Candidate GML suffix / tile | Center X,Z m | `_zmin` / terrain m | Difference m |
| --- | --- | --- | --- |
|398703bd-1086-4c64-a438-237caf53eed5 / data468|436.550,−93.706|48.475 /31.911549|+16.563451|
|d56036c6-8e4e-4291-bcc4-94a9b92c1ff5 / data528|−90.524,413.209|35.924 /31.718161|+4.205839|
|209948c8-6aa8-414e-a06e-67dfc3afa4d3 / data530|−128.947,474.634|35.600 /33.161368|+2.438632|

All three occur as separate CityGML Buildings with one GroundSurface/no BuildingPart. They respectively state31.1m/10,16.3m/6 and3.6m/1 height/storeys. Their whole source ground polygons and installed geometry were not decoded, so support semantics remain unresolved.

Terrain samples independently support the source's southwest rise: origin15.198634m; X/Z(−100,100)16.438317m;(−200,100)19.119629m;(−300,200)33.470224m. This is stored terrain shape, not visual readability. Smallest next action: a noon ordinary-controls low oblique uphill toward(−300,200), exposing both frontage bases; select any close contact follow-up from actual pixels. If source contact is then needed, inspect one named candidate's complete ground polygon and terrain together before editing. No whole-city proof machinery or source correction is justified.

Reproducing SHA-256: terrain.mesh c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773; buildings/buildings.json7faafdbc5047ff8e69cce83e1457080ab4d2d6a289f43b737a289ac3e0a40598. Both rehashed unchanged after sampling. No product/cache/build/gate/dependency/Git changes; no browser/server/GUI launched. CPU reads completed.
