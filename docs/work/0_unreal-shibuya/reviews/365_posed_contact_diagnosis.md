# Actual game posed-contact diagnosis

Bounded independent read-only diagnosis. Input native packet SHA2560c232d8618cebfcfc40a1412bb5eadcfe3a2d3a8e65bd84fdd87c348076c1bff, 3,288,163 bytes, contains ordinary game controls and actual moving-body contact queries on Source2 geometry with the original470 Source1 movement profiles. C assigned revision f45b6e268a2b38b26a64897cd1449ae4c0d217dc. No Engine, spatial index, gates, generation, network, product/data/Git writes or GUI processes. Only this owned ignored report and diagnosis JSON were written. Every read path and ancestor received a fresh nonfollowing reparse check.

## Count and retention finding

The actual history has22 failures across13 failing samples. Exactly12 failed contact examples retain complete operands:8 shoe gaps,3 vehicle-loop-12 rear-body gaps and1 vehicle-loop-13 rear-corner gap. Ten later failures have only aggregate count/maximum gap; route, contact kind, signed gap and pose operands are unknown. They must not be reconstructed from the earlier examples. RuntimeProbe.cpp:141-151 globally caps each kind/reason at8 across the entire probe; that discards all later shoe/gap examples after the eighth known shoe. This mechanism explains the information loss but does not prove the identities of those10 unknown failures. The final240-ray snapshot passes with maximum12.1019009346cm; it does not erase earlier failures, and current FinishProbe correctly ANDs all history verdicts.

| Fixed step | Failures | Full operands | Unknown | Maximum gap cm |
|---:|---:|---:|---:|---:|
|420|4|4|0|25.057295441|
|451|3|3|0|22.852043452|
|466|1|1|0|22.890550017|
|482|2|2|0|24.217662558|
|497|2|2|0|22.185199087|
|512|2|0|2|22.551396446|
|527|1|0|1|23.622630169|
|542|1|0|1|23.717935675|
|557|2|0|2|21.752516801|
|573|2|0|2|21.734787641|
|588|1|0|1|22.690771451|
|603|1|0|1|22.704609057|

## Pedestrian cause: stale ground heights, not excessive swing lift

All8 known shoe failures are agent63 on foot-1074513107-0, moving backward on original profile segments5→6 or6→7. Their retained support file is15,740 bytes, SHA25635e4e657c9e9b3565ce1aed92ae3098128f3cc7ea61bbe85f201133899a52eb6. It explicitly describes GSI-DEM5A with "reviewed approximate calibration", rather than an exact current rendered-triangle witness. The actual game first hits TerrainSupport faces620961/620916 with normal.Z .99655078/.99552403. Every known gap is positive: ground is20.16527–24.21766cm above the shoe bottom.

The model creates a shoe from local(0,±10,76)+Ry(±Swing)*(3,0,-68), shoe half-box(12,6,5), body scale Height=.94..1.06, Swing=sin(travelled*4)*.45*min(1,speed). The lowest transformed shoe corner is measured, not a body origin proxy. In all8 actual examples the bottom is1.56291–4.52952cm ABOVE Agent.position.Z. Its forward/back XY motion places it on old-profile heights1.29177–5.72318cm BELOW the actual posed shoe bottom. Thus the gait raises the bottom and reduces the positive ground-minus-shoe gap. Lowering the shoes, changing swing or adding a blanket standing offset would worsen this specific penetration class or conceal the real source mismatch.

I interpolated only the pinned old profile's local segment at each actual contact XY, using its measured side heights and original1.2m corridor. All8 contacts are inside that width, at signed lateral+.108112m or-.089888m. Current native hit height is22.29193–25.94331cm above that old profile at the same XY. That accounts for the observed20.16527–24.21766cm residual after subtracting the actual gait/shoe lift. This is a current-ground versus approximate legacy-height mismatch. The existing native normal and actual impact are independent operands; the nearest-segment old-profile calculation is diagnostic, not an admission oracle.

## Car cause: a local tangent extrapolated across the whole rigid footprint

The actual mesh remains the full4.4×1.8m acceptance footprint. AgentGeometry.cpp:107-111 uses Route.At(currentDistance)'s single-segment unit tangent to set pitch=atan2(T.z,hypot(T.x,T.y)), and current CrossSlope for roll. The rigid transform is Rz(heading)*Ry(-pitch)*Rx(roll). PhysicsSnapshot checks its actual plane at x=±220cm, y=0/±90cm plus actual tilted tyre contacts. Reproducing that transform from the retained operands agrees with each of the four known car contact positions to less than3e-12cm. This is no quaternion sign, unit or contact reconstruction error.

