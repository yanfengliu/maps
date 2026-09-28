# 316 — Frontage surface ownership and bounded walking-route separation

Read-only proposal investigation. No product/data edit, build, source generation, browser, GPU, capture, controller replay or new physical qualification ran. The only new artifact is this report. This is not authorization to build302, and it is not a blocker for the current gait/whole-body investigation.

The proposed TSUTAYA-side strip is disjoint from the **existing admitted303 conservative actor corridor**, with at least40.517171m separation on Z alone. That resolves the current fixed-route overlap question within its retained qualification bound. It does not make a presentation-only higher floor physically authoritative. The simplest coherent owner is the existing offline pavement recipe, producing triangles used by both the renderer and the retained actor-support packet; a visual-only src/scene/crossing-frontage.ts addition as suggested by302 would leave two different floor definitions.

## Measured separation

All coordinates are world metres, X east/Y up/Z south.302 restricts every proposed top/end-return triangle to X[-14.0,-0.2], Z[-30.2,-27.6], with reported top investigation Y[15.09,15.65]. Its wall stations0.1–0.9 span13.63115m. The three sampled widths are0.777991/0.579525/0.494959m, with boundary pavement-minus-terrain heights0.297923/0.314823/0.264888m. Those samples do not prove the continuous strip's complete contour or maximum width; that still requires exact noding before authoring.

The unchanged packet context contains these four route corners in X/Z, in order: (-31.87102729182009,16.28131837233148), (-36.20241501310596,18.882582331270424), (-37.021668967726846,17.518435295186027), (-32.69028124644098,14.917171336247083), then the first corner.303's retained1195 root records have X[-37.021668967726846,-31.87102729182009], Z[14.917171336247083,18.882582331270424]. The unchanged scale is1.0391258001327515.

Use the larger retained context.obstacles.actorEnvelope, not root positions or a guessed foot radius: min=(-39.021668967726846,15.442132451499512,12.917171336247083), max=(-29.87102729182009,18.552417904536867,20.882582331270424). Its X/Z extent contains the route's2m planar expansion. Against302's entire investigation rectangle, X separation is15.871027291820091m and Z separation40.51717133624709m; the rectangular planar lower-bound distance is43.51471797436473m. Criterion: max(actorX)<min(stripX) OR max(stripZ)<min(actorZ), with both inequalities true here. No triangle decode or fitted contour is needed to establish separation of these supersets.

This is the exact conservative-envelope comparison. LocalSupportAdmission.observe checks actual posed shoes/soles against retained triangles and checks whole-body vertices against this corridor when fullBody is requested.303's existing finite trace reports4,308,582 shoe samples and4,827,322 event body samples. Those are reused evidence, not newly rerun continuous swept-body certification. Every already-qualified foot/body point inside that corridor is disjoint, and the declared whole corridor is disjoint. Unsampled continuous mesh extrema, another route, another actor, generic populations, and future corridor changes are outside this conclusion. The two-axis40m-plus separation must not be restated as an all-population clearance result.

## One authoritative-surface contract for a future implementation

Keep the surface owner in tools/scene/pavement-recipe.ts and its compose-pavement.ts output boundary. If a separate small contour builder is useful, it belongs under tools/scene/ and is called by that recipe, using existing PavementMeshWriter/triangulation/overlay and mesh parser utilities. Its explicit authored record should bind the building ID/data518 tile, wall stations, exact adjoining pavement contour and planes, terrain used for end closures, and declare that this is an authored extension outside mapped pavement coverage. It must not falsify pavement-source.json or claim recovered CityGML authority.

Append the admitted top/closure triangles to the final pavement MeshData, preserving all old triangles and their indices wherever feasible. The existing createRoads already builds both its visible pavement and surfaceSampler from that same MeshData, and createPaintSupport reads it too. Reuse the current sidewalk treatment; no new shadow, material or runtime floor-overlay framework is needed. Highest-surface sampling alone is not physical layer admission: overlapping sheets/end closures must retain explicit ownership and the old paint source-elevation policy.

The actual local walker does **not** call roads.heightAt. createLocalWalker loads context.json and builds createLocalFloor(context), which queries its1577 retained triangles and rejects competing heights; contact shading uses the same context. Therefore changing only roads.heightAt or attaching a render mesh cannot satisfy visual/support equality. Future packet preparation must derive/verify the walker subset against the exact new pavement output. For this unchanged disjoint route, prove every retained support triangle's coordinates/index/plane are unchanged; the context/rigs can remain byte-identical only if that comparison actually passes. A route entering the strip would need an explicitly admitted support subset containing the new authored triangles, not an unchanged legacy packet or a highest-Y shortcut. No such route is proposed here.

## Expected changed bytes and pins, if root later authorizes it

The intentional data changes would be pavements.mesh and pavement-recipe.json plus the authored contour/recipe code and narrow regression. roads.mesh, terrain.mesh, mapped pavement-source.json, building tile, network/routes and all rigs should stay byte-identical. The current pavement SHA is3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62. Its replacement invalidates cached pins in test/paint-support.test.ts, scene/served-data certificates and the local-walker manifest.sourceInputs. The manifest must bind the reviewed new pavement hash and vite.local-walk.config.ts must bind the resulting manifest hash; do not weaken fetchAsset equality or relabel old captures. Dependency versions need not change. This is a local geometry/data milestone with integration gates and visual review owed, not a material-only patch or a reason to regenerate network data broadly.

Required narrow contract: actual contour stays within302 bounds; top matches the exact existing boundary without competing/duplicate floor sheets; end closures terminate on existing terrain; old support triangles and route remain exact; visual MeshData and queried retained triangles have explicit common provenance.302's visible acceptance still applies. No implementation or acceptance is conferred by this investigation.

## Read input pins

| Input | SHA-256 |
| --- | --- |
| artifacts/corner302-20260928/REPORT.md | 1054665182b2b3d0115e6cafad8119224ad927ccfbfeeba4a478fa3029a6a652 |
| artifacts/pedestrian-native253-20260928/packet/context.json | 0339db04b4f700655bdb9b89912e06a6143bc748cc3792fed041865c8f9aadce |
| artifacts/pedestrian-native253-20260928/packet/manifest.json | a41f57b8eba8840ffecb5e3faf87a5cec0997ddf0fa320200820f3223405e36e |
| walking-scene/maps/artifacts/walking303-20260928/finite-gait.json | 0f55a834162c5a7ee6ea0606de0af04d04b8d1ee3feb45714376da5ce9eca968 |
| src/agents/population/local-walk-support.ts | 162d40f0a23caa0306f7364c757b09e7e94e8c0ea96668faa1477626e6772983 |
| src/agents/local-walk-prototype.ts | 5ac97393e1fd0d913171e6454138b0b620687c9d479b9fea97c14152e56de7b1 |
| src/scene/roads.ts | 2a941dc10ef8bd5582ce71da0695e3631ba68a8ae26f8c70082c574f6e2406bb |
| tools/scene/pavement-recipe.ts | aacf186470a6b3a7c0fd5baf0f6c4cb74fc6a561b564829298a91171aa36010c |
| tools/scene/compose-pavement.ts | 67581f14d69274db2830b6fc8974e4f159aece2a4cd4cf4616020de78259396e |