For vehicle-loop-12 at step420, current profile segment222→223 has grade-.0814185718441, pitch-4.6546734077°, roll-.5662567252°. The rear plane x=-220cm rises17.85301cm above the agent origin; its corners rise16.96648/18.73954cm. But those rear points fall beside the prior route segment220→221, across the height crest and XY direction change at222. Native road data65 faces694/695 are22.75113–25.05730cm below the resulting body plane. At the rear end and in-corridor rear corner, native ground agrees with the pinned old profile at their own XY to-.97770/-.96155cm; the posed plane is22.92853/24.09575cm above that profile. The maximum decomposes exactly: ground minus old profile=-.9615456869cm, body minus old profile=24.0957497541cm, so ground minus body=-25.0572954410cm. Reprofiling centre heights alone cannot remove this rigid-pose extrapolation error.

Rear corner4 is1.0787866003m from the prior centreline, outside the source corridor's1m halfwidth, despite the car's90cm halfwidth. This is the swept rigid footprint at a turn extending beyond per-centre cross-sections. Its old-profile estimate is explicitly an extrapolation and receives no support/admission credit. The native ray itself remains valid and known.

For vehicle-loop-13 at step451, current segment1099→1100 gives pitch-5.3632091892°, roll4.7788659778°. Rear corner4 rises28.0282851145cm above the source origin and reaches earlier segment1096→1097, lateral .8813112852m within the original corridor. Native data66 face1217 differs from the old profile at that actual XY by only+.000006244cm. The posed body plane is22.8520496962cm above that profile, accounting for its entire-22.8520434522cm native gap. Original segments1098→1099 contain a1.444cm backward XY connector before the following forward interval; the previous/next source cross-section directions swap there. CrossSlope's current corner rule selects the following section, but no finite rear-footprint agreement is checked.

The native contact tangent plane projected along current heading has the opposite longitudinal grade to the current profile tangent at these rear contacts. A tangent plane extrapolated back to the origin is explanatory arithmetic, not a measured origin hit. The JSON labels that distinction. Native face IDs were not treated as GLB index-order authority: a direct-index trial disagreed with native impact positions/normals and was rejected before conclusions. No such invalid mapping survives the final diagnostic calculations.

## Targeted repair contract

1. Keep the scene geometry unchanged. Replace approximate Source1 height profiles with admitted exact current rendered-surface profiles for all470 original legal XY routes. Retain actual source/geometry hashes at profile admission; an approximate GSI receipt cannot establish current TerrainSupport shoe contact. The existing whole470 Source2 reprofile is322/148, not an adoptable complete replacement. The separate source-selection precision work must settle those refusals before publication. Do not move shoes down, add a global height shim or change gait to solve this source mismatch.

2. Replace the car's infinitesimal local-tangent pose assumption with a finite rigid support pose derived from the same unchanged route/profile support over its full footprint. The concrete minimum inputs are both ends±2.2m, both sides±.9m and the existing actual tyre support positions, using actual current heading, current frame and full vehicle dimensions. Solve/choose a rigid height/pitch/roll whose complete queried footprint remains within20cm of eligible first-hit support with normal.Z>=.7. Current route-centre height, one interval tangent and one cross-slope are insufficient at a crest/turn. A wheelbase-only chord misses the tested body overhang, and a centre-height-only reprofile misses these known rear gaps.

   Constrain the pose to the legal XY route and retain heading/turn behavior unless independent full-footprint admission requires a defined heading transition. Any support query outside the legal swept corridor must acquire explicit source-ground eligibility; nearest route segment or extrapolated profile cannot authorize it. If no admissible full rigid pose exists, keep the route admission RED and report its exact poses; do not reroute, shorten the car, reduce counts, alter20cm/.7, or relax .2 vehicle/.6 source pedestrian grade. This does not assert that any particular fitting algorithm has already passed.

3. Bundle a bounded diagnostic retention correction with the necessary product change: retain every failed contact's operands in the declared finite debug-run contact population, ordered by sample and contact ordinal, while leaving pass examples capped. Before the debug run, fix the maximum sample/contact population and existing byte budget; if full failure evidence would exceed that bound, refuse/truthfully mark incomplete rather than silently project it. Do not expand ordinary gates or create another reporting framework. No C++ edit/build was performed here.

## Causal validation required before adoption

Replay these exact12 known poses as old/new controlled cases: old approximate shoe profiles reproduce all8 positive gaps; exact current support must reduce them while preserving the actual gait and native contact positions. The four old car poses must reproduce their actual quaternion/local-coordinate positions and known negative gaps; the new finite pose must preserve4.4×1.8m and pass all six body plane positions plus all actual tyre contacts, including the corner outside the prior source cross-section. Compare using the actual Game collision world after its real asynchronous asset-readiness barrier. The Editor world's early missing-road rays are not evidence for Game holes.

Then run ordinary controls with moving3000/200 and retain all contact-history failures rather than just final pass. A finite debug replay proves its retained poses, not continuous safety, all470 route support, ordinary controls or full population performance. The ten missing original contact operands remain unknown and require a fresh faithfully retained run; neither repaired fixtures nor a passing final snapshot can reconstruct them.

## Known12 decomposition

Positive values mean native ground is above the actual posed contact. Old-profile estimates outside the corridor are marked and are not admitted support.

| Step | Route/contact | Native gap cm | Ground−old profile cm | Posed contact−old profile cm | Within old width |
|---:|---|---:|---:|---:|---|
|420|foot-1074513107-0/left_shoe_bottom|20.816913390|22.649623172|1.832709782|True|
|420|vehicle-loop-12/body_plane_1|-23.906223505|-0.977695476|22.928528029|True|
|420|vehicle-loop-12/body_plane_4|-22.751125242|-0.905580250|21.845544992|False|
|420|vehicle-loop-12/body_plane_5|-25.057295441|-0.961545687|24.095749754|True|
|451|foot-1074513107-0/left_shoe_bottom|20.464202171|24.645594833|4.181392661|True|
|451|foot-1074513107-0/right_shoe_bottom|21.000157524|22.291929431|1.291771907|True|
|451|vehicle-loop-13/body_plane_4|-22.852043452|0.000006244|22.852049696|True|
|466|foot-1074513107-0/left_shoe_bottom|22.890550017|24.982674783|2.092124766|True|
|482|foot-1074513107-0/left_shoe_bottom|24.217662558|25.943313906|1.725651348|True|
|482|foot-1074513107-0/right_shoe_bottom|20.507324147|23.959609289|3.452285142|True|
|497|foot-1074513107-0/left_shoe_bottom|20.165270029|25.888453409|5.723183380|True|
|497|foot-1074513107-0/right_shoe_bottom|22.185199087|23.931621304|1.746422217|True|

Exact contact/source poses, tangent/roll operands, retained profile endpoints, local car coordinates, sample counts and input SHA256 pins are in diagnosis.json. This authored ignored audit is unlanded evidence, not Source/native PASS or a product change. No task-owned process remains.

Targeted current reprofile check: foot-1074513107-0 still refuses: [{"route_id":"foot-1074513107-0","kind":"pedestrian","reason":"stacked-rendered-support-layer","witness":{"point":[90.95744500264942,93.29761771288474],"selected":{"source":"PLATEAU-road","layer_ref":{"kind":"road","source":11,"mesh":0,"primitive":0,"triangle":213,"source_triangle_index":213},"height":0.3099380135324291,"triangle":18895,"barycentric":[0.25695104402858193,0.7429435176719685,0.0001054382994495228],"gradient_enu":[-5.935219198697123e-05,3.8557738275126204e-05],"normal_enu":[5.935219183831233e-05,-3.8557738178550983e-05,0.999999997495309],"normal_up_z":0.999999997495309,"dem_nearest_m":0.45764420343769957},"conflicting_triangle":{"height":0.7326584988780633,"triangle":621946,"barycentric":[-8.276156426845205e-10,0.42837998898807134,0.5716200118395444],"gradient_enu":[0.05597354483714075,0.07274024320854829],"normal_enu":[-0.05573925842745683,-0.0724357770456413,0.9958143367484479],"normal_up_z":0.9958143367484479},"gap_m":0.4227204853456342}}] Report d56a28c55f8b0726084dbb776464b04073cd2c77a5a356b57e398eaea8100070, 472188 bytes. This is source-profile completion for this route, not fresh native shoe validation.
